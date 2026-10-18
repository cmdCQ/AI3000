// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { loadPointsUsage } from '../my/my.logic.js';

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'sqw_token=; path=/; max-age=0';
});

test('missing authentication never requests quota', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(loadPointsUsage()).rejects.toMatchObject({ status: 401 });
  expect(fetch).not.toHaveBeenCalled();
});

test('quota request forwards authorization and rejects incomplete contract', async () => {
  document.cookie = 'sqw_token=test-token; path=/';
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pointsUsed: 1, pointsLimit: 10, tier: 0 }) });
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  await expect(loadPointsUsage(controller.signal)).rejects.toThrow('额度数据格式错误');
  expect(fetch).toHaveBeenCalledWith('/api/user/points', { headers: { Authorization: 'Bearer test-token' }, signal: controller.signal });
});

test('service errors preserve status instead of inventing zero balance', async () => {
  document.cookie = 'sqw_token=test-token; path=/';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
  await expect(loadPointsUsage()).rejects.toMatchObject({ status: 503 });
});

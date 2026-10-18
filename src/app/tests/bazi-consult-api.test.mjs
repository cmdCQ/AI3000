import { afterEach, expect, test, vi } from 'vitest'
vi.mock('../shared/auth.js', () => ({ AUTH: { getToken: () => 'fixture-token' } }))
import { sendConsultation, listConsultations, deleteConsultation } from '../bazi-consult/api.js'
afterEach(() => vi.unstubAllGlobals())
test('history cursor and chart filter encoded, deletion uses authenticated DELETE', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))))
  await listConsultations('chart &1', undefined, 'cursor+next')
  const url = new URL(fetch.mock.calls[0][0], 'https://example.test')
  expect(url.searchParams.get('chartId')).toBe('chart &1')
  expect(url.searchParams.get('before')).toBe('cursor+next')
  await deleteConsultation('id/1')
  expect(fetch.mock.calls[1][0]).toBe('/api/bazi/consultations/id%2F1')
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer fixture-token' } })
})
test('delete failures retain server status', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: '已有咨询正在生成' }), { status: 409 })))
  await expect(deleteConsultation('id')).rejects.toMatchObject({ status: 409, message: '已有咨询正在生成' })
})
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
async function collect() { const items = []; for await (const item of sendConsultation({ message: '2027年呢？' })) items.push(item); return items }
test('SSE across UTF8 and event boundaries preserves deltas and final state', async () => {
  const bytes = new TextEncoder().encode(frame('delta', { text: '中文回答' }) + frame('done', { status: 'completed' }))
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close() } }))))
  expect(await collect()).toEqual([{ event: 'delta', data: { text: '中文回答' } }, { event: 'done', data: { status: 'completed' } }])
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-token')
})
test('HTTP error is not a successful answer', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: '积分不足' }), { status: 403 })))
  await expect(collect()).rejects.toMatchObject({ message: '积分不足', status: 403 })
})
test.each([['missing done', frame('delta', { text: '部分回答' })], ['truncated event', 'data: {']])('%s rejects incomplete response', async (_, body) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(body)))
  await expect(collect()).rejects.toThrow(/未完整结束|未返回结束状态/)
})

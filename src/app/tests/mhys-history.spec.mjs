import { test, expect } from '@playwright/test';

const rows = [
  { id: 'older', topic: '财运 <img src=x onerror=alert(1)>', method: 'time', recordTime: '2025-01-01T00:00:00Z' },
  { id: 'newer', topic: '事业规划', method: 'manual', recordTime: '2026-01-01T00:00:00Z' },
];
for (const kind of ['mhys', 'liuyao']) {
  test.describe(`${kind} shared records`, () => {
    async function setup(page, { loggedIn = true, status = 200, data = rows } = {}) {
      await page.route('**/api/**', route => route.fulfill({ status: 200, json: {} }));
      await page.route(`**/api/${kind}-records`, route => route.fulfill({ status, json: data }));
      await page.goto(`/${kind}/history.html`);
      if (loggedIn) {
        await page.context().addCookies([
          { name: 'sqw_username', value: 'mock-user', url: page.url() },
          { name: 'sqw_token', value: 'mock-token', url: page.url() },
        ]);
        await page.reload();
      }
    }
    test('guest auth, compact theme, correct back link', async ({ page }) => {
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await setup(page, { loggedIn: false });
      await expect(page.locator('.empty-state')).toContainText('登录后查看排盘记录');
      await expect(page.locator('.fm-back')).toHaveAttribute('href', `/${kind}/`);
      await expect(page.locator('#manageBtn')).toBeDisabled();
      const width = await page.locator('.records-page').evaluate(el => el.getBoundingClientRect().width);
      expect(width).toBeLessThanOrEqual(500);
      await page.getByRole('button', { name: '去登录' }).click();
      await expect(page.locator('#authModalOverlay')).toBeVisible();
      expect(errors).toEqual([]);
    });
    test('sort, safe text, native links, search and native checkbox management', async ({ page }) => {
      await setup(page);
      const cards = page.locator('.record-card');
      await expect(cards).toHaveCount(2);
      await expect(cards.first()).toHaveAttribute('href', `/${kind}/result.html?id=newer`);
      await expect(cards.last()).toContainText(rows[0].topic);
      await expect(cards.last().locator('img')).toHaveCount(0);
      await page.screenshot({ path: `/tmp/sqw-${kind}-history-desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
      await page.screenshot({ path: `/tmp/sqw-${kind}-history-mobile.png`, fullPage: true });
      await page.locator('#searchInput').fill('财运');
      await expect(cards).toHaveCount(1);
      await page.locator('#manageBtn').click();
      await expect(cards.locator('input[type=checkbox]')).toHaveCount(1);
      await page.getByLabel('全选', { exact: true }).check();
      await expect(page.locator('#selectedCount')).toHaveText('已选 1');
      await page.locator('#searchClear').click();
      await expect(cards).toHaveCount(2);
      await expect(page.getByLabel('全选', { exact: true })).not.toBeChecked();
      await expect(page.locator('#manageBtn')).toHaveText('完成');
      const contrast = await page.locator('#manageBtn').evaluate(el => {
        const style = getComputedStyle(el);
        const lum = text => text.match(/\d+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
        const a = lum(style.color), b = lum(style.backgroundColor);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      });
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      await page.locator('#manageBtn').click();
      await expect(cards.first()).toHaveAttribute('href', `/${kind}/result.html?id=newer`);
    });
    test('cancel does not delete; partial failure stays selected and retries', async ({ page }) => {
      const deletes = []; let fail = true;
      await setup(page);
      await page.route(`**/api/${kind}-records/*`, route => {
        deletes.push(route.request().url());
        return route.fulfill({ status: fail && route.request().url().endsWith('older') ? 500 : 200, json: {} });
      });
      await page.locator('#manageBtn').click();
      await page.getByLabel('全选', { exact: true }).check();
      page.once('dialog', dialog => dialog.dismiss());
      await page.locator('#deleteSelectedBtn').click();
      expect(deletes).toHaveLength(0);
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#deleteSelectedBtn').click();
      await expect(page.getByRole('alert')).toContainText('部分记录删除失败');
      await expect(page.locator('.record-card')).toHaveCount(1);
      await expect(page.locator('.record-card input')).toBeChecked();
      await expect(page.locator('#selectedCount')).toHaveText('已选 1');
      fail = false;
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#deleteSelectedBtn').click();
      await expect(page.locator('.empty-state')).toContainText('暂无排盘记录');
      await expect(page.locator('#manageBtn')).toHaveText('管理');
      await expect(page.locator('#fmActions')).toHaveCount(0);
      expect(deletes).toHaveLength(3);
    });
    test('401 is re-login, not empty; server error has retry; real empty can search', async ({ page }) => {
      await setup(page, { status: 401, data: {} });
      await expect(page.locator('.empty-state')).toContainText('登录已失效');
      await expect(page.locator('#searchInput')).toBeDisabled();
      await page.route(`**/api/${kind}-records`, route => route.fulfill({ status: 500, json: {} }));
      await page.reload();
      await expect(page.getByRole('alert')).toContainText('记录加载失败');
      await page.route(`**/api/${kind}-records`, route => route.fulfill({ status: 200, json: [] }));
      await page.getByRole('button', { name: '重试', exact: true }).click();
      await expect(page.locator('.empty-state')).toContainText('暂无排盘记录');
      await expect(page.locator('.empty-state a')).toHaveAttribute('href', `/${kind}/`);
      await page.locator('#searchInput').fill('财运');
      await expect(page.locator('.empty-state')).toContainText('没有匹配的卦例');
    });
    test('pending loading and delete unauthorized never pretend success', async ({ page }) => {
      await setup(page);
      await page.route(`**/api/${kind}-records`, async route => {
        await new Promise(resolve => setTimeout(resolve, 350));
        await route.fulfill({ status: 200, json: rows });
      });
      await page.reload();
      await expect(page.getByRole('status')).toContainText('加载中');
      await expect(page.locator('.record-card')).toHaveCount(2);
      await page.route(`**/api/${kind}-records/*`, route => route.fulfill({ status: 401, json: {} }));
      await page.locator('#manageBtn').click();
      await page.getByLabel('全选', { exact: true }).check();
      page.once('dialog', dialog => dialog.accept());
      await page.locator('#deleteSelectedBtn').click();
      await expect(page.locator('.empty-state')).toContainText('登录已失效');
      await expect(page.locator('#manageBtn')).toBeDisabled();
    });
  });
}

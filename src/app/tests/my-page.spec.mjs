import { test, expect } from '@playwright/test';

const quota = { pointsUsed: 2.5, pointsRemaining: 7.5, pointsLimit: 10, permanentPoints: 12, tier: 0 };
async function login(page) {
  await page.context().addCookies([
    { name: 'sqw_username', value: 'test-user', url: test.info().project.use.baseURL || 'http://127.0.0.1:8269' },
    { name: 'sqw_token', value: 'test-token', url: test.info().project.use.baseURL || 'http://127.0.0.1:8269' },
  ]);
}
test.beforeEach(async ({ page }) => {
  await page.route('**/fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
});

test('游客与我的命盘共用登录引导和主题，不请求私人额度', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/user/points', route => { requests++; return route.fulfill({ json: quota }); });
  await page.goto('/my-charts/');
  const chart = await page.locator('.mc-empty').evaluate(el => {
    const button = el.querySelector('.empty-btn');
    return { padding: getComputedStyle(el).padding, button: getComputedStyle(button).backgroundColor, background: getComputedStyle(document.body).backgroundColor };
  });
  await page.goto('/my/');
  await expect(page.getByRole('heading', { name: '登录后查看账户' })).toBeVisible();
  expect(requests).toBe(0);
  const mine = await page.locator('.mc-empty').evaluate(el => ({ padding: getComputedStyle(el).padding, button: getComputedStyle(el.querySelector('button')).backgroundColor, background: getComputedStyle(document.body).backgroundColor }));
  expect(mine).toEqual(chart);
  await page.getByRole('button', { name: '去登录', exact: true }).click();
  await expect(page.locator('#authModalOverlay')).toBeVisible();
});

test('401 显示重新登录而非余额或设置', async ({ page }) => {
  await login(page);
  await page.route('**/api/user/points', route => route.fulfill({ status: 401, json: { error: 'expired' } }));
  await page.goto('/my/');
  await expect(page.getByRole('heading', { name: '登录已过期' })).toBeVisible();
  await expect(page.locator('.quota-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '设置', exact: true })).toHaveCount(0);
});

test('加载失败可重试，设置返回与取消退出正常', async ({ page }) => {
  await login(page);
  let calls = 0;
  await page.route('**/api/user/points', route => route.fulfill(++calls === 1 ? { status: 503, json: {} } : { json: quota }));
  await page.goto('/my/');
  await expect(page.getByRole('alert')).toContainText('积分额度加载失败');
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.quota-card .quota-balance')).toContainText('7.5');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: /退出账号/ }).click();
  await expect(page).toHaveURL(/\/my\//);
  await page.getByRole('button', { name: '← 返回' }).click();
  await expect(page.locator('.quota-card .quota-balance')).toContainText('7.5');
  expect(calls).toBe(2);
});

for (const width of [320, 390, 1280]) {
  test(`账户布局主题与窄屏不溢出 ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await login(page);
    await page.route('**/api/user/points', route => route.fulfill({ json: quota }));
    await page.goto('/my/');
    await expect(page.locator('.quota-card')).toBeVisible();
    const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, width: innerWidth, card: document.querySelector('.account-page').getBoundingClientRect().width, bg: getComputedStyle(document.body).backgroundColor }));
    expect(sizes.page).toBe(sizes.width);
    expect(sizes.card).toBeLessThanOrEqual(500);
    expect(sizes.bg).toBe('rgb(252, 252, 250)');
    await expect(page.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.screenshot({ path: test.info().outputPath(`my-${width}.png`), fullPage: true });
  });
}

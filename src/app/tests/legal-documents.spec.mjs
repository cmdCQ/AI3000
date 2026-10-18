import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1280]) {
  test(`法律文档在 ${width}px 可查看且无横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/legal/');
    await expect(page.getByRole('heading', { name: '法律文档' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '易三千用户协议' })).toBeVisible();
    await expect(page.getByText('郝鹏越', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: '隐私政策' }).click();
    await expect(page.getByRole('heading', { name: '易三千隐私政策' })).toBeVisible();
    await page.getByRole('button', { name: 'AI 使用与风险说明' }).click();
    await expect(page.getByRole('heading', { name: '易三千 AI 使用与风险说明' })).toBeVisible();
    const size = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth }));
    expect(size.scrollWidth).toBe(size.width);
  });
}

test('我的设置提供法律文档入口', async ({ page }) => {
  await page.context().addCookies([
    { name: 'sqw_username', value: 'test-user', url: test.info().project.use.baseURL || 'http://127.0.0.1:8269' },
    { name: 'sqw_token', value: 'test-token', url: test.info().project.use.baseURL || 'http://127.0.0.1:8269' },
  ]);
  await page.route('**/api/user/points', route => route.fulfill({ json: { pointsUsed: 0, pointsRemaining: 10, pointsLimit: 10, permanentPoints: 0, tier: 0 } }));
  await page.goto('/my/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await expect(page.getByRole('link', { name: /查看法律文档/ })).toHaveAttribute('href', '/legal/');
});

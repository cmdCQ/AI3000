import { test, expect } from '@playwright/test';

const quota = { pointsUsed: 0, pointsRemaining: 10, pointsLimit: 10, tier: 0 };
let deletionRequests;
test.beforeEach(async ({ page, baseURL }) => {
  deletionRequests = [];
  await page.context().addCookies(['sqw_username', 'sqw_token'].map(name => ({ name, value: name === 'sqw_username' ? 'test-user' : 'fixture-token', url: baseURL })));
  // Block every API except explicitly mocked reads/deletion: no production writes.
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/user/points') return route.fulfill({ json: quota });
    if (path === '/api/user/account' && request.method() === 'GET') return route.fulfill({ json: { verificationMethod: 'password' } });
    return route.fulfill({ status: 503, json: { error: 'unexpected mocked API' } });
  });
});
async function open(page) {
  await page.goto('/my/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '注销账号', exact: true }).click();
  await expect(page.getByLabel('登录密码', { exact: true })).toBeVisible();
}
async function fill(page) {
  await page.getByLabel('输入当前账号：').fill('test-user');
  await page.getByLabel('登录密码', { exact: true }).fill('fixture-password');
  await page.getByRole('checkbox').check();
}
async function mockDelete(page, response) {
  await page.route('**/api/user/account', async route => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    deletionRequests.push(route.request());
    return response(route);
  });
}

test('320px destructive dialog exact confirmation, focus, Escape and no accidental request', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await open(page);
  await expect(page.getByRole('button', { name: '暂不注销' })).toBeFocused();
  await expect(page.getByRole('dialog')).toContainText('全部用户业务数据将永久删除');
  await fill(page);
  await page.getByLabel('输入当前账号：').fill('test-user ');
  await expect(page.getByRole('button', { name: '永久注销账号', exact: true })).toBeDisabled();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '注销账号', exact: true })).toBeFocused();
  expect(deletionRequests).toHaveLength(0);
});

for (const status of [401, 400, 403, 503]) {
  test(`${status} retains draft and authentication without automatic retry`, async ({ page }) => {
    await mockDelete(page, route => route.fulfill({ status, json: { error: `注销失败 ${status}` } }));
    await open(page); await fill(page);
    await page.getByRole('button', { name: '永久注销账号', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(`注销失败 ${status}`);
    await expect(page.getByLabel('输入当前账号：')).toHaveValue('test-user');
    await expect(page.getByLabel('登录密码', { exact: true })).toHaveValue('fixture-password');
    await expect(page.getByRole('checkbox')).toBeChecked();
    await expect(page).toHaveURL(/\/my\//);
    expect((await page.context().cookies()).some(cookie => cookie.name === 'sqw_token')).toBe(true);
    expect(deletionRequests).toHaveLength(1);
    expect(deletionRequests[0].postDataJSON()).toEqual({ password: 'fixture-password', confirmation: 'test-user' });
    expect(deletionRequests[0].headers().authorization).toBe('Bearer fixture-token');
  });
}

test('pending locks cancellation; confirmed success clears only user state and redirects', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await mockDelete(page, async route => { await gate; await route.fulfill({ json: { ok: true } }); });
  await open(page); await fill(page);
  await page.evaluate(() => {
    localStorage.setItem('mhys_result', 'private');
    localStorage.setItem('sqw_admin_token', 'keep-admin');
    localStorage.setItem('bazi_anon_used', 'keep-quota');
    sessionStorage.setItem('sqw_pending_ask', 'private');
    sessionStorage.setItem('bazi_pending_aspect', 'private');
  });
  await page.getByRole('button', { name: '永久注销账号', exact: true }).click();
  await expect(page.getByRole('button', { name: '处理中…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '暂不注销' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await page.context().cookies()).some(cookie => cookie.name === 'sqw_token')).toBe(true);
  release();
  await page.waitForURL(url => url.pathname === '/', { waitUntil: 'domcontentloaded' });
  expect((await page.context().cookies()).filter(cookie => ['sqw_token', 'sqw_username'].includes(cookie.name))).toHaveLength(0);
  expect(await page.evaluate(() => [localStorage.getItem('mhys_result'), sessionStorage.getItem('sqw_pending_ask'), sessionStorage.getItem('bazi_pending_aspect'), localStorage.getItem('sqw_admin_token'), localStorage.getItem('bazi_anon_used')])).toEqual([null, null, null, 'keep-admin', 'keep-quota']);
  expect(deletionRequests).toHaveLength(1);
});

test('unconfirmed success body retains authentication and draft', async ({page}) => {
  await mockDelete(page, route => route.fulfill({json:{success:true}}));
  await open(page); await fill(page);
  await page.getByRole('button',{name:'永久注销账号',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('注销结果未确认');
  await expect(page.getByLabel('登录密码',{exact:true})).toHaveValue('fixture-password');
  expect((await page.context().cookies()).some(cookie=>cookie.name==='sqw_token')).toBe(true);
  expect(deletionRequests).toHaveLength(1);
});

test('guest sees no cancellation control', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/my/');
  await expect(page.getByRole('heading', { name: '登录后查看账户' })).toBeVisible();
  await expect(page.getByRole('button', { name: '注销账号', exact: true })).toHaveCount(0);
});

test('unsupported passwordless capability cannot submit deletion', async ({ page }) => {
  await page.route('**/api/user/account', route => route.fulfill({ json: { verificationMethod: 'unsupported' } }));
  await page.goto('/my/');
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '注销账号', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('暂不支持在线注销');
  await expect(page.getByRole('button', { name: '永久注销账号', exact: true })).toBeDisabled();
});

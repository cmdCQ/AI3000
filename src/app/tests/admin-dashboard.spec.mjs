import {test, expect} from '@playwright/test';

for (const width of [320, 390, 1280]) test(`仪表盘实际统计、等级分布与最近用户 ${width}px`, async ({page, context}) => {
  await page.setViewportSize({width, height:900});
  await context.addInitScript(() => {
    localStorage.setItem('sqw_admin_token','mock-admin');
    localStorage.setItem('sqw_admin_expiry',String(Date.now()+82800000));
  });
  await page.route('**/api/**', async route => {
    expect(route.request().method()).toBe('GET');
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/verify') ? {ok:true} : path.endsWith('/stats') ? {
      total:{users:2,todayUsers:1,active7d:2,charts:3,divinations:4,totalPoints:1.2345,points7d:0.1234},
    } : path.endsWith('/users') ? [
      {username:'older-user',tier:0,createdAt:'2026-01-01'},
      {username:'newer-user',tier:2,createdAt:'2026-01-03'},
    ] : {};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('/admin/',{waitUntil:'domcontentloaded'});
  await expect(page.getByText('会员等级分布',{exact:true})).toBeVisible();
  await expect(page.getByText('最近注册用户',{exact:true})).toBeVisible();
  await expect(page.getByText('1.2345',{exact:true})).toBeVisible();
  const recent = page.locator('.ant-card').filter({has:page.getByText('最近注册用户',{exact:true})});
  await expect(recent.getByText('newer-user',{exact:true})).toBeVisible();
  const text = await recent.innerText();
  expect(text.indexOf('newer-user')).toBeLessThan(text.indexOf('older-user'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByText('服务器状态',{exact:false})).toHaveCount(0);
});

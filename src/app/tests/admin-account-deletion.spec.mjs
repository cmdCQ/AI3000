import {test, expect} from '@playwright/test';
for (const width of [320,1280]) test(`永久删除用户确认、失败保留与成功刷新 ${width}px`, async ({page,context})=>{
  await page.setViewportSize({width,height:900});
  await context.addInitScript(()=>{
    localStorage.setItem('sqw_admin_token','mock-admin');
    localStorage.setItem('sqw_admin_expiry',String(Date.now()+82800000));
  });
  let deleted=false,fail=true,calls=0;
  const user={username:'account-alice',phone:'13800138000',tier:0,pointsUsed:0,pointsLimit:10,pointsRemaining:10};
  await page.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    expect(request.headers().authorization).toBe('Bearer mock-admin');
    let data={ok:true},status=200;
    if(path==='/api/admin/users/account-alice'){
      expect(request.method()).toBe('DELETE'); calls++;
      if(fail){data={error:'删除失败，数据未变更'};status=503;}else deleted=true;
    }else{
      expect(request.method()).toBe('GET');
      if(path==='/api/admin/users')data=deleted?[]:[user];
      if(path==='/api/admin/user-tiers')data={'account-alice':user};
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('/admin/#users',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'删除用户',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'永久删除用户'});
  await expect(dialog.getByText(/不保留业务数据/)).toBeVisible();
  await expect(dialog.getByRole('button',{name:'永久删除',exact:true})).toBeDisabled();
  await dialog.getByRole('button',{name:'取消',exact:true}).click(); expect(calls).toBe(0);
  await page.getByRole('button',{name:'删除用户',exact:true}).click();
  await dialog.getByLabel('确认删除账号').fill('account-alice');
  await dialog.getByRole('button',{name:'永久删除',exact:true}).click();
  await expect(dialog.getByText('删除失败，数据未变更')).toBeVisible();
  await expect(dialog.getByLabel('确认删除账号')).toHaveValue('account-alice');
  expect(deleted).toBe(false); fail=false;
  await dialog.getByRole('button',{name:'永久删除',exact:true}).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button',{name:'删除用户',exact:true})).toHaveCount(0);
  expect(calls).toBe(2);
});

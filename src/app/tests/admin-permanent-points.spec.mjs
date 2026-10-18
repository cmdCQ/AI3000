import { test, expect } from '@playwright/test'

async function setup(page, context, grant) {
  await context.addInitScript(() => {
    localStorage.setItem('sqw_admin_token', 'mock-admin')
    localStorage.setItem('sqw_admin_expiry', String(Date.now()+82800000))
  })
  await page.route('https://fonts.googleapis.com/**', r=>r.fulfill({body:''}))
  await page.route('**/api/**', route => {
    const path=new URL(route.request().url()).pathname
    const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
    if(path==='/api/admin/permanent-points') return grant(route,json)
    if(path==='/api/admin/verify') return json({ok:true})
    if(path==='/api/admin/users') return json([
      {username:'basic',tier:0,pointsUsed:2,pointsLimit:10,pointsRemaining:8,permanentPoints:1.2345},
      {username:'member',tier:1,pointsUsed:3,pointsLimit:50,pointsRemaining:47,permanentPoints:0},
      {username:'vip',tier:2,pointsUsed:4,pointsLimit:null,pointsRemaining:null,permanentPoints:5},
    ])
    if(path==='/api/admin/user-tiers') return json({})
    return json({error:`Unmocked ${path}`},404)
  })
  await page.goto('/admin/#users',{waitUntil:'domcontentloaded'})
}

for(const width of [320,1280]) test(`weekly quotas and separate permanent balance ${width}px`,async({page,context})=>{
  await page.setViewportSize({width,height:900})
  await setup(page,context,(_r,json)=>json({ok:true}))
  await expect(page.getByText('今日积分',{exact:true})).toHaveCount(0)
  await expect(page.getByText('本周积分',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('永久积分',{exact:true}).first()).toBeVisible()
  await expect(page.getByText('1.2345',{exact:true})).toBeVisible()
  const vip=width===320?page.locator('.admin-mobile-card').filter({hasText:'vip'}):page.getByRole('row').filter({hasText:'vip'})
  await expect(vip).toContainText('无限')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('grant validates positive four-decimal points and reason; unconfirmed success stays open',async({page,context})=>{
  let writes=0
  await setup(page,context,(_r,json)=>{writes++;return json({})})
  await page.getByRole('button',{name:'添加永久积分',exact:true}).first().click()
  const dialog=page.getByRole('dialog',{name:'添加永久积分'})
  const submit=dialog.getByRole('button',{name:'确认添加'})
  await submit.click()
  await expect(page.getByText('请输入添加积分',{exact:true})).toBeVisible()
  await expect(page.getByText('请输入添加原因',{exact:true})).toBeVisible()
  await page.getByLabel('添加原因',{exact:true}).fill('   ')
  for(const invalid of ['0','-1','0.00001','1e2','NaN']) {
    await page.getByLabel('添加积分',{exact:true}).fill(invalid)
    await submit.click()
    await expect(page.getByText('请输入正数，最多 4 位小数',{exact:true})).toBeVisible()
  }
  expect(writes).toBe(0)
  await page.getByLabel('添加积分',{exact:true}).fill('0.0001')
  await page.getByLabel('添加原因',{exact:true}).fill('赠送原因')
  await submit.click()
  await expect(page.getByText('添加结果未确认，请保留表单重试或刷新核实',{exact:true})).toBeVisible()
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('添加原因',{exact:true})).toHaveValue('赠送原因')
  expect(writes).toBe(1)
})

test('confirmed grant refreshes canonical quota instead of optimistically adding',async({page,context})=>{
  let applied=false
  await setup(page,context,(_r,json)=>{applied=true;return json({ok:true})})
  await page.route('**/api/admin/user-tiers',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({basic:{username:'basic',tier:0,pointsUsed:2,pointsLimit:10,pointsRemaining:8,permanentPoints:applied?9.8765:1.2345}})}))
  await page.getByRole('button',{name:'添加永久积分',exact:true}).first().click()
  await page.getByLabel('添加积分',{exact:true}).fill('2')
  await page.getByLabel('添加原因',{exact:true}).fill('测试')
  await page.getByRole('button',{name:'确认添加'}).click()
  await expect(page.getByRole('dialog',{name:'添加永久积分'})).toBeHidden()
  await expect(page.getByText('9.8765',{exact:true})).toBeVisible()
})

test('grant 403 preserves form and reports permission failure',async({page,context})=>{
  await setup(page,context,(_r,json)=>json({error:'无管理权限'},403))
  await page.getByRole('button',{name:'添加永久积分',exact:true}).first().click()
  await page.getByLabel('添加积分',{exact:true}).fill('1')
  await page.getByLabel('添加原因',{exact:true}).fill('测试')
  await page.getByRole('button',{name:'确认添加'}).click()
  await expect(page.getByText('无管理权限',{exact:true})).toBeVisible()
  await expect(page.getByLabel('添加积分',{exact:true})).toHaveValue('1')
})

test('grant 401 clears admin session rather than claiming success',async({page,context})=>{
  await setup(page,context,(_r,json)=>json({error:'登录过期'},401))
  await page.getByRole('button',{name:'添加永久积分',exact:true}).first().click()
  await page.getByLabel('添加积分',{exact:true}).fill('1')
  await page.getByLabel('添加原因',{exact:true}).fill('测试')
  await page.getByRole('button',{name:'确认添加'}).click()
  await expect(page.getByRole('button',{name:'进入后台'})).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('sqw_admin_token'))).toBeNull()
})

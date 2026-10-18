import { test, expect } from '@playwright/test'

async function auth(context) {
  await context.addInitScript(() => {
    localStorage.setItem('sqw_admin_token', 'mock-admin')
    localStorage.setItem('sqw_admin_expiry', String(Date.now() + 82800000))
  })
}
async function mock(page) {
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType:'text/css', body:''}))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/admin/')) return route.fulfill({status:404, body:'{}'})
    const path = url.pathname.replace('/api/admin', '')
    const json = value => route.fulfill({status:200, contentType:'application/json', body:JSON.stringify(value)})
    if (path === '/verify') return json({ok:true})
    if (path === '/stats') return json({total:{}})
    if (path === '/users') return json([{username:'mobile-user',phone:'13800138000',tier:1,createdAt:'2026-01-01',lastActive:'2026-01-02',pointsUsed:2,totalPointsUsed:10,pointsLimit:50,pointsRemaining:48}])
    if (path === '/user-tiers') return json({})
    if (path === '/chart-users') return json([{userId:'mobile-user',count:1,latestAt:'2026-01-02'}])
    if (path === '/divination-users') return json([{userId:'mobile-user',count:1,latestAt:'2026-01-02'}])
    if (path === '/suggestion-users') return json([{userId:'mobile-user',count:1,latestAt:'2026-01-02'}])
    if (path === '/charts') return json([{id:'c1',name:'手机命盘',gender:'female',birth:{year:1990,month:1,day:2},birthplace:'上海',createdAt:'2026-01-02'}])
    if (path === '/books') return json([{id:1,title:'手机书籍',category:'general',folder:'',author:'',status:'pending',chunksCount:0}])
    if (path === '/book-folders') return json([])
    if (path === '/divination-records/mobile-user') return json([{id:'d1',type:'liuyao',topic:'手机事项',method:'手动起卦',createdAt:'2026-01-02'}])
    if (path === '/suggestion-detail/mobile-user') return json([{id:'s1',content:'手机建议内容',ratings:{overall:5},createdAt:'2026-01-02'}])
    if (path === '/prompts') return json([{key:'mhys_system',isCustom:false,defaultValue:'默认正文',customValue:''}])
    if (route.request().method() !== 'GET') return json({ok:true})
    return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:`Unexpected mock ${path}`})})
  })
}
async function open(page, section) {
  await page.getByRole('button', {name:'打开菜单'}).click()
  const nav = page.getByRole('dialog', {name:'导航'})
  await nav.getByText(section, {exact:true}).click()
}

for (const width of [320, 390]) test(`管理员核心列表在 ${width}px 使用移动卡片且操作可达`, async ({page, context}) => {
  await page.setViewportSize({width, height:900})
  await auth(context); await mock(page); await page.goto('/admin/', {waitUntil:'domcontentloaded'})
  for (const section of ['用户管理','命盘管理','占卜管理','建议管理','参考书籍']) {
    await open(page, section)
    await expect(page.locator('.ant-table')).toHaveCount(0)
    await expect(page.locator('.admin-mobile-card').first()).toBeVisible()
    await expect(page.locator('.admin-mobile-card').first().getByRole('button').last()).toBeVisible()
  }
  await open(page, '用户管理')
  const points = page.getByRole('button', {name:'今日积分',exact:true})
  expect((await points.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await points.click()
  await expect(page.getByRole('dialog',{name:'调整今日积分'})).toBeVisible()
  await page.getByRole('dialog',{name:'调整今日积分'}).getByRole('button',{name:'Close',exact:true}).click()
  await open(page, '命盘管理')
  await page.getByRole('button',{name:'查看记录',exact:true}).click()
  await expect(page.getByRole('link',{name:'手机命盘'})).toHaveAttribute('href',/admin=1/)
  await expect(page.getByText('上海',{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'删除',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'删除记录'})).toBeVisible()
  await page.getByRole('button',{name:'取消',exact:true}).click()
  await open(page, '占卜管理')
  await page.getByRole('button',{name:'查看记录',exact:true}).click()
  await expect(page.getByRole('link',{name:'手机事项'})).toBeVisible()
  await expect(page.getByText('手动起卦',{exact:true})).toBeVisible()
  await open(page, '建议管理')
  await page.getByRole('button',{name:'查看记录',exact:true}).click()
  await expect(page.getByText('手机建议内容',{exact:true})).toBeVisible()
  for (const section of ['Prompt管理','系统设置','仪表盘']) {
    await open(page, section)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await open(page, 'Prompt管理')
  await expect(page.getByRole('textbox',{name:'Prompt内容'})).toHaveValue('默认正文')
  await page.screenshot({path:test.info().outputPath(`mobile-${width}.png`),fullPage:true})
})

for (const width of [600,601,1280]) test(`${width}px 响应式切换，桌面保留表格`,async({page,context})=>{
  await page.setViewportSize({width,height:900})
  await auth(context);await mock(page);await page.goto('/admin/#users',{waitUntil:'domcontentloaded'})
  if(width===600){await expect(page.locator('.ant-table')).toHaveCount(0);await expect(page.locator('.admin-mobile-card')).toBeVisible()}
  else {await expect(page.locator('.ant-table')).toBeVisible();await expect(page.locator('.admin-mobile-list')).toHaveCount(0)}
})

import { test, expect } from '@playwright/test'

const USERS = [
  { username: 'account-alice', phone: '13800138000', tier: 0, createdAt: '2026-01-01', chartCount: 3, pointsUsed: 4, totalPointsUsed: 40, pointsLimit: 10, pointsRemaining: 6 },
  { username: 'account-bob', phone: '13900139000', tier: 1, createdAt: '2026-01-02', chartCount: 1, pointsUsed: 12.5, totalPointsUsed: 125.5, pointsLimit: 50, pointsRemaining: 37.5 },
]
const PROMPTS = ['mhys_system','mhys_prompt','liuyao_system'].map(key => ({key, isCustom: false, defaultValue: `默认 ${key}`, customValue: ''}))
const STATS = {total: {users: 128, todayUsers: 7, active7d: 41, charts: 96, divinations: 53, totalPoints: 1234.5678, points7d: 89.01}}
const hostile = "名字');window.__injected=1;//"
async function auth(context, expired = false) {
  await context.addInitScript(expired => {
    localStorage.setItem('sqw_admin_token', 'mock-admin')
    localStorage.setItem('sqw_admin_expiry', String(Date.now() + (expired ? -1000 : 82800000)))
  }, expired)
}
async function mock(page, overrides = {}) {
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({contentType:'text/css',body:''}))
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/admin', '')
    if (!url.pathname.startsWith('/api/admin/')) return route.fulfill({status: 404, body:'{}'})
    const json = (value, status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)})
    const method = route.request().method()
    if (['/user-points','/user-tier'].includes(path) && method !== 'PATCH') return json({error:'method mismatch'},405)
    if (path.startsWith('/prompts/') && !['POST','DELETE'].includes(method)) return json({error:'method mismatch'},405)
    if (overrides[path]) return overrides[path](route, json)
    if (path === '/login') return json({token:'logged-in'})
    if (path === '/verify') return json({ok:true})
    if (path === '/stats') return json(STATS)
    if (path === '/users') return json(USERS)
    if (path === '/user-tiers') return json(Object.fromEntries(USERS.map(u=>[u.username,u])))
    if (path === '/prompts') return json(PROMPTS)
    if (['/chart-users','/divination-users','/suggestion-users','/books','/book-folders'].includes(path)) return json([])
    return json({ok:true})
  })
}
async function open(page, section) {
  await page.getByRole('button',{name:'打开菜单',exact:true}).click()
  const nav = page.getByRole('dialog',{name:'导航'})
  await expect(nav).toBeVisible()
  await nav.getByText(section,{exact:true}).click()
  await expect(nav).toBeHidden()
}
async function goto(page, hash='') { await page.goto('/admin/'+hash,{waitUntil:'domcontentloaded'}) }

test('登录失败恢复按钮；成功、退出后可以再次登录', async ({page}) => {
  let attempts=0
  await mock(page, {'/login': (_r,json) => ++attempts===1 ? json({error:'用户名或密码错误'},401):json({token:'logged-in'})})
  await goto(page)
  await page.getByLabel('用户名',{exact:true}).fill('admin')
  await page.getByLabel('密码',{exact:true}).fill('wrong')
  await page.getByRole('button',{name:'进入后台'}).click()
  await expect(page.getByText('用户名或密码错误',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'进入后台'})).toBeEnabled()
  await page.getByRole('button',{name:'进入后台'}).click()
  await expect(page.getByRole('button',{name:'打开菜单'})).toBeVisible()
  await page.getByRole('button',{name:'退出',exact:true}).click()
  await expect(page.getByRole('button',{name:'进入后台'})).toBeEnabled()
  await page.getByLabel('用户名',{exact:true}).fill('admin')
  await page.getByLabel('密码',{exact:true}).fill('right')
  await page.getByRole('button',{name:'进入后台'}).click()
  await expect(page.getByRole('button',{name:'打开菜单'})).toBeVisible()
})

for (const expired of [false,true]) test(`凭据失效不能进入后台 expired=${expired}`, async ({page,context}) => {
  await auth(context,expired)
  await mock(page,{'/verify':(_r,json)=>json({error:'未授权'},401)})
  await goto(page)
  await expect(page.getByRole('button',{name:'进入后台'})).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('sqw_admin_token'))).toBeNull()
})

for (const width of [390,768,1280]) test(`${width}px 左上菜单抽屉切换全部栏目，无顶部导航和移除内容`, async ({page,context}) => {
  await page.setViewportSize({width,height:900})
  await auth(context); await mock(page); await goto(page)
  await expect(page.getByRole('button',{name:'打开菜单'})).toBeVisible()
  await expect(page.getByText('小程序',{exact:false})).toHaveCount(0)
  await expect(page.getByText('服务器状态',{exact:false})).toHaveCount(0)
  await expect(page.getByRole('tablist')).toHaveCount(0)
  const errors=[]; page.on('pageerror',e=>errors.push(e.message))
  for (const name of ['用户管理','命盘管理','占卜管理','建议管理','参考书籍','Prompt管理','系统设置','仪表盘']) await open(page,name)
  expect(errors).toEqual([])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:test.info().outputPath(`admin-${width}.png`),fullPage:true})
})

test('积分和等级使用稳定账号标识；失败保留表单', async ({page,context}) => {
  const bodies={}; let fail=true
  await auth(context)
  await mock(page,{
    '/user-points':(r,json)=>{bodies.points=r.request().postDataJSON();return fail?json({error:'暂不可用'},503):json({ok:true})},
    '/user-tier':(r,json)=>{bodies.tier=r.request().postDataJSON();return json({ok:true})},
  })
  await goto(page);await open(page,'用户管理')
  await page.getByRole('button',{name:'今日积分',exact:true}).first().click()
  await page.getByLabel('今日已用积分',{exact:true}).fill('0.0123')
  await page.getByRole('dialog').getByRole('button',{name:/保存/}).click()
  await expect(page.getByText('暂不可用',{exact:true})).toBeVisible()
  await expect(page.getByLabel('今日已用积分',{exact:true})).toHaveValue('0.0123')
  fail=false
  await page.getByRole('dialog').getByRole('button',{name:/保存/}).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(bodies.points).toEqual({username:'account-alice',pointsUsed:0.0123})
  await page.getByRole('button',{name:'调整等级',exact:true}).first().click()
  await page.getByLabel('会员等级',{exact:true}).click()
  await page.getByRole('combobox',{name:/会员等级/}).press('ArrowDown')
  await page.getByRole('combobox',{name:/会员等级/}).press('Enter')
  await page.getByRole('dialog').getByRole('button',{name:/保存/}).click()
  await expect.poll(()=>bodies.tier).toEqual({username:'account-alice',tier:1})
  await expect(page.getByRole('button',{name:'删除用户',exact:true}).first()).toBeEnabled()
})

test('会话中途401回登录，不把失败显示成空列表', async ({page,context}) => {
  await auth(context)
  await mock(page,{'/users':(_r,json)=>json({error:'登录已过期'},401)})
  await goto(page,'#users')
  await expect(page.getByRole('button',{name:'进入后台'})).toBeVisible()
})

test('数据库失败显示重试，不伪造统计为零', async ({page,context}) => {
  await auth(context)
  await mock(page,{'/stats':(_r,json)=>json({error:'统计暂不可用'},503)})
  await goto(page)
  await expect(page.getByText('统计暂不可用',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:/重试/})).toBeVisible()
})

test('用户文本不生成内联脚本，带引号的命盘名安全展示', async ({page,context}) => {
  await auth(context)
  await mock(page,{
    '/chart-users':(_r,json)=>json([{userId:'account-alice',count:1}]),
    '/charts':(_r,json)=>json([{id:'fixture',name:hostile,gender:'male',birth:{year:1990,month:1,day:1}}]),
  })
  await goto(page);await open(page,'命盘管理')
  await page.getByText('account-alice',{exact:true}).first().click()
  await expect(page.getByText(hostile,{exact:false})).toBeVisible()
  expect(await page.locator('[onclick]').count()).toBe(0)
  expect(await page.evaluate(()=>window.__injected)).toBeUndefined()
})


test('Prompt 默认正文、独立草稿、保存失败与重置', async ({page,context}) => {
  await auth(context);let fail=true;const writes=[];
  await mock(page,{'/prompts/mhys_system':(r,json)=>{writes.push([r.request().method(),r.request().postData()]);return fail?json({error:'保存暂不可用'},503):json({ok:true})}});
  await goto(page,'#prompts');
  const editor=page.getByRole('textbox',{name:'Prompt内容'});
  await expect(editor).toHaveValue('默认 mhys_system');
  await editor.fill('保留系统草稿');
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).focus();
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).press('ArrowDown');
  await page.getByRole('option',{name:'梅花易数 · 用户提示词（有事项）',exact:true}).click();
  await editor.fill('另一份草稿');
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).focus();
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).press('ArrowDown');
  await page.getByRole('option',{name:'梅花易数 · 系统提示词',exact:true}).click();
  await expect(editor).toHaveValue('保留系统草稿');
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByText('保存暂不可用',{exact:true})).toBeVisible();
  await expect(editor).toHaveValue('保留系统草稿');fail=false;
  await page.getByRole('button',{name:'保存',exact:true}).click();
  await expect(page.getByRole('button',{name:'恢复默认'})).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'恢复默认'}).click();
  await expect(editor).toHaveValue('默认 mhys_system');
  expect(writes.at(-1)[0]).toBe('DELETE');
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).focus();
  await page.getByRole('combobox',{name:'选择 Prompt 模板'}).press('ArrowDown');
  await page.getByRole('option',{name:'梅花易数 · 用户提示词（有事项）',exact:true}).click();
  await expect(editor).toHaveValue('另一份草稿');
});

test('管理记录可删除，失败保留确认并重试',async({page,context})=>{
  await auth(context);let failed=true,deleted=false;
  await mock(page,{
    '/chart-users':(_r,json)=>json([{userId:'owner',count:1}]),
    '/charts':(_r,json)=>json(deleted?[]:[{id:'chart-safe',name:'测试命盘',gender:'male'}]),
    '/charts/chart-safe':(r,json)=>{expect(r.request().method()).toBe('DELETE');if(failed)return json({error:'删除失败'},503);deleted=true;return json({ok:true})},
  });
  await goto(page,'#charts');await page.getByRole('button',{name:'owner',exact:true}).click();
  await expect(page.getByRole('link',{name:'测试命盘'})).toHaveAttribute('href',/admin=1/);
  await page.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('button',{name:'确认删除'}).click();
  await expect(page.getByText('删除失败',{exact:true})).toBeVisible();failed=false;
  await page.getByRole('button',{name:'确认删除'}).click();
  await expect(page.getByRole('dialog')).toBeHidden();await expect(page.getByRole('link',{name:'测试命盘'})).toHaveCount(0);
});


test('书籍读取正文、失败保留修改、批量入库只显示接受',async({page,context})=>{
  await auth(context);let fail=true;const writes=[];
  await mock(page,{
    '/books':(_r,json)=>json([{id:7,title:'示例书籍',category:'meihua',hasContent:true,status:'pending'}]),
    '/books/7':(r,json)=>{if(r.request().method()==='GET')return json({id:7,title:'示例书籍',category:'meihua',content:'实际正文',folder:'',author:'',description:''});writes.push(r.request().postDataJSON());return fail?json({error:'书籍保存失败'},503):json({ok:true})},
    '/books/ingest-all':(_r,json)=>json({ok:true}),
  });
  await goto(page,'#books');await page.getByRole('button',{name:'编辑',exact:true}).click();
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('实际正文');
  await page.getByLabel('正文',{exact:true}).fill('修改正文');
  await page.getByRole('button',{name:/保存书籍/}).click();
  await expect(page.getByText('书籍保存失败',{exact:true})).toBeVisible();
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('修改正文');fail=false;
  await page.getByRole('button',{name:/保存书籍/}).click();
  await expect(page.getByRole('dialog')).toBeHidden();expect(writes.at(-1).category).toBe('meihua');
  await page.getByRole('button',{name:'批量入库',exact:true}).click();
  await page.getByRole('button',{name:'确认开始'}).click();
  await expect(page.getByText(/后台已接受批量入库/)).toBeVisible();
});

// `/admin/`（后台管理）—— 阶段 3 最后一页的判据。
//
// ★ 判据档位：**冒烟**。30 天真实请求 1 次（§4.30），是全站流量最小的页；
//   但它是**全站最大的一页**（html 470 + js 1160 = 1630 行，8 个 tab、4 个模态框、
//   20 多处删除/编辑入口），而且是唯一需要**管理员 token** 的页。
//
// ★ 这一页的判据重心：**搬完之后「谁都能进」或者「谁都进不去」**
// ─────────────────────────────────────────────────────────────
// 老实现的登录门是这样一个三段式：
//   ① `localStorage.sqw_admin_token` + `sqw_admin_expiry`（23 小时）—— 不是 cookie
//   ② 有 token 且没过期 → `GET /api/admin/verify` 打一下后端，2xx 才 `showDash()`
//   ③ 没有/过期 → `clearAuth()`，停在登录卡
// 这三段里任何一段搬错，症状都很「安静」：
//   · ② 忘了 → 随便谁塞个 token 就能看后台
//   · ③ 忘了 → token 过期的人卡在一个永远空着的仪表盘上
//   · ① 的键名写错 → 每次进来都得重新登录
// 所以下面把三段分别钉住，另外把「退出要真清」也钉住。
//
// ★ 8 个 tab 全点一遍，是这一页最便宜的回归
// ─────────────────────────────────────────────────────────────
// 老实现的 tab 切换是「所有 `.adm-nav-item` 去 active → 当前的加 active →
// 所有 `.adm-tab` 去 active → `#tab-<name>` 加 active → 再按名字拉数据」。
// 任何一个 id 抄错，表现是「点了没反应、也不报错」。逐个点一遍就钉住了。
//
// ★ `#admClock` 每秒跳一次 → 基线里打码
// ─────────────────────────────────────────────────────────────
// 顶栏那个时钟是 `setInterval(..., 1000)` 写的 `toLocaleString('zh-CN')`，
// 秒级变化，拍进基线必然红。

import { test, expect } from '@playwright/test'

const PAGE = '/admin/'
const TABS = ['dashboard', 'users', 'charts', 'divination', 'settings', 'suggestions', 'books', 'prompts']

/** 仪表盘那一坨要喂给 `/api/admin/stats` 的假数据。数字都是特意挑的、互不相同， */
/** 这样「总计 / 网站 / 小程序」三档切起来能看出到底换了没。 */
const STATS = {
  total: { users: 128, todayUsers: 7, active7d: 41, charts: 96, divinations: 53, totalPoints: 1234.5678, points7d: 89.01 },
  web: { users: 100, todayUsers: 5, active7d: 30, charts: 80, divinations: 40, totalPoints: 1000, points7d: 70 },
  wechat: { users: 28, todayUsers: 2, active7d: 11, charts: 16, divinations: 13, totalPoints: 234.567, points7d: 19.01 },
  server: { expiresAt: '2027-03-01T00:00:00Z', daysLeft: 133 },
  deepseek: { status: 'active', apiKeyPrefix: 'sk-abcd' },
}

/** `/api/admin/prompts` 的形状：数组，每项 `{key, isCustom, customValue, defaultValue}`。 */
const PROMPTS = ['mhys_system', 'mhys_prompt', 'mhys_notopic', 'mhys_followup',
  'liuyao_system', 'liuyao_prompt', 'liuyao_notopic', 'liuyao_followup'].map((key) => ({
  key, isCustom: false, customValue: '', defaultValue: '默认文案 · ' + key,
}))

const USERS = [
  { phone: '13800138000', username: '13800138000', userType: 'web', createdAt: 1700000000000, chartCount: 3, aiCount: 2, pointsUsed: 4, totalPointsUsed: 40, pointsLimit: 10, pointsRemaining: 6, lastActive: 1700000600000 },
  { phone: '13900139000', username: '13900139000', userType: 'wechat', openid: 'oABC123', createdAt: 1700000000000, chartCount: 1, aiCount: 0, pointsUsed: 12.5, totalPointsUsed: 125.5, pointsLimit: 50, pointsRemaining: 37.5, tier: 1, lastActive: 1700000600000 },
]

/**
 * 一条 route 兜住所有 `/api/admin/**`。
 * 返回 `{ ok: true }` 太粗糙 —— `loadUsers` 会 `await res.json()` 再 `.map()`，
 * 给个非数组就抛在里面被 catch 吞成「加载失败」，测试看不出是 mock 的问题。
 * 所以按 path 给对形状。
 */
async function mockAdmin(page, overrides = {}) {
  await page.route('**/api/admin/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/admin', '')
    if (overrides[path]) return overrides[path](route)
    const ok = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/verify') return ok({ ok: true })
    if (path === '/stats') return ok(STATS)
    if (path === '/users') return ok(USERS)
    if (path === '/user-tiers') return ok({
       '13800138000': { tier: 0, pointsUsed: 4, pointsLimit: 10, pointsRemaining: 6 },
       '13900139000': { tier: 1, pointsUsed: 12.5, pointsLimit: 50, pointsRemaining: 37.5 },
     })
     if (path === '/user-points' && route.request().method() === 'PATCH') return ok({ ok: true })
    if (path === '/chart-users') return ok([])
    if (path === '/divination-users') return ok([])
    if (path === '/suggestion-users') return ok([])
    if (path === '/book-folders') return ok([])
    if (path === '/books') return ok([])
    // ★ `/prompts` 必须回**数组**，且每项带 key —— `loadPrompts` 里是
    // `prompts.find(p => p.key === key)`，给 `{}` 会抛 `prompts.find is not a function`，
    // 被它自己的 try/catch 吞成「加载失败，请重试」，同时留下一条 console.error
    // （这条错误第一次跑就把「8 个 tab 零报错」那条判据顶红了 —— 判据抓的是**真东西**）。
    if (path === '/prompts') return ok(PROMPTS)
    return ok({})
  })
}

/** 在**任何脚本跑之前**往 localStorage 里塞一个管理员 token（老实现的键名）。 */
async function withAdminToken(context, { expired = false } = {}) {
  const expiry = expired ? Date.now() - 1000 : Date.now() + 23 * 60 * 60 * 1000
  await context.addInitScript(([token, exp]) => {
    localStorage.setItem('sqw_admin_token', token)
    localStorage.setItem('sqw_admin_expiry', String(exp))
  }, ['admin-token-for-smoke-test', expiry])
}

function collectErrors(page) {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text())
  })
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))
  return errors
}

test.describe('/admin/', () => {
  test('编辑今日积分：接受4位小数并发送新接口，拒绝负数', async ({ page, context }) => {
    await withAdminToken(context)
    let requestBody
    await mockAdmin(page, { '/user-points': async route => {
      if (route.request().method() === 'PATCH') { requestBody = JSON.parse(route.request().postData() || '{}'); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }) }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    } })
    await page.goto(PAGE)
    await page.locator('.adm-nav-item[data-tab="users"]').click()
    await page.locator('button', { hasText: '今日积分' }).first().click()
    await page.locator('#tokenInput').fill('1.2345')
    await page.locator('#modalToken button', { hasText: '保存' }).click()
    await expect.poll(() => requestBody).toEqual({ username: '13800138000', pointsUsed: 1.2345 })
    await page.locator('.adm-nav-item[data-tab="users"]').click()
    await page.locator('button', { hasText: '今日积分' }).first().click()
    await page.locator('#tokenInput').fill('-1')
    await page.locator('#modalToken button', { hasText: '保存' }).click()
    await expect(page.locator('#tokenErr')).toContainText('非负积分')
  })

  test('手机号与用户名不同时，积分及等级操作使用用户名', async ({ page, context }) => {
    await withAdminToken(context)
    const bodies = {}
    await mockAdmin(page, {
      '/users': route => route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ ...USERS[0], username: 'account-alice', tier: 0 }]) }),
      '/user-points': route => { bodies.points = route.request().postDataJSON(); return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' }) },
      '/user-tier': route => { bodies.tier = route.request().postDataJSON(); return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' }) },
    })
    await page.goto(PAGE)
    await page.locator('.adm-nav-item[data-tab="users"]').click()
    await expect(page.locator('#usersTbody')).toContainText('13800138000')
    await page.locator('button', { hasText: '今日积分' }).click()
    await page.locator('#tokenInput').fill('0.0123')
    await page.locator('#modalToken button', { hasText: '保存' }).click()
    await expect.poll(() => bodies.points).toEqual({ username: 'account-alice', pointsUsed: 0.0123 })
    await page.locator('.adm-tier-select').selectOption('1')
    await expect.poll(() => bodies.tier).toEqual({ username: 'account-alice', tier: 1 })
  })

  test('等级更新失败显示错误并恢复控件', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page, { '/user-tier': route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'forbidden' }) }) })
    await page.goto(PAGE)
    await page.locator('.adm-nav-item[data-tab="users"]').click()
    const select = page.locator('.adm-tier-select').first()
    await select.selectOption('1')
    await expect(page.locator('.adm-tier-select').first()).toBeEnabled()
  })
  test('视觉基线：未登录（登录卡片）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#admLogin')).toBeVisible()
    await expect(page.locator('#admDash')).toBeHidden()
    await expect(page).toHaveScreenshot('admin-login.png', { fullPage: true })
  })

  test('空表单提交：只提示，不发登录请求', async ({ page }) => {
    let loginCalls = 0
    await page.route('**/api/admin/login', async (route) => { loginCalls++; await route.fulfill({ status: 200, body: '{}' }) })
    await page.goto(PAGE)
    // ★ 两个 input 都带 `required`，浏览器的原生校验会**先**把 submit 拦下来，
    // 那样 `doLogin` 根本不会跑，这条判据就变成「在测浏览器」了。
    // 关掉原生校验，专测 `doLogin` 里那个空判断。
    await page.locator('#admLoginForm').evaluate((f) => { f.noValidate = true })
    await page.locator('#admLoginForm button[type=submit]').click()
    await expect(page.locator('#admLoginErr')).toHaveText('请输入用户名和密码')
    expect(loginCalls).toBe(0)
    // 卡片还在，没跳进后台
    await expect(page.locator('#admDash')).toBeHidden()
  })

  test('登录失败：后端 401 → 显示后端文案，按钮恢复可点', async ({ page }) => {
    await page.route('**/api/admin/login', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"用户名或密码错误"}' }))
    await page.goto(PAGE)
    await page.locator('#admUsername').fill('root')
    await page.locator('#admPassword').fill('wrong')
    await page.locator('#admLoginForm button[type=submit]').click()
    await expect(page.locator('#admLoginErr')).toHaveText('用户名或密码错误')
    await expect(page.locator('#admLoginForm button[type=submit]')).toBeEnabled()
    await expect(page.locator('#admLoginForm button[type=submit]')).toHaveText('进入后台')
    await expect(page.locator('#admDash')).toBeHidden()
  })

  test('登录成功：token 与 23 小时过期时间都写进 localStorage，然后进后台', async ({ page }) => {
    await mockAdmin(page, {
      '/login': (route) => route.fulfill({
        status: 200, contentType: 'application/json', body: '{"token":"tok-from-server"}',
      }),
    })
    await page.goto(PAGE)
    await page.locator('#admUsername').fill('root')
    await page.locator('#admPassword').fill('correct')
    await page.locator('#admLoginForm button[type=submit]').click()
    await expect(page.locator('#admDash')).toBeVisible()
    await expect(page.locator('#admLogin')).toBeHidden()

    const stored = await page.evaluate(() => ({
      token: localStorage.getItem('sqw_admin_token'),
      expiry: Number(localStorage.getItem('sqw_admin_expiry')),
    }))
    expect(stored.token).toBe('tok-from-server')
    // 23 小时 = 82,800,000 ms。给 5 分钟余量（这个断言的意义是「不是 1 小时也不是 30 天」）
    const delta = stored.expiry - Date.now()
    expect(delta).toBeGreaterThan(23 * 3600 * 1000 - 5 * 60 * 1000)
    expect(delta).toBeLessThan(23 * 3600 * 1000 + 60 * 1000)
  })

  test('视觉基线：已登录的仪表盘（总计档）', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page)
    await page.goto(PAGE)
    await expect(page.locator('#admDash')).toBeVisible()
    // 六个数字都从 `—` 变成 mock 里的值（说明 /stats 真的打了、renderDash 真的跑了）
    await expect(page.locator('#statUsers')).toHaveText('128')
    await expect(page.locator('#statToday')).toHaveText('7')
    await expect(page.locator('#statActive')).toHaveText('41')
    await expect(page.locator('#statCharts')).toHaveText('96')
    await expect(page.locator('#statDivination')).toHaveText('53')
    // fmtToken：<1000 原样、<1e6 用 K、否则 M，都 toFixed(1)
    await expect(page.locator('#statTokens')).toHaveText('1,234.5678')
    // 顶栏时钟每秒跳 → 打码
    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      fullPage: true, mask: [page.locator('#admClock')],
    })
  })

  test('有效 token：进页先 verify，2xx 才放行到后台', async ({ page, context }) => {
    let verifyCalls = 0
    await withAdminToken(context)
    await mockAdmin(page, {
      '/verify': (route) => { verifyCalls++; return route.fulfill({ status: 200, body: '{}' }) },
    })
    await page.goto(PAGE)
    await expect(page.locator('#admDash')).toBeVisible()
    expect(verifyCalls).toBe(1)
  })

  test('★ token 被后端否掉（verify 401）→ 停在登录卡，不进后台', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page, {
      '/verify': (route) => route.fulfill({ status: 401, body: '{}' }),
    })
    await page.goto(PAGE)
    await expect(page.locator('#admLogin')).toBeVisible()
    await expect(page.locator('#admDash')).toBeHidden()
  })

  test('★ 过期 token（expiry 是过去）→ 不打 verify、直接清掉并停在登录卡', async ({ page, context }) => {
    let verifyCalls = 0
    await withAdminToken(context, { expired: true })
    await mockAdmin(page, {
      '/verify': (route) => { verifyCalls++; return route.fulfill({ status: 200, body: '{}' }) },
    })
    await page.goto(PAGE)
    await expect(page.locator('#admLogin')).toBeVisible()
    expect(verifyCalls).toBe(0)
    // `clearAuth()` 必须把本地那两个键删干净
    const left = await page.evaluate(() => ({
      token: localStorage.getItem('sqw_admin_token'),
      expiry: localStorage.getItem('sqw_admin_expiry'),
    }))
    expect(left.token).toBeNull()
    expect(left.expiry).toBeNull()
  })

  test('退出：清 localStorage 并回到登录卡', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page)
    await page.goto(PAGE)
    await expect(page.locator('#admDash')).toBeVisible()
    await page.locator('#admLogout').click()
    await expect(page.locator('#admLogin')).toBeVisible()
    await expect(page.locator('#admDash')).toBeHidden()
    const left = await page.evaluate(() => localStorage.getItem('sqw_admin_token'))
    expect(left).toBeNull()
  })

  test('★ 8 个 tab 逐个点：只有被点的那一个 active，section 也跟着换', async ({ page, context }) => {
    const errors = collectErrors(page)
    await withAdminToken(context)
    await mockAdmin(page)
    await page.goto(PAGE)
    await expect(page.locator('#admDash')).toBeVisible()

    for (const tab of TABS) {
      await page.locator(`.adm-nav-item[data-tab="${tab}"]`).click()
      // 侧栏：只有它 active
      await expect(page.locator('.adm-nav-item.active')).toHaveCount(1)
      await expect(page.locator(`.adm-nav-item[data-tab="${tab}"]`)).toHaveClass(/active/)
      // 内容：只有它 active
      await expect(page.locator('.adm-tab.active')).toHaveCount(1)
      await expect(page.locator(`#tab-${tab}`)).toHaveClass(/active/)
    }
    // 切完一圈不该有任何报错（任何 id 抄错都会在某个 tab 上炸出一条 pageerror）
    expect(errors).toEqual([])
  })

  test('仪表盘三档切换：active 跟着换，数字也跟着换', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page)
    await page.goto(PAGE)
    await expect(page.locator('#statUsers')).toHaveText('128')

    await page.locator('.adm-toggle-btn[data-dash="web"]').click()
    await expect(page.locator('.adm-toggle-btn.active')).toHaveCount(1)
    await expect(page.locator('.adm-toggle-btn[data-dash="web"]')).toHaveClass(/active/)
    await expect(page.locator('#statUsers')).toHaveText('100')
    await expect(page.locator('#statTokens7d')).toHaveText('70')

    await page.locator('.adm-toggle-btn[data-dash="wechat"]').click()
    await expect(page.locator('#statUsers')).toHaveText('28')
    // 注意 `#statActive` 读的是 `total.active7d`（不是当前档的）—— 老实现就是这样，
    // 属 §4.9「照搬老行为」：切到小程序档，7 天活跃仍是全站的 41。
    await expect(page.locator('#statActive')).toHaveText('41')

    await page.locator('.adm-toggle-btn[data-dash="total"]').click()
    await expect(page.locator('#statUsers')).toHaveText('128')
  })

  test('用户搜索：输入手机号片段 → 表格只剩匹配那行', async ({ page, context }) => {
    await withAdminToken(context)
    await mockAdmin(page)
    await page.goto(PAGE)
    await page.locator('.adm-nav-item[data-tab="users"]').click()
    await expect(page.locator('#usersTable tbody tr')).toHaveCount(2)
    await expect(page.locator('#usersMeta')).toHaveText('共 2 人')

    await page.locator('#usersSearch').fill('1380')
    await expect(page.locator('#usersTable tbody tr')).toHaveCount(1)
    await expect(page.locator('#usersTable tbody tr').first()).toContainText('13800138000')

    await page.locator('#usersSearch').fill('9999')
    await expect(page.locator('#usersTable tbody tr')).toHaveCount(1)
    await expect(page.locator('#usersTable tbody')).toContainText('暂无匹配用户')

    // 清空 → 全部回来
    await page.locator('#usersSearch').fill('')
    await expect(page.locator('#usersTable tbody tr')).toHaveCount(2)
  })
})

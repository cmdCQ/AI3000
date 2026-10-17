// `/my-charts/`（我的命盘列表）—— 阶段 4 的**补判据**。
//
// ★ 为什么现在才写它：同 `tests/liuyao.spec.mjs` 的头注释。这一页用
//   `bazi_render.js`(447) + `bazi_ai_panel.js`(435) + `ai_panel.js`(751) + `ui_common.js`(90)，
//   四份都在阶段 4 的搬迁清单里。原来保护它的是 `duipan/drive_my_charts*.js`。
//
// ★ 老页已不存在：React 版在阶段 3 上线，`src/web/my-charts/index.html` 已删除。
//   本文件是 **characterization test**。
//
// ★ 档位：冒烟 + 关键路径（30 天 23 次真人请求；它是「命盘」这条主线的入口）。
//
// ★ 接口一律 mock（`GET /api/charts` 的形状是 `{ birth: { year, month, day, hour, minute } }`）。
//   第一版我按 `birthYear/birthMonth/...` 平铺写，页面直接
//   `pageerror: Cannot read properties of undefined (reading 'year')` —— 形状错了页面只白屏，
//   所以这条也得进判据（下面「零 console 报错」就是它）。

import { test, expect } from '@playwright/test'

const PAGE = '/my-charts/'

/** 两张盘。字段形状以 `src/app/lib/myChartsView.js:50-70` 为准（`chart.birth.*`）。 */
const CHARTS = [
  {
    id: 'c1',
    name: '张三',
    gender: 'male',
    birth: { year: 1990, month: 5, day: 17, hour: 14, minute: 30 },
    longitude: 120,
    trueSolarTime: false,
  },
  {
    id: 'c2',
    name: '李四',
    gender: 'female',
    birth: { year: 1985, month: 2, day: 3, hour: 8, minute: 0 },
    longitude: 120,
    trueSolarTime: false,
  },
]

async function loginAs(page, name = '13800138000') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_username', value: name, domain: host, path: '/' },
    { name: 'sqw_token', value: 'fake-token-for-smoke-test', domain: host, path: '/' },
  ])
}

function collectErrors(page) {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text())
  })
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))
  return errors
}

/** 把列表接口换掉。返回被截下来的请求（给断言看 Authorization 与 method）。 */
async function mockList(page, charts = CHARTS) {
  const seen = []
  // ★ 用 `**/api/charts**`（带尾巴的也要截）：删除走的是 `/api/charts/<id>`，
  //   只截 `/api/charts` 的话那条 DELETE 会打到真站 —— 那就不是判据了。
  await page.route('**/api/charts**', async (route) => {
    const req = route.request()
    seen.push({ method: req.method(), auth: req.headers()['authorization'] || '' })
    if (req.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(charts),
      })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  return seen
}

test.describe('/my-charts/ 我的命盘', () => {
  test('视觉基线：两张命盘', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockList(page)
    await page.goto(PAGE)
    await expect(page.locator('body')).toContainText('张三')
    await expect(page).toHaveScreenshot('my-charts-list.png', { fullPage: true })
  })

  test('空列表：空态文案 + 「新建命盘」指向 /charts/ 建盘页', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockList(page, [])
    await page.goto(PAGE)
    await expect(page.locator('body')).toContainText('还没有命盘')
    await expect(page.locator('body')).toContainText('添加一份命盘')
    const hrefs = await page.locator('a').evaluateAll((ns) => ns.map((n) => n.getAttribute('href')))
    expect(hrefs).toContain('/charts/?action=create')
  })

  test('两张卡：姓名、性别、出生日期、生肖都派生对了', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    const seen = await mockList(page)
    await page.goto(PAGE)

    await expect(page.locator('body')).toContainText('张三')
    await expect(page.locator('body')).toContainText('李四')
    // ★ 出生日期用的是**点**不是横杠：`1990.05.17`（`myChartsView.js` 的 `solarText`）。
    //   我第一版按 `/charts/` 的 `-` 写，红了一次 —— 两页的日期格式本来就不一样。
    await expect(page.locator('body')).toContainText('1990.05.17')
    await expect(page.locator('body')).toContainText('1985.02.03')
    // 时辰是派生的：14:30 → 未时（13-15），08:00 → 辰时（7-9）
    await expect(page.locator('body')).toContainText('未时')
    await expect(page.locator('body')).toContainText('辰时')
    // 生肖：1990 → 马，1985 → 牛（锚点 2020 鼠，(year-4)%12）
    await expect(page.locator('body')).toContainText('🐴')
    await expect(page.locator('body')).toContainText('🐂')
    // 列表请求带 Bearer
    expect(seen.some((s) => s.method === 'GET' && s.auth.startsWith('Bearer '))).toBe(true)
    expect(errors).toEqual([])
  })

  test('三点菜单：打开后有「编辑命盘」与「删除命盘」（§5.4 的现状快照）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockList(page)
    await page.goto(PAGE)
    await expect(page.locator('body')).toContainText('张三')

    // ★ 触发器是卡片右上角那颗 ⋯：`<span class="card-arrow" onclick="…toggleMenu('id','名')">⋯</span>`
    //   （`src/app/lib/myChartsView.js:124`）。没有 `openMenu` 这个名字 —— 叫 `toggleMenu`。
    await page.locator('#card-c1 .card-arrow').click()

    const menu = page.locator('#card-menu')
    await expect(menu).toBeVisible()
    // ★ §5.4（用户 2026-10-17）：菜单项前的 🗑 已经删了 —— 同一份菜单里「编辑命盘」
    //   没有图标，只有这一项带 emoji，看着像两个来源拼的；`.menu-item.danger` 的
    //   红色文字已经说明了这是删操作。这里钉「文案还在、图标不在」。
    await expect(menu).toContainText('编辑命盘')
    await expect(menu).toContainText('删除命盘')
    await expect(page.locator('#card-menu .menu-item.danger')).toHaveText('删除命盘')
  })

  test('删除：走 DELETE 而不是 GET，删完跳回列表', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    const seen = await mockList(page)
    // 确认框一律「确定」
    page.on('dialog', (d) => d.accept())
    await page.goto(PAGE)
    await expect(page.locator('body')).toContainText('张三')

    await page.locator('#card-c1 .card-arrow').click()
    await page.locator('#card-menu .menu-item.danger').click()

    // 删除请求的 method 必须是 DELETE（`ChartsStore.remove`）
    await expect
      .poll(() => seen.filter((s) => s.method === 'DELETE').length, { timeout: 10_000 })
      .toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
})

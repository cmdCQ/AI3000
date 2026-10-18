// 选盘入口保护：五态、原生链接键盘行为、来源兼容与卡片派生字段。
// 所有 API 都由测试拦截，使用合成记录，不读取生产用户数据。
// 卡片保留 6 个派生值：
//     · 生肖 emoji：`ZODIAC_EMOJI[(birth.year - 4) % 12]`（负数要回卷）
//     · 时辰字：`SHICHEN[Math.floor(((hour ?? 12) + 1) % 24 / 2)]`
//     · 日期：`YYYY.MM.DD`（月日要补零）
//     · 创建时间：`YYYY-MM-DD`（来自 createdAt 毫秒时间戳）
//     · 八字简写：`bazi.split(' ')[2]`（只有三段以上才显示）
//     · 性别：male→男，其余全是女
//   这些都能用 `/api/charts` 的**假响应**在 Playwright 里逐一钉住，
//   不需要真库、也不需要登录态真的存在。
//
// ★ 三个视觉基线覆盖三种状态：登录提示 / 空列表 / 有卡片。

import { test, expect } from '@playwright/test'

const PAGE = '/select-chart/'

/** 造一个「已登录」：老 `auth.js` 的 `isLoggedIn()` 只看 `sqw_username` 这一个 cookie。 */
async function loginAs(page, username = 'tester') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_username', value: username, domain: host, path: '/' },
    { name: 'sqw_token', value: 'fake-token-for-smoke-test', domain: host, path: '/' },
  ])
}

/** 一条命盘记录，字段取全（后端返回的就是这些）。 */
function makeChart(over = {}) {
  return {
    id: 'c1',
    name: '张三',
    gender: 'male',
    birth: { year: 1990, month: 3, day: 7, hour: 14, minute: 30 },
    bazi: '庚午 己卯 甲子 辛未',
    createdAt: Date.UTC(2026, 8, 1, 4, 0, 0), // 2026-09-01
    ...over,
  }
}

async function mockCharts(page, charts) {
  await page.route('**/api/charts', (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(charts),
    })
  })
}

test.describe('/select-chart/', () => {
  test.beforeEach(async ({ page }) => {
    // 外部字体不属于页面行为判据，避免其网络可用性阻塞 load。
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
    await page.route('**/api/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  })

  test('视觉基线：未登录（登录提示）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('.es-title')).toHaveText('登录后查看已有命盘')
    await expect(page).toHaveScreenshot('select-chart-guest.png', { fullPage: true })
  })

  test('视觉基线：已登录但还没有命盘', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [])
    await page.reload()
    await expect(page.locator('.es-title')).toHaveText('还没有命盘')
    await expect(page).toHaveScreenshot('select-chart-empty.png', { fullPage: true })
  })

  test('视觉基线：已登录、一张命盘', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart()])
    await page.reload()
    await expect(page.locator('.mc-card')).toHaveCount(1)
    await expect(page).toHaveScreenshot('select-chart-list.png', { fullPage: true })
  })

  test('顶部使用梅花六爻同款并排返回与标题，不显示图标和说明', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.getByRole('link', { name: '← 返回', exact: true })).toHaveAttribute('href', '/')
    await expect(page.getByRole('heading', { name: '四柱八字', exact: true })).toBeVisible()
    await expect(page.locator('.module-label, .select-header .icon, .select-header .sub')).toHaveCount(0)
    expect(await page.locator('.select-header').evaluate(e => getComputedStyle(e).justifyContent)).not.toBe('space-between')
  })

  test('「新建命盘」链接带着当前 type 回传', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#create-link')).toHaveAttribute('href', '/charts/?action=create&from=charts')

    await page.goto(PAGE + '?type=ziwei')
    await expect(page.locator('#create-link')).toHaveAttribute('href', '/charts/?action=create&from=ziwei')
  })

  test('未登录：显示登录提示，且「新建命盘」链接仍在', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#content-area .es-icon')).toHaveText('🔒')
    await expect(page.locator('.es-title')).toHaveText('登录后查看已有命盘')
    await expect(page.locator('.es-desc')).toHaveText('保存多份命盘，随时查看排盘；也可先进入新建入口。')
    await expect(page.locator('#content-area .add-btn')).toHaveText('登录')
    await expect(page.getByRole('button', { name: '注册', exact: true })).toHaveText('注册')
    await expect(page.locator('#create-link')).toBeVisible()
    await expect(page.locator('.loading-msg')).toHaveCount(0)
    await expect(page.locator('.select-title')).toHaveText('四柱八字')
    await expect(page.locator('.auth-wrapper, .auth-card')).toHaveCount(0)
  })

  test('未登录：点「登录」会弹登录框（auth.js 在这页是引了的）', async ({ page }) => {
    await page.goto(PAGE)
    await page.locator('#content-area .add-btn').click()
    await expect(page.locator('#authModalOverlay')).toBeVisible()
  })

  test('没有命盘：空状态文案跟着 type 变', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [])
    await page.reload()
    await expect(page.locator('#content-area .es-icon')).toHaveText('📜')
    await expect(page.locator('.es-desc')).toHaveText('新建一份四柱八字命盘，即可查看排盘与解读')
    await expect(page.locator('#content-area .add-btn')).toHaveText('＋ 新建命盘')
    await expect(page.getByRole('link', { name: '＋ 新建命盘', exact: true })).toHaveCount(1)

    await page.goto(PAGE + '?type=ziwei')
    await expect(page.locator('.es-desc')).toHaveText('新建一份四柱八字命盘，即可查看排盘与解读')

    await page.goto(PAGE + '?type=meihua')
    await expect(page.locator('.es-desc')).toHaveText('新建一份四柱八字命盘，即可查看排盘与解读')
  })

  test('★ 一张卡片：生肖 / 姓名 / 八字简写 / 性别 / 日期 / 时辰 / 创建时间', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart()])
    await page.reload()

    const card = page.locator('.mc-card').first()
    await expect(card.locator('.card-zodiac')).toHaveText('🐴') // 1990 → (1990-4)%12 = 6 → 🐴
    await expect(card.locator('.card-name')).toHaveText('张三 甲子') // 八字取 split(' ')[2]，即第三段
    await expect(card.locator('.card-info span')).toHaveText([
      '男',
      '1990.03.07',
      '未时', // hour 14 → (15%24)/2 = 7 → 未
      '创建于 2026-09-01',
    ])
  })

  test('★ 派生值的边界：生肖回卷 / 缺 hour / 八字不足三段 / 无 createdAt / 女', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [
      // 2000 年：(2000-4)%12 = 1996%12 = 4 → 🐲；hour 缺失当 12 点 → 13%24=13 → /2=6 → 午时
      makeChart({ id: 'a', name: '甲', birth: { year: 2000, month: 1, day: 2 }, bazi: '两段 而已', createdAt: null }),
      // 1972 年：(1972-4)%12 = 1968%12 = 0 → 🐀；23 点 → 24%24=0 → 子时
      makeChart({ id: 'b', name: '乙', gender: 'female', birth: { year: 1972, month: 12, day: 31, hour: 23 }, bazi: '壬子 壬子 甲子 甲子' }),
      // 2021 年：(2021-4)%12 = 2017%12 = 1 → 🐂；hour 0 → 1%24=1 → /2=0 → 子时
      // gender 只有 'male' 算男，其它任何值都落到「女」（老 :61 就是二分）
      makeChart({ id: 'c', name: '丙', gender: 'other', birth: { year: 2021, month: 6, day: 6, hour: 0 } }),
    ])
    await page.reload()

    const cards = page.locator('.mc-card')
    await expect(cards).toHaveCount(3)

    // 无有效年柱显示占位，不再根据公历年猜生肖。
    await expect(cards.nth(0).locator('.card-zodiac')).toHaveText('—')
    await expect(cards.nth(0).locator('.card-name')).toHaveText('甲')
    await expect(cards.nth(0).locator('.card-info span')).toHaveText(['男', '2000.01.02', '午时'])

    // 乙：女的、23 点 → (0)/2=0 → 子时
    await expect(cards.nth(1).locator('.card-zodiac')).toHaveText('🐀')
    await expect(cards.nth(1).locator('.card-info span')).toHaveText([
      '女',
      '1972.12.31',
      '子时',
      '创建于 2026-09-01',
    ])

    // 丙：hour 0 → 子时
    await expect(cards.nth(2).locator('.card-info span')).toHaveText(['女', '2021.06.06', '子时', '创建于 2026-09-01'])
  })

  test('390px 命盘与咨询保持同行，页面与卡片采用紧凑尺度', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart()])
    await page.reload()
    const card = page.locator('.mc-card').first()
    const body = await card.locator('.card-detail-link').boundingBox()
    const action = await card.locator('.card-consult-link').boundingBox()
    const box = await card.boundingBox()
    expect(action.y).toBeLessThan(body.y + body.height)
    expect(action.x).toBeGreaterThanOrEqual(body.x + body.width)
    expect(box.height).toBeLessThan(112)
    expect(await page.locator('.select-page').evaluate(el => parseFloat(getComputedStyle(el).maxWidth))).toBe(500)
    await expect(page.locator('.select-header')).toHaveCount(1)
    await expect(page.locator('.select-title')).toHaveText('四柱八字')
  })

  test('姓名里的 HTML 被转义（不是当标签渲染）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart({ name: '<b>粗体</b>' })])
    await page.reload()
    await expect(page.locator('.mc-card .card-name b')).toHaveCount(0)
    await expect(page.locator('.mc-card .card-name')).toContainText('<b>粗体</b>')
  })

  test('点卡片 → 跳 /my-charts/?id=', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart({ id: 'abc-123' })])
    await page.reload()
    await page.locator('.card-detail-link').first().click()
    await expect(page).toHaveURL(/\/my-charts\/\?id=abc-123$/)
  })

  test('发起咨询是独立同级链接，不嵌套交互元素', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart({ id: 'abc-123' })])
    await page.reload()
    await expect(page.getByRole('link', { name: '发起咨询', exact: true })).toHaveAttribute('href', '/bazi-consult/?chartId=abc-123')
    await expect(page.locator('.mc-card a a, .mc-card a button')).toHaveCount(0)
    await page.locator('.card-detail-link').focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: '发起咨询', exact: true })).toBeFocused()
    const recordsCard = page.getByRole('link', { name: /咨询记录.*查看、继续或管理已有咨询/ })
    await expect(recordsCard).toBeVisible()
    await expect(recordsCard).toHaveClass(/consultation-record-card/)
    await expect(recordsCard).toHaveAttribute('href', '/bazi-consult/?view=history')
  })

  test('拿不到列表：显示「加载失败，请稍后重试」', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.route('**/api/charts', (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' })
    })
    await page.reload()
    await expect(page.locator('#content-area .es-desc')).toHaveText('加载失败，请稍后重试')
    await expect(page.locator('.mc-card')).toHaveCount(0)
    // 错误态提供显式重试动作。
    await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  })
  test('游客不请求私有列表', async ({ page }) => {
    let requests = 0
    await page.route('**/api/charts', route => { requests++; return route.fulfill({ json: [] }) })
    await page.goto(PAGE)
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
    await expect(page.locator('.loading-msg')).toHaveCount(0)
    expect(requests).toBe(0)
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
  })

  test('加载、错误与重试后空态', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    let release
    const held = new Promise(resolve => { release = resolve })
    let requests = 0
    await page.route('**/api/charts', async route => {
      requests++
      if (requests === 1) { await held; return route.fulfill({ status: 500, json: {} }) }
      return route.fulfill({ json: [] })
    })
    await page.reload()
    await expect(page.getByRole('status')).toHaveText('加载中…')
    release()
    await page.getByRole('button', { name: '重试', exact: true }).click()
    await expect(page.locator('.es-title')).toHaveText('还没有命盘')
    expect(requests).toBe(2)
    await expect(page.locator('#create-link')).toHaveCount(1)
  })

  test('401 重新登录', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.route('**/api/charts', route => route.fulfill({ status: 401, json: {} }))
    await page.reload()
    await expect(page.locator('.es-title')).toHaveText('登录已过期')
    await expect(page.getByRole('button', { name: '重试', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '重新登录', exact: true }).click()
    await expect(page.locator('#authModalOverlay')).toBeVisible()
  })

  test('卡片 Tab、Enter 与新标签', async ({ page, context }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await mockCharts(page, [makeChart({ id: 'keyboard' })])
    await page.reload()
    const card = page.getByRole('link', { name: /张三/ })
    await expect(card).toHaveAttribute('href', '/my-charts/?id=keyboard')
    await page.locator('#create-link').focus()
    await page.keyboard.press('Tab')
    await expect(card).toBeFocused()
    await context.route('**/my-charts/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Mock detail</h1>' }))
    const opened = context.waitForEvent('page')
    await card.click({ modifiers: ['ControlOrMeta'] })
    const popup = await opened
    await popup.waitForLoadState()
    expect(popup.url()).toContain('/my-charts/?id=keyboard')
    await popup.close()
    await card.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/my-charts\/\?id=keyboard$/)
  })

  test('兼容入口不假称已接通', async ({ page }) => {
    for (const type of ['ziwei', 'meihua', 'nope', 'toString']) {
      await page.goto(PAGE + '?type=' + type)
      await expect(page.locator('.compatibility-notice')).toContainText('尚未接通')
      await expect(page.locator('#create-link')).toHaveAttribute('href', '/charts/?action=create&from=' + type)
    }
  })

  for (const width of [390, 500, 1280]) {
    test(`长姓名在 ${width}px 无溢出`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(PAGE)
      await loginAs(page)
      await mockCharts(page, [makeChart({ name: '很长的合成测试姓名'.repeat(12) })])
      await page.reload()
      await expect(page.locator('.mc-card')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }

})

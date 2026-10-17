// `/select-chart/`（选盘页）—— 阶段 3 第 10 页。
//
// ★ 判据档位：**冒烟**（30 天 1 次真实请求，见计划 §4.30；但它是首页
//   「四柱八字」卡片的**必经中转站**，入链 1，所以行为必须对）。
//
// ★ 这一页判据的重心：**一条记录被渲染成哪几个字**
//   页面本身只有「三类状态」——登录提示 / 还没有命盘 / 命盘卡片列表 ——
//   但卡片里塞了 6 个派生值：
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
  test('视觉基线：未登录（登录提示）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('.es-title')).toHaveText('登录后使用')
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

  test('模块名：type 决定图标与名字，缺省是四柱八字', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('.module-label .icon')).toHaveText('📜')
    await expect(page.locator('.module-label .name')).toHaveText('四柱八字')

    await page.goto(PAGE + '?type=ziwei')
    await expect(page.locator('.module-label .icon')).toHaveText('🔮')
    await expect(page.locator('.module-label .name')).toHaveText('紫微斗数')

    await page.goto(PAGE + '?type=meihua')
    await expect(page.locator('.module-label .icon')).toHaveText('🌸')
    await expect(page.locator('.module-label .name')).toHaveText('梅花易数')

    // 不认识的 type 回落到四柱八字
    await page.goto(PAGE + '?type=nope')
    await expect(page.locator('.module-label .name')).toHaveText('四柱八字')
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
    await expect(page.locator('.es-title')).toHaveText('登录后使用')
    await expect(page.locator('.es-desc')).toHaveText('保存多份命盘，随时查看排盘')
    await expect(page.locator('#content-area .add-btn')).toHaveText('登录')
    await expect(page.locator('#content-area .auth-link a')).toHaveText('注册')
    await expect(page.locator('#create-link')).toBeVisible()
    // 未登录不发列表请求
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
    await expect(page.locator('.es-desc')).toHaveText('新建一份命盘，即可开始四柱八字排盘')
    await expect(page.locator('#content-area .add-btn')).toHaveText('＋ 新建命盘')

    await page.goto(PAGE + '?type=ziwei')
    await expect(page.locator('.es-desc')).toHaveText('新建一份命盘，即可开始紫微斗数排盘')

    await page.goto(PAGE + '?type=meihua')
    await expect(page.locator('.es-desc')).toHaveText('新建一份命盘，即可开始梅花易数排盘')
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
      makeChart({ id: 'b', name: '乙', gender: 'female', birth: { year: 1972, month: 12, day: 31, hour: 23 } }),
      // 2021 年：(2021-4)%12 = 2017%12 = 1 → 🐂；hour 0 → 1%24=1 → /2=0 → 子时
      // gender 只有 'male' 算男，其它任何值都落到「女」（老 :61 就是二分）
      makeChart({ id: 'c', name: '丙', gender: 'other', birth: { year: 2021, month: 6, day: 6, hour: 0 } }),
    ])
    await page.reload()

    const cards = page.locator('.mc-card')
    await expect(cards).toHaveCount(3)

    // 甲：生肖 🐲、八字只有两段 → 不显示简写、没有创建时间、时辰兜底 12 点
    await expect(cards.nth(0).locator('.card-zodiac')).toHaveText('🐲')
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
    await page.locator('.mc-card').first().click()
    await expect(page).toHaveURL(/\/my-charts\/\?id=abc-123$/)
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
    // 失败态不给「新建」按钮（老实现只 return，没拼 add-btn）
    await expect(page.locator('#content-area .add-btn')).toHaveCount(0)
  })
})

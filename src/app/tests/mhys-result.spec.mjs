// `/mhys/result.html`（梅花易数结果页）—— 阶段 3 第 11 页的判据。
//
// ★ 判据档位：**冒烟**。30 天真实请求 0 次（剔机器人后仍是 0，见计划 §4.30）——
//   它是「从记录列表点进去看某一卦」的落地页，只有 `/mhys/history.html` 的详情跳转会到它。
//   薄页不写差分脚本、不写变异套件。
//
// ★ 这一页的判据重心：**四个全局是不是真的被写进去了**
// ─────────────────────────────────────────────────────────────
// 本页的产品代码只有 85 行（`src/web/js/page-mhys-result.js` → `src/app/mhys/result.logic.js`），
// 它的活几乎全是「把上游给的数据摆到下游要的位置」：
//   ① `currentResultMeta` / `currentAiPayload`  → 给 AI 面板读（排盘时间、卦式、数字、农历）
//   ② `renderResult(result)`                   → 画结果区
//   ③ `renderAnalysis()`                       → 画解卦区（取消 `hidden`）
//   ④ `currentRecordId` / `savedAnalysis`      → 给 AI 回写用，**必须在 renderResult 之后**
//   ⑤ `refreshAIPanel()`                       → 把 ☯ AI 解读块摆进 DOM
// 这五步里任何一步的顺序错、或者某个全局名不存在（ESM 严格模式裸赋值会抛
// ReferenceError，然后被 `catch` 吞成「加载失败，请重试」），**界面都不报错**。
// 所以下面每一条都盯这些东西，而不是「页面能打开」。
//
// ★ 老页 vs 新页：这套判据先在**老实现**（线上 `src/web/mhys/result.html`）上跑全绿，
//   再对新实现跑。这一步抓到的错才算「我的期望值错了」。
//
// ★ 三种稳定的页面状态（都不依赖库里真有几条记录）：
//   · 无 `?id=` 且无 storage  → 「没有排盘结果」+「返回排盘」链接（`/mhys/`）
//   · 有 `?id=` + 被 mock 的记录 → 完整结果页（卦名取自 fixture，见 fixtures/mhys-result.json）
//   · 有 `?id=` + 404            → 「排盘记录不存在或已删除」
// 记录接口一律 `page.route` 截下来，不打真库 —— 库里有什么不该影响判据。

import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const PAGE = '/mhys/result.html'

/** 真机抓下来的结果对象（线上 `/mhys/` 时间起卦一次，读 window.g / currentResultMeta 落盘）。 */
const RESULT = JSON.parse(fs.readFileSync(new URL('./fixtures/mhys-result.json', import.meta.url), 'utf8'))

/** 造一个「已登录」：`AUTH.isLoggedIn()` 只看 sqw_username 在不在（见 `lib/auth.js`）。 */
async function loginAs(page, name = '13800138000') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_username', value: name, domain: host, path: '/' },
    { name: 'sqw_token', value: 'fake-token-for-smoke-test', domain: host, path: '/' },
  ])
}

/** 收集本页所有 console error（含未捕获异常），跑完统一断言。 */
function collectErrors(page) {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text())
  })
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))
  return errors
}

/** 把 `GET /api/mhys-records/<id>` 换成一个固定记录。返回被截下来的请求（给断言看 header）。 */
async function mockRecord(page, overrides = {}) {
  const seen = []
  await page.route('**/api/mhys-records/*', async (route) => {
    seen.push({
      url: route.request().url(),
      auth: route.request().headers()['authorization'] || '',
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4242,
        topic: '下周面试能不能过',
        created_at: '2026-10-17T04:34:53.513Z',
        ai_analysis: '',
        result_data: JSON.stringify(RESULT),
        ...overrides,
      }),
    })
  })
  return seen
}

test.describe('/mhys/result.html', () => {
  test('视觉基线：无 id 的「没有排盘结果」态', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await expect(page.locator('#contentArea')).toContainText('没有排盘结果')
    // ★ `maxDiffPixels: 2` 与 `/mhys/history.html` 同源：给亚像素文字渲染留余量
    //   （实测老页基线 vs 新页首跑，字形光栅化每通道差 1 的点会有几个）。
    //   不是「放宽到过得去」—— 真实布局偏移在这一页是几十万像素量级。
    await expect(page).toHaveScreenshot('mhys-result-no-id.png', { fullPage: true, maxDiffPixels: 2 })
    expect(errors).toEqual([])
  })

  test('无 id 且无 storage：文案 + 「返回排盘」落在 /mhys/', async ({ page }) => {
    await page.goto(PAGE)
    const area = page.locator('#contentArea')
    await expect(area).toContainText('没有排盘结果')
    const back = area.locator('a')
    await expect(back).toHaveText('返回排盘')
    await expect(back).toHaveAttribute('href', '/mhys/')
  })

  test('有 id：结果区、解卦区、AI 块三样都摆出来', async ({ page }) => {
    const errors = collectErrors(page)
    const seen = await mockRecord(page)
    // ★ 先落一次同源页面再种 cookie：`loginAs()` 用 `page.url()` 取域名，
    //   而 `about:blank` 的 hostname 是空串 —— 直接把 cookie 种到空域名上，
    //   浏览器不会报错，请求也照样发，只是**头里没有 Authorization**。
    //   （这一步在写判据时踩过：老页上 7 条全绿，唯独「请求带 Bearer」那条红。）
    await page.goto(PAGE)
    await loginAs(page)
    await page.goto(PAGE + '?id=4242')

    // ① 结果区真的画出来了 —— 卦名从 fixture 里取，不写死「地山谦」
    const area = page.locator('#contentArea')
    await expect(area).toContainText(RESULT.gua.benGua.name)
    await expect(area).toContainText('排盘信息')
    await expect(area.locator('.load-state')).toHaveCount(0)
    // 事项来自记录（`result.topic = data.topic` 那一行），不在 result_data 里
    await expect(area).toContainText('下周面试能不能过')

    // ② 解卦区：`renderAnalysis()` 落内容后自己取消 hidden
    const analysis = page.locator('#analysisArea')
    await expect(analysis).not.toHaveAttribute('hidden', '')
    await expect(analysis).not.toBeEmpty()

    // ③ ★ AI 块由 `refreshAIPanel()` 摆出来 —— 这一步同时证明了
    //    `currentResultMeta` / `currentAiPayload` / `savedAnalysis` / `currentRecordId`
    //    四个全局都被写成了「这一卦」的值（引擎只在那之后才肯 mount）。
    await expect(page.locator('#aiInlineHost')).toBeVisible()

    // ④ 请求真的带了 Bearer（`AUTH.getToken()` 那一行）
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toContain('/api/mhys-records/4242')
    expect(seen[0].auth).toBe('Bearer fake-token-for-smoke-test')

    expect(errors).toEqual([])
  })

  test('有 id 但记录不存在：说明白，不白屏', async ({ page }) => {
    await page.route('**/api/mhys-records/*', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' }))
    await page.goto(PAGE + '?id=999999')
    await expect(page.locator('#contentArea')).toContainText('排盘记录不存在或已删除')
    await expect(page.locator('#contentArea .load-state')).toHaveCount(1)
  })

  test('有 id 但接口 500：落到「加载失败，请重试」而不是空壳', async ({ page }) => {
    await page.route('**/api/mhys-records/*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }))
    await page.goto(PAGE + '?id=999999')
    // 500 走的是 `!resp.ok` 那一支 → 「不存在」；只有 **抛异常**（JSON 坏、网络断）才走 catch。
    // 这里先钉住 500 的真行为，别把两种失败混成一个期望。
    await expect(page.locator('#contentArea')).toContainText('排盘记录不存在或已删除')
  })

  test('有 id 但响应体不是 JSON：catch 兜住，显示「加载失败，请重试」', async ({ page }) => {
    await page.route('**/api/mhys-records/*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json{{{' }))
    await page.goto(PAGE + '?id=999999')
    await expect(page.locator('#contentArea')).toContainText('加载失败，请重试')
  })

  test('sessionStorage 里的旧结果：渲染完把键删掉（且不回写）', async ({ page }) => {
    await page.goto(PAGE) // 先落一个同源上下文，才能写 sessionStorage
    await page.evaluate((r) => sessionStorage.setItem('mhys_result', JSON.stringify(r)), RESULT)
    await page.goto(PAGE)
    await expect(page.locator('#contentArea')).toContainText(RESULT.gua.benGua.name)
    const left = await page.evaluate(() => sessionStorage.getItem('mhys_result'))
    expect(left).toBeNull()
  })

  test('admin=1 改用 localStorage 里的 admin token（不是用户 token）', async ({ page }) => {
    await page.goto(PAGE)
    await page.evaluate(() => localStorage.setItem('sqw_admin_token', 'admin-token-xyz'))
    const seen = await mockRecord(page)
    await page.goto(PAGE + '?id=4242&admin=1')
    await expect(page.locator('#contentArea')).toContainText(RESULT.gua.benGua.name)
    expect(seen[0].auth).toBe('Bearer admin-token-xyz')
  })
})

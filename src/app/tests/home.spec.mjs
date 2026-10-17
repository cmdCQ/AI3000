import { test, expect } from '@playwright/test'

// 首页（`src/web/index.html` 156 行 + `page-home.js` 331 行 / 12 个顶层函数）。
// 真实请求 455 次，全站第一 —— 但它在迁移表里根本没出现过（最初统计流量用的
// `grep "GET /xxx/ "` 匹配不到 `/` 这个 URL）。
//
// 这两条测试同时是「工具链试点」和「首页的第一批判据」。

/** 收集加载期的 console 报错与未捕获异常 */
function trackErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test('公告弹窗：出现 → 关闭 → 不再拦住页面', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })

  // 1. 弹窗默认出现（Playwright 每次都是干净 profile，localStorage 为空，
  //    所以这个行为是确定性的 —— 这正是它适合当判据的原因）
  const overlay = page.locator('#announcementOverlay')
  await expect(overlay).toBeVisible()

  // 2. 弹窗里有真实内容（`/api/announcement` 取回来的），不是空壳
  await expect(page.locator('#announcementModalBody')).not.toBeEmpty()

  // 3. 点关闭按钮（内联 onclick="closeAnnouncement()"，必须挂在 window 上）
  await page.locator('.announcement-modal-close').click()
  await expect(overlay).toBeHidden()

  // 4. 关掉之后页面主体可交互
  await expect(page.locator('#announcementBar')).toBeVisible()

  expect(errors, '加载与关闭公告期间不应有 console 报错').toEqual([])
})

test('视觉基线：关掉公告后的首页', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('.announcement-modal-close').click()
  await expect(page.locator('#announcementOverlay')).toBeHidden()

  expect(errors).toEqual([])
  // 首次生成用 --update-snapshots；之后每次比对像素，
  // 基线 PNG 进仓库，git diff 里能看见「首页长什么样变了」
  await expect(page).toHaveScreenshot('home.png', { fullPage: true })
})

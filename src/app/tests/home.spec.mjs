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

  // 「已稳定运行」那一行是**每秒重算**的计时器，截图像素永远不可能稳定。
  // 所以：位置进基线、数字打码；数字本身另用一条功能断言焊住格式
  // （见下面那条测试）—— 打码不等于不测，只是把「值」和「版面」分开测。
  await expect(page.locator('#uptimeTimer')).toHaveText(/^\d+D \d+H \d+M \d+S$/)
  await expect(page.locator('.uptime-line')).toContainText('已稳定运行')

  expect(errors).toEqual([])
  // 首次生成用 --update-snapshots；之后每次比对像素，
  // 基线 PNG 进仓库，git diff 里能看见「首页长什么样变了」
  await expect(page).toHaveScreenshot('home.png', {
    fullPage: true,
    // 打码的是**整行** `.uptime-line`，不是里面那个 `#uptimeTimer`：
    // 打码框大小 = 元素的 bounding box，而 timer 的文字长度每秒都变
    // （`133D 11H 43M 25S` vs `23D 4H 5M 9S`），框子跟着变 → 打码框自己的边缘
    // 就成了差异（实测 471 像素，bbox 152×17，正好一行）。
    // 换成定宽的父元素后打码框恒定。
    mask: [page.locator('.uptime-line')],
  })
})

test('底部导航：三项都在，且后两项是真跳页', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.locator('.announcement-modal-close').click()

  // 三条：命理与术数（切 tab）/ 我的命盘（跳 /my-charts/）/ 我的（跳 /my/）
  const items = page.locator('#bottomNav .nav-item')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toHaveClass(/active/)
  await expect(items.nth(0)).toContainText('命理与术数')
  await expect(items.nth(1)).toContainText('我的命盘')
  await expect(items.nth(2)).toContainText('我的')

  expect(errors).toEqual([])
})

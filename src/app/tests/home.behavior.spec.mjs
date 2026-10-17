import { test, expect } from '@playwright/test'

// 首页的行为判据（视觉基线在 `home.spec.mjs`）。
//
// 这一组是**两路都能过**才算数：先对老实现（线上 `/`，`src/web/index.html` +
// `page-home.js`）跑一遍必须全绿 —— 证明判据描述的是老行为；然后对 probe 里的
// 新实现跑一遍也必须全绿 —— 证明行为被保住了。只有第二步的话，判据写错了也看不
// 出来（它会和实现一起错）。
//
// 覆盖的每一条都对应老代码里一处真实分支：
//   page-home.js:25 handleModuleClick（meihua / liuyao / 其余要登录）
//   page-home.js:65 handleSuggestionClick（用 cookie 判登录）
//   page-home.js:98 openChatOverlay（要登录 → 加 .open + 锁滚动）
//   page-home.js:75 ?tab=charts 重定向
//   index.html:24/53/144/147 四处行内 onclick

const ANNOUNCE_CLOSE = '.announcement-modal-close'
const AUTH_OVERLAY = '#authModalOverlay' // 登录弹窗真名（auth.js:101），不是 #authModal

/**
 * 关掉公告弹窗。它有两种出现时机，都在这儿等着：
 *   · 首次访问 —— 游客态 24h 冷却（`ann_guest_shown` 没写过）
 *   · 刚登录   —— `isNewLogin` 必定弹（page-home.js:222）
 * 没弹也是合法的（冷却期内），所以「等不到就往下走」，但**弹了必须能关掉**。
 */
async function dismissAnnouncement(page) {
  const close = page.locator(ANNOUNCE_CLOSE)
  await close.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (await close.isVisible().catch(() => false)) await close.click()
  await expect(page.locator('#announcementOverlay')).toBeHidden()
}

/** 用 cookie 造一个「已登录」：`AUTH.isLoggedIn()` 只看 sqw_username 在不在 */
async function loginAs(page, name = '13800138000') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_username', value: name, domain: host, path: '/' },
    { name: 'sqw_token', value: 'fake-token-for-test', domain: host, path: '/' },
  ])
}

/**
 * 按卡片**标题**精确取卡片。
 * 不能只用 `hasText`：六爻那张的描述里也含「六十四卦」，会同时命中两张
 * （strict mode violation，第一次跑就撞上了）。
 */
function card(page, name) {
  return page.locator('.module-card').filter({ has: page.getByText(name, { exact: true }) })
}

function navItem(page, label) {
  return page.locator('#bottomNav .nav-item').filter({ has: page.getByText(label, { exact: true }) })
}

test.describe('未登录', () => {
  test('梅花易数直接跳 /mhys/（不需要登录）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await card(page, '梅花易数').click()
    await page.waitForURL(/\/mhys\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/mhys/')
  })

  test('六爻直接跳 /liuyao/（不需要登录）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await card(page, '六爻').click()
    await page.waitForURL(/\/liuyao\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/liuyao/')
  })

  test('六十四卦直接跳 /hexagrams/（连 AUTH 都不查）', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await card(page, '六十四卦').click()
    await page.waitForURL(/\/hexagrams\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/hexagrams/')
  })

  test('四柱八字未登录 → 弹登录框，且**不**跳转', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await card(page, '四柱八字').click()
    // 老实现 page-home.js:30：AUTH.isLoggedIn() 为假就 openAuthModal('login') 并 return
    await expect(page.locator(AUTH_OVERLAY)).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('建议入口未登录 → 弹登录框', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await page.getByText('我们需要你宝贵的建议').click()
    await expect(page.locator(AUTH_OVERLAY)).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('AI 对话未登录 → 弹登录框，且对话弹窗不打开', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await page.locator('.ai-chat-entrance').click()
    await expect(page.locator(AUTH_OVERLAY)).toBeVisible()
    await expect(page.locator('#chatOverlay')).not.toHaveClass(/\bopen\b/)
  })

  test('底部导航「我的命盘」是整页跳转 /my-charts/', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await navItem(page, '我的命盘').click()
    await page.waitForURL(/\/my-charts\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/my-charts/')
  })

  test('底部导航「我的」是整页跳转 /my/', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await navItem(page, '我的').click()
    await page.waitForURL(/\/my\/$/, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/my/')
  })

  test('?tab=charts 直接重定向到 /my-charts/', async ({ page }) => {
    // 老实现 page-home.js:75-78 用 window.location.href（留一条历史记录），
    // 新实现用 location.replace（不留）。对用户可见的结果相同：落在 /my-charts/。
    await page.goto('/?tab=charts', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/my-charts\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/my-charts/')
  })
})

test.describe('已登录', () => {
  /** 造登录态后重新加载，并把「刚登录必弹」的公告关掉 */
  async function withLogin(page, name) {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await loginAs(page, name)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
  }

  test('四柱八字 → /select-chart/?type=charts', async ({ page }) => {
    await withLogin(page)
    await card(page, '四柱八字').click()
    await page.waitForURL(/\/select-chart\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).searchParams.get('type')).toBe('charts')
  })

  test('建议入口 → /suggestion/', async ({ page }) => {
    await withLogin(page)
    await page.getByText('我们需要你宝贵的建议').click()
    await page.waitForURL(/\/suggestion\//, { waitUntil: 'domcontentloaded' })
    expect(new URL(page.url()).pathname).toBe('/suggestion/')
  })

  test('AI 对话 → 弹窗打开、iframe 指向 /ai-chat/、点遮罩能关', async ({ page }) => {
    await withLogin(page)
    await page.locator('.ai-chat-entrance').click()
    await expect(page.locator('#chatOverlay')).toHaveClass(/\bopen\b/)
    await expect(page.locator('#chatIframe')).toHaveAttribute('src', /\/ai-chat\//)
    // 打开时锁住了页面滚动（老实现 page-home.js:106）
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    // 点遮罩背景关闭（点内部不关）—— 老实现 page-home.js:131
    //
    // ★ 必须先拉宽视口。500px（本套件默认）下 `.chat-overlay-inner` 是
    // `position:fixed; inset:0`，把遮罩全盖住了，elementFromPoint 在 (3,3)
    // 拿到的是 `chatIframe` —— 那不是遮罩，点它当然不关。实测线上老页同样
    // 不关（老页与 probe 新页在 500px 行为一致），所以这是**判据写错了**，
    // 不是搬迁改坏了。900px 下遮罩两侧留出真实背景区，(6,400) 命中
    // `#chatOverlay` 本身，线上老页与 probe 新页都会关。
    await page.setViewportSize({ width: 900, height: 800 })
    await page.locator('#chatOverlay').click({ position: { x: 6, y: 400 } })
    await expect(page.locator('#chatOverlay')).not.toHaveClass(/\bopen\b/)
    // 只断言「不再 hidden」：老实现把 inline 值清成空串，计算值随浏览器默认解析
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  })
})

test.describe('公告', () => {
  test('点公告栏打开弹窗，ESC 关闭', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await page.locator('#announcementBar').click()
    await expect(page.locator('#announcementOverlay')).toBeVisible()
    await expect(page.locator('#announcementModalBody')).not.toBeEmpty()
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')

    await page.keyboard.press('Escape')
    await expect(page.locator('#announcementOverlay')).toBeHidden()
  })

  test('点遮罩空白处关闭，点弹窗内部不关', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    await page.locator('#announcementBar').click()
    await expect(page.locator('#announcementOverlay')).toBeVisible()

    // 点弹窗内部（标题栏）——不该关
    await page.locator('.announcement-modal-title').click()
    await expect(page.locator('#announcementOverlay')).toBeVisible()

    // 点遮罩左上角空白 —— 该关
    await page.locator('#announcementOverlay').click({ position: { x: 3, y: 3 } })
    await expect(page.locator('#announcementOverlay')).toBeHidden()
  })

  test('公告栏滚动文案是从公告正文提炼的，不是写死的', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await dismissAnnouncement(page)
    const text = await page.locator('#announcementTrack').innerText()
    expect(text.length).toBeGreaterThan(8)
    // 老实现 extractMarqueeText() 的产出特征：多段用 ` · ` 连接
    expect(text).toContain('·')
  })
})

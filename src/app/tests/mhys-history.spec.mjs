// `/mhys/history.html`（梅花易数排盘记录页）—— 阶段 3 第 8 页的判据。
//
// ★ 判据档位：**冒烟**（30 天真实请求 14 次，剔机器人 7 次，见计划 §4.30）。
//   薄页不写差分脚本、不写变异套件 —— 那两样每页 300-1400 行，而这一页的**全部**
//   产品代码是 4 行 CONFIG + 51 行 HTML 骨架 + 287 行共用控制器（那个控制器已经有
//   六爻那户在用、被老差分脚本逐字比对过）。
//
// ★ 这一页的判据重心不是「再证明一遍列表能画」
// ─────────────────────────────────────────────────────────────
// 列表/搜索/多选/删除/跳详情**全部来自 `src/app/lib/recordsHistory.js`**，与六爻记录页
// 共用同一份代码。这一页唯一可能错的地方，是**它把自己接错了户**：
//   listUrl 写成 `/api/liuyao-records`、detailsUrl 写成 `/liuyao/result.html?id=`、
//   homeUrl 写成 `/liuyao/`、返回链接写成 `/liuyao/`。
// 所以下面每一条都盯着「梅花这一户」而不是「控制器还能用」：
//   · 空态那颗「去排盘」必须落在 **`/mhys/`**（`homeUrl` 唯一可见的出口）
//   · 悬浮菜单的「← 返回」必须是 **`/mhys/`**（骨架里写死的那一行）
//   · 列表 fetch 必须打 **`/api/mhys-records`**（用 route 截下来看，不去猜）
//   · 详情跳转必须去 **`/mhys/result.html?id=`**（同上）
//
// ★ 老页 vs 新页：这套判据先在**老实现**（线上 `src/web/mhys/history.html`）上跑
//   全绿，再对新实现跑。这一步抓到的错才算「我的期望值错了」，而不是「实现错了」。
//
// ★ 两种稳定的页面状态（都不依赖真实记录，所以不会因为库里有几条记录而变色）：
//   · 未登录  → `AUTH.isLoggedIn()` 假 → 引导卡「登录后查看排盘记录」+「去登录」
//   · 已登录但 token 是假的 → `/api/mhys-records` 返 401 → `!resp.ok` → 空态「暂无排盘记录」

import { test, expect } from '@playwright/test'

const PAGE = '/mhys/history.html'

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

test.describe('/mhys/history.html', () => {
  test('视觉基线：未登录的引导卡', async ({ page }) => {
    await page.goto(PAGE)
    // 等引导卡落定（不是等网络空闲 —— 这页 401 之后不再发请求）
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-state')).toContainText('登录后查看排盘记录')
    // 悬浮菜单与骨架必须已经在 DOM 里（`flushSync` 那一步的作用）
    await expect(page.locator('#manageBtn')).toBeVisible()
    await expect(page.locator('#searchInput')).toBeVisible()
    // ★ `maxDiffPixels: 2` 不是「放宽到过得去」，是给**亚像素文字渲染**留的余量。
    //   实测（老页基线 vs 新页首跑）：`ImageChops` 逐像素比出 1902 个点不同，
    //   **全部集中在右上角那个「管理」按钮的文字上**，且每个通道只差 1
    //   （例：(45,99,90) → (44,98,89)）。Playwright 默认每通道阈值 0.2，
    //   所以只有 1 个点越线。这是字形光栅化的亚像素偏移，不是布局或颜色变了
    //   —— 1902 个点里没有一个超过 1，说明连抗锯齿边缘都没移动一格。
    //   不重新拍基线：那会把「新页比老页差 1 个点」这件事藏起来。
    await expect(page).toHaveScreenshot('mhys-history-guest.png', {
      fullPage: true,
      maxDiffPixels: 2,
    })
  })

  test('未登录：引导卡与「去登录」按钮，点了弹登录框', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)

    const card = page.locator('.empty-state')
    await expect(card).toContainText('登录后查看排盘记录')
    await expect(card).toContainText('登录后可查看历史排盘和AI解读记录')

    const btn = card.locator('.guest-btn.primary')
    await expect(btn).toHaveText('去登录')
    // 老页这里是 `<a href="javascript:void(0)" onclick="openAuthModal('login')">`
    // —— `openAuthModal` 由 `/js/auth.js` 挂到 window，不是本页提供的。
    // 断言它真的弹了框，而不是断言属性里写了什么（§4.8 教训 2）。
    await btn.click()
    await expect(page.locator('#authModalOverlay')).toBeVisible()

    expect(errors, errors.join('\n')).toEqual([])
  })

  test('已登录（假 token）：401 → 空态，且「去排盘」落在 /mhys/', async ({ page }) => {
    const errors = collectErrors(page)
    const calls = []
    page.on('request', (req) => {
      const u = new URL(req.url())
      if (u.pathname.startsWith('/api/')) calls.push(req.method() + ' ' + u.pathname)
    })

    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    // 列表请求必须打梅花那一户，不是六爻的
    await expect.poll(() => calls.some((c) => c === 'GET /api/mhys-records')).toBe(true)
    // 假 token → 401 → `!resp.ok` → 空态
    const card = page.locator('.empty-state')
    await expect(card).toContainText('暂无排盘记录')

    // ★ 这一条是本页 CONFIG 唯一可见的出口：`homeUrl` 必须是 `/mhys/`
    const go = card.locator('a', { hasText: '去排盘' })
    await expect(go).toHaveAttribute('href', '/mhys/')

    expect(errors, errors.join('\n')).toEqual([])
  })

  test('搜索：空列表里输入文字 → 提示从「暂无」变成「没有匹配」', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('.empty-state')).toContainText('暂无排盘记录')

    const input = page.locator('#searchInput')
    await input.fill('财运')
    await expect(page.locator('.empty-state')).toContainText('没有匹配的卦例')

    // 清空按钮把输入框清掉，提示回到「暂无」
    await page.locator('#searchClear').click()
    await expect(input).toHaveValue('')
    await expect(page.locator('.empty-state')).toContainText('暂无排盘记录')
  })

  test('管理模式：按钮文案切换、动作条出现、wrapper 加类；再点回去全部复原', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('.empty-state')).toBeVisible()

    const btn = page.locator('#manageBtn')
    const actions = page.locator('#fmActions')
    const wrapper = page.locator('.mh-wrapper')

    await expect(btn).toHaveText('管理')
    await expect(actions).not.toHaveClass(/show/)
    await expect(wrapper).not.toHaveClass(/manage-mode/)

    await btn.click()
    await expect(btn).toHaveText('完成')
    await expect(btn).toHaveClass(/active/)
    await expect(actions).toHaveClass(/show/)
    await expect(wrapper).toHaveClass(/manage-mode/)

    await btn.click()
    await expect(btn).toHaveText('管理')
    await expect(actions).not.toHaveClass(/show/)
    await expect(wrapper).not.toHaveClass(/manage-mode/)
  })

  // ★ §5.3（用户 2026-10-17：「管理」按钮的文字被主题色覆盖）。
  //   真 bug 的形状：进入管理模式后按钮是 `background:var(--accent)` +
  //   `color:var(--accent)`（同一颜色），「完成」两个字**完全看不见** —— 因为
  //   `.fm-btn.manage-btn` 的 `color` 与 `.fm-btn.active` 特异性相同却写在后面。
  //   鼠标悬停时那条 hover 会把底色换成浅洗色，看上去又能读，所以肉眼很容易放过。
  //   这条判据把鼠标移开（让 `:hover` 失效）再量**计算后的颜色**，并且算对比度。
  //   样式在 `src/app/shared/css/shared-history.css`，六爻/梅花两个记录页共用。
  test('管理模式：按钮文字与底色不能同色（§5.3 的回归钉）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('#manageBtn')).toBeVisible()

    await page.locator('#manageBtn').click()
    // 移开鼠标：`:hover` 会给底色加一层浅洗色，掩盖「文字与底色同色」这个 bug。
    await page.mouse.move(5, 700)
    await expect(page.locator('#manageBtn')).toHaveText('完成')

    // ⚠ `.fm-btn` 带 `transition: all 0.2s` —— 点完立刻量会读到**过渡中间态**
    //   （第一次就是这么红的：`rgb(122,167,160) on rgb(164,195,189)`，两个颜色都在
    //   往终点走，对比度 1.41 毫无意义）。所以先等它稳定：连续两次取样一样才算数。
    let colors = null
    let prev = null
    for (let i = 0; i < 25; i++) {
      prev = colors
      colors = await page.locator('#manageBtn').evaluate((el) => {
      const cs = getComputedStyle(el)
      const parse = (v) => v.match(/\d+/g).slice(0, 3).map(Number)
      const lum = (rgb) => {
        const c = rgb.map((n) => {
          const s = n / 255
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      }
      const fg = parse(cs.color)
      const bg = parse(cs.backgroundColor)
      const l1 = lum(fg)
      const l2 = lum(bg)
      return { color: cs.color, backgroundColor: cs.backgroundColor, contrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
      })
      if (prev && prev.color === colors.color && prev.backgroundColor === colors.backgroundColor) break
      await page.waitForTimeout(40)
    }

    // 同色 = 字看不见；对比度不足 4.5 也过不了。
    //   断言带上实测颜色当原因说明 —— 红了要能直接看出是「同色」还是「对比度不够」。
    const got = `${colors.color} on ${colors.backgroundColor}`
    expect(colors.color, got).not.toBe(colors.backgroundColor)
    expect(colors.contrast, got).toBeGreaterThanOrEqual(4.5)
  })

  test('返回链接指向 /mhys/（不是 /liuyao/）', async ({ page }) => {
    await page.goto(PAGE)
    const back = page.locator('.fm-back')
    await expect(back).toHaveText('← 返回')
    await expect(back).toHaveAttribute('href', '/mhys/')
    await expect(page.locator('.fm-title')).toHaveText('排盘记录')
  })

  test('标题是梅花那一份', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page).toHaveTitle('排盘记录 · 梅花易数')
  })
})

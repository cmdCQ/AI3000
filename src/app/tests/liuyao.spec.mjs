// `/liuyao/`（六爻排盘页）—— 阶段 4 的**补判据**。
//
// ★ 为什么现在才写它
// ─────────────────────────────────────────────────────────────
// 这一页早就搬完了，当时替它担保的是 `duipan/drive_liuyao_page.js` 那套手搓驱动
// （逐字差分的 `diff_liuyao_*` 也在其中）。阶段 4 要把 `liuyao_render.js`(341) /
// `liuyao_ai_panel.js`(18) / `ai_panel.js`(751) 从「classic script 的裸名全局」搬成
// ESM，而这几份正是**那套驱动的唯一保护对象** —— 先有本文件，才能退役它们。
//
// ★ 老页已经不存在了（重要）
//   `/liuyao/` 的 React 版在阶段 3 就上线了，`src/web/liuyao/index.html` 也已删除。
//   所以本文件没法「先对着老页跑绿」—— 那份老页的**行为**早在搬迁时被逐字差分
//   钉进了现在的 React 版（函数体逐字节相同）。本文件的定位是
//   **characterization test：把当前行为写成判据，然后拿它去接阶段 4 的改造**。
//
// ★ 档位：冒烟 + 关键路径。这一页 30 天 17 次真人请求，但它是**输入路径**
//   （填日期/时间/性别 → 起卦 → 存记录 → AI 解读），错一步用户拿到的是一张错的盘。
//
// ★ 起卦方式只用「自动起卦」（`.method-option[data-method="auto"]`）
//   铜钱摇卦点一下 `#startBtn` 什么都不出（要连摇六次），手动指定要先点爻位 ——
//   三条都测会把这页的判据变成测动画。选**能一次点出结果**的那条，
//   把力气留给「结果长什么样」与「AI 宿主挂没挂上」。

import { test, expect } from '@playwright/test'

const PAGE = '/liuyao/'

/** 造一个「已登录」：`AUTH.isLoggedIn()` 只看 sqw_username 在不在（见 `lib/auth.js`）。 */
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

/** 自动起卦：一次点出结果。（铜钱要连摇六次，不在这里测。） */
async function divination(page) {
  await page.locator('#methodDisplay').click()
  await page.locator('#methodDropdown .method-option[data-method="auto"]').click()
  await page.locator('#startBtn').click()
  await expect(page.locator('#resultArea .ly-info-card')).toBeVisible({ timeout: 10_000 })
}

test.describe('/liuyao/ 六爻排盘', () => {
  test('视觉基线：未登录首屏', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#methodDisplay')).toBeVisible()
    // `#timeDisplay` 是「当前时刻」，每天每分钟都不一样 → 打码，另用正则钉格式。
    await expect(page.locator('#timeDisplay')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    await expect(page).toHaveScreenshot('liuyao-guest.png', {
      fullPage: true,
      mask: [page.locator('#timeDisplay'), page.locator('#tpDisplay')],
    })
  })

  test('默认态：起卦方式是铜钱，下拉三个选项的顺序是 铜钱/手动/自动', async ({ page }) => {
    await page.goto(PAGE)
    // 选项文字带一个 ✓ 前缀（老实现就这样），所以只断 data-method 与包含关系。
    await expect(page.locator('#methodDisplay')).toContainText('铜钱摇卦')
    const methods = await page.locator('#methodDropdown .method-option').evaluateAll((ns) =>
      ns.map((n) => n.getAttribute('data-method')),
    )
    // ★ 顺序本身是判据：`selectMethod` 用 index 推的，换了顺序会串。
    expect(methods).toEqual(['coin', 'manual', 'auto'])
  })

  test('自动起卦：盘面两张卡 + 结果区后面的卦象解析卡，卦名与六爻都渲染出来', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await divination(page)

    // 盘面两张卡：起卦信息 / 装卦（`lyInfoCard` / `lyPanCard`）
    await expect(page.locator('#resultArea .ly-info-card')).toBeVisible()
    await expect(page.locator('#resultArea .ly-pan-card')).toBeVisible()
    // §5.2：`📌 断卦要点` 整卡下线（用户 2026-10-17），换成一张与梅花同构的
    //   「卦象解析 · 本卦」卡；它落在 `#resultArea` **后面**的 `#analysisArea` 里
    //   （AI 宿主会被引擎插在两者之间）。
    await expect(page.locator('#resultArea .ly-key-card')).toHaveCount(0)
    await expect(page.locator('#analysisArea .ly-hex-card')).toBeVisible()
    await expect(page.locator('#analysisArea')).toContainText('卦象解析')
    // 「本卦不显示变卦」是用户的原话：这张卡只讲本卦，卡内不许出现变卦解析。
    await expect(page.locator('#analysisArea')).not.toContainText('变卦解析')
    // 六爻 = 六个爻行（`lyPanCard` 用的是 div 表格，**不是** <table>：`.ly-row`）
    await expect(page.locator('#resultArea .ly-pan-card .ly-row')).toHaveCount(6)
    expect(await page.locator('#resultArea').innerText()).not.toHaveLength(0)
    expect(errors).toEqual([])
  })

  test('AI 宿主真的挂到了结果区后面（阶段 4 改造的主要承重点）', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await page.locator('#aiInlineHost').count().then((n) => expect(n).toBe(0)) // 起卦前不该有
    await divination(page)

    const host = page.locator('#aiInlineHost')
    await expect(host).toBeVisible()
    // ★ 位置契约：宿主必须是 `#resultArea` 的**兄弟**且排在它后面（盘在上、解读在下）
    const ordered = await page.evaluate(() => {
      const area = document.getElementById('resultArea')
      const hostEl = document.getElementById('aiInlineHost')
      if (!area || !hostEl) return null
      return {
        sameParent: area.parentElement === hostEl.parentElement,
        after: !!(area.compareDocumentPosition(hostEl) & Node.DOCUMENT_POSITION_FOLLOWING),
      }
    })
    expect(ordered).toEqual({ sameParent: true, after: true })
    // 宿主里那颗「解卦」按钮 —— `hasChart()` 为真才会长出来
    await expect(host.getByRole('button', { name: /解卦/ })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('点「开始解卦」把面板打开（不真的调模型：请求全部截住）', async ({ page }) => {
    const errors = collectErrors(page)
    // 解卦要走 `/api/chat/send`，这里一律回一个空流 —— 判的是**面板开没开、有没有报错**，
    // 不是模型说了什么。
    await page.route('**/api/chat/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: [DONE]\n\n' }),
    )
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await divination(page)

    await page.locator('#aiInlineHost').getByRole('button', { name: /解卦/ }).click()
    // 面板本体（`ai_panel.js` 建的那棵）必须出现，且带标题
    await expect(page.locator('#aiPanel')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#aiPanelTitle')).toContainText('解析')
    expect(errors).toEqual([])
  })

  test('起卦后再起一卦：结果区被替换、不叠加', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await divination(page)
    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .ly-info-card')).toBeVisible()
    // ★ 判「替换而不是追加」只能数结构，不能比 innerHTML：自动起卦在同一分钟内
    //   确定性相同（时间起卦），两次起卦的 HTML **逐字节相同** —— 我第一版就是
    //   拿 innerHTML 比较，红得毫无道理。
    await expect(page.locator('#resultArea .ly-info-card')).toHaveCount(1)
    await expect(page.locator('#resultArea .ly-pan-card')).toHaveCount(1)
    await expect(page.locator('#analysisArea .ly-hex-card')).toHaveCount(1)
    await expect(page.locator('#resultArea .ly-pan-card .ly-row')).toHaveCount(6)
    // AI 宿主只建一次（`ai_panel.js` 的契约），起第二卦不能长出第二个
    await expect(page.locator('#aiInlineHost')).toHaveCount(1)
  })
})

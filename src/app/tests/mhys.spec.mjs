// `/mhys/`（梅花易数排盘页）—— 阶段 4 的**补判据**。
//
// ★ 为什么现在才写它：同 `tests/liuyao.spec.mjs` 的头注释。这一页的保护原来只有
//   `duipan/drive_mhys_page.js` + `drive_mhys_twice.js`（手搓驱动 + 差分 + 变异）。
//   阶段 4 要把 `mhys_render.js`(384) / `mhys_ai_panel.js`(18) / `ai_panel.js`(751)
//   搬成 ESM，先得有 Playwright 判据来接。
//
// ★ 老页已不存在：React 版在阶段 3 上线，`src/web/mhys/index.html` 已删除。
//   本文件是 **characterization test**：把当前行为写成判据，再去接改造。
//
// ★ 档位：冒烟 + 关键路径（30 天 30 次真人请求；输入路径）。
//
// ★ 这一页默认起卦方式就是「报数起卦（三个数）」，不是时间起卦
//   （默认值在 `src/app/mhys/logic.js` 的 `selectMethod` 初始化里）。

import { test, expect } from '@playwright/test'

const PAGE = '/mhys/'

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

/** 选一种起卦方式（`#methodDropdown` 里那六个之一）。 */
async function selectMethod(page, method) {
  await page.locator('#methodDisplay').click()
  await page.locator(`#methodDropdown .method-option[data-method="${method}"]`).click()
}

test.describe('/mhys/ 梅花易数', () => {
  test('视觉基线：未登录首屏', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#methodDisplay')).toBeVisible()
    // 时间相关元素打码（今天是几号会变），格式另用正则钉住
    await expect(page.locator('#timeDisplay')).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    await expect(page).toHaveScreenshot('mhys-guest.png', {
      fullPage: true,
      mask: [page.locator('#timeDisplay'), page.locator('#tpDisplay')],
    })
  })

  test('六种起卦方式的 data-method 与顺序', async ({ page }) => {
    await page.goto(PAGE)
    const methods = await page.locator('#methodDropdown .method-option').evaluateAll((ns) =>
      ns.map((n) => n.getAttribute('data-method')),
    )
    // ★ 顺序是判据：`selectMethod` 按索引推文案，换序会串。
    expect(methods).toEqual(['time', 'manual', 'number', 'split', 'character', 'auto'])
    // 默认落在「报数起卦（三个数）」
    await expect(page.locator('#methodDisplay')).toContainText('报数起卦（三个数）')
    // 下拉默认是收起的（要点 `#methodDisplay` 才展开），所以这里不能断言它可见 ——
    // 断言的是「展开后确实有 6 项、且只有一项带 ✓」。
    await expect(page.locator('#methodDropdown')).toBeHidden()
    await page.locator('#methodDisplay').click()
    await expect(page.locator('#methodDropdown')).toBeVisible()
    await expect(page.locator('#methodDropdown .method-option')).toHaveCount(6)
  })

  test('时间起卦：排盘信息 + 起卦结果两张卡，本卦卦名可读', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await selectMethod(page, 'time')
    await page.locator('#startBtn').click()

    await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#resultArea .card-next')).toBeVisible()
    // 排盘信息里有卦式与时间
    await expect(page.locator('#resultArea .card-flush')).toContainText('排盘信息')
    await expect(page.locator('#resultArea .card-flush')).toContainText('时间起卦')
    expect(errors).toEqual([])
  })

  test('报数起卦：386 与分段写法「10 8 6」都要出盘', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    // 两种写法必须都认：`386` 是提示语里的主路径，`10 8 6` 是分段写法（2026-10-19
    // 用户确认「报数可以填 0 以上任意整数」之后，分段写法仍然成立，输入本身没被收紧）。
    for (const value of ['386', '10 8 6']) {
      const input = page.locator('#methodParams input#numberInput')
      await input.fill(value)
      await page.locator('#startBtn').click()
      await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })
      // 数字进「数字」那一行时是**逐位空格分开**的：`386` → `3 8 6`，
      // 而 `10 8 6` 原样三段。两种写法归一化后都是「每个数之间一个空格」。
      const shown = value.trim().includes(' ')
        ? value.trim().split(/\s+/).join(' ')
        : value.split('').join(' ')
      await expect(page.locator('#resultArea .card-flush')).toContainText(shown)
    }
    expect(errors).toEqual([])
  })

  // ★ 0 是合法报数（2026-10-19 用户口径：「0 也可以输入，0 直接就按余数为 0 来算」）。
  //   0 → `wrap8(0)` = 8（坤）、`wrap6(0)` = 6，所以 `0 0 0` 应当出「坤为地」并且不报错。
  //   动爻规则没动（仍是三个数之和 ÷6），这里只钉「0 不再被拦」与提示语的说法一致。
  test('数字起卦：0 可以填，按余数 0 算（上/下卦取 8）', async ({ page }) => {
    await page.goto(PAGE)
    const tip = page.locator('#methodParams .algo-text')
    await expect(tip).toContainText('0 也可以报')
    await expect(tip).toContainText('上、下卦都取 8')

    let dialogMsg = ''
    page.on('dialog', async (d) => {
      dialogMsg = d.message()
      await d.accept()
    })
    await page.locator('#methodParams input#numberInput').fill('0 0 0')
    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })
    // 第一张 `.card-flush` 是「排盘信息」，卦名在后面的「起卦结果」卡里 —— 断言整块结果区。
    await expect(page.locator('#resultArea')).toContainText('坤为地')
    expect(dialogMsg).toBe('') // 没有弹窗 = 没被拦
  })

  test('AI 宿主挂在结果区后面，且有「解卦」按钮', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('#aiInlineHost')).toHaveCount(0) // 起卦前没有
    await selectMethod(page, 'time')
    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })

    await expect(page.locator('#aiInlineHost')).toBeVisible()
    const ordered = await page.evaluate(() => {
      const area = document.getElementById('resultArea')
      const host = document.getElementById('aiInlineHost')
      if (!area || !host) return null
      return {
        sameParent: area.parentElement === host.parentElement,
        after: !!(area.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING),
      }
    })
    expect(ordered).toEqual({ sameParent: true, after: true })
    await expect(page.locator('#aiInlineHost').getByRole('button', { name: /解卦/ })).toBeVisible()
    // 生成式 AI 标识：《AI 使用与风险说明》第七条承诺「解读区标有 AI 生成」，就靠这枚标签。
    // 它必须和标题一起出现在面板栏里，而不是藏在正文末尾（折叠正文后就看不见了）。
    await expect(page.locator('#aiInlineHost .ai-panel-header .ai-gen-label')).toHaveText(/AI 生成/)
    expect(errors).toEqual([])
  })

  test('点「开始解卦」把面板打开（请求全部截住，判的是面板）', async ({ page }) => {
    const errors = collectErrors(page)
    await page.route('**/api/chat/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'data: [DONE]\n\n' }),
    )
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await selectMethod(page, 'time')
    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })

    await page.locator('#aiInlineHost').getByRole('button', { name: /解卦/ }).click()
    await expect(page.locator('#aiPanel')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#aiPanelTitle')).toContainText('解析')
    expect(errors).toEqual([])
  })

  test('再起一卦：结果区替换而不叠加', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await selectMethod(page, 'time')
    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .card-flush')).toBeVisible({ timeout: 10_000 })

    await page.locator('#startBtn').click()
    await expect(page.locator('#resultArea .card-flush')).toHaveCount(1)
    await expect(page.locator('#resultArea .card-next')).toHaveCount(1)
    await expect(page.locator('#aiInlineHost')).toHaveCount(1) // 宿主只建一次
  })
})

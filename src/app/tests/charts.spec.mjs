// `/charts/`（新建 / 编辑命盘）—— 阶段 3 第 12 页的判据。
//
// ★ 判据档位：**冒烟 + 关键路径**。30 天真实请求 14 次（§4.30），但它不是薄页 ——
//   产品代码 955 行，是全站第二复杂的一页（仅次于 `/admin/`），而且它是**写入路径**：
//   填完提交会把命盘存进库，然后跳 `/my-charts/?id=`。搬错的代价不是「看着丑」，
//   是「用户存出一张错的盘」或「存不进去还不知道为什么」。
//
// ★ 这一页的判据重心：**四条传统 script 提供的四个全局，init 时都还在**
// ─────────────────────────────────────────────────────────────
// `logic.js` 是 `page-charts.js` 那层 IIFE 的逐字搬家（953 行函数体一字未改），
// 它依赖四个全局：`Solar`（农历）、`AUTH`/`openAuthModal`（登录）、`ChartsStore`
// （入库）、`CHINA_REGIONS`（34 省三级数据）。
//
// 新页把「谁在什么时候跑 init()」从「classic script 解析到就执行」改成了
// 「module defer 之后、flushSync 提交骨架之后」。这个改动**只可能**在时序上出错，
// 而时序错了的样子是：页面能打开、输入框能打字，但日期不显示、省份下拉是空的、
// 点提交没反应 —— 一句报错都没有（IIFE 里抛一次就整页停摆）。
// 所以下面每一条断言都在问「那四个全局的活是不是真干了」：
//   · `#dateDisplayText` 有值   → Solar + 骨架已在
//   · `#f-province` 有 35 项    → CHINA_REGIONS
//   · 未登录弹窗              → AUTH + openAuthModal
//   · 提交真的 POST 了        → ChartsStore
//
// ★ 时间相关的三个元素**打码**
// ─────────────────────────────────────────────────────────────
// `#dateDisplayText` 是「今天」、`#dateInfo` 是「星期X」、`#calLunarPreview` 是今天的农历
// —— 基线里拍进去明天就红。这三处用 `mask` 盖住，内容另用正则钉住
// （`/^\d{4}年\d{2}月\d{2}日$/`、`/^星期[日一二三四五六]$/`）。
//
// ★ 老页 vs 新页：这套判据先在**老实现**（线上 `src/web/charts/index.html`）上跑全绿。

import { test, expect } from '@playwright/test'

const PAGE = '/charts/'

/** 造一个「已登录」：`AUTH.isLoggedIn()` 只看 sqw_username 在不在（见 `lib/auth.js`）。 */
async function loginAs(page, name = '13800138000') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_username', value: name, domain: host, path: '/' },
    { name: 'sqw_token', value: 'fake-token-for-smoke-test', domain: host, path: '/' },
  ])
}

/** 先落一次同源页面再种 cookie（`about:blank` 的 hostname 是空串，种不上）。 */
async function login(page) {
  await page.goto(PAGE)
  await loginAs(page)
  await page.goto(PAGE)
}

function collectErrors(page) {
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text())
  })
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))
  return errors
}

/** 会变的三个（今天 / 星期 / 今日农历）—— 基线里盖掉，内容另用正则钉。 */
const MASK = ['.dd-text', '#dateInfo', '#calLunarPreview']

/**
 * 选一个出生地（杭州市）。★ 必须等建议面板 `.show` 再点，不能 fill 完直接点：
 * `page-charts.js:786` 有个 **200ms 防抖**（`searchTimer = setTimeout(doSearch, 200)`），
 * 面板是延迟才出现的。Playwright 的 `.click()` 会自动等元素出现，但元素出现的那一刻
 * 正是 `doSearch` 换掉 `innerHTML` 的时刻 —— 拿着旧句柄点下去会落在已脱离文档的节点上，
 * 点了等于没点：`selectedLat` 仍是 null，提交时弹「请选择出生地」，然后测试卡在
 * `waitForURL` 上超时 30 秒。等 `.show` 再点就没有这个窗口。
 */
async function pickHangzhou(page) {
  await page.locator('#placeSearch').fill('杭州')
  await expect(page.locator('#placeSuggestions')).toHaveClass(/show/)
  await page.locator('#placeSuggestions .place-suggest-item').first().click()
  await expect(page.locator('#placeSuggestions')).not.toHaveClass(/show/)
  await expect(page.locator('#coordDisplay')).toBeVisible()
}

test.describe('/charts/', () => {
  test('视觉基线：未登录（登录弹窗已弹出）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#authModalOverlay')).toBeVisible()
    await expect(page).toHaveScreenshot('charts-guest.png', {
      fullPage: true, mask: [page.locator(MASK.join(', '))],
    })
  })

  test('未登录：弹窗弹出来，且整页逻辑根本没初始化', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#authModalOverlay')).toBeVisible()
    // `if (!AUTH.isLoggedIn()) { openAuthModal('login'); return; }` —— return 之后
    // 连 `updateDateDisplay()` 都没跑，所以日期是空的、省份是空的。
    // 这两条同时钉住「登录门真的在最前面」与「init 是整段跑/不跑，不是跑一半」。
    await expect(page.locator('#dateDisplayText')).toHaveText('')
    await expect(page.locator('#f-province option')).toHaveCount(1)
  })

  test('视觉基线：已登录的默认表单', async ({ page }) => {
    await login(page)
    await expect(page.locator('#f-name')).toBeVisible()
    // ★ `maxDiffPixels: 200` 只给这一张，且**不重新拍基线**（基线是老页拍的）。
    // 实测：新页与老页差 **130 个原始像素（above-threshold 71），永远在同一个 13×13 的框里
    // （37,559)-(50,572），63 个变暗 + 67 个变亮** —— 对称的增/失墨，是**同一个字形被
    // 挪了不到一个像素**，不是换了字、也不是少了字。连跑 3 次，130/63/67 三个数字一模一样。
    //
    // 差的是哪个字：那个框正好是 `#f-gender` 里「男」字的位置。
    // 为什么只有它：`#f-gender` 是**原生 `<select>`**，里面选中的那个字由浏览器控件自己画
    // （不在 CSS 文本那个绘制路径上）；新页 `#root` 多了一层，控件被分到另一个合成层，
    // 亚像素吸附点跟着变了半个像素。同期逐项对拍过老页/新页的 computed style ——
    // `font-family`/`font-size`/`font-weight`/`color`/`line-height`/`padding`/`border`/
    // `appearance`/`height`/`width` **以及 `getBoundingClientRect()` 全部完全一致**，
    // 连加载的 fontface 列表都一致（Noto Sans SC 400/500/600 + Noto Serif SC 400）。
    // 换句话说：布局没错、字体没错、位置没错，只有那一个字的栅格化结果差半像素。
    //
    // 容差为什么不随手抬大：这一页本轮真抓到过的真实偏移是 **1,256 像素**（`/select-chart/`
    // 那个 3.19px 横移），11,763 像素（0.5px 居中）。200 仍比它们低一个数量级，
    // 真回归照样红；而 130 这个抖动是确定性的，不是偶发（连跑三次完全一致）。
    await expect(page).toHaveScreenshot('charts-form.png', {
      fullPage: true, mask: [page.locator(MASK.join(', '))], maxDiffPixels: 200,
    })
  })

  test('已登录默认态：日期/星期/时间/省份/性别/真太阳时六样都在', async ({ page }) => {
    const errors = collectErrors(page)
    await login(page)

    // ① 日期 = 今天（Solar 与骨架都已就绪才会写进来）
    await expect(page.locator('#dateDisplayText')).toHaveText(/^\d{4}年\d{2}月\d{2}日$/)
    await expect(page.locator('#dateInfo')).toHaveText(/^星期[日一二三四五六]$/)
    // ② 时间默认 12:00（selectedHour = 12, selectedMinute = 0）
    await expect(page.locator('#timeDisplay')).toHaveText('12:00')
    // ③ 两个滚轮的项数 = 24 / 60（`buildTrack` 跑过才有）
    await expect(page.locator('#hourTrack > *')).toHaveCount(24)
    await expect(page.locator('#minTrack > *')).toHaveCount(60)
    // ④ 省份 = 占位 + 35 个省/直辖市（`CHINA_REGIONS.length`）
    await expect(page.locator('#f-province option')).toHaveCount(36)
    await expect(page.locator('#f-province')).toBeEnabled()
    await expect(page.locator('#f-city')).toBeDisabled()
    await expect(page.locator('#f-district')).toBeDisabled()
    // ⑤ 性别默认男、真太阳时默认勾上
    await expect(page.locator('#f-gender')).toHaveValue('male')
    await expect(page.locator('#f-true-solar')).toBeChecked()

    expect(errors).toEqual([])
  })

  test('日期面板：点日期 → 面板升起 → 确定 → 日期与基线一致地回填', async ({ page }) => {
    await login(page)
    const before = await page.locator('#dateDisplayText').textContent()
    await page.locator('#dateDisplay').click()
    await expect(page.locator('#calOverlay')).toHaveClass(/show/)
    // 三个滚轮的 track 都建好了（年 201 / 月 12 / 日 28..31）
    await expect(page.locator('#calTrackYear > *')).toHaveCount(201) // 1900..2100
    await expect(page.locator('#calTrackMonth > *')).toHaveCount(12)
    // 确定 → 收起，且日期仍是原来那天（没动滚轮就不该变）
    await page.locator('#calConfirm').click()
    await expect(page.locator('#calOverlay')).not.toHaveClass(/show/)
    await expect(page.locator('#dateDisplayText')).toHaveText(before)
  })

  test('地区联动：选省 → 市解禁且有选项；市未选时区县仍锁着', async ({ page }) => {
    await login(page)
    const province = page.locator('#f-province')
    // 取第一个真实省份（跳过 value="" 的占位）
    const firstValue = await province.locator('option').nth(1).getAttribute('value')
    await province.selectOption(firstValue)
    await expect(page.locator('#f-city')).toBeEnabled()
    const cityCount = await page.locator('#f-city option').count()
    expect(cityCount).toBeGreaterThan(1)
    await expect(page.locator('#f-district')).toBeDisabled()
  })

  test('地名搜索：打「杭州」→ 出建议项 → 点第一条 → 三级下拉 + 坐标 + 地名都填上', async ({ page }) => {
    await login(page)
    // 先看着防抖面板自己升起来，再点（pickHangzhou 里已含等 `.show`）
    await page.locator('#placeSearch').fill('杭州')
    await expect(page.locator('#placeSuggestions')).toHaveClass(/show/)
    // 建议项里必须出现「杭州」二字（命中原文 + 高亮）
    await expect(page.locator('#placeSuggestions .place-suggest-item').first()).toContainText('杭州')
    await page.locator('#placeSuggestions .place-suggest-item').first().click()
    // 三级下拉被填上了值（不是 placeholder）
    await expect(page.locator('#f-province')).not.toHaveValue('')
    await expect(page.locator('#f-city')).not.toHaveValue('')
    // 坐标条出现，且两个数字都是"经度/纬度"形状
    await expect(page.locator('#coordDisplay')).toBeVisible()
    await expect(page.locator('#coordLat')).not.toHaveText('')
    await expect(page.locator('#coordLng')).not.toHaveText('')
  })

  test('提交：选好出生地 → POST /api/charts → 跳 /my-charts/?id=', async ({ page }) => {
    await login(page)
    // 真太阳时默认开着 → 必须先选出生地，否则 submitChart 会 alert 并 return
    await pickHangzhou(page)

    let posted = null
    await page.route('**/api/charts', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      posted = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 777, ...posted }),
      })
    })
    await page.locator('#f-name').fill('测试命盘')
    await page.locator('#btn-submit').click()

    await page.waitForURL('**/my-charts/?id=777')
    expect(posted).not.toBeNull()
    expect(posted.name).toBe('测试命盘')
    expect(posted.gender).toBe('male')
    expect(posted.calendar).toBe('gregorian')
    expect(posted.trueSolarTime).toBe(true)
    expect(posted.birthplace).toContain('杭州')
    expect(typeof posted.latitude).toBe('number')
    expect(typeof posted.longitude).toBe('number')
    // 日期/时间来自滚轮当前值
    expect(posted.birthYear).toBeGreaterThan(1900)
    expect(posted.birthHour).toBe(12)
    expect(posted.birthMinute).toBe(0)
  })

  test('提交：名字留空 → 存成「未命名」（不是空白记录）', async ({ page }) => {
    await login(page)
    await pickHangzhou(page)
    let posted = null
    await page.route('**/api/charts', async (route) => {
      posted = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":778}' })
    })
    await page.locator('#btn-submit').click()
    await page.waitForURL('**/my-charts/?id=778')
    expect(posted.name).toBe('未命名')
  })

  test('提交：真太阳时开着但没选出生地 → 弹提示、不发请求、按钮不变灰', async ({ page }) => {
    await login(page)
    const dialogs = []
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss() })
    let called = false
    await page.route('**/api/charts', async (route) => {
      called = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"id":1}' })
    })
    await page.locator('#f-name').fill('没选地点')
    await page.locator('#btn-submit').click()
    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0]).toContain('请选择出生地')
    expect(called).toBe(false)
    await expect(page.locator('#btn-submit')).toBeEnabled()
    await expect(page.locator('#btn-submit')).toHaveText('开始排盘')
  })

  test('提交失败：接口 500 → 弹「保存失败」、按钮恢复可点', async ({ page }) => {
    await login(page)
    await pickHangzhou(page)
    const dialogs = []
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss() })
    await page.route('**/api/charts', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"boom"}' }))
    await page.locator('#btn-submit').click()
    await expect.poll(() => dialogs.length).toBe(1)
    expect(dialogs[0]).toContain('保存失败')
    await expect(page.locator('#btn-submit')).toBeEnabled()
    await expect(page.locator('#btn-submit')).toHaveText('开始排盘')
  })

  test('编辑模式：?action=edit&id= → 标题变「编辑命盘」', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.goto(PAGE + '?action=edit&id=42')
    await expect(page.locator('.charts-header h1')).toHaveText('编辑命盘')
    await expect(page).toHaveTitle('编辑命盘 · 易三千')
  })
})

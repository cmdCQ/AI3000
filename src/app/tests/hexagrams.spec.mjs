import { test, expect } from '@playwright/test'

// `/hexagrams/`（`src/web/hexagrams/index.html` 38 行 + `page-hexagrams.js` 105 行 /
// 3 个顶层函数）。
//
// ★ 档位：**冒烟**，不是差分。（计划文档 §5 的档位表）
//   真实请求 18 次（剔掉 curl / HeadlessChrome 机器人后 12 次），全站倒数第 6。
//   按纪律 ⑤「个位数到十几的薄页只做冒烟测试」，这一页不写差分脚本、不写变异套件 ——
//   那两样每页要 300-1400 行，而这一页总共只有 143 行。
//
// 冒烟判据 = ① 视觉基线（拿老页拍，新页必须逐像素相同）+ ② 关键行为对齐
//            + ③ 零 console 报错。③ 是贯穿每一条的，不是单独一条测试。
//
// ★ 这一份能同时跑老页和新页，所以「判据描述的是老行为」这件事是可以验的：
//   `BASE_URL=https://sqw.somtfly.com npx playwright test tests/hexagrams.spec.mjs`
//   在老页上必须先全绿，搬完再跑一遍仍然全绿。

/** 收集加载期的 console 报错与未捕获异常 */
function trackErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  return errors
}

test('视觉基线：首屏（未选任何卦，右栏是「如何使用」空态）', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })

  // 64 张卡全部画出来再说截图 —— 否则可能截到「骨架刚出、卡片还没填」的中间帧
  await expect(page.locator('.hex-card')).toHaveCount(64)
  await expect(page.locator('#detail .detail-empty')).toBeVisible()

  expect(errors, '加载期间不应有 console 报错').toEqual([])
  // 首次生成用 --update-snapshots（**对着老页拍**）；之后每次比对像素，
  // 基线 PNG 进仓库，git diff 里能看见「这一页长什么样变了」
  await expect(page).toHaveScreenshot('hexagrams-empty.png', { fullPage: true })
})

test('64 张卡：数量、顺序、卡片三行文字', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })

  const cards = page.locator('#grid .hex-card')
  await expect(cards).toHaveCount(64)

  // 顺序 = HEXAGRAM_DATA 的插入顺序（老 `page-hexagrams.js:4` 是 `for (var name in …)`）。
  // 只断言头尾，不断言全部 64 个名字 —— 中间顺序错了视觉基线会红，
  // 而把 64 个名字抄进判据只会让「改数据文件」变成「同时改判据」。
  await expect(cards.first()).toHaveAttribute('data-name', '乾')
  await expect(cards.last()).toHaveAttribute('data-name', '未济')

  // 卡片三行：卦象符号 / 卦名+「卦」/ 拼音
  const first = cards.first()
  await expect(first.locator('.sym')).toHaveText('䷀')
  await expect(first.locator('.nm')).toHaveText('乾卦')
  await expect(first.locator('.py')).toHaveText('qián')

  // 每张卡都必须有 id，且 id 与 data-name 对得上（老 `:6` 是 `id="card-'+name+'"`）。
  // 相关卦象的跳转、以及「点完把卡片滚进视口」全靠这个 id。
  const ids = await cards.evaluateAll((els) =>
    els.map((e) => [e.id, e.dataset.name]).filter(([id, n]) => id !== 'card-' + n),
  )
  expect(ids, '每张卡的 id 必须是 card-<data-name>').toEqual([])

  expect(errors).toEqual([])
})

test('搜索：中文卦名 / 拼音 / 只输空格 / 清空', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })
  const input = page.locator('.search-input')
  const visible = page.locator('#grid .hex-card:visible')

  // 1. 中文：老 `:23` 匹配 d.n（卦名，无「卦」后缀）与 d.kw（含「乾卦」等带后缀写法）。
  //    「乾」应当同时命中 d.n='乾' 的乾卦，以及 kw 里带「乾」的其它卦 —— 所以
  //    这里不写死数量，只断言「确实筛掉了东西」且「乾卦还在」。
  await input.fill('乾')
  await expect(page.locator('#card-乾')).toBeVisible()
  const afterChinese = await visible.count()
  expect(afterChinese, '搜「乾」应当筛掉一部分卦').toBeLessThan(64)
  expect(afterChinese, '搜「乾」不能把乾卦也筛掉').toBeGreaterThan(0)

  // 2. 拼音：老 `:23` 对 d.p 单独 `toLowerCase()`，查询串在 `:17` 已经小写化。
  //    ★ 实测挖出来的一条**真行为**：数据里的拼音带声调（`qián`，U+00E1），
  //      所以输入不带声调的完整 `qian` **匹配不到**乾（`'qián'.indexOf('qian')` = -1）。
  //      只有「停在被声调字母之前的前缀」才命中，比如 `qi`。
  //      这不是缺陷、也不在这次搬迁里修 —— 修了就是改行为。判据按老行为写：
  //      前缀 `qi` 命中；完整 `qian` 不命中。两条都测，否则「拼音搜索坏了」
  //      和「拼音搜索被悄悄改成无声调」都发现不了。
  await input.fill('qi')
  await expect(page.locator('#card-乾')).toBeVisible()
  const afterPinyin = await visible.count()
  expect(afterPinyin).toBeLessThan(64)
  expect(afterPinyin).toBeGreaterThan(0)

  await input.fill('qian')
  await expect(page.locator('#card-乾')).toBeHidden()

  // 3. 只输空格：老 `:17` 先小写再 `trim()`，`:22` 判空串 → **全部显示**。
  //    这条最容易被「优化」掉（比如改成 `q.trim()` 之后再比较），所以单独测。
  await input.fill('   ')
  await expect(visible).toHaveCount(64)

  // 4. 清空 → 回到 64 张
  await input.fill('')
  await expect(visible).toHaveCount(64)

  // 5. 搜一个必然没有结果的串 → 0 张卡，但页面本身不能崩
  await input.fill('这个卦不存在zzz')
  await expect(visible).toHaveCount(0)
  await expect(page.locator('.search-input')).toBeVisible()

  expect(errors).toEqual([])
})

test('点一张卡：详情出现、卡片高亮、必选段落齐全', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })

  await page.locator('#card-乾').click()

  const detail = page.locator('#detail')
  // 空态消失、真详情出现
  await expect(detail.locator('.detail-empty')).toHaveCount(0)
  await expect(detail.locator('.detail-title .dsym')).toHaveText('䷀')
  await expect(detail.locator('.detail-title .dname')).toHaveText('乾卦')
  await expect(detail.locator('.detail-title .dpy')).toHaveText('qián')

  // 元数据三项（老 `:48`）
  await expect(detail.locator('.detail-meta span')).toHaveCount(3)
  await expect(detail.locator('.detail-meta')).toContainText('乾为天')
  await expect(detail.locator('.detail-meta')).toContainText('上乾下乾')
  await expect(detail.locator('.detail-meta')).toContainText('第1卦')

  // 段落：5 个必选 + 3 个可选（乾卦三样可选段都有：适用场景 / 历史典故 / 相关卦象）
  // ★ 这里踩过一次：第一版写 `toHaveCount(5)`，老页实测是 8。—— 说明「必选段落有 5 个」
  //   这句话本身没错，错在拿它当「总数」。数量断言只能写**总数**，语义靠前 5 个的文案锚定。
  //   老 `:51` 核心要义 / `:54` 卦辞 / `:58` 象传 / `:62` 爻辞详解 / `:71` 现代应用指南
  const labels = detail.locator('.sec-label')
  await expect(labels).toHaveCount(8)
  await expect(labels.nth(0)).toContainText('核心要义')
  await expect(labels.nth(1)).toContainText('卦辞')
  await expect(labels.nth(2)).toContainText('象传')
  await expect(labels.nth(3)).toContainText('爻辞详解')
  await expect(labels.nth(4)).toContainText('现代应用指南')

  // 爻辞：乾卦六爻（老 `:64` 遍历 d.y）
  await expect(detail.locator('.yao-list .yao-item')).toHaveCount(6)
  await expect(detail.locator('.yao-list .yao-item').first().locator('.yn')).toHaveText('初九')

  // 用九（只有 2 个卦有 `d.yy`，乾卦是其中之一）
  await expect(detail.locator('.yongyao')).toContainText('用九')

  // 现代应用四格（老 `:73-76`）
  await expect(detail.locator('.app-grid .app-item')).toHaveCount(4)
  await expect(detail.locator('.app-career')).toContainText('事业')
  await expect(detail.locator('.app-love')).toContainText('感情')
  await expect(detail.locator('.app-decision')).toContainText('决策')
  await expect(detail.locator('.app-warning')).toContainText('警示')

  // 卡片高亮：只有被点的那一张带 .active（老 `:36-38` 先全清再加）
  await expect(page.locator('#grid .hex-card.active')).toHaveCount(1)
  await expect(page.locator('#card-乾')).toHaveClass(/active/)

  expect(errors).toEqual([])
})

test('点相关卦象：详情换成那一卦，高亮跟着走', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })
  await page.locator('#card-乾').click()

  const related = page.locator('#detail .related a')
  await expect(related.first()).toBeVisible()
  // 乾卦的相关卦第一项是坤（数据里 r[0] = {n:'坤卦', s:'䷁'}）
  const firstText = (await related.first().innerText()).trim()
  expect(firstText).toContain('坤')

  await related.first().click()

  // 详情换成坤卦
  await expect(page.locator('#detail .detail-title .dname')).toHaveText('坤卦')
  await expect(page.locator('#detail .detail-meta')).toContainText('第2卦')
  // 高亮：坤卦那张卡带 active，乾卦那张不带
  await expect(page.locator('#card-坤')).toHaveClass(/active/)
  await expect(page.locator('#card-乾')).not.toHaveClass(/active/)
  await expect(page.locator('#grid .hex-card.active')).toHaveCount(1)

  expect(errors).toEqual([])
})

test('可选段落：有「适用场景 / 历史典故 / 关键词」的卦要画出来', async ({ page }) => {
  const errors = trackErrors(page)
  await page.goto('/hexagrams/', { waitUntil: 'networkidle' })

  await page.locator('#card-乾').click()
  const detail = page.locator('#detail')

  // 老 `:79-83` 适用场景、`:85-88` 历史典故、`:96-100` 关键词 —— 都是可选段。
  // 乾卦三样都有（实测数据：sc 6 项、hi 非空、kw 9 项）。
  await expect(detail.locator('.sc-tags span')).toHaveCount(6)
  await expect(detail).toContainText('适用场景')
  await expect(detail.locator('.history')).not.toBeEmpty()
  await expect(detail).toContainText('历史典故')
  await expect(detail.locator('.kw-tags span')).toHaveCount(9)

  // 相关卦象 4 条（数据 r 长度 4）
  await expect(detail.locator('.related a')).toHaveCount(4)

  expect(errors).toEqual([])
})

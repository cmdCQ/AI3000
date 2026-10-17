// `/suggestion/`（提交建议页）—— 阶段 3 第 9 页的判据。
//
// ★ 判据档位：**冒烟**（30 天 10 次请求，剔机器人 6 次，见计划 §4.30）。
//
// ★ 这一页判据的重心：**六行文案各不相同**
// ─────────────────────────────────────────────────────────────
// 六个维度（总体 / UI / 功能 / AI / 响应速度 / 内容丰富度）的第 5 档文案分别是
// 「非常满意 / 非常舒适 / 非常适用 / 非常准确 / 非常快 / 非常丰富」。
// 从老代码抄这张表时最容易串行（尤其 responseSpeed 与 accuracy 两行），而串行之后
// **页面上看不出异常** —— 每行都还是"四个字"。所以下面用一张表逐维度点同一颗星、
// 念它自己那一档的文案，而不是只抽查一行。
//
// ★ 这一页有一个**老 bug**，判据按"线上真实行为"锁住而不是按"应该怎样"锁：
//   未登录那张卡上的「去登录」按钮点了没反应（老页没引 /js/auth.js，而且属性里
//   还写了 `\'` 导致语法错）。详见 `src/app/suggestion/main.jsx` 头注释与计划 §9.3。
//   这条判据的作用是：**将来谁把它修好了，这里会红**，于是修复会是一次显式决定。

import { test, expect } from '@playwright/test'

const PAGE = '/suggestion/'

const ROWS = [
  { name: 'overall', title: '总体评价', labels: ['请评分', '很差', '较差', '一般', '满意', '非常满意'] },
  { name: 'ui', title: 'UI 界面舒适度', labels: ['请评分', '很不舒适', '不太舒适', '一般', '舒适', '非常舒适'] },
  { name: 'feature', title: '功能适用度', labels: ['请评分', '完全不适用', '不太适用', '一般', '适用', '非常适用'] },
  { name: 'ai', title: 'AI 解析准确度', labels: ['请评分', '完全不准确', '不太准确', '一般', '准确', '非常准确'] },
  { name: 'responseSpeed', title: '响应速度', labels: ['请评分', '非常慢', '较慢', '一般', '较快', '非常快'] },
  { name: 'accuracy', title: '解析内容丰富度', labels: ['请评分', '很贫乏', '不够丰富', '一般', '丰富', '非常丰富'] },
]

/** 造一个「已登录」：老脚本第 2 行只读 `sqw_token` 这一个 cookie。 */
async function loginAs(page, token = 'fake-token-for-smoke-test') {
  const host = new URL(page.url()).hostname
  await page.context().addCookies([
    { name: 'sqw_token', value: token, domain: host, path: '/' },
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

test.describe('/suggestion/', () => {
  test('视觉基线：未登录（登录提示卡）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#sgLoginRequired')).toBeVisible()
    await expect(page.locator('#sgForm')).toBeHidden()
    await expect(page).toHaveScreenshot('suggestion-guest.png', { fullPage: true })
  })

  test('视觉基线：已登录（评测表单）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('#sgForm')).toBeVisible()
    await expect(page.locator('#sgLoginRequired')).toBeHidden()
    await expect(page).toHaveScreenshot('suggestion-form.png', { fullPage: true })
  })

  test('未登录：表单藏起来、提示卡亮出来', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('#sgForm')).toBeHidden()
    const card = page.locator('#sgLoginRequired')
    await expect(card).toBeVisible()
    await expect(card.locator('.cg-title')).toHaveText('登录后提交建议')
    await expect(card.locator('.cg-desc')).toHaveText('登录后才可以提交建议，让我知道你是谁')
    await expect(card.locator('.cg-btn')).toHaveText('去登录')
  })

  test('★ 老 bug 锁住：未登录时点「去登录」不弹登录框（修好了这条会红）', async ({ page }) => {
    await page.goto(PAGE)
    await expect(page.locator('.cg-btn')).toBeVisible()
    // 线上老页实测：typeof openAuthModal === 'undefined'（这页没引 auth.js），
    // 而且老 HTML 属性里写的是 `\'`，编译 handler 时就语法错。
    await page.locator('.cg-btn').click()
    await expect(page.locator('#authModalOverlay')).toHaveCount(0)
    // 也没有跳到别处（href 是 javascript:void(0)）
    await expect(page).toHaveURL(/\/suggestion\/$/)
  })

  test('已登录：表单六个维度，顺序与标题都对，标签初始是「请评分」', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('#sgForm')).toBeVisible()

    const rows = page.locator('.sg-rating-row')
    await expect(rows).toHaveCount(6)

    // 顺序 = 老 HTML 第 28-98 行的行序
    for (let i = 0; i < ROWS.length; i++) {
      await expect(rows.nth(i).locator('.sg-rating-name')).toHaveText(ROWS[i].title)
      await expect(rows.nth(i).locator('.sg-stars')).toHaveAttribute('data-rating', ROWS[i].name)
      await expect(rows.nth(i).locator('.sg-star-label')).toHaveText('请评分')
      // 每行五颗空星
      await expect(rows.nth(i).locator('.sg-star')).toHaveCount(5)
      await expect(rows.nth(i).locator('.sg-star')).toHaveText(['☆', '☆', '☆', '☆', '☆'])
    }
  })

  test('★ 六个维度的第 4 档文案各不相同（抄表最容易串行的地方）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await expect(page.locator('#sgForm')).toBeVisible()

    for (const row of ROWS) {
      const stars = page.locator(`.sg-stars[data-rating="${row.name}"] .sg-star`)
      await stars.nth(3).click() // 第 4 颗
      await expect(page.locator('#label_' + row.name)).toHaveText(row.labels[4])
    }
  })

  test('点星：点亮前 N 颗、其余保持空心，active 类只加在前 N 颗', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    const container = page.locator('.sg-stars[data-rating="overall"]')
    const stars = container.locator('.sg-star')

    await stars.nth(2).click() // 3 星
    await expect(stars).toHaveText(['★', '★', '★', '☆', '☆'])
    await expect(container.locator('.sg-star.active')).toHaveCount(3)
    await expect(page.locator('#label_overall')).toHaveText('一般')

    // 降回 1 星：多出来的 active 要被摘掉
    await stars.nth(0).click()
    await expect(stars).toHaveText(['★', '☆', '☆', '☆', '☆'])
    await expect(container.locator('.sg-star.active')).toHaveCount(1)
    await expect(page.locator('#label_overall')).toHaveText('很差')
  })

  // ★ 这条判据只比**计算色**，不比 inline style。
  //   老实现的 inline style 有一条"粘住"的路径：鼠标从第 1 颗移到第 2 颗去点击时，
  //   mouseenter 先把第 1、2 颗（当时还是空心）刷上预览色，紧接着 click 把它们变成
  //   `.active`；之后再移开，mouseleave 只清"非 active"的，于是那两颗的 inline 色
  //   **留在了 DOM 上**（实测 style.color 仍是 var(--star-active)）。
  //   它不影响观感 —— `.active` 的星颜色由 class 决定，inline 同色等于没写。
  //   React 版每次渲染重算 inline style，不会留这个残迹；两者**计算色完全相同**，
  //   所以判据锁计算色，锁的是用户看得见的东西。
  // ★ 这条判据只比**计算色**，不比 inline style。
  //   老实现的 inline style 有一条"粘住"的路径：鼠标从第 1 颗移到第 2 颗去点击时，
  //   mouseenter 先把第 1、2 颗（当时还是空心）刷上预览色，紧接着 click 把它们变成
  //   `.active`；之后再移开，mouseleave 只清"非 active"的，于是那两颗的 inline 色
  //   **留在了 DOM 上**（实测 style.color 仍是 var(--star-active)）。
  //   它不影响观感 —— `.active` 的星颜色由 class 决定，inline 同色等于没写。
  //   React 版每次渲染重算 inline style，不会留这个残迹；两者**计算色完全相同**，
  //   所以判据锁计算色，锁的是用户看得见的东西。
  //
  // ★ 读色必须用 `expect.poll` 重试：`hover()` 归位后到渲染管线吃到样式之间有一小段
  //   延迟，直接读 `getComputedStyle` 会读到上一帧（实测第一版就是这么假红的：四颗
  //   都还是底色，`Set` 大小 1 让"四颗同色"那条假过了，只靠 `not.toBe` 抓到）。
  test('悬停预览：未点亮的星临时上色，移开就清掉（比计算色，不比 inline style）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    // ★ 这个测试关掉 CSS 过渡：`.sg-star` 上有 `transition: color`，过渡期间
    //   `getComputedStyle` 读到的是插值（实测抓到 rgb(49,117,104) 这种中间色），
    //   于是"同一颗星前后两次读到的颜色应该相同"这类断言会随机假红。
    //   这里要判的是**哪几颗被上色**这件逻辑，不是过渡曲线；过渡由同一份 CSS 提供，
    //   新旧实现不可能不同，静态外观另由视觉基线兜着。
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

    const container = page.locator('.sg-stars[data-rating="overall"]')
    const stars = container.locator('.sg-star')
    const colors = () => stars.evaluateAll((els) => els.map((e) => getComputedStyle(e).color))

    const base = await colors()
    // 初始五颗同一个颜色
    expect(new Set(base).size).toBe(1)

    // 悬停第 4 颗：第 1-4 颗变成高亮色，第 5 颗不动
    await stars.nth(3).hover()
    await expect.poll(() => colors().then((c) => c[0])).not.toBe(base[0])
    const hovered = await colors()
    expect(new Set(hovered.slice(0, 4)).size).toBe(1)
    expect(hovered[4]).toBe(base[4])

    // 移开：全部回到初始色
    await page.locator('.sg-title').hover()
    await expect.poll(() => colors().then((c) => c[0])).toBe(base[0])
    expect(await colors()).toEqual(base)

    // 点亮两颗之后再移开：已点亮的两颗保持高亮，其余回到初始色
    await stars.nth(1).click()
    await page.locator('.sg-title').hover()
    await expect.poll(() => colors().then((c) => c[2])).toBe(base[2])
    const afterClick = await colors()
    expect(afterClick[0]).toBe(hovered[0])
    expect(afterClick[1]).toBe(hovered[0])
    expect(afterClick[3]).toBe(base[3])
    expect(afterClick[4]).toBe(base[4])
  })

  // ★★★ 这条判据刻意锁住一个**已知缺陷**，不是锁住正确行为。
  //
  // 老实现（page-suggestion.js:39-52）在 mouseenter 时给"非 active"的星写 inline 色，
  // 而这些星紧接着被 click 变成 `.active`；再点回低分时它们失去 `.active`，
  // inline 色却还在 —— 屏幕上仍然亮着，用户以为选了 4 星。
  //
  // 2026-10-17 在**线上老页**实测到的顺序（这就是下面断言的来源）：
  //   after click 4 : 四颗 active，2/3/4 inline = var(--star-active)
  //   after click 1 : 只剩第 1 颗 active；2/3/4 计算色仍是 rgb(31,107,94)
  //   after leave   : 恢复正常
  //
  // §4.9 的规矩是"照搬、没修、注释标死、等拍板"，所以新页也必须是这个表现。
  // **谁把它修好了，这条会红** —— 那时请连同 §4.9 一起改，别只删断言。
  test('★ 老缺陷锁住：降分后 2/3/4 仍亮着（照搬没修，修好了这条会红）', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()
    await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' })

    const container = page.locator('.sg-stars[data-rating="overall"]')
    const stars = container.locator('.sg-star')
    const colors = () => stars.evaluateAll((els) => els.map((e) => getComputedStyle(e).color))

    // 划过去点第 4 颗
    await stars.nth(3).click()
    await expect(container.locator('.sg-star.active')).toHaveCount(4)

    // 再点回第 1 颗：`.active` 只剩 1 颗
    await stars.nth(0).click()
    await expect(container.locator('.sg-star.active')).toHaveCount(1)
    await expect(stars).toHaveText(['★', '☆', '☆', '☆', '☆'])
    await expect(page.locator('#label_overall')).toHaveText('很差')

    // ★ 但 2/3/4 的计算色还是高亮色 —— 这就是那个缺陷
    const sticky = await colors()
    expect(sticky[0]).not.toBe(sticky[4])
    expect(sticky[1]).toBe(sticky[0])
    expect(sticky[2]).toBe(sticky[0])
    expect(sticky[3]).toBe(sticky[0])

    // 鼠标移开之后才恢复正常（mouseleave 清掉非 active 的 inline 色）
    await page.locator('.sg-title').hover()
    await expect.poll(() => colors().then((c) => c[1])).toBe(sticky[4])
    const cleaned = await colors()
    expect(cleaned[0]).toBe(sticky[0])
    expect(cleaned[2]).toBe(sticky[4])
    expect(cleaned[3]).toBe(sticky[4])
  })

  test('字数计数器：输入即变，格式是「N / 4000」', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    const counter = page.locator('#charCounter')
    await expect(counter).toHaveText('0 / 4000')

    const box = page.locator('#sgContent')
    await box.fill('想加一个导出的功能')
    await expect(counter).toHaveText('9 / 4000')

    await box.fill('')
    await expect(counter).toHaveText('0 / 4000')
  })

  test('空内容提交：不发请求，焦点回到文本框', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    let posted = 0
    page.on('request', (req) => {
      if (req.url().includes('/api/suggestions')) posted++
    })

    await page.locator('#sgSubmitBtn').click()
    await page.waitForTimeout(300)
    expect(posted).toBe(0)
    await expect(page.locator('#sgContent')).toBeFocused()
    // 表单还在，没进成功态
    await expect(page.locator('#sgForm')).toBeVisible()
    await expect(page.locator('#sgSuccess')).toBeHidden()
  })

  test('提交成功：请求体六个分数 + 正文，进入成功卡', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    // 拦掉真后端：这一页的判据不该往生产库里写建议
    let body = null
    let authHeader = null
    await page.route('**/api/suggestions', async (route) => {
      body = JSON.parse(route.request().postData() || '{}')
      authHeader = route.request().headers()['authorization']
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    })

    // 只给两个维度打分（其余维度**没有键**，必须落成 0）
    await page.locator('.sg-stars[data-rating="overall"] .sg-star').nth(4).click()
    await page.locator('.sg-stars[data-rating="accuracy"] .sg-star').nth(1).click()
    await page.locator('#sgContent').fill('希望增加导出 PDF 的功能')

    await page.locator('#sgSubmitBtn').click()
    await expect(page.locator('#sgSuccess')).toBeVisible()
    await expect(page.locator('#sgForm')).toBeHidden()

    expect(authHeader).toBe('Bearer fake-token-for-smoke-test')
    expect(body).toEqual({
      overall: 5,
      ui: 0,
      feature: 0,
      ai: 0,
      responseSpeed: 0,
      accuracy: 2,
      content: '希望增加导出 PDF 的功能',
    })
  })

  test('提交失败：alert 出来、按钮恢复可用、表单还在', async ({ page }) => {
    await page.goto(PAGE)
    await loginAs(page)
    await page.reload()

    await page.route('**/api/suggestions', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"服务暂时不可用"}' }),
    )

    const dialogs = []
    page.on('dialog', async (d) => {
      dialogs.push(d.message())
      await d.accept()
    })

    await page.locator('#sgContent').fill('测试失败路径')
    const btn = page.locator('#sgSubmitBtn')
    await btn.click()

    await expect.poll(() => dialogs.length).toBeGreaterThan(0)
    expect(dialogs[0]).toContain('提交失败')
    expect(dialogs[0]).toContain('服务暂时不可用')

    await expect(btn).toBeEnabled()
    await expect(btn).toHaveText('提交建议 ✦')
    await expect(page.locator('#sgForm')).toBeVisible()
    await expect(page.locator('#sgSuccess')).toBeHidden()
  })
})

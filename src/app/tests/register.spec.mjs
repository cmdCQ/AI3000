// `/register/`（独立注册页）—— 阶段 4 前置的第 15 页判据。
//
// ★ 为什么这页还在：能直接访问的网址，30 天真实请求 **25 次**（`GET /register/ HTTP`
//   且 200/304、剔机器人）。比 `/suggestion/`（6）、`/charts/`（1）都多。老页在
//   `src/web/register/index.html` + `src/web/js/page-register.js`。
//
// ★ 判据档位：冒烟 + 一条写入路径。这页有两件会影响别处的事：
//   ① 种 `sqw_token` / `sqw_username`（同登录页）；② **发短信**。
//   发码那条要钉住「什么情况下不发」——手机号格式不对就发，等于是拿短信费给人刷。
//
// ★ 这一页有**两套长得像的校验**，老代码不对称，判据要分别钉：
//   发码前 `:10` 走 `/^1\d{10}$/`（提示「请输入正确的手机号」）；
//   提交前 `:68` 只判非空（提示「请输入手机号」）。合并成一个函数就错。

import { test, expect } from '@playwright/test'

const PAGE = '/register/'

const VALID = { phone: '13800138000', code: '123456', password: 'secret123', confirm: 'secret123' }

function collectErrors(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  return errors
}

async function mockJson(page, pattern, status, body) {
  await page.route(pattern, (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  )
}

async function fillAll(page, values) {
  await page.locator('#phone').fill(values.phone)
  await page.locator('#smsCode').fill(values.code)
  await page.locator('#password').fill(values.password)
  await page.locator('#confirm').fill(values.confirm)
}

test.describe('/register/', () => {
  // ★ 兜底桩：**判据绝不允许真的发短信**。老页自己没有节流，测试连点几下就是
  //   几个真实短信。这里给所有用例挂一条默认 200，需要特定返回的用例再自己
  //   `page.route` 覆盖（Playwright 后注册的优先）。
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/send-sms-code', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
  })

  test('视觉基线：游客看到的注册表单', async ({ page }) => {
    // ★ 基线是对着**老页**（`src/web/register/index.html`）拍的。
    await page.goto(PAGE)
    await expect(page.locator('#registerForm')).toBeVisible()
    await expect(page).toHaveScreenshot('register.png', { fullPage: true })
  })

  test('发码前手机号格式不对：提示「请输入正确的手机号」且不发请求', async ({ page }) => {
    let requested = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/send-sms-code')) requested += 1
    })
    await page.goto(PAGE)
    // 老 `:10`：`!phone || !/^1\d{10}$/.test(phone)`
    //
    // ★ 这里**故意不测 12 位数字**：`#phone` 带 `maxlength="11"`，浏览器会直接
    //   截断成 11 位（实测填 `138001380001` 进去读出来是 `13800138000`），
    //   于是它会**通过**校验并真的发一条短信。第一版判据就踩了这个坑：
    //   既没测到「格式错」，又在老页上发出了一条真实短信请求。
    for (const bad of ['', '12345', '23800138000', '1380013800']) {
      await page.locator('#phone').fill(bad)
      await page.locator('#sendSmsBtn').click()
      await expect(page.locator('#registerError')).toHaveText('请输入正确的手机号')
    }
    expect(requested).toBe(0)
  })

  test('发码成功：POST {phone}，按钮进入 60 秒冷却且从 60 开始倒数', async ({ page }) => {
    let body = null
    await page.route('**/api/send-sms-code', async (route) => {
      body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.goto(PAGE)
    await page.locator('#phone').fill('13800138000')
    await page.locator('#sendSmsBtn').click()

    const btn = page.locator('#sendSmsBtn')
    // 老 `:34` 固定 60；老 `:52` 文案 `<秒>s 后重发`
    await expect(btn).toHaveText('60s 后重发')
    await expect(btn).toBeDisabled()
    expect(body).toEqual({ phone: '13800138000' })

    // 冷却真的在走（不是贴了个静态 60）：等一秒必须变 59
    await expect(btn).toHaveText('59s 后重发', { timeout: 3000 })
  })

  test('发码失败：显示后端 error，并按 data.cooldown 起冷却', async ({ page }) => {
    // 老 `:27-32`：先显示 error、恢复按钮，**再**如果 data.cooldown 存在就起冷却。
    await mockJson(page, '**/api/send-sms-code', 429, { error: '发送太频繁，请稍后再试', cooldown: 42 })
    await page.goto(PAGE)
    await page.locator('#phone').fill('13800138000')
    await page.locator('#sendSmsBtn').click()

    await expect(page.locator('#registerError')).toHaveText('发送太频繁，请稍后再试')
    await expect(page.locator('#sendSmsBtn')).toHaveText('42s 后重发')
    await expect(page.locator('#sendSmsBtn')).toBeDisabled()
  })

  test('提交前四道校验，且「密码太短」优先于「两次不一致」', async ({ page }) => {
    let requested = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/register')) requested += 1
    })
    await page.goto(PAGE)
    await page.locator('#registerForm').evaluate((f) => {
      f.noValidate = true
    })
    const err = page.locator('#registerError')
    const submit = page.locator('button[type=submit]')

    // 老 `:68` 空手机号（先给全字段填上，只留手机号空）
    await fillAll(page, { ...VALID, phone: '' })
    await submit.click()
    await expect(err).toHaveText('请输入手机号')

    // 老 `:69` 空验证码
    await fillAll(page, { ...VALID, code: '' })
    await submit.click()
    await expect(err).toHaveText('请输入短信验证码')

    // ★ 老 `:70` 在 `:71` 之前：密码 3 位 + 两次不一致 → 报「太短」而不是「不一致」
    await fillAll(page, { ...VALID, password: '123', confirm: '9999' })
    await submit.click()
    await expect(err).toHaveText('密码至少需要 6 位')

    // 老 `:71` 两次不一致
    await fillAll(page, { ...VALID, confirm: 'secret124' })
    await submit.click()
    await expect(err).toHaveText('两次密码不一致')

    expect(requested).toBe(0)
  })

  test('注册成功：种两个 cookie 并跳回首页', async ({ page }) => {
    await mockJson(page, '**/api/register', 200, { token: 'tok_reg', username: '新用户' })
    await page.goto(PAGE)
    await fillAll(page, VALID)
    await page.locator('button[type=submit]').click()

    await expect
      .poll(async () => {
        const jar = await page.context().cookies()
        return jar
          .filter((c) => c.name === 'sqw_token' || c.name === 'sqw_username')
          .map((c) => `${c.name}=${c.value}`)
          .sort()
      })
      .toEqual(['sqw_token=tok_reg', 'sqw_username=%E6%96%B0%E7%94%A8%E6%88%B7'])

    await page.waitForURL((url) => url.pathname === '/')
  })

  test('后端 400：显示 error 原文，按钮恢复「注册」', async ({ page }) => {
    await mockJson(page, '**/api/register', 400, { error: '验证码错误或已过期' })
    await page.goto(PAGE)
    await fillAll(page, VALID)
    await page.locator('button[type=submit]').click()

    await expect(page.locator('#registerError')).toHaveText('验证码错误或已过期')
    const btn = page.locator('button[type=submit]')
    await expect(btn).toHaveText('注册')
    await expect(btn).toBeEnabled()
  })

  test('加载本页零 console 报错', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await expect(page.locator('#registerForm')).toBeVisible()
    expect(errors).toEqual([])
  })
})

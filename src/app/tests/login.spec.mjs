// `/login/`（独立登录页）—— 阶段 4 前置的第 14 页判据。
//
// ★ 为什么这页还在：它不是 `openAuthModal` 弹出的那个弹窗，是**能直接访问的网址**。
//   30 天真实请求 8 次（`GET /login/ HTTP` 且 200/304、剔机器人），比 `/charts/` 的
//   1 次多。`/register/` 25 次。所以这三份老脚本（page-login.js / page-register.js /
//   老登录页 HTML）不能随 `src/web/js/` 一起删，得先搬。
//
// ★ 判据档位：冒烟（视觉基线 + 关键行为 + 零 console 报错），加一条「cookie 长什么样」
//   —— 那是这页唯一会**影响别的页**的副作用：`sqw_token` / `sqw_username` 写错了，
//   本页看起来一切正常（还跳回首页了），坏的是之后每个页面。
//
// ★ 这条判据必须先对**老页**跑绿。老页在 `src/web/login/index.html`，
//   `PAGE=/login/` 直接打线上就是老页。

import { test, expect } from '@playwright/test'

const PAGE = '/login/'

function collectErrors(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  return errors
}

async function mockLogin(page, status, body) {
  await page.route('**/api/login', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  )
}

test.describe('/login/', () => {
  test('视觉基线：游客看到的登录表单', async ({ page }) => {
    // 视觉基线零容差：这页没有原生 select、没有按秒变的文案。
    // ★ 基线**是对着老页拍的**（`src/web/login/index.html`），不是新页。
    await page.goto(PAGE)
    await expect(page.locator('#loginForm')).toBeVisible()
    await expect(page).toHaveScreenshot('login.png', { fullPage: true })
  })

  test('空表单提交被浏览器原生校验拦住：不显示自定义错误、不发请求', async ({ page }) => {
    // ★ 老页 `#phone` / `#password` 都带 `required`，所以 `page-login.js:10` 那条
    //   「请输入手机号和密码」**在真浏览器里根本走不到** —— 原生校验先拦。
    //   这条判据锁的是「真实可观察行为」，不是那条死代码。
    let requested = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/login')) requested += 1
    })
    await page.goto(PAGE)
    await page.locator('button[type=submit]').click()
    await expect(page.locator('#loginError')).toHaveText('')
    expect(requested).toBe(0)
    // 原生校验：`:invalid` 伪类命中手机号输入框
    await expect(page.locator('#phone')).toHaveJSProperty('validity.valueMissing', true)
  })

  test('手机号只有空格时走自定义拦截（绕过原生校验才能到）', async ({ page }) => {
    // 老 `:7` 是 `value.trim()`。给 `novalidate` 把原生校验关掉，才能测到 `:10`。
    let requested = 0
    page.on('request', (r) => {
      if (r.url().includes('/api/login')) requested += 1
    })
    await page.goto(PAGE)
    await page.locator('#loginForm').evaluate((f) => {
      f.noValidate = true
    })
    await page.locator('#phone').fill('   ')
    await page.locator('#password').fill('anything')
    await page.locator('button[type=submit]').click()
    await expect(page.locator('#loginError')).toHaveText('请输入手机号和密码')
    expect(requested).toBe(0)
  })

  test('后端 401：显示 error 原文，按钮恢复「登录」且可再点', async ({ page }) => {
    await mockLogin(page, 401, { error: '手机号或密码错误' })
    await page.goto(PAGE)
    await page.locator('#phone').fill('13800138000')
    await page.locator('#password').fill('wrong-password')
    await page.locator('button[type=submit]').click()

    await expect(page.locator('#loginError')).toHaveText('手机号或密码错误')
    const btn = page.locator('button[type=submit]')
    await expect(btn).toHaveText('登录')
    await expect(btn).toBeEnabled()
    // 老 `:24-26` 不清空输入框，只恢复按钮
    await expect(page.locator('#phone')).toHaveValue('13800138000')
  })

  test('登录成功：种两个 cookie 并跳回首页', async ({ page }) => {
    await mockLogin(page, 200, { token: 'tok_abc 123', username: '测试用户' })
    await page.goto(PAGE)
    await page.locator('#phone').fill('13800138000')
    await page.locator('#password').fill('correct-password')
    await page.locator('button[type=submit]').click()

    // 老 `:21-22`：先写 cookie 再跳。两个 cookie 的 path / max-age 都是契约的一部分，
    // 漏了 max-age 就是「关掉浏览器就掉登录」，漏了 path=/ 就是「只在 /login/ 下算登录」。
    await expect
      .poll(async () => {
        const jar = await page.context().cookies()
        return jar
          .filter((c) => c.name === 'sqw_token' || c.name === 'sqw_username')
          .map((c) => `${c.name}=${c.value};path=${c.path};maxage=${c.expires > 0}`)
          .sort()
      })
      .toEqual(['sqw_token=tok_abc%20123;path=/;maxage=true', 'sqw_username=%E6%B5%8B%E8%AF%95%E7%94%A8%E6%88%B7;path=/;maxage=true'])

    await page.waitForURL((url) => url.pathname === '/')
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('已登录的人访问 /login/ 被直接送回首页（连登录框都不闪）', async ({ page }) => {
    // 老 `:1` 在 classic script 求值时跳转，早于首帧；新实现放在 render 之前同理。
    const host = new URL(await (await page.context().request.get(PAGE)).url()).hostname
    await page.context().addCookies([
      { name: 'sqw_username', value: 'someone', domain: host, path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForURL((url) => url.pathname === '/')
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('加载本页零 console 报错', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto(PAGE)
    await expect(page.locator('#loginForm')).toBeVisible()
    expect(errors).toEqual([])
  })
})

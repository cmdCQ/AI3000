// 登录弹窗的「注册」tab —— 同意法律文档的勾选框必须真的在。
//
// ★ 这一条是用户 2026-10-19 报的**真故障**：弹窗注册 tab 里根本没有「同意法律文档」
//   这一段文字，更没有勾选框，而 `POST /api/register` 的**第一句**就是
//   `const { phone, code, password, agreed } = body; if (!agreed) return 400 '请先同意法律文档后再注册'`
//   —— 于是从这个 tab 注册**100% 失败**：手机号、验证码、密码全填对，点注册也只会
//   弹出这句错误，用户以为验证码坏了。独立页 `/register/` 一直有勾选框（`tests/register.spec.mjs`
//   钉过），所以是弹窗这一支漏了，不是后端要求变了。
//
// ★ 判据分三层，缺一层都可能「看着修好了其实还是不能注册」：
//   ① 文案与三个法律文档链接在场（用户要能点开看）；
//   ② 没勾时点注册：本地就拦下并给出人话提示，**不许发请求**（发了就是 400）；
//   ③ 勾了之后请求体里真的带 `agreed: true`（只加 UI 不改请求体 = 还是失败）。
//
// ★ 入径用 `/select-chart/` 的「注册」按钮：它是唯一直接 `openAuthModal('register')`
//   的用户入口（`src/app/select-chart/main.jsx:36`），比在别处先点登录再切 tab 少一步。

import { test, expect } from '@playwright/test'

const PAGE = '/select-chart/'

function collectErrors(page) {
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  return errors
}

test.describe('登录弹窗 · 注册 tab', () => {
  // ★ 判据绝不允许真的发短信（这里只是防手滑点「获取验证码」）。
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/send-sms-code', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
  })

  test('注册 tab：同意法律文档的文案与链接在场；没勾不发请求；勾了才带 agreed=true', async ({ page }) => {
    const errors = collectErrors(page)
    const posted = []
    await page.route('**/api/register', (route) => {
      posted.push(route.request().postDataJSON())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-token', username: '13800138000' }),
      })
    })

    await page.goto(PAGE)
    await page.getByRole('button', { name: '注册', exact: true }).click()
    await expect(page.locator('#authModalOverlay')).toBeVisible()
    await expect(page.locator('#authModalRegister')).toBeVisible()

    // ① 文案 + 三个链接（href 必须是 `/legal/` 的三个锚点）
    const consent = page.locator('.auth-modal-consent')
    await expect(consent).toBeVisible()
    await expect(consent).toContainText('我已阅读并同意')
    await expect(consent.getByRole('link', { name: '用户协议' })).toHaveAttribute('href', '/legal/#agreement')
    await expect(consent.getByRole('link', { name: '隐私政策' })).toHaveAttribute('href', '/legal/#privacy')
    await expect(consent.getByRole('link', { name: 'AI 使用与风险说明' })).toHaveAttribute('href', '/legal/#ai')
    // 默认不许预先勾上（默认勾选等于没让用户同意）
    await expect(page.locator('#authAgreed')).not.toBeChecked()

    // ② 没勾：本地拦下，不发请求
    await page.locator('#authPhoneReg').fill('13800138000')
    await page.locator('#authSmsCode').fill('123456')
    await page.locator('#authPwReg').fill('secret123')
    await page.locator('#authPwConfirm').fill('secret123')
    await page.locator('#authRegBtn').click()
    await expect(page.locator('#authRegError')).toHaveText('请先阅读并同意用户协议、隐私政策和 AI 使用与风险说明')
    expect(posted, '没勾同意就不该发注册请求（发了必定 400）').toHaveLength(0)

    // ③ 勾上：请求体带 agreed: true
    await page.locator('#authAgreed').check()
    await page.locator('#authRegBtn').click()
    await expect
      .poll(() => posted.length, { message: '勾了同意之后应当发出注册请求' })
      .toBe(1)
    expect(posted[0].agreed).toBe(true)
    expect(posted[0].phone).toBe('13800138000')
    expect(posted[0].code).toBe('123456')

    expect(errors).toEqual([])
  })
})

import { test, expect } from '@playwright/test'

async function setup(page, { guest = false, deleteFailure = false } = {}) {
  const deletions = [], errors = [], calls = []
  page.on('pageerror', error => errors.push(error.message))
  if (!guest) await page.context().addCookies(['sqw_token', 'sqw_username'].map(name => ({ name, value: name === 'sqw_token' ? 'fixture-token' : 'fixture-user', url: test.info().project.use.baseURL || process.env.BASE_URL || 'https://sqw.somtfly.com' })))
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url())
    calls.push(url.pathname)
    if (request.method() === 'DELETE') {
      deletions.push(url.pathname)
      return route.fulfill({ status: deleteFailure ? 409 : 200, json: deleteFailure ? { error: '已有咨询正在生成，请稍后重试' } : { ok: true } })
    }
    if (url.pathname === '/api/bazi/consultations') return route.fulfill({ json: url.searchParams.has('before') ? { consultations: [{ id: 'q2', chartName: '命盘乙', title: '感情咨询', updatedAt: 1700000000000 }], nextBefore: null } : { consultations: [{ id: 'q1', chartName: '命盘甲', title: '事业咨询', updatedAt: 1700000000000 }], nextBefore: 'cursor2' } })
    return route.fulfill({ status: 500, json: { error: '未配置的接口' } })
  })
  return { deletions, errors, calls }
}

test('咨询记录使用统一列表、分页和管理删除，不删除命盘', async ({ page }) => {
  const { deletions, errors } = await setup(page)
  await page.goto('/bazi-consult/?view=history')
  await expect(page.getByRole('heading', { name: '咨询记录' })).toBeVisible()
  await expect(page.getByRole('link', { name: /事业咨询/ })).toHaveAttribute('href', '/bazi-consult/?consultationId=q1')
  await page.getByRole('button', { name: '加载更多' }).click()
  await expect(page.getByRole('link', { name: /感情咨询/ })).toBeVisible()
  await page.getByRole('button', { name: '管理', exact: true }).click()
  await page.getByRole('checkbox', { name: '选择 事业咨询', exact: true }).check()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '删除选中' }).click()
  await expect.poll(() => deletions.length).toBe(1)
  expect(deletions).toEqual(['/api/bazi/consultations/q1'])
  await expect(page.getByRole('button', { name: '管理', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /感情咨询/ })).toBeVisible()
  expect(errors).toEqual([])
})
test('删除失败保留记录，取消确认不发送删除', async ({ page }) => {
  const { deletions } = await setup(page, { deleteFailure: true })
  await page.goto('/bazi-consult/?view=history')
  await page.getByRole('button', { name: '管理', exact: true }).click()
  await page.getByRole('checkbox', { name: '选择 事业咨询', exact: true }).check()
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: '删除选中' }).click()
  expect(deletions).toEqual([])
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '删除选中' }).click()
  await expect(page.getByRole('alert')).toContainText(/失败|正在生成/)
  await expect(page.locator('.record-card')).toContainText('事业咨询')
})
test('游客不请求私有咨询列表', async ({ page }) => {
  const { calls } = await setup(page, { guest: true })
  await page.goto('/bazi-consult/?view=history')
  await expect(page.getByText('登录后查看咨询记录')).toBeVisible()
  expect(calls).toEqual([])
})
for (const width of [390, 1280]) test(`咨询记录${width}px主题和布局`, async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width, height: 844 })
  await page.goto('/bazi-consult/?view=history')
  await expect(page.getByRole('link', { name: /事业咨询/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  expect(await page.locator('.records-page').evaluate(e => e.getBoundingClientRect().width)).toBeLessThanOrEqual(500)
  await page.screenshot({ path: test.info().outputPath(`consultation-history-${width}.png`), fullPage: true })
})

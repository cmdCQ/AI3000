import { test, expect } from '@playwright/test'
const chart = { id: 'c1', name: '合成命盘', gender: 'male', birth: { year: 1990, month: 5, day: 17, hour: 14, minute: 30 } }
async function mock(page, { send = true, status = 'completed', save = 'saved', failure = 404 } = {}) {
  const requests = [], errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.context().addCookies(['sqw_token', 'sqw_username'].map(name => ({ name, value: name === 'sqw_token' ? 'test-token' : 'fixture-user', url: test.info().project.use.baseURL || process.env.BASE_URL || 'https://sqw.somtfly.com' })))
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url())
    expect(req.headers().authorization).toBe('Bearer test-token')
    if (url.pathname === '/api/charts/c1') return route.fulfill({ json: chart })
    if (url.pathname === '/api/bazi/consultations') return route.fulfill({ json: { consultations: [{ id: 'q1', chartName: chart.name, title: '事业咨询', updatedAt: Date.now() }] } })
    if (url.pathname === '/api/bazi/consultations/q1') return route.fulfill({ json: { consultation: { id: 'q1', chartId: 'c1', chartSnapshot: chart }, messages: [
      { id: '1:user', role: 'user', content: '此前的问题' }, { id: '1:assistant', role: 'assistant', content: '此前完整回答' },
    ] } })
    if (url.pathname === '/api/bazi-analyses') return route.fulfill({ json: [{ id: 'old1', aspect: '事业', analysis: '旧版分析原文' }] })
    if (url.pathname === '/api/bazi/consultations/send') {
      requests.push(req.postDataJSON())
      if (!send) return route.fulfill({ status: failure, json: { error: '模拟请求失败' } })
      return route.fulfill({ contentType: 'text/event-stream', body: `event: delta\ndata: ${JSON.stringify({ text: '这是回答', consultationId: 'q1' })}\n\nevent: done\ndata: ${JSON.stringify({ consultationId: 'q1', status, billing: { status: 'not_charged' }, save: { status: save } })}\n\n` })
    }
    return route.fulfill({ status: 404, json: { error: '测试未配置的接口' } })
  })
  return { requests, errors }
}
for (const width of [320, 1280]) test(`不存在的咨询显示主题状态页与返回入口 ${width}`, async ({ page }) => {
  const { requests, errors } = await mock(page)
  await page.setViewportSize({ width, height: 800 })
  await page.goto('/bazi-consult/?consultationId=missing', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '咨询不存在或已删除' })).toBeVisible()
  await expect(page.getByRole('link', { name: '返回咨询记录', exact: true })).toHaveAttribute('href', '/bazi-consult/?view=history')
  await expect(page.getByRole('button', { name: '重试' })).toHaveCount(0)
  const appearance = await page.locator('.bc-state-primary').evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, height: el.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth > innerWidth }))
  expect(appearance.bg).toBe('rgb(31, 107, 94)')
  expect(appearance.height).toBeGreaterThanOrEqual(44)
  expect(appearance.overflow).toBe(false)
  expect(requests).toEqual([]); expect(errors).toEqual([])
})
test('加载失败可原地重试，未登录显示登录入口', async ({ page }) => {
  await mock(page)
  let calls = 0
  await page.route('**/api/bazi/consultations/q1', route => route.fulfill(++calls === 1 ? { status: 503, json: { error: '服务暂不可用' } } : { json: { consultation: { id: 'q1', chartId: 'c1', chartSnapshot: chart }, messages: [] } }))
  await page.goto('/bazi-consult/?consultationId=q1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '咨询加载失败' })).toBeVisible()
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.bc-presets')).toBeVisible()
  await page.route('**/api/bazi/consultations/q1', route => route.fulfill({ status: 401, json: { error: '请先登录' } }))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link', { name: '去登录', exact: true })).toHaveAttribute('href', '/login/')
})
test('长回答只滚动消息区，Markdown排版并安全转义，输入区保持可见', async ({ page }) => {
  await mock(page)
  await page.setViewportSize({ width: 390, height: 700 })
  await page.route('**/api/bazi/consultations/send', route => route.fulfill({ contentType: 'text/event-stream', body:
    `event: delta\ndata: ${JSON.stringify({ text: '## 事业分析\n\n**重点建议**\n\n' + '这是一段用于验证长回答滚动的内容。\n\n'.repeat(70) + '<img src=x onerror=alert(1)>', consultationId: 'q1' })}\n\nevent: done\ndata: ${JSON.stringify({ status: 'completed', save: { status: 'saved' }, billing: { status: 'not_charged' } })}\n\n` }))
  await open(page)
  await page.locator('.bc-presets button').first().click()
  await expect(page.locator('.bc-markdown h2')).toHaveText('事业分析')
  await expect(page.locator('.bc-markdown strong')).toHaveText('重点建议')
  await expect(page.locator('.bc-markdown img')).toHaveCount(0)
  expect(await page.locator('.bc-messages').evaluate(el => el.scrollHeight > el.clientHeight)).toBeTruthy()
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(701)
  const composer = await page.locator('.bc-composer').boundingBox()
  expect(composer.y + composer.height).toBeLessThanOrEqual(700)
  await expect(page.locator('.bc-presets')).toHaveCount(0)
})
test('生成时发送切换为停止，停止后恢复输入且保留问题', async ({ page }) => {
  await mock(page)
  let release
  const pending = new Promise(resolve => { release = resolve })
  await page.route('**/api/bazi/consultations/send', async route => {
    await pending
    await route.fulfill({ contentType: 'text/event-stream', body: '' }).catch(() => {})
  })
  await open(page)
  await page.locator('.bc-presets button').first().click()
  await expect(page.getByRole('button', { name: '停止生成' })).toBeVisible()
  await expect(page.locator('.bc-send')).toHaveCount(0)
  await page.getByRole('button', { name: '停止生成' }).click()
  release()
  await expect(page.locator('.bc-send')).toBeVisible()
  await expect(page.getByRole('textbox', { name: '输入你想问的问题……' })).toHaveValue('我的命局有哪些主要特点？')
  await expect(page.getByRole('status')).toContainText('已停止生成')
})
const open = page => page.goto('/bazi-consult/?chartId=c1', { waitUntil: 'domcontentloaded' })
test('流式期间地址栏只同步一次，不会被 Safari 的 replaceState 限流掐断回答', async ({ page }) => {
  // 每个 delta 帧都带 consultationId（服务端就是这么发的）。Safari 对
  // history.replaceState() 有「10 秒内最多 100 次」的硬限制，超了会**抛异常**，
  // 异常从 for-await 里冒出来就把回答截断 —— 用户 iPhone 上「一直被截断」的真因。
  await page.addInitScript(() => {
    window.__replaceStateCalls = 0
    const original = history.replaceState.bind(history)
    history.replaceState = (...args) => { window.__replaceStateCalls += 1; return original(...args) }
  })
  const { errors } = await mock(page)
  const frames = Array.from({ length: 160 }, (_, i) => `event: delta\ndata: ${JSON.stringify({ text: `第${i}段。`, consultationId: 'q1' })}\n\n`).join('')
  // 必须放在 mock() 之后：mock 里的 `**/api/**` 会盖掉先注册的同名路由。
  await page.route('**/api/bazi/consultations/send', route => route.fulfill({ contentType: 'text/event-stream', body:
    frames + `event: done\ndata: ${JSON.stringify({ consultationId: 'q1', status: 'completed', billing: { status: 'not_charged' }, save: { status: 'saved' } })}\n\n` }))
  await page.goto('/bazi-consult/?chartId=c1', { waitUntil: 'domcontentloaded' })
  await page.locator('.bc-presets button').first().click()
  await expect(page.locator('.bc-markdown')).toContainText('第159段。')
  expect(await page.evaluate(() => window.__replaceStateCalls)).toBe(1)
  await expect(page.getByRole('status')).toContainText('回答生成完成')
  expect(errors).toEqual([])
})
test('首屏不自动发送，四个预设和真实出生摘要可见', async ({ page }) => {
  const { requests, errors } = await mock(page)
  await open(page)
  await expect(page.getByText('你想先了解什么？')).toBeVisible()
  await expect(page.locator('.bc-presets button')).toHaveCount(4)
  await expect(page.locator('.bc-header')).toContainText('1990年5月17日 14:30')
  expect(requests).toEqual([])
  expect(errors).toEqual([])
})
test('预设首问与连续数字年份追问保持同一咨询，刷新恢复历史', async ({ page }) => {
  const { requests, errors } = await mock(page)
  await open(page)
  await page.locator('.bc-presets button').first().click()
  await expect(page.getByText('这是回答')).toBeVisible()
  await expect(page.locator('.bc-presets')).toHaveCount(0)
  await expect(page.locator('.bc-cancel')).toHaveCount(0)
  await expect(page).toHaveURL(/consultationId=q1/)
  expect(requests[0]).toMatchObject({ chartId: 'c1', presetId: 'overview' })
  await page.getByRole('textbox', { name: '输入你想问的问题……' }).fill('2027年呢？')
  await page.locator('.bc-send').click()
  await expect.poll(() => requests.length).toBe(2)
  expect(requests[1]).toMatchObject({ consultationId: 'q1', message: '2027年呢？' })
  expect(requests[1].requestId).not.toBe(requests[0].requestId)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('此前完整回答')).toBeVisible()
  expect(requests.length).toBe(2)
  expect(errors).toEqual([])
})
for (const failure of [401, 403, 404, 429, 503]) test(`${failure}明确失败且保留草稿`, async ({ page }) => {
  await mock(page, { send: false, failure })
  await open(page)
  const input = page.getByRole('textbox', { name: '输入你想问的问题……' })
  await input.fill('我想问事业')
  await page.locator('.bc-send').click()
  await expect(page.getByRole('status')).toContainText('模拟请求失败')
  await expect(input).toHaveValue('我想问事业')
})
test('真实10000tokens仅展示1积分，不误用原token数', async ({ page }) => {
  await mock(page)
  await page.route('**/api/bazi/consultations/send', route => route.fulfill({ contentType: 'text/event-stream', body:
    `event: delta\ndata: ${JSON.stringify({ text: '积分合成回答', consultationId: 'q1' })}\n\nevent: done\ndata: ${JSON.stringify({ status: 'completed', save: { status: 'saved' }, billing: { status: 'charged', inputTokens: 2500, outputTokens: 7500, totalTokens: 10000, pointsCharged: 1, pointsRemaining: 9, pointsLimit: 10 } })}\n\n` }))
  await open(page)
  await page.locator('.bc-presets button').first().click()
  await expect(page.getByRole('status')).toContainText('1.0000 积分')
  await expect(page.getByRole('status')).not.toContainText('10000 积分')
})
test('partial 与保存失败不会冒充成功', async ({ page }) => {
  await mock(page, { status: 'partial', save: 'failed' })
  await open(page)
  await page.locator('.bc-presets button').first().click()
  await expect(page.getByRole('status')).toContainText('回答未完整生成')
  await expect(page.getByRole('status')).toContainText('记录保存未确认')
})
test('咨询记录不再展示或请求旧版分析，也不触发生成', async ({ page }) => {
  const { requests } = await mock(page)
  const legacyRequests = []
  page.on('request', req => { if (req.url().includes('/api/bazi-analyses')) legacyRequests.push(req.url()) })
  await page.goto('/bazi-consult/?view=history&chartId=c1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link', { name: /事业咨询/ })).toBeVisible()
  await expect(page.getByText('旧版八字分析（只读）')).toHaveCount(0)
  expect(legacyRequests).toEqual([])
  expect(requests).toEqual([])
})
for (const width of [320, 390, 1280]) test(`${width}px无横向溢出且沿用玉色主题`, async ({ page }) => {
  await mock(page)
  await page.setViewportSize({ width, height: 844 })
  await open(page)
  await expect(page.locator('.bc-send')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  expect(await page.locator('.bc-send').evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(31, 107, 94)')
  const composer = await page.locator('.bc-composer').boundingBox()
  expect(composer.y + composer.height).toBeLessThanOrEqual(844)
  expect(composer.y).toBeGreaterThan(650)
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(845)
  await expect(page.locator('.bc-cancel')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath(`consultation-${width}.png`) })
})

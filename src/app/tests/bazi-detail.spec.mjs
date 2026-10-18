import { test, expect } from '@playwright/test'

// 所有 API 均拦截；这里验证页面契约，不冒充算法对拍或调用真实 AI。
const chart = {
  id: 'fixture-bazi', name: '合成测试命盘', gender: 'male',
  birth: { year: 1990, month: 5, day: 17, hour: 14, minute: 30 },
  bazi: '庚午 辛巳 壬午 丁未',
}
const response = {
  chart: {
    year_pillar: { tiangan: '庚', dizhi: '午', wuxing_gan: '金', wuxing_zhi: '火', canggan: ['丁', '己', '辛'], shishen_gan: '偏印', shishen_zhi: '正官', nayin: '路旁土' },
    shensha: [{ name: '天乙贵人', pillar: '年支', dizhi: '午' }, { name: '文昌贵人', pillar: '日支', dizhi: '午' }],
    relations: { chong: [{ branches: ['子', '午'] }] },
    month_pillar: { tiangan: '辛', dizhi: '巳' },
    day_pillar: { tiangan: '壬', dizhi: '午' },
    hour_pillar: { tiangan: '丁', dizhi: '未' },
  },
  sizhu: { year_gz: '庚午', month_gz: '辛巳', day_gz: '壬午', hour_gz: '丁未' },
  display: { shengxiao: '马', lunar: '合成农历显示' },
}

async function setup(page, baseURL, { admin = false, failure = false } = {}) {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.context().addCookies([
    { name: 'sqw_username', value: 'fixture-user', url: baseURL },
    { name: 'sqw_token', value: 'fixture-token', url: baseURL },
  ])
  const requests = []
  await page.route('**/api/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    requests.push({ path, method: req.method(), body: req.postDataJSON() })
    if (path === '/api/charts/fixture-bazi' || path === '/api/admin/chart-detail/fixture-bazi') {
      return route.fulfill({ json: chart })
    }
    if (path === '/api/bazi/paipan') {
      return failure
        ? route.fulfill({ status: 503, contentType: 'text/plain', body: 'upstream unavailable' })
        : route.fulfill({ json: response })
    }
    if (path === '/api/bazi-analyses') return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
  await page.goto('/my-charts/?id=fixture-bazi' + (admin ? '&admin=1' : ''), { waitUntil: 'domcontentloaded' })
  return { errors, requests }
}

test.describe('八字详情页面契约', () => {
  test('立春前出生不按公历年份闪现虎，等待服务端生肖牛', async ({ page, baseURL }) => {
    await page.context().addCookies([
      { name: 'sqw_username', value: 'fixture-user', url: baseURL },
      { name: 'sqw_token', value: 'fixture-token', url: baseURL },
    ])
    let release
    const pending = new Promise(resolve => { release = resolve })
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/charts/fixture-bazi') return route.fulfill({ json: {
        ...chart, birth: { year: 2010, month: 2, day: 2, hour: 21, minute: 14 },
      } })
      if (path === '/api/bazi/paipan') {
        await pending
        return route.fulfill({ json: { ...response, display: { shengxiao: '牛' } } })
      }
      return route.fulfill({ json: {} })
    })
    await page.goto('/my-charts/?id=fixture-bazi', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#baziZodiac')).toHaveText('…')
    await expect(page.locator('#baziZodiac')).not.toContainText('🐯')
    release()
    await expect(page.locator('#baziZodiac')).toHaveText('🐂')
    await expect(page.locator('#baziZodiac')).toHaveAttribute('aria-label', '属牛')
  })

  test('详情只展示盘面，不放咨询入口或AI解读', async ({ page, baseURL }) => {
    const { errors, requests } = await setup(page, baseURL)
    await expect(page.locator('#baziChart .bz-pillar')).toHaveCount(4)
    await expect(page.locator('#baziAi')).toHaveCount(0)
    await expect(page.locator('#baziRest')).toContainText('基本信息')
    await expect(page.getByRole('link', { name: '发起咨询' })).toHaveCount(0)
    await expect(page.locator('.detail-back')).toHaveAttribute('href', '/select-chart/?type=charts')
    const calculation = requests.find(req => req.path === '/api/bazi/paipan')
    expect(calculation.body).toEqual({ y: 1990, mo: 5, d: 17, h: 14, mi: 30, gender: 'male' })
    await expect(page.locator('#baziRest')).not.toContainText('命局提要')
    expect(requests.filter(req => req.path === '/api/bazi/parse')).toEqual([])
    expect(errors).toEqual([])
  })

  test('非JSON错误保留HTTP状态、清空AI与资料，并提供重试', async ({ page, baseURL }) => {
    const { errors } = await setup(page, baseURL, { failure: true })
    await expect(page.locator('#baziChart')).toContainText('排盘失败（503）')
    await expect(page.locator('#baziChart')).not.toContainText('undefined')
    await expect(page.locator('#baziAi')).toHaveCount(0)
    await expect(page.locator('#baziRest')).toBeEmpty()
    await expect(page.getByRole('link', { name: '带着这副命盘去 AI 对话' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '重试排盘' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('管理员查看只展示盘面，不挂用户AI操作', async ({ page, baseURL }) => {
    const { errors, requests } = await setup(page, baseURL, { admin: true })
    await expect(page.locator('#baziChart .bz-pillar')).toHaveCount(4)
    await expect(page.getByRole('link', { name: '带着这副命盘去 AI 对话' })).toHaveCount(0)
    await expect(page.locator('#baziAi')).toHaveCount(0)
    await expect(page.locator('.detail-back')).toHaveAttribute('href', '/admin/')
    expect(requests.some(req => req.path === '/api/bazi-analyses')).toBe(false)
    expect(errors).toEqual([])
  })

  for (const width of [320, 360, 390, 500, 1280]) {
    test(`详情 ${width}px 无横向溢出`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width, height: 900 })
      await setup(page, baseURL)
      await expect(page.locator('#baziChart .bz-pillar')).toHaveCount(4)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      const table = page.locator('.bz-pillar-sheet')
      expect(await table.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)
      expect(await table.evaluate(el => el.getBoundingClientRect().width)).toBeLessThan(width)
      await expect(table.locator('tbody tr').nth(3).locator('td').first().locator('.bz-pillar-item')).toHaveText(['丁', '己', '辛'])
      expect(await table.evaluate(el => getComputedStyle(el).tableLayout)).toBe('fixed')
      const columns = await table.locator('thead th').evaluateAll(els => els.slice(1).map(el => el.getBoundingClientRect().width))
      expect(Math.max(...columns) - Math.min(...columns)).toBeLessThan(2)
      await expect(page.locator('.bz-marker-name').first()).toHaveText('天乙贵人')
      await expect(page.locator('.bz-marker-position').first()).toHaveText('年支 · 午')
      await expect(page.locator('.bz-marker-heading')).toHaveText(['神煞', '地支关系'])
      await page.screenshot({ path: test.info().outputPath(`bazi-detail-${width}.png`), fullPage: true })
    })
  }
})

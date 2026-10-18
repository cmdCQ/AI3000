import { test, expect } from '@playwright/test'

// /my/ 的额度契约测试：只 mock 新 points 接口，不访问真实用户数据。
test.describe('/my/ 积分额度', () => {
  test('展示普通用户今日用量、余额和北京时间刷新提示', async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'sqw_username=普通用户; path=/'
      document.cookie = 'sqw_token=test-token; path=/'
    })
    await page.route('**/api/user/points', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ pointsUsed: 2.5, pointsLimit: 10, pointsRemaining: 7.5, totalPointsUsed: 20, tier: 0, resetAt: '2027-01-01T00:00:00+08:00', billingDate: '2026-12-31' }),
    }))
    await page.goto('/my/')
    await expect(page.locator('#myContent')).toContainText('今日额度')
    await expect(page.locator('#myContent')).toContainText('2.5')
    await expect(page.locator('.quota-balance')).toContainText('7.5')
    await expect(page.locator('#myContent')).not.toContainText('Token')
    await expect(page.locator('#myContent')).not.toContainText('10000')
    await expect(page.locator('#myContent')).toContainText('北京时间每日 0 点刷新额度')
    await expect(page.locator('#myContent')).not.toContainText('解析次数')
  })

  test('普通会员显示每日50积分', async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'sqw_username=member; path=/'
      document.cookie = 'sqw_token=test-token; path=/'
    })
    await page.route('**/api/user/points', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pointsUsed: 12.5, pointsLimit: 50, pointsRemaining: 37.5, totalPointsUsed: 125.5, tier: 1, resetAt: '2027-01-01T00:00:00+08:00', billingDate: '2026-12-31' }) }))
    await page.goto('/my/')
    await expect(page.locator('#myContent')).toContainText('普通会员')
    await expect(page.locator('#myContent')).toContainText('12.5')
    await expect(page.locator('#myContent')).toContainText('37.5')
  })

  test('加载错误不显示伪造额度', async ({ page }) => {
    await page.addInitScript(() => { document.cookie = 'sqw_username=user; path=/'; document.cookie = 'sqw_token=test-token; path=/' })
    await page.route('**/api/user/points', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) }))
    await page.goto('/my/')
    await expect(page.locator('#myContent')).toContainText('加载失败')
    await expect(page.locator('#myContent')).not.toContainText('每日额度')
  })

  test('SVIP 显示无限且拒绝不完整契约', async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'sqw_username=svip; path=/'
      document.cookie = 'sqw_token=test-token; path=/'
    })
    await page.route('**/api/user/points', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ pointsUsed: 100, pointsLimit: null, pointsRemaining: null, totalPointsUsed: 100, tier: 2, resetAt: null, billingDate: '2026-12-31' }),
    }))
    await page.goto('/my/')
    await expect(page.locator('#myContent')).toContainText('SVIP')
    await expect(page.locator('.quota-balance')).toContainText('不限量')
  })
})

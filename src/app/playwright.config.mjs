import { defineConfig, devices } from '@playwright/test'

// 这是页面层的**端到端**判据。它替代的是 `duipan/drive_*_page.js` 那 7 个手搓驱页
// （3,347 行手写 Marionette 协议、手写等待、手动截图）。
//
// 默认打线上（nginx 挂的就是 `build/nginx`，所以打线上 = 测真实发布产物）。
// 想在隔离副本上跑就 `BASE_URL=http://127.0.0.1:8080`。
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // 站点是单机 nginx，别并行压它
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    // HTML 报告：`npx playwright show-report tests/.report` —— 带截图与 trace，可回放
    ['html', { outputFolder: 'tests/.report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://sqw.somtfly.com',
    ignoreHTTPSErrors: true, // 线上 http 一律 301 到 https，直连 127.0.0.1 时证书对不上
    // 站点是移动优先（老截图都是 500px 宽），基线也用这个尺寸
    viewport: { width: 500, height: 900 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 500, height: 900 } } }],
})

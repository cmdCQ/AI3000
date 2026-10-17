import { defineConfig, devices } from '@playwright/test'

// 这是页面层的**端到端**判据。它替代的是 `duipan/drive_*_page.js` 那 7 个手搓驱页
// （3,347 行手写 Marionette 协议、手写等待、手动截图）。
//
// 默认打线上（nginx 挂的就是 `build/nginx`，所以打线上 = 测真实发布产物）。
// 想在隔离副本上跑就 `BASE_URL=http://127.0.0.1:8080`。
//
// ★ 想在产物**落进 build/nginx 之前**就验证（推荐，这是部署前的最后一道门）：
//     PROBE_DIR=/tmp/home-probe npx playwright test
//   这时会自动起 `tests/probe-server.mjs`（静态产物 + /api 反代真站），
//   baseURL 自动指到它。否则默认打线上。
const PROBE_DIR = process.env.PROBE_DIR || ''
const PROBE_PORT = Number(process.env.PROBE_PORT || 8080)

export default defineConfig({
  testDir: './tests',
  // Playwright 默认的 testMatch 也认 `*.test.mjs`，会把 Vitest 的单元测试
  // 一起收进来（然后在 `test()` 里炸）。两套判据分工明确：
  //   *.spec.mjs → Playwright（真浏览器）
  //   *.test.mjs → Vitest（纯函数，node 环境）
  testMatch: '**/*.spec.mjs',
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
  webServer: PROBE_DIR
    ? {
        command: `node tests/probe-server.mjs`,
        url: `http://127.0.0.1:${PROBE_PORT}/`,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
      }
    : undefined,
  use: {
    baseURL: PROBE_DIR
      ? `http://127.0.0.1:${PROBE_PORT}`
      : process.env.BASE_URL || 'https://sqw.somtfly.com',
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

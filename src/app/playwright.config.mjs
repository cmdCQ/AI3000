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
// ★ 默认端口**不能是 8080**：那是 nginx 容器的 docker-proxy 端口（站点本身）。
//   配成 8080 时自己的 probe server 起不来（EADDRINUSE），而 `reuseExistingServer`
//   会把「端口已经在服务」当成「我的 server 已经在跑」→ 直接复用 →
//   baseURL 打到线上，**测试看起来照样全绿**（因为线上就是上一次发布的产物）。
//   这是一条名副其实的假绿通道：PROBE_DIR 明明指向 /tmp/xxx-probe，实际测的是 nginx。
//   所以：默认端口改成 8123，并且 reuseExistingServer 关掉 —— 端口被占就**响亮地失败**，
//   不要静默换一个目标。要并行跑两个 probe 就显式给不同的 PROBE_PORT。
const PROBE_PORT = Number(process.env.PROBE_PORT || 8123)

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
        // 把端口与目录**显式**传下去：probe-server.mjs 自己也有默认值，
        // 两处默认值曾经不一致（8080 vs 8123），表现为「配置改了但服务还是起在 8080」。
        env: { PROBE_DIR, PROBE_PORT: String(PROBE_PORT) },
        url: `http://127.0.0.1:${PROBE_PORT}/`,
        // 必须是 false：true 会把「端口上已经有个别的东西」当成「我的 server 已经在跑」，
        // 于是静默地测了别人的产物（见上面 PROBE_PORT 那段注释）。
        reuseExistingServer: false,
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

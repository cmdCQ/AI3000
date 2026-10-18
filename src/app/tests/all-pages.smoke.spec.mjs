import { test, expect } from '@playwright/test'

/**
 * 全站 16 页「能不能起来」的冒烟 —— 不替代任何一页的行为判据，
 * 只补一件现有判据没覆盖的事：**没有独立 spec 的那几页**（`/my/`、`/ai-chat/`、
 * `/my-charts/`、`/liuyao/`、`/mhys/`）在每次 cut-over 之后还能不能加载。
 *
 * 为什么需要它：阶段 4 把共享层（auth / ui_common / 渲染层 / ai_panel / 数据 blob）
 * 从传统 script 搬成 ESM 时，**改错一个 import 的症状是白屏或 ReferenceError**，
 * 而这几页的判据是 `duipan/` 里那套老驱动（跑在线上），probe 阶段照不到。
 * 这条 spec 可以对着 probe 产物跑，把「构建出来就是坏的」挡在发布之前。
 *
 * 判据只有两条，故意写得这么死：
 *   ① 页面里能找到一句只属于该页的文字（连错页/空页都抓得住）
 *   ② 一个 console error / pageerror 都不许有（ESM 拼错、import 缺失都落在这里）
 */

const PAGES = [
  ['/', '易三千'],
  ['/hexagrams/', '六十四卦'],
  ['/charts/', '开始排盘'],
  ['/my-charts/', '我的命盘'],
  ['/my/', '我的'],
  ['/ai-chat/', 'AI'],
  ['/liuyao/', '起卦'],
  ['/mhys/', '梅花'],
  ['/mhys/result.html', '排盘结果'],
  ['/mhys/history.html', '排盘记录'],
  ['/liuyao/history.html', '排盘记录'],
  ['/select-chart/', '四柱八字'],
  ['/suggestion/', '建议'],
  ['/login/', '登录'],
  ['/register/', '注册'],
  ['/admin/', '管理'],
]

for (const [path, anchor] of PAGES) {
  test(`冒烟：${path} 能加载、零 console 报错`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

    const resp = await page.goto(path, { waitUntil: 'load' })
    expect(resp.status(), `${path} 的状态码`).toBeLessThan(400)

    await expect(page.locator('body')).toContainText(anchor)
    // 等一拍：ESM 的报错（缺 import、初始化时抛）发生在 load 之后
    await page.waitForTimeout(600)

    expect(errors, `${path} 的控制台必须干净`).toEqual([])
  })
}

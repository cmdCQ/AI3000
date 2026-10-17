// @vitest-environment jsdom
// `/my-charts/?id=` 详细页的**页尾按钮**单测（§5.4）。
//
// ⚠ 必须用 jsdom 而不是 node 环境：`renderDetailHTML()` 里每个字段都要过
//   `esc()`，而 `esc()` 是 `document.createElement('div') + textContent → innerHTML`
//   （刻意不用手写转义表 —— 转义规则要和浏览器逐字节一致）。node 环境没有
//   `document`，会直接 `ReferenceError: document is not defined`。
//
// 为什么用 Vitest 而不是 Playwright：这一条要钉的是「某几个入口不存在」。
// 详细页要先 mock `GET /api/charts/<id>`、还要让八字排盘真的出盘才能截到页尾，
// 而那两段与「页尾有没有按钮」毫无关系 —— 用纯函数直接断言更快、更不会抖。
// 浏览器侧只留一条：三点菜单里没有 🗑（在 `my-charts.spec.mjs`）。
import { describe, expect, it } from 'vitest'
import { renderDetailHTML } from '../lib/myChartsView.js'

const chart = {
  id: 'c1',
  name: '张三',
  gender: 'male',
  birth: { year: 1990, month: 5, day: 17, hour: 14, minute: 30 },
  longitude: 116.4,
  trueSolarTime: true,
}

describe('renderDetailHTML 的页尾', () => {
  it('普通用户：页尾不再有「编辑此命盘 / 删除此命盘」', () => {
    // §5.4（用户 2026-10-17）：这两个入口与列表卡 ⋯ 菜单里的同名两项重复，
    // 且详细页是「看盘」的地方，不该在盘下面再放一排改数据的按钮。
    const html = renderDetailHTML(chart, { isAdminView: false })
    expect(html).not.toContain('编辑此命盘')
    expect(html).not.toContain('删除此命盘')
    // 顺手钉住「别再偷偷把内联删除挂回来」：整段 HTML 里不该出现 doDelete。
    expect(html).not.toContain('doDelete')
  })

  it('管理员视图：保留「← 返回后台」（那不是数据操作）', () => {
    const html = renderDetailHTML(chart, { isAdminView: true })
    expect(html).toContain('← 返回后台')
    expect(html).not.toContain('删除此命盘')
    expect(html).not.toContain('编辑此命盘')
  })

  it('页尾容器不再为空壳：普通用户的 HTML 里不该留下空的 detail-actions', () => {
    // 空容器会白占一块 `margin:1.2rem 0 0.5rem` 的空白。
    const html = renderDetailHTML(chart, { isAdminView: false })
    expect(html).not.toContain('detail-actions')
  })
})

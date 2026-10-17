import '../shared/authModalStyles.js';
import { AUTH, openAuthModal } from '../shared/auth.js';
// `/charts/`（新建 / 编辑命盘）—— 阶段 3 第 12 页。
// 骨架逐字搬运自 `src/web/charts/index.html`（163 行）第 18-155 行，逻辑在 `./logic.js`。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React（就一层），表单与两个滚轮选择器都是**命令式**的
// ─────────────────────────────────────────────────────────────
// 与 `/mhys/`（§4.10）、`/my-charts/` 同一形态。本文件只做三件事：
//   ① 用 React 渲染老页面骨架（`.charts-wrapper` + `.cal-overlay` 两棵）；
//   ② `flushSync` 把首提交做成**同步**的；
//   ③ 再调一次 `init()`（老文件那层 IIFE 的等价物）。
//
// ★ 骨架为什么用 `dangerouslySetInnerHTML` 而不是 JSX 元素
// ─────────────────────────────────────────────────────────────
// 与 `/mhys/` 同一条理由：这段 HTML 的 `id` / `class` / 结构本身就是契约
// （`logic.js` 里 100+ 处 `getElementById`、两个滚轮 track 的构建、地区 select 的
// 三级联动全靠它）。走 JSX 写元素要逐个把 `for`→`htmlFor`、`checked`→`defaultChecked`
// 等差异重写一遍，等于把「搬运」变成「重写」；而重写的风险是**静默**的
// （少一个 id 就少一个功能，页面照样打开）。
//
// ★ 本页**不需要** `installGlobals()`
// ─────────────────────────────────────────────────────────────
// 老 `index.html` 里一个行内事件都没有（`grep -o 'on[a-z]*="' src/web/charts/index.html`
// 只命中 meta/link 上的属性）。老脚本也从不往 window 挂名字 —— 整页逻辑关在一个
// IIFE 里。所有交互都是 `addEventListener`，搬进 module 之后照样成立。
//
// ★ 为什么必须先 flushSync 再 init()
// ─────────────────────────────────────────────────────────────
// `init()` 的第一段就是 `updateDateDisplay()` → `getElementById('dateInfo')`；
// 后面还立刻构建两个滚轮的 track、填 34 个省的 `<option>`、登记 document 点击。
// 骨架没提交就是 null / 空操作 —— 而且**不报错**（`getElementById` 返回 null 之后
// 那些 `.textContent =` 才抛，抛在 IIFE 里就整页停摆，表单看着在、点了没反应）。
// React 18+ 的 `root.render()` 默认并发、不保证在本行之前提交 → `flushSync`。
// 这是**正确性**需要，不是性能。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { init } from './logic.js'
import './style.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/charts/index.html:18-155`）
// ============================================================
// 两棵：表单那棵 `.charts-wrapper#app`，以及挂在它外面的日期选择底部面板
// `.cal-overlay#calOverlay`（`position:fixed`，见 `page-charts.css:253`，所以
// 多一层 `#root` 不影响它铺满视口）。
const SHELL_HTML = `<div class="charts-wrapper" id="app">
  <header class="charts-header">
    <h1>新建命盘</h1>
  </header>

  <div class="form-card">

    <!-- 姓名 -->
    <div class="form-row">
      <label>姓名</label>
      <input type="text" id="f-name" placeholder="输入姓名" autocomplete="off">
    </div>

    <!-- 出生日期 — 自定义日历选择 -->
    <div class="form-row">
      <label>出生日期</label>
      <div class="date-display" id="dateDisplay">
        <span class="dd-text" id="dateDisplayText"></span>
        <span class="dd-icon">📅</span>
      </div>
      <div class="date-info" id="dateInfo"></div>
    </div>

    <!-- 出生时间 — 滑动选择 -->
    <div class="form-row">
      <label>出生时间</label>
      <div class="time-picker-wrap">
        <div class="time-picker-labels">
          <span class="tp-label">时</span>
          <span class="tp-label">分</span>
        </div>
        <div class="time-picker" id="timePicker">
          <div class="time-col" id="hourCol">
            <div class="time-track" id="hourTrack"></div>
            <div class="time-highlight"></div>
          </div>
          <div class="time-col" id="minCol">
            <div class="time-track" id="minTrack"></div>
            <div class="time-highlight"></div>
          </div>
        </div>
      </div>
      <div class="time-display-bar">
        <span class="td-label">当前选择</span>
        <span class="td-value" id="timeDisplay">—</span>
      </div>
    </div>

    <!-- 性别 -->
    <div class="form-row">
      <label>性别</label>
      <select id="f-gender">
        <option value="male">男</option>
        <option value="female">女</option>
      </select>
    </div>

    <!-- 出生地选择 -->
    <div style="margin-top:0.4rem">
      <div class="form-row">
        <label>出生地</label>

        <!-- 搜索框：一键搜索全国城市及地区 -->
        <div class="place-search-wrap">
          <input type="text" class="place-search" id="placeSearch"
            placeholder="🔍 搜索城市或区县名称，一键填入…"
            autocomplete="off">
          <div class="place-suggestions" id="placeSuggestions"></div>
        </div>

        <!-- 层级选择 -->
        <div class="region-row">
          <select id="f-province">
            <option value="">省份</option>
          </select>
          <select id="f-city" disabled>
            <option value="">城市</option>
          </select>
          <select id="f-district" disabled>
            <option value="">区县</option>
          </select>
        </div>
        <div class="coord-display" id="coordDisplay" style="display:none">
          <span id="coordLat"></span>
          <span id="coordLng"></span>
        </div>
      </div>
    </div>

    <!-- 真太阳时 -->
    <div class="form-row" style="margin-top:0.2rem">
      <div class="solar-toggle">
        <input type="checkbox" id="f-true-solar" checked>
        <label for="f-true-solar">使用真太阳时</label>
      </div>
    </div>

    <button class="btn-submit-chart" id="btn-submit">开始排盘</button>
  </div>

  <footer class="charts-footer">易三千 · 命理排盘系统</footer>
</div>

<!-- 底部弹出日历面板 — 年/月/日三段滚轮 -->
<div class="cal-overlay" id="calOverlay">
  <div class="cal-panel" id="calPanel">
    <div class="cal-panel-header">
      <span class="cal-panel-title">选择日期</span>
    </div>
    <div class="cal-picker-labels">
      <span class="cal-plabel">年</span>
      <span class="cal-plabel">月</span>
      <span class="cal-plabel">日</span>
    </div>
    <div class="cal-picker" id="calPicker">
      <div class="cal-col" id="calColYear">
        <div class="cal-track" id="calTrackYear"></div>
        <div class="cal-highlight"></div>
      </div>
      <div class="cal-col" id="calColMonth">
        <div class="cal-track" id="calTrackMonth"></div>
        <div class="cal-highlight"></div>
      </div>
      <div class="cal-col" id="calColDay">
        <div class="cal-track" id="calTrackDay"></div>
        <div class="cal-highlight"></div>
      </div>
    </div>
    <div class="cal-display-bar">
      <span class="cd-label">当前选择</span>
      <span class="cd-value" id="calValueDisplay">—</span>
    </div>
    <div class="cal-footer">
      <span class="lunar-preview" id="calLunarPreview"></span>
      <button class="confirm-btn" id="calConfirm">确定</button>
    </div>
  </div>
</div>`

function ChartsPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老 `index.html` 的五条 classic script：lunar.min → auth → charts-store →
// china-regions → page-charts。前四条仍在 `index.html` 里原样保留（阶段 4 才搬），
// 第五条换成本文件（module，自带 defer）。真实顺序因此是
//     四条传统 script → 本 module → DOMContentLoaded
// 与老页唯一的差别：老 `page-charts.js` 排在四条之后、且是**同步**执行；
// 新 module 也是排在四条之后（defer），只是执行时机推到解析完成 —— 对这一段
// 逻辑没有区别（它只依赖那四个全局与 DOM，两者此时都已就绪）。
const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<ChartsPage />);
});

// 骨架已在 DOM，这时才敢跑 init()（老文件那层 IIFE 的等价物）。
init();

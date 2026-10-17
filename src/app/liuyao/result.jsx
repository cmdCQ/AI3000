import { refreshAIPanel, aiInlineHost } from '../shared/aiPanel.js';
import { AUTH } from '../shared/auth.js';
import { AI_PANEL_CONF } from '../shared/liuyaoAiPanel.js';
import { savedAnalysis, renderLiuyaoResult } from '../shared/liuyaoRender.js';
import { escHtml } from '../shared/uiCommon.js';
// 六爻结果页（`/liuyao/result.html?id=<记录id>`）—— 阶段 3 第 6 页。
// 骨架逐字搬运自 `src/web/liuyao/result.html`（45 行），逻辑在 `./result.logic.js`。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React（就一层），内容区是**命令式**的
// ─────────────────────────────────────────────────────────────
// 与排盘页同一形态，只是这页更薄。本文件只做三件事：
//   ① 用 React 渲染老页面的静态骨架（`.mh-wrapper` 那一棵，含 `#contentArea`）；
//   ② 用 `flushSync` 把首提交做成**同步**的；
//   ③ 再跑 `load()`（老文件最后一行那句裸调）。
//
// ★ 为什么必须先 flushSync 再 load()
// ─────────────────────────────────────────────────────────────
// 两个理由，任缺一个都会静默坏掉：
//   · `load()` 第一句就是 `document.getElementById('contentArea')` —— 骨架还没提交
//     就拿到 null，随后 `area.innerHTML` 抛 TypeError（这页唯一的「响」的坏法）。
//   · `ai_panel.js` 的 `mountAIPanel()` 在 `document.readyState === 'loading'` 时挂
//     `DOMContentLoaded` 等，否则**立刻** mount；两条路都要 `#contentArea` 已经在
//     DOM 里（AI 宿主 `#aiInlineHost` 插在「结果容器 nextSibling」上，找不到宿主就
//     静默放弃）。React 18+ 的 `root.render()` 默认并发、不保证在本行之前提交，
//     所以这里用 `flushSync`。这是**正确性**需要，不是性能。
//
// ★ 本页没有 `installGlobals()` —— 不是漏了
// ─────────────────────────────────────────────────────────────
// 老 `result.html` 里**一个行内事件都没有**（全 45 行，零个 `onclick`/`oninput`），
// 老脚本也不往 window 挂任何名字。唯一从 HTML 侧被点到的全局是 AI 块里那颗按钮，
// 而它由 `liuyao_ai_panel.js` / `ai_panel.js` 自己提供。所以这页**不需要**
// `installGlobals()`，也不需要 `__liuyaoTestApi`（驱动 ⑨ 全走真 DOM：
// `.ai-start-btn`.click()，不注入任何状态）。多挂一个名字就等于凭空造一个页面 API。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { load } from './result.logic.js'
import './result.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/liuyao/result.html` 第 19-33 行）
// ============================================================
// 老文件页头里有一段 HTML 注释（「页头那颗『试试自动解析』已删」）—— 那是写给
// 源码读者的，不进 DOM 契约，所以只留在下面这段 JS 注释里：
//   页头那颗「试试自动解析」已删（2026-09-25 用户拍板）：这一页的块由 load() 里的
//   `refreshAIPanel()` 摆出来，收起/展开那颗控件长在块的标题栏里。
const SHELL_HTML = `<div class="mh-wrapper">
  <div class="mh-header">
    <a href="/liuyao/" class="mh-back">← 返回排盘</a>
    <h1 class="mh-title">排盘结果</h1>
  </div>

  <div id="contentArea">
    <div class="load-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</div>`

function LiuyaoResultPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老 `result.html` 的六条 classic script 顺序：
//   auth → ui_common → liuyao_render → page-liuyao-result → ai_panel → liuyao_ai_panel
// 新页面里最后那条 `page-liuyao-result.js` 换成本文件（module，自带 defer），
// 于是真实顺序是「五条传统 script → 本 module → DOMContentLoaded」——
// 与老页的差别只有一处：老页的 `load()` 跑在 ai_panel/liuyao_ai_panel **之前**，
// 新页跑在它们**之后**。`load()` 与那两个引擎之间没有共享状态（引擎只碰 body 与
// `#contentArea` 的 nextSibling；`load()` 只写 `#contentArea` 并调 `refreshAIPanel`，
// 而 `refreshAIPanel` 正是引擎提供的）—— 这条只能在真浏览器里证，见报告「没能
// 证实的假设」。`liuyao_ai_panel.js` 提供 `AI_PANEL_CONF` 与 `refreshAIPanel`，
// 所以 `load()` 必须在它之后才可能工作 —— 这个方向是硬要求，而它成立。
const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<LiuyaoResultPage />);
});

// 骨架已在 DOM（`#contentArea` 在），这时才敢跑 load()。
// 老文件最后一行是裸调 `load();`，时序等价：都在页面可交互之前、DOM 已在。
load();

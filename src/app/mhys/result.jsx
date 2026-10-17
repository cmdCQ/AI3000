import '../shared/authModalStyles.js';
import { refreshAIPanel, aiInlineHost } from '../shared/aiPanel.js';
import { AUTH } from '../shared/auth.js';
// 只有下面 `__mhysTestApi.engineState()` 要用的三个读取器；渲染那几件事全在
// `./result.logic.js` 里（它自己 import，不从这里借）。
import { getCurrentRecordId, getSavedAnalysis, getCurrentTopic } from '../shared/mhysRender.js';
// 梅花易数结果页（`/mhys/result.html?id=<记录id>`）—— 阶段 3 第 11 页。
// 骨架逐字搬运自 `src/web/mhys/result.html`（56 行），逻辑在 `./result.logic.js`。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React（就一层），内容区与解卦区都是**命令式**的
// ─────────────────────────────────────────────────────────────
// 与六爻结果页（`src/app/liuyao/result.jsx`）同一形态，本文件只做三件事：
//   ① React 渲染老页面骨架（`.mh-wrapper` 那棵，含 `#contentArea` 与 `#analysisArea`）；
//   ② `flushSync` 把首提交做成**同步**的；
//   ③ 再跑 `load()`（老文件最后一行那句裸调）。
//
// ★ 为什么必须先 flushSync 再 load()
// ─────────────────────────────────────────────────────────────
// 与六爻那边同样两个理由：`load()` 第一句是 `getElementById('contentArea')`；
// `ai_panel.js` 的 `mountAIPanel()` 无论走 DOMContentLoaded 还是立刻 mount，
// 都要 `#contentArea` 已在 DOM（AI 宿主 `#aiInlineHost` 插在「正文容器 nextSibling」上）。
// React 18+ 的 `root.render()` 默认并发、不保证在本行之前提交 → `flushSync`。
// 这是**正确性**需要，不是性能。
//
// ★ `#analysisArea` 是 `#contentArea` 的**兄弟**，不是子节点
// ─────────────────────────────────────────────────────────────
// 老 HTML 第 32-40 行那段注释说得很清楚：宿主插在「正文容器 nextSibling」，
// 所以顺序是 排盘信息 → 起卦结果 → ☯ AI 解读 → 解卦区。
// ⚠ 别把解卦区挪进 `#contentArea`：那样宿主只能排到整个结果之后，AI 块又被压到最底下
//   —— 那正是用户 2026-09-25 报的版面问题。
//
// ★ 本页没有 `installGlobals()` —— 不是漏了
// ─────────────────────────────────────────────────────────────
// 老 `result.html` 全 56 行**零个行内事件**（无 onclick/oninput），老脚本也没往 window
// 挂任何名字。HTML 侧唯一被点到的全局是 AI 块里那颗按钮，由 ai_panel.js 自己提供。
// 所以这页不需要 `installGlobals()`，也不需要 `__mhysTestApi`（判据全走真 DOM）。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { load } from './result.logic.js'
import './result.css'
import { AI_PANEL_CONF } from '../shared/mhysAiPanel.js';
// ★ 把解卦面板的配置挂回 `window`：引擎只认这个全局 —— `src/app/shared/aiPanel.js` 的
//   `AIC()` 读的是 `window.AI_PANEL_CONF || {}`。老 `js/liuyao_ai_panel.js` / `js/mhys_ai_panel.js`
//   是 classic script，文件顶层的 `window.AI_PANEL_CONF = {…}` 一加载就生效；搬成 ESM 后
//   只剩 `export const AI_PANEL_CONF`，如果没人挂回去，引擎就全程用默认配置
//   （`cardType` 空、`payload()` 空，请求体 `{message:'', cardType:'', cardData:null}`），
//   六爻/梅花 ⑧ 的 cardData 判据会红，用户那边是「解读里没有这一卦的内容」。
//   放在这一层而不是 conf 模块内部的原因：谁是「用到面板的页面」由页面自己声明，
//   不搞「import 就有副作用」的隐式约定（那等于两套机制）。
window.AI_PANEL_CONF = AI_PANEL_CONF;

// ============================================================
// 静态骨架（逐字对齐 `src/web/mhys/result.html:17-41`）
// ============================================================
// 老文件页头里有一段 HTML 注释（「页头那颗『试试自动解析』已删」）—— 那是写给源码
// 读者的，不进 DOM 契约，所以只留在下面这段 JS 注释里：
//   页头那颗「试试自动解析」已删（2026-09-25 用户拍板）：这一页的块由 load() 里的
//   `refreshAIPanel()` 摆出来，收起/展开那颗控件长在块的标题栏里。
const SHELL_HTML = `<div class="mh-wrapper">
  <div class="mh-header">
    <a href="/mhys/" class="mh-back">← 返回排盘</a>
    <h1 class="mh-title">排盘结果</h1>
  </div>

  <div id="contentArea">
    <div class="load-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>

  <div class="analysis-card" id="analysisArea" hidden></div>
</div>`

function MhysResultPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老 `result.html` 的七条 classic script 顺序：
//   auth → ui_common → hexagrams_data → mhys_render → page-mhys-result → ai_panel → mhys_ai_panel
// 新页面里第 5 条 `page-mhys-result.js` 换成本文件（module，自带 defer），于是真实
// 顺序是「六条传统 script → 本 module → DOMContentLoaded」—— 与老页唯一的差别是：
// 老页的 `load()` 跑在 ai_panel/mhys_ai_panel **之前**，新页跑在它们**之后**。
// `load()` 与两个引擎之间没有共享状态（引擎只碰 body 与 `#contentArea` 的 nextSibling；
// `load()` 只写 `#contentArea`/`#analysisArea` 并调 `refreshAIPanel`，而后者正是引擎提供的）。
// 这条只能在真浏览器里证 —— 判据里有一条专门盯「AI 块有没有摆出来」。
// ★ 测试原语（与 `src/app/mhys/main.jsx` 的 `__mhysTestApi` 同一形态）：
//   `load()` 会把「这条记录的 id / 存着的解读 / 事项」写进共享模块的状态，而这几个值
//   ESM 之后不再是页面全局 —— 判据（`duipan/drive_mhys_twice.js` ⑦）要验的正是
//   「它们在 `renderResult()` **之后**才挂上」，靠看面板不一定分得清顺序，所以开一个只读出口。
//   移除时机：阶段 5 把 `renderResult()` 里清状态那几行挪进显式的初始化步骤之后。
window.__mhysTestApi = {
  engineState: function () {
    return {
      recId: getCurrentRecordId(),
      saved: !!getSavedAnalysis(),
      topic: getCurrentTopic(),
    };
  },
};

const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<MhysResultPage />);
});

// 骨架已在 DOM（`#contentArea` / `#analysisArea` 都在），这时才敢跑 load()。
// 老文件最后一行是裸调 `load();`，时序等价：都在页面可交互之前、DOM 已在。
load();

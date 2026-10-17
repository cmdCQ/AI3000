import '../shared/authModalStyles.js';
import { AUTH, openAuthModal } from '../shared/auth.js';
// 梅花易数排盘记录页（`/mhys/history.html`）—— 阶段 3 第 8 页。
// 骨架逐字搬运自 `src/web/mhys/history.html`（51 行），逻辑在
// `../lib/recordsHistory.js` + `./history.logic.js`。
// ==========================================================================
//
// 本文件与六爻记录页（`src/app/liuyao/history.jsx`）**结构完全对称**，只有两处不同：
//   · 骨架里的返回链接 `/liuyao/` → `/mhys/`（老 `history.html` 第 21 行）
//   · 逻辑模块换成 `./history.logic.js`（它自己钉的是 `/api/mhys-records` 那一户）
//
// 本文件只做三件事：
//   ① 用 React 渲染老页面的静态骨架（悬浮菜单 + `.mh-wrapper`）；
//   ② 把 `renderCards()` 拼出来的行内 onclick 需要的名字挂成**真 window 全局**；
//   ③ 用 `flushSync` 同步提交骨架，再跑 `loadRecords()`。
//
// ★ 为什么这页有 7 个真全局，而结果页一个都没有
// ─────────────────────────────────────────────────────────────
// 这页的点击全走 HTML 行内属性，一共两种来源：
//   · **骨架里写死的**（老 `history.html` 第 25/29/30/33/35 行）：
//       toggleManage() / onSearch() / clearSearch() / toggleSelectAll() / deleteSelected()
//   · **`renderCards()` 拼字符串时现写的**（`recordsHistory.js` 里那两句
//       `'onclick="toggleCard(\''+r.id+'\')"'` 与 `'onclick="viewRecord(\''+r.id+'\')"'`）：
//       toggleCard / viewRecord
// 这 7 个在 ESM 里都只是模块导出，不是全局。行内属性是**浏览器在点击那一刻**按
// `window[name]` 求值的，所以必须挂真名 —— 挂不上不会抛错，症状是「点了没反应」，
// 控制台只有一行 `toggleManage is not defined`（`oninput` 那个更阴：搜索框看起来
// 能打字，但列表不过滤）。
// `toggleCard` / `viewRecord` 尤其容易漏：它们不在任何 HTML 文件里，只在运行时
// 生成的字符串里出现，grep 老 `.html` 是查不到的。
//
// ⚠ `openAuthModal` **不在**这 7 个之列 —— 它由 `/js/auth.js:183` 定义、`:206` 挂到
//   window，本来就是真全局（未登录那张引导卡里的 `<a onclick="openAuthModal('login')">`
//   用的是它）。这里再挂一次只会让「谁是所有者」变模糊。
//
// ★ 本页没有 `__mhysTestApi` —— 不是漏了
// ─────────────────────────────────────────────────────────────
// 排盘页要那个测试桥，是因为驱动的那三个原语（setTime / setManual / setCoin）在
// 老页里直接改顶层 `var`。记录页没有这回事：驱动全走真 DOM ——
// `#searchInput.value = …` + `dispatchEvent(new Event('input'))`、`#manageBtn`.click()、
// `.record-card`.click()、`window.confirm` 打成 `() => true`。它一个状态都不注入，
// 所以这里也就不需要给它留口子。多留一个 `__…TestApi` 就是凭空造一个页面 API。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import {
  loadRecords,
  toggleManage, onSearch, clearSearch, toggleSelectAll,
  deleteSelected, toggleCard, viewRecord,
} from './history.logic.js'
import './history.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/mhys/history.html` 第 17-46 行）
// ============================================================
// 行内 `onclick` / `oninput` **逐字保留**（含 `id`、`class`、属性顺序）：它们既是
// 页面契约（驱动按 `#manageBtn` / `#searchInput` / `.fm-select-all` 找东西），也是
// 上面那 7 个全局名存在的唯一理由。用 JSX 的 `onClick={…}` 会把它变成 React 合成
// 事件、DOM 上的 `onclick` 属性就消失了 —— 契约跟着没。
//
// 与老 `history.html` 的唯一差别是第 21 行：`href="/liuyao/"` → `href="/mhys/"`。
const SHELL_HTML = `<!-- 悬浮菜单 -->
<div class="float-menu" id="floatMenu">
  <div class="fm-top">
    <div class="fm-left">
      <a href="/mhys/" class="fm-back">← 返回</a>
      <span class="fm-title">排盘记录</span>
    </div>
    <div class="fm-right">
      <button class="fm-btn manage-btn" id="manageBtn" onclick="toggleManage()">管理</button>
    </div>
  </div>
  <div class="fm-search">
    <input type="text" id="searchInput" placeholder="搜索卦例..." oninput="onSearch()">
    <button class="fm-search-clear" id="searchClear" onclick="clearSearch()">✕</button>
  </div>
  <div class="fm-actions" id="fmActions">
    <span class="fm-select-all" onclick="toggleSelectAll()">全选</span>
    <span style="font-size:0.72rem;color:var(--text-dim)" id="selectedCount">已选 0</span>
    <button class="fm-delete-selected" id="deleteSelectedBtn" onclick="deleteSelected()" disabled>删除选中</button>
  </div>
</div>

<div class="mh-wrapper">
  <div id="contentArea">
    <div class="load-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
  </div>
</div>`

function MhysHistoryPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// ============================================================
// 把行内 onclick 要的名字挂到真 window 上
// ============================================================
// ① 骨架里写死的 5 个
// ② `renderCards()` 运行时拼进去的 2 个（不在任何 HTML 文件里）
//
// `expose` 包 try/catch 的理由与六爻页相同：线上若有别的脚本把 `window` 冻住或
// 定义成只读属性，赋值会抛 —— 那种环境本来就坏，不该让整页在装载期直接白屏。
function installGlobals() {
  const expose = (name, value) => {
    try {
      window[name] = value
    } catch (e) {
      // 见上：只读 window 的环境，让页面其余部分继续跑
    }
  }

  expose('toggleManage', toggleManage);
  expose('onSearch', onSearch);
  expose('clearSearch', clearSearch);
  expose('toggleSelectAll', toggleSelectAll);
  expose('deleteSelected', deleteSelected);
  expose('toggleCard', toggleCard);
  expose('viewRecord', viewRecord);
}

// ============================================================
// 装载（顺序就是老页面 `<script>` 的顺序）
// ============================================================
// 老 `history.html` 只有两条 script：`auth.js` → `page-mhys-history.js`（后者末尾
// 裸调 `loadRecords()`）。新页面里第二条换成本文件（module，自带 defer），于是真实
// 顺序是「auth.js（含 `window.AUTH` 与 `window.openAuthModal`）→ 本 module →
// DOMContentLoaded」—— 与老页**完全同序**。
//
// 为什么必须 `flushSync` 再 `loadRecords()`：
//   · `loadRecords()` 第一句是 `getElementById('contentArea')`，骨架没提交就拿到
//     null；后面 `area.innerHTML = …` 抛 TypeError，页面白屏。
//   · `loadRecords()` → `renderCards()` → `toggleManage()` 里还有
//     `document.querySelector('.mh-wrapper')`，同样要求骨架已在 DOM 里。
//   React 18+ 的 `root.render()` 默认并发、不保证在本行之前提交，所以用 `flushSync`。
//
// `installGlobals()` 放在 render 之前：老页的函数在 `loadRecords()` 跑之前就已经是
// 全局（classic script 顶层声明会 hoist），驱动在页面加载完成后的任何时刻点按钮都得
// 能命中 —— 所以全局必须在「能渲染出第一张卡片」之前就位。
installGlobals();

const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<MhysHistoryPage />);
});

// 老文件最后一行是裸调 `loadRecords();`。时序等价：都在骨架已在 DOM 之后、
// 页面可交互之前。
loadRecords();

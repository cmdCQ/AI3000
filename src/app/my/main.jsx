// 「我的」页（`/my/`）—— 阶段 3 第 8 页。
// 骨架逐字搬运自 `src/web/my/index.html`（34 行），逻辑在 `./my.logic.js`。
// ==========================================================================
//
// 本文件只做三件事：
//   ① 用 React 渲染老页面的静态骨架（`.my-wrapper` 与底部导航）；
//   ② 把行内 onclick 需要的三个名字挂成**真 window 全局**；
//   ③ 用 `flushSync` 同步提交骨架，再跑 `loadMain()`。
//
// ★ 为什么必须 `flushSync`
// ─────────────────────────────────────────────────────────────
// `loadMain()` 第一句是 `document.getElementById('myContent')`。React 18+ 的
// `root.render()` 默认并发、不保证在本行之前提交 —— 骨架没进 DOM 就拿到 null，
// 接着 `el.innerHTML = …` 抛 TypeError，整页白屏。与 `/liuyao/history.html` 同一条理由。
//
// ★ 挂哪三个全局，为什么不多挂
// ─────────────────────────────────────────────────────────────
// 老 `page-my.js` 往 window 上挂了 5 个：loadMain / loadTokenUsage / getToken /
// goSettings / doLogout。真正被 **HTML 行内属性** 引用到的只有 3 个：
//   · `onclick="goSettings()"`      ← loadMain 与「加载失败」两处生成的卡片
//   · `onclick="doLogout()"`        ← goSettings 生成的「退出账号」
//   · `onclick="window.loadMain()"` ← goSettings 生成的「← 返回」
// 另外两个不需要：
//   · `loadTokenUsage` 只被 `loadMain` 在模块内调用，HTML 里没有任何地方引用它；
//   · `getToken` 现在由 `../lib/auth.js` 提供，不再是这一页的私有实现。
// 多挂一个全局就是多一个「谁拥有它」说不清的名字 —— 而这类名字恰恰是行内
// onclick 出事时最难查的一类（挂不上不抛错，只表现为「点了没反应」）。
//
// ★ `openAuthModal` 不在这里挂
// ─────────────────────────────────────────────────────────────
// 它由 `/js/auth.js:183` 定义、`:206` 挂到 window，本来就是真全局。本页的
// `index.html` 引了 `auth.js` —— 这正是老页漏掉的那一条（老页游客态的「去登录」
// 「注册」两颗按钮因此是死的，详见 `./my.logic.js` 头注释）。

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { loadMain, goSettings, doLogout } from './my.logic.js'
import './style.css'

// ============================================================
// 静态骨架（逐字对齐 `src/web/my/index.html` 第 17-33 行）
// ============================================================
// 行内 `onclick` 与 `id` / `class` 逐字保留：它们既是页面契约，也是上面那三个
// 全局名存在的唯一理由。用 JSX 的 `onClick={…}` 会把 DOM 上的 `onclick` 属性
// 抹掉 —— 契约跟着没。
const SHELL_HTML = `<div class="my-wrapper">
  <div class="my-header">
    <h1>我的</h1>
    <p class="my-sub">易三千</p>
  </div>

  <div class="my-content" id="myContent">
    <div style="text-align:center;padding:3rem 0;color:#bbb;font-size:0.82rem;">加载中…</div>
  </div>
</div>

<nav class="my-bottom-nav">
  <a class="my-nav-item" href="/">命理与术数</a>
  <a class="my-nav-item" href="/my-charts/">我的命盘</a>
  <span class="my-nav-item active">我的</span>
</nav>`

function MyPage() {
  return <div dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />
}

// `expose` 包 try/catch：线上若有别的脚本把 `window` 冻住或把它定义成只读属性，
// 赋值会抛 —— 那种环境本来就坏，不该让整页在装载期白屏。
function installGlobals() {
  const expose = (name, value) => {
    try {
      window[name] = value
    } catch (e) {
      // 见上
    }
  }

  expose('loadMain', loadMain);
  expose('goSettings', goSettings);
  expose('doLogout', doLogout);
}

// ============================================================
// 装载
// ============================================================
// 老 `index.html` 只有一条 script（`page-my.js`），它末尾裸调 `loadMain()`。
// 新页多了一条 `/js/auth.js`（修死按钮），它是传统 script、先于 module 执行，
// 所以真实顺序是「auth.js（含 window.openAuthModal）→ 本 module → 渲染 → loadMain()」。
//
// `installGlobals()` 放在 render 之前：老页那几个函数在 `page-my.js` 顶层声明，
// classic script 会 hoist，所以「能渲染出第一张卡片」之前它们就已经在 window 上了。
installGlobals();

const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<MyPage />);
});

loadMain();

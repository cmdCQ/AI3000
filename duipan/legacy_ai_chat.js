/**
 * 把老 AI 对话脚本的纯函数「原样」加载出来（给差分脚本与驱页脚本共用一份）。
 * ==========================================================================
 *
 * `src/web/js/page-ai-chat.js` 是 classic script：顶层全是 `function` 声明。用最小
 * DOM 桩在 `node:vm` 里跑一遍，那些函数就挂到沙箱对象上了，直接调。
 *
 * 为什么不各脚本抄一份桩：抄两份就会漂 —— 老脚本哪天多用一个全局，只补了一处，
 * 另一处就变成「悄悄少测一截」。这里只有这一份。
 *
 * 注意：`const TRIGRAMS` 之类是**词法作用域**，不会挂到沙箱上 —— 但卡片渲染器是
 * 词法引用它，所以照样能跑；只有「从外面直接拿 TRIGRAMS」拿不到。
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// ⚠ 指**快照**，不指 src/web —— 搬运完成后老文件已从源码树删掉（它正是被搬走的那个），
//   但它得继续当差分/驱页脚本的**判据**。快照只读，改动它等于把判据换成新实现自己。
//   来源与 sha256 记在 duipan/legacy_ref/page-ai-chat.js 的文件头。
const LEGACY = path.join(__dirname, 'legacy_ref', 'page-ai-chat.js');

// `escHtml` 在**两边**都是用 DOM 转义的（老 `page-ai-chat.js:961` 与新 `hexRender.js:32`
// 逐字相同：`d.textContent = s; return d.innerHTML`）。所以桩不能把 textContent/innerHTML
// 做成互不相干的两个字段 —— 那样 `escHtml` 恒返回 ''，差分就变成「两个空串相等」的橡皮章。
// 这里照真浏览器的契约建模：写 textContent 后读 innerHTML 得到**转义后**的文本。
// ⚠ 真浏览器在这条路径上**不转义引号**（引号在文本节点里无需转义），别"顺手"补上 ——
//   补了就和线上不一致，差分反而失真。
const ESC_TEXT = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\u00a0/g, '&nbsp;');

function makeSandbox() {
  const noop = () => {};
  const mkEl = () => {
    const el = {
      classList: { add: noop, remove: noop, contains: () => false },
      style: {}, appendChild: noop, remove: noop, insertBefore: noop,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener: noop,
      _text: '', _html: '',
      value: '', disabled: false, parentNode: null,
    };
    Object.defineProperty(el, 'textContent', {
      get() { return el._text || el._html.replace(/<[^>]*>/g, ''); },
      set(v) { el._text = String(v); el._html = ESC_TEXT(v); },
      enumerable: true, configurable: true,
    });
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._html; },
      set(v) { el._html = String(v); el._text = ''; },
      enumerable: true, configurable: true,
    });
    return el;
  };
  const document = {
    addEventListener: noop,
    getElementById: () => mkEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => mkEl(),
    body: { style: {}, contains: () => false, appendChild: noop },
    cookie: '',
  };
  const sandbox = {
    document,
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    XMLHttpRequest: function () { return { open: noop, setRequestHeader: noop, send: noop }; },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    location: { href: '', reload: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    AUTH: { isLoggedIn: () => false, getUsername: () => null, getToken: () => null },
    handleApiUnauthorized: () => false,
    openAuthModal: noop,
    CustomEvent: function () {},
    navigator: { userAgent: 'node' },
  };
  sandbox.window = sandbox;
  return sandbox;
}

/**
 * @returns {object} 沙箱全局（`renderMarkdown` / `splitPoints` / `pointsLabel` / …都在上面）
 * @throws 桩不够用时抛 —— 调用方应当把它当「测不出来」（退出 2），不是通过
 */
function loadLegacy() {
  const sb = makeSandbox();
  vm.createContext(sb);
  try {
    vm.runInContext(fs.readFileSync(LEGACY, 'utf8'), sb, { filename: LEGACY });
  } catch (e) {
    const err = new Error(`老脚本在 DOM 桩里没跑起来：${e.message} —— 补 legacy_ai_chat.js 的 makeSandbox()`);
    err.cause = e;
    throw err;
  }
  return sb;
}

/**
 * 把同一份 DOM 桩装进 **Node 真实全局**。
 *
 * 新模块（`src/app/lib/*`）是被 ESM import 进 node 进程的，不是跑在 vm 沙箱里，
 * 所以它们里的 `document` 走的是 `globalThis.document`。像 `escHtml` 这种 DOM 转义
 * 函数两侧共用同一份桩，差分才在比「同一件事」，而不是在比「谁抛得快」。
 */
function installDomGlobals(sb) {
  globalThis.document = sb.document;
  return sb;
}

module.exports = { loadLegacy, LEGACY, ROOT, makeSandbox, installDomGlobals };
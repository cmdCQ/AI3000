/**
 * 最小 DOM 桩 —— **全 harness 只有这一份定义**。
 * ==========================================================================
 *
 * 为什么必须只有一份：差分脚本要把「老 classic script 在 vm 沙箱里跑出来的结果」
 * 与「新 ESM 模块在 Node 真实全局里跑出来的结果」逐字节比。两边必须是
 * **同一个形状、不同的实例**（各自有各自的 document），比出来的差异才有意义。
 * 如果桩被抄成两份，改了一处忘另一处，「两侧输入不同」就会被误读成「实现不同」——
 * 那是差分脚本最大的假绿来源。
 *
 * 历史：2026-10-17 之前这里是两份手抄的副本（`legacy_mhys.js::makeSandbox()` 内联的
 * 一份 + `mhys_dom_stub.mjs` 一份），后者自己的头注释就写着「改这里的形状必须同步改
 * legacy_mhys.js，否则这是本页差分最大的假绿来源」。搬 `/liuyao/` 时抽成本文件，
 * 三处（老沙箱 / 新全局 / 未来的页面）统一 require 它。
 *
 * 两条**契约**（改了必须全 harness 同步，因为老实现的行为依赖它们）：
 *   1. `getElementById` 对同一个 id **必须返回同一个元素** —— 老页面大量
 *      「先取节点、再往上写、后面又取一次」的写法，每次给新对象就等于写进去就丢。
 *      （`honorIds:false` 是**故意的**自检挡位，用来证明差分脚本真能抓到这类故障。）
 *   2. `textContent → innerHTML` 要真的转义 `& < > \u00a0`，且**不转义引号** ——
 *      真浏览器这条路径就不转义引号，补上反而与线上不一致。`innerHTML` 是原样字符串。
 */
'use strict';

/** 与真浏览器 `textContent → innerHTML` 一致的转义（注意：**不转义引号**）。 */
const ESC_TEXT = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\u00a0/g, '&nbsp;');

/**
 * 造一个 `document`。
 * @param {{honorIds?: boolean, richer?: boolean}} [opts]
 *   - `honorIds:false`：自检挡位，`getElementById` 永远返回新元素。
 *   - `richer:true`：给老 classic script 用（多加 `createElement`/`body`/`cookie` 等）。
 *     新 ESM 模块走 `globalThis.document`，用默认那份就够 —— 但**形状必须一致**，
 *     所以两者共用 `mkEl`，只有 document 上那几个附加属性不同。
 */
function makeDocument(opts) {
  const honorIds = !(opts && opts.honorIds === false);
  const noop = () => {};
  const els = new Map();
  const mkEl = (id) => {
    const el = {
      id,
      tagName: 'DIV',
      classList: {
        _s: new Set(),
        add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
        contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      },
      style: {}, children: [], childNodes: [],
      appendChild(c) { if (c) { el.children.push(c); if (c.parentNode !== undefined) c.parentNode = el; } return c; },
      removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
      insertBefore(c) { if (c) el.children.unshift(c); return c; },
      remove: noop,
      addEventListener: noop, removeEventListener: noop,
      setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
      querySelector: () => null, querySelectorAll: () => [],
      focus: noop, blur: noop, click: noop,
      scrollTop: 0, scrollHeight: 0, clientHeight: 0, offsetTop: 0,
      _text: '', _html: '',
      value: '', disabled: false, hidden: false, checked: false,
      parentNode: null, offsetParent: null, firstChild: null,
      contains: () => false,
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
  const byId = (id) => {
    if (!honorIds) return mkEl(id);           // ← 自检挡位：每次都是新元素
    if (!els.has(id)) els.set(id, mkEl(id));
    return els.get(id);
  };

  const document = {
    addEventListener: noop, removeEventListener: noop,
    getElementById: byId,
    querySelector: (sel) => (String(sel).startsWith('#') ? byId(String(sel).slice(1)) : null),
    querySelectorAll: () => [],
    createElement: () => mkEl(null),
    body: mkEl('body'),
    documentElement: mkEl('html'),
    cookie: '',
    _els: els,
  };
  return document;
}

/**
 * 把桩装进 Node 真实全局（新 ESM 模块走 `globalThis.document` / `globalThis.window`）。
 *
 * ⚠ 顺手把 `setInterval` 换成「排进了但永不真跑」的实现：
 *   页面的 `init()` 里有 `setInterval(updateTimeDisplay, 30000)`，真定时器会让 node
 *   进程挂着不退出。**这不改变对拍结果** —— 差分脚本不调 `init()`，只是装载老脚本时
 *   它会执行（快照最后一行 `init();`）。假定时器把「顺带执行的副作用」隔开。
 *
 * @returns {() => void} 还原函数
 */
function installGlobals(document) {
  globalThis.document = document;
  globalThis.window = globalThis;
  const origSetInterval = globalThis.setInterval;
  globalThis.setInterval = function (fn, ms) { return { __fake: true, fn, ms }; };
  globalThis.clearInterval = function () {};
  return function restore() {
    globalThis.setInterval = origSetInterval;
  };
}

/** 按 `{id: value}` / `{id: {checked:true}}` / `{id:{options:[…]}}` 往桩上写值。 */
function applyDomSetup(document, dom) {
  if (!dom) return;
  for (const id of Object.keys(dom)) {
    const spec = dom[id];
    const el = document.getElementById(id);
    if (spec !== null && typeof spec === 'object') {
      if ('value' in spec) el.value = spec.value;
      if ('checked' in spec) el.checked = spec.checked;
      if ('options' in spec) el.options = spec.options;
      if ('textContent' in spec) el.textContent = spec.textContent;
      if ('innerHTML' in spec) el.innerHTML = spec.innerHTML;
    } else {
      el.value = spec;
    }
  }
}

module.exports = { ESC_TEXT, makeDocument, installGlobals, applyDomSetup };

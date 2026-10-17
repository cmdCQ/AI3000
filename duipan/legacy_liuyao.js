/**
 * 把老六爻脚本（`page-liuyao.js`）的**顶层函数**原样加载出来，给差分脚本与驱页脚本共用一份。
 * ==========================================================================
 *
 * 与 `legacy_mhys.js` 同构：`page-liuyao.js` 是 classic script，顶层 48 个 `function`
 * 声明（不是 IIFE），用最小 DOM 桩在 `node:vm` 里跑一遍，那些函数就挂到沙箱对象上。
 *
 * 判据指向 `duipan/legacy_ref/page-liuyao.js`（快照），不指 `src/web/js/page-liuyao.js`：
 * 搬运完成后老文件会从源码树删掉，但它得继续当判据。**改快照 = 把判据换成新实现自己。**
 * 来源提交与 payload sha256 记在快照的文件头。
 *
 * DOM 桩的形状来自 `duipan/dom_stub.js`（全 harness 唯一一份），本文件不复制任何形状。
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ESC_TEXT, makeDocument } = require('./dom_stub.js');

const ROOT = path.join(__dirname, '..');
const LEGACY = path.join(__dirname, 'legacy_ref', 'page-liuyao.js');
const LUNAR = path.join(ROOT, 'src', 'web', 'js', 'lunar.min.js');
// `page-liuyao.js` 引 `liuyao_render.js`（渲染层，定义 `renderLiuyaoResult` 等）。
// 它还没搬（被 `/liuyao/result.html`、`/liuyao/history.html` 共用），直接读源码树。
// **`hexagrams_data.js` 与 `mhys_render.js` 不需要**：`page-liuyao.js` 里 `TRIGRAMS` /
// `HEX64` 只出现在一句注释里（「从前这里有一整份…」）—— 起卦早已交给后端。
// 少灌一个就会 `ReferenceError`（报得很响，不会静默）。
const PREREQS = ['liuyao_render.js']
  .map((f) => path.join(ROOT, 'src', 'web', 'js', f));

/**
 * 最小 DOM 桩（形状定义在 `duipan/dom_stub.js`）。
 * ⚠ `getElementById` 必须对同一 id 返回同一元素 —— 老页面大量「先取节点、再往上写、
 *   后面又取一次」的写法，每次给新对象就等于写进去就丢。
 */
function makeSandbox(opts) {
  const noop = () => {};
  const document = makeDocument(opts);

  const sandbox = {
    document,
    console,
    Date, Math, JSON, String, Number, Boolean, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
    setTimeout, clearTimeout,
    // ⚠ 假定时器：快照最后一行 `init();` 会执行到 `setInterval(updateTimeDisplay, 30000)`，
    //   真定时器让 node 进程挂着不退出。「排进了但永不真跑」不改变对拍结果 ——
    //   差分脚本根本不测 `init()` 里那半段，只是装载时顺带跑了它。
    //   （与 `dom_stub.js::installGlobals()` 是同一个理由。）
    setInterval: function (fn, ms) { return { __fake: true, fn, ms }; },
    clearInterval: noop,
    XMLHttpRequest: function () { return { open: noop, setRequestHeader: noop, send: noop }; },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    location: { href: '', reload: noop, search: '' },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop, clear: noop },
    AUTH: { isLoggedIn: () => false, getUsername: () => null, getToken: () => null },
    handleApiUnauthorized: () => false,
    openAuthModal: noop,
    CustomEvent: function () {},
    // `preloadCoinImages()` 里 `new Image()` 预热六张铜钱图；桩只需要能构造 + 设 src。
    Image: function () { return { src: '', onload: null, onerror: null }; },
    navigator: { userAgent: 'node' },
    alert: noop,
    // `sandbox.window = sandbox`，所以 window 上的这些也得在沙箱本身上。
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: () => true,
    scrollTo: noop,
    innerWidth: 500,
    innerHeight: 844,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

/**
 * @returns {object} 沙箱全局（`triToLines` / `getShichen` / `buildCard` / …都在上面）
 * @throws 桩不够用时抛 —— 调用方应当把它当「测不出来」（退出 2），不是通过
 */
function loadLegacy(opts) {
  const sb = makeSandbox(opts);
  if (!(opts && opts.noLunar)) {
    // 真加载农历库：它是 classic script，跑进同一个沙箱就留下全局 `Lunar`。
    try {
      vm.createContext(sb);
      vm.runInContext(fs.readFileSync(LUNAR, 'utf8'), sb, { filename: LUNAR });
    } catch (e) {
      const err = new Error(`lunar.min.js 在 DOM 桩里没跑起来：${e.message}`);
      err.cause = e;
      throw err;
    }
  } else {
    vm.createContext(sb);
  }
  try {
    if (!(opts && opts.noPrereqs)) {
      for (const f of PREREQS) vm.runInContext(fs.readFileSync(f, 'utf8'), sb, { filename: f });
    }
    vm.runInContext(fs.readFileSync(LEGACY, 'utf8'), sb, { filename: LEGACY });
  } catch (e) {
    const err = new Error(`老脚本在 DOM 桩里没跑起来：${e.message} —— 补 legacy_liuyao.js 的 makeSandbox()`);
    err.cause = e;
    throw err;
  }
  return sb;
}

/** 把同一份 DOM 桩装进 Node 真实全局（新模块是被 ESM import 的，走 globalThis.document）。 */
function installDomGlobals(sb) {
  globalThis.document = sb.document;
  return sb;
}

module.exports = { loadLegacy, LEGACY, LUNAR, ROOT, makeSandbox, installDomGlobals, ESC_TEXT };

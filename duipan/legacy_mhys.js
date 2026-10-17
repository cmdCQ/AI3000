/**
 * 把老梅花脚本（`page-mhys.js`）的**纯函数**原样加载出来，给差分脚本与驱页脚本共用一份。
 * ==========================================================================
 *
 * `page-mhys.js` 是 classic script，顶层全是 `function` 声明（不是 IIFE），所以用最小
 * DOM 桩在 `node:vm` 里跑一遍，那些函数就挂到沙箱对象上了 —— 直接调，不需要撬闭包。
 *
 * 判据指向 `duipan/legacy_ref/page-mhys.js`（快照），不指 `src/web/js/page-mhys.js`：
 * 搬运完成后老文件会从源码树删掉，但它得继续当判据。**改快照 = 把判据换成新实现自己。**
 * 来源提交与 payload sha256 记在快照的文件头。
 *
 * `Lunar` 是真加载 `src/web/js/lunar.min.js` 得到的（不是桩）：`enrichTimeInfo` /
 * `selectedTimeToIso` / `getMaxDay` 这些函数真的会调它，桩一个假的等于少测一截。
 * `lunar.min.js` 不在本次搬运范围内（它被还没搬的页面共用），所以直接读源码树即可。
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ESC_TEXT, makeDocument } = require('./dom_stub.js');

const ROOT = path.join(__dirname, '..');
const LEGACY = path.join(__dirname, 'legacy_ref', 'page-mhys.js');
const LUNAR = path.join(ROOT, 'src', 'web', 'js', 'lunar.min.js');
// `page-mhys.js` 的 `calcGua` 直接用全局 `TRIGRAMS`，而它来自 `hexagrams_data.js`；
// 渲染层 `mhys_render.js` 同理。两个都还没搬（被结果页共用），所以直接读源码树。
// **按老页面 `<script>` 的顺序**灌进去，少一个就会 `ReferenceError`（报得很响，不会静默）。
const PREREQS = ['hexagrams_data.js', 'mhys_render.js']
  .map((f) => path.join(ROOT, 'src', 'web', 'js', f));

/** 与 legacy_ai_chat.js 同一条契约：`textContent → innerHTML` 要真的转义，
 *  且**不转义引号**（真浏览器这条路径就不转义引号，补上反而与线上不一致）。
 *  定义已抽到 `duipan/dom_stub.js` —— 全 harness 只有那一份，别再抄。 */

/**
 * 最小 DOM 桩。
 * ⚠ `getElementById` **必须对同一个 id 返回同一个元素** —— 老页面大量「先取节点、
 *   再往上写、后面又取一次」的写法，每次给新对象就等于写进去就丢。
 *   形状定义在 `duipan/dom_stub.js`（与差分脚本那一侧共用一份）。
 */
function makeSandbox() {
  const noop = () => {};
  const document = makeDocument();

  const sandbox = {
    document,
    console,
    Date, Math, JSON, String, Number, Boolean, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
    setTimeout, clearTimeout, setInterval, clearInterval,
    XMLHttpRequest: function () { return { open: noop, setRequestHeader: noop, send: noop }; },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    location: { href: '', reload: noop, search: '' },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop, clear: noop },
    AUTH: { isLoggedIn: () => false, getUsername: () => null, getToken: () => null },
    handleApiUnauthorized: () => false,
    openAuthModal: noop,
    CustomEvent: function () {},
    navigator: { userAgent: 'node' },
    alert: noop,
    // `sandbox.window = sandbox`，所以 window 上的这些也得在沙箱本身上
    // （老脚本 `page-mhys.js:543` 就挂着 `window.addEventListener('pagehide', …)`）。
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
 * @returns {object} 沙箱全局（`calcGua` / `buildQiguaRequest` / `getShichen` / …都在上面）
 * @throws 桩不够用时抛 —— 调用方应当把它当「测不出来」（退出 2），不是通过
 */
function loadLegacy(opts) {
  const sb = makeSandbox();
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
    const err = new Error(`老脚本在 DOM 桩里没跑起来：${e.message} —— 补 legacy_mhys.js 的 makeSandbox()`);
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

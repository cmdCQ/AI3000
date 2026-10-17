/**
 * 把老「我的命盘」页面（`src/web/js/page-my-charts.js`）**原样**跑起来，供差分脚本取判据。
 * ==========================================================================
 *
 * 这一份和 `legacy_ai_chat.js` 的取法不同，值得说明为什么。
 *
 * 老 AI 对话脚本顶层全是 `function` 声明，扔进 vm 就能把函数捞出来一个个喂输入。
 * 但这一页是 **IIFE**：`(function(){ … })()`，所有渲染函数都在闭包里，外面看不见 ——
 * 而且它一加载就自己决定走哪条路（`?id=` → 详情、`?admin=1&id=` → 后台详情、否则列表）。
 *
 * 硬要把闭包撬开，只能改老文件 —— 那就等于把判据换成新实现自己，是本项目明令禁止的。
 * 所以这里换个取法：**不去够函数，去够结果**。给它一套最小 DOM 桩与固定的接口桩，
 * 让它自己渲染，然后把写进 `#mc-content` 的 innerHTML 原样交出来。
 *
 * 这比「比纯函数」更强，不是更弱：它连「先渲染骨架、再等 fetch、再填进去」这个**顺序**
 * 都比住了。本页最容易错的就是顺序（见 §阶段 2 那条「等待条件不能等还没开始」的教训）。
 *
 * ⚠ 判据是**快照**（`duipan/legacy_ref/page-my-charts.js`），不是 `src/web` ——
 *   搬运完成后老文件会从源码树删掉，但它得继续当判据。快照只读。
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEGACY = path.join(__dirname, 'legacy_ref', 'page-my-charts.js');

// 与 legacy_ai_chat.js 同一条契约：textContent → innerHTML 是**转义**，且不转义引号。
// 本页的 `esc()` 正是 `d.textContent = s; return d.innerHTML`，所以这条必须建模对，
// 否则差分变成「两个空串相等」的橡皮章。
const ESC_TEXT = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\u00a0/g, '&nbsp;');

const noop = () => {};

/**
 * 最小 DOM：`getElementById` 必须**返回同一个元素**（否则渲染写进去就丢了）。
 */
function makeDom() {
  const byId = new Map();
  const mkEl = (id) => {
    const el = {
      id: id || '',
      className: '',
      dataset: {},
      style: {},
      classList: { add: noop, remove: noop, contains: () => false },
      appendChild: noop, remove: noop, insertBefore: noop,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener: noop,
      getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }),
      parentElement: null, parentNode: null,
      _text: '', _html: '',
    };
    Object.defineProperty(el, 'textContent', {
      get() { return el._text; },
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
    getElementById(id) {
      if (!byId.has(id)) byId.set(id, mkEl(id));
      return byId.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => mkEl(''),
    body: { style: {}, contains: () => false, appendChild: noop },
    cookie: '',
  };
  return { document, byId };
}

/**
 * @param {object} opts
 * @param {string}  opts.search         window.location.search（决定走列表还是详情）
 * @param {boolean} opts.isLoggedIn
 * @param {object}  opts.store          ChartsStore 桩：{getAll, get, remove}
 * @param {object}  opts.adminChart     后台详情端点返回的对象（isAdminView 时用）
 * @param {object}  opts.paipan         /api/bazi/paipan 的返回（默认永不 resolve，只比骨架）
 * @returns {{sb: object, dom: object, fetchCalls: Array}}
 */
function makeSandbox(opts) {
  const o = opts || {};
  const { document, byId } = makeDom();
  const fetchCalls = [];
  // 共享模块被调用时扣下来的实参 —— `trueSolarTextOf` 的结果只在这里可见。
  const calls = { baziRender: [], baziAI: [] };

  const sandbox = {
    document,
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    URLSearchParams,
    Date, Math, JSON, String, Number, Array, Object, Error, Promise,
    encodeURIComponent, decodeURIComponent,
    location: { href: '', search: o.search || '', reload: noop },
    localStorage: {
      _m: new Map(Object.entries(o.localStorage || {})),
      getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
      setItem(k, v) { this._m.set(k, String(v)); },
      removeItem(k) { this._m.delete(k); },
    },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    AUTH: {
      isLoggedIn: () => !!o.isLoggedIn,
      getUsername: () => (o.isLoggedIn ? 'alice' : null),
      getToken: () => (o.isLoggedIn ? 'stub-token' : null),
    },
    ChartsStore: o.store || {
      getAll: async () => [], get: async () => null, remove: async () => {},
    },
    // 本页把四柱/大运交给这两个共享模块（本次不搬），差分只比**骨架**与退路，
    // 所以它们只需要「被调用过」这个事实，不需要真渲染。
    // 但 `trueSolarTextOf` 的结果只从这儿能看见（它进了 `meta`，不进骨架），所以要把
    // 传进来的 `meta`/`resp` 扣下来 —— 否则那个纯函数就没判据了。
    BaziRender: {
      render(el, resp, meta, rest) {
        calls.baziRender.push({ resp, meta, targetId: el && el.id, restId: rest && rest.id });
      },
    },
    BaziAI: {
      mount(el, arg) { calls.baziAI.push({ arg, targetId: el && el.id }); },
    },
    openAuthModal: noop,
    confirm: () => true,
    alert: noop,
    event: { stopPropagation: noop },
    navigator: { userAgent: 'node' },
    fetch(url, init) {
      fetchCalls.push({ url, init });
      if (String(url).indexOf('/api/admin/chart-detail/') === 0) {
        if (o.adminChart) {
          return Promise.resolve({ ok: true, status: 200, json: async () => o.adminChart });
        }
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      }
      if (String(url) === '/api/bazi/paipan') {
        // 默认**永不 resolve**：骨架那一次 innerHTML 写在 fetch 之前，
        // 让它挂着，比到的就正好是「顺序正确」的那一份骨架。
        // 传 `paipanFail` 则走退路（`renderDetailFallback`）。
        if (o.paipanFail) {
          return Promise.resolve({
            ok: false, status: o.paipanFail.status || 500,
            json: async () => ({ error: o.paipanFail.error || '排盘失败' }),
          });
        }
        if (o.paipan) {
          return Promise.resolve({
            ok: true, status: 200, json: async () => o.paipan,
          });
        }
        return new Promise(() => {});
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    },
  };
  sandbox.window = sandbox;
  return { sb: sandbox, dom: { byId, document }, fetchCalls, calls };
}

/** 让 async IIFE 里的微任务跑完（列表页要 await ChartsStore.getAll） */
async function settle(times) {
  for (let i = 0; i < (times || 12); i++) await null;
}

/**
 * 用给定输入跑一遍**老实现**，交出它写进 DOM 的 HTML。
 *
 * `html` 是 `#mc-content`（列表/空态/详情骨架都写它）；
 * `els` 是**所有被点到过的元素**（`#baziChart` / `#baziAi` / `#baziRest` / `#baziZodiac` …）——
 * 退路与排盘填充写的是这几个，不在 `#mc-content` 里，所以必须一起交出来。
 *
 * @returns {Promise<{html: string, els: Object<string,string>, sb: object, fetchCalls: Array}>}
 */
async function renderLegacy(opts) {
  const { sb, dom, fetchCalls, calls } = makeSandbox(opts);
  vm.createContext(sb);
  try {
    vm.runInContext(fs.readFileSync(LEGACY, 'utf8'), sb, { filename: LEGACY });
  } catch (e) {
    const err = new Error(`老脚本在 DOM 桩里没跑起来：${e.message} —— 补 legacy_my_charts.js 的 makeSandbox()`);
    err.cause = e;
    throw err;
  }
  await settle(opts && opts.settle);
  const els = {};
  for (const [id, el] of dom.byId) els[id] = el.innerHTML;
  return { html: dom.document.getElementById('mc-content').innerHTML, els, sb, fetchCalls, calls };
}

module.exports = { renderLegacy, makeSandbox, makeDom, settle, LEGACY, ROOT, ESC_TEXT };

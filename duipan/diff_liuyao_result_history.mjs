#!/usr/bin/env node
/**
 * 六爻「结果页 / 记录页」搬迁 · 差分
 * ==========================================================================
 *
 * 用法：
 *   node duipan/diff_liuyao_result_history.mjs             # 对拍 + 逐字比对
 *   node duipan/diff_liuyao_result_history.mjs --verbose   # 另外打印每条通过的用例名
 *
 * 退出码（照 `diff_liuyao.mjs` / `diff_mhys.mjs` 的契约）：
 *   2 = 装载失败（桩、老加载器、新模块、或库全局没搬过来）
 *   1 = 有用例红，或桩自检 / 逐字比对不通过
 *   0 = 全绿
 *
 * 三组判据：
 *   A. `src/app/liuyao/result.logic.js`  ↔ `duipan/legacy_ref/page-liuyao-result.js`   （2 个函数）
 *   B. `src/app/lib/recordsHistory.js`   ↔ `duipan/legacy_ref/page-liuyao-history.js`  （13 个函数）
 *      A/B 的老侧读的是**冻结快照**（sha256 见 §1）—— 活文件 `src/web/js/page-liuyao-*.js`
 *      已随搬迁 `git rm`，再读只会 ENOENT。
 *   C. `src/app/lib/recordsHistory.js`   ↔ `src/web/js/page-mhys-history.js`    （13 个函数）
 *      B 与 C 是**同一份新实现**对两份老实现各比一遍 —— 共享件不是「只对六爻守约」。
 *      两老份之间的差别只有两张常量表与三个 URL；除此之外一个字符都不许差。
 *
 * 另有三条不参与对拍的断言（父要求「超集要被证明，不是被声明」）：
 *   · 六爻那份的 `EMOJI_MAP` / `METHOD_NAMES` 每个键在共享件的表里都查得到、值相同；
 *   · 梅花那份的同理（共享件取的是两份的并集，两份都得是它的子集）；
 *   · 梅花那份在共享件里**确实多出**若干键（否则「并集」是句空话）。
 *
 * ── 这个文件里最容易看错的三件事 ────────────────────────────────────────────
 *
 * ★ 坑①：老沙箱里的**库全局**必须搬进 Node 真实 globalThis。
 *   老侧（vm 沙箱）里 `renderLiuyaoResult` / `escHtml` 是 classic script 留下的
 *   上下文全局；新侧（真 ESM 模块）按裸名读它们，读到的是 **Node 的** globalThis。
 *   不搬 → 老侧有真库、新侧空气，`result.logic.js` 一调就 ReferenceError，
 *   整片用例假红。见 §2 的 `MOVE_GLOBALS` 与它的必需项检查。
 *   （`diff_liuyao.mjs` 头注释记过同一件事：mhys 那次因此假红 21 条。）
 *
 * ★ 坑②：跨 realm 的 `Date`。`load()` 里有 `data.created_at instanceof Date`。
 *   从 Node 造一个 Date 喂进老侧，`instanceof` 用的是 **vm 里那个 Date**，结果是 false；
 *   新侧用的就是 Node 的 Date，结果是 true —— 两侧行为不同，**但那是差分的错**。
 *   所以凡是给 `load()` 喂 Date 的用例，都由 `side.makeDate()` 在**各自 realm 里**造。
 *
 * ★ 坑③：桩的 `document.querySelector` 只认 `#id`，`.mh-wrapper` 恒返回 null，
 *   而 `toggleManage()` 第一件事就是 `document.querySelector('.mh-wrapper')`。
 *   不补就会「两侧都抛同一个 TypeError」—— 用例假绿（比的是同一段崩溃）。
 *   `mkSide()` 给**两侧对称地**补一条类选择器（不动 `dom_stub.js` 的契约）。
 *
 * 桩：`duipan/dom_stub.js`（全 harness 唯一一份）。老脚本的装载：`duipan/legacy_liuyao.js`
 *     的 `loadLegacyScript()`（本页新增的出口，复用同一个 `makeSandbox` / vm 装载方式）。
 *     **本文件不复制任何一份桩的形状。**
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const VERBOSE = process.argv.includes('--verbose');
const SR = (p) => path.join(ROOT, p);

// ─────────────────────────────────────────────────────────────────────────────
// 0. 假定时器
//    `legacy_liuyao.js` 会把**宿主**的 setTimeout 灌进 vm 沙箱；老脚本里有
//    `setTimeout(…, 50)` 之类的续作（记录页与结果页里其实没有，但装载它们的前置
//    `ui_common.js` 里有），真触发时会跨到下一个用例上改状态 → 随机红。
//    必须在 `loadLegacyScript()` **之前**换掉。（这四行照抄 `diff_liuyao.mjs`。）
// ─────────────────────────────────────────────────────────────────────────────
const fakeTimer = function () { return { __fake: true }; };
const fakeClear = function () {};
globalThis.setTimeout = fakeTimer;
globalThis.clearTimeout = fakeClear;
globalThis.setInterval = fakeTimer;
globalThis.clearInterval = fakeClear;

// ─────────────────────────────────────────────────────────────────────────────
// 1. 装载老侧：三份沙箱
//    三份分开装，因为三份老脚本有重名顶层函数（`escHtml` / `formatTime` /
//    `renderCards`…）。装进同一个 context 会互相覆盖，比出来的差异就成了
//    「谁后装」而不是「实现差在哪」。
// ─────────────────────────────────────────────────────────────────────────────
const { makeDocument, installGlobals } = require('./dom_stub.js');
const L = require('./legacy_liuyao.js');

// 判据是**冻结的快照**（`duipan/legacy_ref/`），不是活文件 `src/web/js/`：
// 那三份活文件已经随各页迁完被删掉了；而且判据读活文件 = 判据跟着实现漂。
//   page-liuyao-result.js   115 行  sha256 939ee312ed5dd4c2cb09f2569c79b24457cfcfaafaccfc337eb845a16f79231f
//   page-liuyao-history.js  215 行  sha256 2381473dfc1e231cb35816cc64f8259e428a2ae94db0046ea24f6913726ecc2c
//   page-mhys-history.js    220 行  sha256 1326dbaf4b86c5b688a36e84d8dd553c6142d91ec03b2cac2f65d9d70f41e62a
// **不许改这三个快照** —— 改了就是把判据换成新实现自己。
// 三份都读快照之后，这条判据**不再依赖 `src/web/js/` 里还剩什么**：
// 老树清空到只剩共享层时，它照样能比。
const SRC = {
  result: SR('duipan/legacy_ref/page-liuyao-result.js'),
  liuyaoHist: SR('duipan/legacy_ref/page-liuyao-history.js'),
  mhysHist: SR('duipan/legacy_ref/page-mhys-history.js'),
  uiCommon: SR('src/web/js/ui_common.js'),
  render: SR('src/web/js/liuyao_render.js'),
};

let sbResult, sbHist, sbMhys;
try {
  // 结果页的脚本顺序：auth → ui_common → liuyao_render → page-liuyao-result
  // （auth.js 的 `AUTH` 由桩提供，见 legacy_liuyao.js::makeSandbox）。
  sbResult = L.loadLegacyScript(SRC.result, { prereqs: [SRC.uiCommon, SRC.render] });
  // 两张记录页的脚本只有 auth.js（没有 ui_common.js）—— `escHtml` 是它们自己定义的。
  sbHist = L.loadLegacyScript(SRC.liuyaoHist, { noLunar: true });
  sbMhys = L.loadLegacyScript(SRC.mhysHist, { noLunar: true });
} catch (e) {
  console.error('装载失败：老脚本装不进 DOM 桩 —— ' + ((e && e.stack) || e));
  process.exit(2);
}
const SANDBOXES = [sbResult, sbHist, sbMhys];

// 新侧要 `globalThis.window`（`load()` 里 `window.location.search`；`viewRecord` 里
// `window.location.href = …`）。`installGlobals()` 顺手把 setInterval 也换成假的，
// 与刚才那四行同向。doc 用一次性的：每个用例两侧各 `makeDocument()` 一份新的。
installGlobals(makeDocument());

// ─────────────────────────────────────────────────────────────────────────────
// 2. ★ 坑①：把库全局搬进 Node 真实 globalThis
//    只搬**白名单**：不遍历沙箱全部属性，免得把 `Math`/`Date`/`Array` 换成 vm
//    contextify 过的另一份（那会让 `side.makeDate()` 那套跨 realm 处理失效）。
// ─────────────────────────────────────────────────────────────────────────────
const MOVE_GLOBALS = ['renderLiuyaoResult', 'buildLiuyaoAiPayload', 'escHtml'];
const REQUIRED_GLOBALS = ['renderLiuyaoResult', 'escHtml'];
for (const k of MOVE_GLOBALS) {
  if (!(k in sbResult)) {
    if (REQUIRED_GLOBALS.includes(k)) {
      console.error('装载失败：老沙箱里没有 `' + k + '` —— 库全局没搬过来，'
        + '`result.logic.js` 按裸名读它会 ReferenceError（会变成一片假红）。');
      process.exit(2);
    }
    continue;
  }
  globalThis[k] = sbResult[k];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 装载新侧
// ─────────────────────────────────────────────────────────────────────────────
let resultLogic, historyLogic, lib;
try {
  resultLogic = await import('../src/app/liuyao/result.logic.js');
  historyLogic = await import('../src/app/liuyao/history.logic.js');
  lib = await import('../src/app/lib/recordsHistory.js');
} catch (e) {
  console.error('装载失败：import 新模块抛错 —— ' + ((e && e.stack) || e));
  process.exit(2);
}
for (const [name, mod, fns] of [
  ['src/app/liuyao/result.logic.js', resultLogic, ['cardFromResult', 'load']],
  ['src/app/lib/recordsHistory.js', lib, ['createRecordsHistory', 'EMOJI_MAP', 'METHOD_NAMES']],
  // 注意：`history.logic.js` **不导出** `state`（页面无人读它，见那份文件里的注释），
  // 所以这里也不要求 —— 适配层只经 `lib.createRecordsHistory()` 自己造实例观察状态。
  ['src/app/liuyao/history.logic.js', historyLogic, ['CONFIG', 'loadRecords', 'toggleManage', 'viewRecord']],
]) {
  for (const f of fns) {
    if (!(f in mod)) {
      console.error('装载失败：`' + name + '` 没有导出 `' + f + '`。');
      process.exit(2);
    }
  }
}

// 两份配置。梅花的三个 URL 不是抄的：下面 §6 有断言证明它们确实是老脚本里的字面量。
const CONFIG = {
  liuyao: { listUrl: '/api/liuyao-records', detailsUrl: '/liuyao/result.html?id=', homeUrl: '/liuyao/' },
  mhys: { listUrl: '/api/mhys-records', detailsUrl: '/mhys/result.html?id=', homeUrl: '/mhys/' },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. 两侧对称的执行环境
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_KEYS = ['location', 'localStorage', 'AUTH', 'confirm', 'alert', 'fetch',
  'refreshAIPanel', 'openAuthModal'];

const HIST_FNS = ['formatTime', 'escHtml', 'toggleManage', 'toggleSelectAll', 'updateSelectedCount',
  'onSearch', 'clearSearch', 'getFilteredRecords', 'renderCards', 'toggleCard',
  'deleteSelected', 'viewRecord', 'loadRecords'];

/** 老沙箱的记录页 API：`state.*` 直通沙箱的三个顶层 `var`（老脚本是按名字赋值的）。 */
function legacyHistApi(sb) {
  const api = {
    state: {
      get allRecords() { return sb.allRecords; },
      set allRecords(v) { sb.allRecords = v; },
      get manageMode() { return sb.manageMode; },
      set manageMode(v) { sb.manageMode = v; },
      get selectedIds() { return sb.selectedIds; },
      set selectedIds(v) { sb.selectedIds = v; },
    },
    reset() { sb.allRecords = []; sb.manageMode = false; sb.selectedIds = {}; },
    sb,
  };
  for (const f of HIST_FNS) api[f] = (...a) => sb[f](...a);
  return api;
}

/** 新模块的记录页 API：形状与上面一样，这边直通实例自己的 `state`。 */
function newHistApi(inst) {
  const api = {
    state: inst.state,
    reset() { inst.state.allRecords = []; inst.state.manageMode = false; inst.state.selectedIds = {}; },
  };
  for (const f of HIST_FNS) api[f] = (...a) => inst[f](...a);
  return api;
}

function mkSide(kind) {
  const doc = makeDocument();

  // ★ 坑③：dom_stub 的 querySelector 只认 '#id'。给两侧**对称**补一条类选择器，
  //   否则 `toggleManage()` 在两侧都抛同一个 TypeError —— 用例会比「同一段崩溃」而假绿。
  const wrapper = doc.createElement('div');
  wrapper.classList.add('mh-wrapper');
  const origQS = doc.querySelector;
  doc.querySelector = (sel) => (sel === '.mh-wrapper' ? wrapper : origQS(sel));

  const calls = { fetch: [], alerts: [], confirm: [], refresh: 0 };
  const flags = { loggedIn: false, token: null, confirm: false };
  const responder = { fn: null };
  const store = new Map();

  const g = {
    // 老侧 `sb.location` 与新侧 `globalThis.location` 指向**同一个**对象，
    // 所以 `viewRecord()` 改的 href 两边都能读到（观察值就是它）。
    location: { href: 'http://test/', search: '', reload() {} },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    },
    AUTH: {
      isLoggedIn: () => flags.loggedIn,
      getUsername: () => null,
      getToken: () => flags.token,
    },
    confirm: (msg) => { calls.confirm.push(String(msg)); return flags.confirm; },
    alert: (m) => { calls.alerts.push(String(m)); },
    refreshAIPanel: () => { calls.refresh++; },
    openAuthModal: () => {},
    fetch: async (url, init) => {
      calls.fetch.push({
        url: String(url),
        method: (init && init.method) || 'GET',
        headers: (init && init.headers) || {},
        body: init && 'body' in init ? init.body : null,
      });
      if (!responder.fn) throw new Error('差分用例没有准备 fetch 应答：' + url);
      return responder.fn(String(url), init || {});
    },
  };

  // 结果页的渲染层把状态写进**沙箱**的模块级变量（它是 vm 里的函数，
  // 写不到 Node globalThis 的副本上）。所以观察值一律从 `sbResult` 读。
  sbResult.currentRecordId = null;
  sbResult.currentTopic = null;
  sbResult.currentGender = null;
  sbResult.currentResultMeta = null;
  sbResult.savedAnalysis = '';

  const side = {
    kind, doc, g, calls, flags, responder, wrapper,
    resetMeta() {
      sbResult.currentRecordId = null;
      sbResult.currentTopic = null;
      sbResult.currentGender = null;
      sbResult.currentResultMeta = null;
      sbResult.savedAnalysis = '';
    },
    meta() {
      return {
        recordId: sbResult.currentRecordId,
        savedAnalysis: sbResult.savedAnalysis,
        meta: sbResult.currentResultMeta,
        topic: sbResult.currentTopic,
        gender: sbResult.currentGender,
      };
    },
    /** ★ 坑②：在各自的 realm 里造 Date。 */
    makeDate(iso) {
      return kind === 'old'
        ? vm.runInContext('new Date(' + JSON.stringify(iso) + ')', sbResult)
        : new Date(iso);
    },
    /** 临时把一个全局拿走（测 `typeof refreshAIPanel === 'function'` 那一类守卫）。 */
    drop(name) {
      for (const sb of SANDBOXES) delete sb[name];
      delete globalThis[name];
    },
  };

  if (kind === 'old') {
    side.result = { cardFromResult: (r) => sbResult.cardFromResult(r), load: () => sbResult.load() };
    side.hist = legacyHistApi(sbHist);
    side.mhys = legacyHistApi(sbMhys);
  } else {
    side.result = { cardFromResult: resultLogic.cardFromResult, load: resultLogic.load };
    side.hist = newHistApi(lib.createRecordsHistory(CONFIG.liuyao));
    side.mhys = newHistApi(lib.createRecordsHistory(CONFIG.mhys));
  }
  return side;
}

/**
 * 把这一侧的全局装进三个沙箱与 Node 真实 globalThis。
 * 三个沙箱都设 `document`：搬到 globalThis 的 `escHtml` / `renderLiuyaoResult`
 * 是 vm 里的函数，它们读的是**自己 context** 的 `document`。
 */
function applySide(side) {
  for (const sb of SANDBOXES) {
    sb.document = side.doc;
    for (const k of GLOBAL_KEYS) sb[k] = side.g[k];
  }
  globalThis.document = side.doc;
  for (const k of GLOBAL_KEYS) globalThis[k] = side.g[k];
}

// ── 断言与比较的小工具 ──────────────────────────────────────────────────────
const selfChecks = [];
function selfCheck(name, fn) { selfChecks.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function resp(ok, status, body) {
  return { ok, status, json: async () => body };
}

async function safe(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, value: { __threw: (e && e.message) || String(e) } };
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

function firstDiffPath(a, b, p = '') {
  if (Object.is(a, b)) return p || '(同一个值)';
  if (typeof a !== typeof b) return p + ' (类型 ' + typeof a + ' vs ' + typeof b + ')';
  if (a === null || b === null || typeof a !== 'object') return p || '(值不同)';
  if (Array.isArray(a) !== Array.isArray(b)) return p + ' (数组 vs 对象)';
  if (Array.isArray(a)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = firstDiffPath(a[i], b[i], p + '[' + i + ']');
      if (d) return d;
    }
    return p || '(数组不同)';
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDiffPath(a[k], b[k], p ? p + '.' + k : k);
    if (d) return d;
  }
  return p || '(对象不同)';
}

function show(v, max) {
  max = max || 420;
  let s;
  try {
    s = typeof v === 'string' ? v : JSON.stringify(v);
  } catch (e) {
    s = String(v);
  }
  s = String(s);
  return s.length > max ? s.slice(0, max) + '…(共 ' + s.length + ' 字符)' : s;
}

function d(s) { return s.document; }

// ── 观察值 ──────────────────────────────────────────────────────────────────
function snapHist(side, api) {
  const doc = side.doc;
  return {
    content: d(doc).getElementById('contentArea').innerHTML,
    count: doc.getElementById('selectedCount').textContent,
    deleteDisabled: doc.getElementById('deleteSelectedBtn').disabled,
    manageText: doc.getElementById('manageBtn').textContent,
    manageActive: doc.getElementById('manageBtn').classList.contains('active'),
    actionsShow: doc.getElementById('fmActions').classList.contains('show'),
    wrapperManage: side.wrapper.classList.contains('manage-mode'),
    searchValue: doc.getElementById('searchInput').value,
    clearVisible: doc.getElementById('searchClear').classList.contains('visible'),
    href: side.g.location.href,
    selected: Object.keys(api.state.selectedIds).sort(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 用例
// ─────────────────────────────────────────────────────────────────────────────
const cases = [];
function add(section, name, body) { cases.push({ section, name, body }); }

/** 同一条用例在「六爻那份」与「梅花那份」上各跑一遍。 */
function histCase(section, name, body) {
  add('liuyao/' + section, name, (side) => body(side, side.hist, 'liuyao'));
  add('mhys/' + section, name, (side) => body(side, side.mhys, 'mhys'));
}

// ── 5.1 结果页：cardFromResult ──────────────────────────────────────────────
const NEW_SHAPE_RESULT = () => ({
  topic: '新形状', gender: 'female', method: 'number',
  divinationTime: '2026-09-24 19:49', createdAt: '2026-09-24T11:49:00.000Z',
  recordTime: '', lunarInfo: { yearGZ: '丙午' },
  hexagrams: { gender: 'female', isProxy: true, benGua: { upper: 1, lower: 2 }, bianGua: { upper: 3, lower: 4 } },
});

add('cardFromResult', '新形状：hexagrams 原样透传', (side) => side.result.cardFromResult(NEW_SHAPE_RESULT()));

add('cardFromResult', '老形状（gua.benGua / gua.bianGua）折成端点要的 cardData', (side) =>
  side.result.cardFromResult({
    gender: 'male',
    gua: { isProxy: true, benGua: { name: '艮为山', upper: 7, lower: 7 }, bianGua: { name: '火风鼎', upper: 3, lower: 5 } },
    divinationTime: '2026-09-24 19:49:00',
    lunarInfo: { yearGZ: '丙午' },
  }));

add('cardFromResult', '老形状无变卦（缺上下卦号）→ 变卦回落本卦', (side) =>
  side.result.cardFromResult({
    topic: '无动爻', gua: { benGua: { upper: 7, lower: 7 }, bianGua: { name: '艮为山' } },
  }));

add('cardFromResult', '老形状缺 gender → male；isProxy 缺 → false', (side) =>
  side.result.cardFromResult({ gua: { benGua: { upper: 1, lower: 3 } } }));

add('cardFromResult', '老形状缺 benGua.upper → null（这条记录没法装卦）', (side) =>
  side.result.cardFromResult({ gua: { benGua: { lower: 3 }, bianGua: {} } }));

add('cardFromResult', '老形状 gua 整个缺 → null', (side) =>
  side.result.cardFromResult({ topic: '只有事项' }));

add('cardFromResult', '新形状 hexagrams 缺 gender、result 缺 topic → 兜底 male / 空串', (side) =>
  side.result.cardFromResult({ hexagrams: { benGua: { upper: 5, lower: 6 } } }));

add('cardFromResult', 'result 是 null → 抛（老代码直接读 result.hexagrams）', (side) => {
  try {
    side.result.cardFromResult(null);
    return { threw: false };
  } catch (e) {
    return { threw: true };
  }
});

// ── 5.2 结果页：load ────────────────────────────────────────────────────────
let REF = null, REF_NOTE = '';
try {
  const promptLib = require(path.join(ROOT, 'src/server/paipan/prompt.js'));
  const LYsrv = require(path.join(ROOT, 'src/server/paipan/liuyao.js'));
  const refCard = {
    topic: '我能不能和我喜欢的女生在一起',
    divinationTime: '2026-09-24 19:49:00',
    method: '手动指定',
    lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
    hexagrams: { benGua: { upper: 7, lower: 7 }, bianGua: { upper: 3, lower: 5 } },
  };
  const built = promptLib.liuyaoChartFromCard(refCard, refCard.topic);
  if (built && built.chart) {
    REF = { chart: built.chart, display: LYsrv.displayMeta(refCard, built.chart) };
  } else {
    REF_NOTE = '桩卦装不出来（promptLib.liuyaoChartFromCard 没给 chart）';
  }
} catch (e) {
  REF_NOTE = '桩卦装载抛错：' + ((e && e.message) || e);
}
/** 渲染层可能往 chart/display 上补字段 → 每侧各一份，避免「上一侧写脏」。 */
const cloneRef = () => JSON.parse(JSON.stringify(REF));

const RESULT_DATA_NEW = {
  topic: '结果里的事项', gender: 'male', method: 'coin',
  divinationTime: '2026-09-24 19:49:00', createdAt: '2026-09-24T11:49:00.000Z',
  lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
  hexagrams: { gender: 'male', benGua: { upper: 7, lower: 7 }, bianGua: { upper: 3, lower: 5 } },
};
const RESULT_DATA_OLD = {
  divinationTime: '2026-09-24 19:49:00',
  lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
  gua: { benGua: { name: '艮为山', upper: 7, lower: 7 }, bianGua: { name: '火风鼎', upper: 3, lower: 5 } },
};

/** 结果页的两个端点。spec 里每个值都可以是函数（每侧一份新的）。 */
function resultRoutes(spec) {
  const val = (v) => (typeof v === 'function' ? v() : v);
  return (url, init) => {
    const method = init.method || 'GET';
    if (method === 'GET' && /^\/api\/liuyao-records\/[^/]+$/.test(url)) {
      if (spec.getThrows) throw new Error('网络断了');
      return resp(spec.getOk !== false, spec.getStatus || 200, val(spec.getBody));
    }
    if (url === '/api/liuyao/paipan' && method === 'POST') {
      if (spec.paipanThrows) throw new Error('网络断了');
      return resp(spec.paipanOk !== false, spec.paipanStatus || 200, val(spec.paipanBody));
    }
    throw new Error('差分用例没有为这个 URL 准备应答：' + method + ' ' + url);
  };
}

async function runLoad(side, spec) {
  side.g.location.search = spec.search || '';
  if (spec.storage) for (const k of Object.keys(spec.storage)) side.g.localStorage.setItem(k, spec.storage[k]);
  if (spec.token) side.flags.token = spec.token;
  side.responder.fn = spec.routes;
  if (spec.noRefresh) side.drop('refreshAIPanel');
  side.resetMeta();
  await side.result.load();
  return {
    content: side.doc.getElementById('contentArea').innerHTML,
    fetch: side.calls.fetch,
    refresh: side.calls.refresh,
    meta: side.meta(),
  };
}

add('load', '没有 id → 「没有排盘记录」+ 返回排盘，一个请求都不发', (side) =>
  runLoad(side, { search: '' }));

add('load', 'id 是空串 → 同上', (side) =>
  runLoad(side, { search: '?id=' }));

if (REF) {
  add('load', '新形状记录：GET → 装卦 → 渲染，并把 recordId / savedAnalysis 交给渲染层', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({
          topic: '记录里的事项（后端更权威）',
          created_at: '2026-09-24T11:49:00.000Z',
          ai_analysis: '上一轮的解读正文',
          result_data: JSON.stringify(RESULT_DATA_NEW),
        }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', '老形状记录（result_data 是对象、gua.benGua 折卦）：装卦请求体是折出来的 cardData', (side) =>
    runLoad(side, {
      search: '?id=7',
      routes: resultRoutes({
        getBody: () => ({ topic: '老记录一卦', result_data: RESULT_DATA_OLD, ai_analysis: '' }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', 'result_data 是 JSON 字符串才 parse（字符串形状走同一条路）', (side) =>
    runLoad(side, {
      search: '?id=88',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_OLD) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', 'created_at 缺失 → createdAt 回落 result.createdAt', (side) =>
    runLoad(side, {
      search: '?id=501',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', '★ 坑②：created_at 是 Date 对象 → toISOString 分支', (side) =>
    runLoad(side, {
      search: '?id=502',
      routes: resultRoutes({
        getBody: () => ({ created_at: side.makeDate('2026-03-04T05:06:07.000Z'), result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', '★ admin=1 取的是 localStorage 的 sqw_admin_token（不是 AUTH.getToken）', (side) =>
    runLoad(side, {
      search: '?id=999&admin=1',
      storage: { sqw_admin_token: 'ADMIN-T' },
      token: 'USER-T',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', 'admin=1 但 localStorage 没 token → 不带 Authorization', (side) =>
    runLoad(side, {
      search: '?id=999&admin=1',
      token: 'USER-T',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', 'admin≠1 → 用 AUTH.getToken()', (side) =>
    runLoad(side, {
      search: '?id=999&admin=0',
      storage: { sqw_admin_token: 'ADMIN-T' },
      token: 'USER-T',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', '没登录 → 不带 Authorization', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));

  add('load', '装卦 OK 但没有 chart → 「装卦失败：HTTP 200」', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => ({}),
      }),
    }));

  add('load', '装卦失败带后端 error → 走 escHtml 转义进文案', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanOk: false, paipanStatus: 500,
        paipanBody: () => ({ error: '桩卦装不出来 <b>甲 & 乙</b>' }),
      }),
    }));

  add('load', '装卦 HTTP 500 且没有 error 字段 → 「装卦失败：HTTP 500」', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanOk: false, paipanStatus: 500, paipanBody: () => ({}),
      }),
    }));

  add('load', '装卦请求抛错 → 「装卦请求失败，请检查网络后重试」', (side) =>
    runLoad(side, {
      search: '?id=999',
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanThrows: true,
      }),
    }));

  add('load', '`refreshAIPanel` 不在时也不炸（守卫分支）', (side) =>
    runLoad(side, {
      search: '?id=999',
      noRefresh: true,
      routes: resultRoutes({
        getBody: () => ({ result_data: JSON.stringify(RESULT_DATA_NEW) }),
        paipanBody: () => cloneRef(),
      }),
    }));
} else {
  console.log('⚠ load 的「装卦成功」一组已跳过：' + REF_NOTE + '\n');
}

add('load', '记录不存在（404）→ 「排盘记录不存在或已删除」', (side) =>
  runLoad(side, {
    search: '?id=404',
    routes: resultRoutes({ getOk: false, getStatus: 404 }),
  }));

add('load', 'GET 抛错 → 「加载失败，请重试」', (side) =>
  runLoad(side, { search: '?id=500', routes: resultRoutes({ getThrows: true }) }));

add('load', 'result_data 是 null → 「这条记录里没有排盘数据」', (side) =>
  runLoad(side, {
    search: '?id=600',
    routes: resultRoutes({ getBody: () => ({ topic: '有事项没盘', result_data: null }) }),
  }));

add('load', 'result_data 不是合法 JSON → 被同一个 catch 兜住 → 「加载失败，请重试」', (side) =>
  runLoad(side, {
    search: '?id=601',
    routes: resultRoutes({ getBody: () => ({ result_data: '{不是 JSON' }) }),
  }));

add('load', '老记录缺卦号 → 「这条记录里没有卦（老记录缺卦号）」', (side) =>
  runLoad(side, {
    search: '?id=602',
    routes: resultRoutes({ getBody: () => ({ result_data: { gua: { benGua: {} } } }) }),
  }));

// ── 5.3 记录页：formatTime ──────────────────────────────────────────────────
histCase('formatTime', '本地时间串 → YYYY-MM-DD HH:MM', (side, a) => a.formatTime('2026-09-21T15:30:00'));
histCase('formatTime', '月/日/时/分都补零', (side, a) => a.formatTime(new Date(2026, 0, 2, 3, 4, 5).getTime()));
histCase('formatTime', '时间戳', (side, a) => a.formatTime(1790000000000));
histCase('formatTime', '非法串（NaN 也照样拼出来，不特殊处理）', (side, a) => a.formatTime('not-a-date'));
histCase('formatTime', 'null → 1970', (side, a) => a.formatTime(null));

// ── 5.4 记录页：escHtml ────────────────────────────────────────────────────
histCase('escHtml', '转义 & < >，不转义引号', (side, a) => a.escHtml('<b class="x">甲 & 乙</b> "q" \'a\''));
histCase('escHtml', '空串 → 空串', (side, a) => a.escHtml(''));
histCase('escHtml', 'null → 走 textContent 变字符串 "null"', (side, a) => a.escHtml(null));

// ── 5.5 记录页：toggleManage ───────────────────────────────────────────────
const RECORDS = [
  { id: '103', method: 'coin', topic: '晚上这一卦', recordTime: '2026-09-22T21:10:00' },
  { id: '101', method: 'time', topic: '早上这一卦', recordTime: '2026-09-20T08:00:00' },
  { id: '102', method: 'manual', topic: '下午要问的事', recordTime: '2026-09-21T15:30:00' },
];
function seed(a, records) {
  a.reset();
  a.state.allRecords = (records || RECORDS).map((r) => Object.assign({}, r));
}

histCase('toggleManage', '进入管理模式：文案「完成」、操作条 show、卡片长复选框', (side, a) => {
  seed(a); a.renderCards(a.state.allRecords);
  a.toggleManage();
  return snapHist(side, a);
});

histCase('toggleManage', '进入再退出：文案复原、勾选清零、搜索词被清掉', (side, a) => {
  seed(a);
  side.doc.getElementById('searchInput').value = '下午';
  side.doc.getElementById('searchClear').classList.add('visible');
  a.renderCards(a.state.allRecords);
  a.toggleManage();
  a.state.selectedIds['102'] = true;
  a.updateSelectedCount();
  const mid = snapHist(side, a);
  a.toggleManage();
  return { mid: mid.count, after: snapHist(side, a) };
});

// ── 5.6 记录页：toggleSelectAll ────────────────────────────────────────────
histCase('toggleSelectAll', '三条全选 → 已选 3、删除可用', (side, a) => {
  seed(a); a.renderCards(a.state.allRecords);
  a.state.manageMode = true;
  a.toggleSelectAll();
  return snapHist(side, a);
});

histCase('toggleSelectAll', '再点一次 → 全取消、删除禁用', (side, a) => {
  seed(a); a.state.manageMode = true; a.renderCards(a.state.allRecords);
  a.toggleSelectAll();
  a.toggleSelectAll();
  return snapHist(side, a);
});

histCase('toggleSelectAll', '有搜索词时只动过滤后的（「下午」→ 1 条）', (side, a) => {
  seed(a); a.state.manageMode = true;
  side.doc.getElementById('searchInput').value = '下午';
  a.renderCards(a.state.allRecords);
  a.toggleSelectAll();
  return snapHist(side, a);
});

// ── 5.7 记录页：updateSelectedCount ────────────────────────────────────────
histCase('updateSelectedCount', '两个勾 → 「已选 2」、按钮可用', (side, a) => {
  seed(a); a.state.selectedIds = { 101: true, 102: true };
  a.updateSelectedCount();
  return snapHist(side, a);
});

histCase('updateSelectedCount', '零个勾 → 「已选 0」、按钮禁用', (side, a) => {
  seed(a); a.state.selectedIds = {};
  a.updateSelectedCount();
  return snapHist(side, a);
});

// ── 5.8 记录页：onSearch / clearSearch / getFilteredRecords ────────────────
histCase('onSearch', '搜「下午」→ 1 张卡 + 清除按钮变 visible', (side, a) => {
  seed(a); side.doc.getElementById('searchInput').value = '下午';
  a.onSearch();
  return snapHist(side, a);
});

histCase('onSearch', '搜空白（只有空格）→ 3 张卡 + 清除按钮不 visible', (side, a) => {
  seed(a); side.doc.getElementById('searchInput').value = '   ';
  a.onSearch();
  return snapHist(side, a);
});

histCase('clearSearch', '清除搜索 → 值清空、3 张卡都回来', (side, a) => {
  seed(a); side.doc.getElementById('searchInput').value = '下午';
  a.onSearch();
  a.clearSearch();
  return snapHist(side, a);
});

histCase('getFilteredRecords', '无搜索词 → 原数组本身（不是拷贝）', (side, a) => {
  seed(a);
  const got = a.getFilteredRecords();
  return { ids: got.map((r) => r.id), sameRef: got === a.state.allRecords };
});

histCase('getFilteredRecords', '按事项过滤，大小写不敏感', (side, a) => {
  seed(a, [{ id: '1', topic: 'ABC 大写' }, { id: '2', topic: 'abc 小写' }, { id: '3', topic: '别的' }]);
  side.doc.getElementById('searchInput').value = 'AbC';
  return a.getFilteredRecords().map((r) => r.id);
});

// ── 5.9 记录页：renderCards ────────────────────────────────────────────────
histCase('renderCards', '三条记录（非管理）：emoji / 方法名 / 时间 / viewRecord 内联', (side, a) => {
  seed(a); a.renderCards(a.state.allRecords);
  return snapHist(side, a);
});

histCase('renderCards', '空列表 + 无搜索词 → 「暂无排盘记录」', (side, a) => {
  seed(a, []); a.renderCards([]);
  return snapHist(side, a);
});

histCase('renderCards', '空列表 + 有搜索词 → 「没有匹配的卦例」', (side, a) => {
  seed(a, []); side.doc.getElementById('searchInput').value = '不存在的卦';
  a.renderCards([]);
  return snapHist(side, a);
});

histCase('renderCards', '管理模式：带复选框、带 selected、没有 › 箭头、onclick 是 toggleCard', (side, a) => {
  seed(a); a.state.manageMode = true; a.state.selectedIds = { 101: true };
  a.renderCards(a.state.allRecords);
  return snapHist(side, a);
});

histCase('renderCards', '未知起卦法 → emoji 兜 ☯、方法名回落原始代码', (side, a) => {
  seed(a, [{ id: '9', method: 'weird', topic: '怪方法', recordTime: '2026-09-21T15:30:00' }]);
  a.renderCards(a.state.allRecords);
  return snapHist(side, a);
});

histCase('renderCards', '事项带 HTML → escHtml 转义；事项缺 → 「(无事项)」', (side, a) => {
  seed(a, [
    { id: '1', topic: '<img src=x onerror=alert(1)> & "引号"', method: 'auto' },
    { id: '2', method: 'auto' },
  ]);
  a.renderCards(a.state.allRecords);
  return snapHist(side, a);
});

histCase('renderCards', '只有 created_at（没有 recordTime / divinationTime）→ 用 created_at 格式化', (side, a) => {
  seed(a, [{ id: '1', topic: '老记录', method: 'num1', created_at: '2026-09-21T15:30:00' }]);
  a.renderCards(a.state.allRecords);
  return snapHist(side, a);
});

histCase('renderCards', '参数 `records` 是死参：传 [] 仍然渲染出全部（用的是 getFilteredRecords）', (side, a) => {
  seed(a); a.renderCards([]);
  return snapHist(side, a);
});

// ── 5.10 记录页：toggleCard ────────────────────────────────────────────────
histCase('toggleCard', '点一张卡 → 勾上、计数 +1、卡片带 selected', (side, a) => {
  seed(a); a.state.manageMode = true; a.renderCards(a.state.allRecords);
  a.toggleCard('101');
  return snapHist(side, a);
});

histCase('toggleCard', '再点一次 → 取消勾选', (side, a) => {
  seed(a); a.state.manageMode = true; a.renderCards(a.state.allRecords);
  a.toggleCard('101');
  a.toggleCard('101');
  return snapHist(side, a);
});

// ── 5.11 记录页：deleteSelected ────────────────────────────────────────────
function histRoutes(kind, spec) {
  const U = CONFIG[kind];
  return (url, init) => {
    const method = init.method || 'GET';
    if (method === 'DELETE') {
      const id = url.slice((U.listUrl + '/').length);
      const fail = (spec.deleteFail || []).includes(id);
      return resp(!fail, fail ? 500 : 200, {});
    }
    if (url === U.listUrl) return resp(spec.listOk !== false, 200, spec.listBody || []);
    throw new Error('差分用例没有为这个 URL 准备应答：' + method + ' ' + url);
  };
}

histCase('deleteSelected', '一条都没勾 → 直接返回，一个请求都不发、也不弹确认', async (side, a, kind) => {
  seed(a);
  side.responder.fn = histRoutes(kind, {});
  await a.deleteSelected();
  return { fetch: side.calls.fetch, confirm: side.calls.confirm, snap: snapHist(side, a) };
});

histCase('deleteSelected', '确认框点「取消」→ 一条都不删', async (side, a, kind) => {
  seed(a); a.state.selectedIds = { 101: true };
  side.flags.confirm = false;
  side.responder.fn = histRoutes(kind, {});
  await a.deleteSelected();
  return { fetch: side.calls.fetch, confirm: side.calls.confirm, snap: snapHist(side, a) };
});

histCase('deleteSelected', '两条全删成功 → DELETE 各带 Authorization、删完重新拉列表', async (side, a, kind) => {
  seed(a); a.state.selectedIds = { 101: true, 102: true };
  side.flags.confirm = true;
  side.flags.token = 'T-123';
  side.responder.fn = histRoutes(kind, { listBody: [RECORDS[0]] });
  await a.deleteSelected();
  return { fetch: side.calls.fetch, confirm: side.calls.confirm, alerts: side.calls.alerts, snap: snapHist(side, a) };
});

histCase('deleteSelected', '其中一条删失败 → 剩下的照删、最后 alert 一次', async (side, a, kind) => {
  seed(a); a.state.selectedIds = { 101: true, 102: true };
  side.flags.confirm = true;
  side.responder.fn = histRoutes(kind, { deleteFail: ['102'], listBody: [RECORDS[0]] });
  await a.deleteSelected();
  return { fetch: side.calls.fetch, alerts: side.calls.alerts, snap: snapHist(side, a) };
});

// ── 5.12 记录页：viewRecord ────────────────────────────────────────────────
histCase('viewRecord', '非管理 → 跳到详情页，带那条记录自己的 id', (side, a, kind) => {
  seed(a);
  a.viewRecord('102');
  return { href: side.g.location.href, want: CONFIG[kind].detailsUrl + '102' };
});

histCase('viewRecord', '管理模式 → 不动 href（点卡片是勾选）', (side, a) => {
  seed(a); a.state.manageMode = true;
  a.viewRecord('102');
  return { href: side.g.location.href };
});

// ── 5.13 记录页：loadRecords ───────────────────────────────────────────────
async function runLoadRecords(side, a, kind, spec) {
  seed(a, []);
  side.g.location.href = 'http://test/' + kind + '/history.html';
  side.flags.loggedIn = !!spec.loggedIn;
  if (spec.token) side.flags.token = spec.token;
  side.responder.fn = histRoutes(kind, spec);
  await a.loadRecords();
  return {
    content: side.doc.getElementById('contentArea').innerHTML,
    fetch: side.calls.fetch,
    ids: a.state.allRecords.map((r) => r.id),
  };
}

histCase('loadRecords', '未登录 → 登录引导（含 openAuthModal 内联），不发请求', (side, a, kind) =>
  runLoadRecords(side, a, kind, { loggedIn: false }));

histCase('loadRecords', '登录 + 三条乱序 → 按 recordTime 倒序', (side, a, kind) =>
  runLoadRecords(side, a, kind, { loggedIn: true, listBody: RECORDS }));

histCase('loadRecords', '登录但列表是空的 → 「暂无排盘记录」', (side, a, kind) =>
  runLoadRecords(side, a, kind, { loggedIn: true, listBody: [] }));

histCase('loadRecords', '列表接口非 2xx → 当空列表处理', (side, a, kind) =>
  runLoadRecords(side, a, kind, { loggedIn: true, listOk: false, listBody: [] }));

histCase('loadRecords', '带 token → Authorization: Bearer', (side, a, kind) =>
  runLoadRecords(side, a, kind, { loggedIn: true, token: 'T-9', listBody: RECORDS }));

histCase('loadRecords', '两条都没有 recordTime → 回退按 created_at 倒序', (side, a, kind) => {
  seed(a, []);
  side.flags.loggedIn = true;
  side.g.location.href = 'http://test/' + kind + '/history.html';
  side.responder.fn = histRoutes(kind, {
    listBody: [{ id: 'a', created_at: 1000 }, { id: 'b', created_at: 2000 }],
  });
  return a.loadRecords().then(() => ({
    ids: a.state.allRecords.map((r) => r.id),
    content: side.doc.getElementById('contentArea').innerHTML,
  }));
});

histCase('loadRecords', 'fetch 抛错 → 当空列表处理（不把异常抛给调用方）', async (side, a, kind) => {
  seed(a, []);
  side.flags.loggedIn = true;
  side.responder.fn = () => { throw new Error('网络断了'); };
  await a.loadRecords();
  return { content: side.doc.getElementById('contentArea').innerHTML, ids: a.state.allRecords.map((r) => r.id) };
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. 自检（先证明「差分真能红」，再相信后面的绿）
// ─────────────────────────────────────────────────────────────────────────────
selfCheck('桩：同一个 id 必须拿到同一个元素（dom_stub 的契约 1）', () => {
  const doc = makeDocument();
  const el = doc.getElementById('contentArea');
  el.innerHTML = '甲';
  assert(doc.getElementById('contentArea').innerHTML === '甲', '第二次 getElementById 拿到的不是同一个元素');
});

selfCheck('桩：honorIds:false 挡位确实会「写进去就丢」（证明上面的自检不是恒真）', () => {
  const doc = makeDocument({ honorIds: false });
  doc.getElementById('contentArea').innerHTML = '甲';
  assert(doc.getElementById('contentArea').innerHTML !== '甲', 'honorIds:false 竟然也honorIds 了');
});

selfCheck('桩：textContent → innerHTML 转义 & < >，不转义引号', () => {
  const doc = makeDocument();
  const el = doc.createElement('div');
  el.textContent = '<b>甲</b> & "q"';
  assert(el.innerHTML === '&lt;b&gt;甲&lt;/b&gt; &amp; "q"', 'innerHTML 是：' + el.innerHTML);
});

selfCheck('桩：`.mh-wrapper` 默认查不到（所以 mkSide 才要对称补一条）', () => {
  const doc = makeDocument();
  assert(doc.querySelector('.mh-wrapper') === null, 'dom_stub 居然认得 .mh-wrapper 了 —— 删掉 mkSide 里那条 shim');
});

selfCheck('装载：`renderLiuyaoResult` / `escHtml` 真在 Node globalThis 上（坑①）', () => {
  assert(typeof globalThis.renderLiuyaoResult === 'function', 'globalThis.renderLiuyaoResult 不是函数');
  assert(typeof globalThis.escHtml === 'function', 'globalThis.escHtml 不是函数');
});

selfCheck('装载：新模块真的读到同一批全局（不是空气）', () => {
  assert(resultLogic.cardFromResult({ hexagrams: { benGua: { upper: 1, lower: 2 } } }).hexagrams.benGua.upper === 1, 'cardFromResult 折不出来');
});

selfCheck('fetch 桩真的被调用过（否则「没发请求」那几条是恒真的）', async () => {
  const side = mkSide('new');
  applySide(side);
  side.responder.fn = () => resp(true, 200, {});
  await side.g.fetch('/哨兵');
  assert(side.calls.fetch.length === 1, 'fetch 桩没记账');
});

selfCheck('★ 坑②：老沙箱复用的是**宿主** Date（所以 `instanceof Date` 两侧才一致）', () => {
  const inVm = vm.runInContext('Date', sbResult);
  assert(inVm === Date, '沙箱里的 Date 不是宿主 Date —— `created_at instanceof Date` 会变成两侧不同（假红），'
    + '`side.makeDate()` 也会失效。要么改回快照里的注入，要么在 makeDate 里分 realm 造。');
});

selfCheck('★ 坑③：不补 `.mh-wrapper` 时 toggleManage 真的会抛（所以那条 shim 是必需的）', () => {
  const doc = makeDocument();
  const api = legacyHistApi(sbHist);
  const keepDoc = sbHist.document;
  sbHist.document = doc;
  sbHist.allRecords = [];
  let threw = false;
  try {
    sbHist.toggleManage();
  } catch (e) {
    threw = true;
  } finally {
    sbHist.document = keepDoc;
    sbHist.manageMode = false;
    sbHist.selectedIds = {};
  }
  assert(threw, 'toggleManage 竟然没抛 —— 桩的 querySelector 变了？');
});

selfCheck('比较器：能抓到一处真实差异（先证明它会红）', () => {
  const oldSrc = fs.readFileSync(SRC.liuyaoHist, 'utf8');
  const fns = extractFns(oldSrc);
  const body = fns.get('updateSelectedCount');
  assert(!!body, '切不出 updateSelectedCount');
  const mutated = body.body.replace("'已选 '+count", "'已选 '+count+' 条'");
  assert(mutated !== body.body, '变异没落上');
  assert(normBody(mutated) !== normBody(body.body), '比较器看不出这处差异 —— 它会假绿');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. 逐字比对（花括号配对切函数 → 剥注释 → 参数化占位 → 比）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 把源码里的 `function name(...) { … }` 切出来。
 * 不处理正则字面量（`/}/` 这种）—— 被比对的这四个文件里没有。
 */
function matchPair(src, i0, open, close) {
  let depth = 0, i = i0, mode = null, q = '';
  while (i < src.length) {
    const c = src[i], two = src.slice(i, i + 2);
    if (mode === 'line') { if (c === '\n') mode = null; i++; continue; }
    if (mode === 'block') { if (two === '*/') { mode = null; i += 2; continue; } i++; continue; }
    if (mode === 'str') {
      if (c === '\\') { i += 2; continue; }
      if (c === q) mode = null;
      i++; continue;
    }
    if (two === '//') { mode = 'line'; i += 2; continue; }
    if (two === '/*') { mode = 'block'; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { mode = 'str'; q = c; i++; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

function extractFns(src) {
  const out = new Map();
  // `export ` 非捕获地放过：新模块里 `export function load() {` 与老脚本的
  // `function load() {` 是同一条判据（`export` 不是函数体的一部分）。
  const re = /(?:^|\n)[ \t]*(?:export[ \t]+)?(async[ \t]+)?function[ \t]+([A-Za-z_$][\w$]*)[ \t]*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[2];
    const parenOpen = m.index + m[0].length - 1;
    const parenClose = matchPair(src, parenOpen, '(', ')');
    if (parenClose < 0) continue;
    const params = src.slice(parenOpen + 1, parenClose);
    const braceOpen = src.indexOf('{', parenClose);
    if (braceOpen < 0) continue;
    const braceClose = matchPair(src, braceOpen, '{', '}');
    if (braceClose < 0) continue;
    out.set(name, {
      async: !!m[1],
      params: params.replace(/\s+/g, ' ').trim(),
      body: src.slice(braceOpen, braceClose + 1),
    });
  }
  return out;
}

function stripComments(src) {
  let out = '', i = 0, mode = null, q = '';
  while (i < src.length) {
    const c = src[i], two = src.slice(i, i + 2);
    if (mode === 'line') { if (c === '\n') { mode = null; out += c; } i++; continue; }
    if (mode === 'block') { if (two === '*/') { mode = null; i += 2; } else i++; continue; }
    if (mode === 'str') {
      out += c;
      if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
      if (c === q) mode = null;
      i++; continue;
    }
    if (two === '//') { mode = 'line'; i += 2; continue; }
    if (two === '/*') { mode = 'block'; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { mode = 'str'; q = c; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

/**
 * 把「老的写法」与「参数化后的写法」折成同一个字符串。
 *
 * 变换清单（**每一处都在两侧对称施加**，所以多折了也不会造成假绿 ——
 * 只可能造成假红，而假红看得见）：
 *   1. 剥注释（字符串感知）。
 *   2. 老侧的字面量 URL → 占位符（`'/api/liuyao-records/'` 要折成 `«LIST»+'/'`，
 *      因为新侧写的是 `listUrl+'/'`）。
 *   3. 新侧的参数名 → 同一批占位符。
 *   4. 删掉拼接胶水：`'<…="' + «HOME» + '"…'` 与 `'<…="«HOME»"…'` 折成同一串。
 *   5. 剥 `state.` 前缀（老页三个 var 在新实现里挂在一个 `state` 对象上）。
 *   6. 空白压成一个空格。
 */
function normBody(s) {
  s = stripComments(s);
  // 2. 老侧字面量（注意长串先替换）
  s = s.replace(/'\/api\/liuyao-records\/'/g, "«LIST»+'/'");
  s = s.replace(/'\/api\/mhys-records\/'/g, "«LIST»+'/'");
  s = s.replace(/'\/api\/liuyao-records'/g, '«LIST»');
  s = s.replace(/'\/api\/mhys-records'/g, '«LIST»');
  s = s.replace(/'\/liuyao\/result\.html\?id='/g, '«DETAILS»');
  s = s.replace(/'\/mhys\/result\.html\?id='/g, '«DETAILS»');
  s = s.replace(/\/liuyao\//g, '«HOME»');
  s = s.replace(/\/mhys\//g, '«HOME»');
  // 3. 新侧参数名
  s = s.replace(/\blistUrl\b/g, '«LIST»');
  s = s.replace(/\bdetailsUrl\b/g, '«DETAILS»');
  s = s.replace(/\bhomeUrl\b/g, '«HOME»');
  // 4. 拼接胶水
  s = s.replace(/'[ \t]*\+[ \t]*/g, '');
  s = s.replace(/\+[ \t]*'/g, '');
  // 5. state. 前缀
  s = s.replace(/\bstate\./g, '');
  // 6. 空白
  return s.replace(/\s+/g, ' ').trim();
}

function compareFns(label, oldName, oldSrc, newName, newSrc, fns) {
  const oldFns = extractFns(oldSrc);
  const newFns = extractFns(newSrc);
  const reds = [];
  for (const f of fns) {
    const o = oldFns.get(f);
    const n = newFns.get(f);
    if (!o) { reds.push(f + '：老文件里切不出这个函数'); continue; }
    if (!n) { reds.push(f + '：新文件里切不出这个函数'); continue; }
    if (o.async !== n.async) { reds.push(f + '：async 修饰不同（老 ' + o.async + ' / 新 ' + n.async + '）'); continue; }
    if (o.params !== n.params) { reds.push(f + '：形参不同（老 `' + o.params + '` / 新 `' + n.params + '`）'); continue; }
    const a = normBody(o.body), b = normBody(n.body);
    if (a !== b) {
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      reds.push(f + '：函数体不同，首个差异在第 ' + i + ' 个字符附近 ——\n      老：…'
        + JSON.stringify(a.slice(Math.max(0, i - 60), i + 90)) + '\n      新：…'
        + JSON.stringify(b.slice(Math.max(0, i - 60), i + 90)));
    }
  }
  return { label, oldName, newName, count: fns.length, reds };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. 跑
// ─────────────────────────────────────────────────────────────────────────────
function groupOf(section) {
  const i = section.indexOf('/');
  return i < 0 ? section : section.slice(0, i);
}

async function main() {
  // 8.1 自检
  let selfRed = 0;
  for (const c of selfChecks) {
    const r = await safe(() => c.fn());
    if (r.ok) {
      if (VERBOSE) console.log('  ✓ 自检：' + c.name);
    } else {
      selfRed++;
      console.log('  ✗ 自检：' + c.name + '\n      ' + r.value.__threw);
    }
  }
  if (selfRed) {
    console.log('\n❌ 桩自检红了 ' + selfRed + ' 条 —— 后面的对拍结果不可信，先修自检。\n');
    process.exit(1);
  }

  // 8.2 对拍
  const stats = new Map();
  const reds = [];
  for (const c of cases) {
    const st = stats.get(c.section) || { total: 0 };
    st.total++;
    stats.set(c.section, st);

    const oldSide = mkSide('old');
    applySide(oldSide);
    const o = await safe(() => c.body(oldSide));

    const newSide = mkSide('new');
    applySide(newSide);
    const n = await safe(() => c.body(newSide));

    if (o.ok !== n.ok) {
      reds.push({
        section: c.section, name: c.name,
        path: '(抛没抛不同)',
        oldV: o.ok ? o.value : o.value,
        newV: n.ok ? n.value : n.value,
      });
      continue;
    }
    if (!deepEqual(o.value, n.value)) {
      reds.push({
        section: c.section, name: c.name,
        path: firstDiffPath(o.value, n.value),
        oldV: o.value, newV: n.value,
      });
      continue;
    }
    if (VERBOSE) console.log('  ✓ ' + c.section + ' · ' + c.name);
  }

  // 8.3 逐字比对
  const OLD_RESULT_SRC = fs.readFileSync(SRC.result, 'utf8');
  const OLD_HIST_SRC = fs.readFileSync(SRC.liuyaoHist, 'utf8');
  const OLD_MHYS_SRC = fs.readFileSync(SRC.mhysHist, 'utf8');
  const NEW_RESULT_SRC = fs.readFileSync(SR('src/app/liuyao/result.logic.js'), 'utf8');
  const NEW_LIB_SRC = fs.readFileSync(SR('src/app/lib/recordsHistory.js'), 'utf8');

  const verbatim = [
    compareFns('结果页', 'page-liuyao-result.js', OLD_RESULT_SRC,
      'result.logic.js', NEW_RESULT_SRC, ['cardFromResult', 'load']),
    compareFns('记录页（六爻）', 'page-liuyao-history.js', OLD_HIST_SRC,
      'lib/recordsHistory.js', NEW_LIB_SRC, HIST_FNS),
    compareFns('记录页（梅花）', 'page-mhys-history.js', OLD_MHYS_SRC,
      'lib/recordsHistory.js', NEW_LIB_SRC, HIST_FNS),
  ];

  // 8.4 常量表超集（父要求：超集要被证明，不是被声明）
  const tableReds = [];
  for (const [who, sb] of [['六爻', sbHist], ['梅花', sbMhys]]) {
    for (const t of ['EMOJI_MAP', 'METHOD_NAMES']) {
      for (const k of Object.keys(sb[t])) {
        if (!(k in lib[t])) tableReds.push(who + ' 的 ' + t + '[' + k + '] 在新表里没有');
        else if (lib[t][k] !== sb[t][k]) tableReds.push(who + ' 的 ' + t + '[' + k + '] 值不同：老 ' + JSON.stringify(sb[t][k]) + ' / 新 ' + JSON.stringify(lib[t][k]));
      }
    }
  }
  const mhysExtra = Object.keys(sbMhys.METHOD_NAMES).filter((k) => !(k in sbHist.METHOD_NAMES));
  if (!mhysExtra.length) tableReds.push('梅花那份的 METHOD_NAMES 没有比六爻多出任何键 —— 「取并集」这句话就没意义了');

  // 8.5 两份老脚本里确实有这三个字面量（证明 CONFIG 不是抄错的）
  const literalReds = [];
  for (const [who, src, cfg] of [
    ['六爻', OLD_HIST_SRC, CONFIG.liuyao],
    ['梅花', OLD_MHYS_SRC, CONFIG.mhys],
  ]) {
    if (src.indexOf("'" + cfg.listUrl + "'") < 0) literalReds.push(who + ' 老脚本里找不到 ' + cfg.listUrl);
    if (src.indexOf("'" + cfg.detailsUrl + "'") < 0) literalReds.push(who + ' 老脚本里找不到 ' + cfg.detailsUrl);
    if (src.indexOf('href="' + cfg.homeUrl + '"') < 0) literalReds.push(who + ' 老脚本里找不到 href="' + cfg.homeUrl + '"');
  }
  // history.logic.js 的 CONFIG 必须与六爻那份一致
  for (const k of ['listUrl', 'detailsUrl', 'homeUrl']) {
    if (historyLogic.CONFIG[k] !== CONFIG.liuyao[k]) {
      literalReds.push('history.logic.js 的 CONFIG.' + k + ' 是 ' + JSON.stringify(historyLogic.CONFIG[k])
        + '，老脚本里是 ' + JSON.stringify(CONFIG.liuyao[k]));
    }
  }

  // 8.6 报告
  console.log('\n── 逐字比对（花括号配对切函数、剥注释、参数化占位后逐字） ──');
  let verbRed = 0;
  for (const v of verbatim) {
    if (v.reds.length) {
      verbRed += v.reds.length;
      console.log('  ✗ ' + v.label + '：' + v.reds.length + '/' + v.count + ' 个函数有差异（' + v.oldName + ' ↔ ' + v.newName + '）');
      for (const r of v.reds) console.log('      · ' + r);
    } else {
      console.log('  ✓ ' + v.label + '：' + v.count + '/' + v.count + ' 个函数逐字一致（' + v.oldName + ' ↔ ' + v.newName + '）');
    }
  }

  console.log('\n── 常量表（共享件必须是两份的并集） ──');
  if (tableReds.length) {
    console.log('  ✗ ' + tableReds.length + ' 条');
    for (const r of tableReds) console.log('      · ' + r);
  } else {
    console.log('  ✓ 六爻 / 梅花两份的 EMOJI_MAP、METHOD_NAMES 全部被共享件覆盖且值相同');
    console.log('  ✓ 梅花比六爻多出的键：' + mhysExtra.join(', ') + '（并集不是空话）');
  }

  console.log('\n── 配置字面量（证明参数化没抄错） ──');
  if (literalReds.length) {
    console.log('  ✗ ' + literalReds.length + ' 条');
    for (const r of literalReds) console.log('      · ' + r);
  } else {
    console.log('  ✓ 两份老脚本里都有这三个字面量，history.logic.js 的 CONFIG 与六爻那份逐字一致');
  }

  console.log('\n── 对拍（每节 = 一个函数 / 一组同源用例） ──');
  const order = [];
  for (const s of stats.keys()) if (!order.includes(groupOf(s))) order.push(groupOf(s));
  let total = 0, red = 0;
  for (const grp of order) {
    const parts = [];
    let g = 0, r = 0;
    for (const [s, st] of stats) {
      if (groupOf(s) !== grp) continue;
      parts.push(s + ' ' + st.total);
      g += st.total;
    }
    for (const x of reds) if (groupOf(x.section) === grp) r++;
    total += g; red += r;
    console.log('  ' + (r ? '✗' : '✓') + ' ' + grp + '：' + g + ' 例' + (r ? '，' + r + ' 红' : '') + '　[' + parts.join(' / ') + ']');
  }
  console.log('  合计 ' + total + ' 条用例，' + red + ' 红');

  if (reds.length) {
    console.log('\n── 红了的用例 ──');
    for (const x of reds) {
      console.log('  ✗ ' + x.section + ' · ' + x.name);
      console.log('      首处差异：' + x.path);
      console.log('      老侧：' + show(x.oldV));
      console.log('      新侧：' + show(x.newV));
    }
  }

  const bad = red + verbRed + tableReds.length + literalReds.length;
  if (bad) {
    console.log('\n❌ 差分红了 ' + bad + ' 处。先怀疑用例（桩没装对 / 状态没注入 / 全局没搬），再怀疑实现。\n');
    process.exit(1);
  }
  console.log('\n✅ 差分全绿：' + total + ' 条对拍、' + verbatim.reduce((n, v) => n + v.count, 0)
    + ' 个函数逐字一致、常量表与配置字面量全部对上。\n');
}

await main();

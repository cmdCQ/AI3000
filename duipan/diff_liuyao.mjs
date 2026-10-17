#!/usr/bin/env node
/**
 * 六爻主页搬迁 · `src/app/liuyao/logic.js` ↔ 老快照 差分
 *
 * 用法：
 *   node duipan/diff_liuyao.mjs                 # 跑对拍 + 逐字比对
 *   node duipan/diff_liuyao.mjs --verbose       # 另外打印每一个通过的用例名
 *
 * 退出码（照 diff_mhys.mjs 的契约）：
 *   2 = 模块/全局装载失败（桩、老加载器、新模块、或库全局没搬过来）
 *   1 = 有用例红，或桩自检/逐字比对不通过
 *   0 = 全绿
 *
 * 判据：`duipan/legacy_ref/page-liuyao.js`（4 行头注释 + 老 `src/web/js/page-liuyao.js`
 *       原文，payload sha256 `0796c79ced74f04f4d11705db5925af4f83ca27bc8b2249fec584b3ee6ffdf82`）。
 *       **不许改那个文件** —— 改了就是把判据换成新实现自己。
 *
 * 覆盖：老快照 48 个顶层函数，其中 46 个有运行时用例（见报告「未覆盖」一栏），
 *       另外 48/48 走「按花括号切出来、剥注释与空白、归一化 export/state. 前缀」的逐字比对。
 *
 * 红了的处理顺序：**先怀疑用例，不要先怀疑实现。**
 *   每处红都要先能说出「为什么是用例错」（桩没装对、状态没注入、Math.random/Date 没钉死、
 *   参数被用例辅助函数吞了、两侧注入不对称…）；只有那个说法站不住，才动实现。
 *   本文件自己的历史教训：`add()` 这类辅助「把参数吞掉」完全不报错 —— 多条用例会静默地
 *   比两个不相干的输入（mhys 那次就因为漏转发 `{fixedRandom:true}` 假绿了两条）。
 *
 * 桩：`duipan/dom_stub.js`（全 harness 唯一一份）。本文件**不复制**它的形状，
 *     只用 `createRequire` 转进来。
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

// ─────────────────────────────────────────────────────────────────────────────
// 0. 假定时器
//    老加载器会把**宿主**的 setTimeout/clearTimeout 灌进 vm 沙箱（legacy_liuyao.js:45），
//    而 `renderMethodParams()` / `scrollToCurrent()` / `updateDayColumn()` 里那些
//    `setTimeout(…, 50|100|150)` 会在对拍跑到一半时真触发 —— 那时两侧的状态早就被下一个
//    用例改过了，于是随机红。必须在 `loadLegacy()` **之前**把它们换成假定时器。
//    （老加载器自己已经把 setInterval/clearInterval 换假了，理由相同。）
// ─────────────────────────────────────────────────────────────────────────────
const HOST_TIMERS = {
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
};
const fakeTimer = function () { return { __fake: true }; };
const fakeClear = function () {};
globalThis.setTimeout = fakeTimer;
globalThis.clearTimeout = fakeClear;
globalThis.setInterval = fakeTimer;
globalThis.clearInterval = fakeClear;

// ─────────────────────────────────────────────────────────────────────────────
// 1. 装载两侧
// ─────────────────────────────────────────────────────────────────────────────
const { makeDocument, installGlobals, applyDomSetup, ESC_TEXT } = require('./dom_stub.js');
const L = require('./legacy_liuyao.js');

let legacy;
try {
  legacy = L.loadLegacy();
} catch (e) {
  console.error('装载失败：`L.loadLegacy()` 抛错 —— ' + ((e && e.stack) || e));
  process.exit(2);
}

const newDoc = makeDocument();
const restoreGlobals = installGlobals(newDoc);

// ★ 坑①：老沙箱里的**库全局**必须搬进 Node 真实 globalThis，否则老侧拿真库、
//   新侧拿空气（LOGIC 里裸名读 `Solar`/`Lunar`/`renderLiuyaoResult`/`currentRecordId`），
//   一次性产生一堆假红。mhys 那次因此假红 21 条。
//   只搬白名单：不遍历沙箱全部属性，免得把 `Math`/`Date`/`setInterval` 这类宿主全局
//   换成 vm contextify 过的另一份对象（那会让 Math.random 的替身装置失效）。
const MOVE_GLOBALS = [
  // 库（lunar.min.js / liuyao_render.js 提供的）
  'Solar', 'Lunar', 'renderLiuyaoResult', 'buildLiuyaoAiPayload',
  // 渲染层模块级可变量：LOGIC 里 `recordId: currentRecordId` 是裸名读
  'currentRecordId', 'currentChart', 'currentDisplay', 'currentTopic',
  'currentGender', 'currentLunarInfo', 'currentResultMeta', 'savedAnalysis',
  // 老加载器自带的桩
  'AUTH', 'openAuthModal', 'alert',
];
const REQUIRED_GLOBALS = ['Solar', 'Lunar', 'renderLiuyaoResult', 'currentRecordId'];
for (const k of MOVE_GLOBALS) {
  if (!(k in legacy)) {
    if (REQUIRED_GLOBALS.includes(k)) {
      console.error('装载失败：老沙箱里没有 `' + k + '` —— 库全局没搬过来，'
        + '新实现按裸名读它会 ReferenceError（会变成一片假红）。');
      process.exit(2);
    }
    continue;
  }
  globalThis[k] = legacy[k];
}

let logic, newState;
try {
  logic = await import('../src/app/liuyao/logic.js');
  newState = logic.state;
} catch (e) {
  console.error('装载失败：import `src/app/liuyao/logic.js` 抛错 —— ' + ((e && e.stack) || e));
  process.exit(2);
}
if (!newState || typeof newState !== 'object') {
  console.error('装载失败：`logic.js` 没有导出 `state` 对象。');
  process.exit(2);
}

const LOGIC_SRC = fs.readFileSync(path.join(ROOT, 'src', 'app', 'liuyao', 'logic.js'), 'utf8');
const SNAP_SRC = fs.readFileSync(path.join(__dirname, 'legacy_ref', 'page-liuyao.js'), 'utf8');

// 每侧的“痕迹仓库”：桩本身不记录的东西（比如 `new Image()` 被构造了几次）放这里。
const SCRATCH = { legacy: { imgs: [] }, new: { imgs: [] } };

// 两侧各装一个会记录的 Image（默认的 Image 桩不记 src）。
//   · 老侧：只能在上下文内部打补丁（宿主改 `legacy.Image` 无效 —— 那是 vm 的属性，
//     而沙箱代码读的是沙箱全局对象上的属性）。
//   · 新侧：直接改宿主 globalThis。
try {
  vm.runInContext(
    'globalThis.__imgs = [];'
    + 'globalThis.Image = function Image() { var o = { src: "", onload: null, onerror: null };'
    + ' __imgs.push(o); return o; };',
    legacy
  );
} catch (e) {
  console.error('装载失败：无法在老沙箱里装 Image 记录器 —— ' + ((e && e.stack) || e));
  process.exit(2);
}
globalThis.Image = function Image() {
  const o = { src: '', onload: null, onerror: null };
  SCRATCH.new.imgs.push(o);
  return o;
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. 比较与差异定位
// ─────────────────────────────────────────────────────────────────────────────
function safe(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, value: { __threw: String((e && e.message) || e) } };
  }
}

/** 严格深比：区分 NaN / null / undefined / 键集合 / 数组长度（`JSON.stringify` 做不到）。 */
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr) {
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

/** 第一处不同的路径，例：`a.b[1].c`；完全相同返回 null。 */
function firstDiffPath(a, b, p) {
  p = p || '';
  if (Object.is(a, b)) return null;
  if (typeof a !== typeof b) return p || '(root)';
  if (a === null || b === null || typeof a !== 'object') return p || '(root)';
  const aArr = Array.isArray(a), bArr = Array.isArray(b);
  if (aArr !== bArr) return p || '(root)';
  if (aArr) {
    if (a.length !== b.length) return (p || '(root)') + '.length';
    for (let i = 0; i < a.length; i++) {
      const d = firstDiffPath(a[i], b[i], p + '[' + i + ']');
      if (d) return d;
    }
    return null;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k)) return (p ? p + '.' : '') + k;
  for (const k of kb) if (!Object.prototype.hasOwnProperty.call(a, k)) return (p ? p + '.' : '') + k;
  for (const k of ka) {
    const d = firstDiffPath(a[k], b[k], (p ? p + '.' : '') + k);
    if (d) return d;
  }
  return null;
}

function show(v, max) {
  max = max || 360;
  let s;
  try { s = JSON.stringify(v); } catch (e) { s = String(v); }
  if (s === undefined) s = String(v);
  return s.length > max ? s.slice(0, max) + '…(共 ' + s.length + ' 字符)' : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Date / Math.random 钉死装置（两侧各自装、finally 还原）
// ─────────────────────────────────────────────────────────────────────────────
const HOST_DATE = globalThis.Date;
const HOST_MATH_RANDOM = globalThis.Math.random;
const LEGACY_DATE = vm.runInContext('Date', legacy);
const LEGACY_MATH_RANDOM = vm.runInContext('Math.random', legacy);

/** 造一个「无参 new Date() 返回钉死时刻、带参照旧透传」的 Date 替身。 */
function makeFixedDate(RealDate, ts) {
  function FixedDate() {
    if (arguments.length === 0) return new RealDate(ts);
    if (arguments.length === 1) return new RealDate(arguments[0]);
    if (arguments.length === 2) return new RealDate(arguments[0], arguments[1]);
    if (arguments.length === 3) return new RealDate(arguments[0], arguments[1], arguments[2]);
    if (arguments.length === 7) {
      return new RealDate(arguments[0], arguments[1], arguments[2], arguments[3],
        arguments[4], arguments[5], arguments[6]);
    }
    return new RealDate(ts);
  }
  FixedDate.now = function () { return ts; };
  FixedDate.parse = RealDate.parse;
  FixedDate.UTC = RealDate.UTC;
  FixedDate.prototype = RealDate.prototype;
  return FixedDate;
}

function withFixedDate(side, ts, fn) {
  const Real = side === 'legacy' ? LEGACY_DATE : HOST_DATE;
  const Fixed = makeFixedDate(Real, ts);
  if (side === 'legacy') {
    legacy.__fixedDate = Fixed;
    vm.runInContext('Date = __fixedDate', legacy);
  } else {
    globalThis.Date = Fixed;
  }
  try {
    return fn();
  } finally {
    if (side === 'legacy') {
      legacy.__realDate = Real;
      vm.runInContext('Date = __realDate', legacy);
    } else {
      globalThis.Date = Real;
    }
  }
}

function withFixedRandom(side, seq, fn) {
  let i = 0;
  const stub = function () { return seq[i++ % seq.length]; };
  if (side === 'legacy') {
    legacy.__randomStub = stub;
    vm.runInContext('Math.random = __randomStub', legacy);
  } else {
    globalThis.Math.random = stub;
  }
  try {
    return fn();
  } finally {
    if (side === 'legacy') {
      legacy.__realRandom = LEGACY_MATH_RANDOM;
      vm.runInContext('Math.random = __realRandom', legacy);
    } else {
      globalThis.Math.random = HOST_MATH_RANDOM;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 桩自检（先证明桩不是橡皮章，再拿它对拍）
// ─────────────────────────────────────────────────────────────────────────────
const selfChecks = [];
function check(name, fn) { selfChecks.push({ name, fn }); }
const assertFail = function (m) { throw new Error(m); };

check('老侧转义契约：textContent → innerHTML 真转义 & < >，不转义引号', function () {
  const el = legacy.document.createElement('div');
  el.textContent = '<img src=x onerror=1> & "a" \'b\'';
  const got = el.innerHTML;
  if (got.indexOf('&lt;img') !== 0) assertFail('没有转义 <：' + got);
  if (got.indexOf('&amp;') < 0) assertFail('没有转义 &：' + got);
  if (got.indexOf('>') >= 0) assertFail('没有转义 >：' + got);
  if (got.indexOf('"a"') < 0 || got.indexOf("'b'") < 0) assertFail('引号被动了（不该动）：' + got);
});

check('新侧转义契约与老侧一致（同一份 dom_stub）', function () {
  const a = legacy.document.createElement('div');
  const b = newDoc.createElement('div');
  const s = 'x<y>z & "q" \'r\' \u00a0';
  a.textContent = s;
  b.textContent = s;
  if (a.innerHTML !== b.innerHTML) assertFail('两侧转义不同：' + a.innerHTML + ' vs ' + b.innerHTML);
  if (b.innerHTML.indexOf('&nbsp;') < 0) assertFail('没有把 \\u00a0 转成 &nbsp;：' + b.innerHTML);
});

check('ESC_TEXT 本体：& < > \\u00a0 依次替换，引号原样', function () {
  const got = ESC_TEXT('a&b<c>d\u00a0e"f\'g');
  const want = 'a&amp;b&lt;c&gt;d&nbsp;e"f\'g';
  if (got !== want) assertFail('ESC_TEXT 结果不符：' + got);
});

check('innerHTML 写入是原样字符串（不转义），textContent 读回时去标签', function () {
  const el = newDoc.createElement('div');
  el.innerHTML = '<b>粗</b>&amp;';
  if (el.innerHTML !== '<b>粗</b>&amp;') assertFail('innerHTML 被改写了：' + el.innerHTML);
  if (el.textContent !== '粗&amp;') assertFail('textContent 行为不符：' + el.textContent);
});

check('getElementById：同一 id 返回同一元素', function () {
  const a = newDoc.getElementById('__selfcheck_same');
  const b = newDoc.getElementById('__selfcheck_same');
  if (a !== b) assertFail('两次拿到不同对象 —— 老页「先取节点、再往上写、后面又取一次」会全丢');
  const c = legacy.document.getElementById('__selfcheck_same');
  if (c !== legacy.document.getElementById('__selfcheck_same')) assertFail('老侧不是同一元素');
});

check('honorIds:false 是自检挡位：故意不认 id（证明桩有分辨力）', function () {
  const d = makeDocument({ honorIds: false });
  if (d.getElementById('x') === d.getElementById('x')) {
    assertFail('honorIds:false 下仍然返回同一元素 —— 这个挡位失效了，本文件的「同 id 同元素」自检也就没有分辨力');
  }
});

check('桩能反映 DOM 变化（改了输入，结果必须跟着变）', function () {
  const d = makeDocument();
  d.getElementById('topicInput').value = '甲';
  const first = d.getElementById('topicInput').value;
  d.getElementById('topicInput').value = '乙';
  const second = d.getElementById('topicInput').value;
  if (first === second) assertFail('改 value 没反映出来 —— 这个桩是橡皮章，对拍必假绿');
});

check('applyDomSetup 真的把值写进了元素（它只认 value/checked/options/textContent/innerHTML）', function () {
  const d = makeDocument();
  applyDomSetup(d, { topicInput: '填进去的', startBtn: { textContent: '排盘中…' } });
  if (d.getElementById('topicInput').value !== '填进去的') assertFail('value 没写进去');
  if (d.getElementById('startBtn').innerHTML !== '排盘中…') assertFail('textContent 没写进去');
  // ⚠ 桩**不支持** `disabled` 这类普通属性（只认上面五个键）—— 依赖 disabled 的用例
  //   必须在 `pre` 里手写，否则注入静默无效、两条用例会「都一样」地假绿。
  applyDomSetup(d, { startBtn: { disabled: true } });
  if (d.getElementById('startBtn').disabled === true) assertFail('桩居然开始支持 disabled 了 —— 请回来复查所有靠 pre 手写 disabled 的用例');
});

check('两侧读到的是同一个真库（库全局确实搬过来了）', function () {
  if (globalThis.Lunar !== legacy.Lunar) assertFail('新侧 Lunar 不是老沙箱那一份');
  if (globalThis.Solar !== legacy.Solar) assertFail('新侧 Solar 不是老沙箱那一份');
  if (typeof globalThis.Lunar.fromYmd !== 'function') assertFail('Lunar 不是真库');
  if (globalThis.renderLiuyaoResult !== legacy.renderLiuyaoResult) assertFail('渲染层没搬过来');
});

check('firstDiffPath 能定位嵌套路径', function () {
  const a = { benGua: { upper: 7, lines: [{ moving: false }, { moving: true }] } };
  const b = { benGua: { upper: 7, lines: [{ moving: false }, { moving: false }] } };
  const p = firstDiffPath(a, b);
  if (p !== 'benGua.lines[1].moving') assertFail('定位错了：' + p);
  if (firstDiffPath(a, a) !== null) assertFail('相同对象应返回 null');
});

check('deepEqual 不把 NaN 与 null 当成一回事', function () {
  if (deepEqual(NaN, null)) assertFail('NaN 被认为等于 null');
  if (!deepEqual(NaN, NaN)) assertFail('NaN 不等于自己');
  if (deepEqual({ a: 1 }, { a: 1, b: undefined })) assertFail('键集合不同却算相等');
});

check('Math.random 替身真在老沙箱内部生效，且还原后又是真随机', function () {
  const seq = [0.125, 0.875];
  const got = withFixedRandom('legacy', seq, function () { return vm.runInContext('Math.random()', legacy); });
  if (got !== 0.125) assertFail('沙箱内部没被替身接管：' + got);
  const after = vm.runInContext('Math.random()', legacy);
  if (after === 0.125) assertFail('还原失败，沙箱还挂着替身');
  const hostGot = withFixedRandom('new', seq, function () { return Math.random(); });
  if (hostGot !== 0.125) assertFail('新侧替身没生效：' + hostGot);
});

check('Date 钉死装置两侧都生效（无参 new Date() 返回钉死时刻）', function () {
  const ts = Date.UTC(2026, 8, 25, 0, 30, 15);
  const oldGot = withFixedDate('legacy', ts, function () { return vm.runInContext('new Date().getTime()', legacy); });
  if (oldGot !== ts) assertFail('老沙箱 Date 没钉死：' + oldGot + ' != ' + ts);
  const newGot = withFixedDate('new', ts, function () { return new Date().getTime(); });
  if (newGot !== ts) assertFail('新侧 Date 没钉死：' + newGot + ' != ' + ts);
  // 带参构造必须照旧（getMaxDay 靠 `new Date(y, m, 0)`）
  const days = withFixedDate('new', ts, function () { return new Date(2024, 2, 0).getDate(); });
  if (days !== 29) assertFail('带参 new Date(y,m,0) 被钉死装置弄坏了：' + days);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. 用例语料
// ─────────────────────────────────────────────────────────────────────────────
let uid = 0;
const CASES = [];
function add(name, fn, args, extra) {
  if (extra && Object.prototype.hasOwnProperty.call(extra, 'args')) {
    throw new Error('add() 的 extra 里不许带 args —— 会静默吞掉位置参数（mhys 踩过）');
  }
  uid++;
  CASES.push(Object.assign(
    { name: '#' + String(uid).padStart(3, '0') + ' ' + name, fn: fn, args: args || [] },
    extra || {}
  ));
}

const RANDOM_SEQ = [0, 0.5, 0.9999999, 0.25, 0.75, 0.9999999, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8];
const tag = function (v) {
  if (v === null) return 'null';
  if (typeof v === 'string') return 'str(' + JSON.stringify(v) + ')';
  return typeof v + '(' + String(v) + ')';
};

// ── 5.1 取卦算术（纯函数）──
for (const v of [1, 2, 3, 4, 5, 6, 7, 8]) add('triToLines 八宫全扫 ' + v, 'triToLines', [v]);
for (const v of [0, -1, 9, 1.5, -0, '3', '8', '', ' ', null, undefined, NaN, true, false, [], {}, [1, 2], '0x3']) {
  add('triToLines 脏输入 ' + tag(v), 'triToLines', [v]);
}

const TRI_LISTS = [
  [1, 1, 1], [0, 0, 0], [1, 1, 0], [1, 0, 1], [1, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1],
  [], [1, 1], [1, 1, 1, 1], [0], [null, null, null], ['1', '1', '1'], [1, '1', 1],
  [true, false, true], [1, 1, '1'], [undefined, undefined, undefined],
];
for (const t of TRI_LISTS) add('linesToTri ' + show(t, 40), 'linesToTri', [t]);
add('linesToTri null', 'linesToTri', [null]);
add('linesToTri undefined', 'linesToTri', [undefined]);
add('linesToTri 数字', 'linesToTri', [123]);

const LY = function (yang, changing) { return { yang: !!yang, changing: !!changing }; };
const six = function (y, c) { return [0, 1, 2, 3, 4, 5].map(function () { return LY(y, c); }); };
const LINE_CASES = [
  ['全阳不动', six(1, 0)],
  ['全阴不动', six(0, 0)],
  ['全阳全动', six(1, 1)],
  ['全阴全动', six(0, 1)],
  ['交错一动一静', [LY(1, 0), LY(0, 0), LY(1, 1), LY(0, 0), LY(1, 0), LY(0, 1)]],
  ['单动初爻', [LY(1, 1), LY(1, 0), LY(1, 0), LY(1, 0), LY(1, 0), LY(1, 0)]],
  ['单动上爻', [LY(0, 0), LY(0, 0), LY(0, 0), LY(0, 0), LY(0, 0), LY(1, 1)]],
  ['缺 changing 字段', [LY(1, 0), LY(1, 0), LY(1, 0), LY(1, 0), LY(1, 0), { yang: 1 }]],
  ['缺 yang 字段', [LY(0, 0), LY(0, 0), LY(0, 0), LY(0, 0), LY(0, 0), { changing: 1 }]],
  ['yang/changing 是数字不是布尔', [0, 1, 2, 3, 4, 5].map(function () { return { yang: 1, changing: 0 }; })],
  ['裸数字（老自测那例）', [1, 1, 1, 1, 1, 1]],
  ['空数组', []],
  ['只有 5 项', six(1, 0).slice(0, 5)],
  ['有 7 项', six(1, 0).concat([LY(0, 0)])],
  ['null', null],
  ['undefined', undefined],
  ['字符串项', ['1', '0', '1', '0', '1', '0']],
  ['null 项', [null, null, null, null, null, null]],
];
for (const c of LINE_CASES) add('castToTrigrams ' + c[0], 'castToTrigrams', [c[1]]);

// ── 5.2 时间（纯函数 + 钉死 Date）──
for (const h of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]) {
  add('getShichen 24 小时全扫 ' + h, 'getShichen', [h]);
}
for (const h of [24, 25, -1, -23, 8.5, 22.999, '8', '', null, undefined, NaN, Infinity, -Infinity, true, [], {}]) {
  add('getShichen 越界/脏输入 ' + tag(h), 'getShichen', [h]);
}

for (const y of [2024, 2025, 2026, 2023, 1900, 4, 3, 0, -1, -100, 1.5, 1984]) {
  add('getYearZhi ' + y, 'getYearZhi', [y]);
}
for (const y of ['2024', '', null, undefined, NaN, Infinity, -Infinity, true]) {
  add('getYearZhi 脏输入 ' + tag(y), 'getYearZhi', [y]);
}

const DATE_CASES = [
  ['2026-09-25 08:30:15', new Date(2026, 8, 25, 8, 30, 15).getTime()],
  ['2026-09-25 00:00:00', new Date(2026, 8, 25, 0, 0, 0).getTime()],
  ['2024-02-04 22:10:00 立春后', new Date(2024, 1, 4, 22, 10, 0).getTime()],
  ['2024-02-04 16:00:00 立春前', new Date(2024, 1, 4, 16, 0, 0).getTime()],
  ['2000-01-01 00:00:00', new Date(2000, 0, 1, 0, 0, 0).getTime()],
  ['1990-12-31 23:59:59', new Date(1990, 11, 31, 23, 59, 59).getTime()],
  ['2026-12-31 23:00:00 晚子时', new Date(2026, 11, 31, 23, 0, 0).getTime()],
];
for (const d of DATE_CASES) {
  add('getLunarInfo（死代码）@ ' + d[0], 'getLunarInfo', [], { fixedDate: d[1] });
}

const ST = function (y, mo, d, h, mi, cal) {
  return { year: y, month: mo, day: d, hour: h, minute: mi, calendar: cal || 'gregorian' };
};
const ENRICH_CASES = [
  ['公历 2026-09-25 08:30', ST(2026, 9, 25, 8, 30), null],
  ['公历 2026-02-04 22:10', ST(2026, 2, 4, 22, 10), null],
  ['公历 2024-02-04 16:00', ST(2024, 2, 4, 16, 0), null],
  ['公历 1900-01-01 00:00', ST(1900, 1, 1, 0, 0), null],
  ['公历 2026-12-31 23:00 晚子时', ST(2026, 12, 31, 23, 0), null],
  ['公历 2026-12-31 23:59', ST(2026, 12, 31, 23, 59), null],
  ['农历 2026-08-14 08:30', ST(2026, 8, 14, 8, 30, 'lunar'), null],
  ['农历 2026-01-01 00:00', ST(2026, 1, 1, 0, 0, 'lunar'), null],
  ['农历 2026-12-30 23:59', ST(2026, 12, 30, 23, 59, 'lunar'), null],
  ['公历越界 2026-13-40', ST(2026, 13, 40, 8, 30), null],
  ['农历越界 2026-13-40', ST(2026, 13, 40, 8, 30, 'lunar'), null],
  ['selectedTime=null → initTime 分支', null, new Date(2026, 8, 25, 8, 30).getTime()],
];
for (const e of ENRICH_CASES) {
  add('enrichTimeInfo ' + e[0], 'enrichTimeInfo', [], {
    state: { selectedTime: e[1] }, fixedDate: e[2] || undefined,
  });
}

// ── 5.3 buildCard（读 #topicInput + state，写 createdAt）──
const TRI_OK = { upper: 7, lower: 7, bianUpper: 3, bianLower: 5, movePositions: [2, 4] };
const RESULT_OK = {
  method: 'coin',
  coinLines: [
    { num: 8, yang: false, changing: false, type: 'shaoyin', pos: 1 },
    { num: 9, yang: true, changing: true, type: 'laoyang', pos: 2 },
    { num: 7, yang: true, changing: false, type: 'shaoyang', pos: 3 },
    { num: 6, yang: false, changing: true, type: 'laoyin', pos: 4 },
    { num: 8, yang: false, changing: false, type: 'shaoyin', pos: 5 },
    { num: 7, yang: true, changing: false, type: 'shaoyang', pos: 6 },
  ],
  movePositions: [2, 4],
  trigrams: TRI_OK,
};
const BUILD_TS = new Date(2026, 8, 25, 8, 30, 15).getTime();
const BUILD_CASES = [
  ['中文事项 + 公历 + 男', '我能不能和我喜欢的女生在一起', ST(2026, 9, 24, 19, 49), 'male', RESULT_OK],
  ['空事项', '', ST(2026, 9, 24, 19, 49), 'male', RESULT_OK],
  ['全空白事项', '   ', ST(2026, 9, 24, 19, 49), 'female', RESULT_OK],
  ['带 HTML 的事项（转义契约）', '<img src=x onerror=1>', ST(2026, 9, 24, 19, 49), 'male', RESULT_OK],
  ['带 & 与不换行空格', 'a&b\u00a0c', ST(2026, 9, 24, 19, 49), 'male', RESULT_OK],
  ['时间未选', '考研', null, 'male', RESULT_OK],
  ['农历时间', '出行', ST(2026, 8, 14, 8, 30, 'lunar'), 'female', RESULT_OK],
  ['动爻为空', '静卦', ST(2026, 9, 24, 19, 49), 'male',
    Object.assign({}, RESULT_OK, { trigrams: Object.assign({}, TRI_OK, { movePositions: [] }) })],
  ['method=manual', '手动', ST(2026, 9, 24, 19, 49), 'male',
    Object.assign({}, RESULT_OK, { method: 'manual' })],
  ['method 空串', 'x', ST(2026, 9, 24, 19, 49), 'male',
    Object.assign({}, RESULT_OK, { method: '' })],
];
for (const b of BUILD_CASES) {
  add('buildCard ' + b[0], 'buildCard', [b[4]], {
    dom: { topicInput: b[1] },
    state: { selectedTime: b[2], currentGender: b[3] },
    fixedDate: BUILD_TS,
  });
}
add('buildCard result 里缺 trigrams', 'buildCard', [{ method: 'coin' }], {
  dom: { topicInput: 'x' }, state: { selectedTime: ST(2026, 9, 24, 19, 49) }, fixedDate: BUILD_TS,
});

// ── 5.4 起卦出口 ──
const TYPE_LIST = ['laoyin', 'shaoyang', 'shaoyin', 'laoyang', 'laoyin', 'shaoyang'];
const LINES_FROM = [
  ['六种都出现', TYPE_LIST],
  ['空数组', []],
  ['全少阴', ['shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin']],
  ['全老阳', ['laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang']],
  ['未知类型', ['bogus']],
  ['null 项', [null]],
  ['undefined 项', [undefined, undefined, undefined, undefined, undefined, undefined]],
  ['7 项', TYPE_LIST.concat(['laoyin'])],
  ['数字项', [6, 7, 8, 9, 6, 7]],
];
for (const c of LINES_FROM) add('linesFromTypes ' + c[0], 'linesFromTypes', [c[1]]);

const CR_LINES = six(1, 0).map(function (l, i) { return Object.assign({}, l, { pos: i + 1 }); });
for (const m of ['coin', 'manual', 'auto', 'time', '', 'bogus']) {
  add('castResult(' + tag(m) + ', 6 爻)', 'castResult', [m, CR_LINES]);
}
add('castResult 空数组', 'castResult', ['coin', []]);
add('castResult null 爻', 'castResult', ['coin', null]);
add('castResult 5 爻', 'castResult', ['coin', CR_LINES.slice(0, 5)]);

const COIN_ST = function (results, state, round) {
  return { COIN: { state: state || 'idle', round: round || 0, results: results || [], spinTimer: null } };
};
const COIN_DIV = [
  ['已满 6 爻（不摇）', TYPE_LIST],
  ['只有 3 爻（要补满）', TYPE_LIST.slice(0, 3)],
  ['一爻都没有', []],
  ['已经 7 爻', TYPE_LIST.concat(['laoyin'])],
  ['只有 1 爻', [TYPE_LIST[0]]],
  ['带未知类型', ['bogus', 'bogus', 'bogus']],
];
for (const c of COIN_DIV) {
  add('coinDivination ' + c[0], 'coinDivination', [], { state: COIN_ST(c[1]), fixedRandom: true });
}

const MANUAL_DIV = [
  ['六种都有', TYPE_LIST],
  ['全老阳', ['laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang']],
  ['只有 3 项（余下兜底少阴）', TYPE_LIST.slice(0, 3)],
  ['有 8 项（只取前 6）', TYPE_LIST.concat(['laoyin', 'laoyang'])],
  ['空数组', []],
];
for (const c of MANUAL_DIV) add('manualDivination ' + c[0], 'manualDivination', [], { state: { MANUAL_LINES: c[1] } });

add('autoDivination（钉死随机）', 'autoDivination', [], { fixedRandom: true });
add('autoDivination 起点非空也要被重置', 'autoDivination', [], {
  state: COIN_ST(TYPE_LIST), fixedRandom: true,
});

for (const v of [0, 1, 2, 3, 4, -1, 2.5, '2', '', null, undefined, NaN, true, []]) {
  add('getLineType ' + tag(v), 'getLineType', [v]);
}

// ── 5.5 铜钱交互（DOM 副作用用 probe 读）──
const coinDom = { coinRow: {}, coinLinesArea: {}, coinResetBtn: {}, coinImg0: {}, coinImg1: {}, coinImg2: {} };
add('renderAccumulatedLines 六爻齐', 'renderAccumulatedLines', [], {
  state: COIN_ST(TYPE_LIST),
  dom: coinDom,
  probe: function (doc) {
    return { html: doc.getElementById('coinLinesArea').innerHTML, display: doc.getElementById('coinLinesArea').style.display };
  },
});
add('renderAccumulatedLines 空', 'renderAccumulatedLines', [], {
  state: COIN_ST([]), dom: coinDom,
  probe: function (doc) { return doc.getElementById('coinLinesArea').innerHTML; },
});
add('renderAccumulatedLines 两爻', 'renderAccumulatedLines', [], {
  state: COIN_ST(TYPE_LIST.slice(0, 2)), dom: coinDom,
  probe: function (doc) { return doc.getElementById('coinLinesArea').innerHTML; },
});
add('renderAccumulatedLines 六爻同类', 'renderAccumulatedLines', [], {
  state: COIN_ST(['laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang']), dom: coinDom,
  probe: function (doc) { return doc.getElementById('coinLinesArea').innerHTML; },
});
add('renderAccumulatedLines 未知类型（TYPE_MAP 落空）', 'renderAccumulatedLines', [], {
  state: COIN_ST(['bogus']), dom: coinDom,
  probe: function (doc) { return doc.getElementById('coinLinesArea').innerHTML; },
});
add('renderAccumulatedLines 节点缺失', 'renderAccumulatedLines', [], {
  state: COIN_ST(TYPE_LIST),
  pre: function (doc) { doc._els.delete('coinLinesArea'); },
  // 注意：桩的 getElementById 是「取不到就造一个」，所以「节点缺失」这条实际走的仍是有了的分支；
  // 这一条只是把「两侧行为一致」钉住（老页真实浏览器里这分支只会在 renderMethodParams 换掉铜钱块时走到）。
  probe: function (doc) { return doc.getElementById('coinLinesArea').innerHTML; },
});

add('setCoinImage(0,true)', 'setCoinImage', [0, true], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg0').src; },
});
add('setCoinImage(0,false)', 'setCoinImage', [0, false], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg0').src; },
});
add('setCoinImage(1,true)', 'setCoinImage', [1, true], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg1').src; },
});
add('setCoinImage(2,false)', 'setCoinImage', [2, false], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg2').src; },
});
add('setCoinImage(9,true) 越界', 'setCoinImage', [9, true], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg9').src; },
});
add("setCoinImage('0',true) 字符串下标", 'setCoinImage', ['0', true], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImg0').src; },
});
add('setCoinImage(null,true)', 'setCoinImage', [null, true], {
  dom: coinDom, probe: function (doc) { return doc.getElementById('coinImgnull').src; },
});

add('preloadCoinImages 预取两张图', 'preloadCoinImages', [], {
  pre: function () { legacy.__imgs.length = 0; SCRATCH.new.imgs.length = 0; },
  probe: function (doc, mod, side) {
    const arr = side === 'legacy' ? legacy.__imgs : SCRATCH.new.imgs;
    return Array.prototype.map.call(arr, function (o) { return o.src; });
  },
});

add('initCoinToss 铜钱块在', 'initCoinToss', [], {
  state: COIN_ST(TYPE_LIST, 'complete', 6),
  dom: coinDom,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return {
      coin: { state: st.COIN.state, round: st.COIN.round, results: st.COIN.results },
      linesArea: doc.getElementById('coinLinesArea').innerHTML,
      linesDisplay: doc.getElementById('coinLinesArea').style.display,
      resetBtn: doc.getElementById('coinResetBtn').style.display,
      img0: doc.getElementById('coinImg0').src,
    };
  },
});
add('initCoinToss 铜钱块不在 → 静默 return（老页那条 50ms 竞态的守卫）', 'initCoinToss', [], {
  state: COIN_ST(TYPE_LIST, 'complete', 6),
  dom: { coinLinesArea: {}, coinResetBtn: {} },
  pre: function (doc) { doc._els.delete('coinRow'); },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { coin: { state: st.COIN.state, round: st.COIN.round, results: st.COIN.results }, hasRow: !!doc._els.get('coinRow') };
  },
});

add('coinReset', 'coinReset', [], {
  state: COIN_ST(TYPE_LIST, 'complete', 6), dom: coinDom,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { coin: { state: st.COIN.state, round: st.COIN.round, results: st.COIN.results } };
  },
});

add('startSpin', 'startSpin', [], {
  state: COIN_ST([], 'idle', 0), dom: coinDom,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { state: st.COIN.state, timer: typeof st.COIN.spinTimer, img0: doc.getElementById('coinImg0').src };
  },
});
add('startSpin 再来一次（先清旧 timer）', 'startSpin', [], {
  state: { COIN: { state: 'idle', round: 0, results: [], spinTimer: { __fake: true } } }, dom: coinDom,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { state: st.COIN.state, timer: typeof st.COIN.spinTimer };
  },
});

const stopSpinProbe = function (doc, mod, side) {
  const st = side === 'legacy' ? legacy : newState;
  return {
    coin: { state: st.COIN.state, round: st.COIN.round, results: st.COIN.results },
    resetBtn: doc.getElementById('coinResetBtn').style.display,
    img0: doc.getElementById('coinImg0').src,
    img1: doc.getElementById('coinImg1').src,
    lines: doc.getElementById('coinLinesArea').innerHTML,
  };
};
add('stopSpin 第一爻', 'stopSpin', [], {
  state: COIN_ST([], 'spinning', 0), dom: coinDom, fixedRandom: true, probe: stopSpinProbe,
});
add('stopSpin 第六爻（收工，显示重新摇卦）', 'stopSpin', [], {
  state: COIN_ST(TYPE_LIST.slice(0, 5), 'spinning', 5), dom: coinDom, fixedRandom: true, probe: stopSpinProbe,
});
add('stopSpin 已经七爻', 'stopSpin', [], {
  state: COIN_ST(TYPE_LIST, 'spinning', 6), dom: coinDom, fixedRandom: true, probe: stopSpinProbe,
});

const coinClickProbe = function (doc, mod, side) {
  const st = side === 'legacy' ? legacy : newState;
  return { state: st.COIN.state, round: st.COIN.round, results: st.COIN.results };
};
for (const s of ['idle', 'spinning', 'spinning_stopped', 'complete']) {
  add('coinClick（state=' + s + '）', 'coinClick', [], {
    state: COIN_ST(s === 'complete' ? TYPE_LIST : [], s, s === 'complete' ? 6 : 0),
    dom: coinDom, fixedRandom: true, probe: coinClickProbe,
  });
}

// ── 5.6 起卦方式 / 手动指定 ──
const methodDom = { methodParams: {}, methodDropdown: {}, methodArrow: {}, methodLabel: {}, methodSelector: {} };
for (const m of ['coin', 'manual', 'auto', 'bogus']) {
  add('renderMethodParams（currentMethod=' + m + '）', 'renderMethodParams', [], {
    state: { currentMethod: m }, dom: methodDom,
    probe: function (doc) { return doc.getElementById('methodParams').innerHTML; },
  });
}

add('toggleDropdown 从关到开', 'toggleDropdown', [], {
  dom: methodDom,
  pre: function (doc) { doc.getElementById('methodDropdown').classList.remove('open'); },
  probe: function (doc) {
    return { open: doc.getElementById('methodDropdown').classList.contains('open'), arrow: doc.getElementById('methodArrow').textContent };
  },
});
add('toggleDropdown 从开到关', 'toggleDropdown', [], {
  dom: methodDom,
  pre: function (doc) { doc.getElementById('methodDropdown').classList.add('open'); },
  probe: function (doc) {
    return { open: doc.getElementById('methodDropdown').classList.contains('open'), arrow: doc.getElementById('methodArrow').textContent };
  },
});

const selectMethodCases = [
  ['coin', '✓ 铜钱摇卦'], ['manual', '✓ 手动指定'], ['auto', '✓ 自动起卦'], ['bogus', '不知道'],
];
for (const s of selectMethodCases) {
  add('selectMethod(' + s[0] + ')', 'selectMethod', [], {
    argsFn: function (doc) {
      const el = doc.getElementById('opt-' + s[0]);
      el.textContent = s[1];
      return [s[0], el];
    },
    dom: methodDom,
    probe: function (doc, mod, side) {
      const st = side === 'legacy' ? legacy : newState;
      return {
        currentMethod: st.currentMethod,
        label: doc.getElementById('methodLabel').textContent,
        params: doc.getElementById('methodParams').innerHTML,
        selected: doc.getElementById('opt-' + s[0]).classList.contains('selected'),
      };
    },
  });
}

add('renderManualLines 六种都有', 'renderManualLines', [], {
  state: { MANUAL_LINES: TYPE_LIST }, dom: { manualLines: {} },
  probe: function (doc) { return doc.getElementById('manualLines').innerHTML; },
});
add('renderManualLines 全少阴', 'renderManualLines', [], {
  state: { MANUAL_LINES: ['shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin'] }, dom: { manualLines: {} },
  probe: function (doc) { return doc.getElementById('manualLines').innerHTML; },
});
add('renderManualLines 四象齐全', 'renderManualLines', [], {
  state: { MANUAL_LINES: ['laoyin', 'laoyang', 'shaoyin', 'shaoyang', 'laoyin', 'laoyang'] }, dom: { manualLines: {} },
  probe: function (doc) { return doc.getElementById('manualLines').innerHTML; },
});
add('renderManualLines 未知类型（typeInfo 落空）', 'renderManualLines', [], {
  state: { MANUAL_LINES: ['bogus', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin'] }, dom: { manualLines: {} },
  probe: function (doc) { return doc.getElementById('manualLines').innerHTML; },
});
add('renderManualLines 节点缺失', 'renderManualLines', [], {
  state: { MANUAL_LINES: TYPE_LIST },
  pre: function (doc) { doc._els.delete('manualLines'); },
  probe: function (doc) { return typeof doc._els.get('manualLines'); },
});

const cycleProbe = function (doc, mod, side) {
  const st = side === 'legacy' ? legacy : newState;
  return { lines: st.MANUAL_LINES.slice(), html: doc.getElementById('manualLines').innerHTML };
};
for (const idx of [0, 1, 2, 3, 5, -1, 6, '2', 3.5, null]) {
  add('cycleManualLine(' + tag(idx) + ')', 'cycleManualLine', [idx], {
    state: { MANUAL_LINES: ['shaoyang', 'shaoyang', 'shaoyang', 'shaoyang', 'shaoyang', 'shaoyang'] },
    dom: { manualLines: {} }, probe: cycleProbe,
  });
}

add('fillManualLineSelects 手动块在 → 重置为全少阴并渲染', 'fillManualLineSelects', [], {
  state: { MANUAL_LINES: ['laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang'] },
  dom: { manualLines: {} },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { lines: st.MANUAL_LINES.slice(), html: doc.getElementById('manualLines').innerHTML };
  },
});
add('fillManualLineSelects 手动块不在 → 不动 MANUAL_LINES（老页那条静默丢数据的守卫）', 'fillManualLineSelects', [], {
  state: { MANUAL_LINES: ['laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang', 'laoyang'] },
  pre: function (doc) { doc._els.delete('manualLines'); },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { lines: st.MANUAL_LINES.slice() };
  },
});

// ── 5.7 性别 / 按钮 ──
for (const g of ['male', 'female', 'bogus', '']) {
  add('selectGender(' + tag(g) + ')', 'selectGender', [g], {
    probe: function (doc, mod, side) {
      const st = side === 'legacy' ? legacy : newState;
      return st.currentGender;
    },
  });
}
add('resetBtn 从排盘中恢复', 'resetBtn', [], {
  dom: { startBtn: { textContent: '排盘中…' } },
  pre: function (doc) { const b = doc.getElementById('startBtn'); b.classList.add('loading'); b.disabled = true; },
  probe: function (doc) {
    const b = doc.getElementById('startBtn');
    return { text: b.textContent, loading: b.classList.contains('loading'), disabled: b.disabled };
  },
});
add('resetBtn 干净状态', 'resetBtn', [], {
  dom: { startBtn: {} },
  probe: function (doc) {
    const b = doc.getElementById('startBtn');
    return { text: b.textContent, loading: b.classList.contains('loading'), disabled: b.disabled };
  },
});

// ── 5.8 时间选择器 ──
add('updateTimeDisplay 公历', 'updateTimeDisplay', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30) }, dom: { timeDisplay: {} },
  probe: function (doc) { return doc.getElementById('timeDisplay').innerHTML; },
});
add('updateTimeDisplay 农历', 'updateTimeDisplay', [], {
  state: { selectedTime: ST(2026, 8, 14, 8, 30, 'lunar') }, dom: { timeDisplay: {} },
  probe: function (doc) { return doc.getElementById('timeDisplay').innerHTML; },
});
add('updateTimeDisplay 农历月日越界', 'updateTimeDisplay', [], {
  state: { selectedTime: ST(2026, 0, 40, 23, 5, 'lunar') }, dom: { timeDisplay: {} },
  probe: function (doc) { return doc.getElementById('timeDisplay').innerHTML; },
});
add('updateTimeDisplay 未选时间 → 直接 return', 'updateTimeDisplay', [], {
  state: { selectedTime: null }, dom: { timeDisplay: { textContent: '哨兵' } },
  pre: function (doc) { doc.getElementById('timeDisplay').textContent = '哨兵'; },
  probe: function (doc) { return doc.getElementById('timeDisplay').innerHTML; },
});

for (const d of DATE_CASES.slice(0, 4)) {
  add('initTime @ ' + d[0], 'initTime', [], {
    fixedDate: d[1],
    probe: function (doc, mod, side) {
      const st = side === 'legacy' ? legacy : newState;
      return st.selectedTime;
    },
  });
}

const UPDATE_TOP = [
  ['公历', ST(2026, 9, 25, 8, 30), 'gregorian'],
  ['农历', ST(2026, 8, 14, 8, 30, 'lunar'), 'lunar'],
  ['农历月日越界', ST(2026, 0, 40, 23, 5, 'lunar'), 'lunar'],
  ['农历 23 点（晚子时）', ST(2026, 12, 30, 23, 59, 'lunar'), 'lunar'],
];
for (const t of UPDATE_TOP) {
  add('updateTopDisplay ' + t[0], 'updateTopDisplay', [], {
    state: { selectedTime: t[1], currentCalendar: t[2] }, dom: { tpDisplay: {} },
    probe: function (doc) { return doc.getElementById('tpDisplay').innerHTML; },
  });
}

add('openTimePicker（已有选中时间）', 'openTimePicker', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian', tpInitialized: false },
  dom: { tpOverlay: {}, tpDisplay: {}, tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
  fixedDate: BUILD_TS,
  pre: function (doc) { doc.getElementById('tpOverlay').style.display = 'none'; },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return {
      display: doc.getElementById('tpOverlay').style.display,
      top: doc.getElementById('tpDisplay').innerHTML,
      currentCalendar: st.currentCalendar,
      tpInitialized: st.tpInitialized,
      yearCount: (doc.getElementById('tpColYear').innerHTML.match(/class="tp-item"/g) || []).length,
      minuteCount: (doc.getElementById('tpColMinute').innerHTML.match(/class="tp-item"/g) || []).length,
    };
  },
});
add('openTimePicker（未选时间 → 先 initTime）', 'openTimePicker', [], {
  state: { selectedTime: null, currentCalendar: 'gregorian', tpInitialized: false },
  dom: { tpOverlay: {}, tpDisplay: {}, tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
  fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { display: doc.getElementById('tpOverlay').style.display, selectedTime: st.selectedTime, top: doc.getElementById('tpDisplay').innerHTML };
  },
});

add('closeTimePicker(null) 无条件关', 'closeTimePicker', [null], {
  dom: { tpOverlay: {} },
  pre: function (doc) { doc.getElementById('tpOverlay').style.display = 'flex'; },
  probe: function (doc) { return doc.getElementById('tpOverlay').style.display; },
});
add('closeTimePicker(overlay) 点到遮罩 → 关', 'closeTimePicker', [], {
  argsFn: function (doc) { return [doc.getElementById('tpOverlay')]; },
  dom: { tpOverlay: {} },
  pre: function (doc) { doc.getElementById('tpOverlay').style.display = 'flex'; },
  probe: function (doc) { return doc.getElementById('tpOverlay').style.display; },
});
add('closeTimePicker(面板内元素) → 不关', 'closeTimePicker', [], {
  argsFn: function (doc) { return [doc.getElementById('tpPanelInner')]; },
  dom: { tpOverlay: {}, tpPanelInner: {} },
  pre: function (doc) { doc.getElementById('tpOverlay').style.display = 'flex'; },
  probe: function (doc) { return doc.getElementById('tpOverlay').style.display; },
});

const SWITCH_CASES = [
  ['公历→农历', ST(2026, 9, 25, 8, 30, 'gregorian'), 'gregorian', 'lunar'],
  ['农历→公历', ST(2026, 8, 14, 8, 30, 'lunar'), 'lunar', 'gregorian'],
  ['同历法 → 早退', ST(2026, 9, 25, 8, 30, 'gregorian'), 'gregorian', 'gregorian'],
  ['农历越界月日（转换抛错 → catch 只改 calendar）', ST(2026, 13, 40, 8, 30, 'lunar'), 'lunar', 'gregorian'],
  ['未选时间（catch 里再抛）', null, 'gregorian', 'lunar'],
];
for (const s of SWITCH_CASES) {
  add('switchCalendar ' + s[0], 'switchCalendar', [s[3]], {
    state: { selectedTime: s[1], currentCalendar: s[2] },
    dom: { tpDisplay: {}, tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
    fixedDate: BUILD_TS,
    probe: function (doc, mod, side) {
      const st = side === 'legacy' ? legacy : newState;
      return { selectedTime: st.selectedTime, currentCalendar: st.currentCalendar, top: doc.getElementById('tpDisplay').innerHTML };
    },
  });
}

const GETMAX_CASES = [
  ['公历 2026-09（30 天）', ST(2026, 9, 25, 8, 30), 'gregorian'],
  ['公历 2026-02（28 天）', ST(2026, 2, 1, 8, 30), 'gregorian'],
  ['公历 2024-02（闰 29 天）', ST(2024, 2, 1, 8, 30), 'gregorian'],
  ['公历 2000-02（世纪闰 29 天）', ST(2000, 2, 1, 8, 30), 'gregorian'],
  ['公历 1900-02（世纪平 28 天）', ST(1900, 2, 1, 8, 30), 'gregorian'],
  ['公历 2026-04（30 天）', ST(2026, 4, 1, 8, 30), 'gregorian'],
  ['农历 2026-08（大月 30）', ST(2026, 8, 1, 8, 30, 'lunar'), 'lunar'],
  ['农历 2026-01（小月 29）', ST(2026, 1, 1, 8, 30, 'lunar'), 'lunar'],
  ['农历 2026-12', ST(2026, 12, 1, 8, 30, 'lunar'), 'lunar'],
  ['农历 2026-13（越界 → 兜底 30）', ST(2026, 13, 1, 8, 30, 'lunar'), 'lunar'],
  ['未选时间 → 抛错', null, 'gregorian'],
];
for (const g of GETMAX_CASES) {
  add('getMaxDay ' + g[0], 'getMaxDay', [], { state: { selectedTime: g[1], currentCalendar: g[2] } });
}

const MONTH_COL_CASES = [
  ['今年（maxM=当前月）', ST(2026, 9, 25, 8, 30), 'gregorian'],
  ['往年（maxM=12）', ST(2025, 1, 1, 8, 30), 'gregorian'],
  ['未来年', ST(2030, 1, 1, 8, 30), 'gregorian'],
  ['未选时间', null, 'gregorian'],
  ['农历往年', ST(2025, 6, 1, 8, 30, 'lunar'), 'lunar'],
];
for (const m of MONTH_COL_CASES) {
  add('renderMonthColumn ' + m[0], 'renderMonthColumn', [], {
    state: { selectedTime: m[1], currentCalendar: m[2] }, fixedDate: BUILD_TS,
  });
}

const PICKER_CASES = [
  ['公历 2026-09-25', ST(2026, 9, 25, 8, 30), 'gregorian'],
  ['公历往年 2025-01-01', ST(2025, 1, 1, 0, 0), 'gregorian'],
  ['农历 2026-08-14', ST(2026, 8, 14, 8, 30, 'lunar'), 'lunar'],
  ['未选时间 → getMaxDay 抛错', null, 'gregorian'],
];
for (const p of PICKER_CASES) {
  add('renderPicker ' + p[0], 'renderPicker', [], {
    state: { selectedTime: p[1], currentCalendar: p[2], tpInitialized: false },
    dom: { tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
    fixedDate: BUILD_TS,
    probe: function (doc, mod, side) {
      const st = side === 'legacy' ? legacy : newState;
      const cols = ['Year', 'Month', 'Day', 'Hour', 'Minute'];
      const out = { tpInitialized: st.tpInitialized, onscrollSet: {} };
      for (const c of cols) {
        const el = doc.getElementById('tpCol' + c);
        out[c + 'Count'] = (el.innerHTML.match(/class="tp-item"/g) || []).length;
        out.onscrollSet[c] = typeof el.onscroll === 'function';
      }
      out.dayHead = doc.getElementById('tpColDay').innerHTML.slice(0, 120);
      out.hourHead = doc.getElementById('tpColHour').innerHTML.slice(0, 80);
      out.minuteHead = doc.getElementById('tpColMinute').innerHTML.slice(0, 80);
      return out;
    },
  });
}

// —— scrollToCurrent / onColScroll / highlightActive：给列注入 tp-item 列表 ——
function makeItem(val, i) {
  const s = new Set();
  return {
    dataset: { val: String(val) },
    offsetTop: i * 38,
    classList: {
      _s: s,
      add: function (c) { s.add(c); },
      remove: function (c) { s.delete(c); },
      contains: function (c) { return s.has(c); },
      toggle: function (c, on) {
        if (on === undefined) { if (s.has(c)) s.delete(c); else s.add(c); }
        else if (on) s.add(c); else s.delete(c);
      },
    },
  };
}
function withItems(vals, col, scrollTop, clientHeight) {
  return function (doc) {
    const el = doc.getElementById('tpCol' + col);
    const items = vals.map(makeItem);
    el.__items = items;
    el.scrollTop = scrollTop;
    el.clientHeight = clientHeight;
    el.querySelectorAll = function () { return el.__items; };
  };
}
function itemsProbe(cols) {
  return function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    const out = { selectedTime: st.selectedTime, top: doc.getElementById('tpDisplay').innerHTML };
    for (const c of cols) {
      const el = doc.getElementById('tpCol' + c);
      out[c] = {
        scrollTop: el.scrollTop,
        active: (el.__items || []).map(function (it) { return it.classList.contains('active'); }),
      };
    }
    return out;
  };
}
const COLS5 = ['Year', 'Month', 'Day', 'Hour', 'Minute'];

add('scrollToCurrent 公历', 'scrollToCurrent', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {} },
  pre: function (doc) { for (const c of COLS5) withItems([2025, 2026, 2027], c, 0, 190)(doc); },
  fixedDate: BUILD_TS,
  probe: itemsProbe(COLS5),
});
add('scrollToCurrent 农历 23 点', 'scrollToCurrent', [], {
  state: { selectedTime: ST(2026, 8, 14, 23, 59, 'lunar'), currentCalendar: 'lunar' },
  dom: { tpDisplay: {} },
  pre: function (doc) { for (const c of COLS5) withItems([1, 2, 3], c, 0, 190)(doc); },
  fixedDate: BUILD_TS,
  probe: itemsProbe(COLS5),
});

// onColScroll：中心线 = scrollTop + clientHeight/2；item 中心 = offsetTop + 19
const YEAR_ITEMS = [2024, 2025, 2026, 2027, 2028];
for (const sc of [0, 38, 76, 190]) {
  add('onColScroll(Year) scrollTop=' + sc, 'onColScroll', ['Year'], {
    state: { selectedTime: ST(2025, 1, 1, 0, 0), currentCalendar: 'gregorian' },
    dom: { tpDisplay: {}, tpColMonth: {}, tpColDay: {}, tpColYear: {}, tpColHour: {}, tpColMinute: {} },
    pre: function (doc) {
      withItems(YEAR_ITEMS, 'Year', sc, 190)(doc);
      withItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Month', 0, 190)(doc);
      withItems([1, 2, 3], 'Day', 0, 190)(doc);
    },
    fixedDate: BUILD_TS,
    probe: itemsProbe(['Year']),
  });
}
add('onColScroll(Month) 选中月与当前不同', 'onColScroll', ['Month'], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColDay: {}, tpColMonth: {}, tpColYear: {}, tpColHour: {}, tpColMinute: {} },
  pre: function (doc) {
    withItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Month', 190, 190)(doc);
    withItems([1, 2, 3], 'Day', 0, 190)(doc);
  },
  fixedDate: BUILD_TS,
  probe: itemsProbe(['Month']),
});
add('onColScroll(Hour) 改到 12', 'onColScroll', ['Hour'], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColHour: {} },
  pre: function (doc) { withItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Hour', 456, 190)(doc); },
  fixedDate: BUILD_TS,
  probe: itemsProbe(['Hour']),
});
add('onColScroll(Minute) 无 item（桩返回空）→ 空操作', 'onColScroll', ['Minute'], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColMinute: {} },
  fixedDate: BUILD_TS,
  probe: itemsProbe(['Minute']),
});
add('onColScroll 未知列名', 'onColScroll', ['Bogus'], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColBogus: {} },
  pre: function (doc) { withItems([1, 2, 3], 'Bogus', 38, 190)(doc); },
  fixedDate: BUILD_TS,
  probe: itemsProbe(['Bogus']),
});

add('highlightActive 五列全刷', 'highlightActive', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColMonth: {}, tpColDay: {} },
  pre: function (doc) {
    withItems(YEAR_ITEMS, 'Year', 76, 190)(doc);
    withItems([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Month', 152, 190)(doc);
    withItems([1, 2, 3, 4, 5], 'Day', 76, 190)(doc);
    withItems([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Hour', 152, 190)(doc);
    withItems([0, 15, 30, 45], 'Minute', 76, 190)(doc);
  },
  fixedDate: BUILD_TS,
  probe: itemsProbe(COLS5),
});

add('updateDayColumn 当前月 25 号', 'updateDayColumn', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColDay: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { day: doc.getElementById('tpColDay').innerHTML.slice(0, 160), scrollTop: doc.getElementById('tpColDay').scrollTop, selected: st.selectedTime };
  },
});
add('updateDayColumn 31 号落在 30 天的月 → 回退', 'updateDayColumn', [], {
  state: { selectedTime: ST(2026, 4, 31, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColDay: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { count: (doc.getElementById('tpColDay').innerHTML.match(/class="tp-item"/g) || []).length, selected: st.selectedTime, top: doc.getElementById('tpDisplay').innerHTML };
  },
});
add('updateDayColumn 未来年月', 'updateDayColumn', [], {
  state: { selectedTime: ST(2030, 12, 31, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColDay: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { count: (doc.getElementById('tpColDay').innerHTML.match(/class="tp-item"/g) || []).length, selected: st.selectedTime };
  },
});
add('updateDayColumn 农历', 'updateDayColumn', [], {
  state: { selectedTime: ST(2026, 8, 14, 8, 30, 'lunar'), currentCalendar: 'lunar' },
  dom: { tpDisplay: {}, tpColDay: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { head: doc.getElementById('tpColDay').innerHTML.slice(0, 200), selected: st.selectedTime };
  },
});

add('updateMonthColumn 今年 12 月 → 回退到当前月', 'updateMonthColumn', [], {
  state: { selectedTime: ST(2026, 12, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColMonth: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return {
      count: (doc.getElementById('tpColMonth').innerHTML.match(/class="tp-item"/g) || []).length,
      scrollTop: doc.getElementById('tpColMonth').scrollTop,
      selected: st.selectedTime, top: doc.getElementById('tpDisplay').innerHTML,
      onscrollSet: typeof doc.getElementById('tpColMonth').onscroll === 'function',
    };
  },
});
add('updateMonthColumn 往年 12 月', 'updateMonthColumn', [], {
  state: { selectedTime: ST(2025, 12, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpDisplay: {}, tpColMonth: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { count: (doc.getElementById('tpColMonth').innerHTML.match(/class="tp-item"/g) || []).length, selected: st.selectedTime };
  },
});
add('updateMonthColumn 农历', 'updateMonthColumn', [], {
  state: { selectedTime: ST(2025, 6, 1, 8, 30, 'lunar'), currentCalendar: 'lunar' },
  dom: { tpDisplay: {}, tpColMonth: {} }, fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { head: doc.getElementById('tpColMonth').innerHTML.slice(0, 200), selected: st.selectedTime };
  },
});

add('confirmTimePicker 公历', 'confirmTimePicker', [], {
  state: { selectedTime: ST(2026, 9, 25, 8, 30), currentCalendar: 'gregorian' },
  dom: { tpOverlay: {}, timeDisplay: {} },
  pre: function (doc) { doc.getElementById('tpOverlay').style.display = 'flex'; },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { display: doc.getElementById('tpOverlay').style.display, time: doc.getElementById('timeDisplay').innerHTML, cal: st.selectedTime.calendar };
  },
});
add('confirmTimePicker 农历', 'confirmTimePicker', [], {
  state: { selectedTime: ST(2026, 8, 14, 8, 30, 'lunar'), currentCalendar: 'lunar' },
  dom: { tpOverlay: {}, timeDisplay: {} },
  fixedDate: BUILD_TS,
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { display: doc.getElementById('tpOverlay').style.display, time: doc.getElementById('timeDisplay').innerHTML, cal: st.selectedTime.calendar };
  },
});

// ── 5.9 init()：整合一段（老页最后一行裸调的那一个）──
add('init()（钉死 Date）', 'init', [], {
  dom: { startBtn: { disabled: true }, timeDisplay: {}, methodParams: {}, tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
  fixedDate: BUILD_TS,
  pre: function () { legacy.__imgs.length = 0; SCRATCH.new.imgs.length = 0; },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    const arr = side === 'legacy' ? legacy.__imgs : SCRATCH.new.imgs;
    return {
      selectedTime: st.selectedTime,
      currentCalendar: st.currentCalendar,
      time: doc.getElementById('timeDisplay').innerHTML,
      startDisabled: doc.getElementById('startBtn').disabled,
      methodHead: doc.getElementById('methodParams').innerHTML.slice(0, 100),
      imgs: Array.prototype.map.call(arr, function (o) { return o.src; }),
    };
  },
});
add('init() 再来一次（幂等）', 'init', [], {
  dom: { startBtn: {}, timeDisplay: {}, methodParams: {}, tpColYear: {}, tpColMonth: {}, tpColDay: {}, tpColHour: {}, tpColMinute: {} },
  fixedDate: BUILD_TS,
  state: { selectedTime: ST(2000, 1, 1, 0, 0), currentCalendar: 'lunar' },
  probe: function (doc, mod, side) {
    const st = side === 'legacy' ? legacy : newState;
    return { selectedTime: st.selectedTime, currentCalendar: st.currentCalendar, time: doc.getElementById('timeDisplay').innerHTML };
  },
});

// ── 5.10 showResultHere：用真 paipan 桩卦跑真实渲染层 ──
let REF_PAY = null;
let REF_PAY_NOTE = '';
try {
  const promptLib = require(path.join(ROOT, 'src', 'server', 'paipan', 'prompt.js'));
  const LYsrv = require(path.join(ROOT, 'src', 'server', 'paipan', 'liuyao.js'));
  const refCard = {
    topic: '我能不能和我喜欢的女生在一起',
    divinationTime: '2026-09-24 19:49:00',
    method: '手动指定',
    lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
    hexagrams: { benGua: { upper: 7, lower: 7 }, bianGua: { upper: 3, lower: 5 } },
  };
  const built = promptLib.liuyaoChartFromCard(refCard, refCard.topic);
  if (built && built.chart) {
    REF_PAY = {
      chart: built.chart,
      sizhu: built.sizhu,
      display: LYsrv.displayMeta(refCard, built.chart),
      text: LYsrv.formatChart(built.chart),
    };
  } else {
    REF_PAY_NOTE = '桩卦装不出来（promptLib.liuyaoChartFromCard 没给 chart）';
  }
} catch (e) {
  REF_PAY_NOTE = '桩卦装载抛错：' + ((e && e.message) || e);
}

if (REF_PAY) {
  const SHOW_CASES = [
    ['真桩卦（艮为山 二四爻动 → 火风鼎）', '我能不能和我喜欢的女生在一起', 'male', 'coin', '2026-09-24 19:49'],
    ['空事项', '', 'female', 'auto', ''],
    ['带 HTML 的事项', '<b>能不能</b> & 成', 'male', 'manual', '2026-09-24 19:49'],
  ];
  for (const s of SHOW_CASES) {
    add('showResultHere ' + s[0], 'showResultHere', [], {
      argsFn: function () {
        return [{
          topic: s[1], gender: s[2], method: s[3], divinationTime: s[4],
          createdAt: '2026-09-24T11:49:00.000Z',
          lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
        }, cloneSpec(REF_PAY)]; // 渲染层可能往 chart/display 上补字段 → 两侧各一份
      },
      dom: { resultArea: {}, startBtn: {} },
      hostGlobals: { currentRecordId: null },
      pre: function (doc) { doc.getElementById('resultArea').innerHTML = '哨兵'; },
      probe: function (doc) {
        return {
          html: doc.getElementById('resultArea').innerHTML,
          startText: doc.getElementById('startBtn').textContent,
          startDisabled: doc.getElementById('startBtn').disabled,
        };
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 跑对拍
// ─────────────────────────────────────────────────────────────────────────────
// ⚠ 必须**深拷贝**再注入。用例里的 `state` 规格是两侧共用的一份字面量；直接赋值的话
//   老侧先跑、把 `selectedTime.month/day`（switchCalendar / onColScroll）或
//   `MANUAL_LINES[i]`（cycleManualLine）**原地改掉**，新侧再跑时起点已经变了 ——
//   于是「同一份输入」根本不同，红得毫无意义。这正是「先怀疑用例」那一类错。
function cloneSpec(v) {
  try { return structuredClone(v); } catch (e) { return v; }
}
function injectState(target, spec) {
  if (!spec) return;
  for (const k of Object.keys(spec)) {
    const v = cloneSpec(spec[k]);
    if (k === 'COIN') Object.assign(target.COIN, v);
    else target[k] = v;
  }
}

function cloneArgs(a) {
  try { return structuredClone(a); } catch (e) { return a; }
}

function runCase(c, side) {
  const isOld = side === 'legacy';
  const mod = isOld ? legacy : logic;
  const doc = isOld ? legacy.document : newDoc;
  const st = isOld ? legacy : newState;

  if (c.pre) c.pre(doc, mod, side);
  injectState(st, c.state);
  if (c.hostGlobals) {
    // 渲染层那几个裸名全局：老侧住在 vm 沙箱上，新侧住在宿主 globalThis 上
    Object.assign(isOld ? legacy : globalThis, c.hostGlobals);
  }
  applyDomSetup(doc, c.dom);

  const fn = mod[c.fn];
  if (typeof fn !== 'function') {
    throw new Error('两侧之一的 `' + c.fn + '` 不是函数（导出漏了？）');
  }
  const args = c.argsFn ? c.argsFn(doc, mod, side) : cloneArgs(c.args || []);
  const ret = fn.apply(mod, args);
  if (c.probe) return { ret: ret, probe: c.probe(doc, mod, side) };
  return ret;
}

function runSide(c, side) {
  const body = function () { return runCase(c, side); };
  const withRand = c.fixedRandom ? function () { return withFixedRandom(side, RANDOM_SEQ, body); } : body;
  const withDate = c.fixedDate ? function () { return withFixedDate(side, c.fixedDate, withRand); } : withRand;
  return safe(withDate);
}

const results = { total: 0, pass: 0, fail: 0, red: [], perFn: new Map(), skipped: [] };
for (const c of CASES) {
  results.total++;
  results.perFn.set(c.fn, (results.perFn.get(c.fn) || 0) + 1);
  const a = runSide(c, 'legacy');
  const b = runSide(c, 'new');
  const same = a.ok === b.ok && deepEqual(a.value, b.value);
  if (same) {
    results.pass++;
    if (VERBOSE) console.log('  ok   ' + c.name);
  } else {
    results.fail++;
    results.red.push({
      name: c.name,
      fn: c.fn,
      path: firstDiffPath(a.value, b.value),
      oldOk: a.ok,
      newOk: b.ok,
      oldVal: a.value,
      newVal: b.value,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 逐字比对：快照 48 个顶层函数 ↔ logic.js 同名函数
//    （剥注释与空白、归一化 `export ` 与 `state.` 前缀之后逐字比）
// ─────────────────────────────────────────────────────────────────────────────
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (state === '"' || state === "'" || state === '`') {
      out += c;
      if (c === '\\') { out += n; i += 2; continue; }
      if (c === state) state = null;
      i++;
      continue;
    }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') state = c;
    out += c;
    i++;
  }
  return out;
}

/** 从 `start` 处的函数声明里，按花括号配对切出完整函数文本。 */
function sliceBraces(src, start) {
  let depth = 0;
  let seen = false;
  let state = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (state === '"' || state === "'" || state === '`') {
      if (c === '\\') { i++; continue; }
      if (c === state) state = null;
      continue;
    }
    if (c === '/' && n === '/') { state = '//'; i++; continue; }
    if (c === '/' && n === '*') { state = '/*'; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { state = c; continue; }
    if (c === '{') { depth++; seen = true; continue; }
    if (c === '}') {
      depth--;
      if (seen && depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function extractFunctions(src) {
  const out = new Map();
  const re = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    if (out.has(name)) continue; // 同名重复声明只取第一处（老页 getYearZhi 有过两个）
    const body = sliceBraces(src, m.index);
    if (body) out.set(name, body);
  }
  return out;
}

function normalizeFn(code) {
  return code
    .replace(/\bexport\b/g, '')
    .replace(/\bstate\./g, '')
    .replace(/\s+/g, '');
}

const oldFns = extractFunctions(stripComments(SNAP_SRC));
const newFns = extractFunctions(stripComments(LOGIC_SRC));
const verbatim = {
  sameNormalized: [], diffNormalized: [], missing: [], sameRaw: 0,
  // 只归一化 `export `、**保留** `state.` 的中间挡位：这一挡一致 = 该函数一行都没被
  // 机械改写（连 state 都没碰）；不一致 = 它含有 `state.` 前缀改写。用来把
  // 「48 个逐字一致」拆成「N 个完全没动 + M 个只多了 state. 前缀」。
  sameWithoutState: [], touchedByState: [],
};
for (const [name, body] of oldFns) {
  if (!newFns.has(name)) { verbatim.missing.push(name); continue; }
  const rawSame = body.replace(/\s+/g, '') === newFns.get(name).replace(/\s+/g, '');
  if (rawSame) verbatim.sameRaw++;
  if (normalizeFn(body) === normalizeFn(newFns.get(name))) verbatim.sameNormalized.push(name);
  else verbatim.diffNormalized.push({ name, old: body, new: newFns.get(name) });
  const onlyExport = (s) => s.replace(/\bexport\b/g, '').replace(/\s+/g, '');
  if (onlyExport(body) === onlyExport(newFns.get(name))) verbatim.sameWithoutState.push(name);
  else verbatim.touchedByState.push(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. 报告
// ─────────────────────────────────────────────────────────────────────────────
const NOT_COVERED = [
  ['startDivination', 'async + 真 fetch：要真网络/真后端才跑得动，桩里跑它等于测桩本身'],
  ['bindDocumentClick', '桩的 document.addEventListener 是 no-op，观察不到；真正生效由 drive 脚本在真浏览器里证'],
  ['bindPageLifecycle', '同上（Node 全局连 addEventListener 都没有）'],
];
const COVERED_FNS = Array.from(results.perFn.keys()).sort();

console.log('════════════════════════════════════════════════════════════════');
console.log('六爻主页搬迁 · logic.js ↔ 老快照 差分');
console.log('判据：duipan/legacy_ref/page-liuyao.js（payload sha256 0796c79c…ffdf82）');
console.log('新实现：src/app/liuyao/logic.js（' + LOGIC_SRC.split('\n').length + ' 行）');
console.log('');

console.log('── 桩自检（先证明桩不是橡皮章，再拿它对拍）──');
let selfFail = 0;
for (const sc of selfChecks) {
  try {
    sc.fn();
    console.log('ok    ' + sc.name);
  } catch (e) {
    selfFail++;
    console.log('FAIL  ' + sc.name + '\n        → ' + ((e && e.message) || e));
  }
}
console.log('');

console.log('── 对拍 ──');
console.log('用例 ' + results.total + ' 例，红 ' + results.fail + ' 例，绿 ' + results.pass + ' 例');
console.log('覆盖函数（' + COVERED_FNS.length + ' 个）：' + COVERED_FNS.join(' '));
console.log('未覆盖（' + NOT_COVERED.length + ' 个）：');
for (const n of NOT_COVERED) console.log('  - ' + n[0] + '：' + n[1]);
console.log('（`init()` / `showResultHere()` 用「钉死 Date + 真桩卦」覆盖，见上表。）');
console.log('');
console.log('每个函数的用例数：');
const fnNames = Array.from(results.perFn.keys()).sort();
for (const n of fnNames) console.log('  ' + n + '=' + results.perFn.get(n));
console.log('');

console.log('── 逐字比对（快照 48 个顶层函数，按花括号配对切出）──');
console.log('切出：老 ' + oldFns.size + ' 个 / 新 ' + newFns.size + ' 个（新的多出 bindDocumentClick / bindPageLifecycle）');
console.log('剥注释+空白+归一化 `export `/`state.` 后：'
  + verbatim.sameNormalized.length + ' 个逐字一致 / ' + verbatim.diffNormalized.length + ' 个有差异'
  + '（缺同名 ' + verbatim.missing.length + ' 个）');
console.log('不归一化（只剥空白）：' + verbatim.sameRaw + ' 个逐字一致 / '
  + (oldFns.size - verbatim.sameRaw - verbatim.missing.length) + ' 个仅因 `export `/`state.` 前缀而不同');
// 中间挡位：只摘掉 `export `、保留 `state.`。这一挡把 48 拆成两份证据 ——
// 「一行都没动」的那些（连 state 都没碰）和「只多了 state. 前缀」的那些。
console.log('只归一化 `export `（保留 `state.`）：' + verbatim.sameWithoutState.length
  + ' 个连 state 都没碰 / ' + verbatim.touchedByState.length + ' 个只是被加了 `state.` 前缀');
if (verbatim.touchedByState.length) console.log('  被 state 改写的：' + verbatim.touchedByState.join(' '));
if (verbatim.missing.length) console.log('  缺同名：' + verbatim.missing.join(' '));
for (const d of verbatim.diffNormalized) {
  let k = 0;
  while (k < d.old.length && d.old[k] === d.new[k]) k++;
  console.log('  差异 ' + d.name + '：老第 ' + k + ' 字符起不同');
  console.log('    老: …' + show(d.old.slice(Math.max(0, k - 40), k + 120), 200));
  console.log('    新: …' + show(d.new.slice(Math.max(0, k - 40), k + 120), 200));
}
console.log('');

console.log('── 红例 ──');
if (!results.red.length) {
  console.log('（无）');
} else {
  const lim = Math.min(results.red.length, 40);
  for (let i = 0; i < lim; i++) {
    const r = results.red[i];
    console.log('✗ ' + r.name + '   [fn=' + r.fn + ']');
    console.log('   第一处不同：' + (r.path || '(整个返回值)'));
    console.log('   老(' + (r.oldOk ? 'ok' : '抛') + '): ' + show(r.oldVal));
    console.log('   新(' + (r.newOk ? 'ok' : '抛') + '): ' + show(r.newVal));
  }
  if (results.red.length > lim) console.log('… 还有 ' + (results.red.length - lim) + ' 条未列');
}
console.log('');

if (REF_PAY_NOTE) console.log('⚠ showResultHere 用例已跳过：' + REF_PAY_NOTE + '\n');

const verbatimFail = verbatim.missing.length + verbatim.diffNormalized.length;
console.log('── 结论 ──');
if (selfFail || results.fail || verbatimFail) {
  console.log('不绿：桩自检 ' + selfFail + ' 条、对拍 ' + results.fail + ' 例、逐字 '
    + verbatimFail + ' 个。先怀疑用例，再怀疑实现。');
} else {
  console.log('全绿：桩自检 ' + selfChecks.length + ' 条通过；对拍 ' + results.total
    + ' 例全过；快照 48 个函数归一化后逐字一致。');
}

restoreGlobals();
globalThis.setTimeout = HOST_TIMERS.setTimeout;
globalThis.clearTimeout = HOST_TIMERS.clearTimeout;
globalThis.setInterval = HOST_TIMERS.setInterval;
globalThis.clearInterval = HOST_TIMERS.clearInterval;
process.exitCode = (selfFail || results.fail || verbatimFail) ? 1 : 0;

/**
 * 梅花易数起卦页（`/mhys/`）的 **纯函数差分脚本**：新实现 vs 冻住的老快照。
 * ==========================================================================
 *
 *   node duipan/diff_mhys.mjs            # 正常对拍
 *   node duipan/diff_mhys.mjs --verbose  # 只列全部通过的用例名
 *
 * 判据 = `duipan/legacy_ref/page-mhys.js`（payload sha256
 * aad85d443209eaaa4e2080397480b5f163a76fc3049047b3adb762ca32b37f81），由父代理提供的
 * `duipan/legacy_mhys.js` 用 `node:vm` + DOM 桩加载。新实现在 `src/app/mhys/logic.js`。
 *
 * 覆盖用户点名的 14 个函数：
 *   wuxingShengKe triToLines linesToTri guaToLines buildLines calcGua(★重语料)
 *   getShichen xunKongFromDayGZ parseReportNumbers parseSplitDigits buildQiguaRequest
 *   selectedTimeToIso getMaxDay enrichTimeInfo
 * 外加 `buildQiguaRequest` 会读的 `fillManualSelects`（顺带覆盖下拉的 options 语义）。
 *
 * 红了的处理顺序（用户明说）：**先怀疑用例，不要先怀疑实现**。每一处红都要给出
 * 「为什么是用例错」的证据；只有证据站不住才动实现。
 */
import './register_css_stub.mjs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { makeDocument, installGlobals, applyDomSetup } from './mhys_dom_stub.mjs';

const require = createRequire(import.meta.url);
const VERBOSE = process.argv.includes('--verbose');

// ==========================================================================
// 1. 装载两侧
// ==========================================================================
// 顺序要紧：老脚本装载时会执行 `init()`（快照最后一行），所以**先**把假定时器
// 装上，再 require legacy_mhys.js，最后才 installGlobals（它会再装一次并返回
// 还原函数）。否则 node 进程会被 `setInterval(updateTimeDisplay, 30000)` 挂住。
const stopFakeTimersEarly = (() => {
  const orig = globalThis.setInterval;
  globalThis.setInterval = function (fn, ms) { return { __fake: true, fn, ms }; };
  globalThis.clearInterval = function () {};
  return () => { globalThis.setInterval = orig; };
})();

const L = require('./legacy_mhys.js');
const legacy = L.loadLegacy();
stopFakeTimersEarly();

const newDoc = makeDocument();
const restoreGlobals = installGlobals(newDoc);

// ★ 把老沙箱里的**库全局**搬进 Node 真实全局 —— 这是最重要的一步「同一份输入」。
//
// 真浏览器里，`<script src="/js/lunar.min.js">` 这类 classic script 在**全局命名空间**里
// 留下 `Lunar` / `Solar` / `TRIGRAMS` / `renderResult` …，`page-mhys.js` 与新页的
// `logic.js` 都按**裸名**读它们。第一次跑这份差分时少了这一步，21 条红全是
// 「`Lunar` 是 undefined」的连带症状（`selectedTimeToIso` 返回 null、
// `getMaxDay` 走 `return 30` 兜底、`enrichTimeInfo` 整个 `typeof Solar !== 'undefined'`
// 块被跳过）——**是用例的错，不是实现的错**：老侧拿的是真库，新侧拿的是空气。
//
// 只搬宿主上**还没有**的名字，绝不覆盖 `Date`/`console`/`document` 这些 Node 自带的
// （老沙箱自己也带着一份 `Date`，覆盖了会把对拍搞成拿沙箱比沙箱）。
const HOST_KEEP = new Set(Object.getOwnPropertyNames(globalThis));
let movedGlobals = 0;
for (const k of Object.getOwnPropertyNames(legacy)) {
  if (HOST_KEEP.has(k)) continue;
  if (k === 'window' || k === 'globalThis' || k === 'document') continue;
  globalThis[k] = legacy[k];
  movedGlobals++;
}
// 搬完之后断言：新模块真的会按裸名读的那几个必须在（缺了就是 ReferenceError，
// 报得很响不静默；这里提前把话说清楚，免得红一片还去猜）。
//
// ⚠ 这份清单里**故意没有 `refreshAIPanel`**：它由 `src/web/js/ai_panel.js:327` 定义，
//   而父代理给的 `legacy_mhys.js` 的 PREREQS 只灌 `hexagrams_data.js` + `mhys_render.js`
//   （不算错：纯函数对拍用不到 AI 面板）。真浏览器里这一页**会**加载 ai_panel.js
//   （新 index.html 的七条传统 script 之一），所以那个全局是存在的，
//   `logic.js::showResultHere()` 里 `typeof refreshAIPanel === 'function'` 为真。
//   差分脚本只验「这个函数没把它读崩」，验不了 AI 面板本身 —— 那要靠驱页脚本。
const REQUIRED_GLOBALS = ['TRIGRAMS', 'Lunar', 'Solar', 'renderResult', 'renderAnalysis'];
for (const g of REQUIRED_GLOBALS) {
  if (globalThis[g] === undefined) {
    console.error(`装载失败：全局 \`${g}\` 没搬过来，新实现按裸名读它会 ReferenceError`);
    process.exit(2);
  }
}
if (!globalThis.TRIGRAMS) { console.error('装载失败：TRIGRAMS 缺失'); process.exit(2); }

const { state: newState } = await import('../src/app/mhys/logic.js');
const logic = await import('../src/app/mhys/logic.js');

// 老侧的 DOM 桩（与新侧同形状、不同实例；形状一致性见 mhys_dom_stub.mjs 头注释）
function legacyDoc() { return legacy.document; }

// ==========================================================================
// 2. 比较与差异定位
// ==========================================================================
/** 抛错也当值比：两侧必须抛出**同一条消息**。 */
function safe(fn) {
  try { return { ok: true, value: fn() }; }
  catch (e) { return { ok: false, value: { __threw: String(e && e.message || e) } }; }
}

/** 记录键的出现顺序，用来把 JSON 字符串的差异映回路径。 */
function keyOrder(value, path, out) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) keyOrder(value[i], path + '[' + i + ']', out);
    return;
  }
  for (const k of Object.keys(value)) {
    out.push(path ? path + '.' + k : k);
    keyOrder(value[k], path ? path + '.' + k : k, out);
  }
}

/** JSON 字符串第一处不同 → 映射成 `benGua.lines[3].moving` 这样的路径。 */
function firstDiffPath(a, b) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa === sb) return null;
  const mark = '<<DIFF_HERE>>';
  let i = 0;
  const max = Math.min(sa.length, sb.length);
  while (i < max && sa[i] === sb[i]) i++;
  const aMark = sa.slice(0, i) + mark + sa.slice(i);
  const j = aMark.indexOf(mark);
  const prefix = aMark.slice(0, j);
  // 数一下前缀里没闭合的 `{`/`[`，算出对应的路径条目下标
  let depth = 0, lastOpener = -1;
  for (let x = 0; x < prefix.length; x++) {
    const c = prefix[x];
    if (c === '{' || c === '[') { depth++; lastOpener = x; }
    else if (c === '}' || c === ']') depth--;
  }
  const order = [];
  keyOrder(a, '', order);
  // 路径条目数 ≈ 已完整展开的键 + 当前层里已枚举的键
  const consumed = (prefix.match(/"(?:[^"\\]|\\.)*":/g) || []).length +
    (prefix.match(/\[/g) || []).length;
  const path = order[Math.max(0, Math.min(consumed, order.length - 1))] || '(根)';
  // 把两侧该路径上的值都取出来，回报里能直接看
  const at = (v, p) => {
    if (p === '(根)') return v;
    return p.replace(/\[(\d+)\]/g, '.$1').split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), v);
  };
  let va, vb;
  try { va = at(a, path); } catch { va = '<取不到>'; }
  try { vb = at(b, path); } catch { vb = '<取不到>'; }
  return { path, a: va, b: vb, rawIndex: i, prefix };
}

// ==========================================================================
// 3. 用例语料
// ==========================================================================
let uid = 0;
/** @type {{name:string, fn:string, args?:any[], state?:object, dom?:object, setup?:(d:Document)=>any}[]} */
const CASES = [];
const add = (name, fn, args = [], extra = {}) => {
  uid++;
  CASES.push(Object.assign({ name: `#${String(uid).padStart(3, '0')} ${name}`, fn, args }, extra));
};

// ---- Math.random 的可控替身：`method=auto` 唯一的不确定性来源 ----
// `buildQiguaRequest()` 的 `'auto'` 分支走 `drawRandom()`（快照 :253-259）：
//   `{ upper: floor(rand*8)+1, lower: floor(rand*8)+1, moving: floor(rand*6)+1 }`
// 两侧各调一次 `Math.random()` 得到的数天然不同 —— **第一遍那条红（body.moving
// 老 3 / 新 6）就是用例的错，不是实现的错**：拿两次独立随机的结果去比相等，
// 本来就该不等。
// 换成「按调用次序发固定值」之后，两个实现拿到的是同一串输入，
// 「`auto` 分支的取数规则是否逐字一致」这才真的被测到（包括边界值 0 与 0.9999…）。
// ⚠ 替身要装到**两个不同的 `Math` 对象**上 —— 这是一处踩过的坑，记在这儿：
//   老沙箱的 `Math` **不是**宿主那个对象。`legacy_mhys.js:103` 确实把宿主的 `Math`
//   原样放进了沙箱对象，但 `vm.createContext(sb)` 会把它**上下文化**（contextify）成
//   沙箱自己的一份。所以 `globalThis.Math.random = …` 只影响新侧，老侧照旧用真随机 ——
//   第一遍这么写，两条 `auto` 用例双双见红（老 lower=4/6，新 lower=1/4），
//   红的原因**是用例的错**：两侧喂进去的不是同一串随机数。
//   正确做法是两个对象一起换（`legacy.Math` 就是沙箱里被 contextify 的那一个）。
// 用完都还原。
// ⚠ 两侧的 `Math` 是**两个不同的对象**，得各换各的。这是一处踩过的坑，记在这儿：
//   ① 新侧是 ESM，读宿主的 `globalThis.Math` —— 直接改 `Math.random` 就行。
//   ② 老沙箱里 `Math` 是**上下文自己的**那个。`legacy_mhys.js:103` 虽然把宿主的
//      `Math` 放进了沙箱对象，但 `vm.createContext(sb)` 会把它上下文化；而且
//      contextify 过的 `sb.Math` 在宿主侧**改不动**在上下文里生效的那份 ——
//      从宿主改 `legacy.Math.random` 是老侧照旧用真随机（试过，两条 auto 用例
//      双双见红，红的原因是用例的错：两侧喂进去的随机数不同）。
//      唯一可靠的办法是 `vm.runInContext` **在上下文内部**打补丁（下面 sandboxRandom）。
// 每次调用都从序列头开始：两侧各自完整地跑一遍同一串输入，这样 `auto` 分支的
// 取数规则（含 `Math.floor(rand*8)+1` 的 1..8 与 `rand*6` 的 1..6 边界）才真的被比到。
const RANDOM_SEQ = [0, 0.5, 0.9999999, 0.25, 0.75, 0.9999999];
const MATH_RANDOM_ORIG = Math.random;
/** 老沙箱里换/还原 `Math.random` 的钩子（脚本与替身都挂在沙箱对象上）。 */
const sandboxRandom = {
  install(seq) {
    let i = 0;
    legacy.__mhysRandomStub = function () { return seq[i++ % seq.length]; };
    legacy.__mhysRandomOrig = vm.runInContext('Math.random', legacy);
    vm.runInContext('Math.random = __mhysRandomStub', legacy);
  },
  restore() {
    vm.runInContext('Math.random = __mhysRandomOrig', legacy);
  },
};
function withFixedRandom(fn) {
  let i = 0;
  Math.random = function () { return RANDOM_SEQ[i++ % RANDOM_SEQ.length]; };
  sandboxRandom.install(RANDOM_SEQ);
  try { return fn(); }
  finally {
    Math.random = MATH_RANDOM_ORIG;
    sandboxRandom.restore();
  }
}

// ---- wuxingShengKe：5×5 全对 + 非五行名（走 `WUXING[x] === undefined` 的冷分支）----
const WX = ['金', '水', '木', '火', '土'];
for (const from of WX) for (const to of WX) add(`wuxingShengKe('${from}','${to}')`, 'wuxingShengKe', [from, to]);
for (const pair of [['金', undefined], [undefined, '金'], [null, null], ['', '水'], ['金木', '水'], ['A', 'B']]) {
  add(`wuxingShengKe(${JSON.stringify(pair[0])},${JSON.stringify(pair[1])})`, 'wuxingShengKe', pair);
}

// ---- triToLines / linesToTri / guaToLines / buildLines ----
// `m[num]` 用的是**数字键**，所以 '3'（字符串）会落到 `||[0,0,0]` —— 冷分支必扎。
for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 0, -1, 9, 1.5, '3', '8', '', null, undefined, NaN]) {
  add(`triToLines(${JSON.stringify(v)})`, 'triToLines', [v]);
}
for (const v of [[1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0],
  [0, 0], [0, 0, 0, 0], [], [2, 2, 2], ['1', '1', '1'], [null, null, null], [1, 1, '1']]) {
  add(`linesToTri(${JSON.stringify(v)})`, 'linesToTri', [v]);
}
for (const u of [1, 2, 3, 4, 5, 6, 7, 8]) {
  for (const l of [1, 2, 3, 4, 5, 6, 7, 8]) add(`guaToLines(${u},${l})`, 'guaToLines', [u, l]);
}
for (const pair of [[0, 3], [3, 0], [9, 9], [-1, 2], ['3', '6'], [null, null], [1, 8], [8, 1]]) {
  add(`guaToLines(${JSON.stringify(pair[0])},${JSON.stringify(pair[1])})`, 'guaToLines', pair);
}
const BL_PAIRS = [[1, 1], [1, 8], [8, 1], [8, 8], [3, 6], [6, 3], [2, 7], [7, 2], [5, 5], [4, 4]];
for (const [u, l] of BL_PAIRS) for (const m of [1, 2, 3, 4, 5, 6]) {
  add(`buildLines(${u},${l},${m})`, 'buildLines', [u, l, m]);
}
for (const m of [0, 7, -1, null]) add(`buildLines(3,6,${JSON.stringify(m)})`, 'buildLines', [3, 6, m]);

// ---- calcGua ★核心：上下卦 0..7 × 动爻 0..5 全扫 ----
for (let u = 0; u <= 7; u++) for (let l = 0; l <= 7; l++) for (let m = 0; m <= 5; m++) {
  add(`calcGua(${u},${l},${m})`, 'calcGua', [u, l, m]);
}
// 边界：越界/非数/缺参数 —— 专门盖 TRIGRAMS[undefined] / HEX64[undefined] / 无动爻 等冷分支
for (const t of [[1, 1, 6], [8, 8, 6], [8, 8, 1], [3, 6, 5], [1, 8, 2], [9, 9, 9], [0, 0, 0], [-1, -1, -1],
  [9, 1, 1], [1, 9, 1], [3, 6, 7], [3, 6, -1], [3, 6, 0], [null, null, null], [undefined, undefined, undefined],
  ['3', '6', '5'], [1.5, 2.5, 3.5], [100, 200, 300], [NaN, NaN, NaN]]) {
  add(`calcGua(${JSON.stringify(t[0])},${JSON.stringify(t[1])},${JSON.stringify(t[2])})`, 'calcGua', t);
}

// ---- getShichen：12 时辰边界 + 每段内点 + 冷值 ----
for (const h of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]) {
  add(`getShichen(${h})`, 'getShichen', [h]);
}
for (const h of [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 24, 25, -1, 8.5, '8', null, undefined, NaN]) {
  add(`getShichen(${JSON.stringify(h)}) [边界/冷值]`, 'getShichen', [h]);
}

// ---- xunKongFromDayGZ ----
for (const gz of ['甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
  '甲戌', '乙亥', '丙子', '甲午', '戊午', '庚子', '癸亥', '甲申', '丁丑', '己卯']) {
  add(`xunKongFromDayGZ('${gz}')`, 'xunKongFromDayGZ', [gz]);
}
for (const gz of ['', '甲', '甲子丑', 'ZZ', '甲Z', 'Z子', ' 甲子', '甲子 ', '0子', null, undefined, 12345, '子甲']) {
  add(`xunKongFromDayGZ(${JSON.stringify(gz)}) [冷值]`, 'xunKongFromDayGZ', [gz]);
}

// ---- parseReportNumbers ----
for (const v of ['386', '3 8 6', '3,8,6', '3，8，6', '3、8、6', '10 8 6', '12 34 56', '1 2 3',
  '1234', '1234567', '12', '1 2', '0 1 2', '1 2 0', '1 0 0', '0 0 0', '100 0 0', '8 8 6',
  '  386  ', '3  8  6', '3\n8\n6', '3\t8\t6', 'abc', '3a8', '三 八 六', '一二三', '3.8.6', '3-8-6',
  '-1 2 3', '1 2 -3', '', '   ', '\n', ',', '111 2 3', '0001 2 3', '99999 2 3', '1234567890']) {
  add(`parseReportNumbers(${JSON.stringify(v)})`, 'parseReportNumbers', [v]);
}
for (const v of [null, undefined, 386, 0, NaN, true, ['3', '8', '6']]) {
  add(`parseReportNumbers(${JSON.stringify(v)}) [冷值]`, 'parseReportNumbers', [v]);
}

// ---- parseSplitDigits ----
for (const v of ['386', '1234', '0', '0000', '1234567890', '  386  ', '3 8 6', 'abc', '3a', '一二三',
  '3.8', '-3', '', '   ', '\n', '99999']) {
  add(`parseSplitDigits(${JSON.stringify(v)})`, 'parseSplitDigits', [v]);
}
for (const v of [null, undefined, 386, 0, true]) {
  add(`parseSplitDigits(${JSON.stringify(v)}) [冷值]`, 'parseSplitDigits', [v]);
}

// ---- selectedTimeToIso（依赖模块级 `selectedTime`）----
const T = (o) => Object.assign({ year: 2024, month: 6, day: 15, hour: 8, minute: 30, calendar: 'gregorian' }, o);
for (const t of [
  T({}), T({ year: 2024, month: 1, day: 1, hour: 0, minute: 0 }),
  T({ year: 2024, month: 12, day: 31, hour: 23, minute: 59 }),
  T({ year: 1999, month: 2, day: 28, hour: 5, minute: 5 }),
  T({ year: 2024, month: 2, day: 29, hour: 12, minute: 0 }),
  T({ minute: 0 }), T({ minute: null }), T({ minute: undefined }),
  T({ hour: 0, minute: 0, year: 2030, month: 7, day: 4 }),
  T({ calendar: 'lunar' }), T({ calendar: 'lunar', year: 2024, month: 1, day: 1, hour: 0, minute: 0 }),
  T({ calendar: 'lunar', year: 2023, month: 12, day: 30, hour: 23, minute: 30 }),
  T({ calendar: 'lunar', month: 13, day: 1 }), T({ calendar: 'lunar', day: 31 }),
  T({ calendar: 'lunar', year: 1899, month: 1, day: 1 }), T({ calendar: 'lunar', year: 2100, month: 1, day: 1 }),
  T({ calendar: 'julian' }), T({ calendar: '' }), T({ calendar: undefined }),
]) {
  add(`selectedTimeToIso(${JSON.stringify(t)})`, 'selectedTimeToIso', [], { state: { selectedTime: t } });
}

// ---- getMaxDay（`getMaxDay()` 不带参，读模块级 selectedTime + currentCalendar）----
const MD = [
  [2024, 2, 'gregorian'], [2024, 1, 'gregorian'], [2024, 4, 'gregorian'], [2023, 2, 'gregorian'],
  [2000, 2, 'gregorian'], [1900, 2, 'gregorian'], [2024, 12, 'gregorian'], [2024, 6, 'gregorian'],
  [2024, 2, 'lunar'], [2023, 2, 'lunar'], [2023, 3, 'lunar'], [2024, 1, 'lunar'], [2024, 12, 'lunar'],
  [2024, 13, 'lunar'], [1889, 1, 'lunar'], [2024, 2, undefined], [2024, 2, ''], [2024, 2, 'julian'],
];
for (const [y, m, cal] of MD) {
  add(`getMaxDay(selectedTime={year:${y},month:${m}},currentCalendar=${JSON.stringify(cal)})`, 'getMaxDay', [],
    { state: { selectedTime: T({ year: y, month: m, day: 1, calendar: cal }), currentCalendar: cal } });
}

// ---- enrichTimeInfo（`if(!selectedTime) initTime()` 与 `typeof Solar==='undefined'` 都盖）----
const EN = [
  T({ year: 2024, month: 2, day: 4, hour: 10, minute: 30 }),   // 立春当日（考 *Exact() 口径）
  T({ year: 2024, month: 2, day: 3, hour: 23, minute: 59 }),
  T({ year: 2024, month: 1, day: 1, hour: 0, minute: 0 }),
  T({ year: 2024, month: 12, day: 31, hour: 12, minute: 0 }),
  T({ year: 2026, month: 9, day: 25, hour: 8, minute: 0 }),    // 用户拍板那天
  T({ minute: 0 }), T({ minute: null }),
  T({ calendar: 'lunar', year: 2024, month: 1, day: 1, hour: 0, minute: 0 }),
  T({ calendar: 'lunar', year: 2024, month: 5, day: 5, hour: 12, minute: 0 }),
  T({ calendar: 'lunar', year: 2023, month: 12, day: 30, hour: 23, minute: 30 }),
];
for (const t of EN) add(`enrichTimeInfo(${JSON.stringify(t)})`, 'enrichTimeInfo', [], { state: { selectedTime: t } });
add('enrichTimeInfo(selectedTime=null → 触发 initTime 分支)', 'enrichTimeInfo', [], { state: { selectedTime: null } });

// ---- buildQiguaRequest：每个 method 分支都要走到（成功 + 失败）----
// ⚠ 第 5 个参数必须转发：`{fixedRandom:true}` 是给 `add()` 的，不是给 `setup` 的。
//   一开始漏了这一项，两条 auto 用例的 `fixedRandom` 被静默丢掉，于是比的是两次
//   独立随机（老 5 / 新 7），看着像实现不一致 —— **又是用例的错**。
//   留这条注释是因为「辅助函数吞掉参数」这种错法完全不会报错，只能靠注释提醒。
const BQ = (name, st, dom, setup, extra) => add(name, 'buildQiguaRequest', [], Object.assign({ state: st, dom, setup }, extra || {}));
BQ('buildQiguaRequest / datetime 换算失败（selectedTime=null）',
  { selectedTime: null, currentMethod: 'time' }, { topicInput: '测试事项' });
BQ('buildQiguaRequest / method=time',
  { selectedTime: T({}), currentMethod: 'time' }, { topicInput: '测试事项' });
BQ('buildQiguaRequest / method=time（topic 空白 → trim 成空串）',
  { selectedTime: T({}), currentMethod: 'time' }, { topicInput: '   ' });
BQ('buildQiguaRequest / method=manual（越界 0/8/9）',
  { selectedTime: T({}), currentMethod: 'manual' }, { topicInput: 'X', manualUpper: '0', manualLower: '8', manualMove: '9' });
BQ('buildQiguaRequest / method=manual（空值）',
  { selectedTime: T({}), currentMethod: 'manual' }, { topicInput: 'X', manualUpper: '', manualLower: '', manualMove: '' });
BQ('buildQiguaRequest / method=manual（合法 3/6/5）',
  { selectedTime: T({}), currentMethod: 'manual' }, { topicInput: 'X', manualUpper: '3', manualLower: '6', manualMove: '5' });
BQ('buildQiguaRequest / method=manual（' + "'9'" + ' 上界外）',
  { selectedTime: T({}), currentMethod: 'manual' }, { topicInput: 'X', manualUpper: '9', manualLower: '6', manualMove: '5' });
BQ('buildQiguaRequest / method=number（"3 8 6" + 加时辰）',
  { selectedTime: T({}), currentMethod: 'number' }, { topicInput: 'X', numberInput: '3 8 6', numberAddShichen: { checked: true } });
BQ('buildQiguaRequest / method=number（"10 8 6" + 不加时辰）',
  { selectedTime: T({}), currentMethod: 'number' }, { topicInput: 'X', numberInput: '10 8 6', numberAddShichen: { checked: false } });
BQ('buildQiguaRequest / method=number（只有两个数 → 报错）',
  { selectedTime: T({}), currentMethod: 'number' }, { topicInput: 'X', numberInput: '3 8', numberAddShichen: { checked: false } });
BQ('buildQiguaRequest / method=number（全 0 → 报错）',
  { selectedTime: T({}), currentMethod: 'number' }, { topicInput: 'X', numberInput: '0 0 0', numberAddShichen: { checked: false } });
BQ('buildQiguaRequest / method=number（单字段 "386" 逐位）',
  { selectedTime: T({}), currentMethod: 'number' }, { topicInput: '', numberInput: '386', numberAddShichen: { checked: true } });
BQ('buildQiguaRequest / method=split（"386" + 加时辰）',
  { selectedTime: T({}), currentMethod: 'split' }, { topicInput: 'X', splitInput: '386', splitAddShichen: { checked: true } });
BQ('buildQiguaRequest / method=split（"0000"）',
  { selectedTime: T({}), currentMethod: 'split' }, { topicInput: 'X', splitInput: '0000', splitAddShichen: { checked: false } });
BQ('buildQiguaRequest / method=split（带分隔符反而报错）',
  { selectedTime: T({}), currentMethod: 'split' }, { topicInput: 'X', splitInput: '3 8 6', splitAddShichen: { checked: false } });
BQ('buildQiguaRequest / method=split（空 → 报错）',
  { selectedTime: T({}), currentMethod: 'split' }, { topicInput: 'X', splitInput: '', splitAddShichen: { checked: true } });
BQ('buildQiguaRequest / method=character（四字）',
  { selectedTime: T({}), currentMethod: 'character' }, { topicInput: 'X', charInput: '今天下雨' });
BQ('buildQiguaRequest / method=character（一字 → 古法未做）',
  { selectedTime: T({}), currentMethod: 'character' }, { topicInput: 'X', charInput: '卜' });
BQ('buildQiguaRequest / method=character（空 → 报错）',
  { selectedTime: T({}), currentMethod: 'character' }, { topicInput: 'X', charInput: '   ' });
BQ('buildQiguaRequest / method=auto（Math.random 固定序列，含 0 / 0.9999999 边界）',
  { selectedTime: T({}), currentMethod: 'auto' }, { topicInput: 'X' }, null, { fixedRandom: true });
BQ('buildQiguaRequest / method=auto（空 topic 也要走同一条 auto 分支）',
  { selectedTime: T({}), currentMethod: 'auto' }, { topicInput: '' }, null, { fixedRandom: true });
BQ('buildQiguaRequest / method=未知',
  { selectedTime: T({}), currentMethod: 'nonsense' }, { topicInput: 'X' });
BQ('buildQiguaRequest / method=未知（农历 selectedTime 顺带盖 selectedTimeToIso 分支）',
  { selectedTime: T({ calendar: 'lunar' }), currentMethod: 'nonsense' }, { topicInput: 'X' });
BQ('buildQiguaRequest / 农历日期非法 → datetime 换算失败',
  { selectedTime: T({ calendar: 'lunar', month: 13, day: 1 }), currentMethod: 'time' }, { topicInput: 'X' });

// ---- fillManualSelects（`options.length > 0` 的守卫 + 正常填充）----
add('fillManualSelects（三个 select 都为空 → 填充）', 'fillManualSelects', [], {
  dom: { manualUpper: { options: [] }, manualLower: { options: [] }, manualMove: { options: [] } },
});
add('fillManualSelects（options 非空 → 直接 return，一个字都不写）', 'fillManualSelects', [], {
  dom: { manualUpper: { options: ['x'] }, manualLower: { options: ['x', 'y'] }, manualMove: { options: ['z'] } },
});

// ==========================================================================
// 4. 自检：先证明桩不是橡皮章，再跑对拍
// ==========================================================================
const selfChecks = [];
function check(name, fn) {
  try { fn(); selfChecks.push({ name, ok: true }); }
  catch (e) { selfChecks.push({ name, ok: false, msg: e.message }); }
}
const fail = (m) => { throw new Error(m); };

// ① textContent → innerHTML 真转义（且不转义引号，与浏览器一致）
check('桩自检①：textContent 写 `<img src=x onerror=1>` → innerHTML 真转义', () => {
  const d = makeDocument();
  const el = d.getElementById('probe');
  el.textContent = '<img src=x onerror=1>';
  assert.equal(el.innerHTML, '&lt;img src=x onerror=1&gt;');
  assert.ok(!/^<img/.test(el.innerHTML), 'innerHTML 没有转义！');
});
check('桩自检①b：老侧桩也转义（同一份契约）', () => {
  const el = legacyDoc().getElementById('probe');
  el.textContent = '<img src=x onerror=1>';
  assert.equal(el.innerHTML, '&lt;img src=x onerror=1&gt;');
});
check('桩自检①c：转义不碰引号（浏览器 textContent 路径就不转义引号）', () => {
  const d = makeDocument();
  const el = d.getElementById('probe');
  el.textContent = `a"b'c`;
  assert.equal(el.innerHTML, `a"b'c`);
});
check('桩自检①d：`&` 与 `\\u00a0` 的转义', () => {
  const d = makeDocument();
  const el = d.getElementById('probe');
  el.textContent = 'a&b\u00a0c';
  assert.equal(el.innerHTML, 'a&amp;b&nbsp;c');
});
check('桩自检①e：innerHTML 写入是原样字符串（不二次转义）', () => {
  const d = makeDocument();
  const el = d.getElementById('probe');
  el.innerHTML = '<b style="x">y</b>';
  assert.equal(el.innerHTML, '<b style="x">y</b>');
  assert.equal(el.textContent, 'y');
});

// ② getElementById 必须认 id（否则「写进去就丢」会被误读成两侧一致）
check('桩自检②：getElementById 对同一 id 返回同一元素', () => {
  const d = makeDocument();
  assert.equal(d.getElementById('dup'), d.getElementById('dup'));
});
check('桩自检②b：honorIds:false 时**故意**不认 id —— 证明这项自检有分辨力', () => {
  const d = makeDocument({ honorIds: false });
  assert.notEqual(d.getElementById('dup'), d.getElementById('dup'));
});

// ③ 桩能反映 DOM 变化 → buildQiguaRequest 的结果必须随 DOM 变
check('桩自检③：DOM 值真的进到被测函数里（buildQiguaRequest 对数字串敏感）', () => {
  const d = makeDocument();
  applyDomSetup(d, { topicInput: 'X', numberInput: '386', numberAddShichen: { checked: true } });
  const before = globalThis.document;
  globalThis.document = d;
  try {
    newState.selectedTime = T({});
    newState.currentMethod = 'number';
    const a = JSON.stringify(logic.buildQiguaRequest());
    d.getElementById('numberInput').value = '10 8 6';
    const b = JSON.stringify(logic.buildQiguaRequest());
    if (a === b) fail('换了输入结果却没变 → 桩/实现至少有一个没在真的读 DOM');
  } finally { globalThis.document = before; }
});

// ④ 两侧的 TRIGRAMS 必须是同一个对象（否则 calcGua 的对拍就不是同一份输入）
check('桩自检④：新老两侧读的是同一份 TRIGRAMS', () => {
  assert.ok(legacy.TRIGRAMS, '老沙箱没有 TRIGRAMS');
  assert.equal(globalThis.TRIGRAMS, legacy.TRIGRAMS);
  assert.equal(typeof legacy.TRIGRAMS[1].element, 'string');
});

// ⑤ 差异定位器本身要有分辨力（否则报告里那句「第一处不同」是假的）
check('桩自检⑤：firstDiffPath 能定位到嵌套路径', () => {
  const a = { benGua: { lines: [{ pos: 6, moving: false }, { pos: 5, moving: true }] } };
  const b = { benGua: { lines: [{ pos: 6, moving: false }, { pos: 5, moving: false }] } };
  const d = firstDiffPath(a, b);
  assert.ok(d, '没定位到差异');
  assert.ok(/benGua\.lines\[1\]\.moving/.test(d.path), `定位到了 ${d.path}`);
});
check('桩自检⑤b：完全相同时返回 null', () => {
  assert.equal(firstDiffPath({ a: [1, 2] }, { a: [1, 2] }), null);
});

// ⑥ Math.random 替身必须**真的**在老沙箱里生效（这是第二处踩过的坑）。
//    只看「加补丁后 drawRandom 的取值」——它必须等于固定序列推出来的值：
//      rand=0        → upper=floor(0*8)+1=1
//      rand=0.5      → lower=5
//      rand=0.9999999→ moving=floor(0.9999999*6)+1=6
check('桩自检⑥：Math.random 替身在老沙箱内部生效（drawRandom 取到固定序列的值）', () => {
  const got = withFixedRandom(() => vm.runInContext('drawRandom()', legacy));
  assert.deepEqual(
    { upper: got.upper, lower: got.lower, moving: got.moving },
    { upper: 1, lower: 5, moving: 6 },
    `老沙箱没吃替身，drawRandom()=${JSON.stringify(got)}`
  );
});
check('桩自检⑥b：还原之后老沙箱又是真随机（替身没有永久残留）', () => {
  let same = 0;
  for (let i = 0; i < 12; i++) {
    const a = vm.runInContext('Math.random()', legacy);
    const b = vm.runInContext('Math.random()', legacy);
    if (a === b && a === 0.5) same++;
  }
  assert.equal(same, 0, '老沙箱的 Math.random 没还原回去');
});
check('桩自检⑥c：新侧替身也生效（两侧同一串输入）', () => {
  const got = withFixedRandom(() => logic.drawRandom());
  assert.deepEqual(
    { upper: got.upper, lower: got.lower, moving: got.moving },
    { upper: 1, lower: 5, moving: 6 },
    `新侧没吃替身，drawRandom()=${JSON.stringify(got)}`
  );
});

// ==========================================================================
// 5. 跑对拍
// ==========================================================================
const results = { total: 0, pass: 0, fail: 0, red: [] };

for (const c of CASES) {
  results.total++;
  // 两侧各自应用一遍（顺序：state → dom → setup），必须完全对称
  const runLegacy = () => {
    if (c.state) for (const k of Object.keys(c.state)) legacy[k] = c.state[k];
    if (c.dom) applyDomSetup(legacyDoc(), c.dom);
    if (c.setup) c.setup(legacyDoc());
    return safe(() => legacy[c.fn].apply(legacy, c.args || []));
  };
  const runNew = () => {
    if (c.state) for (const k of Object.keys(c.state)) newState[k] = c.state[k];
    if (c.dom) applyDomSetup(newDoc, c.dom);
    if (c.setup) c.setup(newDoc);
    return safe(() => logic[c.fn].apply(logic, c.args || []));
  };
  // 老侧先跑（`fillManualSelects` 这类会改 DOM，两侧各用自己的 document，互不污染）。
  // `fixedRandom` 的用例把 `Math.random` 换成**同一个固定序列**（每次从 0 开始），
  // 否则 `auto` 分支比的是两次独立随机 —— 那是用例的错（见 withFixedRandom 注释）。
  const a = c.fixedRandom ? withFixedRandom(runLegacy) : runLegacy();
  const b = c.fixedRandom ? withFixedRandom(runNew) : runNew();

  const va = a.value, vb = b.value;
  if (JSON.stringify(va) === JSON.stringify(vb)) {
    results.pass++;
    if (VERBOSE) console.log(`  ok   ${c.name}`);
    continue;
  }
  results.fail++;
  const where = firstDiffPath(va, vb);
  results.red.push({ name: c.name, where, va, vb, fn: c.fn });
}

// ==========================================================================
// 6. 报告
// ==========================================================================
console.log('梅花易数起卦页 · 纯函数差分');
console.log('  判据：duipan/legacy_ref/page-mhys.js（payload sha256 aad85d44…37f81）');
console.log('  新实现：src/app/mhys/logic.js');
console.log('');
console.log('桩自检');
for (const s of selfChecks) console.log(`  ${s.ok ? 'ok  ' : 'FAIL'} ${s.name}${s.ok ? '' : '  → ' + s.msg}`);
const selfFail = selfChecks.filter((s) => !s.ok).length;
console.log('');
console.log(`对拍：${results.total} 例，红 ${results.fail} 例，绿 ${results.pass} 例`);
// 覆盖表
const covered = [...new Set(CASES.map((c) => c.fn))].sort();
console.log(`覆盖函数（${covered.length}）：${covered.join(' ')}`);
const per = {};
for (const c of CASES) per[c.fn] = (per[c.fn] || 0) + 1;
console.log('  每个函数的用例数：' + covered.map((f) => `${f}=${per[f]}`).join('  '));
console.log('');
if (results.red.length) {
  console.log(`红例 ${results.red.length} 条（只打第一处不同的路径）：`);
  for (const r of results.red.slice(0, 40)) {
    console.log(`  ✗ ${r.name}`);
    if (r.where) {
      console.log(`      第一处不同：${r.where.path}`);
      console.log(`      老（判据）：${JSON.stringify(r.where.a)}`);
      console.log(`      新        ：${JSON.stringify(r.where.b)}`);
    } else {
      console.log(`      JSON 不同但定位器没算出来；老=${JSON.stringify(r.va).slice(0, 200)}`);
      console.log(`                                 新=${JSON.stringify(r.vb).slice(0, 200)}`);
    }
  }
  if (results.red.length > 40) console.log(`  … 还有 ${results.red.length - 40} 条未列`);
} else {
  console.log('全绿。');
}

restoreGlobals();
process.exitCode = selfFail || results.fail ? 1 : 0;

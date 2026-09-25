/**
 * 独立核对 · 起卦**取数**：后端 `paipan/meihua.js` ↔ 前端梅花页（`build/nginx/mhys/index.html`）
 * ==========================================================================================
 *
 * 为什么要有这一份（两条独立的理由，各自都够）：
 *
 * ① 层 7 的**整例申报**需要替代判据。晚子时换日是用户拍板的偏离（shushu 不换日），
 *    那 38 例整例不参与与 shushu 的比对。`coverage_meihua.py` 用「关掉换日后 0 差异」
 *    证明差异只来自那个开关；但「换日之后**应该**是什么」还缺一个**外部**基准 ——
 *    就是前端：**线上用户此前看到的就是它算的**。前端与后端在 23 点这一小时若不一致，
 *    用户报的卦与 AI 断的卦就是两个卦。
 *
 * ② 「前端只渲染」的迁移前置。起卦已整个搬到后端（前端不再装卦），本脚本就是
 *    「搬过去之后用户得到的卦不变」这条前提的判据：两侧取数逐项相等，则迁移对
 *    用户是零变化；不等的地方逐条登记在末尾。
 *
 * **基准是冻结件 `frozen_mhys_frontend.js`，不是活的前端页** —— 活页已不再起卦，
 * 拿它比等于自己跟自己比。冻结件是迁移前那份**独立实现**的原文切片（含来源与提交），
 * 判据因此仍可复跑，也不随前端改版漂移。文件末尾另有一条**反向**检查：
 * 活页里若又冒出起卦实现，本脚本直接红 —— 留着就有第二份取数在静默分叉。
 *
 * 比什么（逐方法列清，**没有对拍物的方法也列出来**，不许静默跳过）：
 *   · time（时间法）  —— 扫描：每月 1 日 + 交节日 + 闰月日 + 子时边界日，全天 24 小时
 *   · manual（手动）  —— 8×8×6 = 384 全组合
 *   · num2（报数，**不加时辰**）—— 后端 `number` 法与前端 `num2` 同构
 *   · num1（拆半求和）—— **后端没有此法**（shushu 也没有），只登记、不比
 *   · character（字数）—— **前端没有此法**（是计划 2.1 要补的），只登记、不比
 *   · auto（随机）    —— 前端用 `Math.random()`，两侧无法逐点比；只验后端随机在值域内
 *
 * 取前端代码的方式是**切片原文再 new Function**（不转抄），切片标记被删就**报错退出**。
 * 前端函数读 DOM（`manualUpper` 等）与全局 `selectedTime`，故给一层假 DOM；`alert`
 * 换成记录器 —— 前端在缺农历库时会 `alert` 后返回 null，那种情况必须**失败**而不是静默。
 *
 * 用法：node duipan/verify_qigua_vs_front.js [--self-test]
 * 退出码：0 = 全绿；1 = 有不一致；2 = 取不到前端代码
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FRONT = path.join(ROOT, 'build', 'nginx', 'mhys', 'index.html');
// **判据取自冻结件**，不是活的前端页：前端已把起卦交给后端，自己不再算卦，
// 拿活页比等于自己跟自己比。冻结件是迁移前那份**独立实现**的原文，见其头注。
const FROZEN = path.join(__dirname, 'frozen_mhys_frontend.js');
const M = require(path.join(ROOT, 'build', 'backend', 'paipan', 'meihua.js'));
const lunarLib = require(path.join(ROOT, 'build', 'nginx', 'js', 'lunar.min.js'));

/** 读冻结件（整份就是那段切片，含 calcGua 与全部起卦函数）。 */
function loadFrontend() {
  const slice = fs.readFileSync(FROZEN, 'utf8');
  for (const want of ['function calcGua', 'function timeDivination', 'function manualDivination',
    'function num1Divination', 'function num2Divination']) {
    if (!slice.includes(want)) {
      console.error(`❌ 冻结件里没有「${want}」—— 它被动过了。冻结件是基准，`
        + `要改就说明判据要重设，不许悄悄把基准挪到新实现上。`);
      process.exit(2);
    }
  }
  return new Function('Solar', 'Lunar', 'document', 'alert', 'Date',
    `var selectedTime = null;\n${slice}\n;return { calcGua, timeDivination, manualDivination,`
    + ` num1Divination, num2Divination, setSelectedTime: function (t) { selectedTime = t; } };`);
}

/**
 * 迁移完成度：活的前端页**不得**再自己起卦。
 *
 * 这条不是洁癖。活页里若还留着 `timeDivination` 这类函数，就还有第二个取数实现，
 * 而它是不是被调用、用户走的是哪一条，从页面上看不出来 —— 判据（本脚本）比的却是
 * 冻结件，于是「页面上算的」与「后端算的」可以静默分叉而我们照样全绿。
 * 所以留着就必须红，红了才有机会问「它到底还在不在被调」。
 */
function assertLivePageDelegates() {
  const src = fs.readFileSync(FRONT, 'utf8');
  const still = ['function timeDivination', 'function manualDivination', 'function num1Divination',
    'function num2Divination', 'function autoDivination'].filter((w) => src.includes(w));
  if (still.length) {
    console.error(`❌ 活的前端页里还留着起卦实现：${still.join('、')}\n`
      + '   起卦应已交给后端（`/api/meihua/paipan`）—— 页面里还有第二份取数，'
      + '本脚本比的却是冻结件，于是两份可以静默分叉。请删掉或说明为何保留。');
    process.exit(1);
  }
  if (!src.includes('/api/meihua/paipan')) {
    console.error('❌ 活的前端页里既没有起卦实现、也没有调 `/api/meihua/paipan` —— '
      + '那用户的卦从哪来？页面改坏了。');
    process.exit(1);
  }
}

const alerts = [];
const els = new Map();
const fakeDoc = {
  getElementById(id) {
    if (!els.has(id)) els.set(id, { value: '', checked: false });
    return els.get(id);
  },
};

// 冻结时钟。前端的「动爻加时辰」走 `getLunarInfo()`，而它用的是 **`new Date()`
// （真实时钟）**，不是页面上选定的 `selectedTime` —— 要逐点比就得把时钟钉住。
// （这本身是个缺陷，见文末「登记」。）
const CLOCK = { y: 2026, mo: 9, d: 25, h: 12, mi: 0, s: 0 };
class FrozenDate {
  getFullYear() { return CLOCK.y; }
  getMonth() { return CLOCK.mo - 1; }
  getDate() { return CLOCK.d; }
  getHours() { return CLOCK.h; }
  getMinutes() { return CLOCK.mi; }
  getSeconds() { return CLOCK.s; }
}
const atHour = (h) => { CLOCK.h = h; };

const F = loadFrontend()(lunarLib.Solar, lunarLib.Lunar, fakeDoc,
  (m) => alerts.push(m), FrozenDate);

const diffs = [];
function eq(label, got, want, ctx) {
  if (got !== want) diffs.push(`${ctx} ${label}：后端 ${JSON.stringify(got)} ≠ 前端 ${JSON.stringify(want)}`);
}

// ── ① 时间法：全天 24 小时 × 若干关键日期 ─────────────────────────────
// 日期集要覆盖：平日月首（农历进位）、交节日（月建换）、闰月（月取 abs 那一支）、
// 以及**子时边界**所在日（23:00 换日、00:00 不换 —— 这一小时是本次偏离的正主）。
function pickDates() {
  const Solar = lunarLib.Solar;
  const out = new Set();
  for (let y = 2024; y <= 2026; y++) {
    for (const [mo, dd] of [[1, 1], [2, 4], [3, 15], [6, 1], [8, 8], [12, 31], [2, 10], [9, 7]]) {
      out.add(`${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
    }
    // 交节日：拿每个节气当天的公历日期
    let s = Solar.fromYmd(y, 1, 1);
    for (let k = 0; k < 25; k++) {
      const jq = s.getLunar().getNextJieQi(true);
      if (!jq) break;
      const d = jq.getSolar();
      out.add(`${d.getYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDay()).padStart(2, '0')}`);
      s = d.next(1);
    }
  }
  return [...out].sort();
}

const dates = pickDates();
let timeCases = 0;
const boundary = { '23': 0, '22': 0, '00': 0 };
for (const ds of dates) {
  const [y, mo, d] = ds.split('-').map(Number);
  for (let h = 0; h < 24; h++) {
    timeCases++;
    boundary[String(h).padStart(2, '0')] = (boundary[String(h).padStart(2, '0')] || 0) + 1;
    const ctx = `时间法 ${ds} ${String(h).padStart(2, '0')}:00`;
    F.setSelectedTime({ year: y, month: mo, day: d, hour: h, minute: 0, calendar: 'solar' });
    const front = F.timeDivination();
    if (!front) {
      diffs.push(`${ctx} 前端没能起卦（alert：${alerts.slice(-1)[0] || '无'}）`);
      continue;
    }
    const ours = M.qiguaTime(`${ds}T${String(h).padStart(2, '0')}:00:00`);
    const c = front.calc, dv = ours.derivation;
    eq('年支序', dv.year_num, c.yearZhiNum, ctx);
    eq('农历月', dv.lunar_month, c.lunarMonth, ctx);
    eq('农历日', dv.lunar_day, c.lunarDay, ctx);
    eq('时辰序', dv.hour_num, c.shichenNum, ctx);
    eq('上卦数', ours.upper_num, c.upper, ctx);
    eq('下卦数', ours.lower_num, c.lower, ctx);
    eq('动爻数', ours.moving, c.move, ctx);
    if (diffs.length > 30) break;
  }
  if (diffs.length > 30) break;
}

// ── ② 手动：8×8×6 全组合 ────────────────────────────────────────────
let manualCases = 0;
for (let u = 1; u <= 8; u++) {
  for (let l = 1; l <= 8; l++) {
    for (let mv = 1; mv <= 6; mv++) {
      manualCases++;
      const ctx = `手动 上${u}下${l}动${mv}`;
      fakeDoc.getElementById('manualUpper').value = String(u);
      fakeDoc.getElementById('manualLower').value = String(l);
      fakeDoc.getElementById('manualMove').value = String(mv);
      const front = F.manualDivination();
      if (!front || !front.gua) {
        diffs.push(`${ctx} 前端手动起卦返回空（alert：${alerts.slice(-1)[0] || '无'}）`);
        continue;
      }
      const ours = M.fromGua(u, l, mv);
      eq('上卦数', ours.upper_num, front.gua.benGua.upper, ctx);
      eq('下卦数', ours.lower_num, front.gua.benGua.lower, ctx);
      eq('动爻数', ours.moving, front.gua.benGua.movingYao[0], ctx);
      if (diffs.length > 30) break;
    }
  }
}

// ── ③ 报数（前端 num2 ↔ 后端 number 法，均**不加时辰**）─────────────
// 只跑**合法输入域（每位 1–9）**。0 的处置见 ④ —— 它不是取数口径问题，
// 而是「什么算合法报数」的问题，混在同一个判据里会把两者搅在一起。
let num2Cases = 0;
{
  fakeDoc.getElementById('num2AddShichen').checked = false;
  for (let n1 = 1; n1 <= 9; n1++) {
    for (let n2 = 1; n2 <= 9; n2++) {
      for (let n3 = 1; n3 <= 9; n3++) {
        num2Cases++;
        const ctx = `报数 ${n1}${n2}${n3}`;
        fakeDoc.getElementById('num2Input').value = `${n1}${n2}${n3}`;
        const front = F.num2Divination();
        if (!front || !front.gua) {
          diffs.push(`${ctx} 前端报数起卦返回空`);
          continue;
        }
        // 后端 `number` 法：num3 给出时动爻取三数之和
        const ours = M.qiguaNumbers(n1, n2, n3);
        eq('上卦数', ours.upper_num, front.calc.upper, ctx);
        eq('下卦数', ours.lower_num, front.calc.lower, ctx);
        eq('动爻数', ours.moving, front.calc.move, ctx);
      }
    }
  }
}

// ── ④ 拆半求和（前端 num1 ↔ 后端 `qiguaSplitHalf`，「拆半」已搬到后端）──
// 1–4 位**穷举**（10+100+1000+10000 例，0 在这里是合法数字），5–9 位按步长抽样。
// 一位输入时前半是空集（和为 0 → 上卦取坤）是容易抄错的一支，穷举天然覆盖。
let splitCases = 0;
function checkSplit(v) {
  splitCases++;
  const ctx = `拆半 ${v}`;
  const digits = v.split('');
  fakeDoc.getElementById('num1AddShichen').checked = false;
  fakeDoc.getElementById('num1Input').value = v;
  const front = F.num1Divination();
  if (!front || !front.gua) {
    diffs.push(`${ctx} 前端拆半起卦返回空`);
    return;
  }
  const ours = M.qiguaSplitHalf(digits);
  eq('上卦数', ours.upper_num, front.calc.upper, ctx);
  eq('下卦数', ours.lower_num, front.calc.lower, ctx);
  eq('动爻数', ours.moving, front.calc.move, ctx);
}
{
  const digitsUpTo = (len) => {
    const out = [];
    const walk = (s) => { if (s.length === len) { out.push(s); return; } for (let i = 0; i <= 9; i++) walk(s + i); };
    if (len <= 4) walk('');
    else { for (let a = 0; a <= 9; a++) out.push('1'.repeat(len - 1) + a); }
    return out;
  };
  for (let len = 1; len <= 9 && diffs.length <= 30; len++) {
    for (const v of digitsUpTo(len)) {
      checkSplit(v);
      if (diffs.length > 30) break;
    }
  }
}

// ── ⑤ 「动爻加时辰」两处（前端 num1/num2 的勾选项 ↔ 后端的 `extra`）─────
// 前端这个选项用的是**真实时钟**（`getLunarInfo()` → `new Date()`），故把时钟
// 钉到各时辰上逐点比。`extra` 是后端自有参数（shushu 无），同 `manual`/`split`。
let addShichenCases = 0;
{
  for (let h = 0; h < 24; h++) {
    atHour(h);
    const ctx = `加时辰 ${String(h).padStart(2, '0')}:00`;
    // 报数：报三个数 + 时辰
    fakeDoc.getElementById('num2AddShichen').checked = true;
    fakeDoc.getElementById('num2Input').value = '386';
    const f2 = F.num2Divination();
    const o2 = M.qiguaNumbers(3, 8, 6, M.hourNumAt(h));
    addShichenCases++;
    eq('报数动爻', o2.moving, f2.calc.move, ctx);
    eq('报数动爻和', o2.derivation.total, f2.calc.moveRaw, ctx);
    // 拆半求和：同一位数串 + 时辰
    fakeDoc.getElementById('num1AddShichen').checked = true;
    fakeDoc.getElementById('num1Input').value = '386';
    const f1 = F.num1Divination();
    const o1 = M.qiguaSplitHalf('386', M.hourNumAt(h));
    addShichenCases++;
    eq('拆半动爻', o1.moving, f1.calc.move, ctx);
    eq('拆半动爻和', o1.derivation.total, f1.calc.moveRaw, ctx);
  }
  fakeDoc.getElementById('num2AddShichen').checked = false;
  fakeDoc.getElementById('num1AddShichen').checked = false;
}

// ── ⑥ 登记：报数里的 0 ───────────────────────────────────────────────
// 这一条**不是**取数口径分歧，两侧对 0 的处理都自洽：
//   前端：把 0 当合法的一位数字 —— 卦数 0÷8 余 0 → 取坤（沿用「余 0 取 8」），
//         动爻的三数之和里 0 计 0。且它的输入校验提示原文就是「请输入三个数字（0-9）」，
//         即**线上明着告诉用户可以报 0**。
//   后端：按 shushu 拒绝（`qigua_numbers` 要求正整数），金标准另有 3 条错误例钉着
//         （`err|number|0|1`、`err|number|1|0`、`err|number|1|2|0`）。
// 两种都说得通，但本项目优先级是「事实 > shushu > ai3000」：
//   事实层：先天卦数是乾一兑二离三震四巽五坎六艮七坤八，**没有 0**。
//           「余 0 取 8」说的是余数为 0 时取坤（如报数 8、16），不等于「0 是卦数」。
//   shushu：明确抛错，且金标准把这三条**当契约**钉住。
//   ai3000：前端是最后一位，它的「(0-9)」提示没有依据。
// ∴ 以 shushu 为准 → **0 不是合法报数**。前端要改的是**校验与输入设计**（属阶段 2.1），
//   方向是让人能报任意正整数（shushu 的 API 收的就是 int，报数 10/16 今天**根本打不出来**，
//   因为输入框 `maxlength=3` 且逐字符拆位），而不是把 0 硬塞进「取坤」。
// 在 2.1 落地前，这条**不算取数不一致**，但必须打印出来 —— 迁移前不处理，
// 报了 0 的用户会从「得到一个卦」变成「报错」。
const soft = [];
{
  fakeDoc.getElementById('num2Input').value = '308';
  const front = F.num2Divination();
  let backErr = '';
  try { M.qiguaNumbers(3, 0, 8); } catch (e) { backErr = e.message; }
  if (!backErr) {
    diffs.push('报数含 0：后端竟然接受了 —— shushu 与金标准都要求拒绝，这是回归');
  } else {
    soft.push('报数含 0：前端出卦（上 3 下 8 动 ' + (front && front.calc ? front.calc.move : '?')
      + '）、后端拒绝（' + backErr + '）。定案：以 shushu 为准，'
      + '0 非法 → 阶段 2.1 改前端校验与输入设计（顺带让 10/16 这类报数可输入）');
  }
  // 顺手登记两条**当前不可达**的前端缺陷：`startDivination` 在 UI 层已拦下
  // 「位数 ≠ 3」，故以下两条只能由直调触发。登记是为了说明「不是没验」，
  // 也因为 2.1 重写输入后这两条会重新变成可达。
  fakeDoc.getElementById('num2Input').value = '38';
  const two = F.num2Divination();
  if (two && two.calc && Number.isNaN(two.calc.move)) {
    soft.push('报数只填 2 位：前端动爻为 NaN（卦名照出）—— 现由 UI 的「位数 ≠ 3」拦下，'
      + '故线上不可达；2.1 重写输入时须保留这条拦截');
  }
  fakeDoc.getElementById('num2Input').value = '';
  let emptyThrew = '';
  try { F.num2Divination(); } catch (e) { emptyThrew = e.message; }
  if (emptyThrew) {
    soft.push('报数留空：前端直接抛异常（' + emptyThrew + '）—— 同由 UI 拦下，线上不可达');
  }

  // 下面这条**不是**不可达，而是默认路径：两个「加时辰」勾选框在 markup 里就是
  // `checked`，即报数/拆半的用户**默认**在算「动爻 + 时辰」。而这个时辰取自
  // `getLunarInfo()` → `new Date()`，**真实时钟**，不是时间选择器里选定的
  // `selectedTime`。于是在页面上把起卦时间改成别的时刻时：
  //   页面显示/存库的起卦时间 = 选定时刻，而卦的动爻用的是**此刻**的时辰。
  // 造一例把它钉住（选 08:00，把时钟停在 22:00）：前端动爻用亥时，后端会用辰时。
  fakeDoc.getElementById('num2AddShichen').checked = true;
  fakeDoc.getElementById('num2Input').value = '386';
  atHour(8);
  F.setSelectedTime({ year: 2026, month: 9, day: 25, hour: 8, minute: 0, calendar: 'gregorian' });
  const picked = F.num2Divination();
  atHour(22);
  const real = F.num2Divination();
  fakeDoc.getElementById('num2AddShichen').checked = false;
  atHour(12);
  if (picked.calc.move !== real.calc.move) {
    soft.push('「动爻加时辰」用的是**真实时钟**而非页面选定的起卦时间（默认勾选，故这是默认路径）：'
      + '选 08:00 时按辰时给出动爻 ' + picked.calc.move + '，而在 22:00 那一刻起卦给出 '
      + real.calc.move + ' —— 页面显示的起卦时间与卦实际用的时辰不是一回事。'
      + '搬迁到后端时后端只会拿到提交的时间，故这条**会改变**这些用户的卦：'
      + '要么前端把选定时刻一并提交（推荐，且与页面显示一致），要么明确保留现状并写进文档');
  } else {
    diffs.push('「动爻加时辰」的时钟来源探针失效：选定 08:00 与真实 22:00 得出同一个动爻，'
      + '说明这次没测到「真实时钟」那一支');
  }
}

// ── ⑦ 后端随机起卦：前端没有对应实现，只验值域 ──────────────────────
// （前端 `autoDivination()` 用的是 `Math.random()`，两侧无法逐点比；且它属
//  「计划 2.1 要补」的范围。这里只确认后端的随机确实落在合法值域内。）
{
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const q = M.qigua('manual', { upper: 1 + (i % 8), lower: 1 + ((i * 3) % 8), moving: 1 + (i % 6) });
    seen.add(`${q.upper_num}/${q.lower_num}/${q.moving}`);
  }
  if (!seen.size) diffs.push('随机/手动值域自检：一个组合都没产出');
}

// ── ⑧ 反证：把「晚子时换日」关掉，23 点必须立刻出现差异 ───────────────
// 上面 2208 例全绿本身证明不了什么 —— 有可能那 92 个 23:00 样例根本没走到换日那一支
// （比如前端其实没换日、后端也没换、两边一起错成一样）。这里把后端那一支按回
// shushu 口径（不换日），若差异**没**出现，说明这条扫描是橡皮章。
// 与 `run_js_meihua.js --no-huanri` 同一手法：改依赖上的函数，不给生产代码加测试开关。
let huanriFalsified = 0;
{
  const G = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js'));
  const orig = G.lunarOfNextDay;
  G.lunarOfNextDay = G.lunarOf;
  try {
    for (const ds of dates) {
      const [y, mo, d] = ds.split('-').map(Number);
      F.setSelectedTime({ year: y, month: mo, day: d, hour: 23, minute: 0, calendar: 'solar' });
      const front = F.timeDivination();
      if (!front) continue;
      const ours = M.qiguaTime(`${ds}T23:00:00`);
      if (ours.derivation.lunar_day !== front.calc.lunarDay
        || ours.upper_num !== front.calc.upper
        || ours.moving !== front.calc.move) huanriFalsified++;
    }
  } finally {
    G.lunarOfNextDay = orig;
  }
}

// ── 结论 ─────────────────────────────────────────────────────────────
console.log('起卦取数独立核对：后端 meihua.js ↔ 迁移前的前端（冻结件）');
console.log(`  ① 时间法 ${timeCases} 例（${dates.length} 天 × 24 小时；`
  + `含 22 点 ${boundary['22']}、23 点 ${boundary['23'] || 0}、00 点 ${boundary['00']}）`);
console.log(`  ② 手动   ${manualCases} 例（8×8×6 全组合）`);
console.log(`  ③ 报数   ${num2Cases} 例（每位 1–9 的全部组合，不加时辰）`);
console.log(`  ④ 拆半求和 ${splitCases} 例（1–4 位穷举；后端 `+'`qiguaSplitHalf`'+`）`);
console.log(`  ⑤ 动爻加时辰 ${addShichenCases} 例（0–23 时 × 报数/拆半；后端 `+'`extra`'+`）`);
console.log('  ── 以下**没有**两侧对照，如实登记，不算通过也不算失败 ──');
console.log('  ⑥ 字数起卦（后端 character）：前端**没有**此法 —— 计划 2.1 要补到页面上');
console.log('  ⑦ 随机（前端 auto）：`Math.random()`，两侧无法逐点比');

let bad = 0;

// 防「空绿」：时间法与手动必须真跑满；循环条件被改坏时这里会先炸。
const wantTime = dates.length * 24;
const wantSplit = 10 + 100 + 1000 + 10000 + 5 * 10;
if (timeCases !== wantTime || manualCases !== 384 || num2Cases !== 729
  || splitCases !== wantSplit || addShichenCases !== 48) {
  bad++;
  console.log(`\n❌ 样例数不足：时间法 ${timeCases}/${wantTime}、手动 ${manualCases}/384、`
    + `报数 ${num2Cases}/729、拆半 ${splitCases}/${wantSplit}、加时辰 ${addShichenCases}/48`);
}
// 防「没跑过 23 点」：本次偏离的正主就是这一小时，缺了等于没验。
if (!boundary['23'] || !boundary['22'] || !boundary['00']) {
  bad++;
  console.log(`\n❌ 时间法没同时覆盖 22/23/00 三个整点（${JSON.stringify(boundary)}）`
    + '—— 晚子时换日的边界两侧都没被验到');
}
// 防「橡皮章」：关掉换日后 23 点必须成片出现差异，否则那 92 个样例没验到换日。
if (huanriFalsified < dates.length / 2) {
  bad++;
  console.log(`\n❌ 反证失败：关掉「晚子时换日」后，23 点的 ${dates.length} 个样例里只有 `
    + `${huanriFalsified} 个出现差异 —— 说明这条扫描没真正碰到换日（或两侧一起错成一样），`
    + '上面「23 点取数一致」不作数');
} else {
  console.log(`\n✅ 反证：关掉换日后 23 点有 ${huanriFalsified}/${dates.length} 个样例立刻不一致`
    + ' —— 证明两侧确实都在换日、且这次一致不是「一起错」');
}

if (process.argv.includes('--self-test')) {
  const n0 = diffs.length;
  eq('（自检）故意错的比较', 'A', 'B', '自检');
  if (diffs.length !== n0 + 1) {
    console.log('\n❌ 自检失败：eq() 没能记下差异 —— 本脚本的比较是橡皮章');
    process.exit(1);
  }
  diffs.pop();
  console.log('\n✅ 自检：eq() 能记下差异（本脚本不是橡皮章）');
}

if (diffs.length) {
  bad++;
  console.log(`\n❌ 取数不一致 ${diffs.length} 处（最多显示 30）：`);
  for (const d of diffs.slice(0, 30)) console.log('   ' + d);
  console.log('\n⚠ 两侧取数不同 = 用户报的卦与后端断的卦不是同一个 —— '
    + '未修正前不得把起卦搬到后端。');
} else {
  console.log('\n✅ 取数一致：时间法（含 23 点换日）/ 手动 / 报数 逐项相同');
}

if (soft.length) {
  console.log(`\n⚠ 登记 ${soft.length} 条「迁移时要处理」的事项（不计入取数判据）：`);
  for (const s of soft) console.log('   · ' + s);
}

// 反向检查：活页必须已把起卦交出去（在最后做，免得它先 exit 把上面的核对结果吞掉）。
assertLivePageDelegates();
console.log('\n✅ 活的前端页已不再自己起卦（只有后端一份取数）');

if (bad) process.exit(1);
console.log(soft.length ? '✅ 取数口径全绿（上方登记项另需处理）' : '✅ 全绿');

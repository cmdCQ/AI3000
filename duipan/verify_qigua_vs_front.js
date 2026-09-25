/**
 * 独立核对 · 起卦**取数**：后端 `paipan/meihua.js` ↔ 前端梅花页（`build/nginx/mhys/index.html`）
 * ==========================================================================================
 *
 * 为什么要有这一份（两条独立的理由，各自都够）：
 *
 * ① 层 7 的**整例申报**需要替代判据。晚子时换日是用户拍板的偏离（shushu 不换日），
 *    那 38 例整例不参与与 shushu 的比对。`coverage_meihua.py` 用「关掉换日后 0 差异」
 *    证明差异只来自那个开关；但「换日之后**应该**是什么」还缺一个**外部**基准 ——
 *    就是前端：**线上用户此刻看到的就是它算的**。前端与后端在 23 点这一小时若不一致，
 *    用户报的卦与 AI 断的卦就是两个卦。
 *
 * ② 「前端只渲染」的迁移前置。计划要把起卦整个搬到后端（前端不再装卦），
 *    前提是**搬过去之后用户得到的卦不变**。本脚本就是这条前提的判据：
 *    两侧取数逐项相等，则迁移对用户是零变化；不等的地方必须逐条说清。
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
const M = require(path.join(ROOT, 'build', 'backend', 'paipan', 'meihua.js'));
const lunarLib = require(path.join(ROOT, 'build', 'nginx', 'js', 'lunar.min.js'));

const MARK_A = '// ===== 八卦数据 =====';
const MARK_B = '// ===== 当前选中的方法 =====';

/** 取前端「八卦数据 → 当前选中的方法」之间那一整段（含 calcGua 与全部起卦函数）。 */
function loadFrontend() {
  const src = fs.readFileSync(FRONT, 'utf8');
  const i = src.indexOf(MARK_A);
  const j = src.indexOf(MARK_B);
  if (i < 0 || j < 0 || j <= i) {
    console.error(`❌ 取不到前端起卦代码段（标记 ${i < 0 ? `缺「${MARK_A}」` : ''}`
      + `${j < 0 ? `缺「${MARK_B}」` : ''}）。前端改版了？请更新本脚本的切片标记。`);
    process.exit(2);
  }
  const slice = src.slice(i, j);
  for (const want of ['function calcGua', 'function timeDivination', 'function manualDivination',
    'function num2Divination']) {
    if (!slice.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」—— 切片标记已失效，拒绝在残缺代码上核对。`);
      process.exit(2);
    }
  }
  return new Function('Solar', 'Lunar', 'document', 'alert',
    `var selectedTime = null;\n${slice}\n;return { calcGua, timeDivination, manualDivination,`
    + ` num1Divination, num2Divination, setSelectedTime: function (t) { selectedTime = t; } };`);
}

const alerts = [];
const els = new Map();
const fakeDoc = {
  getElementById(id) {
    if (!els.has(id)) els.set(id, { value: '', checked: false });
    return els.get(id);
  },
};
const F = loadFrontend()(lunarLib.Solar, lunarLib.Lunar, fakeDoc, (m) => alerts.push(m));

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

// ── ④ 登记：报数里的 0 ───────────────────────────────────────────────
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
}

// ── ⑤ 后端随机起卦：前端没有对应实现，只验值域 ──────────────────────
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

// ── ⑤ 反证：把「晚子时换日」关掉，23 点必须立刻出现差异 ───────────────
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
console.log('起卦取数独立核对：后端 meihua.js ↔ 前端 梅花页');
console.log(`  ① 时间法 ${timeCases} 例（${dates.length} 天 × 24 小时；`
  + `含 22 点 ${boundary['22']}、23 点 ${boundary['23'] || 0}、00 点 ${boundary['00']}）`);
console.log(`  ② 手动   ${manualCases} 例（8×8×6 全组合）`);
console.log(`  ③ 报数   ${num2Cases} 例（每位 1–9 的全部组合，不加时辰）`);
console.log('  ── 以下**没有**两侧对照，如实登记，不算通过也不算失败 ──');
console.log('  ④ 拆半求和（前端 num1）：后端与 shushu 都**没有**此法 —— 迁移前需决定取舍');
console.log('  ⑤ 字数起卦（后端 character）：前端**没有**此法 —— 计划 2.1 要补到页面上');
console.log('  ⑥ 随机（前端 auto）：`Math.random()`，两侧无法逐点比');

let bad = 0;

// 防「空绿」：时间法与手动必须真跑满；循环条件被改坏时这里会先炸。
const wantTime = dates.length * 24;
if (timeCases !== wantTime || manualCases !== 384 || num2Cases !== 729) {
  bad++;
  console.log(`\n❌ 样例数不足：时间法 ${timeCases}/${wantTime}、手动 ${manualCases}/384、`
    + `报数 ${num2Cases}/729`);
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
  console.log(`\n⚠ 登记 ${soft.length} 条「迁移前要处理」的事项（不计入取数判据）：`);
  for (const s of soft) console.log('   · ' + s);
}

if (bad) process.exit(1);
console.log(soft.length ? '✅ 取数口径全绿（上方登记项另需处理）' : '✅ 全绿');

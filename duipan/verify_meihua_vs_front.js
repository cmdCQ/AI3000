/**
 * 独立核对 · `paipan/meihua.js` ↔ 前端梅花排盘（`build/nginx/mhys/index.html`）
 * ==============================================================================
 *
 * 为什么要有这一份：
 *
 * 层 7 的对拍基准是 shushu，而 shushu 的梅花**只有三种起卦法**（time/number/
 * character），没有「手动指定」。可本项目要接一条 shushu 没有的路：
 * **拿现成的卦号装卦**。AI 对话与历史档里已经有上下卦号 + 动爻了，断卦层不必
 * 知道卦是怎么起的，所以 `meihua.js` 加了 `fromGua(upper, lower, moving)`
 * （method='manual'）。这条路**没有金标准可对**。
 *
 * 它的判据不是 shushu，而是**前端**：用户在梅花页上看到的本卦/互卦/变卦/错卦/
 * 综卦/体用/判词，全是前端 `mhys/index.html::calcGua()` 算的。后端一旦自己重算
 * 这些派生层，就必须与前端**逐项一致** —— 不然 AI 会照着与用户眼前不同的卦去
 * 解读，而这种错用户看不出来（两边都是「一个卦」，只是不是同一个）。
 *
 * 核对范围：上卦 1-8 × 下卦 1-8 × 动爻 1-6 = **384 例**（上下卦各 8 个数，
 * 组合已覆盖 64 卦序；动爻全 6 位），每例比：
 *   · 本卦/互卦/变卦/错卦/综卦 的 上下卦号
 *   · 体卦、用卦
 *   · 体用关系（五关系字面）
 *   · 本卦六爻阴阳（**顺序要对齐**：前端自上而下，本模块自下而上）
 *   · 卦名 64 条（前端 HEX64 表 ↔ 本模块 hexName）
 *
 * 取前端代码的方式是**切片原文再 new Function**，不转抄 —— 机械转写的表必须
 * 逐字相等（见 memory「逐字相等不能抽查」）。切片用标记串定位，**跨两个文件**
 * （2026-09-25 前端「只渲染」迁移把 TRIGRAMS 搬去了 `js/mhys_render.js`，HEX64
 * 等仍留在起卦页内联脚本里）；哪个标记找不到就**报错退出**，而不是静默少核一部分。
 *
 * 它挂在 `regress_meihua.sh` 上跑（⑦ 格）—— 不挂进 runner 的检查会红着烂掉没人知道
 * （2026-09-25 就是这么烂的：迁移改了文件，脚本只在 index.html 里找标记，一直 exit 2）。
 *
 * 用法：node duipan/verify_meihua_vs_front.js
 * 退出码：0 = 全绿；1 = 有不一致（附前若干条差异）；2 = 取不到前端代码。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FRONT = path.join(__dirname, '..', 'build', 'nginx', 'mhys', 'index.html');
const RENDER = path.join(__dirname, '..', 'build', 'nginx', 'js', 'mhys_render.js');
const M = require(path.join(__dirname, '..', 'build', 'backend', 'paipan', 'meihua.js'));

// ── 取前端代码（**跨两个文件**，2026-09-25 起）────────────────────────────
// 前端做「只渲染」迁移时，把「八卦数据」段（TRIGRAMS）连同渲染函数整段从
// `mhys/index.html` 搬进了 `js/mhys_render.js` —— 结果页与起卦页共用一份，起卦页
// 只 `<script src>` 引它。而 `HEX64`/`triToLines`/`calcGua` 仍留在起卦页的内联
// `<script>` 里。于是切片要跨两个文件拼：
//
//   render.js     从 A（八卦数据）到**文件末**   → TRIGRAMS
//   index.html    从 C（HEX64 起）到 B（时间计算）→ HEX64 / triToLines / calcGua
//
// 为什么用 C 而不用注释标记：`var HEX64 = {};` 就是这段代码的第一行，起点不依赖
// 谁顺手写了句注释 —— 注释会被删，代码行不会。两个文件里只要有一个标记找不到就
// exit 2：**宁可报错退出，也不许静默少核一段**（少核 = 全绿的假象）。
const A = '// ===== 八卦数据 =====';          // js/mhys_render.js
const C = 'var HEX64 = {};';                   // mhys/index.html（内联 <script> 的第一行）
const B = '// ===== 时间计算（农历） =====';    // mhys/index.html

function cut(file, from, to) {
  const src = fs.readFileSync(file, 'utf8');
  const i = src.indexOf(from);
  const j = to === null ? src.length : src.indexOf(to, i < 0 ? 0 : i + from.length);
  if (i < 0 || j <= i) {
    const which = i < 0 ? `缺「${from}」` : `缺「${to}」`;
    console.error(`❌ 取不到前端代码段（${path.relative(__dirname, file)} ${which}）。`
      + '前端改版了？请更新本脚本的切片标记。');
    process.exit(2);
  }
  return src.slice(i, j);
}

function loadFrontend() {
  const slice = cut(RENDER, A, null) + '\n' + cut(FRONT, C, B);
  // `new Function` 而不是 `eval`：eval 会把里面的 var 泄进本模块作用域。
  let f;
  try {
    f = new Function(`${slice}\n;return { TRIGRAMS, HEX64, calcGua, triToLines };`)();
  } catch (e) {
    // 切到了但拼不起来（比如某段被搬去了第三个文件）—— 同样算「取不到」，不算差异。
    console.error(`❌ 前端代码段拼不起来：${e.message}\n`
      + '   多半是其中一段又被搬去了别的文件，请更新本脚本的切片。');
    process.exit(2);
  }
  for (const k of ['TRIGRAMS', 'HEX64', 'calcGua', 'triToLines']) {
    if (f[k] === undefined) {
      console.error(`❌ 切片里没有 ${k}（切片范围不对？）—— 不核这一项等于放行。`);
      process.exit(2);
    }
  }
  return f;
}

const F = loadFrontend();

// ── 比对 ────────────────────────────────────────────────────────────
const diffs = [];
function eq(label, got, want, ctx) {
  if (got !== want) diffs.push(`${ctx} ${label}：本模块 ${JSON.stringify(got)} ≠ 前端 ${JSON.stringify(want)}`);
}

const positions = ['upper', 'lower'];
const guaNames = ['benGua', 'huGua', 'bianGua', 'cuoGua', 'zongGua'];
const OUR = { benGua: 'main', huGua: 'mutual', bianGua: 'changed', cuoGua: 'opposite', zongGua: 'reversed' };

let cases = 0;
for (let u = 1; u <= 8; u++) {
  for (let l = 1; l <= 8; l++) {
    for (let mv = 1; mv <= 6; mv++) {
      cases++;
      const ctx = `上${u}下${l}动${mv}`;
      const front = F.calcGua(u, l, mv);
      const ours = M.analyze(M.fromGua(u, l, mv), { monthDizhi: '' });

      for (const k of guaNames) {
        for (const p of positions) {
          eq(`${k}.${p}`, ours.gua[OUR[k]][p].number, front[k][p], ctx);
        }
      }
      // 体用：前端给卦号，本模块给 name/number
      eq('体卦号', ours.ti_yong.ti.number, front.ti.num, ctx);
      eq('用卦号', ours.ti_yong.yong.number, front.yong.num, ctx);
      eq('体卦名', ours.ti_yong.ti.name, front.ti.tri.name, ctx);
      eq('用卦名', ours.ti_yong.yong.name, front.yong.tri.name, ctx);
      // 关系字面：前端 '生'/'被生'/'比和'/'克'/'被克' ↔ 本模块的五个关系词
      const REL = { 用生体: '被生', 体用比和: '比和', 体克用: '克', 体生用: '生', 用克体: '被克' };
      eq('体用关系', REL[ours.relations.ti_yong.relation], front.relation, ctx);
      eq('体用基础吉凶', ours.relations.ti_yong.level, front.verdict.level, ctx);
      eq('体用 score', M.RELATION_TEXT[ours.relations.ti_yong.relation].score, front.verdict.score, ctx);

      // 本卦六爻阴阳：前端自上而下，本模块自下而上
      const frontLines = front.benGua.lines.map((x) => (x.yang ? 1 : 0));
      const ourLines = ours.gua.main.lines_yinyang.slice().reverse();
      eq('本卦六爻', ourLines.join(''), frontLines.join(''), ctx);
      // 动爻位置也要一致（前端从爻自己反推的，独立于 moveNum）
      eq('动爻', ours.moving_lines.join(','), front.benGua.movingYao.join(','), ctx);

      if (diffs.length > 40) break;
    }
    if (diffs.length > 40) break;
  }
  if (diffs.length > 40) break;
}

// ── 卦名 64 条：前端 HEX64 ↔ 本模块 hexName ──────────────────────────
const nameBad = [];
for (let u = 1; u <= 8; u++) {
  for (let l = 1; l <= 8; l++) {
    const want = F.HEX64[`${u}_${l}`];
    const got = M.hexName(u, l);
    if (got !== want) nameBad.push(`上${u}下${l}：本模块 ${got} ≠ 前端 ${want}`);
  }
}

// ── 结论 ────────────────────────────────────────────────────────────
console.log(`独立核对：meihua.js ↔ 前端 calcGua`);
console.log(`  组合 ${cases} 例（上卦 8 × 下卦 8 × 动爻 6）`);
console.log(`  每例 19 项：五卦上下卦号(10) + 体用名号(4) + 关系/吉凶/score(3) + 六爻(1) + 动爻(1)`);
console.log(`  卦名 ${64 - nameBad.length}/64`);

let bad = 0;

// 防「空绿」：样例数必须真跑满。上面遇差异会提前 break 省输出，若哪天循环条件
// 被改坏，跑 3 例也一样全绿 —— 故把「跑满 384 例」写成断言。
if (cases !== 384) {
  bad++;
  console.log(`\n❌ 只跑了 ${cases} 例，应为 384 例（上卦 8 × 下卦 8 × 动爻 6）`);
}

// 防「eq 是橡皮章」：故意比一次错的，必须能记进 diffs。
if (process.argv.includes('--self-test')) {
  const n0 = diffs.length;
  eq('（自检）故意错的比较', 'A', 'B', '自检');
  if (diffs.length !== n0 + 1) {
    bad++;
    console.log('\n❌ 自检失败：eq() 没能记下故意制造的差异 —— 本脚本的比较是橡皮章');
  } else {
    diffs.pop();
    console.log('\n✅ 自检：eq() 能记下差异（本脚本不是橡皮章）');
  }
}

if (diffs.length) {
  bad++;
  console.log(`\n❌ 排盘不一致 ${diffs.length} 处（最多显示 40）：`);
  for (const d of diffs.slice(0, 40)) console.log('   ' + d);
} else {
  console.log('\n✅ 排盘一致：五卦、体用、关系、吉凶、六爻、动爻 逐例相同');
}
if (nameBad.length) {
  bad++;
  console.log(`\n❌ 卦名不一致 ${nameBad.length} 条：`);
  for (const d of nameBad.slice(0, 10)) console.log('   ' + d);
} else {
  console.log('✅ 卦名一致：64/64（前端 HEX64 表 ↔ 本模块 getHexName，两条独立来源）');
}

if (bad) {
  console.log('\n⚠ 前后端对同一组卦号会给出不同的卦 —— 未修正前**不得**用本模块重算梅花 prompt。');
  process.exit(1);
}
console.log('\n✅ 全绿：后端重算梅花排盘与前端所见一致');

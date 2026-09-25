#!/usr/bin/env node
/**
 * 变异测试 · 梅花「字占」分层改造（`build/backend/paipan/meihua.js` + `pingze.js`）
 * ==========================================================================
 *
 * 把这次做好的每一处**逐个改回坏的**，看判据抓不抓得住。抓不住的判据就是橡皮章
 * （写了等于没写，还给假信心）。这跟 `mutate_mhys_twice.js` 是同一套办法，只是
 * 对象从「页面行为」换成「取数算法」。
 *
 * 为什么只有四条（原计划 M1–M12）：其余八条是同一条判据的**邻近扫描**（改 ceil、
 * 改边界、改文案…），抓到的红与这四条里的某一条同源。四条分别对着四个要害判据：
 *
 *   M1 分层改回笔画      —— 四字以上也去数笔画（= shushu 的老口径，即改回错法）
 *   M2 入声不覆写        —— 「日」落回今音去声 3（原文①号例当场红：上卦 7 不是 8）
 *   M3 动爻取上下卦之和  —— 这一条是**故意写得很像对**的错法（原文②号例 17÷6 余 5 才否得掉）
 *   M4 一字占放开        —— n==1 不再拒收，静默按笔画起卦（用户拍板要禁的那条）
 *
 * ── 每条挂两个判据，**分开**断言（这是本脚本最要紧的一处）────────────────────
 *   `原文`  = `node verify_meihua_zishan.js`   —— 判据取自《梅花易数》原文
 *   `对拍`  = `sh regress_meihua.sh fast --no-zishan` —— 层 7 与 shushu 的对拍那一半
 *
 * 分开的理由在 M2 上看得最清楚：**M2 对拍是绿的**。字占那 19 例整例申报之后，对拍
 * 对字占取数**不再有任何约束力**（4 字以上怎么改都落在申报范围内）。若把两条判据
 * 混在一条命令里跑，M2 只会报一句「红了」，我们就再也看不见「这一层已经管不住它了」
 * 这件事 —— 而这恰恰是当初必须另写原文判据的理由。故 M2 的期望是**原文红 + 对拍绿**，
 * 两条都按期望写死；哪天对拍突然能抓住它了（比如申报表被改窄），这里会先红给我们看。
 *
 * 另外三条对拍抓得住，而且抓的是**不同的**那一段：
 *   M1 → coverage 的「三档都跑到」（分层没了，平仄/字数档一次都没跑到）
 *   M3 → diff 的「未申报差异 151 处」，且路径落到 `character|问财|笔画[]`（2–3 字那 6 例
 *        **零申报**，它们一动就露头 —— 这正是「≤3 字不许新增 derivation 键」那条约束的用处）
 *   M4 → coverage 的「n==1 的样例全部拒收」（多报错 5 例 → 0 例）
 *
 * ── 安全 ─────────────────────────────────────────────────────────────────
 * 只改 `build/backend/paipan/` 下两个生产文件，每条跑完**按 sha256 逐字节还原**，
 * 最后再整体核一次漂移 + 原样重跑一遍完整回归（红过之后必须能回到全绿）。每条变异
 * 的窗口约 1 秒，且后端进程 require 后已缓存模块（改文件要 `docker restart` 才生效），
 * 不影响在跑的实例。
 *
 * 用法：node duipan/mutate_meihua_zishan.js [M1|M2|M3|M4]   （全跑约 10 秒）
 * 退出码：0 = 四条变异全部**按期望**红了或绿了，且文件全还原、回归恢复全绿
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PAIPAN = path.join(ROOT, 'build', 'backend', 'paipan');
const F = {
  meihua: path.join(PAIPAN, 'meihua.js'),
  pingze: path.join(PAIPAN, 'pingze.js'),
};
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before = {};
for (const k of Object.keys(F)) before[k] = sha(F[k]);

// maxBuffer 要大：M3 那种变异会让 diff 的输出涨到 1.2 MB 以上，默认 1 MB 会**抛错**，
// 抛出来的异常看着像「判据红了」，其实是脚本自己被截了。
const MAXBUF = 64 * 1024 * 1024;

function run(cmd) {
  try {
    return { code: 0, out: execSync(cmd, { cwd: __dirname, encoding: 'utf8', timeout: 300000, maxBuffer: MAXBUF }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}
const judgeUnit = () => run('node verify_meihua_zishan.js');
// `fast`：**不加的话会递归**（regress_meihua.sh 默认在最后一格调本脚本）；
// `--no-zishan`：原文判据由上面那一条单独跑，混在一起就看不出「对拍绿、原文红」。
const judgePair = () => run('sh regress_meihua.sh fast --no-zishan');

/** M2 的变异是**表数据**（表是生成物，动它的正是「入声没覆写」这个错法本身）：把「日」
 *  从第 4 档搬到第 3 档 —— 今音的「日」是去声，取数 3。改一个字的归属就够，因为原文
 *  ①号例只靠「日」这一个字就把音系钉死了。 */
function ruNotOverridden(src) {
  const lines = src.split('\n');
  const i4 = lines.findIndex((l) => /^  4: "/.test(l));
  const i3 = lines.findIndex((l) => /^  3: "/.test(l));
  if (i4 < 0 || i3 < 0) throw new Error('pingze.js 里找不到第 3/4 档（表形变了？）');
  if (!lines[i4].includes('日')) throw new Error('第 4 档里没有「日」（入声表变了？）');
  lines[i4] = lines[i4].replace('日', '');
  lines[i3] = lines[i3].replace(/",$/, '日",');
  return lines.join('\n');
}

const MUT = [
  {
    name: 'M1 分层改回笔画（四字以上也去数笔画）',
    file: 'meihua',
    from: "  if (given || n <= 3) {\n    branch = 'stroke';",
    to: "  if (true) {\n    branch = 'stroke';",
    checks: [
      { judge: '原文', fn: judgeUnit, want: 'red',
        tokens: ['「今日动静如何」上卦=8', '「今日动静如何」档=pingze', '三档（笔画/平仄/字数）都跑到'] },
      { judge: '对拍', fn: judgePair, want: 'red',
        tokens: ['❌ 字数法三档（笔画/平仄/字数）都跑到：stroke×18'] },
    ],
  },
  {
    name: 'M2 入声不覆写（「日」落回今音去声 3）',
    file: 'pingze',
    apply: ruNotOverridden,
    checks: [
      { judge: '原文', fn: judgeUnit, want: 'red',
        tokens: ['「今日动静如何」逐字取数=1,4,3,3,1,1 —— 实得 [1,3,3,3,1,1]',
                 '「今日动静如何」上卦=8 —— 实得 7', '入聲四質「質日筆出」'] },
      // ⚠ 这条是**故意**期望绿的，理由见文件头：字占整例申报之后对拍已管不住取数。
      // 它绿着，才是「必须另写原文判据」的实跑证据。
      { judge: '对拍', fn: judgePair, want: 'green', tokens: ['✅ 覆盖断言全部满足'] },
    ],
  },
  {
    name: 'M3 动爻改成上下卦数之和（长得很像对的错法）',
    file: 'meihua',
    from: '  const total = sumHead + sumTail;\n  const upperNum = wrap8(sumHead);\n'
        + '  const lowerNum = wrap8(sumTail);\n  const moving = wrap6(total);',
    to: '  const total = sumHead + sumTail;\n  const upperNum = wrap8(sumHead);\n'
      + '  const lowerNum = wrap8(sumTail);\n  const moving = wrap6(upperNum + lowerNum);',
    checks: [
      { judge: '原文', fn: judgeUnit, want: 'red',
        tokens: ['「西林」动爻=5 —— 实得 3'] },
      { judge: '对拍', fn: judgePair, want: 'red',
        tokens: ['未申报差异（151 处）', 'character|问财|笔画[]'] },
    ],
  },
  {
    name: 'M4 一字占放开（n==1 静默按笔画起卦）',
    file: 'meihua',
    from: "  if (n === 1) {\n"
        + "    throw new Error('古法一字占要按楷书分左右笔画取卦，本版未实现，请输入两个字以上'\n"
        + "      + '（也可以改用数字或时间起卦）');\n  }\n\n",
    to: '',
    checks: [
      { judge: '原文', fn: judgeUnit, want: 'red',
        tokens: ['「山」必须报错且文案含「两个字以上」 —— 却成功了'] },
      { judge: '对拍', fn: judgePair, want: 'red',
        tokens: ['❌ n==1 的样例（金标准成功）在本版全部拒收'] },
    ],
  },
];

function assertCheck(mu, chk, r) {
  const head = `${mu.name} · ${chk.judge}`;
  if (chk.want === 'red' && r.code === 0) {
    console.log(`  ✗ ${head}：应当红，实际退出码 0（判据是橡皮章？）`);
    return false;
  }
  if (chk.want === 'green' && r.code !== 0) {
    console.log(`  ✗ ${head}：应当绿，实际退出码 ${r.code}（本脚本的「抓不到」判断错了）`);
    console.log('    —— 输出尾部：\n' + r.out.split('\n').slice(-10).map((l) => '    ' + l).join('\n'));
    return false;
  }
  const missing = chk.tokens.filter((t) => !r.out.includes(t));
  if (missing.length) {
    console.log(`  ✗ ${head}：红了，但红的**不是**我指的那一处（缺 ${missing.map((t) => `「${t}」`).join('、')}）`
      + ' —— 「红了」不等于「这条判据抓住了这个错」，得看清红在哪');
    console.log('    —— 输出尾部：\n' + r.out.split('\n').slice(-10).map((l) => '    ' + l).join('\n'));
    return false;
  }
  console.log(`  ✓ ${head}：${chk.want === 'red' ? `红了，且正好红在「${chk.tokens[0]}」` : '绿（按期望：这一层抓不到它）'}`);
  return true;
}

const only = process.argv[2];
let bad = 0;
let ran = 0;      // 真的跑了的变异条数（写了过滤参数却一条都没匹配上是**错误**，不是通过）
for (const mu of MUT) {
  if (only && !mu.name.startsWith(only)) continue;
  ran += 1;
  const p = F[mu.file];
  const orig = fs.readFileSync(p, 'utf8');
  let src;
  try {
    src = mu.apply ? mu.apply(orig) : orig.replace(mu.from, mu.to);
  } catch (e) {
    console.log(`✗ ${mu.name}\n    变异生成失败：${e.message}`);
    bad += 1;
    continue;
  }
  if (src === orig) {
    console.log(`✗ ${mu.name}\n    变异点找不到（源码变了？）—— 这条**没验到**，判据仍是橡皮章嫌疑`);
    bad += 1;
    continue;
  }
  console.log(`\n${mu.name}`);
  fs.writeFileSync(p, src);
  let ok = true;
  try {
    for (const chk of mu.checks) ok = assertCheck(mu, chk, chk.fn()) && ok;
  } finally {
    fs.writeFileSync(p, orig);
  }
  const restored = sha(p) === before[mu.file];
  console.log(`  ${restored ? '✓' : '✗'} ${path.basename(p)} 已按 sha256 逐字节还原`);
  if (!restored) ok = false;
  if (!ok) bad += 1;
}

// 收尾：红过之后必须能回到全绿（同时把产物留成干净的一轮，免得下一个人拿变异产物当基线）。
// 这一轮用 `fast`（= 不跑变异套件）—— 否则就是本脚本再调一次本脚本。
console.log('\n收尾：还原后的完整回归（含原文判据）');
const final = run('sh regress_meihua.sh fast');
const finalOk = final.code === 0 && final.out.includes('✅ 层 7 梅花回归全绿')
  && final.out.includes('✅ 字占按《梅花易数·字占》原文分层');
console.log(finalOk ? '  ✓ 全绿（红过的地方都回到了绿）'
  : `  ✗ 退出码 ${final.code}\n    ${final.out.split('\n').slice(-8).join('\n    ')}`);
if (!finalOk) bad += 1;

// 过滤参数一条都没匹配上 = 什么都没验，绝不能报「全部按期望」
if (ran === 0) {
  console.log(`✗ 过滤参数「${only}」没匹配到任何一条变异 —— 什么都没验到`);
  bad += 1;
}

let drift = 0;
for (const k of Object.keys(F)) if (sha(F[k]) !== before[k]) { console.log(`✗ 文件没还原干净：${F[k]}`); drift += 1; }
console.log(drift === 0 ? '✓ 两个源文件逐字节还原（sha256 一致）' : '✗ 有文件漂移');
const full = ran === MUT.length;
console.log(bad === 0 && drift === 0
  ? `✅ ${ran} 条变异全部按期望${full ? '（三条对拍/原文俱红，一条原文红而对拍绿）' : '（只跑了部分）'}，文件全还原`
  : `❌ ${bad} 条变异未按期望 / ${drift} 个文件漂移（跑了 ${ran}/${MUT.length} 条）`);
process.exit(bad === 0 && drift === 0 ? 0 : 1);

/**
 * 八字解读**产品输出层**的守门检查（纯逻辑 + 静态文本，不起浏览器、不连网、不连库）
 * ==========================================================================
 *
 * 守的是 `build/backend/paipan/bazi_report.js` —— 2026-09-25 起八字首次解读用的
 * 「命盘评分 + 综合内容（8 模块）」那份输出规格。
 *
 * ## 为什么它不在层 15 里
 *
 * 层 15（`diff_bazi_prompt.py`）把 `bazi_prompt.js` 组装的整条 prompt 与 shushu 现场重算的
 * 那一条**逐字**比，而且**零申报**（它没有申报口子）。产品要换文案，就不能动那一层 ——
 * 故分工是：**算法留 `bazi_prompt.js`**（层 15 把守），**文案搬 `bazi_report.js`**（本脚本把守）。
 * 本脚本第 ⑥ 节反过来钉住这条边界：谁把文案抄回移植层，当场变红。
 *
 * ## 哪些断言是「能因错实现变红」的
 *
 * 这份规范的错法不是崩溃，而是**悄悄不对**，所以每条都对着一种具体的错法：
 *   · 「改了某一维的分值，忘了改总分」 → 第 ① 节从规范文本里**解析**分值再求和，不硬编码 100；
 *   · 「等级带留了个缝 / 少一档」     → 第 ② 节解析出六档区间，逐对验「无缝、相邻、不重叠」；
 *   · 「模块少一个、顺序换了」         → 第 ③ 节解析 `### N.` 编号，验 1..8 连续且名字逐字；
 *   · 「模板写了个不存在的变量名」     → 第 ④ 节用**真函数**渲染，验无 `{{}}` 残留；
 *   · 「规范里漏了禁绝绝对化 / 漏了医疗免责」→ 第 ⑤ 节；
 *   · 「顺手把文案抄回移植层」         → 第 ⑥ 节；
 *   · 「端点还挂在旧出口上」           → 第 ⑦ 节（静态读 `auth-server.js`）；
 *   · 「两块数据的空/非空形态与五段正文不一致」→ 第 ⑧ 节（含「注意：注意：」那种双层前缀）。
 *
 * ⚠ **本脚本的边界**：它只证明**规范文本与变量表**是对的，**不证明模型会照着做**。
 *   「AI 是不是真吐出了评分表和 8 个模块」只能靠真跑一次（`drive_bazi_page.js`
 *   或直接打端点），本脚本给不了这个结论。
 *
 * 用法：node duipan/check_bazi_report.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 取不到东西（模块改名/结构变了，本脚本要跟着改）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const N = (f) => path.join(ROOT, f);
const REPORT = 'build/backend/paipan/bazi_report.js';
const PORT = 'build/backend/paipan/bazi_prompt.js';

const R = require(N(REPORT));

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// 规范文本 = 两段拼起来（与 `baziReportSystem()` 同一个拼接，别自己再拼一份）
const SYSTEM = R.baziReportSystem();
const FORMAT_SRC = R.REPORT_FORMAT;

// ── 用户给的那份参考提示词里定下的**清单**（产品决定，改它要连本文件一起改）──
// 分值取自用户原稿的表格；名字取自原稿的 8 个维度。
const WANT_DIMS = [
  ['五行平衡与流通', 15],
  ['日主强弱与用神得力', 15],
  ['格局层次与清纯度', 15],
  ['十神配置与性格才能', 10],
  ['事业财运潜力', 15],
  ['婚姻感情倾向', 10],
  ['健康体质倾向', 10],
  ['大运流年配合', 10],
];
const WANT_MODULES = [
  '性格与天赋', '事业与学业', '财运与财富模式', '婚姻与感情',
  '健康与体质', '六亲与家庭', '大运流年', '开运与调整建议',
];

// ══════════════════════════════════════════════════════════════════
// ① 8 维分值：从规范里解析出来，求和必须是 100
// ══════════════════════════════════════════════════════════════════
// ⚠ **不硬编码 100** —— 硬编码的话「把某一维从 15 改成 10、忘了动总分」这种错查不出来。
console.log('\n① 命盘评分 8 维（分值从规范文本里解析）');
const dimRe = /^- \*\*(.+?)\*\* 得分\/(\d+) —— 依据：/gm;
const dims = [];
let m;
while ((m = dimRe.exec(FORMAT_SRC))) dims.push([m[1], Number(m[2])]);
check('解析出 8 维', dims.length === 8, `解析到 ${dims.length} 维：${JSON.stringify(dims)}`);
check('维度名与顺序逐字对', JSON.stringify(dims.map((d) => d[0])) === JSON.stringify(WANT_DIMS.map((d) => d[0])),
  JSON.stringify(dims.map((d) => d[0])));
check('每维分值对', JSON.stringify(dims.map((d) => d[1])) === JSON.stringify(WANT_DIMS.map((d) => d[1])),
  JSON.stringify(dims.map((d) => d[1])));
check('八维分值合计 = 100', dims.reduce((s, d) => s + d[1], 0) === 100,
  `合计 ${dims.reduce((s, d) => s + d[1], 0)}`);
check('规范里有「合计必须等于总分」这条硬要求',
  /合计必须等于总分/.test(SYSTEM), '没写这条，8 维与总分可以不一致');

// ══════════════════════════════════════════════════════════════════
// ② 等级带六档：无缝、相邻、不重叠
// ══════════════════════════════════════════════════════════════════
console.log('\n② 等级带（六档，区间从规范文本里解析）');
const bands = [];
// ⚠ 原稿写的是「90–100」这种**小到大**的顺序，故第 2 个捕获组是**下界**、第 3 个是上界。
//   我第一版把它俩接反了（hi 取了 m[2]），于是「首档上界=100」当场报红 —— 断言是对的，
//   取值的代码是错的。这类错**只有"从文本里解析出来再判"才抓得到**：硬编码
//   `bands[0].hi === 100` 的话，那条断言永远是绿的。
const bandRe = /([一-龥]{1,3})（(\d+)–(\d+)）/g;
while ((m = bandRe.exec(FORMAT_SRC))) bands.push({ name: m[1], lo: Number(m[2]), hi: Number(m[3]) });
check('解析出 5 档闭区间（第 6 档是开口的）', bands.length === 5, `解析到 ${bands.length} 档`);
check('首档上界 = 100', bands.length > 0 && bands[0].hi === 100, JSON.stringify(bands[0]));
let seam = '';
for (let i = 0; i + 1 < bands.length; i++) {
  // 降序相邻：下一档的上界必须正好是这一档下界减一（留缝/重叠都在这里露出来）
  if (bands[i].lo - 1 !== bands[i + 1].hi) {
    seam += `${bands[i].name}(${bands[i].lo}) → ${bands[i + 1].name}(${bands[i + 1].hi}) 不相邻；`;
  }
}
check('相邻两档之间既没缝也没重叠', seam === '', seam || 'OK');
check('最后一档下界 = 50，且写明「50 以下」',
  bands.length === 5 && bands[4].lo === 50 && /偏弱（50 以下）/.test(FORMAT_SRC),
  bands.length ? `最低档 ${JSON.stringify(bands[4])}` : '没解析到');
check('等级名与顺序对', JSON.stringify(bands.map((b) => b.name)) === JSON.stringify(['上上', '上', '中上', '中', '中下']),
  JSON.stringify(bands.map((b) => b.name)));

// ══════════════════════════════════════════════════════════════════
// ③ 8 个模块：编号连续、名字逐字、顺序不变
// ══════════════════════════════════════════════════════════════════
console.log('\n③ 综合内容的 8 个模块');
const mods = [];
const modRe = /^### (\d+)\. ([^：\n]+)/gm;
while ((m = modRe.exec(FORMAT_SRC))) mods.push([Number(m[1]), m[2].trim()]);
check('解析出 8 个模块', mods.length === 8, `解析到 ${mods.length} 个`);
check('编号是 1..8 且按序', JSON.stringify(mods.map((x) => x[0])) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]),
  JSON.stringify(mods.map((x) => x[0])));
check('模块名逐字对', JSON.stringify(mods.map((x) => x[1])) === JSON.stringify(WANT_MODULES),
  JSON.stringify(mods.map((x) => x[1])));
// ⚠ 标题行**必须只剩名字**（`^### N. 名字$`，行尾不能有别的东西）。
//   为什么单独判这一条：我第一版把「本节要写到哪几点」直接写在标题行上
//   （`### 1. 性格与天赋：核心性格 / 优势天赋 / …`），**模型极可能整行照抄当标题**，
//   于是那串要求就漏到用户眼前了。而上面那条名字断言**抓不到**这种错 ——
//   它的正则到「：」就停，标题带不带尾巴都照样捕获到「性格与天赋」。
//   故这里另给一条**到行尾**的严格判据，并在规范里明写「不要抄进标题」。
// ⚠ 第一版这里是 `mods.filter(([, name]) => /[\/、]/.test(name))` —— **它是橡皮章**：
//   `mods` 的正则在「：」就停了，标题后面粘一串要求，捕获到的 name 照样干净，
//   于是这条断言永远绿。变异测试当场把它抓出来了（「粘回标题行」那个变异没让它变红）。
//   改法：**另起一套到行尾的解析**，判「`### ` 后面的整行内容恰好等于 `N. 名字`」。
const titleLines = [];
const titleRe = /^###[ \t]*(.*)$/gm;
while ((m = titleRe.exec(FORMAT_SRC))) titleLines.push(m[1].trim());
const badTitle = titleLines.filter((t) => {
  const mm = /^(\d+)\. (.+)$/.exec(t);
  return !mm || !WANT_MODULES.includes(mm[2]);
});
check('每个模块标题行只有名字，没有把内容要求粘上去', badTitle.length === 0
  && titleLines.length === 8, JSON.stringify(badTitle.length ? badTitle : titleLines));
check('规范里明写「内容要求不要抄进标题」',
  /不要把下面的内容要求抄进标题/.test(FORMAT_SRC), '没写，模型会把要求抄进标题');
check('规范里写明「8 个都要有、顺序不许换」',
  /8 个都要有，顺序不许换|8 个都要有/.test(FORMAT_SRC), '没写这条，模型可以少写几个');
check('模块 5（健康）写明不是医疗诊断',
  /不是医疗诊断/.test(FORMAT_SRC) && /不是医疗诊断/.test(SYSTEM), '医疗免责没写全（规范与格式两处都要有）');
check('模块 7 要求照抄【大运一览】【未来流年】，不许自己另算',
  /必须照用户消息里【大运一览】【未来流年】/.test(FORMAT_SRC), '没写，模型会自己算年份干支');

// ══════════════════════════════════════════════════════════════════
// ④ 模板渲染：变量名一个都不许错
// ══════════════════════════════════════════════════════════════════
// ⚠ 用**真函数**渲染（`baziReportPrompt`），不是自己拼 render+baziVars：
//   自己拼的那份验不出「`baziReportPrompt` 传错了模板」。
console.log('\n④ 模板渲染（拿真盘跑一遍）');
const FULL = require(N('build/backend/paipan/bazi_full.js'));
const FORTUNE = require(N('build/backend/paipan/bazi_fortune.js'));
const YEAR = 2026;
const chart = FULL.buildBaziFull({ y: 1984, mo: 2, d: 4, h: 12, mi: 0 },
  { gender: 'male', birthYear: 1984, currentYear: YEAR });
chart.dayun = FORTUNE.calculateDayun(chart, 'male', 1984);
chart.liunian = FORTUNE.calculateLiunian(chart, 'male', 1984, YEAR, YEAR + 9);

const opts = { tab: '综合', question: '今年适合换工作吗', ragText: '', currentYear: YEAR };
let prompt = null;
try { prompt = R.baziReportPrompt(chart, opts); } catch (e) { prompt = null; }
check('渲染不抛且非空', !!prompt && prompt.length > 500, prompt ? `长度 ${prompt.length}` : '抛了/为空');
const leftover = prompt ? (prompt.match(/\{\{[^}]*\}\}/g) || []) : ['<渲染失败>'];
check('没有没被替换掉的 {{变量}}', leftover.length === 0, JSON.stringify(leftover));
check('正文以「八字命盘（」开头', !!prompt && prompt.startsWith('八字命盘（'), JSON.stringify((prompt || '').slice(0, 12)));
check('五段正文块的占位符都还在模板里（段序由移植层定，这里只要求「都用上了」）',
  ['{{overviewText}}', '{{classicalText}}', '{{relationsText}}', '{{specialPatternsText}}', '{{combosText}}']
    .every((k) => R.DEFAULT_BAZI_REPORT_PROMPT.includes(k)),
  '有段没接进模板 —— 那一节的内容就到不了模型');

// 模板里用到的每个变量都必须由 `baziReportVars` 给出（模板与变量表**互相**验）
const tplVars = [...new Set((R.DEFAULT_BAZI_REPORT_PROMPT.match(/\{\{([^}]*)\}\}/g) || [])
  .map((s) => s.slice(2, -2)))];
const provided = Object.keys(R.baziReportVars(chart, opts));
const missing = tplVars.filter((k) => provided.indexOf(k) < 0);
check('模板用到的变量变量表里都有', missing.length === 0,
  `缺 ${JSON.stringify(missing)}；变量表有 ${JSON.stringify(provided)}`);

// ══════════════════════════════════════════════════════════════════
// ⑤ 硬规则确实写在规范里
// ══════════════════════════════════════════════════════════════════
console.log('\n⑤ 规范里的硬规则');
const RULES = [
  ['禁止绝对化断言', /一定、必然、注定/, SYSTEM],
  ['依据分三级', /依据分三级/, SYSTEM],
  ['依据不足就直说（不许拿「一般来说」凑）', /依据不足/, SYSTEM],
  ['禁止复述规范 / 禁止「参考古籍」这类元信息泄漏', /不要出现「参考古籍」/, SYSTEM],
  ['禁止「综合分析来看」这类空话开场', /综合分析来看/, SYSTEM],
  ['术语要用白话括号解释（北极星：给不懂的人）', /白话解释/, SYSTEM],
  ['打分有中枢与浮动口径', /60 分是中枢/, SYSTEM],
  ['正文不许用 Markdown 表格（渲染器不支持）', /不要用 Markdown 表格/, FORMAT_SRC],
  ['追问不许重出评分表与 8 模块', /不要再输出「命盘评分」/, R.REPORT_FOLLOWUP_SYSTEM],
];
for (const [label, re, where] of RULES) check(label, re.test(where), '规范里没写这条');

// 规范本身不许含表格行（含了就等于在示范表格，模型会照着写）
check('规范文本里没有 Markdown 表格行', !/^\s*\|/m.test(SYSTEM) && !/^\s*\|/m.test(FORMAT_SRC),
  '规范里出现了以 | 开头的行');

// ══════════════════════════════════════════════════════════════════
// ⑥ 边界：文案不许被抄回移植层
// ══════════════════════════════════════════════════════════════════
console.log('\n⑥ 与移植层的边界（谁把文案抄回去，这里当场红）');
const portSrc = fs.readFileSync(N(PORT), 'utf8');
check('移植层仍是 shushu 原文（含「分析步骤：」）', /分析步骤：/.test(portSrc),
  'BAZI_SYSTEM 被改了 —— 层 15 会永久变红，且这个层没有申报口子');
check('移植层仍带旧的六步指令（层 15 的对拍对象）', /请按步骤深度分析/.test(portSrc),
  'DEFAULT_BAZI_PROMPT 被改了 —— 同上');
check('移植层里没有本层的文案（不许两份并存）',
  !/命盘评分/.test(portSrc) && !/综合命盘评分/.test(portSrc),
  '`bazi_report.js` 的文案出现在 `bazi_prompt.js` 里了');
const reportSrc = fs.readFileSync(N(REPORT), 'utf8');
check('本层复用移植层的 baziVars（没另抄一份算法）', /P\.baziVars\(/.test(reportSrc),
  '没调 baziVars');
check('本层不自己拼 JSON 块（`jsonBlock` 只该由移植层出）', !/jsonBlock\(/.test(reportSrc),
  '本层出现了 jsonBlock( —— ctx 的编码是移植层的事');
check('本层不自己算大运/流年（只读端点补挂的字段）',
  !/bazi_fortune/.test(reportSrc.replace(/\/\*[\s\S]*?\*\//g, '')),
  '本层 require 了 bazi_fortune —— 那会和端点层补挂的那一份成为两个来源');

// ══════════════════════════════════════════════════════════════════
// ⑦ 接线：端点真用上了这两份（切出来跑证明不了这个）
// ══════════════════════════════════════════════════════════════════
console.log('\n⑦ 端点接线（静态读 auth-server.js）');
const srv = fs.readFileSync(N('build/backend/auth-server.js'), 'utf8');
const seg = (() => {
  const i = srv.indexOf("pathname === '/api/bazi/parse'");
  // ⚠ 尾巴停在**下一个端点**的注释行上。这一行的字面是 `// POST /api/chat/send`
  //   （**没有** `──`），与上面 `/api/bazi/parse` 那条带 `── ──` 的不一样 ——
  //   我第一版照抄了带 `──` 的写法，于是 `j < 0`、整节报「取不到」。
  //   好处是它**退出码 2 而不是静默通过**：切片标记失效必须吵，不能悄悄变绿。
  const j = srv.indexOf('// POST /api/chat/send', i);
  if (i < 0 || j < 0 || j <= i) {
    console.error('❌ 取不到 /api/bazi/parse 那一段（auth-server.js 结构变了？）');
    process.exit(2);
  }
  return srv.slice(i, j);
})();
check('首次解读走 baziReportPrompt', /baziReportLib\.baziReportPrompt\(/.test(seg), '还挂在旧出口上');
check('首次解读的 system 走 baziReportSystem', /baziReportLib\.baziReportSystem\(/.test(seg), '没接');
check('追问单独给 system（否则会重出一整套报告）',
  /baziReportLib\.baziReportFollowUpSystem\(/.test(seg), '追问与首次共用一个 system');
check('关思考只给首次解读（追问仍开低强度思考）',
  /noThinking:\s*!followUp/.test(seg), '没这句就会出现「追问不思考 / 首次照旧思考」的反向配置');
check('排盘端点的 text 也用同一个出口',
  /baziReportLib\.baziReportPrompt\(chart, \{/.test(srv), '两个端点会漂移');
// 「今年」必须是**同一个数**：`baziChartFromParams` 里取的 `thisYear` 要回传出来给解读端点用。
// 这条本来是坏的 —— 解读端点在渲染时**又调了一次** `new Date()`，年末跨年那一瞬间
// `/api/bazi/paipan` 返回的 `text` 就会与真正喂给 AI 的那一段差一年，而「两个端点同源」
// 那段注释的立论正是不分叉。缝很小，但这类缝正是「注释说不会发生、代码里发生了」的典型。
check('解读端点用的「今年」是排盘回传的同一个数（不再各调一次 new Date）',
  /currentYear:\s*built\.thisYear/.test(seg) && /thisYear,/.test(srv),
  '又各自取了一次当前年份 —— 跨年瞬间两个端点的 prompt 会差一年');
check('端点层补挂了 chart.liunian', /chart\.liunian\s*=\s*baziFortuneLib\.calculateLiunian\(/.test(srv),
  '没补挂，【未来流年】整块不会出现（模型只能写「依据不足」）');
check('端点层仍补挂 chart.dayun', /chart\.dayun\s*=\s*baziFortuneLib\.calculateDayun\(/.test(srv),
  '没补挂，ctx 的「大运」与【大运一览】都会空');

// ══════════════════════════════════════════════════════════════════
// ⑧ 两个数据块的形态（空/非空、前导换行、不许重复加前缀）
// ══════════════════════════════════════════════════════════════════
console.log('\n⑧ 【大运一览】【未来流年】两块');
check('空数组 → 空串（整块不出现，不是留个空行）',
  R.dayunText([], YEAR) === '' && R.dayunText(undefined, YEAR) === ''
  && R.liunianText([], YEAR) === '' && R.liunianText(null, YEAR) === '',
  JSON.stringify([R.dayunText([], YEAR), R.liunianText(null, YEAR)]));
const dy = R.dayunText(chart.dayun, YEAR);
const ln = R.liunianText(chart.liunian, YEAR);
check('非空时自带前导两个换行（与五段正文块同一约定）',
  dy.startsWith('\n\n') && ln.startsWith('\n\n'), JSON.stringify([dy.slice(0, 6), ln.slice(0, 6)]));
// ⚠ 判据用**结构相等**，不是「找 `注意：注意：` 这个字面量」：
//   警告串自带的前缀可能是「⚠ 」「⚠ 重要」或「注意」（`analyzeDayunInteractions` 那两处
//   各写了一种），只找其中一个字面量，换个夹具就漏了 —— 我第一版正是这么写的，
//   变异测试当场发现那条是**哑弹**（夹具里根本没有带「注意：」的警告，改了也不红）。
//   改成「括号里的内容必须逐字等于期望串」，多叠任何一层前缀都会红。
//
// ⚠ 期望串里大运那条要**先去重**（`dedupWarnings`）：基准给的 `warnings` 有整句重复
//   （实测首步第 1、2 项逐字相同，2/10 步如此），本层在组装时清掉。这里必须跟着去重，
//   否则这条断言会因为「本层做了该做的事」而变红 —— 那就成了反向的橡皮章。
const warnsOf = (o) => (Array.isArray(o.warnings) ? o.warnings : []);
const dedup = (ws) => ws.filter((w, i) => ws.indexOf(w) === i);
const dyBad = chart.dayun.filter((d) => warnsOf(d).length
  && dy.indexOf('（' + dedup(warnsOf(d)).join('；') + '）') < 0);
const lnBad = chart.liunian.filter((l) => warnsOf(l).length
  && ln.indexOf('（' + warnsOf(l).join('；') + '）') < 0);
check('警告串原样进括号，没多叠一层前缀（实测过「注意：注意：」）',
  dyBad.length === 0 && lnBad.length === 0,
  `大运 ${dyBad.length} 步 / 流年 ${lnBad.length} 年的警告串对不上原文`);
// 去重这件事**必须有夹具能证明**：`dedup.length < 原长` 的步数 > 0，且输出里
// 「去重后的串」在、「未去重的串」不在。若哪天夹具换成没有重复项的盘，这条会因
// `dyDup.length === 0` 变红 —— 那是**有意的**：宁可知会一声，也不留一条空断言。
const dyDup = chart.dayun.filter((d) => warnsOf(d).length
  && dedup(warnsOf(d)).length < warnsOf(d).length);
check('基准给的整句重复警告在本层清掉（夹具里确有重复项，非空断言）',
  dyDup.length > 0 && dyDup.every((d) => dy.indexOf('（' + dedup(warnsOf(d)).join('；') + '）') >= 0
    && dy.indexOf('（' + warnsOf(d).join('；') + '）') < 0),
  `夹具里 ${dyDup.length} 步有整句重复；期望输出只出现一次`);
check('大运一览逐步出现，且标出当前所在', chart.dayun.length === 10
  && chart.dayun.every((d) => dy.includes(`${d.tiangan}${d.dizhi}（`))
  && dy.includes('← 当前所在'),
  `${chart.dayun.length} 步；标了当前？${dy.includes('← 当前所在')}`);
check('未来流年逐年出现，且写明地支十神不提供',
  ln.includes('地支十神本系统不提供')
  && chart.liunian.every((l) => ln.includes(`${l.year} 年 ${l.tiangan}${l.dizhi}`)),
  '缺年份或缺挡板');

console.log(fails.length
  ? `\n❌ 八字输出规格守门：${fails.length} 项失败\n   ` + fails.join('\n   ')
  : '\n✅ 八字输出规格守门：全部通过');
process.exit(fails.length ? 1 : 0);

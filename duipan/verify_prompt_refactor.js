/**
 * 对拍 · prompt 层重构前后（`auth-server.js` 改造 ↔ `duipan/old_prompt_ref.js`）
 * ==========================================================================
 *
 * 背景：`auth-server.js` 里那 500 多行手拼 prompt 的代码被抽成 `paipan/prompt.js`
 * 的「变量 + 模板」两段，`auth-server.js` 只剩「取模板 → 渲染」。抽完之后那四个
 * 构造函数的行为**必须**与抽之前一致，否则线上用户问同一卦、AI 收到的指令变了
 * —— 而这种变化没有任何报错，只有解读质量悄悄变味，用户看不出来。
 *
 * 本脚本的基准是**冻结的旧代码** `duipan/old_prompt_ref.js`（从改造前备份里原样
 * 抽出，不许改）。两边都把 `readPrompts()` 钉死成 `{}`，强制走内置默认模板 ——
 * 否则本地若真有一份 `data/prompts.json`，两边比的就不是同一套模板了。
 *
 * 比什么（每项独立判定，不合并成「总体通过」）：
 *
 *   ① 六爻正文 **逐字相同**。六爻的盘面（`formatChart`）与四个卦名变量在改造前后
 *      同源，四柱也只在前端四柱**可证实**时才改口径，故预期全样例零差异。
 *   ② 梅花**指令段**逐行保真。梅花盘面块是重做的（换上带断卦依据/体气/应期的
 *      新版排盘），数据段必然不同；但**指令段**（三段式大白话那部分）是用户唯一
 *      满意的部分，必须一字不改。做法：把旧 prompt 在「你是精通《梅花易数》」
 *      处切开，取其后全部行，要求新 prompt 里每一行都在（新增行必须**申报**）。
 *   ③ 四柱口径修正**不外溢**。造一个「前端日柱时柱都对、但年月柱是日粒度」的样例
 *      （只可能出现在交节/立春当日分界时刻之前，不猜日期、直接扫）。此处**不能**
 *      要求「差异只落在年柱/月柱那两行」—— 月建是六爻提纲，旺衰/月破/长生/综合/
 *      世身全从它来，换月支本就该连带重算一整层。正确的判据是：把旧文本里那份
 *      日粒度四柱装出来的盘换成精确版四柱装出来的盘，结果必须与新文本**逐字相同**
 *      —— 即改造对六爻正文的全部影响 = 换四柱，别无其他。
 *   ④ 四个默认模板的 `{{变量}}` **无悬挂**。模板里引用了变量表里不存在的名字时，
 *      `renderPrompt` 会原样留下 `{{foo}}` 交给 AI —— 静默、且看起来像排版事故。
 *      故逐个模板渲染一遍，断言产物里不含 `{{`。
 *   ⑤ 追问模板的 context 截断长度差异**已申报**（见 ALLOW 表）。
 *
 * 用法：node duipan/verify_prompt_refactor.js [--self-test]
 * 退出码：0 = 全绿；1 = 有不一致；2 = 取不到源码（文件被改名/标记被删）。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const OLD = require('./old_prompt_ref.js');
const promptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'prompt.js'));
const M = require(path.join(ROOT, 'build', 'backend', 'paipan', 'meihua.js'));
const LY = require(path.join(ROOT, 'build', 'backend', 'paipan', 'liuyao.js'));
const G = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js'));

// ── 申报表 ────────────────────────────────────────────────────────────
// 逐条偏离都要写明**理由**，并且核对该偏离**确实存在** —— 申报了一条实际上并不
// 存在的偏离，等于把一条真实差异误当成「已解释」放过去（本项目栽过：见 memory
// 「申报表要防撒胡椒面」）。故有 ALLOW 的项都额外做「申报非空」断言。
const ALLOW = {
  // 追问模板：旧代码内置分支截 1000 字、自定义模板分支截 1200 字（自己不一致），
  // 新代码两条路径统一 1200。取 1200 是与六爻追问一致的那一档。
  followupContext: {
    oldBuiltinLen: 1000,
    newLen: 1200,
    why: '旧代码同一份追问 prompt，内置分支 -1000、自定义模板分支 -1200（自相矛盾）；'
      + '统一取 -1200，与六爻追问一致。',
  },
  // 梅花指令段的**新增**行。旧 prompt 里没有，新 prompt 里必须有。
  mhysAddedLines: [
    {
      line: '上方【断卦依据】是算法按《体用总诀》逐条推出来的，**逐条引用它**，不要另立一套吉凶。',
      why: '新排盘块带出算法逐条推的 evidence；不点名引用，AI 会另编一套吉凶与算法打架。',
    },
  ],
  // 无事项分支：**不是漂移，是有意重做**（2026-09-25 申报）。
  // 旧：一句话 —— 「用户还没说问什么事，请先回应排盘数据，然后用一句话询问求测事项」。
  //     线上实测它**不成立**：AI 收到那句话后回「我这边还没有收到具体的卦象数据……
  //     请随意想三个数字告诉我」（六爻页事项留空点自动解析，抓包证明前端 payload 完整）。
  //     根因：旧分支没把盘面放进 prompt，AI 只看见指令、看不见卦。
  // 新：给**全盘面** + 明确「先不要下吉凶结论（用神取决于所问何事），先复述盘面、
  //     再问用户想问什么」。见 `tools/check_notopic_prompt.js`（那一层单独跑，不花 token）。
  notopicRedesign: {
    oldMarker: '用户还没说问什么事',
    // 新模板里必须**确实**有的东西 —— 少了任何一条，这条申报就是白票。
    newMarkers: ['还没有说明求测事项', '先不要下吉凶结论', '【求测事项】'],
    why: '旧分支没带盘面，线上一问就被 AI 回「还没收到卦象数据」；新分支给全盘面并要求先复述、先问，不许下吉凶。',
  },
};

// 切片窗口之外、但切片**真正会用到**的模块级依赖。用探针（把模块级声明与切片里
// 出现的标识符求交集）核对过一遍，就这几个 —— 其余命中都在注释/字符串里：
//   · baziPromptLib：`renderPrompt` 里 `baziPromptLib.renderPrompt(template, vars)`
//     —— 每次渲染都走它，不注入就是 ReferenceError（2026-09-25 实测踩到）。
//   · db：只出现在 `ensureDbUser()` 体内，本脚本不调它。给一个**一碰就炸**的桩：
//     真被调到说明比的东西变了，要响，而不是静默比出一堆「相等」。
const baziPromptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_prompt.js'));
const dbTrap = new Proxy({}, {
  get(_t, k) {
    if (k === 'query') {
      return () => { throw new Error('本脚本不该碰数据库（db.query 被调到了）—— 比的对象已经不是 prompt 层了'); };
    }
    return undefined;
  },
});

// ── 取改造后的包装函数：从 auth-server.js 切片 ────────────────────────
// 不 `require` 整个 auth-server.js —— 它末尾就 `listen()`，会在本进程里起服务、
// 还要连数据库。切出需要的那一段用 `new Function` 求值，作用域自己给。
const A = 'function buildMhysPrompt(';
const B = '// 批量入库后台任务';

// 切片里的 `readPrompts()` 会读 `DEFAULT_PROMPTS`（模块级、在切片**外**，第 261 行）。
// 不手抄一张表进来 —— 那样对拍的就不再是线上那份默认值了。照样**切原文求值**：
// 这一段只依赖 `promptLib`，正好也是已经注入的。
const DP_A = 'const DEFAULT_PROMPTS = {';
const DP_B = '\n};';

function loadDefaultPrompts(src) {
  const i = src.indexOf(DP_A);
  const j = i < 0 ? -1 : src.indexOf(DP_B, i);
  if (i < 0 || j < 0 || j <= i) {
    console.error('❌ 取不到 `DEFAULT_PROMPTS` 段 —— auth-server.js 结构变了？请更新 DP_A/DP_B。');
    process.exit(2);
  }
  const decl = src.slice(i, j) + '\n};';
  const f = new Function('promptLib', decl + '\n;return DEFAULT_PROMPTS;');
  const got = f(promptLib);
  // 「取到了但取空了」也要拦：空表会让 readPrompts 全部回落到内置模板，
  // 于是本脚本比的东西**整个换了一套**，却仍然是绿的。
  const keys = Object.keys(got || {});
  if (keys.length < 6) {
    console.error(`❌ DEFAULT_PROMPTS 只取到 ${keys.length} 个键（期望 ≥6）—— 切片或求值出错了。`);
    process.exit(2);
  }
  return got;
}

function loadNew() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const i = src.indexOf(A);
  const j = src.indexOf(B);
  if (i < 0 || j < 0 || j <= i) {
    console.error(`❌ 取不到改造后的包装函数段（标记 ${i < 0 ? `缺「${A}」` : ''}`
      + `${j < 0 ? `缺「${B}」` : ''}）。auth-server.js 结构变了？请更新本脚本的切片标记。`);
    process.exit(2);
  }
  const slice = src.slice(i, j);
  for (const want of ['function renderPrompt', 'function readPrompts', 'function buildLiuyaoFollowUpPrompt']) {
    if (!slice.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」—— 切片标记已失效，拒绝在残缺代码上对拍。`);
      process.exit(2);
    }
  }
  // `__dirname` 也要给 —— 切片里的 `PROMPTS_FILE` 用它。给的是**真实目录**
  // `build/backend`，于是「本地是否存在 prompts.json」这件事实与线上一致。
  // 2026-09-25 补 `DATA_DIR`：prompt 层重构把这一段从 13810 缩到 4828 字节，
  // `const PROMPTS_FILE = path.join(DATA_DIR, …)` 于是**落进了窗口**，而 DATA_DIR
  // 一直没注入 → 本脚本此前是**求值就崩**（一直没被发现，因为重构后没再跑过它）。
  // 给的同样是真值：`build/data`，与文件里 `path.join(__dirname, '..', 'data')` 一致。
  const f = new Function('promptLib', 'liuyaoPaipan', 'path', 'fs', 'require', '__dirname',
    'DATA_DIR', 'DEFAULT_PROMPTS', 'baziPromptLib', 'db',
    `${slice}\n;return { buildMhysPrompt, buildLiuyaoPrompt, buildFollowUpPrompt,`
    + ` buildLiuyaoFollowUpPrompt, readPrompts, renderPrompt };`);
  return f(promptLib, LY, path, fs, require, path.join(ROOT, 'build', 'backend'),
    path.join(ROOT, 'build', 'data'), loadDefaultPrompts(src), baziPromptLib, dbTrap);
}

const NEWF = loadNew();

// ── 接线自检：两边都必须是「内置默认模板」这条路 ──────────────────────
// 本地若存在 data/prompts.json，readPrompts() 就会返回它 → 两边比的是后台模板，
// 而不是我们想验的内置模板。这里直接断言读出来是空的。
const RP_OLD = OLD.readPrompts ? OLD.readPrompts() : {};
const RP_NEW = NEWF.readPrompts();
if (Object.keys(RP_OLD).length || Object.keys(RP_NEW).length) {
  console.error('❌ 有一侧读到了非空 prompts.json —— 本次对拍比的不是内置默认模板。');
  console.error(`   旧：${JSON.stringify(Object.keys(RP_OLD))} 新：${JSON.stringify(Object.keys(RP_NEW))}`);
  console.error('   请先移开 build/backend/data/prompts.json 再跑。');
  process.exit(2);
}

// ── 样例构造 ─────────────────────────────────────────────────────────
const diffs = [];
function fail(what, detail) { diffs.push(`${what}：${detail}`); }

/** 由后端模块自身生成一份**自洽**的前端载荷（卦名/体用/判词都取自重算结果）。 */
function selfConsistent(upper, lower, moving, extra) {
  const p = M.analyze(M.fromGua(upper, lower, moving), { monthDizhi: '' });
  const g = p.gua;
  const nm = (x) => ({ name: x.name, element: x.wuxing });
  const tri = (x) => ({ number: x.number, name: x.name, element: x.wuxing });
  const pack = (gg) => ({
    name: M.hexName(gg.upper.number, gg.lower.number),
    upper: gg.upper.number, lower: gg.lower.number,
    upperTri: tri(gg.upper), lowerTri: tri(gg.lower),
  });
  const hexagrams = {
    benGua: Object.assign(pack(g.main), { movingYao: p.moving_lines.slice() }),
    huGua: pack(g.mutual), bianGua: pack(g.changed),
    cuoGua: pack(g.opposite), zongGua: pack(g.reversed),
    ti: { num: p.ti_yong.ti.number, tri: tri(p.ti_yong.ti) },
    yong: { num: p.ti_yong.yong.number, tri: tri(p.ti_yong.yong) },
    verdict: { text: `${p.relations.ti_yong.relation} — ${p.relations.ti_yong.text}`,
      desc: p.relations.ti_yong.text, level: p.relations.ti_yong.level,
      score: M.RELATION_TEXT[p.relations.ti_yong.relation].score },
    gender: 'male',
    isProxy: false,
  };
  void nm;
  return Object.assign({ hexagrams, method: 'time', numbers: '7,2,3' }, extra || {});
}

/** 六爻载荷：取后端重算的卦名，四柱由调用方给。 */
function liuyaoCard(upper, lower, moving, lunarInfo, extra) {
  const p = M.analyze(M.fromGua(upper, lower, moving), { monthDizhi: '' });
  const g = p.gua;
  const tri = (x) => ({ number: x.number, name: x.name, element: x.wuxing });
  const hexagrams = {
    benGua: { name: M.hexName(g.main.upper.number, g.main.lower.number),
      upper: g.main.upper.number, lower: g.main.lower.number,
      upperTri: tri(g.main.upper), lowerTri: tri(g.main.lower),
      yao: [], movingYao: p.moving_lines.slice() },
    bianGua: { name: M.hexName(g.changed.upper.number, g.changed.lower.number),
      upper: g.changed.upper.number, lower: g.changed.lower.number,
      upperTri: tri(g.changed.upper), lowerTri: tri(g.changed.lower), yao: [] },
    gender: 'female',
  };
  return Object.assign({ hexagrams, lunarInfo: lunarInfo || {}, topic: '这次合作能不能成' },
    extra || {});
}

const TOPIC = '这次合作能不能成';

// ── ① 六爻正文逐字对拍 ───────────────────────────────────────────────
// 三种四柱来源：①无 lunarInfo ②前端四柱=后端精确版（可证实） ③前端四柱=日粒度版本
function sizhuOf(dt) { return G.sizhu(dt); }

const DT = '2026-05-10T14:30:00';
const S = sizhuOf(DT);
const LI_EXACT = { yearGZ: S.year_gz, monthGZ: S.month_gz, dayGZ: S.day_gz, hourGZ: S.hour_gz };
// 日粒度年/月柱：lunar-javascript 的 ByLiChun / 非 Exact 版本（前端用的就是这一档）
const SOLAR = require(path.join(ROOT, 'build', 'nginx', 'js', 'lunar.min.js')).Solar;
const LUN = SOLAR.fromYmdHms(2026, 5, 10, 14, 30, 0).getLunar();
const LI_DAYGRAIN = {
  yearGZ: LUN.getYearInGanZhiByLiChun(), monthGZ: LUN.getMonthInGanZhi(),
  dayGZ: LUN.getDayInGanZhi(), hourGZ: LUN.getTimeInGanZhi(),
};

const LIUYAO_SAMPLES = [
  ['无 lunarInfo（旧记录）', liuyaoCard(5, 1, 3, {})],
  ['前端四柱=精确版（可证实）', liuyaoCard(5, 1, 3, LI_EXACT, { divinationTime: DT })],
  // 注：2026-05-10 不在交节分界日，日粒度与精确版**恰好相同**，故本样例走的是
  // 「可证实」分支而非回落分支 —— 名字按实际行为写，别写成「未证实」。
  ['前端四柱=日粒度版（非分界日，两版同值→可证实）',
    liuyaoCard(5, 1, 3, LI_DAYGRAIN, { divinationTime: DT })],
  // 真正的「不可证实 → 回落前端四柱」：日柱对不上（模拟前端存了一个错时刻/错日柱）
  ['前端日柱对不上（不可证实→回落前端四柱）',
    liuyaoCard(5, 1, 3, Object.assign({}, LI_EXACT, { dayGZ: '甲子', hourGZ: '甲子' }),
      { divinationTime: DT })],
  ['有 lunarInfo 但无起卦时刻（回落前端四柱）',
    liuyaoCard(5, 1, 3, LI_EXACT, { divinationTime: '' })],
  ['无 topic（先问所测何事）', liuyaoCard(3, 6, 2, LI_EXACT, { divinationTime: DT, topic: '' })],
  ['装卦失败（缺上下卦号）', { hexagrams: { benGua: { name: '天风姤' }, bianGua: {} }, lunarInfo: LI_EXACT }],
  ['变卦缺失', liuyaoCard(2, 7, 5, LI_EXACT, { divinationTime: DT, hexagrams: Object.assign(
    liuyaoCard(2, 7, 5, LI_EXACT).hexagrams, { bianGua: {} }) })],
];

const liuyaoRows = [];
for (const [label, card] of LIUYAO_SAMPLES) {
  const oldText = OLD.buildLiuyaoPrompt(card.topic, card.hexagrams, '', card.lunarInfo);
  const newText = NEWF.buildLiuyaoPrompt(card.topic, card, '');
  // topic 为空的样例走**申报分支**（见 ALLOW.notopicRedesign）—— 逐字相同在这里
  // 恰恰是**错的期望**：那一支是有意重做的，重做的理由有线上实测背书。
  if (!card.topic) {
    const nt = ALLOW.notopicRedesign;
    const missing = nt.newMarkers.filter((m) => !newText.includes(m));
    const problems = [];
    // 申报非空断言：新模板必须确实变了个样，否则这条申报是白票
    if (oldText === newText) problems.push('新旧竟然逐字相同 —— 这条申报在放空炮，删掉它');
    // 旧分支的身份也要对上（证明「重做的就是那一支」）
    if (!oldText.includes(nt.oldMarker)) problems.push(`旧分支里没有「${nt.oldMarker}」—— 重做的不是这一支？`);
    // 新分支必须带齐盘面与禁断语（少了就退回「AI 说没收到卦象」那个线上故障）
    if (missing.length) problems.push(`新分支缺：${missing.join('、')}`);
    if (problems.length) {
      fail(`① 六爻正文 ${label}`, `无事项分支（已申报重做）对不上：\n     ${problems.join('\n     ')}`);
      liuyaoRows.push([label, '✗']);
    } else {
      liuyaoRows.push([`${label}（已申报：无事项分支重做）`, '✓']);
    }
    continue;
  }
  if (oldText !== newText) {
    fail(`① 六爻正文 ${label}`, firstLineDiff(oldText, newText));
    liuyaoRows.push([label, '✗']);
  } else {
    liuyaoRows.push([label, '✓']);
  }
}

// ── ③ 年月柱口径：差异必须**恰好**等于「把同一套装卦喂了另一份四柱」 ───
// 先纠一个看起来显然、其实错的说法：换月支**不只**改「月建」那一行。月建是六爻
// 的提纲，旺衰/月破/长生/综合/世身都从它来 —— 所以正确的问题不是「有没有别处
// 跟着变」（必然有，而且应该有），而是「**除了换四柱这一个输入，改造还动了别的
// 没有**」。
//
// 判据：把旧文本里那份**日粒度四柱装出来的盘**换成**精确版四柱装出来的盘**，
// 若结果与新文本逐字相同，就证明改造对六爻正文的全部影响 = 换四柱，别无其他。
function findGrainSplit() {
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 28; d++) {
      for (const h of [0, 6, 12, 18, 23]) {
        const lun = SOLAR.fromYmdHms(2026, m, d, h, 0, 0).getLunar();
        if (lun.getMonthInGanZhi() !== lun.getMonthInGanZhiExact()
          || lun.getYearInGanZhiByLiChun() !== lun.getYearInGanZhiExact()) {
          return { m, d, h, lun };
        }
      }
    }
  }
  return null;
}
const SPLIT = findGrainSplit();
const grainRows = [];
if (!SPLIT) {
  fail('③ 年月柱口径', '扫遍 2026 全年都没找到「日粒度 ≠ 精确版」的时刻 —— 前提不成立，本条形同虚设');
} else {
  const dt = `2026-${String(SPLIT.m).padStart(2, '0')}-${String(SPLIT.d).padStart(2, '0')}`
    + `T${String(SPLIT.h).padStart(2, '0')}:00:00`;
  const grainYear = SPLIT.lun.getYearInGanZhiByLiChun(), grainMonth = SPLIT.lun.getMonthInGanZhi();
  const li = {
    yearGZ: grainYear, monthGZ: grainMonth,
    dayGZ: SPLIT.lun.getDayInGanZhiExact(), hourGZ: SPLIT.lun.getTimeInGanZhi(),
  };
  const sx = sizhuOf(dt);
  const card = liuyaoCard(4, 3, 1, li, { divinationTime: dt, topic: TOPIC });
  const oldText = OLD.buildLiuyaoPrompt(card.topic, card.hexagrams, '', card.lunarInfo);
  const newText = NEWF.buildLiuyaoPrompt(card.topic, card, '');

  const mkChart = (y, mo, d, h) => LY.buildChart({
    topic: TOPIC, gender: 'female', isProxy: false,
    benUpper: 4, benLower: 3, bianUpper: card.hexagrams.bianGua.upper,
    bianLower: card.hexagrams.bianGua.lower,
    yearGZ: y, monthGZ: mo, dayGZ: d, hourGZ: h,
  });
  const grainChart = mkChart(li.yearGZ, li.monthGZ, li.dayGZ, li.hourGZ);
  const exactChart = mkChart(sx.year_gz, sx.month_gz, sx.day_gz, sx.hour_gz);
  const grainBlock = LY.formatChart(grainChart), exactBlock = LY.formatChart(exactChart);
  const expect = oldText.replace(grainBlock, exactBlock);

  console.log(`   （样例 ${dt}：年柱 日粒度 ${grainYear} → 精确 ${sx.year_gz}；`
    + `月柱 日粒度 ${grainMonth} → 精确 ${sx.month_gz}）`);

  if (!oldText.includes(grainBlock)) {
    fail('③ 年月柱口径', '旧文本里找不到日粒度盘面块 —— 取盘的方式不对，本条形同虚设');
    grainRows.push(['取盘失败', '✗']);
  } else if (newText === oldText) {
    fail('③ 年月柱口径', `${dt} 这一卦改写前后完全相同 —— 说明修正根本没生效（或该时刻前提判断有误）`);
    grainRows.push(['修正未生效', '✗']);
  } else if (newText !== expect) {
    fail('③ 年月柱口径', '差异**超出**「换四柱」这一件事：\n     ' + firstLineDiff(expect, newText));
    grainRows.push(['差异外溢', '✗']);
  } else {
    // 逐字相同还不够 —— 也可能两边**都**是日粒度（比如修正根本没接上）。
    // 故再钉死两行：四柱行与月建行必须是精确版的值。
    // 不能用 `newText.includes(grainMonth)` 这种子串判断：干支两字常常同时是
    // 某个爻的纳甲地支（本例 己丑 就是二爻官鬼的支），会误报。
    const lineOf = (t, re) => (t.split('\n').find((l) => re.test(l)) || '');
    const sizhuLine = lineOf(newText, /^【四柱】/);
    const yueLine = lineOf(newText, /^月建：/);
    const bad2 = [];
    if (!sizhuLine.includes(sx.month_gz) || !sizhuLine.includes(sx.year_gz)) {
      bad2.push(`四柱行不是精确版：${JSON.stringify(sizhuLine)}（应为 ${sx.year_gz}…${sx.month_gz}）`);
    }
    if (!yueLine.includes(sx.month_gz)) {
      bad2.push(`月建行不是精确版：${JSON.stringify(yueLine)}（应为含 ${sx.month_gz}）`);
    }
    if (grainMonth === sx.month_gz) bad2.push('本样例日月柱本应不同，实际相同 —— 前提不成立');
    if (bad2.length) {
      fail('③ 年月柱口径', bad2.join('；'));
      grainRows.push(['未取到精确值', '✗']);
    } else {
      grainRows.push([`差异 = 仅换四柱（月建 ${grainMonth} → ${sx.month_gz}，连带旺衰全层重算）`, '✓']);
    }
  }
}

// ── ② 梅花指令段逐行保真 ─────────────────────────────────────────────
const MHYS_MARK = '你是精通《梅花易数》';   // 数据段与指令段的分界
const mhysRows = [];
{
  const card = selfConsistent(7, 4, 3, { divinationTime: DT });
  const oldText = OLD.buildMhysPrompt(TOPIC, card.hexagrams, '');
  const newText = NEWF.buildMhysPrompt(TOPIC, card, '');
  const oi = oldText.indexOf(MHYS_MARK), ni = newText.indexOf(MHYS_MARK);
  if (oi < 0 || ni < 0) {
    fail('② 梅花指令段', `取不到分界线「${MHYS_MARK}」（旧 ${oi} 新 ${ni}）`);
    mhysRows.push(['取不到分界', '✗']);
  } else {
    const oldLines = oldText.slice(oi).split('\n').filter((l) => l.trim() !== '');
    const newBody = newText.slice(ni);
    const declared = new Set(ALLOW.mhysAddedLines.map((x) => x.line));
    const missing = oldLines.filter((l) => !newBody.includes(l));
    if (missing.length) {
      fail('② 梅花指令段', `旧 prompt 有 ${missing.length} 行在新 prompt 里找不到：\n     `
        + missing.map((l) => JSON.stringify(l)).join('\n     '));
    }
    // 申报的「新增行」必须**真的在**新 prompt 里，否则是空头申报
    const stale = ALLOW.mhysAddedLines.filter((x) => !newBody.includes(x.line));
    if (stale.length) {
      fail('② 申报失效', `申报为「新增」的行实际不存在（申报表过期了）：\n     `
        + stale.map((x) => JSON.stringify(x.line)).join('\n     '));
    }
    void declared;
    mhysRows.push([`旧指令段 ${oldLines.length} 行`, missing.length ? '✗' : '✓']);
  }
}

// ── ④ 无悬挂 {{变量}} ────────────────────────────────────────────────
const TPL = [
  ['DEFAULT_MHYS_PROMPT', promptLib.DEFAULT_MHYS_PROMPT],
  ['DEFAULT_LIUYAO_PROMPT', promptLib.DEFAULT_LIUYAO_PROMPT],
  ['DEFAULT_MHYS_FOLLOWUP', promptLib.DEFAULT_MHYS_FOLLOWUP],
  ['DEFAULT_LIUYAO_FOLLOWUP', promptLib.DEFAULT_LIUYAO_FOLLOWUP],
];
const tplRows = [];
{
  const mCard = selfConsistent(7, 4, 3, { divinationTime: DT });
  const lCard = liuyaoCard(5, 1, 3, LI_EXACT, { divinationTime: DT });
  const varSets = {
    DEFAULT_MHYS_PROMPT: promptLib.mhysVars(TOPIC, mCard, ''),
    DEFAULT_LIUYAO_PROMPT: promptLib.liuyaoVars(TOPIC, lCard, ''),
    DEFAULT_MHYS_FOLLOWUP: Object.assign(promptLib.mhysVars(TOPIC, mCard, ''),
      { followUp: '再问一句', context: '前文' }),
    DEFAULT_LIUYAO_FOLLOWUP: Object.assign(promptLib.liuyaoVars(TOPIC, lCard, ''),
      { followUp: '再问一句', context: '前文' }),
  };
  for (const [name, tpl] of TPL) {
    const out = NEWF.renderPrompt(tpl, varSets[name]);
    const left = out.match(/\{\{[^}]*\}\}/g) || [];
    // 只有模板里出现、变量表里没有的名字才会残留
    const names = [...new Set([...tpl.matchAll(/\{\{(\w+)\}\}/g)].map((x) => x[1]))];
    const absent = names.filter((n) => !(n in varSets[name]));
    // 注意 `[]` 在 JS 里是**真值** —— 写成 `if (left || absent)` 会把全绿判成失败。
    if (left.length || absent.length) {
      fail(`④ ${name}`, `悬挂变量 ${JSON.stringify(left)}；变量表里没有的名字 ${JSON.stringify(absent)}`);
      tplRows.push([name, '✗']);
    } else {
      tplRows.push([`${name}（${names.length} 个变量）`, '✓']);
    }
  }
}

// ── ⑤ 追问：六爻逐字相同；梅花只允许 context 截断长度不同（已申报） ──
const followRows = [];
{
  const lCard = liuyaoCard(5, 1, 3, LI_EXACT, { divinationTime: DT });
  const o = OLD.buildLiuyaoFollowUpPrompt(TOPIC, '什么时候有结果', 'X'.repeat(3000), lCard.hexagrams, lCard.lunarInfo);
  const n = NEWF.buildLiuyaoFollowUpPrompt(TOPIC, '什么时候有结果', 'X'.repeat(3000), lCard);
  if (o !== n) fail('⑤ 六爻追问', firstLineDiff(o, n));
  followRows.push(['六爻追问逐字相同', o === n ? '✓' : '✗']);

  const mCard = selfConsistent(7, 4, 3, { divinationTime: DT });
  const om = OLD.buildFollowUpPrompt(TOPIC, '那我要注意什么', 'Y'.repeat(3000), mCard.hexagrams);
  const nmv = NEWF.buildFollowUpPrompt(TOPIC, '那我要注意什么', 'Y'.repeat(3000), mCard);
  if (om === nmv) {
    // 不该相同：截断长度改了。若真的相同，说明 -1200 没生效，申报表在说谎。
    fail('⑤ 梅花追问', '申报了 context 截断从 1000 改到 1200，实际却完全相同 —— 申报失效');
    followRows.push(['梅花追问截断（申报）', '✗']);
  } else {
    const a = ALLOW.followupContext;
    // 差异必须**恰好**是 200 个 Y，不能夹带别的变化
    const stripped = nmv.replace('Y'.repeat(a.newLen), 'Y'.repeat(a.oldBuiltinLen));
    if (stripped !== om) {
      fail('⑤ 梅花追问', `差异不止 context 截断长度：\n     ${firstLineDiff(om, nmv)}`);
      followRows.push(['梅花追问截断（申报）', '✗']);
    } else {
      followRows.push([`梅花追问：仅 context ${a.oldBuiltinLen}→${a.newLen}（已申报）`, '✓']);
    }
  }
}

function firstLineDiff(a, b) {
  const al = String(a).split('\n'), bl = String(b).split('\n');
  for (let k = 0; k < Math.max(al.length, bl.length); k++) {
    if (al[k] !== bl[k]) {
      return `首处差异在第 ${k + 1} 行（旧 ${al.length} 行 / 新 ${bl.length} 行）：\n`
        + `     旧 ${JSON.stringify(al[k])}\n     新 ${JSON.stringify(bl[k])}`;
    }
  }
  return '逐行相同但整体不等（尾部空白/换行差异？）';
}

// ── 自检：确认比较器不是橡皮章 ───────────────────────────────────────
if (process.argv.includes('--self-test')) {
  const n0 = diffs.length;
  fail('（自检）故意制造的不一致', 'A ≠ B');
  if (diffs.length !== n0 + 1) {
    console.log('❌ 自检失败：fail() 没能记下差异 —— 本脚本的比较是橡皮章');
    process.exit(1);
  }
  diffs.pop();
  console.log('✅ 自检：fail() 能记下差异（本脚本不是橡皮章）\n');
}

// ── 输出 ─────────────────────────────────────────────────────────────
console.log('prompt 层对拍：改造前（old_prompt_ref.js）↔ 改造后（paipan/prompt.js）');
console.log('\n① 六爻正文逐字对拍');
for (const [l, r] of liuyaoRows) console.log(`   ${r} ${l}`);
console.log('\n② 梅花指令段（三段式大白话）保真');
for (const [l, r] of mhysRows) console.log(`   ${r} ${l}`);
console.log("\n③ 年月柱口径：差异必须恰好等于「换四柱」");
for (const [l, r] of grainRows) console.log(`   ${r} ${l}`);
console.log('\n④ 默认模板无悬挂变量');
for (const [l, r] of tplRows) console.log(`   ${r} ${l}`);
console.log('\n⑤ 追问模板');
for (const [l, r] of followRows) console.log(`   ${r} ${l}`);

if (diffs.length) {
  console.log(`\n❌ 不一致 ${diffs.length} 处：`);
  for (const d of diffs) console.log('   ' + d);
  console.log('\n⚠ 未修正前**不得**把 prompt 层重构发到线上。');
  process.exit(1);
}
console.log('\n✅ 全绿：六爻逐字相同、梅花指令段零改动、年月柱修正不外溢、模板无悬挂变量');
process.exit(0);

/**
 * 层 7 · 字占**独立判据** —— 按《梅花易数·字占》原文判 ai3000 的取数。
 *
 * 为什么必须有它：字占这一版**有意偏离 shushu**（原文：四字以上按平仄取数、十一字以上
 * 只按字数；shushu 全程按笔画）。层 7 对拍对这批例只能证明「我们知道自己改了什么」，
 * 证不了「改对了」—— 那 19 例整例申报之后，与 shushu 的比对对字占**不再有任何约束**。
 * 故本脚本的判据**取自原文，不取自 shushu**。
 *
 * ── 原文（逐字核对自线上语料 reference_books id=106《梅花易数》）────────────
 *  · 字占总则：「凡见字数如停匀，即平分一半为上卦，一半为下卦。如字数不匀，即少一字为
 *    上卦……以多一字为下卦。」→ 分半点 = n // 2（前小后大）
 *  · 四字：「又四字以上，不必数画数，只以平仄声音调之。平声为一数，上声为二数，去声为
 *    三数，入声为四数。」
 *  · 十一字以上：「又不用平仄声音调之，止用字数……又合二卦总数取爻。」
 *  · 爻以六除：「凡起动爻，以**重卦总数**除六，以余数作动爻……如得过六数，则除之一六」
 *    → 动爻取**取数总和**（未取模的原和）÷ 6，余 0 取 6。
 *  · 卦以八除：「过八数即以八数递除……如得八数整，即坤卦」→ 余 0 取 8。
 *  · 一字占：「取其字画，以左为阳画，右为阴画……全画取爻」——本版**禁用**（本脚本判它拒收）。
 *
 * ── 原文自带的两个验算例（本脚本的一号判据，字面量写死）──────────────────
 *  ① 「今日动静如何」（六字）原文逐字算了：「今」平声一数；「日」入声四数；「动」去声
 *     三数，共八数，得坤为上卦。「静」去声三数；「如」平声一数；「何」平声一数，共五数，
 *     得巽，为下卦。又以八五总为十三数，除二六一十二，余得一数，为地风升。初爻动。
 *  ② 「西林寺牌额占」（二字，笔画档）：「以西字七画为艮，作上卦；以林八画为坤，作下卦。
 *     以上七画下八画总十五画，除二六一十二，余数得三，是山地剥卦。第三爻动。」
 *     同段又给反例：林添两勾成十画 →「除八得二为兑」→ 山泽损「第五爻变」（7+10=17÷6余5）。
 *     ⚠ 原文按 7 画的「西」算（今简体字形 6 画），故这一例必须**显式给 strokes**。
 *
 * ① 号例是本脚本最要紧的一条：它一条同时钉死三件事 ——
 *   (a) **音系**。原文把「动」「静」算**去声**（中古是浊上声 → 浊上归去）、把「日」算
 *       **入声**（现代读去声）→ 判据口径只能是「**现代读音为底 + 古入声字覆写为 4**」。
 *       用平水韵中古四声查表得 7/4/… 与原文不符 —— 那种写法必须在这里红。
 *   (b) 分半点 n//2（六字 → 三上三下）。
 *   (c) 动爻取**取数总和** ÷6（八五总十三），不是上下卦数之和（8+5=13 同余，蒙得对）。
 *       ② 号例的 17÷6 余 5 补上这一刀：上下卦数 7+2=9 ÷6 余 3 ≠ 5。
 *
 * ── 三条「不许」（防橡皮章，改本文件前先读这三条）────────────────────────
 *  1. **不许用数据表模块（`strokes.js` / `pingze.js` / `zishan.js`）来算期望值**。
 *     只许把被验方当被验方读（`meihua.js` 的出口函数）。期望值只来自：原文、本文件内
 *     的冻结夹具、字面量常量。
 *  2. **手算样例的期望值必须是字面量**，不许在运行时推导（推导出来的期望值会跟着实现
 *     一起漂 —— 那就成了自证）。
 *  3. 批量段**只读输出里的 `derivation`**（`counts_per_char` / `branch` 等），不许去摸
 *     模块内部状态或表。
 *
 * ── 覆盖面与它**不**证明的东西（写明白，别当成比它更宽的东西）────────────
 *  · 证明：原文三档取数、入声覆写、分半点、动爻取原始和、拒收路径、空白剔除。
 *  · 入声字集是**全量**双向里的一半：把冻结合规里的入声字（繁）逐字打进去，断言取数=4；
 *    反向（「非入声字不许被判成入声」）只能抽样 —— 那需要完整的现代读音表，本脚本不背
 *    那份数据（`pinyin-data` 985 KB）。抽样集中在常见字与浊上字（见 FROZEN_MODERN）。
 *  · 不证明：断卦层。取数错 → 卦错 → 下游全变；但「取数对而下游也错」这里看不出来，
 *    那由 `norm_meihua_char_carrier.py`（载体层）管。
 *
 * 用法：node verify_meihua_zishan.js [--self-test]
 * 退出码：0 = 全过；1 = 有断言失败；2 = 夹具/环境问题（**没测到东西**，不是通过）
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const M = require(path.join(PAIPAN, 'meihua.js'));   // 被验方（只读它的出口）

const SELF_TEST = process.argv.includes('--self-test');

let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass += 1; return; }
  fails.push(`${name}${detail ? ' —— ' + detail : ''}`);
}

// ═══════════════════════════════════════════════════════════════════
// 一、冻结夹具：平水韵**入聲部**原文逐字副本（繁体，按韵部）
// ═══════════════════════════════════════════════════════════════════
// 来源：rbnyng/pingshui_rhyme（MIT）pingshui_rhyme/data/organized_ping_ze_rhyme_dict.json
//       的 `ze.入聲部`，由 `gen_pingze_table.py` 原样导出成这个纯文本夹具（不做任何转换）。
// 本文件只读它，不许改。**它与生产表的关系**：生产表从同一份上游生成，本夹具是独立的
// 一份副本 —— 能抓住「JS 表生成/繁简映射/查表」的错，抓不住「上游本身解析错」；后者由
// gen 自己的断言（17 韵部、字数）与原文①号例兜底。
const FROZEN_RU = path.join(__dirname, 'frozen_pingshui_ru.txt');
if (!fs.existsSync(FROZEN_RU)) {
  console.error(`✗ 缺冻结夹具 ${FROZEN_RU}（先用 gen_pingze_table.py 生成）`);
  process.exit(2);
}
const ruText = fs.readFileSync(FROZEN_RU, 'utf8');
const ruChars = [];
{
  let cur = '';
  for (const line of ruText.split('\n')) {
    if (line.startsWith('#')) continue;
    const m = /^(\S+)\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    cur = m[1];
    for (const t of m[2]) if (!/\s/.test(t)) ruChars.push({ ch: t, part: cur });
  }
}
if (ruChars.length < 1500) {
  console.error(`✗ 冻结夹具只解析出 ${ruChars.length} 个入声字（应 >1500）—— 夹具坏了，不是被测方坏了`);
  process.exit(2);
}

// 二、冻结夹具（自写）：常见字的**现代读音调类**（判据侧的地面真值）
// 取数口径：阴平/阳平 → 1（平）；上声 → 2；去声 → 3；另有入声覆写 → 4。
// 这一张表是**人工写的**（不来自任何数据集），故意选：四类齐全、含浊上归去的例
// （动是道坐静 中古上声今去声）、含现代读去声但古入声的字（日／月／不／白／出）。
const FROZEN_MODERN = [
  // 阴平（今读一声 → 平 1）
  '今天花开东风吹三山高天书', '沙江春知心',
  // 阳平（今读二声 → 平 1）
  '人明年如河成谁来求财前何',
  // 上声（今读三声 → 上 2）
  '想五老马女水火好手雨草',
  // 去声（今读四声 → 去 3）
  '事问静动是道坐运去用路地',
  // 入声（今读多声，但属入声部 → 4）
  '日月出入不一十白竹木六国学业发吉',
].join('');

// 三、手算样例（**字面量**，逐例注释写明怎么算出来的）
// 期望字段：upper / lower / moving；std 报错的例写 error（子串）
const CASES = [
  {
    // 原文①号例 —— 逐字：今[阴平→1] 日[入声→4] 动[去声→3] 静[去声→3] 如[阳平→1] 何[阳平→1]
    //   六字 → split = 6//2 = 3。前半 1+4+3 = 8 → 8 % 8 = 0 取 8（坤）；后半 3+1+1 = 5 → 巽。
    //   总 8+5 = 13 → 13 % 6 = 1 → 初爻。原文：「为地风升，初爻动」。
    text: '今日动静如何',
    expect: {
      upper: 8, lower: 5, moving: 1, char_count: 6, split: 3,
      counts: [1, 4, 3, 3, 1, 1], branch: 'pingze',
      sum_head: 8, sum_tail: 5, total: 13,
    },
  },
  {
    // 原文②号例（笔画档）—— 西 7 画 → 7 % 8 = 7（艮）；林 8 画 → 8 % 8 = 0 取 8（坤）；
    //   总 15 → 15 % 6 = 3。原文：「是山地剥卦。第三爻动」。
    //   ⚠ 必须显式给 strokes：今简体「西」6 画，按笔画表算会得 6/8/… ，与原文不符。
    text: '西林', strokes: [7, 8],
    expect: { upper: 7, lower: 8, moving: 3, char_count: 2, split: 1, total: 15, branch: 'stroke' },
  },
  {
    // 原文②号例的后半段（同一刀的第二处）：林添两勾成十画 → 10 % 8 = 2（兑）→ 山泽损；
    //   7 + 10 = 17 → 17 % 6 = 5（第五爻）。**上下卦数之和 7+2 = 9 % 6 = 3 ≠ 5** ——
    //   动爻写成「上下卦之和」的实现在这一例上必红。
    //   文字仍写「西林」：笔画由 strokes 显式给（10 = 林 8 画 + 两勾 2 画），
    //   本判据只按 strokes 算，不看文字的笔画表值。
    text: '西林', strokes: [7, 10],
    expect: { upper: 7, lower: 2, moving: 5, char_count: 2, split: 1, total: 17, branch: 'stroke' },
  },
  {
    // 四字档（多音字「中」「上」）：中[zhōng 阴平→1] 秋[阴平→1] 月[入声→4] 上[shàng 去声→3]
    //   split = 2。前半 1+1 = 2 → 兑；后半 4+3 = 7 → 艮；总和 1+1+4+3 = 9 → 9 % 6 = 3。
    //   **另一读音分支**（中取 zhòng 去声 3、上取 shǎng 上声 2）→ 前半 4（震）、后半 6（坎）、
    //   总 10 → 4，即 (4,6,4) ≠ (2,7,3) —— 判据只认入声优先 + 首读音这一套约定，别随手改。
    text: '中秋月上',
    expect: {
      upper: 2, lower: 7, moving: 3, char_count: 4, split: 2,
      counts: [1, 1, 4, 3], branch: 'pingze', sum_head: 2, sum_tail: 7, total: 9,
    },
  },
  {
    // 四字档（上声，补「取数=2」这一值）：心[阴平→1] 想[上声→2] 事[去声→3] 成[阳平→1]
    //   split = 2。前半 1+2 = 3 → 离；后半 3+1 = 4 → 震；总和 7 → 7 % 6 = 1。
    text: '心想事成',
    expect: {
      upper: 3, lower: 4, moving: 1, char_count: 4, split: 2,
      counts: [1, 2, 3, 1], branch: 'pingze', sum_head: 3, sum_tail: 4, total: 7,
    },
  },
  {
    // 五字档含入声「业」：求[阳平→1] 财[阳平→1] 问[去声→3] 事[去声→3] 业[入声→4]
    //   split = 5//2 = 2（前 2 后 3 —— 原文五字「以二字为上卦，三字为下卦」）。
    //   前半 1+1 = 2 → 兑；后半 3+3+4 = 10 → 10 % 8 = 2 → 兑；总 12 → 12 % 6 = 0 取 6。
    text: '求财问事业',
    expect: {
      upper: 2, lower: 2, moving: 6, char_count: 5, split: 2,
      counts: [1, 1, 3, 3, 4], branch: 'pingze', sum_head: 2, sum_tail: 10, total: 12,
    },
  },
  {
    // 空白剔除（半角 + 全角两种都要剔）：剔除后恰「日月出入」四字，全入声 → 4/4/4/4。
    //   split = 2。前半 8 → 8 % 8 = 0 取 8（坤）；后半 8 → 坤；总 16 → 4。
    //   若只剔半角，全角空格会落进平仄取数 → 报错，本例如红。
    text: '日 月出　入',
    expect: {
      upper: 8, lower: 8, moving: 4, char_count: 4, split: 2,
      counts: [4, 4, 4, 4], branch: 'pingze', sum_head: 8, sum_tail: 8, total: 16,
    },
  },
  {
    // 六字档（含入声「出」「日」「吉」）：明[阳平→1] 日[入→4] 出[入→4] 行[xíng 阳平→1]
    //   吉[入→4] 凶[阴平→1]；split = 3。前半 1+4+4 = 9 → 9 % 8 = 1（乾）；后半 1+4+1 = 6（坎）；
    //   总和 15 → 15 % 6 = 3。（这不是原文用例，是本脚本自造 —— 用来覆盖「前半 > 8 要真的取模」）
    text: '明日出行吉凶',
    expect: {
      upper: 1, lower: 6, moving: 3, char_count: 6, split: 3,
      counts: [1, 4, 4, 1, 4, 1], branch: 'pingze', sum_head: 9, sum_tail: 6, total: 15,
    },
  },
  {
    // 十二字档（止用字数，每字算 1）：split = 6。前半 6 → 坎；后半 6 → 坎；总 12 → 0 取 6。
    text: '今日所求之事何时能够成就',
    expect: {
      upper: 6, lower: 6, moving: 6, char_count: 12, split: 6, branch: 'count',
      sum_head: 6, sum_tail: 6, total: 12,
    },
  },
  {
    // 档界对之下半：十字**必须**走平仄档，且「々」不在任何读音表里 → 必须报错。
    //   （今1 日2 所3 求4 之5 事6 何7 时8 能9 々10 → 正好十字）
    //   若实现把分界写成 `> 10`（十字也走字数档），这一例会成功 → 红。
    //   若实现对表外字静默兜底成平声 1 → 也会成功 → 红。
    text: '今日所求之事何时能々',
    error: '々',
  },
  {
    // 档界对之上半：十一字**必须**成功（字数档，**不查任何表**）。若 ≥11 也去查平仄表，
    //   这一例里的「々」会让它报错 → 红。每字算 1：split = 5，前半 5 → 5（巽）、
    //   后半 6 → 6（坎）、总 11 → 11 % 6 = 5。
    text: '今日所求之事何时能够々',
    expect: {
      upper: 5, lower: 6, moving: 5, char_count: 11, split: 5, branch: 'count',
      sum_head: 5, sum_tail: 6, total: 11,
    },
  },
  {
    // 一字占：本版禁用 → 必须报错，且文案要指得出路（含「两个字以上」）。
    text: '山',
    error: '两个字以上',
  },
  {
    // 二字档的标点：走笔画档（原文 ≤3 字仍数画数），「，」不在笔画表里 → 必须报错。
    text: '求，财',
    error: '，',
  },
];

function runCase(c) {
  try {
    return { ok: true, out: M.qiguaCharacters(c.text, c.strokes) };
  } catch (e) {
    return { ok: false, msg: String((e && e.message) || e) };
  }
}

if (SELF_TEST) {
  // 自证不是橡皮章：把判据自己的取数规则故意改坏一处（「平声为一数」改成 2），
  // 期望原文①号例转而报红。红的必须是它，不是别的。
  const bad = CASES[0];
  const badWant = { ...bad.expect, counts: [2, 4, 3, 3, 2, 2] };
  const r = runCase(bad);
  const got = r.ok ? r.out.derivation.counts_per_char : null;
  const ok = JSON.stringify(got) !== JSON.stringify(badWant.counts);
  console.log(ok
    ? '✓ --self-test：故意改坏的期望值被判红（判据对取值敏感，不是橡皮章）'
    : '✗ --self-test：改坏后仍然通过 —— 判据是橡皮章，先修它');
  process.exit(ok ? 0 : 1);
}

// ── 四、手算段 ────────────────────────────────────────────────────
for (const c of CASES) {
  const r = runCase(c);
  const tag = c.text.length > 14 ? c.text.slice(0, 12) + '…' : c.text;
  if (c.error) {
    check(`「${tag}」必须报错且文案含「${c.error}」`, !r.ok && r.msg.includes(c.error),
      r.ok ? '却成功了' : `报错文案是「${r.msg}」`);
    continue;
  }
  if (!r.ok) { check(`「${tag}」必须成功`, false, `却报错：${r.msg}`); continue; }
  const o = r.out; const d = o.derivation || {};
  const E = c.expect;
  check(`「${tag}」上卦=${E.upper}`, o.upper_num === E.upper, `实得 ${o.upper_num}`);
  check(`「${tag}」下卦=${E.lower}`, o.lower_num === E.lower, `实得 ${o.lower_num}`);
  check(`「${tag}」动爻=${E.moving}`, o.moving === E.moving, `实得 ${o.moving}`);
  check(`「${tag}」char_count=${E.char_count}`, o.inputs && o.inputs.char_count === E.char_count,
    `实得 ${o.inputs && o.inputs.char_count}`);
  check(`「${tag}」分半点=${E.split}`, d.split_index === E.split, `实得 ${d.split_index}`);
  if (E.branch === 'stroke') {
    // 笔画档的 derivation **键集必须与旧实现逐字相同**（层 7：那 6 例 2–3 字样例零申报）。
    // 故这一档不许出现 `branch` / `counts_per_char` 这类新键 —— 多一个键就得多一条申报。
    check(`「${tag}」笔画档不许新增 derivation 键（branch/counts_per_char）`,
      d.branch === undefined && d.counts_per_char === undefined,
      `实得 branch=${d.branch}、counts_per_char=${JSON.stringify(d.counts_per_char)}`);
  } else if (E.branch) {
    check(`「${tag}」档=${E.branch}`, d.branch === E.branch, `实得 ${d.branch}`);
  }
  if (E.counts) {
    check(`「${tag}」逐字取数=${E.counts.join(',')}`,
      JSON.stringify(d.counts_per_char) === JSON.stringify(E.counts),
      `实得 ${JSON.stringify(d.counts_per_char)}`);
  }
  if (E.total !== undefined) {
    const t = E.branch === 'stroke' ? d.total_strokes : d.total;
    check(`「${tag}」取数总和=${E.total}`, t === E.total, `实得 ${t}`);
  }
  // 用户可见的算式文案必须与数值自洽（M12 变异抓这里）
  if (E.branch === 'pingze' || E.branch === 'count') {
    check(`「${tag}」算式文案里的余数与卦数一致`,
      typeof d.upper_calc === 'string' && d.upper_calc.includes(`余 ${o.upper_num}`)
      && typeof d.moving_calc === 'string' && d.moving_calc.includes(`余 ${o.moving}`),
      `upper_calc=${d.upper_calc} / moving_calc=${d.moving_calc}`);
  }
}

// ── 五、入声档全量（繁字直打，不需要繁简映射）──────────────────────
// 每 4 个入声字打成一条四字文本 → 期望逐字取数 [4,4,4,4]、总和 16、上 8 下 8 动 4。
{
  const byPart = new Map();
  for (const it of ruChars) {
    if (!byPart.has(it.part)) byPart.set(it.part, []);
    byPart.get(it.part).push(it.ch);
  }
  let bad = 0; let groups = 0; const samples = [];
  for (const [part, chars] of byPart) {
    for (let i = 0; i + 3 < chars.length; i += 4) {
      const text = chars.slice(i, i + 4).join('');
      groups += 1;
      const r = runCase({ text });
      const d = r.ok ? r.out.derivation || {} : {};
      const ok = r.ok && d.branch === 'pingze'
        && JSON.stringify(d.counts_per_char) === '[4,4,4,4]'
        && r.out.upper_num === 8 && r.out.lower_num === 8 && r.out.moving === 4;
      if (!ok) {
        bad += 1;
        if (samples.length < 5) samples.push(`${part}「${text}」→ ${r.ok ? JSON.stringify(d.counts_per_char) : r.msg}`);
      }
    }
  }
  check(`入声字全量（${ruChars.length} 字 / ${groups} 组）逐字取数都是 4`,
    bad === 0, `${bad} 组不对：${samples.join('；')}`);
}

// ── 六、今音抽样（反向：非入声字不许被判成入声）────────────────────
// 冻结夹具是**繁体**的（上游原样），而用户输入多是简体 —— 判据侧自己写这几对常用的
// 繁简对应（**手写，不读上游繁简表**：读同一份上游就成自证了）。只覆盖下面这几对，
// 全量繁简映射不在这里判（那由 gen 的落表统计与层 7 的实跑兜）。
// 每对的繁体必须真在夹具里 —— 否则是这条对应写错了，当场红（不是被测方红）。
const RU_PAIRS = { 國: '国', 學: '学', 業: '业', 發: '发' };
const RU_EXPECT = new Set(ruChars.map((x) => x.ch));
for (const [t, s] of Object.entries(RU_PAIRS)) {
  if (!RU_EXPECT.has(t)) {
    console.error(`✗ 判据侧繁简对「${t}→${s}」的繁体不在冻结夹具里 —— 是这条对应写错了`);
    process.exit(2);
  }
  RU_EXPECT.add(s);
}
{
  const bad = [];
  for (const ch of FROZEN_MODERN) {
    // 逐字打成四字文本（四字才走平仄档）：只关心首字取数
    const text = ch + '天天天';   // 「天」阴平 → 1
    const r = runCase({ text });
    if (!r.ok) { bad.push(`${ch}→报错(${r.msg})`); continue; }
    const d = r.out.derivation || {};
    const want4 = RU_EXPECT.has(ch);
    const got = d.counts_per_char && d.counts_per_char[0];
    if (!want4 && got === 4) bad.push(`${ch}→被误判为入声`);
    if (want4 && got !== 4) bad.push(`${ch}→入声却给了 ${got}`);
  }
  check(`今音抽样（${FROZEN_MODERN.length} 字）取数方向正确`, bad.length === 0, bad.join('；'));
}

// ── 七、覆盖断言（防空绿）─────────────────────────────────────────
{
  const texts = [
    '中秋月上', '心想事成', '求财问事业', '日 月出　入', '明日出行吉凶',   // 平仄档
    '今日所求之事何时能够成就', '今日所求之事何时能够々',                 // 字数档
    '西林', '问财', '梅花易', '你好',                                    // 笔画档
  ];
  const seen = new Set(); const allCounts = new Set(); let nOdd = 0;
  for (const t of texts) {
    const chars = [...t].filter((c) => !/\s/.test(c));
    const r = runCase({ text: t, strokes: t === '西林' ? [7, 8] : undefined });
    if (!r.ok) continue;
    const d = r.out.derivation || {};
    // 笔画档**故意不带 branch**（见上），故按「有没有 total_strokes」认它
    const br = d.branch || (d.total_strokes !== undefined ? 'stroke' : undefined);
    seen.add(br);
    for (const v of d.counts_per_char || []) allCounts.add(v);
    if (chars.length % 2 === 1 && d.split_index === Math.floor(chars.length / 2)) nOdd += 1;
  }
  check('三档（笔画/平仄/字数）都跑到', ['stroke', 'pingze', 'count'].every((b) => seen.has(b)),
    `只跑到 ${[...seen].join('/')}`);
  check('平仄档逐字取数四值齐全（1/2/3/4）', [1, 2, 3, 4].every((v) => allCounts.has(v)),
    `只出现 ${[...allCounts].sort().join(',')}`);
  check('奇数 n 的 n//2 ≠ ceil(n/2) 例 ≥3', nOdd >= 3, `${nOdd} 例`);
  check('表外符号「々」确实不在被验方的平仄表里（那条「必须报错」的断言不是空跑）',
    runCase({ text: '々々々々' }).ok === false, '它居然成功了 —— 表外字被静默兜底了');
}

// ── 汇总 ─────────────────────────────────────────────────────────
console.log(`字占判据：通过 ${pass} 条，失败 ${fails.length} 条`);
if (fails.length) {
  console.log('');
  for (const f of fails.slice(0, 40)) console.log(`  ✗ ${f}`);
  if (fails.length > 40) console.log(`  … 另有 ${fails.length - 40} 条`);
  process.exit(1);
}
console.log('✅ 字占按《梅花易数·字占》原文分层：取数、分半、动爻、拒收全部相符');

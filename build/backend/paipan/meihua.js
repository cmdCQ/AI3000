/**
 * paipan/meihua.js —— 梅花易数：起卦（时间/数字/字数）+ 断卦（体用 · 旺衰 · 互变 · 应期）
 * ==============================================================================
 *
 * 真源：shushu `core/meihua/`（`qigua.py` 起卦、`hexagram.py` 卦象、`analyzer.py` 断法）
 * + `core/liuyao/divination.meihua_time_numbers`（时间法取数，六爻模块与梅花**共用一份
 * 公式**，本文件照此只实现一处，将来六爻的时间起卦要调 `meihuaTimeNumbers`）。
 *
 * 与六爻的分工：六爻要「装卦」（纳甲、六亲、六神、世应），梅花**不需要**。
 * 梅花只看卦与卦之间的五行关系，故本文件的爻只保留阴阳（1=阳 0=阴，**自下而上**），
 * 不引入 LineType 那套东西。
 *
 * ── 对拍 ──────────────────────────────────────────────────────
 * `duipan/gen_golden_meihua.py`（金标准，走真实 `POST /api/v1/meihua/divine`）
 * vs `duipan/run_js_meihua.js`（本文件），640 例 14 万叶子，见 README「层 7」。
 *
 * ── 与基准的已知差异（对拍申报里逐条写着）────────────────────
 * 1. **64 卦的卦名**：shushu 用文王卦序单名（「恒」），本项目用通行全名（「雷风恒」）。
 *    身份以「卦序 + 上下卦」认定，不靠卦名（对拍铁律 2），故该字段不入对拍
 *    （本模块也不产 `name`，只导出 `hexName()` 供调用方取；64 个全名另有独立核对）。
 * 2. **64 卦的语料**（`judgment`/`image`/`lines`/`interpretation`）属独立数据层，
 *    ai3000 侧另有来源，不入本层对拍。
 *
 * 月支（体卦旺衰要用）走 `ganzhi.monthDizhiAt`（精确到交节时刻）—— 与 shushu
 * `solar_terms.get_month_dizhi_at` **同口径**，故这一项 **0 申报**。
 * （shushu 的另一处 `current_sizhu` 用的是日粒度，那是历法层的事，已另案对齐。）
 */

'use strict';

const C = require('./constants');
const G = require('./ganzhi');
const S = require('./strokes');

// 爻的表示：1=阳，0=阴（自下而上）
const YANG = 1;
const YIN = 0;

const ZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';

// 先天八卦数 ↔ 卦名。`constants.TRIGRAMS` 的**键就是先天数**（乾1…坤8），
// 值里没有 number 字段，故键即数。
const XIANTIAN_NUMBER = {};
const NUM_BY_NAME = {};
for (const key of Object.keys(C.TRIGRAMS)) {
  const num = Number(key);
  const n = C.TRIGRAMS[key];
  XIANTIAN_NUMBER[n.name] = num;
  NUM_BY_NAME[n.name] = num;
}
const NUMBER_TO_TRIGRAM = {};
for (const name of Object.keys(XIANTIAN_NUMBER)) NUMBER_TO_TRIGRAM[XIANTIAN_NUMBER[name]] = name;

// ─────────────────────────────────────────────────────────────
// 起卦法元信息（解读时要能引用出处）
// ─────────────────────────────────────────────────────────────

const METHOD_META = {
  time: {
    name: '时间起卦法',
    source: '《梅花易数·年月日时起例》',
    note: '以农历年支序、农历月、农历日、时辰序取数，同一时辰内结果相同',
  },
  number: {
    name: '数字起卦法',
    source: '《梅花易数·物数占》',
    note: '报数起卦：第一个数取上卦，第二个数取下卦，两数之和取动爻',
  },
  character: {
    name: '字数起卦法',
    source: '《梅花易数·字占》',
    note: '以笔画数取卦：前后两半各计笔画取上下卦，总笔画取动爻',
  },
};

// ─────────────────────────────────────────────────────────────
// 卦象
// ─────────────────────────────────────────────────────────────

/** 先天数 → 三爻（自下而上）。 */
function linesOfTrigram(num) {
  const t = C.TRIGRAMS[num];
  if (!t) throw new Error(`没有第 ${num} 卦`);
  return t.lines.slice();
}

/** 三爻（自下而上）→ 先天卦数。 */
function trigramOfLines(lines3) {
  const num = C.TRIGRAM_BY_LINES[lines3.map(Number).join('')];
  if (!num) throw new Error(`不是合法三爻：${JSON.stringify(lines3)}`);
  return num;
}

/**
 * 卦序 → 卦象符号（䷀…䷿）。
 *
 * Unicode 的「Yijing Hexagram Symbols」区（U+4DC0–U+4DFF）**恰好**按文王卦序
 * 排列，U+4DC0 即乾为天（#1），故直接算，不必挂一张 64 项符号表。
 */
function hexagramSymbol(number) {
  if (!(number >= 1 && number <= 64)) throw new Error(`卦序越界：${number}`);
  return String.fromCodePoint(0x4DC0 + number - 1);
}

/** 先天数 → 八卦详情（字段名与 shushu `core.constants.TRIGRAMS` 逐字相同）。 */
function trigramDetail(num) {
  const t = C.TRIGRAMS[num];
  const cl = C.TRIGRAM_CLASSICAL[num] || {};
  return {
    symbol: t.symbol,
    wuxing: t.element,
    direction: cl.direction || '',
    nature: cl.nature || '',
    number: num,
    lines: t.lines.map((v) => (v ? '阳' : '阴')),
    name: t.name,
  };
}

/**
 * 卦名 —— 本项目通行全名（「雷风恒」）。
 *
 * **刻意不进 `buildHexagram` 的返回值**：对拍里 shushu 用的是文王卦序单名
 * （「恒」），两套命名约定必然逐例不同，那是 2880 处「差异」而不是 2880 处
 * 问题。对拍铁律 2 明写「身份用上下卦号，不用卦名」—— 卦名本就不是身份载体，
 * 于是金标准侧把 `gua.*.name` 排除在外（见 `gen_golden_meihua.py` 的
 * `CORPUS_KEYS`），本侧也不产出，免得 diff 报一堆 `<缺>`。
 *
 * 那样做有个代价：`getHexName` 的 64 条不再被本层对拍覆盖。故另设独立核对
 * （`coverage_meihua.py`）：拿前端 `hexagrams_data.js::HEXAGRAM_MAP`
 * （源头 cast64.com，与本模块相互独立）逐卦核 64 个全名；
 * 且卦名`number`（卦序）本身仍在逐例比对之列 —— 卦认错了对拍一定红。
 */
function hexName(upper, lower) {
  return C.getHexName(upper, lower);
}

/** 六爻（自下而上）→ 完整卦对象。卦名走 `hexName()`，见该函数的说明。 */
function buildHexagram(lines6) {
  const lines = Array.from(lines6, Number);
  if (lines.length !== 6) throw new Error(`需要 6 爻，收到 ${lines.length} 个`);
  const lower = trigramOfLines(lines.slice(0, 3));
  const upper = trigramOfLines(lines.slice(3, 6));
  const number = C.getHexNumber(upper, lower);
  return {
    number,
    upper: trigramDetail(upper),
    lower: trigramDetail(lower),
    symbol: hexagramSymbol(number),
    lines_yinyang: lines,
    trigrams: { lower: C.TRIGRAMS[lower].name, upper: C.TRIGRAMS[upper].name },
  };
}

// ── 四种派生卦 ──

/** 互卦：以 2·3·4 爻为下卦、3·4·5 爻为上卦（看事情的**过程**）。 */
function mutualLines(lines6) {
  const l = Array.from(lines6, Number);
  return l.slice(1, 4).concat(l.slice(2, 5));
}

/** 变卦：动爻阴阳翻转（看事情的**结局**）。moving 为 1-based 爻位。 */
function changedLines(lines6, moving) {
  const l = Array.from(lines6, Number);
  for (const pos of moving) {
    if (!(pos >= 1 && pos <= 6)) throw new Error(`动爻位越界：${pos}`);
    l[pos - 1] = 1 - l[pos - 1];
  }
  return l;
}

/** 错卦（旁通卦）：六爻全翻（看事情的**反面**）。 */
function oppositeLines(lines6) {
  return Array.from(lines6, Number).map((x) => 1 - x);
}

/** 综卦（反卦）：六爻上下颠倒（看**对方视角**）。 */
function reversedLines(lines6) {
  return Array.from(lines6, Number).reverse();
}

// ── 体用判定 ──

/**
 * 由动爻位置定体用。古法：**动者为用，静者为体**。
 *
 * * 动爻在下卦（初/二/三）→ 下卦为用，上卦为体
 * * 动爻在上卦（四/五/上）→ 上卦为用，下卦为体
 * * 多爻同动且分居两卦 —— 梅花古法一卦只有一个动爻（时间/数字/字数起卦必然如此），
 *   这里给一个确定性规则而不是抛错：动爻多者为用，数量相同则取上卦为用，
 *   并在 note 里说明。**三种起卦法下这条分支取不到**（恒为 1 个动爻），
 *   `coverage_meihua.py` 把「取不到」写成断言。
 */
function judgeTiYong(moving) {
  if (!moving || !moving.length) throw new Error('没有动爻就没有体用 —— 起卦结果不合法');
  const lowerMoving = moving.filter((p) => p <= 3).length;
  const upperMoving = moving.filter((p) => p >= 4).length;

  let note = '';
  let upperIsYong;
  if (lowerMoving && upperMoving) {
    if (lowerMoving === upperMoving) {
      upperIsYong = true;
      note = `动爻分居上下卦且数量相同（各 ${lowerMoving} 爻），按上卦为用处理`;
    } else {
      upperIsYong = upperMoving > lowerMoving;
      note = `动爻分居上下卦（下 ${lowerMoving} 爻 / 上 ${upperMoving} 爻），以动爻多者为用`;
    }
  } else {
    upperIsYong = Boolean(upperMoving);
  }

  return { yong: upperIsYong ? 'upper' : 'lower', ti: upperIsYong ? 'lower' : 'upper', note };
}

/** 把体用位置解析成带五行、先天数的具体卦。 */
function tiYongDetail(h, which) {
  const pick = (tgNum) => {
    const d = trigramDetail(tgNum);
    return {
      name: d.name, wuxing: d.wuxing, symbol: d.symbol,
      number: d.number, direction: d.direction, nature: d.nature,
    };
  };
  return {
    position: which,
    ti: pick(NUM_BY_NAME[h.trigrams[which.ti]]),
    yong: pick(NUM_BY_NAME[h.trigrams[which.yong]]),
  };
}

/** 一次算出本卦 / 互卦 / 变卦 / 错卦 / 综卦 / 体用。 */
function deriveAll(lines6, moving) {
  const lines = Array.from(lines6, Number);
  const mv = Array.from(moving, Number).sort((a, b) => a - b);
  const which = judgeTiYong(mv);
  return {
    main: buildHexagram(lines),
    mutual: buildHexagram(mutualLines(lines)),
    changed: buildHexagram(changedLines(lines, mv)),
    opposite: buildHexagram(oppositeLines(lines)),
    reversed: buildHexagram(reversedLines(lines)),
    moving_lines: mv,
    ti_yong: tiYongDetail(buildHexagram(lines), which),
    ti_yong_note: which.note,
  };
}

// ─────────────────────────────────────────────────────────────
// 起卦：三法归一（上卦数、下卦数、动爻）
// ─────────────────────────────────────────────────────────────

/** 余数为 0 时取 8（古法：数尽则取八）。 */
function wrap8(number) { return (number % 8) || 8; }
/** 余数为 0 时取 6（古法：数尽则取六爻）。 */
function wrap6(number) { return (number % 6) || 6; }

function pad2(n) { return String(n).padStart(2, '0'); }

/** 把三个数打包成统一的起卦结果（含六爻阴阳，自下而上）。 */
function pack(method, upperNum, lowerNum, moving, inputs, derivation) {
  const meta = METHOD_META[method];
  return {
    method,
    method_name: meta.name,
    source: meta.source,
    note: meta.note,
    inputs,
    derivation,
    upper_num: upperNum,
    lower_num: lowerNum,
    upper_trigram: NUMBER_TO_TRIGRAM[upperNum],
    lower_trigram: NUMBER_TO_TRIGRAM[lowerNum],
    moving,
    lines: linesOfTrigram(lowerNum).concat(linesOfTrigram(upperNum)),
  };
}

/**
 * 时间起卦的取数（古法）—— **六爻的时间起卦与本模块共用同一份公式**。
 *
 * 古书《梅花易数》正法：农历年支序、农历月、农历日、时辰序
 *   上卦数 = (年支序 + 农历月 + 农历日) % 8（0 取 8）
 *   下卦数 = (年支序 + 农历月 + 农历日 + 时辰序) % 8（0 取 8）
 *   动爻数 = (年支序 + 农历月 + 农历日 + 时辰序) % 6（0 取 6）
 *
 * **刻意不做「公历回退」**：拿公历年月日当农历用会算出**看着正常的错卦**
 * （错卦比报错危险得多，用户分辨不出）。起卦依赖农历，没有农历就只能不占。
 */
function meihuaTimeNumbers(dt) {
  const t = G.normalize(dt === undefined || dt === null ? new Date() : dt);
  const lun = G.lunarOf(t);

  const yearBranch = lun.getYearZhi();
  const yNum = ZHI_ORDER.indexOf(yearBranch) + 1;
  const m = Math.abs(lun.getMonth());   // 农历月（闰月库返回负值，取绝对值）
  const d = lun.getDay();
  // 时辰序：23-1 子时=1, 1-3 丑=2, …, 21-23 亥=12
  const hNum = t.h === 23 ? 1 : (Math.floor((t.h + 1) / 2) % 12) + 1;

  const sum3 = yNum + m + d;
  const sum4 = sum3 + hNum;
  return {
    source: 'lunar',
    datetime: `${t.y}-${pad2(t.mo)}-${pad2(t.d)}T${pad2(t.h)}:${pad2(t.mi)}:00`,
    year_branch: yearBranch,
    year_num: yNum,
    lunar_month: m,
    lunar_day: d,
    hour_branch: ZHI_ORDER[hNum - 1],
    hour_num: hNum,
    upper_num: wrap8(sum3),
    lower_num: wrap8(sum4),
    moving: wrap6(sum4),
  };
}

/** 时间起卦法（农历年月日时）。 */
function qiguaTime(dt) {
  const n = meihuaTimeNumbers(dt);
  return pack('time', n.upper_num, n.lower_num, n.moving,
    { datetime: n.datetime },
    {
      formula: '上卦=(年支序+农历月+农历日)÷8；下卦=(年支序+农历月+农历日+时辰序)÷8；'
        + '动爻=(年支序+农历月+农历日+时辰序)÷6',
      year_branch: n.year_branch,
      year_num: n.year_num,
      lunar_month: n.lunar_month,
      lunar_day: n.lunar_day,
      hour_branch: n.hour_branch,
      hour_num: n.hour_num,
      sum_3: n.year_num + n.lunar_month + n.lunar_day,
      sum_4: n.year_num + n.lunar_month + n.lunar_day + n.hour_num,
      calendar: n.source,
    });
}

/**
 * 数字起卦法（报数）。
 *
 * 古法：上卦 = 第一数 ÷ 8 的余数，下卦 = 第二数 ÷ 8 的余数，
 * 动爻 = 两数之和 ÷ 6 的余数；报了第三个数时，动爻改由**三数之和**取。
 */
function qiguaNumbers(num1, num2, num3) {
  for (const [label, v] of [['第一数', num1], ['第二数', num2]]) {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`${label}必须是正整数，收到 ${v}`);
  }
  if (num3 !== undefined && num3 !== null && (!Number.isInteger(num3) || num3 <= 0)) {
    throw new Error(`第三数必须是正整数，收到 ${num3}`);
  }

  const upperNum = wrap8(num1);
  const lowerNum = wrap8(num2);

  let moving;
  let movingFrom;
  let total;
  if (num3 === undefined || num3 === null) {
    moving = wrap6(num1 + num2);
    movingFrom = `${num1} + ${num2} = ${num1 + num2}`;
    total = num1 + num2;
  } else {
    moving = wrap6(num1 + num2 + num3);
    movingFrom = `${num1} + ${num2} + ${num3} = ${num1 + num2 + num3}`;
    total = num1 + num2 + num3;
  }

  return pack('number', upperNum, lowerNum, moving,
    { num1, num2, num3: num3 === undefined ? null : num3 },
    {
      formula: '上卦=第一数÷8；下卦=第二数÷8；动爻=总和÷6',
      upper_calc: `${num1} ÷ 8 余 ${upperNum}`,
      lower_calc: `${num2} ÷ 8 余 ${lowerNum}`,
      moving_calc: `${movingFrom}，÷ 6 余 ${moving}`,
      total,
    });
}

/**
 * 字数平分点，与古法「字占」的分法一致。
 *
 * 古法：二字平分、三字一字上二字下、五字二字上三字下、十字五上五下……
 * 即「前一半取小、后一半取大」，正是 n // 2。
 */
function splitIndex(n) { return Math.floor(n / 2); }

/**
 * 字数起卦法（字占），按**笔画**取数。
 *
 * 前一半字的笔画和 ÷ 8 → 上卦；后一半 ÷ 8 → 下卦；总笔画 ÷ 6 → 动爻。
 * 分半为「前小后大」，与二字/三字/五字/十字诸例吻合。
 *
 * 两处**本实现的取舍**（古书各本互异，取确定性规则并写明）：
 * * **一字占**：无前后可分，改用与「物数法」相同的取法 ——
 *   笔画 ÷ 8 为上卦、(笔画+1) ÷ 8 为下卦、笔画 ÷ 6 为动爻。
 * * **十一字以上**：古法作「不必分，只以字数取卦」。本实现仍按笔画平分 ——
 *   同一段文字必须只对应一个卦，平分是唯一能做到这点的确定性规则。
 *
 * @param {string} text
 * @param {number[]} [strokes] 可选的笔画数序列（与 text 逐字对应）。不传则查内置
 *   笔画表（`strokes.js`，6944 常用字，简体字形）。**要按繁体或康熙笔画起卦时传这个参数。**
 */
function qiguaCharacters(text, strokes) {
  const chars = Array.from(text || '').filter((c) => !/\s/.test(c));
  if (!chars.length) throw new Error('字数起卦需要至少一个字');

  let strokeList;
  if (strokes !== undefined && strokes !== null) {
    strokeList = Array.from(strokes, (s) => Math.trunc(Number(s)));
    if (strokeList.length !== chars.length) {
      throw new Error(`笔画数有 ${strokeList.length} 个，文字有 ${chars.length} 个，对不上`);
    }
  } else {
    const missing = [];
    strokeList = [];
    for (const c of chars) {
      const n = S.strokeCount(c);
      if (n === undefined) missing.push(c);
      strokeList.push(n || 0);
    }
    if (missing.length) {
      throw new Error('这些字不在笔画表里，无法按笔画起卦：' + missing.join('')
        + '。可改用数字起卦，或传入 strokes 参数自行给出笔画数');
    }
  }

  const total = strokeList.reduce((a, b) => a + b, 0);
  const n = chars.length;

  let upperNum; let lowerNum; let split; let upperCalc; let lowerCalc;
  if (n === 1) {
    upperNum = wrap8(total);
    lowerNum = wrap8(total + 1);
    split = null;
    upperCalc = `「${chars[0]}」${total} 画 ÷ 8 余 ${upperNum}`;
    lowerCalc = `(${total} + 1) ÷ 8 余 ${lowerNum}`;
  } else {
    split = splitIndex(n);
    const head = strokeList.slice(0, split);
    const tail = strokeList.slice(split);
    const sumHead = head.reduce((a, b) => a + b, 0);
    const sumTail = tail.reduce((a, b) => a + b, 0);
    upperNum = wrap8(sumHead);
    lowerNum = wrap8(sumTail);
    upperCalc = `前 ${split} 字「${chars.slice(0, split).join('')}」共 ${sumHead} 画 ÷ 8 余 ${upperNum}`;
    lowerCalc = `后 ${n - split} 字「${chars.slice(split).join('')}」共 ${sumTail} 画 ÷ 8 余 ${lowerNum}`;
  }

  const moving = wrap6(total);
  return pack('character', upperNum, lowerNum, moving,
    { text, char_count: n },
    {
      formula: '上卦=前半笔画和÷8；下卦=后半笔画和÷8；动爻=总笔画÷6',
      chars,
      strokes_per_char: strokeList,
      split_index: split,
      total_strokes: total,
      upper_calc: upperCalc,
      lower_calc: lowerCalc,
      moving_calc: `总笔画 ${total} ÷ 6 余 ${moving}`,
      stroke_source: (strokes === undefined || strokes === null)
        ? '内置笔画表（简体字形）' : '调用方提供',
    });
}

/** 统一入口：method ∈ {time, number, character}。 */
function qigua(method, kwargs) {
  const k = kwargs || {};
  if (method === 'time') return qiguaTime(k.dt);
  if (method === 'number') return qiguaNumbers(k.num1, k.num2, k.num3);
  if (method === 'character') return qiguaCharacters(k.text, k.strokes);
  throw new Error(`不支持的起卦法：'${method}'，可选 `
    + `[${Object.keys(METHOD_META).sort().map((x) => `'${x}'`).join(', ')}]`);
}

// ─────────────────────────────────────────────────────────────
// 断卦：体用生克 × 四时旺衰 × 互卦过程 × 变卦结局
// ─────────────────────────────────────────────────────────────

// 关系 → (基础吉凶, 判词)。顺序即判断优先级。
const RELATION_TEXT = {
  用生体: { level: '大吉', score: 2, text: '用卦生体卦，外力来助，事顺而易成' },
  体用比和: { level: '吉', score: 1, text: '体用比和，彼此不相克，和顺可成' },
  体克用: { level: '吉', score: 1, text: '体卦克用卦，主动权在己，事可成但需费力' },
  体生用: { level: '凶', score: -1, text: '体卦生用卦，耗己以利外，费力而不讨好' },
  用克体: { level: '凶', score: -1, text: '用卦克体卦，事来压身，受制于外，多阻' },
};

// 体卦旺衰 → 强弱档（旺相为强，休囚死为弱）
const STRENGTH_LEVEL = { 旺: '强', 相: '强', 休: '弱', 囚: '弱', 死: '弱' };

// 体弱时把基础吉凶再压一档；体强时不改吉凶，只加一句「能当」的说明。
// 不用「体强就加吉」是因为克本身仍有阻力，粉饰成吉会误导。
const WEAK_ADJUST = { 大吉: '吉', 吉: '平', 平: '凶', 凶: '大凶', 大凶: '大凶' };

const LEVEL_SCORE = { 大吉: 2, 吉: 1, 平: 0, 凶: -1, 大凶: -2 };

// 五行 → 应期地支（古法：以卦之五行定应期）
const YINGQI_ZHI = {
  木: '寅卯', 火: '巳午', 土: '辰戌丑未', 金: '申酉', 水: '亥子',
};

/** 体卦五行与用卦五行的关系。 */
function wuxingRelation(ti, yong) {
  if (ti === yong) return '体用比和';
  if (C.SHENG[ti] === yong) return '体生用';
  if (C.SHENG[yong] === ti) return '用生体';
  if (C.KE[ti] === yong) return '体克用';
  if (C.KE[yong] === ti) return '用克体';
  throw new Error(`五行 '${ti}' 与 '${yong}' 之间没有关系？`);
}

/** 体卦在月令下的旺衰。 */
function tiStrength(tiWuxing, monthDizhi) {
  if (!monthDizhi) return { available: false };
  const label = C.getStrength(tiWuxing, monthDizhi);
  if (!label) throw new Error(`月支 '${monthDizhi}' 取不到旺衰`);
  const level = STRENGTH_LEVEL[label];
  return {
    available: true,
    wuxing: tiWuxing,
    month_dizhi: monthDizhi,
    label,
    level,
    text: `体卦属${tiWuxing}，生于${monthDizhi}月为「${label}」，体气${level}`,
  };
}

/** 体卦与「另一个卦」的关系（用于互卦、变卦）。 */
function relationBlock(tiWx, otherWx, what) {
  const rel = wuxingRelation(tiWx, otherWx);
  const info = RELATION_TEXT[rel];
  return {
    what,
    relation: rel,
    level: info.level,
    score: info.score,
    text: `${what}属${otherWx}，与体卦（${tiWx}）成「${rel}」——${info.text}`,
  };
}

/** 体卦弱则吉凶降一档（克不动人，也扛不住克）。 */
function strengthAdjust(level, strength) {
  if (!strength || !strength.available) return level;
  if (strength.level === '弱') return WEAK_ADJUST[level] || level;
  return level;
}

function scoreToLevel(score) {
  if (score >= 2) return '大吉';
  if (score === 1) return '吉';
  if (score === 0) return '平';
  if (score === -1) return '凶';
  return '大凶';
}

function sign(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }

/**
 * 对一次起卦结果做完整断卦。
 *
 * 返回含 `gua`（五种卦）、`ti_yong`、`relations`、`strength`、`verdict`、`evidence`
 * 的字典。`evidence` 是逐条依据，解读层应当**逐条引用**而不是自己另编一套说辞 ——
 * 这样「结论」始终由算法给出，LLM 换不掉也编不出。
 */
function analyze(qiguaResult, opts) {
  const o = opts || {};
  const monthDizhi = o.monthDizhi || '';
  const question = o.question || '';

  const lines = qiguaResult.lines;
  const moving = [qiguaResult.moving];
  const g = deriveAll(lines, moving);

  const ti = g.ti_yong.ti;
  const yong = g.ti_yong.yong;
  const tiWx = ti.wuxing;
  const yongWx = yong.wuxing;

  const strength = tiStrength(tiWx, monthDizhi);

  // ── 主判：体用关系 ──
  const rel = wuxingRelation(tiWx, yongWx);
  const base = RELATION_TEXT[rel];
  const mainLevel = strengthAdjust(base.level, strength);

  const evidence = [];
  const yongIsLower = g.ti_yong.position.yong === 'lower';
  evidence.push(
    `体卦为${ti.name}（${tiWx}，${ti.nature}），`
    + `用卦为${yong.name}（${yongWx}，${yong.nature}）——`
    + `动爻在第 ${qiguaResult.moving} 爻，`
    + (yongIsLower ? '下卦动故下卦为用' : '上卦动故上卦为用'));
  evidence.push(`体用成「${rel}」：${base.text}`);
  if (strength.available) {
    evidence.push(strength.text);
    if (mainLevel !== base.level) {
      evidence.push(`体气既${strength.label}，原判「${base.level}」降一档为「${mainLevel}」`);
    }
  }

  // ── 过程：互卦 ──
  const mu = g.mutual;
  const muRel = relationBlock(tiWx, mu.upper.wuxing, `互卦上卦（${mu.trigrams.upper}）`);
  evidence.push(muRel.text + '，此看事情发展之过程');

  // ── 结局：变卦 ──
  const ch = g.changed;
  const chRel = relationBlock(tiWx,
    yongIsLower ? ch.lower.wuxing : ch.upper.wuxing,
    `变卦用位（${yongIsLower ? ch.trigrams.lower : ch.trigrams.upper}）`);
  evidence.push(chRel.text + '，此看事情之结局');

  // ── 综合：主判 + 结局微调 ──
  let score = LEVEL_SCORE[mainLevel] + sign(chRel.score);
  score = Math.max(-2, Math.min(2, score));
  const verdict = scoreToLevel(score);

  if (verdict !== mainLevel) {
    evidence.push(`合观变卦之结局，总断由「${mainLevel}」调整为「${verdict}」`);
  }

  // ── 应期 ──
  const yingqi = {
    basis: `以用卦五行（${yongWx}）定应期`,
    zhi: YINGQI_ZHI[yongWx],
    text: `用卦属${yongWx}，应期多在${YINGQI_ZHI[yongWx]}之月或日；`
      + '体弱则验于生体之期，体旺则验于用卦当令之期',
  };
  evidence.push(yingqi.text);

  return {
    question,
    method: qiguaResult.method,
    method_name: qiguaResult.method_name,
    source: qiguaResult.source,
    inputs: qiguaResult.inputs,
    derivation: qiguaResult.derivation,
    gua: {
      main: g.main,
      mutual: g.mutual,
      changed: g.changed,
      opposite: g.opposite,
      reversed: g.reversed,
    },
    moving_lines: g.moving_lines,
    ti_yong: {
      position: g.ti_yong.position,
      note: g.ti_yong_note,
      ti,
      yong,
    },
    strength,
    relations: {
      ti_yong: { relation: rel, level: base.level, text: base.text },
      mutual: muRel,
      changed: chRel,
    },
    main_level: mainLevel,
    verdict,
    score,
    yingqi,
    evidence,
  };
}

/**
 * 取月支：时间法用起卦时刻，其余用当下。
 *
 * 用 `ganzhi.monthDizhiAt`（精确到交节时刻）—— 真源 shushu
 * `core/meihua/analyzer._default_month_dizhi` 调的是 `solar_terms.get_month_dizhi_at`，
 * 那正是交节时刻口径，故两侧同口径、无需申报。详见 ganzhi.js 的注释。
 *
 * `dt` 取不到时（异常、库缺）返回 ""，`tiStrength` 便给 `{available:false}`、
 * 旺衰整段略去 —— 与 shushu 的 `except Exception: return ""` 同形（防御路径，
 * `coverage_meihua.py` 有冒烟断言）。
 */
function defaultMonthDizhi(qiguaResult, opts) {
  let dt = null;
  if (qiguaResult.method === 'time') {
    const raw = qiguaResult.inputs.datetime;
    if (raw) dt = raw;
  }
  if (dt === null) dt = opts.dt || new Date();
  try {
    return G.monthDizhiAt(dt);
  } catch (e) {
    // 月支取不到不该让整个断卦失败 —— 退化为不做旺衰判断，
    // analyze() 会把 strength 标成 available=false，结论仍然成立。
    return '';
  }
}

/**
 * 起卦 + 断卦一条龙。
 *
 * @param {string} method time | number | character
 * @param {object} opts {question, monthDizhi, dt, num1, num2, num3, text, strokes}
 *   `monthDizhi` 留空时按起卦时间（时间法）或当下（其余二法）自动取月支。
 */
function divine(method, opts) {
  const o = opts || {};
  const result = qigua(method, o);
  let monthDizhi = o.monthDizhi || '';
  if (!monthDizhi) monthDizhi = defaultMonthDizhi(result, o);
  const analyzed = analyze(result, { monthDizhi, question: o.question || '' });
  analyzed.qigua = result;
  return analyzed;
}

module.exports = {
  METHOD_META,
  // 起卦
  qigua, qiguaTime, qiguaNumbers, qiguaCharacters, meihuaTimeNumbers,
  // 卦象
  buildHexagram, deriveAll, judgeTiYong, tiYongDetail, hexagramSymbol, hexName,
  linesOfTrigram, trigramOfLines, trigramDetail,
  mutualLines, changedLines, oppositeLines, reversedLines,
  // 断卦
  divine, analyze, wuxingRelation, tiStrength, relationBlock,
  RELATION_TEXT, YINGQI_ZHI, LEVEL_SCORE,
};

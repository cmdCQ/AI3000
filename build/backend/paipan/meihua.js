/**
 * paipan/meihua.js —— 梅花易数：起卦（时间/数字/字数/手动）+ 断卦（体用·旺衰·互变·应期）
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
 * **`manual` 不在金标准里**（shushu 只有三法），它由
 * `duipan/verify_meihua_vs_front.js` 另行核对：与前端的 64×64×6 全组合逐项比
 * 互卦/错卦/综卦/体用/卦名 —— 因为「拿现成卦号装卦」这条路上，前端才是
 * 用户实际看到的那一位，两侧算得不一样就是 bug。
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
const PZ = require('./pingze');     // 字占 4–10 字的读音取数表（生成物，见 duipan/gen_pingze_table.py）

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
  // **shushu 没有这一种**：它只有上面三法（`core/meihua/qigua.py::qigua` 的
  // method 只认 time/number/character），故 `manual` 不参与层 7 对拍（金标准里
  // 不存在该 method 的样例）。它是本项目的入口 —— 用户直接指定上下卦与动爻，
  // 或**调用方拿现成的卦号来装卦**（前端历史档、AI 对话里已起好的卦）。
  // 正因为没有对拍物，它的正确性靠 `duipan/verify_meihua_vs_front.js` 独立核对：
  // 与前端的 64×64×6 全组合逐项比对互卦/错卦/综卦/体用/卦名。
  manual: {
    name: '手动指定',
    source: '',
    note: '直接指定上卦、下卦与动爻，不经取数',
  },
  // **shushu 同样没有这一种**，它是前端梅花页的「拆半求和」，为免搬后端时把
  // 用户可见的起卦法弄丢而在此落地。与 `manual` 同一种情况：
  // 不参与层 7 对拍，正确性由 `duipan/verify_qigua_vs_front.js` 与前端逐例核对。
  split: {
    name: '拆半求和',
    source: '',
    note: '所报数字拆成前后两半，各半求和取上下卦，两半之和取动爻',
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
  // 晚子时（23:00–23:59）换日 —— 农历月/日/年支一律取**次日**。
  //
  // 这是用户 2026-09-24 拍板的偏离（同 `ganzhi.sizhu` 的日柱进位、同本文件入口的
  // 「六爻时间起卦共用本合同公式」），shushu 不换日（它直接 `lunar.getDay()`），
  // 故层 7 的 23 点样例成为**已申报偏离**（`allow_meihua.json` 按规则生成）。
  //
  // 为什么必须换日、而不是照抄 shushu：本项目的四柱在 23:00 已进日柱
  // （`getDayInGanZhiExact`），若梅花的农历日不跟着进，同一时刻下「日柱」说今天
  // 结束了、「农历日」说还没结束 —— 项目内部自相矛盾。且子时（23:00–01:00）
  // 在换日派里整段属于新的一天，不换日会让 23:59 与次日 00:01 相差一分钟却同卦。
  //
  // 走库的 `next(1)` 而非「日 +1」：月末/年末/闰月的进位交给库。
  const lun = t.h >= 23 ? G.lunarOfNextDay(t) : G.lunarOf(t);

  const yearBranch = lun.getYearZhi();
  const yNum = ZHI_ORDER.indexOf(yearBranch) + 1;
  const m = Math.abs(lun.getMonth());   // 农历月（闰月库返回负值，取绝对值）
  const d = lun.getDay();
  const hNum = hourNumAt(t.h);

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

/**
 * 时辰序 1..12：23-1 子时=1, 1-3 丑=2, …, 21-23 亥=12。
 *
 * 抽出来是因为**有三处**要用：时间起卦（下面）、报数与拆半求和的「动爻加时辰」
 * 选项（`qiguaNumbers`/`qiguaSplitHalf` 的 `extra` 参数）。三处各写一遍公式
 * 迟早分叉，而这种分叉的表现是「同一时刻，一个方法算子时=1、另一个算=12」。
 */
function hourNumAt(h) { return h === 23 ? 1 : (Math.floor((h + 1) / 2) % 12) + 1; }

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
 *
 * `extra`（可选）是**本项目自有**的「动爻加时辰」：只加进动爻的求和，**不动**上下卦。
 * shushu 没有这个参数，金标准也不传，故 `extra` 缺省时本函数的一字一句与移植时
 * 逐字相同（层 7 的 640 例就是这么钉住的）。传了才多出那一项，
 * 于是它的正确性只能靠前端交叉核对（`duipan/verify_qigua_vs_front.js`），
 * 不能靠对拍 —— 与 `manual`/`split` 同一种情况。
 */
function qiguaNumbers(num1, num2, num3, extra) {
  for (const [label, v] of [['第一数', num1], ['第二数', num2]]) {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`${label}必须是正整数，收到 ${v}`);
  }
  if (num3 !== undefined && num3 !== null && (!Number.isInteger(num3) || num3 <= 0)) {
    throw new Error(`第三数必须是正整数，收到 ${num3}`);
  }

  const upperNum = wrap8(num1);
  const lowerNum = wrap8(num2);
  const add = Number.isInteger(extra) && extra > 0 ? extra : 0;

  let moving;
  let movingFrom;
  let total;
  if (num3 === undefined || num3 === null) {
    movingFrom = `${num1} + ${num2} = ${num1 + num2}`;
    total = num1 + num2;
  } else {
    movingFrom = `${num1} + ${num2} + ${num3} = ${num1 + num2 + num3}`;
    total = num1 + num2 + num3;
  }
  // add 为 0 时两处都不改动 —— 保证对拍那 640 例逐字不变。
  if (add) {
    movingFrom = `${movingFrom} + ${add}（时辰） = ${total + add}`;
    total += add;
  }
  moving = wrap6(total);

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
 * 拆半求和起卦法 —— **本项目自有，shushu 没有此法**（同 `manual`）。
 *
 * 前端梅花页的「拆半求和」就是这个：把用户给的一串数字**拆成两半**（前小后大），
 * 各半求和取上下卦，两半之和取动爻。它不在层 7 的金标准里（shushu 的 `qigua()`
 * 只认 time/number/character），故正确性由 `duipan/verify_qigua_vs_front.js`
 * 与前端逐例核对 —— 本函数是**照抄前端那 20 行**的语义，不是重新设计：
 *
 *   半 = floor(位数 / 2)；上半 = 前「半」位之和；下半 = 其后各位之和
 *   上卦 = 上半 % 8（0 取 8）；下卦 = 下半 % 8（0 取 8）
 *   动爻 = (上半 + 下半) % 6（0 取 6）      ← 从**原始和**取模，不得用已取模的上/下卦
 *
 * 两处**容易抄错**因而特别写明的地方：
 * * 动爻必须从原始和取模。用 `upper + lower` 取模是前端早先的 bug
 *   （8 的余数会污染 6 的余数），本函数不得复现。
 * * **一位**输入时「上半」是空集，和为 0 → 上卦取 8（坤）。这不是边界兜底，
 *   是 `%8 || 8` 的直接结果；前端同此，故保持一致（`verify_qigua_vs_front.js` 有例）。
 *
 * 这里 0 **是**合法数字：它只作为求和的加数，不充当卦数（与报数法不同 ——
 * 报数里 0 要直接当卦数用，而先天卦数没有 0，故那边拒收）。
 *
 * @param {number[]|string} digits 各位数字（0–9），或等价的数字串
 * @param {number} [extra] 「动爻加时辰」，同 `qiguaNumbers`
 */
function qiguaSplitHalf(digits, extra) {
  const list = (typeof digits === 'string' ? digits.split('') : (digits || []))
    .map((x) => (typeof x === 'string' ? parseInt(x, 10) : x));
  if (!list.length) throw new Error('拆半求和需要至少一位数字');
  for (const v of list) {
    if (!Number.isInteger(v) || v < 0 || v > 9) {
      throw new Error(`拆半求和的每一位必须是 0-9 的数字，收到 ${v}`);
    }
  }

  const half = Math.floor(list.length / 2);
  const sum1 = list.slice(0, half).reduce((a, b) => a + b, 0);
  const sum2 = list.slice(half).reduce((a, b) => a + b, 0);
  const upperNum = wrap8(sum1);
  const lowerNum = wrap8(sum2);
  const add = Number.isInteger(extra) && extra > 0 ? extra : 0;
  const total = sum1 + sum2 + add;
  const moving = wrap6(total);
  const addFrom = add ? ` + ${add}（时辰）` : '';

  return pack('split', upperNum, lowerNum, moving,
    { digits: list.slice(), extra: add },
    {
      formula: '上卦=前半之和÷8；下卦=后半之和÷8；动爻=两半总合÷6',
      split_at: half,
      upper_calc: `${list.slice(0, half).join('+') || '0'} = ${sum1}，÷ 8 余 ${upperNum}`,
      lower_calc: `${list.slice(half).join('+') || '0'} = ${sum2}，÷ 8 余 ${lowerNum}`,
      moving_calc: `${sum1} + ${sum2} = ${sum1 + sum2}${addFrom}，÷ 6 余 ${moving}`,
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
 * 字占（《梅花易数·字占》）—— 取数**按字数分档**，不是一律按笔画。
 *
 * 原文：「凡见字数如停匀，即平分一半为上卦，一半为下卦。如字数不匀，即少一字为上卦，
 * 以多一字为下卦」（→ 分半点 = n // 2）＋「**四字以上，不必数画数，只以平仄声音调之。
 * 平声为一数，上声为二数，去声为三数，入声为四数**」＋「**十一字以上……又不用平仄声音
 * 调之，止用字数**。如字数均平，则以半为上卦，以半为下卦。又**合二卦总数取爻**」。故三档：
 *
 * | 字数 | 取数 |
 * |---|---|
 * | 1 | **拒收**（古法一字占要按楷书分左右笔画，本版未做） |
 * | 2–3 | 笔画（`strokes.js`，6944 常用字；调用方显式给 `strokes` 时用调用方的） |
 * | 4–10 | **读音平仄**：入声 4 / 去声 3 / 上声 2 / 平声 1（`pingze.js`） |
 * | ≥11 | 每字算 1（止用字数，不查任何表） |
 *
 * 三档取完数后走**同一段**拆半取模（上卦 = 前半和 ÷ 8、下卦 = 后半和 ÷ 8、动爻 =
 * **取数总和** ÷ 6，余 0 取 8/8/6），与「拆半求和」同一套算式 —— 此处不另造。
 * 动爻取**未取模的总和**：原文「以重卦总数除六」，「西林寺牌额占」的反例（17 ÷ 6 余 5）
 * 明确否掉了「上下卦数之和」那种写法（7 + 2 = 9 ÷ 6 余 3）。
 *
 * **调用方显式给 `strokes` 即强制走笔画档** —— 保住「按繁体/康熙笔画起卦」的旧调用路径
 * （也是层 7 对照组复现旧口径的唯一手段）。此时 4 字以上按笔画平分，与原文的平仄/字数
 * 档**不同**：那是调用方明确要求的口径，`derivation.stroke_source` 标着「调用方提供」。
 *
 * 三处**本项目的约定**（原文没有规定，别当成古法；`pingze.js` 头注有同样一段）：
 * * 音系 = **现代普通话读音为底 + 平水韵入声字覆写为 4**。原文自带的验算例「今日动静
 *   如何」把「动」「静」算去声（中古浊上声 → 浊上归去已固化在今音里）、把「日」算入声
 *   （今音读去声）—— 只有这一口径能逐字吻合。详见 `duipan/verify_meihua_zishan.js`。
 * * 多音字**入声优先**；轻声音节跳过。
 * * 平水韵与今音都查不到的字 → **拒收**并点名（不猜、不静默兜底成平声）。
 *
 * @param {string} text
 * @param {number[]} [strokes] 可选的笔画数序列（与 text 逐字对应）。**给了就强制按笔画
 *   取数**；不给才按字数分档（≤3 查笔画表、4–10 查平仄表、≥11 只数字数）。
 */
function qiguaCharacters(text, strokes) {
  const chars = Array.from(text || '').filter((c) => !/\s/.test(c));
  if (!chars.length) throw new Error('字数起卦需要至少一个字');
  const n = chars.length;

  // 一字占排在最前：它不是「查不到表」，而是本版**故意不做**—— 古法要按楷书拆左右
  // 笔画，光有总笔画数不够（调用方显式给 strokes 也不够），故一律拒收并指路。
  if (n === 1) {
    throw new Error('古法一字占要按楷书分左右笔画取卦，本版未实现，请输入两个字以上'
      + '（也可以改用数字或时间起卦）');
  }

  const given = strokes !== undefined && strokes !== null;
  let branch;
  let counts;            // 逐字取数
  let sources = null;    // 逐字依据（只有平仄档有）
  if (given || n <= 3) {
    branch = 'stroke';
    if (given) {
      counts = Array.from(strokes, (s) => Math.trunc(Number(s)));
      if (counts.length !== n) {
        throw new Error(`笔画数有 ${counts.length} 个，文字有 ${n} 个，对不上`);
      }
    } else {
      const missing = [];
      counts = [];
      for (const c of chars) {
        const sc = S.strokeCount(c);
        if (sc === undefined) missing.push(c);
        counts.push(sc || 0);
      }
      if (missing.length) {
        throw new Error('这些字不在笔画表里，无法按笔画起卦：' + missing.join('')
          + '。可改用数字起卦，或传入 strokes 参数自行给出笔画数');
      }
    }
  } else if (n <= 10) {
    branch = 'pingze';
    const missing = [];
    counts = [];
    sources = [];
    for (const c of chars) {
      const v = PZ.countOf(c);
      if (v === undefined) { missing.push(c); continue; }
      counts.push(v);
      sources.push(PZ.sourceOf(c));
    }
    if (missing.length) {
      throw new Error('这些字查不到读音调类，无法按平仄取数：' + missing.join('')
        + '。可改用数字起卦，或传入 strokes 参数按笔画起卦');
    }
  } else {
    branch = 'count';
    counts = chars.map(() => 1);
  }

  const split = splitIndex(n);
  const sumHead = counts.slice(0, split).reduce((a, b) => a + b, 0);
  const sumTail = counts.slice(split).reduce((a, b) => a + b, 0);
  const total = sumHead + sumTail;
  const upperNum = wrap8(sumHead);
  const lowerNum = wrap8(sumTail);
  const moving = wrap6(total);

  const head = chars.slice(0, split).join('');
  const tail = chars.slice(split).join('');
  let upperCalc; let lowerCalc; let movingCalc;
  if (branch === 'stroke') {
    upperCalc = `前 ${split} 字「${head}」共 ${sumHead} 画 ÷ 8 余 ${upperNum}`;
    lowerCalc = `后 ${n - split} 字「${tail}」共 ${sumTail} 画 ÷ 8 余 ${lowerNum}`;
    movingCalc = `总笔画 ${total} ÷ 6 余 ${moving}`;
  } else if (branch === 'pingze') {
    upperCalc = `前 ${split} 字「${head}」取数 ${counts.slice(0, split).join('+')} = ${sumHead}`
      + `，÷ 8 余 ${upperNum}`;
    lowerCalc = `后 ${n - split} 字「${tail}」取数 ${counts.slice(split).join('+')} = ${sumTail}`
      + `，÷ 8 余 ${lowerNum}`;
    movingCalc = `取数 ${sumHead} + ${sumTail} = ${total}，÷ 6 余 ${moving}`;
  } else {
    upperCalc = `前 ${split} 字「${head}」共 ${split} 数 ÷ 8 余 ${upperNum}`;
    lowerCalc = `后 ${n - split} 字「${tail}」共 ${n - split} 数 ÷ 8 余 ${lowerNum}`;
    movingCalc = `总字数 ${total} ÷ 6 余 ${moving}`;
  }

  let derivation;
  if (branch === 'stroke') {
    // ⚠ 这一档的 derivation 键集必须与旧实现（shushu）**逐字相同** ——
    // 层 7 里那 6 例 2–3 字样例要求零申报，多一个键（哪怕只是 `branch`）就得多申报一条。
    // 要判档请看有没有 `counts_per_char` / `total_strokes`，别往这一档加标记字段。
    derivation = {
      formula: '上卦=前半笔画和÷8；下卦=后半笔画和÷8；动爻=总笔画÷6',
      chars,
      strokes_per_char: counts,
      split_index: split,
      total_strokes: total,
      upper_calc: upperCalc,
      lower_calc: lowerCalc,
      moving_calc: movingCalc,
      stroke_source: given ? '调用方提供' : '内置笔画表（简体字形）',
    };
  } else if (branch === 'pingze') {
    derivation = {
      formula: '上卦=前半取数和÷8；下卦=后半取数和÷8；动爻=取数总和÷6',
      branch,
      chars,
      counts_per_char: counts,
      count_source_per_char: sources,
      split_index: split,
      sum_head: sumHead,
      sum_tail: sumTail,
      total,
      upper_calc: upperCalc,
      lower_calc: lowerCalc,
      moving_calc: movingCalc,
    };
  } else {
    derivation = {
      formula: '上卦=前半字数÷8；下卦=后半字数÷8；动爻=总字数÷6',
      branch,
      chars,
      split_index: split,
      sum_head: sumHead,
      sum_tail: sumTail,
      total,
      upper_calc: upperCalc,
      lower_calc: lowerCalc,
      moving_calc: movingCalc,
    };
  }

  const out = pack('character', upperNum, lowerNum, moving, { text, char_count: n }, derivation);
  // `pack` 的 note 取自 METHOD_META，是**笔画档**那一句（= shushu 的原文，故 ≤3 字不许动）；
  // 另外两档换成各自的原文依据，别让用户以为四字以上也是数笔画算出来的。
  if (branch === 'pingze') {
    out.note = '四字以上按读音平仄取数：平声一数、上声二数、去声三数、入声四数';
  } else if (branch === 'count') {
    out.note = '十一字以上不再按平仄，只以字数取数：每字算一数';
  }
  return out;
}

/**
 * 手动指定（本项目自有起卦入口，shushu 无此法）。
 *
 * 两个用途：
 * 1. 用户在「手动指定」里直接给上卦、下卦、动爻；
 * 2. **拿现成的卦号装卦** —— AI 对话/历史档里已经有卦号了（前端存的就是
 *    上下卦号 + 动爻），断卦层不必知道卦是怎么起的，`analyze()` 只吃
 *    `lines` / `moving`。
 *
 * 第 2 个用途是本模块接进 prompt 的关键：梅花 prompt 原先直接用**前端算好的**
 * 互卦/错卦/综卦/体用/判词，前端算错就跟着错。改成「只取前端那三个原始数字
 * （上下卦号 + 动爻），其余一律本模块重算」后，派生层就都落在已对拍的范围里。
 *
 * 校验上下界：`linesOfTrigram` 取不到卦号会抛，但 `wrap8` 不校验 —— 手动的
 * 输入是**人给的**，越界必须当场拒掉，不能靠下游 undefined 顺着传。
 */
function fromGua(upperNum, lowerNum, moving) {
  for (const [label, v] of [['上卦', upperNum], ['下卦', lowerNum]]) {
    if (!Number.isInteger(v) || v < 1 || v > 8) {
      throw new Error(`${label}数必须是 1-8 的整数，收到 ${v}`);
    }
  }
  if (!Number.isInteger(moving) || moving < 1 || moving > 6) {
    throw new Error(`动爻必须是 1-6 的整数，收到 ${moving}`);
  }
  return pack('manual', upperNum, lowerNum, moving,
    { upper: upperNum, lower: lowerNum, moving },
    { formula: '直接指定，不取数',
      upper_trigram: NUMBER_TO_TRIGRAM[upperNum],
      lower_trigram: NUMBER_TO_TRIGRAM[lowerNum],
      moving_calc: `动爻指定为第 ${moving} 爻` });
}

/**
 * 统一入口：method ∈ {time, number, character, manual, split}。
 *
 * 后两者是本项目自有（shushu 无），见各自的 METHOD_META 注。
 */
function qigua(method, kwargs) {
  const k = kwargs || {};
  if (method === 'time') return qiguaTime(k.dt);
  if (method === 'number') return qiguaNumbers(k.num1, k.num2, k.num3, k.extra);
  if (method === 'character') return qiguaCharacters(k.text, k.strokes);
  if (method === 'manual') return fromGua(k.upper, k.lower, k.moving);
  if (method === 'split') return qiguaSplitHalf(k.digits, k.extra);
  // 报错文案里**只列 shushu 那三法**，不列 `manual`：这行字是要与金标准
  // 逐字对拍的（层 7 的错误路径 10 例），shushu `qigua()` 抛的就是那三个。
  // 故此处不用 `Object.keys(METHOD_META)`——那样加个本项目自有的入口就会
  // 把对拍搅红，而那是**文案**红了、不是行为错了，最费时间的一类假红。
  throw new Error(`不支持的起卦法：'${method}'，可选 `
    + `['character', 'number', 'time']`);
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
  qigua, qiguaTime, qiguaNumbers, qiguaCharacters, fromGua, qiguaSplitHalf,
  meihuaTimeNumbers, hourNumAt,
  // 卦象
  buildHexagram, deriveAll, judgeTiYong, tiYongDetail, hexagramSymbol, hexName,
  linesOfTrigram, trigramOfLines, trigramDetail,
  mutualLines, changedLines, oppositeLines, reversedLines,
  // 断卦
  divine, analyze, wuxingRelation, tiStrength, relationBlock,
  RELATION_TEXT, YINGQI_ZHI, LEVEL_SCORE,
};

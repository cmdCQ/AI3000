/**
 * paipan/current_fortune.js —— 八字·当前运程（3.5.4b-1）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/current_fortune.py`（106 行）：
 *   `build_current_fortune` :17 → `pickCurrentFortune`（纯函数）
 *                                + `buildCurrentFortune`（自己算大运流年再调它）
 *
 * 基准只断先天静盘，不言「现走何运、今年如何」。本模块据已有的大运/流年，
 * 萃取「当前大运 + 当年流年 + 近年五年 + 岁运组合」，供 overview/synthesis/master 织入。
 *
 * ── 拆成两个函数是**刻意**的，与基准的单一入口不同 ──
 * 基准 `build_current_fortune(chart, gender, birth_year, current_year=2026)` 内部自己调
 * `calculate_dayun` / `calculate_liunian`。移植侧把它拆开：
 *   `pickCurrentFortune(chart, gender, birthYear, currentYear, dayun, liunian)` —— **纯**
 *   `buildCurrentFortune(chart, gender, birthYear, currentYear)`        —— 现算再调上面那个
 * 理由：大运/流年列表**由层 9（`bazi_fortune.js`）负责**，那一层的口径偏离（shushu 节表
 * 偏早 4.6–16.3 分，起运岁数随之浮动）已经在层 9 按原因分桶处理过。本层要验的是
 * **「从列表里挑出当前那一段」**这套判断，不是再验一遍历法。
 * ⇒ 对拍时把 `dayun`/`liunian` **原样注入**；生产走 `buildCurrentFortune`。
 * 这跟层 3「四柱由金标准原样传入，本层不验历法」是同一条分层约定。
 *
 * ── 不包 try/except（与层 14 同一条决定）──
 * 基准在 `calculate_dayun`/`calculate_liunian` 外面套了 try/except → 静默降级成
 * `{"available": False}`。JS 侧没有等价异常面，包了会把真 bug 吞成「这盘就是没运程」。
 * `analyze_suiyun` 外面那层 try/except 同理不搬。真抛就让它炸出来。
 *
 * ── 一处照搬的「看着像 bug」──
 * `if not birth_year: return {"available": False}` —— **假值**判断，故 `birth_year = 0`
 * 也算「没给」而直接不可用（基准如此）。用 `if (!birthYear)` 逐字对应。
 *
 * 对拍：`duipan/gen_golden_bazi_assembly.py`（家族 `cf*`）。
 */
'use strict';

const C = require('./constants.js');
const { pyGet, pyOr, pyStr, pyStrJoin, pyAddStr } = require('./pycompat.js');
const F = require('./bazi_fortune.js');
const CB = require('./bazi_combos.js');

/**
 * 纯函数：由**给定**的大运/流年列表挑出「当前」，并组岁运、近五年、扶抑。
 *
 * @param {object} chart       已分析的盘（只用 `yong_shen`）
 * @param {string} gender      与基准同：只有 `male`/`男` 走男分支（见 bazi_fortune.js）
 * @param {number} birthYear   起运基准年；**假值即不可用**（照搬基准的 `not birth_year`）
 * @param {number} currentYear 今年 —— 基准的默认值是写死的 2026，故移植侧**必须显式传**，
 *                             不许留默认值（留了就会随「今天」漂）
 * @param {Array}  dayun       `calculate_dayun` 的产物，原样使用
 * @param {Array}  liunian     `calculate_liunian` 的产物，原样使用
 */
function pickCurrentFortune(chart, gender, birthYear, currentYear, dayun, liunian) {
  if (!birthYear) return { available: false };
  dayun = pyOr(dayun, []);          // 基准 `or []`：`{}`/`8` 等非列表假值也退成 []
  liunian = pyOr(liunian, []);
  if (!dayun.length) return { available: false };

  // 当前大运：start_year ≤ 今年 < end_year
  let curDy = null;
  for (const d of dayun) {
    if (pyGet(d, 'start_year', 0) <= currentYear && currentYear < pyGet(d, 'end_year', 0)) {
      curDy = d;
      break;
    }
  }
  let preYun;
  if (curDy === null) {
    // 未交运（幼年）或超出排运：取第一/末运
    curDy = currentYear < pyGet(dayun[0], 'start_year', 0) ? dayun[0] : dayun[dayun.length - 1];
    preYun = currentYear < pyGet(dayun[0], 'start_year', 0);
  } else {
    preYun = false;
  }

  // 当年流年
  let curLn = null;
  for (const l of liunian) {
    if (pyGet(l, 'year', null) === currentYear) { curLn = l; break; }
  }
  if (curLn === null) curLn = liunian.length ? liunian[0] : null;

  // 岁运组合（当前大运 × 当年流年）
  let suiyun = null;
  if (curDy && curLn) {
    suiyun = CB.analyzeSuiyun(chart, pyGet(curDy, 'tiangan', ''), pyGet(curDy, 'dizhi', ''),
      pyGet(curLn, 'tiangan', ''), pyGet(curLn, 'dizhi', ''));
  }

  // 近年运势（今年起 5 年）
  const recent = liunian.slice(0, 5).map((l) => ({
    year: pyGet(l, 'year', null),
    ganzhi: `${pyGet(l, 'tiangan', '')}${pyGet(l, 'dizhi', '')}`,
    quality: pyGet(l, 'quality', ''),
    shishen: pyGet(l, 'shishen_gan', ''),
  }));

  // 当前大运十神吉凶（与命局用神比对）
  // 基准此处自带一份 `_GAN_WX` 字面量表 —— 值与本项目 `constants.GAN_WUXING` 逐字相同，
  // 照「不重复定义表」取已有的那份；`.get(..., "")` 的**在不在键上**语义由 pyGet 保住。
  const ys = pyOr(pyGet(chart, 'yong_shen', {}), {});
  const yongWx = pyGet(ys, 'yong_shen_wx', '');
  const jiWx = pyGet(ys, 'ji_shen_wx', '');
  const dyWx = pyGet(C.GAN_WUXING, pyGet(curDy, 'tiangan', ''), '');
  let dyHelp = null;
  if (yongWx && dyWx) {
    if (dyWx === yongWx) dyHelp = '扶用';
    else if (dyWx === jiWx) dyHelp = '助忌';
    else dyHelp = '中性';
  }

  let suiyunBrief = '';
  if (suiyun !== null && typeof suiyun === 'object') {
    const tags = pyOr(pyGet(suiyun, 'tags', []), []);
    const notes = pyOr(pyGet(suiyun, 'notes', []), []);
    suiyunBrief = (tags.length || notes.length)
      // 基准：`"、".join(tags) + "：" + (notes[0] if notes else "")` ——
      // 两处 str 拼接都要求操作数**真是 str**（元素非 str 就在 join 抛、`notes[0]`
      // 非 str 就在 `+` 抛），故 `pyStrJoin` + `pyAddStr`，不要图省事用 `+`。
      ? pyAddStr(pyAddStr(pyStrJoin(tags, '、'), '：'), notes.length ? notes[0] : '')
      : '';
  }

  return {
    available: true,
    current_year: currentYear,
    pre_yun: preYun,
    current_dayun: {
      ganzhi: `${pyStr(pyGet(curDy, 'tiangan', ''))}${pyStr(pyGet(curDy, 'dizhi', ''))}`,
      tiangan: pyGet(curDy, 'tiangan', ''), dizhi: pyGet(curDy, 'dizhi', ''),
      start_age: pyGet(curDy, 'start_age', ''), end_age: pyGet(curDy, 'end_age', ''),
      start_year: pyGet(curDy, 'start_year', ''), end_year: pyGet(curDy, 'end_year', ''),
      shishen: pyGet(curDy, 'dm_shishen', ''), quality: pyGet(curDy, 'quality', ''),
      help: dyHelp, warning: pyGet(curDy, 'warning', ''),
    },
    current_liunian: curLn ? {
      year: pyGet(curLn, 'year', null),
      ganzhi: `${pyStr(pyGet(curLn, 'tiangan', ''))}${pyStr(pyGet(curLn, 'dizhi', ''))}`,
      shishen: pyGet(curLn, 'shishen_gan', ''),
      quality: pyGet(curLn, 'quality', ''),
      summary: pyGet(curLn, 'summary', ''),
    } : null,
    suiyun: suiyun,
    suiyun_brief: suiyunBrief,
    recent_years: recent,
  };
}

/**
 * 生产入口：自己算大运/流年，再交给 `pickCurrentFortune`。
 * 参数与基准逐字对齐（`current_year` 基准默认 2026 —— 移植侧**显式传**，
 * 由装配层决定「今年」是几，见 `bazi_full.js`）。
 */
function buildCurrentFortune(chart, gender, birthYear, currentYear) {
  if (!birthYear) return { available: false };
  const dayun = pyOr(F.calculateDayun(chart, gender, birthYear), []);
  const liunian = pyOr(F.calculateLiunian(chart, gender, birthYear,
    currentYear, currentYear + 5), []);
  return pickCurrentFortune(chart, gender, birthYear, currentYear, dayun, liunian);
}

module.exports = {
  buildCurrentFortune,
  pickCurrentFortune,
};

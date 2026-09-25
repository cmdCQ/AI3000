/**
 * paipan/bazi.js —— 八字排盘核（四柱 + 藏干 + 纳音 + 胎元/命宫/身宫 + 人元司令）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）
 *   `core/bazi/chart.py`  : build_chart / build_pillar / _get_renyuan_siling
 *   `core/bazi/analyzer.py`: 十神逐柱与汇总、旺衰、格局、神煞（analyzeChart）
 *   `core/constants.py`   : 表一律不手抄，由 `duipan/gen_bazi_tables.py` 生成 `bazi_tables.js`
 *
 * 口径（3.5.0 已钉死，实测见 duipan/gen_bazi_sizhu_probe.py + probe_bazi_jieqi_offset.py）：
 *   年柱/月柱 —— shushu 与本项目 `ganzhi.js` 同走**精确交节**，故四柱一律调 `ganzhi.sizhu()`。
 *   日柱/时柱 —— shushu 八字**完全不换日**（`_day_index(dt.date())`），本项目 2026-09-24 拍板
 *                **晚子时换日**（`getDayInGanZhiExact()`）。属**已决定的派别偏离**，不是 bug；
 *                影响面仅 23:00–23:59，对拍按来源申报。
 *   ⚠ shushu 八字的历书本身**系统性偏早 3–7 分钟**（2025–2026 全部 24 个节无一例外），
 *     故**不搬**它的 `core/calendar/solar_terms.py` —— 本项目 `ganzhi.js` 的节气表已与
 *     官方《天文年历》对齐（776 点零不一致）。交节前后 ±10 分钟按**来源**申报。
 *
 * 零归一铁律：字段名与 shushu 逐字相同（`tiangan` 不译成 `stem`、`canggan` 不译成 `hidden`
 * …）。翻译一次就多一处永久漂移，对拍也再对不上。
 */

'use strict';

const G = require('./ganzhi.js');
const C = require('./constants.js');
const T = require('./bazi_tables.js');

const { TIANGAN, DIZHI, DIZHI_WUXING, GAN_WUXING } = C;

/** 天干/地支序号（0 基）。拿不到就抛 —— 宁可炸，不要静默算出个「看着正常」的盘。 */
function ganIndex(gan) {
  const i = TIANGAN.indexOf(gan);
  if (i < 0) throw new Error(`bazi: 不是天干 ${JSON.stringify(gan)}`);
  return i;
}
function zhiIndex(zhi) {
  const i = DIZHI.indexOf(zhi);
  if (i < 0) throw new Error(`bazi: 不是地支 ${JSON.stringify(zhi)}`);
  return i;
}
/** javaScript `%` 对负数返回负值，python `%` 恒非负 —— 移植时**必须**过这一层。
 *  命宫那条式子 `(14 - 月支序 - 时支序) % 12` 最小可达 -10，直接取模会拿到 `DIZHI[-10]`
 *  = `undefined`，然后一路静默传播成空干支。 */
function mod(n, m) { return ((n % m) + m) % m; }

/** 五虎遁年起月：年干 + 月支 → 月干。`month_dizhi` 按**月序**（寅=1 月…丑=12 月），
 *  但这里只用 shushu 的原式：以寅为起点、按地支顺序数。 */
function getMonthGan(yearGan, monthZhi) {
  const start = T.MONTH_GAN_START[yearGan];
  if (!start) throw new Error(`bazi.getMonthGan: 不是年干 ${JSON.stringify(yearGan)}`);
  const monthOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const offset = monthOrder.indexOf(monthZhi);
  if (offset < 0) throw new Error(`bazi.getMonthGan: 不是地支 ${JSON.stringify(monthZhi)}`);
  return TIANGAN[(ganIndex(start) + offset) % 10];
}

/** 五鼠遁日起时：日干 + 时支 → 时干。四柱不靠它（`ganzhi.js` 已给），
 *  但断卦/校验时要用，且它是对拍时判「时柱与日柱是否自洽」的**硬约束**。 */
function getHourGan(dayGan, hourZhi) {
  const start = T.HOUR_GAN_START[dayGan];
  if (!start) throw new Error(`bazi.getHourGan: 不是日干 ${JSON.stringify(dayGan)}`);
  return TIANGAN[(ganIndex(start) + zhiIndex(hourZhi)) % 10];
}

/** 十神：`SHISHEN[日主][目标干]`。目标干不在表里返回 ''（与 shushu `get_shishen` 一致）。 */
function getShiShen(dayMaster, stem) {
  const row = T.SHISHEN[dayMaster];
  if (!row) throw new Error(`bazi.getShiShen: 不是日主 ${JSON.stringify(dayMaster)}`);
  return row[stem] || '';
}

/** 单柱：与 shushu `build_pillar` 逐字同形。 */
function buildPillar(label, tiangan, dizhi) {
  const gzName = tiangan + dizhi;
  return {
    label,
    tiangan,
    dizhi,
    nayin: T.NAYIN[gzName] === undefined ? null : T.NAYIN[gzName],
    canggan: T.CANGGAN[dizhi] || [],
    wuxing_gan: GAN_WUXING[tiangan] === undefined ? null : GAN_WUXING[tiangan],
    wuxing_zhi: DIZHI_WUXING[dizhi] === undefined ? null : DIZHI_WUXING[dizhi],
  };
}

/**
 * 人元司令分野 —— **照搬 shushu 的简化算法，包括它的缺陷**。
 *
 * shushu 拿**公历日号**（`day`）去比藏干的分野天数（如寅月「丙 1-7 日、甲 8-14、戊 15-30」）。
 * 古法的分野是**从交节起算的第几天**，不是公历日号 —— 寅月初一落在 2 月的第 3~5 天，
 * 于是整个月都被平移了几天，交节在月末时错得最多。此处**原样移植**以求对拍字面一致，
 * 差异会显形在 3.5.1 的对拍里，属 shushu 侧待修（不在本文件偷偷「修好」—— 那会造出
 * 一处永久看不见的偏离）。
 */
function getRenyuanSiling(monthZhi, day) {
  const SILING = {
    寅: [['丙', 7], ['甲', 14], ['戊', 30]],
    卯: [['甲', 10], ['乙', 30]],
    辰: [['乙', 9], ['癸', 12], ['戊', 30]],
    巳: [['戊', 7], ['庚', 14], ['丙', 30]],
    午: [['丙', 10], ['己', 11], ['丁', 30]],
    未: [['丁', 9], ['乙', 12], ['己', 30]],
    申: [['戊', 7], ['壬', 14], ['庚', 30]],
    酉: [['庚', 10], ['辛', 30]],
    戌: [['辛', 9], ['丁', 12], ['戊', 30]],
    亥: [['戊', 7], ['甲', 14], ['壬', 30]],
    子: [['壬', 10], ['癸', 30]],
    丑: [['癸', 9], ['辛', 12], ['己', 30]],
  };
  const entries = SILING[monthZhi] || [];
  let commander = '';
  let phase = '';
  for (const [gan, endDay] of entries) {
    if (day <= endDay) {
      commander = gan;
      phase = `${gan}(${GAN_WUXING[gan] || ''})司令`;
      break;
    }
  }
  return { commander, phase, month_zhi: monthZhi, day };
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * 排盘 —— 与 shushu `build_chart` 返回**同一形状**（含 `birth_dt` 的 `T` 分隔与秒）。
 * @param {string|Date|Object} input 见 `ganzhi.normalize`
 */
function buildChart(input) {
  const t = G.normalize(input);
  const sz = G.sizhu(t);

  const yGan = sz.year_gz[0];  const yZhi = sz.year_gz[1];
  const mGan = sz.month_gz[0]; const mZhi = sz.month_gz[1];
  const dGan = sz.day_gz[0];   const dZhi = sz.day_gz[1];
  const hGan = sz.hour_gz[0];  const hZhi = sz.hour_gz[1];

  // ── 胎元：月柱天干 + 1、月柱地支 + 3 ──
  const tyGan = TIANGAN[(ganIndex(mGan) + 1) % 10];
  const tyZhi = DIZHI[(zhiIndex(mZhi) + 3) % 12];

  // ── 命宫：地支 = (14 − 月支序 − 时支序) mod 12（子=1）；天干以**年干**起五虎遁 ──
  const mIdx = zhiIndex(mZhi) + 1;
  const hIdx = zhiIndex(hZhi) + 1;
  const mgZhi = DIZHI[mod(14 - mIdx - hIdx, 12)];
  const mgGan = getMonthGan(yGan, mgZhi);

  // ── 身宫：地支 = (月支序 + 时支序 − 2) mod 12；天干同样以年干起五虎遁 ──
  const sgZhi = DIZHI[mod(mIdx + hIdx - 2, 12)];
  const sgGan = getMonthGan(yGan, sgZhi);

  return {
    birth_dt: `${t.y}-${pad(t.mo)}-${pad(t.d)}T${pad(t.h)}:${pad(t.mi)}:00`,
    year_pillar: buildPillar('年柱', yGan, yZhi),
    month_pillar: buildPillar('月柱', mGan, mZhi),
    day_pillar: buildPillar('日柱', dGan, dZhi),
    hour_pillar: buildPillar('时柱', hGan, hZhi),
    day_master: dGan,
    day_master_wuxing: GAN_WUXING[dGan],
    taiyuan: { tiangan: tyGan, dizhi: tyZhi, label: `${tyGan}${tyZhi}` },
    minggong: { tiangan: mgGan, dizhi: mgZhi, label: `${mgGan}${mgZhi}` },
    shengong: { tiangan: sgGan, dizhi: sgZhi, label: `${sgGan}${sgZhi}` },
    renyuan_siling: getRenyuanSiling(mZhi, t.d),
  };
}

module.exports = {
  buildChart, getMonthGan, getHourGan, getShiShen, buildPillar,
  getRenyuanSiling, ganIndex, zhiIndex, mod,
};

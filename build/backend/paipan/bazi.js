/**
 * paipan/bazi.js —— 八字排盘核（四柱 + 藏干 + 纳音 + 胎元/命宫/身宫 + 人元司令）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）
 *   `core/bazi/chart.py`  : build_chart / build_pillar / _get_renyuan_siling
 *   `core/bazi/analyzer.py`: 十神逐柱与汇总、旺衰、格局、神煞（analyzeChart）
 *   用神/调候/格局成败/日主档案（3.5.3c）在 `bazi_yongshen.js`，此处只按 shushu 的
 *   挂载顺序挂 `tiaohou` / `geju_cheng_bai`；`yong_shen` 是 API 层挂的，故不在此处挂。
 *   `core/constants.py`   : 表一律不手抄，由 `duipan/gen_bazi_tables.py` 生成 `bazi_tables.js`
 *
 * 口径（3.5.0 已钉死，实测见 duipan/gen_bazi_sizhu_probe.py + probe_bazi_jieqi_offset.py）：
 *   年柱/月柱 —— shushu 与本项目 `ganzhi.js` 同走**精确交节**，故四柱一律调 `ganzhi.sizhu()`。
 *   日柱/时柱 —— shushu 八字**完全不换日**（`_day_index(dt.date())`），本项目 2026-09-24 拍板
 *                **晚子时换日**（`getDayInGanZhiExact()`）。属**已决定的派别偏离**，不是 bug；
 *                影响面仅 23:00–23:59，对拍按来源申报。
 *   ⚠ shushu 八字的历书本身**系统性偏早 4.6–8.2 分钟**（2025–2026 全部 24 个节无一例外），
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
const YS = require('./bazi_yongshen.js');

const { TIANGAN, DIZHI, DIZHI_WUXING, GAN_WUXING, SHENG, KE } = C;

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

/** 旺相休囚死（藏干气势派）——八字 analyzer 用这张，**不是** `constants.js` 的
 *  `STRENGTH_STRICT`（严格《子平真诠》表，六爻月建用）。两张表四季月末月取值不同。 */
function wuxingStrength(wuxing, monthZhi) {
  const row = T.STRENGTH_QISHI[wuxing];
  return row ? (row[monthZhi] || '') : '';
}

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];
const pillarsOf = (chart) => PILLAR_KEYS.map((k) => chart[k]);

/** 逐柱补 `shishen_gan` / `shishen_zhi`。支的十神取**本气**（第一藏干）——
 *  与 shushu `annotate_pillars` 一致。 */
function annotatePillars(chart) {
  const dm = chart.day_master;
  for (const k of PILLAR_KEYS) {
    const p = chart[k];
    p.shishen_gan = getShiShen(dm, p.tiangan);
    const mainHidden = (T.CANGGAN[p.dizhi] || [])[0];
    p.shishen_zhi = mainHidden ? getShiShen(dm, mainHidden) : '';
  }
  return chart;
}

/** 十神统计：**天干与藏干一起数**（shushu 如此）。排序按 count 降序，
 *  Python 的 sort 稳定 → JS 的 sort 也稳定（ES2019 起），故并列时保留出现顺序。 */
function summarizeShiShen(chart) {
  const dm = chart.day_master;
  const counter = new Map();                    // Map 保插入序 = 首次出现序
  for (const p of pillarsOf(chart)) {
    const bump = (stem) => {
      const ss = getShiShen(dm, stem);
      if (!ss) return;
      if (!counter.has(ss)) counter.set(ss, { count: 0, stems: [] });
      const e = counter.get(ss);
      e.count += 1;
      e.stems.push(stem);
    };
    bump(p.tiangan);
    for (const h of (p.canggan || [])) bump(h);
  }
  const monthZhi = chart.month_pillar.dizhi;
  const out = [];
  for (const [shishen, info] of counter) {
    const wx = info.stems.length ? (GAN_WUXING[info.stems[0]] || '') : '';
    out.push({
      shishen,
      count: info.count,
      stems: info.stems,
      strength: wx ? wuxingStrength(wx, monthZhi) : '',
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

const HELP_SHISHEN = new Set(['比肩', '劫财', '正印', '偏印']);
const DRAIN_SHISHEN = new Set(['食神', '伤官', '正财', '偏财', '正官', '七杀']);

// 三合局 / 三会方。注意 shushu 把四支放进 **set** 再判 len==3，
// 故「寅午戌」加一个重复的「寅」也算全合 —— 此处用 Set 复现同一行为。
const SANHE = [
  [['寅', '午', '戌'], '火'], [['申', '子', '辰'], '水'],
  [['巳', '酉', '丑'], '金'], [['亥', '卯', '未'], '木'],
];
const SANHUI = [
  [['寅', '卯', '辰'], '木'], [['巳', '午', '未'], '火'],
  [['申', '酉', '戌'], '金'], [['亥', '子', '丑'], '水'],
];

/** 日主旺衰。得令（严格=月令同气「旺」）与得气（旺或相）分列，
 *  再按帮扶/耗泄计分，最后三档判 身强/身弱/中和。 */
function calculateStrength(chart) {
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const monthZhi = chart.month_pillar.dizhi;

  const monthlyStatus = wuxingStrength(dmWx, monthZhi);
  const deling = monthlyStatus === '旺';
  const deqi = monthlyStatus === '旺' || monthlyStatus === '相';

  let helpScore = 0;
  let drainScore = 0;
  for (const p of pillarsOf(chart)) {
    for (const s of [p.tiangan, ...(p.canggan || [])]) {
      const ss = getShiShen(dm, s);
      if (HELP_SHISHEN.has(ss)) helpScore += 1;
      else if (DRAIN_SHISHEN.has(ss)) drainScore += 1;
    }
  }

  const dzSet = new Set(pillarsOf(chart).map((p) => p.dizhi));
  for (const [group, wx] of SANHE.concat(SANHUI)) {
    const hit = group.filter((z) => dzSet.has(z)).length;
    if (hit === 3) {
      if (SHENG[wx] === dmWx) helpScore += 3;          // 三合生日主
      else if (wx === dmWx) helpScore += 3;            // 三合同类
      else if (KE[wx] === dmWx) drainScore += 3;       // 三合克日主
      else if (KE[dmWx] === wx) drainScore += 2;       // 日主克三合
    } else if (hit === 2) {
      if (SHENG[wx] === dmWx || wx === dmWx) helpScore += 1;
      else if (KE[wx] === dmWx) drainScore += 1;
    }
  }

  let strength;
  if (deling && helpScore >= drainScore) strength = '身强';
  else if (deqi && helpScore > drainScore) strength = '身强';
  else if (!deqi && drainScore > helpScore + 1) strength = '身弱';
  else strength = '中和';

  return {
    strength, monthly_status: monthlyStatus, deling, deqi, help_score: helpScore,
    drain_score: drainScore,
  };
}

/** 格局描述：优先《子平真诠》章旨 → 八正格短语 → 传入的兜底。
 *
 *  ⚠ 照搬 shushu 的键不匹配：它查 `ZIPING_GE_FULL["月刃格"]`，而该表键为 `阳刃格` ——
 *  于是走 月刃格 这条路时章旨**永远取不到**，静默退化成 `SPECIAL_PATTERNS[1].desc`。
 *  此处不擅自改名（改名会让对拍多出一处无来源的差异），差异在 3.5.1b 对拍里显形。
 */
function richDesc(patternName, fallback) {
  const z = T.ZIPING_ZHANGZHI[patternName];
  if (z) return z;
  const mp = T.MAJOR_PATTERNS[patternName];
  if (mp && mp.desc) return mp.desc;
  return fallback || '';
}

function cgToPattern(dm, cg) {
  const ss = getShiShen(dm, cg);
  if (ss === '比肩') {
    return { pattern: '建禄格', desc: richDesc('建禄格', T.SPECIAL_PATTERNS[0].desc) };
  }
  if (ss === '劫财') {
    return { pattern: '月刃格', desc: richDesc('月刃格', T.SPECIAL_PATTERNS[1].desc) };
  }
  const patName = ss + '格';
  const mp = T.MAJOR_PATTERNS[ss] || T.MAJOR_PATTERNS[patName];
  if (mp) {
    const name = mp.name || patName;
    return { pattern: name, desc: richDesc(name, mp.desc || '') };
  }
  return { pattern: patName, desc: richDesc(patName) };
}

const PATTERN_RANK = {
  建禄格: 0, 月刃格: 0,
  正官格: 1, 正印格: 2, 食神格: 3,
  正财格: 4, 偏财格: 4,
  七杀格: 5, 偏印格: 6, 伤官格: 7,
};

/** 格局判定顺序（shushu 原序，不可调换）：
 *  专旺格 → 化气格 → 从格（严格条件）→ 月支透干优先的正格 → 月支本气。 */
function detectPattern(chart) {
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const mP = chart.month_pillar;
  const monthCanggan = mP.canggan || [];
  const strengthInfo = calculateStrength(chart);
  const tg = pillarsOf(chart).map((p) => p.tiangan);
  const dz = new Set(pillarsOf(chart).map((p) => p.dizhi));

  // ── 专旺格 ──
  for (const [gname, g] of Object.entries(T.ZHUAN_WANG_GE)) {
    if (!g.stems.includes(dm)) continue;
    const hasReqs = Array.from(dz).filter((z) => g.required_zhi.includes(z)).length >= 3;
    const keElem = KE[g.element];
    const hasKe = tg.some((t) => GAN_WUXING[t] === keElem);
    if (hasReqs && !hasKe && (strengthInfo.strength === '身强' || strengthInfo.strength === '中和')) {
      return { pattern: gname, desc: g.desc };
    }
  }

  // ── 化气格 ──
  const hourGan = chart.hour_pillar.tiangan;
  for (const [gname, g] of Object.entries(T.HUA_QI_GE)) {
    const [a, b] = g.stems_pair;
    if ((dm === a && hourGan === b) || (dm === b && hourGan === a)) {
      if (g.month_zhi.includes(mP.dizhi)) {
        const keElem = KE[g.element];
        if (!tg.some((t) => GAN_WUXING[t] === keElem)) {
          return { pattern: gname, desc: g.desc };
        }
      }
    }
  }

  // ── 从格（条件很紧：极弱 + 一方独大 + 无救）──
  if (strengthInfo.strength === '身弱') {
    const ssList = summarizeShiShen(chart);
    const top = ssList[0];
    if (top) {
      const rivalCount = ssList.length > 1 ? ssList[1].count : 0;
      const dominant = top.count >= 3 && top.count > rivalCount;
      const extreme = strengthInfo.help_score <= 2 && strengthInfo.drain_score >= 8;
      if (dominant && extreme) {
        if (top.shishen === '正财' || top.shishen === '偏财') {
          return { pattern: '从财格', desc: T.SPECIAL_PATTERNS[2].desc };
        }
        if (top.shishen === '正官' || top.shishen === '七杀') {
          return { pattern: '从杀格', desc: T.SPECIAL_PATTERNS[3].desc };
        }
        if (top.shishen === '食神' || top.shishen === '伤官') {
          const guanSha = ssList.find((s) => s.shishen === '正官' || s.shishen === '七杀');
          if (!guanSha || guanSha.count <= 1) {
            return { pattern: '从儿格', desc: T.SPECIAL_PATTERNS[4].desc };
          }
        }
      }
    }
  }

  // ── 正格：透干优先，多干俱透取位高者；无透干退月支本气 ──
  if (monthCanggan.length) {
    const visible = new Set(tg);
    const transparent = monthCanggan.filter((cg) => visible.has(cg));
    if (transparent.length) {
      // Python `min` 并列取**首个** → 这里用严格 `<` 保持同样取舍
      let best = transparent[0];
      let bestRank = PATTERN_RANK[cgToPattern(dm, best).pattern];
      if (bestRank === undefined) bestRank = 99;
      for (const cg of transparent.slice(1)) {
        let r = PATTERN_RANK[cgToPattern(dm, cg).pattern];
        if (r === undefined) r = 99;
        if (r < bestRank) { best = cg; bestRank = r; }
      }
      return cgToPattern(dm, best);
    }
    return cgToPattern(dm, monthCanggan[0]);
  }
  return { pattern: '杂气格', desc: '月支藏干杂，需综合论断' };
}

/** 神煞。逐个分支与 shushu 同序（返回的是**列表**，顺序参与对拍）。 */
function findShensha(chart) {
  const dm = chart.day_master;
  const yearDz = chart.year_pillar.dizhi;
  const monthZhi = chart.month_pillar.dizhi;
  const yearGan = chart.year_pillar.tiangan;
  const dayGan = chart.day_pillar.tiangan;
  const dayZhi = chart.day_pillar.dizhi;
  const result = [];

  const pillarMap = {
    年支: chart.year_pillar.dizhi,
    月支: chart.month_pillar.dizhi,
    日支: chart.day_pillar.dizhi,
    时支: chart.hour_pillar.dizhi,
  };

  // 天乙/文昌/禄神/羊刃（以日干查）· 驿马/华盖（以年支查）——shushu 用 if/elif，前者优先
  for (const [shaName, shaData] of Object.entries(T.SHENSHA)) {
    let active = null;
    if (shaData[dm] !== undefined) active = shaData[dm];
    else if (shaData[yearDz] !== undefined) active = shaData[yearDz];
    if (active) {
      for (const [pl, z] of Object.entries(pillarMap)) {
        if (active.includes(z)) result.push({ name: shaName, dizhi: z, pillar: pl });
      }
    }
  }

  // 三合/三会组神煞：以**年支**所属组查（shushu 里 `get_sanhe_group` 的返回值其实没用上，
  // 直接判子串；此处同样只判子串，保持一致）
  for (const shaName of ['将星', '桃花', '孤辰', '寡宿', '劫煞', '亡神', '咸池', '灾煞']) {
    const shaData = T.SHENSHA_EXTENDED[shaName] || {};
    for (const [groupKey, targetZhi] of Object.entries(shaData)) {
      if (groupKey.includes(yearDz)) {
        for (const [pl, z] of Object.entries(pillarMap)) {
          if (z === targetZhi) result.push({ name: shaName, dizhi: z, pillar: pl });
        }
        break;                                     // 命中一组即止（shushu 有 break）
      }
    }
  }

  // 魁罡：日柱干支组合
  const kuigang = T.SHENSHA_EXTENDED['魁罡'] || {};
  if (kuigang[dayGan] && kuigang[dayGan].includes(dayZhi)) {
    result.push({ name: '魁罡', dizhi: dayZhi, pillar: '日支（魁罡贵格）' });
  }

  // 金舆/红艳煞/天厨贵人/学堂/词馆 与 天罗/地网 —— 均以日干查（shushu 分两段，同判据）
  for (const shaName of ['金舆', '红艳煞', '天厨贵人', '学堂', '词馆', '天罗', '地网']) {
    const shaData = T.SHENSHA_EXTENDED[shaName] || {};
    if (shaData[dm] !== undefined) {
      for (const [pl, z] of Object.entries(pillarMap)) {
        if (shaData[dm].includes(z)) result.push({ name: shaName, dizhi: z, pillar: pl });
      }
    }
  }

  // 天德/月德：以月支查，比的是**四柱天干**；shushu 把天干塞进 `dizhi` 字段，照搬
  const ganMap = {
    年干: chart.year_pillar.tiangan,
    月干: chart.month_pillar.tiangan,
    日干: chart.day_pillar.tiangan,
    时干: chart.hour_pillar.tiangan,
  };
  for (const shaName of ['天德贵人', '月德贵人']) {
    const shaData = T.SHENSHA_EXTENDED[shaName] || {};
    const targets = shaData[monthZhi] || [];
    for (const [pl, g] of Object.entries(ganMap)) {
      if (targets.includes(g)) result.push({ name: shaName, dizhi: g, pillar: pl });
    }
  }

  // 国印：以年干查地支
  const guoyin = T.SHENSHA_EXTENDED['国印'] || {};
  if (guoyin[yearGan] !== undefined) {
    for (const [pl, z] of Object.entries(pillarMap)) {
      if (guoyin[yearGan].includes(z)) result.push({ name: '国印', dizhi: z, pillar: pl });
    }
  }

  return result;
}

/**
 * 静态分析 —— 与 shushu `analyze_chart` 返回同形的字段。
 *
 * 3.5.3c 起补上最后两块：`tiaohou`（调候用神到位评级）与 `geju_cheng_bai`
 * （八正格成败救应，**仅当格局名在表内**才挂，故该键按用例存在/不存在 —— 与 shushu 同）。
 * 两者的算法在 `bazi_yongshen.js`；此处的**挂载顺序与条件**照抄 `analyzer.analyze_chart`。
 *
 * 注意 `yong_shen` / `day_master_profile` **不在这里挂** —— shushu 是由 API 层
 * （`api/bazi.py`）挂的，不是 `analyze_chart` 挂的。谁挂的一并照搬，否则对拍时
 * 「字段从哪来」这一层就对不上了。
 */
function analyzeChart(chart) {
  annotatePillars(chart);
  chart.shishen_summary = summarizeShiShen(chart);
  chart.strength_info = calculateStrength(chart);
  chart.strength = chart.strength_info.strength;
  chart.pattern_info = detectPattern(chart);
  chart.pattern = chart.pattern_info.pattern;
  chart.pattern_desc = chart.pattern_info.desc;
  chart.shensha = findShensha(chart);

  chart.tiaohou = YS.analyzeTiaohouInChart(chart);
  const geju = YS.analyzeGejuChengBai(chart, YS.dget(chart.pattern_info, 'pattern', ''));
  if (geju.available) chart.geju_cheng_bai = geju;

  return chart;
}

module.exports = {
  buildChart, getMonthGan, getHourGan, getShiShen, buildPillar,
  getRenyuanSiling, ganIndex, zhiIndex, mod,
  analyzeChart, annotatePillars, summarizeShiShen, calculateStrength,
  detectPattern, findShensha,
};

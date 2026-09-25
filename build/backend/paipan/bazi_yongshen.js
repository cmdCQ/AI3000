/**
 * paipan/bazi_yongshen.js —— 用神 / 调候 / 格局成败救应 / 日主档案（3.5.3c）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）：
 *   `core/bazi/day_master_profiles.py` : analyze_yong_shen / get_day_master_profile /
 *                                        _get_yong_shen_recommendations
 *   `core/bazi/tiaohou_yongshen.py`    : get_tiaohou_yongshen / analyze_tiaohou_in_chart /
 *                                        analyze_geju_cheng_bai
 *   表：由 `duipan/gen_bazi_tables.py` 生成到 `bazi_tables.js`（**不手抄**）
 *
 * 零归一铁律：字段名逐字照搬（`yong_shen_wx` 不译、`gejv` 不改成 `geju`、
 * `救应模式` 这种中文键也照留）。翻译一次就多一处永久漂移。
 *
 * ── 本文件里最容易被「顺手修好」的三处，**都不许修** ──────────────────────────
 * ① **两张调候表并存**：本模块同时用 `TIAOHOU_CLASSICAL`（描述串，扫第一个天干定用神）
 *    与 `TIAOHOU_STRUCT`（结构化，判「在不在盘中」）。看着像重复，其实是同一条链上
 *    的两段，作用不同（详见生成器里的长注）。合并 = 静默改结果。
 * ② **格局/扶抑两条分支不可达**：`TIAOHOU_CLASSICAL` 120/120 全覆盖，故只要日主与
 *    月支合法就必然走「调候」分支；`elif gejv_yong_wx` 与身强/身弱 扶抑分支是**死代码**。
 *    照搬但**留着**，并在对拍里用实跑证据（1214/1214 例全走调候）说明它不可达 ——
 *    而不是删掉假装没这回事，也不是编几个例子假装验过。
 * ③ **格局名对不上就静默落空**：`BAZIGE_SYSTEM` 的键是「偏官格」，而 analyzer 可能判出
 *    「七杀格」；查不到就 `gejv_info = {}`、`gejv_yong_wx = ""`，**不报错**。这是 shushu
 *    的现状（`gejv` 会返回空字典），照搬。要改是改 shushu，不是在这里悄悄兜底。
 *
 * ⚠ shushu 侧把三处 import 都包在 `try/except + log_failure` 里：表取不到 → 「调候」整块
 *   **静默变空**，结果看着正常但少一层。JS 侧这些表是 `require` 进来的，不存在「取不到」
 *   这种运行时状态；故本模块**遇错即抛**（`require` 失败就炸在载入期），不模拟那层兜底 ——
 *   模拟它只会把「静默降级」也一起搬过来。
 */

'use strict';

const C = require('./constants.js');
const T = require('./bazi_tables.js');

// 常量一律复用 `constants.js`（本项目铁律：不重复造轮子）。
// 已核对与 shushu 逐字相同：GAN_WUXING≡TIANGAN_WUXING、SHENG≡WUXING_SHENG、KE≡WUXING_KE。
const { GAN_WUXING, SHENG, KE } = C;

const TIANGAN = C.TIANGAN;
const PILLARS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/**
 * `dict.get(k, default)` 的等价物 —— Python 里键**在**而值为 `None` 时返回 `None`，
 * 只有键不在才返回默认值；JS 的 `??` 会把 `null` 也当缺。本模块逐字移植，故按 Python 语义。
 */
function dget(o, k, dflt) {
  return (o !== null && o !== undefined && Object.prototype.hasOwnProperty.call(o, k)) ? o[k] : dflt;
}

// ─────────────────────────────────────────────────────────────
// 1. 《穷通宝鉴》调候用神
// ─────────────────────────────────────────────────────────────

/** 日主 + 月支 → 调候用神组合（查 `TIAOHOU_STRUCT`，取不到时给与 shushu 相同的兜底文案）。 */
function getTiaohouYongshen(dayMaster, monthZhi) {
  const row = dget(T.TIAOHOU_STRUCT, dayMaster, {});
  return dget(row, monthZhi, {
    primary: '', desc: '暂未收录此组合的调候用神',
    advice: '请参考《穷通宝鉴》对应章节',
  });
}

/**
 * 调候用神在盘中「到不到位」的评级。
 *
 * 口径：把**四个天干 + 所有藏干**收进一个池子，再看主/辅/次辅用神在不在池子里。
 * 注意 `secondary` 为空串时 `has_secondary` 是 `null`（不是 `false`）—— 这个三态在
 * 评级与返回里都用到了，不能塌成布尔。
 */
function analyzeTiaohouInChart(chart) {
  const dm = chart.day_master;
  const monthZhi = chart.month_pillar.dizhi;

  const yongshen = getTiaohouYongshen(dm, monthZhi);
  if (!yongshen.primary) {
    return { available: false, desc: '暂无此日主月支的调候资料' };
  }

  const allGans = [];
  for (const pk of PILLARS) {
    allGans.push(chart[pk].tiangan);
    for (const g of (chart[pk].canggan || [])) allGans.push(g);
  }

  const primary = dget(yongshen, 'primary', '');
  const secondary = dget(yongshen, 'secondary', '');
  const secondary2 = dget(yongshen, 'secondary2', '');

  const hasPrimary = allGans.indexOf(primary) >= 0;
  const hasSecondary = secondary ? allGans.indexOf(secondary) >= 0 : null;
  const hasSecondary2 = secondary2 ? allGans.indexOf(secondary2) >= 0 : null;

  let grade, level, verdict;
  if (hasPrimary && (hasSecondary === null || hasSecondary)) {
    grade = '调候到位';
    level = 'auspicious_great';
    verdict = `命盘见调候主用神${primary}` + (secondary ? `及辅用神${secondary}` : '') + '，调候大利。';
  } else if (hasPrimary) {
    grade = '调候部分到位';
    level = 'auspicious';
    verdict = `命盘见主用神${primary}，但缺辅用神${secondary || ''}${secondary2 || ''}，调候未尽完美。`;
  } else {
    grade = '调候失司';
    level = 'inauspicious';
    verdict = `命盘缺主用神${primary}，调候失司，须借助大运补救。`;
  }

  return {
    available: true,
    day_master: dm,
    month_zhi: monthZhi,
    primary: primary,
    secondary: secondary,
    secondary2: secondary2,
    primary_in_chart: hasPrimary,
    secondary_in_chart: hasSecondary,
    secondary2_in_chart: hasSecondary2,
    grade: grade,
    level: level,
    verdict: verdict,
    desc: dget(yongshen, 'desc', ''),
    advice: dget(yongshen, 'advice', ''),
    source: '《穷通宝鉴》',
  };
}

// ─────────────────────────────────────────────────────────────
// 2. 《子平真诠》八正格成败救应
// ─────────────────────────────────────────────────────────────

/**
 * 格局成败救应 —— **纯按格局名查表**，`chart` 参数只用于签名兼容：shushu 的这份实现
 * 根本没有读命盘（只看 `pattern_name`）。别看到 `chart` 就以为它判了盘。
 */
function analyzeGejuChengBai(chart, patternName) {
  const info = T.GEJU_CHENG_BAI[patternName];
  if (!info) {
    return { available: false, pattern: patternName };
  }

  return {
    available: true,
    pattern: patternName,
    成格条件: info['成格'],
    破格条件: info['破格'],
    救应模式: info['救应'].map(([b, s, d]) => ({ 破: b, 救: s, desc: d })),
    总论: info['desc'],
    source: '《子平真诠·成败救应》',
  };
}

// ─────────────────────────────────────────────────────────────
// 3. 日主档案 + 用神喜忌综合
// ─────────────────────────────────────────────────────────────

/** 十天干日主档案（取不到给空字典，与 shushu 的 `.get(dm, {})` 同）。 */
function getDayMasterProfile(dayMaster) {
  return dget(T.DAY_MASTER_PROFILES, dayMaster, {});
}

/** 用神五行 → 生活化建议（方位/颜色/季节/行业/数字）。 */
function getYongShenRecommendations(dmWx, yong, xi, ji) {
  const WX_DIRECTIONS = { 木: '东方', 火: '南方', 土: '中央/西南/东北', 金: '西方', 水: '北方' };
  const WX_COLORS = { 木: '绿色/青色', 火: '红色/紫色', 土: '黄色/棕色', 金: '白色/金色', 水: '黑色/蓝色' };
  const WX_SEASONS = { 木: '春季', 火: '夏季', 土: '四季末', 金: '秋季', 水: '冬季' };
  const WX_CAREERS = {
    木: '教育/文化/医疗/林业',
    火: '科技/能源/餐饮/娱乐',
    土: '地产/建筑/农业/政府',
    金: '金融/法律/机械/军警',
    水: '贸易/传媒/旅游/物流',
  };
  const WX_NUMBERS = { 木: '3、8', 火: '2、7', 土: '5、10', 金: '4、9', 水: '1、6' };

  return {
    lucky_direction: dget(WX_DIRECTIONS, yong, '') + '（用神）',
    lucky_color: dget(WX_COLORS, yong, '') + '（用神）',
    lucky_season: dget(WX_SEASONS, yong, ''),
    lucky_career: dget(WX_CAREERS, yong, ''),
    lucky_number: dget(WX_NUMBERS, yong, ''),
    avoid_direction: dget(WX_DIRECTIONS, ji, '') + '（忌神）',
    avoid_color: dget(WX_COLORS, ji, '') + '（忌神）',
  };
}

/**
 * 综合用神分析 —— shushu `analyze_yong_shen` 的逐行对应。
 *
 * ⚠ 用神来源的优先级链（调候 > 格局 > 扶抑）里，**只有第 1 条真的会跑到**：
 *   `TIAOHOU_CLASSICAL` 120/120 全覆盖（10 日干 × 12 月支），所以只要日主是十天干、
 *   月支是十二地支，第 1 条必然命中，后两条是死代码。移植时保留它们的**原样**，
 *   是为了「shushu 改好了这里也能跟上」，不是为了它们现在有用。
 */
function analyzeYongShen(chart) {
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const monthDz = chart.month_pillar.dizhi;
  const strength = chart.strength !== undefined && chart.strength !== null ? chart.strength : '中和';
  const pattern = dget(chart, 'pattern', '');

  const profile = dget(T.DAY_MASTER_PROFILES, dm, {});
  const guide = dget(profile, 'useful_god_guide', {});

  // ── 1. 《穷通宝鉴》调候用神 ──
  // 从描述串里**扫出第一个天干**（如「丙火为主，甲为佐」→ 丙）。这是 shushu 的取法，
  // 不动它：换取法等于换结论。表是字符串不是结构，正是因为这里只取「第一个天干」。
  let tiaoHouStem = '';
  let tiaoHouDesc = '';
  let tiaoHouWx = '';
  {
    const row = dget(T.TIAOHOU_CLASSICAL, dm, {});
    tiaoHouDesc = dget(row, monthDz, '');
    for (const ch of tiaoHouDesc) {
      if (TIANGAN.indexOf(ch) >= 0) { tiaoHouStem = ch; break; }
    }
    if (tiaoHouStem) tiaoHouWx = dget(GAN_WUXING, tiaoHouStem, '');
  }

  // ── 2. 《子平真诠》格局用神（从「喜」清单里推断五行）──
  let gejvInfo = {};
  let gejvYongWx = '';
  {
    const gejvData = dget(T.BAZIGE_SYSTEM, pattern, {});
    if (Object.keys(gejvData).length > 0) {
      const xiList = dget(gejvData, '喜', []);
      // 内层映射的**顺序即优先级**（木→火→土→金→水），Python dict 保序，JS 对象字符串键也保序。
      const WX_CHARS = {
        木: ['甲', '乙', '木'], 火: ['丙', '丁', '火'], 土: ['戊', '己', '土'],
        金: ['庚', '辛', '金'], 水: ['壬', '癸', '水'],
      };
      for (const xiItem of xiList) {
        for (const wx of Object.keys(WX_CHARS)) {
          if (WX_CHARS[wx].some((c) => xiItem.indexOf(c) >= 0)) { gejvYongWx = wx; break; }
        }
        if (gejvYongWx) break;
      }
      gejvInfo = {
        pattern: pattern,
        likes: xiList,
        dislikes: dget(gejvData, '忌', []),
        mouth: dget(gejvData, '口诀', ''),
      };
    }
  }

  // ── 3. 《滴天髓》日干特性 ──
  const shiganInfo = dget(T.SHIGAN_JIJUE, dm, {});

  // ── 4. 综合推断用神五行（优先级：调候 > 格局 > 扶抑）──
  let yongWxFinal, yongSource;
  if (tiaoHouWx) {
    yongWxFinal = tiaoHouWx;
    yongSource = `《穷通宝鉴》调候：${tiaoHouDesc}`;
  } else if (gejvYongWx) {
    yongWxFinal = gejvYongWx;
    yongSource = `《子平真诠》${pattern}格局用神`;
  } else if (strength === '身强') {
    yongWxFinal = dget(KE, dmWx, '');
    yongSource = '身强取官杀为用（扶抑用神）';
  } else {
    yongWxFinal = dget(KE, dget(KE, dmWx, ''), '');
    yongSource = '身弱取印绶为用（扶抑用神）';
  }

  // 身强/非身强 二分：喜/忌/仇三神 + 档案里对应那一段话
  let xiWx, jiWx, chouWx, yongDesc;
  if (strength === '身强') {
    xiWx = dget(SHENG, dmWx, '');
    jiWx = dmWx;
    chouWx = dget(KE, dget(KE, dmWx, ''), '');
    yongDesc = dget(guide, 'strong', '');
  } else {
    xiWx = dmWx;
    jiWx = dget(KE, dmWx, '');
    chouWx = dget(SHENG, dmWx, '');
    yongDesc = dget(guide, 'weak', '');
  }

  const WX_COLORS = { 木: '#27ae60', 火: '#e74c3c', 土: '#f39c12', 金: '#95a5a6', 水: '#3498db' };

  return {
    yong_shen_wx: yongWxFinal,
    xi_shen_wx: xiWx,
    ji_shen_wx: jiWx,
    chou_shen_wx: chouWx,
    strength: strength,
    analysis: yongDesc || dget(guide, 'neutral', ''),
    // 《穷通宝鉴》调候
    tiao_hou: {
      stem: tiaoHouStem,
      wuxing: tiaoHouWx,
      desc: tiaoHouDesc,
      source: '《穷通宝鉴》',
    },
    // 《子平真诠》格局
    gejv: gejvInfo,
    yong_source: yongSource,
    // 《滴天髓》日干
    shigan: {
      jijue: dget(shiganInfo, '口诀', ''),
      xiji: dget(shiganInfo, '喜忌', ''),
    },
    wuxing_colors: WX_COLORS,
    recommendations: getYongShenRecommendations(dmWx, yongWxFinal, xiWx, jiWx),
  };
}

module.exports = {
  getTiaohouYongshen, analyzeTiaohouInChart, analyzeGejuChengBai,
  getDayMasterProfile, getYongShenRecommendations, analyzeYongShen,
  dget,   // Python `dict.get(k, d)` 语义的垫片，供同为「逐字移植」的模块共用
};

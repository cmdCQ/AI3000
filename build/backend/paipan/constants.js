/**
 * paipan/constants.js —— 六爻/梅花排盘常量表
 * ============================================
 *
 * 真源与校对：
 *   - 八卦、纳甲、六亲、六神、八宫世应表：原本来自 ai3000 前端（三份手写副本之一），
 *     已逐项核对无误，现收归后端为唯一真源。
 *   - 旺相休囚死表：移植自 shushu `core/constants.py` 的 `_STRENGTH_TABLE_STRICT`
 *     （严格《子平真诠》四时表，六爻断旺衰用此表，非藏干气势派）。
 *   - 旬空表：移植自 shushu `core/liuyao/najia.py` 的 `KONG_WANG_TABLE`，
 *     按旬组索引 floor(日干支序/10) % 6 取。
 *
 * 约定：
 *   - 八卦用先天卦数 1乾 2兑 3离 4震 5巽 6坎 7艮 8坤
 *   - 爻序一律**升序** [初,二,三,四,五,上]（下标 0..5），
 *     避免旧代码 [上,五,四,三,二,初] 降序带来的索引错误
 *   - 阳爻 = 1，阴爻 = 0
 */

'use strict';

// ── 八卦基础 ────────────────────────────────────────────────
// lines 为升序 [初,二,三]
const TRIGRAMS = {
  1: { name: '乾', symbol: '☰', element: '金', lines: [1, 1, 1] },
  2: { name: '兑', symbol: '☱', element: '金', lines: [1, 1, 0] },
  3: { name: '离', symbol: '☲', element: '火', lines: [1, 0, 1] },
  4: { name: '震', symbol: '☳', element: '木', lines: [1, 0, 0] },
  5: { name: '巽', symbol: '☴', element: '木', lines: [0, 1, 1] },
  6: { name: '坎', symbol: '☵', element: '水', lines: [0, 1, 0] },
  7: { name: '艮', symbol: '☶', element: '土', lines: [0, 0, 1] },
  8: { name: '坤', symbol: '☷', element: '土', lines: [0, 0, 0] },
};

const TRIGRAM_BY_LINES = {};
for (const [n, t] of Object.entries(TRIGRAMS)) {
  TRIGRAM_BY_LINES[t.lines.join('')] = Number(n);
}

// ── 纳甲：每卦六爻地支，升序 [初,二,三,四,五,上] ──────────────
// 京房纳甲法：乾内子寅辰外午申戌；坤内未巳卯外丑亥酉；余卦类推。
const NAJIA = {
  1: ['子', '寅', '辰', '午', '申', '戌'], // 乾
  2: ['巳', '卯', '丑', '亥', '酉', '未'], // 兑
  3: ['卯', '丑', '亥', '酉', '未', '巳'], // 离
  4: ['子', '寅', '辰', '午', '申', '戌'], // 震
  5: ['丑', '亥', '酉', '未', '巳', '卯'], // 巽
  6: ['寅', '辰', '午', '申', '戌', '子'], // 坎
  7: ['辰', '午', '申', '戌', '子', '寅'], // 艮
  8: ['未', '巳', '卯', '丑', '亥', '酉'], // 坤
};

// ── 纳甲天干（京房纳甲）──────────────────────────────────────
// 乾纳甲壬、坤纳乙癸（内外异干），余六卦内外同干。
// 内卦（下三爻）取 inner，外卦（上三爻）取 outer。
// 变爻之干亦取自**变卦**对应半卦，非本卦。
const NAJIA_GAN = {
  1: { inner: '甲', outer: '壬' }, // 乾
  2: { inner: '丁', outer: '丁' }, // 兑
  3: { inner: '己', outer: '己' }, // 离
  4: { inner: '庚', outer: '庚' }, // 震
  5: { inner: '辛', outer: '辛' }, // 巽
  6: { inner: '戊', outer: '戊' }, // 坎
  7: { inner: '丙', outer: '丙' }, // 艮
  8: { inner: '乙', outer: '癸' }, // 坤
};

// ── 地支五行 / 天干五行 ─────────────────────────────────────
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const DIZHI_WUXING = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
const GAN_WUXING = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 五行生克
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// 地支六冲 / 六合 / 三合局
const LIU_CHONG = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};
const LIU_HE = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};
// 三合局：申子辰水、寅午戌火、亥卯未木、巳酉丑金
const SAN_HE = [
  { branches: ['申', '子', '辰'], wuxing: '水' },
  { branches: ['寅', '午', '戌'], wuxing: '火' },
  { branches: ['亥', '卯', '未'], wuxing: '木' },
  { branches: ['巳', '酉', '丑'], wuxing: '金' },
];

// ── 六神（六兽）────────────────────────────────────────────
// 顺序：青龙 朱雀 勾陈 腾蛇 白虎 玄武；从初爻起，按日干定起点。
// 用字从 shushu（`najia.LIU_SHEN`）作「腾蛇」，非「螣蛇」——同一神名的异体，
// 与基准同字以免对拍与 prompt 文本出现两种写法。
const LIUSHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
const LIUSHEN_START = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };

// ── 八宫五行 ────────────────────────────────────────────────
const PALACE_ELEMENT = { 1: '金', 2: '金', 3: '火', 4: '木', 5: '木', 6: '水', 7: '土', 8: '土' };

// ── 八宫卦位（宫位序 → 卦型名）──────────────────────────────
// 与 shushu `zhuang_gua.PALACE_POS_TYPE` 同名同序，勿改字面量。
const PALACE_POS_TYPE = {
  1: '八纯卦', 2: '一世卦', 3: '二世卦', 4: '三世卦',
  5: '四世卦', 6: '五世卦', 7: '游魂卦', 8: '归魂卦',
};
const PALACE_POS_OF = {};
for (const [k, v] of Object.entries(PALACE_POS_TYPE)) PALACE_POS_OF[v] = Number(k);

// ── 宫位名（hex_type 初值用）────────────────────────────────
// ⚠ 与上面的 PALACE_POS_TYPE **不同名**，因为 shushu 自己就有两套：
//   `zhuang_gua.py:38` 用 PALACE_POS_TYPE（一世卦…），
//   `divination.py:275` 用这套（一变卦…，作为 hex_type 的初值）。
//   同一个 8 值映射写了两遍且不一致 —— 与当年纳甲出错是同一类风险。
//   两边都无测试、无前端依赖；此处**照基准对齐**以免对拍失真。
//   已列为待用户拍板项：建议统一为经典名（一世卦…），即删掉本表。
const PALACE_POS_NAME = {
  1: '八纯卦', 2: '一变卦', 3: '二变卦', 4: '三变卦',
  5: '四变卦', 6: '五变卦', 7: '游魂卦', 8: '归魂卦',
};

// ── 八宫世应表（key = 上卦_下卦）─────────────────────────────
// 京房八宫卦序，64 条已逐宫核对无误。
// generation: 八纯卦 | 一世卦..五世卦 | 游魂卦 | 归魂卦
// shi/ying: 世爻位、应爻位（1..6，初爻为 1）
const PALACE_TABLE = {
  // 乾宫
  '1_1': { palace: 1, generation: '八纯卦', shi: 6, ying: 3 },
  '1_5': { palace: 1, generation: '一世卦', shi: 1, ying: 4 },
  '1_7': { palace: 1, generation: '二世卦', shi: 2, ying: 5 },
  '1_8': { palace: 1, generation: '三世卦', shi: 3, ying: 6 },
  '5_8': { palace: 1, generation: '四世卦', shi: 4, ying: 1 },
  '7_8': { palace: 1, generation: '五世卦', shi: 5, ying: 2 },
  '3_8': { palace: 1, generation: '游魂卦', shi: 4, ying: 1 },
  '3_1': { palace: 1, generation: '归魂卦', shi: 3, ying: 6 },
  // 兑宫
  '2_2': { palace: 2, generation: '八纯卦', shi: 6, ying: 3 },
  '2_6': { palace: 2, generation: '一世卦', shi: 1, ying: 4 },
  '2_8': { palace: 2, generation: '二世卦', shi: 2, ying: 5 },
  '2_7': { palace: 2, generation: '三世卦', shi: 3, ying: 6 },
  '6_7': { palace: 2, generation: '四世卦', shi: 4, ying: 1 },
  '8_7': { palace: 2, generation: '五世卦', shi: 5, ying: 2 },
  '4_7': { palace: 2, generation: '游魂卦', shi: 4, ying: 1 },
  '4_2': { palace: 2, generation: '归魂卦', shi: 3, ying: 6 },
  // 离宫
  '3_3': { palace: 3, generation: '八纯卦', shi: 6, ying: 3 },
  '3_7': { palace: 3, generation: '一世卦', shi: 1, ying: 4 },
  '3_5': { palace: 3, generation: '二世卦', shi: 2, ying: 5 },
  '3_6': { palace: 3, generation: '三世卦', shi: 3, ying: 6 },
  '7_6': { palace: 3, generation: '四世卦', shi: 4, ying: 1 },
  '5_6': { palace: 3, generation: '五世卦', shi: 5, ying: 2 },
  '1_6': { palace: 3, generation: '游魂卦', shi: 4, ying: 1 },
  '1_3': { palace: 3, generation: '归魂卦', shi: 3, ying: 6 },
  // 震宫
  '4_4': { palace: 4, generation: '八纯卦', shi: 6, ying: 3 },
  '4_8': { palace: 4, generation: '一世卦', shi: 1, ying: 4 },
  '4_6': { palace: 4, generation: '二世卦', shi: 2, ying: 5 },
  '4_5': { palace: 4, generation: '三世卦', shi: 3, ying: 6 },
  '8_5': { palace: 4, generation: '四世卦', shi: 4, ying: 1 },
  '6_5': { palace: 4, generation: '五世卦', shi: 5, ying: 2 },
  '2_5': { palace: 4, generation: '游魂卦', shi: 4, ying: 1 },
  '2_4': { palace: 4, generation: '归魂卦', shi: 3, ying: 6 },
  // 巽宫
  '5_5': { palace: 5, generation: '八纯卦', shi: 6, ying: 3 },
  '5_1': { palace: 5, generation: '一世卦', shi: 1, ying: 4 },
  '5_3': { palace: 5, generation: '二世卦', shi: 2, ying: 5 },
  '5_4': { palace: 5, generation: '三世卦', shi: 3, ying: 6 },
  '1_4': { palace: 5, generation: '四世卦', shi: 4, ying: 1 },
  '3_4': { palace: 5, generation: '五世卦', shi: 5, ying: 2 },
  '7_4': { palace: 5, generation: '游魂卦', shi: 4, ying: 1 },
  '7_5': { palace: 5, generation: '归魂卦', shi: 3, ying: 6 },
  // 坎宫
  '6_6': { palace: 6, generation: '八纯卦', shi: 6, ying: 3 },
  '6_2': { palace: 6, generation: '一世卦', shi: 1, ying: 4 },
  '6_4': { palace: 6, generation: '二世卦', shi: 2, ying: 5 },
  '6_3': { palace: 6, generation: '三世卦', shi: 3, ying: 6 },
  '2_3': { palace: 6, generation: '四世卦', shi: 4, ying: 1 },
  '4_3': { palace: 6, generation: '五世卦', shi: 5, ying: 2 },
  '8_3': { palace: 6, generation: '游魂卦', shi: 4, ying: 1 },
  '8_6': { palace: 6, generation: '归魂卦', shi: 3, ying: 6 },
  // 艮宫
  '7_7': { palace: 7, generation: '八纯卦', shi: 6, ying: 3 },
  '7_3': { palace: 7, generation: '一世卦', shi: 1, ying: 4 },
  '7_1': { palace: 7, generation: '二世卦', shi: 2, ying: 5 },
  '7_2': { palace: 7, generation: '三世卦', shi: 3, ying: 6 },
  '3_2': { palace: 7, generation: '四世卦', shi: 4, ying: 1 },
  '1_2': { palace: 7, generation: '五世卦', shi: 5, ying: 2 },
  '5_2': { palace: 7, generation: '游魂卦', shi: 4, ying: 1 },
  '5_7': { palace: 7, generation: '归魂卦', shi: 3, ying: 6 },
  // 坤宫
  '8_8': { palace: 8, generation: '八纯卦', shi: 6, ying: 3 },
  '8_4': { palace: 8, generation: '一世卦', shi: 1, ying: 4 },
  '8_2': { palace: 8, generation: '二世卦', shi: 2, ying: 5 },
  '8_1': { palace: 8, generation: '三世卦', shi: 3, ying: 6 },
  '4_1': { palace: 8, generation: '四世卦', shi: 4, ying: 1 },
  '2_1': { palace: 8, generation: '五世卦', shi: 5, ying: 2 },
  '6_1': { palace: 8, generation: '游魂卦', shi: 4, ying: 1 },
  '6_8': { palace: 8, generation: '归魂卦', shi: 3, ying: 6 },
};

// ── 旬空表（按旬组索引）────────────────────────────────────
// 甲子旬空戌亥 / 甲戌旬空申酉 / 甲申旬空午未
// 甲午旬空辰巳 / 甲辰旬空寅卯 / 甲寅旬空子丑
const KONG_WANG_BY_XUN = [
  ['戌', '亥'], ['申', '酉'], ['午', '未'],
  ['辰', '巳'], ['寅', '卯'], ['子', '丑'],
];

// ── 四时旺相休囚死（严格派，六爻断旺衰用）──────────────────
// 春（寅卯辰）木旺火相水休金囚土死，余季类推。
const STRENGTH_STRICT = {
  木: { 寅: '旺', 卯: '旺', 辰: '旺', 巳: '休', 午: '休', 未: '休', 申: '死', 酉: '死', 戌: '死', 亥: '相', 子: '相', 丑: '相' },
  火: { 寅: '相', 卯: '相', 辰: '相', 巳: '旺', 午: '旺', 未: '旺', 申: '囚', 酉: '囚', 戌: '囚', 亥: '死', 子: '死', 丑: '死' },
  土: { 寅: '死', 卯: '死', 辰: '死', 巳: '相', 午: '相', 未: '相', 申: '休', 酉: '休', 戌: '休', 亥: '囚', 子: '囚', 丑: '囚' },
  金: { 寅: '囚', 卯: '囚', 辰: '囚', 巳: '死', 午: '死', 未: '死', 申: '旺', 酉: '旺', 戌: '旺', 亥: '休', 子: '休', 丑: '休' },
  水: { 寅: '休', 卯: '休', 辰: '休', 巳: '囚', 午: '囚', 未: '囚', 申: '相', 酉: '相', 戌: '相', 亥: '旺', 子: '旺', 丑: '旺' },
};

// ── 十二长生（阳顺阴逆，用于化进退神与用神气数）──────────────
// 长生位：木亥、火寅、金巳、水土申
const CHANGSHENG_START = { 木: '亥', 火: '寅', 土: '申', 金: '巳', 水: '申' };
const CHANGSHENG_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
// 天干十二长生（阴阳同用，用于六爻纳甲天干气数）
const GAN_YINYANG = { 甲: 1, 乙: 0, 丙: 1, 丁: 0, 戊: 1, 己: 0, 庚: 1, 辛: 0, 壬: 1, 癸: 0 };

// ── 卦名（64 卦，key = 上卦_下卦）───────────────────────────
// 文王卦序名称表，与前端一致。
const HEX64_NAME = {
  '1_1': '乾为天', '1_2': '天泽履', '1_3': '天火同人', '1_4': '天雷无妄', '1_5': '天风姤', '1_6': '天水讼', '1_7': '天山遁', '1_8': '天地否',
  '2_1': '泽天夬', '2_2': '兑为泽', '2_3': '泽火革', '2_4': '泽雷随', '2_5': '泽风大过', '2_6': '泽水困', '2_7': '泽山咸', '2_8': '泽地萃',
  '3_1': '火天大有', '3_2': '火泽睽', '3_3': '离为火', '3_4': '火雷噬嗑', '3_5': '火风鼎', '3_6': '火水未济', '3_7': '火山旅', '3_8': '火地晋',
  '4_1': '雷天大壮', '4_2': '雷泽归妹', '4_3': '雷火丰', '4_4': '震为雷', '4_5': '雷风恒', '4_6': '雷水解', '4_7': '雷山小过', '4_8': '雷地豫',
  '5_1': '风天小畜', '5_2': '风泽中孚', '5_3': '风火家人', '5_4': '风雷益', '5_5': '巽为风', '5_6': '风水涣', '5_7': '风山渐', '5_8': '风地观',
  '6_1': '水天需', '6_2': '水泽节', '6_3': '水火既济', '6_4': '水雷屯', '6_5': '水风井', '6_6': '坎为水', '6_7': '水山蹇', '6_8': '水地比',
  '7_1': '山天大畜', '7_2': '山泽损', '7_3': '山火贲', '7_4': '山雷颐', '7_5': '山风蛊', '7_6': '山水蒙', '7_7': '艮为山', '7_8': '山地剥',
  '8_1': '地天泰', '8_2': '地泽临', '8_3': '地火明夷', '8_4': '地雷复', '8_5': '地风升', '8_6': '地水师', '8_7': '地山谦', '8_8': '坤为地',
};

// ── 工具函数 ────────────────────────────────────────────────

/** 干支字符串 → 60 甲子序（0..59）；无法解析返回 -1 */
function ganzhiIndex(gz) {
  if (!gz || gz.length < 2) return -1;
  const g = TIANGAN.indexOf(gz[0]);
  const z = DIZHI.indexOf(gz[1]);
  if (g < 0 || z < 0) return -1;
  // 求解 60 甲子中满足 (i%10===g && i%12===z) 的 i
  for (let i = 0; i < 60; i++) {
    if (i % 10 === g && i % 12 === z) return i;
  }
  return -1;
}

/** 日干支 → 旬空两支 */
function getKongWang(dayGZ) {
  const idx = ganzhiIndex(dayGZ);
  if (idx < 0) return [];
  return KONG_WANG_BY_XUN[Math.floor(idx / 10) % 6].slice();
}

/** 五行在某月支下的旺相休囚死 */
function getStrength(wuxing, monthZhi) {
  const row = STRENGTH_STRICT[wuxing];
  if (!row) return '';
  return row[monthZhi] || '';
}

/** 十二长生：某五行在某地支的状态。阳干顺行、阴干逆行。
 *  yinYang: 1=阳 0=阴（决定顺逆） */
function getChangsheng(wuxing, branch, yinYang) {
  const start = CHANGSHENG_START[wuxing];
  if (!start) return '';
  const si = DIZHI.indexOf(start);
  const bi = DIZHI.indexOf(branch);
  if (si < 0 || bi < 0) return '';
  const step = yinYang ? (bi - si + 12) % 12 : (si - bi + 12) % 12;
  return CHANGSHENG_ORDER[step];
}

/** 六亲：以宫五行为「我」 */
function getLiuQin(palaceElement, lineElement) {
  if (!palaceElement || !lineElement) return '';
  if (palaceElement === lineElement) return '兄弟';
  if (SHENG[lineElement] === palaceElement) return '父母'; // 生我
  if (SHENG[palaceElement] === lineElement) return '子孙'; // 我生
  if (KE[palaceElement] === lineElement) return '妻财';   // 我克
  if (KE[lineElement] === palaceElement) return '官鬼';   // 克我
  return '';
}

/** 六神：日干定起点，从初爻起顺排。pos 为爻位 1..6 */
function getLiuShen(dayGan, pos) {
  const start = LIUSHEN_START[dayGan] || 0;
  return LIUSHEN[(start + pos - 1) % 6];
}

/** 卦名 */
function getHexName(upper, lower) {
  return HEX64_NAME[upper + '_' + lower] || ((TRIGRAMS[upper] || {}).name + (TRIGRAMS[lower] || {}).name);
}

/** 八宫信息（宫、世应、卦型） */
function getPalace(upper, lower) {
  const key = upper + '_' + lower;
  const p = PALACE_TABLE[key] || { palace: upper, generation: '未知', shi: 6, ying: 3 };
  return {
    palace: p.palace,
    palaceName: (TRIGRAMS[p.palace] || {}).name || '',
    palaceElement: PALACE_ELEMENT[p.palace] || '',
    generation: p.generation,
    palacePosition: PALACE_POS_OF[p.generation] || 0,
    palacePosName: PALACE_POS_NAME[PALACE_POS_OF[p.generation]] || '',
    shi: p.shi,
    ying: p.ying,
  };
}

/** 六爻爻象（升序 [初..上]） */
function guaLines(upper, lower) {
  return (TRIGRAMS[lower] || {}).lines.concat((TRIGRAMS[upper] || {}).lines);
}

/** 两个三画卦的爻象 + 动爻 → 爻象（升序） */
function changedLines(upper, lower, movingPositions) {
  const lines = guaLines(upper, lower).slice();
  for (const p of movingPositions) {
    if (p >= 1 && p <= 6) lines[p - 1] = lines[p - 1] ? 0 : 1;
  }
  return lines;
}

/** 由六爻爻象（升序）反推上下卦号 */
function linesToTrigrams(lines) {
  const lower = TRIGRAM_BY_LINES[lines.slice(0, 3).join('')] || 8;
  const upper = TRIGRAM_BY_LINES[lines.slice(3, 6).join('')] || 8;
  return { upper, lower };
}

/** 卦身（《增删卜易·安卦身诀》）
 *  阳世从子起：初子 二丑 三寅 四卯 五辰 上巳
 *  阴世从午起：初午 二未 三申 四酉 五戌 上亥
 */
function getGuaShen(shiPos, shiYinYang) {
  const idx = (shiPos - 1) + (shiYinYang ? 0 : 6);
  return DIZHI[idx % 12];
}

/** 世身（与卦身配套，世爻所在之身） */
function getShiShen(shiPos, shiZhi) {
  return { position: shiPos, dizhi: shiZhi };
}

module.exports = {
  TRIGRAMS, TRIGRAM_BY_LINES, NAJIA, NAJIA_GAN,
  DIZHI, TIANGAN, DIZHI_WUXING, GAN_WUXING,
  SHENG, KE, LIU_CHONG, LIU_HE, SAN_HE,
  LIUSHEN, LIUSHEN_START, PALACE_ELEMENT, PALACE_TABLE,
  PALACE_POS_TYPE, PALACE_POS_OF, PALACE_POS_NAME,
  KONG_WANG_BY_XUN, STRENGTH_STRICT,
  CHANGSHENG_START, CHANGSHENG_ORDER, GAN_YINYANG, HEX64_NAME,
  ganzhiIndex, getKongWang, getStrength, getChangsheng,
  getLiuQin, getLiuShen, getHexName, getPalace,
  guaLines, changedLines, linesToTrigrams, getGuaShen, getShiShen,
};

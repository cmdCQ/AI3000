/**
 * paipan/relations.js —— 六爻断卦·关系层（**用神无关**的那一半）
 * =================================================================
 *
 * 真源（逐字移植，不改口径）：
 *   shushu `core/liuyao/relations.py`          十二长生 / 进退神 / 动爻化变关系
 *   shushu `core/liuyao/advanced_features.py`  独发独静 / 化合化冲
 *   shushu `core/liuyao/najia.py`              三合三会半合
 *
 * 「用神无关」是本模块的**边界**：这里每个函数都只吃「六爻 + 月支 + 日支」，
 * 不需要先定用神。伏神、原神/忌神/仇神、应期、综合断都要用神，属下一层。
 *
 * 字段名/取值一律与 shushu 逐字相同（对拍铁律「零归一」），
 * 包括断语文本、severity 字面量、`source` 引文出处。
 *
 * ── 已核实的结构事实（错的话整层都会错，故记在此） ────────────────
 * 1. **化冲不可能由单个动爻产生**：变爻之支取自**变卦对应半卦**（见 liuyao.js），
 *    而半卦由该半三爻的翻转决定；穷举 48 种单爻翻转，无一对相隔六位。
 *    化冲至少需要同一半卦内的相邻动爻（二三或五六）。化合不受此限。
 * 2. **四库土「可达」的化出对只有 丑→辰、辰→丑、未→戌、戌→未**（加自化）。
 *    故 `advanced_features` 的 `_is_jin_shen`（含 辰→未、戌→丑）
 *    与 `relations` 的 `DIZHI_PROGRESS_GROUPS`（不含）**虽然表不同、
 *    却在所有可达对上完全一致**——`辰→未/戌→丑/未→辰/丑→戌` 结构上取不到。
 *    这是潜伏不一致，不是活的 bug；本文件**照 shushu 各留各的表**，
 *    不为「统一」擅改基准（要动需用户拍板）。
 *
 * ── 与 shushu 的两处已知差异（均已在别处申报，此处只备注） ─────────
 *   a) `liuyao.js` 里另有一份进退神表（`JIN_SHEN`/`TUI_SHEN`），
 *      比 `relations.py` 多 辰→未 / 戌→丑 / 未→辰 / 丑→戌 四条 —— 同上不可达。
 *      两处合一是后续清理项，本轮不动以免扩大改动面。
 *   b) shushu `najia.analyze_hua_qi` 是**死代码**（仅测试引用，无生产调用点），
 *      其四库土进神表取向与上两者又相反；因无调用点故不可达，未移植。
 */

'use strict';

const C = require('./constants');

const YAO_CN = ['初', '二', '三', '四', '五', '上'];

// ─────────────────────────────────────────────────────────────
// 1. 十二长生（relations.py:41-84）
// ─────────────────────────────────────────────────────────────
// 五行长生之地：金巳、木亥、水申、火寅、土申（土同水）
const WX_CHANGSHENG_START = { 金: '巳', 木: '亥', 水: '申', 火: '寅', 土: '申' };
const CHANGSHENG_12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰',
                       '病', '死', '墓', '绝', '胎', '养'];
const CS_FORCE = {
  长生: 3, 沐浴: -1, 冠带: 2, 临官: 4, 帝旺: 5,
  衰: -1, 病: -2, 死: -4, 墓: -3, 绝: -5, 胎: 1, 养: 2,
};
const DIZHI_ORDER = '子丑寅卯辰巳午未申酉戌亥';

/** 爻五行在目标地支（月令/日辰）的十二长生状态。 */
function changshengStatus(lineWx, targetZhi) {
  const start = WX_CHANGSHENG_START[lineWx] || '';
  // 注意：早退分支只有两个键（status/force），shushu 亦然，勿补齐
  if (!start || !targetZhi) return { status: '', force: 0 };

  const startIdx = DIZHI_ORDER.indexOf(start);
  const targetIdx = DIZHI_ORDER.indexOf(targetZhi);
  const offset = ((targetIdx - startIdx) % 12 + 12) % 12;
  const status = CHANGSHENG_12[offset];
  return {
    status,
    force: CS_FORCE[status] !== undefined ? CS_FORCE[status] : 0,
    start,
    offset,
  };
}

/**
 * 一爻在月令、日辰的旺衰详情（relations.py:247-290）。
 * 只读 line.branch；shushu 的调用方另补 liu_qin（见 lineDetails）。
 */
function lineStrengthDetail(line, monthZhi, dayZhi) {
  const branch = (line && line.branch) || '';
  const wuxing = C.DIZHI_WUXING[branch] || '';

  const r = {
    branch,
    wuxing,
    month_chs: changshengStatus(wuxing, monthZhi),
    day_chs: changshengStatus(wuxing, dayZhi),
  };

  // 月破：爻被月令相冲；日破：爻被日辰相冲
  const chong = C.LIU_CHONG[branch] !== undefined ? C.LIU_CHONG[branch] : '';
  const isYuepo = chong === monthZhi;
  const isRipo = chong === dayZhi;
  r.is_yuepo = isYuepo;
  r.is_ripo = isRipo;

  // 综合力量：月令权重大（×1.5）
  let score = 0;
  score += r.month_chs.force * 1.5;
  score += r.day_chs.force;
  if (isYuepo) score -= 3;
  if (isRipo) score -= 2;

  r.combined_force = score;
  r.overall = score >= 6 ? '极旺'
            : score >= 3 ? '旺相'
            : score >= -1 ? '中和'
            : score >= -4 ? '休囚' : '无气';
  return r;
}

/** shushu `analyze_liuyao_deep_relations` 里 line_details 的构造（含补 liu_qin）。 */
function lineDetails(yaos, monthZhi, dayZhi) {
  const out = [];
  if (!monthZhi && !dayZhi) return out;
  for (const y of yaos) {
    const d = lineStrengthDetail(y, monthZhi, dayZhi);
    d.liu_qin = (y && y.liu_qin) || '';
    out.push(d);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 2. 进退神（relations.py:130-173）——《增删卜易·进神退神章》
// ─────────────────────────────────────────────────────────────
// 同五行内地支顺序前进为进神。土只取 丑→辰、未→戌（另两对不可达，见头注）。
const DIZHI_PROGRESS_GROUPS = [
  ['寅', '卯'],  // 木
  ['巳', '午'],  // 火
  ['申', '酉'],  // 金
  ['亥', '子'],  // 水
  ['丑', '辰'],  // 土
  ['未', '戌'],  // 土
];

/** 判断爻动后是进神还是退神。返回 {type, interpretation}。 */
function checkJinTuiShen(origZhi, changedZhi) {
  if (!origZhi || !changedZhi || origZhi === changedZhi) {
    return { type: '', interpretation: '' };
  }
  for (const [low, high] of DIZHI_PROGRESS_GROUPS) {
    if (origZhi === low && changedZhi === high) {
      return {
        type: '进神',
        interpretation: `${origZhi}动化${changedZhi}（进神）— 主事物向前发展、力量增强，`
                      + '用神进神则吉运推进，忌神进神则灾难逼近',
      };
    }
    if (origZhi === high && changedZhi === low) {
      return {
        type: '退神',
        interpretation: `${origZhi}动化${changedZhi}（退神）— 主事物后退消减，`
                      + '用神退神则吉运消退，忌神退神则灾患减轻',
      };
    }
  }
  return { type: '', interpretation: '' };
}

// ─────────────────────────────────────────────────────────────
// 3. 动爻化变关系（relations.py:180-240）
// ─────────────────────────────────────────────────────────────
// 五路关系按此优先级取**第一个命中**：回头生 → 回头克 → 化同 → 化泄 → 化克他
function analyzeChangedLineRelation(origYao, changedYao) {
  if (!origYao || !changedYao) return {};
  const ob = origYao.branch || '';
  const cb = changedYao.branch || '';
  const ow = C.DIZHI_WUXING[ob] || '';
  const cw = C.DIZHI_WUXING[cb] || '';
  if (!ow || !cw) return {};

  const r = {
    orig_branch: ob,
    changed_branch: cb,
    orig_wx: ow,
    changed_wx: cw,
    relation: '',
    interpretation: '',
  };

  if (C.SHENG[cw] === ow) {
    r.relation = '回头生';
    r.interpretation = `${ob}动化${cb}（${cw}生${ow}）= 回头生 — 主原爻得力，事物增强`;
  } else if (C.KE[cw] === ow) {
    r.relation = '回头克';
    r.interpretation = `${ob}动化${cb}（${cw}克${ow}）= 回头克 — 主原爻被反伤，凶象`;
  } else if (cw === ow) {
    r.relation = '化同（伏吟、扶持）';
    r.interpretation = `${ob}动化${cb}（同五行）— 用神化同主力量加倍，忌神化同主灾难重复`;
  } else if (C.SHENG[ow] === cw) {
    r.relation = '化泄';
    r.interpretation = `${ob}动化${cb}（${ow}生${cw}）= 化泄 — 原爻能量流出`;
  } else if (C.KE[ow] === cw) {
    r.relation = '化克他';
    r.interpretation = `${ob}动化${cb}（${ow}克${cw}）= 化克他 — 用神化克他喜，忌神化克他凶`;
  }

  const jt = checkJinTuiShen(ob, cb);
  if (jt.type) r.jin_tui = jt;
  return r;
}

/** shushu 里的 changing_relations（只收 is_changing 的爻，配对按下标）。 */
function changingRelations(yaos, changedYaos) {
  const out = [];
  if (!changedYaos) return out;
  for (let i = 0; i < yaos.length; i++) {
    const y = yaos[i];
    if (y && y.is_changing && i < changedYaos.length) {
      const rel = analyzeChangedLineRelation(y, changedYaos[i]);
      if (rel && Object.keys(rel).length) {
        rel.position = i + 1;
        rel.liu_qin = y.liu_qin || '';
        out.push(rel);
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 4. 独发 / 独静（advanced_features.py:196-265）
// ─────────────────────────────────────────────────────────────
// 入参只两个键（shushu 调用点即如此）：{dong, zhi}
// `moving_lines[].data` 会把入参对象**原样**带出去，故键名必须一致。
function dongFlags(yaos) {
  return yaos.map((y) => ({
    dong: !!(y && (y.dong || y.is_moving || y.type === 'moving')),
    zhi: (y && y.zhi) || '',
  }));
}

function analyzeDongJing(rawYaos) {
  const yaos = dongFlags(rawYaos);
  const moving = [];
  yaos.forEach((y, i) => {
    if (y.dong) moving.push({ line: i + 1, yao_name: YAO_CN[i], data: y });
  });
  const n = moving.length;

  if (n === 0) {
    return {
      type: '全静卦', level: 'important', moving_count: 0,
      desc: '六爻皆静，无动爻。《增删卜易》云「静卦看本卦，以世应、用神为主」，事不变。',
      advice: '看世爻与用神的旺衰生克即可，不必看变卦。',
      source: '《增删卜易·静卦总论》',
    };
  }
  if (n === 1) {
    return {
      type: '独发卦', level: 'auspicious_great', moving_count: 1, moving_lines: moving,
      desc: `独发一爻（第${moving[0].line}爻 ${moving[0].yao_name}爻动），`
          + '《增删卜易》云「独发易取，乱动难凭」，此爻乃断事关键。',
      advice: '重点看独发爻的变化、化象、生克，再合参世应。',
      source: '《增删卜易·独发独静章》',
    };
  }
  if (n === 6) {
    return {
      type: '全动卦', level: 'warning', moving_count: 6,
      desc: '六爻全动，《增删卜易》云「乱动之卦，事多反复」，主局势剧烈变化，难定吉凶。',
      advice: '全动须以变卦为主，本卦次之；或看主静之爻反推。',
      source: '《增删卜易·乱动章》',
    };
  }
  if (n === 5) {
    const si = yaos.findIndex((y) => !y.dong);   // 仅一爻不动
    return {
      type: '独静卦', level: 'auspicious', moving_count: 5, static_line: si + 1,
      desc: `独静一爻（第${si + 1}爻 ${YAO_CN[si]}爻不动），`
          + '《增删卜易》云「独静则取，独发亦同」，此静爻乃断事关键。',
      advice: '重点看独静爻的处境（旺衰、空亡、临神）。',
      source: '《增删卜易·独发独静章》',
    };
  }
  return {
    type: `多发卦（${n}爻动）`, level: 'warning', moving_count: n, moving_lines: moving,
    desc: `卦中${n}爻发动，《增删卜易》云「多动者乱，乱则难占」，须以用神为主，他爻为辅。`,
    advice: '重点看用神所在爻的动变；忌神动则凶，原神动则吉。',
    source: '《增删卜易·多发章》',
  };
}

// ─────────────────────────────────────────────────────────────
// 5. 化合 / 化冲 / 化进退（advanced_features.py:272-362）
// ─────────────────────────────────────────────────────────────
// 入参只三个键（shushu 调用点即如此）：{dong, zhi, changed_zhi}
//
// ⚠ 这两张表与上面 `DIZHI_PROGRESS_GROUPS` **不同**（多 辰→未、戌→丑 等），
//   但差异全在结构上不可达的对上，见文件头注 2。照抄，不统一。
const ADV_JIN_PAIRS = [
  ['寅', '卯'], ['巳', '午'], ['申', '酉'], ['亥', '子'],
  ['丑', '辰'], ['辰', '未'], ['未', '戌'], ['戌', '丑'],
];
const ADV_TUI_PAIRS = [
  ['卯', '寅'], ['午', '巳'], ['酉', '申'], ['子', '亥'],
  ['辰', '丑'], ['未', '辰'], ['戌', '未'], ['丑', '戌'],
];
const pairHit = (pairs, a, b) => pairs.some((p) => p[0] === a && p[1] === b);

function analyzeHuaHeChong(rawYaos) {
  const out = [];
  rawYaos.forEach((raw, i) => {
    const y = raw || {};
    if (!(y.dong || y.is_moving || y.type === 'moving')) return;
    const o = y.zhi || '';
    const c = y.changed_zhi || y.hua_zhi || y.bian_zhi || '';
    if (!o || !c) return;

    const label = `第${i + 1}爻（${YAO_CN[i]}爻）`;
    if (C.LIU_HE[o] === c) {
      out.push({
        line: i + 1, type: '化合', orig_zhi: o, changed_zhi: c, level: 'auspicious',
        desc: `${label} ${o}动化${c}，${o}${c}六合，「化合」之吉。`
            + '主事情虽动而归于和合，谋事可成，纠纷可解。',
        source: '《增删卜易·化合章》',
      });
    } else if (C.LIU_CHONG[o] === c) {
      out.push({
        line: i + 1, type: '化冲', orig_zhi: o, changed_zhi: c, level: 'inauspicious',
        desc: `${label} ${o}动化${c}，${o}${c}六冲，「化冲」之凶。`
            + '主事情反复、变卦、人离物散。',
        source: '《增删卜易·化冲章》',
      });
    } else if (pairHit(ADV_JIN_PAIRS, o, c)) {
      out.push({
        line: i + 1, type: '化进神', orig_zhi: o, changed_zhi: c, level: 'auspicious',
        desc: `${label} ${o}化${c}，「化进神」，主渐进、事态向前。`,
        source: '《增删卜易·进神章》',
      });
    } else if (pairHit(ADV_TUI_PAIRS, o, c)) {
      out.push({
        line: i + 1, type: '化退神', orig_zhi: o, changed_zhi: c, level: 'inauspicious',
        desc: `${label} ${o}化${c}，「化退神」，主衰退、事态向后。`,
        source: '《增删卜易·退神章》',
      });
    }
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// 6. 三合局 / 三会方 / 半三合（najia.py:611-718）
// ─────────────────────────────────────────────────────────────
// 全三合法：穷举 6 爻取 3 的 **20 个组合**，按该字面顺序扫描，
// **每个命中的组合都追加一条**（同一 frozenset 可由多个组合命中 → 会重复）。
// 半三合只在全三合一无所获时才看。
const SANHE_DEF = [
  [['申', '子', '辰'], '水局'],
  [['亥', '卯', '未'], '木局'],
  [['寅', '午', '戌'], '火局'],
  [['巳', '酉', '丑'], '金局'],
];
const SANHUI_DEF = [
  [['亥', '子', '丑'], '北方水会'],
  [['寅', '卯', '辰'], '东方木会'],
  [['巳', '午', '未'], '南方火会'],
  [['申', '酉', '戌'], '西方金会'],
];
const BAN_SANHE_DEF = [
  [['申', '子'], '半三合水（长生+帝旺，力较强）'],
  [['子', '辰'], '半三合水（帝旺+墓库，力较强）'],
  [['亥', '卯'], '半三合木（长生+帝旺）'],
  [['卯', '未'], '半三合木（帝旺+墓库）'],
  [['寅', '午'], '半三合火（长生+帝旺）'],
  [['午', '戌'], '半三合火（帝旺+墓库）'],
  [['巳', '酉'], '半三合金（长生+帝旺）'],
  [['酉', '丑'], '半三合金（帝旺+墓库）'],
];
// frozenset 的 JS 等价物：去重后按码点排序拼串（CJK 在 BMP 内，UTF-16 序＝码点序）
const canon = (arr) => Array.from(new Set(arr)).sort().join('');
const SANHE_JU = {};
for (const [b, n] of SANHE_DEF) SANHE_JU[canon(b)] = n;
const SANHUI_FANG = {};
for (const [b, n] of SANHUI_DEF) SANHUI_FANG[canon(b)] = n;
const BAN_SANHE = {};
for (const [b, n] of BAN_SANHE_DEF) BAN_SANHE[canon(b)] = n;

const TRI_COMBOS = [
  [0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 1, 5], [0, 2, 3], [0, 2, 4], [0, 2, 5],
  [0, 3, 4], [0, 3, 5], [0, 4, 5], [1, 2, 3], [1, 2, 4], [1, 2, 5], [1, 3, 4],
  [1, 3, 5], [1, 4, 5], [2, 3, 4], [2, 3, 5], [2, 4, 5], [3, 4, 5],
];

function detectSanheSanhui(yaos) {
  const branches = yaos.map((y, i) => [i + 1, (y && y.branch) || '']);

  const found = [];
  for (const combo of TRI_COMBOS) {
    const positions = combo.map((i) => branches[i][0]);
    const zhis = combo.map((i) => branches[i][1]);
    if (zhis.indexOf('') >= 0) continue;
    const k = canon(zhis);
    if (Array.from(new Set(zhis)).length !== 3) continue;   // 重复地支不算
    if (SANHE_JU[k] !== undefined) {
      found.push({ positions, branches: zhis, name: SANHE_JU[k] });
    } else if (SANHUI_FANG[k] !== undefined) {
      found.push({ positions, branches: zhis, name: SANHUI_FANG[k], is_sanhui: true });
    }
  }

  const banFound = [];
  if (!found.length) {
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const p1 = branches[i][0], z1 = branches[i][1];
        const p2 = branches[j][0], z2 = branches[j][1];
        if (!z1 || !z2 || z1 === z2) continue;
        const k = canon([z1, z2]);
        if (BAN_SANHE[k] !== undefined) {
          banFound.push({ positions: [p1, p2], branches: [z1, z2], name: BAN_SANHE[k] });
        }
      }
    }
  }

  const fullSanhe = found.filter((x) => !x.is_sanhui);
  const sanhui = found.filter((x) => !!x.is_sanhui);

  const parts = [];
  if (fullSanhe.length) parts.push('三合局：' + fullSanhe.map((x) => x.name).join('、'));
  if (sanhui.length) parts.push('三会方：' + sanhui.map((x) => x.name).join('、'));
  if (banFound.length) parts.push(`半三合 ${banFound.length} 组`);
  if (!parts.length) parts.push('无三合三会');

  return {
    sanhe: fullSanhe,
    sanhui,
    ban_sanhe: banFound,
    summary: parts.join('；'),
  };
}

module.exports = {
  // 表（导出便于单测）
  WX_CHANGSHENG_START, CHANGSHENG_12, CS_FORCE, DIZHI_ORDER,
  DIZHI_PROGRESS_GROUPS, ADV_JIN_PAIRS, ADV_TUI_PAIRS,
  // 函数
  changshengStatus, lineStrengthDetail, lineDetails,
  checkJinTuiShen, analyzeChangedLineRelation, changingRelations,
  analyzeDongJing, analyzeHuaHeChong, detectSanheSanhui,
  dongFlags, canon,
};

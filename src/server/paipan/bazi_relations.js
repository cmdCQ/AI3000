/**
 * paipan/bazi_relations.js —— 八字地支关系层（刑冲合害破，3.5.3a）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/relations.py`，逐字同形：
 *   `analyze_all_relations`            → `analyzeAllRelations`
 *   `analyze_dayun_liunian_trigger`    → `analyzeDayunLiunianTrigger`
 *   `format_relations_for_prompt`      → `formatRelationsForPrompt`
 *
 * **纯函数**：只读四柱的 `dizhi`，与历法、十神、旺衰无关。因此对拍能**穷举**
 * 全部 12⁴ 个四支组合（见 `duipan/gen_golden_bazi_relations.py`），不需要「按原因申报」。
 *
 * ── 移植时三处必须照抄、不能「顺手整理」的写法 ──
 *
 * 1. **`frozenset` 的去重语义**：`frozenset({子,子}) == {子}`，是**一元集**，故两支相同
 *    时永远匹配不上任何关系表（表里全是两元）。本项目用「排序后拼串」当代替
 *    （`key2`/`key3`）：两支相同的串为 `子子`，表内键**从无重复字**，故不可能误命中。
 *    两支不同时排序拼串与 frozenset 一一对应。
 *
 * 2. **`detect_san_he` 的 `full_triples` 是个「支字符集合」而不是「三合局集合」**：
 *    它把每个完整三合的 3 个支字符塞进同一个 set，然后半合用
 *    `set([bi,bj]).issubset(full_triples)` 判重。于是「任一个完整三合出现过某支」
 *    就会让含该支的半合被跳过 —— 看起来像 bug，但这是 shushu 的实际行为，
 *    必须原样复现（穷举对拍会逐字验证它）。
 *
 * 3. **`detect_po` 在 `pair in LIU_HE or pair in LIU_CHONG` 时 continue**：
 *    巳申、寅亥既是合又是破 ⇒ 这两组**永远不报破**。不是遗漏，是既定行为。
 *
 * 零归一铁律：数据字段名与取值与 shushu 逐字相同（`branches`/`pillars`/`auspicious`
 * /`interpretation`/`subtype`/`key`/`total_he`…）。函数名按本项目既有习惯用驼峰
 * （`buildChart` 对 `build_chart` 同理），**字段名一律不动**。
 */

'use strict';

// Python 语义垫片（唯一真源）。⚠ `formatRelationsForPrompt` 里的取键必须走它 ——
// 用 `result.x || 默认` 会在「`result` 不是字典」时静默兜住，而基准是 AttributeError。
const { pyGet } = require('./pycompat');

// frozenset({a,b}) 的等价物：按**码点**排序后拼串（见表头注 1）。
// ⚠ 用 `function` 声明而非 `const` 箭头函数：建表就在本区块内、**早于**箭头函数的
// 初始化位置，用 const 会踩 TDZ（`Cannot access 'key2' before initialization`）。
// 函数声明整体提升，把这类「顺序敏感」的坑从结构上去掉。
function key2(a, b) { return a <= b ? a + b : b + a; }
/** frozenset({a,b,c}) 的等价物。 */
function key3(a, b, c) { return [a, b, c].sort().join(''); }

// ─────────────────────────────────────────────────────────────
// 1. 关系表（与 relations.py 第 29–104 行逐条对应）
// ─────────────────────────────────────────────────────────────
//
// ⚠ **表一律由「传统写法」现场建键，不手写键**。
// 我第一版按传统支序（子丑、寅亥…）直接写了对象字面量 —— 全错：
// `key2` 按**码点**排序，而 丑(U+4E11) < 子(U+5B50)，于是 `key2('子','丑') === '丑子'`，
// 手写的 `子丑` 键永远匹配不上。六合 6 组里只有 4 组、六冲 6 组里只有 3 组碰巧同序，
// 剩下的是**静默少报**（不报错、只是漏掉关系），正要对拍才拦得住。
// 现在把「传统表」当纯数据、键由 `key2`/`key3` 生成，从结构上不可能再错。
// 末尾 `assertTables` 再验一次「键唯一且数量对」。

/** 六合：合后所化五行。 */
const LIU_HE_TRAD = [
  ['子丑', '土'], ['寅亥', '木'], ['卯戌', '火'],
  ['辰酉', '金'], ['巳申', '水'], ['午未', '土'],  // 午未一说火土
];

/** 三合局：三支齐。 */
const SAN_HE_TRAD = [
  ['申子辰', '水'], ['亥卯未', '木'], ['寅午戌', '火'], ['巳酉丑', '金'],
];

/** 半合：中神 + 生神 或 中神 + 墓神。**有序**（shushu 的 list 顺序），`break` 依赖它。 */
const SAN_HE_HALF_TRAD = [
  ['申子', '水'], ['子辰', '水'],
  ['亥卯', '木'], ['卯未', '木'],
  ['寅午', '火'], ['午戌', '火'],
  ['巳酉', '金'], ['酉丑', '金'],
];

/** 三会方。 */
const SAN_HUI_TRAD = [
  ['寅卯辰', '木'],  // 东方
  ['巳午未', '火'],  // 南方
  ['申酉戌', '金'],  // 西方
  ['亥子丑', '水'],  // 北方
];

/** 六冲。 */
const LIU_CHONG_TRAD = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];

/** 三刑组（**有序**：无恩之刑在前，与 shushu 的 list 顺序一致）。 */
const SAN_XING_GROUPS = [
  [['寅', '巳', '申'], '无恩之刑'],
  [['丑', '戌', '未'], '恃势之刑'],
];

/** 互刑（无礼之刑）。同样由 key2 现场建键，不手写。 */
const HU_XING_KEY = key2('子', '卯');

/** 自刑：同支相见（单字表，无排序问题）。 */
const ZI_XING = ['辰', '午', '酉', '亥'];

/** 相害（六害）。 */
const LIU_HAI_TRAD = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];

/** 相破（六破）。 */
const LIU_PO_TRAD = ['子酉', '午卯', '巳申', '寅亥', '辰丑', '戌未'];

/** 由「传统写法」的 n 字表建「规范化键」集合。 */
function buildSet(list) { return new Set(list.map((s) => s.split('').sort().join(''))); }
/** 由「传统写法」的 n 字 + 五行表建 Map。键重复即抛（表本身写错时当场炸）。 */
function buildMap(rows) {
  const m = new Map();
  for (const [s, wx] of rows) {
    const k = s.split('').sort().join('');
    if (m.has(k)) throw new Error(`bazi_relations: 表内键重复 ${k}`);
    m.set(k, wx);
  }
  return m;
}

const LIU_HE = buildMap(LIU_HE_TRAD);
const SAN_HE = buildMap(SAN_HE_TRAD);
const SAN_HE_HALF = SAN_HE_HALF_TRAD.map(([s, wx]) => [s.split('').sort().join(''), wx]);
const SAN_HUI = buildMap(SAN_HUI_TRAD);
const LIU_CHONG = buildSet(LIU_CHONG_TRAD);
const LIU_HAI = buildSet(LIU_HAI_TRAD);
const LIU_PO = buildSet(LIU_PO_TRAD);

// 建表自查：数量与关系总数必须一一对上（少一条 = 静默少报一类关系）。
// 关系总数：六合 6、三合 4、半合 8、三会 4、六冲 6、相害 6、相破 6。
function assertTables() {
  const want = [
    ['LIU_HE', LIU_HE.size, 6], ['SAN_HE', SAN_HE.size, 4],
    ['SAN_HE_HALF', SAN_HE_HALF.length, 8], ['SAN_HUI', SAN_HUI.size, 4],
    ['LIU_CHONG', LIU_CHONG.size, 6], ['LIU_HAI', LIU_HAI.size, 6],
    ['LIU_PO', LIU_PO.size, 6],
  ];
  for (const [name, got, exp] of want) {
    if (got !== exp) throw new Error(`bazi_relations: ${name} 有 ${got} 条，应 ${exp} 条`);
  }
  // 半合的键必须与「三合局去掉一字」一致，否则补齐第三支的判据是假的
  for (const [k] of SAN_HE_HALF) {
    if (k.length !== 2) throw new Error(`bazi_relations: 半合键 ${k} 不是两支`);
  }
}
assertTables();

/** 柱位名映射。 */
const PILLAR_NAMES = {
  year_pillar: '年柱',
  month_pillar: '月柱',
  day_pillar: '日柱',
  hour_pillar: '时柱',
};

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/** 成员判定：数组与 Set 都走同一个入口，免得两套写法各错一次。 */
const has = (coll, v) => (coll instanceof Set ? coll.has(v) : coll.indexOf(v) >= 0);

// ─────────────────────────────────────────────────────────────
// 2. 提取四柱地支
// ─────────────────────────────────────────────────────────────

/** 返回 `[[pillar_key, 地支], …]`，跳过地支为空的柱（与 shushu 一致）。 */
function extractBranches(chart) {
  const out = [];
  for (const key of PILLAR_KEYS) {
    const p = chart[key] || {};
    const dz = p.dizhi || '';
    if (dz) out.push([key, dz]);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// 3. 各类关系检测
// ─────────────────────────────────────────────────────────────

function detectLiuHe(branches) {
  const events = [];
  const n = branches.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const k = key2(branches[i][1], branches[j][1]);
      if (LIU_HE.has(k)) {
        const wuxing = LIU_HE.get(k);
        events.push({
          type: '六合',
          branches: [branches[i][1], branches[j][1]],
          pillars: [PILLAR_NAMES[branches[i][0]], PILLAR_NAMES[branches[j][0]]],
          wuxing,
          auspicious: true,
          interpretation:
            `${PILLAR_NAMES[branches[i][0]]}${branches[i][1]}`
            + `与${PILLAR_NAMES[branches[j][0]]}${branches[j][1]}六合化${wuxing}`
            + '，主和合、贵人，宜合作',
        });
      }
    }
  }
  return events;
}

function detectSanHe(branches) {
  const events = [];
  const n = branches.length;

  // 完整三合（三支齐）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const t = key3(branches[i][1], branches[j][1], branches[k][1]);
        if (SAN_HE.has(t)) {
          const wuxing = SAN_HE.get(t);
          events.push({
            type: '三合局',
            branches: [branches[i][1], branches[j][1], branches[k][1]],
            pillars: [PILLAR_NAMES[branches[i][0]],
              PILLAR_NAMES[branches[j][0]],
              PILLAR_NAMES[branches[k][0]]],
            wuxing,
            auspicious: true,
            interpretation:
              `${[branches[i][1], branches[j][1], branches[k][1]].join('、')}`
              + `三支齐聚，三合${wuxing}局，主气势凝聚、力量倍增`,
          });
        }
      }
    }
  }

  // 半合（两支）—— 但避免与完整三合重复。
  // ⚠ `full_triples` 是**支字符集**（见表头注 2），不是三合局集合，照抄。
  const fullTriples = new Set();
  for (const e of events) for (const b of e.branches) fullTriples.add(b);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pairKey = key2(branches[i][1], branches[j][1]);
      for (const [halfPair, wuxing] of SAN_HE_HALF) {
        if (pairKey === halfPair) {
          if (fullTriples.has(branches[i][1]) && fullTriples.has(branches[j][1])) continue;
          events.push({
            type: '半三合',
            branches: [branches[i][1], branches[j][1]],
            pillars: [PILLAR_NAMES[branches[i][0]], PILLAR_NAMES[branches[j][0]]],
            wuxing,
            auspicious: true,
            interpretation:
              `${branches[i][1]}${branches[j][1]}半合${wuxing}`
              + '，若大运或流年遇到补齐的第三支则全合',
          });
          break;
        }
      }
    }
  }
  return events;
}

function detectSanHui(branches) {
  const events = [];
  const n = branches.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const t = key3(branches[i][1], branches[j][1], branches[k][1]);
        if (SAN_HUI.has(t)) {
          const wuxing = SAN_HUI.get(t);
          events.push({
            type: '三会方',
            branches: [branches[i][1], branches[j][1], branches[k][1]],
            pillars: [PILLAR_NAMES[branches[i][0]],
              PILLAR_NAMES[branches[j][0]],
              PILLAR_NAMES[branches[k][0]]],
            wuxing,
            auspicious: true,
            interpretation:
              `${[branches[i][1], branches[j][1], branches[k][1]].join('、')}`
              + `三会${wuxing}方，五行气势极旺，比三合更强`,
          });
        }
      }
    }
  }
  return events;
}

function detectLiuChong(branches) {
  const events = [];
  const n = branches.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const k = key2(branches[i][1], branches[j][1]);
      if (!has(LIU_CHONG, k)) continue;
      const p1 = PILLAR_NAMES[branches[i][0]];
      const p2 = PILLAR_NAMES[branches[j][0]];
      // 日月冲、年时冲等重点解读（判断顺序与 shushu 的三元表达式逐字对应：
      // 先日月、再年月、再日时、再年时，其余「相冲」）
      const positions = [branches[i][0], branches[j][0]];
      const pos = (x) => has(positions, x);
      const keyChong = (pos('day_pillar') && pos('month_pillar')) ? '日月相冲（中年动荡）'
        : (pos('year_pillar') && pos('month_pillar')) ? '年月相冲（少年家境波动）'
          : (pos('day_pillar') && pos('hour_pillar')) ? '日时相冲（晚年/子嗣有变）'
            : (pos('year_pillar') && pos('hour_pillar')) ? '年时相冲（首末相冲，根基不稳）'
              : '相冲';
      events.push({
        type: '六冲',
        branches: [branches[i][1], branches[j][1]],
        pillars: [p1, p2],
        key: keyChong,
        auspicious: false,
        interpretation:
          `${p1}${branches[i][1]}与${p2}${branches[j][1]}六冲`
          + `（${keyChong}）— 主动荡、变化、克冲，吉星受冲减力，凶星受冲反激`,
      });
    }
  }
  return events;
}

function detectXing(branches) {
  const events = [];
  const n = branches.length;
  const branchOnly = branches.map((b) => b[1]);
  const pillarOnly = branches.map((b) => b[0]);

  // 三刑组：四柱里含该组 ≥2 支即报
  for (const [xingSet, xingName] of SAN_XING_GROUPS) {
    const present = [];
    for (let i = 0; i < branchOnly.length; i++) {
      if (has(xingSet, branchOnly[i])) present.push(i);
    }
    if (present.length >= 2) {
      const shownBranches = present.map((i) => branchOnly[i]);
      const shownPillars = present.map((i) => PILLAR_NAMES[pillarOnly[i]]);
      events.push({
        type: present.length >= 3 ? '三刑' : '刑（部分三刑）',
        branches: shownBranches,
        pillars: shownPillars,
        subtype: xingName,
        auspicious: false,
        interpretation:
          `${shownBranches.join('、')}见${xingName}`
          + `（${present.length >= 3 ? '三刑齐聚' : '三刑见两支'}）— 主刑伤、官非、人际冲突`,
      });
    }
  }

  // 互刑（子卯）
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (key2(branches[i][1], branches[j][1]) === HU_XING_KEY) {
        events.push({
          type: '互刑',
          branches: [branches[i][1], branches[j][1]],
          pillars: [PILLAR_NAMES[branches[i][0]], PILLAR_NAMES[branches[j][0]]],
          subtype: '无礼之刑',
          auspicious: false,
          interpretation:
            `${branches[i][1]}${branches[j][1]}互刑（无礼之刑）`
            + '— 主人际关系紧张、犯小人',
        });
      }
    }
  }

  // 自刑（同支重叠）。⚠ 用 Map 保插入序 —— python dict 按首见柱序，
  // JS 对象对非整数键虽也是插入序，但「看起来对」不如「结构上对」。
  const branchCounts = new Map();
  for (const [k, dz] of branches) {
    if (has(ZI_XING, dz)) {
      if (!branchCounts.has(dz)) branchCounts.set(dz, []);
      branchCounts.get(dz).push(PILLAR_NAMES[k]);
    }
  }
  for (const [dz, plist] of branchCounts) {
    if (plist.length >= 2) {
      events.push({
        type: '自刑',
        branches: Array(plist.length).fill(dz),
        pillars: plist,
        subtype: `${dz}自刑`,
        auspicious: false,
        interpretation:
          `${dz}自刑（${plist.join('/')}皆为${dz}）`
          + '— 主自我冲突、内耗，情绪反复',
      });
    }
  }
  return events;
}

function detectHai(branches) {
  const events = [];
  const n = branches.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!has(LIU_HAI, key2(branches[i][1], branches[j][1]))) continue;
      events.push({
        type: '相害',
        branches: [branches[i][1], branches[j][1]],
        pillars: [PILLAR_NAMES[branches[i][0]], PILLAR_NAMES[branches[j][0]]],
        auspicious: false,
        interpretation:
          `${PILLAR_NAMES[branches[i][0]]}${branches[i][1]}`
          + `与${PILLAR_NAMES[branches[j][0]]}${branches[j][1]}相害`
          + '— 暗损、内伤、阴损，影响六亲缘分',
      });
    }
  }
  return events;
}

function detectPo(branches) {
  const events = [];
  const n = branches.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const k = key2(branches[i][1], branches[j][1]);
      if (!has(LIU_PO, k)) continue;
      // 若已构成六合或六冲则跳过相破（巳申/寅亥因此永不报破，见表头注 3）
      if (LIU_HE.has(k) || has(LIU_CHONG, k)) continue;
      events.push({
        type: '相破',
        branches: [branches[i][1], branches[j][1]],
        pillars: [PILLAR_NAMES[branches[i][0]], PILLAR_NAMES[branches[j][0]]],
        auspicious: false,
        interpretation:
          `${branches[i][1]}${branches[j][1]}相破`
          + '— 破坏、损耗（次要语象）',
      });
    }
  }
  return events;
}

// ─────────────────────────────────────────────────────────────
// 4. 主入口
// ─────────────────────────────────────────────────────────────

function analyzeAllRelations(chart) {
  const branches = extractBranches(chart);

  const heEvents = detectLiuHe(branches).concat(detectSanHe(branches), detectSanHui(branches));
  const chongEvents = detectLiuChong(branches);
  const xingEvents = detectXing(branches);
  const haiEvents = detectHai(branches);
  const poEvents = detectPo(branches);

  const keyWarnings = [];
  const keyBlessings = [];

  for (const e of chongEvents) keyWarnings.push(`⚠ ${e.interpretation}`);
  for (const e of xingEvents) keyWarnings.push(`⚠ ${e.interpretation}`);
  for (const e of haiEvents.slice(0, 2)) keyWarnings.push(`· ${e.interpretation}`);

  // 三合/三会优先于六合（两遍扫，照抄）
  for (const e of heEvents) {
    if (e.type === '三合局' || e.type === '三会方') keyBlessings.push(`✦ ${e.interpretation}`);
  }
  for (const e of heEvents) {
    if (e.type === '六合') keyBlessings.push(`· ${e.interpretation}`);
  }

  return {
    he: heEvents,
    chong: chongEvents,
    xing: xingEvents,
    hai: haiEvents,
    po: poEvents,
    summary: {
      total_he: heEvents.length,
      total_chong: chongEvents.length,
      total_xing: xingEvents.length,
      total_hai: haiEvents.length,
      total_po: poEvents.length,
      key_warnings: keyWarnings,
      key_blessings: keyBlessings,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 5. 大运/流年应期触发
// ─────────────────────────────────────────────────────────────

/**
 * 某个大运/流年地支与本命四柱的刑冲合害关系。
 *
 * ⚠ 半合那段用的是 `if` 不是 `elif`：某个 target 支**可以同时**报「合」与「冲」吗？
 * 不行 —— 合表与冲表无交集，且半合表与合/冲表也无交集（寅亥、巳申是六合，
 * 而半合八组里没有它们）。故各分支互斥，照抄 if 链即可。
 */
function analyzeDayunLiunianTrigger(chart, targetBranch, targetLabel) {
  const label = targetLabel === undefined ? '大运' : targetLabel;
  const natalBranches = extractBranches(chart);
  const triggers = [];

  for (const [pillarKey, natalDz] of natalBranches) {
    const k = key2(targetBranch, natalDz);
    const pname = PILLAR_NAMES[pillarKey];

    if (has(LIU_CHONG, k)) {
      triggers.push({
        type: '冲',
        trigger: `${label}${targetBranch}`,
        target: `${pname}${natalDz}`,
        auspicious: false,
        interpretation:
          `${label}${targetBranch}冲${pname}${natalDz}`
          + ' — 触发该柱所代表的人事动荡',
      });
    }
    if (LIU_HE.has(k)) {
      const wx = LIU_HE.get(k);
      triggers.push({
        type: '合',
        trigger: `${label}${targetBranch}`,
        target: `${pname}${natalDz}`,
        auspicious: true,
        wuxing: wx,
        interpretation:
          `${label}${targetBranch}合${pname}${natalDz}化${wx}`
          + ' — 触发合化、贵人、机缘',
      });
    }
    // 半合
    for (const [halfPair, wx] of SAN_HE_HALF) {
      if (k === halfPair) {
        triggers.push({
          type: '半合',
          trigger: `${label}${targetBranch}`,
          target: `${pname}${natalDz}`,
          auspicious: true,
          wuxing: wx,
          interpretation: `${label}${targetBranch}与${pname}${natalDz}半合${wx}`,
        });
        break;
      }
    }
    if (has(LIU_HAI, k)) {
      triggers.push({
        type: '害',
        trigger: `${label}${targetBranch}`,
        target: `${pname}${natalDz}`,
        auspicious: false,
        interpretation: `${label}${targetBranch}害${pname}${natalDz} — 暗损、阴亏`,
      });
    }
    if (targetBranch === natalDz && has(ZI_XING, targetBranch)) {
      triggers.push({
        type: '自刑',
        trigger: `${label}${targetBranch}`,
        target: `${pname}${natalDz}`,
        auspicious: false,
        interpretation: `${label}${targetBranch}遇本命同支${natalDz}（自刑）— 内耗加重`,
      });
    }
  }

  return triggers;
}

// ─────────────────────────────────────────────────────────────
// 6. Prompt 格式化（3.5.4 用；本层一并移植，避免以后再回来动这个文件）
// ─────────────────────────────────────────────────────────────

function formatRelationsForPrompt(result) {
  if (!result) return '';
  // ⚠ 这里的每一处都必须是 `pyGet`（Python 的 `.get`），**不能用 `result.x || 默认`**：
  //   `||` 两个坑都在层 16 的对拍里印过 ——
  //   ① 宽容：`result` 是 `'abc'` 时 `.summary` 给 `undefined`、`|| {}` 兜住，
  //      于是本函数**安静返回「无明显刑冲合害」**，而基准是
  //      `AttributeError: 'str' object has no attribute 'get'`（被 `api/agent.py`
  //      那段 try 吞掉 → 整段消失）。实测差 2 例（`pm/rel-str-*`）。
  //      产物上就是「少一段」对「多一段」，是看得见的行为差别。
  //   ② 兜掉假值：`summary` 若为 `""`，Python 拿到的是 `""`、随后 `"".get(...)`
  //      照样 AttributeError；`|| {}` 会把它换成一个能用的空字典。
  const summary = pyGet(result, 'summary', {});
  // 五个计数相加。⚠ **不加 `|| 0`**：Python 的 `.get(k, 0)` 只在**键缺失**时给 0，
  // 键在而值为 `None` 时它会 `TypeError`；`|| 0` 会把那种情形也演成正常返回。
  // （目前没有用例覆盖「键在而值为 None」，故这里只保证与原式同形，不声称已验。）
  const t = ['total_he', 'total_chong', 'total_xing', 'total_hai', 'total_po']
    .reduce((s, k) => s + pyGet(summary, k, 0), 0);
  if (t === 0) return '【地支刑冲合害】无明显刑冲合害关系，命盘相对平和。';

  const lines = [`【地支刑冲合害】（共 ${t} 项关系，论命必参）`];

  const bless = pyGet(summary, 'key_blessings', undefined);
  if (bless && bless.length) {
    lines.push('  ◆ 吉象：');
    for (const b of bless.slice(0, 6)) lines.push(`    ${b}`);
  }

  const warn = pyGet(summary, 'key_warnings', undefined);
  if (warn && warn.length) {
    lines.push('  ◆ 警示：');
    for (const w of warn.slice(0, 8)) lines.push(`    ${w}`);
  }

  const chong = pyGet(result, 'chong', undefined);
  if (chong && chong.length) {
    const chongList = [];
    for (const c of chong.slice(0, 4)) {
      chongList.push(`${c.pillars[0]}${c.branches[0]}↔${c.pillars[1]}${c.branches[1]}`);
    }
    lines.push(`  ◆ 冲：${chongList.join(' / ')}`);
  }

  const he = pyGet(result, 'he', undefined);
  if (he && he.length) {
    const heList = [];
    for (const h of he.slice(0, 5)) {
      if (h.type === '三合局' || h.type === '三会方') {
        heList.push(`${h.type}${h.wuxing}局(${h.branches.join('-')})`);
      } else {
        heList.push(`${h.branches[0]}${h.branches[1]}${h.type}`);
      }
    }
    lines.push(`  ◆ 合：${heList.join(' / ')}`);
  }

  lines.push('');
  lines.push('  说明：');
  lines.push('    · 合主和，冲主散，刑主伤，害主损，破主败 — 但需视所合冲的是用神还是忌神判吉凶');
  lines.push('    · 合掉用神 = 用神被合住反受其害；冲掉忌神 = 凶星受冲反为吉');
  lines.push('    · 大运流年触发本命的刑冲合害时，应期才真正显现');

  return lines.join('\n');
}

module.exports = {
  analyzeAllRelations,
  analyzeDayunLiunianTrigger,
  formatRelationsForPrompt,
  extractBranches,
  // 检测器逐个导出：对拍失败时要能定位到**哪一支检测器**，而不是只看总输出
  detectLiuHe, detectSanHe, detectSanHui, detectLiuChong,
  detectXing, detectHai, detectPo,
};

/**
 * paipan/bazi_patterns.js —— 八字特殊格局层（3.5.3b）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/special_patterns.py`：
 *   `detect_all_special_patterns`        → `detectAllSpecialPatterns`
 *   `format_special_patterns_for_prompt` → `formatSpecialPatternsForPrompt`
 *   10 个检测器逐一出（对拍失败要能定位到**哪一个格局**）
 *
 * ── 移植时必须照抄、不能"顺手整理"的三处 ──
 *
 * 1. **羊刃表只有阳干五个**：`YANGREN = {甲卯, 丙午, 戊午, 庚酉, 壬子}`，
 *    `if dm not in YANGREN: return 未成格`。`core/constants.SHENSHA['羊刃']` 是**另一张表**，
 *    十个天干都有（乙寅、丁巳、己巳、辛申、癸亥）—— **不能拿它来替**，否则阴干日主
 *    会凭空多出一个「羊刃驾杀」。禄位表 `LUWEI` 与 `SHENSHA['禄神']` 恰好一致，
 *    但也是两张独立的表，本文件照抄 LUWEI 并加断言交叉核对（见文件末 `assertTables`）。
 *
 * 2. **`_shishen_present` 的扫描范围**：四柱**天干**（跳过与日干相同者）+ **月支的全部藏干**
 *    （不是只取本气）。且它只统计 `target_shishens` 里点名的那些十神，其余丢弃 ——
 *    于是「正官有、七杀无」这种差异在 `evidence` 的顺序里体现出来：`present` 的键序
 *    恒为调用时给的顺序（正官/七杀/正印/偏印/…），故 `guan_pos = 正官 + 七杀` 是**确定序**。
 *
 * 3. **`杂气月令格` 的十神串在 shushu 侧不可复现**（与 relations.py 的三合文案同一类缺陷）：
 *    `ss_names = list(set([x[0] for x in important_ss]))` —— python str hash 逐进程随机，
 *    实测 `PYTHONHASHSEED=0/3` 得「七杀/偏财」而 `1/2` 得「偏财/七杀」。
 *    本项目取**藏干原序去重**（`important_ss` 本就按 `canggan` 顺序生成），是个确定且有含义
 *    的顺序；对拍侧用 `diff_bazi_patterns.py::norm` 对这一句**双向**排序后再比。
 *
 * ── 与 shushu 的两处行为差异（都已注明，不是遗漏） ──
 * · `detect_tianyi_dugui` 里 shushu 把 `analyze_all_relations` 包在 try/except 里静默降级。
 *   本项目的 `bazi_relations.js` 是同一份纯函数且已被全枚举验证，不会抛；这里仍保留
 *   同样的控制流，但**抛错时打 stderr 再降级**，不做「静默 fallback」
 *   （层 7 的教训：静默降级会把 harness 自己的错伪装成被验方的错）。
 * · `detect_all_special_patterns` 同理：单个检测器抛错则跳过，但会打 stderr 留痕。
 */

'use strict';

const C = require('./constants.js');
const T = require('./bazi_tables.js');
const REL = require('./bazi_relations.js');

const { DIZHI, GAN_WUXING } = C;

// ─────────────────────────────────────────────────────────────
// 数据表
// ─────────────────────────────────────────────────────────────

/** 日干禄位（照抄 special_patterns.LUWEI，不引用 SHENSHA 的同名表）。 */
const LUWEI = {
  甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳',
  己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};

/** 阳干羊刃（禄前一位）。**只有五个阳干**，见表头注 1。 */
const YANGREN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };

/** 天乙贵人（日干 → 两个贵人支）。取自生成表，避免数据漂移。 */
const TIANYI_GUI = T.SHENSHA['天乙贵人'] || {};

/** 杂气库（四墓库 → 所藏五行）。本层只用它的**键**判「月支是否四库土」。 */
const ZAQI = {
  辰: ['水', '土', '木'],  // 水库，藏戊乙癸
  戌: ['火', '土', '金'],  // 火库，藏戊辛丁
  丑: ['金', '土', '水'],  // 金库，藏己癸辛
  未: ['木', '土', '火'],  // 木库，藏己丁乙
};

/** 魁罡四柱。 */
const KUI_GANG = [['庚', '辰'], ['庚', '戌'], ['壬', '辰'], ['戊', '戌']];

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

// ─────────────────────────────────────────────────────────────
// 通用辅助
// ─────────────────────────────────────────────────────────────

const tgOf = (chart, key) => ((chart[key] || {}).tiangan || '');
const dzOf = (chart, key) => ((chart[key] || {}).dizhi || '');
const allDz = (chart) => PILLAR_KEYS.map((k) => dzOf(chart, k));
const allTg = (chart) => PILLAR_KEYS.map((k) => tgOf(chart, k));

/** 把字符串数组渲染成 **Python 的 list repr**：`['酉']` / `['子', '申']`。
 *
 *  用途只有一个：shushu `detect_tianyi_dugui` 把 `gui_in_chart`（list）直接
 *  f-string 进了用户可见文案，于是那句中文里带着方括号与引号。移植要**照抄**，
 *  所以 JS 得能生成一模一样的形状。全项目 `special_patterns.py` 里这种插值仅此一处
 *  （已 grep 核对：其余 `{...}` 都是 str）。
 *
 *  ⚠ JS 的模板串直接插数组会走 `Array.prototype.toString`（逗号连接、无方括号、无引号），
 *  形状与 Python 不同 —— 这是一个「看起来对、内容少了两层壳」的静默差异。
 */
function pyListRepr(arr) {
  return '[' + arr.map((x) => `'${x}'`).join(', ') + ']';
}

/** 合并四柱所有藏干（本层未被调用，照抄以保持模块完整）。 */
function allCanggan(chart) {
  const out = [];
  for (const k of PILLAR_KEYS) out.push(...((chart[k] || {}).canggan || []));
  return out;
}

/**
 * 十神查表 —— **不抛**，与 shushu `SHISHEN.get((dm, stem), "")` 逐字等价。
 *
 * 不复用 `bazi.js::getShiShen`：那个日主不在表里会抛（排盘路径上"宁可炸"是对的），
 * 而本层是从 `chart.day_master || ""` 取值去查的，空日主必须安静地得到 `""`
 * —— 否则一个退化输入会把整层格局检测炸掉，而 shushu 那边只是少几条证据。
 */
function shiShen(dm, tg) {
  const row = T.SHISHEN[dm];
  if (!row) return '';
  return row[tg] || '';
}

/**
 * 扫出指定十神的出现位置。
 * 返回 `{十神名: ["年柱天干甲", "月支藏乙", …]}`，**键序恒为入参顺序**。
 */
function shishenPresent(chart, ...targets) {
  const dm = chart.day_master || '';
  const result = {};
  for (const s of targets) result[s] = [];

  // 四柱透干
  for (const key of PILLAR_KEYS) {
    const tg = tgOf(chart, key);
    if (!tg || tg === dm) continue;
    const ss = shiShen(dm, tg);
    if (Object.prototype.hasOwnProperty.call(result, ss)) {
      result[ss].push(`${key}天干${tg}`);
    }
  }

  // 月支藏干（命理学上月支藏干力量最大）
  const monthCg = ((chart.month_pillar || {}).canggan) || [];
  for (const tg of monthCg) {
    if (tg === dm) continue;
    const ss = shiShen(dm, tg);
    if (Object.prototype.hasOwnProperty.call(result, ss)) {
      result[ss].push(`月支藏${tg}`);
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// 1. 日禄归时格
// ─────────────────────────────────────────────────────────────

function detectRiluGuishi(chart) {
  const dm = chart.day_master || '';
  const hourDz = dzOf(chart, 'hour_pillar');
  if (dm && LUWEI[dm] === hourDz) {
    // 日禄归时忌见官星：guan_killer 是「克日主的五行」
    const GUAN_KILLER = { 金: '火', 木: '金', 水: '土', 火: '水', 土: '木' };
    const dmWx = GAN_WUXING[dm];
    const keWx = GUAN_KILLER[dmWx] || '';
    const hasGuan = allTg(chart).some((t) => GAN_WUXING[t] === keWx);
    return {
      name: '日禄归时格',
      matched: true,
      auspicious: !hasGuan,
      condition: `日干${dm}之禄${hourDz}恰落时支`,
      interpretation:
        `日禄归时（${dm}禄归${hourDz}）— 主晚景丰隆、子孙得力、自立成名。`
        + (hasGuan ? '忌见官星，本盘有官星制禄，格局减分。' : '无官星破，格局成立。'),
    };
  }
  return { name: '日禄归时格', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 2. 官印相生
// ─────────────────────────────────────────────────────────────

function detectGuanyinXiangsheng(chart) {
  const present = shishenPresent(chart, '正官', '七杀', '正印', '偏印');
  const hasGuan = !!(present['正官'].length || present['七杀'].length);
  const hasYin = !!(present['正印'].length || present['偏印'].length);

  if (hasGuan && hasYin) {
    const guanPos = present['正官'].concat(present['七杀']);
    const yinPos = present['正印'].concat(present['偏印']);
    return {
      name: '官印相生',
      matched: true,
      auspicious: true,
      condition: `官星 (${guanPos.length} 处) + 印星 (${yinPos.length} 处) 同透`,
      evidence: guanPos.concat(yinPos),
      interpretation:
        '官印相生 — 官星生印（化煞为权），印星扶身，主权贵、学问、文职、清贵之命。'
        + '尤其官印同透不杂财，可由学入仕、由文得贵。',
    };
  }
  return { name: '官印相生', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 3. 食神制杀
// ─────────────────────────────────────────────────────────────

function detectShishenZhisha(chart) {
  const present = shishenPresent(chart, '食神', '七杀', '正印', '偏印');
  const hasShi = !!present['食神'].length;
  const hasSha = !!present['七杀'].length;
  const hasYin = !!(present['正印'].length || present['偏印'].length);
  const yinCount = present['正印'].length + present['偏印'].length;

  if (hasShi && hasSha) {
    return {
      name: '食神制杀',
      matched: true,
      auspicious: !(hasYin && yinCount >= 2),
      condition: '食神与七杀同透',
      evidence: present['食神'].concat(present['七杀']),
      interpretation:
        '食神制杀 — 七杀本凶神，得食神制约则化为权威，'
        + '主有谋略、能担大任、武贵之命。'
        + (hasYin && yinCount >= 2 ? "但本命印星过重，恐'枭神夺食'破格。" : ''),
    };
  }
  return { name: '食神制杀', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 4. 伤官见官（凶格）
// ─────────────────────────────────────────────────────────────

function detectShangguanJianguan(chart) {
  const present = shishenPresent(chart, '伤官', '正官');
  const hasShang = !!present['伤官'].length;
  const hasGuan = !!present['正官'].length;

  if (hasShang && hasGuan) {
    return {
      name: '伤官见官',
      matched: true,
      auspicious: false,
      condition: '伤官与正官同透',
      evidence: present['伤官'].concat(present['正官']),
      interpretation:
        '伤官见官 — 经典凶格，伤官克正官（克夫/克权威），'
        + '主官非、口舌、上司不睦、女命婚姻不顺。'
        + '化解需有财通关（伤官生财，财生官）或印星制伤。',
    };
  }
  return { name: '伤官见官', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 5. 财官印齐全
// ─────────────────────────────────────────────────────────────

function detectCaiGuanYinQuanju(chart) {
  const present = shishenPresent(chart, '正官', '七杀', '正印', '偏印', '正财', '偏财');
  const hasGuan = !!(present['正官'].length || present['七杀'].length);
  const hasYin = !!(present['正印'].length || present['偏印'].length);
  const hasCai = !!(present['正财'].length || present['偏财'].length);

  if (hasGuan && hasYin && hasCai) {
    const evidence = present['正官'].concat(present['七杀'], present['正印'],
      present['偏印'], present['正财'], present['偏财']);
    return {
      name: '财官印三全',
      matched: true,
      auspicious: true,
      condition: '财、官（杀）、印 三神同透',
      evidence,
      interpretation:
        '财官印齐全（财→官→印→身的完整流通）— 大富大贵之格，'
        + '主一生事业财禄印俱足，主名利双收，常见于实业、政商人物。',
    };
  }
  return { name: '财官印三全', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 6. 羊刃驾杀
// ─────────────────────────────────────────────────────────────

function detectYangrenJiasha(chart) {
  const dm = chart.day_master || '';
  if (!Object.prototype.hasOwnProperty.call(YANGREN, dm)) {
    return { name: '羊刃驾杀', matched: false };
  }

  const yangrenZhi = YANGREN[dm];
  const hasYangren = allDz(chart).indexOf(yangrenZhi) >= 0;

  const present = shishenPresent(chart, '七杀');
  const hasSha = !!present['七杀'].length;

  if (hasYangren && hasSha) {
    return {
      name: '羊刃驾杀',
      matched: true,
      auspicious: true,
      condition: `羊刃${yangrenZhi}地支 + 七杀同透`,
      evidence: [`羊刃${yangrenZhi}`].concat(present['七杀']),
      interpretation:
        `羊刃驾杀（羊刃${yangrenZhi}+七杀同制）— 武贵之格，`
        + '主英雄豪杰、军政高位、敢担当能成大事，'
        + '尤适合军警、运动、外科医生等高强度行业。',
    };
  }
  return { name: '羊刃驾杀', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 7. 杂气月令格
// ─────────────────────────────────────────────────────────────

function detectZaqiYueling(chart) {
  const monthDz = dzOf(chart, 'month_pillar');
  if (!Object.prototype.hasOwnProperty.call(ZAQI, monthDz)) {
    return { name: '杂气月令格', matched: false };
  }

  const dm = chart.day_master || '';
  const monthCanggan = ((chart.month_pillar || {}).canggan) || [];

  const importantSs = [];
  for (const tg of monthCanggan) {
    if (tg === dm) continue;
    const ss = shiShen(dm, tg);
    if (['正官', '七杀', '正印', '偏印', '正财', '偏财'].indexOf(ss) >= 0) {
      importantSs.push([ss, tg]);
    }
  }

  if (importantSs.length) {
    // ⚠ shushu 这里是 `list(set(...))`，顺序逐进程随机（见表头注 3）。
    // 这里取**藏干原序去重**：确定的、有含义的顺序；对拍侧对这一句双向排序后再比。
    const ssNames = [];
    for (const [ss] of importantSs) if (ssNames.indexOf(ss) < 0) ssNames.push(ss);
    return {
      name: '杂气月令格',
      matched: true,
      auspicious: true,
      condition: `月支${monthDz}（四库土）藏 ${ssNames.join('/')}`,
      evidence: importantSs.map(([ss, tg]) => `${tg}(${ss})`),
      interpretation:
        `杂气月令格 — 月支${monthDz}为四库土，藏 ${ssNames.join('/')} 等用神。`
        + '杂气格需冲开库门（大运/流年遇相冲）才能富贵显现，'
        + '故应期常在 30-40 岁后或库被冲之运。',
    };
  }
  return { name: '杂气月令格', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 8. 拱禄拱贵
// ─────────────────────────────────────────────────────────────

function detectGongluGonggui(chart) {
  const dm = chart.day_master || '';
  if (!dm) return { name: '拱禄拱贵', matched: false };

  const lu = LUWEI[dm] || '';
  const guis = new Set(TIANYI_GUI[dm] || []);

  // 邻柱顺序：年-月、月-日、日-时
  const pillarPairs = [
    ['year_pillar', 'month_pillar'],
    ['month_pillar', 'day_pillar'],
    ['day_pillar', 'hour_pillar'],
  ];
  const DZ_ORDER = DIZHI.join('');   // 「子丑寅卯…」（与 shushu 的字符串同序）

  let findings = [];
  for (const [p1, p2] of pillarPairs) {
    const d1 = dzOf(chart, p1);
    const d2 = dzOf(chart, p2);
    if (!d1 || !d2) continue;
    const i1 = DZ_ORDER.indexOf(d1);
    const i2 = DZ_ORDER.indexOf(d2);
    if (i1 < 0 || i2 < 0) continue;     // 对应 shushu 的 except ValueError
    // 相距 2（中间夹 1 支）：abs(i1-i2)==2 或 ==10（循环考虑）
    if (Math.abs(i1 - i2) === 2 || Math.abs(i1 - i2) === 10) {
      const midIdx = Math.abs(i1 - i2) === 2
        ? Math.floor((i1 + i2) / 2)
        : Math.floor((i1 + i2 + 12) / 2) % 12;
      const midDz = DZ_ORDER[midIdx];
      if (midDz === lu) findings.push(`${d1}${d2}拱禄${midDz}`);
      else if (guis.has(midDz)) findings.push(`${d1}${d2}拱贵${midDz}`);
    }
  }

  // 命盘中实际有该夹支时不算拱
  const actualDz = new Set(allDz(chart));
  findings = findings.filter((f) => {
    const mid = f.split('拱')[1].replace(/禄/g, '').replace(/贵/g, '');
    return !actualDz.has(mid);
  });

  if (findings.length) {
    return {
      name: '拱禄拱贵',
      matched: true,
      auspicious: true,
      condition: '邻柱地支夹禄/夹贵人',
      evidence: findings,
      interpretation:
        `拱禄拱贵 — ${findings.join('/')}，`
        + '命无禄贵却暗藏，主有贵人暗助、机缘暗生，'
        + "看似无形实则得力，是命书中的'隐贵'之格。",
    };
  }
  return { name: '拱禄拱贵', matched: false };
}

// ─────────────────────────────────────────────────────────────
// 9. 天乙独贵
// ─────────────────────────────────────────────────────────────

function detectTianyiDugui(chart) {
  const dm = chart.day_master || '';
  if (!Object.prototype.hasOwnProperty.call(TIANYI_GUI, dm)) {
    return { name: '天乙独贵', matched: false };
  }

  const guis = TIANYI_GUI[dm];
  const dzs = allDz(chart);
  const guiInChart = guis.filter((g) => dzs.indexOf(g) >= 0);

  if (!guiInChart.length) return { name: '天乙独贵', matched: false };

  // ⚠ 照抄：shushu 把 `gui_in_chart`（一个 list）直接 f-string 进文案，于是
  // 用户可见的文本里带的是 **Python 的 list repr** ——「命带天乙贵人 ['酉']」。
  // 我一开始按中文习惯输出了「酉」，对拍立刻在 8317 例上显形。
  // 这里**刻意照抄那个方括号**：零归一是为了不把「我以为该长什么样」混进移植，
  // 混进来之后就再也分不清哪些差异是算法的、哪些是我改的审美。
  // 文案是否该去掉方括号，是**提示词层**（3.5.4）要单独拍板的事，不在这里偷偷改。
  const guiRepr = pyListRepr(guiInChart);

  // 查刑冲（用关系层）。shushu 在此静默降级，这里保留控制流但打 stderr 留痕。
  try {
    const rel = REL.analyzeAllRelations(chart);
    const hits = (rel.chong || []).concat(rel.xing || []);
    for (const c of hits) {
      const branches = c.branches || [];
      if (guiInChart.some((g) => branches.indexOf(g) >= 0)) {
        return {
          name: '天乙独贵',
          matched: true,
          auspicious: false,
          condition: `天乙贵人 ${guiRepr} 受刑冲`,
          interpretation:
            `天乙贵人 ${guiRepr} 被刑冲，贵气被破，`
            + '贵人助力大打折扣，需有合化通关方可解。',
        };
      }
    }
  } catch (e) {
    console.error(`[bazi_patterns] 天乙独贵：关系层抛错，降级为「无刑冲破害」— ${e.message}`);
  }

  return {
    name: '天乙独贵',
    matched: true,
    auspicious: true,
    condition: `命带天乙贵人 ${guiRepr} 且无刑冲破害`,
    evidence: guiInChart,
    interpretation:
      `天乙独贵 — 命带天乙贵人 ${guiRepr}，`
      + '天乙乃天上之极尊神，主一生多遇贵人提携，'
      + '逢凶化吉，事业上常得长辈/上司/师长之助。',
  };
}

// ─────────────────────────────────────────────────────────────
// 10. 魁罡格
// ─────────────────────────────────────────────────────────────

function detectKuigangGe(chart) {
  const dayTg = tgOf(chart, 'day_pillar');
  const dayDz = dzOf(chart, 'day_pillar');
  if (!KUI_GANG.some(([g, z]) => g === dayTg && z === dayDz)) {
    return { name: '魁罡格', matched: false };
  }

  // 魁罡忌冲：辰戌相冲
  const all = allDz(chart);
  const chongDz = { 辰: '戌', 戌: '辰' }[dayDz] || '';
  const hasChong = all.indexOf(chongDz) >= 0
    && all.some((dz) => dz === chongDz && dz !== dayDz);

  return {
    name: '魁罡格',
    matched: true,
    auspicious: !hasChong,
    condition: `日柱${dayTg}${dayDz}（魁罡四柱之一）`,
    interpretation:
      `魁罡格 — 日柱${dayTg}${dayDz}为'天罡之首'，主聪明果断、性烈、有权威，`
      + '宜任领导/法律/军警。'
      + (hasChong ? '但有冲魁罡（辰戌冲），减半甚至破格，主一生劳碌。'
        : '无冲，格局成立。女命魁罡多个性独立、晚婚或事业心重。'),
  };
}

// ─────────────────────────────────────────────────────────────
// 建表自查：本文件抄来的表必须与生成表/常识交叉一致（独立核对）
// ─────────────────────────────────────────────────────────────

(function assertTables() {
  // 禄位表与 constants 生成表的「禄神」必须一致（两张独立来源的表）
  const lushen = T.SHENSHA['禄神'] || {};
  for (const dm of Object.keys(LUWEI)) {
    const want = (lushen[dm] || [])[0];
    if (want !== LUWEI[dm]) {
      throw new Error(`bazi_patterns: LUWEI[${dm}]=${LUWEI[dm]} 与 SHENSHA.禄神=${want} 不一致`);
    }
  }
  // 羊刃表只该有阳干五个（阴干五个**故意**不在此表内，见表头注 1）
  const yanrenAll = T.SHENSHA['羊刃'] || {};
  const yangGan = ['甲', '丙', '戊', '庚', '壬'];
  for (const dm of yangGan) {
    const want = (yanrenAll[dm] || [])[0];
    if (want !== YANGREN[dm]) {
      throw new Error(`bazi_patterns: YANGREN[${dm}]=${YANGREN[dm]} 与 SHENSHA.羊刃=${want} 不一致`);
    }
  }
  const yinGan = ['乙', '丁', '己', '辛', '癸'];
  for (const dm of yinGan) {
    if (Object.prototype.hasOwnProperty.call(YANGREN, dm)) {
      throw new Error(`bazi_patterns: YANGREN 不该含阴干 ${dm}（shushu 只论阳干羊刃）`);
    }
  }
  // 魁罡四柱与生成表的「魁罡」必须一致
  const kuigang = T.SHENSHA_EXTENDED['魁罡'] || {};
  const fromTable = [];
  for (const [g, zs] of Object.entries(kuigang)) for (const z of zs) fromTable.push(g + z);
  const mine = KUI_GANG.map(([g, z]) => g + z);
  if (fromTable.slice().sort().join() !== mine.slice().sort().join()) {
    throw new Error(`bazi_patterns: KUI_GANG=${mine} 与 SHENSHA_EXTENDED.魁罡=${fromTable} 不一致`);
  }
  // 天乙贵人必须十干齐全
  for (const g of C.TIANGAN) {
    if (!TIANYI_GUI[g]) throw new Error(`bazi_patterns: 天乙贵人缺 ${g}`);
  }
})();

// ─────────────────────────────────────────────────────────────
// 主入口
// ─────────────────────────────────────────────────────────────

const DETECTORS = [
  ['rilu_guishi', detectRiluGuishi],
  ['guanyin_xiangsheng', detectGuanyinXiangsheng],
  ['shishen_zhisha', detectShishenZhisha],
  ['shangguan_jianguan', detectShangguanJianguan],
  ['cai_guan_yin_quanju', detectCaiGuanYinQuanju],
  ['yangren_jiasha', detectYangrenJiasha],
  ['zaqi_yueling', detectZaqiYueling],
  ['gonglu_gonggui', detectGongluGonggui],
  ['tianyi_dugui', detectTianyiDugui],
  ['kuigang_ge', detectKuigangGe],
];

/** 跑全部 10 个特殊格局检测，返回汇总（键序照 shushu）。 */
function detectAllSpecialPatterns(chart) {
  const matched = [];
  const auspicious = [];
  const inauspicious = [];

  for (const [key, fn] of DETECTORS) {
    try {
      const r = fn(chart);
      if (r.matched) {
        matched.push(r);
        if (r.auspicious) auspicious.push(r);
        else inauspicious.push(r);
      }
    } catch (e) {
      // shushu 此处静默跳过；这里打 stderr 留痕（见文件头「行为差异」）
      console.error(`[bazi_patterns] 格局检测器 ${key} 抛错，已跳过 — ${e.message}`);
    }
  }

  return {
    matched,
    auspicious,
    inauspicious,
    total: matched.length,
    total_aus: auspicious.length,
    total_inaus: inauspicious.length,
  };
}

/** 给 LLM 用的中文段（3.5.4 用；本层一并移植）。 */
function formatSpecialPatternsForPrompt(result) {
  if (!result || (result.total || 0) === 0) return '';
  const lines = [`【特殊格局深度识别】（共检测出 ${result.total} 个特殊格局）`];
  if (result.auspicious && result.auspicious.length) {
    lines.push(`  ◆ 吉格 (${result.auspicious.length} 个)：`);
    for (const p of result.auspicious) {
      lines.push(`    ✦ 【${p.name}】`);
      lines.push(`       成格条件：${p.condition === undefined ? '' : p.condition}`);
      lines.push(`       含义：${p.interpretation}`);
    }
  }
  if (result.inauspicious && result.inauspicious.length) {
    lines.push(`  ◆ 凶格/破格 (${result.inauspicious.length} 个)：`);
    for (const p of result.inauspicious) {
      lines.push(`    ⚠ 【${p.name}】`);
      lines.push(`       条件：${p.condition === undefined ? '' : p.condition}`);
      lines.push(`       含义：${p.interpretation}`);
    }
  }
  return lines.join('\n');
}

module.exports = {
  detectAllSpecialPatterns,
  formatSpecialPatternsForPrompt,
  allCanggan,
  shishenPresent,
  // 10 个检测器逐一出：对拍失败要能定位到哪一个格局
  detectRiluGuishi, detectGuanyinXiangsheng, detectShishenZhisha, detectShangguanJianguan,
  detectCaiGuanYinQuanju, detectYangrenJiasha, detectZaqiYueling, detectGongluGonggui,
  detectTianyiDugui, detectKuigangGe,
  DETECTORS, LUWEI, YANGREN,
};

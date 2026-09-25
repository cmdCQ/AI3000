/**
 * paipan/bazi_combos.js —— 组合断：神煞组合 / 格局成破评断 / 岁运组合（3.5.3d）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/combos.py`（507 行），
 * 一份文件对一份文件、函数名逐字对应：
 *   `shensha_combos` :105   `evaluate_geju` :220   `analyze_suiyun` :275
 *   `bazi_combos` :329      `analyze_liunian_combo` :395   `analyze_period_combo` :452
 *
 * ── 接线在端点层，不在 analyzeChart ──
 * shushu 的 `analyze_chart` **不**挂 combos —— 是 `api/bazi.py:110` 才挂
 * `chart["combos"] = bazi_combos(chart)`。故本模块**单向** require `bazi.js`
 * （要用 `getShiShen`），`bazi.js` 不 require 本模块：既不循环依赖，也与 shushu 分层同形。
 * 接线（`chart.combos` / `ly.suiyun` / `lm.combo`）留给 3.5.4 的端点层照着 `api/bazi.py` 做。
 *
 * 零归一铁律：字段名逐字照搬（`success` 不译、`ji_count`/`xiong_count` 保留、
 * `dayun_combo` 与 `parent_combo` 是**两个不同的键**不许合并）。翻译一次就多一处永久漂移。
 *
 * ── 本文件里最容易被「顺手修好」的四处，**都不许修** ──────────────────────────
 * ① **七杀格有一条成格条件恒不命中**：`GEJU_RULES['七杀格'].cheng` 里写着
 *    `(['羊刃'], '羊刃驾杀、武贵之格')`，但 `羊刃` 是**神煞**，而 `_present_shishen`
 *    只从 `shishen_summary` 收**十神**（十神只有那十个，没有羊刃）→ 这条判定恒为假。
 *    照搬保留，并在对拍里用**全枚举**证明它一次都没进过 `cheng_hit`（不是「可能」没进）。
 *    要修是修 shushu，不是在这里把羊刃从神煞悄悄补进十神集合。
 * ② **`isinstance(strength, dict)` 分支在真实链路上不可达**：`analyze_chart` 写的是
 *    `chart["strength"] = chart["strength_info"]["strength"]`，是**字符串**；该分支纯防御。
 *    照搬保留，并在对拍里用一个 strength 为 dict 的合成样例**正面验过**
 *    （它可测 —— 不像层 12 的死分支只能证明不可达）。
 * ③ **藏干兜底 `or [""]` 不可达**：12 个地支都有藏干，`(CANGGAN.get(z) or [""])[0]` 的兜底进不去。
 *    保留原样、加注释，不删。
 * ④ **`TIANGAN_WUHE` 与 `DIZHI_WUXING` 不搬**：前者 shushu 里定义了却**全文件未使用**，
 *    后者 import 了未使用。这是**唯一**允许的「不逐字」——它不影响任何输出；
 *    理由写在这里，免得下一个人以为是漏了。
 */

'use strict';

const C = require('./constants.js');
const T = require('./bazi_tables.js');
const B = require('./bazi.js');
const { dget } = require('./bazi_yongshen.js');   // Python `dict.get(k, d)` 语义的共用垫片

const { GAN_WUXING, KE } = C;

/**
 * Python `dict[key]` 取值的等价物 —— **只在键存在时**取值。
 * JS 的 `obj[key]` 会把原型链上的 `toString`/`constructor` 当命中（Python dict 不会），
 * 本模块多处按「格局名/神煞名」这种变量查表，故统一走这里。
 */
function tget(table, key) {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

// ─────────────────────────────────────────────────────────────
// 0. 基础表（天干相克 / 地支六冲）
// ─────────────────────────────────────────────────────────────

const DIZHI_CHONG = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

/** 天干 a 克 b？（shushu `_gan_ke`；两侧都取不到五行时 `"" === ""` 为真，照搬） */
function ganKe(a, b) {
  return (dget(KE, dget(GAN_WUXING, a, ''), '') === dget(GAN_WUXING, b, ''));
}

// ─────────────────────────────────────────────────────────────
// 1. 神煞组合断
// ─────────────────────────────────────────────────────────────

/** 重叠（同一神煞 ≥2）之断。shushu `_OVERLAP_NOTE` */
const OVERLAP_NOTE = {
  华盖: { nature: '中', d: '华盖重重，孤高玄思之性愈烈，主聪慧而孤，宜艺术、宗教、玄学、独立专业，不利群处。' },
  桃花: { nature: '凶', d: '桃花重叠，情多缘杂、易招酒色风流之扰，男女皆宜守正自持。' },
  咸池: { nature: '凶', d: '咸池（桃花）重叠，多情风流、异性缘浓而杂，慎防色累。' },
  驿马: { nature: '中', d: '驿马重叠，一生奔波动荡、迁徙变动频繁，宜外出、经商、流动谋生。' },
  羊刃: { nature: '凶', d: '羊刃重叠，性刚烈、易招刑伤血光、克妻破财，须以官杀制之方吉。' },
  魁罡: { nature: '中', d: '魁罡叠见，性刚果决、聪明权重，然过刚易折，逢冲刑则祸。' },
  孤辰: { nature: '凶', d: '孤辰叠见，孤僻寡合、六亲缘薄，婚姻宜迟。' },
  寡宿: { nature: '凶', d: '寡宿叠见，孤寡之性，夫妻缘分淡薄，宜修心广交。' },
  天乙贵人: { nature: '吉', d: '天乙贵人多见，一生贵人扶持、逢凶化吉、多得提携之福。' },
  禄神: { nature: '吉', d: '禄神叠见，食禄丰厚、自立之力强，衣食无忧。' },
};

/** 两两组合（无序对）之复合断。shushu `_PAIR_COMBOS`（Python 侧是 frozenset，此处用数组） */
const PAIR_COMBOS = [
  { set: ['桃花', '驿马'], name: '桃花带马', nature: '中', d: '桃花会驿马，风流走四方、异地情缘、动中生情，主多外缘而漂泊。' },
  { set: ['咸池', '驿马'], name: '咸池带马', nature: '中', d: '咸池会驿马，多情而好动、异乡桃花，宜防情累分心。' },
  { set: ['桃花', '红艳煞'], name: '桃花红艳', nature: '凶', d: '桃花会红艳，异性缘极旺、风情万种，最易招情色是非，宜守德。' },
  { set: ['咸池', '红艳煞'], name: '咸池红艳', nature: '凶', d: '咸池会红艳，多情多欲、桃花极盛，须慎色戒淫。' },
  { set: ['华盖', '孤辰'], name: '华盖孤辰', nature: '中', d: '华盖会孤辰，孤高出尘之象，宜艺术、宗教、独行专业，六亲缘薄。' },
  { set: ['华盖', '寡宿'], name: '华盖寡宿', nature: '中', d: '华盖会寡宿，孤清自守、宜方外艺文，婚姻缘迟。' },
  { set: ['华盖', '文昌贵人'], name: '华盖文昌', nature: '吉', d: '华盖会文昌，才艺聪慧、悟性极高，利文艺、玄学、专业著述。' },
  { set: ['华盖', '学堂'], name: '华盖学堂', nature: '吉', d: '华盖会学堂，慧根深、宜钻研学问与术数，利专精之学。' },
  { set: ['文昌贵人', '学堂'], name: '文昌学堂', nature: '吉', d: '文昌会学堂，主聪颖好学、利读书科甲、功名文途顺遂。' },
  { set: ['文昌贵人', '词馆'], name: '文昌词馆', nature: '吉', d: '文昌会词馆，文采斐然、利文章著述、舌耕笔耕之业。' },
  { set: ['天乙贵人', '天德贵人'], name: '天乙天德', nature: '吉', d: '天乙会天德，福厚德深、贵人云集、一生逢凶化吉。' },
  { set: ['天乙贵人', '月德贵人'], name: '天乙月德', nature: '吉', d: '天乙会月德，仁厚多助、灾难自消、贵气绵长。' },
  { set: ['将星', '华盖'], name: '将星华盖', nature: '吉', d: '将星会华盖，文武兼资、权贵带艺，宜掌权而具才学。' },
  { set: ['将星', '驿马'], name: '将星驿马', nature: '吉', d: '将星会驿马，出将入相、外出掌权，宜远方建功、武职或外务。' },
  { set: ['将星', '桃花'], name: '将星桃花', nature: '中', d: '将星会桃花，才貌出众、领袖魅力，异性缘佳，宜防色累权。' },
  { set: ['孤辰', '寡宿'], name: '孤辰寡宿', nature: '凶', d: '孤辰会寡宿，孤独刑克、六亲冷淡、婚姻多舛，宜迟婚修性。' },
  { set: ['亡神', '劫煞'], name: '亡神劫煞', nature: '凶', d: '亡神会劫煞，主破耗失盗、暗中小人、谋事多阻，宜守财慎交。' },
  { set: ['金舆', '天乙贵人'], name: '金舆天乙', nature: '吉', d: '金舆会天乙，富贵得乘、出入有车马之贵，多得尊荣。' },
  { set: ['天罗', '地网'], name: '天罗地网', nature: '凶', d: '天罗地网齐见，主羁绊缠身、易陷官非牢狱、病灾困顿，逢冲解则吉。' },
  { set: ['禄神', '天乙贵人'], name: '禄神天乙', nature: '吉', d: '禄神会天乙，福禄双全、衣食丰足兼得贵助。' },
];

/** 从命盘已激活之神煞中，析出重叠与两两组合之复合断。 */
function shenshaCombos(chart) {
  const shensha = dget(chart, 'shensha', null) || [];
  const counts = new Map();            // Map 保插入序 = 神煞在盘中的首现序（Python dict 同）
  for (const s of shensha) {
    const nm = dget(s, 'name', '');
    counts.set(nm, (counts.get(nm) || 0) + 1);
  }
  const present = new Set(counts.keys());

  const combos = [];

  // 重叠
  for (const [name, cnt] of counts) {
    const note = tget(OVERLAP_NOTE, name);
    if (cnt >= 2 && note) {
      combos.push({
        type: '重叠', name: `${name}×${cnt}`, members: [name],
        nature: note.nature, desc: note.d,
      });
    }
  }

  // 两两组合。`sorted()` 按码位；JS `sort()` 按 UTF-16 码元 —— 常用汉字都在 BMP，两者同序。
  for (const rule of PAIR_COMBOS) {
    if (rule.set.every((x) => present.has(x))) {
      combos.push({
        type: '相会', name: rule.name, members: rule.set.slice().sort(),
        nature: rule.nature, desc: rule.d,
      });
    }
  }

  const ji = combos.filter((c) => c.nature === '吉').length;
  const xiong = combos.filter((c) => c.nature === '凶').length;
  let summary;
  if (!combos.length) {
    summary = '命中神煞无显著重叠或相会之组合，各神煞独论即可。';
  } else if (ji > xiong) {
    summary = `神煞组合以吉为主（吉${ji}·凶${xiong}），贵气、才艺、助力之象较显。`;
  } else if (xiong > ji) {
    summary = `神煞组合凶象偏多（吉${ji}·凶${xiong}），桃花孤克、破耗羁绊须留意化解。`;
  } else {
    summary = `神煞组合吉凶相参（吉${ji}·凶${xiong}），福祸互见，宜趋吉避凶。`;
  }

  return {
    success: true, combos, summary,
    ji_count: ji, xiong_count: xiong,
  };
}

// ─────────────────────────────────────────────────────────────
// 2. 格局成破评断（据本命十神有无）
// ─────────────────────────────────────────────────────────────

// 每格之成/破判据（以十神有无论；身强弱由 strength 调节）
//   key: 格名；cheng/po 为 (条件十神数组, 文字)，需全部出现方算命中
const GEJU_RULES = {
  正官格: {
    cheng: [[['正财'], '财生官、官星有根'], [['正印'], '官印相生、贵气流通']],
    po: [[['伤官'], '伤官见官、克破贵气'], [['七杀'], '官杀混杂、贵气驳浊']],
    jiu: '官杀混杂者，去杀留官（合杀/制杀）则清；伤官见官者，以印制伤护官。',
  },
  七杀格: {
    cheng: [[['食神'], '食神制杀、英雄得用'], [['正印'], '印化杀生身、化险为夷'],
      [['羊刃'], '羊刃驾杀、武贵之格']],
    po: [[['正财'], '财党杀攻身、身弱难任']],
    jiu: '杀重无制者，喜食神制之或印星化之；身弱者忌财生杀。',
  },
  正财格: {
    cheng: [[['正官'], '财生官、既富且贵'], [['食神'], '食神生财、财源不竭']],
    po: [[['比肩'], '比劫夺财、破财争利'], [['劫财'], '劫财分夺、财不归我']],
    jiu: '比劫夺财者，喜官杀制劫护财，或食伤通关化劫生财。',
  },
  偏财格: {
    cheng: [[['正官'], '财旺生官、富而能贵'], [['食神'], '食伤生财、广进财源']],
    po: [[['比肩'], '比劫争夺、众人分财'], [['劫财'], '劫财夺利、聚散无常']],
    jiu: '比劫重者，得官杀制劫则财得守。',
  },
  正印格: {
    cheng: [[['正官'], '官印相生、最为清贵'], [['七杀'], '杀印相生、化杀为权']],
    po: [[['正财'], '财星坏印、贪财坏印则贫'], [['偏财'], '财重破印、富屋贫人']],
    jiu: '财星坏印者，喜比劫制财护印；印重者反喜财损印取中和。',
  },
  偏印格: {
    cheng: [[['七杀'], '杀生偏印、有官可化反成贵'], [['偏财'], '偏财制枭、化忌为用']],
    po: [[['食神'], '枭神夺食、主孤克贫困']],
    jiu: '枭神夺食者，必得财星制枭，则食神得用反成贵格。',
  },
  食神格: {
    cheng: [[['正财'], '食神生财、聪慧富足'], [['偏财'], '食神生财、财源广进'],
      [['七杀'], '食神制杀、英雄之格']],
    po: [[['偏印'], '枭神夺食、福气受夺']],
    jiu: '枭神夺食者，喜财星制枭以护食神。',
  },
  伤官格: {
    cheng: [[['正财'], '伤官生财、财艺双收'], [['偏财'], '伤官生财、富而多能'],
      [['正印'], '伤官佩印、贵而有制']],
    po: [[['正官'], '伤官见官、为祸百端']],
    jiu: '伤官见官者，喜印制伤、或财化伤生官以转祸为福。',
  },
  建禄格: {
    cheng: [[['正官'], '禄逢官护、贵显'], [['正财'], '禄透财、富足'],
      [['七杀'], '禄逢杀制、威权'], [['食神'], '禄逢食泄秀、聪秀']],
    po: [],
    jiu: '建禄无财官食伤透泄者，平常之命；最忌印重身旺无泄。',
  },
  月刃格: {
    cheng: [[['七杀'], '羊刃驾杀、武贵'], [['正官'], '刃逢官制、贵显']],
    po: [[['伤官'], '刃逢伤官、刚暴易祸']],
    jiu: '月刃喜官杀制刃，最忌刃旺无制、再行刃运则祸。',
  },
};

/** 命盘上出现过的十神集合。**只从 shishen_summary 收** —— 神煞不在此列（见文件头 ①）。 */
function presentShishen(chart) {
  const out = new Set();
  for (const s of (dget(chart, 'shishen_summary', null) || [])) {
    const nm = dget(s, 'shishen', '');
    if (nm) out.add(nm);
  }
  return out;
}

/** 据本命十神有无，评本格已成/已破/破而有救。 */
function evaluateGeju(chart) {
  const pattern = dget(chart, 'pattern', '');
  const rules = tget(GEJU_RULES, pattern);
  let strength = dget(chart, 'strength', '');
  if (strength !== null && typeof strength === 'object') {
    strength = dget(strength, 'label', '');     // 见文件头 ②：真实链路上不可达的防御分支
  }
  const present = presentShishen(chart);

  if (!rules) {
    // 专旺/化气/从格等特殊格：从 geju_cheng_bai / pattern_desc 取概述
    return {
      available: false, pattern,
      verdict: `【${pattern}】属专旺/化气/从格之类，以顺其旺神之势为用，`
        + '忌逆其气；详参格局总论与调候。',
    };
  }

  const chengHit = [];
  for (const [need, txt] of rules.cheng) {
    if (need.every((x) => present.has(x)) && !chengHit.includes(txt)) chengHit.push(txt);
  }
  const poHit = [];
  for (const [need, txt] of rules.po) {
    if (need.every((x) => present.has(x)) && !poHit.includes(txt)) poHit.push(txt);
  }

  let status, q, verdict;
  if (chengHit.length && !poHit.length) {
    status = '格成'; q = '吉';
    verdict = `【${pattern}】已成——${chengHit.join('；')}。`
      + `${strength ? '身' + strength + '，' : ''}格局清纯，主富贵可期。`;
  } else if (poHit.length && chengHit.length) {
    status = '破而有救'; q = '中';
    verdict = `【${pattern}】见破（${poHit.join('；')}），`
      + `幸有救应（${chengHit.join('；')}）——${rules.jiu}`
      + '破中有救，先抑后扬。';
  } else if (poHit.length) {
    status = '格破'; q = '凶';
    verdict = `【${pattern}】已破——${poHit.join('；')}，`
      + `本命未见救应之神。救法：${rules.jiu}须赖大运补救。`;
  } else {
    status = '格局未显'; q = '平';
    verdict = `【${pattern}】成格之神未透显，格局未充——平常之造，待运引发。`
      + `成法：${rules.cheng.slice(0, 2).map((x) => x[1]).join('；')}。`;
  }

  return {
    available: true, pattern, status, quality: q,
    cheng_hit: chengHit, po_hit: poHit, jiu: rules.jiu,
    strength, verdict,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. 岁运组合断（大运 × 流年）
// ─────────────────────────────────────────────────────────────

/** 大运 × 流年 之岁运组合断。 */
function analyzeSuiyun(chart, dayunGan, dayunZhi, liunianGan, liunianZhi) {
  const tags = [];
  const notes = [];

  const dy = `${dayunGan}${dayunZhi}`;
  const ln = `${liunianGan}${liunianZhi}`;

  // 岁运并临
  if (dy === ln) {
    tags.push('岁运并临');
    notes.push(`大运与流年同为【${dy}】——岁运并临。古云『岁运并临，灾殃立至』，`
      + '主该年变动至大；若临喜用则大吉大利，临忌神则祸咎尤重。');
  }

  // 岁运天克地冲（相战）
  const ganChong = ganKe(dayunGan, liunianGan) || ganKe(liunianGan, dayunGan);
  const zhiChong = dget(DIZHI_CHONG, dayunZhi, undefined) === liunianZhi;
  if (ganChong && zhiChong) {
    tags.push('岁运相战(天克地冲)');
    notes.push(`大运【${dy}】与流年【${ln}】天克地冲——岁运相战，`
      + '主该年反复颠覆、动荡不宁、内外交迫，诸事宜守不宜进。');
  } else if (zhiChong) {
    tags.push('岁运地支相冲');
    notes.push(`大运${dayunZhi}与流年${liunianZhi}相冲，主动象、迁移变动、宜防冲处之事生变。`);
  }

  // 引动命局（大运/流年地支 冲 命局四柱地支）—— 键序即输出序，勿动
  const chartZhis = {
    年支: dget(dget(chart, 'year_pillar', {}) || {}, 'dizhi', ''),
    月支: dget(dget(chart, 'month_pillar', {}) || {}, 'dizhi', ''),
    日支: dget(dget(chart, 'day_pillar', {}) || {}, 'dizhi', ''),
    时支: dget(dget(chart, 'hour_pillar', {}) || {}, 'dizhi', ''),
  };
  for (const [srcLabel, srcZhi] of [['流年', liunianZhi], ['大运', dayunZhi]]) {
    for (const [pos, cz] of Object.entries(chartZhis)) {
      if (cz && dget(DIZHI_CHONG, srcZhi, undefined) === cz) {
        const what = pos === '日支' ? '婚姻情感/健康'
          : pos === '月支' ? '事业根基'
            : pos === '年支' ? '长辈祖业' : '子女晚景';
        notes.push(`${srcLabel}${srcZhi}冲命局${pos}（${cz}），引动${pos}之事——${what}有动。`);
      }
    }
  }

  if (!tags.length && notes.length <= 0) {
    tags.push('岁运平和');
    notes.push(`大运【${dy}】流年【${ln}】无并临相战之险，岁运相安，运势平稳。`);
  }

  return {
    success: true, dayun: dy, liunian: ln,
    tags, notes,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. 顶层综合
// ─────────────────────────────────────────────────────────────

/** 命局层之组合综合：神煞组合 + 格局成破评断。 */
function baziCombos(chart) {
  return {
    success: true,
    shensha_combos: shenshaCombos(chart),
    geju_evaluation: evaluateGeju(chart),
  };
}

// ─────────────────────────────────────────────────────────────
// 5. 流年逐年组合断（完整十神 + 喜忌 + 应事 + 大运×流年组合）
// ─────────────────────────────────────────────────────────────

/** 十神 → 应事主题 */
const SHISHEN_THEME = {
  正财: '求财置业、稳定收入，男命主妻缘、父事',
  偏财: '投机横财、外快机遇，男命主异性缘、父事',
  正官: '升迁考公、责任名位，女命主婚姻夫星，亦防官非',
  七杀: '压力竞争、变动魄力，女命主情缘，亦防是非病灾',
  正印: '文书学业、贵人母事、房产合同、名声护身',
  偏印: '偏门学术、思虑孤高、宗教玄学，亦主继母',
  食神: '子女口福、才艺投资、悠然进财',
  伤官: '表现创作、外出生变、口舌才秀，逢官则防官非',
  比肩: '兄弟同辈、合作自立、竞争分立',
  劫财: '破耗争夺、合伙不利，男命防克妻破财',
};

const BANG = new Set(['正印', '偏印', '比肩', '劫财']);            // 帮身（生扶）
const XIE = new Set(['正财', '偏财', '正官', '七杀', '食神', '伤官']);  // 耗身（克泄耗）

/** 流年十神之喜忌：身强喜耗、身弱喜帮、中和以调候用神五行论。 */
function liunianXiji(shishen, strengthLabel, liunianWx, xiyongWx) {
  const s = strengthLabel || '';
  if (s.includes('强') || s.includes('旺')) return XIE.has(shishen) ? '喜' : '忌';
  if (s.includes('弱')) return BANG.has(shishen) ? '喜' : '忌';
  // 中和：流年五行合调候用神则喜
  if (xiyongWx && liunianWx === xiyongWx) return '喜';
  return '平';
}

/** 大运 × 流年 十神组合典型 */
function dyLnCombo(dySs, lnSs, parentLabel = '大运') {
  const fin = new Set(['正财', '偏财']);
  const off = new Set(['正官', '七杀']);
  const seal = new Set(['正印', '偏印']);
  const out = new Set(['食神', '伤官']);
  const rob = new Set(['比肩', '劫财']);
  if (fin.has(dySs) && off.has(lnSs)) {
    return `${parentLabel}财运逢本期官杀——财生官旺，宜借财力求名位、财禄双美（身能任则吉）。`;
  }
  if ((off.has(dySs) && seal.has(lnSs)) || (seal.has(dySs) && off.has(lnSs))) {
    return '官印相生——升迁、文书、考核、贵人之喜，名位有进。';
  }
  if (out.has(dySs) && fin.has(lnSs)) {
    return '食伤生财——才艺、表现化为财源，财路活络、宜进取经营。';
  }
  if (rob.has(dySs) && fin.has(lnSs)) {
    return '比劫夺财——破财、合伙争利、为人作保宜慎，财去人安。';
  }
  if ((fin.has(dySs) && seal.has(lnSs)) || (seal.has(dySs) && fin.has(lnSs))) {
    return '财印交争——重财则伤文书学业、重学则碍财利，须权衡取舍。';
  }
  if (out.has(dySs) && off.has(lnSs)) {
    return '伤官见官——易招是非官非、与上司长辈相忤，言行宜收敛。';
  }
  return '';
}

/** 单个流年之逐年组合断（完整十神 + 喜忌 + 应事 + 大运组合）。 */
function analyzeLiunianCombo(chart, dayunGan, dayunZhi, liunianGan, liunianZhi) {
  const dm = dget(chart, 'day_master', '');
  let strength = dget(chart, 'strength', '');
  if (strength !== null && typeof strength === 'object') {
    strength = dget(strength, 'label', '');
  }
  const tiaohou = dget(chart, 'tiaohou', null) || {};
  const xiyongGan = dget(tiaohou, 'primary', '');
  const xiyongWx = dget(GAN_WUXING, xiyongGan, '');

  // 流年完整十神（天干 + 地支本气）。`or [""]` 的兜底在 12 支全有藏干时不可达（见文件头 ③）
  const lnGanSs = B.getShiShen(dm, liunianGan);
  const lnZhiHidden = (dget(T.CANGGAN, liunianZhi, null) || [''])[0];
  const lnZhiSs = lnZhiHidden ? B.getShiShen(dm, lnZhiHidden) : '';
  const lnWx = dget(GAN_WUXING, liunianGan, '');

  // 喜忌
  const xiji = liunianXiji(lnGanSs, strength, lnWx, xiyongWx);

  // 应事主题（天干十神主，地支辅）
  const themes = [];
  if (tget(SHISHEN_THEME, lnGanSs) !== undefined) {
    themes.push(`${lnGanSs}：${SHISHEN_THEME[lnGanSs]}`);
  }
  if (lnZhiSs && lnZhiSs !== lnGanSs && tget(SHISHEN_THEME, lnZhiSs) !== undefined) {
    themes.push(`${lnZhiSs}（藏）：${SHISHEN_THEME[lnZhiSs]}`);
  }

  // 大运 × 流年组合
  const dyGanSs = B.getShiShen(dm, dayunGan);
  const comboNote = dyLnCombo(dyGanSs, lnGanSs);

  // 吉凶结论
  let verdict, quality;
  if (xiji === '喜') {
    verdict = `${liunianGan}${liunianZhi}年，流年${lnGanSs}为喜用——主吉，所主之事顺遂可进。`;
    quality = '吉';
  } else if (xiji === '忌') {
    verdict = `${liunianGan}${liunianZhi}年，流年${lnGanSs}为忌神——主阻，所主之事多耗费波折，宜守。`;
    quality = '凶';
  } else {
    verdict = `${liunianGan}${liunianZhi}年，流年${lnGanSs}力量中平——吉凶随事而分，平稳之年。`;
    quality = '平';
  }

  return {
    success: true,
    ganzhi: `${liunianGan}${liunianZhi}`,
    shishen_gan: lnGanSs, shishen_zhi: lnZhiSs,
    xiji, quality,
    themes,
    dayun_combo: comboNote,
    verdict: verdict + (comboNote ? ('　' + comboNote) : ''),
  };
}

/**
 * 通用逐期组合断（流月/流日/流时，与流年同深度）：
 * 完整十神 + 喜忌 + 应事 + 上期×本期十神组合。
 * parent = 上一级周期（流月之上为流年、流日之上为流月）。
 *
 * ⚠ `parent_gan` 允许为空/None：`api/bazi.py:295` 在找不到上一级时就传 `pd_gan = None`，
 *   此时走 `if parent_gan else ""` 那条路（`parent_combo` 为空串）。是活分支，不是兜底。
 */
function analyzePeriodCombo(chart, parentGan, parentZhi, curGan, curZhi,
  label = '流月', parentLabel = '流年') {
  const dm = dget(chart, 'day_master', '');
  let strength = dget(chart, 'strength', '');
  if (strength !== null && typeof strength === 'object') {
    strength = dget(strength, 'label', '');
  }
  const tiaohou = dget(chart, 'tiaohou', null) || {};
  const xiyongWx = dget(GAN_WUXING, dget(tiaohou, 'primary', ''), '');

  const curGanSs = B.getShiShen(dm, curGan);
  const curZhiHidden = (dget(T.CANGGAN, curZhi, null) || [''])[0];
  const curZhiSs = curZhiHidden ? B.getShiShen(dm, curZhiHidden) : '';
  const curWx = dget(GAN_WUXING, curGan, '');

  const xiji = liunianXiji(curGanSs, strength, curWx, xiyongWx);

  const themes = [];
  if (tget(SHISHEN_THEME, curGanSs) !== undefined) {
    themes.push(`${curGanSs}：${SHISHEN_THEME[curGanSs]}`);
  }
  if (curZhiSs && curZhiSs !== curGanSs && tget(SHISHEN_THEME, curZhiSs) !== undefined) {
    themes.push(`${curZhiSs}（藏）：${SHISHEN_THEME[curZhiSs]}`);
  }

  const parentSs = parentGan ? B.getShiShen(dm, parentGan) : '';
  const comboNote = parentSs ? dyLnCombo(parentSs, curGanSs, parentLabel) : '';

  let verdict, quality;
  if (xiji === '喜') {
    verdict = `${curGan}${curZhi}${label}，${curGanSs}为喜用——主吉，所主之事顺遂可进。`;
    quality = '吉';
  } else if (xiji === '忌') {
    verdict = `${curGan}${curZhi}${label}，${curGanSs}为忌神——主阻，所主之事多耗费波折，宜守。`;
    quality = '凶';
  } else {
    verdict = `${curGan}${curZhi}${label}，${curGanSs}力量中平——吉凶随事而分，平稳之期。`;
    quality = '平';
  }

  return {
    success: true,
    label,
    ganzhi: `${curGan}${curZhi}`,
    shishen_gan: curGanSs, shishen_zhi: curZhiSs,
    xiji, quality,
    themes,
    parent_combo: comboNote,
    verdict: verdict + (comboNote ? ('　' + comboNote) : ''),
  };
}

module.exports = {
  shenshaCombos, evaluateGeju, analyzeSuiyun, baziCombos,
  analyzeLiunianCombo, analyzePeriodCombo,
  ganKe, tget,   // 供对拍/诊断按同一实现复算
  OVERLAP_NOTE, PAIR_COMBOS, GEJU_RULES, SHISHEN_THEME, BANG, XIE, DIZHI_CHONG,
};

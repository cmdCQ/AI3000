/**
 * paipan/bazi_applications.js —— 八字应用层：事业 / 婚姻 / 健康 / 财运（3.5.4a）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/applications.py`（264 行），
 * 一份文件对一份文件、函数一对一（JS 侧按本仓库惯例 camelCase，下表给出对应）：
 *   `_dm` :24            → dm            `_dm_wx` :29         → dmWx
 *   `_find_shishen` :33  → findShishen   `_wuxing_count` :45  → wuxingCount
 *   `career_analysis` :83  → careerAnalysis      `marriage_analysis` :126 → marriageAnalysis
 *   `health_analysis` :192 → healthAnalysis      `wealth_analysis` :231   → wealthAnalysis
 *
 * ── 这个模块是「五个方面」结构化数据的老家 ──
 * 端点层 `api/bazi.py:127-145` 调这四个函数装出 `chart.life_aspects`，
 * 键名 `career` / `wealth` / `marriage` / `health`（**没有** `general`——「综合」
 * 那个 tab 在 shushu 里就是不给专项数据，AI 只看全盘）。prompt 层
 * `api/agent.py:1477` 用 `TAB_TO_ASPECT` 把中文 tab 名映射到这个键名。
 *
 * 表名映射（shushu 名 → 本项目名，**值**逐字相同，只是键名不同）：
 *   TIANGAN_WUXING → constants.GAN_WUXING      WUXING_SHENG → constants.SHENG
 *   WUXING_KE      → constants.KE              LIUCHONG → constants.LIU_CHONG
 *   LIUHE          → constants.LIU_HE          CANGGAN  → bazi_tables.CANGGAN
 * 零归一铁律：**输出字段名逐字照搬**（`topic`、`dm_organ`、`wx_distribution`、
 * `clash_present` 都不译），翻译一次就多一处永久漂移。
 *
 * ── 四处「看着像 bug，但不许修」──────────────────────────────────────────────
 * ① `healthAnalysis` 算出的 `strongest` **没有进返回值**——纯死代码，零输出影响。
 *    保留（注释标出），因为「哪支轴没用上」是要能一眼看出来的信息。
 * ② **`strength` 的空串必须原样保留，不许用 `||` 兜默认值。**
 *    Python 是 `chart.get("strength", "中和")` —— `dict.get` 只在**键不存在**时给默认值；
 *    键存在而值为 `""` 时返回的就是 `""`，于是 `strength == "身强"` 为假、走 else 分支，
 *    返回值里的 `"strength"` 也是 `""`。JS 里写 `chart.strength || '中和'` 会把它
 *    悄悄换成「中和」，**输出的 `strength` 字段当场就漂了**。故本文件一律用
 *    `pyGet`（只在键不存在时兜默认），不用 `||`。空串这一支由金标准的 `field` 族专门验。
 * ③ `careerAnalysis` 身强分支的 `KE[dmWx]` 与 `SHENG[dmWx]` 是**直取**，Python 里会
 *    KeyError，而 `api/bazi.py` 用 try/except 把它变成「career 整块消失」。
 *    JS 里同名直取只会得 `undefined`。**这是不可达差异**（dmWx 必是五行之一），
 *    不补异常——补了就多一处与基准不同的行为。
 * ④ 「身弱分支的 `KE.get(KE.get(dm_wx,''),'')` 可能得空串」——**实测不可达**：
 *    `KE` 在五行上是全函数，两层 `.get` 各自都能命中，故 `luckyWx[0]` 永不空。
 *    写在这里是为了**阻止以后有人照着 Python 的 `.get` 外形去补一个不存在的空串分支**。
 *
 * ── 一处「照做但不可达」的忠实移植：`pyStr` ──
 * `careerAnalysis` 把 `strength` 插进白话句子里，基准走的是 Python `str()`。非字符串上
 * 两者不同（`None`→`"None"` vs `"null"`；dict→`"{'label': '身强'}"` vs `"[object Object]"`）。
 * 这些形态真实链路不可达（`analyze_chart` 恒给三个中文串之一），但为「逐字不漂」仍照做。
 * 对拍曾因此报 7920 例（全在 `*.career.analysis`）。见 `pyRepr` 的说明。
 *
 * ── 键序是有语义的，不许「顺手重排」────────────────────────────────────────
 * `wuxingCount` 的返回字典**固定以 木火土金水 起手**，而 `healthAnalysis` 用
 * `min` / `max` 取极值——Python 的 `min` 在并列时取**迭代序里第一个**。
 * 所以键序决定「五行同数时报哪一行」，必须与基准逐字一致。本文件用
 * `WX_ORDER` 数组把这个顺序**显式钉住**，不依赖对象属性序。
 *
 * 用法：`require('./bazi_applications.js')`，四个函数都吃 `chart`（键名同
 * shushu 的 `analyze_chart` 产物：`day_master` / `strength` / `shishen_summary` /
 * `{year,month,day,hour}_pillar{tiangan,dizhi,canggan}`）。
 *
 * 对拍：`duipan/gen_golden_bazi_applications.py`（34349 例 / 四家族）。
 */
'use strict';

const C = require('./constants.js');

/** 五行固定序 —— `wuxingCount` 的建字典顺序（applications.py:48）。不许改。 */
const WX_ORDER = ['木', '火', '土', '金', '水'];

/**
 * `pyGet` / `pyStr` / `pyRepr` 已抽到 `pycompat.js`（唯一真源，供各移植模块共用）。
 * 本文件仍**原样再导出**它们 —— 现有的对拍/诊断脚本按旧路径取用，改路径没有收益，
 * 只会让「为什么这层红了」多一种解释。
 */
const { pyGet, pyStr, pyRepr } = require('./pycompat.js');

// ─────────────────────────────────────────────────────────────
// Internal helpers（applications.py 同名函数一对一对上）
// ─────────────────────────────────────────────────────────────

/** applications.py:24 `_dm` —— 日主天干。直取，缺失即 undefined（基准里是 KeyError）。 */
function dm(chart) {
  return chart.day_master;
}

/** applications.py:29 `_dm_wx` —— 日主五行。 */
function dmWx(chart) {
  return C.GAN_WUXING[dm(chart)];
}

/** applications.py:33 `_find_shishen` —— 取某十神名下**首个**匹配项的 `stems`。 */
function findShishen(chart, targetSs) {
  const summary = pyGet(chart, 'shishen_summary', []);
  for (const entry of summary) {
    if (entry.shishen === targetSs) return pyGet(entry, 'stems', []);
  }
  return [];
}

/** applications.py:45 `_wuxing_count` —— 四柱天干 + 藏干的五行计数（固定五键序）。 */
function wuxingCount(chart) {
  const counts = {};
  for (const wx of WX_ORDER) counts[wx] = 0;
  for (const pk of ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar']) {
    const p = chart[pk];
    const wx = C.GAN_WUXING[p.tiangan];
    if (wx) counts[wx] += 1;
    for (const h of pyGet(p, 'canggan', [])) {
      const wxH = C.GAN_WUXING[h];
      if (wxH) counts[wxH] += 1;
    }
  }
  return counts;
}

/** Python `min(d, key=d.get)` 语义：并列取**迭代序第一个**（此处即 WX_ORDER 序）。 */
function minByCount(counts) {
  let best = WX_ORDER[0];
  for (const wx of WX_ORDER) if (counts[wx] < counts[best]) best = wx;
  return best;
}

/** Python `max(d, key=d.get)` 语义：并列取迭代序第一个。 */
function maxByCount(counts) {
  let best = WX_ORDER[0];
  for (const wx of WX_ORDER) if (counts[wx] > counts[best]) best = wx;
  return best;
}

// ─────────────────────────────────────────────────────────────
// 事业（applications.py:63-119）
// ─────────────────────────────────────────────────────────────

/** applications.py:63 `_CAREER_BY_WX` —— 逐字照搬（含全角括号「医疗（中医）」）。 */
const CAREER_BY_WX = {
  木: ['教育', '文化传媒', '园林绿化', '家具木材', '医疗（中医）'],
  火: ['IT科技', '餐饮', '能源', '金融投资', '娱乐表演'],
  土: ['地产建筑', '农业', '矿产', '物流仓储', '政府机关'],
  金: ['金融银行', '冶金机械', '法律', '军警', '珠宝'],
  水: ['贸易流通', '运输航运', '传媒通讯', '旅游', '饮品'],
};

/** applications.py:71 `_CAREER_BY_SHISHEN` —— 只有 8 个十神有词条（无比肩/劫财）。 */
const CAREER_BY_SHISHEN = {
  正官: '适合官场、管理职位，以德服人，仕途顺遂',
  七杀: '适合军警、律法、竞技，权威气场强',
  正财: '适合稳健行业，财务、会计、银行，踏实积累',
  偏财: '适合商贸、投资、销售，善于把握机遇',
  食神: '适合创意、餐饮、艺术，生活品质高',
  伤官: '适合科技、创新、表演，才华横溢但需磨砺',
  正印: '适合学术、教育、文化，贵人相助',
  偏印: '适合偏门技艺、宗教、玄学，独辟蹊径',
};

/** applications.py:83 `career_analysis`。 */
function careerAnalysis(chart) {
  const wx = dmWx(chart);
  const strength = pyGet(chart, 'strength', '中和');

  // 吉利行业五行：身强喜克泄，身弱喜生扶
  let luckyWx;
  if (strength === '身强') {
    luckyWx = [C.KE[wx], C.SHENG[wx]];                          // ← 直取，见文件头 ③
  } else {
    luckyWx = [pyGet(C.KE, pyGet(C.KE, wx, ''), ''), wx];        // 照 Python 的两层 .get（见文件头 ④）
  }

  const careers = [];
  for (const w of luckyWx) {
    careers.push(...pyGet(CAREER_BY_WX, w, []));
  }

  // 取十神汇总里的前两条（Python 切片 [:2]，顺序为 count 降序，见 bazi.js summarizeShiShen）
  const topShishenEntries = pyGet(chart, 'shishen_summary', []).slice(0, 2);
  const ssAdvice = [];
  for (const entry of topShishenEntries) {
    const ss = pyGet(entry, 'shishen', '');
    if (Object.prototype.hasOwnProperty.call(CAREER_BY_SHISHEN, ss)) {
      ssAdvice.push(CAREER_BY_SHISHEN[ss]);
    }
  }

  // `list(dict.fromkeys(careers))[:6]` —— 去重保序取前 6
  const careerFields = [...new Set(careers)].slice(0, 6);

  return {
    topic: '事业',
    day_master: dm(chart),
    day_master_wx: wx,
    strength: strength,
    lucky_wuxing: luckyWx,
    career_fields: careerFields,
    shishen_advice: ssAdvice,
    analysis: `日主${dm(chart)}，五行属${wx}，${pyStr(strength)}。`
      + `宜从事${luckyWx.length ? luckyWx[0] : ''}行业，`
      + (ssAdvice.length ? ssAdvice[0] : '多元发展') + '。',
  };
}

// ─────────────────────────────────────────────────────────────
// 婚姻（applications.py:126-176）
// ─────────────────────────────────────────────────────────────

/**
 * applications.py:126 `marriage_analysis`。
 * 配偶星：男看正财/偏财，女看正官/七杀；日支为配偶宫。
 *
 * ⚠ 冲与合的**判据不对称**，照搬不许「统一」：
 *   冲 —— 年/月/时**三柱**逐柱比对（`any(... for pk in (year, month, hour))`）
 *   合 —— 只比**年支与时支**（`harmony in (year_zhi, hour_zhi)`），月支的合**不算**
 * 金标准的 `pos` 族备了「月支放合支」的负例专门盯这一条。
 */
function marriageAnalysis(chart, gender) {
  const male = gender === 'male' || gender === '男';
  const spouseSsMain = male ? '正财' : '正官';
  const spouseSsAlt = male ? '偏财' : '七杀';

  const spouseStemsMain = findShishen(chart, spouseSsMain);
  const spouseStemsAlt = findShishen(chart, spouseSsAlt);

  const spousePalace = chart.day_pillar.dizhi;

  // 配偶宫被冲？（Python: 先取冲支，再 only-if 该支非空地比对三柱）
  const clashedBy = pyGet(C.LIU_CHONG, spousePalace, '');
  const clashPresent = clashedBy
    ? ['year_pillar', 'month_pillar', 'hour_pillar'].some((pk) => chart[pk].dizhi === clashedBy)
    : false;

  const yearZhi = chart.year_pillar.dizhi;
  const hourZhi = chart.hour_pillar.dizhi;
  const harmony = pyGet(C.LIU_HE, spousePalace, '');
  const harmonyPresent = harmony === yearZhi || harmony === hourZhi;

  let marriageQuality;
  if (clashPresent) {
    marriageQuality = '日支受冲，婚姻易有波折，需多包容沟通';
  } else if (harmonyPresent) {
    marriageQuality = '日支六合，婚姻和谐，伴侣关系稳定';
  } else if (spouseStemsMain.length) {
    marriageQuality = `命中有${spouseSsMain}，婚缘较好，感情稳定`;
  } else {
    marriageQuality = '婚姻宫平稳，感情需缘分际合';
  }

  const wx = dmWx(chart);
  return {
    topic: '婚姻',
    spouse_palace: spousePalace,
    spouse_stars: spouseStemsMain.concat(spouseStemsAlt),
    clash_present: clashPresent,
    harmony_present: harmonyPresent,
    quality: marriageQuality,
    analysis: marriageQuality,
    advice: [
      clashPresent ? '注重沟通与包容' : '珍惜眼前缘分',
      `配偶五行宜属${(wx === '木' || wx === '火') ? '金水' : '木火'}`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 健康（applications.py:183-224）
// ─────────────────────────────────────────────────────────────

/** applications.py:183 `_WUXING_ORGANS` —— 逐字照搬。 */
const WUXING_ORGANS = {
  木: { organ: '肝胆', condition: '情绪急躁，易肝郁气滞', advice: '保持情绪舒畅，忌酸辣刺激' },
  火: { organ: '心脑', condition: '心脑血管、睡眠', advice: '避免过度劳神，忌辛热食物' },
  土: { organ: '脾胃', condition: '消化系统', advice: '规律饮食，忌生冷' },
  金: { organ: '肺大肠', condition: '呼吸系统', advice: '注意防寒，忌辛辣' },
  水: { organ: '肾膀胱', condition: '泌尿生殖', advice: '注意保暖，忌过劳' },
};

/** applications.py:192 `health_analysis`。 */
function healthAnalysis(chart) {
  const wx = dmWx(chart);
  const wxCount = wuxingCount(chart);

  const weakest = minByCount(wxCount);
  // ⚠ 死代码：`strongest` 在 Python 里算了但不进返回值。照搬（见文件头 ①）。
  const strongest = maxByCount(wxCount);
  void strongest;

  const weakInfo = pyGet(WUXING_ORGANS, weakest, {});
  const dmInfo = pyGet(WUXING_ORGANS, wx, {});

  return {
    topic: '健康',
    day_master_wx: wx,
    dm_organ: pyGet(dmInfo, 'organ', ''),
    dm_condition: pyGet(dmInfo, 'condition', ''),
    weak_element: weakest,
    weak_organ: pyGet(weakInfo, 'organ', ''),
    wx_distribution: wxCount,
    analysis:
      `命局五行中${weakest}气最弱，需注意${pyGet(weakInfo, 'organ', '')}相关健康。`
      + `日主${dm(chart)}属${wx}，${pyGet(dmInfo, 'condition', '')}需特别关注。`,
    advice: [
      pyGet(weakInfo, 'advice', ''),
      pyGet(dmInfo, 'advice', ''),
      '保持规律作息，适量运动',
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 财运（applications.py:231-264）
// ─────────────────────────────────────────────────────────────

/** applications.py:231 `wealth_analysis`。 */
function wealthAnalysis(chart) {
  const wx = dmWx(chart);
  const strength = pyGet(chart, 'strength', '中和');

  const wealthWx = pyGet(C.KE, wx, '');
  const wealthStems = findShishen(chart, '正财').concat(findShishen(chart, '偏财'));

  let level;
  let desc;
  if (strength === '身强' && wealthStems.length >= 2) {
    level = '财运丰厚';
    desc = '身强财多，财富积累能力强，适合主动经营';
  } else if (strength === '身强' && wealthStems.length === 1) {
    level = '财运稳健';
    desc = '身强有财，收入稳定，适合稳中求进';
  } else if (strength === '身弱' && wealthStems.length >= 2) {
    level = '财来财去';
    desc = '身弱财重，财富难以守住，需借助贵人';
  } else {
    level = '财运平稳';
    desc = '财星适中，量力而行，稳健理财为上';
  }

  return {
    topic: '财运',
    level: level,
    wealth_wx: wealthWx,
    wealth_stems: wealthStems,
    analysis: desc,
    advice: [
      `财星五行属${wealthWx}，宜从事相关行业`,
      '正财为主，偏财为辅，稳健优先',
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 装配：四个函数 → life_aspects（照 api/bazi.py:127-145）
// ─────────────────────────────────────────────────────────────

/**
 * 照 `api/bazi.py:127-145` 装 `life_aspects`。
 *
 * ── 这里与基准有一处**刻意的不同**，必须记着 ──
 * 基准是**逐函数 try/except**：任何一个函数抛异常，那个键**静默消失**，
 * 其余照装（`api/bazi.py:134-141` 各自 catch 后 `log_failure`）。
 * JS 侧没有等价的异常面（文件头 ③ 那处不可达差异已说明），所以这里**不包 try/except**——
 * 包了反而会把真实 bug 吞成「少一个键」，正是「没红」那种失败。
 * 若哪天 JS 侧真抛了，应当**炸出来**，而不是安静地少一块。
 *
 * 键序与基准一致：career → wealth → health → marriage（marriage 排最后，
 * 因为它比别人多一个 gender 参数）。
 */
function buildLifeAspects(chart, gender) {
  return {
    career: careerAnalysis(chart),
    wealth: wealthAnalysis(chart),
    health: healthAnalysis(chart),
    marriage: marriageAnalysis(chart, gender),
  };
}

module.exports = {
  pyGet, pyStr, pyRepr,
  dm, dmWx, findShishen, wuxingCount, minByCount, maxByCount,
  CAREER_BY_WX, CAREER_BY_SHISHEN, WUXING_ORGANS, WX_ORDER,
  careerAnalysis, marriageAnalysis, healthAnalysis, wealthAnalysis,
  buildLifeAspects,
};

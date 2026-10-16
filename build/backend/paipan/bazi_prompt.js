/**
 * paipan/bazi_prompt.js —— 八字排盘 → AI 提示词（变量表 + 默认模板）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`api/agent.py::_build_interpret_prompt`
 * 的 **bazi 支**（`:1410-1593`）。这一支在 ai3000 原来**不存在**
 * （`/api/chat/send` 对 `cardType:'chart'` 只回一句「命盘解析功能即将上线」）。
 *
 * ── 形态：变量表 + 模板（用户 2026-09-25 拍板）──
 * `baziVars(chart, {tab, question, ragText})` 只出**变量表**，正文由模板渲染。
 * 默认模板 `DEFAULT_BAZI_PROMPT` **逐字复刻基准那一份最终字符串** ——
 * 于是「渲染默认模板」的结果仍可与 shushu **逐字对拍**（层 16 就是这么验的）。
 * 后台若在 `data/prompts.json` 里改了 `bazi_prompt`，渲染结果就与基准不同了，
 * 那时对拍只覆盖变量表（模板属用户可改的内容，不在「忠实移植」的范围内）。
 *
 * ── 与 `prompt.js`（六爻/梅花）的关系 ──
 * 同一个角色、同一套约定：**本文件不做 I/O**（不读 `data/prompts.json`，读写在
 * auth-server），只出变量表与默认模板；`renderPrompt` 是**全站唯一**的模板渲染器
 * （auth-server 从这里的取，别在那边再写一份 —— 两套渲染必然漂移）。
 * 单独一个文件而不并进 `prompt.js`：六爻/梅花那份已全绿且线上在用，
 * 八字这条链要 require 十来个模块，混进去会让「改六爻」与「改八字」互相牵连。
 *
 * ── 变量表**只放基准里真有的东西** ──
 * 没加任何「顺手方便一下模板作者」的新变量。理由：变量表要进对拍，
 * 自造的变量没有金标准可比，只能由被验方自己定义契约 —— 那正是
 * `duipan/README.md` 里反复警告的「让被验方定义契约」。要加新变量，
 * 先想清楚它跟哪一段基准语义对应。
 *
 * 对拍：`duipan/gen_golden_bazi_prompt.py`（家族 `pv`）。
 */
'use strict';

const {
  pyGet, pyTruthy, pyOr, pyStr, pyAddStr, pyIndexSlice, pyLen, pyStrJoin,
  pyDictGet, pyTypeName,
} = require('./pycompat.js');
const AR = require('./bazi_relations.js');
const AP = require('./bazi_patterns.js');
const CB = require('./bazi_combos.js');
// 古籍三表（穷通宝鉴调候 / 滴天髓十干 / 子平真诠十三格）+ 两张深度语料表。
// ⚠ 调候表在这里取的是 **`TIAOHOU_CLASSICAL`（描述串表）**，不是 `TIAOHOU_STRUCT`
//   —— 基准 `api/agent.py:1506` 引的就是 `knowledge.bazi_classical.TIAO_HOU_TABLE`。
//   两张调候表不是同一张、也各管一段（见 `gen_bazi_tables.py` 的长注）。
const T = require('./bazi_tables.js');

/** 页内五个方面 → `life_aspects` 里的键。只有前四个有专项数据，「综合」没有。 */
const TAB_TO_ASPECT = { '事业': 'career', '财运': 'wealth', '婚姻': 'marriage', '健康': 'health' };

/** 基准 `j()` 的截断长度。⚠ 见下面 `jsonBlock` 的注释（它会把**最后**几段切掉）。 */
const J_MAXLEN = 2000;

// ══════════════════════════════════════════════════════════════════
// Python `json.dumps(..., ensure_ascii=False, indent=2)` 的等价实现
// ══════════════════════════════════════════════════════════════════
//
// 为什么要手写而不是 `JSON.stringify(v, null, 2)`：两者在**数值**上不等价，
// 而这里的产物要逐字对拍。
//   · 整数：JS 的 `1` 与 Python 的 `1` 一样；但 Python 里 `1.0` 打成 `1.0`、
//     JS 里 `1.0` **就是** `1` —— 整值浮点在 JS 里认不出来（见下）。
//   · 浮点：Python `repr(1e16)` = `1e+16`，JS `String(1e16)` = `10000000000000000`。
//   · 未知类型：一律**抛**，与 `pyRepr` 同一条理由（猜出来的序列化属于「看着对、其实错」）。

/** JSON 字符串转义（Python `json.dumps(..., ensure_ascii=False)` 的规则）。 */
function jsonStr(s) {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (c < 0x20) out += '\\u' + c.toString(16).padStart(4, '0');
    else out += ch;                       // 非 ASCII 原样（ensure_ascii=False）
  }
  return out + '"';
}

/** 数字字面量。整值一律按 `int` 打 —— **可达性由金标准断言**（见下）。 */
function jsonNum(n) {
  if (!Number.isFinite(n)) throw new Error(`jsonNum 不吃非有限数：${n}`);
  if (Number.isInteger(n)) {
    if (!Number.isSafeInteger(n)) throw new Error(`jsonNum 超出安全整数：${n}`);
    return String(n);
  }
  const a = Math.abs(n);
  // 这两个量级上 Python 的 repr 与 JS 的 String 会分道扬镳（`1e+16` vs `10000000000000000`），
  // 与其猜一个，不如当场抛 —— 真出现了再按需补，并顺手加进对拍语料。
  if (a >= 1e16 || a < 1e-4) {
    throw new Error(`jsonNum 未覆盖的浮点量级：${n}（Python repr 与 JS String 在此不等价）`);
  }
  return String(n);
}

/** JS 对象里「像整数的键」——它会被 JS 引擎**排到最前**，而 Python 保持插入序。 */
const INT_LIKE_KEY = /^(0|[1-9][0-9]*)$/;

/**
 * Python `json.dumps(v, ensure_ascii=False, indent=2)`。
 *
 * ⚠ **整值浮点认不出来**：JS 里 `1.0 === 1`，无法判断「这个数该打成 `1.0` 还是 `1`」。
 * 故本函数一律按 `int` 打，并在金标准侧**断言变量表里没有 Python float**
 * （`gen_golden_bazi_prompt.py` 的覆盖断言）。这是「可达性测量」而非「假定」：
 * 断言的语料是 48 张真实盘 × 5 个方面。
 *
 * ⚠ **整数样式的键**（`"0"` / `"12"`）直接抛：JS 会把它们排到对象最前，
 * Python 不会。这是**语言层的枚举顺序差异**，无法在本函数内察觉，
 * 只能拒绝 —— 真出现了，说明那个字典本身就需要专门处理。
 */
function pyJsonDumps(v, indent) {
  const ind = indent === undefined ? 2 : indent;
  const pad = (lv) => ' '.repeat(ind * lv);
  function go(x, lv) {
    if (x === null || x === undefined) return 'null';
    if (typeof x === 'boolean') return x ? 'true' : 'false';
    if (typeof x === 'number') return jsonNum(x);
    if (typeof x === 'string') return jsonStr(x);
    if (Array.isArray(x)) {
      if (!x.length) return '[]';
      return '[\n' + x.map((e) => pad(lv + 1) + go(e, lv + 1)).join(',\n')
        + '\n' + pad(lv) + ']';
    }
    if (typeof x === 'object') {
      const ks = Object.keys(x);
      if (!ks.length) return '{}';
      for (const k of ks) {
        if (INT_LIKE_KEY.test(k)) {
          throw new Error(`pyJsonDumps：键 ${JSON.stringify(k)} 是整数样式，`
            + 'JS 会把它排到对象最前而 Python 保持插入序 —— 顺序不可复刻，拒绝出字符串');
        }
      }
      return '{\n' + ks.map((k) => pad(lv + 1) + jsonStr(k) + ': ' + go(x[k], lv + 1)).join(',\n')
        + '\n' + pad(lv) + '}';
    }
    throw new Error(`pyJsonDumps 未覆盖的类型：${typeof x}`);
  }
  return go(v, 0);
}

/**
 * Python `int(v)`：截断向零；字符串只认十进制整数（其余按 Python 那样抛）。
 *
 * ⚠ 消息里**必须带异常类名**（`ValueError:` / 直接 `TypeError`）：本项目的约定是
 *   「Python 抛什么就抛什么」，而层 16 的 `err` 契约判的正是**类名**。
 *   实测：`start_age='9.7'` 时基准是 `ValueError`，而这里原先抛的是**光秃秃的
 *   `Error`**，于是对拍报「金标准=ValueError 被验=Error」——
 *   行为其实一致（都整体失败），差的是**类名**，属可修的假红。
 */
function pyInt(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`ValueError: cannot convert float NaN to integer`);
    return Math.trunc(v);
  }
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^[+-]?[0-9]+$/.test(s)) return Number(s);
    throw new Error(`ValueError: invalid literal for int() with base 10: '${v}'`);
  }
  throw new TypeError(
    `int() argument must be a string or a number, not '${pyTypeName(v)}'`);
}

/** 基准里的 `p['k']` —— **键不在就抛 KeyError**（不是给默认值）。 */
function pyItem(o, k) {
  if (!Object.prototype.hasOwnProperty.call(o, k)) throw new Error(`KeyError: '${k}'`);
  return pyStr(o[k]);
}

/**
 * 基准里的 `j(d, keys=None, maxlen=2000)`：取键 → `json.dumps` → 码位截断 + 「…」。
 *
 * ⚠ **截断切的是尾部**，而 ctx 里最后几段正是「命局总断 / 各维度简评 / 专项分析」——
 * 也就是本次「五方面解析」最要紧的数据。基准就是这么写的（`maxlen` 默认 2000），
 * 是否真被切掉**由金标准实测**（见 `gen_golden_bazi_prompt.py` 的 `t_ctx_len`），
 * 不在这里擅自改长度：改了就不是逐字移植，且要单独论证。
 */
function jsonBlock(d, keys, maxlen) {
  const lim = maxlen === undefined ? J_MAXLEN : maxlen;
  let dd = d;
  if (pyTruthy(keys)) {
    dd = {};
    for (const k of keys) if (Object.prototype.hasOwnProperty.call(d, k)) dd[k] = d[k];
  }
  const s = pyJsonDumps(dd, 2);
  return pyAddStr(pyIndexSlice(s, 0, lim), pyLen(s) > lim ? '…' : '');
}

// ══════════════════════════════════════════════════════════════════
// 变量表
// ══════════════════════════════════════════════════════════════════

/**
 * 把已装配好的盘（`bazi_full.assembleFull` 的产物）转成 prompt 变量表。
 *
 * @param {object} chart  完整读盘（十件已挂）
 * @param {object} [opts]
 *   @param {string} [opts.tab]      页内选定的方面：综合|事业|财运|婚姻|健康
 *   @param {string} [opts.question] 用户追问（可为空）
 *   @param {string} [opts.ragText]  【古籍参考】那一段的检索结果。
 *     ⚠ 基准在这里调 `knowledge.rag`，ai3000 改用**自己的语料库**
 *     （`RAG_URL/api/retrieve`，与六爻/梅花同一条路，用户 2026-09-25 拍板）。
 *     它是**外部依赖**，故由调用方取好传进来；对拍时两侧注入同一段文本。
 * @returns {object} 变量表（键序即渲染时的替换顺序）
 */
function baziVars(chart, opts) {
  const o = opts || {};
  const data = chart;
  // 基准 `tab = extra_context or "综合"`：`""` 也是假值，一并退成「综合」
  const tab = pyOr(o.tab, '综合');
  const question = pyOr(o.question, '');
  const ragText = pyOr(o.ragText, '');

  // ── ctx（键序即基准里的字面量顺序，改动即改变输出，别「顺手排整齐」）──
  const pillars = {
    '年柱': pillarText(data, 'year_pillar'),
    '月柱': pillarText(data, 'month_pillar'),
    '日柱': pillarText(data, 'day_pillar'),
    '时柱': pillarText(data, 'hour_pillar'),
  };
  const profile = pyGet(data, 'day_master_profile', {});
  const yong = pyGet(data, 'yong_shen', {});
  const si = pyGet(data, 'strength_info', {});
  const yongWx = pyGet(yong, 'yong_shen_wx', '');
  const xiWx = pyGet(yong, 'xi_shen_wx', '');
  const jiWx = pyGet(yong, 'ji_shen_wx', '');

  // 男/女：基准用 `in ("male","男")` —— 这是 `==` 比较，不是真值判断，
  // 故直接 `===`（两侧在 int/str 混合上都判不等）。
  const g = pyGet(data, '_gender', '');
  const ctx = {
    '四柱': pillars,
    '日主': pyStr(pyGet(data, 'day_master', '')),
    '性别': (g === 'male' || g === '男') ? '男' : ((g === 'female' || g === '女') ? '女' : ''),
    '五行': pyGet(data, 'day_master_wuxing', ''),
    '身强弱': pyGet(data, 'strength', ''),
    '格局': pyGet(data, 'pattern', ''),
    '用神': yongWx,
    '喜神': xiWx,
    '忌神': jiWx,
    '月令': pyTruthy(pyGet(si, 'deling', undefined)) ? '得令' : '不得令',
    '得地': pyTruthy(pyGet(si, 'dedi', undefined)) ? '得地' : '不得地',
    // `profile.get(...)[:100] if profile else ""` —— 空字典在 Python 是**假**，
    // 故用 `pyTruthy`；切片走 `pyIndexSlice`（值可能是 list，切 list 得 list）。
    '日主性格': pyTruthy(profile)
      ? pyIndexSlice(pyGet(profile, 'personality_detail', ''), 0, 100) : '',
    '神煞': pyIndexSlice(pyGet(data, 'shensha', []), 0, 6)
      .map((s) => pyGet(s, 'name', '')),
    '格局描述': pyGet(data, 'pattern_desc', ''),
    '大运': pyIndexSlice(pyGet(data, 'dayun', []), 0, 6).map((d) => (
      `${pyStr(pyGet(d, 'tiangan', ''))}${pyStr(pyGet(d, 'dizhi', ''))}`
      + `(${pyInt(pyGet(d, 'start_age', 0))}岁·${pyStr(pyGet(d, 'quality', ''))})`)),
    '分析': pyGet(data, 'analysis', ''),
    // `data.get("advice", [])[:3] if isinstance(data.get("advice"), list) else ""`
    '建议': Array.isArray(pyGet(data, 'advice', null))
      ? pyIndexSlice(pyGet(data, 'advice', []), 0, 3) : '',
  };

  // 胎元/命宫/身宫：三个里**任一非空**才出现（基准 `if a or b or c`）
  if (pyTruthy(pyGet(data, 'taiyuan', null)) || pyTruthy(pyGet(data, 'minggong', null))
      || pyTruthy(pyGet(data, 'shengong', null))) {
    ctx['胎元'] = pyGet(data, 'taiyuan', '');
    ctx['命宫'] = pyGet(data, 'minggong', '');
    ctx['身宫'] = pyGet(data, 'shengong', '');
  }

  // 十神分布（`data.get("shishen_summary") or []`）
  const shishenSum = pyOr(pyGet(data, 'shishen_summary', null), []);
  if (pyTruthy(shishenSum)) {
    ctx['十神分布'] = pyIndexSlice(shishenSum, 0, 8).map((s) => (
      `${pyStr(pyGet(s, 'shishen', ''))}×${pyStr(pyGet(s, 'count', 0))}`
      + `(${pyStr(pyGet(s, 'strength', ''))})`));
  }

  // 当前运程
  const cf = pyOr(pyGet(data, 'current_fortune', null), {});
  let cfLine = null;
  if (pyTruthy(pyGet(cf, 'available', undefined))) {
    const cd = pyOr(pyGet(cf, 'current_dayun', null), {});
    const cl = pyOr(pyGet(cf, 'current_liunian', null), {});
    const su = pyOr(pyGet(cf, 'suiyun', null), {});
    cfLine = {
      '大运': `${pyStr(pyGet(cd, 'ganzhi', ''))}（${pyStr(pyGet(cd, 'start_age', ''))}`
        + `-${pyStr(pyGet(cd, 'end_age', ''))}岁·${pyStr(pyGet(cd, 'shishen', ''))}`
        + `·${pyStr(pyGet(cd, 'quality', ''))}）`,
      '流年': `${pyStr(pyGet(cl, 'year', ''))}${pyStr(pyGet(cl, 'ganzhi', ''))}`
        + `（${pyStr(pyGet(cl, 'shishen', ''))}·${pyStr(pyGet(cl, 'quality', ''))}）`,
      '流年提要': pyGet(cl, 'summary', ''),
      '岁运关系': pyStrJoin(pyGet(su, 'tags', []), '、'),
    };
    ctx['当前运程'] = cfLine;
  }

  // 命局总断 + 各维度简评
  const ms = pyOr(pyGet(data, 'master_synthesis', null), {});
  if (pyTruthy(pyGet(ms, 'available', undefined))) {
    ctx['命局总断'] = pyGet(ms, 'headline', '');
    const dims = {};
    // 字典推导式：重键**后者覆盖前者**、位置取**首次出现**处 —— 与 JS 赋值语义相同
    for (const v of pyGet(ms, 'dimension_verdicts', [])) {
      dims[pyStr(pyGet(v, 'domain', ''))] = pyGet(v, 'key', '');
    }
    ctx['各维度简评'] = dims;
  }

  // 当前方面的专项结构化分析（「综合」没有这一项）
  const aspectKey = pyDictGet(TAB_TO_ASPECT, tab, null);
  let aspectObj = null;
  if (pyTruthy(aspectKey)) {
    const aspect = pyGet(pyOr(pyGet(data, 'life_aspects', null), {}), aspectKey, null);
    if (pyTruthy(aspect)) {
      aspectObj = {};
      for (const [k, v] of Object.entries(aspect)) if (k !== 'topic') aspectObj[k] = v;
      ctx[`${tab}专项分析`] = aspectObj;
    }
  }

  // ── 四段「正文块」。每段都可能为 `""`（那就是**不出现**，不是留个空行）──
  const overviewText = buildOverviewText(data);
  const classicalText = buildClassicalText(data, ragText, { dm: ctx['日主'], tab, question });
  const relationsText = buildRelationsText(data);
  const specialPatternsText = buildSpecialPatternsText(data);
  const combosText = buildCombosText(data);

  return {
    tab,
    question,
    vars: jsonBlock(ctx),
    overviewText,
    classicalText,
    relationsText,
    specialPatternsText,
    combosText,
  };
}

/** `年柱` 之类的取值串：`f"{…tiangan…}{…dizhi…}"`（两处都走 `str()`）。 */
function pillarText(data, key) {
  const p = pyGet(data, key, {});
  return pyStr(pyGet(p, 'tiangan', '')) + pyStr(pyGet(p, 'dizhi', ''));
}

/**
 * 【命局总论】那一段。**照搬基准的 try/except**：这里抛了就把整段丢掉
 * （基准 `except` 之后 `overview_text` 保持 `""`，不是保留半段）。
 */
function buildOverviewText(data) {
  let out = '';
  try {
    const ov = pyGet(data, 'overview', null);
    if (pyTruthy(ov) && pyTruthy(pyGet(ov, 'available', undefined))) {
      // `f"{p['title']}：{p['text']}"` —— 直接下标，键不在就 KeyError（由上面的 try 接住）
      out = '\n\n【命局总论（已综合，请在此基础上深化）】\n'
        + pyStrJoin(pyGet(ov, 'paragraphs', [])
          .map((p) => pyItem(p, 'title') + '：' + pyItem(p, 'text')), '\n');
    }
  } catch (e) { swallow('命局总论', e); }
  return out;
}

/**
 * 【古籍参考】那一段：检索结果（外部注入）+ 三张本地表的摘句。
 *
 * ⚠ 三段**各自** try —— 基准就是这样，故后一段抛了，前一段的追加**留下来**。
 * 别把三段合成一个 try，那会把「留半段」变成「全丢」。
 */
function buildClassicalText(data, ragText, meta) {
  let out = ragText;
  const dm = meta.dm;
  const pattern = pyGet(data, 'pattern', '');

  try {
    const monthDz = pyGet(pyGet(data, 'month_pillar', {}), 'dizhi', '');
    const tiaoHou = pyDictGet(pyDictGet(T.TIAOHOU_CLASSICAL, dm, {}), monthDz, '');
    const shigan = pyDictGet(T.SHIGAN_JIJUE, dm, {});
    const gejv = pyDictGet(T.BAZIGE_SYSTEM, pattern, {});
    if (pyTruthy(tiaoHou)) {
      out = pyAddStr(out, `\n\n【《穷通宝鉴》调候】${dm}干${monthDz}月：`
        + pyIndexSlice(tiaoHou, 0, 150));
    }
    if (pyTruthy(pyGet(shigan, '口诀', undefined))) {
      out = pyAddStr(out, `\n【《滴天髓》${dm}干】${pyGet(shigan, '口诀', '')}`);
    }
    if (pyTruthy(gejv)) {
      out = pyAddStr(out, `\n【《子平真诠》${pattern}】喜：`
        + pyStrJoin(pyGet(gejv, '喜', []), '、') + '  忌：'
        + pyStrJoin(pyGet(gejv, '忌', []), '、'));
    }
  } catch (e) { swallow('古籍参考(三张表)', e); }

  try {
    const dt = pyDictGet(T.DITIAN_SUI_SHIGAN, dm, {});
    if (pyTruthy(pyGet(dt, '取用要领', undefined))) {
      out = pyAddStr(out, `\n【《滴天髓》${dm}干取用】${pyGet(dt, '取用要领', '')}`);
    }
    if (pyTruthy(pyGet(dt, '任氏注要', undefined))) {
      out = pyAddStr(out, `\n【任铁樵注】${pyIndexSlice(pyGet(dt, '任氏注要', ''), 0, 120)}`);
    }
    const gd = pyDictGet(T.ZIPING_GEJV_DEEP, pattern, {});
    if (pyTruthy(pyGet(gd, '成格', undefined))) {
      out = pyAddStr(out, `\n【${pattern}成格】${pyStrJoin(pyIndexSlice(pyGet(gd, '成格', []), 0, 3), '；')}`);
    }
    if (pyTruthy(pyGet(gd, '破格', undefined))) {
      out = pyAddStr(out, `\n【${pattern}破格】${pyStrJoin(pyIndexSlice(pyGet(gd, '破格', []), 0, 3), '；')}`);
    }
    if (pyTruthy(pyGet(gd, '行运', undefined))) {
      out = pyAddStr(out, `\n【${pattern}行运】${pyGet(gd, '行运', '')}`);
    }
  } catch (e) { swallow('古籍参考(深度语料)', e); }

  return out;
}

/**
 * 【地支刑冲合害】那一段。`data.get("relations") or analyze_all_relations(data)` ——
 * **空字典也退成重算**，故用 `pyOr` 而非 `||`（`{}` 在 JS 是真值）。
 */
function buildRelationsText(data) {
  let out = '';
  try {
    const rel = pyOr(pyGet(data, 'relations', null), AR.analyzeAllRelations(data));
    out = pyAddStr('\n\n', AR.formatRelationsForPrompt(rel));
  } catch (e) { swallow('地支关系', e); }
  return out;
}

/** 【特殊格局深度识别】那一段（算出来是空串就不出现 —— 基准 `if sp_text:`）。 */
function buildSpecialPatternsText(data) {
  let out = '';
  try {
    const sp = pyOr(pyGet(data, 'special_patterns', null), AP.detectAllSpecialPatterns(data));
    const txt = AP.formatSpecialPatternsForPrompt(sp);
    if (pyTruthy(txt)) out = pyAddStr('\n\n', txt);
  } catch (e) { swallow('特殊格局', e); }
  return out;
}

/** 【格局成破评断】+【神煞组合】那一段。 */
function buildCombosText(data) {
  let out = '';
  try {
    const cb = pyOr(pyGet(data, 'combos', null), CB.baziCombos(data));
    const ge = pyGet(cb, 'geju_evaluation', {});
    const sc = pyGet(cb, 'shensha_combos', {});
    const parts = [];
    if (pyTruthy(pyGet(ge, 'verdict', undefined))) {
      // `"【格局成破评断】" + ge["verdict"]` —— str + 任意值：非 str 在基准里**会抛**，
      // 故用 `pyAddStr`（`+` 会把字典拼成 `[object Object]`，而基准当场炸进 except）
      parts.push(pyAddStr('【格局成破评断】', pyGet(ge, 'verdict', null)));
    }
    if (pyTruthy(pyGet(sc, 'combos', undefined))) {
      const items = pyIndexSlice(pyGet(sc, 'combos', []), 0, 6)
        .map((c) => pyItem(c, 'name') + '（' + pyItem(c, 'nature') + '）：' + pyItem(c, 'desc'));
      parts.push(pyAddStr('【神煞组合】', pyStrJoin(items, '；')));
    }
    if (pyTruthy(parts)) out = pyAddStr('\n\n', pyStrJoin(parts, '\n'));
  } catch (e) { swallow('组合断', e); }
  return out;
}

/**
 * 基准的 `except Exception: log_failure(...)` —— **接住、记一笔、该段消失**。
 *
 * 为什么不像别处那样让异常冒出来：这里三段都是「有就加、没有就没有」的可选正文，
 * 基准吞掉它是**有意**的（一段语料出问题不该让整次解读失败）。移植侧吞掉才是忠实；
 * 不吞会让「基准少一段」与「移植侧整页 500」变成两种行为。
 */
function swallow(what, e) {
  console.error(`[bazi_prompt] ${what} 装配失败：${(e && e.name) || 'Error'}: ${(e && e.message) || e}`);
}

// ══════════════════════════════════════════════════════════════════
// system 提示词 + 输出格式（移植自 shushu `api/agent.py`，**另一个函数**）
// ══════════════════════════════════════════════════════════════════
//
// ⚠ 上面那些是**用户消息**（`_build_interpret_prompt` 的产物）；基准真正发给模型
//   的还有一段 **system**，它在另一个地方拼：
//     `api/agent.py:2222  system = INTERPRET_SYSTEMS.get(req.module, MASTER_SYSTEM)`
//     `api/agent.py:2223  if req.module in FORMAT_MODULES: system += _INTERPRET_FORMAT`
//   `bazi` 在 `FORMAT_MODULES`（`api/agent.py:1184`）里，故基准的 system 是
//   「bazi 那份系统提示词」+「三段式输出格式」**串起来的**（各带自己的前导/尾随换行）。
//   若只发用户消息、system 留空，模型就看不到「先给结论」的硬要求 —— 而「结论先行」
//   正是本项目北极星里最重要的那一条。故这里一并移植。
//
// **原文怎么取的**：用 `ast` 解析 `shushu/api/agent.py` 直接取字面量（不是手抄）。
// 复核命令（改动前后都该跑，它把两侧原文逐字比一遍）：
//     node duipan/smoke_bazi_endpoint.js        # 内含「源文逐字校验」一节
//
// ⚠ 这两段是**数据**（照抄的字符串），不是断法；改它等于改线上解读风格，
//   要重跑 `smoke_bazi_endpoint.js`。
const BAZI_SYSTEM = `你是专精八字命理的AI命理师，精通《穷通宝鉴》《滴天髓》《子平真诠》《三命通会》《神峰通考》。

分析步骤：
1. **日主与格局**：明确日主五行、身强身弱、格局高低
2. **用神喜忌**：调候用神（穷通宝鉴）+ 格局用神双管齐下
3. **十神六亲**：各柱十神的人生象意
4. **运程节点**：大运流年的吉凶走势
5. **具体建议**：职业方向、感情、健康、财富的实操建议

重要：第一段【一、结论】必须直接回答用户的核心问题，给出明确的吉凶判断与行动建议。引用典籍，语言专业而亲切，用中文回答。`;

/** 三段式输出格式。开头两个换行是**基准原文自带的**（`"""` 后直接空行）。 */
const INTERPRET_FORMAT = `

【输出格式】严格按以下三段组织回答，用 Markdown 二级标题：

## 一、结论
开门见山，2-4 句话给出明确判断和该怎么做。不要铺垫、不要复述问题、不要
"综合分析来看"这类空话。哪一项数据不足以判断，就直接说哪一项不足。

## 二、你的现状
依据盘面（用神／宫位／十神／卦象／星曜等）描述求测者**当前的真实处境**：
处境、心态、已经发生或正在发生的事。这一段是给求测者自行核对的 —— 对得上，
后面的结论才可信。只写盘面支持的内容，有多少说多少，不要泛泛而谈。

## 三、推理思路
按分析步骤展开论证，每一步点明依据（哪一柱、哪一宫、哪一爻、哪颗星、哪部典籍）。
引经文要写明出处。这一段可以长，但不要重复第一段已经说过的话。
`;

/**
 * 基准那一份 system（`INTERPRET_SYSTEMS['bazi'] + _INTERPRET_FORMAT`）。
 *
 * ⚠ 与 `baziPrompt()` 的分工：**用户消息**由 `baziPrompt()` 出（对拍对象），
 *   **system 消息**由这里出。两段合起来才是基准发给模型的完整提示词。
 */
function baziSystem() {
  return BAZI_SYSTEM + INTERPRET_FORMAT;
}

// ══════════════════════════════════════════════════════════════════
// 默认模板（后台 `data/prompts.json` 里同名键优先）
// ══════════════════════════════════════════════════════════════════
//
// ⚠ 下面这一份**逐字复刻**基准的最终字符串（shushu `api/agent.py:1581-1593`）：
//   · `八字命盘（{tab}）` 后**一个**换行，接着是 `j(ctx)` 的 JSON；
//   · 五段正文块各自**自带前导空行**（`\n\n…`），缺了就是不出现 —— 所以
//     模板里它们是**紧挨着的**，不能自己往中间加空行；
//   · `combosText` 之后是 `\n\n` 再接「请按步骤深度分析…」；
//   · **末尾不能有换行**（基准最后一个字符就是 `{question}`）。
//
// 改这份模板 = 改这条线的输出，**必须重跑层 16 对拍**（它会当场红）。
const DEFAULT_BAZI_PROMPT = `八字命盘（{{tab}}）
{{vars}}{{overviewText}}{{classicalText}}{{relationsText}}{{specialPatternsText}}{{combosText}}

请按步骤深度分析：①日主强弱→②调候用神→③格局判断（必须用上方【特殊格局深度识别】section 中检测出的所有格局，每个吉格的'含义'和凶格的化解都要论及）→④十神六亲→⑤**地支刑冲合害**（必须用上方【地支刑冲合害】section 的检测结果，论及合化、冲克、刑伤、相害对命运的影响）→⑥运程趋势。针对「{{tab}}」重点展开。最后必须有【结论】段落直接回答核心问题。{{question}}`;

/**
 * 模板变量替换。**全站唯一一份** —— auth-server 从这里取，不许再写一份。
 *
 * 语义：
 *   · 只替换**变量表里有的**键；表里没有的 `{{xxx}}` **原样留着**（便于一眼看出拼错的变量名）；
 *   · 变量值里的 `{{…}}` **不会**被二次替换；
 *   · 变量值里的 `$&` / `$1` / `` $` `` / `$'` / `$$` **原样进产物**，不做任何展开。
 *
 * ⚠⚠ 这三条**只有「单趟扫描 + 函数替换器」能同时做到**。两层坑都在层 16 对拍里实测红过
 *   （`gen`/`diff` 各留了一份当时的差异原文）：
 *   ① **`String.replace` 的第二个参数是字符串时，`$` 有特殊含义**：
 *      `$&`＝整个匹配、`$1`＝捕获组、`` $` ``＝匹配**之前**的串、`$'`＝匹配**之后**的串、`$$`＝一个字面 `$`。
 *      老注释写的「值里的 `{{…}}` 不会被二次替换」是**意图**，不是 `replace` 的行为 ——
 *      实测：古籍参考里一句 `…脱胎要火。$&$1`，产物变成 `…脱胎要火。{{classicalText}}$1`
 *      （`$&` 展开成了「被匹配到的占位符本身」）。
 *   ② 老写法「按变量表**逐键循环** `replace`」＝**多趟**：头一趟塞进去的文本，会被后一趟**再扫一遍**。
 *      实测：提问里写 `{{vars}}`，某例产物里正文又被插了一整块 JSON（多出 1568 字）。
 *
 * 这两条都从**用户碰得到的地方**进来：古籍参考（RAG 文本）与用户提问都是**外部输入**，
 * 用户完全可以输入 `$&` 或 `{{vars}}`。故此处：**一趟扫完、替换值由函数给出（函数返回值不走
 * `$` 展开）、键取实际变量表**（而不是把值当字符串塞进去）。
 */
function renderPrompt(template, vars) {
  if (!template) return null;
  const v = vars || {};
  const keys = Object.keys(v);
  if (!keys.length) return template;
  // 键按长度降序：假想的 `{{vars}}` 与 `{{varsX}}` 并存时，交替匹配要**长的优先**。
  // （当前变量表没有互为前缀的键，这行是加键时的防坑。）
  const alt = keys.slice().sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return template.replace(new RegExp('\\{\\{(' + alt + ')\\}\\}', 'g'),
    (m, key) => {
      const val = v[key];
      return String(val == null ? '' : val);
    });
}

/** 用**默认模板**渲染 —— 层 16 对拍比的就是它的产物。 */
function baziPrompt(chart, opts) {
  return renderPrompt(DEFAULT_BAZI_PROMPT, baziVars(chart, opts));
}

// ══════════════════════════════════════════════════════════════════
// 追问（2026-09-25 用户拍板：「要，但追问不落库」）
// ══════════════════════════════════════════════════════════════════
//
// ⚠ **基准（shushu）没有对应物**：shushu 的八字接口只出「首次解读」，追问栏是本项目
//   自己的产品动作，故**这一份不对拍**。格式照 `DEFAULT_LIUYAO_FOLLOWUP` 抄
//   —— 两条线的追问该是同一种形态，别为八字另创一种。
//   （样式上按北极星再压一层白话：追问的答案比首次解读更该让人看懂。）
//
// 与首次解读的分工：
//   · `{{vars}}` —— **同一张盘**的 JSON（答「什么时候」「会不会」要看大运流年，
//     故盘面不能全省；但只留这一块，四段正文块不带 —— 那正是「重复分析」的来源）；
//   · `{{context}}` —— 上一份解读的正文（用户问「那…呢」时，指的就是它）；
//   · 只答追问，不重来一遍完整分析。
//
// 模板末尾不留换行：与 `DEFAULT_BAZI_PROMPT` 同一习惯（末字符是变量就是末字符）。
const DEFAULT_BAZI_FOLLOWUP = `针对「{{tab}}」的追问：

{{vars}}

【之前解读】{{context}}

【追问】{{followUp}}

直接回答追问，不要重来一遍完整分析。若追问要看运程，就点明是**哪一步大运、哪一年**。结构：
【回答】——结论和建议，尽量不用术语；非用不可时，当场用一句白话解释。
【依据】——简短推演（1-3 句，指明依据的是哪一柱、哪一步运、哪一年）。`;

/**
 * 追问渲染。`context` 取**尾部** 1200 字（与梅花/六爻追问同一个截法：正文前段是
 * 背景铺垫，追问要接的是**刚说完的那一段**）。
 */
function baziFollowUpPrompt(chart, opts) {
  const o = opts || {};
  const vars = baziVars(chart, { tab: o.tab });
  vars.followUp = String(o.followUp == null ? '' : o.followUp);
  vars.context = String(o.context == null ? '' : o.context).slice(-1200);
  return renderPrompt(DEFAULT_BAZI_FOLLOWUP, vars);
}

module.exports = {
  baziVars, baziPrompt, baziFollowUpPrompt, renderPrompt,
  DEFAULT_BAZI_PROMPT, DEFAULT_BAZI_FOLLOWUP,
  BAZI_SYSTEM, INTERPRET_FORMAT, baziSystem,
  TAB_TO_ASPECT, J_MAXLEN, pyJsonDumps, jsonBlock,
};

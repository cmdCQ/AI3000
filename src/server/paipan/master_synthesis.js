/**
 * paipan/master_synthesis.js —— 八字·综合论断（总汇合参）（3.5.4b-4）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`core/bazi/master_synthesis.py`（166 行）：
 *   `_Q_RANK`/`_grade_to_q` :14/:17 → `Q_RANK`/`gradeToQ`
 *   `build_master_synthesis` :29     → `buildMasterSynthesis`
 *
 * 一次完整读盘的**最后一层**：把事业、婚姻、财运、健康各专域的单点结论，
 * 连同当前大运流年，汇于一处 ——
 *   单点（各域专断）→ 组合（命局×各域×运程）→ 汇总（综合论断 + 分域速览 + 总建议）。
 *
 * ── 与基准的**唯一接口差异**：`moment` 改为显式传参 ──
 * 基准在函数内部 `from core.calendar.current_moment import current_sizhu` 现取「此刻」，
 * 于是同一个盘在不同时刻跑出不同结果 —— **无法对拍**（层 1–14 里唯一一处真正读「现在」的）。
 * 移植侧把它提到参数上：`buildMasterSynthesis(chart, moment)`，`moment` 由装配层
 * （`bazi_full.js`）用 `ganzhi.sizhu(now)` 现算 —— 键集与基准的 `current_sizhu` **逐字相同**。
 * 对拍时把 `moment` 注入成固定值，本层就完全确定了。
 * 这是**接口差异，不是行为差异**：除了「此刻」从哪儿来，其余逐字照搬。
 *
 * ── 三处照搬的细节 ──
 * ① `str(cf_list)[:24]` 那一支（`career_fields` 不是列表时）会走 Python `repr` ——
 *    用 `pyStr`/`pySlice`，不要图省事写 `String(v).slice(0,24)`（层 14 的 7920 例教训）。
 * ② `s.strip("；")` 是**去掉两端的「；」字符**，不是「按；切分再取一段」。JS 没有
 *    单字符 strip，故有下面的 `stripChar`；写成 `replace(/^；|；$/g,'')` 也对但要多想一层。
 * ③ 头部的 `allgood` 英文残留由 `headline.replace("allgood","")` 打补丁 ——
 *    与 `overview.py` 的 `avoid` 同款，**连补丁一起搬**（replace 对所有档位都执行，
 *    只是别的档位文案里没有这个词）。
 * ④ 基准里 `if career:` / `if wealth.get("advice"):` / `marriage.get("clash_present")`
 *    这些是**裸真值判断**，一律走 `pyTruthy` 而不是 JS 真值 —— 唯一分叉点是**空容器**：
 *    `advice = []` 或 `{}` 在 Python 为假、在 JS 为真，写成 JS 真值就会多拼一段
 *    `；` + 空 repr。合成族里已放 `[]`/`{}`
 *    两态专盯这一支（见 `duipan/gen_golden_bazi_assembly.py` 的 `ms` 族）。
 *
 * ⑤ ⚠⚠ 「当下」那一段**连基准的 swallow 一起搬**（本层对拍逼出来的修正）──
 *    基准把整段包在 `try/except` 里，失败只记日志 → **「当下」这一域整个消失**。
 *    先前我判「移植侧不包：moment 已是显式传参，唯一的失败源是调用方没给 moment」——
 *    **这个判断是错的**：那段里还有第二个失败源，就是**畸形输入**：
 *      `hour_wuxing = ["水"]`      → `_SHENG.get(["水"])` → `unhashable type: 'list'`
 *      `yong_shen_wx = {"水": 1}`  → `"、".join([{...}])` → `expected str instance, dict found`
 *    这两条都是基准真会炸、真会吞的路径（`ms` 族的 `moment-22` / `moment-yong-dict` 就是
 *    照这两条造的）。移植侧若不吞，就变成「基准少一域、移植多一域」；而若吞得不精确
 *    （比如 `momentVsYongshen` 提前 `pyStr` 把该炸的地方演成正常返回），同样对不上 ——
 *    故 `ganzhi.js::momentVsYongshen` 里用 `pyDictGet`/`pyStrJoin` 复刻那两个 TypeError。
 *    `moment` 缺失仍在 try **之外**照抛：那是接口差异带来的调用方 bug，不是输入畸形。
 *    **吞掉的东西一律 `console.error`**，不静默 —— 否则「一个从没报过的检查等于没有检查」。
 *
 * 依赖（缺一不可，装配见 `bazi_full.js`）：`overview` / `mingju_synthesis` /
 * `current_fortune` / `life_aspects`。
 *
 * 对拍：`duipan/gen_golden_bazi_assembly.py`（家族 `ms*`）。
 */
'use strict';

const { pyGet, pyTruthy, pyOr, pyStr, pySlice, pyStrJoin } = require('./pycompat.js');
const G = require('./ganzhi.js');

/** master_synthesis.py:14 `_Q_RANK` —— 吉凶等级排序分（「平」与「中」同级）。 */
const Q_RANK = { 吉: 2, 中: 1, 平: 1, 凶: 0 };

/** Python `s.strip(chars)` 的单字符版（此处只用得着单字符）。 */
function stripChar(s, ch) {
  let a = 0;
  let b = s.length;
  while (a < b && s[a] === ch) a += 1;
  while (b > a && s[b - 1] === ch) b -= 1;
  return s.slice(a, b);
}

/** master_synthesis.py:17 `_grade_to_q` —— 从专域结论文字粗提吉/中/凶。 */
function gradeToQ(text) {
  if (!text) return '中';
  const t = pyStr(text);
  const JI = ['上佳', '上等', '极佳', '旺', '上吉', '富', '美满', '和合', '健旺', '优'];
  const XIONG = ['受损', '凶', '破', '弱', '差', '刑冲', '病', '衰', '薄'];
  if (JI.some((k) => t.includes(k))) return '吉';
  if (XIONG.some((k) => t.includes(k))) return '凶';
  return '中';
}

/** `_txt(v, n=28)` —— 列表则「；」连起来再截，否则 `str(v or "")[:n]`。
 *
 * ⚠ `v || ''` 必须是 `pyOr`：`[]`/`{}` 在 Python 为假、在 JS 为真，
 *   写 `||` 会把空列表送进 `pyStr` 得到 `"[]"`（基准给的是 `""`）。
 *   列表那一支走 `pyStrJoin` 的等价物（`"；".join(str(x) ...)` 的 `str(x)` 逐元素做，
 *   故这里 `pyStr` 每个元素再 join —— 与 `pyStrJoin` 只差「先 str 再 join」，
 *   而基准这一支正是**先 str 再 join**，故用 `map(pyStr).join` 是对的，不要改成 pyStrJoin）。 */
function txt(v, n) {
  const lim = n === undefined ? 28 : n;
  if (Array.isArray(v)) return pySlice(v.map((x) => pyStr(x)).join('；'), 0, lim);
  return pySlice(pyStr(pyOr(v, '')), 0, lim);
}

function buildMasterSynthesis(chart, moment) {
  const overview = pyOr(pyGet(chart, 'overview', {}), {});
  const synth = pyOr(pyGet(chart, 'mingju_synthesis', {}), {});
  const cf = pyOr(pyGet(chart, 'current_fortune', {}), {});
  const aspects = pyOr(pyGet(chart, 'life_aspects', {}), {});

  if (!pyTruthy(pyGet(overview, 'available', undefined))
      && !pyTruthy(pyGet(synth, 'available', undefined))) {
    return { available: false };
  }

  const dm = pyOr(pyGet(overview, 'day_master', ''), pyGet(synth, 'day_master', ''));
  const mingQ = pyOr(pyGet(synth, 'composite_label', ''), pyGet(overview, 'quality', ''));
  const mingQuality = pyGet(overview, 'quality', '中');

  // ── 分域速览（单点专断 → 一句吉凶）──
  const dims = [];

  const career = pyOr(pyGet(aspects, 'career', {}), {});
  if (Object.keys(career).length) {
    const cfList = pyGet(career, 'career_fields', []);
    // `"、".join(cf_list[:3])` —— 元素**必须都是 str**，否则基准当场
    // `TypeError: sequence item 0: expected str instance, list found`（故 pyStrJoin）。
    const cfFields = Array.isArray(cfList)
      ? pyStrJoin(cfList.slice(0, 3), '、')
      : pySlice(pyStr(cfList), 0, 24);
    const sa = pyGet(career, 'shishen_advice', '');
    // 同一条：`"；".join(sa)` 不做 str()，基准会抛，故 pyStrJoin。
    const saText = pySlice(Array.isArray(sa) ? pyStrJoin(sa, '；') : pyStr(sa), 0, 24);
    const q = gradeToQ(pyStr(pyGet(career, 'analysis', '')));
    dims.push({
      domain: '事业', quality: q,
      verdict: stripChar(`宜${cfFields}等` + (saText ? `；${saText}` : ''), '；'),
      key: cfFields,
    });
  }

  const wealth = pyOr(pyGet(aspects, 'wealth', {}), {});
  if (Object.keys(wealth).length) {
    const lvl = pyStr(pyGet(wealth, 'level', ''));
    const q = gradeToQ(lvl);
    const adv = pyGet(wealth, 'advice', undefined);
    dims.push({
      domain: '财运', quality: q,
      verdict: stripChar(`财格${lvl}` + (pyTruthy(adv) ? `；${txt(adv)}` : ''), '；'),
      key: lvl,
    });
  }

  const marriage = pyOr(pyGet(aspects, 'marriage', {}), {});
  if (Object.keys(marriage).length) {
    const ql = pyStr(pyGet(marriage, 'quality', ''));
    const q = gradeToQ(ql);
    const extra = pyTruthy(pyGet(marriage, 'clash_present', undefined)) ? '有刑冲'
      : (pyTruthy(pyGet(marriage, 'harmony_present', undefined)) ? '得合' : '');
    const adv = pyGet(marriage, 'advice', undefined);
    dims.push({
      domain: '婚姻', quality: q,
      verdict: stripChar(`姻缘${ql}` + (extra ? `·${extra}` : '')
        + (pyTruthy(adv) ? `；${txt(adv, 24)}` : ''), '；'),
      key: ql,
    });
  }

  const health = pyOr(pyGet(aspects, 'health', {}), {});
  if (Object.keys(health).length) {
    const cond = pyStr(pyGet(health, 'dm_condition', ''));
    const q = gradeToQ(cond + txt(pyGet(health, 'analysis', undefined), 20));
    const weak = pyStr(pyGet(health, 'weak_organ', ''));
    const adv = pyGet(health, 'advice', undefined);
    dims.push({
      domain: '健康', quality: q,
      verdict: stripChar(`日主${pyStr(pyGet(health, 'dm_organ', ''))}${cond}`
        + (weak ? `，注意${weak}` : '') + (pyTruthy(adv) ? `；${txt(adv, 20)}` : ''), '；'),
      key: weak,
    });
  }

  // 运程（后天之时）
  let yunLine = '';
  if (pyTruthy(pyGet(cf, 'available', undefined))) {
    const cdy = pyOr(pyGet(cf, 'current_dayun', {}), {});
    const cln = pyOr(pyGet(cf, 'current_liunian', {}), {});
    const helpMap = { 扶用: '顺境之运、宜进取', 助忌: '受抑之运、宜守成', 中性: '平运守常' };
    yunLine = `现行${pyStr(pyGet(cdy, 'ganzhi', ''))}大运（${pyStr(pyGet(cdy, 'shishen', ''))}），`
      + `${pyGet(helpMap, pyGet(cdy, 'help', ''), '')}`
      + `，${pyStr(pyGet(cf, 'current_year', ''))}年${pyGet(cln, 'ganzhi', '')}`
      + `（${pyStr(pyGet(cln, 'quality', ''))}）。`;
    dims.push({
      domain: '运程', quality: pyGet(cln, 'quality', '中'),
      verdict: yunLine, key: pyGet(cdy, 'ganzhi', ''),
    });
  }

  // 当下时辰（此刻时空 × 本命用神 — 任何解读皆纳入当下合参）
  // ⚠ 这里两处都是 Python 的 `or`（「前一处的五行没有就退到后一处」）——
  //   左侧是**五行值**，畸形样本下可能是 `{}`/`[]`，写 `||` 就不退了（见 pycompat.pyOr）。
  const yongWx = pyOr(pyGet(synth, 'yong_shen_wx', ''), pyGet(overview, 'yong_shen_wx', ''));
  const jiWx = pyOr(pyGet(synth, 'ji_shen_wx', ''), pyGet(overview, 'ji_shen_wx', ''));
  let momentLine = '';
  // ⚠ `moment` 缺失**在 try 之外**：基准这一段里现取 `current_sizhu()`，移植侧改成显式传参
  //   （见文件头），于是「没传 moment」是**调用方 bug**，不属于基准那条 swallow 覆盖的
  //   「输入畸形」——照抛。下面 try/catch 只复刻基准的 swallow（见文件头 ⑤）。
  if (!moment) throw new Error('buildMasterSynthesis 需要 moment（ganzhi.sizhu(now) 的产物）');
  const toList = (x) => (Array.isArray(x) ? x : [x]);
  const yongList = toList(yongWx).filter(pyTruthy);
  const jiList = toList(jiWx).filter(pyTruthy);
  try {
    const mv = G.momentVsYongshen(moment, yongList, jiList);
    momentLine = mv.note + pyGet({
      扶用: '此时谋事、决断较顺。', 助忌: '此时宜缓、不宜强求。',
      中性: '此时平平，依事而行。',
    }, mv.tone, '');
    dims.push({
      domain: '当下', quality: mv.quality,
      verdict: momentLine, key: pyGet(moment, 'hour_gz', ''),
    });
  } catch (e) {
    // 基准：`except Exception as _e1: log_failure("bazi", "装配(自动补充日志)", _e1)`
    // ——**整块「当下」消失**（`momentLine` 保持 `""`，故下面的段落也不加）。
    // 打日志而非静默：吞掉的东西必须在开发/测试期看得见（`core/log.py` 的立论）。
    console.error(`[master_synthesis] 装配(自动补充日志) 失败：${e.name}: ${e.message}`
      + '（照搬基准：丢掉「当下」一域）');
  }

  // ── 综合总评（命局体 × 各域均值 × 运程）──
  const domainQs = dims.filter((d) => d.domain !== '运程' && d.domain !== '当下')
    .map((d) => pyGet(Q_RANK, d.quality, 1));
  const avg = domainQs.length ? domainQs.reduce((a, b) => a + b, 0) / domainQs.length : 1;
  let overallQ; let headline;
  if (mingQuality === '吉' && avg >= 1.3) {
    overallQ = '吉'; headline = '命局格正用真，事业财帛婚姻各得其位，allgood一生大局向上。';
  } else if (mingQuality === '凶' || avg < 0.7) {
    overallQ = '凶'; headline = '命局或专域有损，须重趋用避忌、借岁运补救，事在人为。';
  } else {
    overallQ = '中'; headline = '命局成破相参，各域得失互见，扬长补短、顺运而为则吉。';
  }
  headline = headline.replace('allgood', '');

  // ── 汇总段落（命局 → 各域 → 运程 → 当下 串成连贯总论）──
  const paras = [];
  let pMing = `综观全局，${pyStr(dm)}日主，${pyStr(pyOr(mingQ, mingQuality))}。`;
  if (pyTruthy(pyGet(synth, 'composite_desc', ''))) pMing += synth.composite_desc;
  paras.push(pMing);

  if (dims.length) {
    const domBits = [];
    for (const d of dims) {
      if (d.domain === '运程' || d.domain === '当下') continue;
      const mark = pyGet({ 吉: '佳', 中: '平', 凶: '需慎' }, d.quality, '平');
      domBits.push(`${d.domain}${mark}`);
    }
    if (domBits.length) {
      paras.push('分域而论，' + domBits.join('、')
        + '；详见各专断。此先天之分野，定一生各域之高下。');
    }
  }

  if (yunLine) {
    paras.push('叠以后天之运：' + yunLine
      + '先天定格局高下，后天定何时起伏、何域应验，二者合参方知此时此事。');
  }

  if (momentLine) {
    paras.push('再合当下之时：' + momentLine
      + '先天为体、行运为势、当下为机，三者合参，方知此人此时此事之宜忌。');
  }

  // 总建议
  const yong = pyOr(pyGet(synth, 'yong_shen_wx', ''), pyGet(overview, 'yong_shen_wx', ''));
  const ji = pyOr(pyGet(synth, 'ji_shen_wx', ''), pyGet(overview, 'ji_shen_wx', ''));
  let advice = `总以扶${pyStr(yong)}抑${pyStr(ji)}为纲：`
    + '趋用神之乡（事业方位、行业五行、流年）则顺，犯忌神之地则滞。';
  if (dims.some((d) => d.domain === '婚姻' && d.quality === '凶')) {
    advice += '婚姻一域尤须留意刑冲，宜缓择良配、善加经营。';
  }

  return {
    available: true,
    headline: headline,
    overall_quality: overallQ,
    day_master: dm,
    ming_label: pyOr(mingQ, mingQuality),
    dimension_verdicts: dims,          // 单点：各域一句吉凶速览
    integrated_paragraphs: paras,      // 汇总：命局→各域→运程连贯总论
    master_advice: advice,             // 总建议
  };
}

module.exports = { buildMasterSynthesis, gradeToQ, txt, stripChar, Q_RANK };

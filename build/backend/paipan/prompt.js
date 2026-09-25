/**
 * paipan/prompt.js —— 排盘结果 → prompt 文本（六爻 / 梅花）
 * ==============================================================================
 *
 * 为什么单独一个文件：**prompt 的数据源必须与排盘同源**。
 *
 * 原先梅花 prompt 直接吃前端算好的 `hexagrams`（五种卦、体用、判词全是前端
 * `mhys/index.html::calcGua()` 的产物）。那样有两个问题：
 *   1. 前端算错，AI 就照着错的卦解读 —— 而**这种错用户分辨不出来**（两边都是
 *      「一个卦」，只是不是同一个）；
 *   2. 同一套算法在前后端各存一份，改一处必漏一处（本项目已有三份排盘副本的
 *      前车之鉴）。
 * 现在只信前端传的**起卦原始数据**：上下卦号 + 动爻（对梅花）、上下卦号 + 四柱
 * （对六爻），其余**一律本模块重算**，即 `paipan/meihua.js`、`paipan/liuyao.js`。
 * 那两个模块是逐层对拍过的（见 duipan/README.md），前端从此送不出错数据。
 *
 * ── 本文件不做 I/O ──────────────────────────────────────────────
 * 不读 `data/prompts.json`（那是后台可编辑的模板，读写在 auth-server），
 * 只出**变量表**与**默认模板**。默认模板也用 `{{var}}` 占位，好让
 * 「后台自定义模板」与「内置默认模板」走同一条渲染路径 —— 两套渲染必然漂移。
 *
 * ── 六爻四柱的来源：能证明就用自己算的，证明不了就用前端的 ────────
 * 历法层（`ganzhi.sizhu`）已经全项目对齐到「交节**时刻**换月建」，而前端的
 * `enrichTimeInfo()` 仍用日粒度 `getMonthInGanZhi()`（整个交节日算新月）。
 * 但后端**拿不到无歧义的起卦时刻**：前端传的 `divinationTime` 是按「当前所选
 * 历法」格式化的，农历输入时它长得像公历日期。
 *
 * 于是用 `lunarInfo` 里的**日柱 + 时柱**去验 `divinationTime`：
 *   `ganzhi.sizhu(divinationTime)` 的 day_gz / hour_gz 与前端给的**同时**相等，
 *   才算拿到真时刻（一个错日期同时撞对日柱与时柱几乎不可能）。
 * 验过就用后端算的四柱（月柱因此升级为精确版）；验不过就原样用前端的四柱 ——
 * **与改造前逐字相同**，即最坏情况不比以前差。
 */
'use strict';

const G = require('./ganzhi');
const M = require('./meihua');
const LY = require('./liuyao');

// method 代码 → 法名。键是**后端起卦法名**（time/number/split/character/manual），
// 前端页面现在直接送这几个名字，两边同一套词表。
// `num1`/`num2` 是**前端历史记录**里的旧代码（拆半求和 / 三数），别名留着，
// 否则那些老记录在 prompt 里会退化成把代码原样印出来。
// `auto` 也不是后端起卦法（后端无「随机」）：前端抽签后按 manual 入后端，
// 记录里的展示名仍写 auto。故这个表比 METHOD_META 多两个键，是**给展示用**的。
const MHYS_METHOD_NAMES = {
  time: '时间起卦', manual: '手动指定', character: '字数起卦',
  number: '报数起卦（三个数）', split: '报数起卦（拆半求和）',
  num1: '数字起卦（拆半求和）', num2: '数字起卦（三数）',
  auto: '自动起卦',
};

const YAO_CN = ['初', '二', '三', '四', '五', '上'];

/**
 * 由 cardData 定四柱：能证明 `divinationTime` 是真时刻就用后端算的，否则用前端的。
 *
 * @returns {{yearGZ, monthGZ, dayGZ, hourGZ, monthZhi, verified, why}}
 */
function sizhuFromCard(cardData) {
  const li = (cardData && cardData.lunarInfo) || {};
  const fallback = {
    yearGZ: li.yearGZ || '',
    monthGZ: li.monthGZ || '',
    dayGZ: li.dayGZ || '',
    hourGZ: li.hourGZ || '',
    monthZhi: (li.monthGZ || '').length > 1 ? li.monthGZ[1] : '',
    verified: false,
    why: li.dayGZ ? '用前端四柱（起卦时刻无法证实）' : '无四柱可用',
  };
  const raw = (cardData && (cardData.divinationTime || cardData.createdAt)) || '';
  if (!raw || !li.dayGZ || !li.hourGZ) return fallback;
  try {
    const s = G.sizhu(raw);
    // 日柱 **与** 时柱同时对上才认：时柱本身由日干推出（乙庚丙作初），
    // 两柱同时撞对说明这个时刻就是起卦那一刻。
    if (s.day_gz !== li.dayGZ || s.hour_gz !== li.hourGZ) {
      fallback.why = '起卦时刻与前端日柱/时柱不符，改用前端四柱';
      return fallback;
    }
    return {
      yearGZ: s.year_gz,
      monthGZ: s.month_gz,
      dayGZ: s.day_gz,
      hourGZ: s.hour_gz,
      monthZhi: s.month_gz.length > 1 ? s.month_gz[1] : '',
      verified: true,
      why: '后端按起卦时刻重算四柱（日柱时柱与前端一致，已证实）',
    };
  } catch (e) {
    fallback.why = '起卦时刻解析失败，改用前端四柱';
    return fallback;
  }
}

/**
 * 由 cardData 重算梅花排盘。
 *
 * 只取 `hexagrams.benGua` 的**上下卦号与动爻**（起卦结果本身），其余全部重算。
 * 取不到卦号（老记录、字段缺失）时返回 `{ok:false}`，调用方退回前端数据 ——
 * 退回路径与改造前逐字相同。
 */
function meihuaChartFromCard(cardData) {
  const hx = (cardData && cardData.hexagrams) || {};
  const bg = hx.benGua || {};
  const moving = Array.isArray(bg.movingYao) ? bg.movingYao[0] : bg.movingYao;
  if (!Number.isInteger(bg.upper) || !Number.isInteger(bg.lower) || !Number.isInteger(moving)) {
    return { ok: false, reason: '拿不到上下卦号/动爻（旧记录？）' };
  }
  try {
    const sizhu = sizhuFromCard(cardData);
    const q = M.fromGua(bg.upper, bg.lower, moving);
    // 月支：由重算的月柱取；月柱没证实过就用前端的月支（日粒度，只在交节日
    // 交节时刻之前差一个月，故仍是当前能做到的最好）
    const monthDizhi = sizhu.monthZhi || '';
    const paipan = M.analyze(q, { question: (cardData && cardData.topic) || '', monthDizhi });
    paipan.qigua = q;
    return { ok: true, paipan, sizhu };
  } catch (e) {
    return { ok: false, reason: '重算失败：' + (e && e.message) };
  }
}

/**
 * 由**起卦原始参数**起卦并断卦 —— 「前端只渲染」的入口。
 *
 * 与 `meihuaChartFromCard`（只取卦号、其余重算）的分工：那个是老记录/AI 对话
 * 那条路的兼容层，**起卦结果仍然是前端算的**；这个才是目标形态 —— 前端把
 * 方法与其原始输入交上来，**卦由后端起**，前端连「上下卦号是多少」都不再自己算。
 *
 * 为什么非要有这一条（不是为了好看）：
 * * **字占**根本在前端做不了 —— 笔画表 6944 字在 `paipan/strokes.js`，前端没有。
 * * **「动爻加时辰」的时辰**：前端那个勾选框取的是 `new Date()`（真实时钟），
 *   不是页面上选定的起卦时刻。后端拿 `datetime` 起卦，用的是**提交上来的时刻**，
 *   与页面显示、与存进记录的起卦时间一致。这一条会改变那部分用户的卦（见
 *   `duipan/verify_qigua_vs_front.js` 的登记项），属**有意纠正**而非漂移。
 *
 * @param {object} p 起卦参数（前端提交的 body 原样）
 * @param {string} [p.method] time|number|character|split|manual
 * @param {string} [p.datetime] 起卦时刻（ISO 字符串）
 * @param {number} [p.addShichen] 真值时把该时刻的时辰序加进动爻的和
 * @returns {{ok:boolean, reason?:string, paipan?:object, qigua?:object, sizhu?:object}}
 */
function meihuaChartFromParams(p) {
  const b = p || {};
  const method = String(b.method || '');
  const dtStr = b.datetime ? String(b.datetime) : '';
  // 既有 datetime 也有直接的 dt 时以 datetime 为准（两者语义相同，前端只该给一个）
  const dt = dtStr || (b.dt ? String(b.dt) : null);

  // 时间起卦**必须**给时刻。缺了就报错，不许让 `qiguaTime()` 退回「服务器当前时刻」
  // —— 那样同一份请求在不同时刻得到不同卦，而 AI 会把那个卦讲得头头是道，
  // 用户与调用方都看不出来。
  if (method === 'time' && !dt) return { ok: false, reason: '时间起卦需要给出起卦时刻' };
  if (method === 'split' && !Array.isArray(b.digits)) {
    return { ok: false, reason: '拆半求和需要给出各位数字（digits）' };
  }

  // 加时辰：时辰序取**起卦时刻**的（不是服务器当前时刻）。没有时刻就没得加，
  // 此时**报错而不是静默忽略** —— 静默会让「勾了加时辰」与「卦里没加」不一致。
  let extra = 0;
  if (b.addShichen) {
    if (!dt) return { ok: false, reason: '「动爻加时辰」需要同时给出起卦时刻' };
    try {
      extra = M.hourNumAt(G.normalize(dt).h);
    } catch (e) {
      return { ok: false, reason: '起卦时刻解析失败，无法取时辰：' + (e && e.message) };
    }
  }

  const args = {
    dt: dt || undefined,
    num1: b.num1, num2: b.num2,
    num3: b.num3 === undefined ? null : b.num3,
    extra,
    text: b.text,
    strokes: b.strokes === undefined ? null : b.strokes,
    digits: b.digits,
    upper: b.upper, lower: b.lower, moving: b.moving,
  };

  let q;
  try {
    q = M.qigua(method, args);
  } catch (e) {
    return { ok: false, reason: (e && e.message) || '起卦失败' };
  }

  // 四柱与月支：能给时刻就给**精确版**（与全项目口径一致），给不出就留空 ——
  // 留空时 `analyze` 会走它自己的防御分支（`strength.available=false`），
  // 这是已对拍过的形状，不许在这里编一个近似月支顶上。
  let sizhu = null;
  let monthDizhi = '';
  if (dt) {
    try {
      const s = G.sizhu(dt);
      sizhu = s;
      monthDizhi = (s.month_gz || '').length > 1 ? s.month_gz[1] : '';
    } catch (e) { sizhu = null; }
  }

  try {
    const paipan = M.analyze(q, { question: b.topic || b.question || '', monthDizhi });
    paipan.qigua = q;
    return { ok: true, paipan, qigua: q, sizhu };
  } catch (e) {
    return { ok: false, reason: '断卦失败：' + (e && e.message) };
  }
}

/** 五卦一行：`本卦：雷风恒（第32卦）｜上卦 震(木)｜下卦 巽(木)｜主…` */
function guaLine(label, g, note) {
  return `${label}：${M.hexName(g.upper.number, g.lower.number)}`
    + `（第${g.number}卦）｜上卦 ${g.upper.name}(${g.upper.wuxing})`
    + `｜下卦 ${g.lower.name}(${g.lower.wuxing})`
    + (note ? `｜${note}` : '');
}

/**
 * 梅花排盘 → 文本块。**这是给 LLM 看的全部事实**，解读只许引用、不许另编。
 *
 * 真源 `meihua.analyze()`，它返回的 `evidence` 是逐条依据 —— 解读层逐条引用即可，
 * 「结论」始终由算法给出，LLM 换不掉也编不出。
 */
function meihuaBlock(paipan) {
  const g = paipan.gua;
  const L = [];
  L.push(guaLine('本卦', g.main));
  L.push(guaLine('互卦', g.mutual, '主事情之过程'));
  L.push(guaLine('变卦', g.changed, '主事情之结局'));
  L.push(guaLine('错卦', g.opposite, '主事情之反面'));
  L.push(guaLine('综卦', g.reversed, '主事情之对方视角'));
  L.push(`动爻：第 ${paipan.moving_lines.join('、')} 爻动`
    + `（自下而上计，即${YAO_CN[paipan.moving_lines[0] - 1]}爻）`);

  const ty = paipan.ti_yong;
  // `position` 是个**对象**（`{yong, ti, note}`），不是字符串 —— 取用卦所在的那一侧
  // 要看 `.yong`。别写成 `ty.position === 'lower'`：那样两边都不等，恒判为「上卦」，
  // 于是动爻在下卦时这一行会**说反**（而它读起来毫无破绽，用户看不出来）。
  const yongIsLower = ty.position.yong === 'lower';
  L.push(`【体用】体卦 ${ty.ti.name}(${ty.ti.wuxing}，${ty.ti.nature})`
    + `｜用卦 ${ty.yong.name}(${ty.yong.wuxing}，${ty.yong.nature})`
    + `｜动爻在${yongIsLower ? '下' : '上'}卦，故${yongIsLower ? '下' : '上'}卦为用`);
  if (ty.note) L.push(`体用取法说明：${ty.note}`);

  const rel = paipan.relations.ti_yong;
  L.push(`【体用关系】${rel.relation}（${rel.level}）——${rel.text}`);
  const st = paipan.strength;
  if (st && st.available) {
    L.push(`【体气】${st.text}`
      + (paipan.main_level !== rel.level
        ? `；体气既${st.label}，原判「${rel.level}」降一档为「${paipan.main_level}」` : ''));
  } else {
    L.push('【体气】本次未取到月支，不作四时旺衰判断');
  }
  L.push(`【过程】${paipan.relations.mutual.text}`);
  L.push(`【结局】${paipan.relations.changed.text}`);
  L.push(`【总断】合观体用、互卦、变卦，总断为「${paipan.verdict}」（分档 −2 大凶 … +2 大吉，本次 ${paipan.score}）`);
  L.push(`【应期】${paipan.yingqi.text}`);
  L.push('');
  L.push('【断卦依据】（逐条引用，不要另立一套说辞）');
  for (const e of paipan.evidence || []) L.push('- ' + e);
  return L.join('\n');
}

/** 梅花起卦法的出处说明（用于让 AI 能提到出处） */
function methodInfo(cardData, paipan) {
  const code = (cardData && cardData.method) || '';
  const name = MHYS_METHOD_NAMES[code] || (paipan && paipan.method_name) || '';
  const nums = (cardData && cardData.numbers) || '';
  return { name, nums };
}

/**
 * 梅花模板变量。**沿用改造前的变量名**（后台 `prompts.json` 里的自定义模板
 * 引用的就是这些名字），新增的变量一律另起名，不覆盖旧语义。
 */
function mhysVars(topic, cardData, ragContext) {
  const hx = (cardData && cardData.hexagrams) || {};
  const bg = hx.benGua || {};
  const c = meihuaChartFromCard(cardData);
  const v = {
    topic: topic || '',
    ragContext: ragContext || '',
  };

  if (c.ok) {
    const p = c.paipan;
    const g = p.gua;
    v.benGuaName = M.hexName(g.main.upper.number, g.main.lower.number);
    v.benGuaUpper = g.main.upper.name;
    v.benGuaLower = g.main.lower.name;
    v.huGuaName = M.hexName(g.mutual.upper.number, g.mutual.lower.number);
    v.huGuaUpper = g.mutual.upper.name;
    v.huGuaLower = g.mutual.lower.name;
    v.bianGuaName = M.hexName(g.changed.upper.number, g.changed.lower.number);
    v.bianGuaUpper = g.changed.upper.name;
    v.bianGuaLower = g.changed.lower.name;
    v.cuoGuaName = M.hexName(g.opposite.upper.number, g.opposite.lower.number);
    v.cuoGuaUpper = g.opposite.upper.name;
    v.cuoGuaLower = g.opposite.lower.name;
    v.zongGuaName = M.hexName(g.reversed.upper.number, g.reversed.lower.number);
    v.zongGuaUpper = g.reversed.upper.name;
    v.zongGuaLower = g.reversed.lower.name;
    v.tiName = p.ti_yong.ti.name;
    v.tiElement = p.ti_yong.ti.wuxing;
    v.yongName = p.ti_yong.yong.name;
    v.yongElement = p.ti_yong.yong.wuxing;
    const rel = p.relations.ti_yong;
    v.tiyongVerdict = `${rel.relation} · ${rel.level}`;
    v.tiyongDesc = rel.text;
    v.tiyongLevel = rel.level;
    v.movingYao = '第' + p.moving_lines.join('、') + '爻动';
    v.paipan = meihuaBlock(p);
    v.verdict = p.verdict;          // 综合分级（含互卦/变卦微调）
    v.mainLevel = p.main_level;     // 体用基础分级（含四时旺衰调整）
    v.score = String(p.score);
    v.strengthText = p.strength && p.strength.available ? p.strength.text : '';
    v.yingqiText = p.yingqi.text;
    v.evidenceText = (p.evidence || []).map((e) => '- ' + e).join('\n');
    v.methodName = methodInfo(cardData, p).name;
    v.methodNumbers = methodInfo(cardData, p).nums;
    v.formula = (p.derivation && p.derivation.formula) || '';
    v.sizhuSource = c.sizhu.verified ? '后端重算' : '前端四柱';
    return v;
  }

  // ── 退回：改动前的行为，逐字保留 ──
  const hg = hx.huGua || {}, bng = hx.bianGua || {}, cg = hx.cuoGua || {}, zg = hx.zongGua || {};
  const ti = hx.ti || {}, yong = hx.yong || {};
  const ver = hx.verdict || {};
  const nm = (o) => (o || {}).name || '';
  v.benGuaName = bg.name || ''; v.benGuaUpper = nm(bg.upperTri); v.benGuaLower = nm(bg.lowerTri);
  v.huGuaName = hg.name || ''; v.huGuaUpper = nm(hg.upperTri); v.huGuaLower = nm(hg.lowerTri);
  v.bianGuaName = bng.name || ''; v.bianGuaUpper = nm(bng.upperTri); v.bianGuaLower = nm(bng.lowerTri);
  v.cuoGuaName = cg.name || ''; v.cuoGuaUpper = nm(cg.upperTri); v.cuoGuaLower = nm(cg.lowerTri);
  v.zongGuaName = zg.name || ''; v.zongGuaUpper = nm(zg.upperTri); v.zongGuaLower = nm(zg.lowerTri);
  v.tiName = nm(ti.tri); v.tiElement = (ti.tri || {}).element || '';
  v.yongName = nm(yong.tri); v.yongElement = (yong.tri || {}).element || '';
  v.tiyongVerdict = ver.text || ''; v.tiyongDesc = ver.desc || ''; v.tiyongLevel = ver.level || '';
  v.movingYao = bg.movingYao && bg.movingYao.length
    ? '第' + bg.movingYao.join('、') + '爻动' : '无动爻';
  v.paipan = '';
  v.verdict = ver.level || '';
  v.mainLevel = ver.level || '';
  v.score = ver.score == null ? '' : String(ver.score);
  v.strengthText = '';
  v.yingqiText = '';
  v.evidenceText = '';
  v.methodName = MHYS_METHOD_NAMES[(cardData && cardData.method) || ''] || '';
  v.methodNumbers = (cardData && cardData.numbers) || '';
  v.formula = '';
  v.sizhuSource = '前端（未能重算：' + c.reason + '）';
  return v;
}

function genderLabel(hexagrams) {
  const g = (hexagrams || {}).gender;
  if (g === 'male') return '男';
  if (g === 'female') return '女';
  return '未知';
}

/**
 * 装卦：由**起卦原始数据**（上下卦号 + 四柱）装出完整盘面。
 *
 * 端点 `/api/liuyao/paipan` 给前端渲染的和 prompt 给 AI 读的，必须是**同一次**
 * 装卦的结果。两处各写一遍 `buildChart` 调用，参数一旦有一边漏改就会分叉 ——
 * 而分叉的表现是「AI 的解读与用户眼前的盘对不上」，两边各自看都正常。
 * 故只有这一个出口。
 *
 * @returns {{chart: object|null, sizhu: object}} 装不出来时 `chart` 为 null
 *   （调用方各自兜底：prompt 用 `liuyaoFallbackText`，端点回 400）
 */
function liuyaoChartFromCard(cardData, topic) {
  const hx = (cardData && cardData.hexagrams) || {};
  const bg = hx.benGua || {}, bng = hx.bianGua || {};
  const sz = sizhuFromCard(cardData);
  let chart = null;
  if (Number.isInteger(bg.upper) && Number.isInteger(bg.lower)) {
    try {
      chart = LY.buildChart({
        topic: topic || '',
        gender: hx.gender || '',
        isProxy: !!hx.isProxy,
        benUpper: bg.upper, benLower: bg.lower,
        bianUpper: bng.upper, bianLower: bng.lower,
        yearGZ: sz.yearGZ, monthGZ: sz.monthGZ, dayGZ: sz.dayGZ, hourGZ: sz.hourGZ,
      });
    } catch (e) {
      chart = null;
    }
  }
  return { chart, sizhu: sz };
}

/** 六爻模板变量。沿用改造前的变量名。 */
function liuyaoVars(topic, cardData, ragContext) {
  const hx = (cardData && cardData.hexagrams) || {};
  const bg = hx.benGua || {}, bng = hx.bianGua || {};
  const built = liuyaoChartFromCard(cardData, topic);
  const chart = built.chart, sz = built.sizhu;
  // 卦名/上下卦名**优先取重算结果**，与 `paipan` 正文同源。改造前这四个变量
  // 取的是前端给的 `benGua.name` 等 —— 前端一旦算错，正文（后端）与这四个变量
  // （前端）就会互相矛盾，而模板里可能同时引用两者。
  const bi = chart && chart.bian;
  return {
    topic: topic || '',
    gender: genderLabel(hx),
    benGuaName: (chart && chart.ben.name) || bg.name || '',
    benGuaUpper: (chart && chart.ben.upperName) || ((bg.upperTri || {}).name || ''),
    benGuaLower: (chart && chart.ben.lowerName) || ((bg.lowerTri || {}).name || ''),
    bianGuaName: (bi && bi.name) || bng.name || '',
    bianGuaUpper: (bi && bi.upperName) || ((bng.upperTri || {}).name || ''),
    bianGuaLower: (bi && bi.lowerName) || ((bng.lowerTri || {}).name || ''),
    paipan: chart ? LY.formatChart(chart) : liuyaoFallbackText(bg, bng),
    yongshen: chart && chart.yongShen ? (chart.yongShen.yong || '') : '',
    yongshenWhy: chart && chart.yongShen ? (chart.yongShen.why || '') : '',
    // 用神那一整行**在 Js 里拼好**、整行或空串二选一，而不是让模板写
    // 「【用神参考】{{yongshenWhy}}（即{{yongshen}}）」：装卦失败时后者会渲染出
    // 「【用神参考】（即）。若与卦中…」这种**看着像有内容、其实全空**的句子，
    // 而 AI 会照样顺着它编。缺了就不出现，是这个变量存在的全部理由。
    yongshenLine: yongshenLine(chart),
    sizhuSource: sz.why,
    ragContext: ragContext || '',
  };
}

/**
 * 装卦失败时的兜底正文。**逐字沿用改造前那一份**（含那句「数据不完整」的
 * 自我声明）—— 它保证 AI 收到空盘面时不至于什么都不说、也不至于凭空装卦。
 */
function liuyaoFallbackText(bg, bng) {
  return '【卦象】\n'
    + '本卦：' + ((bg || {}).name || '未知') + '　变卦：' + ((bng || {}).name || '未知') + '\n'
    + '（注意：本次排盘数据不完整，六亲六神世应未能装出，请在解读中说明并只作卦名卦意的粗断。）';
}

/**
 * 用神行；无 used 用神时返回空串（见 `liuyaoVars` 里的理由）。
 *
 * **带自己的尾随空行** —— 于是模板里紧挨下一句写 `{{yongshenLine}}断法要求：…`，
 * 有无用神两种情形渲染出来与改造前那份手拼的字符串**逐字相同**：
 *   有用神 → `…盘面\n\n【用神参考】…\n\n断法要求：…`
 *   无     → `…盘面\n\n断法要求：…`
 * 若改成「模板自带空行 + 空串替换」，无用神时会多出两个换行 —— 对 prompt 无害，
 * 但那就不是逐字相同了，对拍时得为它写一条申报，不值当。
 */
function yongshenLine(chart) {
  const ys = chart && chart.yongShen;
  if (!ys || !ys.yong) return '';
  return '【用神参考】' + ys.why + '（即' + ys.yong + '）。'
    + '若与卦中实际衰旺、动静冲突，以卦理为准，不必强套。\n\n';
}

// ─────────────────────────────────────────────────────────────
// 内置默认模板（后台 prompts.json 里同名键优先）
//
// 梅花与六爻的**输出结构逐字相同**（参考古籍 → 一、回答答案 → 二、你的现状 →
// 三、解卦逻辑 → 补充）。这是用户唯一明确满意的部分（三段式大白话），
// 别另创风格、别改顺序（见 memory「ai3000 north star」）。
// ─────────────────────────────────────────────────────────────

const DEFAULT_MHYS_PROMPT = `以下是一组梅花易数排盘数据。

【求测事项】{{topic}}

【起卦】{{methodName}}{{methodNumbers}}
【卦象】
{{paipan}}

你是精通《梅花易数》《皇极经世心易发微》的解卦者。按传统梅花断法分析，重体用，参互卦、变卦，不可机械地只凭生克直接定死吉凶，需结合卦象本义、事项类型与整体趋势综合判断。
上方【断卦依据】是算法按《体用总诀》逐条推出来的，**逐条引用它**，不要另立一套吉凶。

请严格按以下顺序输出，每段以"---"分隔：

【参考古籍】
- 若上方确有【参考古籍】内容，请在回答最开头列出本次实际检索到的古籍名称。
- 若上方没有【参考古籍】内容（本次未检索到），**不要凭印象列书名**，这一段直接写"本次未检索到相关古籍，以下依卦理分析"即可。
- 古籍段落只放开头，不要放到末尾，也不要重复。

【一、回答答案】
- 直接回答用户最想知道的结果。
- 先说结论，不要先铺垫，不要先讲术语。
- 只说结果、走向、是否有转机，尽量白话。

【二、你的现状】
- 描述用户当前处境、状态、主要矛盾与隐藏变数。
- 以白话表达，不要堆术语。

【三、解卦逻辑】
- 再说明本卦、互卦、变卦、错卦、综卦与体用生克如何影响此事。
- 重点说明：体为主，用为应；用卦主当前，互卦主过程，变卦主后势。
- 若有阻力，也要说明是否有救、是暂阻还是终阻。

要求：
- 前两段以用户最容易看懂为先。
- 第三段再讲术数依据。
- 体用生克的吉凶分级（如"用生体 · 大吉"）是《体用总诀》的定则，照实引用即可；但不要把它推成"必然""注定"这类宿命断语，多用"可能""倾向"。
- 除上述体用分级外，避免其他绝对化断语。
- 语言简洁、明确，不空泛，不神叨。
- 用**加粗**标结论重点（会显示金色），###子标题适度。

【四、补充】末尾单独一段，自然引导：「如有更多具体情况可补充，方便做更细致解读。」`;

const DEFAULT_LIUYAO_PROMPT = `以下是一组六爻排盘数据。请按传统六爻断法分析，不可脱离用神主线泛讲六亲六神。

【求测事项】{{topic}}
【求测者性别】{{gender}}

{{paipan}}

{{yongshenLine}}断法要求：先定用神，再看月建日辰旺衰，再看世应、动爻、变爻、生克冲合、空破墓绝。月建为提纲，日辰为主宰；世为己，应为人；动为始，变为终。六神只作辅助，不可压过用神主线。

请严格按以下顺序输出，每段以"---"分隔：

【参考古籍】
- 若上方确有【参考古籍】内容，请在回答最开头列出本次实际检索到的古籍名称。
- 若上方没有【参考古籍】内容（本次未检索到），**不要凭印象列书名**，开头【参考古籍】一段直接写"本次未检索到相关古籍，以下依卦理分析"即可。
- 古籍段落只放开头，不要放到末尾，也不要重复。

【一、回答答案】
- 直接说结果、倾向、成败、快慢。
- 不要先讲原理，不要先铺垫。
- 先把用户最想知道的答案说明白。

【二、你的现状】
- 只描述当前处境、矛盾、卡点、对方状态或环境态势。
- 尽量白话，不堆术语。

【三、解卦逻辑】
- 再说明用神、世应、月建、日辰、动爻、变爻对结果的影响。
- 若见空亡、月破、入墓、伏神、合绊、回头生、回头克，只分析与主事相关者。
- 若卦象显示可成但迟、能成但反复、表面可成实则落空，必须明确说出。

要求：
- 前两段先给用户想看的内容，第三段再展开术数依据。
- 语言简洁，判断明确，不空泛。
- 避免绝对化断语，多用“可能”“倾向”。
- 用**加粗**标结论重点，###子标题适度。

【补充引导】末尾单独一段，自然引导："如有更多具体情况可补充，方便做更细致解读。"`;

// ── 无事项时用的模板 ──
//
// ⚠ 这两条**必须带全盘面**。改造前它们是两句不带变量的一行字（
// 「你是一位…解卦师。用户还没说问什么事，请用一句话简短询问。」），
// 于是「事项留空点自动解析」这条路**把已经排好的盘整个丢掉**：
// AI 收到的那一句话里没有任何卦，只能回「我还没有收到具体的卦象数据」，
// 再顺着系统提示词里的起卦规则让用户去报三个数字 —— 线上实测就是这样。
// 用户明明已经摇完卦了，却被要求报数重新起卦。
//
// 正确行为：盘照给，只是**先简短点一句盘面、再问求测什么事**。
const DEFAULT_LIUYAO_NOTOPIC = `以下是一组六爻排盘数据。用户**还没有说明求测事项**（下面【求测事项】是空的）。

【求测者性别】{{gender}}

{{paipan}}

{{yongshenLine}}用户没给事项，因此**先不要下吉凶结论**——用神取法取决于所问何事（问财看妻财、问工作看官鬼、问感情男女各有所主）。现在只做两件事：

【一、盘面】用一两句白话点出这盘最显眼的地方：本卦是什么、世应落在哪、哪几爻动、变了什么卦。**不加吉凶判断。**
【二、问事项】一句话问清他想测什么（感情/事业/财运/健康/出行/其他），并说明说了之后能怎么帮他看。

要求：简短，别长篇大论；别用绝对化断语；用**加粗**标重点。
（本次检索到的古籍若在下方，**不要列书名**——只做两句盘面说明时列书名是噪音，留到用户说了事项再引。）

{{ragContext}}`;

const DEFAULT_MHYS_NOTOPIC = `以下是一组梅花易数排盘数据。用户**还没有说明求测事项**（下面【求测事项】是空的）。

【卦象】本卦：{{benGuaUpper}}上{{benGuaLower}}下 → {{benGuaName}}　互卦：{{huGuaName}}　变卦：{{bianGuaName}}　错卦：{{cuoGuaName}}　综卦：{{zongGuaName}}
【体用】体卦：{{tiName}}｜用卦：{{yongName}}｜生克：{{tiyongVerdict}}

{{paipan}}

用户没给事项，因此**先不要下吉凶结论**——梅花看体用，但要结合所问何事才能落到具体人事物上。现在只做两件事：

【一、盘面】用一两句白话点出这盘最显眼的地方：本卦、互卦、变卦各是什么，体用生克是哪种关系。**不加吉凶判断。**
【二、问事项】一句话问清他想测什么（感情/事业/财运/健康/出行/其他），并说明说了之后能怎么帮他看。

要求：简短，别长篇大论；别用绝对化断语；用**加粗**标重点。
（本次检索到的古籍若在下方，**不要列书名**——只做两句盘面说明时列书名是噪音，留到用户说了事项再引。）

{{ragContext}}`;

// ⚠ 这里原来比六爻那份**多一个空行**（`{{topic}}` 之后连着两个空行）—— 是从六爻
// 那份模板抄过来时留下的：六爻中间还有一个 `{{paipan}}` 块，梅花没有，于是那两行
// 空行在梅花这里成了连着的两个。`duipan/verify_prompt_refactor.js` ⑤ 逐行对拍把
// 它抓出来了（2026-09-25）：**除已申报的 context 1000→1200 外，还应逐字相同**。
// 少一个空行不改变模型看到的内容，但模板层的对拍要求逐字节，故删。
const DEFAULT_MHYS_FOLLOWUP = `针对「{{topic}}」的追问：

【之前解读】{{context}}

【追问】{{followUp}}

请直接回答追问，不重复完整分析。结构：
【一、回答】——结论和建议，不用卦象术语。
【二、思路】（可选）——一两句推演依据。`;

const DEFAULT_LIUYAO_FOLLOWUP = `针对「{{topic}}」的追问：

{{paipan}}

【之前解读】{{context}}

【追问】{{followUp}}

直接回答追问，不重复完整七层分析。聚焦追问涉及的层面（如问应期则重点推应期，问空亡则重点辨空亡真假）。结构：
【回答】——结论和建议，不用卦象术语。
【依据】——简短推演依据（1-3句，引用原卦爻位）。`;

module.exports = {
  sizhuFromCard, meihuaChartFromCard, meihuaChartFromParams, meihuaBlock, mhysVars,
  liuyaoChartFromCard, liuyaoVars, yongshenLine, liuyaoFallbackText,
  MHYS_METHOD_NAMES, YAO_CN,
  DEFAULT_MHYS_PROMPT, DEFAULT_LIUYAO_PROMPT,
  DEFAULT_MHYS_NOTOPIC, DEFAULT_LIUYAO_NOTOPIC,
  DEFAULT_MHYS_FOLLOWUP, DEFAULT_LIUYAO_FOLLOWUP,
};

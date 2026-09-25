/**
 * paipan/liuyao.js —— 六爻纳甲装卦 + 盘面文本化
 * ================================================
 *
 * 把「本卦/变卦的上下卦号 + 四柱」装成完整的六爻盘，并渲染成喂给 AI 的文本块。
 *
 * 六亲一律以**本卦之宫**论（含变爻），这是六爻通则。
 * 爻序一律升序 [初,二,三,四,五,上]，下标 0..5。
 *
 * ── 真源分层（改本文件前先看清哪一层归谁） ──────────────────────
 *   - 装卦表：纳甲地支 / 纳甲天干 / 六神 / 八宫世应 / 六亲取法 / 旬空 / 月令旺衰
 *     → ./constants.js
 *   - 卦身：《增删卜易·卷一·安卦身诀》阳世从子起、阴世从午起
 *   - 断卦关系层（十二长生 / 进退神 / 化变五关系 / 化合化冲 / 三合三会 / 动静）
 *     → ./relations.js。该层逐字移植 shushu 并经四层对拍，
 *     **本文件不再自造这批判定**，一律调用之。
 *   - 用神层（事项匹配 / 用神取定 / 原神忌神仇神 / 伏神 / 世身）
 *     → ./yongshen.js。同样逐字移植并经对拍（层 6）。
 *
 *   本文件仅存的自家判定只有两处，且都由上面那批**已核的地支关系表**
 *   （LIU_CHONG / LIU_HE / SHENG / KE）直接推出，不带独立口径：
 *     ① 月建/日辰与本爻的初级关系（临月建 / 月破 / 临日辰 / 日破 / 日合 / 日生 / 日克）
 *     ② 卦型（六冲卦 / 六合卦）
 *
 * ── 两套「伏神」不要混（2026-09-24 用神层落地后） ─────────────────
 *   - `yongShen.fu_shen`：**按用神取**的伏神，shushu 口径，带飞伏关系与 severity。
 *     用神已在卦中显象时为 null。命理上的「伏神」指的就是这个。
 *   - `fuShenAbsent`：本卦**未现身**的全部六亲及其伏位，仅是那张表的附产物，
 *     供参考（例如用神是官鬼而妻财不上卦，仍值得知道）。**不是**断卦意义上的伏神。
 */

'use strict';

const C = require('./constants');
const G = require('./ganzhi');
const R = require('./relations');
const Y = require('./yongshen');

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

/** 六冲卦 / 六合卦：上三爻与下三爻对应相冲（初↔四、二↔五、三↔上）为六冲卦，对应相合为六合卦 */
function guaHeChong(branches) {
  let chong = 0, he = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (C.LIU_CHONG[branches[i]] === branches[j]) chong++;
      if (C.LIU_HE[branches[i]] === branches[j]) he++;
    }
  }
  let chongGua = true;
  for (let i = 0; i < 3; i++) {
    if (C.LIU_CHONG[branches[i]] !== branches[i + 3]) { chongGua = false; break; }
  }
  let heGua = true;
  for (let i = 0; i < 3; i++) {
    if (C.LIU_HE[branches[i]] !== branches[i + 3]) { heGua = false; break; }
  }
  return { chongPairs: chong, hePairs: he, isChongGua: chongGua, isHeGua: heGua };
}

/**
 * 装卦主函数
 *
 * @param {Object} o
 * @param {number} o.benUpper  本卦上卦号 1..8
 * @param {number} o.benLower  本卦下卦号 1..8
 * @param {number} [o.bianUpper] 变卦上卦号（无动爻可省）
 * @param {number} [o.bianLower] 变卦下卦号
 * @param {string} [o.yearGZ]  @param {string} [o.monthGZ]
 * @param {string} [o.dayGZ]   @param {string} [o.hourGZ]
 * @param {boolean} [o.liuShen] 是否计算六神（默认 true）
 * @param {string} [o.topic]  求测事项（显式指定，优先于 question 关键词）
 * @param {string} [o.question] 用户问句，用于推断事项
 * @param {string} [o.gender]  'male' | 'female'（默认 male，同 shushu）
 * @param {boolean} [o.isProxy] 是否代占
 * @returns {Object} 完整盘面
 */
function buildChart(o) {
  o = o || {};
  const benUpper = Number(o.benUpper), benLower = Number(o.benLower);
  if (!benUpper || !benLower) return null;

  const yearGZ = o.yearGZ || '';
  const monthGZ = o.monthGZ || '';
  const dayGZ = o.dayGZ || '';
  const hourGZ = o.hourGZ || '';

  const monthZhi = monthGZ ? monthGZ[1] : '';
  const dayGan = dayGZ ? dayGZ[0] : '';
  const dayZhi = dayGZ ? dayGZ[1] : '';
  const kong = dayGZ ? C.getKongWang(dayGZ) : [];

  // 求测事项 / 性别 / 代占 —— 用神层需要，取法同 shushu interpreter.interpret
  const topic = Y.resolveTopic(o.topic, o.question);
  const gender = o.gender || 'male';
  const isProxy = !!o.isProxy;

  // 本卦结构
  const palace = C.getPalace(benUpper, benLower);
  const benLines = C.guaLines(benUpper, benLower);       // 升序 [初..上]
  const benNajia = C.NAJIA[benLower].slice(0, 3).concat(C.NAJIA[benUpper].slice(3, 6));
  // 纳甲天干：内卦取 inner、外卦取 outer（乾纳甲壬、坤纳乙癸，余卦内外同干）
  const benGan = [C.NAJIA_GAN[benLower].inner, C.NAJIA_GAN[benLower].inner, C.NAJIA_GAN[benLower].inner,
                  C.NAJIA_GAN[benUpper].outer, C.NAJIA_GAN[benUpper].outer, C.NAJIA_GAN[benUpper].outer];

  // 变卦结构 —— 若有变卦号就用；否则视为无动爻
  let bianUpper = o.bianUpper != null ? Number(o.bianUpper) : null;
  let bianLower = o.bianLower != null ? Number(o.bianLower) : null;

  // 动爻：本卦与变卦爻象不同之处
  let moving = [];
  if (bianUpper && bianLower) {
    const bl = C.guaLines(bianUpper, bianLower);
    for (let i = 0; i < 6; i++) if (benLines[i] !== bl[i]) moving.push(i + 1);
  }
  if (!bianUpper || !bianLower) {
    bianUpper = benUpper; bianLower = benLower;
  }
  const bianLines = C.guaLines(bianUpper, bianLower);
  const hasBian = bianUpper !== benUpper || bianLower !== benLower;
  const bianNajia = C.NAJIA[bianLower].slice(0, 3).concat(C.NAJIA[bianUpper].slice(3, 6));
  // 变爻天干取自**变卦**对应半卦（shushu annotate_with_najia 同此）
  const bianGan = [C.NAJIA_GAN[bianLower].inner, C.NAJIA_GAN[bianLower].inner, C.NAJIA_GAN[bianLower].inner,
                   C.NAJIA_GAN[bianUpper].outer, C.NAJIA_GAN[bianUpper].outer, C.NAJIA_GAN[bianUpper].outer];

  // 逐爻装卦
  const yaos = [];
  for (let i = 0; i < 6; i++) {
    const pos = i + 1;
    const yinYang = benLines[i];
    const dizhi = benNajia[i];
    const wuxing = C.DIZHI_WUXING[dizhi];
    const isMoving = moving.indexOf(pos) >= 0;

    const yao = {
      position: pos,
      yaoName: YAO_NAMES[i],
      yinYang,
      yang: yinYang === 1,
      tiangan: benGan[i],
      ganzhi: benGan[i] + dizhi,
      dizhi,
      wuxing,
      liuqin: C.getLiuQin(palace.palaceElement, wuxing),
      liushen: o.liuShen === false ? '' : C.getLiuShen(dayGan, pos),
      isShi: palace.shi === pos,
      isYing: palace.ying === pos,
      isMoving,
      kong: kong.indexOf(dizhi) >= 0,
      // 月令旺衰（旺相休囚死），对拍层 2 已验
      strength: monthZhi ? C.getStrength(wuxing, monthZhi) : '',
    };

    if (isMoving) {
      const cd = bianNajia[i];
      const cw = C.DIZHI_WUXING[cd];
      // 化变关系一律取自对拍层 4 的 relations.js，本文件不再自造进退神/回头生克
      const rel = R.analyzeChangedLineRelation({ branch: dizhi }, { branch: cd });
      const jt = R.checkJinTuiShen(dizhi, cd);
      yao.changed = {
        tiangan: bianGan[i],
        ganzhi: bianGan[i] + cd,
        dizhi: cd,
        wuxing: cw,
        // 变爻六亲亦以本卦之宫论
        liuqin: C.getLiuQin(palace.palaceElement, cw),
        jinTui: jt.type ? '化' + jt.type : '',
        huiTou: rel.relation || '',
        relation: rel,
        kong: kong.indexOf(cd) >= 0,
      };
    }
    yaos.push(yao);
  }

  // 本卦**未现身**的六亲及其伏位（从本宫首卦八纯卦同爻位取）。
  // ⚠ 这不是断卦意义上的「伏神」——按用神取的伏神在 chart.yongShen.fu_shen，
  //   见文件头注「两套伏神不要混」。这里只作参考信息。
  const present = new Set(yaos.map((y) => y.liuqin));
  const fuShenAbsent = [];
  const pureNajia = C.NAJIA[palace.palace].slice();
  for (let i = 0; i < 6; i++) {
    const fz = pureNajia[i];
    const fw = C.DIZHI_WUXING[fz];
    const fq = C.getLiuQin(palace.palaceElement, fw);
    if (!present.has(fq)) {
      if (yaos[i].liuqin !== fq && fuShenAbsent.every((x) => x.liuqin !== fq)) {
        fuShenAbsent.push({
          liuqin: fq, dizhi: fz, wuxing: fw, underPosition: i + 1,
          underYaoName: YAO_NAMES[i], underLiujin: yaos[i].liuqin,
        });
      }
    }
  }

  const branches = yaos.map((y) => y.dizhi);
  const heChong = guaHeChong(branches);

  // ── 断卦关系层（用神无关的那一半），入参键名对齐 shushu 调用点 ──
  const yaoIn = yaos.map((y) => ({
    dong: !!y.isMoving,
    zhi: y.dizhi,
    branch: y.dizhi,
    liu_qin: y.liuqin,
    is_changing: !!y.isMoving,
    changed_zhi: y.changed ? y.changed.dizhi : '',
  }));
  // shushu 的 changed_yaos 恒为 6 条，非动爻用本爻支补齐（interpreter.py:971）
  const changedIn = yaos.map((y) => ({
    branch: y.changed ? y.changed.dizhi : y.dizhi,
    liu_qin: y.liuqin,
  }));

  // ── 用神层 ──────────────────────────────────────────────────
  const ys = Y.resolveYongShen(yaos, palace, topic, gender, isProxy);
  // 用神相关的那三块（四神五行 / key_lines / summary）。
  // ⚠ 传 wuxing 是 ai3000 侧的补全（见 yongshen.js 头注 a）：用神为「世爻/应爻」
  //   时 shushu 只传 liuqin，四神恒空；这里把位置名解析成该爻的五行再传。
  //   用神为六亲名时两者取值完全一致（层 6 对拍已证）。
  const deepRel = Y.analyzeLiuyaoDeepRelations(
    yaoIn, changedIn,
    { liuqin: ys.primary, wuxing: ys.wuxing },
    monthZhi, dayZhi);

  // 伏神（按用神取，shushu 口径）：用神六亲不现于卦时才取；
  // 「综合」不取（其用神即世爻，永在卦中，伏神无意义），同 shushu interpreter.py:805
  let fuShen = null;
  if (topic && topic !== '综合') {
    const fl = Y.fuShenLiqinOf(topic, gender);
    if (fl) fuShen = Y.findFuShen(yaoIn, palace.palace, palace.palaceElement, fl);
  }

  const shiYao = yaos[palace.shi - 1];
  const shiShen = Y.getShiShen(palace.shi, shiYao.dizhi, yaoIn, monthZhi, dayZhi);

  return {
    topic: o.topic || '',
    gender: o.gender || '',
    method: o.method || '',
    // 四柱
    yearGZ, monthGZ, dayGZ, hourGZ,
    monthZhi, dayGan, dayZhi, kong,
    // 本卦
    ben: {
      name: C.getHexName(benUpper, benLower),
      upper: benUpper, lower: benLower,
      upperName: (C.TRIGRAMS[benUpper] || {}).name,
      lowerName: (C.TRIGRAMS[benLower] || {}).name,
      palace, lines: benLines,
    },
    // 变卦
    bian: hasBian ? {
      name: C.getHexName(bianUpper, bianLower),
      upper: bianUpper, lower: bianLower,
      upperName: (C.TRIGRAMS[bianUpper] || {}).name,
      lowerName: (C.TRIGRAMS[bianLower] || {}).name,
      lines: bianLines,
    } : null,
    yaos,
    moving,
    fuShenAbsent,
    heChong,
    // 用神层（shushu interpreter.py 口径）
    yongShen: {
      topic, gender, is_proxy: isProxy,
      names: ys.names,        // 用神名列表，首项为主用神
      primary: ys.primary,
      kind: ys.kind,          // '六亲' | '世应'
      on_chart: !!ys.yao,
      position: ys.yao ? ys.yao.position : null,
      liuqin: ys.liuqin, branch: ys.branch, wuxing: ys.wuxing,
      // 兼容旧字段（auth-server 模板变量 yongshen / yongshenWhy 在用）
      yong: ys.primary,
      why: yongShenWhy(topic, ys),
      fu_shen: fuShen,
      shi_shen: shiShen,
    },
    guaShen: (function () {
      const shiYao = yaos[palace.shi - 1];
      return { dizhi: C.getGuaShen(palace.shi, shiYao.yinYang), shiPosition: palace.shi };
    })(),
    // 断卦关系层完整产物（字段名照抄 shushu，供 formatChart 与对拍共用）
    deep: {
      line_details: R.lineDetails(yaoIn, monthZhi, dayZhi),
      changing_relations: R.changingRelations(yaoIn, changedIn),
      dong_jing_analysis: R.analyzeDongJing(yaoIn),
      hua_he_chong: R.analyzeHuaHeChong(yaoIn),
      sanhe_sanhui: R.detectSanheSanhui(yaoIn),
      // 用神相关的那三块，字段名照抄 shushu deep_relations
      yong_yuan_ji_chou: deepRel.yong_yuan_ji_chou,
      key_lines: deepRel.key_lines,
      summary: deepRel.summary,
    },
  };
}

/** 用神取定的一句白话理由（给 prompt 用）。纯按表拼装，不含表外说法。 */
function yongShenWhy(topic, ys) {
  const extra = (ys.names || []).slice(1).filter((n) => n !== '世爻' && n !== '应爻');
  const pos = ys.yao ? '（在' + YAO_NAMES[ys.yao.position - 1] + '）' : '（不上卦）';
  let s = `事项「${topic || '综合'}」以${ys.primary}为用神`;
  if (ys.kind === '六亲') s += pos;
  if (extra.length) s += `，次看${extra.join('、')}`;
  return s;
}

/**
 * 一爻的状态读数，一律写成 `系统:值`，避免两套旺衰被混为一谈。
 * d 为 deep.line_details[i]，可能缺省（无月支日支时）。
 *
 * 这里**同时**给出两套旺衰，是因为 shushu 两套都出、各有出处，缺一即少信息：
 *   - `月令:X`   四时旺衰（旺相休囚死，仅看月令）—— 对拍层 2 已验
 *   - `综合:X`   月日十二长生加权（极旺/旺相/中和/休囚/无气）—— 对拍层 4 已验
 * 两套**会不一致**（例如丑月午火「月令死」而「综合旺相」）。这是本来就该有的
 * 分歧，不是矛盾：古法以月建日辰定旺衰为主，十二长生另主气数（墓绝长生帝旺）。
 * 故此处只如实并列，并在盘面读法里点明，不替 AI 做合并。
 */
function stateFlags(y, d, monthZhi, dayZhi) {
  const f = [];
  if (y.kong) f.push('空');
  if (y.strength) f.push('月令:' + y.strength);

  if (monthZhi) {
    if (y.dizhi === monthZhi) f.push('月建:临');
    else if (d && d.is_yuepo) f.push('月建:月破');
  }
  if (d && d.month_chs && d.month_chs.status) f.push('月长生:' + d.month_chs.status);

  // 日辰为主宰，日冲/日合/日生克是断卦要点
  if (dayZhi) {
    if (y.dizhi === dayZhi) f.push('日辰:临');
    else if (d && d.is_ripo) f.push('日辰:日破');
    else if (C.LIU_HE[y.dizhi] === dayZhi) f.push('日辰:合');
    else if (C.SHENG[C.DIZHI_WUXING[dayZhi]] === y.wuxing) f.push('日辰:生');
    else if (C.KE[C.DIZHI_WUXING[dayZhi]] === y.wuxing) f.push('日辰:克');
  }
  if (d && d.day_chs && d.day_chs.status) f.push('日长生:' + d.day_chs.status);

  if (d && d.overall) f.push('综合:' + d.overall);
  if (y.isMoving) f.push('动');
  return f;
}

/**
 * 把盘面渲染成给 AI 的文本块。
 * 用传统的竖排盘式，AI 读这种格式最省力。
 */
function formatChart(chart) {
  if (!chart) return '';
  const L = [];
  const p = chart.ben.palace;
  const dayZhi = chart.dayZhi || '';
  const deep = chart.deep || {};
  const details = deep.line_details || [];
  const huaByLine = {};
  for (const h of deep.hua_he_chong || []) huaByLine[h.line] = h.type;

  L.push('【四柱】' + [chart.yearGZ, chart.monthGZ, chart.dayGZ, chart.hourGZ].filter(Boolean).join(' '));
  if (chart.monthZhi) {
    L.push('月建：' + chart.monthGZ + '（' + chart.monthZhi + '，' + C.DIZHI_WUXING[chart.monthZhi] + '）'
         + '　日辰：' + chart.dayGZ + (dayZhi ? '（' + dayZhi + '，' + C.DIZHI_WUXING[dayZhi] + '）' : ''));
  }
  if (chart.kong.length) L.push('旬空：' + chart.kong.join('、'));

  L.push('');
  L.push('【卦象】');
  L.push('本卦：' + chart.ben.name + '（' + p.palaceName + '宫 · ' + p.generation
       + ' · 世在' + YAO_NAMES[p.shi - 1] + ' 应在' + YAO_NAMES[p.ying - 1] + '）');
  if (chart.bian) {
    L.push('变卦：' + chart.bian.name + '（' + chart.bian.upperName + '上' + chart.bian.lowerName + '下）');
  } else {
    L.push('变卦：无（安静之卦，六爻不动）');
  }
  L.push('动爻：' + (chart.moving.length ? chart.moving.map((m) => YAO_NAMES[m - 1]).join('、') : '无'));
  if (chart.guaShen) L.push('卦身：' + chart.guaShen.dizhi + '（安卦身诀：世在' + YAO_NAMES[chart.guaShen.shiPosition - 1] + '）');
  const dj = deep.dong_jing_analysis;
  if (dj) L.push('卦势：' + dj.type + ' —— ' + dj.desc + ' ' + (dj.advice || ''));

  L.push('');
  L.push('【六爻纳甲】');
  L.push('（读法：`月令:X`＝四时旺衰（旺相休囚死，只看月令）；`月长生/日长生:X`＝十二长生；'
       + '`日辰:X`＝日辰与本爻的合冲生克（日破＝日辰冲爻）；`综合:X`＝月日十二长生加权。'
       + '两套旺衰不同源、可以不一致，古法以月建日辰为主、十二长生另主气数，勿混同）');
  L.push('爻位　六神　六亲　纳甲　　　爻象　　　　　　状态');
  for (let i = 5; i >= 0; i--) {
    const y = chart.yaos[i];
    const d = details[i];
    const mark = y.isShi ? '世' : (y.isYing ? '应' : '　');
    const bar = y.yang ? '▅▅▅▅▅' : '▅▅　▅▅';
    const flags = stateFlags(y, d, chart.monthZhi, dayZhi);

    let row = y.yaoName + mark + '　' + (y.liushen || '　') + '　' + y.liuqin + '　'
            + y.tiangan + y.dizhi + y.wuxing + '　' + bar;
    row += '　' + (flags.length ? '（' + flags.join('·') + '）' : '');
    if (y.changed) {
      // 去重：进退神在「化合化冲」与「化变五关系」两处都会出，同一爻只报一次
      const cm = Array.from(new Set([
        huaByLine[y.position], y.changed.huiTou, y.changed.jinTui, y.changed.kong ? '空' : '',
      ])).filter(Boolean).join('·');
      row += '　→　' + y.changed.tiangan + y.changed.dizhi + y.changed.wuxing + ' ' + y.changed.liuqin
           + (cm ? '（' + cm + '）' : '');
    }
    L.push(row);
  }

  // ── 【用神】────────────────────────────────────────────────
  // 全盘断卦的主线：先定用神，再看四神（原神/忌神/仇神），再看伏神与世身。
  const ys = chart.yongShen;
  if (ys) {
    L.push('');
    L.push('【用神】');
    L.push('用神：' + ys.primary + '　' + ys.why);
    if (ys.kind === '世应') {
      L.push('（用神取「' + ys.primary + '」——位置名而非六亲名，即卦中'
           + YAO_NAMES[ys.position - 1] + ' ' + ys.branch + ys.wuxing + '，'
           + '依事项表取定）');
    } else if (ys.on_chart) {
      const uy = chart.yaos[ys.position - 1];
      L.push('用神在卦中：' + YAO_NAMES[ys.position - 1] + ' ' + ys.branch + ys.wuxing
           + '（' + stateFlags(uy, details[ys.position - 1], chart.monthZhi, dayZhi).join('·') + '）');
    } else {
      L.push('用神不在卦中（' + ys.liuqin + '不上卦）——须看伏神');
    }

    // 四神五行与关键爻位一律照抄 shushu 的 summary 原文（零归一，勿另造措辞）
    for (const s of (deep.summary || [])) L.push('　' + s);

    if (ys.shi_shen && ys.shi_shen.he_zhi) {
      L.push('世身：' + ys.shi_shen.desc + '（' + ys.shi_shen.source + '）');
    }

    if (chart.fuShenAbsent && chart.fuShenAbsent.length) {
      L.push('参考：本卦未现身的六亲 → ' + chart.fuShenAbsent.map(
        (f) => f.liuqin + f.dizhi + f.wuxing + '伏' + f.underYaoName).join('、')
        + '（仅供参看，非按用神所取之伏神）');
    }
  }

  // ── 【伏神】（按用神取，shushu 口径）────────────────────────
  L.push('');
  const fu = ys && ys.fu_shen;
  if (fu) {
    L.push('【伏神】' + fu.desc);
    L.push('　飞伏关系：' + fu.emerge_type + '（' + fu.emerge_severity + '）');
  } else if (ys && ys.primary) {
    L.push('【伏神】无——用神' + ys.primary
         + (ys.kind === '世应' ? '即' + ys.primary + '本身，永在卦中' : '已在卦中显象'));
  } else {
    L.push('【伏神】无');
  }

  const hc = chart.heChong;
  if (hc.isChongGua) L.push('卦型：六冲卦（主散、主速、主变化）');
  if (hc.isHeGua) L.push('卦型：六合卦（主成、主缓、主羁绊）');

  // 三合三会：按 shushu 的全量检出照列；另注「何者为引」
  // （古法三合须有动爻或日辰月建牵引，静而合者力弱，故把牵引情况一并给出，
  //   由 AI 自行参断，不在此处替它删减）
  const ss = deep.sanhe_sanhui;
  if (ss) {
    const movingZhi = chart.yaos.filter((y) => y.isMoving).map((y) => y.dizhi);
    const howOf = (bs) => {
      const drv = bs.map((b) => (movingZhi.indexOf(b) >= 0 ? b + '动'
                              : (b === dayZhi ? b + '日辰'
                              : (b === chart.monthZhi ? b + '月建' : '')))).filter(Boolean);
      return drv.length ? '（' + drv.join('、') + '引）' : '（无动爻日辰月建牵引，静合）';
    };
    for (const s of ss.sanhe) L.push('三合：' + s.branches.join('') + '成' + s.name + howOf(s.branches));
    for (const s of ss.sanhui) L.push('三会：' + s.branches.join('') + '成' + s.name + howOf(s.branches));
    for (const s of ss.ban_sanhe) L.push('半合：' + s.branches.join('') + ' ' + s.name);
    if (!ss.sanhe.length && !ss.sanhui.length && !ss.ban_sanhe.length) L.push('三合三会：无');
  }

  return L.join('\n');
}

/**
 * 单个卦的宫与卦型 —— 盘面上卦名后面那个括号与底部那行标注要用。
 *
 * 本卦的这两项 `chart.ben.palace` / `chart.heChong` 已有；此处补**变卦**那一列
 * （变卦也要标宫名与六冲/六合）。六冲/六合按**本卦自己的纳甲地支**判
 * （`guaHeChong` 吃的是该卦的六个地支），与 `chart.heChong` 同一处口径。
 */
function guaMeta(hex) {
  if (!hex || !hex.upper || !hex.lower) return null;
  const pal = C.getPalace(hex.upper, hex.lower);
  const branches = C.NAJIA[hex.lower].slice(0, 3).concat(C.NAJIA[hex.upper].slice(3, 6));
  const hc = guaHeChong(branches);
  return {
    name: hex.name || C.getHexName(hex.upper, hex.lower),
    upperName: hex.upperName || (C.TRIGRAMS[hex.upper] || {}).name || '',
    lowerName: hex.lowerName || (C.TRIGRAMS[hex.lower] || {}).name || '',
    palaceName: pal ? pal.palaceName : '',
    palaceElement: pal ? pal.palaceElement : '',
    generation: pal ? pal.generation : '',
    isChongGua: hc.isChongGua,
    isHeGua: hc.isHeGua,
  };
}

/**
 * 盘面显示补充 —— **只给页面渲染，不进 AI 正文**。
 *
 * 用户 2026-09-25 给了六爻排盘的参考样式，其中这几项断卦正文不需要、
 * 而页面上有：农历、节气区间、四柱各自的旬空、神煞（驿马/桃花/日禄/卦身）、
 * 变卦整列的纳甲（地支·五行·纳甲干·六亲）、变卦的宫与卦型。
 *
 * 放进后端而不是让前端自己算：这几项全是历法与术数口径，前端再写一份就是
 * 又一处漂移源 —— 而「两边各算一份、慢慢对不上」正是本项目最痛的问题。
 *
 * **刻意不并进 `formatChart`**：那段正文必须与 AI 读到的那一段逐字相同，
 * 且已过对拍基准；在这里加行会动到基准。要让它进 AI 视野应另案，
 * 不要在「页面想显示某字段」的需求里夹带。
 *
 * @param {Object} cardData 起卦时的 card（要 `divinationTime` / `createdAt` 取节气）
 * @param {Object} chart    `buildChart` 的产物
 */
function displayMeta(cardData, chart) {
  const card = cardData || {};
  const c = chart || {};
  const out = {
    lunar: '', jieQi: null,
    kong: { year: '', month: '', day: '', hour: '' },
    shensha: { guaShen: '', yiMa: '', taoHua: '', riLu: '' },
    ben: guaMeta(c.ben), bian: guaMeta(c.bian),
    bianLines: [],
  };

  // 起卦时刻：与 `prompt.sizhuFromCard` 同一取法（divinationTime 优先，退回 createdAt）
  const when = card.divinationTime || card.createdAt || '';
  if (when) {
    try { out.jieQi = G.jieQiRange(when); } catch (e) { out.jieQi = null; }
    try { out.lunar = G.lunarText(when); } catch (e) { out.lunar = ''; }
  }

  // 四柱旬空：各柱各按自己的干支起旬。日柱那一格与 `chart.kong` 必然同值
  // （同一个 `getKongWang(dayGZ)`），并排显示时不会打架。
  const pillars = [['year', c.yearGZ], ['month', c.monthGZ], ['day', c.dayGZ], ['hour', c.hourGZ]];
  for (const [k, gz] of pillars) out.kong[k] = C.getKongWang(gz).join('');

  const ss = C.getShenSha(c.dayGZ);
  out.shensha = {
    guaShen: (c.guaShen && c.guaShen.dizhi) || '',
    yiMa: ss.yiMa, taoHua: ss.taoHua, riLu: ss.riLu,
  };

  // 变卦整列：六亲**以本卦之宫论**（与 `chart.yaos[].changed.liu_qin` 同一条通则）
  const bian = c.bian;
  if (bian && bian.upper && bian.lower) {
    const palaceElement = (c.ben && c.ben.palace && c.ben.palace.palaceElement) || '';
    const gan = C.NAJIA_GAN[bian.lower].inner, ganOuter = C.NAJIA_GAN[bian.upper].outer;
    const zhis = C.NAJIA[bian.lower].slice(0, 3).concat(C.NAJIA[bian.upper].slice(3, 6));
    for (let i = 0; i < 6; i++) {
      const tiangan = i < 3 ? gan : ganOuter;
      out.bianLines.push({
        position: i + 1,
        yaoName: YAO_NAMES[i],
        yinYang: bian.lines[i],
        tiangan,
        dizhi: zhis[i],
        ganzhi: tiangan + zhis[i],
        wuxing: C.DIZHI_WUXING[zhis[i]] || '',
        liuqin: C.getLiuQin(palaceElement, C.DIZHI_WUXING[zhis[i]] || ''),
      });
    }
  }

  return out;
}

module.exports = {
  buildChart, formatChart, yongShenWhy,
  guaHeChong, YAO_NAMES, guaMeta, displayMeta,
};

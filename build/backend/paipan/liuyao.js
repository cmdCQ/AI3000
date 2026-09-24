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
 *
 *   本文件仅存的自家判定只有两处，且都由上面那批**已核的地支关系表**
 *   （LIU_CHONG / LIU_HE / SHENG / KE）直接推出，不带独立口径：
 *     ① 月建/日辰与本爻的初级关系（临月建 / 月破 / 临日辰 / 日破 / 日合 / 日生 / 日克）
 *     ② 卦型（六冲卦 / 六合卦）
 *   另有一处 `suggestYongShen` 是按事项关键词粗配用神，属**临时占位**，
 *   待用神层（shushu `interpreter.py`）落地后整体替换。
 *
 * ── 伏神的已知口径差（不是 bug，是还没做） ─────────────────────
 *   本文件的 `fuShen` 是「本卦所缺六亲的全体」；shushu 的 `fu_shen` 是
 *   **按用神取伏神**（用神不现才取）。两者语义不同，改动会牵动用神层，
 *   故此处**保持原样**，等用神层一并重做，别单独动它。
 */

'use strict';

const C = require('./constants');
const R = require('./relations');

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

  // 伏神：本卦缺失的六亲，从本宫首卦（八纯卦）同爻位取。
  // ⚠ 口径与 shushu 的「按用神取伏神」不同，见文件头注，等用神层重做。
  const present = new Set(yaos.map((y) => y.liuqin));
  const fuShen = [];
  const pureNajia = C.NAJIA[palace.palace].slice();
  for (let i = 0; i < 6; i++) {
    const fz = pureNajia[i];
    const fw = C.DIZHI_WUXING[fz];
    const fq = C.getLiuQin(palace.palaceElement, fw);
    if (!present.has(fq)) {
      if (yaos[i].liuqin !== fq && fuShen.every((x) => x.liuqin !== fq)) {
        fuShen.push({
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
    fuShen,
    heChong,
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
    },
  };
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

  if (chart.fuShen.length) {
    L.push('');
    L.push('【伏神】');
    for (const f of chart.fuShen) {
      L.push('　' + f.liuqin + ' ' + f.dizhi + f.wuxing + ' 伏于' + f.underYaoName + '（' + f.underLiujin + '）之下');
    }
  } else {
    L.push('');
    L.push('【伏神】六亲俱全，无伏神');
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

/** 按求测事项粗定用神（临时占位：待用神层落地后整体替换） */
function suggestYongShen(topic, gender) {
  const t = topic || '';
  const isMale = gender !== 'female';
  if (/财|钱|收入|生意|投资|买卖|债|薪|奖/.test(t)) return { yong: '妻财', why: '问财以妻财为用神' };
  if (/官|职|工作|事业|升|考|公务员|诉讼|官司|名/.test(t)) return { yong: '官鬼', why: '问官贵事业以官鬼为用神' };
  if (/婚|感情|对象|恋爱|妻|夫|配偶|男朋友|女朋友/.test(t)) {
    return isMale
      ? { yong: '妻财', why: '男问婚以妻财为用神' }
      : { yong: '官鬼', why: '女问婚以官鬼为用神' };
  }
  if (/病|健康|身体|疾|医/.test(t)) return { yong: '官鬼', why: '问病以官鬼为用神（官鬼为病爻）' };
  if (/房|车|物业|置产|买|合同|契约/.test(t)) return { yong: '父母', why: '问房产文书以父母为用神' };
  if (/子|女|孩|孕|生育|后代/.test(t)) return { yong: '子孙', why: '问子嗣以子孙为用神' };
  if (/出行|走|搬家|迁移|旅|外出/.test(t)) return { yong: '父母', why: '问出行以父母为用神（父母为车船）' };
  if (/兄弟|朋友|合伙|竞争|同事/.test(t)) return { yong: '兄弟', why: '问同辈以兄弟为用神' };
  return { yong: '', why: '' };
}

module.exports = {
  buildChart, formatChart, suggestYongShen,
  guaHeChong, YAO_NAMES,
};

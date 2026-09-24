/**
 * paipan/liuyao.js —— 六爻纳甲装卦
 * ====================================
 *
 * 把「本卦/变卦的上下卦号 + 四柱」装成完整的六爻盘：
 *   纳甲地支、五行、六亲、六神、世应、卦宫、卦型、旬空、月建日辰旺衰、
 *   变爻（化进退神、回头生克）、伏神、卦身。
 *
 * 六亲一律以**本卦之宫**论（含变爻），这是六爻通则。
 * 爻序一律升序 [初,二,三,四,五,上]，下标 0..5。
 *
 * 真源：
 *   - 装卦表（纳甲/六神/八宫世应/六亲取法/旬空/旺衰）见 ./constants.js 头部说明
 *   - 卦身：《增删卜易·卷一·安卦身诀》阳世从子起、阴世从午起
 *   - 化进退神、回头生克：六爻通则
 */

'use strict';

const C = require('./constants');

const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

// ── 化进神 / 化退神 ────────────────────────────────────────
// 同五行内的地支顺行/逆行。土取 辰→未→戌→丑→辰。
const JIN_SHEN = {
  寅: '卯', 巳: '午', 申: '酉', 亥: '子',
  丑: '辰', 辰: '未', 未: '戌', 戌: '丑',
};
const TUI_SHEN = {
  卯: '寅', 午: '巳', 酉: '申', 子: '亥',
  辰: '丑', 未: '辰', 戌: '未', 丑: '戌',
};

/** 化进退神判定 */
function jinTuiShen(origZhi, changedZhi) {
  if (!origZhi || !changedZhi) return '';
  if (JIN_SHEN[origZhi] === changedZhi) return '化进神';
  if (TUI_SHEN[origZhi] === changedZhi) return '化退神';
  return '';
}

/** 回头生 / 回头克：变爻对本爻的作用 */
function huiTou(origWx, changedWx) {
  if (!origWx || !changedWx) return '';
  if (C.SHENG[changedWx] === origWx) return '回头生';
  if (C.KE[changedWx] === origWx) return '回头克';
  if (C.SHENG[origWx] === changedWx) return '化泄气';
  if (C.KE[origWx] === changedWx) return '化耗气';
  return '';
}

/** 六冲卦 / 六合卦：六爻地支两两相冲为六冲卦，两两相合为六合卦 */
function guaHeChong(branches) {
  let chong = 0, he = 0;
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      if (C.LIU_CHONG[branches[i]] === branches[j]) chong++;
      if (C.LIU_HE[branches[i]] === branches[j]) he++;
    }
  }
  // 六冲卦：上三爻与下三爻对应相冲（初↔四、二↔五、三↔上）
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

/** 三合局检测 */
function sanHeJu(branches) {
  const set = new Set(branches);
  const found = [];
  for (const g of C.SAN_HE) {
    const hit = g.branches.filter((b) => set.has(b));
    if (hit.length >= 2) {
      found.push({ wuxing: g.wuxing, branches: g.branches, present: hit, complete: hit.length === 3 });
    }
  }
  return found;
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
  const kong = dayGZ ? C.getKongWang(dayGZ) : [];

  // 本卦结构
  const palace = C.getPalace(benUpper, benLower);
  const benLines = C.guaLines(benUpper, benLower);       // 升序 [初..上]
  const benNajia = C.NAJIA[benLower].slice(0, 3).concat(C.NAJIA[benUpper].slice(3, 6));
  // 纳甲天干：内卦取 inner、外卦取 outer（乾纳甲壬、坤纳乙癸，余卦内外同干）
  const benGan = [C.NAJIA_GAN[benLower].inner, C.NAJIA_GAN[benLower].inner, C.NAJIA_GAN[benLower].inner,
                  C.NAJIA_GAN[benUpper].outer, C.NAJIA_GAN[benUpper].outer, C.NAJIA_GAN[benUpper].outer];

  // 变卦结构 —— 若有变卦号就用；否则由动爻推出
  let bianUpper = o.bianUpper != null ? Number(o.bianUpper) : null;
  let bianLower = o.bianLower != null ? Number(o.bianLower) : null;

  // 动爻：本卦与变卦爻象不同之处
  let moving = [];
  if (bianUpper && bianLower) {
    const bianLines = C.guaLines(bianUpper, bianLower);
    for (let i = 0; i < 6; i++) if (benLines[i] !== bianLines[i]) moving.push(i + 1);
  }
  if (!bianUpper || !bianLower) {
    // 无变卦信息则视为无动爻
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
      strength: monthZhi ? C.getStrength(wuxing, monthZhi) : '',
      // 日辰对爻的作用
      dayRelation: dayGZ ? dayRelationOf(dizhi, dayGZ[1]) : '',
    };

    if (isMoving) {
      const cd = bianNajia[i];
      const cw = C.DIZHI_WUXING[cd];
      yao.changed = {
        tiangan: bianGan[i],
        ganzhi: bianGan[i] + cd,
        dizhi: cd,
        wuxing: cw,
        // 变爻六亲亦以本卦之宫论
        liuqin: C.getLiuQin(palace.palaceElement, cw),
        jinTui: jinTuiShen(dizhi, cd),
        huiTou: huiTou(wuxing, cw),
        kong: kong.indexOf(cd) >= 0,
      };
    }
    yaos.push(yao);
  }

  // 伏神：本卦缺失的六亲，从本宫首卦（八纯卦）同爻位取
  const present = new Set(yaos.map((y) => y.liuqin));
  const fuShen = [];
  const pureNajia = C.NAJIA[palace.palace].slice();
  for (let i = 0; i < 6; i++) {
    const fz = pureNajia[i];
    const fw = C.DIZHI_WUXING[fz];
    const fq = C.getLiuQin(palace.palaceElement, fw);
    if (!present.has(fq)) {
      // 该六亲在本卦中不现 → 此爻位的纯卦六亲为伏神
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

  return {
    topic: o.topic || '',
    gender: o.gender || '',
    method: o.method || '',
    // 四柱
    yearGZ, monthGZ, dayGZ, hourGZ,
    monthZhi, dayGan, kong,
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
    sanHe: sanHeJu(branches),
    guaShen: (function () {
      const shiYao = yaos[palace.shi - 1];
      return { dizhi: C.getGuaShen(palace.shi, shiYao.yinYang), shiPosition: palace.shi };
    })(),
  };
}

/** 日辰地支对本爻的作用（六冲/六合/比和/生克） */
function dayRelationOf(dizhi, dayZhi) {
  if (!dayZhi) return '';
  if (dizhi === dayZhi) return '临日辰';
  if (C.LIU_CHONG[dizhi] === dayZhi) return '日冲';
  if (C.LIU_HE[dizhi] === dayZhi) return '日合';
  const a = C.DIZHI_WUXING[dizhi], b = C.DIZHI_WUXING[dayZhi];
  if (C.SHENG[b] === a) return '日生';
  if (C.KE[b] === a) return '日克';
  return '';
}

/** 月建对爻的作用（月破等） */
function monthRelationOf(dizhi, monthZhi) {
  if (!monthZhi) return '';
  if (dizhi === monthZhi) return '临月建';
  if (C.LIU_CHONG[dizhi] === monthZhi) return '月破';
  return '';
}

/**
 * 把盘面渲染成给 AI 的文本块。
 * 用传统的竖排盘式，AI 读这种格式最省力。
 */
function formatChart(chart) {
  if (!chart) return '';
  const L = [];
  const p = chart.ben.palace;

  L.push('【四柱】' + [chart.yearGZ, chart.monthGZ, chart.dayGZ, chart.hourGZ].filter(Boolean).join(' '));
  if (chart.monthZhi) L.push('月建：' + chart.monthGZ + '（' + chart.monthZhi + '，' + C.DIZHI_WUXING[chart.monthZhi] + '）　日辰：' + chart.dayGZ);
  if (chart.kong.length) L.push('旬空：' + chart.kong.join('、'));

  L.push('');
  L.push('【卦象】');
  L.push('本卦：' + chart.ben.name + '（' + p.palaceName + '宫 · ' + p.generation + ' · 世在' + YAO_NAMES[p.shi - 1] + ' 应在' + YAO_NAMES[p.ying - 1] + '）');
  if (chart.bian) {
    L.push('变卦：' + chart.bian.name + '（' + chart.bian.upperName + '上' + chart.bian.lowerName + '下）');
  } else {
    L.push('变卦：无（安静之卦，六爻不动）');
  }
  if (chart.moving.length) {
    L.push('动爻：' + chart.moving.map((m) => YAO_NAMES[m - 1]).join('、'));
  } else {
    L.push('动爻：无');
  }
  if (chart.guaShen) L.push('卦身：' + chart.guaShen.dizhi + '（安卦身诀：世在' + YAO_NAMES[chart.guaShen.shiPosition - 1] + '）');

  L.push('');
  L.push('【六爻纳甲】');
  L.push('爻位　六神　六亲　本卦　　　　　状态');
  for (let i = 5; i >= 0; i--) {
    const y = chart.yaos[i];
    const mark = y.isShi ? '世' : (y.isYing ? '应' : '　');
    const bar = y.yang ? '▅▅▅▅▅' : '▅▅　▅▅';
    const flags = [];
    if (y.kong) flags.push('空');
    if (y.strength) flags.push(y.strength);
    if (y.isMoving) flags.push('动');
    const mr = monthRelationOf(y.dizhi, chart.monthZhi);
    if (mr) flags.push(mr);
    // 日辰关系：日辰为主宰，日冲/日合/日生克是断卦要点
    const dr = dayRelationOf(y.dizhi, chart.dayGZ ? chart.dayGZ[1] : '');
    if (dr) flags.push(dr);

    let row = y.yaoName + mark + '　' + (y.liushen || '　') + '　' + y.liuqin + '　' + y.dizhi + y.wuxing + '　' + bar;
    row += '　' + (flags.length ? '（' + flags.join('·') + '）' : '');
    if (y.changed) {
      const cm = [y.changed.jinTui, y.changed.huiTou, y.changed.kong ? '空' : ''].filter(Boolean).join('·');
      row += '　→　' + y.changed.dizhi + y.changed.wuxing + ' ' + y.changed.liuqin + (cm ? '（' + cm + '）' : '');
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
  // 三合局须有动爻或日辰/月建牵引才成立；安静之爻静列成局不作数，故不列出
  const dayZhi = chart.dayGZ ? chart.dayGZ[1] : '';
  const movingZhi = chart.yaos.filter((y) => y.isMoving).map((y) => y.dizhi);
  const sanHeHits = [];
  for (const s of chart.sanHe || []) {
    if (s.present.length < 2) continue;
    const driver = s.present.filter((b) => movingZhi.indexOf(b) >= 0 || b === dayZhi || b === chart.monthZhi);
    if (!driver.length) continue;
    const how = driver.map((b) => (movingZhi.indexOf(b) >= 0 ? b + '动' : (b === dayZhi ? b + '日辰' : b + '月建'))).join('、');
    if (s.complete) sanHeHits.push('三合：' + s.branches.join('') + ' 三合成' + s.wuxing + '局（' + how + '引）');
    else sanHeHits.push('三合：' + s.present.join('') + ' 半合' + s.wuxing + '局（缺' + s.branches.find((b) => !s.present.includes(b)) + '，' + how + '引）');
  }
  if (sanHeHits.length) sanHeHits.forEach((t) => L.push(t));
  return L.join('\n');
}

/** 按求测事项粗定用神（供 prompt 参考，非强制） */
function suggestYongShen(topic, gender) {
  const t = topic || '';
  const isMale = gender !== 'female';
  // 按事项关键词粗配用神
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
  jinTuiShen, huiTou, guaHeChong, sanHeJu,
  YAO_NAMES,
};

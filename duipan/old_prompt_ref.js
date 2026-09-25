// 从 auth-server.js 改造前的备份里**原样抽出**的 prompt 构造函数，仅供对拍用。
// 抽出的区间同时带进了 getTokenLimit/ensureDbUser 等无关函数 —— 它们只被定义、
// 不被调用，故 db 之类的引用不会真的执行。**不要**在本文件里改逻辑：
// 它的全部价值就在于「是改造前那一份」。
'use strict';
const path = require('path');
const fs = require('fs');
const liuyaoPaipan = require(path.join(__dirname, '..', 'build', 'backend', 'paipan', 'liuyao.js'));
function buildMhysPrompt(topic, hexagrams, ragContext) {
  var custom = readPrompts();

  if (!topic) {
    var noTopicTpl = custom.mhys_notopic;
    if (noTopicTpl) return renderPrompt(noTopicTpl, mhysTemplateVars('', hexagrams));
    return '你是一位梅花易数解卦师。用户还没说问什么事，请用一句话简短询问。';
  }

  var vars = mhysTemplateVars(topic, hexagrams);
  vars.ragContext = ragContext || '';

  var tpl = custom.mhys_prompt;
  if (tpl) return renderPrompt(tpl, vars);

  // ↓↓↓ 默认模板 ↓↓↓
  const bg = hexagrams.benGua, hg = hexagrams.huGua, bng = hexagrams.bianGua;
  const cg = hexagrams.cuoGua, zg = hexagrams.zongGua;
  const ti = hexagrams.ti, yong = hexagrams.yong;

  let p = `以下是一组梅花易数排盘数据。

【求测事项】${topic}

【卦象】
本卦：${bg.upperTri.name}上${bg.lowerTri.name}下 → ${bg.name}
互卦：${hg.upperTri.name}上${hg.lowerTri.name}下 → ${hg.name}
变卦：${bng.upperTri.name}上${bng.lowerTri.name}下 → ${bng.name}
错卦：${cg.upperTri.name}上${cg.lowerTri.name}下 → ${cg.name}
综卦：${zg.upperTri.name}上${zg.lowerTri.name}下 → ${zg.name}

【体用】体卦：${ti.tri.name}（${ti.tri.element}）｜用卦：${yong.tri.name}（${yong.tri.element}）
生克：${hexagrams.verdict.text} — ${hexagrams.verdict.desc}
体用吉凶分级（已按《梅花易数·体用总诀》定妥，请以此为准，勿另立吉凶）：${hexagrams.verdict.level || '（未分级）'}
`;

  if (bg.movingYao && bg.movingYao.length) {
    p += `动爻：本卦第${bg.movingYao.join('、')}爻动
`;
  }

  p += `
你是精通《梅花易数》《皇极经世心易发微》的解卦者。按传统梅花断法分析，重体用，参互卦、变卦，不可机械地只凭生克直接定死吉凶，需结合卦象本义、事项类型与整体趋势综合判断。

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

  return p;
}

function getTokenLimit(tier) {
  // tier 0=普通用户 1=会员 2=SVIP
  // null = 不限
  switch (tier) {
    case 1: return 5000000;
    case 2: return null;
    default: return 100000;
  }
}

async function ensureDbUser(username) {
  if (!username || !db) return;
  try {
    const [rows] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      // 微信用户 openid 较长，phone 列只存手机号；username 存完整标识
      const phone = (username.startsWith('wx_')) ? '' : username;
      await db.query(
        'INSERT INTO users (phone, username, password_hash, nick_name, ai_count, token_used, tier, created_at, last_active) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)',
        [phone, username, '', username, Date.now(), Date.now()]
      );
    }
  } catch (e) {
    // 并发重复插入可能冲突，忽略
  }
}

function estimateTokens(text) {
  if (!text) return 0;
  const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const english = text.length - chinese;
  return Math.ceil(chinese * 0.6 + english * 0.25) + 10;
}

// ══════ Prompt 模板引擎 ══════
const PROMPTS_FILE = path.join(__dirname, 'data', 'prompts.json');

function readPrompts() { return {}; }  // 对拍：强制走内置默认模板
function writePrompts(data) {
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 模板变量替换
function renderPrompt(template, vars) {
  if (!template) return null;
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), String(val ?? ''));
  }
  return result;
}

// 梅花易数模板变量提取
function mhysTemplateVars(topic, hexagrams) {
  const bg = hexagrams.benGua || {}, hg = hexagrams.huGua || {}, bng = hexagrams.bianGua || {};
  const cg = hexagrams.cuoGua || {}, zg = hexagrams.zongGua || {};
  const ti = hexagrams.ti || {}, yong = hexagrams.yong || {};
  const v = hexagrams.verdict || {};
  const movingYao = bg.movingYao && bg.movingYao.length ? '第' + bg.movingYao.join('、') + '爻动' : '无动爻';
  return {
    topic: topic || '',
    benGuaName: bg.name || '', benGuaUpper: (bg.upperTri || {}).name || '', benGuaLower: (bg.lowerTri || {}).name || '',
    huGuaName: hg.name || '', huGuaUpper: (hg.upperTri || {}).name || '', huGuaLower: (hg.lowerTri || {}).name || '',
    bianGuaName: bng.name || '', bianGuaUpper: (bng.upperTri || {}).name || '', bianGuaLower: (bng.lowerTri || {}).name || '',
    cuoGuaName: cg.name || '', cuoGuaUpper: (cg.upperTri || {}).name || '', cuoGuaLower: (cg.lowerTri || {}).name || '',
    zongGuaName: zg.name || '', zongGuaUpper: (zg.upperTri || {}).name || '', zongGuaLower: (zg.lowerTri || {}).name || '',
    tiName: (ti.tri || {}).name || '', tiElement: (ti.tri || {}).element || '',
    yongName: (yong.tri || {}).name || '', yongElement: (yong.tri || {}).element || '',
    tiyongVerdict: v.text || '', tiyongDesc: v.desc || '', tiyongLevel: v.level || '',
    movingYao: movingYao,
    ragContext: '',
  };
}

// 六爻装卦：由「本卦/变卦上下卦号 + 四柱」装出完整盘面。
// 前端只负责起卦（给出卦号与四柱），六亲/六神/世应/旬空/旺衰/伏神一律后端算，
// 避免前端算错或送错字段。
function buildLiuyaoChart(hexagrams, lunarInfo, topic) {
  if (!hexagrams) return null;
  const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
  if (!bg.upper || !bg.lower) return null;
  const li = lunarInfo || {};
  // 用神（含伏神/世身/四神五行）由 buildChart 内部按 shushu 口径取定，
  // 不再在此处外挂粗配表——见 paipan/yongshen.js。
  return liuyaoPaipan.buildChart({
    topic: topic || '',
    gender: hexagrams.gender || '',
    isProxy: !!hexagrams.isProxy,
    benUpper: bg.upper, benLower: bg.lower,
    bianUpper: bng.upper, bianLower: bng.lower,
    yearGZ: li.yearGZ || '', monthGZ: li.monthGZ || '',
    dayGZ: li.dayGZ || '', hourGZ: li.hourGZ || '',
  });
}

// 六爻模板变量提取
function liuyaoTemplateVars(topic, hexagrams, lunarInfo) {
  const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';
  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);
  return {
    topic: topic || '',
    gender: genderLabel,
    benGuaName: bg.name || '', benGuaUpper: (bg.upperTri || {}).name || '', benGuaLower: (bg.lowerTri || {}).name || '',
    bianGuaName: bng.name || '', bianGuaUpper: (bng.upperTri || {}).name || '', bianGuaLower: (bng.lowerTri || {}).name || '',
    paipan: chart ? liuyaoPaipan.formatChart(chart) : '',
    yongshen: (chart && chart.yongShen && chart.yongShen.yong) ? chart.yongShen.yong : '',
    yongshenWhy: (chart && chart.yongShen) ? (chart.yongShen.why || '') : '',
    ragContext: '',
  };
}

function buildFollowUpPrompt(topic, followUp, context, hexagrams) {
  var custom = readPrompts();
  var tpl = custom.mhys_followup;
  if (tpl) {
    var vars = mhysTemplateVars(topic, hexagrams);
    vars.followUp = followUp || '';
    vars.context = (context || '').slice(-1200);
    return renderPrompt(tpl, vars);
  }
  let p = `针对「${topic}」的追问：

【之前解读】${(context || '').slice(-1000)}

【追问】${followUp}

请直接回答追问，不重复完整分析。结构：
【一、回答】——结论和建议，不用卦象术语。
【二、思路】（可选）——一两句推演依据。`;
  return p;
}

function buildLiuyaoPrompt(topic, hexagrams, ragContext, lunarInfo) {
  var custom = readPrompts();

  if (!topic) {
    var noTopicTpl = custom.liuyao_notopic;
    if (noTopicTpl) return renderPrompt(noTopicTpl, liuyaoTemplateVars('', hexagrams, lunarInfo));
    return '你是一位六爻纳甲解卦师。用户还没说问什么事，请先回应排盘数据（本卦变卦名+世应位置），然后用一句话询问求测事项。';
  }

  var vars = liuyaoTemplateVars(topic, hexagrams, lunarInfo);
  vars.ragContext = ragContext || '';

  var tpl = custom.liuyao_prompt;
  if (tpl) return renderPrompt(tpl, vars);

  // ↓↓↓ 默认模板 ↓↓↓
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';

  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);

  let p = '以下是一组六爻排盘数据。请按传统六爻断法分析，不可脱离用神主线泛讲六亲六神。\n\n';
  p += '【求测事项】' + topic + '\n';
  p += '【求测者性别】' + genderLabel + '\n\n';

  if (chart) {
    p += liuyaoPaipan.formatChart(chart) + '\n\n';
    if (chart.yongShen && chart.yongShen.yong) {
      p += '【用神参考】' + chart.yongShen.why + '（即' + chart.yongShen.yong + '）。若与卦中实际衰旺、动静冲突，以卦理为准，不必强套。\n\n';
    }
  } else {
    // 装卦失败时的兜底：至少别让 AI 收到空数据
    const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
    p += '【卦象】\n';
    p += '本卦：' + (bg.name || '未知') + '　变卦：' + (bng.name || '未知') + '\n';
    p += '（注意：本次排盘数据不完整，六亲六神世应未能装出，请在解读中说明并只作卦名卦意的粗断。）\n\n';
  }

  p += '断法要求：先定用神，再看月建日辰旺衰，再看世应、动爻、变爻、生克冲合、空破墓绝。月建为提纲，日辰为主宰；世为己，应为人；动为始，变为终。六神只作辅助，不可压过用神主线。\n\n';

  p += '请严格按以下顺序输出，每段以"---"分隔：\n\n';
  p += '【参考古籍】\n';
  p += '- 若上方确有【参考古籍】内容，请在回答最开头列出本次实际检索到的古籍名称。\n';
  p += '- 若上方没有【参考古籍】内容（本次未检索到），**不要凭印象列书名**，开头【参考古籍】一段直接写"本次未检索到相关古籍，以下依卦理分析"即可。\n';
  p += '- 古籍段落只放开头，不要放到末尾，也不要重复。\n\n';
  p += '【一、回答答案】\n';
  p += '- 直接说结果、倾向、成败、快慢。\n';
  p += '- 不要先讲原理，不要先铺垫。\n';
  p += '- 先把用户最想知道的答案说明白。\n\n';
  p += '【二、你的现状】\n';
  p += '- 只描述当前处境、矛盾、卡点、对方状态或环境态势。\n';
  p += '- 尽量白话，不堆术语。\n\n';
  p += '【三、解卦逻辑】\n';
  p += '- 再说明用神、世应、月建、日辰、动爻、变爻对结果的影响。\n';
  p += '- 若见空亡、月破、入墓、伏神、合绊、回头生、回头克，只分析与主事相关者。\n';
  p += '- 若卦象显示可成但迟、能成但反复、表面可成实则落空，必须明确说出。\n\n';
  p += '要求：\n';
  p += '- 前两段先给用户想看的内容，第三段再展开术数依据。\n';
  p += '- 语言简洁，判断明确，不空泛。\n';
  p += '- 避免绝对化断语，多用“可能”“倾向”。\n';
  p += '- 用**加粗**标结论重点，###子标题适度。\n\n';
  p += '【补充引导】末尾单独一段，自然引导："如有更多具体情况可补充，方便做更细致解读。"';
  return p;
}

function buildLiuyaoFollowUpPrompt(topic, followUp, context, hexagrams, lunarInfo) {
  var custom = readPrompts();
  var tpl = custom.liuyao_followup;
  if (tpl) {
    var vars = liuyaoTemplateVars(topic, hexagrams, lunarInfo);
    vars.followUp = followUp || '';
    vars.context = (context || '').slice(-1200);
    return renderPrompt(tpl, vars);
  }
  var p = '针对「' + topic + '」的追问：\n\n';
  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);
  if (chart) p += liuyaoPaipan.formatChart(chart) + '\n\n';
  p += '【之前解读】' + ((context || '').slice(-1200)) + '\n\n';
  p += '【追问】' + followUp + '\n\n';
  p += '直接回答追问，不重复完整七层分析。聚焦追问涉及的层面（如问应期则重点推应期，问空亡则重点辨空亡真假）。结构：\n【回答】——结论和建议，不用卦象术语。\n【依据】——简短推演依据（1-3句，引用原卦爻位）。';
  return p;
}


module.exports = {
  buildMhysPrompt, buildLiuyaoPrompt,
  buildFollowUpPrompt, buildLiuyaoFollowUpPrompt,
  mhysTemplateVars, liuyaoTemplateVars, buildLiuyaoChart,
};

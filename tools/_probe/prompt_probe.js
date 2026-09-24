const fs = require('fs'); const path = require('path');

const PROMPTS_FILE = '/nonexistent/prompts.json';  // 线上 data/prompts.json 不存在

function readPrompts() {
  try { return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8')); }
  catch { return {}; }
}

function renderPrompt(template, vars) {
  if (!template) return null;
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), String(val ?? ''));
  }
  return result;
}

function liuyaoTemplateVars(topic, hexagrams) {
  const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';
  return {
    topic: topic || '',
    gender: genderLabel,
    benGuaName: bg.name || '', benGuaUpper: (bg.upperTri || {}).name || '', benGuaLower: (bg.lowerTri || {}).name || '',
    bianGuaName: bng.name || '', bianGuaUpper: (bng.upperTri || {}).name || '', bianGuaLower: (bng.lowerTri || {}).name || '',
    ragContext: '',
  };
}

function buildLiuyaoPrompt(topic, hexagrams, ragContext) {
  var custom = readPrompts();

  if (!topic) {
    var noTopicTpl = custom.liuyao_notopic;
    if (noTopicTpl) return renderPrompt(noTopicTpl, liuyaoTemplateVars('', hexagrams));
    return '你是一位六爻纳甲解卦师。用户还没说问什么事，请先回应排盘数据（本卦变卦名+世应位置），然后用一句话询问求测事项。';
  }

  var vars = liuyaoTemplateVars(topic, hexagrams);
  vars.ragContext = ragContext || '';

  var tpl = custom.liuyao_prompt;
  if (tpl) return renderPrompt(tpl, vars);

  // ↓↓↓ 默认模板 ↓↓↓
  const bg = hexagrams.benGua || {};
  const bng = hexagrams.bianGua || {};
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';

  let p = '以下是一组六爻排盘数据。请按传统六爻断法分析，不可脱离用神主线泛讲六亲六神。\n\n';
  p += '【求测事项】' + topic + '\n';
  p += '【求测者性别】' + genderLabel + '\n\n';
  p += '【卦象】\n';
  p += '本卦：' + (bg.name || '未知') + '\n';
  p += '变卦：' + (bng.name || '未知') + '\n';
  p += ((bg.upperTri && bg.upperTri.name) || '未知') + '上' + ((bg.lowerTri && bg.lowerTri.name) || '未知') + '下\n';
  p += ((bng.upperTri && bng.upperTri.name) || '未知') + '上' + ((bng.lowerTri && bng.lowerTri.name) || '未知') + '下\n\n';

  p += '断法要求：先定用神，再看月建日辰旺衰，再看世应、动爻、变爻、生克冲合、空破墓绝。月建为提纲，日辰为主宰；世为己，应为人；动为始，变为终。六神只作辅助，不可压过用神主线。\n\n';

  p += '请严格按以下顺序输出，每段以"---"分隔：\n\n';
  p += '【参考古籍】\n';
  p += '- 如果上方提供了【参考古籍】内容，请先在回答最开头列出本次实际参考的古籍名称，不要放到末尾，也不要重复古籍段落。\n\n';
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


// 真实排盘负载：六爻 result 页 buildLiuyaoAiPayload() 实际发出的字段
const payload = {
  topic: '这次面试能成吗', gender: 'male',
  hexagrams: {
    gender: 'male',
    benGua: {name:'水雷屯', upper:6, lower:4, upperTri:{name:'坎'}, lowerTri:{name:'震'}},
    bianGua: {name:'水泽节', upper:6, lower:2, upperTri:{name:'坎'}, lowerTri:{name:'兑'}},
    gong: '坎宫', shiYao: 2, yingYao: 5,
    dayGZ: '辛丑', liuqin: ['兄弟','官鬼','父母','子孙','妻财','兄弟'],
    liushen: ['白虎','玄武','青龙','朱雀','勾陈','螣蛇']
  }
};
const p = buildLiuyaoPrompt('这次面试能成吗', payload.hexagrams, '【古籍1】《增删卜易》…');
console.log('===== 前端发了 ' + Object.keys(payload.hexagrams).length + ' 个字段，AI 实际收到的 prompt =====');
console.log(p);
console.log('===== 检查关键数据是否出现在 prompt 里 =====');
['辛丑','世','应','妻财','官鬼','白虎','青龙','纳甲','动爻','月建','旬空','坎','震'].forEach(k => {
  console.log('  ' + k + ': ' + (p.includes(k) ? '✓ 有' : '✗ 没有'));
});

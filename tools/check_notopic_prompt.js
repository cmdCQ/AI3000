/**
 * 本地小量验证：无事项时，交给 AI 的 prompt 里**到底有没有盘面**。
 *
 * 起因（线上实测）：六爻页事项留空点「自动解析」，AI 回
 * 「我这边还没有收到具体的卦象数据……请随意想三个数字（1-9）告诉我」。
 * 前端抓包证明 payload 完整，故问题在后端模板层 —— 这个脚本就是把那一层
 * 单独拎出来跑，不启服务、不花 token。
 *
 * 用法：node tools/check_notopic_prompt.js
 * 退出码：0 = 盘面要素齐；1 = 缺东西（会列出缺哪个、以及未替换的变量）
 */
'use strict';

const path = require('path');
const P = require(path.join(__dirname, '..', 'build', 'backend', 'paipan', 'prompt.js'));

// 与线上抓包逐字相同的 cardData（2026-09-25 06:17 地风升 → 巽为风）
const CARD_LIUYAO = {
  topic: '', divinationTime: '2026-09-25 06:17', gender: 'male', method: 'auto',
  lunarInfo: { lunarYear: '二〇二六', lunarMonth: '八', lunarDay: '十五',
    yearGZ: '丙午', monthGZ: '丁酉', hourGZ: '癸卯', dayGZ: '壬寅' },
  hexagrams: {
    gender: 'male',
    benGua: { name: '地风升', upper: 8, lower: 5, upperTri: { name: '坤' }, lowerTri: { name: '巽' } },
    bianGua: { name: '巽为风', upper: 5, lower: 5, upperTri: { name: '巽' }, lowerTri: { name: '巽' } },
  },
};

// 梅花：报数起卦（上乾下兑 → 天泽履，五爻动）。
// 形状照抄 `js/mhys_render.js::buildMhysAiPayload()` —— 梅花认 `benGua.movingYao`，
// 少它直接 `ok:false`（第一版我就漏了，渲染出满屏空变量，还差点当成模板写错）。
const CARD_MHYS = {
  topic: '', divinationTime: '2026-09-25 06:17', method: 'number', numbers: '1,2,3',
  lunarInfo: CARD_LIUYAO.lunarInfo,
  hexagrams: {
    benGua: { name: '天泽履', upper: 1, lower: 2, movingYao: [5],
      upperTri: { name: '乾', number: 1 }, lowerTri: { name: '兑', number: 2 } },
  },
};

// 与 auth-server.js::renderPrompt 同形的替换（只替换 {{key}}）
function render(tpl, vars) {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

function check(label, tpl, vars, must) {
  const out = render(tpl, vars);
  const miss = must.filter((k) => out.indexOf(k) < 0);
  const left = out.match(/\{\{\w+\}\}/g);
  console.log(`\n══ ${label}（${out.length} 字）══`);
  console.log(out);
  console.log(`\n  必须出现：${must.length - miss.length}/${must.length}`
    + (miss.length ? `  ❌ 缺 ${miss.join('、')}` : '  ✅'));
  console.log(`  未替换变量残留：${left ? '❌ ' + left.join('、') : '无 ✅'}`);
  return miss.length === 0 && !left;
}

let ok = true;
ok = check('六爻 · 无事项', P.DEFAULT_LIUYAO_NOTOPIC, P.liuyaoVars('', CARD_LIUYAO, '〔RAG片段〕'),
  ['地风升', '巽为风', '壬寅', '丁酉', '六亲', '纳甲', '世', '应', '用神', '〔RAG片段〕']) && ok;
ok = check('梅花 · 无事项', P.DEFAULT_MHYS_NOTOPIC, P.mhysVars('', CARD_MHYS, '〔RAG片段〕'),
  ['天泽履', '乾', '兑', '体', '用']) && ok;

// 有事项时那两条模板也不能退化（它们是主路径，改动不该碰到它们）
const withTopic = P.liuyaoVars('求财', CARD_LIUYAO, '');
ok = check('六爻 · 有事项（回归）', P.DEFAULT_LIUYAO_PROMPT, withTopic,
  ['求财', '地风升', '巽为风', '断法要求']) && ok;

console.log('\n' + (ok ? '✅ 全部通过' : '❌ 有缺项'));
process.exit(ok ? 0 : 1);

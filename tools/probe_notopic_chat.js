/**
 * 线上探针 · 无事项时 AI 到底看见了什么
 * ==========================================================================
 *
 * 这条探针只问一件事：**用户没填事项、直接点了「自动解析」，AI 还会不会叫用户
 * 报三个数字重新起卦？**
 *
 * 原先就是这么坏的两个原因（都已在 2026-09-25 修掉）：
 *  ① `readPrompts()` 一直返回 `{}`（PROMPTS_FILE 指到不存在的目录）→ 系统提示词
 *     回落到那句含梅花【起卦规则】的通用提示词 → 让用户「随意想三个数字（1-9）」；
 *  ② 无事项那条模板是一句不带变量的死话 → 排好的盘整个被丢掉。
 *
 * 判据（都从**线上真实返回的正文**里找，不看本地模板）：
 *  · ❌ 出现「三个数字 / 想三个 / 报数 / 1-9」之类 → 还在叫人重新起卦
 *  · ✅ 出现盘面要素（本卦名、世、应、六亲或纳甲地支）→ 盘真的送到了
 *
 * ⚠ 本探针会**真的调一次 AI**（花钱）。默认只跑一次，别放进循环。
 *
 * 用法：node tools/probe_notopic_chat.js [liuyao|mhys]
 * 退出码：0 = 判据全过
 */
'use strict';

// 夹具与 `tools/check_notopic_prompt.js` 里的**同一份**（2026-09-25 06:17 线上抓包，
// 地风升 → 巽为风）。分两份写是刻意的：这份要能独立跑，不受那份重构影响。
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
const CARD_MHYS = {
  topic: '', divinationTime: '2026-09-25 06:17', method: 'number', numbers: '1,2,3',
  lunarInfo: CARD_LIUYAO.lunarInfo,
  hexagrams: {
    benGua: { name: '天泽履', upper: 1, lower: 2, movingYao: [5],
      upperTri: { name: '乾', number: 1 }, lowerTri: { name: '兑', number: 2 } },
  },
};

const BASE = process.env.SITE || 'https://sqw.somtfly.com';
// 无事项就是 message 为空（前端 `aiTopic()` 返回 ''）
const CASES = {
  liuyao: { card: CARD_LIUYAO, need: ['地风升', '世', '应'] },
  mhys: { card: CARD_MHYS, need: ['履', '体', '用'] },
};
// 「还在叫人重新起卦」的指纹。别写太宽：正文里出现「三个」不一定是在要数字，
// 故这几条都要带起卦语境。
const ASK_AGAIN = [/想三个?数字/, /报三?个数/, /随意想/, /1\s*[-—~]\s*9/, /请提供三个/, /三个数字（?1/];

function strip(t) {
  const i = t.lastIndexOf('\n消耗 Token：');
  return i > 0 ? t.slice(0, i) : t;
}

async function run(key) {
  const { card, need } = CASES[key];
  const res = await fetch(BASE + '/api/chat/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '', cardType: key, cardData: card }),
  });
  const text = strip(await res.text());
  console.log(`\n══ ${key}　HTTP ${res.status}　正文 ${text.length} 字 ══`);

  if (res.status !== 200) {
    console.log(text.slice(0, 400));
    return false;
  }
  console.log(text);

  let ok = true;
  const hit = ASK_AGAIN.filter((re) => re.test(text));
  if (hit.length) { ok = false; console.log(`\n❌ 还在叫用户重新起卦：${hit.join('  ')}`); }
  else console.log('\n✅ 没有出现「叫用户报数起卦」的话');

  const miss = need.filter((k) => text.indexOf(k) < 0);
  if (miss.length) { ok = false; console.log(`❌ 正文里找不到盘面要素：${miss.join('、')}`); }
  else console.log(`✅ 盘面要素 ${need.length}/${need.length}：${need.join('、')}`);
  return ok;
}

(async () => {
  const keys = process.argv[2] ? [process.argv[2]] : ['liuyao'];
  let ok = true;
  for (const k of keys) ok = (await run(k)) && ok;
  console.log('\n' + (ok ? '✅ 线上探针通过' : '❌ 线上探针不通过'));
  process.exit(ok ? 0 : 1);
})();

/**
 * 「无事项」这一条的端到端探针 —— 真系统提示词 + 真用户提示词 + 真调一次 AI
 * ==========================================================================
 *
 * 为什么不能只用 `probe_liuyao_ai.js`：那个探针的 system prompt 是**自己写死的**
 * 一段干净文本（`messages[0]`）。而这次坏的地方**恰恰是 system prompt 选错了**：
 *  `readPrompts()` 恒为 `{}` → `prompts.liuyao_system` 缺失 → 回落到外层那句
 *  通用提示词，里面有梅花的【起卦规则】「请随意想三个数字（1-9）」。
 * 拿一段写死的干净提示词去验，等于把要验的变量替换成常量 —— 必然「通过」。
 *
 * 故本探针从**已部署的 auth-server.js 源码**里把整条链抽出来跑：
 *   `buildDivinationChatPrompt` → 它自己选系统提示词、自己选模板
 * 于是探针拿到的就是用户真会收到的那两条消息。再用容器里的 key 真调一次。
 *
 * 判据：
 *  · system 里不许有【起卦规则】/「三个数字」    ← 这次修的
 *  · system 必须是六爻的（不是梅花味儿的通用句）
 *  · user 里必须有盘面（本卦名/世/应/六亲/纳甲） ← 这次修的
 *  · AI 正文里不许出现「叫用户报数重新起卦」的话
 *
 * 容器内：docker exec ai3000-backend node /tmp/probe_notopic_prompt.js
 * 本  机：AUTH_SERVER_SRC=build/backend/auth-server.js PAIPAN_DIR=build/backend/paipan \
 *         node tools/probe_notopic_prompt.js
 *
 * 加 `--no-ai` 跳过真实调用（只验提示词，不花钱）。
 * 退出码：0 = 判据全过。
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.AUTH_SERVER_SRC || '/app/auth-server.js';
const PAIPAN_DIR = path.resolve(process.env.PAIPAN_DIR || '/app/paipan');
const src = fs.readFileSync(SRC, 'utf8');

// 按大括号配平抓函数体（同 probe_liuyao_ai.js 的办法）。`{{var}}` 这种成对花括号
// 计数净为零，不影响配平。
function grabFn(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing fn ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced ' + name);
}
function grabConst(name) {
  const i = src.indexOf('const ' + name + ' = {');
  if (i < 0) throw new Error('missing const ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1) + ';'; }
  }
  throw new Error('unbalanced const ' + name);
}

// 单行常量（`const X = …;`），值里不会有换行
function grabLine(name) {
  const m = src.match(new RegExp('^const ' + name + ' = .*$', 'm'));
  if (!m) throw new Error('missing line const ' + name);
  return m[0];
}

const promptLib = require(path.join(PAIPAN_DIR, 'prompt.js'));
// `readPrompts` 的 catch 分支里会打印 `PROMPTS_FILE`，故这两个路径常量也得带上 ——
// 少了就是 `ReferenceError: PROMPTS_FILE is not defined`（第一版就是这么挂的）。
const parts = [
  grabLine('DATA_DIR'), grabLine('PROMPTS_FILE'),
  // 模型名也取自源码：探针自己写死就会与线上不是同一个模型，验的就不是线上那条链
  grabLine('LLM_MODEL'),
  grabFn('readPrompts'), grabFn('renderPrompt'), grabConst('DEFAULT_PROMPTS'),
  grabFn('buildMhysPrompt'), grabFn('buildLiuyaoPrompt'), grabFn('buildDivinationChatPrompt'),
].join('\n');
const factory = new Function('promptLib', 'fs', 'path', '__dirname',
  parts + '\nreturn {buildDivinationChatPrompt, readPrompts, DEFAULT_PROMPTS, LLM_MODEL};');
const M = factory(promptLib, fs, path, path.dirname(SRC));
const LLM_MODEL = process.env.LLM_MODEL || M.LLM_MODEL;
console.log('模型 →', LLM_MODEL, '（取自 auth-server.js，可用 LLM_MODEL 覆盖）');

// 与线上抓包逐字相同的 cardData（2026-09-25 06:17 地风升 → 巽为风），
// `topic` 为空 + message 为空 = 用户没填事项、直接点「自动解析」。
const CARD = {
  topic: '', divinationTime: '2026-09-25 06:17', gender: 'male', method: 'auto',
  lunarInfo: { lunarYear: '二〇二六', lunarMonth: '八', lunarDay: '十五',
    yearGZ: '丙午', monthGZ: '丁酉', hourGZ: '癸卯', dayGZ: '壬寅' },
  hexagrams: {
    gender: 'male',
    benGua: { name: '地风升', upper: 8, lower: 5, upperTri: { name: '坤' }, lowerTri: { name: '巽' } },
    bianGua: { name: '巽为风', upper: 5, lower: 5, upperTri: { name: '巽' }, lowerTri: { name: '巽' } },
  },
};

const CUSTOM = M.readPrompts();
console.log('readPrompts() →', JSON.stringify(CUSTOM).slice(0, 120)
  + (Object.keys(CUSTOM).length ? '' : '   （空 = 走内置默认，即线上真实路径）'));

const { systemPrompt, userPrompt } = M.buildDivinationChatPrompt('liuyao', CARD, '');
console.log('\n══ system prompt（' + systemPrompt.length + ' 字）══\n' + systemPrompt);
console.log('\n══ user prompt（' + userPrompt.length + ' 字）══\n' + userPrompt);

let ok = true;
// ① 系统提示词里不许有梅花那套起卦规则
const LEAK = [/【起卦规则】/, /三个数字/, /随意想/, /报数/];
const leak = LEAK.filter((re) => re.test(systemPrompt));
if (leak.length) { ok = false; console.log('\n❌ system 里仍有起卦规则漏进来：' + leak.join(' ')); }
else console.log('\n✅ system 里没有【起卦规则】/「三个数字」');
if (systemPrompt.indexOf('六爻') < 0) { ok = false; console.log('❌ system 不是六爻那一句'); }
else console.log('✅ system 是六爻解卦师那一句');

// ② 用户提示词里必须有盘面
const NEED = ['地风升', '世', '应', '纳甲'];
const miss = NEED.filter((k) => userPrompt.indexOf(k) < 0);
if (miss.length) { ok = false; console.log('❌ user prompt 缺盘面要素：' + miss.join('、')); }
else console.log('✅ user prompt 盘面要素 ' + NEED.length + '/' + NEED.length + '：' + NEED.join('、'));
const left = userPrompt.match(/\{\{\w+\}\}/g);
if (left) { ok = false; console.log('❌ user prompt 残留未替换变量：' + left.join(' ')); }
else console.log('✅ user prompt 无残留 {{变量}}');

// ③ 真调一次，看 AI 还叫不叫用户报数
if (process.argv.includes('--no-ai')) {
  console.log('\n（--no-ai：跳过真实调用）');
} else if (!process.env.DEEPSEEK_API_KEY) {
  console.log('\n⚠ 无 DEEPSEEK_API_KEY，跳过真实调用');
} else {
  (async () => {
    const t0 = Date.now();
    const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.DEEPSEEK_API_KEY },
      // ⚠ 用**真**的 systemPrompt，不另写一段
      body: JSON.stringify({ model: LLM_MODEL, stream: false, max_tokens: 1200,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    });
    const j = await r.json();
    if (!r.ok) { console.log('\n❌ API 报错 ' + r.status + ' ' + JSON.stringify(j).slice(0, 300)); process.exit(1); }
    const out = j.choices[0].message.content;
    console.log('\n══ AI 正文（' + out.length + ' 字，' + (Date.now() - t0) + 'ms，usage='
      + JSON.stringify(j.usage) + '）══\n' + out);
    const askAgain = LEAK.filter((re) => re.test(out));
    if (askAgain.length) { ok = false; console.log('\n❌ AI 还在叫用户报数起卦：' + askAgain.join(' ')); }
    else console.log('\n✅ AI 没有叫用户报数');
    console.log('（正文里出现「三个数字」也可能是它在讲卦理，故此项只作提示，以人读为准）');
    console.log('\n' + (ok ? '✅ 探针通过' : '❌ 探针不通过'));
    process.exit(ok ? 0 : 1);
  })();
}
if (process.argv.includes('--no-ai') || !process.env.DEEPSEEK_API_KEY) {
  console.log('\n' + (ok ? '✅ 提示词判据全过' : '❌ 提示词判据不过'));
  process.exit(ok ? 0 : 1);
}

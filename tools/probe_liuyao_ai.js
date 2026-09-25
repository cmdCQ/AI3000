/**
 * 六爻 AI 解析端到端探针。
 * 把 auth-server.js 里真实的 prompt 构造函数抽出来跑（得到用户实际会收到的那段 prompt），
 * 再用容器里的 DEEPSEEK_API_KEY 真调一次，检查正文里是否出现 六亲/六神/旬空/日辰/月建/世应。
 *
 * 容器内运行：docker exec ai3000-backend node /tmp/probe_liuyao_ai.js
 * 本机运行：  node tools/probe_liuyao_ai.js            （需自行准备 SRC 路径，见下）
 *
 * ⚠ 2026-09-25 重写：原版按 `buildLiuyaoChart` + `liuyaoTemplateVars` + 4 参数
 * 调 `buildLiuyaoPrompt` 写，这两个函数在「排盘下沉」时已被删除（改造后
 * 模板变量一律由 `paipan/prompt.js::liuyaoVars` 从**起卦原始数据**重算），
 * 于是探针本身成了坏工具：`--probe` 一跑就 `Error: missing fn buildLiuyaoChart`。
 * 当时**差点误读成「生产坏了」** —— 实际生产是好的（预检通过、容器健康、
 * 16 个文件已落）。教训：`--probe` 失败时先确认探针与生产代码同代。
 */
const fs = require('fs');
const path = require('path');

const SRC = process.env.AUTH_SERVER_SRC || '/app/auth-server.js';
// require 要绝对路径 —— 相对路径是相对**本文件**解析的，容器内 /tmp 与本机 tools/ 都不是它
const PAIPAN_DIR = path.resolve(process.env.PAIPAN_DIR || '/app/paipan');
const src = fs.readFileSync(SRC, 'utf8');

// 从源码里按大括号配平抓出函数体，避免把整个 auth-server 拉起来（那会监听端口）
function grab(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing fn ' + name);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced ' + name);
}

const promptLib = require(path.join(PAIPAN_DIR, 'prompt.js'));

// readPrompts / renderPrompt 是 buildLiuyaoPrompt 的模块级依赖，一并抽出来。
// ⚠ `PROMPTS_FILE` 是 `readPrompts` 用到的**模块级常量**，抽取时也要带上：
//   2026-09-25 第二次踩同一个坑 —— `grab()` 只抓函数体，常量留在了原文件里，
//   于是探针一跑就 `ReferenceError: PROMPTS_FILE is not defined`。
//   这条报错长得极像「生产坏了」，其实生产好端端的（预检过、容器 healthy、
//   线上排盘正常回车）。**抽函数就得把它闭包里的常量一起抽**，否则工具自己先坏。
//   常量从源码里截取，不重写一遍 —— 重写等于把探针变成「另一个真相」。
//
//   第三次（同日，紧接着）：补了常量还是报 `DEFAULT_PROMPTS is not defined` ——
//   因为按行的正则 `^const X = .*$` 只能抓**单行**值，`DEFAULT_PROMPTS` 是跨 8 行的
//   对象字面量，被截成 `const DEFAULT_PROMPTS = {` 一行。故改成按**括号配平**抓到
//   第四次（同日）：配平修好后是 `baziPromptLib is not defined` —— `renderPrompt`
//   把渲染转交给了 `paipan/bazi_prompt.js`。这类是 **require 进来的模块**，不是
//   源码里的常量，故和 `promptLib` 一样**注入**（`new Function` 的形参），不抽取。
//   判据很简单：**模块注入，常量抽源码**。
// ⚠ 下面的 try/catch 只做一件事：把「探针自己缺依赖」与「生产坏了」分开。
//   这两件事的报错长得一模一样（都是一个 ReferenceError），而处置完全相反 ——
//   今天已经因此误判三次方向，故在这里把它写成一句人话。
function grabConst(name) {
  const i = src.indexOf('const ' + name + ' = ');
  if (i < 0) throw new Error('missing const ' + name);
  let k = i + ('const ' + name + ' = ').length;
  let depth = 0;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '"' || c === "'" || c === '`') {            // 跳过字符串字面量
      for (k++; k < src.length && src[k] !== c; k++) if (src[k] === '\\') k++;
      continue;
    }
    if (c === '/' && src[k + 1] === '/') { for (; k < src.length && src[k] !== '\n'; k++); continue; }
    if (c === '/' && src[k + 1] === '*') { for (; k < src.length && src.slice(k, k + 2) !== '*/'; k++); k++; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ';' && depth <= 0) break;              // 语句结束
  }
  return src.slice(i, k + 1);
}
const parts = [
  grabConst('DATA_DIR'),
  grabConst('PROMPTS_FILE'),
  grabConst('DEFAULT_PROMPTS'),
  grab('readPrompts'),
  grab('renderPrompt'),
  grab('buildLiuyaoPrompt'),
].join('\n');

const factory = new Function('promptLib', 'baziPromptLib', 'fs', 'path', '__dirname',
  parts + '\nreturn {buildLiuyaoPrompt, readPrompts};');
const M = factory(promptLib, require(path.join(PAIPAN_DIR, 'bazi_prompt.js')), fs, path,
  path.dirname(SRC));
console.log('readPrompts() →', JSON.stringify(M.readPrompts()).slice(0, 160));

// 与前端 buildLiuyaoAiPayload() 同形：乾为天初爻动 → 变天风姤。
// ⚠ 只有 `benGua/bianGua` 的上下卦号会被采用，其余字段（gong/shiYao/...）留着
// 是为了**证明它们是死数据** —— 若哪天后端又开始读前端给的世应，这里会显形。
const cardData = {
  hexagrams: {
    gender: 'male',
    benGua: { name: '乾为天', upper: 1, lower: 1, upperTri: { name: '乾' }, lowerTri: { name: '乾' } },
    bianGua: { name: '天风姤', upper: 1, lower: 5, upperTri: { name: '乾' }, lowerTri: { name: '巽' } },
    gong: '乾', shiYao: 6, yingYao: 3, dayGZ: '辛丑', liuqin: [], liushen: [],
  },
  lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '丙申' },
};

let prompt;
try {
  prompt = M.buildLiuyaoPrompt('验收', cardData, '');
} catch (e) {
  if (e instanceof ReferenceError) {
    console.error('\n❌ 探针自己缺依赖（**不是**生产坏了）：' + e.message);
    console.error('   抽出来的代码引用了一个没被抽到的模块级名字。先确认它属于哪一类：');
    console.error('     · `require` 进来的模块（`const x = require(...)`）→ 加进 new Function 形参注入');
    console.error('     · 源码里的常量（`const x = ...`）        → 加进 grabConst(...)');
    console.error('   在补好之前，`--probe` 的结果不能用作「线上 AI 通路是否正常」的判据。');
    process.exit(2);
  }
  throw e;
}
console.log('=== 用户实际收到的 user prompt（' + prompt.length + ' 字）===');
console.log(prompt);

const KEYS = ['月建', '日辰', '旬空', '六神', '世', '应', '卦身', '伏神', '用神',
              '六冲', '三合', '六亲', '白虎', '妻财', '回头克', '日辰:合', '动爻', '变爻',
              // 2026-09-24 起 formatChart 改接 relations.js 后新增的读数
              '月令:', '月长生:', '日长生:', '综合:', '卦势', '纳甲'];
const missing = KEYS.filter((k) => prompt.indexOf(k) < 0);
console.log('\n关键术语覆盖: ' + (KEYS.length - missing.length) + '/' + KEYS.length
            + (missing.length ? '  缺: ' + missing.join(',') : '  ✅ 无缺'));
if (missing.length) process.exitCode = 1;

// ── 真调一次 DeepSeek ──
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.log('\n⚠ 无 DEEPSEEK_API_KEY，跳过真实调用'); process.exit(process.exitCode || 0); }

const body = {
  model: 'deepseek-chat',
  messages: [
    { role: 'system', content: '你是一位精通中国传统命理学的AI助手，擅长梅花易数、六爻纳甲、八字命理等术数。回答风格清晰、理性、有启发性，避免绝对化断语，多用"可能""倾向"。能用**加粗**标出重点。' },
    { role: 'user', content: prompt },
  ],
  stream: false,
  max_tokens: 2000,
};

(async () => {
  const t0 = Date.now();
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) { console.log('\n❌ API 报错', r.status, JSON.stringify(j).slice(0, 400)); process.exit(1); }
  const out = j.choices[0].message.content;
  console.log('\n=== AI 正文（' + out.length + ' 字，' + (Date.now() - t0) + 'ms，'
              + 'usage=' + JSON.stringify(j.usage) + '）===');
  console.log(out);

  const HITS = ['父母', '兄弟', '官鬼', '妻财', '子孙', '世', '应', '旬空', '月建', '日辰',
                '白虎', '青龙', '螣蛇', '勾陈', '朱雀', '玄武', '空亡', '六冲', '伏神', '卦身', '乾'];
  const hit = HITS.filter((k) => out.indexOf(k) >= 0);
  console.log('\n正文命中的盘面术语: ' + hit.join('、'));
  const miss = ['父母', '兄弟', '官鬼', '妻财', '子孙'].filter((k) => out.indexOf(k) < 0);
  console.log('六亲覆盖: ' + (5 - miss.length) + '/5' + (miss.length ? '  缺: ' + miss.join(',') : ''));
  // 三段式：结论先行 → 逐项分析 → 建议
  console.log('分段标记数（应为 3 段左右的标题）: ' + (out.match(/^#{1,4}\s*|^\*\*[^*]+\*\*/gm) || []).length);
  if (miss.length) process.exitCode = 1;
})();

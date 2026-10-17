/**
 * 八字长报告探针：**拿生产代码造 prompt → 用容器里的 key 真调一次 → 看真输出**。
 * ==========================================================================
 *
 * 为什么非要有它：`bazi_report.js` 的新输出规格有**三个问题在本地一条都答不了** ——
 *   ① **会不会被截断**：`max_tokens` 上限 8192 是上游硬顶，`LLM_MAX_TOKENS=8000`
 *      已贴死。首次解读关掉思考是为了把整个预算让给正文，但「够不够」只能真跑才知道。
 *   ② **格式听不听话**：8 维评分能不能给全、合计是不是 100、等级在不在那六档里、
 *      8 个模块是不是都写了、会不会把 `**` 和 `###` 漏到用户眼前。
 *   ③ **分数稳不稳**：关掉思考后 `temperature=0.3` 才生效；同一张盘两次跑分差多少。
 *
 * 与 `tools/probe_liuyao_ai.js` 同一套路：**从 `/app/auth-server.js` 里抓出真函数**跑，
 * 而不是另写一份「我以为生产是这么拼的」—— 另写一份等于把探针变成第二个真相。
 * 抓的是 `baziChartFromParams`（排盘 + 补挂 dayun/liunian + 渲染 prompt 全在里面）。
 *
 * ⚠ 探针自己会真花钱（一次调用）。它**不碰数据库、不写记录、不过 HTTP**：
 *   `baziChartFromParams` 是纯函数，直调它不经过鉴权/游客限额/记账。
 *
 * 容器内运行：docker exec ai3000-backend node /tmp/probe_bazi_report.js
 * 本机运行：  node tools/probe_bazi_report.js   （需容器外的 paipan 与 key）
 * 环境变量：  PROBE_TAB=<综合|事业|财运|婚姻|健康>，PROBE_ROUNDS=<跑几次比分数稳定性>
 * 退出码：0 = 全绿；1 = 有检查没过；2 = 探针自己缺依赖（**不是**生产坏了）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = process.env.AUTH_SERVER_SRC || '/app/auth-server.js';
const PAIPAN_DIR = path.resolve(process.env.PAIPAN_DIR || '/app/paipan');
const src = fs.readFileSync(SRC, 'utf8');

/** 从源码里按大括号配平抓出函数体（不把整个 auth-server 拉起来 —— 那会监听端口） */
function grab(name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('missing fn ' + name);
  let d = 0;
  const j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced ' + name);
}

/** 抓源码里的常量（跨行的也要 —— 按分号配平，跳过字符串与注释） */
function grabConst(name) {
  const i = src.indexOf('const ' + name + ' = ');
  if (i < 0) throw new Error('missing const ' + name);
  let k = i + ('const ' + name + ' = ').length;
  let depth = 0;
  for (; k < src.length; k++) {
    const c = src[k];
    if (c === '"' || c === "'" || c === '`') {
      for (k++; k < src.length && src[k] !== c; k++) if (src[k] === '\\') k++;
      continue;
    }
    if (c === '/' && src[k + 1] === '/') { for (; k < src.length && src[k] !== '\n'; k++); continue; }
    if (c === '/' && src[k + 1] === '*') { for (; k < src.length && src.slice(k, k + 2) !== '*/'; k++); k++; continue; }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ';' && depth <= 0) break;
  }
  return src.slice(i, k + 1);
}

// 模块**注入**（new Function 形参），常量**抽源码** —— 判据是「它是不是 require 进来的」。
const INJECT = {
  baziFull: require(path.join(PAIPAN_DIR, 'bazi_full.js')),
  baziFortuneLib: require(path.join(PAIPAN_DIR, 'bazi_fortune.js')),
  baziReportLib: require(path.join(PAIPAN_DIR, 'bazi_report.js')),
  baziPromptLib: require(path.join(PAIPAN_DIR, 'bazi_prompt.js')),
  ganzhiLib: require(path.join(PAIPAN_DIR, 'ganzhi.js')),
  paipanConst: require(path.join(PAIPAN_DIR, 'constants.js')),
  fs, path, console,
};
// 缺依赖是**报在调用时**的（`baziDisplayMeta` 里用到 `paipanConst` 才会炸），
// 所以光包住 `factory()` 不够 —— 调用处也要包。见下面 `callBuild()`。

const parts = [
  grabConst('LLM_MODEL'),
  grabConst('LLM_MAX_TOKENS'),
  grabConst('BAZI_REPORT_TEMPERATURE'),
  // `SHENGXIAO` 是 `baziDisplayMeta` 用到的生肖表（模块级常量，不是 require 进来的）。
  // 扫过一遍：这两个函数引用的模块级常量**只有它**，其余依赖都是 require。
  grabConst('SHENGXIAO'),
  grab('baziDisplayMeta'),
  grab('baziChartFromParams'),
].join('\n');

const factory = new Function(...Object.keys(INJECT),
  parts + '\nreturn { baziChartFromParams, LLM_MODEL, LLM_MAX_TOKENS, BAZI_REPORT_TEMPERATURE };');

let M;
try {
  M = factory(...Object.values(INJECT));
} catch (e) {
  if (e instanceof ReferenceError) {
    console.error('\n❌ 探针自己缺依赖（**不是**生产坏了）：' + e.message);
    console.error('   · require 进来的模块 → 加进 INJECT 注入');
    console.error('   · 源码里的常量        → 加进 grabConst(...)');
    console.error('   补好之前，本探针的结果不能用作「线上八字报告是否正常」的判据。');
    process.exit(2);
  }
  throw e;
}

/**
 * 调 `baziChartFromParams`，并把「探针自己缺依赖」翻译成人话。
 * 这条区分很重要：缺依赖的报错（ReferenceError）与「生产坏了」长得一模一样，
 * 而处置完全相反 —— probe_liuyao_ai.js 的文件头记着为此**误判过三次方向**。
 */
function callBuild(card) {
  try {
    return M.baziChartFromParams(card);
  } catch (e) {
    if (e instanceof ReferenceError) {
      console.error('\n❌ 探针自己缺依赖（**不是**生产坏了）：' + e.message);
      console.error('   · require 进来的模块 → 加进 INJECT 注入');
      console.error('   · 源码里的常量        → 加进 grabConst(...)');
      console.error('   补好之前，本探针的结果不能用作「线上八字报告是否正常」的判据。');
      process.exit(2);
    }
    throw e;
  }
}

// ── 一张固定的真盘（1984-02-04 12:30 男；对拍照用的同一张，便于人肉比对）──
const CARD = { y: 1984, mo: 2, d: 4, h: 12, mi: 30, gender: '男' };
const TAB = process.env.PROBE_TAB || '综合';
const ROUNDS = Math.max(1, +(process.env.PROBE_ROUNDS || 1));

const built = callBuild(Object.assign({ tab: TAB }, CARD));
if (!built.ok) { console.error('❌ 排盘失败：' + built.reason); process.exit(2); }

console.log('=== 排盘结果 ===');
console.log('四柱:', built.sizhu && JSON.stringify(built.sizhu));
console.log('thisYear =', built.thisYear, '｜大运步数 =', (built.chart.dayun || []).length,
  '｜流年条数 =', (built.chart.liunian || []).length);
console.log('prompt 长度 =', built.text.length, '字｜含【大运一览】:',
  built.text.indexOf('【大运一览】') >= 0, '｜含【未来流年】:', built.text.indexOf('【未来流年】') >= 0);

// system 从库里现取，不在探针里重抄一遍
const systemPrompt = INJECT.baziReportLib.baziReportSystem();

const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) { console.log('\n⚠ 无 DEEPSEEK_API_KEY，只打印 prompt、不真调'); console.log(built.text); process.exit(0); }

console.log('model =', M.LLM_MODEL, '｜max_tokens =', M.LLM_MAX_TOKENS,
  '｜temperature =', M.BAZI_REPORT_TEMPERATURE, '｜thinking = disabled');

/** 与 `streamBaziParse` 的首次解读分支**逐字同形**（关思考 + 0.3 温度） */
async function callOnce() {
  const t0 = Date.now();
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
    body: JSON.stringify({
      model: M.LLM_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: built.text }],
      stream: false,
      max_tokens: M.LLM_MAX_TOKENS,
      thinking: { type: 'disabled' },
      temperature: M.BAZI_REPORT_TEMPERATURE,
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`API ${r.status}: ` + JSON.stringify(j).slice(0, 400));
  return { out: j.choices[0].message.content, finish: j.choices[0].finish_reason, usage: j.usage, ms: Date.now() - t0 };
}

/** 对正文的全部判据（从文本里 parse，不硬编码期望值） */
function judge(out, finish) {
  const bad = [];
  const say = (ok, label, detail) => { console.log(`   ${ok ? '✓' : '✗'} ${label}${ok ? '' : ' —— ' + detail}`); if (!ok) bad.push(label); };

  // ① 截断
  say(finish === 'stop', '没有被截断（finish_reason=stop）', 'finish_reason=' + finish);

  // ② 8 维评分：解析出分值 → 求和必须 100
  //
  // ⚠ 判据**不能写死成 `得分/15`** —— 规范里的 `得分/15` 是个占位（意思是「这里填分数」），
  //   真跑时模型写的是 `- **五行平衡与流通** 11/15 —— 依据：…`，把「得分」二字**换成了分数**。
  //   第一版探针就栽在这儿：正则要求字面 `得分`，一行都匹配不上 → 求和得 0 →
  //   连带「合计=100」「总分与逐维一致」两条一起误报（而模型那一轮**算术全对**：
  //   11+11+10+7+10+6+6+5=66，它写的正是 66/100、等级「中」）。
  //   **探针判据过严会让好输出看起来像坏的** —— 与「断言变橡皮章」是同一个病的两面。
  //   故这里两种写法都吃（`11/15` 与 `得分 11/15`），并且**分母要对着规范核**：
  //   规范里每维的上限从 system 里 parse 出来，模型改没改分值一听便知。
  const specMax = [];
  {
    const mr = /得分\/(\d+)/g;
    let mm;
    while ((mm = mr.exec(systemPrompt))) specMax.push(Number(mm[1]));
  }
  const scoreRe = /^-\s+\*\*(.+?)\*\*\s*(?:得分\s*)?(\d+)\s*\/\s*(\d+)/gm;
  const rows = [];
  let m;
  while ((m = scoreRe.exec(out))) rows.push([m[1], Number(m[2]), Number(m[3])]);
  const sum = rows.reduce((a, b) => a + b[1], 0);
  say(rows.length === 8, '8 维评分都给全了', `只解析到 ${rows.length} 行：` + JSON.stringify(rows));
  say(specMax.length === 8, '规范里能 parse 出 8 个分值上限', JSON.stringify(specMax));
  const denOk = rows.length === 8 && specMax.length === 8
    && rows.every((r, i) => r[2] === specMax[i]);
  say(denOk, '每维的分母与规范一致（模型没自己改分值）',
    `模型 ${JSON.stringify(rows.map((r) => r[2]))} vs 规范 ${JSON.stringify(specMax)}`);
  // ⚠ 这里**不能**要求「逐维之和 = 100」。规范里的 8 个上限加起来确实是 100
  //   （4×15 + 4×10），但那是**满分**，不是**应得分** —— 规范自己写着「60 中枢、
  //   15 分制取 9、10 分制取 6」，任何一张盘都该得 60 上下而不是 100。
  //   第一版探针写的 `sum === 100` 就是拿满分当应得分，于是把一份**完全正确**的
  //   输出（11+11+10+7+10+6+6+5=66，它自己也写 66/100、等级「中」）判成了失败。
  //   真正该判的是这两条：①每维不超过上限；②总分与逐维之和一致（在下面）。
  const over = rows.filter((r) => r[1] > r[2]);
  say(over.length === 0, '没有哪一维超出它的上限', JSON.stringify(over));
  say(sum <= 100 && sum >= 0, '逐维之和落在 0–100', `合计 ${sum}（满分才是 100）`);

  // ③ 总评行与等级
  const tot = /综合命盘评分[：:]\s*(\d+)\s*\/\s*100/.exec(out);
  say(!!tot, '写出了「综合命盘评分：N/100」', '找不到这一行');
  if (tot) {
    // 总分必须等于 8 维之和 —— 这条是 ② ③ 的交叉验证：模型自己算的加法也得对
    say(Math.abs(Number(tot[1]) - sum) <= 2, '总分与 8 维之和一致（容差 2）',
      `总评 ${tot[1]} vs 逐维 ${sum}`);
  }
  const band = /等级[：:]\s*([上中偏弱下]{1,3})/.exec(out);
  const OK_BANDS = ['上上', '上', '中上', '中', '中下', '偏弱'];
  say(band && OK_BANDS.indexOf(band[1]) >= 0, '等级取自那六档',
    band ? `等级写了「${band[1]}」` : '找不到等级');
  // 等级必须与总分对得上：66 分写「上上」就是自相矛盾。
  // 档位区间从 **system 里 parse**（不硬编码），否则规范改了档位、这条还是照旧绿。
  if (tot && band) {
    const bands = [];
    const br = /([一-龥]{1,3})（(\d+)[–-](\d+)）/g;
    let bm;
    while ((bm = br.exec(systemPrompt))) bands.push({ name: bm[1], lo: +bm[2], hi: +bm[3] });
    const hit = bands.filter((b) => Number(tot[1]) >= b.lo && Number(tot[1]) <= b.hi);
    const expected = hit.length ? hit[0].name : '偏弱';
    say(band[1] === expected, '等级与总分档位对得上',
      `总分 ${tot[1]} 应对应「${expected}」，正文写了「${band[1]}」（规范解析出 ${bands.length} 档）`);
  }

  // ④ 8 个模块
  const mods = [];
  const modRe = /^###\s*(\d+)\.\s*(.+)$/gm;
  while ((m = modRe.exec(out))) mods.push([Number(m[1]), m[2].trim()]);
  const WANT = ['性格与天赋', '事业与学业', '财运与财富模式', '婚姻与感情',
    '健康与体质', '六亲与家庭', '大运流年', '开运与调整建议'];
  say(mods.length === 8, '8 个模块都写了', `只数到 ${mods.length} 个：` + JSON.stringify(mods));
  say(JSON.stringify(mods.map((x) => x[0])) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]),
    '编号 1..8 且按序', JSON.stringify(mods.map((x) => x[0])));
  const wrongName = mods.filter((x, i) => x[1] !== WANT[i]);
  say(wrongName.length === 0, '模块名逐字对', JSON.stringify(wrongName));
  // ★ 标题行只剩名字（没把规范里的「要写到哪几点」照抄进标题）
  const fatTitle = mods.filter((x) => /[：:、\/]/.test(x[1]));
  say(fatTitle.length === 0, '标题行只有名字（没把内容要求抄进去）', JSON.stringify(fatTitle));

  // ⑤ 不许漏出标记（模型照抄 `**`/`###` 的原始符号）
  say(out.indexOf('{{') < 0 && out.indexOf('}}') < 0, '正文里没有未替换的模板变量', '出现了 {{ }}');
  // 评分行与标题行本来就带 `**`/`###`（渲染器要吃掉的），要查的是**别处**有没有
  // ⚠ 这里**不查** `**` 多不多。第一版查了，结果把 `**核心结论**：…` 这种**正文里的
  //   加粗小标**判成了失败 —— 可那正是 renderMarkdown 支持、也是给不懂的人看的报告
  //   最需要的排版（`**` 会被渲染成金色加粗，不会漏到用户眼前）。
  //   真该拦的是**渲染器不吃的**东西：`{{}}`（上面那条）与行首没被吃掉的 `#`。
  // 两大部分标题（`## 一、命盘评分` / `## 二、综合内容`）**是规范要求的**，从 system 里
  // parse 出来当白名单 —— 上一版把它们当「渲染器不认的标题」判失败了（第三次同款误报）。
  const specParts = [];
  {
    const pr = /^## (.+)$/gm;
    let pm;
    while ((pm = pr.exec(systemPrompt))) specParts.push(pm[1].trim());
  }
  const badHash = out.split('\n').filter((l) => {
    const m2 = /^(#{1,6})\s*(.*)$/.exec(l);
    if (!m2) return false;
    if (m2[1] === '###') return !/^\d+\./.test(m2[2].trim());   // 三级只许 `N. 名字`
    if (m2[1] === '##') return specParts.indexOf(m2[2].trim()) < 0; // 二级只许规范里那两条
    return true;                                                 // 其余层级一律不许
  });
  say(badHash.length === 0, '标题行只有规范里那两种（`## 两大部分` + `### N. 名字`）',
    `规范里解析出 ${specParts.length} 个部分标题 ` + JSON.stringify(badHash.slice(0, 3)));
  // 只查**成形的标签**，不查裸的 `<` —— 正文里出现「小于 60」写成一个 `<` 是合法的，
  // 拿裸字符判会被误报（这类「判据过严」今天已经栽过两次了）。
  const tag = /<[a-zA-Z\/][^>\n]{0,40}>/.exec(out);
  say(!tag, '没有吐 HTML 标签', tag ? JSON.stringify(tag[0]) : '');
  const pipe = out.split('\n').filter((l) => (l.match(/\|/g) || []).length >= 2);
  say(pipe.length === 0, '没有 Markdown 表格（竖线撑起来的行）', JSON.stringify(pipe.slice(0, 2)));

  // ⑥ 大运/流年不许自己编（模块 7 的两个干支得真出现在盘面块里）
  const dy = built.chart.dayun || [];
  const dy0 = dy.length ? (dy[0].tiangan + dy[0].dizhi) : '';
  say(!dy0 || out.indexOf(dy0) >= 0, '模块 7 用的大运干支是盘面给的',
    `盘面首步大运是「${dy0}」，正文里找不到`);
  // ⑦ 地支十神那块挡板有没有被绕过（凭空写出流年地支十神的样子：如「流年地支七杀」）
  say(!/地支十神[：:]/.test(out), '没有自行推算地支十神', '出现了「地支十神：」');

  return { bad, rows, sum, out, total: tot ? Number(tot[1]) : null, band: band ? band[1] : null };
}

/**
 * ⚠ 判据要改的时候**别重跑真调用**。下面这段就是为此存在的：
 *   `PROBE_DUMP=/tmp/x.txt`  跑完把「模型正文 + finish_reason」存下来；
 *   `PROBE_JUDGE_FILE=/tmp/x.txt` 则不调 API，直接拿那份存稿重新判一遍。
 * 为什么重要：改一次判据就重调一次模型，会让人**不敢改判据**（心疼钱），
 * 于是明知判据有问题也凑合留着 —— 那正是「探针写严了把好输出判成坏」的温床。
 * 存稿格式：第一行 `finish_reason=xxx`，其余是正文原文。
 * 注意：存稿是上一次的输出了，**判据不再依赖它当时的调用参数**（那些参数在文件头打印）。
 */
function dumpPath() { return process.env.PROBE_DUMP || ''; }
function judgeFile() { return process.env.PROBE_JUDGE_FILE || ''; }

(async () => {
  const rounds = [];
  let firstBad = [];
  for (let i = 1; i <= ROUNDS; i++) {
    let out, finish, usage, ms;
    if (judgeFile() && i === 1) {
      const raw = fs.readFileSync(judgeFile(), 'utf8');
      const nl = raw.indexOf('\n');
      finish = (/^finish_reason=(.+)$/.exec(raw.slice(0, nl)) || [, 'stop'])[1];
      out = raw.slice(nl + 1);
      usage = { judge_file: judgeFile() }; ms = 0;
      console.log(`\n=== 第 ${i} 次：**离线重判**（不调 API）${judgeFile()} ===`);
    } else {
      console.log(`\n=== 第 ${i}/${ROUNDS} 次真调（${TAB}）===`);
      ({ out, finish, usage, ms } = await callOnce());
      if (dumpPath()) {
        fs.writeFileSync(dumpPath(), 'finish_reason=' + finish + '\n' + out);
        console.log(`（正文已存到 ${dumpPath()}，下次可用 PROBE_JUDGE_FILE 离线复判）`);
      }
    }
    console.log(`正文 ${out.length} 字｜${ms} ms｜usage=${JSON.stringify(usage)}｜finish_reason=${finish}`);
    console.log('-'.repeat(70));
    console.log(out);
    console.log('-'.repeat(70));
    const v = judge(out, finish);
    console.log(v.bad.length ? `\n   ✗ 本轮的失败项：${v.bad.join('、')}` : '\n   本轮全部通过');
    rounds.push({ total: v.total, band: v.band, sum: v.sum, bad: v.bad, len: out.length, ms, finish });
    if (i === 1) { firstBad = v.bad; console.log('\n=== 首次解读的真实 system（模型看到的规矩）==='); console.log(systemPrompt); }
  }

  if (ROUNDS > 1) {
    console.log(`\n=== 稳定性（同一张盘跑 ${ROUNDS} 次）===`);
    rounds.forEach((r, i) => console.log(
      `  第 ${i + 1} 次：总评 ${r.total}／等级 ${r.band}／逐维和 ${r.sum}／正文 ${r.len} 字／${r.finish}`));
    const totals = rounds.map((r) => r.total);
    const lo = Math.min(...totals); const hi = Math.max(...totals);
    console.log(`  总分极差 ${hi - lo}（${lo}–${hi}）—— 大于 10 说明 temperature=0.3 还是抖，得再降`);
  }
  // 退出码只看**第一次**（= 用户真实会收到的那一次）
  process.exitCode = firstBad.length ? 1 : 0;
  console.log(`\n${process.exitCode ? '❌' : '✅'} 八字长报告探针：${process.exitCode ? '首次解读有检查没过：' + firstBad.join('、') : '全部通过'}`);
})().catch((e) => { console.error('❌ 探针异常：' + e.message); process.exit(1); });

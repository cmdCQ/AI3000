/**
 * 前端跨文件契约检查（纯静态 + 纯逻辑，不起浏览器、不连网、不连库）
 * ==========================================================================
 *
 * 存在理由：这三类东西**坏了都不会报错**，只会静静地不对，而线上没人盯着看。
 *   ① 记账行标记（「消耗积分：」）在**后端一份、前端两份**（`ai_panel.js` 与
 *      `ai-chat/index.html` 各有一份，因为两页 DOM 形状不同、没共用渲染）。
 *      后端改了标签、前端没跟上 → 记账行被当正文渲染出来（用户报过的那一行
 *      「线上截图里它就那样显示在解卦正文最后一行」就是这个形态）；
 *      前端改了、后端没改 → 该显示的不显示。
 *   ② `autoStartAI()` 被加回来 → 用户一排完盘就被自动扣一次积分。
 *      2026-09-25 用户拍板删掉，这条断言就是**防它复活**。
 *   ③ 同一份 js/css 在不同页面挂着不同的 `?v=` → 一部分页面吃到旧缓存。
 *      六爻阳爻「又」不显示就是这么来的（修复上线了，缓存串没跳）。
 *
 * ⚠ **本脚本的边界，说清楚免得被当成橡皮章**：它只做两件事 ——
 *   ① 把真函数**从源文件里取出来跑**（逻辑对不对）；
 *   ② 用文本断言钉住**接线**（渲染处有没有调用那个函数）。
 *   它**不渲染页面**。要证明「屏幕上真的显示了那一行」，得跑
 *   `duipan/drive_mhys_page.js` / `drive_bazi_page.js` 那两个真浏览器驱动。
 *
 * 用法：node duipan/check_contracts.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 提取锚点找不到（源文件重构了，本脚本要跟着改）
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const N = (f) => path.join(ROOT, f);

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

function read(rel) { return fs.readFileSync(N(rel), 'utf8'); }

/**
 * 从源文件里切出一段**真代码**来跑。
 *
 * ⚠ 切不到 = 源文件被重构了，**当场退出码 2**，不许静默通过 —— 一个「找不到东西
 *   于是什么都没检查」的检查比没有检查更坏。
 */
function slice(rel, fromMarker, toMarker) {
  const src = read(rel);
  const a = src.indexOf(fromMarker);
  if (a < 0) { console.error(`❌ ${rel} 里找不到起点标记：${JSON.stringify(fromMarker)}`); process.exit(2); }
  const b = src.indexOf(toMarker, a);
  if (b < 0) { console.error(`❌ ${rel} 里找不到终点标记：${JSON.stringify(toMarker)}`); process.exit(2); }
  return src.slice(a, b);
}

/** 装一个只够跑记账行那几个函数的沙箱（不引 DOM）。 */
function sandbox(code, extra) {
  const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ctx = Object.assign({ escHtml, console }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

// ══════════════════════════════════════════════════════════════════
// ① 后端：POINTS_LABEL + pointsTrailer（取真函数跑）
// ══════════════════════════════════════════════════════════════════
const BE_FILE = 'build/backend/auth-server.js';
const beCode = slice(BE_FILE, 'const POINTS_LABEL =', '\n}\n');
const be = sandbox(beCode + '\n}\n'
  + 'var __out = { POINTS_LABEL: POINTS_LABEL, pointsTrailer: pointsTrailer };');

// ══════════════════════════════════════════════════════════════════
// ② 两个前端各自的实现（取真函数跑）
// ══════════════════════════════════════════════════════════════════
const PANEL_FILE = 'build/nginx/js/ai_panel.js';
const panelCode = slice(PANEL_FILE, 'var AI_POINTS_MARKS =', '\n/**\n * 存进记录里的形态');
const panel = sandbox(panelCode + `
  var __out = { AI_POINTS_MARKS: AI_POINTS_MARKS, pointsIdx: pointsIdx,
      stripTokenTrailer: stripTokenTrailer, pointsText: pointsText, pointsHtml: pointsHtml };`);

const CHAT_FILE = 'build/nginx/ai-chat/index.html';
const chatCode = slice(CHAT_FILE, 'var AI_POINTS_MARKS =', '// ===== 状态 =====');
const chat = sandbox(chatCode + `
  var __out = { AI_POINTS_MARKS: AI_POINTS_MARKS, pointsIdx: pointsIdx,
      splitPoints: splitPoints, pointsLabel: pointsLabel };`);

// withPoints 单独取（它在 pointsHtml 之后、下一个注释块之前）
const withPointsCode = slice(PANEL_FILE, 'function withPoints(t) {', '\n/**');
const withPoints = sandbox(panelCode + withPointsCode + '\nvar __out = { withPoints: withPoints };').__out.withPoints;

const BE = be.__out;
const P = panel.__out;
const C = chat.__out;
if (!BE || !BE.pointsTrailer || !P || !C || !withPoints) {
  console.error('❌ 取出来的东西不齐（锚点切歪了），本脚本要跟着源文件改');
  process.exit(2);
}

console.log('\n① 标记：后端一份、前端两份，必须逐字一致');
const newMark = '\n' + BE.POINTS_LABEL;
check('后端 POINTS_LABEL 是「消耗积分：」', BE.POINTS_LABEL === '消耗积分：', BE.POINTS_LABEL);
check('ai_panel.js 认这个标记', P.AI_POINTS_MARKS.indexOf(newMark) >= 0, JSON.stringify(P.AI_POINTS_MARKS));
check('ai-chat/index.html 认这个标记', C.AI_POINTS_MARKS.indexOf(newMark) >= 0, JSON.stringify(C.AI_POINTS_MARKS));
check('两处前端的标记表逐字相同', JSON.stringify(P.AI_POINTS_MARKS) === JSON.stringify(C.AI_POINTS_MARKS),
  JSON.stringify(P.AI_POINTS_MARKS) + ' vs ' + JSON.stringify(C.AI_POINTS_MARKS));
check('两边都留着「消耗 Token：」这个老标记（存量记录靠它才认得出来）',
  P.AI_POINTS_MARKS.indexOf('\n消耗 Token：') >= 0 && C.AI_POINTS_MARKS.indexOf('\n消耗 Token：') >= 0,
  JSON.stringify(P.AI_POINTS_MARKS));

console.log('\n② 拆解：拿后端真造的尾巴，喂给两个前端');
const BODY = '【一、结论】\n你问的这件事，眼下有一道坎，但过得去。\n\n---\n\n这点小事，别熬夜想。';
const TAIL_NEW = BE.pointsTrailer(1234, 567, 1801, '98,199');
const TAIL_OLD = TAIL_NEW.replace('消耗积分：', '消耗 Token：');

check('后端尾巴的格式（含前导 `\\n\\n---\\n`）',
  TAIL_NEW === '\n\n---\n消耗积分：输入 1234 + 输出 567 = 1801 ｜ 剩余：98,199', JSON.stringify(TAIL_NEW));

const wantPoints = '消耗积分：输入 1234 + 输出 567 = 1801 ｜ 剩余：98,199';
for (const [name, front, fn] of [['ai_panel.js', P, 'stripTokenTrailer'], ['ai-chat', C, 'splitPoints']]) {
  const isPanel = fn === 'stripTokenTrailer';
  const strip = (t) => isPanel ? front.stripTokenTrailer(t) : front.splitPoints(t).body;
  const pts = (t) => isPanel ? front.pointsText(t) : front.splitPoints(t).points;

  check(`${name}：新标记 → 正文复原、正文里不带横线不带记账行`,
    strip(BODY + TAIL_NEW) === BODY, JSON.stringify(strip(BODY + TAIL_NEW)));
  check(`${name}：新标记 → 记账行原样取出`, pts(BODY + TAIL_NEW) === wantPoints, JSON.stringify(pts(BODY + TAIL_NEW)));
  check(`${name}：老标记（存量记录）→ 正文同样复原`, strip(BODY + TAIL_OLD) === BODY, JSON.stringify(strip(BODY + TAIL_OLD)));
  check(`${name}：老标记 → 记账行改称「积分」（存量不迁移）`, pts(BODY + TAIL_OLD) === wantPoints, JSON.stringify(pts(BODY + TAIL_OLD)));
  check(`${name}：没有尾巴 → 正文原样、不认识出记账行`,
    strip(BODY) === BODY && pts(BODY) === '', JSON.stringify([strip(BODY), pts(BODY)]));
  check(`${name}：正文里自带的那条横线（---）不能被误删`,
    strip('甲\n\n---\n乙') === '甲\n\n---\n乙', JSON.stringify(strip('甲\n\n---\n乙')));
  check(`${name}：只有记账行、没有正文 → 不把记账行当正文吐出来`,
    strip(TAIL_NEW) === '', JSON.stringify(strip(TAIL_NEW)));
}

console.log('\n③ 入库形态：正文 + 记账行（记录页也要看得到扣了多少）');
check('withPoints：正文 + 尾巴，尾巴格式与后端一致',
  withPoints(BODY + TAIL_NEW) === BODY + '\n\n---\n' + wantPoints, JSON.stringify(withPoints(BODY + TAIL_NEW)));
check('withPoints：没有尾巴时就是正文', withPoints(BODY) === BODY, JSON.stringify(withPoints(BODY)));
check('withPoints：只有记账行、没有正文时存空串（不存一条「只剩记账行」的记录）',
  withPoints(TAIL_NEW) === '', JSON.stringify(withPoints(TAIL_NEW)));

console.log('\n④ 记账行的小字 HTML');
const html = P.pointsHtml(BODY + TAIL_NEW);
check('包在 .ai-points 里（CSS 那个类名）', /^<div class="ai-points">/.test(html), html);
check('正文里的尖括号被转义，不注入标签',
  P.pointsHtml('正文\n消耗积分：<img src=x onerror=1>').indexOf('<img') < 0,
  P.pointsHtml('正文\n消耗积分：<img src=x onerror=1>'));
check('没尾巴时不占位（返回空串）', P.pointsHtml(BODY) === '', JSON.stringify(P.pointsHtml(BODY)));

console.log('\n⑤ 接线：函数取出来了，还得真被调用（切出来跑证明不了这个）');
const panelSrc = read(PANEL_FILE);
const chatSrc = read(CHAT_FILE);
const count = (s, re) => (s.match(re) || []).length;
check('ai_panel.js：流式/中断/追问三处渲染都带上了记账行',
  count(panelSrc, /pointsHtml\(fullText\)/g) === 3, '实测 ' + count(panelSrc, /pointsHtml\(fullText\)/g) + ' 处');
check('ai_panel.js：重开旧解读时也带上（记录页那条路）',
  count(panelSrc, /pointsHtml\(aiSaved\(\)\)/g) === 1, '实测 ' + count(panelSrc, /pointsHtml\(aiSaved\(\)\)/g) + ' 处');
check('ai_panel.js：入库走 withPoints（不是 stripTokenTrailer）',
  /withPoints\(fullText\)/.test(panelSrc) && !/analysisText = fullText \? stripTokenTrailer/.test(panelSrc),
  '入库那行还是老的');
check('ai_panel.js：喂给模型的「之前解读」不带记账行',
  /stripTokenTrailer\(aiSaved\(\) \|\| ''\)/.test(panelSrc), '追问上下文没切尾巴');
check('ai_panel.js：没有残留的 AI_TOKEN_TRAILER 旧常量', !/AI_TOKEN_TRAILER/.test(panelSrc), '还留着');
check('ai-chat：没有残留的 lastIndexOf(\'\\n消耗 Token\') 就地切法',
  count(chatSrc, /lastIndexOf\('\\n消耗/g) === 0, '实测 ' + count(chatSrc, /lastIndexOf\('\\n消耗/g) + ' 处');
check('ai-chat：三处收尾都走 splitPoints',
  count(chatSrc, /splitPoints\(fullText\)|splitPoints\(full\)/g) === 3,
  '实测 ' + count(chatSrc, /splitPoints\(fullText\)|splitPoints\(full\)/g) + ' 处');
check('ai-chat：历史消息里的旧字改称「积分」', /pointsLabel\(msg\.tokenInfo\)/.test(chatSrc), '历史渲染没改');

console.log('\n⑥ 不许自动开始解读（2026-09-25 用户拍板；这条是防它复活）');
const nginxFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.endsWith('.bak')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js)$/.test(e.name)) nginxFiles.push(p);
  }
})(N('build/nginx'));
const autoCallers = nginxFiles.filter((f) => /^\s*autoStartAI\(\);/m.test(fs.readFileSync(f, 'utf8')));
check('全站没有 autoStartAI() 的调用', autoCallers.length === 0,
  autoCallers.map((f) => path.relative(ROOT, f)).join(', '));
const autoDefs = nginxFiles.filter((f) => /function autoStartAI\s*\(/.test(fs.readFileSync(f, 'utf8')));
check('引擎里也没留着这个没人调的函数', autoDefs.length === 0,
  autoDefs.map((f) => path.relative(ROOT, f)).join(', '));

console.log('\n⑦ 同一份 js/css 的 ?v= 指纹在各页面必须一致（阳爻那次就是栽在这儿）');
const pages = nginxFiles.filter((f) => f.endsWith('.html'));
const versions = {};
for (const f of pages) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /(?:src|href)="\/(js|css)\/([\w.-]+)\?v=(\d+)"/g;
  let m;
  while ((m = re.exec(src))) {
    const key = m[1] + '/' + m[2];
    (versions[key] = versions[key] || new Map()).set(m[3], (versions[key].get(m[3]) || 0) + 1);
  }
}
let bad = 0;
for (const key of Object.keys(versions).sort()) {
  const vs = [...versions[key].keys()];
  const ok = vs.length === 1;
  if (!ok) bad++;
  console.log(`   ${ok ? '✓' : '✗'} ${key} → ${vs.map((v) => 'v=' + v).join(' / ')}`);
}
if (!Object.keys(versions).length) { console.error('❌ 一个 ?v= 都没扫到 —— 正则或页面结构变了'); process.exit(2); }
if (bad) fails.push(`⑦ 有 ${bad} 份资源在不同页面挂着不同的 ?v=`);

console.log(fails.length
  ? `\n❌ 契约检查：${fails.length} 项失败\n   ` + fails.join('\n   ')
  : '\n✅ 契约检查：全部通过');
process.exit(fails.length ? 1 : 0);

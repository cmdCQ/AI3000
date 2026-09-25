/**
 * 驱页 · 梅花页「起卦全交后端」的端到端验收
 * ==========================================================================
 *
 * 为什么要有它：`verify_qigua_vs_front.js` 比的是**取数**，比完仍有一片没人看的地方
 * ——页面到底有没有把用户填的东西送上去、送的是不是用户选的那个时刻、拿到后端回的
 * 卦号之后有没有照它渲染。这些只有把页面真跑起来才看得见。所以在**本机**起一个
 * 静态服务器 + 一份端点，用 Firefox 无头驱动真页面（DOM、fetch、localStorage 全是真的）。
 *
 * 三处「独立判据」，是本脚本价值所在（同一份代码算两遍等于没验）：
 *
 *  ① **桩卦**：把 `/api/meihua/paipan` 换成返回固定卦号（上3下6动5）的桩。页面若
 *     自己还会取数，它绝不可能算出这三个数；它渲染出「火水未济」，就证明卦来自后端。
 *  ② **抓包**：桩把收到的请求体原样存下。于是「加时辰用的是页面上选的 08:00 还是
 *     墙上的 22:00」变成一句可直接断言的话 —— 这是原页面**看不见**的错（用户选
 *     08:00、实际按 22:00 的时辰起卦）。
 *  ③ **手算值**：真端点那一例的期望值（7/4/3 → 上7下4动**2**）是手算后写死的；
 *     动爻是 2 而不是 3，正是古法「三数之和÷6」与「第三个数÷6」的分野（计划第 8 号 bug）。
 *
 * **它不覆盖什么**：线上 nginx / 真后端进程 / 鉴权 / pm2。本机没有 node_modules，
 * 端点是**从 `auth-server.js` 切片**求值的（切片标记与 `smoke_paipan_endpoints.js` 同一对，
 * 失效即退出 2，不静默跳过）。
 *
 * 依赖：firefox（无头，走 marionette 线协议，直接实现，不需要 python 的
 * marionette_driver —— 本机没有 pip）。
 *
 * 用法：node duipan/drive_mhys_page.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境/切片出了问题（测不出来，不是通过）
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 真浏览器 + 本机站点 + 操作原语都在 `drive_lib.js` 里（六爻页的驱动脚本共用一份）
const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const promptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'prompt.js'));
const LY = require(path.join(ROOT, 'build', 'backend', 'paipan', 'liuyao.js'));

const PORT = 8899;
const MARIONETTE_PORT = 2828;
const ORIGIN = `http://127.0.0.1:${PORT}`;

// ─────────────────────────────────────────────────────────────
// 1. 端点：从 auth-server.js 切片（标记与 smoke 脚本同一对）
// ─────────────────────────────────────────────────────────────
const SLICE_A = "  if (req.method === 'POST' && (pathname === '/api/meihua/paipan'";
const SLICE_B = '  // POST /api/chat/send';

function loadEndpoint() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const i = src.indexOf(SLICE_A);
  const j = src.indexOf(SLICE_B);
  if (i < 0 || j < 0 || j <= i) {
    console.error('❌ 取不到排盘端点段 —— auth-server.js 结构变了？请更新切片标记。');
    process.exit(2);
  }
  const slice = src.slice(i, j);
  for (const want of ['/api/meihua/paipan']) {
    if (!slice.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」——切片标记失效，拒绝在残缺代码上验收。`);
      process.exit(2);
    }
  }
  return new Function('req', 'res', 'body', 'pathname', 'json', 'promptLib', 'liuyaoPaipan',
    slice + '\n;return false;');
}
const runEndpoint = loadEndpoint();

// 桩：设了就按它回（① 独立判据）；同时把每个进来的请求体存下来（② 独立判据）
const state = { stub: null, captured: [], savedRecords: [], chat: [] };

// 控制面 + 桩 + 真端点切片。站点的静态文件与浏览器部分在 `drive_lib.js` 里。
async function api(req, res, pathname) {
  if (pathname === '/__stub') {
    state.stub = (await L.readBody(req)).qigua || null;
    return L.sendJson(res, { ok: true, stub: state.stub }), true;
  }
  if (pathname === '/__captured') return L.sendJson(res, { captured: state.captured }), true;
  if (pathname === '/__reset') {
    state.captured = []; state.savedRecords = []; state.chat = [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__saved') return L.sendJson(res, { saved: state.savedRecords }), true;
  if (pathname === '/__chat') return L.sendJson(res, { chat: state.chat }), true;

  // AI 解读：`startAIStream()` 用 XHR 读**流式正文**（onprogress 逐段渲染），
  // 所以这里分两次 write、中间隔一下，好让驱动看到「边收边渲染」而不是一次性结果。
  if (req.method === 'POST' && pathname === '/api/chat/send') {
    const body = await L.readBody(req);
    state.chat.push(body);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.write('【一、结论】\n（桩）这一卦先说结论。\n');
    setTimeout(() => { res.write('\n【二、依据】\n（桩）再看依据。\n\n【三、建议】\n（桩）最后给建议。'); res.end(); }, 150);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/meihua/paipan') {
    const body = await L.readBody(req);
    state.captured.push(body);
    if (state.stub) {
      // 桩只回页面真正要用的东西：卦号 + 一个形状完整的 qigua。
      // 页面**只能**照这些数渲染 —— 它自己算不出 3/6/5。
      const q = state.stub;
      L.sendJson(res, {
        paipan: { stub: true }, sizhu: null,
        qigua: { method: body.method, upper_num: q.upper_num, lower_num: q.lower_num, moving: q.moving },
        text: '(桩)',
      });
      return true;
    }
    runEndpoint(req, res, body, pathname, L.sendJson, promptLib, LY);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/mhys-records') {
    const body = await L.readBody(req);
    state.savedRecords.push(body);
    return L.sendJson(res, { id: 999 }), true;
  }
  // 结果页按 id 取记录（`result.html` 读的是 result_data/topic/created_at 三个字段）
  if (req.method === 'GET' && /^\/api\/mhys-records\/\d+$/.test(pathname)) {
    const last = state.savedRecords[state.savedRecords.length - 1];
    if (!last) return L.sendJson(res, { error: '没有记录' }, 404), true;
    L.sendJson(res, {
      id: 999, topic: last.topic, method: last.method,
      result_data: last.resultData, ai_analysis: '', created_at: new Date().toISOString(),
    });
    return true;
  }
  // 别的 /api/* 一律空回，免得页面上的鉴权/记录请求把水搅浑
  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

function startServer() {
  return L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api });
}

// ─────────────────────────────────────────────────────────────
// 2. 浏览器与操作原语（都在 `drive_lib.js` 里，两个驱动脚本共用）
// ─────────────────────────────────────────────────────────────
const js = L.js;
const W = L.W;
const goto = L.goto;

function launchFirefox() {
  return L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'mhys-prof' });
}

async function selectMethod(m, method) {
  return js(m, `${W}
    var el = document.querySelector('.method-option[data-method="' + arguments[0] + '"]');
    if (!el) return 'NO_OPTION';
    W.selectMethod(arguments[0], el);
    return document.getElementById('methodLabel').textContent;
  `, [method]);
}

async function setTime(m, y, mo, d, h, mi) {
  return js(m, `${W}
    W.selectedTime.year = arguments[0];
    W.selectedTime.month = arguments[1];
    W.selectedTime.day = arguments[2];
    W.selectedTime.hour = arguments[3];
    W.selectedTime.minute = arguments[4];
    W.selectedTime.calendar = 'gregorian';
    W.updateTimeDisplay();
    return document.getElementById('timeDisplay').textContent;
  `, [y, mo, d, h, mi]);
}

async function clickStart(m) {
  return js(m, `document.getElementById('startBtn').click(); return true;`);
}

// 点完按钮等结果：结果**就在本页**下面的 #resultArea 里（不再跳 result.html），
// 所以等的是那个容器的正文；被校验拦下时等到的是一条 alert。
async function waitResult(m, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    const r = await js(m, `${W}
      var a = document.getElementById('resultArea');
      return { href: location.href, result: a ? (a.innerText || '') : '',
        alerts: (W.__alerts || []).slice(), errs: (W.__errs || []).slice() };
    `);
    if (r.result.length > 20 || r.alerts.length) return r;
    if (Date.now() - t0 > timeoutMs) return r;
    await new Promise((r2) => setTimeout(r2, 150));
  }
}

// ─────────────────────────────────────────────────────────────
// 4. 用例
// ─────────────────────────────────────────────────────────────
const INDEX = `${ORIGIN}/mhys/index.html`;

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

async function stub(m, qigua) {
  await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify({ qigua }) });
}
// 每条用例都从干净的排盘页开始：上一次点过「开始排盘」会跳走，页面已经不是它了
// （不回到 index 就报 `getElementById(...) is null`）
async function reset(m) {
  await fetch(`${ORIGIN}/__reset`, { method: 'POST' });
  await goto(m, INDEX);
  // mhys_anon_used 也要清 —— 自动解读跑完一次游客就被标记成「用过免费次数」，
  // 不清的话下一条用例里自动打开的面板会改成弹登录引导。
  await js(m, `window.localStorage.removeItem('mhys_result');
    window.localStorage.removeItem('mhys_anon_used'); return true;`);
}
async function captured() {
  return (await (await fetch(`${ORIGIN}/__captured`)).json()).captured;
}
async function saved() {
  return (await (await fetch(`${ORIGIN}/__saved`)).json()).saved;
}
async function chat() {
  return (await (await fetch(`${ORIGIN}/__chat`)).json()).chat;
}
const panelOpen = L.panelOpen;
const panelText = L.panelText;
const panelTextUntil = L.panelTextUntil;

// 结果区的正文：**卦是照后端卦号渲染出来的**，所以正文就是判据。
// 只能读 #resultArea，不能读 document.body —— 输入卡片也在 body 里，正文一上来就
// 超过长度门槛，会在结果渲染出来之前就返回（第一版读过 localStorage，更糟：
// `result.html` 一到就把 `mhys_result` 读掉并删除，读回来永远是 null）。
function resultText(m, timeoutMs) {
  return L.textOf(m, '#resultArea', timeoutMs, 30);
}

// 桩卦：上 3 下 6 动 5。64 卦表里 上3下6 = 火水未济（独立于页面代码的判据）
const STUB_GUA = { upper_num: 3, lower_num: 6, moving: 5 };

async function main() {
  const server = await startServer();
  const { child, m, prof } = await launchFirefox();
  let code = 0;
  let dimOnIndex = '';   // 原地结果区的次要文字颜色，⑨ 拿它跟结果页比
  try {
    // ── ① 桩卦：页面渲染的卦必须来自后端 ────────────────────────
    console.log('\n① 桩卦（上3下6动5）：页面拿后端的卦号渲染，自己不取数');
    await stub(m, STUB_GUA);
    await reset(m);
    console.log('   · 选时间起卦，起卦时间设 2026-09-25 08:30');
    await selectMethod(m, 'time');
    await setTime(m, 2026, 9, 25, 8, 30);
    await clickStart(m);
    let r = await waitResult(m, 8000);
    let cap = await captured();
    let text = await resultText(m, 8000);
    // 桩卦上3下6动5 → 本卦「火水未济」；动五爻（从下数第五 = 上卦中爻）→ 变卦「天水讼」。
    // 两个卦名都由 64 卦表（事实）与动爻位置决定，页面上任何一个不对都说明它没用后端的数。
    check('结果区渲染出桩卦的本卦名（火水未济 = 上3下6）',
      /火水未济/.test(text), JSON.stringify(text).slice(0, 160));
    check('结果区渲染出桩卦的变卦名（天水讼 = 动第五爻）',
      /天水讼/.test(text), JSON.stringify(text).slice(0, 160));
    check('结果区的卦式写中文法名', /时间起卦/.test(text), JSON.stringify(text).slice(0, 160));
    check('结果就在本页出（location 还是排盘页，没跳 result.html）',
      /\/mhys\/index\.html/.test(r.href) && !/result\.html/.test(r.href), r.href);
    check('页面里已无起卦实现（运行期检查，不是读源码）',
      await js(m, `${W}
        return [typeof W.timeDivination, typeof W.num1Divination, typeof W.num2Divination,
          typeof W.manualDivination, typeof W.autoDivination, typeof W.getLunarInfo].join(',')`)
        === 'undefined,undefined,undefined,undefined,undefined,undefined',
      '页面上仍有旧的起卦函数');
    check('请求体的起卦时刻 = 页面上选的 08:30（不是墙上时钟）',
      cap.length === 1 && cap[0].datetime === '2026-09-25T08:30:00', JSON.stringify(cap[cap.length - 1]));

    // ── ② 加时辰：时辰取**选定时刻** ────────────────────────────
    console.log('\n② 加时辰用选定时刻（原先读的是墙上时钟，用户看不见）');
    const report386 = `${W}
      document.getElementById('numberInput').value = '3 8 6';
      document.getElementById('numberAddShichen').checked = true; return true;`;
    await reset(m);
    await selectMethod(m, 'number');
    await js(m, report386);
    await setTime(m, 2026, 9, 25, 8, 30);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('提交了 addShichen=true', cap.length === 1 && cap[0].addShichen === true, JSON.stringify(cap));
    check('时辰来自选定的 08:30（辰时），不是真实时钟',
      cap.length === 1 && cap[0].datetime === '2026-09-25T08:30:00', JSON.stringify(cap[0] && cap[0].datetime));

    // 同一个输入、只改时间：若时辰取自墙上时钟，这两次会给出同一个卦
    await reset(m);
    await selectMethod(m, 'number');
    await js(m, report386);
    await setTime(m, 2026, 9, 25, 22, 0);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('改选 22:00 后提交的就是 22:00（跟着选择器走）',
      cap.length === 1 && cap[0].datetime === '2026-09-25T22:00:00', JSON.stringify(cap[0] && cap[0].datetime));

    // ── ③ 报数解析 ─────────────────────────────────────────────
    console.log('\n③ 报数：386 与 10 8 6 都要能报');
    await reset(m);
    await js(m, `document.getElementById('numberInput').value = '386'; return true;`);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('「386」→ 三个数字 3/8/6',
      cap.length === 1 && cap[0].num1 === 3 && cap[0].num2 === 8 && cap[0].num3 === 6, JSON.stringify(cap[0]));

    await reset(m);
    await js(m, `document.getElementById('numberInput').value = '10 8 6'; return true;`);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('「10 8 6」→ 三个数 10/8/6（输入框原先限死 3 位，报 10 打不出来）',
      cap.length === 1 && cap[0].num1 === 10 && cap[0].num2 === 8 && cap[0].num3 === 6, JSON.stringify(cap[0]));

    await reset(m);
    await js(m, `document.getElementById('numberInput').value = '3 0 8'; return true;`);
    await clickStart(m);
    r = await waitResult(m, 3000);
    cap = await captured();
    check('含 0 被拦下（0 不在先天卦数里）且**没有**发请求',
      cap.length === 0 && r.alerts.length === 1 && /0/.test(r.alerts[0]),
      `请求数 ${cap.length} / 提示 ${JSON.stringify(r.alerts)}`);

    // ── ④ 拆半求和 ─────────────────────────────────────────────
    console.log('\n④ 拆半求和送的是逐位数字');
    await reset(m);
    await selectMethod(m, 'split');
    await js(m, `document.getElementById('splitInput').value = '386';
      document.getElementById('splitAddShichen').checked = true; return true;`);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('digits = [3,8,6] 且 method=split',
      cap.length === 1 && cap[0].method === 'split'
      && JSON.stringify(cap[0].digits) === '[3,8,6]', JSON.stringify(cap[0]));

    // ── ⑤ 字占 ────────────────────────────────────────────────
    console.log('\n⑤ 字占送原文（笔画表在后端，页面没有）');
    await reset(m);
    await selectMethod(m, 'character');
    await js(m, `document.getElementById('charInput').value = '求财'; return true;`);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('method=character 且 text=求财',
      cap.length === 1 && cap[0].method === 'character' && cap[0].text === '求财', JSON.stringify(cap[0]));

    // ── ⑥ 手动指定 / 自动起卦 ──────────────────────────────────
    console.log('\n⑥ 手动指定与自动起卦');
    await reset(m);
    await selectMethod(m, 'manual');
    // 三个下拉是 `setTimeout(fillManualSelects, 50)` 填的；不等它就 `.value='4'`
    // 会落在一个空 select 上（值仍是空串 → NaN → 被校验拦下，看起来像「功能坏了」）
    for (let i = 0; i < 40; i++) {
      const n = await js(m, `var s = document.getElementById('manualUpper');
        return s ? s.options.length : -1;`);
      if (n >= 8) break;
      await new Promise((r2) => setTimeout(r2, 100));
    }
    await js(m, `document.getElementById('manualUpper').value = '4';
      document.getElementById('manualLower').value = '7';
      document.getElementById('manualMove').value = '2'; return true;`);
    await clickStart(m);
    await waitResult(m, 8000);
    cap = await captured();
    check('manual 送 4/7/2',
      cap.length === 1 && cap[0].method === 'manual' && cap[0].upper === 4
      && cap[0].lower === 7 && cap[0].moving === 2, JSON.stringify(cap));

    const draws = [];
    for (let i = 0; i < 3; i++) {
      await reset(m);              // reset 会重新导航，页面方法回到默认 —— 之后要重选
      await selectMethod(m, 'auto');
      await clickStart(m);
      r = await waitResult(m, 8000);
      const c = (await captured())[0] || {};
      draws.push(`${c.upper}-${c.lower}-${c.moving}`);
      // 记录里写的是哪种起卦法，看结果区「卦式」那行（页面把它渲染成中文）
      const txt = await resultText(m, 6000);
      check(`自动起卦第 ${i + 1} 次：抽签在页面、按 manual 入后端、记录仍写「自动起卦」`,
        c.method === 'manual' && c.upper >= 1 && c.upper <= 8 && c.lower >= 1 && c.lower <= 8
        && c.moving >= 1 && c.moving <= 6 && /自动起卦/.test(txt),
        JSON.stringify(c) + ' / href=' + r.href + ' / 正文=' + JSON.stringify(txt.slice(0, 80))
        + ' / 提示=' + JSON.stringify(r.alerts));
    }
    check('三次抽签不是同一个卦（确实是随机，不是写死）',
      new Set(draws).size > 1, draws.join(' '));

    // ── ⑦ 真端点：手算值 ───────────────────────────────────────
    console.log('\n⑦ 换回真端点：7/4/3 的期望值手算后写死');
    const report743 = `${W}
      document.getElementById('numberInput').value = '7 4 3';
      document.getElementById('numberAddShichen').checked = false; return true;`;
    await stub(m, null);
    await reset(m);
    await selectMethod(m, 'number');
    await js(m, report743);
    await setTime(m, 2026, 9, 25, 8, 30);
    await clickStart(m);
    r = await waitResult(m, 8000);
    text = await resultText(m, 8000);
    // 手算：上 = 7 % 8 = 7（艮）、下 = 4 % 8 = 4（震）→ 本卦山雷颐；
    // 动 = (7+4+3) % 6 = **2**（三数之和，不是第三个数 3）。
    // 山雷颐六爻自下而上 1,0,0,0,0,1（上艮下震），动二爻 → 上艮下兑 = 山泽损。
    // 若按错法取动爻 3，变卦会是「山火贲」—— 两个名字不同，故这一条能把错法钉死。
    check('结果页渲染出 7/4 的本卦名「山雷颐」（上7下4）',
      /山雷颐/.test(text), JSON.stringify(text).slice(0, 160));
    check('变卦 = 山泽损 ⇒ 动爻是第 2 爻（三数之和 14 % 6 = 2；取第三个数的话是山火贲）',
      /山泽损/.test(text) && !/山火贲/.test(text), JSON.stringify(text).slice(0, 200));

    // ── ⑧ 保存路径（原地出结果，不再跳结果页）──────────────────
    console.log('\n⑧ 填了事项 → 存记录 → 结果就地出，留在本页');
    await reset(m);
    await selectMethod(m, 'number');
    await js(m, report743);
    await setTime(m, 2026, 9, 25, 8, 30);
    await js(m, `document.getElementById('topicInput').value = '测试事项'; return true;`);
    await clickStart(m);
    r = await waitResult(m, 10000);
    const sv = await saved();
    check('记录已提交，method 与 resultData 都带上',
      sv.length === 1 && sv[0].method === 'number' && !!sv[0].resultData
      && sv[0].resultData.topic === '测试事项',
      JSON.stringify(sv).slice(0, 200));
    check('记录里留着后端起的卦（含取数过程）',
      sv.length === 1 && !!sv[0].resultData.qigua
      && sv[0].resultData.qigua.upper_num === 7 && sv[0].resultData.qigua.moving === 2,
      JSON.stringify(sv[0] && sv[0].resultData && sv[0].resultData.qigua).slice(0, 160));
    check('存了记录也不跳走（原地出结果）',
      /\/mhys\/index\.html/.test(r.href) && !/result\.html/.test(r.href), r.href);

    // 结果区渲染不白屏，且是本页自己渲染的（结果页的渲染器已被共用）
    text = await resultText(m, 8000);
    check('结果区有内容、卦式是中文法名、桩卦的卦名对',
      text.length > 30 && /报数起卦/.test(text) && /山雷颐/.test(text),
      JSON.stringify(text).slice(0, 200));
    check('结果区是本页填的（#resultArea 有子节点）',
      await js(m, `var a = document.getElementById('resultArea');
        return !!a && a.children.length > 0;`), 'resultArea 还是空的');
    // 原地结果与结果页现在吃同一份 CSS，次要文字的颜色必须一模一样（两页的 :root
    // 都把这套变量定成 #1a1a1a）。这里钉住它，免得哪天有人只给其中一页加覆盖。
    dimOnIndex = await js(m, `var e = document.querySelector('#resultArea span[style*="--text-dim"]');
      return e ? getComputedStyle(e).color : '';`);
    check('原地结果区的次要文字颜色 = rgb(26,26,26)（与结果页同一套变量）',
      dimOnIndex === 'rgb(26, 26, 26)', dimOnIndex);

    // ── ⑨ 结果页没被共用件改坏 ────────────────────────────────
    // 历史记录点进去看的还是 result.html，它现在吃共用的 mhys_render.js +
    // mhys_result.css。上面那几条全走的是本页原地渲染，一条也覆盖不到它。
    console.log('\n⑨ 结果页（历史记录入口）仍照旧渲染');
    await goto(m, `${ORIGIN}/mhys/result.html?id=999`);
    text = await js(m, `return document.body.innerText || '';`);  // 结果页没有 #resultArea，读正文
    check('结果页渲染出记录里的卦（山雷颐）',
      /山雷颐/.test(text), JSON.stringify(text).slice(0, 200));
    check('结果页渲染出事项与中文卦式',
      /测试事项/.test(text) && /报数起卦/.test(text), JSON.stringify(text).slice(0, 200));
    check('结果页有分析区（renderAnalysis 找得到 #analysisArea）',
      await js(m, `var a = document.getElementById('analysisArea');
        return !!a && a.innerText.length > 20;`), '分析区空或不存在');
    check('结果页样式生效（.card 有边框，说明 mhys_result.css 加载了）',
      await js(m, `var c = document.querySelector('.card');
        return !!c && getComputedStyle(c).borderTopWidth !== '0px';`), '样式没生效');
    const dimColor = await js(m, `var e = document.querySelector('#analysisArea span[style*="--text-dim"]');
      return e ? getComputedStyle(e).color : 'NO-ELEM';`);
    check('结果页的次要文字颜色与原地结果一致（rgb(26,26,26)）',
      dimColor === dimOnIndex && dimColor === 'rgb(26, 26, 26)', dimColor + ' vs 原地 ' + dimOnIndex);

    // ── ⑩ 结果出来自动开始解读 ────────────────────────────────
    console.log('\n⑩ 原地出结果后 AI 面板自动打开并开始解读');
    await stub(m, STUB_GUA);
    await reset(m);
    check('排盘页也挂了 AI 面板（共享件自己 mount，页面里已无那段标注）',
      await js(m, `return !!(document.getElementById('aiPanel')
        && document.getElementById('aiPanelOverlay')
        && document.getElementById('aiFollowBar'));`), '页面上找不到 aiPanel');
    check('起卦前面板是关着的', !(await panelOpen(m)), '面板一开始就开着');

    // 起卦前点「开始解卦」：没有卦可解，应该说一句就回去，而不是发一个空请求
    await js(m, `document.getElementById('aiBarBtn').click(); return true;`);
    await js(m, `document.querySelector('.ai-start-btn').click(); return true;`);
    await new Promise((r2) => setTimeout(r2, 400));
    check('没起卦就点解析 → 只提示、不发 AI 请求',
      (await chat()).length === 0, JSON.stringify(await chat()));
    check('提示语是「先起一卦」',
      await js(m, `return document.body.innerText.indexOf('先起一卦') >= 0;`), '没看到提示语');
    // 页面里的函数得从 wrappedJSObject 上取 —— 注入脚本的沙箱看不见页面全局（老坑）
    await js(m, `${W} W.closeAIPanel(); return true;`);

    await selectMethod(m, 'time');
    await setTime(m, 2026, 9, 25, 8, 30);
    await clickStart(m);
    r = await waitResult(m, 10000);
    check('结果出来后面板自动打开了（不用用户再点）', await panelOpen(m), '面板没打开');
    const aiTxt = await panelTextUntil(m, /【三、建议】/, 8000);
    check('面板把流式正文全程收完并渲染（桩文本三段都在）',
      /【一、结论】/.test(aiTxt) && /【三、建议】/.test(aiTxt), JSON.stringify(aiTxt).slice(0, 200));
    check('正文是按 markdown 渲染的（【一、结论】成了区块标题，不是原文）',
      await js(m, `var a = document.getElementById('aiResponse');
        return !!a.querySelector('div[style*="var(--accent)"]');`), '没找到区块标题');
    check('整串流程没有 JS 报错（少了全局、拆家拆漏了都会在这里冒出来）',
      r.errs.length === 0, JSON.stringify(r.errs).slice(0, 300));
    const ch = await chat();
    check('自动解读把这一卦的排盘数据发给了后端',
      ch.length === 1 && ch[0].cardType === 'mhys' && !!ch[0].cardData
      && ch[0].cardData.hexagrams.benGua.name === '火水未济',
      JSON.stringify(ch[0] && ch[0].cardData && ch[0].cardData.hexagrams.benGua.name));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    server.close();
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* 临时目录，留着也无害 */ }
  }

  if (fails.length) {
    console.log(`\n❌ ${fails.length} 项失败：`);
    for (const f of fails) console.log('   ' + f);
    code = 1;
  } else {
    console.log('\n✅ 梅花页验收通过：起卦下沉（页面自己不起卦）+ 结果就地出（不再跳结果页）'
      + '（本机静态服务 + 真 Firefox；不含线上 nginx/鉴权）');
  }
  process.exit(code);
}

main().catch((e) => {
  console.error('❌ 驱动脚本自身出错：' + (e && e.stack || e));
  process.exit(2);
});

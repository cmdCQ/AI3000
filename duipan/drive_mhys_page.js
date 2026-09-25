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
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

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
const state = { stub: null, captured: [], savedRecords: [] };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      try { resolve(b ? JSON.parse(b) : {}); } catch (e) { resolve({}); }
    });
  });
}

function sendJson(res, obj, status) {
  const s = JSON.stringify(obj);
  res.writeHead(status || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(s);
  return obj;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, ORIGIN);
    const pathname = url.pathname;

    // 控制面（驱动脚本自用，页面不会碰）
    if (pathname === '/__stub') {
      state.stub = (await readBody(req)).qigua || null;
      return sendJson(res, { ok: true, stub: state.stub });
    }
    if (pathname === '/__captured') return sendJson(res, { captured: state.captured });
    if (pathname === '/__reset') {
      state.captured = []; state.savedRecords = [];
      return sendJson(res, { ok: true });
    }
    if (pathname === '/__saved') return sendJson(res, { saved: state.savedRecords });

    if (req.method === 'POST' && pathname === '/api/meihua/paipan') {
      const body = await readBody(req);
      state.captured.push(body);
      if (state.stub) {
        // 桩只回页面真正要用的东西：卦号 + 一个形状完整的 qigua。
        // 页面**只能**照这些数渲染 —— 它自己算不出 3/6/5。
        const q = state.stub;
        return sendJson(res, {
          paipan: { stub: true }, sizhu: null,
          qigua: { method: body.method, upper_num: q.upper_num, lower_num: q.lower_num, moving: q.moving },
          text: '(桩)',
        });
      }
      return runEndpoint(req, res, body, pathname, sendJson, promptLib, LY);
    }

    if (req.method === 'POST' && pathname === '/api/mhys-records') {
      const body = await readBody(req);
      state.savedRecords.push(body);
      return sendJson(res, { id: 999 });
    }
    // 结果页按 id 取记录（`result.html` 读的是 result_data/topic/created_at 三个字段）
    if (req.method === 'GET' && /^\/api\/mhys-records\/\d+$/.test(pathname)) {
      const last = state.savedRecords[state.savedRecords.length - 1];
      if (!last) return sendJson(res, { error: '没有记录' }, 404);
      return sendJson(res, {
        id: 999, topic: last.topic, method: last.method,
        result_data: last.resultData, ai_analysis: '', created_at: new Date().toISOString(),
      });
    }
    // 别的 /api/* 一律空回，免得页面上的鉴权/记录请求把水搅浑
    if (pathname.startsWith('/api/')) return sendJson(res, {});

    // 静态文件
    let p = path.join(WEB, decodeURIComponent(pathname));
    if (!p.startsWith(WEB)) { res.writeHead(403); return res.end(); }
    try {
      if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      const buf = fs.readFileSync(p);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      return res.end(buf);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

// ─────────────────────────────────────────────────────────────
// 2. Marionette 线协议（长度前缀 JSON，协议 v3）
//
// 本机没有 pip（`marionette-driver` 装不上），故直接实现线协议 —— 它很短：
// 每个报文是 `<UTF-8 字节数>:<JSON>`，**命令报文是数组** `[0, id, name, params]`，
// 应答是 `[1, id, error, result]`。第一帧是 Firefox 主动发的问候对象
// `{"applicationType":"gecko","marionetteProtocol":3}`（没有 id，丢掉即可）。
//
// 踩过的坑：命令写成对象 `{id,name,params}` 会让 Firefox 回
// 「Unable to unmarshal packet data」并且**不报错给你**，只是永远不回话 ——
// 表现是脚本静默挂住（第一版就是这么卡死的）。长度按字节算，中文报文会差。
// ─────────────────────────────────────────────────────────────
class Marionette {
  constructor(sock) {
    this.sock = sock; this.buf = Buffer.alloc(0); this.id = 0; this.waiters = [];
    sock.on('data', (c) => {
      this.buf = Buffer.concat([this.buf, c]);
      this.drain();
    });
  }

  drain() {
    for (;;) {
      const sep = this.buf.indexOf(0x3a);
      if (sep < 0) return;
      const len = parseInt(this.buf.slice(0, sep).toString('utf8'), 10);
      if (!Number.isFinite(len)) throw new Error('marionette: 报文头解析失败');
      if (this.buf.length < sep + 1 + len) return;
      const payload = this.buf.slice(sep + 1, sep + 1 + len).toString('utf8');
      this.buf = this.buf.slice(sep + 1 + len);
      const msg = JSON.parse(payload);
      if (!Array.isArray(msg)) continue;              // 问候帧
      const [, id, error, result] = msg;
      const w = this.waiters.shift();
      if (!w) continue;
      if (error) w.reject(new Error(`${error.error || 'marionette 错误'}：${error.message || ''}`));
      else w.resolve(result);
    }
  }

  send(name, params) {
    const id = ++this.id;
    const payload = Buffer.from(JSON.stringify([0, id, name, params || {}]), 'utf8');
    this.sock.write(Buffer.concat([Buffer.from(`${payload.length}:`, 'utf8'), payload]));
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
}

// 连上就**留住这条连接**（不要再单独探端口：探完即断的那条连接虽无害，但留着
// 一条开着的连接更简单，也少一次「谁才是客户端」的疑问）
function connectMarionette(port, timeoutMs) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const s = net.connect(port, '127.0.0.1');
      s.once('connect', () => resolve(s));
      s.once('error', () => {
        s.destroy();
        if (Date.now() - t0 > timeoutMs) reject(new Error(`等 marionette 端口 ${port} 超时`));
        else setTimeout(tick, 250);
      });
    };
    tick();
  });
}

async function launchFirefox() {
  const bin = ['/usr/bin/firefox', '/usr/lib/firefox/firefox'].find((p) => fs.existsSync(p));
  if (!bin) { console.error('❌ 找不到 firefox —— 本脚本要真页面，不接受替代。'); process.exit(2); }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'mhys-prof-'));
  const child = spawn(bin, ['--headless', '--new-instance', '--marionette', '-profile', prof,
    '--no-remote', 'about:blank'], { stdio: 'ignore' });
  const child_exit = new Promise((r) => child.once('exit', (c) => r(c)));
  const sock = await connectMarionette(MARIONETTE_PORT, 25000).catch((e) => {
    child.kill('SIGKILL');
    console.error(`❌ ${e.message}（Firefox 起不来？）`);
    process.exit(2);
  });
  const m = new Marionette(sock);
  // 先让问候帧进来，再开会话（问候帧没有 id，drain 里会丢掉）
  await new Promise((r) => setTimeout(r, 200));
  const sess = await m.send('WebDriver:NewSession', { capabilities: {} });
  if (!sess || !sess.sessionId) {
    child.kill('SIGKILL');
    console.error('❌ 开 marionette 会话失败：' + JSON.stringify(sess));
    process.exit(2);
  }
  return { child, child_exit, m, sessionId: sess.sessionId, prof };
}

// ─────────────────────────────────────────────────────────────
// 3. 页面操作原语
// ─────────────────────────────────────────────────────────────
async function js(m, script, args) {
  const r = await m.send('WebDriver:ExecuteScript', { script, args: args || [], sandbox: 'default' });
  return r.value;
}

// ExecuteScript 跑在**沙箱**里，看页面是 Xray 视角：页面自己用 `function f(){}`
// 定义的全局（selectMethod、selectedTime、TRIGRAMS…）**看不见**，直接写
// `selectMethod(...)` 会报 `ReferenceError: selectMethod is not defined`。
// 要摸到它们必须走 `window.wrappedJSObject`。故本文件所有脚本都先取 `W`。
// （误诊过一次：以为是页面没加载完/被字体请求卡住，其实是看不见。）
const W = 'var W = window.wrappedJSObject || window;';

async function goto(m, url) {
  await m.send('WebDriver:Navigate', { url });
  // 页面上的 alert 会**阻塞** marionette 会话，故导航后立刻换成记录器；
  // 顺便记未捕获异常 —— 页面报错时看得见，不至于只看到「用例失败」。
  await js(m, `${W}
    W.__alerts = [];
    var rec = function (msg) { W.__alerts.push(String(msg)); };
    W.alert = rec;
    try { window.alert = rec; } catch (e) {}
    W.__errs = [];
    window.addEventListener('error', function (e) { W.__errs.push(String(e.message)); });
    return true;
  `);
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

// 点完按钮等结果：要么存进 localStorage（事项为空），要么跳到 result.html
async function waitResult(m, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    const r = await js(m, `${W}
      var s = window.localStorage.getItem('mhys_result');
      return { href: location.href, stored: s || null,
        alerts: (W.__alerts || []).slice(), errs: (W.__errs || []).slice() };
    `);
    if (r.stored || /result\.html/.test(r.href) || r.alerts.length) return r;
    if (Date.now() - t0 > timeoutMs) return r;
    await new Promise((r2) => setTimeout(r2, 150));
  }
}

function parseStored(r) {
  try { return JSON.parse(r.stored); } catch (e) { return null; }
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
  await js(m, `window.localStorage.removeItem('mhys_result'); return true;`);
}
async function captured() {
  return (await (await fetch(`${ORIGIN}/__captured`)).json()).captured;
}
async function saved() {
  return (await (await fetch(`${ORIGIN}/__saved`)).json()).saved;
}

// 结果页的正文：**卦是照后端卦号渲染出来的**，所以正文就是判据。
// 不能读 localStorage —— `result.html` 一到就把 `mhys_result` 读掉并删除，
// 读回来永远是 null（第一版就是这么误判「页面没出记录」的）。
async function resultText(m, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    const t = await js(m, `return document.body.innerText || '';`);
    if (t && t.length > 30) return t;
    if (Date.now() - t0 > timeoutMs) return t;
    await new Promise((r) => setTimeout(r, 150));
  }
}

// 桩卦：上 3 下 6 动 5。64 卦表里 上3下6 = 火水未济（独立于页面代码的判据）
const STUB_GUA = { upper_num: 3, lower_num: 6, moving: 5 };

async function main() {
  const server = await startServer();
  const { child, m, prof } = await launchFirefox();
  let code = 0;
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
    check('结果页渲染出桩卦的本卦名（火水未济 = 上3下6）',
      /火水未济/.test(text), JSON.stringify(text).slice(0, 160));
    check('结果页渲染出桩卦的变卦名（天水讼 = 动第五爻）',
      /天水讼/.test(text), JSON.stringify(text).slice(0, 160));
    check('结果页的卦式写中文法名', /时间起卦/.test(text), JSON.stringify(text).slice(0, 160));
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
      // 记录里写的是哪种起卦法，看结果页的「卦式」那行（它渲染的是存下来的记录）
      const txt = /result\.html/.test(r.href) ? await resultText(m, 6000) : '';
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

    // ── ⑧ 保存路径 ────────────────────────────────────────────
    console.log('\n⑧ 填了事项 → 存记录 → 跳结果页');
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
    check('跳到结果页并带上记录 id', /result\.html\?v=4&id=999/.test(r.href), r.href);

    // 结果页渲染不白屏（起卦下沉后 result.html 仍吃 result.gua）
    text = await resultText(m, 8000);
    check('结果页有内容且卦式是中文法名',
      text.length > 30 && /报数起卦/.test(text), JSON.stringify(text).slice(0, 200));
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
    console.log('\n✅ 梅花页起卦下沉验收通过（本机静态服务 + 真 Firefox；不含线上 nginx/鉴权）');
  }
  process.exit(code);
}

main().catch((e) => {
  console.error('❌ 驱动脚本自身出错：' + (e && e.stack || e));
  process.exit(2);
});

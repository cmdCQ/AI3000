/**
 * 驱页工具：真浏览器 + 本机静态服务器（梅花页与六爻页两个驱动脚本共用）
 * ==========================================================================
 *
 * 来源：2026-09-25 从 `duipan/drive_mhys_page.js` 里把**与页面无关的那部分**
 * 整段搬出（Marionette 线协议、启动无头 Firefox、本机站点、几个操作原语），
 * 逻辑逐字未改，只是加了参数。这样做的原因是六爻页也要同一套驱动：那两个
 * 脚本各抄一份的话，「读页面正文」「点按钮」这些原语的实现会慢慢分家 ——
 * 而分家之后两个脚本的严格程度就不一样了，谁更松谁的绿是假的。
 *
 * 本文件**不知道**页面长什么样：MIME、静态目录、端口、会话能力都在参数里。
 * 页面相关的东西（桩、控制面、用例）留在各自的驱动脚本里。
 *
 * 依赖：firefox（无头，走 marionette 线协议，直接实现，不需要 python 的
 * marionette_driver —— 本机没有 pip）。本机没有 node_modules，故只用内置模块。
 */

'use strict';

const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// ─────────────────────────────────────────────────────────────
// 1. 本机静态站点（页面 + 驱动自己挂的桩端点）
// ─────────────────────────────────────────────────────────────

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
  res.writeHead(status || 200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
  return obj;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * 起一个站点：`api` 先过（返回真表示已处理），剩下的一律当静态文件发。
 *
 * @param {object} o
 * @param {number} o.port
 * @param {string} o.origin      形如 `http://127.0.0.1:8899`（用来解析 URL / 挡越界）
 * @param {string} o.web         静态根目录（`build/nginx`）
 * @param {function} [o.api]     async (req, res, pathname, url) => boolean
 * @returns {Promise<http.Server>}
 */
function startServer(o) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, o.origin);
    const pathname = url.pathname;

    if (o.api && await o.api(req, res, pathname, url)) return;

    let p = path.join(o.web, decodeURIComponent(pathname));
    if (!p.startsWith(o.web)) { res.writeHead(403); return res.end(); }
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
  return new Promise((resolve) => server.listen(o.port, '127.0.0.1', () => resolve(server)));
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
    this.sock = sock; this.buf = Buffer.alloc(0); this.id = 0; this.waiters = new Map();
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
      // 应答里的 id 是**回显**的 `[1, id, error, result]`，按 id 认领，**不能按到达顺序
      // 排队认领**。原来是无条件 `shift()`，这在「每条命令都等到应答」时看不出问题，
      // 但只要有**一条命令被放弃**（超时、或故意不等 —— 见 `sendNoWait`），那一条的
      // 位置就一直占着队首，此后每条应答都错认给上一条：表现是「命令都返回了，但返回
      // 的是别人的结果」，而且不报错。线上导航就是这么被拖住的 —— 页面 load 事件迟迟
      // 不来（>25s），而 marionette 的 Navigate 恰恰要等 load。
      const [, id, error, result] = msg;
      const w = this.waiters.get(id);
      if (!w) continue;                               // 已被放弃的那条应答复：丢掉
      this.waiters.delete(id);
      if (error) w.reject(new Error(`${error.error || 'marionette 错误'}：${error.message || ''}`));
      else w.resolve(result);
    }
  }

  /** 发一条命令，登记 id 等应答。`ms` 给了就超时放弃（并注销，免得应答错认给下一条） */
  send(name, params, ms) {
    const id = this.sendNoWait(name, params);
    const p = new Promise((resolve, reject) => this.waiters.set(id, { resolve, reject }));
    if (!ms) return p;
    return Promise.race([p, new Promise((_, rj) => setTimeout(() => {
      this.waiters.delete(id);
      rj(new Error(`marionette 命令超时 ${ms}ms：${name}`));
    }, ms))]);
  }

  /**
   * 只发不等（返回 id）。**Navigate 要用它** —— marionette 的 Navigate 要等 load 事件，
   * 而线上页面的 load 可能被任何一个慢资源拖住（我们遇到的是 >25s 不返回）。
   * geckodriver 的 `pageLoadStrategy: eager` 是在 geckodriver 那一层实现的，
   * **marionette 本身不认**（实测：capabilities 里报的仍是 normal）。故这条路只有两条：
   * 要么自己轮询文档就绪（`goto` 就是这么做的），要么等一个可能永远不来的事件。
   */
  sendNoWait(name, params) {
    const id = ++this.id;
    const payload = Buffer.from(JSON.stringify([0, id, name, params || {}]), 'utf8');
    this.sock.write(Buffer.concat([Buffer.from(`${payload.length}:`, 'utf8'), payload]));
    return id;
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

/**
 * 起无头 Firefox 并开好会话。
 *
 * `--marionette` 只开端口，**端口号取自 pref `marionette.port`（默认 2828）**，
 * 命令行上并没有一个 `--marionette-port`。起新 profile 时先在 profile 里写一份
 * `user.js` 把它定下来 —— 不写的话，只有恰好用 2828 的调用方能连上，别的调用方
 * 会看到「等 marionette 端口超时」（六爻页驱动第一版就是这么卡住的：它用 2829）。
 * 两个脚本各写一份 user.js 也行，但那样端口就成了各脚本的私事，改一处漏一处。
 *
 * @param {object} o { port, profilePrefix }
 * @returns {Promise<{child, child_exit, m, sessionId, prof}>}
 */
async function launchFirefox(o) {
  const bin = ['/usr/bin/firefox', '/usr/lib/firefox/firefox'].find((p) => fs.existsSync(p));
  if (!bin) { console.error('❌ 找不到 firefox —— 本脚本要真页面，不接受替代。'); process.exit(2); }
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), (o.profilePrefix || 'drive-') + '-'));
  fs.writeFileSync(path.join(prof, 'user.js'),
    `user_pref("marionette.port", ${o.port});\n`, 'utf8');
  const child = spawn(bin, ['--headless', '--new-instance', '--marionette', '-profile', prof,
    '--no-remote', 'about:blank'], { stdio: 'ignore' });
  const child_exit = new Promise((r) => child.once('exit', (c) => r(c)));
  const sock = await connectMarionette(o.port, 25000).catch((e) => {
    child.kill('SIGKILL');
    console.error(`❌ ${e.message}（Firefox 起不来？）`);
    process.exit(2);
  });
  const m = new Marionette(sock);
  // 先让问候帧进来，再开会话（问候帧没有 id，drain 里会丢掉）
  await sleep(200);
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

async function js(m, script, args, ms) {
  const r = await m.send('WebDriver:ExecuteScript',
    { script, args: args || [], sandbox: 'default' }, ms);
  return r.value;
}

// ExecuteScript 跑在**沙箱**里，看页面是 Xray 视角：页面自己用 `function f(){}`
// 定义的全局（selectMethod、selectedTime、TRIGRAMS…）**看不见**，直接写
// `selectMethod(...)` 会报 `ReferenceError: selectMethod is not defined`。
// 要摸到它们必须走 `window.wrappedJSObject`。故所有脚本都先取 `W`。
// （误诊过一次：以为是页面没加载完/被字体请求卡住，其实是看不见。）
const W = 'var W = window.wrappedJSObject || window;';

async function goto(m, url, o) {
  o = o || {};
  const timeout = o.timeout || 25000;
  // **故意不等 Navigate 的应答**：它要等 load 事件，而线上页面的 load 被什么资源拖住了
  // （实测 >25s 不返回，资源本身 curl 都是几百毫秒级，只有真的进了浏览器才复现）。
  // 等新文档能跑脚本就够了 —— 页面该画的都画完了，剩下的是它在等自己的 load。
  m.sendNoWait('WebDriver:Navigate', { url });
  const want = String(url).split('#')[0];
  const t0 = Date.now();
  for (;;) {
    try {
      // 短超时：导航进行中 ExecuteScript 会**挂住**而不是报错，不给超时这个循环就死了
      const st = await js(m, `return { href: String(location.href).split('#')[0],
        ready: document.readyState };`, null, 4000);
      if (st && st.href === want && st.ready !== 'loading') break;
    } catch (e) { /* 上下文正被换掉：重来 */ }
    if (Date.now() - t0 > timeout) {
      throw new Error(`导航超时 ${timeout}ms（新文档没就绪，停在 ${await js(m, 'return String(location.href);', null, 3000).catch(() => '?')}）：${url}`);
    }
    await sleep(120);
  }
  // 页面上的 alert 会**阻塞** marionette 会话，故导航后立刻换成记录器；
  // 顺便记未捕获异常 —— 页面报错时看得见，不至于只看到「用例失败」。
  await js(m, `${W}
    W.__alerts = [];
    var rec = function (msg) { W.__alerts.push(String(msg)); };
    W.alert = rec;
    try { window.alert = rec; } catch (e) {}
    W.__errs = [];
    // 记上文件名与行号：只记 message 的话，一个「getElementById(...) is null」
    // 根本认不出是哪个页面哪一行（几百行的内联脚本里这种写法满地都是）。
    window.addEventListener('error', function (e) {
      W.__errs.push(String(e.message) + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno);
    });
    return true;
  `);
}

/** 反复取值直到 `ok` 成立或超时（超时返回最后一次的值，由调用方判定） */
async function until(m, script, ok, timeoutMs, stepMs) {
  const t0 = Date.now();
  let last;
  for (;;) {
    last = await js(m, script);
    if (ok(last)) return last;
    if (Date.now() - t0 > timeoutMs) return last;
    await sleep(stepMs || 150);
  }
}

/** 页面上的 alert / 未捕获异常（goto 时挂的钩子记下来的） */
function diagnostics(m) {
  return js(m, `${W}
    return { alerts: (W.__alerts || []).slice(), errs: (W.__errs || []).slice() };`);
}

async function panelOpen(m) {
  return js(m, `var p = document.getElementById('aiPanel');
    return !!p && p.classList.contains('open');`);
}

/** AI 面板正文（等它长到有内容） */
async function panelText(m, timeoutMs) {
  return until(m, `var r = document.getElementById('aiResponse');
    return r ? (r.innerText || '') : '';`, (t) => t && t.length > 10, timeoutMs);
}

// 流是一段一段来的，只看「有字了」会在第一段就返回（桩的第二段要等一下才到）。
// 要判据就等到正文匹配目标为止。
async function panelTextUntil(m, re, timeoutMs) {
  return until(m, `var r = document.getElementById('aiResponse');
    return r ? (r.innerText || '') : '';`, (t) => re.test(t || ''), timeoutMs);
}

/** 某个容器的正文（等它长到 `minLen`） */
async function textOf(m, selector, timeoutMs, minLen) {
  return until(m, `var a = document.querySelector(${JSON.stringify(selector)});
    return a ? (a.innerText || '') : '';`, (t) => t && t.length > (minLen == null ? 30 : minLen), timeoutMs);
}

module.exports = {
  MIME, readBody, sendJson, sleep, startServer,
  Marionette, connectMarionette, launchFirefox,
  js, W, goto, until, diagnostics,
  panelOpen, panelText, panelTextUntil, textOf,
};

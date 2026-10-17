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
 * @param {string} o.web         静态根目录（`src/web`）
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
 * 找出 firefox **实际会用的那个** profile 目录。
 *
 * 为什么非要找它：本机的 firefox 是 snap 包（`/usr/bin/firefox` 末行
 * `exec /snap/bin/firefox`），而这个版本**完全不认 `-profile`** —— 传了只会拿到一句
 * 骗人的 `Firefox is already running, but is not responding.`，进程当场退出、端口一个
 * 都不开。实测矩阵（`-profile X` / `--profile=X` / 换参数顺序 / 先把锁清干净）全挂，
 * 只有**不给** `-profile` 才起得来。所以 `marionette.port` 没法再靠临时 profile 指定，
 * 只能写进它真正会读的这个目录。snap 路径优先，再退化到 deb/rpm 的 `~/.mozilla`。
 */
function firefoxProfileDir() {
  const bases = [
    path.join(os.homedir(), 'snap', 'firefox', 'common', '.mozilla', 'firefox'),
    path.join(os.homedir(), '.mozilla', 'firefox'),
  ];
  for (const base of bases) {
    const ini = path.join(base, 'profiles.ini');
    if (!fs.existsSync(ini)) continue;
    for (const blk of fs.readFileSync(ini, 'utf8').split(/^\[/m).slice(1)) {
      if (!/^Default\s*=\s*1\s*$/m.test(blk)) continue;
      const p = (blk.match(/^Path\s*=\s*(.+)$/m) || [])[1];
      if (!p) continue;
      const rel = /^IsRelative\s*=\s*1\s*$/m.test(blk);
      return rel ? path.join(base, p.trim()) : p.trim();
    }
  }
  return null;
}

/**
 * 收掉上次遗留的无头 firefox。
 *
 * 为什么非收不可：snap 版 firefox 不认 `-profile`（见 `firefoxProfileDir`），所以所有
 * 驱动只能共用**同一个真 profile**，一个 profile 同时只允许一个实例用。上一个驱动只要
 * 没把 firefox 收干净（断言中途 `process.exit`、脚本崩了、只 SIGKILL 掉父进程），下一个
 * 驱动再起就是两个实例抢一份 profile —— 浏览器里表现为一连串莫名其妙的
 * `NS_ERROR_FAILURE` / `<TOP_LEVEL>` 报错，页面看着像坏了，而**真正的原因在进程表里**。
 * （2026-10-17 就是这么把 9 条变异全部毒成「没抓住」的。）
 *
 * 只收命令行带 `--headless` 的：那都是本 harness 起的。用户自己在图形界面开的浏览器
 * 不带这个参数，不会被误杀。
 */
function killHeadlessFirefox() {
  let n = 0;
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    let cmd = '';
    try { cmd = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8'); } catch (e) { continue; }
    if (!cmd.includes('firefox') || !cmd.includes('--headless')) continue;
    try { process.kill(Number(d), 'SIGKILL'); n++; } catch (e) { /* 已经没了 */ }
  }
  return n;
}

/**
 * 把本 harness 自己留在真 profile 里的站点状态清掉。
 *
 * 为什么非清不可：snap 版 firefox 不认 `-profile`（实测在**清空进程表**之后仍然报
 * 「Firefox is already running」，见 `firefoxProfileDir`），所以所有驱动只能共用
 * **同一个真 profile**。而 localStorage 与 cookie 都是持久的 —— 上一轮留在
 * `127.0.0.1:8901` 上的「游客已用过一次」标记，下一轮会被原样读到。后果是同一份代码、
 * 同一个脚本**第一遍绿、第二遍红**：2026-10-17 就是这样让 `mhys-twice` 与 `liuyao`
 * 的游客门那五条断言假红的。「可重复跑」是对拍的生命线，在这里破掉等于把验收废掉。
 *
 * 只动 `127.0.0.1` 的来源/承载文件：这个 profile 里除了本 harness 起的本地站，没别的。
 * cookie 必须一起清 —— cookie 按**主机**存，不按端口，所以 `127.0.0.1` 上的 cookie 是
 * 8897/8898/8901 三个驱动**互通**的，比 localStorage 更容易串。
 */
function clearSiteState(real) {
  let n = 0;
  const sd = path.join(real, 'storage', 'default');
  try {
    for (const e of fs.readdirSync(sd)) {
      if (!e.startsWith('http+++127.0.0.1')) continue;
      try { fs.rmSync(path.join(sd, e), { recursive: true, force: true }); n++; } catch (x) { /* 下次再说 */ }
    }
  } catch (e) { /* 还没有 storage 目录 = 本来就没状态 */ }
  for (const f of ['webappsstore.sqlite', 'webappsstore.sqlite-wal',
    'cookies.sqlite', 'cookies.sqlite-wal', 'cookies.sqlite-shm',
    // `ls-archive.sqlite` 是 firefox 给 localStorage 存的「已删值归档」，
    // 压在存储压力下会被读回来 —— 正是我们要清的那一类东西，顺手一起清。
    'storage/ls-archive.sqlite']) {
    const p = path.join(real, f);
    if (!fs.existsSync(p)) continue;
    try { fs.rmSync(p, { force: true }); n++; } catch (x) { /* 下次再说 */ }
  }
  return n;
}

/**
 * 起无头 Firefox 并开好会话。
 *
 * `--marionette` 只开端口，**端口号取自 pref `marionette.port`（默认 2828）**，命令行
 * 上并没有一个 `--marionette-port`；所以要在 profile 里写一份 `user.js` 把它定下来。
 * ⚠ 这份 `user.js` 写进的必须是**真 profile**（见 `firefoxProfileDir`），因为
 *   `-profile` 在 snap 版 firefox 上不生效。副作用：这是一个**全局**的 pref，多个驱动
 *   同时跑会互相覆盖端口 —— 本 harness 由 `regress_pages.sh` 顺序执行，不会并发。
 * ⚠ 每次启动前必须清三样：遗留的无头实例（`killHeadlessFirefox`）、陈旧 `.parentlock`、
 *   以及上一轮留下的站点状态（`clearSiteState`）。少清哪一样都会让验收变成
 *   「只有第一遍是对的」—— 那比红还难查。
 *
 * @param {object} o { port, profilePrefix }
 * @returns {Promise<{child, child_exit, m, sessionId, prof}>} `prof` 是个**可随手删的
 *   空目录**，不是真 profile —— 有 7 个调用方在收尾时 `fs.rmSync(prof,{recursive:true})`，
 *   所以它绝不能指向真 profile，否则每跑一次就删掉用户的 Firefox 配置。
 */
async function launchFirefox(o) {
  const bin = ['/usr/bin/firefox', '/usr/lib/firefox/firefox'].find((p) => fs.existsSync(p));
  if (!bin) { console.error('❌ 找不到 firefox —— 本脚本要真页面，不接受替代。'); process.exit(2); }
  const real = firefoxProfileDir();
  if (!real) {
    console.error('❌ 找不到 firefox 的 profile 目录（profiles.ini 里没有 Default=1 那段）');
    process.exit(2);
  }
  const killed = killHeadlessFirefox();
  if (killed) {
    console.log(`   · 先收掉上次遗留的 ${killed} 个无头 firefox 进程（它们占着同一份 profile）`);
    await sleep(800);   // 等它把 profile 与 marionette 端口真正放掉
  }
  for (const f of ['.parentlock', 'lock']) {
    try { fs.rmSync(path.join(real, f), { force: true }); } catch (e) { /* 本来就没有 */ }
  }
  const cleared = clearSiteState(real);
  if (cleared) {
    console.log(`   · 顺手清掉真 profile 里上一轮留下的站点状态（${cleared} 项）—— 不清的话这一轮会读到上一轮的游客标记`);
  }
  fs.writeFileSync(path.join(real, 'user.js'),
    `user_pref("marionette.port", ${o.port});\n`, 'utf8');
  // 这个目录 firefox 不会用（不给 -profile），只是给调用方一个能安全删掉的返回值。
  const prof = fs.mkdtempSync(path.join(process.env.DRIVE_PROFILE_DIR || os.homedir(),
    '.drive-firefox-'));
  // ★ 起 firefox 这一段**必须整体有界**。
  //   踩过的坑：`WebDriver:NewSession` 原来没传 ms —— 而 `send()` 的语义是
  //   「不给 ms 就永远等」。snap 版 firefox 偶尔会连上 marionette 端口却不答话
  //   （上一轮的 firefox 还没彻底放掉 profile 时最容易），于是驱动**无限挂起**。
  //   在变异套件里这最毒：`execSync(..., {timeout:300000})` 到点只 SIGTERM 掉
  //   外层 sh，node 变成孤儿**继续占着端口**，后面每一个变异都报 EADDRINUSE，
  //   汇总出来是「7 个变异没抓住」——看起来像断言被橡皮章，其实是起不来。
  //   所以：NewSession 给 40s 上限；不通就收干净重来一次；再不通才认环境问题退出。
  let child, sock, m, sess;
  for (let attempt = 1; attempt <= 2; attempt++) {
    child = spawn(bin, ['--headless', '--new-instance', '--marionette',
      '--no-remote', 'about:blank'], { stdio: 'ignore' });
    const child_exit = new Promise((r) => child.once('exit', (c) => r(c)));
    try {
      sock = await connectMarionette(o.port, 25000);
      m = new Marionette(sock);
      // 先让问候帧进来，再开会话（问候帧没有 id，drain 里会丢掉）
      await sleep(200);
      sess = await m.send('WebDriver:NewSession', { capabilities: {} }, 40000);
      if (!sess || !sess.sessionId) throw new Error('会话里没有 sessionId：' + JSON.stringify(sess));
      return { child, child_exit, m, sessionId: sess.sessionId, prof };
    } catch (e) {
      try { child.kill('SIGKILL'); } catch (e2) {}
      if (attempt === 2) {
        console.error(`❌ 起 firefox 失败（试了 2 次）：${e.message}`);
        process.exit(2);
      }
      console.log(`   · 起 firefox 第 ${attempt} 次没成（${e.message}），收干净重来`);
      killHeadlessFirefox();
      await sleep(1500);
    }
  }
  console.error('❌ 起 firefox 失败（不可达）');
  process.exit(2);
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
  // ⚠ 同址导航（`reset()` 每次回 index.html 就是）时，`href === want` 在**旧文档**
  //   上就已经成立，`readyState` 也是 complete —— 只按这两条判会当场误判成「已到」，
  //   于是接下来的脚本打在**正在被换掉的旧文档**上，报出来是一句莫名其妙的
  //   `W.selectMethod is not a function`（旧文档确实还有，新文档还没建）。
  //   解法：导航前在当前文档上打个记号，等到记号**消失**才说明真换了文档。
  const mark = 'dsh-nav-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  await js(m, `${W} W.__dshNav = ${JSON.stringify(mark)}; return true;`).catch(() => {});
  m.sendNoWait('WebDriver:Navigate', { url });
  const want = String(url).split('#')[0];
  const t0 = Date.now();
  for (;;) {
    try {
      // 短超时：导航进行中 ExecuteScript 会**挂住**而不是报错，不给超时这个循环就死了
      const st = await js(m, `${W}
        return { href: String(location.href).split('#')[0],
                 ready: document.readyState,
                 sameDoc: W.__dshNav === ${JSON.stringify(mark)} };`, null, 4000);
      if (st && st.href === want && st.ready !== 'loading' && !st.sameDoc) break;
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

// ─────────────────────────────────────────────────────────────
// 4. 截图 / 版面探测
// ─────────────────────────────────────────────────────────────

/**
 * 设窗口尺寸。**必须在截图前设**：无头 Firefox 默认窗宽只有 500px 左右，
 * 于是「桌面版页面」会被按窄屏渲染 —— 看到的重叠/溢出可能是我们自己窗口太窄
 * 造出来的假象，不是页面的毛病。看版面之前先定宽。
 */
async function setWindow(m, w, h) {
  await m.send('WebDriver:SetWindowRect', { width: w, height: h });
  await sleep(250);
  return js(m, 'return {w: window.innerWidth, h: window.innerHeight};');
}

/**
 * 截图存盘。`full` 为真时截整篇（长页面不会被截断）。
 * ⚠ full 与窗口尺寸的关系：Firefox 的 full 截图是按**文档**高度重绘的，
 * 但**不重新走响应式断点** —— 宽度仍是窗口宽。所以「窄屏整篇」与「宽屏整篇」
 * 要各设一次窗口，不能靠 full 一把抓。
 */
async function shot(m, file, o) {
  o = o || {};
  const r = await m.send('WebDriver:TakeScreenshot',
    { full: o.full !== false, highlights: [], scroll: !!o.scroll }, 30000);
  const b = Buffer.from(r.value, 'base64');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
  return { file, bytes: b.length };
}

/**
 * 版面探测：把元素的盒子、是否溢出视口、是否互相重叠量出来。
 * 截图只能看出「看着不对」，这个能说出**哪里**不对 —— 两者都要。
 */
async function boxes(m, sel) {
  return js(m, `var out = [];
    var els = document.querySelectorAll(${JSON.stringify(sel)});
    for (var i = 0; i < els.length; i++) {
      var e = els[i], r = e.getBoundingClientRect();
      var cs = getComputedStyle(e);
      out.push({
        i: i, tag: e.tagName.toLowerCase(), cls: (e.className || '').toString().slice(0, 70),
        text: (e.innerText || '').replace(/\\s+/g, ' ').slice(0, 60),
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
        right: Math.round(r.right), overflowX: Math.round(r.right - document.documentElement.clientWidth),
        display: cs.display, position: cs.position, overflow: cs.overflow, whiteSpace: cs.whiteSpace,
        scrollW: e.scrollWidth, clientW: e.clientWidth,
      });
    }
    return { vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight,
             docH: document.documentElement.scrollHeight, n: out.length, els: out };`);
}

module.exports = {
  MIME, readBody, sendJson, sleep, startServer,
  Marionette, connectMarionette, launchFirefox,
  js, W, goto, until, diagnostics,
  panelOpen, panelText, panelTextUntil, textOf,
  setWindow, shot, boxes,
};

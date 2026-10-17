/**
 * 驱页 · AI 对话（`/ai-chat/`）的端到端验收
 * ==========================================================================
 *
 * 为什么要有它：`/ai-chat/` 是要从 classic script 搬成 Vite + React 的第一张滩头页
 * （建 chart 器、发一条消息、取回记录）。它跟前面搬过的 auth 三页**不是一类**：
 *   · auth 三页几乎是「表单 + 一次 POST」，而这一页有**流式**（XHR onprogress 边收边渲染）；
 *   · 它有一条**只在正文末尾出现**的「消耗积分：N」尾巴，要在收流结束后才切出来、
 *     渲染成**气泡的兄弟节点** `.msg-token`（不在气泡里面）；
 *   · 它对游客是 401 而不是跳转，401 的处置在 `AUTH.handleApiUnauthorized()` 里。
 *
 * 所以要钉住的不是「页面能不能打开」，而是这四条契约：
 *   ① 游客进来 → 弹登录框（`openAuthModal('login')`），不跳 `/login/`；
 *   ② 发一句话 → 请求带 `Authorization: Bearer <token>`、体是 `{message, cardType:'text'}`；
 *   ③ 流回来的 markdown **逐字节**等于老 `renderMarkdown()` 渲出来的那份，
 *      且 `消耗积分：42` 被切成 `.msg-token`、紧跟在 `.msg-ai` 后面（**兄弟**，不是子节点）；
 *   ④ 401 → 流式那块被换成「登录后即可使用 AI 解析」并弹框（**不是**在气泡里写红字）。
 *
 * 期望值不是手写的：老 `renderMarkdown` / `splitPoints` 从 `duipan/legacy_ai_chat.js`
 * 原样加载，桩喂什么、期望就是它当场算出来的什么。手抄一份常量就会漂。
 *
 * 测的是**产物**（`build/nginx`，Vite 打过包、版本化过的那一份），不是 `src/web` 源码 ——
 * 「源码对」不等于「上线的那份对」。
 *
 * 它不覆盖：真后端 / 真模型 / 真 MySQL。`/api/chat/send` 是桩（真端点由冒烟脚本管）。
 *
 * ⚠ **不能和别的驱动同时跑**：`drive_lib.launchFirefox()` 会先把全机的无头 Firefox
 *   全杀掉（`killHeadlessFirefox()`，snap 版不认 `-profile`，只能共用同一个真 profile），
 *   所以两个驱动并行 = 互相掐死。端口错开只为防「上一个没退干净」的残留，
 *   不是为了并行。要连着跑就用 `duipan/regress_pages.sh`（它是串行的）。
 *
 * 用法：node duipan/drive_ai_chat_page.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题（测不出来，不是通过）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');
const legacy = require('./legacy_ai_chat');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
// 端口错开另四份驱动。**实际在用的**（2026-10-17 逐个 grep 过，别凭注释猜）：
//   mhys-page  8892/2828   mhys-twice 8901/2831   liuyao 8898/2829   bazi 8897/2830
// 我原来写 8896/2831，2831 跟 `drive_mhys_twice.js` **撞了** —— 两个驱动同时跑
// （冻结门的页面层就是四个连着跑）会互相抢 marionette 端口。改到没人用的 8893/2832。
const PORT = 8893;
const MARIONETTE_PORT = 2832;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const URL_CHAT = `${ORIGIN}/ai-chat/`;

const SHOT_DIR = '/tmp/ai-chat-drive';

// ─────────────────────────────────────────────────────────────
// 1. 桩：可控的流式回包
//    `/api/chat/send` 的真协议不是 SSE：**裸文本分块**，前端 `xhr.responseText`
//    一直长、`onprogress` 每次拿到增量。所以桩也要真分块写、块间留点时间，
//    否则 onprogress 只在最后响一次，「边收边渲染」那条路等于没测。
// ─────────────────────────────────────────────────────────────
let stubState = {
  status: 200,
  text: '',
  chunkSize: 40,
  gapMs: 60,
};
let captured = [];   // 每次 /api/chat/send 收到的 {auth, body}

function readRaw(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => resolve(b));
  });
}

async function api(req, res, pathname) {
  if (pathname === '/__stub' && req.method === 'POST') {
    stubState = Object.assign({ status: 200, text: '', chunkSize: 40, gapMs: 60 }, JSON.parse(await readRaw(req) || '{}'));
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__captured') return L.sendJson(res, captured), true;
  if (pathname === '/__reset' && req.method === 'POST') { captured = []; return L.sendJson(res, { ok: true }), true; }

  if (pathname === '/api/chat/send' && req.method === 'POST') {
    const raw = await readRaw(req);
    let body = null; try { body = JSON.parse(raw); } catch (e) { /* 原样留着，断言会红 */ }
    captured.push({ auth: req.headers.authorization || null, body, raw });
    if (stubState.status !== 200) {
      res.writeHead(stubState.status, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '请先登录' })), true;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    const t = stubState.text;
    for (let i = 0; i < t.length; i += stubState.chunkSize) {
      res.write(t.slice(i, i + stubState.chunkSize));
      if (stubState.gapMs) await L.sleep(stubState.gapMs);
    }
    res.end();
    return true;
  }

  // 别的 /api/* 一律空回，免得聊天记录之类的请求把水搅浑
  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

function startServer() { return L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api }); }
function launchFirefox() { return L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'aichat-prof' }); }

const js = L.js;
const W = L.W;

// ─────────────────────────────────────────────────────────────
// 2. 页面操作原语
// ─────────────────────────────────────────────────────────────
/** 造登录态。`sqw_username` 是 `AUTH.isLoggedIn()` 的判据（auth.js 读 cookie）。 */
async function login(m, user) {
  await L.goto(m, `${ORIGIN}/`);
  return js(m, `document.cookie = 'sqw_username=${user}; path=/; max-age=86400';
    document.cookie = 'sqw_token=stub-token-abc; path=/; max-age=86400';
    return document.cookie;`);
}
async function logout(m) {
  return js(m, `document.cookie = 'sqw_username=; path=/; max-age=0';
    document.cookie = 'sqw_token=; path=/; max-age=0';
    try { sessionStorage.clear(); } catch (e) {}
    return document.cookie;`);
}
async function reset(m, { as } = {}) {
  await fetch(`${ORIGIN}/__reset`, { method: 'POST' });
  if (as === 'guest') await logout(m); else await login(m, 'alice');
}
async function stub(o) { await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify(o) }); }

/** 弹框打开的判据：`#authModalOverlay` 存在且没 hidden（openAuthModal 里这么置的）。 */
function modalOpen(m) {
  return js(m, `var o = document.getElementById('authModalOverlay');
    return !!o && o.hidden === false && o.classList.contains('open');`);
}

/** 聊天界面就绪的判据：输入框 + 发送键都在。 */
function chatReady(m, timeoutMs) {
  return L.until(m, `return !!(document.getElementById('chatInput') && document.getElementById('sendBtn'));`,
    (v) => v === true, timeoutMs || 8000);
}

/** 发一句话并等它落定（`.msg-ai.streaming` 消失 = onloadend 跑完了）。 */
async function say(m, text, timeoutMs) {
  await js(m, `var i = document.getElementById('chatInput');
    i.value = ${JSON.stringify(text)};
    i.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('sendBtn').click();
    return true;`);
  await L.until(m, `return document.querySelectorAll('.msg-ai.streaming, #aiLoading').length;`,
    (n) => n === 0, timeoutMs || 12000);
}

/** 最后一条 AI 气泡的结构快照：气泡 HTML、尾巴文字、以及尾巴是不是气泡的兄弟。 */
function lastAi(m) {
  return js(m, `var list = document.querySelectorAll('.msg-ai');
    var last = list[list.length - 1];
    if (!last) return null;
    var bub = last.querySelector('.msg-bubble');
    var sib = last.nextElementSibling;
    return {
      bubbleHTML: bub ? bub.innerHTML : null,
      tokenText: (sib && sib.classList.contains('msg-token')) ? sib.textContent : null,
      tokenInsideBubble: !!(bub && bub.querySelector('.msg-token')),
      className: last.className
    };`);
}

function userBubbles(m) {
  return js(m, `return Array.prototype.map.call(document.querySelectorAll('.msg-user .msg-bubble'),
    function (e) { return e.innerText; });`);
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// ─────────────────────────────────────────────────────────────
// 3. 用例
// ─────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(path.join(WEB, 'ai-chat', 'index.html'))) {
    console.error(`✗ ${WEB}/ai-chat/index.html 不在 —— 先构建（./deploy/sync.sh），不是跳过。`);
    process.exit(2);
  }
  // 老实现的期望值：加载不出来就是「测不出来」，退出 2。
  let sb;
  try { sb = legacy.loadLegacy(); } catch (e) { console.error(`✗ ${e.message}`); process.exit(2); }
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const server = await startServer();
  const { child, m, prof } = await launchFirefox();
  let code = 0;
  try {
    // ── ① 游客：弹框，不跳 /login/ ────────────────────────────
    console.log('\n① 游客进来 → 弹登录框（不是把自己跳到 /login/）');
    await reset(m, { as: 'guest' });
    await L.goto(m, URL_CHAT);
    const open = await L.until(m, `return (function(){ var o = document.getElementById('authModalOverlay');
      return !!(o && o.hidden === false && o.classList.contains('open')); })();`,
      (v) => v === true, 6000);
    check('登录框弹出来了', open === true, 'openAuthModal 没生效');
    check('停在 /ai-chat/（没被重定向走）',
      String(await js(m, `return location.pathname;`)) === '/ai-chat/',
      String(await js(m, `return location.pathname;`)));
    let d = await L.diagnostics(m);
    check('没有未捕获异常', d.errs.length === 0, JSON.stringify(d.errs));
    await L.setWindow(m, 500, 900);
    await L.shot(m, path.join(SHOT_DIR, '01-游客弹框.png'), { full: false });

    // ── ② 登录态：界面就绪 ────────────────────────────────────
    console.log('\n② 登录态 → 聊天界面就绪');
    await reset(m, { as: 'alice' });
    await L.goto(m, URL_CHAT);
    check('输入框与发送键都在', (await chatReady(m)) === true, 'chatInput/sendBtn 没出来');
    check('没有弹登录框', (await modalOpen(m)) === false, '登录态下不该弹框');

    // ── ③ 流式 + 积分尾巴：逐字节 ─────────────────────────────
    console.log('\n③ 发一句话 → 流式渲染与积分尾巴');
    const REPLY = '【综合判断】\n\n- **第一点**：宜静不宜动\n- 第二点：留意西南\n\n> 古语云：动则生变\n\n整体偏吉。\n消耗积分：42';
    await stub({ status: 200, text: REPLY, chunkSize: 24, gapMs: 50 });
    await say(m, '帮我看看今天的运势');
    const expect = sb.splitPoints(REPLY);
    const ai = await lastAi(m);
    check('请求带上了 Authorization: Bearer <token>',
      captured.length === 1 && captured[0].auth === 'Bearer stub-token-abc',
      JSON.stringify(captured.map((c) => c.auth)));
    check('请求体是 {message, cardType:\'text\'}',
      !!captured[0] && captured[0].body && captured[0].body.message === '帮我看看今天的运势'
        && captured[0].body.cardType === 'text',
      JSON.stringify(captured[0] && captured[0].body));
    check('用户气泡里有原话',
      JSON.stringify(await userBubbles(m)).includes('帮我看看今天的运势'),
      JSON.stringify(await userBubbles(m)));
    check('AI 气泡的 HTML 与老 renderMarkdown 逐字节相同',
      !!ai && ai.bubbleHTML === sb.renderMarkdown(expect.body),
      `\n        老: ${JSON.stringify(sb.renderMarkdown(expect.body))}\n        新: ${JSON.stringify(ai && ai.bubbleHTML)}`);
    check('积分尾巴切成了 .msg-token',
      !!ai && ai.tokenText === expect.points,
      JSON.stringify(ai && ai.tokenText));
    check('尾巴是气泡的**兄弟**节点，不在气泡里面',
      !!ai && ai.tokenInsideBubble === false,
      JSON.stringify(ai && ai.tokenInsideBubble));
    check('流式类名已摘掉（.streaming 不该留在成品上）',
      !!ai && !/streaming/.test(ai.className), ai && ai.className);
    await L.setWindow(m, 500, 900);
    await L.shot(m, path.join(SHOT_DIR, '03-流式成品.png'), { full: true });

    // ── ④ 401：换成引导 + 弹框 ────────────────────────────────
    console.log('\n④ 401 → 流式那块换成「登录后即可使用 AI 解析」并弹框');
    await stub({ status: 401, text: '' });
    await say(m, '再说一句');
    const after401 = await js(m, `var list = document.querySelectorAll('.msg-ai');
      var last = list[list.length - 1];
      return {
        html: last ? last.innerHTML : null,
        modal: (function(){ var o = document.getElementById('authModalOverlay');
          return !!(o && o.hidden === false); })()
      };`);
    check('401 的处理结果写进了流式那块',
      !!after401 && /登录后即可使用 AI 解析|登录已过期/.test(String(after401.html)),
      JSON.stringify(after401 && after401.html));
    check('401 之后弹了登录框（没在页面上闷着）',
      !!after401 && after401.modal === true, JSON.stringify(after401 && after401.modal));
    await js(m, `try { hideAuthModal(); } catch (e) {} return true;`);

    // ── ⑤ 首页带过来的首句 ────────────────────────────────────
    console.log('\n⑤ 首页输入框带过来的首句：自动发出、取完即删');
    await stub({ status: 200, text: '收到。\n消耗积分：1', chunkSize: 9999, gapMs: 0 });
    await fetch(`${ORIGIN}/__reset`, { method: 'POST' });   // 别把 ③④ 的消息混进这一条的断言
    await L.goto(m, `${ORIGIN}/`);
    await js(m, `sessionStorage.setItem('sqw_pending_ask', '帮我起一卦'); return true;`);
    await L.goto(m, URL_CHAT);
    // ⚠ 等的是**要断言的那件事本身**（桩收到了这条消息），不是「页面上冒出了气泡」。
    //   早先等的是 `document.querySelectorAll('.msg-ai').length >= 1`，2026-10-17 那次
    //   全量回归里它假红过一次（`captured` 是 `[]`，而 sessionStorage 已经被取空 ——
    //   页面确实收下了首句，只是断言抢在请求落到桩上之前跑了）。`L.until` 超时是
    //   **静默返回**（`drive_lib.js:417`），不会抛，所以这种抢跑只表现为「一条莫名其妙的红」。
    //   等 captured 就没这个缝：`captured.push` 在桩回响应**之前**（本文件 :88）。
    for (let i = 0; i < 100; i++) {
      if (captured.some((c) => c.body && c.body.message === '帮我起一卦')) break;
      await L.sleep(150);
    }
    await L.until(m, `return document.querySelectorAll('.msg-ai.streaming, #aiLoading').length;`,
      (n) => n === 0, 12000);
    check('首句被自动发出去了',
      captured.some((c) => c.body && c.body.message === '帮我起一卦'),
      JSON.stringify(captured.map((c) => c.body && c.body.message)));
    check('sessionStorage 里的首句取完就删（不然刷一次重发一次）',
      String(await js(m, `return sessionStorage.getItem('sqw_pending_ask');`)) === 'null',
      String(await js(m, `return sessionStorage.getItem('sqw_pending_ask');`)));

    // ── ⑥ iframe 关闭契约 ─────────────────────────────────────
    console.log('\n⑥ 在浮层（iframe）里点返回 → 通知父窗口 closeChatOverlay');
    await L.goto(m, `${ORIGIN}/`);
    await js(m, `window.__closed = 0;
      window.addEventListener('closeChatOverlay', function () { window.__closed++; });
      var f = document.createElement('iframe');
      f.id = 'probeFrame';
      f.style.cssText = 'width:420px;height:700px';
      f.src = '/ai-chat/';
      document.body.appendChild(f);
      return true;`);
    await L.until(m, `var f = document.getElementById('probeFrame');
      return !!(f && f.contentWindow && f.contentWindow.document.getElementById('chatInput'));`,
      (v) => v === true, 10000);
    // ⚠ 这里**点按钮**，不调 `contentWindow.handleBack()`。老页面里 handleBack 是
    //   classic script 的顶层函数，所以裸名挂在全局上，能从外面调；React 版它是
    //   `onClick` 的局部函数，不是 API（全仓 grep 过，除了它自己的按钮没第二处引用）。
    //   点按钮才是真用户动作；调函数只是在测「老实现的副产物」。
    await js(m, `var f = document.getElementById('probeFrame');
      f.contentWindow.document.getElementById('backBtn').click(); return true;`);
    const closed = await js(m, `return window.__closed;`);
    check('父窗口收到了 closeChatOverlay', Number(closed) >= 1, JSON.stringify(closed));
    check('iframe 自己没被导航走（没退回首页）',
      String(await js(m, `return document.getElementById('probeFrame').contentWindow.location.pathname;`)) === '/ai-chat/',
      String(await js(m, `return document.getElementById('probeFrame').contentWindow.location.pathname;`)));

    // ── 收尾：全站老页面没被这次改动带坏 ──────────────────────
    console.log('\n⑦ 抽查老页面没被带坏');
    for (const p of ['/', '/mhys/', '/liuyao/', '/my-charts/']) {
      await L.goto(m, `${ORIGIN}${p}`);
      const dd = await L.diagnostics(m);
      check(`${p} 无未捕获异常`, dd.errs.length === 0, JSON.stringify(dd.errs));
    }

    d = await L.diagnostics(m);
    check('全程没有 alert 弹窗', d.alerts.length === 0, JSON.stringify(d.alerts));

    console.log(`\n══════ 汇总 ══════`);
    if (fails.length === 0) {
      console.log(`  ✅ 全部通过`);
      console.log(`  截图：${SHOT_DIR}/`);
    } else {
      console.log(`  ❌ ${fails.length} 条失败：`);
      for (const f of fails) console.log(`     · ${f}`);
      code = 1;
    }
  } catch (e) {
    console.error(`\n✗ 驱动中途抛了：${e && e.stack || e}`);
    code = 2;
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    server.close();
  }
  process.exit(code);
}

main().catch((e) => { console.error(e); process.exit(2); });

/**
 * 驱页 · 八字详情页（`/my-charts/?id=`）的端到端验收
 * ==========================================================================
 *
 * 为什么要有它：八字前端（`my-charts/index.html` 的详情视图 + `js/bazi_render.js` +
 * `js/bazi_ai_panel.js`）是 2026-09-25 新写的，**一行都还没在真浏览器里跑过**。
 * 那三个文件里最容易错的不是排版，是**这些**：
 *
 *  ① **页面上这张盘从哪来** —— 必须是 `POST /api/bazi/paipan` 的**真端点**（切片
 *     求值）算的。判据是四柱：夹具 1984-02-04 12:00 男 → 癸亥/乙丑/戊辰/戊午
 *     （起运 9.7 岁、首运甲子，逆排）。这三个值取自 shushu 基准夹具，**不是**从
 *     本项目的代码里读出来的 —— 页面自己算一份、或者端点回归了，这里都当场红。
 *  ② **页面自己不算**：把端点换成「变异响应桩」（拿真响应改几处干支与生肖），
 *     页面必须照桩渲染。它若藏着第二份历法，就会渲染成改之前的那个 —— 红。
 *  ③ **追问栏**（2026-09-25 拍板「要，但不落库」）：请求体要带 `followUp` + `context`
 *     （上一份解读的尾部），答案落进追问那一条里，**主正文不被顶掉**；顺带钉住
 *     共用引擎刚修的两处：转圈要撤掉、非 2xx 要交给页面处置（游客追问 403 → 引导登录）。
 * ④ **页内，不是浮层**：产品规矩（用户点名的四条之一）。这一页没有 `#resultArea`
 *    也没有 `#contentArea`，面板真要是退回浮层，就只有这里看得出来。
 *
 * **它不覆盖什么**：线上 nginx / 真后端进程 / pm2 / 真 MySQL / 真模型。本机没有
 * node_modules，所以：排盘端点**从 `auth-server.js` 切片**求值（切片标记与
 * `smoke_bazi_endpoint.js` 同一对，失效即退出 2，不静默跳过）；解读端点、记录端点、
 * `/api/charts/*` 一律用桩（那两个端点由冒烟脚本管，见 `smoke_bazi_parse.js`）。
 * 「追问不落库」这条**不在本脚本判**（客户端看不见库），这里只钉「客户端发的请求
 * 能不能让服务端做出那个决定」，落库与否在冒烟 ⑭ 里判。
 *
 * 依赖：firefox（无头，走 marionette 线协议，直接实现 —— 本机没有 pip，
 * 装不了 python 的 marionette_driver）。页面操作原语与站点在 `drive_lib.js`（三份驱动共用）。
 *
 * 用法：node duipan/drive_bazi_page.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境/切片出了问题（测不出来，不是通过）
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 真浏览器 + 本机站点 + 操作原语（三份驱动脚本共用一份，别各抄一份）
const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
// ⚠ 必须测**产物**（`build/nginx`），不是 `src/web`：页面一旦搬进 `src/app/`，
//   `src/web` 里就没有它了 —— 2026-10-17 `/my-charts/` 搬完当天，本驱动因为服务 `src/web`
//   在页面上什么都读不到（`#baziChart` 根本不存在），被误判成「八字页坏了」。
//   `build/nginx` 是**超集**：没搬的页面是 `src/web` 的逐字拷贝，搬了的在构建产物里。
//   要临时换根：DRIVE_ROOT=/somewhere node <本脚本>
const WEB = process.env.DRIVE_ROOT || path.join(ROOT, "build", "nginx");
const SERVER = path.join(ROOT, 'src', 'server', 'auth-server.js');
const baziFull = require(path.join(ROOT, 'src', 'server', 'paipan', 'bazi_full.js'));
const baziPromptLib = require(path.join(ROOT, 'src', 'server', 'paipan', 'bazi_prompt.js'));
const baziFortuneLib = require(path.join(ROOT, 'src', 'server', 'paipan', 'bazi_fortune.js'));
// 排盘那段（`baziChartFromParams`）里渲染 `text` 用的是它 —— 2026-09-25 换新输出规格时
// 后端接上了 `bazi_report.js`，本脚本没跟着注入，于是整条驱动在切片里跑成
// `baziReportLib is not defined`、端点回 400、后面每条用例连红（`smoke_bazi_endpoint.js`
// 那天同步改了，这里漏了）。注入的参数表必须和后端 require 的那一份对齐。
const baziReportLib = require(path.join(ROOT, 'src', 'server', 'paipan', 'bazi_report.js'));
const ganzhiLib = require(path.join(ROOT, 'src', 'server', 'paipan', 'ganzhi.js'));
const paipanConst = require(path.join(ROOT, 'src', 'server', 'paipan', 'constants.js'));
// 同一个坑又咬了一次（2026-10）：`auth-server.js` 里多了一句 `chatTools.setDeps({...})`，
// 它正好落在 H1..H2 这段切片里，而 `chatTools` 不在注入表里 → 整条驱动跑成
// `chatTools is not defined`。`smoke_bazi_parse.js` 那天同步改了，这里漏了。
// **注入表就是后端 require 的那张表**：后端多一个依赖，这里必须跟一个。
const chatToolsLib = require(path.join(ROOT, 'src', 'server', 'chat-tools.js'));

// 端口与另两份驱动错开（mhys 8899/2828，liuyao 8898/2829）
const PORT = 8897;
const MARIONETTE_PORT = 2830;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const KH = { alice: '登录用户', guest: '游客' };

// ─────────────────────────────────────────────────────────────
// 1. 排盘端点：从 auth-server.js 切片
//    ⚠ 切片标记与 `smoke_bazi_endpoint.js` **同一对**（H1/H2/E1/E2）。那边改了
//      这里也得改 —— 两处都带「标记失效即退出 2」的闸门，不会静默跳过。
// ─────────────────────────────────────────────────────────────
const H1 = '// ══════ 八字：排盘的**唯一出口** ══════';
const H2 = 'function buildDivinationChatPrompt(';
const E1 = '  // ── POST /api/bazi/paipan — 八字排盘';
const E2 = '  // ── POST /api/bazi/parse — 八字解读（流式）──';
// 只认**真调用**，不认名字：排盘端点的注释里会合法地提到解读端点的路径。
const FORBIDDEN = ['guestGate(req, res)', 'streamBaziParse(res, {', 'baziRagContext('];

function slice(src, from, to, label) {
  const i = src.indexOf(from);
  const j = i < 0 ? -1 : src.indexOf(to, i);
  if (i < 0 || j < 0 || j <= i) {
    console.error(`❌ 取不到「${label}」段（from=${i} to=${j}）。auth-server.js 结构变了？`
      + '请更新本脚本的切片标记，别在残缺代码上验收。');
    process.exit(2);
  }
  return src.slice(i, j);
}

function loadPaipan() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const helpers = slice(src, H1, H2, '八字排盘出口（模块级函数）');
  const endpoint = slice(src, E1, E2, '八字排盘端点');
  for (const want of ['/api/bazi/paipan', 'baziChartFromParams', 'baziDisplayMeta']) {
    if (!helpers.includes(want) && !endpoint.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」—— 切片标记已失效，拒绝在残缺代码上验收。`);
      process.exit(2);
    }
  }
  for (const bad of FORBIDDEN) {
    if (endpoint.includes(bad)) {
      console.error(`❌ 排盘端点的切片里混进了「${bad}」—— 这是别的端点的代码。\n`
        + '   多半是 E2 停在下一个端点之后了：把它收到**下一个端点的注释行**上。');
      process.exit(2);
    }
  }
  return new Function('req', 'res', 'body', 'pathname', 'json',
    'baziFull', 'baziPromptLib', 'baziReportLib', 'baziFortuneLib', 'ganzhiLib', 'paipanConst',
    'chatTools',
    helpers + '\n' + endpoint + '\n;return false;');
}
const runPaipan = loadPaipan();

/**
 * 在**本进程里**问一次真端点（不经浏览器）。用于：取出真响应，好按它做变异桩；
 * 也用于把「页面渲染出来的四柱」与「真端点算出来的四柱」对照。
 */
function askPaipan(birth) {
  let captured = null;
  const res = {
    statusCode: null,
    writeHead(c) { this.statusCode = c; },
    setHeader() {},
    write() { return true; },
    end() {},
    on() {},
    removeListener() {},
  };
  runPaipan({ method: 'POST', headers: {}, socket: {} }, res, birth,
    '/api/bazi/paipan',
    (r, obj, status) => { captured = { obj, status: status || 200 }; return r; },
    baziFull, baziPromptLib, baziReportLib, baziFortuneLib, ganzhiLib, paipanConst, chatToolsLib);
  return captured;
}

// ─────────────────────────────────────────────────────────────
// 2. 站点：控制面 + 桩 + 真排盘端点
// ─────────────────────────────────────────────────────────────
const state = {
  paipanStub: null,      // 非空则排盘端点回它（变异响应桩）
  paipans: [],           // 页面发来的排盘请求体（抓包）
  ai: [],                // 页面发来的解读/追问请求体（抓包）
  records: [],           // `/api/bazi-analyses` 回的记录行
  refuseAi: false,       // 解读端点回 403 needLogin（游客追问那一格）
  lastPaipan: null,      // 真端点最近一次的响应（打诊断用）
  hits: [],              // 请求流水（方法 + 路径），失败时用来分清「没发出去」还是「发错地方」
};

// 夹具命盘：1984-02-04 12:00 男。**出生参数是与 shushu 对拍过的那一组**
// （四柱 癸亥/乙丑/戊辰/戊午、起运 9.7 岁、首运甲子逆排）。
const CHART = {
  id: 'chart_1', name: '验收盘', gender: 'male',
  birth: { year: 1984, month: 2, day: 4, hour: 12, minute: 0, calendar: 'gregorian' },
  trueSolarTime: false, birthplace: '', latitude: null, longitude: null,
  bazi: '癸亥 乙丑 戊辰 戊午', createdAt: 1790000000000,
};

const AI_TEXT = {
  首段: '【一、结论】（桩）这一方面先说结论。',
  次段: '\n\n【二、你的现状】（桩）再看现状。\n',
};

function readBody(req) { return L.readBody(req); }

/**
 * 每个进到服务端的请求都记一笔（方法 + 路径）。
 * 「页面上明明点了、服务端却什么都没收到」这种失败光看断言认不出来 ——
 * 有这本流水就能当场分清是**没发出去**，还是**发到了别的路径**
 * （比如落进静态文件那条分支，安静地回一个 404 正文，面板上就停在「正在检索古籍…」）。
 */
function noteHit(req, pathname) { state.hits.push(`${req.method} ${pathname}`); }
function hitsTail(n) { return state.hits.slice(-(n || 8)).join(' ｜ '); }

async function api(req, res, pathname) {
  noteHit(req, pathname);
  if (pathname === '/__stub') {
    const b = await readBody(req);
    if ('paipan' in b) state.paipanStub = b.paipan;
    if ('refuseAi' in b) state.refuseAi = !!b.refuseAi;
    if ('records' in b) state.records = b.records || [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__reset') {
    state.paipanStub = null; state.paipans = []; state.ai = [];
    state.records = []; state.refuseAi = false; state.hits = [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__captured') {
    return L.sendJson(res, { paipans: state.paipans, ai: state.ai, hits: state.hits }), true;
  }

  // ── 排盘：真端点（切片）或变异响应桩 ──────────────────────────
  if (req.method === 'POST' && pathname === '/api/bazi/paipan') {
    const body = await readBody(req);
    state.paipans.push(body);
    if (state.paipanStub) return L.sendJson(res, state.paipanStub), true;
    const got = askPaipan(body);
    if (!got) return L.sendJson(res, { error: '切片端点没回东西' }, 500), true;
    state.lastPaipan = got.obj;
    return L.sendJson(res, got.obj, got.status), true;
  }

  // ── 解读 / 追问：桩。分两次 write，让驱动能看到「边收边渲染」 ────
  if (req.method === 'POST' && pathname === '/api/bazi/parse') {
    const body = await readBody(req);
    state.ai.push(body);
    if (state.refuseAi) {
      return L.sendJson(res, { error: '游客只能免费解读一次，登录后可以接着问', needLogin: true }, 403), true;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.write(AI_TEXT.首段);
    setTimeout(() => {
      res.write(AI_TEXT.次段);
      // 末段照真端点的样子带上 token 尾巴（登录用户才有），顺带验页面会切掉它
      res.write('\n\n消耗 Token：输入 11 + 输出 22 = 33');
      res.end();
    }, 120);
    return true;
  }

  // ── 解析记录（只读端点）：桩。真行为在 `smoke_bazi_parse.js` 里判 ──
  if (req.method === 'GET' && pathname === '/api/bazi-analyses') {
    return L.sendJson(res, state.records), true;
  }

  // ── 命盘：详情页只取单条 ────────────────────────────────────
  if (req.method === 'GET' && /^\/api\/charts\/[^/]+$/.test(pathname)) {
    return L.sendJson(res, CHART), true;
  }
  if (req.method === 'GET' && pathname === '/api/charts') return L.sendJson(res, [CHART]), true;

  // 别的 /api/* 一律空回，免得页面上的鉴权/记录请求把水搅浑
  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

function startServer() { return L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api }); }
function launchFirefox() { return L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'bazi-prof' }); }

// ─────────────────────────────────────────────────────────────
// 3. 页面操作原语
// ─────────────────────────────────────────────────────────────
const js = L.js;
const W = L.W;
const goto = L.goto;
const DETAIL = `${ORIGIN}/my-charts/?id=chart_1`;

/** 造登录态。`sqw_username` 是 `AUTH.isLoggedIn()` 的判据（auth.js 读 cookie）。
 *
 * ★ 只在**当前文档不是本站**时才先落一次根 —— cookie 总得有个归属域。
 *   老版这里无条件 `goto('/')`，看起来无害，其实是这一页最阴的坑：首页会
 *   同步拉 `/ai-chat/` 的 iframe（React 版），那个 iframe 也要跑一遍 auth.js
 *   开头的登录门禁，于是它跟「本页要不要自动续解」抢时序 —— 实测约一半的
 *   遍数里 `bazi_pending_aspect` 会被那次访问吃掉，红成「登录后没自动续解」
 *   的样子（同一份代码 3 遍里绿红绿）。真实登录走的是 auth.js 的弹窗，成功
 *   后 `location.reload()` **不经过首页**，所以绕首页本来就不是真实路径。
 */
async function login(m, user) {
  const origin = await js(m, 'return location.origin;').catch(() => null);
  if (origin !== ORIGIN) await goto(m, `${ORIGIN}/`);
  const c = await js(m, `document.cookie = 'sqw_username=${user}; path=/; max-age=86400';
    document.cookie = 'sqw_token=stub-token; path=/; max-age=86400';
    return document.cookie;`);
  return c;
}
async function logout(m) {
  return js(m, `document.cookie = 'sqw_username=; path=/; max-age=0';
    document.cookie = 'sqw_token=; path=/; max-age=0';
    try { localStorage.clear(); } catch (e) {}
    try { sessionStorage.clear(); } catch (e) {}
    return document.cookie;`);
}

/**
 * 排盘渲染完成的判据：四柱细盘那块标题出来了。
 *
 * ⚠ 返回的是**两块**（`#baziChart` 排盘 + `#baziRest` 命局提要/大运）正文拼起来 ——
 * 2026-09-25 起盘分两块画（AI 解读块插在中间，见 `js/bazi_render.js` 的 `restHost`），
 * 只取 `#baziChart` 会让「命局提要在不在」这类断言**假红**（页面明明是对的）。
 * 两块是同一个函数里同步写的，故「四柱细盘出来了」⇒ 另一块也在了。
 */
function chartReady(m, timeoutMs) {
  return L.until(m, `function t(id) { var el = document.getElementById(id); return el ? (el.innerText || '') : ''; }
    return t('baziChart') + '\\n' + t('baziRest');`,
  (t) => /四柱细盘/.test(t || ''), timeoutMs || 8000);
}

/**
 * 面板挂载完成的判据：五个方面按钮都画出来了。
 * **盘画完 ≠ 面板挂好** —— `BaziAI.mount()` 排在 `BaziRender.render()` 后面，
 * 而打开方面条要等它。少了这一步，脚本会在「.bz-aspect 还不存在」时去 `.click()`，
 * 报的是 `null.click is not a function`（看着像页面坏了，其实是我抢跑了）。
 */
function panelReady(m, timeoutMs) {
  return L.until(m, `return document.querySelectorAll('#baziAspectBar .bz-aspect').length;`,
    (n) => n === 5, timeoutMs || 8000);
}

async function bodyText(m) { return js(m, `return document.body.innerText || '';`); }

/** 截一屏（500 = 无头默认那档窄屏；1100 = 桌面） */
async function shotAt(m, w, h, file) {
  await L.setWindow(m, w, h);
  return L.shot(m, file, { full: true });
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

async function reset(m, { as } = {}) {
  await fetch(`${ORIGIN}/__reset`, { method: 'POST' });
  if (as === KH.guest) await logout(m);
  else await login(m, 'alice');
}
async function captured() { return (await (await fetch(`${ORIGIN}/__captured`)).json()); }
async function stub(o) { await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify(o) }); }

// ─────────────────────────────────────────────────────────────
// 4. 用例
// ─────────────────────────────────────────────────────────────
const SHOT_DIR = '/tmp/bazi-drive';

async function main() {
  const server = await startServer();
  const { child, m, prof } = await launchFirefox();
  let code = 0;
  try {
    // ── ① 真端点排盘：四柱要与对拍夹具逐字相同 ───────────────────
    console.log('\n① 详情页的盘来自 `POST /api/bazi/paipan`（切片真端点）');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    let text = await chartReady(m, 10000);
    let cap = await captured();
    check('发出了正好一次排盘请求', cap.paipans.length === 1, JSON.stringify(cap.paipans.length));
    check('请求体是**出生原始参数**（y/mo/d/h/mi/gender），不是算好的干支',
      JSON.stringify(cap.paipans[0]) === JSON.stringify(
        { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male' }),
      JSON.stringify(cap.paipans[0]));
    // 手算判据（shushu 基准夹具）：1984-02-04 12:00 在当年立春**之前**，
    // 故年柱仍是 1983 的癸亥 —— 这一条同时挡住「按公历年取生肖」那类做法。
    for (const gz of ['癸亥', '乙丑', '戊辰', '戊午']) {
      check(`四柱里有 ${gz}（对拍夹具，页面自己算不出这个）`, text.indexOf(gz) >= 0,
        JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 120)));
    }
    // 盘分两块画（2026-09-25）：排盘主体 + 其余。四块内容都得在，只是不在同一块里。
    // 「命局提要」这一块是**有才画**：`summaryBlock()` 在端点没给 overview 时返回空串，
    // 老判据把四块写死成必须全在，端点在某种输入下不给提要就假红。改成「三块必在 +
    // 提要跟着端点走」，判据还是能抓住「少画了一块」。
    const blocksOk = ['基本信息', '四柱细盘', '大运一览'].every((t) => text.indexOf(t) >= 0);
    check('三块骨架都在：基本信息 / 四柱细盘 / 大运一览', blocksOk,
      JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 200)));
    // 第四块有两种形态，**都是设计**：
    //   · 有 AI 解读的页面（老版）：「命局提要」——带白话头条与「展开细说」；
    //   · 纯盘面（现在的详情页，neutral=true，AI 搬去 /bazi-consult/）：「盘面标记」——
    //     只列神煞与地支关系，不下结论。所以这一条接受任一形态，而不是钉死一个标题。
    check('第四块在：命局提要（带解读）或 盘面标记（纯盘面）',
      text.indexOf('命局提要') >= 0 || text.indexOf('盘面标记') >= 0,
      JSON.stringify({ 命局提要: text.indexOf('命局提要'), 盘面标记: text.indexOf('盘面标记') }));
    check('日柱那格写「日元」（白话，不是术语「日干」）', /日元/.test(text), '没找到「日元」');

    // 生肖：页面只能从服务端的 `display.shengxiao` 取。癸亥 → 猪。
    // （列表页那份 `(1984-4)%12` 会算成鼠 —— 这正是已知的那处不一致。）
    const zx = await js(m, `var el = document.getElementById('baziZodiac');
      return el ? el.textContent : '';`);
    check('生肖 emoji 与**服务端**一致：癸亥 → 🐷（列表页那份会算成 🐀）',
      zx === '🐷', JSON.stringify(zx));

    const real = state.lastPaipan;
    check('真端点确实回了 chart/display/大运（不是空壳）',
      !!(real && real.chart && real.display && Array.isArray(real.chart.dayun)),
      JSON.stringify(Object.keys(real || {})));
    console.log('   · 真端点：日主 ' + JSON.stringify(real.chart.day_master)
      + ' · 生肖 ' + JSON.stringify(real.display.shengxiao)
      + ' · 首运 ' + JSON.stringify(real.chart.dayun[0] && real.chart.dayun[0].tiangan
        + (real.chart.dayun[0] && real.chart.dayun[0].dizhi))
      + ' · 起运 ' + JSON.stringify(real.chart.dayun[0] && real.chart.dayun[0].start_age));

    // ── ② 大运一览：首运（逆排甲子）与「现在走的那一步」────────────
    console.log('\n② 大运一览渲染的是端点给的那十步');
    const dy = await js(m, `${W}
      var steps = document.querySelectorAll('.bz-dayun .bz-step');
      var out = [];
      for (var i = 0; i < steps.length; i++) {
        out.push({ gz: (steps[i].querySelector('.bz-dgz') || {}).innerText || '',
                   age: (steps[i].querySelector('.bz-dage') || {}).innerText || '',
                   now: steps[i].classList.contains('now') });
      }
      return { n: steps.length, steps: out };`);
    check('大运步数与端点给的一致（10 步）',
      dy.n === real.chart.dayun.length && dy.n === 10, JSON.stringify(dy.n));
    check('首运是甲子（阴年男逆排 —— 这条是手算的）',
      /甲子/.test(dy.steps[0] && dy.steps[0].gz || ''), JSON.stringify(dy.steps[0]));
    check('首运岁数从 9.7 起（起运岁数 = 端点算的那个）',
      /9\.7/.test(dy.steps[0] && dy.steps[0].age || ''), JSON.stringify(dy.steps[0]));
    check('十步的干支与端点逐项一致（不是页面自己排的）',
      dy.steps.map((s) => s.gz.replace(/\s/g, '')).join(',')
        === real.chart.dayun.map((d) => d.tiangan + d.dizhi).join(','),
      dy.steps.map((s) => s.gz).join(','));
    check('「现在走的这一步」恰好高亮一步', dy.steps.filter((s) => s.now).length === 1,
      JSON.stringify(dy.steps.map((s) => s.now)));

    // ── ③ 页面自己不算：变异响应桩 ───────────────────────────────
    console.log('\n③ 变异响应桩：端点说什么，页面就画什么');
    {
      // 拿真响应改三处（年柱、生肖、提要头条、首运）——都是**页面无权自己决定**的东西
      const mutated = JSON.parse(JSON.stringify(real));
      mutated.chart.year_pillar.tiangan = '甲';
      mutated.chart.year_pillar.dizhi = '子';
      mutated.display.shengxiao = '龙';
      // 详情页现在是纯盘面（neutral），不画 overview.headline —— 让桩改一个**它真的会画**的字段：
      // 神煞名。这样这条判据验的还是「端点说什么页面就画什么」，只是换了载体。
      mutated.chart.shensha = [{ name: '（变异桩）天乙贵人', pillar: '年柱', dizhi: '子' }];
      mutated.chart.dayun[0].tiangan = '丙';
      mutated.chart.dayun[0].dizhi = '寅';
      await stub({ paipan: mutated });
      await goto(m, DETAIL);
      const t2 = await chartReady(m, 10000);
      // 只认**年柱那一格**的两行（天干/地支）。整页搜「癸亥」不行 —— 大运第二步
      // 本来就是癸亥，那样写会把桩的正确渲染判成失败。
      // 四柱细盘的表在现行实现里是 `.bz-pillar-sheet`（React 重写前叫 `.bz-table`），
      // 行首 `<th>` 是项目名（天干/地支/…），第一个 `<td>` 就是年柱。
      const yp2 = await js(m, `${W}
        var rows = document.querySelectorAll('#baziChart .bz-pillar-sheet tbody tr, #baziRest .bz-pillar-sheet tbody tr');
        var gan = '', zhi = '';
        for (var i = 0; i < rows.length; i++) {
          var k = (rows[i].querySelector('th') || {}).innerText || '';
          var td = rows[i].querySelector('td');
          if (k.indexOf('天干') >= 0) gan = td ? (td.innerText || '').trim() : '';
          if (k.indexOf('地支') >= 0) zhi = td ? (td.innerText || '').trim() : '';
        }
        return { gan: gan, zhi: zhi };`);
      check('年柱那一格照桩画成 甲子（真值癸亥没留下）',
        yp2.gan === '甲' && yp2.zhi === '子', JSON.stringify(yp2));
      const zx2 = await js(m, `var el = document.getElementById('baziZodiac');
        return el ? el.textContent : '';`);
      check('生肖照桩画成 🐲（该 emoji 只能从服务端来）', zx2 === '🐲', JSON.stringify(zx2));
      check('神煞名照桩画出来（纯盘面靠它证明「端点说什么页面就画什么」）',
        t2.indexOf('（变异桩）天乙贵人') >= 0, JSON.stringify(t2.slice(0, 160)));
      const dy2 = await js(m, `var s = document.querySelector('.bz-dayun .bz-step .bz-dgz');
        return s ? s.innerText : '';`);
      check('首运照桩画成 丙寅', /丙寅/.test(dy2), JSON.stringify(dy2));
      await stub({ paipan: null });
    }

    // ── ④~⑧b 已**移除**：详情页自 `0879d1d feat: unify Bazi consultations…` 起
    // 不再挂 AI 解读面板（用户要求「详情只展示盘面，不放咨询入口或 AI 解读」），
    // 解读与追问搬到了 `/bazi-consult/`。这一段原来验的是「五个方面切换 = 替换」
    // 「追问带上前一份正文」「面板在正文流里」——那些行为还在，但宿主页换了，
    // 判据在这里只会 `#aiResponse .ai-start-btn` 取到 null 然后崩掉。
    // 现在由这些地方覆盖（都在 232 条全量 e2e 里）：
    //   · src/app/tests/bazi-consult.spec.mjs（11 条：入口、主题状态页、失败重试、登录引导）
    //   · src/app/tests/bazi-ai-panel.test.mjs（面板配置 parsePath/buildBody/noFollowUp）
    //   · src/app/tests/bazi-detail.spec.mjs（详情页只展示盘面、不放 AI 与咨询入口）
    // ── ⑨ 零 JS 报错 + 截图留档 ──────────────────────────────────
    console.log('\n⑨ 整串流程零 JS 报错 + 截图');
    const diag = await L.diagnostics(m);
    check('没有未捕获异常（少了全局、拆家拆漏了都会在这里冒出来）',
      diag.errs.length === 0, JSON.stringify(diag.errs));
    check('没有 alert 弹窗（阻塞会话那个坑）', diag.alerts.length === 0,
      JSON.stringify(diag.alerts));
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    const s1 = await shotAt(m, 500, 900, path.join(SHOT_DIR, 'detail-500.png'));
    const s2 = await shotAt(m, 1100, 900, path.join(SHOT_DIR, 'detail-1100.png'));
    check('窄屏（500）截图存下来了', s1.bytes > 10000, JSON.stringify(s1));
    check('桌面（1100）截图存下来了', s2.bytes > 10000, JSON.stringify(s2));
    // **手机首屏**（不是整页）：用户就是拿这个尺寸看「一眼能不能看到解读块」的
    await L.setWindow(m, 390, 844);
    const s3 = await L.shot(m, path.join(SHOT_DIR, 'detail-390-firstscreen.png'), { full: false });
    check('手机首屏截图存下来了（500/1100 是整页，这张才是第一屏）', s3.bytes > 10000, JSON.stringify(s3));
    // 版面探测：截图只说明「看着不对」，这个能说出**哪里**不对
    const bxs = await L.boxes(m, '#baziChart, #baziAi, #baziRest, #aiPanel, .bz-dayun-scroll');
    const over = bxs.els.filter((e) => e.overflowX > 2);
    check('没有横向溢出视口的块（中文按 2 列算错就会在这里现形）',
      over.length === 0, JSON.stringify(over.map((e) => ({ cls: e.cls, over: e.overflowX }))));
    console.log('   · 版面：' + JSON.stringify(bxs.els.map((e) => ({
      cls: e.cls.slice(0, 24), x: e.x, y: e.y, w: e.w, h: e.h }))));
    console.log(`   · 截图：${s1.file} / ${s2.file}`);
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    server.close();
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* 临时目录，留着也无害 */ }
  }

  if (fails.length) {
    console.log(`\n❌ 八字详情页验收：${fails.length} 项失败：`);
    for (const f of fails) console.log('   ' + f);
    code = 1;
  } else {
    console.log('\n✅ 八字详情页验收通过：盘由后端现算、页面只渲染（纯盘面，不挂 AI）、'
      + '生肖/神煞/大运都跟着端点走（本机静态服务 + 真 Firefox；不含线上 nginx/鉴权/真模型）');
  }
  process.exit(code);
}

main().catch((e) => {
  console.error('❌ 驱动脚本自身出错：' + (e && e.stack || e));
  process.exit(2);
});

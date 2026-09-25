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
const WEB = path.join(ROOT, 'build', 'nginx');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const baziFull = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_full.js'));
const baziPromptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_prompt.js'));
const baziFortuneLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_fortune.js'));
// 排盘那段（`baziChartFromParams`）里渲染 `text` 用的是它 —— 2026-09-25 换新输出规格时
// 后端接上了 `bazi_report.js`，本脚本没跟着注入，于是整条驱动在切片里跑成
// `baziReportLib is not defined`、端点回 400、后面每条用例连红（`smoke_bazi_endpoint.js`
// 那天同步改了，这里漏了）。注入的参数表必须和后端 require 的那一份对齐。
const baziReportLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_report.js'));
const ganzhiLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js'));
const paipanConst = require(path.join(ROOT, 'build', 'backend', 'paipan', 'constants.js'));

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
    baziFull, baziPromptLib, baziReportLib, baziFortuneLib, ganzhiLib, paipanConst);
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

/** 造登录态。`sqw_username` 是 `AUTH.isLoggedIn()` 的判据（auth.js 读 cookie）。 */
async function login(m, user) {
  await goto(m, `${ORIGIN}/`);   // 先落到本站，cookie 才有归属域
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
    check('四块内容都在：基本信息 / 四柱细盘 / 命局提要 / 大运一览',
      ['基本信息', '四柱细盘', '命局提要', '大运一览'].every((t) => text.indexOf(t) >= 0),
      JSON.stringify(text.replace(/\s+/g, ' ').slice(0, 200)));
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
      mutated.chart.overview.headline = '（变异桩）这一行的头条由端点给';
      mutated.chart.dayun[0].tiangan = '丙';
      mutated.chart.dayun[0].dizhi = '寅';
      await stub({ paipan: mutated });
      await goto(m, DETAIL);
      const t2 = await chartReady(m, 10000);
      // 只认**年柱那一格**的两行（天干/地支）。整页搜「癸亥」不行 —— 大运第二步
      // 本来就是癸亥，那样写会把桩的正确渲染判成失败。
      const yp2 = await js(m, `${W}
        var rows = document.querySelectorAll('#baziChart .bz-table tbody tr, #baziRest .bz-table tbody tr');
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
      check('命局提要的头条是桩给的那句',
        t2.indexOf('（变异桩）这一行的头条由端点给') >= 0, '桩的头条没出现');
      const dy2 = await js(m, `var s = document.querySelector('.bz-dayun .bz-step .bz-dgz');
        return s ? s.innerText : '';`);
      check('首运照桩画成 丙寅', /丙寅/.test(dy2), JSON.stringify(dy2));
      await stub({ paipan: null });
    }

    // ── ④ 五个方面：切换 = 替换（一次只看一个）────────────────────
    console.log('\n④ 五个方面切换：替换，不累积');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    const aspects = await js(m, `${W}
      var bar = document.getElementById('baziAspectBar');
      var bs = bar ? bar.querySelectorAll('.bz-aspect') : [];
      var out = [];
      for (var i = 0; i < bs.length; i++) out.push(bs[i].getAttribute('data-aspect'));
      return { aspects: out, conf: !!(W.AI_PANEL_CONF && W.AI_PANEL_CONF.buildBody),
               noFollowUp: W.AI_PANEL_CONF ? W.AI_PANEL_CONF.noFollowUp : 'NO_CONF' };`);
    check('五个方面按后端那套顺序摆出来（与 BAZI_ASPECTS 同一份）',
      aspects.aspects.join(',') === '综合,事业,财运,婚姻,健康', JSON.stringify(aspects.aspects));
    check('面板引擎拿到了八字这份配置（parsePath/buildBody 都在）', aspects.conf === true, '没挂上');
    check('追问栏**没有**被关掉（2026-09-25 拍板「要」）', aspects.noFollowUp !== true,
      JSON.stringify(aspects.noFollowUp));

    // 选「婚姻」并开始解读
    await js(m, `${W}
      document.querySelector('.bz-aspect[data-aspect="婚姻"]').click();
      return document.getElementById('baziAspectHint').textContent;`);
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    const t1 = await L.panelTextUntil(m, /再看现状/, 8000);
    check('婚姻这一方面的正文收完并渲染（markdown 成了区块，不是原文）',
      /【二、你的现状】/.test(t1) && t1.indexOf('**') < 0, JSON.stringify(t1.slice(0, 90)));
    check('正文里的 token 尾巴被切掉了（那是记账用的，不该给用户看）',
      t1.indexOf('消耗 Token') < 0, JSON.stringify(t1.slice(-60)));
    let cap1 = await captured();
    // 先钉**打到哪个 URL**：`AI_PANEL_CONF.parsePath` 是函数，引擎漏掉一次调用就会
    // 把函数体当路径拼进 URL（`/my-charts/function%20()%20%7B…%7D`），而那种失败
    // 在屏幕上只是「一直在检索」—— 光看断言认不出来，必须看服务端收到了什么。
    check('解读请求打到了 `/api/bazi/parse`',
      cap1.hits.indexOf('POST /api/bazi/parse') >= 0, `服务端收到过：${hitsTail()}`);
    check('解读请求带的 tab = 当前方面（婚姻）',
      cap1.ai.length === 1 && cap1.ai[0].tab === '婚姻',
      `${JSON.stringify(cap1.ai)} ／ 服务端收到过：${hitsTail()}`);
    if (cap1.ai.length !== 1) {
      const why = await js(m, `${W}
        var r = document.getElementById('aiResponse');
        return { text: r ? (r.innerText || '') : '', errs: (W.__errs || []).slice(-3) };`);
      console.log('   · 诊断：面板上是 ' + JSON.stringify(why.text.slice(0, 80))
        + ' · 页面报错 ' + JSON.stringify(why.errs));
    }

    // 切到「财运」：上一次的正文不许留在屏幕上
    const t2 = await js(m, `${W}
      document.querySelector('.bz-aspect[data-aspect="财运"]').click();
      var r = document.getElementById('aiResponse');
      return { text: r ? (r.innerText || '') : '', hint: document.getElementById('baziAspectHint').textContent };`);
    check('切方面 = **替换**：婚姻那份正文当场消失',
      t2.text.indexOf('【二、你的现状】') < 0 && t2.text.length < 40,
      JSON.stringify(t2.text.slice(0, 60)));
    check('副标题跟着换成财运的说明（告诉不懂的人点下去会得到什么）',
      /收入来源|破财/.test(t2.hint), JSON.stringify(t2.hint));
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    await L.panelTextUntil(m, /再看现状/, 8000);
    let cap2 = await captured();
    check('第二次解读的 tab = 财运（不是把婚姻又发一遍）',
      cap2.ai.length === 2 && cap2.ai[1].tab === '财运', JSON.stringify(cap2.ai.map((x) => x.tab)));

    // ── ⑤ 旧版可展开：每方面一条 + 旧版折叠 ──────────────────────
    console.log('\n⑤ 每方面一条 + 旧版可展开（记录来自 `/api/bazi-analyses`）');
    await reset(m, { as: KH.alice });
    await stub({
      records: [
        { id: 3, chartId: 'chart_1', aspect: '婚姻', question: '', analysis: '最新一份（桩）', createdAt: 3000 },
        { id: 2, chartId: 'chart_1', aspect: '婚姻', question: '什么时候', analysis: '旧版二（桩）', createdAt: 2000 },
        { id: 1, chartId: 'chart_1', aspect: '婚姻', question: '', analysis: '旧版一（桩）', createdAt: 1000 },
      ],
    });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    // 记录是 mount() 里**异步**取的（`loadRecords`），故等它把旧版块画出来再断言
    await L.until(m, `return document.querySelectorAll('#baziAiHistory .bz-hist-item').length;`,
      (n) => n === 2, 8000);
    const hist0 = await js(m, `${W}
      document.querySelector('.bz-aspect[data-aspect="婚姻"]').click();
      return { hasHist: !!document.querySelector('#baziAiHistory .bz-hist'),
               open: !!document.querySelector('#baziAiHistory .bz-hist[open]'),
               n: document.querySelectorAll('#baziAiHistory .bz-hist-item').length,
               now: (document.getElementById('aiResponse') || {}).innerText || '',
               startBtn: !!document.querySelector('#aiResponse .ai-start-btn') };`);
    check('同一方面解过多份 → 出现「旧版」折叠块', hist0.hasHist && hist0.n === 2,
      JSON.stringify(hist0));
    check('旧版**默认收起**（不抢当前那份的注意力）', hist0.open === false, JSON.stringify(hist0.open));
    // 「每方面一条」= 切到这个方面直接看到**记录里最新那条**，不再让用户点一次
    // （`aiSaved()` 取 `rows[方面][0]`，即服务端按 created_at DESC 排的第一条）
    check('当前正文直接就是**最新一条记录**（新到旧第一条）',
      hist0.now.indexOf('最新一份') >= 0, JSON.stringify(hist0.now.slice(0, 60)));
    check('既然有记录可看，就**不再摆**「解读这一方面」按钮', hist0.startBtn === false,
      '按钮还在 —— 用户会以为要重解一遍');
    // 旧的收在 `<details>` 里：**外层与每一条都得点开**才看得见（收起时 innerText 取不到）
    const older = await js(m, `${W}
      var box = document.getElementById('baziAiHistory');
      var outer = box.querySelector('.bz-hist');
      outer.setAttribute('open', 'open');
      var items = box.querySelectorAll('.bz-hist-item'), out = [];
      for (var i = 0; i < items.length; i++) {
        items[i].setAttribute('open', 'open');
        out.push(items[i].innerText || '');
      }
      return out;`);
    check('展开后两份旧版都在，且标着时间（让人认得出是哪次）',
      older.length === 2 && older.join('|').indexOf('旧版一') >= 0
      && older.join('|').indexOf('旧版二') >= 0, JSON.stringify(older));
    check('旧版里那条带提问的，把「问：什么时候」也留着（记录粒度：每方面一条）',
      older.join('|').indexOf('问：什么时候') >= 0, JSON.stringify(older));

    // ── ⑥ 追问：带上前一份正文、答案追加、主正文不被顶掉 ──────────
    console.log('\n⑥ 追问（要，但不落库）：请求体与屏幕上的样子');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    await L.panelTextUntil(m, /再看现状/, 8000);
    const barShown = await js(m, `var f = document.getElementById('aiFollowBar');
      return !!f && f.classList.contains('show');`);
    check('解读跑完后追问栏露出来了', barShown === true, JSON.stringify(barShown));
    const mainBefore = await js(m, `var r = document.getElementById('aiResponse');
      return r ? (r.innerText || '') : '';`);

    await js(m, `${W}
      document.getElementById('aiFollowInput').value = '那明年呢？';
      W.sendFollowUp();
      return true;`);
    const fq = await L.until(m, `var it = document.querySelector('.ai-followup-item');
      return it ? (it.innerText || '') : '';`, (t) => /再看现状/.test(t || ''), 8000);
    check('追问的答案落进了追问那一条里', /【二、你的现状】/.test(fq), JSON.stringify(fq.slice(0, 90)));
    check('追问那条的「输出中……」转圈**撤掉了**（共用引擎刚修的）',
      (await js(m, `return document.querySelectorAll('.ai-followup-item .ai-loading').length;`)) === 0,
      '转圈还挂着');
    const mainAfter = await js(m, `var r = document.getElementById('aiResponse');
      return r ? (r.innerText || '') : '';`);
    check('追问是**追加**，主正文一字不少', mainAfter.indexOf(mainBefore.trim()) >= 0,
      JSON.stringify({ before: mainBefore.slice(0, 40), after: mainAfter.slice(0, 40) }));
    const aiAll = (await captured()).ai;
    const lastAi = aiAll[aiAll.length - 1] || {};
    // 服务端一条都没收到时，下面的断言会全红；但**不能**让脚本自己去摸 undefined
    // （上一版就是这么死的：报的是 TypeError，看不出真正的问题是「请求没到」）。
    check('追问请求体带 `followUp` = 追问原话',
      lastAi.followUp === '那明年呢？',
      `${JSON.stringify(lastAi.followUp)} ／ 服务端收到过：${hitsTail()}`);
    check('追问请求体带 `context` = 刚才那份解读（服务端据此接着答）',
      typeof lastAi.context === 'string' && lastAi.context.indexOf('【一、结论】') >= 0,
      JSON.stringify(String(lastAi.context).slice(0, 60)));
    check('追问不走 `question`（那是首次解读的补充提问，服务端两回事）',
      lastAi.question === '' && lastAi.tab === '综合', JSON.stringify(lastAi));
    check('追问不落库这条由**服务端**判：客户端只发 followUp，没另发开关',
      !('noSave' in lastAi), JSON.stringify(Object.keys(lastAi)));

    // 服务端回 403 needLogin → 引导登录（共用引擎刚接上的那条路）
    //
    // ⚠ **这一格本来想按「游客追问」写，写不成**：`my-charts/index.html` 开头就
    //   `if (!AUTH.isLoggedIn() && !isAdminView) { renderEmpty('🔒','登录后查看命盘',…) ; return; }`
    //   —— 游客**根本进不到这一页**，连盘都看不见，也就没有「游客追问」这个场景。
    //   所以这里用「登录用户 + 服务端坚持说 needLogin」来打这条路：`onRefusal` 认的是
    //   **响应**（403 + `needLogin`），不是「本地是不是游客」，两种来路在这段代码里是同一条。
    //   而「游客能看见命盘」不会发生了 —— 用户 2026-09-25 拍板游客不可以看命盘（见 ⑦）。
    //   所以 403 这条路**永远由服务端触发**（比如登录过期），这一格测它反倒更贴实际。
    console.log('\n⑥b 服务端回 403 needLogin：追问那一格里直接引导登录');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    await js(m, `document.querySelector('.bz-aspect[data-aspect="事业"]').click(); return true;`);
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    await L.panelTextUntil(m, /再看现状/, 8000);
    await stub({ refuseAi: true });
    await js(m, `${W}
      document.getElementById('aiFollowInput').value = '那明年呢？';
      W.sendFollowUp();
      return true;`);
    const refused = await L.until(m, `var it = document.querySelector('.ai-followup-item');
      return it ? (it.innerText || '') : '';`, (t) => /登录/.test(t || ''), 8000);
    check('403 needLogin 被页面接住，在追问那一格里给出登录引导',
      /登录/.test(refused) && refused.indexOf('needLogin') < 0, JSON.stringify(refused.slice(0, 90)));
    check('登录引导条里写着「登录后回到这个方面接着解读」',
      /接着解读|自动回到/.test(refused), JSON.stringify(refused.slice(0, 120)));
    check('引导就画在**追问那一格**里，主正文不被顶掉（不能整块换成登录页）',
      (await js(m, `var r = document.getElementById('aiResponse');
        return r ? (r.innerText || '') : '';`)).indexOf('【一、结论】') >= 0,
      '主正文没了');
    const pend = await js(m, `try { return sessionStorage.getItem('bazi_pending_aspect'); }
      catch (e) { return 'ERR'; }`);
    check('记下了「刚才想解哪个方面」（登录整页刷新后靠它接着解）',
      pend === '事业', JSON.stringify(pend));
    await stub({ refuseAi: false });

    // ── ⑦ 未登录不许解「综合」：拦在发请求之前；登录回来接着解 ────
    console.log('\n⑦ 没登录时点「综合」：先说清为什么要登录，再回跳接着解');
    // 门禁是**拍板的**行为，不再是「缺口」：用户 2026-09-25 明确「游客不可以看命盘吧」。
    // 这条 check 现在钉的是**这个决定**：游客必须看不到盘。它变红 = 门禁松了，
    // 那时先回来确认是不是有人无意中放开了游客。
    // （连带：八字这条线没有「游客免费一次」—— 那条是六爻/梅花的规则，游客在那儿能起卦。）
    await reset(m, { as: KH.guest });
    await goto(m, DETAIL);
    const wall = await js(m, `return { content: ((document.getElementById('mc-content') || {}).innerText || ''),
      chart: !!document.getElementById('baziChart') };`);
    check('游客看不到命盘（2026-09-25 拍板：整页要求登录；变红 = 门禁松了，回来确认）',
      /登录后查看命盘/.test(wall.content) && wall.chart === false,
      JSON.stringify(wall.content.replace(/\s+/g, ' ').slice(0, 60)));

    // 在**真页面**上造出「未登录 + 面板已挂载」这个状态：登录进去把盘排出来，
    // 再当场把 cookie 摘掉。`AUTH.isLoggedIn()` 是每次现读 cookie 的（auth.js:18），
    // 所以摘掉之后页面里的判断立刻变成未登录 —— 与真游客走的**同一段代码**。
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    await logout(m);
    await js(m, `${W} W.BaziAI.select('事业'); W.BaziAI.select('综合'); return true;`);
    const lock = await js(m, `var b = document.querySelector('.bz-aspect[data-aspect="综合"]');
      return { lock: /🔒/.test(b.innerText || ''), cur: b.classList.contains('on') };`);
    check('没登录时「综合」上挂着锁并默认选中', lock.lock === true && lock.cur === true,
      JSON.stringify(lock));
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    const blocked = await L.until(m, `var r = document.getElementById('aiResponse');
      return r ? (r.innerText || '') : '';`, (t) => /登录/.test(t || ''), 5000);
    check('点下去先给理由（不是等服务端 403 才知道）',
      /整张盘通看一遍/.test(blocked), JSON.stringify(blocked.slice(0, 90)));
    check('**一个请求都没发**（拦在花钱之前）', (await captured()).ai.length === 0,
      JSON.stringify((await captured()).ai.length));
    // 拦住之后得留下「回来接着解」的线头：那颗登录按钮的 onclick 第一句就是
    // `BaziAI.beforeLogin()`（真正的意图记录点）。点它 —— 顺带验这行接线没写错。
    const hadLink = await js(m, `var a = document.querySelector('#aiResponse a[onclick*="beforeLogin"]');
      if (!a) return false;
      a.click();
      return true;`);
    check('拦下来时给的是**登录按钮**（不是只留一句冷冰冰的话）', hadLink === true, '没找到登录按钮');
    const pend2 = await js(m, `try { return sessionStorage.getItem('bazi_pending_aspect'); }
      catch (e) { return 'ERR'; }`);
    check('点登录时记下了想解的方面（登录整页刷新，回来靠它接着解）',
      pend2 === '综合', JSON.stringify(pend2));

    // 登录回来（auth.js 登录成功是 location.reload，故这里就模拟「带着 cookie 重新进页」）
    await login(m, 'alice');
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    const back = await L.until(m, `var r = document.getElementById('aiResponse');
      return r ? (r.innerText || '') : '';`, (t) => /【二、你的现状】/.test(t || ''), 8000);
    check('登录后回到这一页**自动接着解「综合」**（不用用户再点一次）',
      /【一、结论】/.test(back), JSON.stringify(back.slice(0, 60)));
    const autoOpen = await js(m, `var p = document.getElementById('aiPanel');
      return { open: !!p && p.classList.contains('open'),
               shown: p ? getComputedStyle(p).display : 'NO_PANEL' };`);
    check('自动接着解时**面板是打开的**（不带 .open 的面板是 display:none，正文会流进看不见的地方）',
      autoOpen.open === true && autoOpen.shown !== 'none', JSON.stringify(autoOpen));
    const last7 = (await captured()).ai;
    check('自动接着解的那一次，tab = 综合', last7.length === 1 && last7[0].tab === '综合',
      JSON.stringify(last7.map((x) => x.tab)));
    const pend3 = await js(m, `try { return sessionStorage.getItem('bazi_pending_aspect'); }
      catch (e) { return 'ERR'; }`);
    check('意图用掉就清掉（不会下次进来又自动解一遍）', pend3 === null, JSON.stringify(pend3));

    // ── ⑧ 面板形态：页内，不浮层，不盖住盘 ────────────────────────
    console.log('\n⑧ 页内面板（产品规矩：不浮层、不盖住刚排好的盘）');
    const panel = await js(m, `${W}
      var p = document.getElementById('aiPanel');
      var o = document.getElementById('aiPanelOverlay');
      var host = document.getElementById('aiInlineHost');
      var area = document.getElementById('baziAiArea');
      var chart = document.getElementById('baziChart');
      var rest = document.getElementById('baziRest');
      var hero = document.querySelector('#baziChart .bz-hero');
      var pr = p ? p.getBoundingClientRect() : null;
      var cr = chart ? chart.getBoundingClientRect() : null;
      var rr = rest ? rest.getBoundingClientRect() : null;
      var hr = hero ? hero.getBoundingClientRect() : null;
      // 「盘」现在是两块（#baziChart 在上、#baziRest 在下，AI 块夹在中间），
      // 所以「没被面板挤掉/盖掉」要按**两块各自**判：上块整个在面板之上、
      // 下块整个在面板之下；再看四柱 hero 自身有没有真实高度（61px 的实测值，
      // 不是 0/NaN 那种「元素不在」的假象）。
      return { open: !!p && p.classList.contains('open'),
               position: p ? getComputedStyle(p).position : '',
               inline: !!p && p.classList.contains('inline'),
               inHost: !!(p && host && host.contains(p)),
               hostAfterArea: !!(host && area && host.previousElementSibling === area),
               overlayOpen: !!o && o.classList.contains('open'),
               chartAbovePanel: !!(pr && cr && cr.bottom <= pr.top + 1),
               restBelowPanel: !!(pr && rr && rr.top >= pr.bottom - 1),
               chartH: cr ? Math.round(cr.height) : 0,
               restH: rr ? Math.round(rr.height) : 0,
               heroH: hr ? Math.round(hr.height) : 0,
               heroText: hero ? (hero.innerText || '') : '' };`);
    check('面板是页内形态（position:static + .inline + 挂在命盘容器后面）',
      panel.open && panel.position === 'static' && panel.inline && panel.inHost
      && panel.hostAfterArea, JSON.stringify(panel));
    check('没有全屏遮罩（不再盖住刚点开要看的那张盘）',
      panel.overlayOpen === false, JSON.stringify(panel.overlayOpen));
    // ⚠ 这里原来判的是 `chartH > 200`（那时「盘」还整块在一个容器里）。拆成两块之后
    // `#baziChart` 只剩四柱 hero（实测 61px），这条会**因为版面改了而假红** ——
    // 它量的东西已经不等于「盘还在不在」了。改成量真正的三件事：
    //   ① 四柱 hero 有真实高度且八个字在里头（不是被清空/塌成 0）
    //   ② 上块整个在面板之上  ③ 下块（基本信息+细盘+提要+大运）整个在面板之下
    check('盘还在、还能读（四柱 hero 有高度，面板两边的块都没被挤掉或盖掉）',
      panel.heroH > 40
      && /年柱/.test(panel.heroText) && /时柱/.test(panel.heroText)
      && panel.chartAbovePanel === true && panel.restBelowPanel === true,
      JSON.stringify(panel));

    // ── ⑧b 面板收起之后必须回得来（用户 2026-09-25 报的那一条）─────
    // 用户原话：「ai解读还是可以叉掉，叉掉之后又他妈打不开解析了，这个 x 的意义在哪」。
    // 这条路上有两个病，各钉一条：
    //   ① 那颗 ✕ 只关不开，而**方面按钮还在页面上、还点得动** —— 一点就进死胡同。
    //      已按用户要求删掉；这里钉住「不许回来」。
    //   ② `select()` 原来不打开面板，于是「面板关着的任何时刻点方面」都是没反应
    //      （登录回跳也会落进这个状态）。这条钉住「点了方面，面板一定看得见」。
    console.log('\n⑧b 收起面板之后还能回来（✕ 已删除；点方面必须带出面板）');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    const noX = await js(m, `return { x: !!document.querySelector('.ai-panel-close'),
      header: (document.querySelector('.ai-panel-header') || {}).innerText || '' };`);
    check('表头那颗 ✕ 已经删除（用户点名；变红 = 有人加回来了）',
      noX.x === false, JSON.stringify(noX));
    // 走引擎真实的收起路径（就是那颗 ✕ 原先调的那个函数），把面板弄成「关着」的状态
    await js(m, `${W} W.closeAIPanel(); return true;`);
    const shut = await js(m, `var p = document.getElementById('aiPanel');
      return { open: !!p && p.classList.contains('open'),
               display: p ? getComputedStyle(p).display : 'NO_PANEL' };`);
    check('前提成立：此刻面板确实是收起的（不给下面那条假绿的机会）',
      shut.open === false && shut.display === 'none', JSON.stringify(shut));
    // 用户的下一个动作：点一个方面
    const reopened = await js(m, `${W}
      document.querySelector('.bz-aspect[data-aspect="健康"]').click();
      var p = document.getElementById('aiPanel');
      var b = document.querySelector('#aiResponse .ai-start-btn');
      var r = b ? b.getBoundingClientRect() : null;
      return { open: !!p && p.classList.contains('open'),
               display: p ? getComputedStyle(p).display : 'NO_PANEL',
               hint: (document.getElementById('baziAspectHint') || {}).textContent || '',
               startVisible: !!r && r.height > 0 && r.width > 0 };`);
    check('**面板关着时点方面 → 面板被带出来**（这就是「点了一点反应都没有」那个病）',
      reopened.open === true && reopened.display !== 'none' && reopened.startVisible === true,
      JSON.stringify(back));
    check('而且真的切过去了（副标题换成健康那条，不是只把面板打开）',
      /体质/.test(reopened.hint), JSON.stringify(reopened.hint));

    // ── ⑧c AI 块在「排盘」下面、「其余」上面；可折叠，且折叠不停流 ──────
    // 用户原话（2026-09-25）：「先把ai解析块移到上面一些，让用户一眼就能看到（但可以选择
    // 折叠对话，所以不影响看下面的内容），除了排盘以外的不重要信息都给我放下面。」
    // 钉两条：①版面顺序（挪回去就变红）②折叠**不许**中断这次解读
    // （把折叠接成 closeAIPanel() 是这块最容易写错的一处，见 bazi_ai_panel.js:setCollapsed）。
    console.log('\n⑧c AI 块的位置（排盘下面 / 其余上面）与折叠（收起不停流）');
    await reset(m, { as: KH.alice });
    await goto(m, DETAIL);
    await chartReady(m, 10000);
    await panelReady(m);
    const lay = await js(m, `
      function tops(sel) { var e = document.querySelector(sel); return e ? e.getBoundingClientRect().top : null; }
      function restSecTop(t) {
        var s = document.querySelectorAll('#baziRest .bz-sec');
        for (var i = 0; i < s.length; i++) {
          var ti = s[i].querySelector('.bz-sec-title');
          if (ti && (ti.innerText || '').replace(/\\s+/g, '') === t) return s[i].getBoundingClientRect().top;
        }
        return null;
      }
      var chart = document.getElementById('baziChart');
      var rest = document.getElementById('baziRest');
      var aiSec = document.getElementById('baziAiSec');
      return { aiTop: tops('#baziAiSec'),
               chartBottom: chart ? chart.getBoundingClientRect().bottom : null,
               chartText: chart ? (chart.innerText || '').replace(/\\s+/g, '') : '',
               restText: rest ? (rest.innerText || '').replace(/\\s+/g, '') : '',
               restTop: rest ? rest.getBoundingClientRect().top : null,
               aiBottom: aiSec ? aiSec.getBoundingClientRect().bottom : null,
               jibenTop: restSecTop('基本信息'), xipanTop: restSecTop('四柱细盘'),
               tiyaoTop: restSecTop('命局提要'), dayunTop: restSecTop('大运一览') };`);
    // 用户认的「排盘」= **只有四柱那一段**。基本信息的 8 行（节气/人元司令/古法参看/录入时间）
    // 在手机上占满一屏 —— 第一版把它留在 AI 块上面，用户在手机上只看到 AI 块的标题露个边。
    check('AI 块上面**只剩四柱**（生肖姓名 + 八个字；基本信息等一律下去了）',
      lay.chartBottom !== null && lay.aiTop !== null && lay.chartBottom <= lay.aiTop + 1
      && !/基本信息/.test(lay.chartText) && !/四柱细盘/.test(lay.chartText),
      JSON.stringify({ chartBottom: Math.round(lay.chartBottom || -1),
        aiTop: Math.round(lay.aiTop || -1),
        chartText: lay.chartText.slice(0, 60) }));
    check('「其余」（基本信息 + 四柱细盘 + 命局提要 + 大运一览）整块在 AI 块**下面**',
      lay.aiBottom !== null && lay.restTop !== null && lay.aiBottom <= lay.restTop + 1
      && /基本信息/.test(lay.restText) && /四柱细盘/.test(lay.restText)
      && /命局提要/.test(lay.restText) && /大运一览/.test(lay.restText)
      && lay.jibenTop > lay.aiTop && lay.xipanTop > lay.aiTop
      && lay.tiyaoTop > lay.aiTop && lay.dayunTop > lay.aiTop,
      JSON.stringify({ aiBottom: Math.round(lay.aiBottom || -1),
        restTop: Math.round(lay.restTop || -1), jiben: Math.round(lay.jibenTop || -1),
        xipan: Math.round(lay.xipanTop || -1),
        tiyao: Math.round(lay.tiyaoTop || -1), dayun: Math.round(lay.dayunTop || -1) }));
    // **这一条才是用户说的「一眼就能看到」**：手机 390×844 上，方面栏与「解读」按钮都得
    // 落在**第一屏**里 —— 不是「标题在最底边露个角」。第一版把基本信息留在 AI 块上面时，
    // 按钮在 y≈760、视口只有 758：正好差一点，用户在手机上就是看不到。这条会红。
    await L.setWindow(m, 390, 844);
    const fold = await js(m, `var vh = window.innerHeight;
      function top(sel) { var e = document.querySelector(sel); if (!e) return null;
        return Math.round(e.getBoundingClientRect().top + window.scrollY); }
      return { vh: vh, aiTop: top('#baziAiSec'), barTop: top('#baziAspectBar'),
               btnTop: top('#aiResponse .ai-start-btn') };`);
    check('手机一屏（390×844）内就看得到方面栏与「解读」按钮（不是只露个标题）',
      fold.barTop !== null && fold.btnTop !== null
      && fold.barTop < fold.vh && fold.btnTop < fold.vh, JSON.stringify(fold));
    await L.setWindow(m, 500, 900);
    const defo = await js(m, `var b = document.getElementById('baziAiBody');
      var p = document.getElementById('aiPanel');
      var s = document.querySelector('#aiResponse .ai-start-btn');
      var r = s && s.getBoundingClientRect();
      return { disp: b ? getComputedStyle(b).display : 'NO_BODY',
               panelH: p ? Math.round(p.getBoundingClientRect().height) : -1,
               aria: (document.getElementById('baziAiToggle') || {}).getAttribute('aria-expanded'),
               startVisible: !!r && r.height > 0 };`);
    check('默认**展开**（用户：一眼就能看到）',
      defo.disp !== 'none' && defo.panelH > 0 && defo.aria === 'true' && defo.startVisible === true,
      JSON.stringify(defo));
    // 造一次**正在跑**的解读：桩是「首段立刻写、次段 120ms 后写」（见本文件 2. 站点那段）
    await js(m, `document.querySelector('.bz-aspect[data-aspect="事业"]').click(); return true;`);
    await js(m, `document.querySelector('#aiResponse .ai-start-btn').click(); return true;`);
    const seg1 = await L.panelTextUntil(m, /【一、结论】/, 8000);
    check('前提成立：首段已经流进来（好让「收起会不会掐断」这条断言真能验到东西）',
      /【一、结论】/.test(seg1 || ''), JSON.stringify((seg1 || '').slice(0, 40)));
    // 用户的下一个动作：把对话收起来（标题那行就是开关）
    // ⚠ **真正钉住「折叠不停流」的是 `abortCalls`**：收起那一下把 `window.abortAIStream`
    //   包了一层数调用次数 —— 折叠若接成 `closeAIPanel()`（它内部会 abort），这里就是 1。
    //   （只断言「次段后来到了」不够：桩是 120ms 后写，abort 之后正文有时也能落地，
    //     那样这条会**在错实现上照样绿** —— 变异验过，见下。）
    // ⚠ 数的是**页面真全局**上的 `abortAIStream`（`W` = `window.wrappedJSObject`）：
    //   沙箱里的裸 `window` 读不到页面的函数（读出来是 undefined），那样这条会**假绿**。
    const folded = await js(m, `${W}
      var abortCalls = 0;
      var origAbort = W.abortAIStream;
      if (typeof origAbort === 'function') {
        W.abortAIStream = function () { abortCalls++; return origAbort.apply(this, arguments); };
      }
      document.getElementById('baziAiToggle').click();
      if (typeof origAbort === 'function') W.abortAIStream = origAbort;
      var b = document.getElementById('baziAiBody');
      var p = document.getElementById('aiPanel');
      var s = document.getElementById('baziAiSec');
      return { disp: b ? getComputedStyle(b).display : 'NO_BODY',
               cls: !!s && s.classList.contains('collapsed'),
               panelOpen: !!p && p.classList.contains('open'),
               panelH: p ? Math.round(p.getBoundingClientRect().height) : -1,
               caret: (document.querySelector('#baziAiToggle .bz-caret') || {}).textContent || '',
               aria: (document.getElementById('baziAiToggle') || {}).getAttribute('aria-expanded'),
               abortCalls: abortCalls, hasAbortFn: typeof origAbort === 'function' };`);
    check('点标题行就收起来了（内容藏掉、开关字样翻成「展开」）',
      folded.disp === 'none' && folded.cls === true && /展开/.test(folded.caret)
      && folded.aria === 'false' && folded.panelH === 0, JSON.stringify(folded));
    check('收起**没有掐这次解读**（没调 abortAIStream；收起=腾地方，不是不看了）',
      folded.abortCalls === 0 && folded.hasAbortFn === true, JSON.stringify(folded));
    check('收起**不是**把面板关掉（面板自身仍带 .open；关了就等于把这次解读掐了）',
      folded.panelOpen === true, JSON.stringify(folded.panelOpen));
    // 用户看得见的结果：答案照样流完，不是半截
    const afterFold = await L.until(m, `var r = document.getElementById('aiResponse');
      return r ? (r.innerText || '') : '';`, (t) => /【二、你的现状】/.test(t || ''), 8000);
    check('收起之后答案照样流完（不是停在半截）',
      /【二、你的现状】/.test(afterFold || ''), JSON.stringify((afterFold || '').slice(-50)));
    const back2 = await js(m, `${W}
      document.getElementById('baziAiToggle').click();
      var b = document.getElementById('baziAiBody');
      var p = document.getElementById('aiPanel');
      var r = document.getElementById('aiResponse');
      return { disp: b ? getComputedStyle(b).display : 'NO_BODY',
               panelH: p ? Math.round(p.getBoundingClientRect().height) : -1,
               text: r ? (r.innerText || '') : '' };`);
    check('展开回来：块可见、答案还在（不用重新解一次）',
      back2.disp !== 'none' && back2.panelH > 0
      && /【一、结论】/.test(back2.text) && /【二、你的现状】/.test(back2.text),
      JSON.stringify({ disp: back2.disp, h: back2.panelH, tail: back2.text.slice(-40) }));

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
    console.log('\n✅ 八字详情页验收通过：盘由后端现算、页面只渲染、追问不落库、面板在正文流里'
      + '（本机静态服务 + 真 Firefox；不含线上 nginx/鉴权/真模型）');
  }
  process.exit(code);
}

main().catch((e) => {
  console.error('❌ 驱动脚本自身出错：' + (e && e.stack || e));
  process.exit(2);
});

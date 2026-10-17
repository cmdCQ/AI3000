/**
 * 驱页 · 我的命盘（`/my-charts/`）的端到端验收
 * ==========================================================================
 *
 * 这一页的判据取法和上一页（`drive_ai_chat_page.js`）不同，值得写清楚。
 *
 * `/ai-chat/` 的顶层全是 `function` 声明，可以扔进 vm 把函数捞出来一个个喂输入。
 * 但 `page-my-charts.js` 是 **IIFE**，渲染函数全在闭包里，而且它一加载就自己决定
 * 走列表还是详情。撬开闭包只能改老文件 —— 那就把判据换成了新实现自己。
 *
 * 所以这里**不比函数，比渲染结果**：`duipan/legacy_my_charts.js` 用最小 DOM 桩把老实现
 * 原样跑一遍，交出它写进 `#mc-content`（以及 `#baziChart`/`#baziAi`/`#baziRest`）的 HTML；
 * 本脚本在真 Firefox 里把**新页面**load 起来、读同一个元素、**逐字节比**。
 *
 * 这么比还顺带把「先同步写骨架、再等 fetch」这个**顺序**钉住了 —— 本页最容易错的就是顺序。
 *
 * 测的是**产物**（`build/nginx`，Vite 打包+版本化后的那一份），不是 `src/web` 源码。
 *
 * 它不覆盖：真后端 / 真 MySQL / `BaziRender` 与 `BaziAI` 的真实渲染（那两个共享模块本次
 * 不搬，期望值里它们不参与，所以差分只比骨架与退路）。
 *
 * ⚠ **不能和别的驱动同时跑**：`drive_lib.launchFirefox()` 会先把全机的无头 Firefox 全杀掉
 *   （snap 版不认 `-profile`，所有驱动共用同一个真 profile），两个同时跑 = 互相掐死。
 *
 * 用法：node duipan/drive_my_charts_page.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题（测不出来，不是通过）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');
const legacy = require('./legacy_my_charts');

const ROOT = path.join(__dirname, '..');
// 默认测线上那一份（`build/nginx`）。上线**之前**想先在暂存目录里验收，就
// `DRIVE_ROOT=/tmp/mc-build node duipan/drive_my_charts_page.js` —— 那时还没有 sync.sh
// 打的 `?v=`，所以本脚本刻意不去断言 `?v=`（那是另一层的事）。
const WEB = process.env.DRIVE_ROOT || path.join(ROOT, 'build', 'nginx');
// 端口错开另五份驱动（2026-10-17 逐个 grep 过，别凭注释猜）：
//   mhys-page 8892/2828  mhys-twice 8901/2831  liuyao 8898/2829
//   bazi 8897/2830       ai-chat 8893/2832
// 这里用没人碰的 8894/2833。错开只为防残留，**不为并行**（见头注释）。
const PORT = 8894;
const MARIONETTE_PORT = 2833;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SHOT_DIR = '/tmp/my-charts-drive';

// ─────────────────────────────────────────────────────────────
// 1. 桩数据
//    测试数据故意含：HTML 特殊字符（< & " '）、emoji、hour/minute 缺省（?? 12 / ?? 0）、
//    生肖边界（1920 = 猴、2001 = 蛇、1990 = 马）、createdAt 为空（那一行就不该出现）。
// ─────────────────────────────────────────────────────────────
const CHART_A = {
  id: 'c1', name: '张三<&>"x"', gender: 'male', birthplace: '北京',
  birth: { year: 1990, month: 3, day: 5, hour: 14, minute: 30 },
  createdAt: '2026-09-01T10:20:30Z', bazi: '庚午 己卯 甲子 辛未',
  trueSolarTime: true, longitude: 116.4,
};
const CHART_B = {
  id: 'c2', name: "李四's 盘 🀄", gender: 'female',
  birth: { year: 2001, month: 12, day: 31 },        // hour / minute 缺省
  createdAt: '2026-09-02T00:00:00Z', bazi: '辛巳 庚子 丁卯 壬子',
};
const CHART_C = {
  id: 'c3', name: '', gender: 'male',
  birth: { year: 1920, month: 1, day: 1, hour: 0 },
  createdAt: null,                                   // 不该渲染出创建时间那一行
};

// ─────────────────────────────────────────────────────────────
// 2. 桩服务器
// ─────────────────────────────────────────────────────────────
let stub = {};
let captured = [];
let expectHtml = null;

async function api(req, res, pathname) {
  // ⚠ `L.readBody()` 返回的是**已经 parse 过**的对象（见 drive_lib.js:38），不是原始字符串。
  const raw = await L.readBody(req);

  if (pathname === '/__stub' && req.method === 'POST') {
    stub = raw || {};
    captured = [];
    return L.sendJson(res, { ok: true }), true;
  }

  // 「把这段 HTML 交给浏览器解析再吐回来」——见 `roundTrip()` 的注释。
  if (pathname === '/__expect' && req.method === 'POST') {
    expectHtml = raw && typeof raw.html === 'string' ? raw.html : '';
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__expect') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(expectHtml == null ? '' : expectHtml);
    return true;
  }
  if (pathname === '/__captured') return L.sendJson(res, captured), true;

  if (pathname === '/api/charts' && req.method === 'GET') {
    captured.push({ url: pathname, method: 'GET', auth: req.headers.authorization || null });
    if (stub.chartsStatus && stub.chartsStatus !== 200) {
      res.writeHead(stub.chartsStatus, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'x' })), true;
    }
    return L.sendJson(res, stub.charts || []), true;
  }

  const mChart = pathname.match(/^\/api\/charts\/([^/]+)$/);
  if (mChart) {
    captured.push({ url: pathname, method: req.method, auth: req.headers.authorization || null });
    if (req.method === 'DELETE') return L.sendJson(res, { ok: true }), true;
    const want = decodeURIComponent(mChart[1]);
    if (stub.chart && stub.chart.id === want) return L.sendJson(res, stub.chart), true;
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'not found' })), true;
  }

  const mAdmin = pathname.match(/^\/api\/admin\/chart-detail\/([^/]+)$/);
  if (mAdmin) {
    captured.push({ url: pathname, method: 'GET', auth: req.headers.authorization || null });
    if (stub.adminChart) return L.sendJson(res, stub.adminChart), true;
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'not found' })), true;
  }

  if (pathname === '/api/bazi/paipan' && req.method === 'POST') {
    captured.push({ url: pathname, method: 'POST', auth: req.headers.authorization || null, body: raw });
    if (stub.paipan === 'hang') return true;                 // 不回包 → 骨架就停在「正在排盘…」
    if (stub.paipan === 'fail') {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '排盘失败（500）' })), true;
    }
    return L.sendJson(res, stub.paipan || {}), true;
  }

  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

function startServer() { return L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api }); }
function launchFirefox() { return L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'mycharts-prof' }); }

const js = L.js;
const W = L.W;

// ─────────────────────────────────────────────────────────────
// 3. 断言小工具
// ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`   ✓ ${name}`); }
  else {
    fail++;
    failures.push(name);
    console.log(`   ✗ ${name}`);
    if (detail) console.log(String(detail).split('\n').map((l) => '       ' + l).join('\n'));
  }
}

/** 逐字节比两段 HTML，不一样就把**第一个差异位置**连同上下文打出来 */
function okHtml(name, got, want) {
  if (typeof got !== 'string' || typeof want !== 'string') {
    fail++; failures.push(name);
    console.log(`   ✗ ${name} —— 有一侧不是字符串（实得 ${got === null ? 'null' : typeof got} / 应有 ${want === null ? 'null' : typeof want}）`);
    return;
  }
  if (got === want) { pass++; console.log(`   ✓ ${name}（${want.length} 字节）`); return; }
  fail++; failures.push(name);
  let i = 0;
  while (i < got.length && i < want.length && got[i] === want[i]) i++;
  const ctx = (s) => JSON.stringify(s.slice(Math.max(0, i - 60), i + 80));
  console.log(`   ✗ ${name} —— 逐字节不同（第 ${i} 字节起；实得 ${got.length} 字节 / 应有 ${want.length} 字节）`);
  console.log(`       实得: ${ctx(got)}`);
  console.log(`       应有: ${ctx(want)}`);
}

async function setStub(obj) {
  await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify(obj) });
}
async function capturedCalls() {
  const r = await fetch(`${ORIGIN}/__captured`);
  return r.json();
}

/** 置登录态。`AUTH.isLoggedIn()` 只认 `sqw_username`（auth.js:18）。 */
async function setLogin(m, user) {
  await L.goto(m, `${ORIGIN}/`);
  await js(m, `document.cookie = 'sqw_username=${user || ''}; path=/; max-age=' + (${user ? 86400 : 0});`);
  await js(m, `document.cookie = 'sqw_token=${user ? 'stub-token-abc' : ''}; path=/; max-age=' + (${user ? 86400 : 0});`);
}

/**
 * 打开这一页并等 React 把 `#mc-content` 从「加载中…」换掉。
 * ⚠ `url` 必须带上查询串（`?id=` / `?admin=1&id=`）—— 老实现靠它分派列表还是详情，
 *   漏了就会**静默走成列表**，那样后面几条详情断言全在比错的页面（本脚本初版就是这么错的）。
 */
async function untilRendered(m, url) {
  await L.goto(m, `${ORIGIN}${url || '/my-charts/'}`);
  await L.until(m,
    `${W} var el=document.getElementById('mc-content'); return !!el && el.innerHTML.indexOf('加载中')<0;`,
    (v) => v === true, 15000);
}

/**
 * 把一段 HTML 交给**浏览器**解析再吐回来。
 *
 * 为什么非做这一步：老实现拼 HTML 用的是 `innerHTML = h`，而 `h` 里有些属性值是**未转义**的
 * （`esc()` 走 `textContent → innerHTML`，按浏览器规则**不转义引号**）。名字里带 `"` 时，
 * 那段 onclick 属性在源码里就是**畸形**的 —— 浏览器解析一遍之后，读回来的 `innerHTML`
 * 与源码字符串**长得不一样**（浏览器会重排、补引号）。
 *
 * 所以「老实现的字符串」和「新页面读回来的 innerHTML」本来就不是同一种东西，直接比会假红。
 * 正确做法是让两边受同一道加工：把老那份也塞进一个真浏览器节点、读回它的 innerHTML。
 * （`legacy_my_charts.js` 那边是 DOM 桩，没有解析器，所以这一步只能在浏览器里做。）
 */
async function roundTrip(m, html) {
  await fetch(`${ORIGIN}/__expect`, { method: 'POST', body: JSON.stringify({ html }) });
  // ⚠ 用**同步** XHR，不用 fetch：`drive_lib.js:334` 的 `js()` 走 `WebDriver:ExecuteScript`，
  //   它**不会 await** 返回的 Promise（拿到的是 `{}`）。要等异步就得换 ExecuteAsyncScript，
  //   而同步 XHR 在页面里读同源小数据是够用的，也不必去动 drive_lib 这个共用件。
  return js(m, `${W}
    var x = new XMLHttpRequest();
    x.open('GET', '${ORIGIN}/__expect', false);
    x.send();
    var d = document.createElement('div'); d.innerHTML = x.responseText; return d.innerHTML;`);
}

async function htmlOf(m, id) {
  return js(m, `${W} var el=document.getElementById('${id}'); return el ? el.innerHTML : null;`);
}

// ─────────────────────────────────────────────────────────────
// 4. 用例
// ─────────────────────────────────────────────────────────────
async function main() {
  const server = await startServer();
  const { child, m } = await launchFirefox();
  try {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await L.setWindow(m, 500, 900);

    // ── 4.1 三次页面状态与老实现逐字节比 ─────────────────────
    console.log('\n【A】页面渲染与老实现逐字节比（老那份由 legacy_my_charts.js 当场算）');

    const cases = [
      {
        name: '游客（未登录）',
        url: '/my-charts/', user: null, stub: {},
        legacy: { search: '', isLoggedIn: false },
      },
      {
        name: '登录 + 空列表',
        url: '/my-charts/', user: 'alice', stub: { charts: [] },
        legacy: { search: '', isLoggedIn: true, store: { getAll: async () => [] } },
      },
      {
        name: '登录 + 三份命盘（特殊字符/缺省/边界）',
        url: '/my-charts/', user: 'alice',
        stub: { charts: [CHART_A, CHART_B, CHART_C] },
        legacy: {
          search: '', isLoggedIn: true,
          store: { getAll: async () => [CHART_A, CHART_B, CHART_C] },
        },
      },
      {
        name: '列表 401（登录已过期）',
        url: '/my-charts/', user: 'alice', stub: { chartsStatus: 401 },
        legacy: {
          search: '', isLoggedIn: true,
          store: { getAll: async () => { throw { status: 401, message: 'x' }; } },
        },
      },
      {
        name: '列表 500（加载失败）',
        url: '/my-charts/', user: 'alice', stub: { chartsStatus: 500 },
        legacy: {
          search: '', isLoggedIn: true,
          store: { getAll: async () => { throw { status: 500 }; } },
        },
      },
      {
        name: '详情骨架（排盘接口挂住 → 骨架必须留在「正在排盘…」）',
        url: '/my-charts/?id=c1', user: 'alice', stub: { chart: CHART_A, paipan: 'hang' },
        legacy: {
          search: '?id=c1', isLoggedIn: true,
          store: { get: async () => CHART_A },
          trimDetailActions: true, // §5.4：页尾编辑/删除入口已删（见上面的说明）
        },
        shot: '01-详情骨架.png',
      },
      {
        name: '详情：命盘不存在或已删除',
        url: '/my-charts/?id=nope', user: 'alice', stub: { chart: CHART_A },
        legacy: { search: '?id=nope', isLoggedIn: true, store: { get: async () => null } },
      },
      {
        name: '后台详情骨架（?admin=1，走 admin 端点 + localStorage 里的 admin token）',
        url: '/my-charts/?admin=1&id=c1', user: null,
        localStorage: { sqw_admin_token: 'admin-tok' },
        stub: { adminChart: CHART_A, paipan: 'hang' },
        legacy: {
          search: '?admin=1&id=c1', isLoggedIn: false,
          localStorage: { sqw_admin_token: 'admin-tok' },
          adminChart: CHART_A,
        },
      },
    ];

    for (const c of cases) {
      console.log(`\n · ${c.name}`);
      await setStub(c.stub);
      await setLogin(m, c.user);
      if (c.localStorage) {
        for (const [k, v] of Object.entries(c.localStorage)) {
          await js(m, `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`);
        }
      } else {
        await js(m, `localStorage.removeItem('sqw_admin_token');`);
      }
      await untilRendered(m, c.url).catch(() => {});
      await L.sleep(250);

      const got = await htmlOf(m, 'mc-content');
      const want = await legacy.renderLegacy(c.legacy);
      // ★ §5.4（用户 2026-10-17）有意删掉了详细页页尾的「编辑此命盘 / 删除此命盘」，
      //   而老快照里当然还有。这里只在**这一处**把老实现的页尾容器剪掉再逐字节比，
      //   别的字节一个都不放过 —— 不许调成「允许差异数」那种糊弄法。
      if (c.legacy.trimDetailActions) {
        //   `.detail-actions` 里只有 <a> 与 <button>，没有嵌套 div —— 用最短匹配即可。
        want.html = want.html.replace(/<div class="detail-actions">[\s\S]*?<\/div>/, '');
      }
      // 老那份也要过一遍浏览器解析（见 roundTrip 的注释），否则名字里带 `"` 那几条会假红
      okHtml(`#mc-content 逐字节相同 · ${c.name}`, got, await roundTrip(m, want.html));

      // 后台那次：顺带确认 admin 端点真被打了，且带上了 Bearer
      if (c.legacy.adminChart) {
        const calls = await capturedCalls();
        const a = calls.find((x) => x.url === '/api/admin/chart-detail/c1');
        ok('  后台详情走的是 /api/admin/chart-detail/<id>，且带 Bearer admin-tok',
          !!a && a.auth === 'Bearer admin-tok', JSON.stringify(a));
      }
      if (c.shot) await L.shot(m, path.join(SHOT_DIR, c.shot));
    }

    // ── 4.2 详情取不到时的退路（写的是 #baziChart / #baziAi / #baziRest）──
    console.log('\n【B】排盘失败 → 退路，且必须清空 #baziAi / #baziRest');
    await setStub({ chart: CHART_A, paipan: 'fail' });
    await setLogin(m, 'alice');
    await js(m, `localStorage.removeItem('sqw_admin_token');`);
    await untilRendered(m, '/my-charts/?id=c1');
    await L.until(m,
      `${W} var el=document.getElementById('baziChart'); return !!el && el.innerHTML.indexOf('排盘没能取到')>=0;`,
      (v) => v === true, 15000);
    await L.sleep(200);

    const fbLegacy = await legacy.renderLegacy({
      search: '?id=c1', isLoggedIn: true,
      store: { get: async () => CHART_A },
      paipanFail: { status: 500, error: '排盘失败（500）' },
    });
    okHtml('#baziChart 逐字节相同', await htmlOf(m, 'baziChart'), await roundTrip(m, fbLegacy.els.baziChart));
    okHtml('#baziAi 被清空', await htmlOf(m, 'baziAi'), await roundTrip(m, fbLegacy.els.baziAi));
    okHtml('#baziRest 被清空', await htmlOf(m, 'baziRest'), await roundTrip(m, fbLegacy.els.baziRest));
    await L.shot(m, path.join(SHOT_DIR, '02-退路.png'));

    // ── 4.3 列表页的交互 ────────────────────────────────────
    console.log('\n【C】列表页交互');
    await setStub({ charts: [CHART_A, CHART_B, CHART_C] });
    await setLogin(m, 'alice');
    await untilRendered(m, '/my-charts/');

    // 底部导航
    // ⚠ 只在 `onclick` **属性**上比对是错的：老页写的是内联 `onclick="location.href='…'"`
    //   （属性上看得见字符串），React 版是 `onClick={…}`（属性上没有、挂在内部 handler 上）。
    //   两者对用户等价，所以这里改成**真点**：点完看地址栏落哪。
    //   ——与 ai-chat 那次 `handleBack` 的教训同一条：不要在驱动里依赖实现细节。
    const nav = await js(m, `${W}
      var bs=[].slice.call(document.querySelectorAll('.mc-bottom-nav .mc-nav-item'));
      return bs.map(function(b){return {text:b.textContent, active:b.classList.contains('active')};});`);
    ok('底部导航三个按钮文案对', JSON.stringify(nav.map((x) => x.text)) === JSON.stringify(['命理与术数', '我的命盘', '我的']),
      JSON.stringify(nav));
    ok('中间那个是 active', nav[1] && nav[1].active === true, JSON.stringify(nav));

    await js(m, `${W} document.querySelectorAll('.mc-bottom-nav .mc-nav-item')[0].click(); return true;`);
    await L.until(m, `${W} return location.pathname;`, (v) => v === '/', 8000).catch(() => {});
    ok('点「命理与术数」→ 落在 /', (await js(m, `${W} return location.pathname;`)) === '/');

    await untilRendered(m, '/my-charts/');
    await js(m, `${W} document.querySelectorAll('.mc-bottom-nav .mc-nav-item')[2].click(); return true;`);
    await L.until(m, `${W} return location.pathname;`, (v) => v === '/my/', 8000).catch(() => {});
    ok('点「我的」→ 落在 /my/', (await js(m, `${W} return location.pathname;`)) === '/my/');

    await untilRendered(m, '/my-charts/');

    // ⋯ 菜单
    // ⚠ 用 c3（名字是空串）。c1 的名字含 `"`、c2 的名字含 `'` —— 老实现的 `esc()` 走
    //   `textContent → innerHTML`，按浏览器规则**不转义引号**，于是那两条的
    //   `onclick="…toggleMenu('c2','李四's 盘 🀄')"` 在源码里就是**畸形属性**，
    //   浏览器解析后内联处理器的最后一段成了 `toggleMenu('c2','李四` + 半个字符串 → 点击抛语法错。
    //   ★ 这是老实现自带的潜伏 bug（新实现逐字照搬、行为一致），不是本次搬运引入的；
    //     本轮只如实记录，不改（改它要动 esc 的转义规则，属产品决定）。
    await js(m, `${W} document.querySelector('#card-c3 .card-arrow').click(); return true;`);
    await L.sleep(200);
    const menu = await js(m, `${W}
      var p=document.getElementById('card-menu');
      if(!p) return null;
      return { id:p.id, chartId:p.dataset.chartId, items:[].slice.call(p.querySelectorAll('.menu-item')).map(function(b){return b.textContent;}) };`);
    // §5.4（用户 2026-10-17）：菜单项前的 🗑 去掉了，其余两项与文案不变。
    ok('⋯ 弹出卡片菜单，挂在 c3 上，两项（编辑/删除，删除项不再带 🗑）',
      !!menu && menu.chartId === 'c3' && menu.items.length === 2
      && menu.items[0] === '编辑命盘' && menu.items[1] === '删除命盘', JSON.stringify(menu));
    await L.shot(m, path.join(SHOT_DIR, '03-卡片菜单.png'));
    // ⚠ 裸写 `closeMenu()` 会 ReferenceError：`js()` 跑在 marionette 沙箱里（Xray 视角），
    //   看不见页面挂在 window 上的名字，必须走 `W.`（drive_lib.js:340-345 写明了这条）。
    await js(m, `${W} W.closeMenu(); return true;`);
    ok('点空白（overlay）后菜单收起', (await js(m, `${W} return !!document.getElementById('card-menu');`)) === false);

    // 删除
    // `doDelete` 第一句就是 `confirm(...)`，而 confirm 是**阻塞**的模态框 —— 不换掉就
    // 把 marionette 会话挂死。换成记录器，并顺手断言那条文案与老实现逐字相同。
    await setStub({ charts: [CHART_A, CHART_B, CHART_C] });
    await untilRendered(m, '/my-charts/');
    await L.until(m, `${W} return document.querySelector('#card-c1 .card-arrow') ? true : false;`, (v) => v === true, 8000);
    await js(m, `${W}
      W.__confirms = [];
      var rc = function (msg) { W.__confirms.push(String(msg)); return true; };
      W.confirm = rc;
      try { window.confirm = rc; } catch (e) {}
      return true;`);
    // c1 那条 ⋯ 是畸形的（名字含 `"`）——正因如此这里**不能**点它，直接调全局函数验删除链路
    await js(m, `${W} W.doDelete('c1'); return true;`);
    const confirms = await js(m, `${W} return (W.__confirms||[]).slice();`);
    ok('删除前弹的确认文案与老实现逐字相同',
      confirms.length === 1 && confirms[0] === '确定删除这个命盘吗？删除后不可恢复 (｡•́︿•̀｡)', JSON.stringify(confirms));

    // 删除成功后老实现是 `location.href='/my-charts/'` —— 地址没变，所以判据不能只看
    // `location.pathname`（它在点下去之前就已经是 /my-charts/ 了）。真正能证明「跳回去了」
    // 的是：服务端**又**收到一次列表请求（说明文档重新加载了一遍）。
    const sawCalls = async () => (await capturedCalls()).map((x) => x.method + ' ' + x.url);
    let calls = [];
    for (let i = 0; i < 40; i++) {
      calls = await capturedCalls();
      if (calls.some((x) => x.method === 'DELETE') && calls.filter((x) => x.url === '/api/charts').length >= 2) break;
      await L.sleep(250);
    }
    const del = calls.find((x) => x.method === 'DELETE');
    ok('删除走 DELETE /api/charts/c1', !!del && del.url === '/api/charts/c1', JSON.stringify(await sawCalls()));
    ok('删除后回到 /my-charts/（页面重新加载、又拉了一次列表）',
      (await js(m, `${W} return location.pathname;`)) === '/my-charts/'
      && calls.filter((x) => x.url === '/api/charts').length >= 2,
      JSON.stringify(await sawCalls()));

    // ⚠ 这一张必须在【D】之前拍：那一段会把页面导到 /my/ 去，拍下来就不是本页了
    await L.shot(m, path.join(SHOT_DIR, '04-列表.png'));
    const d = await L.diagnostics(m);
    ok('没有 alert 弹窗', d.alerts.length === 0, JSON.stringify(d.alerts));

    // ── 4.4 其它老页面没被带坏 ──────────────────────────────
    console.log('\n【D】抽查别的页面无未捕获错误');
    for (const p of ['/', '/mhys/', '/liuyao/', '/ai-chat/', '/my/']) {
      await L.goto(m, `${ORIGIN}${p}`);
      await L.sleep(700);
      const errs = await js(m, `${W} return (window.__errs||[]).slice(0,3);`).catch(() => []);
      ok(`${p} 无未捕获错误`, !errs || errs.length === 0, JSON.stringify(errs));
    }

    // ── 4.5 CSS 层叠顺序（本页的「外观」有一半是这个顺序决定的）──
    // 老页 `src/web/my-charts/index.html:10-18` 的链接顺序是**有意的**：
    //   mhys_result → charts → page-my-charts → tokens
    // 四份文件里有 5 个选择器是真重叠的（html / body / * / *::before / *::after），
    // 顺序一变，底色与正文色就可能翻。Vite 把 @import 按序内联成**一个** CSS 文件，
    // 所以顺序只能在打包产物里量：拿四个「只属于各文件」的记号量字节偏移。
    console.log('\n【E】打包后的 CSS 层叠顺序与老页一致');
    const assetDir = path.join(WEB, 'assets');
    const cssFiles = fs.readdirSync(assetDir).filter((f) => /^my-charts-.*\.css$/.test(f));
    ok('产物里有 my-charts 的 CSS chunk', cssFiles.length === 1, JSON.stringify(cssFiles));
    if (cssFiles.length === 1) {
      const css = fs.readFileSync(path.join(assetDir, cssFiles[0]), 'utf8');
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');   // 去注释，免得记号来自注释
      const marks = [
        ['mhys_result.css', '.mh-wrapper'],
        ['charts.css', '.charts-wrapper'],
        ['page-my-charts.css', '.mc-page'],
        ['tokens.css', '--text-dim:'],
      ];
      const at = marks.map(([f, mk]) => [f, stripped.indexOf(mk)]);
      const missing = at.filter(([, i]) => i < 0);
      ok('四份 CSS 的记号都在打包产物里', missing.length === 0, JSON.stringify(missing));
      if (!missing.length) {
        const increasing = at.every(([, i], k) => k === 0 || i > at[k - 1][1]);
        ok(`顺序是 ${marks.map(([f]) => f).join(' → ')}`, increasing,
          at.map(([f, i]) => `${f} @${i}`).join('  '));
      }
    }

    // ── 4.6 `trueSolarTextOf` ──────────────────────────────
    // 这个纯函数的输出只从 `meta` 里看得见（它不进骨架），所以前面那几屏都比不到它。
    // 取法：老侧从 `BaziRender.render` 的实参里扣（legacy_my_charts.js 的 calls 捕获），
    // 新侧直接调 `myChartsView.trueSolarTextOf`。
    console.log('\n【F】trueSolarTextOf（真太阳时，显示用的一行字）');
    const view = await import(require('url').pathToFileURL(
      path.join(ROOT, 'src', 'app', 'lib', 'myChartsView.js')).href);
    globalThis.document = legacy.makeDom().document;   // 它同模块里的 esc() 要用

    const tzCases = [
      CHART_A,                                                              // 都匀 116.4 / 14:30
      { ...CHART_A, longitude: 87.6 },                                      // 乌鲁木齐，负偏移
      { ...CHART_A, longitude: 120 },                                       // 整点经线
      { ...CHART_A, birth: { ...CHART_A.birth, hour: 0, minute: 0 } },      // 跨零点边界
      { ...CHART_A, birth: { ...CHART_A.birth, hour: 23, minute: 59 } },    // 跨日边界
      { ...CHART_A, birth: { year: 2001, month: 12, day: 31, hour: 6 } },   // 年末（EoT 表尾）
      { ...CHART_A, birth: { year: 1990, month: 1, day: 1, hour: 6 } },     // 年初（EoT 表头）
      { ...CHART_A, longitude: undefined },                                 // 没经度 → 不该算
      { ...CHART_A, trueSolarTime: false },                                 // 开关关着 → 不该算
    ];
    for (let i = 0; i < tzCases.length; i++) {
      const c = tzCases[i];
      const r = await legacy.renderLegacy({
        search: '?id=x', isLoggedIn: true, store: { get: async () => c },
        paipan: { chart: { year_pillar: { tiangan: '庚' } }, display: { shengxiao: '马' } },
      });
      const want = r.calls.baziRender[0].meta.trueSolarText;
      const got = (c.trueSolarTime === false || c.longitude == null) ? '' : view.trueSolarTextOf(c);
      ok(`用例 ${i + 1}（lon=${c.longitude} ${String(c.birth.hour).padStart(2, '0')}:${String(c.birth.minute || 0).padStart(2, '0')}）→ ${JSON.stringify(want)}`,
        got === want, `实得 ${JSON.stringify(got)}`);
    }

    // 顺带：排盘真回来时，生肖 emoji 要被服务端给的 `display.shengxiao` 顶掉
    console.log('\n · 排盘回来 → 生肖用服务端的 display.shengxiao 顶掉本地表的猜测');
    await setStub({ chart: CHART_C, paipan: { chart: { year_pillar: { tiangan: '辛' } }, display: { shengxiao: '蛇' } } });
    await setLogin(m, 'alice');
    await untilRendered(m, '/my-charts/?id=c3');
    // 骨架一写出来 `untilRendered` 就返回了，排盘那次 fetch 可能还没回来 —— 等生肖真被顶掉
    await L.until(m,
      `${W} var el=document.getElementById('baziZodiac'); return !!el && el.textContent!=='🐵';`,
      (v) => v === true, 12000).catch(() => {});
    const liveZodiac = await js(m, `${W} var el=document.getElementById('baziZodiac'); return el?el.textContent:null;`);
    // CHART_C 是 1920 年 → 本地表算出来是 🐵，服务端说「蛇」→ 必须是 🐍
    ok('生肖被服务端顶成 🐍（不是本地表按 1920 猜的 🐵）', liveZodiac === '🐍', JSON.stringify(liveZodiac));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    server.close();
  }

  console.log(`\n═══ 汇总：${pass} 项通过 / ${fail} 项失败 ═══`);
  if (fail) { console.log('失败项：\n  ' + failures.join('\n  ')); process.exit(1); }
  console.log('全绿。');
  // ★ 同 drive_mhys_twice.js：成功这支也要显式退，否则 marionette 连接会让
  //   事件循环不空、进程继续占着 :8894，下一轮（比如变异套件）起不来。
  process.exit(0);
}

main().catch((e) => { console.error('\n✗ 环境问题（不是「通过」）：', e && e.stack || e); process.exit(2); });

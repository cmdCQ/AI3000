/**
 * 驱页 · 「我的」页（`/my/`）端到端验收
 * ==========================================================================
 *
 * 阶段 3 第 8 页。逻辑（`src/app/my/my.logic.js`）逐字搬自
 * `src/web/js/page-my.js`（冻结快照 `duipan/legacy_ref/page-my.js`），
 * 差分对拍在 `duipan/diff_my_functions.mjs` 里单独跑；本脚本管的是**差分看不见的那半边**：
 * 真 DOM、真 cookies、真 `openAuthModal`。
 *
 * 为什么这一页非要有驱页（差分再好也代替不了）：
 *
 *  ① **有两颗按钮在老页上是死的**。老 `/my/index.html` 没引 `auth.js`，而
 *     `page-my.js` 的游客态卡片里写着
 *         onclick="openAuthModal('login')"  /  ('register')
 *     而 `openAuthModal` 只在 `src/web/js/auth.js:183` 定义、`:206` 挂到 window。
 *     → 点下去**没有任何反应**，不抛错、不白屏，控制台只有一行
 *       `openAuthModal is not defined`。这正是 mhys / liuyao 反复踩过的同一类坑
 *       （`duipan/drive_liuyao_page.js` 的 ⑥bis 就是为它加的）。
 *     新页把 `auth.js` 引回来了 —— 这份修复只有在真浏览器里点一次才算验过。
 *
 *  ② **`loadMain()` 跑在 `flushSync` 之后**。骨架没进 DOM 就 `getElementById('myContent')`
 *     拿 null，然后 `el.innerHTML=` 抛 TypeError、整页白屏。差分看不见这一点。
 *
 *  ③ **`Math.min(100, used/limit*100)` 与 `toFixed(1)`**：进度条宽度是行内 style 里的
 *     一个百分数串。它在 DOM 里是什么样（`width:37.5%` 还是 `width:37.50%`），
 *     只有渲染出来才知道。
 *
 * 依赖：firefox（无头）。站点与浏览器那套在 `duipan/drive_lib.js` 里。
 *
 * ⚠ 端口错开**不代表能并行**：`drive_lib.launchFirefox()` 上来就杀全机的无头 Firefox
 *   （snap 版不认 `-profile`，只能共用同一个真 profile）。**同一时刻全机只能有一个驱页在跑。**
 *
 * 用法：node duipan/drive_my_page.js
 *       DRIVE_ROOT=/tmp/my-probe node duipan/drive_my_page.js   # 测暂存产物
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题（测不出来，不是通过）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
// 默认测线上那一份（`build/nginx`）。测暂存产物用 DRIVE_ROOT。
const WEB = process.env.DRIVE_ROOT || path.join(ROOT, 'build', 'nginx');

// 端口错开另六份驱动（2026-10-17 逐个 grep 过，别凭注释猜）：
//   mhys-page 8892/2828  mhys-twice 8901/2831  liuyao 8898/2829
//   bazi 8897/2830       ai-chat 8893/2832     my-charts 8894/2833
// 这里用没人碰的 8895/2834。错开只为防残留，**不为并行**（见头注释）。
const PORT = Number(process.env.DRIVE_PORT || 8895);
const MARIONETTE_PORT = Number(process.env.DRIVE_MARIONETTE_PORT || 2834);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SHOT_DIR = '/tmp/my-drive';

// ─────────────────────────────────────────────────────────────
// 1. 桩服务器
//
// 本页只打一个端点：`GET /api/user/tokens`（`loadTokenUsage`）。
// `stub.tokens` 的四种形态就是四条判据：
//   · 省略          → 返回 `{}`（缺 tokenUsed）→ 页面走「加载失败」分支
//   · `{status:500}`→ HTTP 500                     → 同上
//   · `{...}`       → 正常数据                     → 渲染用量卡片
//   · `{tokenLimit:null}` → 无限额度               → ∞ / （无限）/ 无「剩余」行
// ─────────────────────────────────────────────────────────────
let stub = {};
let captured = [];

async function api(req, res, pathname) {
  const raw = await L.readBody(req);

  if (pathname === '/__stub' && req.method === 'POST') {
    stub = raw || {};
    captured = [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__captured') return L.sendJson(res, captured), true;

  if (pathname === '/api/user/tokens' && req.method === 'GET') {
    captured.push({ url: pathname, method: 'GET', auth: req.headers.authorization || null });
    if (stub.tokens && stub.tokens.status && stub.tokens.status !== 200) {
      res.writeHead(stub.tokens.status, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'x' })), true;
    }
    return L.sendJson(res, stub.tokens || {}), true;
  }

  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

function startServer() { return L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api }); }
function launchFirefox() { return L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'my-prof' }); }

const js = L.js;
// ⚠ 裸写页面上的名字会 ReferenceError：`js()` 跑在 marionette 沙箱里（Xray 视角），
//   看不见页面挂在 window 上的名字，必须走 `W.`（`drive_lib.js:340-345` 写明了这条）。
const W = L.W;

// ─────────────────────────────────────────────────────────────
// 2. 断言小工具
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

async function setStub(obj) {
  await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify(obj) });
}
async function capturedCalls() {
  const r = await fetch(`${ORIGIN}/__captured`);
  return r.json();
}

/** 置登录态。老页的 `getUser()` 读 `sqw_username`、`getToken()` 读 `sqw_token`。 */
async function setLogin(m, user) {
  await L.goto(m, `${ORIGIN}/`);
  await js(m, `document.cookie = 'sqw_username=${user || ''}; path=/; max-age=' + (${user ? 86400 : 0});`);
  await js(m, `document.cookie = 'sqw_token=${user ? 'stub-token-abc' : ''}; path=/; max-age=' + (${user ? 86400 : 0});`);
}

/**
 * 打开这一页并等 `#myContent` 从「加载中…」变成终态。
 *
 * ⚠ 判据是「已不在加载中」，不是「有内容」：三种终态里有一种（加载失败）也没有
 *   「内容」，只等「有子节点」会在失败分支上永远等不到。
 */
async function untilRendered(m) {
  await L.goto(m, `${ORIGIN}/my/`);
  await L.until(m,
    `${W} var el=document.getElementById('myContent'); return !!el && el.innerHTML.indexOf('加载中')<0;`,
    (v) => v === true, 15000);
}

/**
 * 收弹窗。`W.hideAuthModal` 是 `src/web/js/auth.js:228` 挂的 —— **老页没有 auth.js**，
 * 所以老页上它不存在，直接调会把整轮测成「环境问题」（实测：TypeError
 * `W.hideAuthModal is not a function` → 退出码 2，后面的 C~I 一节都跑不到）。
 * 兜底直接改 overlay 的两个状态位，效果与 hideAuthModal 的正文一致。
 */
async function closeModal(m) {
  await js(m, `${W}
    if (typeof W.hideAuthModal === 'function') { W.hideAuthModal(); }
    else {
      var o = document.getElementById('authModalOverlay');
      if (o) { o.classList.remove('open'); o.hidden = true; }
      document.body.style.overflow = '';
    }
    return true;`);
}

async function htmlOf(m, sel) {
  return js(m, `${W} var el=document.querySelector('${sel}'); return el ? el.innerHTML : null;`);
}
async function textOf(m, sel) {
  return js(m, `${W} var el=document.querySelector('${sel}'); return el ? el.textContent : null;`);
}

/** `#myContent` 里那段由 `loadMain` 拼出来的牌子——比字符串，不比 DOM 树。 */
async function cards(m) {
  return js(m, `${W}
    var el = document.getElementById('myContent');
    if (!el) return null;
    return Array.prototype.map.call(el.children, function (c) {
      return { cls: c.className, text: c.textContent.replace(/\\s+/g, ' ').trim() };
    });`);
}

// ─────────────────────────────────────────────────────────────
// 3. 用例
// ─────────────────────────────────────────────────────────────
async function main() {
  const server = await startServer();
  const { child, m } = await launchFirefox();
  try {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await L.setWindow(m, 500, 900);

    // ── A. 游客态 ────────────────────────────────────────────
    console.log('\n【A】游客态：引导卡 + 两颗按钮（老页上这两颗是死的）');
    await setStub({});
    await setLogin(m, null);
    await untilRendered(m);

    const guest = await js(m, `${W}
      var g = document.querySelector('.my-guest');
      if (!g) return null;
      return {
        icon: (g.querySelector('.guest-icon') || {}).textContent || null,
        title: (g.querySelector('.guest-title') || {}).textContent || null,
        desc: (g.querySelector('.guest-desc') || {}).textContent || null,
        btns: Array.prototype.map.call(g.querySelectorAll('.guest-btn'), function (b) {
          return { text: b.textContent, cls: b.className, onclick: b.getAttribute('onclick') };
        }),
      };`);
    ok('游客态渲染出 .my-guest', !!guest, JSON.stringify(guest));
    ok('图标是 👤', guest && guest.icon === '👤', JSON.stringify(guest && guest.icon));
    ok('标题「登录账号」', guest && guest.title === '登录账号', JSON.stringify(guest && guest.title));
    ok('副标题「登录后使用全部功能」', guest && guest.desc === '登录后使用全部功能', JSON.stringify(guest && guest.desc));
    ok('两颗按钮，文案与 class 都对',
      guest && JSON.stringify(guest.btns.map((b) => [b.text, b.cls])) ===
        JSON.stringify([['去登录', 'guest-btn primary'], ['注册', 'guest-btn secondary']]),
      JSON.stringify(guest && guest.btns));
    ok('按钮的行内 onclick 逐字保留（openAuthModal 的两条）',
      guest && JSON.stringify(guest.btns.map((b) => b.onclick)) ===
        JSON.stringify(["openAuthModal('login')", "openAuthModal('register')"]),
      JSON.stringify(guest && guest.btns.map((b) => b.onclick)));
    ok('游客态不打 /api/user/tokens（没 token，loadTokenUsage 第一句就返回）',
      (await capturedCalls()).length === 0, JSON.stringify(await capturedCalls()));
    await L.shot(m, path.join(SHOT_DIR, '01-游客态.png'));

    // ── B. ★ 那两颗死按钮现在能开弹窗了 ────────────────────
    // `openAuthModal` 是异步的（`_ensureAuthModalCSS().then(...)`），所以必须 until，
    // 不能点完立刻读 —— 读早了会看到 hidden 还在。
    console.log('\n【B】★ 点「去登录」/「注册」真能开弹窗（老页上点了没反应）');
    ok('装载期没有任何未捕获错误',
      (await js(m, `${W} return (window.__errs || []).slice(0, 3);`)).length === 0,
      JSON.stringify(await js(m, `${W} return (window.__errs || []).slice(0, 3);`)));

    async function clickGuestBtn(i) {
      await js(m, `${W} document.querySelectorAll('.my-guest .guest-btn')[${i}].click(); return true;`);
      await L.until(m,
        `${W} var o=document.getElementById('authModalOverlay'); return !!o && o.hidden === false;`,
        (v) => v === true, 8000).catch(() => {});
      return js(m, `${W}
        var o = document.getElementById('authModalOverlay');
        if (!o) return null;
        var tabOf = function (id) {
          var el = document.getElementById(id);
          return el ? getComputedStyle(el).display !== 'none' : null;
        };
        return { present: true, hidden: o.hidden, open: o.classList.contains('open'),
                 login: tabOf('authModalLogin'), register: tabOf('authModalRegister'),
                 sub: (document.getElementById('authModalSub') || {}).textContent || null };`);
    }

    const loginModal = await clickGuestBtn(0);
    ok('点「去登录」→ #authModalOverlay 出现', !!loginModal && loginModal.present === true,
      JSON.stringify(loginModal));
    ok('  不再 hidden、且带上 .open', !!loginModal && loginModal.hidden === false && loginModal.open === true,
      JSON.stringify(loginModal));
    ok('  落在登录 tab（#authModalLogin 可见、#authModalRegister 隐藏）',
      !!loginModal && loginModal.login === true && loginModal.register === false,
      JSON.stringify(loginModal));
    ok('  副标题是登录那一句「登录以使用 AI 命理解读」',
      !!loginModal && loginModal.sub === '登录以使用 AI 命理解读', JSON.stringify(loginModal && loginModal.sub));

    // ★ 「节点在、hidden=false、带 .open」**不等于「用户看得见」**。
    //   弹窗样式是 auth.js 运行时插 `<link href="/css/auth-modal.css">` 进来的
    //   （`auth.js:78`），CSS 没到位时上面那几条全绿、屏幕上却什么都没有。
    //   所以再断一次「它真的被画出来了」：铺满视口、有遮罩底色、命中点是它自己。
    // ⚠ overlay 有淡入 transition（实测刚打开那一刻 opacity≈0.88），所以先等它走完
    //   再读 —— 直接读会拿到中间值，然后断言 opacity==='1' 假红（本脚本踩过一次）。
    await L.until(m,
      `${W} var o=document.getElementById('authModalOverlay'); return o ? parseFloat(getComputedStyle(o).opacity) : 0;`,
      (v) => typeof v === 'number' && v >= 0.999, 5000).catch(() => {});
    const painted = await js(m, `${W}
      var o = document.getElementById('authModalOverlay');
      if (!o) return null;
      var cs = getComputedStyle(o), r = o.getBoundingClientRect();
      var el = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
      var link = document.querySelector('link[data-auth-modal-css]');
      return {
        display: cs.display, opacity: cs.opacity, visibility: cs.visibility, position: cs.position,
        zIndex: cs.zIndex, bg: cs.backgroundColor,
        coversViewport: r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1,
        hitInside: !!(el && o.contains(el)),
        cssHref: link ? link.getAttribute('href') : null,
        cssLoaded: link ? link.dataset.loaded === '1' && !!link.sheet : false,
      };`);
    ok('  ★ 弹窗真的画出来了：铺满视口 + 有遮罩底色 + 视口中心的命中点在它里面',
      !!painted && painted.coversViewport === true && painted.hitInside === true &&
        painted.position === 'fixed' && painted.display !== 'none' &&
        painted.opacity === '1' && painted.visibility === 'visible' &&
        /^rgba\(0, 0, 0, 0\./.test(painted.bg || ''),
      JSON.stringify(painted));
    ok('  弹窗 CSS 是运行时插进来的 /css/auth-modal.css，且 sheet 真的加载成功',
      !!painted && painted.cssHref === '/css/auth-modal.css' && painted.cssLoaded === true,
      JSON.stringify(painted));
    await L.shot(m, path.join(SHOT_DIR, '02-登录弹窗.png'));

    // 关掉再点注册
    await closeModal(m);
    const regModal = await clickGuestBtn(1);
    ok('点「注册」→ 弹窗落在注册 tab（#authModalRegister 可见）',
      !!regModal && regModal.hidden === false && regModal.register === true && regModal.login === false,
      JSON.stringify(regModal));
    await L.shot(m, path.join(SHOT_DIR, '03-注册弹窗.png'));
    await closeModal(m);
    ok('关掉弹窗后 overlay 回到 hidden',
      (await js(m, `${W} var o=document.getElementById('authModalOverlay'); return o ? o.hidden : 'gone';`)) === true);

    // ── C. 登录态：用量卡片 ──────────────────────────────────
    console.log('\n【C】登录态：用户名 / 等级 / 用量 / 进度条 / 剩余次数');
    // tokenUsed=15000, tokenLimit=40000 → 37.5%，剩 floor(25000/1500)=16 次
    await setStub({ tokens: { tokenUsed: 15000, tokenLimit: 40000, tier: 1 } });
    await setLogin(m, 'alice');
    await untilRendered(m);

    const c1 = await cards(m);
    ok('渲染出一张账户卡 + 一张设置卡', c1 && c1.length === 2, JSON.stringify(c1));
    ok('账户卡带 .my-card', c1 && c1[0].cls.indexOf('my-card') === 0, JSON.stringify(c1 && c1[0]));
    ok('用户名显示成 alice', c1 && c1[0].text.indexOf('alice') >= 0, JSON.stringify(c1 && c1[0].text));
    ok('tier=1 → 徽章「普通会员」', c1 && c1[0].text.indexOf('普通会员') >= 0, JSON.stringify(c1 && c1[0].text));
    ok('用量 15,000 / 40,000（千分位都带了）',
      c1 && c1[0].text.indexOf('15,000') >= 0 && c1[0].text.indexOf('40,000') >= 0,
      JSON.stringify(c1 && c1[0].text));
    ok('百分比 37.5%', c1 && c1[0].text.indexOf('37.5%') >= 0, JSON.stringify(c1 && c1[0].text));
    ok('剩余次数 floor((40000-15000)/1500)=16 → 「还剩约 16 次」',
      c1 && c1[0].text.indexOf('剩余AI解析次数还剩约 16 次') >= 0, JSON.stringify(c1 && c1[0].text));
    ok('有限额度时写「Token 用量」（不是「（无限）」）',
      c1 && c1[0].text.indexOf('Token 用量') >= 0 && c1[0].text.indexOf('（无限）') < 0,
      JSON.stringify(c1 && c1[0].text));

    const bar = await js(m, `${W}
      var el = document.querySelector('#myContent .my-card div[style*="width:37.5%"]');
      return el ? el.getAttribute('style') : null;`);
    ok('进度条宽度就是 37.5%（行内 style，差分看不见）', !!bar && bar.indexOf('width:37.5%') >= 0,
      JSON.stringify(bar));

    const calls = await capturedCalls();
    ok('打的是 GET /api/user/tokens，带 Bearer stub-token-abc',
      calls.length === 1 && calls[0].url === '/api/user/tokens' &&
        calls[0].method === 'GET' && calls[0].auth === 'Bearer stub-token-abc',
      JSON.stringify(calls));
    await L.shot(m, path.join(SHOT_DIR, '04-登录态.png'));

    // ── D. tier 徽章三档 + 无限额度 ────────────────────────
    console.log('\n【D】等级徽章三档 + tokenLimit=null（无限）');
    for (const [tier, want] of [[0, '普通用户'], [1, '普通会员'], [2, 'SVIP']]) {
      await setStub({ tokens: { tokenUsed: 100, tokenLimit: 40000, tier } });
      await untilRendered(m);
      const t = (await cards(m))[0].text;
      ok(`tier=${tier} → 徽章「${want}」`, t.indexOf(want) >= 0, JSON.stringify(t));
    }

    // 无限额度：limitText='无限'、pct 恒 100、不出现「剩余…次」那一行
    await setStub({ tokens: { tokenUsed: 12345, tokenLimit: null, tier: 2 } });
    await untilRendered(m);
    const inf = (await cards(m))[0].text;
    ok('tokenLimit=null → 「无限」', inf.indexOf('无限') >= 0, JSON.stringify(inf));
    ok('  百分比位显示 ∞', inf.indexOf('∞') >= 0, JSON.stringify(inf));
    ok('  额度标签写「（无限）」而不是「Token 用量」', inf.indexOf('（无限）') >= 0, JSON.stringify(inf));
    ok('  不出现「剩余AI解析次数」那一行（remainCount 为 null）',
      inf.indexOf('剩余AI解析次数') < 0, JSON.stringify(inf));
    const infBar = await js(m, `${W}
      var el = document.querySelector('#myContent .my-card div[style*="width:100%"]');
      return el ? el.getAttribute('style') : null;`);
    ok('  进度条恒 100%（barColor 也换成 #d4c9b0）',
      !!infBar && infBar.indexOf('width:100%') >= 0 && infBar.indexOf('#d4c9b0') >= 0,
      JSON.stringify(infBar));
    await L.shot(m, path.join(SHOT_DIR, '05-无限额度.png'));

    // ── E. 拉取失败：兜底卡片 ──────────────────────────────
    console.log('\n【E】拿不到用量 → 「加载失败」兜底卡，设置卡还在');
    for (const [label, s] of [
      ['HTTP 500', { tokens: { status: 500 } }],
      ['响应缺 tokenUsed（返回 {}）', { tokens: {} }],
    ]) {
      await setStub(s);
      await untilRendered(m);
      const cc = await cards(m);
      ok(`${label} → 兜底卡里有「加载失败」`, cc && cc.length === 2 && cc[0].text.indexOf('加载失败') >= 0,
        JSON.stringify(cc));
      ok(`  ${label} → 用户名仍然显示（失败不影响标题）`,
        cc && cc[0].text.indexOf('alice') >= 0, JSON.stringify(cc && cc[0].text));
      ok(`  ${label} → 设置卡仍在（第 2 张，可点）`,
        cc && cc.length === 2 && cc[1].text.indexOf('设置') >= 0, JSON.stringify(cc && cc[1]));
    }

    // ── F. 设置页 + 退出登录 ───────────────────────────────
    console.log('\n【F】设置页：返回链接 / 退出账号 / 确认后真清 cookie');
    await setStub({ tokens: { tokenUsed: 1, tokenLimit: 40000, tier: 0 } });
    await untilRendered(m);
    await js(m, `${W} document.querySelectorAll('#myContent .my-card')[1].click(); return true;`);
    await L.until(m, `${W} return !!document.querySelector('.my-back-link');`, (v) => v === true, 8000);

    const settings = await js(m, `${W}
      var back = document.querySelector('.my-back-link');
      var danger = document.querySelector('.my-card.danger');
      return {
        back: back ? back.textContent : null,
        backOnclick: back ? back.getAttribute('onclick') : null,
        // ⚠ 只数 .my-card，不是 #myContent 的全部子节点：设置页的第一块是
        //   <a class="my-back-link">← 返回</a>，它也是 #myContent 的直接子节点。
        //   按子节点数会数出 3 块，然后断言「两张卡」假红（本脚本初版就是这么错的）。
        //   ⚠ 这段注释在**模板串里**，不能出现反引号 —— 会把串切开（踩过一次）。
        cards: Array.prototype.map.call(document.querySelectorAll('#myContent .my-card'), function (c) {
          return { cls: c.className, text: c.textContent.replace(/\\s+/g, ' ').trim() };
        }),
        danger: danger ? danger.textContent.replace(/\\s+/g, ' ').trim() : null,
      };`);
    ok('设置页有「← 返回」', settings.back === '← 返回', JSON.stringify(settings.back));
    ok('  返回链接走 window.loadMain()（行内 onclick）',
      settings.backOnclick === 'window.loadMain();return false', JSON.stringify(settings.backOnclick));
    ok('  两张卡：⚙️ 设置 / 退出账号', settings.cards.length === 2 &&
      settings.cards[0].text.indexOf('设置') >= 0 && settings.cards[1].text.indexOf('退出账号') >= 0,
      JSON.stringify(settings.cards));
    ok('  退出账号那张带 .danger', settings.cards[1].cls.indexOf('danger') >= 0,
      JSON.stringify(settings.cards[1]));
    await L.shot(m, path.join(SHOT_DIR, '06-设置页.png'));

    // 返回
    await js(m, `${W} document.querySelector('.my-back-link').click(); return true;`);
    // ⚠ 等的是「.my-back-link 消失」，不是「.my-card 出现」——设置页自己就有两张
    //   .my-card，等后者会在**还停在设置页**时立刻返回，然后拿设置页的 HTML 去断言
    //   「回到主界面了」（本脚本踩过一次：报出来的三块正是设置页那三块）。
    await L.until(m, `${W} return !document.querySelector('.my-back-link');`, (v) => v === true, 8000);
    // 真判据：返回后第一张卡是**账户卡**（有用户名 + 用量那几行），不是设置卡。
    const backCards = await cards(m);
    ok('点「← 返回」回到主界面：两张卡、第一张是账户卡（有用户名与用量）',
      backCards.length === 2 && backCards[0].text.indexOf('alice') >= 0 &&
        backCards[0].text.indexOf('AI 解析用量') >= 0,
      JSON.stringify(backCards));
    ok('  返回后不再有 .my-back-link',
      (await js(m, `${W} return !!document.querySelector('.my-back-link');`)) === false);

    // 退出：先取消
    // ⚠ `confirm` 是**阻塞**的模态框 —— 不换掉就把 marionette 会话挂死。
    await js(m, `${W}
      W.__confirms = [];
      var rc = function (msg) { W.__confirms.push(String(msg)); return false; };
      W.confirm = rc;
      try { window.confirm = rc; } catch (e) {}
      return true;`);
    await js(m, `${W} document.querySelectorAll('#myContent .my-card')[1].click(); return true;`);
    await L.until(m, `${W} return !!document.querySelector('.my-card.danger');`, (v) => v === true, 8000);
    await js(m, `${W} document.querySelector('.my-card.danger').click(); return true;`);
    const conf1 = await js(m, `${W} return (W.__confirms || []).slice();`);
    ok('退出前弹确认，文案逐字「确定退出登录吗？」',
      conf1.length === 1 && conf1[0] === '确定退出登录吗？', JSON.stringify(conf1));
    ok('  确认框点了取消 → cookie 还在', (await js(m, `return String(document.cookie);`)).indexOf('sqw_username=alice') >= 0,
      JSON.stringify(await js(m, `return String(document.cookie);`)));
    ok('  取消后没有跳转（地址仍是 /my/）',
      (await js(m, `${W} return String(location.pathname);`)) === '/my/');

    // 退出：再确认
    await js(m, `${W}
      W.__confirms = [];
      var rt = function (msg) { W.__confirms.push(String(msg)); return true; };
      W.confirm = rt;
      try { window.confirm = rt; } catch (e) {}
      return true;`);
    await js(m, `${W} document.querySelector('.my-card.danger').click(); return true;`);
    await L.until(m, `${W} return String(location.pathname);`, (v) => v === '/', 10000).catch(() => {});
    ok('确认后跳回首页 /', (await js(m, `${W} return String(location.pathname);`)) === '/',
      JSON.stringify(await js(m, `${W} return String(location.pathname);`)));
    const afterLogout = await js(m, `return String(document.cookie);`);
    ok('  两个 cookie 都被清掉（max-age=0）',
      afterLogout.indexOf('sqw_username=alice') < 0 && afterLogout.indexOf('stub-token-abc') < 0,
      JSON.stringify(afterLogout));

    // ── G. 骨架与老页一致 ──────────────────────────────────
    console.log('\n【G】骨架（老页 `src/web/my/index.html` 的静态部分）');
    await setLogin(m, 'bob');
    await setStub({ tokens: { tokenUsed: 0, tokenLimit: 40000, tier: 0 } });
    await untilRendered(m);
    const shell = await js(m, `${W}
      var h = document.querySelector('.my-header');
      var nav = Array.prototype.map.call(document.querySelectorAll('.my-bottom-nav .my-nav-item'), function (a) {
        return { text: a.textContent, active: a.classList.contains('active'), href: a.getAttribute('href') };
      });
      return {
        header: h ? h.textContent.replace(/\\s+/g, ' ').trim() : null,
        nav: nav,
        wrapper: !!document.querySelector('.my-wrapper'),
        hasRoot: !!document.getElementById('root'),
      };`);
    ok('.my-wrapper 在', shell.wrapper === true, JSON.stringify(shell));
    ok('页头「我的 易三千」', shell.header === '我的 易三千', JSON.stringify(shell.header));
    ok('底部导航三项，文案与 href 都对',
      JSON.stringify(shell.nav.map((x) => [x.text, x.href])) ===
        JSON.stringify([['命理与术数', '/'], ['我的命盘', '/my-charts/'], ['我的', null]]),
      JSON.stringify(shell.nav));
    ok('第三项（我的）是 active', shell.nav[2] && shell.nav[2].active === true, JSON.stringify(shell.nav));
    ok('第三项是 <span> 不是 <a>（老页就是 span）', shell.nav[2] && shell.nav[2].href === null,
      JSON.stringify(shell.nav[2]));
    ok('tokenUsed=0 → 0.0%', (await cards(m))[0].text.indexOf('0.0%') >= 0,
      JSON.stringify((await cards(m))[0].text));
    await L.shot(m, path.join(SHOT_DIR, '07-骨架.png'));

    // ── H. 产物里只剩余一条传统 script ────────────────────
    console.log('\n【H】产物：/my/index.html 该只剩 auth.js 一条传统 script');
    const idxHtml = fs.readFileSync(path.join(WEB, 'my', 'index.html'), 'utf8');
    // ⚠ 先剥掉 HTML 注释再 grep。本页的注释里**逐字引用**了老那行
    //   `<script src="/js/page-my.js">`（写给后来人看的），不剥就会把它当成真标签
    //   ——本脚本初版正是这么假红的：正则从注释里捞出一条「page-my.js 又回来了」。
    const noComments = idxHtml.replace(/<!--[\s\S]*?-->/g, '');
    const legacyScripts = [...noComments.matchAll(/<script\s+src="(\/js\/[^"]+)"/g)].map((x) => x[1]);
    ok('/my/index.html 的传统 script 只有 /js/auth.js',
      JSON.stringify(legacyScripts) === JSON.stringify(['/js/auth.js']), JSON.stringify(legacyScripts));
    ok('  没有把 page-my.js 再引回来', noComments.indexOf('/js/page-my.js') < 0,
      JSON.stringify(noComments.match(/.{0,60}page-my\.js.{0,40}/g)));
    ok('  没有顺手引上 lunar / hexagrams_data / ai_panel（本页不需要）',
      noComments.indexOf('/js/lunar.min.js') < 0 && noComments.indexOf('/js/hexagrams_data.js') < 0 &&
        noComments.indexOf('/js/ai_panel.js') < 0, 'found');
    // CSS chunk 名带 hash，且 `assets/` 里同时有 my-charts 的 chunk —— 所以按
    // HTML 里真正引到的那一个取，不靠 glob 猜（glob 会同时命中 my-charts-*.css）。
    const cssHref = (noComments.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"/) || [])[1];
    ok('  产物里有 my 的 CSS chunk（HTML 引到了它）', !!cssHref, JSON.stringify(cssHref));
    const cssFile = cssHref ? path.join(WEB, cssHref.replace(/^\//, '')) : null;
    ok('  那个 chunk 文件真的存在', !!cssFile && fs.existsSync(cssFile), JSON.stringify(cssFile));
    const cssText = cssFile && fs.existsSync(cssFile) ? fs.readFileSync(cssFile, 'utf8') : '';
    // page-my.css 的几个记号：.my-wrapper / .my-guest / .guest-btn / .my-bottom-nav
    const missing = ['.my-wrapper', '.my-guest', '.guest-btn', '.my-bottom-nav']
      .filter((k) => cssText.indexOf(k) < 0);
    ok('  page-my.css 的记号都在打包产物里（@import 真被展开了）', missing.length === 0, JSON.stringify(missing));

    // ── I. 无未捕获错误 ────────────────────────────────────
    console.log('\n【I】全部用例过完，没有未捕获错误');
    const errs = await js(m, `${W} return (window.__errs || []).slice(0, 5);`);
    ok('window.__errs 为空', !errs || errs.length === 0, JSON.stringify(errs));
    const d = await L.diagnostics(m);
    ok('没有 alert 弹窗', d.alerts.length === 0, JSON.stringify(d.alerts));
    ok('页面没有未捕获异常（与上面 __errs 同一份，这里再断一次累计）',
      d.errs.length === 0, JSON.stringify(d.errs));

  } finally {
    try { child.kill('SIGKILL'); } catch (e) {}
    try { server.close(); } catch (e) {}
  }

  console.log('\n' + '─'.repeat(60));
  console.log(fail === 0
    ? `✅ 全绿：${pass} 条`
    : `❌ ${fail} 条红 / 共 ${pass + fail} 条`);
  if (fail) console.log('红的是：\n  · ' + failures.join('\n  · '));
  console.log(`截图：${SHOT_DIR}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\n⚠ 环境问题（测不出来，不是通过）：');
  console.error(e && e.stack || e);
  process.exit(2);
});

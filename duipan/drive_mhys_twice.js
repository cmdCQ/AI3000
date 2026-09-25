/**
 * 驱页 · 梅花页「AI 解析用了两次」—— 复现 + 守住修好的行为
 * ==========================================================================
 *
 * 用户 2026-09-25 报：「这个 byd『看不懂？试试 ai 解析』按钮又冒出来了，在梅花界面，
 * 我用了两次之后它就冒出来了，然后原来的 ai 解析块就消失了」。
 *
 * 用真页面复现出来是**三个**独立的毛病（同一个「用了两次」串在一起）：
 *
 *  ① 表头那颗按钮原来是 toggle：面板开着时点它 = **收起**。按钮文案写的是
 *     「试试解析」（邀请），做的是把解析从眼前拿走 —— 文案与结果正好相反。
 *     它还会 `abortAIStream()`，正在跑的那次解析被真掐掉（游客那唯一一次免费机会
 *     也随之作废）。**这是用户看到的那一幕。**
 *  ② 游客关掉面板再打开 → 看到的是「免费解析次数已用完」登录引导块，不是自己
 *     刚跑出来的那份解析（`showAIHome()` 里游客门排在已存解析前面）。
 *  ③ 同页排第二次盘时 `savedAnalysis` 从不重置：AI 块里是**第一卦的解读配第二卦的盘**
 *     —— 形式正常、内容错的，用户会照着上一卦的建议去做事。点「开始解卦」也不会
 *     重跑，只会把旧的再贴一遍。（没填事项的那一卦还会把解读 PATCH 到上一卦的记录上。）
 *
 * 三处都修完之后，用户又拍板改了一次形态（当天晚些时候）：
 *   · 页头那颗按钮**删掉**（原话「我不想要这个按钮」）；
 *   · 「有卦就有 AI 块」—— 排完盘块自己出现在卦象下面，内容默认是「开始解卦」，
 *     **点了才发请求**（不许替他做决定自动开跑）；
 *   · 「收起」改成块**里面**的折叠：只折正文，表头与「展开 ▸」留着，
 *     用户原话「ai 块是必须出现的，不需要隐藏，折叠也不是让你隐藏它」。
 *
 * 本脚本把整条路走一遍，判据全部落在**用户看得见的东西**上：块在不在、在哪、
 * 里面是谁的正文、折叠之后正文还在不在。桩正文里带**卦名**，所以「这块解析是哪一卦的」
 * 可以从正文里直接读出来，不必靠时间戳猜。
 *
 * ⚠ 反向判据也在这儿，共两条：修 ② 之后必须**仍然拦得住**「游客再解一次」；以及
 *   **折叠绝不许掐流**（⑥ 专门在流跑着的时候折一下，看第二段还到不到）。
 *
 * 桩只做一件事：把 `/api/meihua/paipan` 换成固定卦号（卦由页面用 `calcGua` 拼形状，
 * 那是渲染不是取数，已由 `verify_meihua_vs_front.js` 用 64×64×6 全组合核过）。
 *
 * 用法：node duipan/drive_mhys_twice.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题
 */

'use strict';

const path = require('path');
const fs = require('fs');
const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
const PORT = 8901;
const MARIONETTE_PORT = 2831;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SHOT = '/tmp/mhys-twice';

const js = L.js;
const W = L.W;
const goto = L.goto;

// 两次排盘用**不同的卦号**，这样「AI 块里的正文是哪一卦的」一眼可辨。
const GUA_A = { upper_num: 3, lower_num: 6, moving: 5 };   // 火水未济
const GUA_B = { upper_num: 1, lower_num: 8, moving: 2 };   // 天地否

// 记录页带进来的那份解析（第 ⑦ 步用它验证「从记录点进来还能看到已存的解读」）
const RECORD_ANALYSIS = '（桩·记录里存着的旧解析）这是从记录里读回来的那一份。\n\n---\n'
  + '消耗积分：输入 100 + 输出 200 = 300 ｜ 剩余：9700';

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}
function note(msg) { console.log(`   · ${msg}`); }

// ── 桩服务 ────────────────────────────────────────────────────────
const state = { stub: null, chat: [], paipan: [], records: [] };

async function api(req, res, pathname) {
  if (pathname === '/__stub') {
    state.stub = (await L.readBody(req)).qigua || null;
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__reset') {
    state.chat = []; state.paipan = []; state.records = [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__chat') return L.sendJson(res, { chat: state.chat }), true;
  // AI 解读：分两段写，好让「边收边渲染」真的发生（与线上同形）
  if (req.method === 'POST' && pathname === '/api/chat/send') {
    const body = await L.readBody(req);
    state.chat.push(body);
    // ⚠ 桩正文里带上**卦名**：这块解析属于哪一卦，从这里读，不靠时间戳猜。
    const gua = ((body.cardData || {}).hexagrams || {}).benGua || {};
    const name = gua.name || '?';
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.write(`【一、结论】\n（桩·${name}）这一卦先说结论。\n`);
    setTimeout(() => {
      res.write(`\n【二、依据】\n（桩·${name}）再看依据。\n\n【三、建议】\n（桩·${name}）最后给建议。`);
      res.end();
    }, 120);
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/meihua/paipan') {
    const body = await L.readBody(req);
    state.paipan.push(body);
    const q = state.stub;
    L.sendJson(res, {
      paipan: { stub: true }, sizhu: null,
      qigua: { method: body.method, upper_num: q.upper_num, lower_num: q.lower_num, moving: q.moving },
      text: '(桩)',
    });
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/mhys-records') {
    const body = await L.readBody(req);
    const id = 900 + state.records.length;
    state.records.push({ id, topic: body.topic, resultData: body.resultData });
    return L.sendJson(res, { id }), true;
  }
  // 结果页按 id 取记录（result.html 读 result_data / topic / created_at / ai_analysis）
  if (req.method === 'GET' && /^\/api\/mhys-records\/\d+$/.test(pathname)) {
    const last = state.records[state.records.length - 1];
    if (!last) return L.sendJson(res, { error: '没有记录' }, 404), true;
    L.sendJson(res, {
      id: last.id, topic: last.topic, method: 'time',
      result_data: last.resultData, ai_analysis: RECORD_ANALYSIS,
      created_at: new Date().toISOString(),
    });
    return true;
  }
  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

// ── 操作原语 ──────────────────────────────────────────────────────
async function setStub(m, qigua) {
  await js(m, `${W} return fetch('/__stub', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ qigua: arguments[0] }) }).then(function(){ return true; });`, [qigua]);
}
async function setTime(m, y, mo, d, h, mi) {
  await js(m, `${W}
    W.selectedTime.year = arguments[0]; W.selectedTime.month = arguments[1];
    W.selectedTime.day = arguments[2]; W.selectedTime.hour = arguments[3];
    W.selectedTime.minute = arguments[4]; W.selectedTime.calendar = 'gregorian';
    W.updateTimeDisplay(); return true;`, [y, mo, d, h, mi]);
}
/**
 * 排一次盘，**等到这一卦真的渲染出来**再返回。
 *
 * ⚠ `expectName`（这一卦的卦名）不是可有可无的装饰：原地出结果时，上一次的结果还
 * 摆在 `#resultArea` 里，等「正文长度 > 20」会在点完按钮的那一瞬间就满足 ——
 * 于是读回来的是**上一卦**的正文，后面所有判据都跟着错（第一版就是这么骗过自己的：
 * 报「第二卦没渲染出卦名」，其实读到的是第一卦）。
 */
async function divine(m, topic, expectName, y, mo, d, h, mi) {
  await js(m, `${W}
    var el = document.querySelector('.method-option[data-method="time"]');
    if (el) W.selectMethod('time', el);
    return true;`);
  await setTime(m, y, mo, d, h, mi);
  await js(m, `document.getElementById('topicInput').value = arguments[0]; return true;`, [topic]);
  await js(m, `document.getElementById('startBtn').click(); return true;`);
  const t0 = Date.now();
  for (;;) {
    const r = await js(m, `${W}
      var a = document.getElementById('resultArea');
      return { result: a ? (a.innerText || '') : '', alerts: (W.__alerts || []).slice() };`,
    [expectName]);
    if (r.alerts.length) return r;
    if (r.result.indexOf(expectName) >= 0) return r;
    if (Date.now() - t0 > 10000) return r;
    await L.sleep(150);
  }
}
async function clickStart(m) {
  // ⚠ 不写成 `document.querySelector('.ai-start-btn').click()`：按钮不在时那是
  //   TypeError，整个驱动当场中断，**失败清单一句都打不出来** —— 变异测试那边就看不清
  //   到底哪几条判据红了（M4「不把块摆出来」正好制造这个情形）。记一条失败继续走。
  const ok = await js(m, `var b = document.querySelector('.ai-start-btn');
    if (!b) return false; b.click(); return true;`);
  if (!ok) fails.push('点「开始解卦」时页面上没有这颗按钮（块没摆出来？）');
  return ok;
}
/** 块标题栏里那颗折叠控件（页头那颗按钮删掉之后，收起/展开只剩这一个入口） */
async function clickFold(m) {
  await js(m, `document.getElementById('aiFoldBtn').click(); return true;`);
  await L.sleep(200);
}
/** 游客标记：清掉 = 假装是登录用户（本驱动不碰鉴权，登录要真后端） */
async function setAnonUsed(m, v) {
  await js(m, `if (arguments[0]) window.localStorage.setItem('mhys_anon_used','1');
    else window.localStorage.removeItem('mhys_anon_used'); return true;`, [!!v]);
}
/**
 * 把块里的首页视图按**当前**这一卦重画一遍。
 *
 * 走的是引擎自己的 `showAIHome()` —— 就是 `refreshAIPanel()` 内部调的那一个。
 * 页头那颗按钮删掉之后，测试里想「不换卦、不收起，只让首页视图重画」没有别的入口了；
 * 这不是在替用户操作，是在替页面调它自己那套（⑧ 里再补一条「页头真的没有按钮」）。
 *
 * ⚠ 必须写成 `W.showAIHome()`：`ExecuteScript` 跑在**沙箱**里，看页面是 Xray 视角，
 * 页面用 `function f(){}` 定义的全局在那里**看不见** —— `typeof showAIHome === 'function'`
 * 恒为 false，于是这个「重画」是空操作，而脚本自己毫不知情（第一版就是这样：收起没生效、
 * 面板一直开着，后面每一步都建在这个假前提上）。
 */
async function redrawHome(m) {
  await js(m, `${W} W.showAIHome(); return true;`);
  await L.sleep(150);
}

/**
 * 等 `#aiResponse` 的正文出现某段 —— **用 textContent，不是 innerText**。
 *
 * ⚠ 折叠时正文 `display:none`，`innerText` 返回**空串**（`L.panelTextUntil` 读的就是它），
 * 于是「流没动」与「块折着」在判据上长得一模一样。⑥ 要测的恰恰是「折着的时候流还在跑」，
 * 所以这里必须用 textContent —— 它不管可见性，照读。
 */
async function waitPanelRaw(m, re, timeoutMs) {
  return L.until(m, `var r = document.getElementById('aiResponse');
    return r ? (r.textContent || '') : '';`, (t) => re.test(t || ''), timeoutMs);
}

/** 一次「快照」：用户此刻看得见的那几样，全量取回。 */
async function snapshot(m) {
  return js(m, `${W}
    var p = document.getElementById('aiPanel');
    var host = document.getElementById('aiInlineHost');
    var area = document.getElementById('resultArea');
    var slot = document.getElementById('analysisArea');
    var resp = document.getElementById('aiResponse');
    var pbody = document.getElementById('aiPanelBody');
    var title = document.getElementById('aiPanelTitle');
    var fbtn = document.getElementById('aiFoldBtn');
    return {
      panelOpen: !!p && p.classList.contains('open'),
      panelInline: !!p && p.classList.contains('inline'),
      panelInHost: !!(p && host && host.contains(p)),
      // 块是不是**紧跟在卦象下面**（宿主是 #resultArea 的下一个兄弟）
      hostUnderChart: !!(host && area && area.nextElementSibling === host),
      panelText: resp ? (resp.innerText || '').replace(/\\s+/g, ' ').trim() : '',
      panelRaw: resp ? (resp.textContent || '').replace(/\\s+/g, ' ').trim() : '',
      followHist: (function(){ var h = document.getElementById('aiFollowHist');
        return h ? (h.innerText || '').replace(/\\s+/g, ' ').trim() : ''; })(),
      hostExists: !!host,
      folded: !!p && p.classList.contains('folded'),
      bodyHidden: pbody ? (getComputedStyle(pbody).display === 'none') : null,
      titleVisible: !!title && !!title.offsetParent,
      caret: fbtn ? (fbtn.innerText || '').replace(/\\s+/g, ' ').trim() : null,
      caretExpanded: fbtn ? fbtn.getAttribute('aria-expanded') : null,
      slotVisible: !!slot && !!slot.offsetParent,
      errs: (W.__errs || []).slice(),
    };`);
}
function has(text, s) { return String(text).indexOf(s) >= 0; }

async function main() {
  fs.mkdirSync(SHOT, { recursive: true });
  const server = await L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api });
  if (!server) { console.error('❌ 静态服务起不来'); process.exit(2); }
  const { child, m, prof } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'mhys-twice' });
  try {
    await js(m, `document.cookie = 'sqw_token=; path=/; max-age=0'; return true;`);
    await goto(m, `${ORIGIN}/mhys/index.html`);
    await js(m, `window.localStorage.clear(); return true;`);

    // ══ ① 第一卦：排盘 → AI 块**自己出现**在卦象下面 ═════════════════
    console.log('\n① 第一卦：排盘 → AI 块该自己出现在卦象下面（页头没有按钮了）');
    await setStub(m, GUA_A);
    const r1 = await divine(m, '第一卦', '火水未济', 2026, 9, 25, 8, 30);
    check('第一卦排出来了', r1.result.length > 20 && r1.alerts.length === 0,
      JSON.stringify({ result: r1.result.slice(0, 60), alerts: r1.alerts }));
    const nameA = (r1.result.match(/火水未济/) || ['(没渲染出卦名)'])[0];
    note(`第一卦卦名：${nameA}`);

    const opened = await snapshot(m);
    check('① 排完盘 AI 块**自己就出现了**（不用点任何东西）',
      opened.panelOpen === true, JSON.stringify({ open: opened.panelOpen }));
    check('① 而且是页内、排在卦象下面（不是盖住卦的浮层）',
      opened.panelInline && opened.panelInHost && opened.hostUnderChart,
      JSON.stringify({ inline: opened.panelInline, inHost: opened.panelInHost,
        紧跟卦象: opened.hostUnderChart }));
    check('① 页头那颗「☯ 看不懂？试试自动解析」**不在了**（用户点名要删）',
      (await js(m, `return !document.getElementById('aiBarBtn');`)) === true,
      '页头还找得到 #aiBarBtn');
    check('① 块里先给的是「开始解卦」（还没解过）',
      has(opened.panelText, '开始解卦') && !has(opened.panelText, '次数已用完'),
      JSON.stringify(opened.panelText.slice(0, 60)));
    check('① 只是摆出按钮，**没有**替用户发请求（服务端 0 次 chat/send）',
      state.chat.length === 0, JSON.stringify({ n: state.chat.length }));
    check('① 块标题栏里有折叠控件，初始是「收起 ▾」/ aria-expanded=true',
      has(opened.caret || '', '收起') && opened.caretExpanded === 'true' && opened.folded === false,
      JSON.stringify({ caret: opened.caret, aria: opened.caretExpanded, folded: opened.folded }));
    note(`截图 A：${(await L.shot(m, path.join(SHOT, 'A-块自动出现.png'), { full: true })).file}`);

    // ══ ② 点「开始解卦」→ 第一卦的解析 ═════════════════════════════
    console.log('\n② 点块里的「开始解卦」');
    await clickStart(m);
    const t1 = await L.panelTextUntil(m, /【三、建议】/, 8000);
    check('② 第一次解析出全文（桩正文三段都在）',
      has(t1, '【一、结论】') && has(t1, '【三、建议】'), JSON.stringify(t1).slice(0, 120));
    const afterOne = await snapshot(m);
    check('② 解析里是**第一卦**的内容（桩正文带卦名）', has(afterOne.panelText, nameA),
      JSON.stringify(afterOne.panelText.slice(0, 60)));
    note(`截图 B：${(await L.shot(m, path.join(SHOT, 'B-第一卦解完.png'), { full: true })).file}`);

    // ══ ③ 折叠：只折正文，块还在，展开一字不少 ═══════════════════════
    console.log('\n③ 块里那颗「收起 ▾」：折起来看下面的盘，再展开');
    await clickFold(m);
    const folded = await snapshot(m);
    note(`折起来之后：块开=${folded.panelOpen}，正文隐藏=${folded.bodyHidden}，`
      + `标题栏可见=${folded.titleVisible}，控件="${folded.caret}"`);
    check('③ 折叠之后正文确实收起来了（用户要的「不影响看下面的内容」）',
      folded.folded === true && folded.bodyHidden === true,
      JSON.stringify({ folded: folded.folded, bodyHidden: folded.bodyHidden }));
    check('③ 折叠**不是**把块藏起来：块还开着、标题栏还在、控件变成「展开 ▸」',
      folded.panelOpen === true && folded.titleVisible === true
        && has(folded.caret || '', '展开') && folded.caretExpanded === 'false',
      JSON.stringify({ open: folded.panelOpen, title: folded.titleVisible,
        caret: folded.caret, aria: folded.caretExpanded }));
    check('③ 折着的时候解析正文一个字都没丢（只是 display:none）',
      has(folded.panelRaw, '【三、建议】'), JSON.stringify(folded.panelRaw.slice(-60)));
    note(`截图 C：${(await L.shot(m, path.join(SHOT, 'C-折叠.png'), { full: true })).file}`);

    await clickFold(m);
    const unfolded = await snapshot(m);
    check('③ 再点一下展开，正文原样回来（没被重画、没被清空）',
      unfolded.folded === false && unfolded.bodyHidden === false
        && has(unfolded.panelText, '【三、建议】') && has(unfolded.panelText, nameA),
      JSON.stringify({ folded: unfolded.folded, text: unfolded.panelText.slice(0, 60) }));
    // 留一个「折着」的状态进 ④：换卦后必须自动展开（否则新盘那句「开始解卦」
    // 生成在一个看不见的块里，用户看到的是「排完盘什么都没发生」）
    await clickFold(m);
    note('（③ 结束时刻意让它停在**折着**的状态，④ 要验换卦后自动展开）');

    // ══ ④ 第二卦：原地再排一次盘 ═══════════════════════════════════
    console.log('\n④ 第二卦：在同一个页面再排一次盘（块此刻折着）');
    await setStub(m, GUA_B);
    const r2 = await divine(m, '第二卦', '天地否', 2026, 9, 25, 22, 10);
    check('第二卦排出来了', r2.result.length > 20 && r2.alerts.length === 0,
      JSON.stringify({ result: r2.result.slice(0, 60), alerts: r2.alerts }));
    const nameB = (r2.result.match(/天地否/) || ['(没渲染出卦名)'])[0];
    note(`第二卦卦名：${nameB}`);
    const afterTwo = await snapshot(m);
    note(`第二次排盘后：块开=${afterTwo.panelOpen}，折着=${afterTwo.folded}，`
      + `里面=" ${afterTwo.panelText.slice(0, 40)} "`);
    note(`截图 D：${(await L.shot(m, path.join(SHOT, 'D-第二卦排完.png'), { full: true })).file}`);
    check('④ 换卦后块**还在**、还在卦象下面（有盘就有块）',
      afterTwo.panelOpen === true && afterTwo.hostUnderChart === true,
      JSON.stringify({ open: afterTwo.panelOpen, 紧跟卦象: afterTwo.hostUnderChart }));
    check('④ 换卦后自动展开（折着是给上一卦那段长文做的动作）',
      afterTwo.folded === false && afterTwo.bodyHidden === false,
      JSON.stringify({ folded: afterTwo.folded, bodyHidden: afterTwo.bodyHidden }));
    check('④ 换卦后块里**不许**还挂着第一卦的解析（形式正常、内容错的那种）',
      !has(afterTwo.panelText, nameA) || nameA === '(没渲染出卦名)',
      JSON.stringify({ 第一卦: nameA, 块里: afterTwo.panelText.slice(0, 60) }));
    check('④ 换卦后追问历史也清掉了（它属于上一卦）',
      afterTwo.followHist === '' || !has(afterTwo.followHist, nameA),
      JSON.stringify(afterTwo.followHist.slice(0, 60)));

    // ══ ⑤ 游客门：放行「看他付过的那一份」，但仍然拦「再解一次」 ═══════
    console.log('\n⑤ 游客那一次已经用掉了 —— 门还在不在？');
    // ④ 里换卦时块已经按新卦重画过了：游客那时给的是登录引导，不是「开始解卦」
    check('⑤ 游客换卦后首页给的是登录引导（那一次免费机会已经花掉了）',
      has(afterTwo.panelText, '次数已用完'),
      JSON.stringify(afterTwo.panelText.slice(0, 60)));
    // 上面那道是**首页视图**的门。`startButtonClicked()` 里还有一道（防「按钮已经在屏幕上
    // 摆着、用户点下去」）—— 把标记临时撤掉让按钮画出来、再悄悄装回去，专点那一道。
    await setAnonUsed(m, false);
    await redrawHome(m);
    const homeForB = await snapshot(m);
    check('⑤ 撤掉标记后首页给的是「开始解卦」（这一卦还没解过）',
      has(homeForB.panelText, '开始解卦'), JSON.stringify(homeForB.panelText.slice(0, 60)));
    await setAnonUsed(m, true);
    await clickStart(m);
    await L.sleep(400);
    const gated = await snapshot(m);
    check('⑤ 游客按下「开始解卦」**被拦住**（不是又跑一次）',
      has(gated.panelText, '次数已用完'),
      JSON.stringify(gated.panelText.slice(0, 60)) + ' ← 修 ② 时最容易顺手把这扇门一起拆掉');
    check('⑤ 而且真的没发第二次请求（服务端只收到过 1 次 chat/send）',
      state.chat.length === 1, JSON.stringify({ n: state.chat.length }));
    note(`截图 E：${(await L.shot(m, path.join(SHOT, 'E-游客门.png'), { full: true })).file}`);

    // ══ ⑥ 登录用户解第二卦，**流跑着的时候折一下** ═══════════════════
    console.log('\n⑥ 清掉游客标记（假装是登录用户）→ 解第二卦 → 流到一半折叠');
    await setAnonUsed(m, false);
    await redrawHome(m);
    const homeForB2 = await snapshot(m);
    check('⑥ 这时块首页给的是「开始解卦」',
      has(homeForB2.panelText, '开始解卦'), JSON.stringify(homeForB2.panelText.slice(0, 60)));
    await clickStart(m);
    // 只等**第一段**到，然后在流跑着的时候折叠
    await waitPanelRaw(m, /【一、结论】/, 8000);
    await clickFold(m);
    const midStream = await snapshot(m);
    check('⑥ 流跑着的时候折起来：正文藏了、块还开着',
      midStream.folded === true && midStream.bodyHidden === true && midStream.panelOpen === true,
      JSON.stringify({ folded: midStream.folded, bodyHidden: midStream.bodyHidden,
        open: midStream.panelOpen }));
    // 折着的时候等第二段 —— 用的必须是 textContent：正文此刻 display:none，innerText 读不到
    const rawWhileFolded = await waitPanelRaw(m, /【三、建议】/, 8000);
    check('⑥ 折着的时候流**照跑到完**（折叠不是 abortAIStream —— 这条是这块最容易写错的地方）',
      has(rawWhileFolded, '【三、建议】'),
      JSON.stringify(rawWhileFolded.slice(-70)) + ' ← 折一下就掐流的话，用户展开只剩半截');
    await clickFold(m);
    const afterB = await snapshot(m);
    check('⑥ 展开后是全文（三段都在），不是半截',
      has(afterB.panelText, '【一、结论】') && has(afterB.panelText, '【二、依据】')
        && has(afterB.panelText, '【三、建议】'),
      JSON.stringify(afterB.panelText.slice(0, 80)));
    check('⑥ 解析里是**第二卦**的内容（换卦之后真的重跑了，不是把旧的再贴一遍）',
      has(afterB.panelText, nameB),
      JSON.stringify({ 第二卦: nameB, 块里: afterB.panelText.slice(0, 60) }));
    note(`截图 F：${(await L.shot(m, path.join(SHOT, 'F-第二卦解完.png'), { full: true })).file}`);

    // ══ ⑦ 记录页：从历史点进来还能看到存着的解读 ═══════════════════
    // （守的是 result.html 里那几个全局变量的**挂载顺序**：renderResult() 会清空
    //   它们，所以必须挂在渲染之后。顺序反了这里就会读到空、面板显示「开始解卦」。）
    console.log('\n⑦ 记录页（/mhys/result.html?id=…）：带 ai_analysis 的记录');
    await setAnonUsed(m, true);   // 游客身份更容易把「登录墙 vs 已存解析」照出来
    const recId = state.records[state.records.length - 1].id;
    await goto(m, `${ORIGIN}/mhys/result.html?id=${recId}`);
    // 记录页的块也是**自己出现**的（load() 里调 refreshAIPanel），等它画出来
    const recRaw = await waitPanelRaw(m, /记录里存着的旧解析/, 8000);
    const rec = await snapshot(m);
    check('⑦ 记录页的块也自己出现（不用点任何东西）',
      rec.panelOpen === true && has(recRaw, '记录里存着的旧解析'),
      JSON.stringify({ open: rec.panelOpen, text: rec.panelText.slice(0, 40) }));
    check('⑦ 显示的是记录里存着的那份解读（不是「开始解卦」、也不是登录墙）',
      has(rec.panelText, '记录里存着的旧解析') && !has(rec.panelText, '次数已用完'),
      JSON.stringify(rec.panelText.slice(0, 60)));
    check('⑦ 记账行被切出来做小字（不是当正文渲染）',
      has(rec.panelText, '消耗积分：输入 100 + 输出 200 = 300'),
      JSON.stringify(rec.panelText.slice(-60)));
    const recNorm = await js(m, `${W} return { recId: W.currentRecordId, saved: !!W.savedAnalysis,
      topic: W.currentTopic };`);
    check('⑦ 记录页的 currentRecordId / savedAnalysis 在渲染之后都挂上了（顺序没错）',
      String(recNorm.recId) === String(recId) && recNorm.saved === true,
      JSON.stringify(recNorm));
    note(`截图 G：${(await L.shot(m, path.join(SHOT, 'G-记录页.png'), { full: true })).file}`);

    // ══ ⑧ 全程没有未捕获异常 ═══════════════════════════════════════
    const errs = await js(m, `${W} return (W.__errs || []).slice();`);
    check('⑧ 全程没有未捕获异常', errs.length === 0, JSON.stringify(errs).slice(0, 300));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) {}
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
    try { server.close(); } catch (e) {}
  }

  console.log('');
  if (fails.length) {
    console.log(`❌ 梅花「用两次」：${fails.length} 项失败（截图在 ${SHOT}/）：`);
    fails.forEach((f) => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('✅ 梅花「用两次」全绿');
}

main().catch((e) => {
  // 中断也要**先把已攒下的失败打出来**：不然只剩一条堆栈，看不出是哪几条判据先红的
  // （写变异测试时正是靠这一段才知道「是块没摆出来，不是折叠坏了」）。
  if (fails.length) {
    console.log('\n❌ 中断前已失败：');
    fails.forEach((f) => console.log('   · ' + f));
  }
  console.error('❌ ' + (e && e.stack || e));
  process.exit(1);
});

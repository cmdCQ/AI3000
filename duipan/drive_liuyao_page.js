/**
 * 驱页 · 六爻页「盘面全交后端」的端到端验收
 * ==========================================================================
 *
 * 为什么要有它：六爻页这次重写把**全部装卦代码删了** —— 纳甲、六亲、六神、世应、
 * 宫、卦身、旬空、神煞、变卦整列，页面一行都不算，全拿 `/api/liuyao/paipan` 的
 * `chart` + `display` 渲染。删掉的东西只有真跑一遍页面才看得见有没有删干净，
 * 而「渲染得对不对」也不是读源码能看出来的。所以在**本机**起一个静态服务器 +
 * 一份端点，用 Firefox 无头驱动真页面（DOM、fetch、localStorage 全是真的）。
 *
 * 三处「独立判据」，是本脚本价值所在（同一份代码算两遍等于没验）：
 *
 *  ① **桩卦**：把 `/api/liuyao/paipan` 换成返回**另一卦**的桩 —— 页面这一卦是
 *     上3下4（火雷噬嗑），桩回的是上7下7（艮为山 二四爻动 → 火风鼎）。页面若能
 *     渲染出「艮为山(艮)｜六冲卦｜火风鼎｜卦身--巳 驿马--亥 桃花--午 日禄--酉｜
 *     农历八月十四」，这些字只可能来自后端：页面上既没有 64 卦表，也没有神煞表。
 *  ② **抓包**：桩把收到的请求体原样存下。于是「页面折出的卦号对不对」变成一句
 *     可直接断言的话 —— 期望的卦号是**手算**后写死的（见下面的算草），不是从
 *     页面里读回来的。
 *  ③ **运行期「已删」判据**：装卦那些表/函数在页面上必须是 `undefined`。这是读
 *     源码看不出的（正则在注释里也会命中），只有跑起来问 `wrappedJSObject` 才准。
 *
 * **它不覆盖什么**：线上 nginx / 真后端进程 / 鉴权 / pm2。本机没有 node_modules，
 * 真端点那一例是**从 `auth-server.js` 切片**求值的（切片标记与 `smoke_paipan_endpoints.js`
 * 同一对，失效即退出 2，不静默跳过）。
 *
 * 依赖：firefox（无头）。浏览器与站点那套在 `duipan/drive_lib.js` 里，与梅花页的
 * 驱动脚本共用一份 —— 两个脚本各抄一份的话，「读正文」「点按钮」的实现会分家，
 * 谁更松谁的绿就是假的。
 *
 * 用法：node duipan/drive_liuyao_page.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境/切片出了问题（测不出来，不是通过）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const promptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'prompt.js'));
const LY = require(path.join(ROOT, 'build', 'backend', 'paipan', 'liuyao.js'));

const PORT = 8898;
const MARIONETTE_PORT = 2829;
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
  for (const want of ['/api/liuyao/paipan', '/api/meihua/paipan']) {
    if (!slice.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」——切片标记失效，拒绝在残缺代码上验收。`);
      process.exit(2);
    }
  }
  return new Function('req', 'res', 'body', 'pathname', 'json', 'promptLib', 'liuyaoPaipan',
    slice + '\n;return false;');
}
const runEndpoint = loadEndpoint();

// ─────────────────────────────────────────────────────────────
// 2. 桩卦：用户 2026-09-25 给的参考图那一卦（艮为山 二四爻动 → 火风鼎）
//
// 桩的形状必须**与真端点逐字相同**（chart/display/text/sizhu），否则页面上的
// 渲染分支会走成另一条，测的就不是线上那条路了。
// ─────────────────────────────────────────────────────────────
const REF_CARD = {
  topic: '我能不能和我喜欢的女生在一起',
  divinationTime: '2026-09-24 19:49:00',
  method: '手动指定',
  lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
  hexagrams: { benGua: { upper: 7, lower: 7 }, bianGua: { upper: 3, lower: 5 } },
};
const REF_PAYLOAD = (() => {
  const built = promptLib.liuyaoChartFromCard(REF_CARD, REF_CARD.topic);
  if (!built.chart) { console.error('❌ 桩卦装不出来（paipan 模块变了？）'); process.exit(2); }
  return {
    chart: built.chart, sizhu: built.sizhu,
    display: LY.displayMeta(REF_CARD, built.chart),
    text: LY.formatChart(built.chart),
  };
})();

// 桩：设了就按它回（① 独立判据）；同时把每个进来的请求体存下来（② 独立判据）
const state = { stub: false, captured: [], savedRecords: [], patched: [], chat: [] };

async function api(req, res, pathname) {
  if (pathname === '/__stub') {
    state.stub = !!(await L.readBody(req)).on;
    return L.sendJson(res, { ok: true, stub: state.stub }), true;
  }
  if (pathname === '/__captured') return L.sendJson(res, { captured: state.captured }), true;
  if (pathname === '/__reset') {
    state.captured = []; state.savedRecords = []; state.patched = []; state.chat = [];
    return L.sendJson(res, { ok: true }), true;
  }
  if (pathname === '/__saved') return L.sendJson(res, { saved: state.savedRecords }), true;
  if (pathname === '/__patched') return L.sendJson(res, { patched: state.patched }), true;
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

  if (req.method === 'POST' && pathname === '/api/liuyao/paipan') {
    const body = await L.readBody(req);
    state.captured.push(body);
    if (state.stub) { L.sendJson(res, REF_PAYLOAD); return true; }
    runEndpoint(req, res, body, pathname, L.sendJson, promptLib, LY);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/liuyao-records') {
    const body = await L.readBody(req);
    state.savedRecords.push(body);
    return L.sendJson(res, { id: 999 }), true;
  }
  // 面板把解读存回记录（`recordsPath + '/' + recId + '/ai'`）。
  // 它打不到这个 URL 就说明 currentRecordId 没贯通 —— 用户花掉的解读会白丢。
  if (req.method === 'PATCH' && /^\/api\/liuyao-records\/[^/]+\/ai$/.test(pathname)) {
    const body = await L.readBody(req);
    state.patched.push({ path: pathname, body });
    return L.sendJson(res, { ok: true }), true;
  }
  // 结果页按 id 取记录（读的是 result_data / topic / created_at / ai_analysis）
  if (req.method === 'GET' && /^\/api\/liuyao-records\/\d+$/.test(pathname)) {
    const last = state.savedRecords[state.savedRecords.length - 1];
    if (!last) return L.sendJson(res, { error: '没有记录' }, 404), true;
    L.sendJson(res, {
      id: 999, topic: last.topic, method: last.method,
      result_data: last.resultData, ai_analysis: '', created_at: new Date().toISOString(),
    });
    return true;
  }
  // 别的 /api/* 一律空回，免得页面上的鉴权请求把水搅浑
  if (pathname.startsWith('/api/')) return L.sendJson(res, {}), true;
  return false;
}

// ─────────────────────────────────────────────────────────────
// 3. 页面操作原语
// ─────────────────────────────────────────────────────────────
const js = L.js;
const W = L.W;
const goto = L.goto;

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

const clickStart = (m) => js(m, `document.getElementById('startBtn').click(); return true;`);

/**
 * 手动指定六爻：写 `MANUAL_LINES` 后重画。
 *
 * 不能只写 `MANUAL_LINES` 就走 —— `selectMethod('manual')` 会
 * `setTimeout(fillManualLineSelects, 50)`，那一步把六爻重置成全少阴。故先等它跑完
 * （150ms），再写、再 `renderManualLines()` 重画，页面上的爻符才与实际提交的一致。
 * @param {string[]} types 自**初爻到上爻**（与页面的 MANUAL_LINES 同序）
 */
async function setManual(m, types) {
  await L.sleep(200);
  return js(m, `${W}
    W.MANUAL_LINES = arguments[0].slice();
    W.renderManualLines();
    return document.getElementById('manualLines').innerText;
  `, [types]);
}

/** 铜钱摇卦：真去点六次太慢也不可复现，直接把六次结果放进去（与页面同一形状） */
async function setCoin(m, types) {
  await L.sleep(200);
  return js(m, `${W}
    W.COIN.results = arguments[0].slice();
    W.renderAccumulatedLines();
    return W.COIN.results.join(',');
  `, [types]);
}

// 结果**就在本页**下面的 #resultArea 里（不再跳 result.html），等的是那个容器。
const resultText = (m, timeoutMs) => L.textOf(m, '#resultArea', timeoutMs, 30);

async function captured() { return (await (await fetch(`${ORIGIN}/__captured`)).json()).captured; }
async function saved() { return (await (await fetch(`${ORIGIN}/__saved`)).json()).saved; }
async function patched() { return (await (await fetch(`${ORIGIN}/__patched`)).json()).patched; }
async function chat() { return (await (await fetch(`${ORIGIN}/__chat`)).json()).chat; }

// 页面上未捕获的异常。**取的时候现读** —— 在 clickStart 之后立刻读，会在渲染完成
// 之前就把快照取走，页面渲染途中抛的错就漏了（第一版就是这么漏掉一个 TypeError 的，
// 而且漏得时有时无：一会儿绿一会儿红，看着像环境抖动，其实是读得太早）。
async function errsOf(m) { return (await L.diagnostics(m)).errs; }
async function setStub(on) {
  await fetch(`${ORIGIN}/__stub`, { method: 'POST', body: JSON.stringify({ on }) });
}

const INDEX = `${ORIGIN}/liuyao/index.html`;

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// 每条用例都从干净的排盘页开始（上一次点过「开始排盘」页面状态就变了）
async function reset(m) {
  await fetch(`${ORIGIN}/__reset`, { method: 'POST' });
  await goto(m, INDEX);
  await js(m, `window.localStorage.clear(); return true;`);
}

// ── 手算的卦号（独立判据②：这些数不从页面里读回来）─────────────────
//
// 逐个说清楚，改用例时照着改：
//
// A. 手动「初爻老阳，其余五爻依次 少阴 少阴 少阳 少阴 少阳」（自初到上）
//    阳阴：1,0,0,1,0,1 → 下卦 [初,二,三]=[1,0,0]=100=4震；上卦 [四,五,上]=[1,0,1]=101=3离
//    → 本卦 上3下4。只有初爻动 → 变后 0,0,0,1,0,1 → 下 000=8坤、上 101=3离。
// B. 铜钱：老阳 少阳 少阴 老阴 少阴 少阳
//    阳阴：1,1,0,0,0,1 → 下 [1,1,0]=110=2兑；上 [0,0,1]=001=7艮 → 上7下2
//    动爻是初(老阳)与四(老阴) → 变后 0,1,0,1,0,1 → 下 010=6坎、上 101=3离
// C. 全少阴 → 六爻皆阴 → 上下皆 000=8坤，无动爻
const MANUAL_A = ['laoyang', 'shaoyin', 'shaoyin', 'shaoyang', 'shaoyin', 'shaoyang'];
const A_GUA = { upper: 3, lower: 4, bianUpper: 3, bianLower: 8, moving: [1] };
const COIN_B = ['laoyang', 'shaoyang', 'shaoyin', 'laoyin', 'shaoyin', 'shaoyang'];
const B_GUA = { upper: 7, lower: 2, bianUpper: 3, bianLower: 6, moving: [1, 4] };

async function main() {
  const server = await L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api });
  const { child, m, prof } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'liuyao-prof' });
  let code = 0;
  let stubText = '';      // 桩卦那一屏的正文，⑨ 拿它跟结果页比
  let stubPanCols = 0;
  try {
    // ── ① 桩卦：页面渲染的是后端给的盘，不是自己算的 ──────────────
    console.log('\n① 桩卦（后端回艮为山 → 火风鼎，页面这一卦是上3下4）：盘面全部来自后端');
    await setStub(true);
    await reset(m);
    await selectMethod(m, 'manual');
    await setManual(m, MANUAL_A);
    await setTime(m, 2026, 9, 25, 8, 30);
    await clickStart(m);
    let r = await L.diagnostics(m);
    stubText = await resultText(m, 8000);
    console.log('   · 页面正文：' + JSON.stringify(stubText.replace(/\s+/g, ' ').slice(0, 150)));

    check('结果就在本页出（没跳 result.html）',
      await js(m, `return !/result\\.html/.test(location.href);`), await js(m, `return location.href;`));
    check('渲染出桩卦的本卦名与宫「艮为山(艮)」（页面上没有 64 卦表）',
      /艮为山/.test(stubText) && /\(艮\)/.test(stubText), JSON.stringify(stubText).slice(0, 200));
    check('渲染出桩卦的变卦「火风鼎」（动的是二四爻，页面无从得知）',
      /火风鼎/.test(stubText), JSON.stringify(stubText).slice(0, 200));
    check('判出六冲卦（六冲表在后端）',
      /六冲卦/.test(stubText), JSON.stringify(stubText).slice(0, 200));
    check('神煞逐字来自后端：卦身--巳 驿马--亥 桃花--午 日禄--酉',
      /卦身--巳/.test(stubText) && /驿马--亥/.test(stubText)
      && /桃花--午/.test(stubText) && /日禄--酉/.test(stubText),
      JSON.stringify(stubText).slice(0, 300));
    check('四柱旬空逐字来自后端：寅卯 / 辰巳',
      /寅卯/.test(stubText) && /辰巳/.test(stubText), JSON.stringify(stubText).slice(0, 300));
    check('农历来自后端 display：八月十四',
      /八月十四/.test(stubText), JSON.stringify(stubText).slice(0, 200));
    check('变卦整列在场（六亲与纳甲干都随变卦半卦）',
      /己/.test(stubText) && /辛/.test(stubText), JSON.stringify(stubText).slice(0, 300));

    // 盘面是九列网格（六神｜六亲｜纳甲干｜爻符｜世应｜动｜爻符｜变六亲｜变纳甲干），
    // 行用 display:contents 交给它排 —— 这正是「各行的爻符对齐」的物理保证
    stubPanCols = await js(m, `var p = document.querySelector('.ly-pan');
      return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : 0;`);
    check('盘面 9 列（本卦 5 列 + 动 + 变卦 3 列）', stubPanCols === 9, `列数 ${stubPanCols}`);
    check('盘面 6 行（上爻到初爻）',
      await js(m, `return document.querySelectorAll('.ly-pan .ly-row').length;`) === 6,
      '行数不是 6');
    check('每行 9 格（display:contents 生效，不是每行各成一张网格）',
      await js(m, `var rows = document.querySelectorAll('.ly-pan .ly-row');
        if (!rows.length) return -1;
        var n = rows[0].children.length;
        for (var i = 1; i < rows.length; i++) if (rows[i].children.length !== n) return -1;
        return n;`) === 9, '首行不是 9 格或有行格数不一致');
    // 桩卦动的是二爻与四爻，且两爻都是**阴变阳**（艮为山 二四爻皆阴 → 火风鼎 皆阳），
    // 故记号应是两个「×→」。行序是自上而下（第 0 行 = 上爻），故二爻在第 4 行、
    // 四爻在第 2 行 —— 位置也要对，只数个数的话「记号全画在初爻上」也能蒙混过去。
    const moves = await js(m, `${W}
      var rows = document.querySelectorAll('.ly-pan .ly-row');
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        var e = rows[i].querySelector('.ly-c-move');
        out.push(e ? e.innerText : '');
      }
      return out.join('|');`);
    check('动爻记号只有两个「×→」，且落在二爻（第 5 行）与四爻（第 3 行）',
      moves === '||×→||×→|', JSON.stringify(moves));

    // ── ② 页面里已无装卦实现（运行期判据，读源码看不出）────────────
    console.log('\n② 页面上已经没有装卦代码了（运行期问 wrappedJSObject）');
    const gone = await js(m, `${W}
      return ['calcGua','HEX64','TRIGRAMS','NAJIA','NAJIA_GAN','PALACE','WUXING','xunKongFromDayGZ',
        'getGuaShen','getLiuQin','getPalaceInfo','getYaoInfo','buildPalaceTable','guaToLines',
        'hexagrams_data'].map(function(k){ return k + ':' + (typeof W[k]); }).join(' ');`);
    check('取卦以外的术数全局全部 undefined',
      !/:function|:object/.test(gone), gone);
    check('取卦算术还在（折六个爻成上下卦号 —— 这是页面的本职）',
      (await js(m, `${W} return typeof W.castToTrigrams;`)) === 'function', 'castToTrigrams 没了');
    check('整个流程没有 JS 报错',
      (await errsOf(m)).length === 0, JSON.stringify(await errsOf(m)).slice(0, 300));

    // ── ③ 抓包：页面折出的卦号 = 手算值 ──────────────────────────
    console.log('\n③ 抓包：页面送上去的卦号与手算一致（手算见文件头 A）');
    let cap = await captured();
    check('送了一个请求，且只有起卦结果与四柱（没有前端装的六亲六神）',
      cap.length === 1 && !cap[0].liuqin && !cap[0].liushen && !cap[0].gong
      && !cap[0].shiYao && !!cap[0].hexagrams,
      JSON.stringify(cap[0]).slice(0, 200));
    check('本卦 上3下4、变卦 上3下8（初爻动）—— 与手算逐字相同',
      cap.length === 1 && cap[0].hexagrams.benGua.upper === A_GUA.upper
      && cap[0].hexagrams.benGua.lower === A_GUA.lower
      && cap[0].hexagrams.bianGua.upper === A_GUA.bianUpper
      && cap[0].hexagrams.bianGua.lower === A_GUA.bianLower,
      JSON.stringify(cap[0] && cap[0].hexagrams));
    check('四柱带全给后端互证（少一柱后端就静默退回前端四柱）',
      cap.length === 1 && !!cap[0].lunarInfo && !!cap[0].lunarInfo.yearGZ
      && !!cap[0].lunarInfo.monthGZ && !!cap[0].lunarInfo.dayGZ
      && !!cap[0].lunarInfo.hourGZ, JSON.stringify(cap[0] && cap[0].lunarInfo));
    check('起卦时刻 = 页面上选的 08:30（不是墙上时钟）',
      cap.length === 1 && cap[0].divinationTime === '2026-09-25 08:30',
      JSON.stringify(cap[0] && cap[0].divinationTime));

    // ── ④ 真端点：卦名由后端查表得来 ────────────────────────────
    console.log('\n④ 换回真端点：同一次手动起卦，卦名得对上（页面没有 64 卦表）');
    await setStub(false);
    await reset(m);
    await selectMethod(m, 'manual');
    await setManual(m, MANUAL_A);
    await clickStart(m);
    r = await L.diagnostics(m);
    const realText = await resultText(m, 8000);
    // 上3下4 = 火雷噬嗑；初爻动 → 上3下8 = 火地晋
    check('本卦名 火雷噬嗑（上3下4）',
      /火雷噬嗑/.test(realText), JSON.stringify(realText.replace(/\s+/g, ' ').slice(0, 220)));
    check('变卦名 火地晋（初爻动）',
      /火地晋/.test(realText), JSON.stringify(realText.replace(/\s+/g, ' ').slice(0, 220)));
    check('断卦要点在场（用神那一条来自后端）',
      /用神：/.test(realText), JSON.stringify(realText.slice(0, 200)));
    check('真端点这一屏没有 JS 报错',
      (await errsOf(m)).length === 0, JSON.stringify(await errsOf(m)).slice(0, 300));

    // ── ⑤ 无动爻：后端给 chart.bian === null，盘面不出现变卦那一半 ──
    console.log('\n⑤ 无动爻：盘面只有本卦那一半（后端 chart.bian 为 null）');
    await reset(m);
    await selectMethod(m, 'manual');
    await setManual(m, ['shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin']);
    await clickStart(m);
    const soloText = await resultText(m, 8000);
    cap = await captured();
    check('送上去的本卦与变卦同号（无动爻）',
      cap.length === 1 && cap[0].hexagrams.benGua.upper === cap[0].hexagrams.bianGua.upper
      && cap[0].hexagrams.benGua.lower === cap[0].hexagrams.bianGua.lower,
      JSON.stringify(cap[0] && cap[0].hexagrams));
    check('本卦名 坤为地（六爻皆阴）', /坤为地/.test(soloText), JSON.stringify(soloText.slice(0, 200)));
    check('盘面收成 5 列（无变卦列）',
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : 0;`) === 5,
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns : '(无)';`));
    check('没有动爻记号，也没有变爻符',
      await js(m, `return document.querySelectorAll('.ly-c-move').length;`) === 0,
      '无动爻却出现了动爻那一列');

    // ── ⑥ 铜钱路径：折卦算术（手算见文件头 B）────────────────────
    console.log('\n⑥ 铜钱摇卦：六个爻折成 上7下2（手算见文件头 B）');
    await reset(m);
    await selectMethod(m, 'coin');
    await setCoin(m, COIN_B);
    await clickStart(m);
    r = await L.diagnostics(m);
    await resultText(m, 8000);
    cap = await captured();
    check('本卦 上7下2、变卦 上3下6（初、四爻动）—— 与手算逐字相同',
      cap.length === 1 && cap[0].hexagrams.benGua.upper === B_GUA.upper
      && cap[0].hexagrams.benGua.lower === B_GUA.lower
      && cap[0].hexagrams.bianGua.upper === B_GUA.bianUpper
      && cap[0].hexagrams.bianGua.lower === B_GUA.bianLower,
      JSON.stringify(cap[0] && cap[0].hexagrams));
    check('记录里留着起卦痕迹（六爻与动爻位置）',
      cap.length === 1 && Array.isArray(cap[0].coinLines) && cap[0].coinLines.length === 6
      && JSON.stringify(cap[0].movePositions) === JSON.stringify(B_GUA.moving),
      JSON.stringify(cap[0] && cap[0].movePositions));
    check('抓包里 method = coin（页面把这卦的来路说清楚了）',
      cap.length === 1 && cap[0].method === 'coin', JSON.stringify(cap[0] && cap[0].method));
    check('这一屏没有 JS 报错',
      (await errsOf(m)).length === 0, JSON.stringify(await errsOf(m)).slice(0, 300));

    // ── ⑦ 存记录：顶层字段是历史列表要读的 ──────────────────────
    console.log('\n⑦ 填了事项 → 存记录，顶层字段给历史列表读');
    await reset(m);
    await selectMethod(m, 'manual');
    await setManual(m, MANUAL_A);
    await setTime(m, 2026, 9, 25, 8, 30);
    await js(m, `document.getElementById('topicInput').value = '测试事项六爻'; return true;`);
    await clickStart(m);
    r = await L.diagnostics(m);
    await resultText(m, 10000);
    const sv = await saved();
    check('记录已提交，method 与 resultData 都带上',
      sv.length === 1 && sv[0].method === 'manual' && !!sv[0].resultData,
      JSON.stringify(sv).slice(0, 200));
    check('resultData.divinationTime 在**顶层**（历史列表读的就是它）',
      sv.length === 1 && sv[0].resultData.divinationTime === '2026-09-25 08:30',
      JSON.stringify(sv[0] && sv[0].resultData && sv[0].resultData.divinationTime));
    check('resultData.recordTime 也在顶层（列表按它排序）',
      sv.length === 1 && !!sv[0].resultData.recordTime, 'recordTime 没了');
    check('存的是卦号与四柱，没存前端装的盘',
      sv.length === 1 && !!sv[0].resultData.hexagrams.benGua.upper
      && !!sv[0].resultData.lunarInfo.dayGZ && !sv[0].resultData.gua,
      JSON.stringify(sv[0] && sv[0].resultData).slice(0, 200));
    check('存了记录也不跳走（原地出结果）',
      await js(m, `return !/result\\.html/.test(location.href);`), await js(m, `return location.href;`));

    // ── ⑧ 结果出来自动开始解读，cardData 是新形态 ────────────────
    console.log('\n⑧ 原地出结果后 AI 面板自动打开，并把新形态的 cardData 送上去');
    check('排盘页挂了 AI 面板（引擎自己 mount，页面里已无那段标注）',
      await js(m, `return !!(document.getElementById('aiPanel')
        && document.getElementById('aiPanelOverlay')
        && document.getElementById('aiFollowBar'));`), '页面上找不到 aiPanel');
    check('结果出来后面板自动打开了（不用用户再点）', await L.panelOpen(m), '面板没打开');
    const aiTxt = await L.panelTextUntil(m, /【三、建议】/, 8000);
    check('面板把流式正文全程收完并渲染（桩文本三段都在）',
      /【一、结论】/.test(aiTxt) && /【三、建议】/.test(aiTxt), JSON.stringify(aiTxt).slice(0, 200));
    check('正文是按 markdown 渲染的（【一、结论】成了区块标题，不是原文）',
      await js(m, `var a = document.getElementById('aiResponse');
        return !!a.querySelector('div[style*="var(--accent)"]');`), '没找到区块标题');
    const ch = await chat();
    check('cardData 是**起卦结果**形态（卦号 + 四柱），不再送前端装的六亲六神世应',
      ch.length === 1 && ch[0].cardType === 'liuyao' && !!ch[0].cardData
      && ch[0].cardData.hexagrams.benGua.upper === A_GUA.upper
      && ch[0].cardData.hexagrams.benGua.lower === A_GUA.lower
      && !ch[0].cardData.hexagrams.liuqin && !ch[0].cardData.hexagrams.liushen
      && !ch[0].cardData.hexagrams.gong && !ch[0].cardData.hexagrams.shiYao
      && !!ch[0].cardData.lunarInfo.dayGZ,
      JSON.stringify(ch[0] && ch[0].cardData).slice(0, 300));
    const pt = await patched();
    check('解读存回了**这条记录**（记录 id 贯通；打不到就白花用户一次解读）',
      pt.length === 1 && pt[0].path === '/api/liuyao-records/999/ai' && !!pt[0].body,
      JSON.stringify(pt).slice(0, 200));
    check('这一屏没有 JS 报错',
      (await errsOf(m)).length === 0, JSON.stringify(await errsOf(m)).slice(0, 300));

    // ── ⑨ 结果页：历史记录入口照旧渲染，且吃新形态 ──────────────
    // 上面全走的是本页原地渲染，一条也覆盖不到 result.html。它现在不再自己装卦，
    // 而是把记录里的卦号送 `/api/liuyao/paipan` 再渲染 —— 这段只有真打开它才验得到。
    console.log('\n⑨ 结果页（历史记录入口）：把记录交给后端装卦后渲染');
    await goto(m, `${ORIGIN}/liuyao/result.html?id=999`);
    let rtext = await L.textOf(m, '#contentArea', 8000, 30);
    check('结果页渲染出这条记录的卦（火雷噬嗑）与事项',
      /火雷噬嗑/.test(rtext) && /测试事项六爻/.test(rtext),
      JSON.stringify(rtext.replace(/\s+/g, ' ').slice(0, 260)));
    check('结果页也渲染成九列盘（同一份渲染层，两页不会长歪）',
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : 0;`) === 9,
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns : '(无)';`));
    check('结果页样式生效（.card 有边框，说明两份 CSS 都加载了）',
      await js(m, `var c = document.querySelector('.card');
        return !!c && getComputedStyle(c).borderTopWidth !== '0px';`), '样式没生效');

    // 老记录（result_data 里是 `gua.benGua.upper/lower`，没有 hexagrams）也得能看。
    // 库里 2026-09-25 之前的记录全是这个形状，兼容层写错了只有真打开才知道。
    console.log('   · 老形状记录（result_data.gua.benGua）走兼容层');
    state.savedRecords.push({
      topic: '老记录一卦', method: 'coin',
      resultData: {
        divinationTime: '2026-09-24 19:49:00',
        lunarInfo: { yearGZ: '丙午', monthGZ: '丁酉', dayGZ: '辛丑', hourGZ: '戊戌' },
        gua: { benGua: { name: '艮为山', upper: 7, lower: 7 }, bianGua: { name: '火风鼎', upper: 3, lower: 5 } },
        coinLines: [], movePositions: [],
      },
    });
    await goto(m, `${ORIGIN}/liuyao/result.html?id=999`);
    rtext = await L.textOf(m, '#contentArea', 8000, 30);
    check('老形状记录也渲染出卦（艮为山 → 火风鼎，盘面由后端重装）',
      /艮为山/.test(rtext) && /火风鼎/.test(rtext),
      JSON.stringify(rtext.replace(/\s+/g, ' ').slice(0, 260)));
    // 结果页**不**自动开面板（与梅花结果页一致：历史记录是「回头看」，不该一进来
    // 就弹浮层、还替用户花掉一次解读）。要验的是它**能**解：卦被认出来了、记录 id
    // 也认对了 —— 这两样少了任一个，用户点「自动解析」不是解不了就是解完存不回记录。
    //
    // 先清 localStorage：上一条用例已经真跑过一次解读，游客标记 `liuyao_anon_used`
    // 落下了 —— 不清的话这里点开就是「游客免费次数用完」的登录引导（**这是对的**），
    // 但那样就验不到「记录页能不能解」了。两件事分开验。
    await js(m, `window.localStorage.clear(); return true;`);
    await js(m, `document.getElementById('aiBarBtn').click(); return true;`);
    await js(m, `document.querySelector('.ai-start-btn').click(); return true;`);
    check('老记录也解得动（判据是「有没有卦」，不是「记录是哪个形状」）',
      await L.panelOpen(m), '老记录的卦没被认出来');
    // 取**末一条**：⑧ 那一次也发过 chat，这里没 reset，第一条是它的
    const chOld = await chat();
    const lastChat = chOld[chOld.length - 1] || {};
    check('老记录解的是它自己的那一卦（艮为山 上7下7 送上去）',
      chOld.length >= 2 && lastChat.cardData.hexagrams.benGua.upper === 7
      && lastChat.cardData.hexagrams.benGua.lower === 7
      && lastChat.cardData.topic === '老记录一卦',
      JSON.stringify(lastChat.cardData).slice(0, 220));
    await L.panelTextUntil(m, /【三、建议】/, 8000);
    const ptOld = await patched();
    check('老记录的解读也存回它自己的 id（末一条 PATCH 是 /999/ai，不是凭空一个 id）',
      ptOld.length >= 2 && ptOld[ptOld.length - 1].path === '/api/liuyao-records/999/ai',
      JSON.stringify(ptOld.map((x) => x.path)));

    // ── ⑩ 起卦前点「自动解析」：只提示，不发请求 ────────────────
    console.log('\n⑩ 还没起卦就点解析 → 只提示、不发 AI 请求');
    await setStub(true);
    await reset(m);
    await js(m, `document.getElementById('aiBarBtn').click(); return true;`);
    await js(m, `document.querySelector('.ai-start-btn').click(); return true;`);
    await L.sleep(400);
    check('没起卦就点解析 → 不发 AI 请求',
      (await chat()).length === 0, JSON.stringify(await chat()));
    check('提示语是「先起一卦」',
      await js(m, `return document.body.innerText.indexOf('先起一卦') >= 0;`), '没看到提示语');
    code = 0;
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    server.close();
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* 临时目录，留着也无害 */ }
  }

  if (fails.length) { code = 1; }

  // 桩屏与结果页的盘面列数都记过一笔，防「只有一页是九列」
  if (stubPanCols !== 9) fails.push('桩卦那一屏不是九列盘');

  console.log(fails.length
    ? `\n❌ 六爻页驱动：${fails.length} 项失败\n   ` + fails.join('\n   ')
    : '\n✅ 六爻页驱动：全部通过');
  console.log('   （桩屏正文留档：' + JSON.stringify(stubText.replace(/\s+/g, ' ').slice(0, 80)) + '…）');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error('❌ 驱动脚本自身出错：', e); process.exit(2); });

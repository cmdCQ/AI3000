/**
 * 线上断言验收 · 六爻页 / 梅花页（真站，只读，不改线上任何东西）
 * ==========================================================================
 *
 * 与 `shot_liuyao.js` 的分工：那个是「看版面」的通用驱动（量溢出、存图给人看），
 * 本文件是**带判据的**验收 —— 把 `shot_local_page.js` 的本地断言搬到线上跑一遍，
 * 因为「本地绿」只证明产物对，不证明线上拿到的就是那一份（`deploy_nginx.sh`
 * 的取回比对证明传输对，本文件证明**浏览器里跑起来**也对）。
 *
 * 判据（与本地那套逐条相同）：
 *  ① 面板在正文流里：`position=static`、带 `.inline`、父节点是 `#aiInlineHost`
 *  ② 面板与卦象表**垂直不重叠**（0px）—— 这就是用户报的「面板糊住盘」
 *  ③ 卦象表真的渲染出来了（有行、正文里有盘面术语）
 *  ④ 页面无横向滚动条
 *
 * ⚠ 验不到的：**「正文里不显示 token 尾巴」这一条线上验不了** —— `/api/chat/send`
 * 要求登录（`auth-server.js:1912` 匿名直接 401），没有测试账号时 AI 流根本不起。
 * 该条由 ①本地桩（喂带尾巴的响应，断言渲染后正文无「消耗 Token」）+ ②容器内真调
 * 探针（确认后端确实拼那行尾巴）两头夹住，本文件不重复也不假装验了。
 *
 * 用法：node duipan/verify_live_page.js [liuyao|mhys|both] [url-base]
 * 退出码：0 = 判据全过
 */
'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');

const BASE = process.argv[3] || 'https://sqw.somtfly.com';
const PORT = 2836;
const OUT = '/tmp/shots/live-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// 「等结果」的上限。默认 240 秒 —— 不是拍脑袋：本机到线上取一个 `lunar.min.js`
// 实测 74 秒、盘面第 36 秒出来（见文件里那段更正）。链路好的机器上根本用不到
// 这个上限（本机正常的那些天，盘面 3 秒内就出来）。AI3000_LIVE_WAIT=600 可改。
const LIVE_WAIT = Number(process.env.AI3000_LIVE_WAIT || 240) * 1000;
let LINK = '';   // 本次的链路实测（导航耗时），失败信息里带上，好分清是谁慢

const PAGES = {
  liuyao: {
    path: '/liuyao/', name: '六爻',
    // 一键随机起卦（六爻默认就是这个，仍显式切一次，免页面默认值变了悄悄跑偏）
    start: `var W = window.wrappedJSObject || window;
      var el = W.document.querySelector('.method-option[data-method="auto"]');
      if (!el) return 'no-method-option';
      if (typeof W.selectMethod !== 'function') return 'no-selectMethod';
      W.selectMethod('auto', el);
      if (typeof W.startDivination !== 'function') return 'no-startDivination';
      W.startDivination(); return 'ok';`,
    // 盘面必须出现的东西（六爻盘：本卦名 + 六亲/纳甲 + 世应）
    need: ['本卦', '世', '应'],
    barSel: '#resultArea .ly-c-bar > div',
  },
  mhys: {
    path: '/mhys/', name: '梅花',
    // ⚠ 梅花默认起卦法是 `number`（报数），不先切成 `time` 会弹「请输入数字」然后
    // 什么都不排（本地第一版就是这么假失败的）。线上同理。
    start: `var W = window.wrappedJSObject || window;
      var el = W.document.querySelector('.method-option[data-method="time"]');
      if (!el) return 'no-method-option';
      if (typeof W.selectMethod !== 'function') return 'no-selectMethod';
      W.selectMethod('time', el);
      if (typeof W.startDivination !== 'function') return 'no-startDivination';
      W.startDivination(); return 'ok';`,
    need: ['本卦', '互卦', '变卦'],
    barSel: '#resultArea .yao-line',
  },
};

// 每个页面「爻符」的选择器不同，缺一个就等于那条判据永远量出 0（见 BOX_JS 里的注）。
for (const [k, v] of Object.entries(PAGES)) {
  if (!v.barSel) { console.error(`❌ PAGES.${k} 没给 barSel —— 爻符那条判据会永远量出 0（假红）。`); process.exit(2); }
}

// 量一个盒子的几何
const BOX_JS = `var W = window.wrappedJSObject || window;
  function R(sel){ var e=W.document.querySelector(sel); if(!e) return null;
    var r=e.getBoundingClientRect();
    return {y:Math.round(r.top), b:Math.round(r.bottom), x:Math.round(r.left), w:Math.round(r.width)}; }
  function RN(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {y:Math.round(r.top), b:Math.round(r.bottom), x:Math.round(r.left), w:Math.round(r.width)}; }
  var p = W.document.getElementById('aiPanel');
  // 爻符：阳爻曾经是「有底色、高 0」的盒子（详见 js/liuyao_render.js::lyBar 注）。
  // 靠肉眼在整页图上数是数不准的，故直接量每个爻符的高度。
  // ⚠ 选择器**每个页面不同**：六爻是「#resultArea .ly-c-bar > div」（span 里套一层），
  // 梅花是「#resultArea .yao-line」（div 本身就是那条线）。2026-09-25 之前这里把六爻
  // 的选择器硬写死，于是梅花永远量出「0 个爻符」——一个**假红**，而它看起来又特别
  // 像「用户的阳爻不显示」。故由调用方按页面传进来（__BAR_SEL__），阳/阴的类名两边
  // 都是 yao-yang，那部分共用。
  // （注：本串是模板串，注释里**不能出现反引号** —— 会当场截断字符串，已栽过一次。）
  var bars = (function(){
    var ds = W.document.querySelectorAll('__BAR_SEL__');
    var zero = 0, yang = 0, yin = 0;
    for (var i = 0; i < ds.length; i++) {
      if (ds[i].getBoundingClientRect().height < 1) zero++;
      if (ds[i].className.indexOf('yao-yang') >= 0) yang++; else yin++;
    }
    return { n: ds.length, zero: zero, yang: yang, yin: yin };
  })();
  // 登录/引导模态框：匿名访客一排完盘就会弹（AI 接口匿名 401），它会盖住页面，
  // 故单独量出来 —— 这是「匿名访客真实看到什么」的一部分，不是噪声
  var modal = null, mEls = W.document.querySelectorAll('.modal, .auth-modal, [id*=Modal], [class*=modal]');
  for (var i = 0; i < mEls.length; i++) {
    var cs = W.getComputedStyle(mEls[i]);
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && mEls[i].getBoundingClientRect().height > 40) {
      modal = { id: mEls[i].id || mEls[i].className, r: RN(mEls[i]) }; break;
    }
  }
  return { pan: R('#aiPanel'), table: R('#resultArea table'), area: R('#resultArea'), bars: bars,
    inline: !!(p && p.classList.contains('inline')),
    pos: p ? W.getComputedStyle(p).position : null,
    parent: p && p.parentNode ? (p.parentNode.id || p.parentNode.tagName) : null,
    rows: W.document.querySelectorAll('#resultArea table tr').length,
    modal: modal,
    docScrollW: W.document.documentElement.scrollWidth,
    clientW: W.document.documentElement.clientWidth,
    text: (W.document.body.innerText || '').replace(/\\n{2,}/g, '\\n') };`;

// 反向断言（**必须放在 BOX_JS 定义之后**：`const` 有暂时性死区，写在前面是运行时报错，
// 而 `node --check` 只查语法、查不出这个 —— 2026-09-25 实际栽过一次）：
// 占位符要是被人「顺手清理」掉了，选择器就又变回硬写死，而硬写死那一版在梅花上
// **永远绿不了、也永远不报错**（量出 0 个爻符）。
if (BOX_JS.indexOf('__BAR_SEL__') < 0) {
  console.error('❌ BOX_JS 里没有 __BAR_SEL__ 占位符 —— 判据又变回硬写死了？'); process.exit(2);
}

async function run(m, key) {
  const Pg = PAGES[key];
  const dir = path.join(OUT, key);
  fs.mkdirSync(dir, { recursive: true });
  let ok = true;

  for (const vp of [{ n: 'desktop', w: 1280, h: 900 }, { n: 'narrow', w: 500, h: 900 }]) {
    await L.setWindow(m, vp.w, vp.h);
    const t0 = Date.now();
    // 导航上限也给足同一个数：链路慢的时候这个页面本身就要几十秒（CJK 字体分片
    // 每个约 20 秒，字体到了版面才定）。页面 load 慢**不代表**坏。
    await L.goto(m, BASE + Pg.path, { timeout: LIVE_WAIT });
    await L.sleep(2500);
    LINK = `导航 ${Date.now() - t0}ms`;
    console.log(`   [${vp.n}] 导航+等字体 ${Date.now() - t0}ms`);

    const sel = await L.js(m, Pg.start);
    if (sel !== 'ok') { ok = false; console.log(`   [${vp.n}] ❌ 起卦没触发：${sel}`); continue; }
    // ── 等**真实的完成信号**，不是等一个拍脑袋的秒数 ──────────────────
    // 2026-09-25 更正（这条检查自己出过一次假红，害我以为线上六爻页坏了）：
    // 原来写的是「等正文 >1200 字，25 秒」。而本机到线上的链路慢到取一个
    // `lunar.min.js` 要 **74 秒**（同一文件在服务器上自取 0.02 秒、负载 0.04 ——
    // 慢的是我这边到公网的那一段，不是站点）。于是盘面第 36 秒才出来，检查在
    // 第 25 秒就断言「爻符 0 个」，把「我慢」报成了「线上坏」。
    // 现在：等按钮离开「排盘中…」**且**盘面容器有内容，上限给足（默认 240 秒，
    // 环境变量 AI3000_LIVE_WAIT 可改）；仍超时就**明说这是「没验到」**，并把
    // 实测的链路速度一起打出来，让读到这条红的人第一眼就知道该怀疑哪一头。
    const tStart = Date.now();
    const DONE_JS = `var W = window.wrappedJSObject || window;
        var btn = W.document.getElementById('startBtn');
        var area = W.document.getElementById('resultArea') || W.document.getElementById('contentArea');
        var busy = btn ? /排盘中|起卦中/.test(String(btn.textContent || '')) : false;
        return JSON.stringify({ busy: busy, len: area ? (area.innerText || '').length : 0 });`;
    const isDone = (s) => { try { const o = JSON.parse(s || '{}'); return !o.busy && o.len > 60; } catch (e) { return false; } };
    // ⚠ `L.until` 超时时返回的是**最后一次采到的值**，不是 false —— 判据要自己再过一遍
    const last = await L.until(m, DONE_JS, isDone, LIVE_WAIT, 1000);
    const waited = Math.round((Date.now() - tStart) / 1000);
    if (!isDone(last)) {
      ok = false;
      console.log(`   [${vp.n}] ❌ 没等到盘面（等了 ${waited}s，上限 ${LIVE_WAIT / 1000}s）`
        + `　本机链路实测：${LINK || '没量到'} —— 先当「没验到」，不当作线上故障`);
      continue;
    }
    console.log(`   [${vp.n}] 盘面出来了（起卦后 ${waited}s）`);
    await L.sleep(1200);

    const b = await L.js(m, BOX_JS.split('__BAR_SEL__').join(Pg.barSel));
    await L.shot(m, path.join(dir, `1-${vp.n}.png`));

    // 再截一张「把登录框点掉」的：那张图只为**看清盘面版面**（匿名访客一定会碰到
    // 那个框，它压着爻符列，不点掉就看不着盘）。这是页面自己的关闭按钮，
    // 是用户点得到的正常操作，不是改页面。判据仍以关框前那次量的为准。
    const closed = await L.js(m, `var W = window.wrappedJSObject || window;
      var c = W.document.querySelector('.auth-modal-close');
      if (typeof W.hideAuthModal === 'function') { W.hideAuthModal(); return 'hideAuthModal'; }
      if (c) { c.click(); return 'click ✕'; }
      return 'no-modal-close';`);
    if (closed !== 'no-modal-close') {
      await L.sleep(400);
      await L.shot(m, path.join(dir, `2-${vp.n}-关掉登录框.png`));
    }

    const ov = (b.pan && b.table)
      ? Math.max(0, Math.min(b.pan.b, b.table.b) - Math.max(b.pan.y, b.table.y)) : 0;
    // 模态框**不算失败**：匿名访客排完盘必弹（AI 接口要求登录），那是既有行为、
    // 不属本次改动；把它混进判据会让人以为盘没排出来。只观察、只报告。
    const pass = b.pos === 'static' && b.inline && ov === 0 && b.rows > 0;
    if (!pass) ok = false;
    console.log(`   [${vp.n}] 面板 pos=${b.pos} inline=${b.inline} 父=${b.parent}`
      + ` | 面板 y=${b.pan && b.pan.y}..${b.pan && b.pan.b}`
      + ` | 表 y=${b.table && b.table.y}..${b.table && b.table.b}（${b.rows} 行）`
      + ` | 重叠=${ov}px ${ov === 0 ? '✅' : '❌'}`);
    if (b.modal) console.log(`   [${vp.n}] ⚠ 有模态框在页上：${b.modal.id}`
      + ` y=${b.modal.r.y}..${b.modal.r.b} —— 匿名访客排完盘就会遇到它（AI 接口要求登录）`);
    if (b.docScrollW > b.clientW + 1) { ok = false; console.log(`   [${vp.n}] ❌ 出横向滚动条：文档 ${b.docScrollW} > 视口 ${b.clientW}`); }
    else console.log(`   [${vp.n}] ✅ 无横向滚动条`);

    // 爻符必须真看得见（用户报的「阳爻根本不显示」）
    const barPass = b.bars && b.bars.n > 0 && b.bars.zero === 0;
    if (!barPass) ok = false;
    console.log(`   [${vp.n}] 爻符 ${b.bars && b.bars.n} 个（阳 ${b.bars && b.bars.yang} / 阴 ${b.bars && b.bars.yin}）`
      + `　高 0 的 ${b.bars && b.bars.zero} 个  ${barPass ? '✅' : '❌ 有爻符看不见'}`);

    if (vp.n === 'narrow') fs.writeFileSync(path.join(dir, '正文.txt'), b.text, 'utf8');
    const miss = Pg.need.filter((k) => b.text.indexOf(k) < 0);
    console.log(`   [${Pg.name}] 盘面文字要素 ${Pg.need.length - miss.length}/${Pg.need.length}`
      + (miss.length ? ` ❌ 缺 ${miss.join('、')}` : ' ✅'));
    if (miss.length) ok = false;

    // 正文里不该出现 AI 记账尾巴（匿名时 AI 流不起，故这条在线上是「无从出现」，
    // 不是「验过了」—— 明说，免得把跳过当通过）
    const trail = b.text.indexOf('消耗 Token') >= 0;
    if (trail) { ok = false; console.log('   ❌ 正文里出现 token 尾巴'); }
    else console.log('   ⏭ 正文无 token 尾巴（匿名无 AI 流，此条线上无从触发；由本地桩验）');
  }
  return ok;
}

(async () => {
  const want = process.argv[2] || 'both';
  const keys = want === 'both' ? ['liuyao', 'mhys'] : [want];
  const { child, m } = await L.launchFirefox({ port: PORT, profilePrefix: 'verify-live' });
  let ok = true;
  try {
    for (const k of keys) {
      console.log(`\n══ ${PAGES[k].name}　${BASE}${PAGES[k].path} ══`);
      ok = (await run(m, k)) && ok;
    }
  } finally {
    try { await m.send('WebDriver:DeleteSession', {}, 5000); } catch (e) {}
    child.kill('SIGKILL');
  }
  console.log(`\n截图：${OUT}`);
  console.log(ok ? '✅ 线上验收通过' : '❌ 线上验收不通过');
  process.exit(ok ? 0 : 1);
})();

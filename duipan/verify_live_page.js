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
  },
};

// 量一个盒子的几何
const BOX_JS = `var W = window.wrappedJSObject || window;
  function R(sel){ var e=W.document.querySelector(sel); if(!e) return null;
    var r=e.getBoundingClientRect();
    return {y:Math.round(r.top), b:Math.round(r.bottom), x:Math.round(r.left), w:Math.round(r.width)}; }
  function RN(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {y:Math.round(r.top), b:Math.round(r.bottom), x:Math.round(r.left), w:Math.round(r.width)}; }
  var p = W.document.getElementById('aiPanel');
  // 登录/引导模态框：匿名访客一排完盘就会弹（AI 接口匿名 401），它会盖住页面，
  // 故单独量出来 —— 这是「匿名访客真实看到什么」的一部分，不是噪声
  var modal = null, mEls = W.document.querySelectorAll('.modal, .auth-modal, [id*=Modal], [class*=modal]');
  for (var i = 0; i < mEls.length; i++) {
    var cs = W.getComputedStyle(mEls[i]);
    if (cs.display !== 'none' && cs.visibility !== 'hidden' && mEls[i].getBoundingClientRect().height > 40) {
      modal = { id: mEls[i].id || mEls[i].className, r: RN(mEls[i]) }; break;
    }
  }
  return { pan: R('#aiPanel'), table: R('#resultArea table'), area: R('#resultArea'),
    inline: !!(p && p.classList.contains('inline')),
    pos: p ? W.getComputedStyle(p).position : null,
    parent: p && p.parentNode ? (p.parentNode.id || p.parentNode.tagName) : null,
    rows: W.document.querySelectorAll('#resultArea table tr').length,
    modal: modal,
    docScrollW: W.document.documentElement.scrollWidth,
    clientW: W.document.documentElement.clientWidth,
    text: (W.document.body.innerText || '').replace(/\\n{2,}/g, '\\n') };`;

async function run(m, key) {
  const Pg = PAGES[key];
  const dir = path.join(OUT, key);
  fs.mkdirSync(dir, { recursive: true });
  let ok = true;

  for (const vp of [{ n: 'desktop', w: 1280, h: 900 }, { n: 'narrow', w: 500, h: 900 }]) {
    await L.setWindow(m, vp.w, vp.h);
    const t0 = Date.now();
    await L.goto(m, BASE + Pg.path, { timeout: 60000 });
    // CJK 分片 woff2 每个约 20 秒，字体到了版面才定；页面 load 慢不代表坏
    await L.sleep(2500);
    console.log(`   [${vp.n}] 导航+等字体 ${Date.now() - t0}ms`);

    const sel = await L.js(m, Pg.start);
    if (sel !== 'ok') { ok = false; console.log(`   [${vp.n}] ❌ 起卦没触发：${sel}`); continue; }
    await L.until(m, 'return document.body.innerText.length;', (n) => n > 1200, 25000);
    await L.sleep(1800);

    const b = await L.js(m, BOX_JS);
    await L.shot(m, path.join(dir, `1-${vp.n}.png`));

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

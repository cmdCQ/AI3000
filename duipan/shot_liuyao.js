/**
 * 截图 · 六爻页（线上真站）
 * ==========================================================================
 *
 * 为什么单独写一个：`drive_liuyao_page.js` 验的是**行为**（发了什么请求、装出什么
 * 盘），它看不到「版面」。用户报的是「显示问题很大」—— 版面问题只能看**图**。
 *
 * 三件事，缺一不可：
 *  ① **定宽再截**：无头 Firefox 默认窗宽约 500px，不设窗口就截，看到的「挤成
 *     一团」是窗口太窄造出来的假象，不是页面的毛病。桌面/手机各设一次。
 *  ② **整篇 + 折叠**：`full` 截整篇（长页面不截断），但**不重走响应式断点**，
 *     所以宽窄必须各截一遍，不能一把抓。
 *  ③ **量盒子**：截图说得出「看着不对」，`boxes()` 才说得出**哪里**不对 ——
 *     溢出视口多少像素、谁盖住了谁。两者一起看。
 *
 * 用法：
 *   node duipan/shot_liuyao.js [url] [outdir]
 * 默认 url = 线上六爻页，outdir = /tmp/shots/liuyao-<时间戳>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');

const URL = process.argv[2] || 'https://sqw.somtfly.com/liuyao/';
const OUT = process.argv[3] || ('/tmp/shots/liuyao-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
const PORT = 2831;

// 桌面 + 手机。手机宽取 390（iPhone 14 的逻辑宽）：比它更窄的机型极少，
// 而站点若有「最小宽度 500px」之类的隐性前提，390 一定能照出来。
const VIEWPORTS = [
  { name: 'desktop', w: 1280, h: 900 },
  { name: 'mobile', w: 390, h: 844 },
];

// 关心版面的容器（存在的才算数，缺失不报错 —— 这一版页面结构可能不同名）
const WATCH = [
  'body', '.page', '.container', '.header', '#startBtn', '.method-display',
  '.ai-panel', '#aiPanel', '.result', '.result-card', '#resultArea',
  '.hex-table', 'table', '.tp-panel', '.coin-row', '.hexagrams',
];

function fmtBox(b) {
  return `    ${String(b.tag).padEnd(6)} ${(b.cls || '').slice(0, 34).padEnd(34)}`
    + ` x=${String(b.x).padStart(5)} w=${String(b.w).padStart(5)}`
    + ` right=${String(b.right).padStart(5)}`
    + (b.overflowX > 1 ? ` ⚠ 溢出视口 ${b.overflowX}px` : '')
    + (b.scrollW > b.clientW + 1 ? ` ⚠ 内容宽 ${b.scrollW} > 容器 ${b.clientW}` : '')
    + (b.h === 0 ? ' ⚠ 高 0（不可见）' : '');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { child, m } = await L.launchFirefox({ port: PORT, profilePrefix: 'shot-liuyao' });
  const report = [];

  try {
    // ── 登录（真账号，走真 /api/login）──
    // 不登录的话，一排盘就弹登录框**盖住结果**，截出来的图全是模态框 ——
    // 那是我们自己的访问方式造出来的，不是页面毛病。凭据从环境变量进，
    // **不写进本文件**（这是仓库里的文件，凭据不进仓库）。
    const PHONE = process.env.TEST_PHONE;
    const PASS = process.env.TEST_PASS;
    if (!PHONE || !PASS) console.log('⚠ 未设 TEST_PHONE/TEST_PASS —— 匿名截图（结果可能被登录框盖住）');
    else {
      await L.goto(m, URL, { timeout: 60000 });
      await L.sleep(1200);
      // ExecuteScript 里 fetch 是异步的，marionette 不等 promise（实测返回 undefined），
      // 故把结果挂到 window 上再轮询 —— 比赌它等 promise 靠谱。
      await L.js(m, `var W = window.wrappedJSObject || window;
        W.__login = 'pending';
        W.fetch('/api/login', { method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: ${JSON.stringify(PHONE)}, password: ${JSON.stringify(PASS)} }) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (x) {
            if (!x.ok) { W.__login = 'fail: ' + (x.d && x.d.error); return; }
            W.document.cookie = 'sqw_token=' + encodeURIComponent(x.d.token) + '; path=/; max-age=86400';
            W.document.cookie = 'sqw_username=' + encodeURIComponent(x.d.username) + '; path=/; max-age=86400';
            W.__login = 'ok: ' + x.d.username;
          })
          .catch(function (e) { W.__login = 'err: ' + e; });
        return 'started';`);
      const lr = await L.until(m, `return (window.wrappedJSObject || window).__login;`,
        (v) => v && v !== 'pending', 15000);
      console.log(`   登录：${lr}`);
    }

    for (const vp of VIEWPORTS) {
      const tag = vp.name;
      const win = await L.setWindow(m, vp.w, vp.h);
      process.stdout.write(`\n══ ${tag} 窗口设为 ${vp.w}×${vp.h}（实际 ${win.w}×${win.h}）══\n`);

      const t0 = Date.now();
      await L.goto(m, URL, { timeout: 60000 });
      console.log(`   导航就绪 ${Date.now() - t0}ms`);

      // 字体/图片还要一会儿才落位，版面在字体到达后会变（尤其 CJK 分片下载很慢）
      await L.sleep(2500);

      const entry = await L.shot(m, path.join(OUT, `1-${tag}-入口.png`));
      console.log(`   截图 ${path.basename(entry.file)}（${(entry.bytes / 1024).toFixed(0)} KB）`);

      // ── 入口页版面 ──
      const b0 = await L.boxes(m, WATCH.join(','));
      console.log(`   视口 ${b0.vw}×${b0.vh}，文档高 ${b0.docH}`);
      const over0 = b0.els.filter((e) => e.overflowX > 1);
      if (over0.length) { console.log('   ⚠ 横向溢出：'); over0.forEach((e) => console.log(fmtBox(e))); }

      // ── 排盘：走「一键随机」，不需要点六次铜钱；不带事项故不写库 ──
      const okSel = await L.js(m, `var W = window.wrappedJSObject || window;
        if (typeof W.selectMethod !== 'function') return 'no-selectMethod';
        // ⚠ 必须把元素一起传：页面里是 onclick="selectMethod('auto',this)"，
        // 少传一个是 TypeError（第一版就是这么挂的），不是页面坏了。
        var el = W.document.querySelector('.method-option[data-method="auto"]');
        if (!el) return 'no-method-option';
        W.selectMethod('auto', el);
        if (typeof W.startDivination !== 'function') return 'no-startDivination';
        W.startDivination();
        return 'ok';`);
      console.log(`   触发排盘：${okSel}`);

      // 等结果落地（页面把结果渲染进 DOM 才算数）
      await L.until(m, `return document.body.innerText.length;`, (n) => n > 1200, 20000);
      await L.sleep(1200);

      const res = await L.shot(m, path.join(OUT, `2-${tag}-排盘结果.png`));
      console.log(`   截图 ${path.basename(res.file)}（${(res.bytes / 1024).toFixed(0)} KB）`);

      const b1 = await L.boxes(m, WATCH.join(','));
      console.log(`   结果页：视口 ${b1.vw}×${b1.vh}，文档高 ${b1.docH}`);
      const over1 = b1.els.filter((e) => e.overflowX > 1 || e.scrollW > e.clientW + 1 || e.h === 0);
      console.log(`   ⚠ 异常盒子 ${over1.length} 个：`);
      over1.forEach((e) => console.log(fmtBox(e)));

      // 横向滚动条是「手机上看不到右边内容」的典型症状
      const sc = await L.js(m, `return { docScrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
        bodyScrollW: document.body.scrollWidth };`);
      console.log(`   横向滚动：文档 ${sc.docScrollW} / body ${sc.bodyScrollW} / 视口 ${sc.clientW}`
        + (sc.docScrollW > sc.clientW + 1 ? '  ⚠ 出横向滚动条' : '  ✅ 无'));

      const d = await L.diagnostics(m);
      if (d.alerts.length) console.log(`   ⚠ 页面 alert：${JSON.stringify(d.alerts)}`);
      if (d.errs.length) console.log(`   ⚠ 页面异常：${JSON.stringify(d.errs)}`);

      // 正文片段：光看图有时认不出「这一块是什么」，文字能对上号
      const txt = await L.js(m, `return (document.body.innerText || '').replace(/\\n{3,}/g, '\\n\\n').slice(0, 1800);`);
      fs.writeFileSync(path.join(OUT, `3-${tag}-正文.txt`), txt, 'utf8');
      report.push({ tag, viewport: `${b1.vw}×${b1.vh}`, docH: b1.docH, overflow: over1.length, sc });
    }
  } finally {
    try { await m.send('WebDriver:DeleteSession', {}, 5000); } catch (e) {}
    child.kill('SIGKILL');
  }

  console.log(`\n══ 输出目录：${OUT} ══`);
  for (const f of fs.readdirSync(OUT).sort()) {
    console.log(`   ${f}  ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0)} KB`);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error('❌ ' + (e && e.stack || e)); process.exit(1); });

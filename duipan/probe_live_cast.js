/**
 * 线上探针 · 「点完起卦之后，浏览器里到底发生了什么」（真站，**只读**）
 * ==========================================================================
 *
 * 起因：`verify_live_page.js` 报线上六爻页「爻符 0 个 / 盘面要素 0/3」，而同一份
 * 端点用 curl 打是 HTTP 200 + 完整盘。两个事实都对，说明**问题在页面与请求之间**
 * —— 而 `verify_live_page.js` 只能看到「结果没出来」，看不到「为什么」。
 *
 * 本探针回答的具体问题（每条都落成一行可读事实，不猜）：
 *   ① 请求到底发出去没有（在页面里包一层 fetch，记 URL/状态/耗时）
 *   ② 页面停在哪一步（每秒采一次：按钮文案 / #resultArea 文本长度 / 面板状态）
 *   ③ 有没有弹窗、有没有 JS 报错（`drive_lib.diagnostics`）
 *   ④ 结果区与盘面到底有没有（`#resultArea` 是否存在、爻符几个、世应列在不在）
 *
 * ⚠ 副作用：**无**。空事项起卦不写排盘记录（页面自己就是这么写的），不调 AI
 *   （匿名没有额度），不产生 token 消耗。它只是让线上多做一次纯计算。
 *
 * 用法：node duipan/probe_live_cast.js [liuyao|mhys] [等待上限秒]
 */

'use strict';

const path = require('path');
const fs = require('fs');
const L = require(path.join(__dirname, 'drive_lib'));

const BASE = 'https://sqw.somtfly.com';
const PORT = 2837;
const KEY = (process.argv[2] || 'liuyao').toLowerCase();
const MAXWAIT = Number(process.argv[3] || 45);
const OUT = '/tmp/shots/probe-cast-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const PAGES = {
  liuyao: { path: '/liuyao/', name: '六爻', method: 'auto' },
  mhys: { path: '/mhys/', name: '梅花', method: 'time' },
};

// 在页面里装一个 fetch 记账器。装的时候页面可能已经跑过自己的脚本 —— 无所谓，
// 我们只关心**点击之后**发的那几个请求。
const INSTALL = `var W = window.wrappedJSObject || window;
  W.__net = [];
  W.__t0 = W.__t0 || Date.now();   // 记账器装上的那一刻 = 时间原点
  if (!W.__fetchWrapped) {
    var orig = W.fetch;
    W.fetch = function (u, o) {
      // t0/ms 都是**相对时间原点**：要分清「请求排队等到 35s 才发」与
      // 「请求发了、服务端处理了 35s」——这两件事的修法完全不同。
      var rec = { url: String(u), t0: Date.now() - W.__t0, status: null, ms: null, err: null };
      W.__net.push(rec);
      return orig.call(W, u, o).then(function (r) {
        rec.status = r.status; rec.ms = Date.now() - W.__t0 - rec.t0; return r;
      }, function (e) {
        rec.err = String(e && e.message || e); rec.ms = Date.now() - W.__t0 - rec.t0; throw e;
      });
    };
    W.__fetchWrapped = true;
  }
  // 字体分片是页面自己发的，也记一笔：它们是「请求排队」的头号嫌疑
  return W.__net.length;`;

const SNAP = `var W = window.wrappedJSObject || window;
  var btn = W.document.querySelector('.start-btn, #startBtn, button[data-role=start]');
  var area = W.document.getElementById('resultArea');
  var bars = W.document.querySelectorAll('#resultArea .ly-c-bar > div, #resultArea [class*=yao-bar]');
  return JSON.stringify({
    btn: btn ? String(btn.textContent || '').trim().slice(0, 20) : null,
    btnDisabled: btn ? !!btn.disabled : null,
    area: !!area,
    areaLen: area ? (area.innerText || '').length : -1,
    rows: W.document.querySelectorAll('#resultArea table tr').length,
    bars: bars.length,
    bodyLen: (W.document.body.innerText || '').length,
    panelOpen: !!W.document.getElementById('aiPanel') && W.document.getElementById('aiPanel').classList.contains('open'),
    net: (W.__net || []).map(function (r) {
      return r.url.replace(/^https?:\\/\\/[^/]+/, '')
        + ' @' + r.t0 + 'ms → ' + (r.err ? 'ERR ' + r.err : (r.status === null ? '…' : r.status))
        + (r.ms === null ? '' : ' 耗时 ' + r.ms + 'ms');
    }),
    // 字体/其它资源的实际耗时（看「是不是它们在占着连接」）
    slow: W.performance.getEntriesByType('resource')
      .filter(function (e) { return e.duration > 2000; })
      .slice(0, 8)
      .map(function (e) {
        return (e.name.split('/').pop() || '').slice(0, 30) + ' ' + Math.round(e.duration) + 'ms'
          + '（' + Math.round(e.startTime) + 'ms 起）';
      }),
  });`;

const START = (m) => `var W = window.wrappedJSObject || window;
  var el = W.document.querySelector('.method-option[data-method="${m}"]');
  if (!el) return 'no-method-option';
  if (typeof W.selectMethod !== 'function') return 'no-selectMethod';
  W.selectMethod('${m}', el);
  if (typeof W.startDivination !== 'function') return 'no-startDivination';
  W.startDivination(); return 'ok';`;

(async () => {
  const Pg = PAGES[KEY] || PAGES.liuyao;
  fs.mkdirSync(path.join(OUT, KEY), { recursive: true });
  const { child, m } = await L.launchFirefox({ port: PORT, profilePrefix: 'probe-cast' });
  try {
    console.log(`══ ${Pg.name}　${BASE}${Pg.path}　（只读探针，最长等 ${MAXWAIT}s）══`);
    const t0 = Date.now();
    await L.goto(m, BASE + Pg.path, { timeout: 90000 });
    console.log(`导航完成 ${Date.now() - t0}ms（CJK 字体分片要下 20 秒一片，慢是正常的）`);
    await L.sleep(1500);

    console.log('装 fetch 记账器：' + await L.js(m, INSTALL));

    const sel = await L.js(m, START(Pg.method));
    console.log(`触发起卦：${sel}`);
    if (sel !== 'ok') { console.log('没触发成功，下面不用看了'); return; }

    // 每秒一采，直到盘面出来或超时 —— 目标是**看清停在哪一步**，不是「等它通过」
    for (let s = 1; s <= MAXWAIT; s++) {
      await L.sleep(1000);
      const snap = JSON.parse(await L.js(m, SNAP));
      const done = snap.bars > 0 && snap.rows > 0;
      if (s <= 6 || done || s % 10 === 0) {
        console.log(`  t=${String(s).padStart(2)}s 按钮=「${snap.btn}」`
          + `${snap.btnDisabled ? '(禁用)' : ''} 结果区=${snap.area ? snap.areaLen + '字' : '不存在'}`
          + ` 表${snap.rows}行 爻符${snap.bars}个 正文${snap.bodyLen}字`
          + ` 面板=${snap.panelOpen ? '开' : '关'}`);
        if (snap.net.length) console.log(`         请求：${snap.net.join(' ｜ ')}`);
      }
      if (done) { console.log(`  ✅ 盘面在第 ${s} 秒出现`); break; }
    }

    const final = JSON.parse(await L.js(m, SNAP));
    const d = await L.diagnostics(m);
    console.log('\n── 收尾事实 ──');
    console.log('  最终状态：' + JSON.stringify({ btn: final.btn, rows: final.rows, bars: final.bars, areaLen: final.areaLen }));
    console.log('  请求流水：' + (final.net.length ? final.net.join(' ｜ ') : '（一个都没发出去）'));
    if (final.slow.length) console.log('  慢资源（>2s）：\n     ' + final.slow.join('\n     '));
    console.log('  弹窗：' + (d.alerts.length ? JSON.stringify(d.alerts) : '无'));
    console.log('  JS 报错：' + (d.errs.length ? JSON.stringify(d.errs, null, 1) : '无'));
    await L.shot(m, path.join(OUT, KEY, 'final.png'));
    console.log(`  截图：${path.join(OUT, KEY, 'final.png')}`);
  } finally {
    try { await m.send('WebDriver:DeleteSession', {}, 5000); } catch (e) {}
    child.kill('SIGKILL');
  }
})();

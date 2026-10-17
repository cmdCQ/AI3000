/**
 * 探针 · 六爻页点「自动解析」时到底发了什么给 /api/chat/send
 *
 * 起因：线上自动解析回「我这边还没有收到具体的卦象数据……请随意想三个数字」，
 * 而盘明明排出来了。前端发的 payload 与后端认的字段之间断在哪一环，只有把
 * **实际发出去的请求体**抓下来才知道 —— 读源码会读成「应该是对的」。
 *
 * 做法：劫持 XMLHttpRequest.send（页面用的是 XHR，不是 fetch），把请求体存到
 * window 上，再照常放行。不 mock、不返回值，页面走的是真路径。
 *
 * 用法：TEST_PHONE=… TEST_PASS=… node duipan/probe_liuyao_aipayload.js [url]
 */
'use strict';

const L = require('./drive_lib');

const URL = process.argv[2] || 'https://sqw.somtfly.com/liuyao/';
const PHONE = process.env.TEST_PHONE;
const PASS = process.env.TEST_PASS;

async function main() {
  const { child, m } = await L.launchFirefox({ port: 2832, profilePrefix: 'probe-liuyao-ai' });
  try {
    await L.goto(m, URL, { timeout: 60000 });
    await L.sleep(1500);

    // 登录（同 shot 脚本：Cookie 版）
    if (PHONE && PASS) {
      await L.js(m, `var W = window.wrappedJSObject || window;
        W.__login = 'pending';
        W.fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ phone: ${JSON.stringify(PHONE)}, password: ${JSON.stringify(PASS)} }) })
          .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,d:d}; }); })
          .then(function(x){
            if (!x.ok) { W.__login = 'fail: ' + (x.d && x.d.error); return; }
            W.document.cookie = 'sqw_token=' + encodeURIComponent(x.d.token) + '; path=/; max-age=86400';
            W.document.cookie = 'sqw_username=' + encodeURIComponent(x.d.username) + '; path=/; max-age=86400';
            W.__login = 'ok';
          }).catch(function(e){ W.__login = 'err: ' + e; });
        return 'started';`);
      await L.until(m, `return (window.wrappedJSObject || window).__login;`, (v) => v && v !== 'pending', 15000);
    }

    // 劫持 XHR.send 抓请求体（照常放行 —— 我们要看真路径，不是桩）
    await L.js(m, `var W = window.wrappedJSObject || window;
      W.__sent = [];
      var _send = W.XMLHttpRequest.prototype.send;
      W.XMLHttpRequest.prototype.send = function (body) {
        try { W.__sent.push({ url: this.__u, body: String(body) }); } catch (e) {}
        return _send.apply(this, arguments);
      };
      var _open = W.XMLHttpRequest.prototype.open;
      W.XMLHttpRequest.prototype.open = function (method, url) {
        this.__u = url; return _open.apply(this, arguments);
      };
      return true;`);

    // 起卦（不带事项，不写库）
    const trig = await L.js(m, `var W = window.wrappedJSObject || window;
      if (typeof W.selectMethod !== 'function' || typeof W.startDivination !== 'function') return 'no-fn';
      W.selectMethod('auto', W.document.querySelector('.method-option[data-method="auto"]'));
      W.startDivination();
      return 'ok';`);
    console.log('起卦：' + trig);
    await L.sleep(4000);   // 等排盘 + 自动解析把请求发出去

    const info = await L.js(m, `var W = window.wrappedJSObject || window;
      return {
        conf: !!W.AI_PANEL_CONF,
        cardType: (W.AI_PANEL_CONF || {}).cardType,
        hasChart: typeof W.AI_PANEL_CONF !== 'undefined' && W.AI_PANEL_CONF.hasChart ? W.AI_PANEL_CONF.hasChart() : null,
        currentChart: !!W.currentChart,
        payload: typeof W.buildLiuyaoAiPayload === 'function'
          ? JSON.stringify(W.buildLiuyaoAiPayload()) : 'no-buildLiuyaoAiPayload',
        sent: (W.__sent || []).map(function (s) { return { url: s.url, body: s.body.slice(0, 1200) }; }),
      };`);

    console.log('\n=== AI_PANEL_CONF ===');
    console.log('  存在: ' + info.conf + '   cardType: ' + JSON.stringify(info.cardType)
      + '   hasChart(): ' + info.hasChart);
    console.log('  currentChart 有值: ' + info.currentChart);
    console.log('\n=== buildLiuyaoAiPayload() ===');
    console.log('  ' + info.payload);
    console.log('\n=== 实际发出的 XHR（' + info.sent.length + ' 条）===');
    for (const s of info.sent) {
      console.log('  → ' + s.url);
      console.log('    ' + s.body.replace(/\\n/g, '\n    '));
    }
  } finally {
    try { await m.send('WebDriver:DeleteSession', {}, 5000); } catch (e) {}
    child.kill('SIGKILL');
  }
}

main().catch((e) => { console.error('❌ ' + (e && e.stack || e)); process.exit(1); });

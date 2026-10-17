/**
 * 一次性探针：**线上**站点的 `/my-charts/` 在「游客」状态下到底渲染了什么。
 *
 * 起因：`drive_bazi_page.js` 用例⑦（游客不许看盘）在新 React 版上报
 * `#mc-content` 的 innerText 是空串。要分清是「门禁松了」「页面报错了」还是「驱动读早了」，
 * 光看断言认不出，得把现场 dump 出来。
 *
 * 用法：node duipan/probe_guest_my_charts.js [url]
 */
'use strict';

const L = require('./drive_lib');

const TARGET = process.argv[2] || 'https://sqw.somtfly.com/my-charts/?id=x';
const PORT = 8895;
const MARIONETTE_PORT = 2834;

(async () => {
  const { child, m } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'probe-guest' });
  try {
    // 先落到本站，才能把 cookie 摘干净
    await L.goto(m, new URL(TARGET).origin + '/');
    await L.js(m, `document.cookie='sqw_username=; path=/; max-age=0';
      document.cookie='sqw_token=; path=/; max-age=0';
      try{localStorage.clear();}catch(e){} return document.cookie;`);

    await L.goto(m, TARGET);
    await L.sleep(1200);

    const out = await L.js(m, `var W = window.wrappedJSObject || window;
      var el = document.getElementById('mc-content');
      return {
        href: location.href,
        cookie: document.cookie,
        rootExists: !!document.getElementById('root'),
        rootChildren: (document.getElementById('root')||{}).childElementCount,
        mcContentExists: !!el,
        mcContentHTML: el ? String(el.innerHTML).slice(0, 300) : null,
        mcContentText: el ? String(el.innerText||'').slice(0, 120) : null,
        bodyText: String(document.body.innerText||'').replace(/\\s+/g,' ').slice(0, 200),
        errs: (W.__errs||[]).slice(0,5),
        typeofIsLoggedIn: 'n/a',
        auth: typeof W.AUTH,
        chartsStore: typeof W.ChartsStore,
      };`);
    console.log(JSON.stringify(out, null, 2));
    const diag = await L.diagnostics(m);
    console.log('diagnostics:', JSON.stringify(diag));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
  }
})();

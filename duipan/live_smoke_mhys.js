/**
 * 线上探针 · 梅花页（真 nginx + 真后端 + 真 /api/meihua/paipan）
 * ==========================================================================
 *
 * 与 `live_smoke_liuyao.js` 同一目的、同一套做法，分开成两支是因为两者要跑的东西不同，
 * 各自的失败要能单独定位。**这一支存在的直接原因**：六爻那次上线动了四个**共享件**
 * （`ui_common.js` / `ai_panel.js` / `mhys_ai_panel.js` / `mhys_render.js`）与
 * `mhys/index.html`、`mhys/result.html` —— 本机梅花驱动跑绿了，但它跑的是本机静态目录，
 * 证明不了「线上这几份文件一起发出去之后梅花页还是好的」。共享件改动的风险恰恰在这里：
 * 一个 404 或一个加载顺序错，页面不报错，只是**静静地不动**。
 *
 * 对线上**只读**：事项留空故不存记录；先置游客标记，让自动解读走登录引导而不真调大模型。
 *
 * 用法：node duipan/live_smoke_mhys.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题
 */

'use strict';

const L = require('./drive_lib');

const BASE = process.env.BASE || 'https://sqw.somtfly.com';
const MARIONETTE_PORT = 2834;

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

const js = L.js;
const W = L.W;

/**
 * 共享件是否就位（必须带 `W.`：沙箱是 Xray 视角，页面 function 全局一律看不见）。
 * 容器 id 要传进来 —— 排盘页是 `#resultArea`，结果页是 `#contentArea`，
 * 写死一个就会在另一张页面上报出一个**它本来就不该有**的东西。
 */
const partsExpr = (keys, container) => `${W}
  return ${JSON.stringify(keys)}.map(function(k){ return k + ':' + (typeof W[k]); })
    .concat(['aiPanel:' + (document.getElementById('aiPanel') ? 'yes' : 'no'),
             ${JSON.stringify(container)} + ':' + (document.getElementById(${JSON.stringify(container)}) ? 'yes' : 'no')]).join(' ');`;
const partsOk = (s) => !/:undefined/.test(s) && !/:no/.test(s);

async function main() {
  const { child, m, prof } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'live-mhys' });
  try {
    console.log(`\n① 线上梅花页（${BASE}/mhys/index.html）：共享件都发上去了没`);
    await L.goto(m, `${BASE}/mhys/index.html`);
    await js(m, `window.localStorage.setItem('mhys_anon_used', '1'); return true;`);

    const parts = await L.until(m, partsExpr(['escHtml', 'toggleAIPanel', 'renderResult',
      'selectMethod', 'startDivination'], 'resultArea'), partsOk, 8000, 150);
    check('页面共享件都到位了（这几个有一个 404 就会在这里露出来）', partsOk(parts), parts);

    console.log('\n② 报数起卦（386；事项留空 → 不存记录）：卦交后端算，页面只渲染');
    await js(m, `document.getElementById('numberInput').value = '386'; return true;`);
    await js(m, `document.getElementById('startBtn').click(); return true;`);

    const flat = (await L.textOf(m, '#resultArea', 15000, 30)).replace(/\s+/g, ' ');
    console.log('   · 线上正文：' + JSON.stringify(flat.slice(0, 160)));

    check('五卦齐（本卦/互卦/变卦/错卦/综卦）—— 这五卦只有后端有',
      /本卦/.test(flat) && /互卦/.test(flat) && /变卦/.test(flat)
        && /错卦/.test(flat) && /综卦/.test(flat),
      JSON.stringify(flat.slice(0, 260)));
    check('体用与判词在（体用生克是后端判的，页面不算）',
      /体/.test(flat) && /用/.test(flat) && /(吉|凶|平)/.test(flat),
      JSON.stringify(flat.slice(0, 300)));
    check('排盘信息卡在（日期/四柱等）', /排盘信息/.test(flat), JSON.stringify(flat.slice(0, 200)));
    check('样式生效（卡片有边框）',
      await js(m, `var c = document.querySelector('.card');
        return !!c && getComputedStyle(c).borderTopWidth !== '0px';`), '样式没生效');
    check('结果出来后面板自动打开，且走到的是登录引导（游客额度已用完）而不是真调大模型',
      await L.panelOpen(m)
        && await js(m, `var r = document.getElementById('aiResponse');
            return !!r && /登录/.test(r.textContent || '');`),
      await js(m, `var r = document.getElementById('aiResponse');
        return '内容=' + JSON.stringify(r ? (r.textContent || '') : '(无)');`));
    check('整串流程没有 JS 报错',
      (await L.diagnostics(m)).errs.length === 0,
      JSON.stringify((await L.diagnostics(m)).errs).slice(0, 300));

    console.log('\n③ 线上梅花结果页：取不到记录时不许白屏（线上 script 链通不通）');
    await L.goto(m, `${BASE}/mhys/result.html?id=1`);
    const rtext = (await L.textOf(m, '#contentArea', 15000, 10)).replace(/\s+/g, ' ');
    check('取不到记录时给的是明确提示而不是白屏',
      /失败|不存在|登录|没有|错误/.test(rtext), JSON.stringify(rtext.slice(0, 200)));
    const rparts = await L.until(m, partsExpr(['escHtml', 'renderResult', 'toggleAIPanel'], 'contentArea'),
      partsOk, 8000, 150);
    check('结果页共享件也都在', partsOk(rparts), rparts);
    check('结果页没有 JS 报错',
      (await L.diagnostics(m)).errs.length === 0,
      JSON.stringify((await L.diagnostics(m)).errs).slice(0, 300));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    try { require('fs').rmSync(prof, { recursive: true, force: true }); } catch (e) { /* 临时目录 */ }
  }

  console.log(fails.length
    ? `\n❌ 线上梅花探针：${fails.length} 项失败\n   ` + fails.join('\n   ')
    : '\n✅ 线上梅花探针：全部通过（真 nginx + 真后端；对线上只读）');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error('❌ 探针自身出错：', e); process.exit(2); });

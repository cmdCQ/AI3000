/**
 * 线上探针 · 八字详情页（真 nginx + 真后端 + 真账号登录）
 * ==========================================================================
 *
 * 为什么要有它：八字这条线**整页要求登录**（2026-09-25 用户拍板），所以
 * `drive_bazi_page.js` 一直只能在**本机静态目录 + 假 cookie（sqw_username=alice）**上跑。
 * 那条路证明不了三件事，而这三件正是这次上线最容易翻车的地方：
 *
 *  ① **登录之后拿到的盘**：真账号名下有多份命盘，`?id=` 选中的是你自己的那一份，
 *     页面走的是「带 Bearer 取盘 → 排盘 → 渲染」真链路（本机驱动喂的是切片夹具）。
 *  ② **线上那份 JS 是不是刚传的这一份**：nginx 根是另一份拷贝，传漏一个文件、
 *     路径被别的 location 截走，本地全绿而线上照旧跑旧版。
 *  ③ **真机宽度下的版面**：本地断言里 390×844 是量过的，但那是在桩数据上；
 *     真盘的字段（真太阳时/出生地区/古法参看）可能多几行，把 AI 块重新顶下去。
 *
 * 对线上**只读**：只登录、取盘、量版面、截图。**绝不点「解读这一方面」**
 * —— 那是真调大模型（花用户的钱）并且会写一条记录。
 *
 * 用法：
 *   node duipan/live_smoke_bazi_detail.js
 *   账号来源：环境变量 AI3000_TEST_PHONE / AI3000_TEST_PW，
 *   缺省回落到 /tmp/ai3000_testacct（第 1 行手机号、第 2 行密码；**不进仓库**）。
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题
 */

'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');

const BASE = process.env.BASE || 'https://sqw.somtfly.com';
const MARIONETTE_PORT = 2834;
const SHOT_DIR = '/tmp/bazi-drive';

function account() {
  if (process.env.AI3000_TEST_PHONE && process.env.AI3000_TEST_PW) {
    return { phone: process.env.AI3000_TEST_PHONE, pw: process.env.AI3000_TEST_PW };
  }
  const f = '/tmp/ai3000_testacct';
  if (!fs.existsSync(f)) {
    console.error(`❌ 没有测试账号：设 AI3000_TEST_PHONE / AI3000_TEST_PW，或建 ${f}（两行）`);
    process.exit(2);
  }
  const [phone, pw] = fs.readFileSync(f, 'utf8').split('\n').map((s) => s.trim());
  return { phone, pw };
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

const js = L.js;
const W = L.W;

async function main() {
  const acc = account();
  const { child, m, prof } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'live-bazi' });
  try {
    // ── ① 登录（走页面自己的那套：真 fetch + 真 cookie）──────────────────
    console.log(`\n① 登录（${BASE}；账号来自 ${process.env.AI3000_TEST_PHONE ? '环境变量' : '/tmp/ai3000_testacct'}）`);
    await L.goto(m, `${BASE}/`);
    const login = await js(m, `${W}
      return fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ${JSON.stringify(acc.phone)}, password: ${JSON.stringify(acc.pw)} }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
        .catch(function (e) { return { ok: false, status: 0, err: String(e) }; });`, null, 20000);
    check('登录接口返回了 token', !!(login && login.ok && login.d.token),
      JSON.stringify(login && (login.d || login.err)).slice(0, 200));
    if (!login || !login.ok || !login.d.token) throw new Error('登录失败，后面的都无从谈起');
    await js(m, `${W}
      document.cookie = 'sqw_token=' + encodeURIComponent(${JSON.stringify(login.d.token)}) + '; path=/; max-age=86400';
      document.cookie = 'sqw_username=' + encodeURIComponent(${JSON.stringify(login.d.username || '')}) + '; path=/; max-age=86400';
      return document.cookie;`);

    // ── ② 取一份真命盘 ──────────────────────────────────────────────────
    console.log('\n② 取这个账号名下的一份真命盘');
    const charts = await js(m, `${W}
      return fetch('/api/charts', { headers: { Authorization: 'Bearer ' + ${JSON.stringify(login.d.token)} } })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
        .catch(function (e) { return { ok: false, status: 0, err: String(e) }; });`, null, 20000);
    const list = (charts && charts.ok && (charts.d.charts || charts.d.list || charts.d)) || [];
    check('拿到命盘列表且至少一份', Array.isArray(list) && list.length > 0,
      JSON.stringify(charts && charts.d).slice(0, 300));
    if (!Array.isArray(list) || !list.length) throw new Error('没有命盘，先去 /charts/ 新建一份再来');
    const chart = list[0];
    console.log(`   · 用第 1 份：id=${chart.id} ${chart.name || ''} ${chart.bazi || ''}`);

    // ── ③ 详情页：盘真的画出来了 ────────────────────────────────────────
    console.log('\n③ 详情页（${BASE}/my-charts/?id=）画出了真盘');
    await L.goto(m, `${BASE}/my-charts/?id=${encodeURIComponent(chart.id)}`);
    const ready = await L.until(m, `${W}
      var c = document.getElementById('baziChart');
      return { hero: !!document.querySelector('#baziChart .bz-hero'),
               heroText: (c && c.innerText ? c.innerText : '').replace(/\\s+/g, ''),
               ai: !!document.getElementById('baziAiSec'),
               asp: document.querySelectorAll('#baziAspectBar .bz-aspect').length };`,
    (v) => v && v.hero && v.ai && v.asp === 5, 15000, 200);
    check('四柱 hero 画出来了', !!(ready && ready.hero), JSON.stringify(ready));
    check('五颗方面按钮都在（不是只渲染了盘）', ready && ready.asp === 5, JSON.stringify(ready));
    if (!ready || !ready.hero) throw new Error('详情页没渲染出盘（登录态失效？后端挂了？）');
    // 真盘的八个字：形如「癸亥年柱乙丑月柱…」，四个「柱」字都要在
    const zh = (ready.heroText.match(/柱/g) || []).length;
    check('四柱八个字是真的（不是空壳）', zh >= 4 && /年柱|月柱|日柱|时柱/.test(ready.heroText),
      `柱字 ${zh} 个： ${String(ready.heroText).slice(0, 80)}`);

    // ── ④ 真盘下的版面：手机一屏能不能看到 AI 块与按钮 ───────────────────
    console.log('\n④ 手机（390×844）真盘下的版面');
    await L.setWindow(m, 390, 844);
    const lay = await js(m, `${W}
      function top(sel) { var e = document.querySelector(sel); if (!e) return null;
        var r = e.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY),
          h: Math.round(r.height), bottom: Math.round(r.bottom + window.scrollY) }; }
      var chart = document.getElementById('baziChart');
      var rest = document.getElementById('baziRest');
      return { vh: window.innerHeight, docH: document.documentElement.scrollHeight,
        vw: document.documentElement.clientWidth,
        chart: top('#baziChart'), ai: top('#baziAiSec'), bar: top('#baziAspectBar'),
        btn: top('#baziAiArea .ai-start-btn'), rest: top('#baziRest'),
        jiben: top('#baziRest .bz-sec'),
        chartText: chart ? (chart.innerText || '').replace(/\\s+/g, '') : '',
        restText: rest ? (rest.innerText || '').replace(/\\s+/g, '') : '',
        overflow: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth) };`);
    check('AI 块上面只剩四柱（真盘的「基本信息」也没赖在上面）',
      lay.chart && lay.ai && lay.chart.bottom <= lay.ai.top + 1
      && !/基本信息/.test(lay.chartText) && !/四柱细盘/.test(lay.chartText),
      JSON.stringify({ chartText: lay.chartText.slice(0, 60) }));
    check('AI 块在「其余」上面（基本信息/细盘/提要/大运都下去了）',
      lay.ai && lay.rest && lay.ai.bottom <= lay.rest.top + 1,
      JSON.stringify({ ai: lay.ai, rest: lay.rest }));
    check('真盘下第一屏也看得到方面栏与「解读」按钮（不是只露标题）',
      lay.bar && lay.btn && lay.bar.top < lay.vh && lay.btn.top < lay.vh,
      JSON.stringify({ vh: lay.vh, barTop: lay.bar && lay.bar.top, btnTop: lay.btn && lay.btn.top }));
    check('没有横向溢出', lay.overflow <= 0, JSON.stringify({ overflow: lay.overflow, vw: lay.vw }));

    // 按钮在不在、但**绝不点它**（真模型要花钱、还写记录）
    const notClicked = await js(m, `return { pressed: !!document.querySelector('#baziAiArea .ai-start-btn.pressed'),
      hasPanel: !!document.getElementById('aiPanel') };`);
    check('探针没有去点「解读」（只读；真调大模型是要花钱的）',
      notClicked.pressed === false, JSON.stringify(notClicked));

    const s1 = await L.shot(m, path.join(SHOT_DIR, 'live-390-firstscreen.png'), { full: false });
    await L.setWindow(m, 1100, 900);
    const s2 = await L.shot(m, path.join(SHOT_DIR, 'live-1100.png'), { full: true });
    console.log(`   · 截图：${s1.file}（首屏） ${s2.file}（整篇）`);

    // ── ⑤ 零 JS 报错 ────────────────────────────────────────────────────
    const errs = await js(m, `return { errs: (window.wrappedJSObject || window).__errs || [],
      alerts: (window.wrappedJSObject || window).__alerts || [] };`);
    check('页面零未捕获异常', errs.errs.length === 0, JSON.stringify(errs.errs).slice(0, 300));
    check('没有 alert 弹窗', errs.alerts.length === 0, JSON.stringify(errs.alerts).slice(0, 200));
  } finally {
    try { child.kill('SIGKILL'); } catch (e) {}
    try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('');
  if (fails.length) {
    console.log(`❌ 线上八字详情页探针：${fails.length} 项失败：`);
    fails.forEach((f) => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('✅ 线上八字详情页探针全绿（真 nginx + 真后端 + 真账号；只读，未消耗 token）');
}

main().catch((e) => { console.error('❌ ' + (e && e.stack || e)); process.exit(1); });

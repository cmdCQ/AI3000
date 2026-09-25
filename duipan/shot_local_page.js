/**
 * 本地截图验收 · 六爻页 / 梅花页（同一个脚本，别各写一份）
 * ==========================================================================
 *
 * 起因：用户报「六爻前端显示问题很大」。截图看出两件事，两边都要验：
 *  ① **AI 面板糊在盘上面** —— 面板从 `position:fixed` 浮层改成正文流里的卡片，
 *     要用几何量一遍：面板矩形与卦象表矩形**不许重叠**，且面板 position=static。
 *  ② **无事项时盘面被丢掉** —— 断言桩收到的 cardData 带起卦结果，并把它喂给
 *     与线上同一套模板渲染，检查 `{{paipan}}` 那一块真有内容。
 *
 * 本机静态目录 + **真排盘/真模板**（`build/backend/paipan/*`），只有 AI 那一段是桩
 * （省 token，形状与线上一致：裸文本 + token 尾巴）。
 *
 * 用法：node duipan/shot_local_page.js [liuyao|mhys|both]
 * 退出码：0 = 全过；1 = 有不过
 */
'use strict';

const fs = require('fs');
const path = require('path');
const L = require('./drive_lib');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'build', 'nginx');
const PORT = 8901;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const P = require(path.join(ROOT, 'build', 'backend', 'paipan', 'prompt.js'));
const LY = require(path.join(ROOT, 'build', 'backend', 'paipan', 'liuyao.js'));

// 每次 AI 请求的请求体（两页共用一条桩）
let chatBodies = [];

async function api(req, res, pathname) {
  if (pathname === '/api/login') return L.sendJson(res, { token: 'stub', username: 'stubuser' });
  if (/-records$/.test(pathname)) return L.sendJson(res, { id: 1 });

  if (pathname === '/api/liuyao/paipan' && req.method === 'POST') {
    const b = await L.readBody(req);
    const hx = b.hexagrams || {}, li = b.lunarInfo || {};
    try {
      const chart = LY.buildChart({
        topic: b.topic || '', gender: b.gender || 'male',
        benUpper: hx.benGua.upper, benLower: hx.benGua.lower,
        bianUpper: hx.bianGua.upper, bianLower: hx.bianGua.lower,
        yearGZ: li.yearGZ, monthGZ: li.monthGZ, dayGZ: li.dayGZ, hourGZ: li.hourGZ,
      });
      const disp = LY.buildDisplay ? LY.buildDisplay(chart) : {};
      return L.sendJson(res, { chart: chart, display: disp, text: LY.formatChart(chart) });
    } catch (e) { return L.sendJson(res, { error: String(e && e.message) }, 400); }
  }

  if (pathname === '/api/meihua/paipan' && req.method === 'POST') {
    // 梅花页自己用三个卦号拼五卦（calcGua），故桩只需给这三个数与取数过程
    await L.readBody(req);
    return L.sendJson(res, {
      qigua: { upper_num: 1, lower_num: 2, moving: 3, method: 'time',
        detail: '【时间起卦】年月日时之数和 ÷ 8 取上卦、加时辰数 ÷ 8 取下卦、÷ 6 取动爻' },
      display: {}, text: '',
    });
  }

  if (pathname === '/api/chat/send' && req.method === 'POST') {
    chatBodies.push(await L.readBody(req));
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.write('**【一、回答答案】**\n桩回复：盘已收到。\n\n');
    res.write('**【三、解卦逻辑】**\n桩第二段。\n');
    res.write('\n消耗 Token：输入 100 + 输出 20 = 120 ｜ 剩余：测试');
    return res.end();
  }
  return false;
}

function render(tpl, vars) {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

const PAGES = {
  liuyao: {
    path: '/liuyao/', name: '六爻',
    start: `var W = window.wrappedJSObject || window;
      W.selectMethod('auto', W.document.querySelector('.method-option[data-method="auto"]'));
      W.startDivination(); return true;`,
    // 无事项时该走哪条模板 + 盘面里必须出现的字
    notopic: () => P.DEFAULT_LIUYAO_NOTOPIC,
    vars: (cd) => P.liuyaoVars(cd.topic || '', cd, ''),
    need: ['本卦', '六亲', '纳甲', '世', '应'],
  },
  mhys: {
    path: '/mhys/', name: '梅花',
    // ⚠ 梅花默认起卦法是 `number`（报数），不先切成 `time` 就会弹「请输入数字」
    // 然后什么都不排（第一版就是这么假失败的：盘没出来，看着像页面坏了）。
    start: `var W = window.wrappedJSObject || window;
      W.selectMethod('time', W.document.querySelector('.method-option[data-method="time"]'));
      W.startDivination(); return true;`,
    notopic: () => P.DEFAULT_MHYS_NOTOPIC,
    vars: (cd) => P.mhysVars(cd.topic || '', cd, ''),
    need: ['本卦', '互卦', '变卦', '体', '用'],
  },
};

async function run(m, key) {
  const Pg = PAGES[key];
  const OUT = `/tmp/shots/local-${key}`;
  fs.mkdirSync(OUT, { recursive: true });
  let ok = true;

  for (const vp of [{ n: 'desktop', w: 1280, h: 900 }, { n: 'narrow', w: 500, h: 900 }]) {
    await L.setWindow(m, vp.w, vp.h);
    await L.goto(m, ORIGIN + Pg.path, { timeout: 30000 });
    await L.sleep(600);
    await L.js(m, `document.cookie='sqw_token=stub; path=/';
      document.cookie='sqw_username=stubuser; path=/'; return true;`);
    await L.js(m, Pg.start);
    await L.until(m, 'return document.body.innerText.length;', (n) => n > 1200, 15000);
    await L.sleep(1500);

    const box = await L.js(m, `var W = window.wrappedJSObject || window;
      function R(sel){ var e=W.document.querySelector(sel); if(!e) return null;
        var r=e.getBoundingClientRect(); return {y:Math.round(r.top),b:Math.round(r.bottom),
          x:Math.round(r.left),w:Math.round(r.width)}; }
      var p = W.document.getElementById('aiPanel');
      return { pan:R('#aiPanel'), table:R('#resultArea table'),
        inline: !!(p && p.classList.contains('inline')),
        pos: p ? W.getComputedStyle(p).position : null,
        parent: p && p.parentNode ? (p.parentNode.id || p.parentNode.tagName) : null,
        docH: W.document.documentElement.scrollHeight,
        text: (W.document.body.innerText||'').replace(/\\n{2,}/g,'\\n').slice(0,400) };`);

    await L.shot(m, path.join(OUT, `1-${vp.n}.png`));
    const ov = (box.pan && box.table)
      ? Math.max(0, Math.min(box.pan.b, box.table.b) - Math.max(box.pan.y, box.table.y)) : 0;
    const pass = box.pos === 'static' && box.inline && ov === 0;
    if (!pass) ok = false;
    console.log(`[${Pg.name}/${vp.n}] 面板 position=${box.pos} inline=${box.inline} 父=${box.parent}`
      + ` | 面板 y=${box.pan && box.pan.y}..${box.pan && box.pan.b}`
      + ` | 表 y=${box.table && box.table.y}..${box.table && box.table.b}`
      + ` | 重叠=${ov}px  ${pass ? '✅' : '❌'}`);
    if (vp.n === 'narrow') fs.writeFileSync(path.join(OUT, '正文.txt'), box.text, 'utf8');
  }

  // token 尾巴不该出现在正文里
  const trailShown = await L.js(m, `var t = document.getElementById('aiResponse').innerText || '';
    return t.indexOf('消耗 Token') >= 0;`);
  console.log(`[${Pg.name}] 正文里出现 token 尾巴: ${trailShown ? '❌ 是' : '✅ 否'}`);
  if (trailShown) ok = false;

  // ── 无事项时喂给 AI 的 prompt 里有没有盘面 ──
  const body = chatBodies[chatBodies.length - 1];
  const cd = body && body.cardData;
  const hasGua = !!(cd && cd.hexagrams && cd.hexagrams.benGua
    && Number.isInteger(cd.hexagrams.benGua.upper));
  console.log(`[${Pg.name}] cardType=${body && body.cardType} cardData 带卦号=${hasGua ? '✅' : '❌'}`);
  if (!hasGua) return false;
  const out = render(Pg.notopic(), Pg.vars(cd));
  const miss = Pg.need.filter((k) => out.indexOf(k) < 0);
  console.log(`[${Pg.name}] 无事项 user prompt ${out.length} 字，盘面要素 `
    + `${Pg.need.length - miss.length}/${Pg.need.length}${miss.length ? ' ❌ 缺 ' + miss.join('、') : ' ✅'}`);
  if (miss.length) ok = false;
  fs.writeFileSync(path.join(OUT, 'prompt-notopic.txt'), out, 'utf8');
  return ok;
}

async function main() {
  const want = process.argv[2] || 'both';
  const keys = want === 'both' ? ['liuyao', 'mhys'] : [want];
  const server = await L.startServer({ port: PORT, origin: ORIGIN, web: WEB, api });
  const { child, m } = await L.launchFirefox({ port: 2834, profilePrefix: 'shot-local' });
  let ok = true;
  try {
    for (const k of keys) {
      chatBodies = [];
      ok = (await run(m, k)) && ok;
      console.log('');
    }
  } finally {
    try { await m.send('WebDriver:DeleteSession', {}, 5000); } catch (e) {}
    child.kill('SIGKILL');
    server.close();
  }
  console.log(ok ? '✅ 本地验收通过' : '❌ 本地验收不通过');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('❌ ' + (e && e.stack || e)); process.exit(2); });

/**
 * 线上探针 · 六爻页（真 nginx + 真后端 + 真 /api/liuyao/paipan）
 * ==========================================================================
 *
 * 为什么要有它：`drive_liuyao_page.js` 跑的是**本机**静态目录 + 切片出来的端点，
 * 它证明的是「仓库里这份代码对」。线上还有三件它管不到的事：
 *
 *  ① **发的是不是这份**：nginx 的根是另一份拷贝，传漏一个文件、路径被别的 location
 *     截走，本地全绿而线上照旧跑旧版。
 *  ② **后端在不在**：`display`（农历/节气/旬空/神煞/变卦整列）是本次新加的字段。
 *     后端没部署或没重启的话，页面不报错，只是那几行**静静地不出现** —— 看着像
 *     「这一卦就是没有神煞」。
 *  ③ **容器里的依赖版本**：本机没有 node_modules，端点是切片求值的；线上跑的是
 *     真 require，历法口径若与本地不同，卦就是另一个。
 *
 * 对线上**只读**：事项留空 → 页面不存记录；并把游客标记先置上，让「结果出来自动
 * 解读」走到登录引导而不是真去调一次大模型（那是要花钱的，探针不该有副作用）。
 *
 * 用法：node duipan/live_smoke_liuyao.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 环境问题（起不来浏览器 / 线上打不开）
 */

'use strict';

const L = require('./drive_lib');

const BASE = process.env.BASE || 'https://sqw.somtfly.com';
const MARIONETTE_PORT = 2830;

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// 与 drive_liuyao_page.js 同一份手算：初爻老阳，其余 少阴 少阴 少阳 少阴 少阳
// 阳阴 1,0,0,1,0,1 → 下 100=4震、上 101=3离 → 火雷噬嗑；初爻动 → 变 上3下8 = 火地晋
const MANUAL_A = ['laoyang', 'shaoyin', 'shaoyin', 'shaoyang', 'shaoyin', 'shaoyang'];

const js = L.js;
const W = L.W;

async function main() {
  const { child, m, prof } = await L.launchFirefox({ port: MARIONETTE_PORT, profilePrefix: 'live-liuyao' });
  try {
    console.log(`\n① 线上排盘页（${BASE}/liuyao/index.html）：跑的是不是新那份`);
    await L.goto(m, `${BASE}/liuyao/index.html`);
    // 先置游客标记：结果出来会自动开始解读，置上它就走到登录引导，
    // 不真调大模型（探针不该花用户的钱、也不该留下记录）
    await js(m, `window.localStorage.setItem('liuyao_anon_used', '1'); return true;`);

    // 注意每处都带 `W.`：ExecuteScript 跑在沙箱里是 Xray 视角，页面用 `function f(){}`
    // 定义的全局在这边**一律是 undefined**（第一版这行就是这么误报的）。
    // 并且**轮询**而不是只看一眼：body 末尾那几个脚本与这里是有先后的。
    const parts = await L.until(m, `${W}
      return ['escHtml','toggleAIPanel','renderLiuyaoResult','castToTrigrams','startDivination']
        .map(function(k){ return k + ':' + (typeof W[k]); })
        .concat(['aiPanel:' + (document.getElementById('aiPanel') ? 'yes' : 'no'),
                 'resultArea:' + (document.getElementById('resultArea') ? 'yes' : 'no')]).join(' ');`,
    (s) => !/:undefined/.test(s) && !/:no/.test(s), 8000, 150);
    check('页面上的共享件都到位了（11 个文件有一个 404 就会在这里露出来）',
      !/:undefined/.test(parts) && !/:no/.test(parts), parts);

    const gone = await js(m, `${W}
      return ['calcGua','HEX64','TRIGRAMS','NAJIA','getGuaShen','getPalaceInfo','buildPalaceTable']
        .map(function(k){ return k + ':' + (typeof W[k]); }).join(' ');`);
    check('线上跑的确实是新那份（旧装卦代码全不在）', !/:function|:object/.test(gone), gone);

    console.log('\n② 起一卦（手动指定，事项留空 → 不存记录）：盘面来自真后端');
    await js(m, `${W}
      var el = document.querySelector('.method-option[data-method="manual"]');
      W.selectMethod('manual', el); return true;`);
    await L.sleep(250);   // 等 fillManualLineSelects 那 50ms 的定时器跑完再写
    await js(m, `${W} W.MANUAL_LINES = arguments[0].slice(); W.renderManualLines(); return true;`, [MANUAL_A]);
    await js(m, `document.getElementById('startBtn').click(); return true;`);

    const text = await L.textOf(m, '#resultArea', 15000, 30);
    const flat = text.replace(/\s+/g, ' ');
    console.log('   · 线上正文：' + JSON.stringify(flat.slice(0, 150)));

    check('本卦名 火雷噬嗑、变卦名 火地晋（卦名只有后端有表）',
      /火雷噬嗑/.test(flat) && /火地晋/.test(flat), JSON.stringify(flat.slice(0, 220)));
    check('**神煞行在**（display 的字段；后端没部署/没重启时这一行会静静地不出现）',
      /神煞/.test(flat) && /卦身--/.test(flat) && /驿马--/.test(flat),
      JSON.stringify(flat.slice(0, 300)));
    check('**空亡行在**且是四格（四柱各起旬）',
      /空亡/.test(flat) && /[子丑寅卯辰巳午未申酉戌亥]{2}/.test(flat),
      JSON.stringify(flat.slice(0, 300)));
    check('**农历与节气行在**（都由后端 display 给）',
      /农历|[正一二三四五六七八九十冬腊]月[初十廿卅]/.test(flat) && /节气/.test(flat),
      JSON.stringify(flat.slice(0, 300)));
    check('盘面 9 列（含变卦列；后端不给 bianLines 时会退成 5 列）',
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : 0;`) === 9,
      await js(m, `var p = document.querySelector('.ly-pan');
        return p ? getComputedStyle(p).gridTemplateColumns : '(无盘面)';`));
    // ⚠ 这条原先证的是 `.ly-bar` —— **那个类名早就没了**，故它从「爻符修好那天」起
    // 就恒红（线上探针里躺了一条永远为假的红，比没有更坏：真回归来了也看不出来）。
    // 2026-09-25 实测：`liuyao_render.js` 的爻符现在写的是 `.yao-line.yao-yang` /
    // `.yao-line.yao-yin`（`ly-bar` 那份 CSS 全站从来没有过，正是「阳爻根本不显示」
    // 那个 bug 的成因）。故改证真类名，且**证高度而不是宽度** ——
    // 当初的病就是「有底色、高 0」，宽度断言抓不到它。
    const sty = await js(m, `var c = document.querySelector('.card');
      var y = document.querySelector('.yao-line.yao-yang') || document.querySelector('.yao-line.yao-yin');
      var r = y ? y.getBoundingClientRect() : null;
      return { card: !!c, border: c ? getComputedStyle(c).borderTopWidth : null,
               yao: !!y, h: r ? Math.round(r.height) : null, w: r ? Math.round(r.width) : null };`);
    check('样式生效（卡片有边框 + 爻符**有高度** —— 「阳爻根本不显示」那个病就是高度为 0）',
      sty.card && sty.border !== '0px' && sty.yao && sty.h > 0,
      JSON.stringify(sty));
    // 用 textContent 不用 innerText：后者在元素不可见时返回空串，那样这条会在
    // 「面板没自动打开」和「额度判定失效」之间分不清是哪个，而这两件事的处置完全不同。
    check('结果出来后面板自动打开，且走到的是登录引导（游客额度已用完）而不是真调大模型',
      await L.panelOpen(m)
        && await js(m, `var r = document.getElementById('aiResponse');
            return !!r && /登录/.test(r.textContent || '');`),
      await js(m, `var r = document.getElementById('aiResponse');
        return '内容=' + JSON.stringify(r ? (r.textContent || '') : '(无)');`));
    check('整串流程没有 JS 报错',
      (await L.diagnostics(m)).errs.length === 0,
      JSON.stringify((await L.diagnostics(m)).errs).slice(0, 300));

    console.log('\n③ 线上结果页（历史记录入口）：拿一条记录看它能不能装出盘');
    // 记录 id 从历史接口要（走页面自己的鉴权路径：未登录只读得到匿名记录）。
    // 把原始应答一并带回来 —— 否则「接口 401／挂了」与「确实没有匿名记录」都表现为
    // 同一个空数组，这一节会**静默跳过**，看着像通过。
    const raw = await js(m, `return fetch('/api/liuyao-records').then(function(r){
        return r.text().then(function(t){ return { status: r.status, body: t.slice(0, 160) }; });
      }).catch(function(e){ return { status: 0, body: 'ERR ' + e.message }; });`);
    let rid = '';
    try {
      const arr = JSON.parse(raw.body);
      if (Array.isArray(arr) && arr.length) rid = arr[0].id;
    } catch (e) { /* 下面按 raw 报出来 */ }
    if (rid) {
      await L.goto(m, `${BASE}/liuyao/result.html?id=${rid}`);
      const rtext = (await L.textOf(m, '#contentArea', 15000, 30)).replace(/\s+/g, ' ');
      check('结果页把这条记录装出盘了（不是「装卦失败」）',
        !/装卦失败|加载失败|不存在/.test(rtext) && /本卦|用神/.test(rtext),
        JSON.stringify(rtext.slice(0, 240)));
      check('结果页也是九列盘（同一份渲染层）',
        await js(m, `var p = document.querySelector('.ly-pan');
          return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : 0;`) === 9,
        '结果页不是九列');
    } else {
      // 线上没有匿名记录（记录都挂在用户名下，未登录读不到），而**不能为了测这一节往
      // 生产库里写一条垃圾数据**。退一步测「取不到记录时这条路径的表现」：它同样是
      // 线上 nginx + 线上页面脚本，能盖住白屏、脚本没加载、报错吞掉这三类问题。
      await L.goto(m, `${BASE}/liuyao/result.html?id=1`);
      const rtext = (await L.textOf(m, '#contentArea', 15000, 10)).replace(/\s+/g, ' ');
      check('取不到记录时，结果页给的是明确的提示而不是白屏（线上 nginx + 页面脚本这条链是通的）',
        /装卦失败|不存在|登录|没有/.test(rtext), JSON.stringify(rtext.slice(0, 200)));
      // 同 ① 的道理：带 `W.`，且在结果的页面上也确认那几个共享件在（这张页面若有一个
      // script 404，表现同样是「静静的不出现」，不会自己喊）
      const rparts = await L.until(m, `${W}
        return ['escHtml','renderLiuyaoResult','toggleAIPanel']
          .map(function(k){ return k + ':' + (typeof W[k]); }).join(' ')
          + ' contentArea:' + (document.getElementById('contentArea') ? 'yes' : 'no');`,
      (s) => !/:undefined/.test(s) && !/:no/.test(s), 8000, 150);
      check('结果页的共享件也都在（这张页面的 script 链是通的）',
        !/:undefined/.test(rparts) && !/:no/.test(rparts), rparts);
      check('结果页没有 JS 报错',
        (await L.diagnostics(m)).errs.length === 0,
        JSON.stringify((await L.diagnostics(m)).errs).slice(0, 300));
      console.log('   （真记录那一路在本机驱动里已对真端点跑过；线上这一路受限于「读不到别人的记录」）');
    }
  } finally {
    try { child.kill('SIGKILL'); } catch (e) { /* 已退出 */ }
    try { require('fs').rmSync(prof, { recursive: true, force: true }); } catch (e) { /* 临时目录 */ }
  }

  console.log(fails.length
    ? `\n❌ 线上探针：${fails.length} 项失败\n   ` + fails.join('\n   ')
    : '\n✅ 线上探针：全部通过（真 nginx + 真后端；对线上只读，未存记录、未调大模型）');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error('❌ 探针自身出错：', e); process.exit(2); });

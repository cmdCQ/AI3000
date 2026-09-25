/**
 * 冒烟 · 排盘端点 `/api/meihua/paipan`、`/api/liuyao/paipan`
 * ==========================================================================
 *
 * 这两个端点存在的意义：前端**只渲染**，排盘一律后端算。所以前端会拿到
 * `chart`（分层渲染用）与 `text`（与 AI 读到的排盘正文逐字相同的那一份）。
 * 本脚本验的就是这两条承诺。
 *
 * **它不覆盖什么**（别把这份绿当成上线没问题）：
 *   · 真 http server / 路由分发 / nginx 反代 —— 本地无 node_modules，起不了完整后端
 *   · 鉴权、限流、CORS —— 这两个端点匿名可用，本就没走那套
 *   · 线上容器里的 `lunar-javascript` 版本与本地是否一致
 * 它验的是端点**函数体本身**：状态码、字段名、以及「text 与 AI 收到的正文同一份」。
 *
 * 做法与 `verify_prompt_refactor.js` 同：从 `auth-server.js` 切出端点那一段原文，
 * `new Function` 求值，`json` 换成捕获用的桩。切片标记失效时**报错退出**，
 * 不静默跳过 —— 静默跳过等于这份冒烟从此永远绿。
 *
 * 用法：node duipan/smoke_paipan_endpoints.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 取不到源码
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const promptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'prompt.js'));
const LY = require(path.join(ROOT, 'build', 'backend', 'paipan', 'liuyao.js'));
const M = require(path.join(ROOT, 'build', 'backend', 'paipan', 'meihua.js'));

const A = "  if (req.method === 'POST' && (pathname === '/api/meihua/paipan'";
const B = '  // POST /api/chat/send';

function loadEndpoint() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const i = src.indexOf(A);
  const j = src.indexOf(B);
  if (i < 0 || j < 0 || j <= i) {
    console.error(`❌ 取不到排盘端点段（标记 ${i < 0 ? `缺「${A.slice(0, 40)}…」` : ''}`
      + `${j < 0 ? `缺「${B}」` : ''}）。auth-server.js 结构变了？请更新本脚本的切片标记。`);
    process.exit(2);
  }
  const slice = src.slice(i, j);
  for (const want of ['/api/meihua/paipan', '/api/liuyao/paipan']) {
    if (!slice.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」—— 切片标记已失效，拒绝在残缺代码上冒烟。`);
      process.exit(2);
    }
  }
  return new Function('req', 'res', 'body', 'pathname', 'json', 'promptLib', 'liuyaoPaipan',
    slice + '\n;return false;');
}

const run = loadEndpoint();

// 每次调用换一份新的 res/json 捕获器 —— 复用会让上一条用例的残留混进来。
function call(pathname, body) {
  const out = { status: null, payload: null, called: false };
  const res = {};
  const json = (r, obj, status) => {
    out.called = true;
    out.status = status || 200;
    out.payload = obj;
    return obj;
  };
  run({ method: 'POST' }, res, body, pathname, json, promptLib, LY);
  return out;
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// ── 梅花 ─────────────────────────────────────────────────────────────
{
  const p = M.analyze(M.fromGua(7, 4, 3), { monthDizhi: '' });
  const g = p.gua;
  const tri = (x) => ({ number: x.number, name: x.name, element: x.wuxing });
  const card = {
    method: 'time', numbers: '7,4,3',
    hexagrams: {
      benGua: { upper: 7, lower: 4, movingYao: p.moving_lines.slice(),
        name: M.hexName(7, 4), upperTri: tri(g.main.upper), lowerTri: tri(g.main.lower) },
      bianGua: { upper: g.changed.upper.number, lower: g.changed.lower.number },
    },
  };
  const r = call('/api/meihua/paipan', card);
  check('梅花：出了响应', r.called, '端点没有调 json()');
  check('梅花：200', r.status === 200, `状态 ${r.status}`);
  check('梅花：有 paipan', !!(r.payload && r.payload.paipan), JSON.stringify(r.payload).slice(0, 120));
  check('梅花：paipan.moving_lines 与卦号对得上',
    !!r.payload && r.payload.paipan && String(r.payload.paipan.moving_lines) === String(p.moving_lines),
    `收到 ${r.payload && r.payload.paipan && r.payload.paipan.moving_lines}`);
  check('梅花：报错走 400 而不是 200',
    (() => { const b = call('/api/meihua/paipan', { hexagrams: {} }); return b.status === 400; })(),
    '缺上下卦号时没回 400');
}

// ── 六爻 ─────────────────────────────────────────────────────────────
{
  const s = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js')).sizhu('2026-05-10T14:30:00');
  const card = {
    topic: '这次合作能不能成',
    hexagrams: {
      benGua: { upper: 5, lower: 1, movingYao: [3] },
      bianGua: { upper: 5, lower: 1 },
      gender: 'male',
    },
    lunarInfo: { yearGZ: s.year_gz, monthGZ: s.month_gz, dayGZ: s.day_gz, hourGZ: s.hour_gz },
    divinationTime: '2026-05-10T14:30:00',
  };
  const r = call('/api/liuyao/paipan', card);
  check('六爻：出了响应', r.called, '端点没有调 json()');
  check('六爻：200', r.status === 200, `状态 ${r.status}`);
  check('六爻：有 chart', !!(r.payload && r.payload.chart), JSON.stringify(r.payload).slice(0, 160));
  check('六爻：有 text', !!(r.payload && r.payload.text), '缺 text');

  // 核心承诺：端点吐给前端的 text，必须与 AI 在 prompt 里读到的那一段**逐字相同**。
  if (r.payload && r.payload.text) {
    const vars = promptLib.liuyaoVars(card.topic, card, '');
    check('六爻：text === prompt 里的 {{paipan}}', r.payload.text === vars.paipan,
      '端点正文与 AI 收到的正文不是同一份 —— 用户看到的盘与 AI 读的盘会对不上');
    check('六爻：text 里出现日辰（有真数据，不是空盘）',
      /月建：|日辰：/.test(r.payload.text), '正文里没有月建/日辰');
    check('六爻：text 里出现六亲', /妻财|官鬼|父母|兄弟|子孙/.test(r.payload.text), '正文里没有六亲');
  }
  check('六爻：装卦失败走 400',
    call('/api/liuyao/paipan', { hexagrams: { benGua: {} } }).status === 400,
    '缺上下卦号时没回 400');
}

if (fails.length) {
  console.log(`\n❌ ${fails.length} 项失败：`);
  for (const f of fails) console.log('   ' + f);
  process.exit(1);
}
console.log('\n✅ 两个端点全绿（注意：不含真 http 服务/鉴权/线上依赖版本，见文件头）');

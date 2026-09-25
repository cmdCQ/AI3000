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
  // 上面这张 card **同时**带 `method:'time'` 与 `hexagrams` —— 它因此是一条
  // **回归用例**：判据若写成 `method`（而不是 `hexagrams`），老入参会被当成
  // 「起卦原始参数」，于是按服务器当前时刻重起一卦，`moving_lines` 立刻对不上。
  check('梅花：text === prompt 里的 {{paipan}}（老入参路径）',
    !!r.payload && r.payload.text === promptLib.meihuaBlock(r.payload.paipan),
    '端点 text 与 prompt 正文不是同一份');
}

// ── 梅花：起卦原始参数（目标形态 —— 卦由后端起）──────────────────────
{
  // 1) 报数：后端起卦，端点把起卦结果一并交回（前端渲染用）
  const num = call('/api/meihua/paipan',
    { method: 'number', num1: 7, num2: 4, num3: 3, datetime: '2026-09-25T14:30:00' });
  check('梅花/原始：报数 200', num.status === 200, `状态 ${num.status} ${JSON.stringify(num.payload).slice(0, 100)}`);
  // 期望值**手算后写死**，不复用 `M.qiguaNumbers`（两边调同一个函数就等于没验）：
  //   上 = 7 % 8 = 7；下 = 4 % 8 = 4；动 = (7+4+3) % 6 = 2
  // 「2」而不是「3」正是要点：古法动爻取**三数之和**，不是第三个数本身
  // （前端早先写的就是后者，属计划里点明的第 8 号 bug）。
  check('梅花/原始：报数 7/4/3 → 上7下4动2（动爻取三数之和，非第三数）',
    !!num.payload.qigua && num.payload.qigua.upper_num === 7 && num.payload.qigua.lower_num === 4
    && num.payload.qigua.moving === 2,
    JSON.stringify(num.payload.qigua && [num.payload.qigua.upper_num, num.payload.qigua.lower_num, num.payload.qigua.moving]));
  check('梅花/原始：text === prompt 里的 {{paipan}}',
    num.payload.text === promptLib.meihuaBlock(num.payload.paipan), '端点 text 与 prompt 正文不是同一份');

  // 2) 时间法：必须用**提交上来的时刻**，且缺时刻要报错（不许退回服务器当前时刻）
  const t1 = call('/api/meihua/paipan', { method: 'time', datetime: '2026-09-25T14:30:00' });
  const t2 = call('/api/meihua/paipan', { method: 'time', datetime: '2026-09-25T14:30:00' });
  check('梅花/原始：时间法可起卦且两次同刻同卦',
    t1.status === 200 && JSON.stringify(t1.payload.qigua) === JSON.stringify(t2.payload.qigua),
    `状态 ${t1.status}/${t2.status}`);
  check('梅花/原始：时间法缺时刻 → 400（不许用服务器当前时刻）',
    call('/api/meihua/paipan', { method: 'time' }).status === 400, '缺 datetime 时没回 400');

  // 3) 字占：**只有后端能做**（笔画表在前端不存在），这条是它存在的理由
  const ch = call('/api/meihua/paipan', { method: 'character', text: '求财', datetime: '2026-09-25T14:30:00' });
  check('梅花/原始：字占可起卦', ch.status === 200 && !!ch.payload.qigua,
    `状态 ${ch.status} ${JSON.stringify(ch.payload).slice(0, 100)}`);

  // 4) 拆半求和（本项目自有法）+ 加时辰：时辰取**提交的时刻**，不是真实时钟
  const sp = call('/api/meihua/paipan',
    { method: 'split', digits: [3, 8, 6], datetime: '2026-09-25T14:30:00' });
  check('梅花/原始：拆半求和可起卦', sp.status === 200 && !!sp.payload.qigua, `状态 ${sp.status}`);
  // 两个时刻的**时辰序必须对 6 不同余**，否则加不加、加得对不对都看不出来 ——
  // 时辰序差 6 的两档（如未时 8 与丑时 2）加进同一个和里 mod 6 后完全一样，
  // 这种用例会**恒绿**。故这里先自检这一点，再比手算的期望值。
  //   基准和 = 3+8+6 = 17；未时(14:30)=8 → 25 % 6 = 1；辰时(08:30)=5 → 22 % 6 = 4
  const addA = call('/api/meihua/paipan',
    { method: 'number', num1: 3, num2: 8, num3: 6, addShichen: true, datetime: '2026-09-25T14:30:00' });
  const addB = call('/api/meihua/paipan',
    { method: 'number', num1: 3, num2: 8, num3: 6, addShichen: true, datetime: '2026-09-25T08:30:00' });
  check('（自检）两个时辰序对 6 不同余，否则本用例恒绿',
    (M.hourNumAt(14) - M.hourNumAt(8)) % 6 !== 0, `${M.hourNumAt(14)} / ${M.hourNumAt(8)}`);
  check('梅花/原始：加时辰用提交时刻的时辰（未时→1 / 辰时→4）',
    addA.status === 200 && addB.status === 200
    && addA.payload.qigua.moving === 1 && addB.payload.qigua.moving === 4,
    `未时动爻 ${addA.payload.qigua && addA.payload.qigua.moving} / 辰时动爻 ${addB.payload.qigua && addB.payload.qigua.moving}`);
  check('梅花/原始：加时辰缺时刻 → 400',
    call('/api/meihua/paipan', { method: 'number', num1: 3, num2: 8, num3: 6, addShichen: true }).status === 400,
    '缺 datetime 时没回 400');

  // 5) 坏输入：报数含 0（金标准钉住「0 非法」）、拆半缺 digits
  check('梅花/原始：报数含 0 → 400', call('/api/meihua/paipan', { method: 'number', num1: 3, num2: 0, num3: 8 }).status === 400, '0 没被拒');
  check('梅花/原始：拆半缺 digits → 400', call('/api/meihua/paipan', { method: 'split' }).status === 400, '缺 digits 没被拒');
  check('梅花/原始：起卦法名非法 → 400', call('/api/meihua/paipan', { method: '瞎写' }).status === 400, '非法法名没被拒');
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

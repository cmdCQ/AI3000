/**
 * 冒烟 · 八字排盘端点 `/api/bazi/paipan`
 * ==========================================================================
 *
 * 这个端点存在的意义：前端**只渲染**，八字盘一律后端算。所以前端会拿到
 *   · `chart`   —— 分层渲染用（四柱/十神/藏干/纳音/神煞/格局/用神/大运/流年…）
 *   · `sizhu`   —— 历法四柱（含节气、时令五行）
 *   · `display` —— 盘面显示专用的历法项（农历/生肖/节气区间/四柱旬空）
 *   · `text`    —— **AI 将读到的正文**，与解读端点 `/api/bazi/parse` 喂给 AI 的那一段
 *                  出自同一个函数（2026-09-25 起是 `paipan/bazi_report.js`，
 *                  从前是 `bazi_prompt.js` —— 换出口时本脚本跟着换，不是删断言）
 * 本脚本验的就是这四条承诺，外加「端点层补的那两项（大运一览 / 未来流年）与盘自身自洽」。
 *
 * **它不覆盖什么**（别把这份绿当成上线没问题）：
 *   · 真 http server / 路由分发 / nginx 反代 —— 本地无 node_modules，起不了完整后端
 *   · 鉴权、游客限额、解析记录落库 —— 端点是纯计算，那几件事在 `/api/chat/send` 侧
 *   · 线上容器里的 `lunar-javascript` 版本与本地是否一致
 *   · **AI 的产出**：本脚本只验喂进去的那一段，AI 读得懂读不懂不在范围内
 *
 * 做法与 `smoke_paipan_endpoints.js` 同：从 `auth-server.js` 切出**端点那一段
 * 加上它依赖的两个模块级函数**原文，`new Function` 求值，`json` 换成捕获用的桩。
 * 切片标记失效时**报错退出**，不静默跳过 —— 静默跳过等于这份冒烟从此永远绿。
 *
 * 用法：node duipan/smoke_bazi_endpoint.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 取不到源码
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const baziFull = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_full.js'));
const baziPromptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_prompt.js'));
const baziReportLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_report.js'));
const baziFortuneLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_fortune.js'));
const ganzhiLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js'));
const paipanConst = require(path.join(ROOT, 'build', 'backend', 'paipan', 'constants.js'));

const H1 = '// ══════ 八字：排盘的**唯一出口** ══════';
const H2 = 'function buildDivinationChatPrompt(';
const E1 = '  // ── POST /api/bazi/paipan — 八字排盘';
// 尾巴必须停在**下一个端点**的开头。2026-09-25：新插了 /api/bazi/parse，原先指向
// `// POST /api/chat/send` 的尾巴于是把解读端点也圈了进来 —— 那个函数体里有 `await`，
// 拼进非 async 的 `new Function` 直接语法错。**每加一个端点，这里就要往回收一格**；
// 下面的 FORBIDDEN 断言把这件事变成会响的检查，而不是靠人记得。
const E2 = '  // ── POST /api/bazi/parse — 八字解读（流式）──';
// 只认**真调用**，不认名字：排盘端点的注释里会合法地提到解读端点的路径
// （「同一份盘喂给 AI」那句），按名字匹配会把注释也当成越界。
const FORBIDDEN = ['guestGate(req, res)', 'streamBaziParse(res, {', 'baziRagContext('];

/** 切 [from, to) 之间的原文；找不到就报错退出（不要静默返回空串）。 */
function slice(src, from, to, label) {
  const i = src.indexOf(from);
  const j = i < 0 ? -1 : src.indexOf(to, i);
  if (i < 0 || j < 0 || j <= i) {
    console.error(`❌ 取不到「${label}」段（from=${i} to=${j}）。auth-server.js 结构变了？`
      + '请更新本脚本的切片标记，别在残缺代码上冒烟。');
    process.exit(2);
  }
  return src.slice(i, j);
}

function load() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const helpers = slice(src, H1, H2, '八字排盘出口（模块级函数）');
  const endpoint = slice(src, E1, E2, '八字排盘端点');
  for (const want of ['/api/bazi/paipan', 'baziChartFromParams', 'baziDisplayMeta']) {
    if (!helpers.includes(want) && !endpoint.includes(want)) {
      console.error(`❌ 切出的段里没有「${want}」—— 切片标记已失效，拒绝在残缺代码上冒烟。`);
      process.exit(2);
    }
  }
  // 反向断言：本脚本只该切到 paipan 为止。多圈进来的东西属于**别的**端点，
  // 在这里跑不了（依赖没注入），却会因为一句 `await` 让整份冒烟连语法都过不去。
  for (const bad of FORBIDDEN) {
    if (endpoint.includes(bad)) {
      console.error(`❌ 排盘端点的切片里混进了「${bad}」—— 这是别的端点的代码。\n`
        + '   多半是 E2 标记停在下一个端点之后了：把它收到**下一个端点的注释行**上。');
      process.exit(2);
    }
  }
  // helpers 是模块级声明、endpoint 是 `handle()` 里的语句 —— 拼成一个函数体即可：
  // 函数声明会提升，端点的 `if` 都能看见它们。
  return new Function('req', 'res', 'body', 'pathname', 'json',
    'baziFull', 'baziPromptLib', 'baziReportLib', 'baziFortuneLib', 'ganzhiLib', 'paipanConst',
    helpers + '\n' + endpoint + '\n;return false;');
}

const run = load();

// 每次调用换一份新的 res/json 捕获器 —— 复用会让上一条用例的残留混进来。
function call(body) {
  const out = { status: null, payload: null, called: false };
  const res = {};
  const json = (r, obj, status) => {
    out.called = true;
    out.status = status || 200;
    out.payload = obj;
    return obj;
  };
  run({ method: 'POST' }, res, body, '/api/bazi/paipan', json,
    baziFull, baziPromptLib, baziReportLib, baziFortuneLib, ganzhiLib, paipanConst);
  return out;
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// ── 夹具：含边界（立春当日、晚子时 23:30、缺时分）─────────────────────
const CASES = [
  { name: '1893-12-26 08:00 男', in: { y: 1893, mo: 12, d: 26, h: 8, mi: 0, gender: 'male' } },
  { name: '1984-02-04 12:00 男（立春当日）', in: { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male' } },
  { name: '2000-01-01 00:30 女（早子时）', in: { y: 2000, mo: 1, d: 1, h: 0, mi: 30, gender: '女' } },
  { name: '2026-06-24 14:30 男', in: { y: 2026, mo: 6, d: 24, h: 14, mi: 30, gender: 'male' } },
  { name: '1995-08-20 23:30 女（晚子时）', in: { y: 1995, mo: 8, d: 20, h: 23, mi: 30, gender: 'female' } },
  // 时分缺省：必须当成 0 而不是 NaN（NaN 会让整条历法链算出垃圾、而且不报错）
  { name: '1975-11-05 缺时分 男', in: { y: 1975, mo: 11, d: 5, h: '', mi: null, gender: 'male' } },
];

// 生肖表**在测试里独立写一份**（不复用被测代码里的那张表 —— 复用就等于没验）。
const XIAO = '鼠牛虎兔龙蛇马羊猴鸡狗猪';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';

console.log('── 逐例：四条承诺（chart / sizhu / display / text）──');
for (const c of CASES) {
  const r = call(Object.assign({ tab: '综合', question: '' }, c.in));
  const ok = r.status === 200 && r.payload && r.payload.chart;
  check(`${c.name}：200 且有 chart`, ok, `状态 ${r.status} ${JSON.stringify(r.payload).slice(0, 120)}`);
  if (!ok) continue;

  const ch = r.payload.chart;
  const t = r.payload.text;
  const p = ch.year_pillar.tiangan + ch.year_pillar.dizhi;

  check(`${c.name}：text 是字符串且非空`, typeof t === 'string' && t.length > 200, `${typeof t} 长度 ${t && t.length}`);
  check(`${c.name}：text 里有四柱（年柱 ${p}）`, t.includes(p), '正文里找不到年柱干支');
  check(`${c.name}：text 里有日主`, t.includes(ch.day_master), '正文里找不到日主');
  check(`${c.name}：sizhu 四柱与 chart 四柱同口径`,
    r.payload.sizhu.year_gz === p && r.payload.sizhu.day_gz === ch.day_pillar.tiangan + ch.day_pillar.dizhi,
    `${JSON.stringify(r.payload.sizhu.year_gz)} / chart ${p}`);

  // 生肖由**年支**取 —— 与年柱自洽（不另走历法库那两条换年边界）
  const wantXiao = XIAO[ZHI.indexOf(ch.year_pillar.dizhi)];
  check(`${c.name}：display.生肖 与年支自洽（${ch.year_pillar.dizhi}→${wantXiao}）`,
    r.payload.display.shengxiao === wantXiao,
    `收到「${r.payload.display.shengxiao}」`);

  check(`${c.name}：display 有农历与节气区间`,
    !!r.payload.display.lunar && !!r.payload.display.jieQi,
    `${JSON.stringify(r.payload.display).slice(0, 120)}`);
}

// ── 核心承诺：text 与解读端点用**同一个函数**产出 ─────────────────────
// 这是「用户看到的盘与 AI 读到的盘不是同一份」那类事故的唯一防线：
// 端点自己不另渲染一遍，而是调 `baziReportLib.baziReportPrompt`。
// 用端点返回的 chart **独立重算**一次，逐字比。
//
// ⚠ 2026-09-25：这条线的出口从 `baziPromptLib.baziPrompt` 换成了
//   `baziReportLib.baziReportPrompt`（新输出规格：命盘评分 + 8 模块）。
//   换出口时**改断言、不删断言** —— 删了这条，「两处渲染必然漂移」就没人看着了。
console.log('\n── 核心承诺：text 与解读端点同一函数 ──');
{
  const c = { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '事业', question: '' };
  const r = call(c);
  const again = baziReportLib.baziReportPrompt(r.payload.chart, {
    tab: '事业', question: '', ragText: '', currentYear: new Date().getFullYear(),
  });
  check('text === baziReportPrompt(端点返回的 chart)', r.payload.text === again,
    '端点自己渲染了一遍 —— 两处渲染必然漂移');
}

// ── 新输出规格真的进了正文（2026-09-25）───────────────────────────────
// 这一段断的是**接线**：模板写对不算数，得看端点上真发出去的那一段。
console.log('\n── 新输出规格（命盘评分 + 8 模块）进了正文 ──');
{
  const c = { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '综合', question: '' };
  const r = call(c);
  const t = r.payload.text;
  const ch = r.payload.chart;
  check('正文不再带旧的六步分析指令', !t.includes('请按步骤深度分析'),
    '旧的「请按步骤深度分析：①…⑥…」还在 —— 它会与新规格打架（输出不统一的根因）');
  check('正文指向新规范', t.includes('一、命盘评分') && t.includes('二、综合内容'),
    '正文末尾没有指到新规范那两部分');

  // 【大运一览】：**全部**步数都在（ctx 里只有前 6 步，这里要 10 步）
  check('chart.liunian 挂上了且非空', Array.isArray(ch.liunian) && ch.liunian.length > 0,
    `${Array.isArray(ch.liunian) ? ch.liunian.length : typeof ch.liunian} 年`);
  check('正文里有【大运一览】', t.includes('【大运一览】'), '缺这一块，模块 7 就只剩「依据不足」');
  const dyMiss = ch.dayun.filter((d) => !t.includes(`${d.tiangan}${d.dizhi}（${d.start_age}–${d.end_age} 岁`));
  check('每一步大运的起止年龄都在（不只是前六步）', dyMiss.length === 0,
    `缺 ${dyMiss.length} 步：${dyMiss.slice(0, 3).map((d) => d.tiangan + d.dizhi).join('、')}`);
  check('正文里有【未来流年】', t.includes('【未来流年】'), '缺这一块');
  const lnMiss = ch.liunian.filter((l) => !t.includes(`${l.year} 年 ${l.tiangan}${l.dizhi}`));
  check('未来每一年的干支都在', lnMiss.length === 0,
    `缺 ${lnMiss.map((l) => l.year).join('、')}`);
  // 这一条是**防模型编造**的挡板：地支十神后端拿不到（`shishen_zhi` 恒空），
  // 表头必须自己写明不提供，否则模型会照着天干十神的样式给它补一个出来。
  check('【未来流年】表头写明「地支十神本系统不提供」',
    /【未来流年】[\s\S]{0,80}地支十神本系统不提供/.test(t), '挡板没写，模型会编地支十神');
}

// ── 端点层补的「大运」一览：既进得去，又与盘自洽 ──────────────────────
console.log('\n── 端点层补挂的「大运」一览 ──');
{
  const c = { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '综合', question: '' };
  const r = call(c);
  const ch = r.payload.chart;
  // 基准端点从不往 chart 上挂 `dayun`，实测真实链路上这一项**恒为空**；
  // 我们在端点层补上，故这里同时验「补上了」与「格式与基准 ctx 的格式化串同形」。
  check('chart.dayun 挂上了且非空', Array.isArray(ch.dayun) && ch.dayun.length >= 6,
    `${Array.isArray(ch.dayun) ? ch.dayun.length : typeof ch.dayun} 步`);
  const fmt = (d) => `${d.tiangan}${d.dizhi}(${Math.trunc(d.start_age)}岁·${d.quality})`;
  const miss = ch.dayun.slice(0, 6).filter((d) => !r.payload.text.includes(fmt(d)));
  check('前六步大运**逐个**出现在 text 里', miss.length === 0,
    `缺 ${miss.map(fmt).join('、')}（若是个别缺，先看是不是被 JSON 的 2000 字上限截断了）`);

  // 自洽：一览里必须**正好有一步**就是「当前大运」，且当前年落在它自己的区间内。
  // 这是补挂时选 `calculateDayun(chart, gender, birthYear)` 那个调用的理由 ——
  // 与 `current_fortune.js` 内部调的是同一个函数、同一个十步默认值。
  const cf = ch.current_fortune;
  check('current_fortune 可用（否则本段其余断言无意义）', !!(cf && cf.available),
    '本命例算不出当前运程，本段跳过就等于没验');
  if (cf && cf.available) {
    const cur = cf.current_dayun.ganzhi;
    const hit = ch.dayun.filter((d) => d.tiangan + d.dizhi === cur);
    check(`一览里「当前大运 ${cur}」正好一步`, hit.length === 1,
      `命中 ${hit.length} 步：${hit.map(fmt).join('、')}`);
    if (hit.length === 1) {
      const nowYear = new Date().getFullYear();
      check(`当前年 ${nowYear} 落在该步自己的区间里`,
        hit[0].start_year <= nowYear && nowYear <= hit[0].end_year,
        `${hit[0].start_year}–${hit[0].end_year}`);
    }
    check('当前大运那一步在 text 里',
      r.payload.text.includes(fmt(hit[0] || ch.dayun[0])),
      '当前大运没进正文');
  }
}

// ── 四个方面的区别真的传下去了（tab 不是装饰）────────────────────────
console.log('\n── tab（综合/事业/财运/婚姻/健康）──');
{
  const base = { y: 2026, mo: 6, d: 24, h: 14, mi: 30, gender: 'male' };
  const zh = call(Object.assign({ tab: '综合' }, base));
  const sy = call(Object.assign({ tab: '事业' }, base));
  check('「事业」正文里有【事业】与专项分析', sy.payload.text.includes('事业专项分析'),
    'tab 没接到 life_aspects 上');
  check('「综合」正文里**没有**专项分析（综合本就没有这一项）',
    !zh.payload.text.includes('专项分析'),
    '综合也带上了专项分析 —— tab 判据把空值也当方面了');
  check('两个 tab 的正文不同', zh.payload.text !== sy.payload.text, '换了 tab 正文一字不变');

  // 性别：婚姻那一路要用（配偶星按性别取），故两个性别的正文必须不同
  const m = call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '婚姻' });
  const f = call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'female', tab: '婚姻' });
  check('男/女（male/female）正文不同', m.payload.text !== f.payload.text,
    '性别没接下去 —— 婚姻那一路是空的');
  check('「男」这种中文入参也认', call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: '男', tab: '婚姻' })
    .payload.text === m.payload.text, '中文性别与 male 不等价');
  check('正文里性别字段是中文（男/女）', m.payload.text.includes('"性别": "男"')
    && f.payload.text.includes('"性别": "女"'), '性别没有落成中文');
}

// ── 用户提问：原样进正文，**不许**被当成占位符再解释一遍 ────────────────
console.log('\n── 用户提问（外部输入，占位符替换的回归用例）──');
{
  const q = '我今年适合换工作吗？';
  const r = call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '综合', question: q });
  check('提问原样出现在正文里', r.payload.text.includes(q), '提问没进正文');

  // 这两条是 `renderPrompt` 两个真实缺陷的**端点级回归**：
  //   ① `{{…}}` 逐键多趟替换 → 提问里写占位符会让正文多插一整块数据
  //   ② 替换值当字符串塞进 `replace` → `$&` 被 JS 展开成「被替换掉的那段占位符」
  // 用户完全可以输入这两样，故必须在**端点出口**上钉住，不能只钉 `bazi_prompt.js`。
  const q2 = '{{日主}} 和 $& 是什么意思？';
  const r2 = call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male', tab: '综合', question: q2 });
  check('提问里的 {{日主}} 原样保留（没有被再替换一次）',
    r2.payload.text.includes('{{日主}}'), '占位符被多趟替换吃掉了');
  check('提问里的 $& 原样保留（没有被展开成占位符名）',
    r2.payload.text.includes('$&'), '$& 被 JS 的字符串替换展开了');
  check('这一次的正文 == 上一条的正文 + 换掉提问那一处之外无差别',
    r2.payload.text.length - r.payload.text.length === q2.length - q.length,
    `长度差 ${r2.payload.text.length - r.payload.text.length}，期望 ${q2.length - q.length}`);
}

// ── 坏输入：走 400，不许 200 里塞个空盘 ──────────────────────────────
console.log('\n── 坏输入 ──');
{
  check('缺年月日 → 400', call({ h: 12 }).status === 400, '缺日期时没回 400');
  check('缺月 → 400', call({ y: 1984, d: 4 }).status === 400, '缺月时没回 400');
  check('空 body → 400', call(null).status === 400, '空 body 时没回 400');
  check('坏输入的回包里有人话 reason',
    typeof (call({}).payload || {}).error === 'string' && call({}).payload.error.length > 4,
    JSON.stringify(call({}).payload));
}

// ── 「哪一年是今年」：**必须显式给**，而两侧的「不给」后果不同 ──────────
// 基准 `core/bazi/current_fortune.py:18` 是 `current_year: int = 2026` ——
// 不给就**默默按 2026 算**；而基准自己的端点（`api/bazi.py:121`）只传了三个参数，
// 于是基准线上的「当前运程」永远停在 2026 年。
// 本项目移植侧**没有**这个默认值（对拍一律显式注入，故从未暴露）：
// 不给就是没有流年。两种「不给」都不该出现在线上，故端点显式给真实年份。
console.log('\n── 当前运程那一年（基准端点的接线缺陷）──');
{
  const mk = (year) => {
    const ch = baziFull.buildBaziFull({ y: 1984, mo: 2, d: 4, h: 12, mi: 0 },
      { gender: 'male', birthYear: 1984, currentYear: year });
    const cf = ch.current_fortune;
    return (cf && cf.available && cf.current_liunian) ? cf.current_liunian.year : null;
  };
  // 这一条钉的是**移植侧的默认值语义**（缺参数 ≠ 2026），不是「基准是对的」：
  // 哪天有人在移植侧补上 `= 2026` 那个默认值，这条会红 —— 那正是我们要它红的时候。
  check('移植侧不传 currentYear → 没有流年（**不是**默默按 2026 算）', mk(undefined) === null,
    `收到 ${mk(undefined)}`);
  check('传 2030 → 流年跟着走到 2030（这一项确实读入参）', mk(2030) === 2030, `收到 ${mk(2030)}`);
  const r = call({ y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: 'male' });
  const got = r.payload.chart.current_fortune.current_liunian.year;
  check('端点给的是**真实年份**', got === new Date().getFullYear(), `端点算出 ${got}`);
}

console.log('');
if (fails.length) {
  console.error(`❌ ${fails.length} 条未过：\n  · ${fails.join('\n  · ')}`);
  process.exit(1);
}
console.log('✅ 八字排盘端点全绿（注意：不含真 http 服务/鉴权/游客限额/线上依赖版本，见文件头）');

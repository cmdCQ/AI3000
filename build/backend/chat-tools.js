// ══════════════════════════════════════════════════════════════════
// chat-tools.js — AI 对话的工具层
//
// 取代原「两段式」流程：原先系统 prompt 写死「请先询问三个数字」，
// 前端再用正则从用户消息里抓数字、自己起卦、把卦象拼回 prompt。
// 那条路有三个结构性问题：
//   ① AI 拿不到任何数据，只能等前端喂；不知道今天初几、不知道用户存过什么盘
//   ② 流程写死两步，用户说「就现在起一卦」也走不通
//   ③ 判据是前端正则（`text.replace(/[^0-9]/g,'')`），
//      「我 2026 年 3 月想去北京」会被抽成 2026/3 直接起一卦
//
// 现在改由模型自己决定调哪个工具、什么时候调。工具只做两件事：
//   给模型一段**有界的文本**读，给前端一份**卡片结构**渲染。
//   两者必须出自同一次计算，所以每个工具都调用**已有端点用的那一个出口**：
//     meihua → `prompt.meihuaChartFromParams` + `prompt.meihuaBlock`
//     liuyao → `prompt.liuyaoChartFromCard`   + `liuyao.formatChart`
//     bazi   → `baziFull.buildBaziFull`       + `bazi_report.baziReportPrompt`
//   本文件不自己算任何术数，也不自己格式化任何盘面 —— 一旦在这里另写一份，
//   「用户看到的盘」与「AI 读到的盘」就会分叉，那是这个项目最贵的病。
//
// ⚠ 起卦法与装卦的**入参形状**是本文件唯一容易错的地方，三处都已在注释里写明：
//   · `meihuaChartFromParams` 认的 `method` 是 `time|number|character|split|manual`
//     （**不是**中文展示名「数字起卦」）。传中文名会在 `qigua()` 里抛
//     「不支持的起卦法」。
//   · `liuyaoChartFromCard` 不认六爻阴阳数组，只认 `cardData.hexagrams.benGua/bianGua`
//     的**上下卦号**（与前端 `liuyao_render.js` 发给 `/api/chat/send` 的形状同）。
//     故这里自己把 6 个数折成上下卦号 —— 用 `meihua.fromGua` 生成，不手写卦序表。
//   · `baziReportPrompt(chart, opts)` 第一个参数是**排好的 chart**，不是出生参数。
//     排盘要走 `auth-server.js` 的 `baziChartFromParams()`（由 `setDeps` 注入），
//     那里同时补挂了 `dayun`/`liunian` 两张表 —— 少挂一张，AI 就只能看见当前一步大运。
// ══════════════════════════════════════════════════════════════════

const liuyaoPaipan = require('./paipan/liuyao.js');
const meihuaPaipan = require('./paipan/meihua.js');
const promptLib = require('./paipan/prompt.js');
const ganzhiLib = require('./paipan/ganzhi.js');

// 工具返回给模型的文本要有界：排盘正文可以有，整库原始数据不行。
// 上限按「一次能读懂、又不至于吃掉 max_tokens」取。
// ⚠ 八字报告正文（`baziReportPrompt`）本身就有数千字，会被截断 ——
// 截断处自带说明，模型能看见「原文共 N 字」，不会误以为盘面就这么多。
const TOOL_TEXT_MAX = 6000;

/* ──────────────────────────────────────────────────────────────
   小工具
   ────────────────────────────────────────────────────────────── */

function clampText(s, max) {
  const t = String(s == null ? '' : s);
  if (t.length <= max) return t;
  return t.slice(0, max) + `\n…（以下截断，原文共 ${t.length} 字）`;
}

/** 统一返回形状：模型读 text，前端读 card */
function ok(text, card, summary) {
  return { ok: true, text: clampText(text, TOOL_TEXT_MAX), card: card || null, summary: summary || '' };
}
function fail(message) {
  return { ok: false, text: '工具执行失败：' + message, card: null, summary: '' };
}

/** 取「当下」四柱 —— 起卦工具与 get_datetime 共用，避免各算一份 */
function nowSizhu() {
  const d = new Date();
  const sizhu = ganzhiLib.sizhu(d);
  const lunar = ganzhiLib.lunarText ? ganzhiLib.lunarText(d) : '';
  return { sizhu, lunar };
}

/* ──────────────────────────────────────────────────────────────
   六爻：6 个阴阳数 → 上下卦号 + 动爻
   ──────────────────────────────────────────────────────────────
   掷币得到的六个数（自下而上，初爻在前）：
     6 = 老阴（阴，动）   7 = 少阳（阳，静）
     8 = 少阴（阴，静）   9 = 老阳（阳，动）
   折成卦号用 `meihua.fromGua(upper, lower, moving)` —— 那是本项目
   「上下卦号 → 完整卦象」的唯一出口，六爻与梅花共用同一张八卦表。

   ⚠ `linesOfTrigram` 给的三爻顺序是**下→上**（与 `TRIGRAM_BY_LINES`
     的键一致），故这里的位权也必须从下往上：`(lines[0]&1)` 是初爻。 */

function linesToNumbers(lines) {
  const yang = lines.map(v => (v === 7 || v === 9) ? 1 : 0);
  const moving = [];
  lines.forEach((v, i) => { if (v === 6 || v === 9) moving.push(i + 1); });
  // 动爻全无 → 六爻无变卦。`fromGua` 要求 1-6，故静卦时借第 1 爻
  // **只为生成一个合法卦体**，变卦另行置为与本卦相同（不动就没有变）。
  const movingForBuild = moving.length ? moving[0] : 1;

  // `trigramOfLines` 直接收三爻数组（下→上），不另建位权
  const lower = meihuaPaipan.trigramOfLines(yang.slice(0, 3));
  const upper = meihuaPaipan.trigramOfLines(yang.slice(3, 6));
  return { upper, lower, moving, movingForBuild, yang };
}

/**
 * 本卦/变卦的上下卦号 —— 与前端 `liuyao_render.js` 发出去的形状逐字对齐。
 *
 * 变卦 = 本卦的**动爻**翻转。静卦（无 6/9）时变卦与本卦相同 —— 六爻里
 * 「六爻不动」就是没有变卦，此处按同卦处理，不下别的结论。
 */
function hexagramsFromLines(lines) {
  const { upper, lower, moving, movingForBuild, yang } = linesToNumbers(lines);

  const ben = meihuaPaipan.deriveAll(yang, [movingForBuild]);
  let bianUpper = upper, bianLower = lower;
  if (moving.length) {
    const flipped = yang.slice();
    moving.forEach(pos => { flipped[pos - 1] = flipped[pos - 1] ? 0 : 1; });
    bianLower = meihuaPaipan.trigramOfLines(flipped.slice(0, 3));
    bianUpper = meihuaPaipan.trigramOfLines(flipped.slice(3, 6));
  }
  // 变卦的动爻位置本卦与变卦相同（只是阴阳翻了），故 moving 仍取本卦的动爻
  const bian = meihuaPaipan.deriveAll(
    moving.length ? yang.map((v, i) => (moving.includes(i + 1) ? (v ? 0 : 1) : v)) : yang,
    [movingForBuild]
  );

  const tri = (g, k) => (g && g.trigrams && g.trigrams[k]) || '';
  const shape = (hex, up, lo) => ({
    name: (hex && hex.name) || '',
    upper: up, lower: lo,
    upperTri: { name: tri(hex, 'upper') },
    lowerTri: { name: tri(hex, 'lower') },
  });

  return {
    moving,
    hexagrams: {
      benGua: shape(ben.main, upper, lower),
      bianGua: shape(bian.main, bianUpper, bianLower),
      movingLines: moving.length ? moving : [],
    },
    benGuaName: (ben.main && ben.main.name) || '',
    bianGuaName: (bian.main && bian.main.name) || '',
    movingLines: moving.length ? moving : [],
  };
}

/* ──────────────────────────────────────────────────────────────
   工具定义（喂给模型）
   ──────────────────────────────────────────────────────────────
   写法遵循：描述「做什么、返回什么、什么时候用」；
   参数规则（范围、必填）放在参数自己身上；
   不写内部实现。 */

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'qigua_meihua',
      description:
        '用两到三个 1-9 的数字起一卦（梅花易数），返回本卦、互卦、变卦、体用关系与动爻爻辞。'
        + '用户报出数字后用这个。用户还没给数字时，先向他要两三个任意数字，不要自己编。',
      parameters: {
        type: 'object',
        properties: {
          n1: { type: 'integer', minimum: 1, maximum: 9, description: '第一个数字' },
          n2: { type: 'integer', minimum: 1, maximum: 9, description: '第二个数字' },
          n3: { type: 'integer', minimum: 1, maximum: 9, description: '第三个数字。用户只给两个时省略，此时动爻按两数之和取' },
          question: { type: 'string', description: '用户想问的事由，用于判定体用与断卦侧重' },
        },
        required: ['n1', 'n2'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'qigua_liuyao',
      description:
        '六爻纳甲装卦，返回本卦与变卦、六亲、世应、六神、旬空、用神。'
        + '需要六爻的阴阳与动爻信息（用户掷铜钱得到，自下而上）。'
        + '用户只报数字或只说「起一卦」时用 qigua_meihua，不要用这个。',
      parameters: {
        type: 'object',
        properties: {
          lines: {
            type: 'array', minItems: 6, maxItems: 6,
            items: { type: 'integer', minimum: 6, maximum: 9 },
            description: '六爻，自下而上（初爻在前）。6=老阴(动) 7=少阳 8=少阴 9=老阳(动)',
          },
          topic: { type: 'string', description: '所问之事，用于取用神' },
          gender: { type: 'string', enum: ['male', 'female'], description: '求测者性别，取用神时需要' },
        },
        required: ['lines', 'topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'paipan_bazi',
      description:
        '按出生时间排四柱八字，返回四柱、十神、藏干、纳音、神煞、格局、用神、大运与流年。'
        + '用户给出出生年月日时后用这个。缺出生时间时先问，不要猜。',
      parameters: {
        type: 'object',
        properties: {
          year: { type: 'integer', description: '公历年，如 1990' },
          month: { type: 'integer', minimum: 1, maximum: 12, description: '公历月' },
          day: { type: 'integer', minimum: 1, maximum: 31, description: '公历日' },
          hour: { type: 'integer', minimum: 0, maximum: 23, description: '小时（24 小时制）' },
          minute: { type: 'integer', minimum: 0, maximum: 59, description: '分钟，未知时填 0' },
          gender: { type: 'string', enum: ['male', 'female'], description: '性别，大运顺逆要用' },
        },
        required: ['year', 'month', 'day', 'hour', 'gender'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_charts',
      description:
        '读取当前用户保存过的排盘记录（八字命盘、梅花记录、六爻记录）。'
        + '用户说「我的命盘」「上次那卦」「之前排的八字」时用这个，'
        + '不要让他重新输入出生时间或重新起卦。返回的是提要列表，不是完整盘面。',
      parameters: {
        type: 'object',
        properties: {
          kind: {
            type: 'string', enum: ['bazi', 'mhys', 'liuyao'],
            description: '只看某一类记录；不传则各类都返回',
          },
          limit: { type: 'integer', minimum: 1, maximum: 20, description: '每类最多返回几条，默认 5' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_datetime',
      description:
        '取当前时间、农历日期与四柱干支。用户说「就现在起一卦」「今天运势」「这个月」时用这个 —— '
        + '用它拿到当下的干支与时辰，再配合 qigua_meihua 起卦。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

/**
 * 系统提示词追加段 —— 与 `TOOL_DEFS` 必须同时改。
 * 工具本身的名字与参数由 API 传给模型，这里只讲**怎么用**：
 * 什么时候主动调、什么时候先问用户、拿到结果后怎么落笔。
 */
const TOOL_SYSTEM_ADDON = [
  '',
  '【可用工具】你可以调用工具查数据、起卦、排盘，不要凭记忆编造盘面。',
  '· 用户问运势、感情、事业、财运、出行这类问题但**没给数字** → 先自然地向他要两三个任意数字（1-9），不要自己编数字，也不要先讲一大段道理。',
  '· 用户给出数字后 → 调 qigua_meihua 起卦，再依据返回的卦象解读。',
  '· 用户给出六爻的六个阴阳数（6/7/8/9）→ 调 qigua_liuyao 装卦。只说「起一卦」而给的是数字 → 用 qigua_meihua。',
  '· 用户给出出生年月日时 → 调 paipan_bazi 排盘；出生时间不全就先问，不要猜。',
  '· 用户提到「我的命盘」「上次那卦」「之前排的」→ 调 get_my_charts 先看他存过什么。',
  '· 用户说「就现在」「今天」→ 可先调 get_datetime 拿当下干支，再决定要不要起卦。',
  '· 一次回答里最多调两三次工具；拿到结果后直接落笔解读，不要把工具返回的原始文本整段复述给用户。',
].join('\n');

/* ──────────────────────────────────────────────────────────────
   执行器
   ────────────────────────────────────────────────────────────── */

/**
 * 由 auth-server 注入的依赖。
 * 不在这里 `require('./auth-server.js')` —— 那是循环依赖，
 * 且会把「排盘口径」拆到两个模块里各存一份。
 *
 *   buildBaziChart(card)  → 与 `/api/bazi/paipan` 逐字同一条出口
 *   queryMyCharts(user, kind, limit)
 */
let deps = {
  buildBaziChart: null,
  queryMyCharts: null,
};

function setDeps(d) {
  deps = Object.assign({}, deps, d);
}

async function executeTool(name, args, ctx) {
  try {
    switch (name) {
      case 'qigua_meihua':   return toolMeihua(args);
      case 'qigua_liuyao':   return toolLiuyao(args);
      case 'paipan_bazi':    return toolBazi(args);
      case 'get_my_charts':  return await toolMyCharts(args, ctx);
      case 'get_datetime':   return toolDatetime();
      default:               return fail(`未知工具 ${name}`);
    }
  } catch (e) {
    // 工具抛错不中断对话：把错误回给模型，由它决定换工具还是向用户说明
    return fail((e && e.message) || String(e));
  }
}

/* ---- 梅花易数 ---- */
function toolMeihua(a) {
  const n1 = Number(a.n1), n2 = Number(a.n2);
  const n3 = (a.n3 === undefined || a.n3 === null || a.n3 === '') ? null : Number(a.n3);
  for (const [lbl, v] of [['第一数', n1], ['第二数', n2]]) {
    if (!Number.isInteger(v) || v < 1 || v > 9) return fail(`${lbl}需要 1-9 的整数`);
  }
  if (n3 !== null && (!Number.isInteger(n3) || n3 < 1 || n3 > 9)) {
    return fail('第三数需要 1-9 的整数');
  }

  // ⚠ `method` 是**内部代号** `number`，不是中文展示名。给中文名会在
  //   `meihua.qigua()` 的末行抛出「不支持的起卦法」。
  //   不传 `datetime`：数字起卦不需要起卦时刻，`sizhu` 留空是对的
  //   （`meihuaChartFromParams` 的注：给不出时刻就留空，不编近似月支）。
  const raw = promptLib.meihuaChartFromParams({
    method: 'number',
    num1: n1, num2: n2, num3: n3,
    question: a.question || '',
    topic: a.question || '',
  });
  if (!raw || !raw.ok) return fail((raw && raw.reason) || '起卦失败');

  const q = raw.qigua || (raw.paipan && raw.paipan.qigua) || null;
  const nums = n3 === null ? `${n1}、${n2}` : `${n1}、${n2}、${n3}`;
  const text = `【起卦】报数起卦：${nums}`
    + (a.question ? `\n【所问】${a.question}` : '')
    + '\n' + promptLib.meihuaBlock(raw.paipan);

  const he = (raw.paipan && raw.paipan.hexagrams) || {};
  const ben = (he.main && he.main.name) || (he.benGua && he.benGua.name) || '';
  return ok(
    text,
    {
      type: 'mhys',
      hexagrams: he,
      sizhu: raw.sizhu || null,
      qigua: q,
      numbers: nums,
      method: '数字起卦',
      topic: a.question || '',
    },
    ben ? `本卦 ${ben}` : '已起卦'
  );
}

/* ---- 六爻 ---- */
function toolLiuyao(a) {
  const lines = Array.isArray(a.lines) ? a.lines.map(Number) : null;
  if (!lines || lines.length !== 6) return fail('lines 需要 6 个数，自下而上');
  if (!lines.every(v => Number.isInteger(v) && v >= 6 && v <= 9)) {
    return fail('每爻需为 6/7/8/9');
  }
  const gender = a.gender === 'female' ? 'female' : 'male';
  const { hexagrams, moving } = hexagramsFromLines(lines);

  // 用当下四柱装卦 —— 与 `/api/liuyao/paipan` 同一条出口（`liuyaoChartFromCard`）
  const { sizhu, lunar } = nowSizhu();
  const card = {
    divinationTime: sizhu && sizhu.input ? sizhu.input : new Date().toISOString(),
    topic: a.topic || '',
    gender,
    hexagrams: Object.assign({ gender }, hexagrams),
  };
  // `sizhuFromCard` 认的是扁平的 yearGZ/… （见 `prompt.js`），补上，
  // 否则四柱会退回「按服务器当前时刻算」而两侧口径不一致。
  card.yearGZ = sizhu && sizhu.year_gz;
  card.monthGZ = sizhu && sizhu.month_gz;
  card.dayGZ = sizhu && sizhu.day_gz;
  card.hourGZ = sizhu && sizhu.hour_gz;
  card.lunarInfo = { text: lunar };

  const built = promptLib.liuyaoChartFromCard(card, a.topic || '');
  if (!built || !built.chart) return fail('装卦失败：拿不到本卦上下卦号');

  return ok(
    `【起卦】铜钱起卦：${lines.join(' ')}（自下而上）`
    + `\n【动爻】${moving.length ? moving.join('、') + ' 爻动' : '六爻不动'}`
    + `\n【四柱】${[card.yearGZ, card.monthGZ, card.dayGZ, card.hourGZ].filter(Boolean).join(' ')}`
    + (a.topic ? `\n【所问】${a.topic}` : '')
    + '\n' + liuyaoPaipan.formatChart(built.chart),
    {
      type: 'liuyao',
      chart: built.chart,
      sizhu: built.sizhu || sizhu,
      display: liuyaoPaipan.displayMeta ? liuyaoPaipan.displayMeta(card, built.chart) : null,
      topic: a.topic || '',
    },
    `本卦 ${(built.chart.ben && built.chart.ben.name) || ''}`.trim()
  );
}

/* ---- 八字 ---- */
function toolBazi(a) {
  const y = Number(a.year), mo = Number(a.month), d = Number(a.day), h = Number(a.hour);
  const mi = Number(a.minute || 0);
  if (![y, mo, d, h].every(Number.isFinite)) return fail('出生年月日时都要给到');
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23) return fail('出生时间超出范围');
  if (typeof deps.buildBaziChart !== 'function') return fail('八字排盘未接入');
  const gender = a.gender === 'female' ? 'female' : 'male';

  // ⚠ 与 `/api/bazi/paipan` **同一条出口**：`baziChartFromParams` 会补挂
  //   `chart.dayun`（十步）与 `chart.liunian`（今年起十年），并返回
  //   `baziReportPrompt` 渲染好的 `text`。少挂一张表，AI 就只看得到当前一步。
  //
  //   `baziChartFromParams` 认的性别是**中文**「男/女」或已是 male/female
  //   （它内部两种都接），这里直接给 male/female。
  const built = deps.buildBaziChart({
    y, mo, d, h, mi,
    gender: gender === 'female' ? '女' : '男',
    question: a.question || '',
  });
  if (!built || !built.ok) return fail((built && built.reason) || '八字排盘失败');

  const sizhu = built.sizhu || null;
  const pillar = sizhu
    ? [sizhu.year_gz, sizhu.month_gz, sizhu.day_gz, sizhu.hour_gz].filter(Boolean).join(' ')
    : '';
  const head = `【排盘】出生：${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} `
    + `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}　性别：${gender === 'female' ? '女' : '男'}`
    + (pillar ? `\n【四柱】${pillar}` : '');
  return ok(
    head + '\n' + (built.text || ''),
    {
      type: 'bazi',
      chart: built.chart,
      sizhu,
      display: built.display,
      input: { year: y, month: mo, day: d, hour: h, minute: mi, gender },
    },
    pillar || '已排盘'
  );
}

/* ---- 当前干支 ---- */
function toolDatetime() {
  const { sizhu, lunar } = nowSizhu();
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const solar = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
                `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const lines = [
    `公历：${solar}`,
    lunar ? `农历：${lunar}` : '',
    `四柱：${[sizhu.year_gz, sizhu.month_gz, sizhu.day_gz, sizhu.hour_gz].filter(Boolean).join(' ')}`,
  ].filter(Boolean);
  return ok(lines.join('\n'), { type: 'datetime', sizhu, lunar, solar }, solar);
}

/* ---- 用户已存命盘 ---- */
async function toolMyCharts(a, ctx) {
  if (!ctx || !ctx.username) return fail('当前没有登录用户，无法读取命盘记录');
  if (typeof deps.queryMyCharts !== 'function') return fail('命盘查询未接入');
  const kind = ['bazi', 'mhys', 'liuyao'].includes(a.kind) ? a.kind : null;
  const limit = Math.min(Math.max(Number(a.limit) || 5, 1), 20);
  const rows = await deps.queryMyCharts(ctx.username, kind, limit);
  if (!rows || !rows.length) {
    return ok('该用户还没有保存过任何排盘记录。可以先帮他排一个。', null, '无记录');
  }
  // 有界输出：只给模型「哪几条 + 一句话提要」，不给整个盘
  const lines = rows.map((r, i) =>
    `${i + 1}. [${r.kind}] ${r.title || '未命名'}${r.summary ? ' — ' + r.summary : ''}` +
    `${r.createdAt ? '（' + r.createdAt + '）' : ''}`
  );
  return ok(
    `共 ${rows.length} 条：\n` + lines.join('\n') +
    '\n\n这里只是提要。用户想看某一条的完整盘面时，告诉他到「我的」页面打开那一条；'
    + '若他报出该条的出生时间，你也可以用 paipan_bazi 重新排一份来细看。',
    { type: 'chartlist', items: rows },
    `${rows.length} 条记录`
  );
}

module.exports = { TOOL_DEFS, TOOL_SYSTEM_ADDON, executeTool, setDeps, TOOL_TEXT_MAX };

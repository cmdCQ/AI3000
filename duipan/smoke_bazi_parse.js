/**
 * 冒烟 · 八字解读端点 `/api/bazi/parse`
 * ==========================================================================
 *
 * 与 `/api/bazi/paipan`（纯计算、匿名可用）不同，这条会**花钱**（真调模型），
 * 所以它身上挂了三道闸门与两件收尾。本脚本验的就是这些**行为**——
 * 上一份冒烟（`smoke_bazi_endpoint.js`）的文件头里写着它不覆盖「鉴权、游客限额、
 * 解析记录落库」，这里正是那三样。
 *
 * 要验的承诺：
 *   ① 盘由后端现算，且**喂给 AI 的那段**出自共用件、不是本端点另拼一份：
 *      首次解读 system 逐字等于 `bazi_report.js` 的 `baziReportSystem()`、
 *      用户段逐字等于 `baziReportPrompt()`；追问走 `bazi_prompt.js` 那套
 *      （system = `baziReportFollowUpSystem()`、用户段 = `baziFollowUpPrompt()`）。
 *      **两条路都不能串** —— 首次吃追问规格会漏掉评分表，追问吃首次规格会重出一整套表。
 *   ② 游客：能解**一次**（签名 cookie 记），第二次被拦且**明说要登录**
 *   ③ 游客：不许解「综合」（含**没填 tab** 的情况 —— 不填就是综合）
 *   ④ 游客：**不落库**；登录用户：解读写进 `bazi_analyses`（含 chart_id/方面/提问）
 *   ⑤ 记账取**上游真数**（`usage` 帧），不是本地估的；游客没有 token 尾巴
 *   ⑥ 解读尾部那行记账尾巴（`POINTS_LABEL`，2026-09-25 起是「消耗积分：」）
 *      **不进**存下来的正文（前端按它切正文）
 *   ⑦ 用户中途断开 / 一个字都没出来 → **不算用掉一次**（闸门与落库都不触发），
 *      且**都得给用户一句话** —— 不许出现「HTTP 200 + 0 字节」那种空白回复
 *      （线上真发生过：上游是推理模型，`max_tokens` 被「思考」吃光 → 正文 0 字）。
 *      故本脚本还断言发给上游的 `max_tokens` 给思考留了余量。
 *   ⑧ 同 IP 一天总上限：到顶了回一句「明天再来」，不是静默失败
 *   ⑨ 取古籍失败**不该让解读失败**（古籍是加分项）
 *   ⑩ 伪造的签名 cookie 当新访客处理（它不是安全边界，但也不该被随便篡改）
 *
 * **它不覆盖什么**（别把这份绿当成上线没问题）：
 *   · 真 MySQL（这里的库是内存桩，只认本端点用到的那几条 SQL）
 *   · 真模型（上游是桩，**AI 读得懂读不懂不在范围内**）
 *   · nginx 反代、`Set-Cookie` 在真浏览器里的落地
 *   · 前端拿到解析后的展示（那是页面驱动的事）
 *
 * 做法与另两份冒烟同：从 `auth-server.js` 切出端点与它依赖的模块级函数原文，
 * `new Function` 求值，`db`/`fetch`/`openai` 全换成桩。切片标记失效就**报错退出**。
 *
 * 用法：node duipan/smoke_bazi_parse.js
 * 退出码：0 = 全绿；1 = 有用例失败；2 = 取不到源码
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SERVER = path.join(ROOT, 'build', 'backend', 'auth-server.js');
const baziFull = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_full.js'));
const baziPromptLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_prompt.js'));
const baziFortuneLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_fortune.js'));
const baziReportLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'bazi_report.js'));
const ganzhiLib = require(path.join(ROOT, 'build', 'backend', 'paipan', 'ganzhi.js'));
const paipanConst = require(path.join(ROOT, 'build', 'backend', 'paipan', 'constants.js'));

const H1 = '// ══════ 八字：排盘的**唯一出口** ══════';
const H2 = 'function buildDivinationChatPrompt(';
const E1 = '  // ── POST /api/bazi/parse — 八字解读（流式）──';
const E2 = '  // POST /api/chat/send';

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

const src = fs.readFileSync(SERVER, 'utf8');
const HELPERS = slice(src, H1, H2, '八字辅助函数');
const ENDPOINT = slice(src, E1, E2, '八字解读端点');
// 解析记录端点（只读）在文件另一处，**不在**上面两个窗口里，故单独切一段。
// 它用到了外层的 `url`（真服务里由 `new URL(req.url…)` 得到），冒烟里要自己补上，
// 否则一调就是 `url is not defined`（本仓库的老毛病：切出来的代码必须自洽）。
const R1 = '  // GET /api/bazi-analyses — 命盘的解析记录';
const R2 = '  // GET /api/admin/mhys-records';
const RECORDS = slice(src, R1, R2, '八字解析记录端点');

const TOKEN_LIMIT = slice(src, 'function getTokenLimit(tier) {', 'async function ensureDbUser(', 'getTokenLimit');
const ESTIMATE = slice(src, 'function estimateTokens(text) {', '// ══════ Prompt 模板引擎', 'estimateTokens');

// 两个**模块级常量**：`LLM_MAX_TOKENS`（上游 token 上限）与 `EMPTY_UPSTREAM_NOTICE`
// （一个字正文都没出来时给用户看的那句白话）。
// 它们定义在文件顶部（与 `LLM_MODEL` 同处，两条 AI 线共用），落在本脚本的切片窗口
// **之外** —— 故必须像 `LLM_MODEL` 那样注入，否则一切到流式函数就是
// `LLM_MAX_TOKENS is not defined`，端点当场 500、模型一次都不调（2026-09-25 实际如此）。
//
// ⚠ 从源码里**切**出来，不在本脚本里另抄一份：抄一份的话，线上把上限改回 3000、
// 或把那句提示改空，这份冒烟照样全绿 —— 那就成了橡皮章（本仓库已有同类教训）。
function mustMatch(re, label, human) {
  const m = src.match(re);
  if (!m) {
    console.error(`❌ 取不到「${label}」（${human}）。auth-server.js 改名了？`
      + '请更新本脚本的匹配式，别在残缺假设上冒烟。');
    process.exit(2);
  }
  return m;
}
const LLM_MAX_TOKENS = Number(mustMatch(/const LLM_MAX_TOKENS = (\d+);/,
  'LLM_MAX_TOKENS', '模块级 token 上限').slice(1).join(''));
const LLM_REASONING_EFFORT = mustMatch(/const LLM_REASONING_EFFORT = '([a-z]+)';/,
  'LLM_REASONING_EFFORT', '思考强度（low/high/max）')[1];
// 首读那一路的采样温度（关思考后才生效）。与上面两个同理：**从源码切**。
// 它落在切片窗口之外，不注入就是 `BAZI_REPORT_TEMPERATURE is not defined` ——
// 端点不崩、但流刚开就断，正文只剩一句「生成中断了」。
const BAZI_REPORT_TEMPERATURE = Number(mustMatch(/const BAZI_REPORT_TEMPERATURE = ([\d.]+);/,
  'BAZI_REPORT_TEMPERATURE', '首读采样温度').slice(1).join(''));
// 记账尾巴（`POINTS_LABEL` + `pointsTrailer`）。定义在文件顶部**第 330 行**一带，
// 落在本脚本的切片窗口（八字辅助函数 → 端点）**之外** —— 不注入就是
// `pointsTrailer is not defined`，而它外面套着 `catch (e) { /* 静默失败 */ }`，
// 于是**不报错、只是尾巴凭空消失**：④ 那条断言红的表象是「没有尾巴」，
// 真因是切出来的代码不自洽（本仓库的老毛病）。故这里照样**从源码切**，不另抄一份。
// ⚠ 判据里也不许再写死标签：该常量 2026-09-25 已由「消耗 Token：」改成「消耗积分：」，
//   写死旧字的断言会变成**永远为真**的橡皮章。
const POINTS_LABEL = mustMatch(/const POINTS_LABEL = '([^']+)';/,
  'POINTS_LABEL', '记账尾巴的标签').slice(1).join('');
const POINTS_TRAILER_SRC = mustMatch(/function pointsTrailer\([\s\S]*?\n\}/,
  'pointsTrailer', '记账尾巴函数')[0];
if (POINTS_TRAILER_SRC.indexOf('POINTS_LABEL') < 0) {
  console.error('❌ pointsTrailer 切出来没引用 POINTS_LABEL，切歪了：'
    + JSON.stringify(POINTS_TRAILER_SRC.slice(0, 80)));
  process.exit(2);
}
const NOTICE_PARTS = mustMatch(/const EMPTY_UPSTREAM_NOTICE = ([\s\S]*?);\n/,
  'EMPTY_UPSTREAM_NOTICE', '空正文时给用户看的那句话')[1];
// 那句提示是几个字符串字面量相加，逐段取出来拼回原样（比 eval 稳，也不执行任何东西）
const EMPTY_UPSTREAM_NOTICE = (NOTICE_PARTS.match(/'([^']*)'/g) || [])
  .map((s) => s.slice(1, -1)).join('');
// 切出来的东西要**自己先站得住**：切空了就等于下面那条断言恒真（橡皮章）
if (!Number.isFinite(LLM_MAX_TOKENS) || LLM_MAX_TOKENS <= 0) {
  console.error('❌ LLM_MAX_TOKENS 没切出数字：' + JSON.stringify(NOTICE_PARTS));
  process.exit(2);
}
if (EMPTY_UPSTREAM_NOTICE.length < 10) {
  console.error('❌ EMPTY_UPSTREAM_NOTICE 切出来是空的或过短：'
    + JSON.stringify(NOTICE_PARTS.slice(0, 60)));
  process.exit(2);
}

const fails = [];
function check(label, cond, detail) {
  if (!cond) fails.push(`${label}：${detail}`);
  console.log(`   ${cond ? '✓' : '✗'} ${label}${cond ? '' : ` —— ${detail}`}`);
}

// ── 内存库：只认本端点用到的那几条 SQL ────────────────────────────────
function makeDb(opts) {
  const o = opts || {};
  const t = {
    users: { alice: { token_used: o.tokenUsed || 0, tier: o.tier == null ? 2 : o.tier } },
    anon: [],        // {anon_id, ip, used_at}
    analyses: [],    // {id, user_id, chart_id, aspect, question, analysis, created_at}
    updates: [],     // 记账调用留档
    errors: [],
    sqls: [],        // 记录端点跑过的 SQL（用来断言「只读」）
    // 预置的解析记录行（`?chartId=` 与「新到旧」两条断言用）
    baziRows: o.baziRows || [],
  };
  // 预置：同 IP 已有 n 次游客用量（验日上限用）
  for (let i = 0; i < (o.ipUsed || 0); i++) {
    t.anon.push({ anon_id: 'deadbeef' + i, ip: o.ip || '10.0.0.9', used_at: Date.now() - 1000 });
  }
  const db = {
    _t: t,
    async query(sql, params) {
      const s = String(sql).replace(/\s+/g, ' ').trim();
      if (/^SELECT COUNT\(\*\) as cnt FROM anon_usage WHERE anon_id/.test(s)) {
        const [id] = params;
        return [[{ cnt: t.anon.filter((r) => r.anon_id === id).length }]];
      }
      if (/^SELECT COUNT\(\*\) as cnt FROM anon_usage WHERE ip/.test(s)) {
        const [ip, since] = params;
        return [[{ cnt: t.anon.filter((r) => r.ip === ip && r.used_at > since).length }]];
      }
      if (/^INSERT INTO anon_usage/.test(s)) {
        const [anon_id, kind, ip, used_at] = params;
        t.anon.push({ anon_id, kind, ip, used_at });
        return [{ insertId: t.anon.length }];
      }
      if (/^INSERT INTO bazi_analyses/.test(s)) {
        const [id, user_id, chart_id, aspect, question, analysis, created_at] = params;
        t.analyses.push({ id, user_id, chart_id, aspect, question, analysis, created_at });
        return [{ insertId: t.analyses.length }];
      }
      if (/^SELECT id, chart_id, aspect, question, analysis, created_at FROM bazi_analyses/.test(s)) {
        // 记录端点那两条 SELECT（带 chart_id 与不带各一条）。参数顺序：
        //   [username, chartId] 或 [username]
        t.sqls.push(s);
        const [u, c] = params;
        let out = t.baziRows.filter((r) => r.user_id === u);
        if (/AND chart_id = \?/.test(s)) out = out.filter((r) => r.chart_id === c);
        // ⚠ 桩**不许**自己写死按 `created_at` 倒序 —— 那样「新到旧」这条断言验的是桩，
        // 不是源码（我第一次就是写死的，把源码的 DESC 改成 ASC 居然照样全绿）。
        // 正确做法：照 MySQL 的规矩办 —— **方向取自 SQL 原文**；没写 ORDER BY 就不排
        // （真库此时顺序不定，按插入顺序给，故「没排序」也会让那条断言红）。
        const dir = /ORDER BY created_at (ASC|DESC)/i.exec(s);
        if (dir) {
          const sign = dir[1].toUpperCase() === 'DESC' ? -1 : 1;
          out = out.slice().sort((a, b) => sign * (a.created_at - b.created_at));
        }
        return [out];
      }
      if (/^SELECT token_used, tier FROM users/.test(s)) {
        const [u] = params;
        return [t.users[u] ? [{ ...t.users[u] }] : []];
      }
      if (/^UPDATE users SET token_used/.test(s)) {
        const [add, u] = params;
        t.updates.push([add, u]);
        if (t.users[u]) t.users[u].token_used += add;
        return [{ affectedRows: t.users[u] ? 1 : 0 }];
      }
      t.errors.push(s);
      throw new Error('内存库不认这条 SQL：' + s.slice(0, 60));
    },
  };
  return db;
}

// ── 桩：上游模型 ──────────────────────────────────────────────────
// 返回 async 可迭代的帧序列（与真 SDK 的流同形），末帧带 usage ——
// 就是为了验「记账取真数」。`mode` 控制异常路径。
function makeOpenAI(rec, mode) {
  return class FakeOpenAI {
    constructor(cfg) { rec.cfg = cfg; }
    get chat() {
      return {
        completions: {
          create: async (payload) => {
            rec.calls.push(payload);
            if (mode === 'throw') throw new Error('上游连不上');
            const chunks = [];
            if (mode !== 'empty') {
              chunks.push({ choices: [{ delta: { content: '【一、结论】\n给你一句大白话的结论。' } }] });
              chunks.push({ choices: [{ delta: { content: '\n\n【二、你的现状】\n就这样。' } }] });
            }
            chunks.push({ choices: [{ delta: {} }], usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 } });
            return {
              async *[Symbol.asyncIterator]() { for (const c of chunks) yield c; },
            };
          },
        },
      };
    }
  };
}

function makeRes() {
  return {
    statusCode: null, headersSent: false, writableEnded: false, body: '', headers: {},
    _close: null,
    writeHead(c, h) { this.statusCode = c; this.headersSent = true; Object.assign(this.headers, h || {}); },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    write(s) { this.body += s; return true; },
    end() { this.writableEnded = true; },
    on(ev, fn) { if (ev === 'close') this._close = fn; },
    removeListener() {},
  };
}

/** 造一份被测实现（每个用例一份新的库与记录器）。 */
function makeHarness(opts) {
  const o = opts || {};
  const db = makeDb(o);
  const llm = { calls: [], cfg: null };
  const rag = { calls: [], fail: !!o.ragFail, empty: !!o.ragEmpty };
  const jsonRec = { status: null, obj: null };
  const ctx = { calls: [] };
  // 本次请求的 URL（带 query）。切出来的端点原文里有 `const url = new URL(...)`，
  // 而 `url` 在真服务里是**每个请求现算**的 —— 所以这里也必须是「取的时候才读」，
  // 传值进去就会取到构造那一刻的旧值（`?chartId=` 会被无声丢掉）。
  let reqUrl = '/';

  const fetchStub = async (url, init) => {
    rag.calls.push({ url, body: JSON.parse((init && init.body) || '{}') });
    if (rag.fail) throw new Error('检索服务连不上');
    const results = rag.empty ? [] : [
      { book_name: '滴天髓', chapter: '通神论', text: '甲木参天，脱胎要火。' },
      { book_name: '滴天髓', chapter: '通神论', text: '（同一本书的第二段，应被去重）' },
      { book_name: '穷通宝鉴', chapter: '正月甲木', text: '初春尚有余寒，得丙癸透，富贵双全。' },
      { book_name: '子平真诠', chapter: '论用神', text: '用神不可损伤。' },
    ];
    return { json: async () => ({ results }) };
  };

  const injectRequire = (name) => {
    if (name === 'openai') return makeOpenAI(llm, o.mode);
    throw new Error('本冒烟只注入过 openai，却要 require(' + name + ')');
  };

  // ⚠ 拼**字符串**而不是套模板串：切出来的源码里本身就有反引号
  // （古人名、`【古籍 N】…` 那种模板字面量），套一层反引号会当场把外层串截断。
  // ⚠ 这里也**不要**再 destructure `getTokenLimit` / `estimateTokens` ——
  // 下面两段就是它们的原文，重复声明会直接报错。
  const factory = new Function('D',
    'const { db, json, checkAuth, fetch, config, RAG_URL, crypto, JWT_SECRET, LLM_MODEL,\n'
    + '  LLM_MAX_TOKENS, LLM_REASONING_EFFORT, EMPTY_UPSTREAM_NOTICE,\n'
    + '  BAZI_REPORT_TEMPERATURE,\n'
    + '  baziFull, baziPromptLib, baziFortuneLib, baziReportLib, ganzhiLib, paipanConst, require } = D;\n'
    + TOKEN_LIMIT + '\n' + ESTIMATE + '\n'
    + "const POINTS_LABEL = '" + POINTS_LABEL + "';\n" + POINTS_TRAILER_SRC + '\n'
    + HELPERS + '\n'
    + 'async function handle(req, res, body, pathname) {\n'
    // ⚠ `url` 要**每次请求现取**（放在工厂体里就只算一次，第二次请求读到的是旧值）
    + "const url = new URL((D.reqUrl ? D.reqUrl() : '/'), 'http://localhost');\n"
    + ENDPOINT + RECORDS
    + "  throw new Error('端点没接这一条请求：' + pathname);\n}\n"
    + 'return { handle, baziChartFromParams, baziSearchQuery, baziRagContext, pointsTrailer, anonSign, anonReadCookie,'
    + ' BAZI_ASPECTS, ANON_IP_DAILY_CAP };');

  const impl = factory({
    db,
    json: (res, obj, status) => { jsonRec.status = status || 200; jsonRec.obj = obj; return res; },
    checkAuth: (req) => {
      const a = (req.headers && req.headers.authorization) || '';
      if (!a.startsWith('Bearer ')) return null;
      const u = a.slice(7);
      return ctx.tokens[u] || null;
    },
    fetch: fetchStub,
    config: { deepseek: { apiKey: 'sk-test-not-a-real-key', baseURL: 'http://stub' } },
    RAG_URL: 'http://rag',
    crypto: require('crypto'),
    JWT_SECRET: 'smoke-secret',
    estimateTokens: null,   // 由下面 TOKEN_LIMIT/ESTIMATE 段定义，此处占位不用
    getTokenLimit: null,
    LLM_MODEL: 'stub-model',
    // 惰性取值：`callParse`/`callRecords` 各自改它，`handle` 里现读（见 factory 里那行注释）
    reqUrl: () => reqUrl,
    // 用**源码里的真值**，不是本脚本另写一个 8000：这样线上把上限改小到会把正文
    // 挤没的程度，下面那条断言会真的红（改本脚本自己那个数才红——那是橡皮章）
    LLM_MAX_TOKENS,
    LLM_REASONING_EFFORT,
    EMPTY_UPSTREAM_NOTICE,
    BAZI_REPORT_TEMPERATURE,
    baziFull, baziPromptLib, baziFortuneLib, baziReportLib, ganzhiLib, paipanConst,
    require: injectRequire,
  });

  /** 发一次解读请求。`cookie` 原样回传上一次的 Set-Cookie。 */
  async function callParse({ body, cookie, token, ip, clientGoneAfterFirstChunk }) {
    const res = makeRes();
    reqUrl = '/api/bazi/parse';   // 别让上一次记录端点留下的 query 串到这条上来

    const req = {
      method: 'POST',
      headers: Object.assign({ 'x-forwarded-for': ip || '10.0.0.9' },
        cookie ? { cookie } : {}, token ? { authorization: 'Bearer ' + token } : {}),
      socket: { remoteAddress: '10.0.0.9' },
    };
    if (clientGoneAfterFirstChunk) {
      // 模拟「用户中途关掉页面」：第一段写进去之后立刻触发 close
      const origWrite = res.write.bind(res);
      let n = 0;
      res.write = (s) => { const r = origWrite(s); if (++n === 1 && res._close) res._close(); return r; };
    }
    try {
      await impl.handle(req, res, body, '/api/bazi/parse');
    } catch (e) {
      res.throwMsg = e.message;
    }
    // ⚠ 端点抛错时**当场喊一声**。不喊的话症状长这样：`流式响应 200 —— null`、
    //   紧接着 `payload.max_tokens` 读 undefined 把脚本崩掉 —— 一串看不懂的 ✗，
    //   而真正的原因（比如新 require 的模块没注入）一个字都不露面。
    //   2026-09-25 首次解读改用 `bazi_report.js` 时就是这么被瞒过去的。
    if (res.throwMsg) console.error(`   ⚠ 端点抛错：${res.throwMsg}`);
    return { res, json: { ...jsonRec }, throwMsg: res.throwMsg };
  }

  /** 调一次「解析记录」端点（只读）。`query` 形如 `?chartId=chart_1`。 */
  async function callRecords({ token, query, method }) {
    const res = makeRes();
    reqUrl = '/api/bazi-analyses' + (query || '');
    const req = {
      method: method || 'GET',
      headers: token ? { authorization: 'Bearer ' + token } : {},
      socket: { remoteAddress: '10.0.0.9' },
    };
    try {
      await impl.handle(req, res, null, '/api/bazi-analyses');
    } catch (e) {
      res.throwMsg = e.message;
    }
    return { res, json: { ...jsonRec } };
  }

  return { impl, db, llm, rag, ctx, callParse, callRecords, jsonRec };
}

const BIRTH = { y: 1984, mo: 2, d: 4, h: 12, mi: 0, gender: '男' };

// 用例全是 await 的（端点本身就是流式异步）。包一层 main：本文件是 CommonJS，
// 顶层 await 会让 node 判不出模块格式而直接报错（ERR_AMBIGUOUS_MODULE_SYNTAX）。
async function main() {

// ══════ 用例 ══════════════════════════════════════════════════════
console.log('▌八字解读端点 `/api/bazi/parse`');

// ── ① 游客第一次：放行，且用的是共用件 ─────────────────────────────
console.log('\n① 游客第一次解析「事业」：放行');
{
  const h = makeHarness();
  const r = await h.callParse({ body: { ...BIRTH, tab: '事业', question: '我今年适合换工作吗' } });
  check('流式响应 200', r.res.statusCode === 200, JSON.stringify(r.res.statusCode));
  check('正文是模型给的三段（流式照写）',
    /【一、结论】/.test(r.res.body) && /【二、你的现状】/.test(r.res.body),
    JSON.stringify(r.res.body.slice(0, 120)));
  // 标签从切出来的常量取 —— 写死「消耗 Token」的话，标签一改名这条就恒真了
  check('游客的正文里**没有**记账尾巴（那一行是登录用户的）',
    r.res.body.indexOf(POINTS_LABEL) < 0 && r.res.body.indexOf('消耗 Token') < 0,
    JSON.stringify(r.res.body.slice(-80)));
  const sc = r.res.headers['set-cookie'] || '';
  check('发了游客身份 cookie（HttpOnly + 一年）',
    /^sqw_anon=[0-9a-f]{24}\.[A-Za-z0-9_-]{43};/.test(sc) && /HttpOnly/.test(sc) && /Max-Age=31536000/.test(sc),
    JSON.stringify(sc));
  check('游客**不落库**（没有 bazi_analyses 行）', h.db._t.analyses.length === 0,
    JSON.stringify(h.db._t.analyses));
  check('游客用量记了一笔（这才是「一次」的判据）',
    h.db._t.anon.length === 1 && h.db._t.anon[0].kind === 'bazi', JSON.stringify(h.db._t.anon));
  check('没记 token（游客的额度是「次数」，不是 token）', h.db._t.updates.length === 0,
    JSON.stringify(h.db._t.updates));
  check('库没有不认的 SQL（桩没兜住 = 用例其实没跑到）',
    h.db._t.errors.length === 0, JSON.stringify(h.db._t.errors));

  const payload = h.llm.calls[0];
  // 上游是**推理模型**：`max_tokens` 是「思考 + 正文」的合计上限，思考吃光预算时
  // `finish_reason='length'`、正文 0 字。容器内实测：3000 时思考 3551 字、正文 0 字
  // （用户拿到空白）；8000 时思考 7080 + 正文 3113、正常出文。故下限取 6000 ——
  // 它挡的是「有人把上限按回答长度去理解、又改回 3000」这一类回退。
  check('token 上限给「思考」留了余量（≥6000，且与源码里的真值一致）',
    payload.max_tokens === LLM_MAX_TOKENS && payload.max_tokens >= 6000,
    JSON.stringify({ 发给上游: payload.max_tokens, 源码: LLM_MAX_TOKENS }));
  // 「关思考 + 低温」是首读这条路上**真正在承重的两个开关**，不是风格偏好：
  //   · 不关思考 → 思考与正文抢同一个 token 预算，实测 3 次里 2 次 `length` 截断；
  //   · 温度不压 → 同一张盘打分飘（实测 0.7 时 3 次极差远大于 0.3 时的 1 分）。
  // 所以判据取「真的照这个值发出去了」，而不是「源码里写着 0.3」——
  // 后者在「有人把赋值那行注释掉、params 用默认 0.7」时照样绿。
  check('首读**关掉了思考**（thinking.type=disabled）',
    payload.thinking && payload.thinking.type === 'disabled',
    JSON.stringify(payload.thinking));
  check('首读温度取自源码里那个常量（不靠 SDK 默认值）',
    payload.temperature === BAZI_REPORT_TEMPERATURE && BAZI_REPORT_TEMPERATURE > 0
    && BAZI_REPORT_TEMPERATURE <= 0.5,
    JSON.stringify({ 发给上游: payload.temperature, 源码: BAZI_REPORT_TEMPERATURE }));
  check('关思考时**不并发**给 reasoning_effort（两者不并存，实测并发会被上游拒）',
    payload.reasoning_effort === undefined, JSON.stringify(payload.reasoning_effort));
  // ⚠ 首次解读自 2026-09-25 起走 `bazi_report.js`（命盘评分 + 8 模块），**不是**
  //   `bazi_prompt.js` 的 `baziSystem()` —— 那一条是 shushu 三段式，现在归追问用。
  //   这两条断言**逐字**比，不是「含四柱就算过」：只查「含某几个字」的话，
  //   把模板换一份、把评分规范整段删掉，照样全绿（本仓库对橡皮章的教训）。
  check('首次解读的 system 逐字等于 `baziReportSystem()`（评分 + 8 模块那份规范）',
    payload.messages[0].content === baziReportLib.baziReportSystem(),
    JSON.stringify(payload.messages[0].content.slice(0, 60)));
  // 不在这里另抄一份模块名清单（我抄的第一版就把「事业与学业」写成了「事业与财运」，
  // 于是一条其实没问题的断言红了）。判据只数「有几个 ### N. 模块标题」并核对首末两个。
  const modHeads = (payload.messages[0].content.match(/^### \d+\. .+$/gm) || []);
  check('首次解读的 system 里带着评分规格与 8 个模块（不是一份空规范）',
    /命盘评分/.test(payload.messages[0].content) && modHeads.length === 8
    && /^### 1\. 性格与天赋$/.test(modHeads[0]),
    JSON.stringify({ 模块标题: modHeads }));
  // 四柱从**同一个**取盘函数现算，不写死干支 —— 写死的话历法一改就变成在验夹具
  const built = h.impl.baziChartFromParams(BIRTH);
  const chartFor = built.chart;
  const pillars = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar']
    .map((k) => chartFor[k].tiangan + chartFor[k].dizhi);
  // 用户段**逐字**比：拿端点自己那个出口 `baziReportPrompt` 现算一份来对照。
  // 检索结果也是现取（同一套桩、同一个函数），不在本脚本里另抄一段假的古籍文本 ——
  // 抄一段的话，RAG 的拼装格式改了（比如书名字段改名），这里照样绿。
  const ragText = await h.impl.baziRagContext(chartFor, '事业', '我今年适合换工作吗');
  check('用户段逐字等于 `baziReportPrompt()`（含四柱、含检索来的古籍）',
    payload.messages[1].content === baziReportLib.baziReportPrompt(chartFor, {
      tab: '事业', question: '我今年适合换工作吗', ragText, currentYear: built.thisYear,
    }),
    JSON.stringify({ pillars, len: payload.messages[1].content.length }));
  check('四柱真的在那段用户消息里（`baziReportPrompt` 逐字比过了，这条防的是它自己漏柱）',
    pillars.every((g) => payload.messages[1].content.indexOf(g) >= 0)
    && payload.messages[1].content.indexOf('事业') >= 0,
    JSON.stringify({ pillars, head: payload.messages[1].content.slice(0, 100) }));
  check('用户段含检索来的古籍（去重后按书取前三本）',
    /【古籍 1】《滴天髓》/.test(payload.messages[1].content)
    && /【古籍 2】《穷通宝鉴》/.test(payload.messages[1].content)
    && /【古籍 3】《子平真诠》/.test(payload.messages[1].content),
    JSON.stringify((payload.messages[1].content.match(/【古籍 \d】《[^》]+》/g) || [])));
  // 取检索调用时**不假设它一定存在**：没检索时这里要报一条 ✗，而不是把脚本崩掉
  // （崩掉会让后面所有断言都不出声 —— 变异测试时正是这么发现的：判据取错字段那次
  //   `h.rag.calls[0]` 是 undefined，整个脚本以退出码 2 收场，看不出是哪条断言不对）。
  const ragBody = (h.rag.calls[0] || {}).body || {};
  check('检索词是「日主+月令+格局+方面+提问」这条形状',
    String(ragBody.query || '').indexOf('事业') >= 0
    && String(ragBody.query || '').indexOf('我今年适合换工作吗') >= 0
    && [].concat(ragBody.categories || []).join(',') === 'bazi,yijing',
    JSON.stringify(h.rag.calls.map((c) => c.body)));
  check('把用户那句提问也带进了盘材料',
    /我今年适合换工作吗/.test(payload.messages[1].content), '提问没进去');
}

// ── ② 同一个游客第二次：拦住，并明说要登录 ─────────────────────────
console.log('\n② 同一个游客再解一次：拦，并说清为什么要登录');
{
  const h = makeHarness();
  const first = await h.callParse({ body: { ...BIRTH, tab: '事业' } });
  const cookie = (first.res.headers['set-cookie'] || '').split(';')[0];
  const callsBefore = h.llm.calls.length;
  const second = await h.callParse({ body: { ...BIRTH, tab: '财运' }, cookie });
  check('第二次 403', second.json.status === 403, JSON.stringify(second.json));
  check('带 needLogin 标记（前端据此弹登录）', second.json.obj && second.json.obj.needLogin === true,
    JSON.stringify(second.json.obj));
  check('**一个字都没问模型**（拦在花钱之前）', h.llm.calls.length === callsBefore,
    `${callsBefore} → ${h.llm.calls.length}`);
  check('没有第二次记账', h.db._t.anon.length === 1, JSON.stringify(h.db._t.anon));
}

// ── ③ 游客不许解「综合」（含没填 tab） ─────────────────────────────
console.log('\n③ 游客不许解「综合」（不填 tab 也算综合）');
{
  for (const tab of ['综合', '', '乱七八糟']) {
    const h = makeHarness();
    const r = await h.callParse({ body: { ...BIRTH, tab } });
    check(`tab=${JSON.stringify(tab)} → 403 且要登录`,
      r.json.status === 403 && r.json.obj.needLogin === true, JSON.stringify(r.json));
    check(`tab=${JSON.stringify(tab)} → 没问模型、没记用量、没发 cookie`,
      h.llm.calls.length === 0 && h.db._t.anon.length === 0 && !r.res.headers['set-cookie'],
      JSON.stringify({ llm: h.llm.calls.length, anon: h.db._t.anon.length }));
  }
}

// ── ④ 登录用户：能解，且写进解析记录 ───────────────────────────────
console.log('\n④ 登录用户解析「婚姻」：落库 + 记账取真数');
{
  const h = makeHarness({ tokenUsed: 100 });
  h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
  const r = await h.callParse({
    body: { ...BIRTH, tab: '婚姻', chartId: 'chart_7', question: '什么时候有姻缘' },
    token: 'tok-alice',
  });
  check('200 且流式正文完整', r.res.statusCode === 200 && /【二、你的现状】/.test(r.res.body),
    JSON.stringify(r.res.body.slice(0, 80)));
  // 尾巴的**标签**取自切出来的 `POINTS_LABEL`（不写死字面量）：该常量 2026-09-25 已由
  // 「消耗 Token：」改成「消耗积分：」—— 写死旧字的断言在此之后是**永远为真**的橡皮章。
  // 三个数字必须满足「33 = 11 + 22」，因为那才是「记账取上游真数、不是本地估的」这条
  // 承诺：桩给的 usage 帧就是 11/22/33，本地估的话绝不可能正好凑成这个关系。
  check('登录用户的正文末尾有记账尾巴，且取的是上游真数（输入 11 + 输出 22 = 33）',
    r.res.body.indexOf(POINTS_LABEL) >= 0
    && /输入 11 \+ 输出 22 = 33/.test(r.res.body)
    && /剩余：/.test(r.res.body), JSON.stringify(r.res.body.slice(-110)));
  const a = h.db._t.analyses[0];
  check('写进解析记录：用户/命盘/方面/提问都对',
    h.db._t.analyses.length === 1 && a.user_id === 'alice' && a.chart_id === 'chart_7'
    && a.aspect === '婚姻' && a.question === '什么时候有姻缘',
    JSON.stringify(a && { u: a.user_id, c: a.chart_id, a: a.aspect, q: a.question }));
  check('**存下来的正文不含**那行记账尾巴（同一份内容不该两个样）',
    a && a.analysis.indexOf(POINTS_LABEL) < 0 && a.analysis.indexOf('消耗 Token') < 0
    && a.analysis.indexOf('【二、你的现状】') >= 0,
    JSON.stringify(a && a.analysis.slice(-60)));
  check('记账用的是**上游真数** 33（不是本地估的）',
    h.db._t.updates.length === 1 && h.db._t.updates[0][0] === 33 && h.db._t.updates[0][1] === 'alice',
    JSON.stringify(h.db._t.updates));
  check('登录用户不发游客 cookie', !r.res.headers['set-cookie'],
    JSON.stringify(r.res.headers['set-cookie']));
}

// ── ⑤ 额度用完的登录用户：回一句明说的，不报错码 ───────────────────
console.log('\n⑤ 登录用户额度已满：回一句明说的正文（与聊天同一条路）');
{
  const h = makeHarness({ tokenUsed: 999999999, tier: 0 });
  h.ctx.tokens = { 'tok-bob': { username: 'bob' } };
  h.db._t.users.bob = { token_used: 999999999, tier: 0 };
  const r = await h.callParse({ body: { ...BIRTH, tab: '健康' }, token: 'tok-bob' });
  check('200 + 正文说明（不是 4xx）', r.res.statusCode === 200 && /已用完/.test(r.res.body),
    JSON.stringify(r.res.body.slice(0, 60)));
  check('没问模型', h.llm.calls.length === 0, String(h.llm.calls.length));
  check('没落库', h.db._t.analyses.length === 0, JSON.stringify(h.db._t.analyses));
}

// ── ⑥ 用户中途关页面：不算用掉一次 ────────────────────────────────
console.log('\n⑥ 用户中途关掉页面（客户端断开）：不算用掉一次、不落库');
{
  const h = makeHarness();
  h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
  const r = await h.callParse({
    body: { ...BIRTH, tab: '财运' }, token: 'tok-alice', clientGoneAfterFirstChunk: true,
  });
  check('流量中断后不再记 token', h.db._t.updates.length === 0, JSON.stringify(h.db._t.updates));
  check('不落库（用户没看见的解读不算数）', h.db._t.analyses.length === 0,
    JSON.stringify(h.db._t.analyses));

  const g = makeHarness();
  await g.callParse({ body: { ...BIRTH, tab: '财运' }, clientGoneAfterFirstChunk: true });
  check('游客版同理：断开就不记那一次（否则平白烧掉他唯一的机会）',
    g.db._t.anon.length === 0, JSON.stringify(g.db._t.anon));
}

// ── ⑦ 一个字都没出来：也不算 ─────────────────────────────────────
console.log('\n⑦ 上游一个字都没出（empty）：不落库、不记账');
{
  const h = makeHarness({ mode: 'empty' });
  h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
  const r = await h.callParse({ body: { ...BIRTH, tab: '事业' }, token: 'tok-alice' });
  check('空流也正常收尾（200 且不是错误页）', r.res.statusCode === 200, JSON.stringify(r.res.statusCode));
  // ⚠ 这一条是后补的：原来只断言「200 且不是错误页」，**从没断言过正文里有没有东西** ——
  // 于是「200 + 0 字节」这种空白回复被判成了正常。线上真发生过（见进度 10），
  // 成因是思考把 `max_tokens` 吃光、正文 0 字（见 ① 那条上限断言）。
  check('**空流也必须给用户一句话**：不许是「200 + 0 字节」的空白回复',
    r.res.body.length > 0 && r.res.body === EMPTY_UPSTREAM_NOTICE,
    JSON.stringify(r.res.body.slice(0, 80)));
  check('不落库', h.db._t.analyses.length === 0, JSON.stringify(h.db._t.analyses));
  check('不记 token（那句提示不算一次解析）', h.db._t.updates.length === 0,
    JSON.stringify(h.db._t.updates));
  const g = makeHarness({ mode: 'empty' });
  const gr = await g.callParse({ body: { ...BIRTH, tab: '事业' } });
  check('游客版：空流不烧他的那一次', g.db._t.anon.length === 0, JSON.stringify(g.db._t.anon));
  check('游客版同样拿到那句话，不是空白', gr.res.body === EMPTY_UPSTREAM_NOTICE,
    JSON.stringify(gr.res.body.slice(0, 80)));
}

// ── ⑧ 同 IP 日上限 ───────────────────────────────────────────────
console.log('\n⑧ 同 IP 游客用量到顶：回「明天再来」，不是静默失败');
{
  const h = makeHarness({ ipUsed: 20, ip: '10.0.0.9' });
  const r = await h.callParse({ body: { ...BIRTH, tab: '事业' }, ip: '10.0.0.9' });
  check('到顶 → 429 + 明说', r.json.status === 429 && /今天的免费额度已用完/.test(r.json.obj.error),
    JSON.stringify(r.json));
  check('仍带 needLogin 标记（引导他去登录）', r.json.obj.needLogin === true, JSON.stringify(r.json.obj));
  check('没问模型', h.llm.calls.length === 0, String(h.llm.calls.length));
  const other = await h.callParse({ body: { ...BIRTH, tab: '事业' }, ip: '10.0.0.8' });
  check('换个 IP 的访客不受影响（挡的是批量，不是共用出口的邻居）',
    other.res.statusCode === 200, JSON.stringify(other.json));
}

// ── ⑨ 取古籍失败不影响解读 ───────────────────────────────────────
console.log('\n⑨ 取古籍失败（或检索无结果）：解读照做');
{
  for (const [label, opts] of [['检索服务连不上', { ragFail: true }], ['检索无结果', { ragEmpty: true }]]) {
    const h = makeHarness(opts);
    const r = await h.callParse({ body: { ...BIRTH, tab: '事业' } });
    const p = h.llm.calls[0];
    check(`${label} → 照样出正文`, r.res.statusCode === 200 && /【一、结论】/.test(r.res.body),
      JSON.stringify(r.res.body.slice(0, 60)));
    check(`${label} → 没把 RAG 的空结果塞成「【古籍 1】《undefined》」`,
      p && p.messages[1].content.indexOf('undefined') < 0, '正文里出现了 undefined');
  }
}

// ── ⑩ 伪造的签名 cookie ──────────────────────────────────────────
console.log('\n⑩ 伪造/篡改的游客 cookie：当新访客（不是当成已用过）');
{
  const h = makeHarness();
  const forged = 'sqw_anon=' + 'a'.repeat(24) + '.' + 'b'.repeat(43);
  const r = await h.callParse({ body: { ...BIRTH, tab: '事业' }, cookie: forged });
  check('篡改的签名解不出来 → 按新访客放行', r.res.statusCode === 200, JSON.stringify(r.json));
  check('并给他发了一份新的合法 cookie', !!r.res.headers['set-cookie'],
    JSON.stringify(r.res.headers['set-cookie']));
  check('签名校验是「长度相同才逐字节比」的那种实现（先自己签一个真的能过）',
    h.impl.anonReadCookie({ headers: { cookie: 'sqw_anon=' + 'a'.repeat(24) + '.' + h.impl.anonSign('a'.repeat(24)) } }) === 'a'.repeat(24),
    '真签名反而过不了');
  check('签名换个密匙就不过（说明确实在校验，不是只看格式）',
    h.impl.anonReadCookie({ headers: { cookie: 'sqw_anon=' + 'a'.repeat(24) + '.' + 'x'.repeat(43) } }) === null,
    '假签名被放过了');
}

// ── ⑪ 参数不全 / 方面清单 ─────────────────────────────────────────
console.log('\n⑪ 入参与方面清单');
{
  const h = makeHarness();
  const r = await h.callParse({ body: { tab: '事业' } });
  check('缺出生日期 → 400 且说缺什么', r.json.status === 400 && /缺少出生日期/.test(r.json.obj.error),
    JSON.stringify(r.json));
  check('五个方面按界面顺序', h.impl.BAZI_ASPECTS.join(',') === '综合,事业,财运,婚姻,健康',
    h.impl.BAZI_ASPECTS.join(','));
  check('同 IP 日上限是个明确的数（20），不是随手写的魔法值藏在 SQL 里',
    h.impl.ANON_IP_DAILY_CAP === 20, String(h.impl.ANON_IP_DAILY_CAP));

  // 检索词形状：日主 + 月令 + 格局 + 方面
  const chart = baziFull.buildBaziFull({ y: 1984, mo: 2, d: 4, h: 12, mi: 0 }, { gender: 'male', birthYear: 1984, currentYear: 2026 });
  const q = h.impl.baziSearchQuery(chart, '事业', '');
  check('检索词含日主与「X月」与方面，且不含整张盘',
    q.indexOf(chart.day_pillar.tiangan) >= 0 && /月/.test(q) && q.indexOf('事业') >= 0 && q.length < 40,
    JSON.stringify(q));
}

// ══════════════════════════════════════════════════════════════════

// ── ⑫ 两条 AI 线不许分叉（文件级不变量，不是行为用例）──────────────
//
// 为什么放在这里：本端点与 `/api/chat/send` 是**两份平行的流式实现**（早晚要合成一份，
// 现在还没合）。上面那些行为用例只覆盖本端点这一份；聊天那一份**没有任何冒烟**
// （它要登录，没有测试账号，线上也验不了）。而这次修的恰好是两边共有的毛病 ——
// 于是这里用最便宜的办法钉住**不变量**：两条线必须用同一个上限常量、都必须有
// 「空正文补一句」的守卫。谁改回去，这里就红 —— 比给聊天那条线再抄一整套桩耐用。
console.log('\n⑫ 文件级不变量：两条 AI 线不许分叉');
{
  const hardcoded = src.match(/max_tokens:\s*\d+/g) || [];
  check('没有哪条 AI 线自己写死 token 上限（都得走 LLM_MAX_TOKENS）',
    hardcoded.length === 0, JSON.stringify(hardcoded));
  const usesConst = (src.match(/max_tokens: LLM_MAX_TOKENS/g) || []).length;
  check('两条 AI 线都用了这个共用常量（解读 + 聊天）', usesConst === 2, String(usesConst));
  // 思考强度这一项**两条线写法不同**，别再用同一个字面模式去数：
  //   · 聊天线（`/api/chat/send`）整份 params 一次写死 → `reasoning_effort: LLM_REASONING_EFFORT`
  //   · 八字线按 `noThinking` 分支 → `params.reasoning_effort = LLM_REASONING_EFFORT`（追问那支）
  // 原来只数前一种、要求 === 2，八字首读改成「关思考」之后这个数就变成 1，
  // 断言红的表象是「有个 AI 线没传思考强度」，其实两条线都传得好好的 ——
  // 判据跟不上实现的形状改变，是比漏判更常见的假警报来源。
  const efforts = (src.match(/reasoning_effort[^\n]*LLM_REASONING_EFFORT/g) || []).length;
  check('两条 AI 线都显式传了思考强度（不靠上游默认值变化）', efforts === 2, String(efforts));
  // 八字线**首读那支**必须关思考：`thinking` 与 `reasoning_effort` 二选一，两者都给会被拒。
  // 这条钉的是「分支还在」——有人把 if 拆了、或把两行写成都在，这里就红。
  const thinkingOff = (src.match(/params\.thinking = \{ type: 'disabled' \};/g) || []).length;
  check('八字线有一条「关思考」分支（`thinking:{type:disabled}`，与上面那个二选一）',
    thinkingOff === 1, String(thinkingOff));
  check('思考强度是官方文档里的取值之一',
    ['low', 'high', 'max'].indexOf(LLM_REASONING_EFFORT) >= 0, LLM_REASONING_EFFORT);
  const guards = (src.match(/if \(!fullText && !wroteFallback/g) || []).length;
  check('两条 AI 线都有「空正文 → 补一句白话」的守卫', guards === 2, String(guards));
  const notices = (src.match(/res\.write\(EMPTY_UPSTREAM_NOTICE\)/g) || []).length;
  check('两条 AI 线用的是同一句提示（不是各写一句）', notices === 2, String(notices));
}

// ── ⑬ 解析记录端点（只读）─────────────────────────────────────────
//
// 为什么单独一段：这个端点是**另加**的（前端「每方面一条 + 旧版可展开」要用它），
// 位置在文件的记录区，**不在**上面两个切片窗口里，所以自己切一段。
// 它是**只读**的 —— 写入口只有 `/api/bazi/parse` 一个。这条约定很便宜就能钉死：
// 谁哪天顺手加个 POST/DELETE，这里的静态断言就红。
console.log('\n⑬ 解析记录端点：只读、只看自己的、新到旧');
{
  const rows = [
    { id: 1, user_id: 'alice', chart_id: 'chart_1', aspect: '事业', question: 'q1',
      analysis: 'A1', created_at: 1000 },
    { id: 2, user_id: 'alice', chart_id: 'chart_2', aspect: '财运', question: 'q2',
      analysis: 'A2', created_at: 3000 },
    { id: 3, user_id: 'alice', chart_id: 'chart_1', aspect: '婚姻', question: 'q3',
      analysis: 'A3', created_at: 2000 },
    { id: 4, user_id: 'bob', chart_id: 'chart_1', aspect: '健康', question: 'q4',
      analysis: 'BOB 的隐私', created_at: 4000 },   // 别人的，绝不该出现
  ];

  // ① 未登录：401，且**一条 SQL 都不查**（先验身份再查库，别查出来再判断）
  {
    const h = makeHarness({ baziRows: rows });
    const r = await h.callRecords({});
    check('未登录 → 401 且说「请先登录」',
      r.json.status === 401 && /请先登录/.test(r.json.obj.error), JSON.stringify(r.json));
    check('未登录时**一条 SQL 都没跑**（不是查完再判断）', h.db._t.sqls.length === 0,
      JSON.stringify(h.db._t.sqls));
  }

  // ② 登录：只看自己的，且新到旧
  {
    const h = makeHarness({ baziRows: rows });
    h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
    const r = await h.callRecords({ token: 'tok-alice' });
    const list = r.json.obj;
    check('200 且是数组', r.json.status === 200 && Array.isArray(list), JSON.stringify(r.json));
    check('**只看得到自己的**（bob 的记录不出现，且正文里没有他那段）',
      list.length === 3 && list.every((x) => String(x.analysis).indexOf('BOB') < 0),
      JSON.stringify(list.map((x) => x.id)));
    check('新到旧（3000 → 2000 → 1000，不是库里的自然顺序）',
      list.map((x) => x.createdAt).join(',') === '3000,2000,1000',
      list.map((x) => x.createdAt).join(','));
    check('字段名是前端要的驼峰（chartId/aspect/question/analysis/createdAt）',
      Object.keys(list[0]).sort().join(',')
        === 'analysis,aspect,chartId,createdAt,id,question',
      Object.keys(list[0]).join(','));
    check('SQL 里带了 user_id 过滤（不是取回来再筛）',
      /WHERE user_id = \?/.test(h.db._t.sqls[0]), JSON.stringify(h.db._t.sqls[0]));
  }

  // ③ `?chartId=` 只回那一副盘的
  {
    const h = makeHarness({ baziRows: rows });
    h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
    const r = await h.callRecords({ token: 'tok-alice', query: '?chartId=chart_1' });
    const list = r.json.obj;
    check('?chartId=chart_1 → 只剩这一副盘的两条', list.length === 2
      && list.every((x) => x.chartId === 'chart_1'), JSON.stringify(list.map((x) => x.id)));
    check('过滤下推到了 SQL 里（不是全取回来在 Node 里筛）',
      /AND chart_id = \?/.test(h.db._t.sqls[0]), JSON.stringify(h.db._t.sqls[0]));
  }

  // ④ 「只读」这条约定，静态钉死
  {
    // ⚠ 必须**先去掉注释**再找：这段源码的注释里正写着「这里没有 POST/PATCH/DELETE」，
    // 不剥注释的话那条说明自己会被当成写库语句 —— 我第一次就是这么误报的。
    const code = RECORDS.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const bad = (code.match(/\b(INSERT|UPDATE|DELETE|REPLACE)\b/gi) || []);
    check('切片里没有写库语句（这个端点只读）', bad.length === 0, JSON.stringify(bad));
    check('切片里确实在查表（不是切了个空段子）',
      /SELECT[\s\S]*FROM bazi_analyses/.test(RECORDS), RECORDS.slice(0, 60));
  }

  // ⑤ 非 GET：明确「没接」，不静默成功
  {
    const h = makeHarness({ baziRows: rows });
    h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
    const r = await h.callRecords({ token: 'tok-alice', method: 'POST' });
    check('POST → 明确报「没接这一条」，不静默返回成功',
      /端点没接这一条请求/.test(r.res.throwMsg || ''), JSON.stringify(r.res.throwMsg));
  }
}

// ── ⑭ 追问：要，但不落库（2026-09-25 拍板）──────────────────────────
//
// `followUp` 非空 = 这一次是追问：换模板 + 换上下文 + **不落库**。
// 三件事同一个判据（见端点注释），故这里逐条验、并验「`question` 不是追问的判据」。
console.log('\n⑭ 追问：换模板、带上下文、不落库');
{
  // ① 登录用户追问：正文照出、钱照记、**库不写**
  const CTX = 'X'.repeat(1500) + '尾巴标记';
  {
    const h = makeHarness({ tokenUsed: 100 });
    h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
    const r = await h.callParse({
      body: { ...BIRTH, tab: '婚姻', chartId: 'chart_7', followUp: '那什么时候会好转？', context: CTX },
      token: 'tok-alice',
    });
    check('200 且流式正文完整（追问照样出正文）',
      r.res.statusCode === 200 && /【二、你的现状】/.test(r.res.body),
      JSON.stringify(r.res.body.slice(0, 80)));
    check('**不落库**（追问不是一份独立解读）', h.db._t.analyses.length === 0,
      JSON.stringify(h.db._t.analyses));
    check('token 照记（33，用的还是上游真数）—— 「只跳过落库这一步」',
      h.db._t.updates.length === 1 && h.db._t.updates[0][0] === 33
      && h.db._t.updates[0][1] === 'alice', JSON.stringify(h.db._t.updates));

    const user = h.llm.calls[0].messages[1].content;
    check('走的是**追问模板**：有【追问】【之前解读】',
      /【追问】/.test(user) && /【之前解读】/.test(user), JSON.stringify(user.slice(0, 80)));
    // ⚠ 判据**换成首读规格独有的那句**：「没有『请按步骤深度分析』」在 2026-09-25 之后
    //   成了恒真的废话 —— 那句话已经从两份模板里都删掉了（它绑的是 shushu 三段式）。
    //   现在两份模板的判别标志是：首读那份要求「输出『一、命盘评分』与『二、综合内容』」，
    //   追问那份带【追问】【之前解读】。两条断言各查一边，互相为对方的反例。
    check('**不是**首读那份规格（没有要「一、命盘评分」的整表要求）',
      user.indexOf('一、命盘评分') < 0 && user.indexOf('请按步骤深度分析') < 0,
      JSON.stringify(user.slice(-120)));
    check('追问原话进了正文材料', user.indexOf('那什么时候会好转？') >= 0, '追问没进去');
    check('带上了刚才那份解读的**尾部**（用户问「那…呢」指的就是它）',
      user.indexOf('尾巴标记') >= 0, '上一份解读没进去');
    check('`context` 只留尾部一段（1500 字那份整篇不能原样进正文）',
      user.indexOf('X'.repeat(1500)) < 0, '整篇 context 都进去了（没截）');
    // 用户段**逐字等于共用渲染器的产物** —— 端点不许自己拼追问串（与 ① 的 system 段同一手法）。
    // 这样「截尾窗口多大」是共用函数说了算，本脚本不写死那个数。
    check('用户段逐字等于共用的 `baziFollowUpPrompt()`',
      user === baziPromptLib.baziFollowUpPrompt(h.impl.baziChartFromParams(BIRTH).chart,
        { tab: '婚姻', followUp: '那什么时候会好转？', context: CTX }),
      JSON.stringify(user.slice(0, 80)));
    check('追问**不检索古籍**（那份解读当初就是带着古籍生成的，不再检索一遍）',
      h.rag.calls.length === 0, JSON.stringify(h.rag.calls.length));
  }

  // ② `question` 不是追问的判据：首次带提问 → 完整模板 + 照常落库
  {
    const h = makeHarness({ tokenUsed: 100 });
    h.ctx.tokens = { 'tok-alice': { username: 'alice' } };
    const r = await h.callParse({
      body: { ...BIRTH, tab: '事业', chartId: 'chart_8', question: '我今年适合换工作吗' },
      token: 'tok-alice',
    });
    const user = h.llm.calls[0].messages[1].content;
    check('首次带提问 → 走的仍是**首读那份模板**（要求「一、命盘评分」，不是追问模板）',
      user.indexOf('一、命盘评分') >= 0 && user.indexOf('【追问】') < 0,
      JSON.stringify(user.slice(-120)));
    check('首次带提问 → 照样检索古籍（检索词里也带那句提问）',
      h.rag.calls.length === 1
      && h.rag.calls[0].body.query.indexOf('我今年适合换工作吗') >= 0,
      JSON.stringify(h.rag.calls.map((c) => c.body.query)));
    check('首次带提问 → **照常落库**（提问也存进去）',
      h.db._t.analyses.length === 1
      && h.db._t.analyses[0].question === '我今年适合换工作吗',
      JSON.stringify(h.db._t.analyses.map((x) => x.question)));
    check('首次带提问的正文照样 200', r.res.statusCode === 200, String(r.res.statusCode));
  }

  // ③ 追问**不豁免闸门**：游客那两条规矩对它一样成立
  {
    // 游客一上来就带 followUp 解「综合」→ 照样 403（闸在追问之前）
    const h1 = makeHarness();
    const r1 = await h1.callParse({
      body: { ...BIRTH, tab: '综合', followUp: '为什么？', context: 'x' },
    });
    check('游客带 followUp 解「综合」→ 照样 403 + needLogin',
      r1.json.status === 403 && r1.json.obj.needLogin === true, JSON.stringify(r1.json));
    check('拦在花钱之前：没问模型、没记用量',
      h1.llm.calls.length === 0 && h1.db._t.anon.length === 0,
      JSON.stringify({ llm: h1.llm.calls.length, anon: h1.db._t.anon.length }));

    // 游客第一次正常解完 → 再用 followUp 追问 → 还是 403（「只免费一次」对追问同样算数）
    const h2 = makeHarness();
    const first = await h2.callParse({ body: { ...BIRTH, tab: '事业' } });
    const cookie = (first.res.headers['set-cookie'] || '').split(';')[0];
    const callsBefore = h2.llm.calls.length;
    const r2 = await h2.callParse({
      body: { ...BIRTH, tab: '事业', followUp: '那明年呢？', context: '上一份' },
      cookie,
    });
    check('游客用过一次后再追问 → 403（追问**不算**新的一次免费）',
      r2.json.status === 403 && r2.json.obj.needLogin === true, JSON.stringify(r2.json));
    check('追问那道 403 也没问模型', h2.llm.calls.length === callsBefore,
      `${callsBefore} → ${h2.llm.calls.length}`);
    check('游客追问不落库（本来也不落）', h2.db._t.analyses.length === 0,
      JSON.stringify(h2.db._t.analyses));
  }
}

}   // ← main()

main().then(() => {
  if (fails.length) {
    console.log(`\n❌ 八字解读冒烟：${fails.length} 项失败\n   ` + fails.join('\n   '));
    process.exit(1);
  }
  console.log('\n✅ 八字解读冒烟：全部通过');
  console.log('   （本机内存库 + 桩模型；不含真 MySQL、真模型与前端展示）');
}).catch((e) => {
  console.error('❌ 冒烟脚本自身出错：', e);
  process.exit(2);
});

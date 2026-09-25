/**
 * AI三千问 — Auth Server v2
 * 注册/登录(手机号+验证码) + 后台管理 API
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Solar } = require('lunar-javascript');
const config = require('./config.js');
const chatProxy = require('./chat-proxy.js');
const liuyaoPaipan = require('./paipan/liuyao.js');
const meihuaPaipan = require('./paipan/meihua.js');
const promptLib = require('./paipan/prompt.js');
const baziFull = require('./paipan/bazi_full.js');
const baziPromptLib = require('./paipan/bazi_prompt.js');
// 八字解读的**产品输出层**（2026-09-25 用户拍板的新输出规格：命盘评分 + 8 模块）。
// ⚠ 与 `bazi_prompt.js` 是两个东西，别互相替代：
//   · `bazi_prompt.js` = shushu 的**逐字移植**（算法：ctx 变量表 + 五段正文），由
//     `duipan/diff_bazi_prompt.py` 零申报把守 —— 改它一个字那一层就永久变红；
//   · `bazi_report.js` = **文案**（怎么讲给用户听），由 `duipan/check_bazi_report.js` 把守。
//   追问模板仍走 `baziPromptLib.baziFollowUpPrompt`（它不对拍，是产品自己的动作）。
const baziReportLib = require('./paipan/bazi_report.js');
const baziFortuneLib = require('./paipan/bazi_fortune.js');
const ganzhiLib = require('./paipan/ganzhi.js');
const paipanConst = require('./paipan/constants.js');

// ===== 阿里云号码认证服务（PNVS）短信验证码 =====
const DypnsapiClient = require('@alicloud/dypnsapi20170525').default;
const { Config } = require('@alicloud/openapi-client');
const { RuntimeOptions } = require('@alicloud/tea-util');

const SMS_CONFIG = {
  accessKeyId: config.alibaba.accessKeyId,
  accessKeySecret: config.alibaba.accessKeySecret,
  signName: config.alibaba.signName,
  templateCode: config.alibaba.templateCode,
  endpoint: 'dypnsapi.aliyuncs.com',
};

const smsClient = new DypnsapiClient(new Config({
  accessKeyId: SMS_CONFIG.accessKeyId,
  accessKeySecret: SMS_CONFIG.accessKeySecret,
  endpoint: SMS_CONFIG.endpoint,
}));
const smsRuntime = new RuntimeOptions({});

// 验证码 & 冷却存储（内存）
const codeStore = new Map();  // phone -> { code, expires, attempts }
const loginAttempts = new Map(); // phone -> unlockTime (ms)
const cooldownMap = new Map(); // phone -> lastSendTime(ms)
const SMS_COOLDOWN = 60;      // 60秒冷却
const CODE_EXPIRE_MIN = 5;    // 验证码有效期5分钟

function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

async function sendSmsVerifyCode(phone) {
  // 冷却检查
  const last = cooldownMap.get(phone);
  if (last) {
    const elapsed = Math.floor((Date.now() - last) / 1000);
    if (elapsed < SMS_COOLDOWN) {
      return { ok: false, error: `请等待 ${SMS_COOLDOWN - elapsed} 秒后再发送`, cooldown: SMS_COOLDOWN - elapsed };
    }
  }
  const code = generateCode();
  try {
    const { SendSmsVerifyCodeRequest } = require('@alicloud/dypnsapi20170525');
    const req = new SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: SMS_CONFIG.signName,
      templateCode: SMS_CONFIG.templateCode,
      templateParam: JSON.stringify({ code, min: String(CODE_EXPIRE_MIN) }),
      outId: `ai3000-${Date.now()}`,
    });
    const resp = await smsClient.sendSmsVerifyCodeWithOptions(req, smsRuntime);
    if (resp.body.code === 'OK') {
      cooldownMap.set(phone, Date.now());
      codeStore.set(phone, { code, expires: Date.now() + CODE_EXPIRE_MIN * 60 * 1000 });
      return { ok: true };
    }
    console.error('[SMS] Send failed:', resp.body.message);
    return { ok: false, error: '短信发送失败，请稍后重试' };
  } catch (e) {
    console.error('[SMS] Error:', e.message);
    return { ok: false, error: '短信服务异常' };
  }
}

function verifySmsCode(phone, inputCode) {
  const stored = codeStore.get(phone);
  if (!stored) return { ok: false, error: '请先获取验证码' };
  if (Date.now() > stored.expires) {
    codeStore.delete(phone);
    return { ok: false, error: '验证码已过期，请重新获取' };
  }
  // 失败次数限制：最多5次
  stored.attempts = (stored.attempts || 0) + 1;
  if (stored.attempts > 5) {
    codeStore.delete(phone);
    return { ok: false, error: '验证码尝试次数过多，请重新获取' };
  }
  if (stored.code !== String(inputCode)) {
    return { ok: false, error: '验证码错误，剩余' + (5 - stored.attempts) + '次尝试' };
  }
  // 验证成功，清除
  codeStore.delete(phone);
  return { ok: true };
}

const PORT = 3301;
const RAG_URL = process.env.RAG_URL || 'http://localhost:8800';

// 八字计算（23:00后算次日）
function calcBazi(year, month, day, hour, minute) {
  let adjYear = year, adjMonth = month, adjDay = day, baziHour = hour;
  if (hour >= 23) {
    const next = new Date(year, month - 1, day + 1);
    adjYear = next.getFullYear(); adjMonth = next.getMonth() + 1; adjDay = next.getDate();
    baziHour = 0;
  }
  try {
    const s = Solar.fromYmdHms(adjYear, adjMonth, adjDay, baziHour, minute || 0, 0);
    const l = s.getLunar();
    const ec = l.getEightChar();
    return {
      bazi: ec.getYearGan()+ec.getYearZhi()+' '+ec.getMonthGan()+ec.getMonthZhi()+' '+ec.getDayGan()+ec.getDayZhi()+' '+ec.getTimeGan()+ec.getTimeZhi(),
      lunarYear: l.getYear(),
      lunarMonth: l.getMonth(),
      lunarDay: l.getDay()
    };
  } catch(e) { return null; }
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const SECRET_FILE = path.join(DATA_DIR, '.jwt_secret');

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== Files =====
function readJSON(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===== 公告缓存（持久化 + 后台刷新） =====
const ANN_CACHE_FILE = path.join(DATA_DIR, 'announcement_cache.json');
let annCache = readJSON(ANN_CACHE_FILE, { ts: 0, text: '' });
annCache.loading = false;

async function refreshAnnCache() {
  if (annCache.loading) return;
  annCache.loading = true;
  try {
    const https = require('https');
    const annData = await new Promise((resolve, reject) => {
      https.get('https://share.weiyun.com/qo2KUkDw', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 8000,
      }, (resp) => {
        let data = '';
        resp.on('data', chunk => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const match = annData.match(/window\.syncData\s*=\s*(\{[\s\S]*?\});/);
    if (!match) { annCache.loading = false; return; }

    const syncData = JSON.parse(match[1]);
    const notes = syncData?.shareInfo?.note_list || [];
    const note = notes[0];
    if (!note) { annCache.loading = false; return; }

    const htmlContent = note.html_content || '';
    const plainText = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .trim();

    annCache.ts = Date.now();
    annCache.text = plainText;
    writeJSON(ANN_CACHE_FILE, { ts: annCache.ts, text: annCache.text });
  } catch (e) {
    console.error('Announcement refresh error:', e.message);
  } finally {
    annCache.loading = false;
  }
}

// 启动时预加载（不阻塞）
refreshAnnCache();

// ===== Crypto helpers =====
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  // 先尝试新版 600000 迭代
  let verify = crypto.pbkdf2Sync(password, salt, 600000, 64, 'sha512').toString('hex');
  try {
    if (crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verify))) return true;
  } catch(e) {}
  // 兼容旧版 10000 迭代的哈希
  verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verify));
  } catch(e) { return false; }
}

// ===== Admin (hashed credentials stored in file) =====
const defaultAdmin = {
  username: config.admin.username || 'CQA',
  passwordHash: hashPassword(config.admin.password),
  loginAttempts: 0,
  lockedUntil: 0,
};

const admin = readJSON(ADMIN_FILE, defaultAdmin);
// Ensure password is hashed (migrate from plaintext if needed)
if (!admin.passwordHash || admin.passwordHash.length < 20) {
  admin.passwordHash = hashPassword(config.admin.password);
  writeJSON(ADMIN_FILE, admin);
}
// Ensure username (use config value if admin file is new)
if (!admin.username) {
  admin.username = config.admin.username || 'CQA';
  writeJSON(ADMIN_FILE, admin);
}

const MAX_LOGIN_ATTEMPTS = 5;
const USER_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min lockout
const ADMIN_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24h
const LLM_MODEL = 'deepseek-v4-flash';

// 上游一次回答的 token 上限 —— **两条 AI 线共用这一个数**，不许各写各的。
//
// ⚠ 这个数不是「回答长度」。`deepseek-v4-flash` 默认**开着思考**（官方文档：思考模式
// 默认打开、强度默认 high），思考先走 `reasoning_content`（用户看不见），而在本模型上
// 实测**思考与正文共用这一个预算**：思考吃满就 `finish_reason='length'`，正文可能一个字
// 都没有。原来的 3000 在难问题上几乎必翻车 —— 线上表现就是「HTTP 200 + 0 字节」空白回复
// （见进度 10），而且**不抛错**，`catch` 抓不到。
//
// ⚠ 更正（2026-09-25）：我先前在这里写过「提到 8000 后同题实测正常出文」——
// 那是**一次幸运的实测**，被我说成了结论。同一问题重复跑，8000 也出现过
// 「思考 9863 字、正文 0 字」。真实的分布（都是真上游、同一条难问题）：
//   · 上限 3000（不提 effort）：思考吃满 3000 → 正文 **0 字**
//   · 上限 8000，不提 effort：正文 **0～3113 字**（不稳）
//   · 上限 8000 + `reasoning_effort:'low'`：**3/3 都出了正文**（2698/2266/1511 字），
//     但其中 2 次 `finish_reason='length'` —— 即**正文被截断**；每次约 40 秒、实收约 8000 token
//
// 官方文档（`api-docs.deepseek.com/zh-cn/guides/thinking_mode`）两条硬约束：
//   ① `max_tokens` 默认 4096、**最大 8192** → 8000 已贴天花板，不能再靠调大腾地方；
//   ② 思考模式下 `temperature` **不生效**（不报错也不起作用）—— 下面那个 0.7 在思考开着时
//      其实没作用，留着是因为「关掉思考」那条路要用到它。
//
// 推论（得说清）：**思考开着时，「长解读不被截断」是做不到的** —— 思考与正文抢同一个
// 8192 天花板。要「完整」就只能关思考（`thinking:{type:'disabled'}`：实测 9.5 秒、
// 约 1900 token、`finish=stop`）。这是产品取舍，2026-09-25 用户选了「low」，
// 故此处按「低强度思考」实现；「一个字都没出来」那种最坏情况由下面那句白话提示兜住。
const LLM_MAX_TOKENS = 8000;

// 思考强度。官方 OpenAI 格式下取值 `low/high/max`，默认 `high`。
// ⚠ `'low'` 是**少想一点**，不是「不想」：实测思考仍有 6.7k～8.4k 字，难问题上照样顶到天花板。
// （我另试过 `reasoning_effort:'none'` 与 `thinking:{type:'disabled'}`，两者都真能把思考
//  关成 0 字；但 `'none'` 不在官方取值表里，属未文档化行为 —— 能不用就不用，免得哪天悄悄失效。）
// 教训一条：参数被忽略是**不报错**的（我一度以为 `reasoning_effort:'low'` 无效，是因为
// 拿小问题去试，思考本来就没多长；换到真业务的长问题才看出差别）。验参数必须用**真业务的输入**。
const LLM_REASONING_EFFORT = 'low';

// 八字那份长报告**关掉思考**（2026-09-25，与新输出规格一起来）。
//
// 为什么非关不可：新规格要求「命盘评分 + 8 个模块」，篇幅远超原来那段三段式。而
// `LLM_MAX_TOKENS = 8000` 是**上游硬顶**（官方：最大 8192），**思考与正文共用这一个预算** ——
// 上面那段实测分布里，`reasoning_effort:'low'` 时思考吃掉 6.7k～8.4k 字，正文只剩
// 2266～2698 字，且 3 次里 2 次 `finish_reason='length'`。结论就是上面那句推论：
// **「思考开着 + 长解读不被截断」做不到**。关掉思考后 8192 全给正文
// （实测 9.5 秒 / 约 1900 token / `finish_reason='stop'`）—— 更快、更省、也不截断。
//
// 这是**产品取舍**，与「全局思考强度 low」不冲突：那条管聊天与追问（短问答，思考有助于
// 质量），这条只管那份结构化长报告。故在调用处按 `!followUp` 挑，不是全局改。
//
// ⚠ 关掉思考后 `temperature` **才真正生效**（官方：思考模式下 temperature 不生效 ——
//   原来那个 0.7 在思考开着时其实没作用）。所以这条线必须显式给一个温度：
//   同一份盘面应当给出同一个分数，取低值更稳，配合 system 里的「打分口径」一节。
const BAZI_REPORT_TEMPERATURE = 0.3;

// 上游「一个字正文都没出」时给用户看的话。白话、不解释内部原因、给一个可做的动作。
// 它**不算一次解析**（不落库、不记账）—— 判据是 `fullText` 有没有内容，
// 这段提示是写给用户的，不是写进 `fullText` 的。
const EMPTY_UPSTREAM_NOTICE = '抱歉，这次没能生成出内容。请再点一次；'
  + '如果还是不行，就把问题问得更具体一点（比如具体问哪一年、哪一方面）。';

/**
 * 记账尾巴。**全站唯一一份**（`/api/chat/send` 与八字那条线各自拼过一次，是同一个
 * 字符串 —— 两处各写一遍，改一处就会有一处漏）。
 *
 * 2026-09-25 用户拍板：「现在系统是 token 消耗制的，把这个改称积分」。
 * 于是**只改用户看得见的标签**，底下的记账口径不动（仍然是上游回的真 token 数，
 * `users.token_used` 也照旧累加）—— 改的是叫法，不是算法。
 *
 * ⚠ 前端按 `'\n消耗积分：'` 切正文（`ai_panel.js::AI_POINTS_MARKS`），
 *   动这一行的**格式**会连着前端一起坏；老记录里存的是旧字「消耗 Token：」，
 *   前端两个标记都认，故这里不需要数据迁移。
 */
const POINTS_LABEL = '消耗积分：';
function pointsTrailer(inputTokens, outputTokens, totalTokens, remainText) {
  return '\n\n---\n' + POINTS_LABEL + '输入 ' + inputTokens + ' + 输出 ' + outputTokens
    + ' = ' + totalTokens + ' ｜ 剩余：' + remainText;
}

// 后台「提示词管理」页面里逐个模板展示的**默认值**，也必须是运行时的真实回落。
//
// ⚠ 这里曾经是一份**与运行时无关**的副本：本表里放着 8 条短模板（其中
// `liuyao_prompt` 甚至写着「……（可复制现有完整模板，变量用 {{变量名}} 替换）」
// 这种占位句），而 `buildLiuyaoPrompt()` 的回落读的是 `paipan/prompt.js` 里
// 另一份长模板。于是后台页面上「默认值」显示的和线上真正跑的**是两个东西** ——
// 管理员照着它改、以为改的是默认，其实连默认长什么样都没看到。
// 现在一律指向 paipan/prompt.js 的常量：一处定义，后台与运行时同一个值。
const DEFAULT_PROMPTS = {
  mhys_system: '你是梅花易数解卦师。回答顺序固定为：参考古籍→回答答案→你的现状→解卦逻辑。先给结果，再讲现状，最后解释依据。回答清晰、理性、简洁，避免绝对化断语，多用"可能""倾向"。',
  mhys_prompt: promptLib.DEFAULT_MHYS_PROMPT,
  mhys_notopic: promptLib.DEFAULT_MHYS_NOTOPIC,
  mhys_followup: promptLib.DEFAULT_MHYS_FOLLOWUP,
  liuyao_system: '你是六爻纳甲解卦师。断卦必须严格遵循七层标准流程：①定用神（据事项性别取六亲）→②看世应（世为己应为人，分人我吉凶）→③察日月（日主月提定旺衰，爻不敌日月）→④辨动爻（动为变化之机，独发力量最大）→⑤析生克（元神生用则吉，忌神克用则凶，贪生贪合可忘克）→⑥审空亡月破（辨真空假空，空忌吉空用凶）→⑦推应期（出空填实、冲墓冲合、生旺墓绝）。输出分三块：结论（直说吉凶，人话）→现状（世应六神说当下）→推演（七层逐步展开，引具体爻位六亲六神，含应期判断）。避免绝对断语，多用可能/倾向。用**加粗**标重点。',
  liuyao_prompt: promptLib.DEFAULT_LIUYAO_PROMPT,
  liuyao_notopic: promptLib.DEFAULT_LIUYAO_NOTOPIC,
  liuyao_followup: promptLib.DEFAULT_LIUYAO_FOLLOWUP,
};

// ===== JWT =====
let JWT_SECRET;
if (fs.existsSync(SECRET_FILE)) {
  JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
} else {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, JWT_SECRET);
}

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}
function createToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now() }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}
function verifyToken(token) {
  try {
    const [h, b, s] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (s !== expected) return null;
    const payload = JSON.parse(base64urlDecode(b));
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// ===== Stats =====
async function getAdminStats() {
  const todayStart = new Date(new Date().toDateString()).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // 安全查询辅助
  const q = async (sql, params) => {
    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch(e) {
      console.error('Stats query error:', e.message);
      return [{ cnt: 0, total: 0 }];
    }
  };

  // 根据条件查询用户统计
  const statsFor = async (condition) => {
    const where = condition ? `WHERE ${condition}` : '';
    const todayClause = condition ? `${where} AND` : 'WHERE';
    const usersResult = await q(`SELECT COUNT(*) as cnt FROM users ${where}`);
    const todayResult = await q(`SELECT COUNT(*) as cnt FROM users ${todayClause} created_at >= ?`, [todayStart]);
    const activeResult = await q(`SELECT COUNT(*) as cnt FROM users ${todayClause} last_active >= ?`, [weekAgo]);
    const tokensResult = await q(`SELECT COALESCE(SUM(token_used),0) as total FROM users ${where}`);
    const tokens7dResult = await q(`SELECT COALESCE(SUM(token_used),0) as total FROM users ${todayClause} last_active >= ?`, [weekAgo]);
    return {
      users: usersResult[0]?.cnt || 0,
      todayUsers: todayResult[0]?.cnt || 0,
      active7d: activeResult[0]?.cnt || 0,
      totalTokens: tokensResult[0]?.total || 0,
      tokens7d: tokens7dResult[0]?.total || 0,
    };
  };

  const [total, web, wechat] = await Promise.all([
    statsFor(''),
    statsFor("username NOT LIKE 'wx_%'"),
    statsFor("username LIKE 'wx_%'"),
  ]);

  // 全局计数
  let charts = 0, divinations = 0;
  try {
    const [[{cnt: c}]] = await db.query('SELECT COUNT(*) as cnt FROM charts');
    charts = c;
  } catch(e) {}
  try {
    const [[{cnt: m}]] = await db.query('SELECT COUNT(*) as cnt FROM mhys_records');
    const [[{cnt: l}]] = await db.query('SELECT COUNT(*) as cnt FROM liuyao_records');
    divinations = m + l;
  } catch(e) {}

  // 服务器信息（硬编码，到期前可手动更新）
  const server = {
    createdAt: '2026-06-04T23:20:00+08:00',
    expiresAt: '2026-08-04T23:20:00+08:00',
  };
  const expiresMs = new Date(server.expiresAt).getTime();
  server.daysLeft = Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));

  // DeepSeek 信息
  let deepseekStatus = 'inactive';
  let apiKeyPrefix = '';
  if (config.deepseek.apiKey && config.deepseek.apiKey.length >= 30) {
    deepseekStatus = 'active';
    apiKeyPrefix = config.deepseek.apiKey.substring(0, 7) + '...';
  }

  return {
    total: { ...total, charts, divinations },
    web: { users: web.users, todayUsers: web.todayUsers, totalTokens: web.totalTokens, tokens7d: web.tokens7d },
    wechat: { users: wechat.users, todayUsers: wechat.todayUsers, totalTokens: wechat.totalTokens, tokens7d: wechat.tokens7d },
    server,
    deepseek: {
      status: deepseekStatus,
      apiKeyPrefix,
    },
  };
}
async function getUsers() {
  // 从 MySQL 读取用户列表（主存储），含每人命盘数
  try {
    const [rows] = await db.query(
      'SELECT u.phone, u.username, u.nick_name, u.tier, u.token_used, u.ai_count, u.created_at, u.last_active, ' +
      '(SELECT COUNT(*) FROM charts WHERE user_id = u.phone) as chart_count ' +
      'FROM users u ORDER BY u.created_at DESC'
    );
    return rows.map(r => ({
      id: r.phone,
      username: r.username || r.phone,
      phone: r.phone,
      nickName: r.nick_name || '',
      tier: r.tier || 0,
      createdAt: r.created_at,
      aiCount: r.ai_count || 0,
      tokenUsed: r.token_used || 0,
      lastActive: r.last_active,
      chartCount: r.chart_count || 0,
      userType: (r.username || '').startsWith('wx_') ? 'wechat' : 'web',
      openid: (r.username || '').startsWith('wx_') ? (r.username || '').substring(3) : '',
    }));
  } catch(e) {
    console.error('getUsers error:', e);
    // 降级：读 JSON 文件
    const users = readJSON(USERS_FILE, {});
    return Object.entries(users).map(([key, u]) => ({
      id: key,
      username: u.username || key,
      phone: u.phone || key,
      nickName: u.nickName || '',
      tier: u.tier || 0,
      createdAt: u.createdAt,
      aiCount: u.aiCount || 0,
      tokenUsed: 0,
      lastActive: u.lastActive,
      chartCount: 0,
      userType: (u.username || '').startsWith('wx_') ? 'wechat' : 'web',
      openid: (u.username || '').startsWith('wx_') ? (u.username || '').substring(3) : '',
    }));
  }
}
async function deleteUser(id) {
  // 从 MySQL 删除（按 username，兼容微信用户 phone 为空的情况）
  try { await db.query('DELETE FROM users WHERE username = ?', [id]); } catch(e) { console.error('deleteUser MySQL error:', e); }
  // 同时清理 JSON 备份
  const users = readJSON(USERS_FILE, {});
  delete users[id];
  writeJSON(USERS_FILE, users);
}

// ===== MySQL Connection =====
const db = mysql.createPool({
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ===== Schema Migration: add avatar_url if not exists =====
db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS `avatar_url` varchar(512) NOT NULL DEFAULT \'\' AFTER `nick_name`').catch(function (err) {
  // IF NOT EXISTS not supported in MySQL 8.0 — try without
  db.query('ALTER TABLE users ADD COLUMN `avatar_url` varchar(512) NOT NULL DEFAULT \'\'').catch(function (err2) {
    // Column may already exist, that's fine
    if (err2 && err2.code !== 'ER_DUP_FIELDNAME') { console.error('Migration error:', err2.message); }
  });
});

// ===== CORS & JSON =====
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sqw.somtfly.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
function json(res, data, status = 200) {
  setCORS(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ===== Handle =====
async function handle(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = await parseBody(req);
  const pathname = url.pathname;

  // ===== Auth APIs =====

  // POST /api/send-sms-code — 发送短信验证码
  if (req.method === 'POST' && pathname === '/api/send-sms-code') {
    const { phone } = body;
    if (!phone || !/^1\d{10}$/.test(phone)) return json(res, { error: '请输入正确手机号' }, 400);
    const result = await sendSmsVerifyCode(phone);
    if (result.ok) return json(res, { ok: true });
    return json(res, { error: result.error, cooldown: result.cooldown || 0 }, 429);
  }

  // POST /api/register — 手机号+验证码+密码注册
  if (req.method === 'POST' && pathname === '/api/register') {
    const { phone, code, password } = body;
    if (!phone || !/^1\d{10}$/.test(phone)) return json(res, { error: '请输入正确手机号' }, 400);
    if (!code) return json(res, { error: '请输入短信验证码' }, 400);
    if (!password || password.length < 6) return json(res, { error: '密码至少 6 位' }, 400);

    // 校验验证码
    const codeCheck = verifySmsCode(phone, code);
    if (!codeCheck.ok) return json(res, { error: codeCheck.error }, 400);

    // 检查 MySQL 是否已注册
    try {
      const [existing] = await db.query('SELECT phone FROM users WHERE phone = ?', [phone]);
      if (existing.length > 0) return json(res, { error: '该手机号已注册，请直接登录' }, 409);
    } catch(e) { /* 降级到 JSON */ 
      const users = readJSON(USERS_FILE, {});
      if (users[phone]) return json(res, { error: '该手机号已注册，请直接登录' }, 409);
    }

    const passwordHash = hashPassword(password);
    const now = Date.now();

    // 写入 MySQL（主存储）
    try {
      await db.query(
        'INSERT INTO users (phone, username, password_hash, nick_name, ai_count, token_used, tier, created_at, last_active) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)',
        [phone, phone, passwordHash, phone, now, now]
      );
    } catch(e) {
      console.error('Register MySQL error:', e);
      return json(res, { error: '注册失败，请稍后重试' }, 500);
    }

    // 同步写入 JSON 备份
    const users = readJSON(USERS_FILE, {});
    users[phone] = {
      phone,
      passwordHash,
      createdAt: now,
      aiCount: 0,
      lastActive: now,
    };
    writeJSON(USERS_FILE, users);

    const token = createToken({ username: phone, exp: Date.now() + USER_TOKEN_EXPIRY });
    return json(res, { token, username: phone });
  }

  // POST /api/login — 手机号+密码登录
  if (req.method === 'POST' && pathname === '/api/login') {
    const { phone, password } = body;
    if (!phone || !password) return json(res, { error: '请输入手机号和密码' }, 400);

    // 登录频率限制（10次失败后锁定5分钟）
    const loginLock = loginAttempts.get(phone);
    if (loginLock && Date.now() < loginLock) {
      return json(res, { error: '登录凭证无效' }, 401);
    }

    // 从 MySQL 读取用户（主存储）
    let user = null;
    try {
      const [rows] = await db.query('SELECT phone, password_hash FROM users WHERE phone = ?', [phone]);
      if (rows.length > 0) user = rows[0];
    } catch(e) { /* 降级到 JSON */ }
    
    // MySQL 未找到，降级到 JSON
    if (!user) {
      const users = readJSON(USERS_FILE, {});
      const jsonUser = users[phone];
      if (!jsonUser) return json(res, { error: '登录凭证无效' }, 401);
      if (!verifyPassword(password, jsonUser.passwordHash)) {
        // 记录失败尝试
        const fails = (loginAttempts.get(phone) || 0) + 1;
        if (fails >= 10) {
          loginAttempts.set(phone, Date.now() + 5 * 60 * 1000); // 锁定5分钟
        } else {
          loginAttempts.set(phone, fails);
        }
        return json(res, { error: '登录凭证无效' }, 401);
      }
      // 登录成功，清除失败记录
      loginAttempts.delete(phone);
      // 恢复到 MySQL
      ensureDbUser(phone).catch(()=>{});
    } else {
      if (!verifyPassword(password, user.password_hash)) {
        const fails = (loginAttempts.get(phone) || 0) + 1;
        if (fails >= 10) {
          loginAttempts.set(phone, Date.now() + 5 * 60 * 1000);
        } else {
          loginAttempts.set(phone, fails);
        }
        return json(res, { error: '登录凭证无效' }, 401);
      }
      loginAttempts.delete(phone);
    }

    // 更新最后活跃时间
    db.query('UPDATE users SET last_active = ? WHERE phone = ?', [Date.now(), phone]).catch(()=>{});
    const users = readJSON(USERS_FILE, {});
    if (users[phone]) { users[phone].lastActive = Date.now(); writeJSON(USERS_FILE, users); }

    const token = createToken({ username: phone, exp: Date.now() + USER_TOKEN_EXPIRY });
    return json(res, { token, username: phone });
  }

  // POST /api/reset-password — 手机号+验证码重置密码
  if (req.method === 'POST' && pathname === '/api/reset-password') {
    const { phone, code, newPassword } = body;
    if (!phone || !/^1\d{10}$/.test(phone)) return json(res, { error: '请输入正确手机号' }, 400);
    if (!code) return json(res, { error: '请输入短信验证码' }, 400);
    if (!newPassword || newPassword.length < 6) return json(res, { error: '密码至少 6 位' }, 400);

    // 检查用户是否存在（MySQL）
    let exists = false;
    try {
      const [rows] = await db.query('SELECT phone FROM users WHERE phone = ?', [phone]);
      exists = rows.length > 0;
    } catch(e) { /* 降级 */ }
    if (!exists) {
      const users = readJSON(USERS_FILE, {});
      if (!users[phone]) return json(res, { error: '手机号或验证码无效' }, 404);
    }

    // 校验验证码
    const codeCheck = verifySmsCode(phone, code);
    if (!codeCheck.ok) return json(res, { error: codeCheck.error }, 400);

    const newHash = hashPassword(newPassword);
    // 更新 MySQL（主存储）
    db.query('UPDATE users SET password_hash = ? WHERE phone = ?', [newHash, phone]).catch(()=>{});
    // 同步更新 JSON 备份
    const users = readJSON(USERS_FILE, {});
    if (users[phone]) { users[phone].passwordHash = newHash; writeJSON(USERS_FILE, users); }

    return json(res, { ok: true });
  }

  // GET /api/me
  if (req.method === 'GET' && pathname === '/api/me') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '未登录或登录已过期' }, 401);
    return json(res, { username: payload.username });
  }

  // /api/interpret — 已移除（紫微斗数模块待重构）

  // ===== Admin APIs =====
  
  // POST /api/admin/login
  if (req.method === 'POST' && pathname === '/api/admin/login') {
    // Rate limit check
    if (admin.lockedUntil && Date.now() < admin.lockedUntil) {
      const remaining = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
      return json(res, { error: `账号已锁定，${remaining} 分钟后重试` }, 429);
    }

    const { username, password } = body;
    if (!username || !password) return json(res, { error: '请输入用户名和密码' }, 400);
    if (username !== admin.username) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = Date.now() + LOCKOUT_MS;
      }
      writeJSON(ADMIN_FILE, admin);
      return json(res, { error: '用户名或密码错误' }, 401);
    }
    if (!verifyPassword(password, admin.passwordHash)) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1;
      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockedUntil = Date.now() + LOCKOUT_MS;
      }
      writeJSON(ADMIN_FILE, admin);
      return json(res, { error: '用户名或密码错误' }, 401);
    }

    // Login success — reset attempts
    admin.loginAttempts = 0;
    admin.lockedUntil = 0;
    writeJSON(ADMIN_FILE, admin);

    const token = createToken({ role: 'admin', exp: Date.now() + ADMIN_TOKEN_EXPIRY });
    return json(res, { token });
  }

  // GET /api/admin/verify
  if (req.method === 'GET' && pathname === '/api/admin/verify') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    return json(res, { ok: true });
  }

  // GET /api/admin/stats
  if (req.method === 'GET' && pathname === '/api/admin/stats') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    return json(res, await getAdminStats());
  }

  // GET /api/admin/users
  if (req.method === 'GET' && pathname === '/api/admin/users') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    return json(res, await getUsers());
  }

  // DELETE /api/admin/users/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/users/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.split('/').pop();
    try {
      // 同时删除该用户的所有命盘
      await db.query('DELETE FROM charts WHERE user_id = ?', [id]);
      deleteUser(id);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Delete user error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // GET /api/admin/user-tiers — 获取所有用户的等级信息（MySQL）
  if (req.method === 'GET' && pathname === '/api/admin/user-tiers') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query('SELECT username, tier, token_used FROM users');
      const map = {};
      rows.forEach(r => { map[r.username] = { tier: r.tier || 0, tokenUsed: r.token_used || 0 }; });
      return json(res, map);
    } catch (e) {
      console.error('Admin user-tiers error:', e);
      return json(res, { error: '查询失败' }, 500);
    }
  }

  // PATCH /api/admin/user-tier — 设置用户等级
  if (req.method === 'PATCH' && pathname === '/api/admin/user-tier') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const { username, tier } = body;
    if (!username || tier === undefined || tier < 0 || tier > 2) return json(res, { error: '参数错误' }, 400);
    try {
      // 确保用户在 MySQL 中存在
      await ensureDbUser(username);
      await db.query('UPDATE users SET tier = ? WHERE username = ?', [tier, username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin set tier error:', e);
      return json(res, { error: '设置失败' }, 500);
    }
  }

  // PATCH /api/admin/user-tokens — 设置用户 token 用量
  if (req.method === 'PATCH' && pathname === '/api/admin/user-tokens') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const { username, tokenUsed } = body;
    if (!username || tokenUsed === undefined || tokenUsed < 0) return json(res, { error: '参数错误' }, 400);
    try {
      await ensureDbUser(username);
      await db.query('UPDATE users SET token_used = ? WHERE username = ?', [tokenUsed, username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin set token error:', e);
      return json(res, { error: '设置失败' }, 500);
    }
  }

  // GET /api/admin/charts — 管理员查看所有命盘（支持 ?userId= 过滤）
  if (req.method === 'GET' && pathname === '/api/admin/charts') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const filterUserId = url.searchParams.get('userId');
    try {
      let query = 'SELECT id, user_id, name, gender, birth_year, birth_month, birth_day, birth_hour, calendar, true_solar, birthplace, created_at FROM charts';
      let params = [];
      if (filterUserId) {
        query += ' WHERE user_id = ?';
        params.push(filterUserId);
      }
      query += ' ORDER BY created_at DESC LIMIT 200';
      const [rows] = await db.query(query, params);
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        gender: r.gender,
        birth: { year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, calendar: r.calendar },
        trueSolarTime: !!r.true_solar,
        birthplace: r.birthplace || '',
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin charts error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // DELETE /api/admin/charts/:id — 管理员删除命盘
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/charts/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM charts WHERE id = ?', [id]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin delete chart error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // POST /api/admin/password — 修改管理密码
  if (req.method === 'POST' && pathname === '/api/admin/password') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return json(res, { error: '密码格式不正确' }, 400);
    }
    if (!verifyPassword(currentPassword, admin.passwordHash)) {
      return json(res, { error: '当前密码不正确' }, 401);
    }
    admin.passwordHash = hashPassword(newPassword);
    writeJSON(ADMIN_FILE, admin);
    return json(res, { ok: true });
  }

  // ===== Charts API (MySQL) =====

  // GET /api/charts — 获取用户的命盘列表
  if (req.method === 'GET' && pathname === '/api/charts') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, name, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, calendar, true_solar, birthplace, latitude, longitude, bazi, lunar_year, lunar_month, lunar_day, created_at FROM charts WHERE user_id = ? ORDER BY created_at DESC',
        [payload.username]
      );
      return json(res, rows.map(r => ({
        id: r.id,
        name: r.name,
        gender: r.gender,
        birth: { year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, minute: r.birth_minute, calendar: r.calendar },
        trueSolarTime: !!r.true_solar,
        birthplace: r.birthplace || '',
        latitude: r.latitude,
        longitude: r.longitude,
        bazi: r.bazi,
        lunar: r.lunar_year ? { year: r.lunar_year, month: r.lunar_month, day: r.lunar_day } : null,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('DB list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // POST /api/charts — 创建命盘
  if (req.method === 'POST' && pathname === '/api/charts') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, calendar, trueSolarTime, birthplace, latitude, longitude } = body;
    const id = 'chart_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = Date.now();
    // 计算八字
    const baziResult = calcBazi(birthYear, birthMonth, birthDay, birthHour ?? 12, birthMinute ?? 0);
    try {
      await db.query(
        'INSERT INTO charts (id, user_id, name, gender, birth_year, birth_month, birth_day, birth_hour, birth_minute, calendar, true_solar, birthplace, latitude, longitude, bazi, lunar_year, lunar_month, lunar_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, payload.username, name || '未命名', gender || 'male', birthYear, birthMonth, birthDay, birthHour ?? 12, birthMinute ?? 0, calendar || 'gregorian', trueSolarTime ? 1 : 0, birthplace || '', latitude ?? null, longitude ?? null, baziResult ? baziResult.bazi : '', baziResult ? baziResult.lunarYear : null, baziResult ? baziResult.lunarMonth : null, baziResult ? baziResult.lunarDay : null, now, now]
      );
      return json(res, { id, createdAt: now, bazi: baziResult ? baziResult.bazi : null });
    } catch (e) {
      console.error('DB create error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // DELETE /api/charts/:id — 删除命盘
  if (req.method === 'DELETE' && pathname.startsWith('/api/charts/')) {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM charts WHERE id = ? AND user_id = ?', [id, payload.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('DB delete error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // PATCH /api/charts/:id — 更新命盘
  if (req.method === 'PATCH' && pathname.startsWith('/api/charts/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const id = pathname.split('/').pop();
    try {
      const [rows] = await db.query('SELECT user_id FROM charts WHERE id = ?', [id]);
      if (rows.length === 0) return json(res, { error: '命盘不存在' }, 404);
      if (rows[0].user_id !== payload.username) return json(res, { error: '无权修改' }, 403);

      const { name, gender, birthYear, birthMonth, birthDay, birthHour, birthMinute, calendar, trueSolarTime, birthplace, latitude, longitude } = body;
      const now = Date.now();
      // 重新计算八字
      const baziResult = calcBazi(birthYear, birthMonth, birthDay, birthHour ?? 12, birthMinute ?? 0);
      await db.query(
        'UPDATE charts SET name = ?, gender = ?, birth_year = ?, birth_month = ?, birth_day = ?, birth_hour = ?, birth_minute = ?, calendar = ?, true_solar = ?, birthplace = ?, latitude = ?, longitude = ?, bazi = ?, lunar_year = ?, lunar_month = ?, lunar_day = ?, updated_at = ? WHERE id = ?',
        [name || '未命名', gender || 'male', birthYear, birthMonth, birthDay, birthHour ?? 12, birthMinute ?? 0, calendar || 'gregorian', trueSolarTime ? 1 : 0, birthplace || '', latitude ?? null, longitude ?? null, baziResult ? baziResult.bazi : '', baziResult ? baziResult.lunarYear : null, baziResult ? baziResult.lunarMonth : null, baziResult ? baziResult.lunarDay : null, now, id]
      );
      return json(res, { id, updatedAt: now, bazi: baziResult ? baziResult.bazi : null });
    } catch (e) {
      console.error('DB update error:', e);
      return json(res, { error: '更新失败' }, 500);
    }
  }

  // GET /api/charts/:id — 获取单个命盘
  if (req.method === 'GET' && pathname.startsWith('/api/charts/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const id = pathname.split('/').pop();
    try {
      const [rows] = await db.query('SELECT * FROM charts WHERE id = ? AND user_id = ?', [id, payload.username]);
      if (rows.length === 0) return json(res, { error: '命盘不存在' }, 404);
      const r = rows[0];
      return json(res, {
        id: r.id, name: r.name, gender: r.gender,
        birth: { year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, minute: r.birth_minute, calendar: r.calendar },
        trueSolarTime: !!r.true_solar, birthplace: r.birthplace || '',
        latitude: r.latitude, longitude: r.longitude,
        bazi: r.bazi, lunar: r.lunar_year ? { year: r.lunar_year, month: r.lunar_month, day: r.lunar_day } : null,
        createdAt: r.created_at,
      });
    } catch (e) {
      console.error('DB get error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // ===== 梅花易数排盘记录 API =====

  // GET /api/mhys-records — 获取排盘记录列表
  if (req.method === 'GET' && pathname === '/api/mhys-records') {
    const payload = checkAuth(req);
    if (!payload) return json(res, []);
    try {
      const [rows] = await db.query(
        'SELECT id, topic, method, created_at, result_data FROM mhys_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
        [payload.username]
      );
      return json(res, rows.map(r => {
        let divTime = null, recTime = null;
        try {
          const rd = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : r.result_data;
          if (rd && rd.divinationTime) divTime = rd.divinationTime;
          if (rd && rd.recordTime) recTime = rd.recordTime;
        } catch(e) {}
        return {
          id: r.id,
          topic: r.topic,
          method: r.method,
          created_at: r.created_at,
          divinationTime: divTime,
          recordTime: recTime,
        };
      }));
    } catch (e) {
      console.error('Mhys list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/mhys-records/:id — 获取单条排盘记录（管理员可查看任意记录）
  if (req.method === 'GET' && pathname.startsWith('/api/mhys-records/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    const id = pathname.split('/').pop();
    try {
      let rows;
      if (payload && payload.role === 'admin') {
        // 管理员：查看任意记录
        [rows] = await db.query('SELECT * FROM mhys_records WHERE id = ?', [id]);
      } else if (payload) {
        [rows] = await db.query('SELECT * FROM mhys_records WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, payload.username]);
      } else {
        [rows] = await db.query('SELECT * FROM mhys_records WHERE id = ? AND user_id IS NULL', [id]);
      }
      if (rows.length === 0) return json(res, { error: '记录不存在' }, 404);
      const r = rows[0];
      return json(res, {
        id: r.id,
        topic: r.topic,
        method: r.method,
        result_data: r.result_data,
        ai_analysis: r.ai_analysis || '',
        created_at: r.created_at,
      });
    } catch (e) {
      console.error('Mhys get error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // POST /api/mhys-records — 创建排盘记录
  if (req.method === 'POST' && pathname === '/api/mhys-records') {
    const { topic, method, resultData } = body;
    if (!topic || !resultData) return json(res, { error: '缺少必要参数' }, 400);

    const payload = checkAuth(req);
    const userId = payload ? payload.username : null;
    const id = 'mhys_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = Date.now();
    try {
      await db.query(
        'INSERT INTO mhys_records (id, user_id, topic, method, result_data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, topic, method || 'unknown', JSON.stringify(resultData), now]
      );
      return json(res, { id, created_at: now });
    } catch (e) {
      console.error('Mhys create error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // PATCH /api/mhys-records/:id/ai — 保存AI解读结果
  if (req.method === 'PATCH' && pathname.match(/^\/api\/mhys-records\/[^/]+\/ai$/)) {
    const id = pathname.split('/')[3];
    const { analysis } = body;
    if (!analysis) return json(res, { error: '缺少解读内容' }, 400);
    try {
      // 要求登录以保存解析结果
      const mhysPatchUser = checkAuth(req);
      if (!mhysPatchUser) return json(res, { error: '请先登录' }, 401);
      const [existing] = await db.query('SELECT id FROM mhys_records WHERE id = ?', [id]);
      if (existing.length === 0) return json(res, { error: '记录不存在' }, 404);
      await db.query('UPDATE mhys_records SET ai_analysis = ? WHERE id = ? AND user_id = ?', [analysis, id, mhysPatchUser.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Mhys AI save error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // DELETE /api/mhys-records/:id — 删除排盘记录
  if (req.method === 'DELETE' && pathname.startsWith('/api/mhys-records/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM mhys_records WHERE id = ? AND user_id = ?', [id, payload.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Mhys delete error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // ===== 六爻排盘记录 API =====

  // GET /api/liuyao-records — 获取排盘记录列表
  if (req.method === 'GET' && pathname === '/api/liuyao-records') {
    const payload = checkAuth(req);
    if (!payload) return json(res, []);
    try {
      const [rows] = await db.query(
        'SELECT id, topic, method, created_at, result_data FROM liuyao_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
        [payload.username]
      );
      return json(res, rows.map(r => {
        let divTime = null, recTime = null;
        try {
          const rd = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : r.result_data;
          if (rd && rd.divinationTime) divTime = rd.divinationTime;
          if (rd && rd.recordTime) recTime = rd.recordTime;
        } catch(e) {}
        return {
          id: r.id,
          topic: r.topic,
          method: r.method,
          created_at: r.created_at,
          divinationTime: divTime,
          recordTime: recTime,
        };
      }));
    } catch (e) {
      console.error('Liuyao list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/liuyao-records/:id — 获取单条排盘记录（管理员可查看任意记录）
  if (req.method === 'GET' && pathname.startsWith('/api/liuyao-records/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    const id = pathname.split('/').pop();
    try {
      let rows;
      if (payload && payload.role === 'admin') {
        // 管理员：查看任意记录
        [rows] = await db.query('SELECT * FROM liuyao_records WHERE id = ?', [id]);
      } else if (payload) {
        [rows] = await db.query('SELECT * FROM liuyao_records WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, payload.username]);
      } else {
        [rows] = await db.query('SELECT * FROM liuyao_records WHERE id = ? AND user_id IS NULL', [id]);
      }
      if (rows.length === 0) return json(res, { error: '记录不存在' }, 404);
      const r = rows[0];
      return json(res, {
        id: r.id,
        topic: r.topic,
        method: r.method,
        result_data: r.result_data,
        ai_analysis: r.ai_analysis || '',
        created_at: r.created_at,
      });
    } catch (e) {
      console.error('Liuyao get error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // POST /api/liuyao-records — 创建排盘记录
  if (req.method === 'POST' && pathname === '/api/liuyao-records') {
    const { topic, method, resultData } = body;
    if (!topic || !resultData) return json(res, { error: '缺少必要参数' }, 400);

    const payload = checkAuth(req);
    const userId = payload ? payload.username : null;
    const id = 'ly_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = Date.now();
    try {
      await db.query(
        'INSERT INTO liuyao_records (id, user_id, topic, method, result_data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, topic, method || 'coin', JSON.stringify(resultData), now]
      );
      return json(res, { id, created_at: now });
    } catch (e) {
      console.error('Liuyao create error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // PATCH /api/liuyao-records/:id/ai — 保存AI解读结果
  if (req.method === 'PATCH' && pathname.match(/^\/api\/liuyao-records\/[^/]+\/ai$/)) {
    const id = pathname.split('/')[3];
    const { analysis } = body;
    if (!analysis) return json(res, { error: '缺少解读内容' }, 400);
    // 要求登录以保存解析结果
    const lyPatchUser = checkAuth(req);
    if (!lyPatchUser) return json(res, { error: '请先登录' }, 401);
    try {
      const [existing] = await db.query('SELECT id FROM liuyao_records WHERE id = ?', [id]);
      if (existing.length === 0) return json(res, { error: '记录不存在' }, 404);
      await db.query('UPDATE liuyao_records SET ai_analysis = ? WHERE id = ? AND user_id = ?', [analysis, id, lyPatchUser.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Liuyao AI save error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // DELETE /api/liuyao-records/:id — 删除排盘记录
  if (req.method === 'DELETE' && pathname.startsWith('/api/liuyao-records/') && pathname.split('/').length === 4) {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM liuyao_records WHERE id = ? AND user_id = ?', [id, payload.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Liuyao delete error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // GET /api/bazi-analyses — 命盘的解析记录（**只读**，每方面可能有多条：旧版保留、不覆盖）
  //
  // 与六爻/梅花的 `*-records` 不一样，这里**没有** POST/PATCH/DELETE：
  // 八字的解读由解读端点自己写库（`streamBaziParse` 跑完调 `saveBaziAnalysis`），
  // 再加一套写入口就会变成「两处都能写、出事说不清谁写的」。所以只给读。
  //
  // 为什么单独需要它：六爻/梅花把解读存进**排盘记录那一行**（一个记录一条解读），
  // 而八字的产品规则是「**每方面一条 + 旧版可展开**」——同一方面解过多次就得多行并存，
  // 故前端要能按 `chartId` 把这批行取回来自己分组。
  //
  // 参数：`?chartId=xxx` 只看某一副命盘；不传则是这个用户的全部（「我的命盘」列表要用）。
  // 返回**新到旧**。游客没有记录（他不落库），故未登录直接 401，与 `/api/charts` 一致。
  if (req.method === 'GET' && pathname === '/api/bazi-analyses') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const chartId = url.searchParams.get('chartId') || '';
    try {
      const [rows] = chartId
        ? await db.query('SELECT id, chart_id, aspect, question, analysis, created_at FROM bazi_analyses'
          + ' WHERE user_id = ? AND chart_id = ? ORDER BY created_at DESC LIMIT 200',
          [payload.username, chartId])
        : await db.query('SELECT id, chart_id, aspect, question, analysis, created_at FROM bazi_analyses'
          + ' WHERE user_id = ? ORDER BY created_at DESC LIMIT 200', [payload.username]);
      return json(res, rows.map(r => ({
        id: r.id,
        chartId: r.chart_id,
        aspect: r.aspect,
        question: r.question,
        analysis: r.analysis,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Bazi analyses list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/mhys-records — 管理员查看所有排盘记录
  if (req.method === 'GET' && pathname === '/api/admin/mhys-records') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, topic, method, created_at FROM mhys_records ORDER BY created_at DESC LIMIT 200'
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        method: r.method,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin mhys list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // DELETE /api/admin/mhys-records/:id — 管理员删除排盘记录
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/mhys-records/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM mhys_records WHERE id = ?', [id]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin mhys delete error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  // GET /api/admin/liuyao-records — 管理员查看所有六爻排盘记录
  if (req.method === 'GET' && pathname === '/api/admin/liuyao-records') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, topic, method, created_at FROM liuyao_records ORDER BY created_at DESC LIMIT 200'
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        method: r.method,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin liuyao list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // DELETE /api/admin/liuyao-records/:id — 管理员删除六爻排盘记录
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/liuyao-records/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.split('/').pop();
    try {
      await db.query('DELETE FROM liuyao_records WHERE id = ?', [id]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin liuyao delete error:', e);
      return json(res, { error: '删除失败' }, 500);
    }
  }

  if (req.method === 'GET' && pathname === '/api/user/tokens') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    try {
      // 确保用户在 MySQL 中存在（首次查询时自动创建）
      await ensureDbUser(payload.username);
      const [rows] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [payload.username]);
      if (rows.length === 0) return json(res, { tokenUsed: 0, tokenLimit: 100000, tier: 0 });
      const tier = rows[0].tier || 0;
      const tokenLimit = getTokenLimit(tier);
      return json(res, { tokenUsed: rows[0].token_used, tokenLimit, tier });
    } catch (e) {
      console.error('Token usage error:', e);
      return json(res, { error: '查询失败' }, 500);
    }
  }

  // ===== 用户昵称更新 API =====
  // PATCH /api/user/nickname — 更新当前用户的昵称和头像
  if (req.method === 'PATCH' && pathname === '/api/user/nickname') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    const { nick_name, avatar_url } = body;
    if (!nick_name || typeof nick_name !== 'string' || nick_name.trim().length === 0) {
      return json(res, { error: '昵称不能为空' }, 400);
    }
    if (nick_name.trim().length > 20) {
      return json(res, { error: '昵称不能超过20个字符' }, 400);
    }
    try {
      await db.query('UPDATE users SET nick_name = ?, avatar_url = COALESCE(?, avatar_url) WHERE username = ?', [nick_name.trim(), avatar_url || null, payload.username]);
      return json(res, { ok: true, avatar_url: avatar_url || '' });
    } catch (e) {
      console.error('Nickname update error:', e);
      return json(res, { error: '更新失败' }, 500);
    }
  }

  // GET /api/admin/divination-users — 管理员查看有排盘记录的用户（分组卡片，含梅花+六爻）
  if (req.method === 'GET' && pathname === '/api/admin/divination-users') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      // 合并两个表的用户
      const [mhysRows] = await db.query(
        `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as latest
         FROM mhys_records WHERE user_id IS NOT NULL AND user_id != '' GROUP BY user_id`
      );
      const [lyRows] = await db.query(
        `SELECT user_id, COUNT(*) as cnt, MAX(created_at) as latest
         FROM liuyao_records WHERE user_id IS NOT NULL AND user_id != '' GROUP BY user_id`
      );
      // 合并
      const userMap = {};
      for (const r of mhysRows) {
        userMap[r.user_id] = { userId: r.user_id, mhysCount: r.cnt, liuyaoCount: 0, latestAt: r.latest };
      }
      for (const r of lyRows) {
        if (userMap[r.user_id]) {
          userMap[r.user_id].liuyaoCount = r.cnt;
          if (new Date(r.latest) > new Date(userMap[r.user_id].latestAt)) userMap[r.user_id].latestAt = r.latest;
        } else {
          userMap[r.user_id] = { userId: r.user_id, mhysCount: 0, liuyaoCount: r.cnt, latestAt: r.latest };
        }
      }
      const users = Object.values(userMap).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
      return json(res, users);
    } catch (e) {
      console.error('Admin divination users error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/divination-records/:userId — 管理员查看某用户的所有排盘记录（梅花+六爻）
  if (req.method === 'GET' && pathname.startsWith('/api/admin/divination-records/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const urlParts = pathname.split('/');
    const userId = urlParts[urlParts.length - 1];
    try {
      // 并行查询两个表
      const [mhysRows] = await db.query(
        'SELECT id, user_id, topic, method, result_data, created_at FROM mhys_records WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      const [lyRows] = await db.query(
        'SELECT id, user_id, topic, method, result_data, created_at FROM liuyao_records WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );

      const mapRow = (r, type) => {
        let divTime = null;
        try {
          const rd = typeof r.result_data === 'string' ? JSON.parse(r.result_data) : r.result_data;
          if (rd && rd.divinationTime) divTime = rd.divinationTime;
        } catch(e) {}
        return {
          id: r.id,
          userId: r.user_id,
          topic: r.topic,
          method: r.method,
          resultData: r.result_data,
          createdAt: r.created_at,
          divinationTime: divTime,
          type: type,
        };
      };

      const records = [
        ...mhysRows.map(r => mapRow(r, 'mhys')),
        ...lyRows.map(r => mapRow(r, 'liuyao')),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return json(res, records);
    } catch (e) {
      console.error('Admin divination records error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/chart-users — 管理员查看有命盘的用户（分组卡片）
  if (req.method === 'GET' && pathname === '/api/admin/chart-users') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        `SELECT user_id, COUNT(*) as count, MAX(created_at) as latest
         FROM charts
         GROUP BY user_id
         ORDER BY latest DESC`
      );
      return json(res, rows.map(r => ({
        userId: r.user_id,
        count: r.count,
        latestAt: r.latest,
      })));
    } catch (e) {
      console.error('Admin chart users error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/charts-flat — 管理员查看所有命盘（扁平列表，供卡片跳转）
  if (req.method === 'GET' && pathname === '/api/admin/charts-flat') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, name, gender, birth_year, birth_month, birth_day, birth_hour, calendar, true_solar, birthplace, created_at FROM charts ORDER BY created_at DESC LIMIT 200'
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        name: r.name,
        gender: r.gender,
        birth: { year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, calendar: r.calendar },
        trueSolarTime: !!r.true_solar,
        birthplace: r.birthplace || '',
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin charts-flat error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/mhys-flat — 管理员查看所有排盘记录（扁平列表，供卡片跳转）

  // ══════ Prompt 管理 API ══════

  // GET /api/admin/prompts — 获取所有 prompt 模板（含默认值）
  if (req.method === 'GET' && pathname === '/api/admin/prompts') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const custom = readPrompts();
    const keys = Object.keys(DEFAULT_PROMPTS);
    const list = keys.map(function(k) {
      return {
        key: k,
        defaultValue: DEFAULT_PROMPTS[k],
        customValue: custom[k] || null,
        isCustom: !!custom[k],
      };
    });
    return json(res, list);
  }

  // POST /api/admin/prompts/:key — 保存/更新自定义 prompt
  if (req.method === 'POST' && pathname.startsWith('/api/admin/prompts/') && pathname.split('/').length === 5) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const key = pathname.split('/').pop();
    var custom = readPrompts();
    custom[key] = body.value || '';
    // 写盘失败必须回 500：原先是「写完就 ok」，磁盘/权限一出问题
    // 管理员看到「已保存」，站点却仍旧跑默认模板 —— 静默失败最难查。
    const err = writePrompts(custom);
    if (err) return json(res, { error: '保存失败：' + err }, 500);
    return json(res, { ok: true, key: key });
  }

  // DELETE /api/admin/prompts/:key — 重置为默认
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/prompts/') && pathname.split('/').length === 5) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const key = pathname.split('/').pop();
    var custom = readPrompts();
    delete custom[key];
    const err2 = writePrompts(custom);
    if (err2) return json(res, { error: '重置失败：' + err2 }, 500);
    return json(res, { ok: true, key: key });
  }

  // ===== 建议（Suggestions）API =====

  // POST /api/suggestions — 提交建议（需登录）
  if (req.method === 'POST' && pathname === '/api/suggestions') {
    const { overall, ui, feature, ai, responseSpeed, accuracy, content } = body;
    if (!content || !content.trim()) return json(res, { error: '请输入具体建议内容' }, 400);

    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录后再提交建议' }, 401);
    const userId = payload.username;
    const id = 'sug_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = Date.now();

    try {
      await db.query(
        'INSERT INTO suggestions (id, user_id, username, overall_rating, ui_rating, feature_rating, ai_rating, response_speed_rating, accuracy_rating, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, userId, overall || 0, ui || 0, feature || 0, ai || 0, responseSpeed || 0, accuracy || 0, content.trim(), now]
      );
      // 每个用户只保留最新的 3 条建议，防止恶意刷内存
      const [[{ cnt }]] = await db.query('SELECT COUNT(*) as cnt FROM suggestions WHERE user_id = ?', [userId]);
      if (cnt > 3) {
        const excess = cnt - 3;
        await db.query(
          'DELETE FROM suggestions WHERE user_id = ? ORDER BY created_at ASC LIMIT ?',
          [userId, excess]
        );
      }
      return json(res, { ok: true, id });
    } catch (e) {
      console.error('Suggestion save error:', e);
      return json(res, { error: '保存失败' }, 500);
    }
  }

  // GET /api/admin/suggestion-users — 管理员查看提交过建议的用户（分组卡片）
  if (req.method === 'GET' && pathname === '/api/admin/suggestion-users') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        `SELECT user_id, COUNT(*) as count, MAX(created_at) as latest
         FROM suggestions
         WHERE user_id IS NOT NULL AND user_id != 'anonymous'
         GROUP BY user_id
         ORDER BY latest DESC`
      );
      return json(res, rows.map(r => ({
        userId: r.user_id,
        count: r.count,
        latestAt: r.latest,
      })));
    } catch (e) {
      console.error('Admin suggestion users error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/suggestion-detail/:userId — 管理员查看某用户的建议详情
  if (req.method === 'GET' && pathname.startsWith('/api/admin/suggestion-detail/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const userId = pathname.split('/').pop();
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, username, overall_rating, ui_rating, feature_rating, ai_rating, response_speed_rating, accuracy_rating, content, created_at FROM suggestions WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        ratings: {
          overall: r.overall_rating,
          ui: r.ui_rating,
          feature: r.feature_rating,
          ai: r.ai_rating,
          responseSpeed: r.response_speed_rating,
          accuracy: r.accuracy_rating,
        },
        content: r.content,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin suggestion detail error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/suggestions — 管理员查看所有建议
  if (req.method === 'GET' && pathname === '/api/admin/suggestions') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, username, overall_rating, ui_rating, feature_rating, ai_rating, response_speed_rating, accuracy_rating, content, created_at FROM suggestions ORDER BY created_at DESC LIMIT 200'
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        ratings: {
          overall: r.overall_rating,
          ui: r.ui_rating,
          feature: r.feature_rating,
          ai: r.ai_rating,
          responseSpeed: r.response_speed_rating,
          accuracy: r.accuracy_rating,
        },
        content: r.content,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin suggestions error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  if (req.method === 'GET' && pathname === '/api/admin/mhys-flat') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query(
        'SELECT id, user_id, topic, method, created_at FROM mhys_records ORDER BY created_at DESC LIMIT 200'
      );
      return json(res, rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        topic: r.topic,
        method: r.method,
        createdAt: r.created_at,
      })));
    } catch (e) {
      console.error('Admin mhys-flat error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/chart-detail/:id — 管理员获取单个命盘详情
  if (req.method === 'GET' && pathname.startsWith('/api/admin/chart-detail/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.replace('/api/admin/chart-detail/', '');
    try {
      const [rows] = await db.query('SELECT * FROM charts WHERE id = ?', [id]);
      if (rows.length === 0) return json(res, { error: '命盘不存在' }, 404);
      const r = rows[0];
      return json(res, {
        id: r.id, name: r.name, gender: r.gender,
        birth: { year: r.birth_year, month: r.birth_month, day: r.birth_day, hour: r.birth_hour, minute: r.birth_minute, calendar: r.calendar },
        trueSolarTime: !!r.true_solar, birthplace: r.birthplace || '',
        latitude: r.latitude, longitude: r.longitude,
        bazi: r.bazi, lunar: r.lunar_year ? { year: r.lunar_year, month: r.lunar_month, day: r.lunar_day } : null,
        createdAt: r.created_at,
      });
    } catch (e) {
      console.error('Admin chart-detail error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // ===== 参考书籍管理 =====

  // GET /api/admin/books — 获取书籍列表（支持 ?category= & ?folder= 筛选）
  if (req.method === 'GET' && pathname === '/api/admin/books') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const url = new URL(req.url, 'http://localhost');
      const cat = url.searchParams.get('category') || '';
      const folder = url.searchParams.get('folder') || '';
      let query = 'SELECT id, title, category, folder, author, description, status, chunks_count, created_at, updated_at FROM reference_books WHERE 1=1';
      let params = [];
      if (cat) { query += ' AND category = ?'; params.push(cat); }
      if (folder) { query += ' AND folder = ?'; params.push(folder); }
      query += ' ORDER BY folder, category, created_at DESC';
      const [rows] = await db.query(query, params);
      return json(res, rows.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        folder: r.folder || '',
        author: r.author || '',
        description: r.description || '',
        status: r.status || 'pending',
        chunksCount: r.chunks_count || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })));
    } catch (e) {
      console.error('Admin books list error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // POST /api/admin/books — 添加书籍
  if (req.method === 'POST' && pathname === '/api/admin/books') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      if (!body.title || !body.category) return json(res, { error: '书名和分类不能为空' }, 400);
      const now = Date.now();
      const [result] = await db.query(
        'INSERT INTO reference_books (title, category, folder, author, description, content, status, chunks_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          body.title,
          body.category,
          body.folder || '',
          body.author || '',
          body.description || '',
          body.content || '',
          'pending',
          0,
          now,
          now,
        ]
      );
      return json(res, { id: result.insertId, title: body.title, category: body.category, folder: body.folder || '', status: 'pending', chunksCount: 0, createdAt: now, updatedAt: now });
    } catch (e) {
      console.error('Admin books add error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // GET /api/admin/books/:id — 获取单本书详情（含全文）
  if (req.method === 'GET' && pathname.startsWith('/api/admin/books/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.replace('/api/admin/books/', '');
    try {
      const [rows] = await db.query('SELECT * FROM reference_books WHERE id = ?', [id]);
      if (rows.length === 0) return json(res, { error: '书籍不存在' }, 404);
      const r = rows[0];
      return json(res, {
        id: r.id,
        title: r.title,
        category: r.category,
        folder: r.folder || '',
        author: r.author || '',
        description: r.description || '',
        content: r.content || '',
        status: r.status || 'pending',
        chunksCount: r.chunks_count || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    } catch (e) {
      console.error('Admin books detail error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // PATCH /api/admin/books/:id — 更新书籍
  if (req.method === 'PATCH' && pathname.startsWith('/api/admin/books/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.replace('/api/admin/books/', '');
    try {
      const fields = [];
      const values = [];
      if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
      if (body.category !== undefined) { fields.push('category = ?'); values.push(body.category); }
      if (body.folder !== undefined) { fields.push('folder = ?'); values.push(body.folder); }
      if (body.author !== undefined) { fields.push('author = ?'); values.push(body.author); }
      if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
      if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
      if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
      if (body.chunksCount !== undefined) { fields.push('chunks_count = ?'); values.push(body.chunksCount); }
      if (!fields.length) return json(res, { error: '没有需要更新的字段' }, 400);
      fields.push('updated_at = ?');
      values.push(Date.now(), id);
      const bookId = parseInt(id);
      if (isNaN(bookId)) return json(res, { error: '无效ID' }, 400);
      await db.query(`UPDATE reference_books SET ${fields.join(', ')} WHERE id = ?`, values);
      return json(res, { id: bookId, ok: true });
    } catch (e) {
      console.error('Admin books update error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // DELETE /api/admin/books/:id — 删除书籍
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/books/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.replace('/api/admin/books/', '');
    try {
      await db.query('DELETE FROM reference_books WHERE id = ?', [id]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Admin books delete error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // POST /api/admin/books/ingest/:id — 单本书入库到向量知识库
  if (req.method === 'POST' && pathname.startsWith('/api/admin/books/ingest/')) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const id = pathname.replace('/api/admin/books/ingest/', '');
    try {
      const [rows] = await db.query('SELECT * FROM reference_books WHERE id = ?', [id]);
      if (!rows.length) return json(res, { error: '书籍不存在' }, 404);
      const book = rows[0];
      if (!book.content) return json(res, { error: '书籍内容为空' }, 400);

      // 调用 RAG 后端入库
      const ragRes = await fetch(`${RAG_URL}/api/ingest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_name: book.title, category: book.category, content: book.content, chapter: '', metadata: {} }),
        signal: AbortSignal.timeout(30000),
      });
      const ragData = await ragRes.json();

      if (ragRes.ok && ragData.chunks_created > 0) {
        await db.query('UPDATE reference_books SET status=?, chunks_count=?, updated_at=? WHERE id=?',
          ['ingested', ragData.chunks_created, Date.now(), id]);
        return json(res, { ok: true, chunks: ragData.chunks_created, status: 'ingested' });
      } else {
        await db.query('UPDATE reference_books SET status=?, updated_at=? WHERE id=?',
          ['error', Date.now(), id]);
        return json(res, { error: ragData.detail || '入库失败' }, 500);
      }
    } catch (e) {
      console.error('Book ingest error:', e);
      await db.query('UPDATE reference_books SET status=?, updated_at=? WHERE id=?', ['error', Date.now(), id]).catch(() => {});
      return json(res, { error: e.message }, 500);
    }
  }

  // POST /api/admin/books/ingest-all — 批量入库所有待入库书籍
  if (req.method === 'POST' && pathname === '/api/admin/books/ingest-all') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    // 异步后台执行，立即返回
    json(res, { ok: true, message: '批量入库已开始，请刷新页面查看进度' });
    batchIngestBooks();
    return;
  }

  // GET /api/admin/book-folders — 获取所有文件夹列表
  if (req.method === 'GET' && pathname === '/api/admin/book-folders') {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    try {
      const [rows] = await db.query('SELECT folder, COUNT(*) as cnt FROM reference_books WHERE folder != "" GROUP BY folder ORDER BY folder');
      return json(res, rows.map(r => ({ name: r.folder, count: r.cnt })));
    } catch (e) {
      console.error('Admin folders error:', e);
      return json(res, { error: '数据库错误' }, 500);
    }
  }

  // 404

  // ===== AI 对话（Chat）API =====

  // GET /api/chat/history — 获取用户对话历史（最近50条）
  if (req.method === 'GET' && pathname === '/api/chat/history') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { messages: [] });
    try {
      await ensureDbUser(payload.username);
      const [rows] = await db.query('SELECT messages FROM chat_history WHERE user_id = ?', [payload.username]);
      if (rows.length === 0) return json(res, { messages: [] });
      let msgs;
      try { msgs = JSON.parse(rows[0].messages); } catch(e) { msgs = []; }
      // 返回最近50条
      return json(res, { messages: msgs.slice(-50) });
    } catch (e) {
      console.error('Chat history error:', e);
      return json(res, { messages: [] });
    }
  }

  // DELETE /api/chat/history — 清空对话历史
  if (req.method === 'DELETE' && pathname === '/api/chat/history') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '请先登录' }, 401);
    try {
      await db.query('DELETE FROM chat_history WHERE user_id = ?', [payload.username]);
      return json(res, { ok: true });
    } catch (e) {
      console.error('Chat clear error:', e);
      return json(res, { error: '操作失败' }, 500);
    }
  }

  // ══════ 排盘端点（前端只渲染，不自己算）══════
  //
  // 前端从此**不再自己装卦/断卦**：把起卦原始数据（卦号、动爻、起卦时刻）发上来，
  // 后端用对拍过的 `paipan/` 算完整盘面返回。这样前端与 AI 看到的必然是同一个卦 ——
  // 原先前端算一份、后端算一份，两边一漂移用户分辨不出来（都是「一个卦」）。
  //
  // 匿名可用（排盘不花 token），也**未加频率限制**：这两个端点是纯计算，无 I/O、
  // 无 LLM、毫秒级返回。本站其余 API 也都没有站点级限流，只给这两个新端点单独加
  // 一个「看起来更严」的限制并不解决问题，只是把不一致藏起来 —— 要限流应当是对
  // 全站（或至少 nginx 层）一次做掉的事。
  if (req.method === 'POST' && (pathname === '/api/meihua/paipan' || pathname === '/api/liuyao/paipan')) {
    const card = body || {};
    try {
      if (pathname === '/api/meihua/paipan') {
        // 两种入参，一条出口：
        //   · **起卦原始参数** —— 目标形态，卦由后端起（字占只能走这条，笔画表在
        //     前端不存在；「加时辰」也才会用提交上来的时刻而不是真实时钟）。
        //   · 老形态的 cardData（带 `hexagrams`）—— 历史档/AI 对话那条路仍在用，
        //     只取卦号、其余重算。两条路都汇到 `prompt.js` 那一份断卦与那一份文本，
        //     故端点给前端渲染的盘与 prompt 给 AI 读的盘不可能分叉。
        //
        // **判据是 `hexagrams` 而不是 `method`**：老 cardData 里也有一个 `method`
        // 字段（起卦法的展示名），拿它做判据会把老入参误当新入参 —— 那种误判不会
        // 报错，它会**静默地按服务器当前时刻重新起一卦**，于是同一份记录渲染出
        // 另一个卦。（`duipan/smoke_paipan_endpoints.js` 就是这么抓到的。）
        const useRaw = !!card && !card.hexagrams && !!card.method;
        const raw = useRaw
          ? promptLib.meihuaChartFromParams(card)
          : promptLib.meihuaChartFromCard(card);
        if (!raw.ok) return json(res, { error: raw.reason }, 400);
        const q = raw.qigua || (raw.paipan && raw.paipan.qigua) || null;
        return json(res, {
          paipan: raw.paipan,
          sizhu: raw.sizhu,
          // 起卦结果（上/下卦号、动爻、取数过程）：前端渲染用，
          // 与 AI 收到的排盘正文出自**同一次**起卦。
          qigua: q,
          text: promptLib.meihuaBlock(raw.paipan),
        });
      }
      // 走 `prompt.js` 里那一个装卦出口 —— 端点给前端渲染的盘与 prompt 给 AI 读的
      // 盘必须是同一次装卦的结果，两处各写一遍 `buildChart` 迟早分叉。
      const built = promptLib.liuyaoChartFromCard(card, card.topic || '');
      if (!built.chart) {
        return json(res, { error: '装卦失败：拿不到本卦上下卦号' }, 400);
      }
      // `chart` 给前端分层渲染，`text` 与 AI 收到的排盘正文**逐字相同** ——
      // 用户看到的盘面与 AI 读到的盘面必须是同一份，否则解读对不上画面。
      //
      // `display` 是**盘面显示专用的补充项**（农历、节气区间、四柱旬空、神煞、
      // 变卦整列纳甲）：放在后端算是因为全是历法/术数口径，前端再算一份就是
      // 又一处漂移源。它**不进** `text`，故 AI 读到的那一段逐字未变。
      return json(res, {
        chart: built.chart, sizhu: built.sizhu,
        display: liuyaoPaipan.displayMeta(card, built.chart),
        text: liuyaoPaipan.formatChart(built.chart),
      });
    } catch (e) {
      return json(res, { error: '排盘失败：' + e.message }, 400);
    }
  }

  // ── POST /api/bazi/paipan — 八字排盘（四柱/十神/藏干/纳音/神煞/格局/用神/大运…）──
  //
  // 与上面两个排盘端点同一约定：前端只发**出生原始参数**（公历年月日时分 + 性别），
  // 盘由后端用对拍过的 `paipan/` 现算。前端从此不再自己排一份 —— 改造前
  // `charts/index.html` 与 `my-charts/index.html` **各有一份** `calcBazi`，加上
  // 写库时的快照，同一件事三处实现；「两边各算一份、慢慢对不上」正是本项目最痛的病。
  //
  // `text` = **AI 将读到的用户消息**（`paipan/bazi_report.js` 的 `baziReportPrompt`
  // 渲染出来的，与解读端点 `/api/bazi/parse` 喂给 AI 的那一段出自**同一个函数**，
  // 故不可能分叉 —— 2026-09-25 换新输出规格时这里也跟着换了，两处必须同进同退）。
  // 此处**不含【古籍参考】**：检索要用用户提问，只有解读端点那一侧拿得到。
  // （system 消息另外一段，同样在 `bazi_report.js`：`baziReportSystem()`。）
  //
  // 匿名可用（纯计算，不花 token），理由与上面两个端点同 —— 见那一段注释。
  if (req.method === 'POST' && pathname === '/api/bazi/paipan') {
    try {
      const built = baziChartFromParams(body || {});
      if (!built.ok) return json(res, { error: built.reason }, 400);
      return json(res, {
        chart: built.chart, sizhu: built.sizhu,
        display: built.display, text: built.text,
      });
    } catch (e) {
      return json(res, { error: '排盘失败：' + e.message }, 400);
    }
  }

  // ── POST /api/bazi/parse — 八字解读（流式）──
  //
  // 请求体与 `/api/bazi/paipan` 同一个形状（**出生原始参数** + `tab` + `question`），
  // 盘同样由后端现算 —— 「用户看到的盘」与「AI 读到的盘」出自同一份，不可能对不上。
  //
  // 与 `/api/chat/send` 的区别只有闸门：那一处匿名一律 401，这里**游客可以先解一次**
  // （否则「引导登录」就无从谈起）。规则（2026-09-25 拍板）：
  //   · 游客：**只能解一次**（服务端签名 cookie 记）+ 不许解**综合**（综合要通盘看，
  //     篇幅最长、最贵，也正是最该引导登录的那一个）+ 同 IP 一天有总上限。
  //   · 登录用户：与聊天同一条额度（token 用量照记），解读**存进解析记录**
  //     （`bazi_analyses`，每方面一条 + 旧版保留）。**游客不落库**。
  //
  // ── 追问（2026-09-25 拍板：「要，但追问不落库」）──
  // `followUp` 非空 = **这一次是追问**：接着上面那份解读往下问的一句话。
  // 它是这条端点的第二个入口 —— `/api/chat/send` 只认 mhys / liuyao 两种 cardType，
  // 八字在那儿没有分支，故追问也回到这里来。
  // 一个入参管三件事（都是「这是一次追问」的直接后果）：
  //   ① 换提示词 —— 追问模板，只答这一问，**不重来一遍完整分析**；
  //   ② 换上下文 —— 带上刚才那份解读的正文（用户问「那…呢」，指的就是它）；
  //   ③ **不落库** —— 追问不是一份独立解读，存进去会把「每方面一条」变成
  //      「每方面一条 + 一堆追问碎片」。
  // 三件事共用一个判据是**故意的**：少一个能配错的旋钮，客户端也没法把追问塞进记录里。
  // 其余一概照旧：照样排盘、照样计 token、照样受闸门管（**追问不豁免游客那道闸**）。
  //
  // ⚠ `question` 是另一回事，别拿它当追问的判据：那是**首次解读**时的补充提问
  //   （进 `{{question}}` 与检索词），首次带提问是正常用法（冒烟 ① 就是这一格）。
  //
  // 「算不算用掉一次」的判据与前端一致：**解读真跑完、用户真看到了才算**
  // （客户端中途断开时 `streamBaziParse` 不调 `onFinish`）。
  if (req.method === 'POST' && pathname === '/api/bazi/parse') {
    const card = body || {};
    let built;
    try {
      built = baziChartFromParams(card);
    } catch (e) {
      return json(res, { error: '排盘失败：' + e.message }, 400);
    }
    if (!built.ok) return json(res, { error: built.reason }, 400);

    const asked = String(card.tab || '');
    const aspect = BAZI_ASPECTS.indexOf(asked) >= 0 ? asked : '综合';
    // 这一次是不是追问（见端点开头那段说明）。`question` 是首次解读的补充提问，两回事。
    const followUp = String(card.followUp || '').trim();
    const payload = checkAuth(req);
    const username = payload ? payload.username : null;

    let guest = null;
    if (username) {
      // 与 /api/chat/send 同一道额度闸（那边额满时也是回一句明说的正文，不是错误码）
      try {
        const [rows] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
          const limit = getTokenLimit(rows[0].tier || 0);
          if (limit !== null && rows[0].token_used >= limit) {
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
            res.write('抱歉，你的AI解析次数已用完。\n如需继续使用，请联系管理员升级账户。');
            res.end();
            return;
          }
        }
      } catch (e) { /* 静默，与聊天一致 */ }
    } else {
      if (aspect === '综合') {
        return json(res, {
          error: '游客可以先免费解析一个方面；「综合」要通盘看，登录后即可使用',
          needLogin: true,
        }, 403);
      }
      guest = await guestGate(req, res);
      if (!guest.ok) return json(res, { error: guest.error, needLogin: true }, guest.status);
    }

    // 追问不检索古籍：`{{context}}` 里那份解读**当初就是带着古籍生成的**，再检索一遍
    // 只会把同一批段落塞第二遍。梅花/六爻的追问也都是 `ragContext = ''`（同一条约定）。
    // ⚠ 首次解读与追问**用两套提示词、两套 system**（2026-09-25 新输出规格起）：
    //   首次 → `bazi_report.js`（命盘评分 + 8 模块）；
    //   追问 → 仍是 `bazi_prompt.js` 的追问模板 + 自己的 system。
    //   若追问也吃那份「8 个模块」的规格，用户问一句「那 2027 年呢」就会**重出一整套评分表**。
    const userPrompt = followUp
      ? baziPromptLib.baziFollowUpPrompt(built.chart, {
        tab: aspect, followUp, context: card.context,
      })
      : baziReportLib.baziReportPrompt(built.chart, {
        tab: aspect,
        question: card.question || '',
        ragText: await baziRagContext(built.chart, aspect, card.question),
        currentYear: built.thisYear,
      });

    try {
      await streamBaziParse(res, {
        // 追问那一份 system 只是「只答这一问、别重出报告」，不是那份 8 模块规格。
        systemPrompt: followUp
          ? baziReportLib.baziReportFollowUpSystem()
          : baziReportLib.baziReportSystem(),
        // 首次（长报告）关思考以免正文被挤到截断；追问（短问答）照旧开低强度思考。
        noThinking: !followUp,
        userPrompt,
        username,
        onFinish: async ({ fullText }) => {
          if (username) {
            // 追问不落库 —— 只跳过这一步，额度照记（见端点开头那段说明）
            if (!followUp) {
              try {
                await saveBaziAnalysis({
                  username, chartId: card.chartId, aspect,
                  question: card.question, analysis: fullText,
                });
              } catch (e) { console.error('[bazi] 存解析记录失败:', e.message); }
            }
          } else if (guest) {
            await guestRecord(guest.anonId, guest.ip);
          }
        },
      });
    } catch (e) {
      // 走到这里通常是「上游连不上」——响应可能已经开始写了，故只在没写时补一句
      console.error('[bazi] 解读失败:', e && e.message);
      if (!res.headersSent) return json(res, { error: '解读失败：' + e.message }, 500);
      if (!res.writableEnded) { try { res.end(); } catch (e2) { /* 已断开 */ } }
    }
    return;
  }

  // POST /api/chat/send — AI 对话（流式SSE），支持文字/排盘/命盘
  if (req.method === 'POST' && pathname === '/api/chat/send') {
    const { message, cardType, cardData } = body;
    if (!message && (!cardData || cardType === 'chart')) {
      // 纯分享命盘（尚不支持解析）
      if (cardType === 'chart') {
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        res.write('🔮 命盘解析功能即将上线，敬请期待！\n\n目前你可以尝试以下功能：\n- 📖 向AI分享**梅花易数**或**六爻**排盘进行解卦分析\n- 💬 直接向AI提问命理相关的问题');
        res.end();
        return;
      }
      if (!message) return json(res, { error: '请输入消息' }, 400);
    }

    const payload = checkAuth(req);
    const username = payload ? payload.username : null;
    if (!username) return json(res, { error: '请先登录' }, 401);

    // Token 限制检查
    try {
      const [rows] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
      if (rows.length > 0) {
        const tier = rows[0].tier || 0;
        const limit = getTokenLimit(tier);
        if (limit !== null && rows[0].token_used >= limit) {
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.write('抱歉，你的AI解析次数已用完。');
          res.write('如需继续使用，请联系管理员升级账户。');
          res.end();
          return;
        }
      }
    } catch (e) { /* 静默 */ }

    // 构建系统 prompt
    let systemPrompt = '你是一位精通中国传统命理学的AI助手，擅长梅花易数、六爻纳甲、八字命理等术数。回答风格清晰、理性、有启发性，避免绝对化断语，多用"可能""倾向"。能用**加粗**标出重点。\n\n【起卦规则】当用户询问命理问题（如感情、事业、财运、健康、出行等）但未提供数字时，请先自然询问对方三个任意数字（1-9），用于梅花易数起卦。示例回复："好的，那我先起一卦看看吧～请随意想三个数字（1-9）告诉我。"当用户给出三个数字后，系统会自动计算卦象并调用你进行解卦分析，届时你将收到完整的卦象数据。如果用户已经提供了三个数字，则直接等待系统起卦后为你提供卦象数据进行分析。';
    let userPrompt = '';

    if (cardType === 'mhys' && cardData) {
      const built = buildDivinationChatPrompt('mhys', cardData, message);
      userPrompt = built.userPrompt;
      systemPrompt = built.systemPrompt;
    } else if (cardType === 'liuyao' && cardData) {
      const built = buildDivinationChatPrompt('liuyao', cardData, message);
      userPrompt = built.userPrompt;
      systemPrompt = built.systemPrompt;
    } else {
      // 纯文字对话
      userPrompt = message || '你好';
      
      // 如果有历史消息，添加上下文
      try {
        const [rows] = await db.query('SELECT messages FROM chat_history WHERE user_id = ?', [username]);
        if (rows.length > 0) {
          let history = [];
          try { history = JSON.parse(rows[0].messages); } catch(e) {}
          if (history.length > 0) {
            // 取最近3轮对话作为上下文
            const recentHistory = history.slice(-6);
            let contextText = '\n\n以下是历史对话上下文（请参考这些对话保持回答连贯）：\n';
            for (const h of recentHistory) {
              const role = h.role === 'user' ? '用户' : 'AI';
              const content = h.content || '';
              if (content.length > 200) contextText += role + '：' + content.slice(0, 200) + '...\n';
              else contextText += role + '：' + content + '\n';
            }
            userPrompt = contextText + '\n\n当前问题：' + message;
          }
        }
      } catch(e) {}
    }

    // RAG 检索（仅排盘场景）
    if ((cardType === 'mhys' || cardType === 'liuyao') && cardData) {
      try {
        const searchQuery = cardData.topic || (cardData.hexagrams && cardData.hexagrams.benGua ? cardData.hexagrams.benGua.name + '卦' : '');
        const categories = cardType === 'mhys' ? ['meihua', 'yijing'] : ['liuyao', 'yijing'];
        const ragRes = await fetch(`${RAG_URL}/api/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, top_k: 10, categories, similarity_threshold: 0.3 }),
          signal: AbortSignal.timeout(30000),
        });
        const ragData = await ragRes.json();
        if (ragData.results && ragData.results.length > 0) {
          const seenBooks = new Set();
          const diverse = [];
          for (const r of ragData.results) {
            if (!seenBooks.has(r.book_name)) { seenBooks.add(r.book_name); diverse.push(r); }
          }
          const top3 = diverse.slice(0, 3);
          if (top3.length > 0) {
            const rc = top3.map((r, i) => `【古籍 ${i+1}】《${r.book_name}》${r.chapter ? ' - ' + r.chapter : ''}\n${r.text}`).join('\n\n');
            // 参考古籍提前：要求 AI 在回答最前面展示参考书籍
userPrompt = '【参考古籍】\n参考古籍内容已提供在下方，请在回答开头先展示参考古籍来源，再开始正式分析。\n\n' + rc + '\n\n' + userPrompt;
userPrompt += '\n\n注意：参考古籍已在最上方提供，请在回答开头先展示古籍来源，不要在末尾重复添加古籍段落。';
          }
        }
      } catch (e) { console.error('Chat RAG error:', e.message); }
    }

    const prompt = userPrompt;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      // ── token 用量：取上游**真数**，不自己估 ──
      // `estimateTokens` 是本地按字数猜的（见函数定义），而用户在按这个数扣额度。
      // 实测 DeepSeek 流式支持 `stream_options.include_usage`，末尾会回一帧带
      // `{prompt_tokens, completion_tokens, total_tokens, prompt_cache_hit_tokens, ...}`
      // （2026-09-25 容器内实测，帧里带 `"usage":{"prompt_tokens":9,...}`）。
      // 故：优先用真数，取不到才回落估算 —— 回落时**只打日志**，不改文案格式
      // （那行是前端按 POINTS_LABEL 切的，动格式会连着前端一起坏 —— 尾巴由
      //  `pointsTrailer()` 拼，别再就地手写一遍）。
      let estInputTokens = estimateTokens(systemPrompt + '\n' + prompt);
      let realUsage = null;

      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: config.deepseek.apiKey,
        baseURL: config.deepseek.baseURL,
      });

      const controller = new AbortController();
      // 客户端断开时必须掐掉上游：不掐的话模型照旧把这个回答生成完 ——
      // 用户看不到，我们照付钱，而且下面那段记账还照记。
      let clientGone = false;
      const onClose = () => {
        clientGone = true;
        try { controller.abort(); } catch (e) { /* 已结束 */ }
      };
      res.on('close', onClose);

      const stream = await client.chat.completions.create({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: true,
        max_tokens: LLM_MAX_TOKENS,
        temperature: 0.7,
        reasoning_effort: LLM_REASONING_EFFORT,
        stream_options: { include_usage: true },
      }, { signal: controller.signal });

      let fullText = '';
      let stopped = false;
      // 诊断用的两个数：出事时只留「什么都没出来」是没法查的（见 LLM_MAX_TOKENS 那段注）
      let reasoningChars = 0;
      let finishReason = null;
      let wroteFallback = false;
      try {
        for await (const chunk of stream) {
          // usage 帧的内容为空，必须在取 content **之前**收，否则会漏掉
          if (chunk.usage) realUsage = chunk.usage;
          const ch0 = chunk.choices && chunk.choices[0];
          if (ch0 && ch0.delta && ch0.delta.reasoning_content) {
            reasoningChars += ch0.delta.reasoning_content.length;
          }
          if (ch0 && ch0.finish_reason) finishReason = ch0.finish_reason;
          if (stopped) continue;
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            try { res.write(content); } catch(e) { stopped = true; }
          }
        }
      } catch(e) {
        // 原来这里是 `catch(e) { /* 流中断 */ }` —— 静默吞掉，用户会拿到一段
        // 莫名截断的回答且无从分辨。现在留痕，并在**还没写出任何内容**时补一句
        // 明说的提示（已写出内容时就只留痕，避免在正文中间插一句突兀的话）。
        if (!clientGone) console.error('[chat] 流中断:', e && e.message);
        if (!fullText && !clientGone && !res.writableEnded) {
          try { res.write('抱歉，生成中断了，请重试一次。'); wroteFallback = true; } catch (e2) { /* 已断开 */ }
        }
      } finally {
        res.removeListener('close', onClose);
      }

      // 「流正常结束、但一个字正文都没有」——这不是异常，上面的 catch 抓不到，
      // 而用户看到的就是一个空白回复。实测成因见 LLM_MAX_TOKENS 那段注
      // （思考把预算吃光 → `finish_reason='length'`、正文 0 字）。
      // 补一句白话提示，并把这几个数打进日志 —— 否则线上再犯一次，日志里
      // 仍然只有「一切正常」，等于没线索（这次就是这样查了很久）。
      if (!fullText && !wroteFallback && !clientGone && !res.writableEnded) {
        console.error('[chat] 上游没出正文：finish=' + finishReason
          + '，思考 ' + reasoningChars + ' 字，输出 token '
          + (realUsage ? realUsage.completion_tokens : '（没收到 usage）') + '，上限 ' + LLM_MAX_TOKENS);
        try { res.write(EMPTY_UPSTREAM_NOTICE); } catch (e) { /* 已断开 */ }
      }

      // 流完成后算 token
      if (fullText && username) {
        const inputTokens = realUsage ? realUsage.prompt_tokens : estInputTokens;
        const outputTokens = realUsage ? realUsage.completion_tokens
                                       : estimateTokens(fullText);
        if (!realUsage) {
          console.error('[chat] 上游未回 usage，token 记账回落为估算值（'
            + inputTokens + '+' + outputTokens + '）');
        }
        const totalTokens = realUsage ? realUsage.total_tokens
                                      : inputTokens + outputTokens;
        try {
          // 更新用户 token 用量
          await db.query('UPDATE users SET token_used = token_used + ? WHERE username = ?', [totalTokens, username]);
          const [updated] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
          if (updated.length > 0) {
            const used = updated[0].token_used;
            const limit = getTokenLimit(updated[0].tier || 0);
            const remainText = limit === null ? '无限' : (limit - used).toLocaleString();
            const tokenLine = pointsTrailer(inputTokens, outputTokens, totalTokens, remainText);
            fullText += tokenLine;
            res.write(tokenLine);
          }
        } catch (e) { /* 静默失败 */ }
      }

      // 保存到对话历史
      if (username) {
        try {
          const [existing] = await db.query('SELECT messages FROM chat_history WHERE user_id = ?', [username]);
          let msgs = [];
          if (existing.length > 0) {
            try { msgs = JSON.parse(existing[0].messages); } catch(e) {}
          }
          
          // 添加用户消息
          const normalizedType = (cardType === 'meihua') ? 'mhys' : (cardType === 'mingpan' ? 'chart' : (cardType || 'text'));
          const userMsg = { role: 'user', content: message || '', type: normalizedType, createdAt: Date.now() };
          if (cardData) userMsg.cardData = cardData;
          msgs.push(userMsg);
          
          // 添加 AI 回复
          let aiContent = fullText || '';
          const tokenIdx = aiContent.lastIndexOf('\n' + POINTS_LABEL);
          if (tokenIdx > 0) aiContent = aiContent.substring(0, tokenIdx).trim();
          
          const aiMsg = { role: 'assistant', content: aiContent, type: 'text', createdAt: Date.now() };
          if (tokenIdx > 0) {
            aiMsg.tokenInfo = fullText.substring(tokenIdx).trim();
          }
          msgs.push(aiMsg);
          
          // 只保留最近200条
          if (msgs.length > 200) msgs = msgs.slice(-200);
          
          if (existing.length > 0) {
            await db.query('UPDATE chat_history SET messages = ?, updated_at = ? WHERE user_id = ?',
              [JSON.stringify(msgs), Date.now(), username]);
          } else {
            await db.query('INSERT INTO chat_history (user_id, messages, created_at, updated_at) VALUES (?, ?, ?, ?)',
              [username, JSON.stringify(msgs), Date.now(), Date.now()]);
          }
        } catch(e) { console.error('Chat save error:', e); }
      }

      res.end();
    } catch (e) {
      console.error('Chat stream error:', e.message);
      if (!res.writableEnded) {
        try { res.write('data: [ERROR] ' + e.message + '\n\n'); } catch {}
        try { res.end(); } catch {}
      }
    }
    return;
  }


  // POST /api/personal/chat — 个人站像素小人 AI 对话代理
  if (req.method === 'POST' && pathname === '/api/personal/chat') {
    return chatProxy.handleChat(req, res, body);
  }

  // GET /api/announcement — 获取公告内容（从微云笔记同步）
  if (req.method === 'GET' && pathname === '/api/announcement') {
    // 有缓存直接返回（即使过期也先用，后台会刷新）
    if (annCache.text) {
      // 缓存超过 5 分钟，后台静默刷新
      if (Date.now() - annCache.ts > 300000) refreshAnnCache();
      return json(res, { content: annCache.text });
    }
    // 首次无缓存，等待拉取
    if (!annCache.loading) refreshAnnCache();
    // 最多等 5 秒
    const start = Date.now();
    while (!annCache.text && Date.now() - start < 5000) {
      await new Promise(r => setTimeout(r, 200));
    }
    return json(res, { content: annCache.text || '' });
  }

  // POST /api/wechat/login — 微信小程序授权登录
  if (req.method === 'POST' && pathname === '/api/wechat/login') {
    const { code } = body;
    if (!code) return json(res, { error: '缺少code' }, 400);

    try {
      // 1. Exchange code for openid
      const https = require('https');
      const wxUrl = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + config.wechat.appId + '&secret=' + config.wechat.appSecret + '&js_code=' + code + '&grant_type=authorization_code';

      const wxData = await new Promise(function (resolve, reject) {
        https.get(wxUrl, function (resp) {
          let d = '';
          resp.on('data', function (c) { d += c; });
          resp.on('end', function () {
            try { resolve(JSON.parse(d)); }
            catch (e) { reject(e); }
          });
        }).on('error', reject);
      });

      if (wxData.errcode) {
        console.error('WeChat login error:', wxData.errcode, wxData.errmsg || '');
        return json(res, { error: '微信登录失败' }, 400);
      }

      const openid = wxData.openid;

      // 2. Create or find user by openid
      let username = 'wx_' + openid.substring(0, 16);
      if (db) {
        const [rows] = await db.query('SELECT phone FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
          await db.query(
            'INSERT INTO users (phone, username, password_hash, nick_name, ai_count, token_used, tier, created_at, last_active) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)',
            ['', username, '', '微信用户', Date.now(), Date.now()]
          );
        }
      }

      // 3. Generate JWT
      const token = createToken({ username: username, exp: Date.now() + USER_TOKEN_EXPIRY });
      let nick_name = '微信用户';
      let avatar_url = '';
      if (db) {
        try {
          const [userRows] = await db.query('SELECT nick_name, avatar_url FROM users WHERE username = ?', [username]);
          if (userRows.length > 0) {
            nick_name = userRows[0].nick_name || '微信用户';
            avatar_url = userRows[0].avatar_url || '';
          }
        } catch (e) { /* ignore */ }
      }
      return json(res, { token: token, username: username, nick_name: nick_name, avatar_url: avatar_url });
    } catch (e) {
      console.error('WeChat login error:', e);
      return json(res, { error: '登录失败' }, 500);
    }
  }

  // POST /api/wechat/bind-phone — 微信用户绑定手机号
  if (req.method === 'POST' && pathname === '/api/wechat/bind-phone') {
    const payload = checkAuth(req);
    if (!payload) return json(res, { error: '未登录' }, 401);

    const { phone, code } = body;
    if (!phone || !/^1\d{10}$/.test(phone)) return json(res, { error: '请输入正确手机号' }, 400);
    if (!code) return json(res, { error: '请输入短信验证码' }, 400);

    // 校验验证码（内存 codeStore，和 /api/register 一致）
    const verifyResult = verifySmsCode(phone, code);
    if (!verifyResult.ok) return json(res, { error: verifyResult.error }, 400);

    try {
      // 更新用户信息，绑定手机号
      const currentUser = payload.username;
      await db.query('UPDATE users SET phone = ? WHERE username = ?', [phone, currentUser]);

      // 如果 username 以 wx_ 开头，同步更新 username 为真实手机号
      if (currentUser && currentUser.startsWith('wx_')) {
        await db.query('UPDATE users SET username = ? WHERE username = ?', [phone, currentUser]);
      }

      return json(res, { ok: true, phone });
    } catch (e) {
      console.error('Bind phone error:', e);
      return json(res, { error: '绑定失败，请稍后重试' }, 500);
    }
  }

  json(res, { error: 'Not found' }, 404);
}

function checkAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit
async function parseBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => {
      d += c;
      if (d.length > MAX_BODY_SIZE) { req.destroy(); resolve({}); }
    });
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
  });
}

// ══════ 八字：排盘的**唯一出口** ══════
//
// `POST /api/bazi/paipan` 与 `/api/chat/send` 的 `bazi` 分支**都走这里**。
// 两处各排一份盘、各渲染一次 prompt，就是两处可能分叉的地方 —— 而
// 「用户看到的盘与 AI 读到的盘不是同一份」在本项目已经发生过（六爻那侧，
// 见 `paipan/prompt.js` 文件头「只信前端传的起卦原始数据」那一段）。

/** 生肖表：按**地支序**排，故查表即可，不必再走一遍历法库。 */
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇',
  '马', '羊', '猴', '鸡', '狗', '猪'];

/**
 * 出生原始参数 → 完整命盘 + 历法展示项 + AI 正文。
 *
 * @param {object} card 前端提交的出生参数
 *   `{y, mo, d, h, mi, gender, tab, question}`
 *   · `gender`：`male`/`female`（也收「男」「女」）—— `life_aspects.marriage` 要用。
 *   · `tab`：综合/事业/财运/婚姻/健康。空值退成「综合」（与后台模板同一回落）。
 *   · `question`：用户自由提问，可空；会**原样**进正文（见 `bazi_prompt.js` 的替换函数）。
 * @returns {{ok:true, chart, sizhu, display, text} | {ok:false, reason}}
 */
function baziChartFromParams(card) {
  const c = card || {};
  const y = +c.y, mo = +c.mo, d = +c.d;
  if (!y || !mo || !d) return { ok: false, reason: '缺少出生日期（公历年月日）' };
  const h = (c.h === '' || c.h == null) ? 0 : +c.h;
  const mi = (c.mi === '' || c.mi == null) ? 0 : +c.mi;
  const gender = c.gender === '女' ? 'female'
    : (c.gender === '男' ? 'male' : (c.gender || ''));

  // 「今年」只取一次，下面 `buildBaziFull` 与「【大运一览】标出当前所在」用的是同一个数 ——
  // 分两处各调一次 `new Date()` 理论上能跨年（年末那一瞬间），没必要留这个缝。
  const thisYear = new Date().getFullYear();

  const chart = baziFull.buildBaziFull({ y, mo, d, h, mi }, {
    gender,
    birthYear: y,
    // ⚠ 「哪一年是今年」**必须显式给**。基准 `core/bazi/current_fortune.py:18` 的默认值是
    //    写死的 `current_year: int = 2026`，而基准自己的端点（`api/bazi.py:121`）只传了三个
    //    参数 —— 于是**基准线上的「当前运程」永远停在 2026 年**。那是基准端点的接线缺陷，
    //    不是算法问题；我们按事实给真实年份（「事实 > shushu」）。对拍不受影响：层 9/15
    //    都是**显式注入** currentYear 的，走的不是这条默认值。
    currentYear: thisYear,
  });

  // 「大运」一览表（六步）—— **端点层**补挂，移植层一个字未动。
  //   基准 `api/agent.py:1438` 的 ctx 里确有这一项，但基准端点从不往 chart 上挂 `dayun`，
  //   实测真实链路上它**恒为空**（364 例全空）：AI 因此只剩「当前这一步」，看不到整条脉络。
  //   补法用的是 `current_fortune.js` 内部**同一个调用**（`calculateDayun(chart, gender,
  //   birthYear)`，同一个十步默认值），故不可能出现「一览里有一步与当前大运不是同一字」。
  //   ⚠ 这属于**输入侧**补充：`bazi_prompt.js` 未改，层 16 对拍（442 例）喂的是基准输入
  //     （没有 `dayun`），故仍逐字全绿。
  chart.dayun = baziFortuneLib.calculateDayun(chart, gender, y);

  // 「未来流年」一览表（从今年起 10 年）—— 同一条理由、同一层补挂（2026-09-25）。
  //   新输出规格的模块 7 要「未来 5–10 年流年简析 / 重点机遇年 / 需谨慎年」，而
  //   `calculateLiunian` 早就算得出来，只是从前没人往提示词里放（ctx 里只有**当前那一年**）。
  //   ⚠ 挂上去**不影响层 15/16 对拍**：那两层喂的是基准输入（没有 `liunian` 这个键），
  //     与上面 `chart.dayun` 同一情形 —— 对拍比的仍是「基准输入 → 逐字同一份 prompt」。
  //   ⚠ `liunian[*].shishen_zhi` 恒为空串（`bazi_fortune.js:500` 拿**五行**当地支查表，
  //     照搬基准的缺陷第 1 条）—— 故提示词那一块**自己写明「地支十神本系统不提供」**，
  //     别让模型去补一个根本不存在的字段（见 `bazi_report.js` 的 `liunianText`）。
  chart.liunian = baziFortuneLib.calculateLiunian(chart, gender, y, thisYear, thisYear + 9);

  return {
    ok: true,
    chart,
    // 「今年」**回传出去**：解读端点要拿它去渲染提示词。原来那边是**又调一次**
    // `new Date()` —— 年末跨年那一瞬间，`/api/bazi/paipan` 返回的 `text` 与
    // 真正喂给 AI 的那一段就会差一年，而上面那段注释的立论正是「不可能分叉」。
    // 缝很小，但没必要留着。
    thisYear,
    sizhu: ganzhiLib.sizhu({ y, mo, d, h, mi }),
    display: baziDisplayMeta(chart),
    // ⚠ 与解读端点 `/api/bazi/parse` **同一个出口**（`baziReportPrompt`）——
    //   2026-09-25 换成新输出规格后，这里若还留在 `baziPromptLib.baziPrompt`，
    //   `/api/bazi/paipan` 返回的 `text` 就与真正喂给 AI 的那一段**不是同一份**了，
    //   而上面那段注释的立论正是「出自同一个函数，故不可能分叉」。
    text: baziReportLib.baziReportPrompt(chart, {
      tab: c.tab || '', question: c.question || '', ragText: '', currentYear: thisYear,
    }),
  };
}

/**
 * 盘面显示专用的历法项：农历、生肖、节气区间、四柱旬空。
 *
 * 与六爻那侧 `displayMeta` 同一条理由 —— 这几项全是历法/术数口径，前端再算一份就是
 * 又一处漂移源。**刻意不并进 `text`**：那段正文要过对拍基准，「页面想多显示一个字段」
 * 不该顺带动了 AI 读到的那一段。
 *
 * 时刻一律取 `chart.birth_dt`（**排盘自己用的那一份**），不从入参另拼一个 ——
 * 否则「盘按这个时刻、农历按那个时刻」会在边界上对不上。
 */
function baziDisplayMeta(chart) {
  const dt = chart.birth_dt;
  const out = { lunar: '', shengxiao: '', jieQi: null, kong: {} };

  // 生肖由**年支**取，不用历法库的 `getYearShengXiao*()` —— 那两个一个按正月初一、
  // 一个按**立春日**（日粒度），都和我们全项目统一的「立春**时刻**精确换年」不是一个口径。
  // 从年支倒推，则「年柱写什么、生肖就是什么」永远自洽，也不会多出第三套换年边界。
  const yZhi = (chart.year_pillar && chart.year_pillar.dizhi) || '';
  const zhiIdx = paipanConst.DIZHI.indexOf(yZhi);
  out.shengxiao = zhiIdx >= 0 ? SHENGXIAO[zhiIdx] : '';

  try { out.lunar = ganzhiLib.lunarText(dt); } catch (e) { out.lunar = ''; }
  try { out.jieQi = ganzhiLib.jieQiRange(dt); } catch (e) { out.jieQi = null; }

  // 四柱旬空：各柱各按自己的干支起旬（与六爻那侧并排展示同一做法，
  // 免得用户以为只有日柱有旬空）。
  const pillars = [['year', 'year_pillar'], ['month', 'month_pillar'],
    ['day', 'day_pillar'], ['hour', 'hour_pillar']];
  for (const [k, key] of pillars) {
    const p = chart[key];
    const gz = p ? String(p.tiangan || '') + String(p.dizhi || '') : '';
    out.kong[k] = gz.length === 2 ? paipanConst.getKongWang(gz).join('') : '';
  }

  return out;
}

// ══════ 八字：解读（游客可解一次、且不许解「综合」）══════
//
// 为什么另开一个端点，而不复用 `/api/chat/send`：那条路**匿名一律 401**
// （`if (!username) return json(res, {error:'请先登录'}, 401)`）。而产品要求是
// 「游客只能解析一次；还想解析就引导登录」—— 游客必须先**能**解一次，才谈得上
// 引导。所以这里是一条允许匿名的路，且它自己带额度闸门。
//
// 三件事在这里合起来：
//   ① 身份：登录用户走 token；游客发一个**服务端签名**的 cookie（清掉能再来，
//      故它只是一道**产品闸门**，不是安全边界 —— 见 `anonCookie`）。
//   ② 额度：游客同一 cookie 限一次，另有「同一 IP 一天最多 N 次」的总闸，防批量。
//   ③ 记录：登录用户的解读写进 `bazi_analyses`（每方面一条 + 旧版保留）；
//      **游客不落库**（2026-09-25 拍板）。

/** 五个解析方面。顺序即界面顺序；「综合」永远是第一个。 */
const BAZI_ASPECTS = ['综合', '事业', '财运', '婚姻', '健康'];
const ANON_COOKIE = 'sqw_anon';
/** 同一 IP 一天内的游客解读总上限。挡的是批量刷，不是正常用户。 */
const ANON_IP_DAILY_CAP = 20;

/**
 * 游客身份 cookie：`<随机 id>.<HMAC>`。
 *
 * 签名密钥**复用 `JWT_SECRET`**（那份密钥本来就随安装生成、落在密钥文件里、
 * 从不打日志）—— 不新增环境变量，也就不必动 `.env` 与 compose（少一次部署摩擦）。
 *
 * ⚠ 说清楚它的分量：这不是安全边界。用户把 cookie 清掉就又是新访客，
 * 正如现在六爻/梅花靠 `localStorage` 记的那一笔。它要做的是**如实告知并拦住
 * 顺手多用**，不是防住有心绕过的人 —— 后者要靠「同 IP 日上限」那道总闸。
 */
function anonSign(id) {
  return crypto.createHmac('sha256', JWT_SECRET).update('anon:' + id).digest('base64url');
}
function anonReadCookie(req) {
  const raw = (req.headers && req.headers.cookie) || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + ANON_COOKIE + '=([^;]+)'));
  if (!m) return null;
  const parts = decodeURIComponent(m[1]).split('.');
  if (parts.length !== 2) return null;
  const id = parts[0];
  if (!/^[0-9a-f]{24}$/.test(id)) return null;
  // 长度不同的两个串直接比会泄露前缀信息，故逐字节比（签名只有 43 字符，代价可忽略）
  const want = anonSign(id);
  const got = parts[1];
  if (want.length !== got.length) return null;
  return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(got)) ? id : null;
}
function anonIssueCookie(res, id) {
  res.setHeader('Set-Cookie', ANON_COOKIE + '=' + id + '.' + anonSign(id)
    + '; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly');
}
/** 取客户端 IP。nginx 在前面，故以 `X-Forwarded-For` 的第一段为准。 */
function clientIp(req) {
  const xff = (req.headers && req.headers['x-forwarded-for']) || '';
  const first = String(xff).split(',')[0].trim();
  return first || (req.socket && req.socket.remoteAddress) || '';
}

/**
 * 游客闸门：能解就放行（顺带把 cookie 与 IP 记上），不能解就给出**要登录**的理由。
 * @returns {Promise<{ok:boolean, anonId?:string, ip?:string, status?:number, error?:string}>}
 */
async function guestGate(req, res) {
  const ip = clientIp(req);
  const had = anonReadCookie(req);
  const anonId = had || crypto.randomBytes(12).toString('hex');
  if (!had) anonIssueCookie(res, anonId);

  try {
    if (had) {
      const [[{ cnt }]] = await db.query(
        "SELECT COUNT(*) as cnt FROM anon_usage WHERE anon_id = ? AND kind = 'bazi'", [anonId]);
      if (cnt > 0) {
        return { ok: false, status: 403, error: '游客只能免费解析一次，登录后可以继续解析任意方面' };
      }
    }
    const [[{ cnt: ipCnt }]] = await db.query(
      "SELECT COUNT(*) as cnt FROM anon_usage WHERE ip = ? AND kind = 'bazi' AND used_at > ?",
      [ip, Date.now() - 86400000]);
    if (ipCnt >= ANON_IP_DAILY_CAP) {
      return { ok: false, status: 429, error: '今天的免费额度已用完，请明天再来或登录使用' };
    }
  } catch (e) {
    // 库查不动时**放行还是拦？** 放行：闸门坏掉不该让所有游客都用不了；
    // 代价是这期间的游客可能多解几次，记在日志里以便发现。
    console.error('[bazi] 游客额度查询失败（放行）:', e.message);
  }
  return { ok: true, anonId, ip };
}

/** 记一笔游客用量（**解读真跑完之后**才记，见调用处）。 */
async function guestRecord(anonId, ip) {
  try {
    await db.query('INSERT INTO anon_usage (anon_id, kind, ip, used_at) VALUES (?, ?, ?, ?)',
      [anonId || '', 'bazi', ip || '', Date.now()]);
  } catch (e) { console.error('[bazi] 游客用量记账失败:', e.message); }
}

/**
 * 取【古籍参考】正文（六爻/梅花那条路的同一形状）。
 *
 * ⚠ 这段与 `/api/chat/send` 里的 RAG 段**同源**（那段在 handle() 里内联着）：
 * 检索参数、去重方式、`【古籍 N】《书名》 - 章节` 的排版都照抄，只在检索词与
 * 分类上不同（八字用 `bazi`/`yijing`，检索词由 `baziSearchQuery` 拼）。
 * 两处**重复**是已知的：合并需要先有对拍手段（那条路目前只能在线上跑），
 * 故先标注来源、留待有手段再合 —— 谁改这里，去看一眼那一处。
 *
 * 取不到就返回空串：**古籍是加分项，不该让解读失败**（与那里一致）。
 */
async function baziRagContext(chart, aspect, question) {
  const query = baziSearchQuery(chart, aspect, question);
  if (!query) return '';
  try {
    const r = await fetch(`${RAG_URL}/api/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: 10, categories: ['bazi', 'yijing'], similarity_threshold: 0.3 }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();
    if (!data.results || !data.results.length) return '';
    const seen = new Set();
    const diverse = [];
    for (const it of data.results) {
      if (!seen.has(it.book_name)) { seen.add(it.book_name); diverse.push(it); }
    }
    return diverse.slice(0, 3)
      .map((it, i) => `【古籍 ${i + 1}】《${it.book_name}》${it.chapter ? ' - ' + it.chapter : ''}\n${it.text}`)
      .join('\n\n');
  } catch (e) {
    console.error('[bazi] 取古籍失败（不影响解读）:', e.message);
    return '';
  }
}

/**
 * 检索词：日主 + 月令 + 格局 + 这一方面。
 *
 * 不拿整张盘去检索（检索是按相似度的，塞进去的无关词越多，越容易命中最热门的
 * 那几段通用语料）。八字这条线上真正决定「看什么书」的是**日主与月令**
 * （《穷通宝鉴》按「某日主生某月」成篇），故这四个词就够。
 */
function baziSearchQuery(chart, aspect, question) {
  const dm = (chart && chart.day_master) || (chart && chart.day_pillar && chart.day_pillar.tiangan) || '';
  const monthZhi = (chart && chart.month_pillar && chart.month_pillar.dizhi) || '';
  const geju = (chart && chart.pattern && (chart.pattern.name || chart.pattern.primary)) || '';
  const q = String(question || '').trim();
  return [dm, monthZhi ? monthZhi + '月' : '', geju, aspect, q].filter(Boolean).join(' ');
}

/**
 * 八字解读的流式段。
 *
 * ⚠ **镜像自** `/api/chat/send` 里那段流式（同源的四处约定：`stream_options.include_usage`
 * 取上游真数、尾部 `pointsTrailer()` 那个**逐字格式**、客户端断开就掐上游、断在无字
 * 阶段时补一句明说）。前端按 `AI_POINTS_MARKS` 切正文，动格式会连着前端一起坏。
 *
 * 与那一处的差异只有两条：prompt 的来源，以及**记账对象**（这里可能是游客）。
 * 同样已知重复、同样留待有对拍手段再合。
 *
 * @param {function} onFinish 解读**真写完**后调用（记账/落库都在里面）。
 *   客户端中途断开（`clientGone`）或一个字都没出来时不调用 —— 用户没看见的
 *   解读不算数。
 */
async function streamBaziParse(res, opts) {
  // `noThinking`：这条线**关掉思考**（理由见 `BAZI_REPORT_TEMPERATURE` 那段注）。
  // 由调用处给：**首次解读给 true、追问给 false** —— 首次是那份结构化长报告，
  // 思考会抢走正文的预算（会截断）；追问是短问答，思考有助于质量，预算也够。
  const { systemPrompt, userPrompt, username, onFinish, noThinking } = opts;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // 与 /api/chat/send 一致：不加这条 nginx 会攒够一段才转发，流式变成「等半天来一大坨」
    'X-Accel-Buffering': 'no',
  });

  const estInputTokens = estimateTokens(systemPrompt + '\n' + userPrompt);
  let realUsage = null;
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: config.deepseek.apiKey, baseURL: config.deepseek.baseURL });

  const controller = new AbortController();
  let clientGone = false;
  const onClose = () => {
    clientGone = true;
    try { controller.abort(); } catch (e) { /* 已结束 */ }
  };
  res.on('close', onClose);

  let fullText = '';
  let stopped = false;
  // 诊断用的两个数（与 /api/chat/send 同）：只留一句「什么都没出来」是查不下去的
  let reasoningChars = 0;
  let finishReason = null;
  let wroteFallback = false;
  try {
    // `create` 也放进 try 里：它抛错时响应头**已经发出去了**（200 + text/event-stream），
    // 端点外面那个 catch 只能看到 `headersSent`，什么也补不回来 —— 用户拿到空白。
    // 放进来至少能补一句白话提示。（原来的写法就是把它放在 try 外面，这是个真缺口。）
    // ⚠ `thinking` 与 `reasoning_effort` **不并存**：关思考时给前者、否则给后者。
    //   两个都传是没意义的组合（一个是「别想」、一个是「想多少」），故按条件给，不硬拼。
    const params = {
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: LLM_MAX_TOKENS,
      stream_options: { include_usage: true },
    };
    if (noThinking) {
      params.thinking = { type: 'disabled' };
      params.temperature = BAZI_REPORT_TEMPERATURE;   // 关思考后温度才生效
    } else {
      params.temperature = 0.7;
      params.reasoning_effort = LLM_REASONING_EFFORT;
    }
    const stream = await client.chat.completions.create(params, { signal: controller.signal });

    for await (const chunk of stream) {
      if (chunk.usage) realUsage = chunk.usage;
      const ch0 = chunk.choices && chunk.choices[0];
      if (ch0 && ch0.delta && ch0.delta.reasoning_content) {
        reasoningChars += ch0.delta.reasoning_content.length;
      }
      if (ch0 && ch0.finish_reason) finishReason = ch0.finish_reason;
      if (stopped) continue;
      const content = (ch0 && ch0.delta && ch0.delta.content) || '';
      if (content) {
        fullText += content;
        try { res.write(content); } catch (e) { stopped = true; }
      }
    }
  } catch (e) {
    if (!clientGone) console.error('[bazi] 解读流中断:', e && e.message);
    if (!fullText && !clientGone && !res.writableEnded) {
      try { res.write('抱歉，生成中断了，请重试一次。'); wroteFallback = true; } catch (e2) { /* 已断开 */ }
    }
  } finally {
    res.removeListener('close', onClose);
  }

  // 「流正常结束、但一个字正文都没有」不是异常，上面的 catch 抓不到 —— 这正是
  // 线上那个「HTTP 200 + 0 字节」的成因（见 LLM_MAX_TOKENS 那段注）。
  if (!fullText && !wroteFallback && !clientGone && !res.writableEnded) {
    console.error('[bazi] 上游没出正文：finish=' + finishReason + '，思考 ' + reasoningChars
      + ' 字，输出 token ' + (realUsage ? realUsage.completion_tokens : '（没收到 usage）')
      + '，上限 ' + LLM_MAX_TOKENS);
    try { res.write(EMPTY_UPSTREAM_NOTICE); } catch (e) { /* 已断开 */ }
  }

  const seen = !!fullText && !clientGone;
  let trailer = '';
  if (seen) {
    // 与 /api/chat/send 同一算法、同一格式（游客不记 token，他的额度是「次数」）
    if (username) {
      const inputTokens = realUsage ? realUsage.prompt_tokens : estInputTokens;
      const outputTokens = realUsage ? realUsage.completion_tokens : estimateTokens(fullText);
      const totalTokens = realUsage ? realUsage.total_tokens : inputTokens + outputTokens;
      try {
        await db.query('UPDATE users SET token_used = token_used + ? WHERE username = ?',
          [totalTokens, username]);
        const [updated] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
        if (updated.length > 0) {
          const used = updated[0].token_used;
          const limit = getTokenLimit(updated[0].tier || 0);
          const remainText = limit === null ? '无限' : (limit - used).toLocaleString();
          trailer = pointsTrailer(inputTokens, outputTokens, totalTokens, remainText);
        }
      } catch (e) { /* 静默失败 */ }
    }
    if (trailer && !res.writableEnded) { try { res.write(trailer); } catch (e) { /* 已断开 */ } }
  }
  if (!res.writableEnded) res.end();
  if (seen && onFinish) {
    // 用 try 包住：落库失败不该把已经流给用户的解读弄成错误响应（响应已结束）
    try { await onFinish({ fullText, realUsage, estInputTokens }); }
    catch (e) { console.error('[bazi] 解读收尾失败:', e.message); }
  }
}

/**
 * 把一条解读写进 `bazi_analyses`（每方面一条 + 旧版保留，故是 INSERT 不是 UPDATE）。
 * @returns {Promise<string|null>} 新记录 id
 */
async function saveBaziAnalysis({ username, chartId, aspect, question, analysis }) {
  const id = 'bz_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
  await db.query(
    'INSERT INTO bazi_analyses (id, user_id, chart_id, aspect, question, analysis, created_at)'
    + ' VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, username, chartId || null, aspect, String(question || '').slice(0, 255), analysis, Date.now()]);
  return id;
}

function buildDivinationChatPrompt(cardType, cardData, message) {
  const prompts = readPrompts();
  const topic = (cardData && cardData.topic) || message || '';
  const ragContext = (cardData && cardData.ragContext) || '';
  const followUp = (cardData && cardData.followUp) || '';
  const followUpContext = (cardData && cardData.context) || '';
  let systemPrompt = '你是一位精通中国传统命理学的AI助手，擅长梅花易数、六爻纳甲、八字命理等术数。回答风格清晰、理性、有启发性，避免绝对化断语，多用"可能""倾向"。能用**加粗**标出重点。\n\n【起卦规则】当用户询问命理问题（如感情、事业、财运、健康、出行等）但未提供数字时，请先自然询问对方三个任意数字（1-9），用于梅花易数起卦。示例回复："好的，那我先起一卦看看吧～请随意想三个数字（1-9）告诉我。"当用户给出三个数字后，系统会自动计算卦象并调用你进行解卦分析，届时你将收到完整的卦象数据。如果用户已经提供了三个数字，则直接等待系统起卦后为你提供卦象数据进行分析。';
  let userPrompt = '';

  if (cardType === 'mhys' && cardData) {
    systemPrompt = prompts.mhys_system || DEFAULT_PROMPTS.mhys_system;
    if (followUp) {
      userPrompt = buildFollowUpPrompt(topic || '此卦', followUp, followUpContext, cardData);
    } else {
      userPrompt = buildMhysPrompt(topic, cardData, ragContext);
      if (message && message !== topic && !message.startsWith('帮我解析')) {
        userPrompt += '\n\n用户补充提问：' + message;
      }
    }
  } else if (cardType === 'liuyao' && cardData) {
    // ⚠ 这里也是 `prompts.X || systemPrompt`（外层那句通用系统提示词）回落。
    // 那句通用提示词里有【起卦规则】—— 教 AI 反问用户「请随意想三个数字（1-9）」
    // 去走**梅花**起卦。盘都排好了还让用户报数重新起卦，就是这么来的：
    // 六爻的系统提示词缺失 → 落到那句梅花味儿的通用提示词 → AI 以为还没有卦。
    systemPrompt = prompts.liuyao_system || DEFAULT_PROMPTS.liuyao_system;
    if (followUp) {
      userPrompt = buildLiuyaoFollowUpPrompt(topic || '此卦', followUp, followUpContext, cardData);
    } else {
      userPrompt = buildLiuyaoPrompt(topic, cardData, ragContext);
      if (message && message !== topic && !message.startsWith('帮我解析')) {
        userPrompt += '\n\n用户补充提问：' + message;
      }
    }
  }

  return { systemPrompt, userPrompt };
}

// ===== 梅花易数 AI 解析（流式） =====
//
// 排盘数据一律由 `paipan/prompt.js` 从**起卦原始数据**重算（只信前端传的
// 上下卦号 + 动爻），本处只负责「取模板 → 渲染」。
// 「后台自定义模板」与「内置默认模板」走同一条渲染路径 —— 两套渲染必然漂移。

function buildMhysPrompt(topic, cardData, ragContext) {
  var custom = readPrompts();
  var vars = promptLib.mhysVars(topic, cardData, ragContext);

  if (!topic) {
    // ⚠ 无事项**不等于无盘面**。改造前这里 return 的是一句不带变量的话，
    // 于是「事项留空点自动解析」把排好的盘整个丢掉，AI 只能回
    // 「我还没收到卦象数据」（线上实测）。现在模板带全盘面，只是不下结论、先问事项。
    return renderPrompt(custom.mhys_notopic || DEFAULT_PROMPTS.mhys_notopic, vars);
  }

  return renderPrompt(custom.mhys_prompt || DEFAULT_PROMPTS.mhys_prompt, vars);
}

// ===== 六爻 AI 解析 =====
// 同上：排盘（装卦、断卦、用神）全部由 `paipan/liuyao.js` 重算，
// 本处只出文本。改造前这一层的**卦名与上下卦名取自前端**，正文却是后端算的，
// 两边一旦不一致就自相矛盾；现在连卦名也取自 `chart`。

function buildLiuyaoPrompt(topic, cardData, ragContext) {
  var custom = readPrompts();
  var vars = promptLib.liuyaoVars(topic, cardData, ragContext);

  if (!topic) {
    // 同梅花：无事项不是无盘面，模板必须带 `{{paipan}}`。
    return renderPrompt(custom.liuyao_notopic || DEFAULT_PROMPTS.liuyao_notopic, vars);
  }

  return renderPrompt(custom.liuyao_prompt || DEFAULT_PROMPTS.liuyao_prompt, vars);
}

/** 梅花追问：续用同一份排盘（追问也可能引用卦象），不重发完整断卦指令。 */
function buildFollowUpPrompt(topic, followUp, context, cardData) {
  var custom = readPrompts();
  var vars = promptLib.mhysVars(topic, cardData, '');
  vars.followUp = followUp || '';
  vars.context = (context || '').slice(-1200);
  return renderPrompt(custom.mhys_followup || promptLib.DEFAULT_MHYS_FOLLOWUP, vars);
}

/** 六爻追问。`paipan` 变量里是完整盘面，追问到应期/空亡时 AI 要能回看。 */
function buildLiuyaoFollowUpPrompt(topic, followUp, context, cardData) {
  var custom = readPrompts();
  var vars = promptLib.liuyaoVars(topic, cardData, '');
  vars.followUp = followUp || '';
  vars.context = (context || '').slice(-1200);
  return renderPrompt(custom.liuyao_followup || promptLib.DEFAULT_LIUYAO_FOLLOWUP, vars);
}

function getTokenLimit(tier) {
  // tier 0=普通用户 1=会员 2=SVIP
  // null = 不限
  switch (tier) {
    case 1: return 5000000;
    case 2: return null;
    default: return 100000;
  }
}

async function ensureDbUser(username) {
  if (!username || !db) return;
  try {
    const [rows] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      // 微信用户 openid 较长，phone 列只存手机号；username 存完整标识
      const phone = (username.startsWith('wx_')) ? '' : username;
      await db.query(
        'INSERT INTO users (phone, username, password_hash, nick_name, ai_count, token_used, tier, created_at, last_active) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)',
        [phone, username, '', username, Date.now(), Date.now()]
      );
    }
  } catch (e) {
    // 并发重复插入可能冲突，忽略
  }
}

function estimateTokens(text) {
  if (!text) return 0;
  const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const english = text.length - chinese;
  return Math.ceil(chinese * 0.6 + english * 0.25) + 10;
}

// ══════ Prompt 模板引擎 ══════
// ⚠ 这里原本写的是 `path.join(__dirname, 'data', 'prompts.json')`
//  = `/app/data/prompts.json` —— 而本文件 127 行的 `DATA_DIR` 是
//  `path.join(__dirname, '..', 'data')` = **`/data`**（compose 里
//  `/var/www/sqw.somtfly.com/data:/data:rw` 那个**持久卷**，users.json /
//  admin.json / .jwt_secret 都在那儿）。
//  后果（2026-09-25 容器内实测确认，不是推测）：
//    · `/app/data` **根本不存在** ⇒ `readPrompts()` 每次都 catch 成 `{}`，
//      后台自定义模板**永远读不到**，全站静默用内置默认；
//    · `writePrompts()` 抛 ENOENT ⇒ 管理员在后台**保存模板是失败的**。
//  这是一个「看着能用、其实全程没生效」的静默 fallback：
//  改了模板没有任何效果，而页面上不会报任何错。
const PROMPTS_FILE = path.join(DATA_DIR, 'prompts.json');

function readPrompts() {
  try {
    return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8'));
  } catch (e) {
    // ENOENT = 「还没存过自定义模板」，这是**正常状态**，不是错误：报它只会刷屏。
    // 但其它错误（权限、坏 JSON、磁盘满）必须出声 —— 原来一句 `catch {}`
    // 把两者一起吞了，于是「模板文件坏了」和「没存过模板」在日志里长得一样，
    // 表现为「后台改了模板但站点毫无变化、还没有任何线索」。
    if (e && e.code !== 'ENOENT') {
      console.error('[prompts] 读取失败 ' + PROMPTS_FILE + '：' + (e && e.message));
    }
    return {};
  }
}
/** 写模板。失败**不抛**，返回 null 表示成功、返回错误串表示失败，由调用方回 500。 */
function writePrompts(data) {
  try {
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return null;
  } catch (e) {
    console.error('[prompts] 写入失败 ' + PROMPTS_FILE + '：' + (e && e.message));
    return (e && e.message) || 'unknown error';
  }
}

// 模板变量替换 —— **全站唯一一份实现**，转调 `paipan/bazi_prompt.js` 那一份。
//
// 原先这里自己写了一遍「按变量表逐键循环 replace」，与 `bazi_prompt.js` 那份并存。
// 两份的差别不是风格，是两个**真实缺陷**（此前这里是错的那一份）：
//   ① 替换值当**字符串**塞进 `replace` → 值里的 `$&`、`$1`、`` $` ``、`$'` 会被 JS 展开。
//      值里带古籍原文与用户提问，两者都是外部输入。实测：一句「…脱胎要火。$&$1」
//      渲染后正文里冒出了 `{{classicalText}}`（占位符本身）。
//   ② 逐键循环 = **多趟扫描**：头一趟塞进去的文本会被后一趟再扫一遍。用户提问里写
//      `{{vars}}` 就会让正文里凭空多插一整块 JSON（实测某例多出 1568 字）。
// 修法（`bazi_prompt.js` 那份）：**一趟扫完 + 替换值由函数给出 + 键取实际变量表**。
// 转调而不是再抄一遍，是因为抄过的两份已经漂移过一次 —— 见 `bazi_prompt.js` 的注释。
function renderPrompt(template, vars) {
  return baziPromptLib.renderPrompt(template, vars);
}

// 批量入库后台任务
async function batchIngestBooks() {
  try {
    const [rows] = await db.query("SELECT * FROM reference_books WHERE content IS NOT NULL AND content != '' AND status = 'pending' ORDER BY category, title");
    console.log(`[BatchIngest] 开始批量入库 ${rows.length} 本书...`);
    let done = 0, failed = 0;
    for (const book of rows) {
      try {
        const ragRes = await fetch(`${RAG_URL}/api/ingest`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book_name: book.title, category: book.category, content: book.content, chapter: '', metadata: {} }),
          signal: AbortSignal.timeout(30000),
        });
        const ragData = await ragRes.json();
        if (ragRes.ok && ragData.chunks_created > 0) {
          await db.query('UPDATE reference_books SET status=?, chunks_count=?, updated_at=? WHERE id=?',
            ['ingested', ragData.chunks_created, Date.now(), book.id]);
          done++;
          console.log(`[BatchIngest] ✅ (${done}/${rows.length}) ${book.title} → ${ragData.chunks_created} chunks`);
        } else {
          await db.query('UPDATE reference_books SET status=?, updated_at=? WHERE id=?', ['error', Date.now(), book.id]);
          failed++;
          console.log(`[BatchIngest] ❌ ${book.title}: ${ragData.detail || 'unknown'}`);
        }
      } catch (e) {
        await db.query('UPDATE reference_books SET status=?, updated_at=? WHERE id=?', ['error', Date.now(), book.id]).catch(() => {});
        failed++;
        console.log(`[BatchIngest] ❌ ${book.title}: ${e.message}`);
      }
    }
    console.log(`[BatchIngest] 完成！成功 ${done} 本，失败 ${failed} 本`);
  } catch (e) {
    console.error('[BatchIngest] 批量入库出错:', e);
  }
}

// Start
async function initDb() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS chat_history (
      user_id varchar(64) PRIMARY KEY,
      messages longtext NOT NULL,
      created_at bigint NOT NULL,
      updated_at bigint NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[DB] chat_history table ready');

    // 八字解析记录：**每方面一条、旧版保留**（故是 INSERT 不是 UPDATE），
    // 界面显示每个方面最新那一条，旧版本可展开。
    // `chart_id` 可空：用户从「新建命盘」页直接解读时还没有命盘 id。
    // `question` 存用户那句自由提问（「我今年适合换工作吗」），它会影响解读。
    await db.query(`CREATE TABLE IF NOT EXISTS bazi_analyses (
      id varchar(64) PRIMARY KEY,
      user_id varchar(64) NOT NULL,
      chart_id varchar(64) DEFAULT NULL,
      aspect varchar(16) NOT NULL,
      question varchar(255) NOT NULL DEFAULT '',
      analysis longtext NOT NULL,
      created_at bigint NOT NULL,
      KEY idx_user_chart_aspect (user_id, chart_id, aspect, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[DB] bazi_analyses table ready');

    // 游客用量：`anon_id` 是签名 cookie 里的那串随机 id（游客限一次），
    // `ip` 那两列供「同 IP 一天总上限」用。**它是一道产品闸门，不是安全边界** ——
    // 清 cookie 就能再来一次；挡住批量的是日上限那一半。见 `anonReadCookie`。
    await db.query(`CREATE TABLE IF NOT EXISTS anon_usage (
      anon_id varchar(64) NOT NULL DEFAULT '',
      kind varchar(16) NOT NULL,
      ip varchar(64) NOT NULL DEFAULT '',
      used_at bigint NOT NULL,
      KEY idx_anon (anon_id, kind),
      KEY idx_ip (ip, kind, used_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('[DB] anon_usage table ready');
  } catch (e) {
    console.error('[DB] init error:', e.message);
  }
}
initDb();

http.createServer(handle).listen(PORT, '0.0.0.0', () => {
  console.log(`Auth server v2 running on http://127.0.0.1:${PORT}`);
});

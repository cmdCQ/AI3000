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

const DEFAULT_PROMPTS = {
  mhys_system: '你是梅花易数解卦师。回答顺序固定为：参考古籍→回答答案→你的现状→解卦逻辑。先给结果，再讲现状，最后解释依据。回答清晰、理性、简洁，避免绝对化断语，多用"可能""倾向"。',
  mhys_prompt: '以下是一组梅花易数排盘数据。\n\n【求测事项】{{topic}}\n\n【卦象】\n本卦：{{benGuaUpper}}上{{benGuaLower}}下 → {{benGuaName}}\n互卦：{{huGuaUpper}}上{{huGuaLower}}下 → {{huGuaName}}\n变卦：{{bianGuaUpper}}上{{bianGuaLower}}下 → {{bianGuaName}}\n错卦：{{cuoGuaUpper}}上{{cuoGuaLower}}下 → {{cuoGuaName}}\n综卦：{{zongGuaUpper}}上{{zongGuaLower}}下 → {{zongGuaName}}\n\n【体用】体卦：{{tiName}}（{{tiElement}}）｜用卦：{{yongName}}（{{yongElement}}）\n生克：{{tiyongVerdict}} — {{tiyongDesc}}\n动爻：{{movingYao}}\n\n请按三段回复，每段以"---"分隔：\n\n【一、回答】大白话直接说结论（吉/凶/平/转机），结合变卦判断走向。不含卦象推导术语。\n\n【二、现状】用本卦说当前状况，用互卦点隐藏变数。也说大白话，不出现卦象推导。\n\n【三、解卦思路】推演：本卦定大局→互卦析过程→变卦断结局，错综对照。说明体用生克影响。可含卦象术语。末尾提醒卦象非绝对。\n\n避免绝对化断语（"必死""大吉"等），多用"可能""倾向"。语气干脆老练。用**加粗**标结论重点（会显示金色），###子标题适度。\n\n{{ragContext}}\n\n【四、补充】末尾引导用户补充背景："如有更多具体情况可补充，方便做更细致解读"——语气自然，单独一段。',
  mhys_notopic: '你是一位梅花易数解卦师。用户还没说问什么事，请用一句话简短询问。',
  mhys_followup: '针对「{{topic}}」的追问：\n\n【之前解读】{{context}}\n\n【追问】{{followUp}}\n\n请直接回答追问，不重复完整分析。结构：\n【一、回答】——结论和建议，不用卦象术语。\n【二、思路】（可选）——一两句推演依据。',
  liuyao_system: '你是六爻纳甲解卦师。断卦必须严格遵循七层标准流程：①定用神（据事项性别取六亲）→②看世应（世为己应为人，分人我吉凶）→③察日月（日主月提定旺衰，爻不敌日月）→④辨动爻（动为变化之机，独发力量最大）→⑤析生克（元神生用则吉，忌神克用则凶，贪生贪合可忘克）→⑥审空亡月破（辨真空假空，空忌吉空用凶）→⑦推应期（出空填实、冲墓冲合、生旺墓绝）。输出分三块：结论（直说吉凶，人话）→现状（世应六神说当下）→推演（七层逐步展开，引具体爻位六亲六神，含应期判断）。避免绝对断语，多用可能/倾向。用**加粗**标重点。',
  liuyao_prompt: '以下是一组六爻排盘数据。请严格按照六爻断卦标准流程逐层分析。\n\n【求测事项】{{topic}}\n【求测者性别】{{gender}}\n\n【卦象】\n本卦：{{benGuaUpper}}上{{benGuaLower}}下 → {{benGuaName}}\n变卦：{{bianGuaUpper}}上{{bianGuaLower}}下 → {{bianGuaName}}\n\n══════ 断卦方法论（必须逐层执行） ══════\n\n【第一层·定用神】根据求测事项和性别确定用神……（可复制现有完整模板，变量用 {{变量名}} 替换）\n\n请严格按以下结构回复，每段以"---"分隔：\n\n【一、结论】直接说吉凶结论，1-2句话。结合用神旺衰与忌神动否。大白话。\n\n【二、现状分析】描述当前状况：世应关系、六神氛围、爻位事态阶段。不出现推导。\n\n【三、解卦推演】按七层方法论逐步推演，引用具体爻位六亲六神，含应期判断。可含术语。\n\n用**加粗**标重点。避免绝对化断语。\n\n{{ragContext}}\n\n【补充引导】末尾引导用户补充背景。',
  liuyao_notopic: '你是一位六爻纳甲解卦师。用户还没说问什么事，请先回应排盘数据（本卦变卦名+世应位置），然后用一句话询问求测事项。',
  liuyao_followup: '针对「{{topic}}」的追问：\n\n【之前解读】{{context}}\n\n【追问】{{followUp}}\n\n直接回答追问，不重复完整七层分析。聚焦追问涉及的层面。结构：\n【回答】——结论和建议，不用卦象术语。\n【依据】——简短推演依据（1-3句，引用原卦爻位）。',
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

  // ===== 梅花易数 AI 解析 API（流式） =====
  // POST /api/mhys/ai-analyze — AI智能解卦（SSE流式 + RAG检索）
  if (req.method === 'POST' && pathname === '/api/mhys/ai-analyze') {
    const { topic, hexagrams, followUp, context, recordId } = body;
    if (!hexagrams) return json(res, { error: '缺少必要参数' }, 400);

    // Token 限制检查（已登录用户）
    const payload = checkAuth(req);
    const username = payload ? payload.username : null;
    if (username) {
      try {
        const [rows] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
          const tier = rows[0].tier || 0;
          const limit = getTokenLimit(tier);
          if (limit !== null && rows[0].token_used >= limit) {
            res.writeHead(200, {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
            });
            res.write('抱歉，你的AI解析次数已用完。');
            res.write('如需继续使用，请联系管理员升级账户。');
            res.end();
            return;
          }
        }
      } catch (e) { /* 数据库错误不阻塞 */ }
    }

    // RAG 检索：搜索 meihua + yijing 分类
    let ragContext = '';
    let ragSources = [];
    try {
      const searchQuery = topic || (hexagrams.benGua ? hexagrams.benGua.name + '卦' : '梅花易数解卦');
      const ragRes = await fetch(`${RAG_URL}/api/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, top_k: 15, categories: ['meihua', 'yijing'], similarity_threshold: 0.3 }),
        signal: AbortSignal.timeout(30000),
      });
      const ragData = await ragRes.json();
      if (ragData.results && ragData.results.length > 0) {
        // 去重书籍名，取不同书的前3本
        const seenBooks = new Set();
        const diverseResults = [];
        for (const r of ragData.results) {
          if (!seenBooks.has(r.book_name)) {
            seenBooks.add(r.book_name);
            diverseResults.push(r);
          }
        }
        const top3 = diverseResults.slice(0, 3);
        ragContext = top3.map((r, i) => `【古籍 ${i + 1}】《${r.book_name}》${r.chapter ? ' - ' + r.chapter : ''}\n${r.text}`).join('\n\n');
        ragSources = top3.map(r => r.book_name);
      }
    } catch (e) { console.error('RAG retrieve error:', e.message); }

    const prompt = followUp
      ? (topic ? buildFollowUpPrompt(topic, followUp, context, hexagrams) : buildMhysPrompt(followUp, hexagrams))
      : buildMhysPrompt(topic, hexagrams, ragContext);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Rag-Sources': ragSources.length > 0 ? encodeURIComponent(ragSources.join('|')) : '',
    });

    try {
      // 先估算输入 token
      const inputTokens = estimateTokens(prompt);
      const outputText = await streamDeepSeek(prompt, res, username ? 0 : 1200, req);
      // 流完成后计数 token 并更新（即使用户已断开也继续执行）
      if (outputText && username) {
        const outputTokens = estimateTokens(outputText);
        const totalTokens = inputTokens + outputTokens;
        try {
          await db.query('UPDATE users SET token_used = token_used + ? WHERE username = ?', [totalTokens, username]);
          const [updated] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
          if (updated.length > 0) {
            var used = updated[0].token_used;
            var limit = getTokenLimit(updated[0].tier || 0);
            var remainText = limit === null ? '无限' : (limit - used).toLocaleString();
            res.write('\n\n---\n消耗 Token：输入 ' + inputTokens + ' + 输出 ' + outputTokens + ' = ' + totalTokens + ' ｜ 剩余：' + remainText);
          }
        } catch (e) { /* 静默失败 */ }
      }

      // 后台自动保存到排盘记录（即使用户已断开页面）
      if (outputText && recordId) {
        let analysisText = outputText;
        const tokenIdx = analysisText.lastIndexOf('\n消耗 Token：');
        if (tokenIdx > 0) analysisText = analysisText.substring(0, tokenIdx).trim();
        try {
          await db.query('UPDATE mhys_records SET ai_analysis = ? WHERE id = ?', [analysisText, recordId]);
        } catch (e) { console.error('Mhys auto-save error:', e); }
      }
      res.end();
    } catch (e) {
      console.error('Mhys AI stream error:', e.message);
      if (!res.writableEnded) {
        try { res.write('data: [ERROR] 解卦中断，请稍后重试\n\n'); } catch {}
        try { res.end(); } catch {}
      }
    }
    return;
  }

  // POST /api/liuyao/ai-analyze — 六爻AI智能解卦（SSE流式 + RAG检索）
  if (req.method === 'POST' && pathname === '/api/liuyao/ai-analyze') {
    const { topic, hexagrams, followUp, context, recordId, lunarInfo } = body;
    if (!hexagrams) return json(res, { error: '缺少必要参数' }, 400);

    const payload = checkAuth(req);
    const username = payload ? payload.username : null;
    if (username) {
      try {
        const [rows] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
        if (rows.length > 0) {
          const tier = rows[0].tier || 0;
          const limit = getTokenLimit(tier);
          if (limit !== null && rows[0].token_used >= limit) {
            res.writeHead(200, {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
            });
            res.write('抱歉，你的AI解析次数已用完。');
            res.write('如需继续使用，请联系管理员升级账户。');
            res.end();
            return;
          }
        }
      } catch (e) { /* 静默 */ }
    }

    // RAG 检索：使用 liuyao + yijing 分类，多维度检索
    let ragContext = '';
    let ragSources = [];
    try {
      const benGuaName = hexagrams.benGua ? hexagrams.benGua.name : '';
      // 构建结构化检索查询：融合卦名+事项+断卦方法论关键要素
      const searchQueries = [
        topic ? (topic + ' ' + benGuaName) : (benGuaName || '六爻解卦'),
        benGuaName + ' 用神 世应 动爻 六亲',
        benGuaName + ' 空亡 月破 应期 生克',
      ];
      const allResults = [];
      for (const q of searchQueries.slice(0, 2)) {  // 取前2个查询，避免太多
        const ragRes = await fetch(`${RAG_URL}/api/retrieve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, top_k: 3, categories: ['liuyao', 'yijing'], similarity_threshold: 0.3 }),
          signal: AbortSignal.timeout(30000),
        });
        const ragData = await ragRes.json();
        if (ragData.results) allResults.push(...ragData.results);
      }
      // 去重并按分数排序
      const seen = new Set();
      const unique = [];
      allResults.sort((a, b) => b.score - a.score);
      for (const r of allResults) {
        const key = r.text.slice(0, 60);
        if (!seen.has(key)) { seen.add(key); unique.push(r); }
      }
      const topResults = unique.slice(0, 3);
      if (topResults.length > 0) {
        ragContext = topResults.map((r, i) => `【古籍 ${i + 1}】《${r.book_name}》${r.chapter ? ' - ' + r.chapter : ''}
${r.text}`).join('\n\n');
        const seenBooks = new Set();
        ragSources = topResults.filter(r => { const k = r.book_name; return seenBooks.has(k) ? false : seenBooks.add(k); }).map(r => r.book_name);
      }
    } catch (e) { console.error('Liuyao RAG error:', e.message); }

    const prompt = followUp
      ? (topic ? buildLiuyaoFollowUpPrompt(topic, followUp, context, hexagrams, lunarInfo) : buildLiuyaoPrompt(followUp, hexagrams, '', lunarInfo))
      : buildLiuyaoPrompt(topic, hexagrams, ragContext, lunarInfo);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Rag-Sources': ragSources.length > 0 ? encodeURIComponent(ragSources.join('|')) : '',
    });

    try {
      // 先估算输入 token
      const inputTokens = estimateTokens(prompt);
      const outputText = await streamDeepSeekLiuyao(prompt, res, username ? 0 : 1200, req);
      // 流完成后计数 token 并更新（即使用户已断开也继续执行）
      if (outputText && username) {
        const outputTokens = estimateTokens(outputText);
        const totalTokens = inputTokens + outputTokens;
        try {
          await db.query('UPDATE users SET token_used = token_used + ? WHERE username = ?', [totalTokens, username]);
          const [updated] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
          if (updated.length > 0) {
            var used = updated[0].token_used;
            var limit = getTokenLimit(updated[0].tier || 0);
            var remainText = limit === null ? '无限' : (limit - used).toLocaleString();
            res.write('\n\n---\n消耗 Token：输入 ' + inputTokens + ' + 输出 ' + outputTokens + ' = ' + totalTokens + ' ｜ 剩余：' + remainText);
          }
        } catch (e) { /* 静默 */ }
      }

      // 后台自动保存到排盘记录（即使用户已断开页面）
      if (outputText && recordId) {
        let analysisText = outputText;
        const tokenIdx = analysisText.lastIndexOf('\n消耗 Token：');
        if (tokenIdx > 0) analysisText = analysisText.substring(0, tokenIdx).trim();
        try {
          await db.query('UPDATE liuyao_records SET ai_analysis = ? WHERE id = ?', [analysisText, recordId]);
        } catch (e) { console.error('Liuyao auto-save error:', e); }
      }
      res.end();
    } catch (e) {
      console.error('Liuyao AI stream error:', e.message);
      if (!res.writableEnded) {
        try { res.write('data: [ERROR] 解卦中断，请稍后重试\n\n'); } catch {}
        try { res.end(); } catch {}
      }
    }
    return;
  }

  // ===== 用户 Token 用量 API =====
  // GET /api/user/tokens — 获取当前用户的 token 用量
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
    writePrompts(custom);
    return json(res, { ok: true, key: key });
  }

  // DELETE /api/admin/prompts/:key — 重置为默认
  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/prompts/') && pathname.split('/').length === 5) {
    const payload = checkAuth(req);
    if (!payload || payload.role !== 'admin') return json(res, { error: '未授权' }, 401);
    const key = pathname.split('/').pop();
    var custom = readPrompts();
    delete custom[key];
    writePrompts(custom);
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
      // 估算输入 token
      const inputTokens = estimateTokens(systemPrompt + '\n' + prompt);
      
      // 流式输出
      const OpenAI = require('openai');
      const client = new OpenAI({
        apiKey: config.deepseek.apiKey,
        baseURL: config.deepseek.baseURL,
      });

      const controller = new AbortController();
      const stream = await client.chat.completions.create({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        stream: true,
        max_tokens: 3000,
        temperature: 0.7,
      }, { signal: controller.signal });

      let fullText = '';
      let stopped = false;
      try {
        for await (const chunk of stream) {
          if (stopped) continue;
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            try { res.write(content); } catch(e) { stopped = true; }
          }
        }
      } catch(e) { /* 流中断 */ }

      // 流完成后计算 token
      if (fullText && username) {
        const outputTokens = estimateTokens(fullText);
        const totalTokens = inputTokens + outputTokens;
        try {
          // 更新用户 token 用量
          await db.query('UPDATE users SET token_used = token_used + ? WHERE username = ?', [totalTokens, username]);
          const [updated] = await db.query('SELECT token_used, tier FROM users WHERE username = ?', [username]);
          if (updated.length > 0) {
            const used = updated[0].token_used;
            const limit = getTokenLimit(updated[0].tier || 0);
            const remainText = limit === null ? '无限' : (limit - used).toLocaleString();
            const tokenLine = '\n\n---\n消耗 Token：输入 ' + inputTokens + ' + 输出 ' + outputTokens + ' = ' + totalTokens + ' ｜ 剩余：' + remainText;
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
          const tokenIdx = aiContent.lastIndexOf('\n消耗 Token：');
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

function buildDivinationChatPrompt(cardType, cardData, message) {
  const prompts = readPrompts();
  const topic = (cardData && cardData.topic) || message || '';
  const ragContext = (cardData && cardData.ragContext) || '';
  const followUp = (cardData && cardData.followUp) || '';
  const followUpContext = (cardData && cardData.context) || '';
  let systemPrompt = '你是一位精通中国传统命理学的AI助手，擅长梅花易数、六爻纳甲、八字命理等术数。回答风格清晰、理性、有启发性，避免绝对化断语，多用"可能""倾向"。能用**加粗**标出重点。\n\n【起卦规则】当用户询问命理问题（如感情、事业、财运、健康、出行等）但未提供数字时，请先自然询问对方三个任意数字（1-9），用于梅花易数起卦。示例回复："好的，那我先起一卦看看吧～请随意想三个数字（1-9）告诉我。"当用户给出三个数字后，系统会自动计算卦象并调用你进行解卦分析，届时你将收到完整的卦象数据。如果用户已经提供了三个数字，则直接等待系统起卦后为你提供卦象数据进行分析。';
  let userPrompt = '';

  if (cardType === 'mhys' && cardData) {
    systemPrompt = prompts.mhys_system || systemPrompt;
    if (followUp) {
      userPrompt = buildFollowUpPrompt(topic || '此卦', followUp, followUpContext, cardData.hexagrams);
    } else {
      userPrompt = buildMhysPrompt(topic, cardData.hexagrams, ragContext);
      if (message && message !== topic && !message.startsWith('帮我解析')) {
        userPrompt += '\n\n用户补充提问：' + message;
      }
    }
  } else if (cardType === 'liuyao' && cardData) {
    systemPrompt = prompts.liuyao_system || systemPrompt;
    if (followUp) {
      userPrompt = buildLiuyaoFollowUpPrompt(topic || '此卦', followUp, followUpContext, cardData.hexagrams, cardData.lunarInfo);
    } else {
      userPrompt = buildLiuyaoPrompt(topic, cardData.hexagrams, ragContext, cardData.lunarInfo);
      if (message && message !== topic && !message.startsWith('帮我解析')) {
        userPrompt += '\n\n用户补充提问：' + message;
      }
    }
  }

  return { systemPrompt, userPrompt };
}

// ===== 梅花易数 AI 解析（流式） =====

function buildMhysPrompt(topic, hexagrams, ragContext) {
  var custom = readPrompts();

  if (!topic) {
    var noTopicTpl = custom.mhys_notopic;
    if (noTopicTpl) return renderPrompt(noTopicTpl, mhysTemplateVars('', hexagrams));
    return '你是一位梅花易数解卦师。用户还没说问什么事，请用一句话简短询问。';
  }

  var vars = mhysTemplateVars(topic, hexagrams);
  vars.ragContext = ragContext || '';

  var tpl = custom.mhys_prompt;
  if (tpl) return renderPrompt(tpl, vars);

  // ↓↓↓ 默认模板 ↓↓↓
  const bg = hexagrams.benGua, hg = hexagrams.huGua, bng = hexagrams.bianGua;
  const cg = hexagrams.cuoGua, zg = hexagrams.zongGua;
  const ti = hexagrams.ti, yong = hexagrams.yong;

  let p = `以下是一组梅花易数排盘数据。

【求测事项】${topic}

【卦象】
本卦：${bg.upperTri.name}上${bg.lowerTri.name}下 → ${bg.name}
互卦：${hg.upperTri.name}上${hg.lowerTri.name}下 → ${hg.name}
变卦：${bng.upperTri.name}上${bng.lowerTri.name}下 → ${bng.name}
错卦：${cg.upperTri.name}上${cg.lowerTri.name}下 → ${cg.name}
综卦：${zg.upperTri.name}上${zg.lowerTri.name}下 → ${zg.name}

【体用】体卦：${ti.tri.name}（${ti.tri.element}）｜用卦：${yong.tri.name}（${yong.tri.element}）
生克：${hexagrams.verdict.text} — ${hexagrams.verdict.desc}
体用吉凶分级（已按《梅花易数·体用总诀》定妥，请以此为准，勿另立吉凶）：${hexagrams.verdict.level || '（未分级）'}
`;

  if (bg.movingYao && bg.movingYao.length) {
    p += `动爻：本卦第${bg.movingYao.join('、')}爻动
`;
  }

  p += `
你是精通《梅花易数》《皇极经世心易发微》的解卦者。按传统梅花断法分析，重体用，参互卦、变卦，不可机械地只凭生克直接定死吉凶，需结合卦象本义、事项类型与整体趋势综合判断。

请严格按以下顺序输出，每段以"---"分隔：

【参考古籍】
- 若上方确有【参考古籍】内容，请在回答最开头列出本次实际检索到的古籍名称。
- 若上方没有【参考古籍】内容（本次未检索到），**不要凭印象列书名**，这一段直接写"本次未检索到相关古籍，以下依卦理分析"即可。
- 古籍段落只放开头，不要放到末尾，也不要重复。

【一、回答答案】
- 直接回答用户最想知道的结果。
- 先说结论，不要先铺垫，不要先讲术语。
- 只说结果、走向、是否有转机，尽量白话。

【二、你的现状】
- 描述用户当前处境、状态、主要矛盾与隐藏变数。
- 以白话表达，不要堆术语。

【三、解卦逻辑】
- 再说明本卦、互卦、变卦、错卦、综卦与体用生克如何影响此事。
- 重点说明：体为主，用为应；用卦主当前，互卦主过程，变卦主后势。
- 若有阻力，也要说明是否有救、是暂阻还是终阻。

要求：
- 前两段以用户最容易看懂为先。
- 第三段再讲术数依据。
- 体用生克的吉凶分级（如"用生体 · 大吉"）是《体用总诀》的定则，照实引用即可；但不要把它推成"必然""注定"这类宿命断语，多用"可能""倾向"。
- 除上述体用分级外，避免其他绝对化断语。
- 语言简洁、明确，不空泛，不神叨。
- 用**加粗**标结论重点（会显示金色），###子标题适度。

【四、补充】末尾单独一段，自然引导：「如有更多具体情况可补充，方便做更细致解读。」`;

  return p;
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
const PROMPTS_FILE = path.join(__dirname, 'data', 'prompts.json');

function readPrompts() {
  try { return JSON.parse(fs.readFileSync(PROMPTS_FILE, 'utf-8')); }
  catch { return {}; }
}
function writePrompts(data) {
  fs.writeFileSync(PROMPTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 模板变量替换
function renderPrompt(template, vars) {
  if (!template) return null;
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), String(val ?? ''));
  }
  return result;
}

// 梅花易数模板变量提取
function mhysTemplateVars(topic, hexagrams) {
  const bg = hexagrams.benGua || {}, hg = hexagrams.huGua || {}, bng = hexagrams.bianGua || {};
  const cg = hexagrams.cuoGua || {}, zg = hexagrams.zongGua || {};
  const ti = hexagrams.ti || {}, yong = hexagrams.yong || {};
  const v = hexagrams.verdict || {};
  const movingYao = bg.movingYao && bg.movingYao.length ? '第' + bg.movingYao.join('、') + '爻动' : '无动爻';
  return {
    topic: topic || '',
    benGuaName: bg.name || '', benGuaUpper: (bg.upperTri || {}).name || '', benGuaLower: (bg.lowerTri || {}).name || '',
    huGuaName: hg.name || '', huGuaUpper: (hg.upperTri || {}).name || '', huGuaLower: (hg.lowerTri || {}).name || '',
    bianGuaName: bng.name || '', bianGuaUpper: (bng.upperTri || {}).name || '', bianGuaLower: (bng.lowerTri || {}).name || '',
    cuoGuaName: cg.name || '', cuoGuaUpper: (cg.upperTri || {}).name || '', cuoGuaLower: (cg.lowerTri || {}).name || '',
    zongGuaName: zg.name || '', zongGuaUpper: (zg.upperTri || {}).name || '', zongGuaLower: (zg.lowerTri || {}).name || '',
    tiName: (ti.tri || {}).name || '', tiElement: (ti.tri || {}).element || '',
    yongName: (yong.tri || {}).name || '', yongElement: (yong.tri || {}).element || '',
    tiyongVerdict: v.text || '', tiyongDesc: v.desc || '', tiyongLevel: v.level || '',
    movingYao: movingYao,
    ragContext: '',
  };
}

// 六爻装卦：由「本卦/变卦上下卦号 + 四柱」装出完整盘面。
// 前端只负责起卦（给出卦号与四柱），六亲/六神/世应/旬空/旺衰/伏神一律后端算，
// 避免前端算错或送错字段。
function buildLiuyaoChart(hexagrams, lunarInfo, topic) {
  if (!hexagrams) return null;
  const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
  if (!bg.upper || !bg.lower) return null;
  const li = lunarInfo || {};
  const chart = liuyaoPaipan.buildChart({
    topic: topic || '',
    gender: hexagrams.gender || '',
    benUpper: bg.upper, benLower: bg.lower,
    bianUpper: bng.upper, bianLower: bng.lower,
    yearGZ: li.yearGZ || '', monthGZ: li.monthGZ || '',
    dayGZ: li.dayGZ || '', hourGZ: li.hourGZ || '',
  });
  if (chart) chart.yongShen = liuyaoPaipan.suggestYongShen(topic, hexagrams.gender || '');
  return chart;
}

// 六爻模板变量提取
function liuyaoTemplateVars(topic, hexagrams, lunarInfo) {
  const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';
  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);
  return {
    topic: topic || '',
    gender: genderLabel,
    benGuaName: bg.name || '', benGuaUpper: (bg.upperTri || {}).name || '', benGuaLower: (bg.lowerTri || {}).name || '',
    bianGuaName: bng.name || '', bianGuaUpper: (bng.upperTri || {}).name || '', bianGuaLower: (bng.lowerTri || {}).name || '',
    paipan: chart ? liuyaoPaipan.formatChart(chart) : '',
    yongshen: (chart && chart.yongShen && chart.yongShen.yong) ? chart.yongShen.yong : '',
    yongshenWhy: (chart && chart.yongShen) ? (chart.yongShen.why || '') : '',
    ragContext: '',
  };
}

function buildFollowUpPrompt(topic, followUp, context, hexagrams) {
  var custom = readPrompts();
  var tpl = custom.mhys_followup;
  if (tpl) {
    var vars = mhysTemplateVars(topic, hexagrams);
    vars.followUp = followUp || '';
    vars.context = (context || '').slice(-1200);
    return renderPrompt(tpl, vars);
  }
  let p = `针对「${topic}」的追问：

【之前解读】${(context || '').slice(-1000)}

【追问】${followUp}

请直接回答追问，不重复完整分析。结构：
【一、回答】——结论和建议，不用卦象术语。
【二、思路】（可选）——一两句推演依据。`;
  return p;
}

async function streamDeepSeek(prompt, res, maxOutputChars, req) {
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.baseURL,
  });

  var custom = readPrompts();
  var systemPrompt = custom.mhys_system || '你是梅花易数解卦师。回答顺序固定为：参考古籍→回答答案→你的现状→解卦逻辑。先给结果，再讲现状，最后解释依据。回答清晰、理性、简洁。体用生克的吉凶分级是《体用总诀》的定则，照实引用；除此之外避免绝对化断语，多用”可能””倾向”。';

  var controller = new AbortController();
  if (req) req.on('close', () => { if (!res.writableEnded) controller.abort(); });
  const stream = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: maxOutputChars ? Math.ceil(maxOutputChars / 0.6) : 3000,
    temperature: 0.7,
  }, { signal: controller.signal });

  let fullText = '';
  let stopped = false;
  try {
    for await (const chunk of stream) {
      if (stopped) continue;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        if (maxOutputChars && fullText.length >= maxOutputChars) {
          stopped = true;
          var loginPrompt = '\n\n---\n\n> ⚠️ 未登录用户仅限预览，完整解析需登录。\n> 🔑 [登录](/login/)即可解锁完整AI解析（最少100次/10万token免费额度）';
          fullText += loginPrompt;
          try { res.write(loginPrompt); } catch(e) {}
          controller.abort();
        } else {
          try { res.write(content); } catch(e) {}
        }
      }
    }
  } catch(e) { /* AbortError expected */ }
  return fullText;
}

function buildLiuyaoPrompt(topic, hexagrams, ragContext, lunarInfo) {
  var custom = readPrompts();

  if (!topic) {
    var noTopicTpl = custom.liuyao_notopic;
    if (noTopicTpl) return renderPrompt(noTopicTpl, liuyaoTemplateVars('', hexagrams, lunarInfo));
    return '你是一位六爻纳甲解卦师。用户还没说问什么事，请先回应排盘数据（本卦变卦名+世应位置），然后用一句话询问求测事项。';
  }

  var vars = liuyaoTemplateVars(topic, hexagrams, lunarInfo);
  vars.ragContext = ragContext || '';

  var tpl = custom.liuyao_prompt;
  if (tpl) return renderPrompt(tpl, vars);

  // ↓↓↓ 默认模板 ↓↓↓
  var gender = hexagrams.gender;
  var genderLabel = '未知';
  if (gender === 'male') genderLabel = '男';
  else if (gender === 'female') genderLabel = '女';

  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);

  let p = '以下是一组六爻排盘数据。请按传统六爻断法分析，不可脱离用神主线泛讲六亲六神。\n\n';
  p += '【求测事项】' + topic + '\n';
  p += '【求测者性别】' + genderLabel + '\n\n';

  if (chart) {
    p += liuyaoPaipan.formatChart(chart) + '\n\n';
    if (chart.yongShen && chart.yongShen.yong) {
      p += '【用神参考】' + chart.yongShen.why + '（即' + chart.yongShen.yong + '）。若与卦中实际衰旺、动静冲突，以卦理为准，不必强套。\n\n';
    }
  } else {
    // 装卦失败时的兜底：至少别让 AI 收到空数据
    const bg = hexagrams.benGua || {}, bng = hexagrams.bianGua || {};
    p += '【卦象】\n';
    p += '本卦：' + (bg.name || '未知') + '　变卦：' + (bng.name || '未知') + '\n';
    p += '（注意：本次排盘数据不完整，六亲六神世应未能装出，请在解读中说明并只作卦名卦意的粗断。）\n\n';
  }

  p += '断法要求：先定用神，再看月建日辰旺衰，再看世应、动爻、变爻、生克冲合、空破墓绝。月建为提纲，日辰为主宰；世为己，应为人；动为始，变为终。六神只作辅助，不可压过用神主线。\n\n';

  p += '请严格按以下顺序输出，每段以"---"分隔：\n\n';
  p += '【参考古籍】\n';
  p += '- 若上方确有【参考古籍】内容，请在回答最开头列出本次实际检索到的古籍名称。\n';
  p += '- 若上方没有【参考古籍】内容（本次未检索到），**不要凭印象列书名**，开头【参考古籍】一段直接写"本次未检索到相关古籍，以下依卦理分析"即可。\n';
  p += '- 古籍段落只放开头，不要放到末尾，也不要重复。\n\n';
  p += '【一、回答答案】\n';
  p += '- 直接说结果、倾向、成败、快慢。\n';
  p += '- 不要先讲原理，不要先铺垫。\n';
  p += '- 先把用户最想知道的答案说明白。\n\n';
  p += '【二、你的现状】\n';
  p += '- 只描述当前处境、矛盾、卡点、对方状态或环境态势。\n';
  p += '- 尽量白话，不堆术语。\n\n';
  p += '【三、解卦逻辑】\n';
  p += '- 再说明用神、世应、月建、日辰、动爻、变爻对结果的影响。\n';
  p += '- 若见空亡、月破、入墓、伏神、合绊、回头生、回头克，只分析与主事相关者。\n';
  p += '- 若卦象显示可成但迟、能成但反复、表面可成实则落空，必须明确说出。\n\n';
  p += '要求：\n';
  p += '- 前两段先给用户想看的内容，第三段再展开术数依据。\n';
  p += '- 语言简洁，判断明确，不空泛。\n';
  p += '- 避免绝对化断语，多用“可能”“倾向”。\n';
  p += '- 用**加粗**标结论重点，###子标题适度。\n\n';
  p += '【补充引导】末尾单独一段，自然引导："如有更多具体情况可补充，方便做更细致解读。"';
  return p;
}

function buildLiuyaoFollowUpPrompt(topic, followUp, context, hexagrams, lunarInfo) {
  var custom = readPrompts();
  var tpl = custom.liuyao_followup;
  if (tpl) {
    var vars = liuyaoTemplateVars(topic, hexagrams, lunarInfo);
    vars.followUp = followUp || '';
    vars.context = (context || '').slice(-1200);
    return renderPrompt(tpl, vars);
  }
  var p = '针对「' + topic + '」的追问：\n\n';
  var chart = buildLiuyaoChart(hexagrams, lunarInfo, topic);
  if (chart) p += liuyaoPaipan.formatChart(chart) + '\n\n';
  p += '【之前解读】' + ((context || '').slice(-1200)) + '\n\n';
  p += '【追问】' + followUp + '\n\n';
  p += '直接回答追问，不重复完整七层分析。聚焦追问涉及的层面（如问应期则重点推应期，问空亡则重点辨空亡真假）。结构：\n【回答】——结论和建议，不用卦象术语。\n【依据】——简短推演依据（1-3句，引用原卦爻位）。';
  return p;
}

async function streamDeepSeekLiuyao(prompt, res, maxOutputChars, req) {
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.baseURL,
  });

  var custom = readPrompts();
  var systemPrompt = custom.liuyao_system || '你是六爻纳甲解卦师。回答顺序固定为：参考古籍→回答答案→你的现状→解卦逻辑。先定用神，再看月建日辰、世应、动变、生克冲合与空破墓绝。先给结果，再讲现状，最后解释依据。六神只作辅助，不可压过用神主线。避免绝对断语，多用可能/倾向。用**加粗**标重点。';

  var controller = new AbortController();
  if (req) req.on('close', () => { if (!res.writableEnded) controller.abort(); });
  const stream = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    stream: true,
    max_tokens: maxOutputChars ? Math.ceil(maxOutputChars / 0.6) : 3000,
  }, { signal: controller.signal });

  let fullText = '';
  let stopped = false;
  try {
    for await (const chunk of stream) {
      if (stopped) continue;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        if (maxOutputChars && fullText.length >= maxOutputChars) {
          stopped = true;
          var loginPrompt = '\n\n---\n\n> ⚠️ 未登录用户仅限预览，完整解析需登录。\n> 🔑 [登录](/login/)即可解锁完整AI解析（最少100次/10万token免费额度）';
          fullText += loginPrompt;
          try { res.write(loginPrompt); } catch(e) {}
          controller.abort();
        } else {
          try { res.write(content); } catch(e) {}
        }
      }
    }
  } catch(e) { /* AbortError expected */ }
  return fullText;
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
  } catch (e) {
    console.error('[DB] init error:', e.message);
  }
}
initDb();

http.createServer(handle).listen(PORT, '0.0.0.0', () => {
  console.log(`Auth server v2 running on http://127.0.0.1:${PORT}`);
});

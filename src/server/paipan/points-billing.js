'use strict';

const crypto = require('node:crypto');
// 1 积分 = 多少 token。2026-10-20 用户定 5000（原 10000），并改成后台可配置
// （`app_settings` 表里一行，`auth-server.js` 启动时读、管理员保存后立即生效）。
// 只影响**换算显示**：账本里存的始终是 token，历史记录不写比例快照，所以改比例后
// 旧账按新比例折算是**预期行为**（用户 2026-10-20 明确选「全局按比例折算」）。
let TOKENS_PER_POINT = 5000;
const TOKENS_PER_POINT_MIN = 1;
const TOKENS_PER_POINT_MAX = 1000000;
function setTokensPerPoint(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < TOKENS_PER_POINT_MIN || number > TOKENS_PER_POINT_MAX) {
    throw problem(400, `每积分 token 数必须是 ${TOKENS_PER_POINT_MIN}–${TOKENS_PER_POINT_MAX} 的整数`, 'INVALID_TOKENS_PER_POINT');
  }
  TOKENS_PER_POINT = number;
  return TOKENS_PER_POINT;
}
const TIME_ZONE = 'Asia/Shanghai';
// Existing dated usage rows are retained; allowances are evaluated over the current week.
const WEEKLY_TOKENS = Object.freeze({ 0: 100000, 1: 500000, 2: null });
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
function billingDateAt(now = Date.now()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function weekStartAt(now = Date.now()) {
  const date = billingDateAt(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short' }).format(new Date(now));
  const offset = ({ Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 })[weekday];
  return billingDateAt(Date.parse(date + 'T00:00:00+08:00') - offset * 86400000);
}
function resetAtForWeek(start) { return new Date(Date.parse(start + 'T00:00:00+08:00') + 7 * 86400000).toISOString(); }
function problem(status, message, code) { return Object.assign(new Error(message), { status, code }); }
function dateValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || !Number.isFinite(Date.parse(value + 'T00:00:00+08:00'))
      || billingDateAt(Date.parse(value + 'T00:00:00+08:00')) !== value) {
    throw problem(400, '无效计费日期', 'INVALID_BILLING_DATE');
  }
  return value;
}
function integer(value, label) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) throw problem(503, `${label}不是有效整数`, 'INVALID_USAGE');
  return number;
}
function points(tokens) { return Number((tokens / TOKENS_PER_POINT).toFixed(4)); }
function lockName(username) {
  return 'points:' + crypto.createHash('sha256').update(username).digest('hex').slice(0, 55);
}
function userValue(username) {
  if (typeof username !== 'string' || !username || username.length > 64) throw problem(401, '请重新登录', 'INVALID_USER');
  return username;
}
function requestValue(requestId) {
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(requestId)) {
    throw problem(400, '无效计费请求标识', 'INVALID_REQUEST_ID');
  }
  return requestId;
}
function quotaOf(user, used, date, permanent = 0) {
  const tier = integer(user.tier, '等级');
  if (!Object.hasOwn(WEEKLY_TOKENS, tier)) throw problem(503, '账户等级无效', 'INVALID_TIER');
  const tokensUsed = integer(used, '本周用量');
  const totalTokensUsed = integer(user.token_used, '累计用量');
  const tokensLimit = WEEKLY_TOKENS[tier];
  const weeklyRemaining = tokensLimit === null ? null : Math.max(0, tokensLimit - tokensUsed);
  const permanentTokens = integer(permanent, '永久积分');
  const availableTokens = weeklyRemaining === null ? null : weeklyRemaining + permanentTokens;
  return { username: user.username, tier, billingDate: date, weekStart: weekStartAt(Date.parse(date + 'T00:00:00+08:00')),
    resetAt: resetAtForWeek(weekStartAt(Date.parse(date + 'T00:00:00+08:00'))),
    pointsUsed: points(tokensUsed), pointsLimit: tokensLimit === null ? null : points(tokensLimit),
    pointsRemaining: weeklyRemaining === null ? null : points(weeklyRemaining),
    weeklyUsed: points(tokensUsed), weeklyLimit: tokensLimit === null ? null : points(tokensLimit),
    weeklyRemaining: weeklyRemaining === null ? null : points(weeklyRemaining), weeklyTokensRemaining: weeklyRemaining,
    permanentTokens, permanentPoints: points(permanentTokens), totalAvailablePoints: availableTokens === null ? null : points(availableTokens),
    totalPointsUsed: points(totalTokensUsed), tokensUsed, tokensLimit, tokensRemaining: availableTokens, totalTokensUsed };
}

function createPointsBilling(db) {
  async function initSchema() {
    // No existing business/history tables are changed or cleared here.
    await db.query(`CREATE TABLE IF NOT EXISTS points_daily (
      username varchar(64) NOT NULL, billing_date char(10) NOT NULL,
      used_tokens bigint NOT NULL DEFAULT 0, updated_at bigint NOT NULL,
      PRIMARY KEY (username, billing_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
    await db.query(`CREATE TABLE IF NOT EXISTS points_usage (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username varchar(64) NOT NULL, request_id varchar(128) NOT NULL,
      kind varchar(16) NOT NULL, billing_date char(10) NOT NULL,
      input_tokens bigint NOT NULL DEFAULT 0, output_tokens bigint NOT NULL DEFAULT 0,
      total_tokens bigint NOT NULL, created_at bigint NOT NULL,
      UNIQUE KEY idx_points_request (username, request_id),
      KEY idx_points_date (billing_date, username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
    // 等级变更台账：谁在什么时候把谁从哪级改到哪级、为什么。
    // 放这里是因为它与 `points_permanent_ledger` 同属「管理员对用户做过什么」的审计数据，
    // 而 initSchema 已经在服务启动时被 await 过（`pointsReady()`）。
    await db.query(`CREATE TABLE IF NOT EXISTS user_tier_ledger (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username varchar(64) NOT NULL,
      old_tier tinyint NOT NULL,
      new_tier tinyint NOT NULL,
      reason varchar(255) NOT NULL,
      admin_username varchar(64) NOT NULL,
      created_at bigint NOT NULL,
      KEY idx_tier_ledger_user (username, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
    // 通用键值设置（目前只存「每积分多少 token」，将来别的后台开关也放这里）。
    // 用独立表而不是写进代码：改比例不该再发一次版。
    await db.query(`CREATE TABLE IF NOT EXISTS app_settings (
      setting_key varchar(64) NOT NULL PRIMARY KEY,
      setting_value varchar(255) NOT NULL,
      updated_at bigint NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
    await db.query(`CREATE TABLE IF NOT EXISTS points_permanent_ledger (
      id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, username varchar(64) NOT NULL,
      request_id varchar(128) NOT NULL, kind varchar(16) NOT NULL, points_tokens bigint NOT NULL,
      reason varchar(255) NOT NULL, admin_username varchar(64) NOT NULL, created_at bigint NOT NULL,
      UNIQUE KEY idx_permanent_request (username, request_id), KEY idx_permanent_user (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin`);
  }
  async function readUser(username, connection, forUpdate = false) {
    const [users] = await connection.query('SELECT username, tier, token_used FROM users WHERE username = ?' + (forUpdate ? ' FOR UPDATE' : ''), [username]);
    if (!users.length) throw problem(401, '请重新登录', 'USER_NOT_FOUND');
    if (users.length !== 1) throw problem(503, '账户标识不唯一，请联系管理员', 'DUPLICATE_USER');
    return users[0];
  }
  async function quotaAt(username, date, connection) {
    const user = await readUser(username, connection);
    const start = weekStartAt(Date.parse(date + 'T00:00:00+08:00'));
    const [weekly] = await connection.query('SELECT COALESCE(SUM(used_tokens),0) AS used_tokens FROM points_daily WHERE username = ? AND billing_date >= ? AND billing_date < DATE_ADD(?, INTERVAL 7 DAY)', [username, start, start]);
    const [permanent] = await connection.query("SELECT COALESCE(SUM(points_tokens),0) AS points_tokens FROM points_permanent_ledger WHERE username = ?", [username]);
    return quotaOf(user, weekly[0]?.used_tokens ?? 0, date, permanent[0]?.points_tokens ?? 0);
  }
  async function getQuota(username, connection = db, date = billingDateAt()) {
    return quotaAt(userValue(username), dateValue(date), connection);
  }
  // Owns a transaction; caller-provided connections must have no active transaction.
  async function transaction(connection, operation) {
    let owned = false, active = false, destroyed = false;
    if (!connection) { connection = await db.getConnection(); owned = true; }
    try {
      await connection.beginTransaction(); active = true;
      const result = await operation(connection);
      await connection.commit(); active = false;
      return result;
    } catch (error) {
      if (active) {
        try { await connection.rollback(); }
        catch (rollbackError) { connection.destroy(); destroyed = true; throw rollbackError; }
      }
      throw error;
    } finally { if (owned && !destroyed) connection.release(); }
  }
  async function charge(username, usage, connection) {
    userValue(username);
    const inputTokens = integer(usage.inputTokens, '输入token');
    const outputTokens = integer(usage.outputTokens, '输出token');
    const totalTokens = integer(inputTokens + outputTokens, '总token');
    const requestId = requestValue(usage.requestId);
    const date = dateValue(usage.billingDate ?? billingDateAt());
    return transaction(connection, async conn => {
      // Serialize even callers without the model-generation lock. Identity duplicates fail closed.
      const user = await readUser(username, conn, true);
      const [existing] = await conn.query('SELECT * FROM points_usage WHERE username = ? AND request_id = ?', [username, requestId]);
      if (existing.length) {
        const row = existing[0];
        // Replays may arrive on a later day: return the original charge, not a new charge.
        if (row.kind !== 'charge' || integer(row.input_tokens, '输入token') !== inputTokens
            || integer(row.output_tokens, '输出token') !== outputTokens
            || (usage.billingDate != null && row.billing_date !== date)) {
          throw problem(409, '计费请求标识已用于不同用量', 'REQUEST_CONFLICT');
        }
        return { ...await quotaAt(username, billingDateAt(), conn), charged: false, replayed: true,
          chargeBillingDate: row.billing_date, inputTokens, outputTokens,
          totalTokens: integer(row.total_tokens, '总token'), pointsCharged: points(integer(row.total_tokens, '总token')) };
      }
      const [daily] = await conn.query('SELECT used_tokens FROM points_daily WHERE username = ? AND billing_date = ?', [username, date]);
      const nextUsed = integer(integer(daily[0]?.used_tokens ?? 0, '当日用量') + totalTokens, '当日用量');
      const currentQuota = await quotaAt(username, date, conn);
      const weeklyLeft = currentQuota.weeklyTokensRemaining;
      const uncovered = weeklyLeft === null ? 0 : Math.max(0, totalTokens - weeklyLeft);
      // Usage has already occurred; never discard it if the upstream exceeded estimates.
      const permanentSpend = Math.min(uncovered, currentQuota.permanentTokens);
      integer(integer(user.token_used, '累计用量') + totalTokens, '累计用量');
      // Quota admission belongs before model invocation. Never discard incurred usage here.
      const now = Date.now();
      await conn.query('INSERT INTO points_usage (username,request_id,kind,billing_date,input_tokens,output_tokens,total_tokens,created_at) VALUES (?,?,?,?,?,?,?,?)',
        [username, requestId, 'charge', date, inputTokens, outputTokens, totalTokens, now]);
      await conn.query('INSERT INTO points_daily (username,billing_date,used_tokens,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE used_tokens = VALUES(used_tokens), updated_at = VALUES(updated_at)',
        [username, date, nextUsed, now]);
      if (permanentSpend > 0) await conn.query('INSERT INTO points_permanent_ledger (username,request_id,kind,points_tokens,reason,admin_username,created_at) VALUES (?,?,?,?,?,?,?)', [username, 'spend:' + crypto.createHash('sha256').update(requestId).digest('hex'), 'spend', -permanentSpend, 'AI usage', 'system', now]);
      const [updated] = await conn.query('UPDATE users SET token_used = token_used + ? WHERE username = ?', [totalTokens, username]);
      if (updated.affectedRows !== 1) throw problem(503, '累计用量结算异常', 'SETTLEMENT_FAILED');
      return { ...await quotaAt(username, billingDateAt(), conn), charged: true, replayed: false,
        chargeBillingDate: date, inputTokens, outputTokens, totalTokens, pointsCharged: points(totalTokens) };
    });
  }
  async function withUserLock(username, callback) {
    userValue(username);
    const connection = await db.getConnection();
    const name = lockName(username);
    let acquired = false, destroyed = false;
    try {
      const [locks] = await connection.query('SELECT GET_LOCK(?, 0) AS acquired', [name]);
      if (locks[0]?.acquired == null) throw problem(503, '积分服务暂不可用', 'LOCK_UNAVAILABLE');
      if (Number(locks[0].acquired) !== 1) throw problem(409, '已有AI请求正在生成，请稍后重试', 'REQUEST_BUSY');
      acquired = true;
      const quota = await getQuota(username, connection);
      return await callback(connection, quota);
    } finally {
      if (acquired) {
        try {
          const [released] = await connection.query('SELECT RELEASE_LOCK(?) AS released', [name]);
          if (Number(released[0]?.released) !== 1) throw new Error('Points lock release failed');
        } catch (error) { connection.destroy(); destroyed = true; }
      }
      if (!destroyed) connection.release();
    }
  }
  async function grantPermanentPoints(username, grantPoints, reason, adminUsername, requestId) {
    userValue(username); userValue(adminUsername); requestValue(requestId);
    const ledgerRequestId = 'grant:' + crypto.createHash('sha256').update(requestId).digest('hex');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 255) throw problem(400, '请填写积分原因', 'INVALID_REASON');
    const text = String(grantPoints);
    if (!/^\d+(?:\.\d{1,4})?$/.test(text) || Number(text) <= 0) throw problem(400, '永久积分必须为正数', 'INVALID_POINTS');
    const [whole, fraction = ''] = text.split('.');
    // 与 `points()` 用同一个比例：改比例时这里必须跟着变，否则「加 0.5 分」会按另一个
    // 比例记进账本，账面永远对不上。`whole`/`fraction` 只用来校验格式（最多 4 位小数），
    // 换算走 Number —— 精度上限有 `Number.isSafeInteger` 兜着。
    const tokens = Math.round(Number(text) * TOKENS_PER_POINT);
    if (!Number.isSafeInteger(tokens) || tokens > Number.MAX_SAFE_INTEGER) throw problem(400, '积分超出有效范围', 'INVALID_POINTS');
    if (tokens <= 0) {
      // 比例可调（后台「系统设置」），所以最小可发放额随比例变：说清楚，别让人对着
      // 「积分超出有效范围」猜。
      throw problem(400, `至少 ${(1 / TOKENS_PER_POINT).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} 积分（折合 1 token）`, 'INVALID_POINTS');
    }
    return withUserLock(username, (conn) => transaction(conn, async connection => {
      await readUser(username, connection, true);
      const [existing] = await connection.query('SELECT * FROM points_permanent_ledger WHERE username = ? AND request_id = ?', [username, ledgerRequestId]);
      if (existing.length) {
        const row = existing[0];
        if (row.kind !== 'grant' || Number(row.points_tokens) !== tokens || row.reason !== reason.trim() || row.admin_username !== adminUsername) {
          throw problem(409, '请求标识已用于不同发放操作', 'REQUEST_CONFLICT');
        }
        return { ...await quotaAt(username, billingDateAt(), connection), granted: false, replayed: true };
      }
      await connection.query('INSERT INTO points_permanent_ledger (username,request_id,kind,points_tokens,reason,admin_username,created_at) VALUES (?,?,?,?,?,?,?)', [username, ledgerRequestId, 'grant', tokens, reason.trim(), adminUsername, Date.now()]);
      return { ...await quotaAt(username, billingDateAt(), connection), granted: true, replayed: false, pointsGranted: points(tokens) };
    }));
  }
  /** 读一个设置项；没有或读不出来时返回 `fallback`（不抛错，避免设置读失败把账务带崩）。 */
  async function getSetting(key, fallback = null) {
    const [rows] = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = ?', [key]);
    return rows.length ? rows[0].setting_value : fallback;
  }
  async function setSetting(key, value) {
    await db.query('INSERT INTO app_settings (setting_key,setting_value,updated_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)',
      [key, String(value), Date.now()]);
  }
  /** 启动时把「每积分 token 数」从库里读进内存；库里没有就写一行默认值。 */
  async function loadTokensPerPointSetting() {
    const stored = await getSetting('tokens_per_point');
    if (stored == null) {
      await setSetting('tokens_per_point', TOKENS_PER_POINT);
      return TOKENS_PER_POINT;
    }
    const number = Number(stored);
    if (!Number.isInteger(number) || number < TOKENS_PER_POINT_MIN || number > TOKENS_PER_POINT_MAX) {
      // 库里的值坏了不要沿用：退回默认值并修回库里，否则整站计价挂掉。
      console.error('[points] app_settings.tokens_per_point 非法，退回默认值', stored);
      await setSetting('tokens_per_point', TOKENS_PER_POINT);
      return TOKENS_PER_POINT;
    }
    TOKENS_PER_POINT = number;
    return TOKENS_PER_POINT;
  }

  async function getAdminUsage(scope) {
    // Aggregate real dated charges, never active users' lifetime counters or admin adjustments.
    if (scope === 'total' || scope === 'all') scope = undefined;
    if (scope !== undefined && scope !== 'web' && scope !== 'wechat') {
      throw problem(400, '无效用户来源', 'INVALID_SCOPE');
    }
    const date = billingDateAt();
    const start = billingDateAt(Date.parse(date + 'T00:00:00+08:00') - 6 * 86400000);
    const source = scope === 'web' ? " AND u.username NOT LIKE 'wx_%'" : scope === 'wechat' ? " AND u.username LIKE 'wx_%'" : '';
    const [rows] = await db.query("SELECT COALESCE(SUM(p.total_tokens),0) AS total_tokens, COALESCE(SUM(CASE WHEN p.billing_date >= ? AND p.billing_date <= ? THEN p.total_tokens ELSE 0 END),0) AS tokens_7d FROM points_usage p JOIN users u ON u.username = p.username WHERE p.kind = 'charge'" + source, [start, date]);
    const totalTokens = integer(rows[0]?.total_tokens ?? 0, '总用量');
    const tokens7d = integer(rows[0]?.tokens_7d ?? 0, '七日用量');
    return {
      totalTokens, tokens7d,
      totalPoints: points(totalTokens), points7d: points(tokens7d),
      billingDate: date, scope: scope || 'all',
    };
  }
  return {
    initSchema, getQuota, charge, grantPermanentPoints, withUserLock, getAdminUsage, lockName,
    getSetting, setSetting, loadTokensPerPointSetting,
  };
}

module.exports = {
  createPointsBilling, billingDateAt, weekStartAt, lockName, setTokensPerPoint,
  get TOKENS_PER_POINT() { return TOKENS_PER_POINT; },
  TOKENS_PER_POINT_MIN, TOKENS_PER_POINT_MAX, TIME_ZONE, WEEKLY_TOKENS,
};

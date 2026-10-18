'use strict';

const crypto = require('node:crypto');
const TOKENS_PER_POINT = 10000;
const TIME_ZONE = 'Asia/Shanghai';
const DAILY_TOKENS = Object.freeze({ 0: 100000, 1: 500000, 2: null });
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
function billingDateAt(now = Date.now()) {
  const parts = Object.fromEntries(dayFormatter.formatToParts(new Date(now)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
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
function quotaOf(user, used, date) {
  const tier = integer(user.tier, '等级');
  if (!Object.hasOwn(DAILY_TOKENS, tier)) throw problem(503, '账户等级无效', 'INVALID_TIER');
  const tokensUsed = integer(used, '当日用量');
  const totalTokensUsed = integer(user.token_used, '累计用量');
  const tokensLimit = DAILY_TOKENS[tier];
  const tokensRemaining = tokensLimit === null ? null : Math.max(0, tokensLimit - tokensUsed);
  return { username: user.username, tier, billingDate: date,
    resetAt: new Date(Date.parse(date + 'T00:00:00+08:00') + 86400000).toISOString(),
    pointsUsed: points(tokensUsed), pointsLimit: tokensLimit === null ? null : points(tokensLimit),
    pointsRemaining: tokensRemaining === null ? null : points(tokensRemaining),
    totalPointsUsed: points(totalTokensUsed), tokensUsed, tokensLimit, tokensRemaining, totalTokensUsed };
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
  }
  async function readUser(username, connection, forUpdate = false) {
    const [users] = await connection.query('SELECT username, tier, token_used FROM users WHERE username = ?' + (forUpdate ? ' FOR UPDATE' : ''), [username]);
    if (!users.length) throw problem(401, '请重新登录', 'USER_NOT_FOUND');
    if (users.length !== 1) throw problem(503, '账户标识不唯一，请联系管理员', 'DUPLICATE_USER');
    return users[0];
  }
  async function quotaAt(username, date, connection) {
    const user = await readUser(username, connection);
    const [daily] = await connection.query('SELECT used_tokens FROM points_daily WHERE username = ? AND billing_date = ?', [username, date]);
    return quotaOf(user, daily[0]?.used_tokens ?? 0, date);
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
      integer(integer(user.token_used, '累计用量') + totalTokens, '累计用量');
      // Quota admission belongs before model invocation. Never discard incurred usage here.
      const now = Date.now();
      await conn.query('INSERT INTO points_usage (username,request_id,kind,billing_date,input_tokens,output_tokens,total_tokens,created_at) VALUES (?,?,?,?,?,?,?,?)',
        [username, requestId, 'charge', date, inputTokens, outputTokens, totalTokens, now]);
      await conn.query('INSERT INTO points_daily (username,billing_date,used_tokens,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE used_tokens = VALUES(used_tokens), updated_at = VALUES(updated_at)',
        [username, date, nextUsed, now]);
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
  async function setDailyPoints(username, pointsUsed) {
    // Accept decimal syntax, not floating multiplication, so 0.0001 is exactly one token.
    const text = String(pointsUsed);
    if (!/^\d+(?:\.\d{1,4})?$/.test(text)) throw problem(400, '积分必须为非负且最多四位小数', 'INVALID_POINTS');
    const [whole, fraction = ''] = text.split('.');
    const used = Number(BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0')));
    if (!Number.isSafeInteger(used)) throw problem(400, '积分超出有效范围', 'INVALID_POINTS');
    return withUserLock(username, (conn, quota) => transaction(conn, async connection => {
      await readUser(username, connection, true);
      const [daily] = await connection.query('SELECT used_tokens FROM points_daily WHERE username = ? AND billing_date = ?', [username, quota.billingDate]);
      const delta = used - integer(daily[0]?.used_tokens ?? 0, '当日用量');
      const now = Date.now();
      await connection.query('INSERT INTO points_usage (username,request_id,kind,billing_date,input_tokens,output_tokens,total_tokens,created_at) VALUES (?,?,?,?,?,?,?,?)',
        [username, 'adjust:' + crypto.randomUUID(), 'adjustment', quota.billingDate, 0, 0, delta, now]);
      await connection.query('INSERT INTO points_daily (username,billing_date,used_tokens,updated_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE used_tokens = VALUES(used_tokens), updated_at = VALUES(updated_at)',
        [username, quota.billingDate, used, now]);
      return quotaAt(username, quota.billingDate, connection);
    }));
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
    return { totalPoints: points(integer(rows[0]?.total_tokens ?? 0, '总用量')),
      points7d: points(integer(rows[0]?.tokens_7d ?? 0, '七日用量')), billingDate: date, scope: scope || 'all' };
  }
  return { initSchema, getQuota, charge, setDailyPoints, withUserLock, getAdminUsage, lockName };
}

module.exports = { createPointsBilling, billingDateAt, lockName, TOKENS_PER_POINT, TIME_ZONE, DAILY_TOKENS };

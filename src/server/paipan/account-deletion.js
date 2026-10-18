'use strict';
const crypto = require('node:crypto');

function problem(status, message, code) { return Object.assign(new Error(message), { status, code }); }
function lockName(username) { return 'account-delete:' + crypto.createHash('sha256').update(username).digest('hex').slice(0, 55); }

/** Permanently removes an exact canonical account and its allowlisted business rows.
 * Metadata supplies existing ownership columns; unrelated tables are never deleted.
 */
const OWNED_TABLES = [
  'bazi_consultation_turns', 'bazi_consultations', 'bazi_analyses', 'chat_history',
  'mhys_records', 'liuyao_records', 'charts', 'suggestions', 'points_usage', 'points_daily', 'points_permanent_ledger',
];
function createAccountDeletion(db, options = {}) {
  const database = options.database;
  if (typeof options.lockName !== 'function') throw new Error('Account deletion requires the billing lock');
  const acquireLock = options.lockName;
  return async function deleteAccount(username, { password, requirePassword = false } = {}) {
    if (typeof username !== 'string' || !username || username.length > 64) throw problem(400, '账号标识无效', 'INVALID_USER');
    const connection = await db.getConnection();
    let locked = false, destroyed = false;
    try {
      const lock = acquireLock(username);
      const [locks] = await connection.query('SELECT GET_LOCK(?, 0) AS acquired', [lock]);
      if (Number(locks[0]?.acquired) !== 1) throw problem(409, '账号正在处理，请稍后重试', 'ACCOUNT_BUSY');
      locked = true;
      await connection.beginTransaction();
      const [users] = await connection.query('SELECT phone, username, password_hash FROM users WHERE username = ? FOR UPDATE', [username]);
      if (users.length !== 1) throw problem(404, '账号不存在', 'USER_NOT_FOUND');
      const user = users[0];
      const identities = [...new Set([user.username, user.phone].filter(v => typeof v === 'string' && v))];
      // A username can legally be another row's phone (or vice versa). Refuse
      // ambiguous identity graphs rather than deleting that other account's data.
      const identityParams = identities.length ? identities : [''];
      const [identityMatches] = await connection.query(
        'SELECT username, phone FROM users WHERE username IN (' + identityParams.map(() => '?').join(',')
          + ') OR phone IN (' + identityParams.map(() => '?').join(',') + ')',
        [...identityParams, ...identityParams]);
      if (identityMatches.length !== 1) throw problem(404, '账号标识不唯一', 'USER_NOT_FOUND');
      if (requirePassword) {
        if (!user.password_hash) throw problem(409, '该账号未设置密码，暂不支持注销，请先设置密码', 'PASSWORD_REQUIRED');
        if (typeof password !== 'string' || !password || !options.verifyPassword(password, user.password_hash)) {
          throw problem(401, '密码错误', 'PASSWORD_INVALID');
        }
      }
      const [columns] = await connection.query(
        `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = COALESCE(?, DATABASE()) AND COLUMN_NAME IN ('user_id','username','phone')`, [database || null]);
      const byTable = new Map();
      for (const row of columns) {
        if (row.TABLE_NAME === 'users') continue;
        if (!byTable.has(row.TABLE_NAME)) byTable.set(row.TABLE_NAME, new Set());
        byTable.get(row.TABLE_NAME).add(row.COLUMN_NAME);
      }
      // Child tables first; all predicates are parameterized, identifiers are metadata-derived.
      for (const table of OWNED_TABLES) {
        const cols = byTable.get(table);
        if (!cols) continue;
        const predicates = [], params = [];
        for (const col of cols) { predicates.push('`' + col + '` IN (' + identities.map(() => '?').join(',') + ')'); params.push(...identities); }
        if (predicates.length) await connection.query('DELETE FROM `' + table.replace(/`/g, '``') + '` WHERE ' + predicates.join(' OR '), params);
      }
      const [deleted] = await connection.query('DELETE FROM users WHERE username = ? OR phone = ?', [user.username, user.phone]);
      if (deleted.affectedRows !== 1) throw new Error('Account deletion affected unexpected row count');
      await connection.commit();
      return { ok: true, username: user.username };
    } catch (error) {
      try { await connection.rollback(); }
      catch (rollbackError) {
        console.error('[account-delete] rollback failed:', rollbackError.message);
        connection.destroy(); destroyed = true;
        throw rollbackError;
      }
      throw error;
    } finally {
      if (locked) {
        try {
          const [released] = await connection.query('SELECT RELEASE_LOCK(?) AS released', [acquireLock(username)]);
          if (Number(released[0]?.released) !== 1) throw new Error('Account deletion lock release failed');
        } catch (releaseError) {
          console.error('[account-delete] lock release failed:', releaseError.message);
          if (!destroyed) { connection.destroy(); destroyed = true; }
        }
      }
      if (!destroyed) connection.release();
    }
  };
}
module.exports = { createAccountDeletion, lockName };

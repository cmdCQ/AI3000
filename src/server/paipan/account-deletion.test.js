'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { createAccountDeletion } = require('./account-deletion.js');

function fixture({ users = [{ username: 'alice', phone: '13800000000', password_hash: 'hash' }], failDelete = false } = {}) {
  const calls = [];
  let committed = false, rolledBack = false;
  const connection = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
      if (sql.startsWith('SELECT phone, username, password_hash')) return [users.filter(u => u.username === params[0] || u.phone === params[1])];
      if (sql.startsWith('SELECT username, phone FROM users WHERE username IN')) return [users.filter(u => params.includes(u.username) || params.includes(u.phone))];
      if (sql.startsWith('SELECT TABLE_NAME, COLUMN_NAME')) return [[
        ...['bazi_consultation_turns', 'bazi_consultations', 'bazi_analyses', 'chat_history',
          'mhys_records', 'liuyao_records', 'charts', 'suggestions', 'points_usage', 'points_daily']
          .map(TABLE_NAME => ({ TABLE_NAME, COLUMN_NAME: 'user_id' })), 
        { TABLE_NAME: 'unrelated', COLUMN_NAME: 'user_id' },
      ]];
      if (sql.startsWith('DELETE FROM `')) {
        if (failDelete && sql.includes('chat_history')) throw new Error('delete failed');
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('DELETE FROM users')) {
        if (failDelete) throw new Error('delete user failed');
        return [{ affectedRows: 1 }];
      }
      throw new Error(`unexpected query: ${sql}`);
    },
    async beginTransaction() { calls.push({ sql: 'BEGIN' }); },
    async commit() { committed = true; calls.push({ sql: 'COMMIT' }); },
    async rollback() { rolledBack = true; calls.push({ sql: 'ROLLBACK' }); },
    release() { calls.push({ sql: 'RELEASE' }); },
    destroy() { calls.push({ sql: 'DESTROY' }); },
  };
  return { db: { async getConnection() { return connection; } }, calls, state: () => ({ committed, rolledBack }) };
}

const verifyPassword = (password, stored) => password === 'correct' && stored === 'hash';
const lockName = username => `points:${username}`;

test('deletes owned rows transactionally and retains unrelated owner rows', async () => {
  const f = fixture();
  const deletion = createAccountDeletion(f.db, { database: 'test', verifyPassword, lockName });
  const result = await deletion('alice', { password: 'correct', requirePassword: true });
  assert.deepEqual(result, { ok: true, username: 'alice' });
  assert.equal(f.state().committed, true);
  assert.equal(f.state().rolledBack, false);
  const deletes = f.calls.filter(c => c.sql.startsWith('DELETE FROM'));
  assert.equal(deletes.length, 11); // All ten business tables then users; unrelated is untouched.
  assert.ok(deletes.at(-1).sql.startsWith('DELETE FROM users'));
  assert.ok(deletes.every(c => !c.sql.includes('`unrelated`')));
  assert.ok(deletes.every(c => c.params.includes('alice') || c.params.includes('13800000000')));
  assert.ok(f.calls.some(c => c.sql.startsWith('SELECT GET_LOCK') && c.params[0] === 'points:alice'));
});

test('rejects wrong password without deleting', async () => {
  const f = fixture();
  const deletion = createAccountDeletion(f.db, { database: 'test', verifyPassword, lockName });
  await assert.rejects(() => deletion('alice', { password: 'wrong', requirePassword: true }), { code: 'PASSWORD_INVALID', status: 401 });
  assert.equal(f.state().committed, false);
  assert.equal(f.calls.filter(c => c.sql.startsWith('DELETE FROM')).length, 0);
});

test('rejects passwordless account explicitly', async () => {
  const f = fixture({ users: [{ username: 'wx_openid', phone: '', password_hash: '' }] });
  const deletion = createAccountDeletion(f.db, { database: 'test', verifyPassword, lockName });
  await assert.rejects(() => deletion('wx_openid', { requirePassword: true }), { code: 'PASSWORD_REQUIRED', status: 409 });
  assert.equal(f.state().committed, false);
});

test('rolls back all work on child deletion failure', async () => {
  const f = fixture({ failDelete: true });
  const deletion = createAccountDeletion(f.db, { database: 'test', verifyPassword, lockName });
  await assert.rejects(() => deletion('alice', { password: 'correct', requirePassword: true }), /delete failed/);
  assert.equal(f.state().committed, false);
  assert.equal(f.state().rolledBack, true);
});

test('fails closed on duplicate identity match', async () => {
  const f = fixture({ users: [
    { username: 'alice', phone: '13800000000', password_hash: 'hash' },
    { username: 'other', phone: 'alice', password_hash: 'hash' },
  ] });
  const deletion = createAccountDeletion(f.db, { database: 'test', verifyPassword, lockName });
  await assert.rejects(() => deletion('alice', { password: 'correct', requirePassword: true }), { code: 'USER_NOT_FOUND', status: 404 });
  assert.equal(f.calls.filter(c => c.sql.startsWith('DELETE FROM')).length, 0);
});

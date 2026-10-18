'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPointsBilling, billingDateAt, lockName, DAILY_TOKENS } = require('./points-billing');

function fixture(options = {}) {
  const calls = [], users = options.users || [{ username: 'alice', tier: 0, token_used: 0 }], daily = new Map(), usage = new Map();
  let tx, lockResult = options.lockResult ?? 1, failCommit = false, failRollback = false;
  const query = async (sql, values = []) => {
    calls.push({ sql, values });
    if (sql.startsWith('CREATE TABLE')) return [{}];
    if (sql.startsWith('SELECT username')) return [users.filter(u => u.username === values[0]).map(u => ({ ...u }))];
    if (sql.startsWith('SELECT used_tokens')) return [[...(daily.has(values[0] + '/' + values[1]) ? [{ used_tokens: daily.get(values[0] + '/' + values[1]) }] : [])]];
    if (sql.startsWith('SELECT * FROM points_usage')) {
      const row = usage.get(values[0] + '/' + values[1]); return [row ? [{ ...row }] : []];
    }
    if (sql.startsWith('INSERT INTO points_usage')) {
      const [u, requestId, kind, date, input, output, total] = values;
      usage.set(u + '/' + requestId, { username: u, request_id: requestId, kind, billing_date: date, input_tokens: input, output_tokens: output, total_tokens: total }); return [{}];
    }
    if (sql.startsWith('INSERT INTO points_daily')) { daily.set(values[0] + '/' + values[1], values[2]); return [{}]; }
    if (sql.startsWith('UPDATE users')) { users[0].token_used += values[0]; return [{ affectedRows: 1 }]; }
    if (sql.startsWith('SELECT COALESCE(SUM(p.total_tokens)')) return [[{ total_tokens: 0, tokens_7d: 0 }]];
    if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: lockResult }]];
    if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
    throw new Error('unexpected SQL: ' + sql);
  };
  const db = { query, getConnection: async () => ({ query, beginTransaction: async () => { tx = true; }, commit: async () => { if (failCommit) throw new Error('commit failed'); tx = false; }, rollback: async () => { if (failRollback) throw new Error('rollback failed'); tx = false; }, release() {}, destroy() {} }) };
  return { db, calls, users, daily, usage };
}

test('constants and Beijing date are explicit', () => {
  assert.equal(DAILY_TOKENS[0], 100000); assert.equal(DAILY_TOKENS[1], 500000); assert.equal(DAILY_TOKENS[2], null);
  assert.equal(billingDateAt(Date.parse('2026-01-01T15:59:59Z')), '2026-01-01');
  assert.equal(billingDateAt(Date.parse('2026-01-01T16:00:00Z')), '2026-01-02');
  assert.equal(lockName('alice').startsWith('points:'), true);
});
test('schema uses additive ledger tables', async () => {
  const f = fixture(); await createPointsBilling(f.db).initSchema();
  assert.equal(f.calls.filter(x => x.sql.startsWith('CREATE TABLE')).length, 2);
  assert.match(f.calls[1].sql, /UNIQUE KEY idx_points_request/);
});
test('charge stores integer input/output and is idempotent', async () => {
  const f = fixture(), b = createPointsBilling(f.db), day = billingDateAt();
  const one = await b.charge('alice', { inputTokens: 10001, outputTokens: 9999, requestId: 'r1', billingDate: day });
  assert.equal(one.pointsCharged, 2); assert.equal(one.tokensUsed, 20000); assert.equal(f.users[0].token_used, 20000);
  const replay = await b.charge('alice', { inputTokens: 10001, outputTokens: 9999, requestId: 'r1', billingDate: day });
  assert.equal(replay.replayed, true); assert.equal(f.users[0].token_used, 20000);
  await assert.rejects(() => b.charge('alice', { inputTokens: 1, outputTokens: 1, requestId: 'r1', billingDate: day }), { code: 'REQUEST_CONFLICT' });
});
test('withUserLock passes checked-out connection and quota', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  const got = await b.withUserLock('alice', async (connection, quota) => ({ same: typeof connection.query === 'function', date: quota.billingDate }));
  assert.equal(got.same, true); assert.equal(got.date, billingDateAt());
});
test('quota maps immediate tier changes and SVIP unlimited', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  f.users[0].tier = 1; assert.equal((await b.getQuota('alice')).pointsLimit, 50);
  f.users[0].tier = 2; assert.equal((await b.getQuota('alice')).pointsLimit, null);
});
test('daily reset is keyed by supplied Beijing date and decimal adjustment preserves 0.0001', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  const q = await b.charge('alice', { inputTokens: 10000, outputTokens: 0, requestId: 'old', billingDate: '2026-01-01' });
  assert.equal(q.chargeBillingDate, '2026-01-01');
  const adjusted = await b.setDailyPoints('alice', '0.0001');
  assert.equal(adjusted.pointsUsed, 0.0001);
});
test('lock contention, duplicate users and invalid admin scope fail closed', async () => {
  await assert.rejects(() => createPointsBilling(fixture({ lockResult: 0 }).db).withUserLock('alice', () => {}), { code: 'REQUEST_BUSY' });
  await assert.rejects(() => createPointsBilling(fixture({ users: [{ username: 'alice', tier: 0, token_used: 0 }, { username: 'alice', tier: 0, token_used: 0 }] }).db).getQuota('alice'), { code: 'DUPLICATE_USER' });
  await assert.rejects(() => createPointsBilling(fixture().db).getAdminUsage('mobile'), { code: 'INVALID_SCOPE' });
});
test('admin usage query only accepts web/wechat scopes', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  const result = await b.getAdminUsage('web');
  assert.equal(result.scope, 'web');
  assert.match(f.calls.at(-1).sql, /p\.kind = 'charge'/);
  assert.match(f.calls.at(-1).sql, /NOT LIKE 'wx_%'/);
});

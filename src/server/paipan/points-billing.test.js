'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPointsBilling, billingDateAt, weekStartAt, lockName, WEEKLY_TOKENS } = require('./points-billing');

// A small in-memory SQL fixture that preserves dates and the permanent ledger.
// This intentionally models the predicates used by the service instead of returning
// an unconditional SUM, so weekly boundary and ledger-spend tests are meaningful.
function fixture(options = {}) {
  const calls = [];
  const users = options.users || [{ username: 'alice', tier: 0, token_used: 0 }];
  const daily = new Map(Object.entries(options.daily || {}));
  const usage = new Map();
  const ledger = (options.ledger || []).map(row => ({ ...row }));
  let lockResult = options.lockResult ?? 1;
  let failCommit = false;
  const query = async (sql, values = []) => {
    calls.push({ sql, values });
    const normalized = sql.replace(/\s+/g, ' ').trim();
    if (normalized.startsWith('CREATE TABLE')) return [{}];
    if (normalized.startsWith('SELECT username')) {
      return [users.filter(u => u.username === values[0]).map(u => ({ ...u }))];
    }
    if (normalized.startsWith('SELECT used_tokens')) {
      const row = daily.get(values[0] + '/' + values[1]);
      return [row == null ? [] : [{ used_tokens: row }]];
    }
    if (normalized.startsWith('SELECT COALESCE(SUM(used_tokens)')) {
      const [username, start, end] = values;
      const endDate = billingDateAt(Date.parse(start + 'T00:00:00+08:00') + 7 * 86400000);
      const used = [...daily.entries()].reduce((sum, [key, value]) => {
        const [u, date] = key.split('/');
        return sum + (u === username && date >= start && date < endDate ? Number(value) : 0);
      }, 0);
      return [[{ used_tokens: used }]];
    }
    if (normalized.startsWith('SELECT COALESCE(SUM(points_tokens)')) {
      const total = ledger.filter(row => row.username === values[0])
        .reduce((sum, row) => sum + Number(row.points_tokens), 0);
      return [[{ points_tokens: total }]];
    }
    if (normalized.startsWith('SELECT * FROM points_permanent_ledger')) {
      const rows = ledger.filter(row => row.username === values[0] && row.request_id === values[1]);
      return [rows.map(row => ({ ...row }))];
    }
    if (normalized.startsWith('INSERT INTO points_permanent_ledger')) {
      const [username, requestId, kind, pointsTokens, reason, adminUsername, createdAt] = values;
      ledger.push({ username, request_id: requestId, kind, points_tokens: pointsTokens,
        reason, admin_username: adminUsername, created_at: createdAt });
      return [{}];
    }
    if (normalized.startsWith('SELECT * FROM points_usage')) {
      const row = usage.get(values[0] + '/' + values[1]);
      return [row ? [{ ...row }] : []];
    }
    if (normalized.startsWith('INSERT INTO points_usage')) {
      const [username, requestId, kind, date, input, output, total] = values;
      usage.set(username + '/' + requestId, { username, request_id: requestId, kind,
        billing_date: date, input_tokens: input, output_tokens: output, total_tokens: total });
      return [{}];
    }
    if (normalized.startsWith('INSERT INTO points_daily')) {
      daily.set(values[0] + '/' + values[1], values[2]);
      return [{}];
    }
    if (normalized.startsWith('UPDATE users')) {
      const user = users.find(u => u.username === values[1]);
      if (!user) return [{ affectedRows: 0 }];
      user.token_used += values[0];
      return [{ affectedRows: 1 }];
    }
    if (normalized.startsWith('SELECT COALESCE(SUM(p.total_tokens)')) {
      const rows = [...usage.values()].filter(row => row.kind === 'charge');
      return [[{ total_tokens: rows.reduce((n, row) => n + row.total_tokens, 0),
        tokens_7d: rows.reduce((n, row) => n + row.total_tokens, 0) }]];
    }
    if (normalized.startsWith('SELECT GET_LOCK')) return [[{ acquired: lockResult }]];
    if (normalized.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
    throw new Error('unexpected SQL: ' + sql);
  };
  const db = { query, getConnection: async () => ({ query,
    beginTransaction: async () => {},
    commit: async () => { if (failCommit) throw new Error('commit failed'); },
    rollback: async () => {}, release() {}, destroy() {} }) };
  return { db, calls, users, daily, usage, ledger };
}

test('constants and Beijing date are explicit', () => {
  assert.equal(WEEKLY_TOKENS[0], 100000); assert.equal(WEEKLY_TOKENS[1], 500000); assert.equal(WEEKLY_TOKENS[2], null);
  assert.equal(billingDateAt(Date.parse('2026-01-01T15:59:59Z')), '2026-01-01');
  assert.equal(billingDateAt(Date.parse('2026-01-01T16:00:00Z')), '2026-01-02');
  assert.equal(lockName('alice').startsWith('points:'), true);
});
test('schema uses additive ledger tables', async () => {
  const f = fixture(); await createPointsBilling(f.db).initSchema();
  assert.equal(f.calls.filter(x => x.sql.replace(/\s+/g, ' ').trim().startsWith('CREATE TABLE')).length, 3);
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
test('weekly quota resets from Beijing Sunday to Monday', async () => {
  const f = fixture({ daily: { 'alice/2026-01-04': 100000 } }), b = createPointsBilling(f.db);
  assert.equal(weekStartAt(Date.parse('2026-01-04T12:00:00+08:00')), '2025-12-29');
  assert.equal(weekStartAt(Date.parse('2026-01-05T00:00:00+08:00')), '2026-01-05');
  assert.equal((await b.getQuota('alice', f.db, '2026-01-04')).weeklyTokensRemaining, 0);
  assert.equal((await b.getQuota('alice', f.db, '2026-01-05')).weeklyTokensRemaining, 100000);
});
test('first weekly spill is precise and spends one permanent token', async () => {
  const f = fixture({ daily: { 'alice/2026-01-05': 90000 }, ledger: [{ username: 'alice', request_id: 'grant', kind: 'grant', points_tokens: 100, reason: 'seed', admin_username: 'admin', created_at: 1 }] });
  const result = await createPointsBilling(f.db).charge('alice', { inputTokens: 10001, outputTokens: 0, requestId: 'spill', billingDate: '2026-01-05' });
  assert.equal(result.pointsCharged, 1.0001);
  assert.equal(f.ledger.reduce((n, row) => n + Number(row.points_tokens), 0), 99);
  assert.equal(f.ledger.at(-1).kind, 'spend');
});
test('permanent grant is exact four-decimal, idempotent, and conflict-safe', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  const first = await b.grantPermanentPoints('alice', '1.2345', 'bonus', 'admin', 'grant-1');
  assert.equal(first.pointsGranted, 1.2345);
  assert.equal((await b.grantPermanentPoints('alice', '1.2345', 'bonus', 'admin', 'grant-1')).replayed, true);
  await assert.rejects(() => b.grantPermanentPoints('alice', '1.2346', 'bonus', 'admin', 'grant-1'), { code: 'REQUEST_CONFLICT' });
  await assert.rejects(() => b.grantPermanentPoints('alice', '900719925474.0992', 'too-big', 'admin', 'grant-2'), { code: 'INVALID_POINTS' });
});
test('128-character grant id cannot collide with hashed spend ledger id', async () => {
  const f = fixture({ daily: { 'alice/2026-01-05': 100000 } }), b = createPointsBilling(f.db), requestId = 'x'.repeat(128);
  await b.grantPermanentPoints('alice', '1', 'bonus', 'admin', requestId);
  await b.charge('alice', { inputTokens: 100001, outputTokens: 0, requestId, billingDate: '2026-01-05' });
  assert.equal(f.ledger.filter(row => row.kind === 'grant').length, 1);
  assert.equal(f.ledger.filter(row => row.kind === 'spend').length, 1);
  assert.equal(f.ledger.reduce((n, row) => n + Number(row.points_tokens), 0), 0);
});
test('permanent balance is retained in the next Beijing week', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  await b.grantPermanentPoints('alice', '2.5', 'bonus', 'admin', 'grant-week');
  assert.equal((await b.getQuota('alice', f.db, '2026-01-05')).permanentPoints, 2.5);
  assert.equal((await b.getQuota('alice', f.db, '2026-01-12')).permanentPoints, 2.5);
});
test('SVIP never deducts permanent points', async () => {
  const f = fixture({ users: [{ username: 'alice', tier: 2, token_used: 0 }], ledger: [{ username: 'alice', request_id: 'grant', kind: 'grant', points_tokens: 100, reason: 'seed', admin_username: 'admin', created_at: 1 }] });
  await createPointsBilling(f.db).charge('alice', { inputTokens: 1000000, outputTokens: 0, requestId: 'svip', billingDate: '2026-01-05' });
  assert.equal(f.ledger.reduce((n, row) => n + Number(row.points_tokens), 0), 100);
  assert.equal(f.ledger.some(row => row.kind === 'spend'), false);
});
test('incurred overflow is recorded and permanent balance never goes negative', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  const result = await b.charge('alice', { inputTokens: 100001, outputTokens: 0, requestId: 'overflow', billingDate: '2026-01-05' });
  assert.equal(result.pointsCharged, 10.0001);
  assert.equal(f.users[0].token_used, 100001);
  assert.equal(f.usage.get('alice/overflow').total_tokens, 100001);
  assert.equal(f.ledger.length, 0);
  assert.equal((await b.getQuota('alice', f.db, '2026-01-05')).permanentTokens, 0);
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

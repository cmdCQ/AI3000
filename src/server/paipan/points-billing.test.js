'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPointsBilling, billingDateAt, weekStartAt, lockName, WEEKLY_POINTS, WEEKLY_TOKENS, setTokensPerPoint } = require('./points-billing');

// 本文件里的期望值都按「1 积分 = 10000 token」写死（100001 token = 10.0001 分这类整数字）。
// 产品比例 2026-10-20 改成 5000 且以后还可能从后台调，所以这里把比例钉成 10000 ——
// 测的是换算与账本的**逻辑**，不是产品的当前比例；当前比例由下面那条常量用例单独钉。
setTokensPerPoint(10000);

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
    // 三列缓存/积分字段的补列检查：fixture 里都当作「已存在」，于是不产生 ALTER 与回填。
    if (normalized.startsWith('SELECT COUNT(*) AS n FROM information_schema.COLUMNS')) {
      return [[{ n: options.legacyColumns ? 0 : 1 }]];
    }
    if (normalized.startsWith('ALTER TABLE')) return [{}];
    if (normalized.startsWith('UPDATE points_usage SET')) return [{}];
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
      const [username, requestId, kind, date, input, output, total, cached, billable, pointsValue] = values;
      usage.set(username + '/' + requestId, { username, request_id: requestId, kind,
        billing_date: date, input_tokens: input, output_tokens: output, total_tokens: total,
        cached_tokens: cached, billable_tokens: billable, points: pointsValue });
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
    if (normalized.startsWith('SELECT COALESCE(SUM(p.billable_tokens)')) {
      const rows = [...usage.values()].filter(row => row.kind === 'charge');
      const billable = rows.reduce((n, row) => n + Number(row.billable_tokens ?? row.total_tokens), 0);
      const raw = rows.reduce((n, row) => n + Number(row.total_tokens), 0);
      const pts = rows.reduce((n, row) => n + Number(row.points ?? 0), 0);
      return [[{ total_tokens: billable, raw_tokens: raw, total_points: pts, tokens_7d: billable, raw_tokens_7d: raw, points_7d: pts }]];
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
  // 产品当前口径：1 积分 = 5000 token（后台可改，默认值就是它）。
  const { TOKENS_PER_POINT } = require('./points-billing');
  assert.equal(TOKENS_PER_POINT, 10000); // 本文件已钉成 10000，见文件头
  setTokensPerPoint(5000);
  assert.equal(require('./points-billing').TOKENS_PER_POINT, 5000, 'setTokensPerPoint 必须能改到产品默认值 5000');
  setTokensPerPoint(10000);
  // 2026-10-21 起额度定义在**积分**上：普通 10、会员 50、SVIP 不限；token 上限 = 积分 × 比例。
  // 本文件把比例钉成 10000，所以 token 上限分别是 100000 / 500000。
  assert.equal(WEEKLY_POINTS[0], 10); assert.equal(WEEKLY_POINTS[1], 50); assert.equal(WEEKLY_POINTS[2], null);
  assert.equal(WEEKLY_TOKENS[0], 100000); assert.equal(WEEKLY_TOKENS[1], 500000); assert.equal(WEEKLY_TOKENS[2], null);
  assert.equal(billingDateAt(Date.parse('2026-01-01T15:59:59Z')), '2026-01-01');
  assert.equal(billingDateAt(Date.parse('2026-01-01T16:00:00Z')), '2026-01-02');
  assert.equal(lockName('alice').startsWith('points:'), true);
});
test('schema uses additive ledger tables', async () => {
  const f = fixture(); await createPointsBilling(f.db).initSchema();
  // 5 张表：points_daily / points_usage / points_permanent_ledger（原有三张）
  //      + app_settings（2026-10-20 后台可调的换算比例）
  //      + user_tier_ledger（等级变更审计）
  assert.equal(f.calls.filter(x => x.sql.replace(/\s+/g, ' ').trim().startsWith('CREATE TABLE')).length, 5);
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
test('缓存命中的提示 token 按 1/10 计费，原始与计费两种数都落库', async () => {
  const f = fixture(), b = createPointsBilling(f.db), day = billingDateAt();
  // 10000 个提示 token 里 5000 命中缓存：计费 = 5000(未命中) + ceil(5000*0.1)=500 + 1000(输出) = 6500
  const result = await b.charge('alice', { inputTokens: 10000, cachedTokens: 5000, outputTokens: 1000, requestId: 'cache', billingDate: day });
  assert.equal(result.totalTokens, 6500, '计费 token 要按缓存折算');
  assert.equal(result.rawTokens, 11000, '原始 token 仍要能读到（与上游控制台对账）');
  assert.equal(result.cachedTokens, 5000);
  assert.equal(result.pointsCharged, 0.65);
  assert.equal(f.users[0].token_used, 6500, '累计用量按计费 token 记');
  const row = f.usage.get('alice/cache');
  assert.equal(row.input_tokens, 10000); assert.equal(row.output_tokens, 1000);
  assert.equal(row.cached_tokens, 5000); assert.equal(row.billable_tokens, 6500);
  assert.equal(Number(row.points), 0.65);
  // 重放同一 requestId 时返回**落库**的积分，而不是按当前比例重算。
  const replay = await b.charge('alice', { inputTokens: 10000, cachedTokens: 5000, outputTokens: 1000, requestId: 'cache', billingDate: day });
  assert.equal(replay.replayed, true); assert.equal(replay.pointsCharged, 0.65);
});
test('缓存数超过输入 token 视为上游异常，不记账', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  await assert.rejects(() => b.charge('alice', { inputTokens: 10, cachedTokens: 11, outputTokens: 1, requestId: 'bad', billingDate: billingDateAt() }), { code: 'INVALID_USAGE' });
  assert.equal(f.usage.size, 0);
});
test('改比例不改写历史积分（仪表盘读落库的 points）', async () => {
  const f = fixture(), b = createPointsBilling(f.db);
  await b.charge('alice', { inputTokens: 20000, outputTokens: 0, requestId: 'hist', billingDate: '2026-01-05' });
  const before = await b.getAdminUsage('all');
  assert.equal(before.totalPoints, 2); // 20000 / 10000（本文件钉的比例）
  assert.equal(before.rawTokens, 20000);
  setTokensPerPoint(5000);
  try {
    const after = await b.getAdminUsage('all');
    // token 数不变，积分不随比例重算 —— 这正是「历史消耗不该跟着比例跳」的要求。
    assert.equal(after.totalTokens, 20000);
    assert.equal(after.totalPoints, 2);
  } finally { setTokensPerPoint(10000); }
});
test('老库补列时回填 billable_tokens 与 points，不把历史算成 0', async () => {
  const f = fixture({ legacyColumns: true }), b = createPointsBilling(f.db);
  await b.initSchema();
  const sqls = f.calls.map(c => c.sql.replace(/\s+/g, ' ').trim());
  assert.equal(sqls.filter(q => q.startsWith('ALTER TABLE points_usage ADD COLUMN')).length, 3);
  assert.equal(sqls.some(q => q.startsWith('UPDATE points_usage SET billable_tokens = total_tokens')), true);
  assert.equal(sqls.some(q => q.startsWith('UPDATE points_usage SET points = ROUND(total_tokens /')), true);
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

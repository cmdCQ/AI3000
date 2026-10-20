'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Execute only real source boundaries: importing auth-server would start services.
const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function extract(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source boundary: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source boundary: ${endMarker}`);
  return source.slice(start, end);
}
const statsFunction = extract('async function getAdminStats()', '\nasync function getUsers()');
const routes = {
  stats: extract("  if (req.method === 'GET' && pathname === '/api/admin/stats')", '\n  // GET /api/admin/users'),
  delete: extract("  if (req.method === 'DELETE' && pathname.startsWith('/api/admin/users/'))", '\n  // GET /api/admin/user-tiers'),
  books: extract("  if (req.method === 'GET' && pathname === '/api/admin/books')", '\n  // POST /api/admin/books'),
};
function runRoute(route, { payload = { role: 'admin' }, query, url } = {}) {
  const calls = [];
  const db = {
    async query(...args) {
      calls.push(args);
      if (!query) throw new Error('Unexpected database access');
      return query(...args);
    },
  };
  const req = {
    method: route === 'delete' ? 'DELETE' : 'GET',
    url: url || (route === 'delete' ? '/api/admin/users/test-user' : `/api/admin/${route}`),
  };
  const execute = new AsyncFunction(
    'req', 'res', 'pathname', 'checkAuth', 'json', 'db', 'console',
    'pointsReady', 'pointsBilling', 'config', 'admin', 'deleteAccount',
    `${route === 'stats' ? statsFunction : ''}\n${routes[route]}`,
  );
  const result = execute(
    req, {}, new URL(req.url, 'http://localhost').pathname,
    () => payload,
    (_res, body, status = 200) => ({ status, body }),
    db, { error() {} }, async () => {},
    { async getAdminUsage(scope) {
      assert.equal(scope, 'all');
      // 2026-10-20 起仪表盘还要看到 token 原始用量（积分是按比例折算的展示值）。
      return { totalPoints: 12.5, points7d: 3.25, totalTokens: 62500, tokens7d: 16250 };
    } },
    { deepseek: { apiKey: '' } },
    { username: 'CQA' },
    async target => ({ ok: true, username: target }),
  );
  return { result, calls };
}

for (const payload of [null, { role: 'user' }]) {
  test(`DELETE users rejects ${payload ? 'non-admin' : 'unauthenticated'} callers without database access`, async () => {
    const { result, calls } = runRoute('delete', { payload });
    assert.deepEqual(await result, { status: 401, body: { error: '未授权' } });
    assert.equal(calls.length, 0);
  });
}
test('DELETE users allows admin deletion through the account deletion service', async () => {
  const { result, calls } = runRoute('delete');
  const response = await result;
  assert.deepEqual(response, { status: 200, body: { ok: true, username: 'test-user' } });
  assert.equal(calls.length, 0);
});

for (const payload of [null, { role: 'user' }]) {
  test(`GET stats rejects ${payload ? 'non-admin' : 'unauthenticated'} callers before querying`, async () => {
    const { result, calls } = runRoute('stats', { payload });
    assert.deepEqual(await result, { status: 401, body: { error: '未授权' } });
    assert.equal(calls.length, 0);
  });
}
// Cover each count: none may silently substitute a successful zero statistic.
for (let failAt = 1; failAt <= 6; failAt++) {
  test(`GET stats returns 503, not zero statistics, when database query ${failAt} fails`, async () => {
    let count = 0;
    const { result, calls } = runRoute('stats', {
      query: async () => {
        if (++count === failAt) throw new Error('Database unavailable');
        return [[{ cnt: 7 }]];
      },
    });
    const response = await result;
    assert.deepEqual(response, { status: 503, body: { error: '统计暂不可用' } });
    assert.equal(calls.length, failAt);
    assert.equal(Object.hasOwn(response.body, 'total'), false);
  });
}

test('GET stats returns actual totals without channel splits or fabricated server expiry', async () => {
  const counts = [10, 2, 4, 8, 3, 6];
  let index = 0;
  const { result, calls } = runRoute('stats', {
    query: async () => [[{ cnt: counts[index++] }]],
  });
  const response = await result;
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.total, {
    users: 10, todayUsers: 2, active7d: 4, totalPoints: 12.5,
    points7d: 3.25, totalTokens: 62500, tokens7d: 16250, charts: 8, divinations: 9,
  });
  assert.deepEqual(Object.keys(response.body).sort(), ['deepseek', 'total']);
  for (const key of ['web', 'wechat', 'server', 'expiresAt', 'daysLeft']) {
    assert.equal(Object.hasOwn(response.body, key), false);
  }
  assert.deepEqual(response.body.deepseek, { status: 'inactive', apiKeyPrefix: '' });
  assert.equal(calls.length, 6);
});

test('GET books maps SQL content availability to hasContent without returning book contents', async () => {
  const { result, calls } = runRoute('books', {
    url: '/api/admin/books?category=test-category&folder=test-folder',
    query: async () => [[
      { id: 1, title: 'With content', has_content: 1, content: 'must not leak' },
      { id: 2, title: 'Empty content', has_content: 0 },
      { id: 3, title: 'Null content', has_content: null },
    ]],
  });
  const response = await result;
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map(book => book.hasContent), [true, false, false]);
  assert.deepEqual(response.body.map(book => book.id), [1, 2, 3]);
  for (const book of response.body) {
    assert.equal(Object.hasOwn(book, 'content'), false);
    assert.equal(Object.hasOwn(book, 'has_content'), false);
  }
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /\(content IS NOT NULL AND content != ''\) AS has_content/);
  assert.deepEqual(calls[0][1], ['test-category', 'test-folder']);
});

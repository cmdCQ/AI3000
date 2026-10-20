'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
function extract(name, end) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' missing');
  const finish = source.indexOf(end, start);
  assert.notEqual(finish, -1, name + ' boundary missing');
  return source.slice(start, finish);
}
function billingFunctions() {
  const code = extract('pointsTrailer', '\n// 后台');
  const context = { LLM_MAX_TOKENS: 8000 };
  vm.runInNewContext(code + ';', context);
  return context;
}

test('auth source uses points conversion trailer with four decimal places', () => {
  const code = extract('pointsTrailer', '\n// 后台');
  // `pointsTrailer()` 现在按 `TOKENS_PER_POINT`（后台可调）换算，所以沙箱里要给模块。
  // 这里给 10000，让断言里的 10000 token = 1 积分保持直观；比例本身由
  // points-billing.test.js 的常量用例钉。
  const ctx = {
    LLM_MAX_TOKENS: 8000, POINTS_LABEL: '消耗积分：', result: null,
    pointsBillingModule: { TOKENS_PER_POINT: 10000 },
  };
  vm.runInNewContext(code + '; result = pointsTrailer(1, 9999, 10000, 2.5);', ctx);
  assert.equal(ctx.result, '\n\n---\n消耗积分：1');
  assert.doesNotMatch(ctx.result, /输入|输出|剩余|=/);
});

test('requirePoints bounds model output by remaining integer tokens and fails at budget', () => {
  const code = extract('requirePoints', '\n// 后台');
  const run = (quota, input) => { const ctx = { LLM_MAX_TOKENS: 8000, result: null, quota, input }; vm.runInNewContext(code + '; result = requirePoints(quota, input);', ctx); return ctx.result; };
  assert.equal(run({ tokensRemaining: 2000 }, 500), 1500);
  assert.equal(run({ tokensRemaining: 20000 }, 500), 8000);
  assert.throws(() => run({ tokensRemaining: 500 }, 500), error => error.status === 429);
  assert.equal(run({ tokensRemaining: null }, 999999), 8000);
});

test('real auth source exposes points endpoint and protects it with bearer auth', () => {
  assert.match(source, /pathname === '\/api\/user\/points'/);
  const endpoint = source.slice(source.indexOf("pathname === '/api/user/points'"), source.indexOf("pathname === '/api/user/points'") + 450);
  assert.match(endpoint, /checkAuth\(req\)/);
  assert.match(endpoint, /if \(!payload\)/);
  assert.match(endpoint, /pointsBilling\.getQuota/);
});

test('admin tier endpoint validates strict integer tiers and uses points quota', () => {
  const endpointStart = source.indexOf("pathname === '/api/admin/user-tier'");
  const endpoint = source.slice(endpointStart, source.indexOf("pathname === '/api/admin/user-tokens'", endpointStart));
  assert.match(endpoint, /payload\.role !== 'admin'/);
  assert.match(endpoint, /Number\.isInteger\(tier\)/);
  assert.match(endpoint, /tier < 0 \|\| tier > 2/);
  assert.match(endpoint, /pointsBilling\.withUserLock/);
});

test('actual permanent grant route enforces admin, validates input and propagates ledger conflicts', async () => {
  const start = source.indexOf('  // POST /api/admin/permanent-points');
  const end = source.indexOf('  // GET /api/admin/charts', start);
  const code = '(async () => {' + source.slice(start, end) + '})()';
  const valid = { username: 'alice', points: 0.0001, reason: 'manual grant', requestId: 'grant-1' };
  for (const sample of [
    { payload: null, status: 401 }, { payload: { role: 'user' }, status: 401 },
    { body: { ...valid, points: 0 }, status: 400 },
    { status: 200 }, { payload: { role: 'admin' }, status: 200 }, { failure: Object.assign(new Error('conflict'), { status: 409 }), status: 409 },
    { failure: new Error('DB unavailable'), status: 503 },
  ]) {
    let result, calls = 0;
    await vm.runInNewContext(code, {
      req: { method: 'POST' }, pathname: '/api/admin/permanent-points', res: {},
      body: sample.body || valid, checkAuth: () => Object.hasOwn(sample, 'payload') ? sample.payload : { role: 'admin', username: 'operator' },
      pointsReady: async () => {}, console: { error() {} }, ADMIN_FILE: '/mock-admin.json', readJSON: () => ({ username: 'operator' }),
      json: (_res, data, status = 200) => { result = { data, status }; },
      pointsBilling: { grantPermanentPoints: async (...args) => {
        calls++; assert.deepEqual(args, ['alice', 0.0001, 'manual grant', 'operator', 'grant-1']);
        if (sample.failure) throw sample.failure;
        return { permanentPoints: 1.0001 };
      } },
    });
    assert.equal(result.status, sample.status);
    assert.equal(calls, sample.status === 401 || sample.status === 400 ? 0 : 1);
    if (sample.status === 200) assert.equal(result.data.ok, true);
  }
  assert.doesNotMatch(source, /pointsBilling\.setDailyPoints/);
});

test('chat and bazi preflight require points before model invocation', () => {
  const chatStart = source.indexOf("if (req.method === 'POST' && pathname === '/api/chat/send')");
  const chatEnd = source.indexOf("// POST /api/personal/chat", chatStart);
  const chat = source.slice(chatStart, chatEnd);
  assert.match(source, /requirePoints\(req\.pointsContext\.quota\)/);
  assert.match(source, /pointsBilling\.charge/);
  const baziStart = source.indexOf("pathname === '/api/bazi/parse'");
  const bazi = source.slice(baziStart, source.indexOf("// POST /api/chat/send", baziStart));
  assert.match(bazi, /requirePoints\(req\.pointsContext\.quota\)/);
  assert.match(source, /pointsBilling\.charge/);
});

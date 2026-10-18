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
  const ctx = { LLM_MAX_TOKENS: 8000, POINTS_LABEL: '消耗积分：', result: null };
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

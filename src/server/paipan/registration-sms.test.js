'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
const start = source.indexOf("  // POST /api/send-sms-code");
const end = source.indexOf('  // POST /api/register', start);
assert.ok(start >= 0 && end > start);
function route(query, send) {
  return vm.runInNewContext('(async function(body) { const req = {method:"POST"}; const pathname="/api/send-sms-code"; const res={};' + source.slice(start, end) + '})', {
    db: { query }, sendSmsVerifyCode: send,
    json: (_res, data, status = 200) => ({ data, status }), console: { error() {} },
  });
}
test('registered phone is rejected before SMS provider or cooldown', async () => {
  let sends = 0;
  const handle = route(async (sql, args) => {
    assert.equal(sql, 'SELECT phone FROM users WHERE phone = ?');
    assert.equal(args[0], '13800000000');
    return [[{ phone: '13800000000' }]];
  }, async () => { sends++; });
  const result = await handle({ phone: '13800000000' });
  assert.equal(result.status, 409);
  assert.equal(result.data.error, '该手机号已注册，请直接登录');
  assert.equal(sends, 0);
  assert.equal(result.data.cooldown, undefined);
});
test('database failure blocks SMS and returns retryable service error', async () => {
  let sends = 0;
  const handle = route(async () => { throw new Error('offline'); }, async () => { sends++; });
  assert.equal((await handle({ phone: '13800000000' })).status, 503);
  assert.equal(sends, 0);
});
test('new phone uses existing SMS success and cooldown contract', async () => {
  let result = { ok: true };
  let sends = 0;
  const handle = route(async () => [[]], async () => { sends++; return result; });
  assert.equal((await handle({ phone: '13800000000' })).status, 200);
  result = { ok: false, error: '请稍后重试', cooldown: 30 };
  const failed = await handle({ phone: '13800000000' });
  assert.equal(failed.status, 429);
  assert.equal(failed.data.cooldown, 30);
  assert.equal(sends, 2);
});
test('invalid phone never queries database or sends SMS', async () => {
  const handle = route(async () => { throw new Error('unexpected database'); }, async () => { throw new Error('unexpected SMS'); });
  assert.equal((await handle({ phone: 'bad' })).status, 400);
});

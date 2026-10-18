'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createConsultationHandler, initConsultations, promptMessages } = require('./bazi_consultations');

class Response extends EventEmitter {
  constructor() { super(); this.text = ''; this.headersSent = false; this.writableEnded = false; }
  writeHead(status, headers) { this.statusCode = status; this.headers = headers; this.headersSent = true; }
  write(text) { this.text += text; }
  end(text = '') { this.text += text; this.writableEnded = true; }
  frames() { return this.text.split('\n\n').filter(Boolean).map(x => ({ event: x.split('\n')[0].slice(7), data: JSON.parse(x.split('\n')[1].slice(6)) })); }
}

function fixture(overrides = {}, { failInsertTurn = false, lockResult, deletedSessionRows } = {}) {
  const consultations = [], turns = [], calls = [];
  const charts = [{ id: 'chart-a', user_id: 'alice', name: '甲', birth_year: 1990, birth_month: 5, birth_day: 17, birth_hour: 14, birth_minute: 30, gender: 'male' },
    { id: 'chart-b', user_id: 'bob', name: '乙', birth_year: 1980 }];
  let locked = false, id = 0, streams = 0, failSave = false;
  const faults = {}, lifecycle = [];
  function checkFailure(step) { if (faults[step]) throw new Error('mock failure: ' + step); }
  const query = async (sql, values = []) => {
    calls.push({ sql, values });
    for (const prefix of Object.keys(faults)) if (sql.startsWith(prefix)) checkFailure(prefix);
    if (sql.startsWith('SELECT GET_LOCK')) {
      if (lockResult !== undefined) return [[{ acquired: lockResult }]];
      const acquired = locked ? 0 : 1; locked = true; return [[{ acquired }]];
    }
    if (sql.startsWith('SELECT RELEASE_LOCK')) { locked = false; return [[{ released: 1 }]]; }
    if (sql.startsWith('SELECT * FROM charts')) return [charts.filter(c => c.id === values[0] && c.user_id === values[1])];
    if (sql.startsWith('SELECT * FROM bazi_consultations WHERE id')) return [consultations.filter(c => c.id === values[0] && c.user_id === values[1])];
    if (sql.startsWith('SELECT * FROM bazi_consultations WHERE user_id')) return [consultations.filter(c => c.user_id === values[0]).sort((a,b) => b.updated_at - a.updated_at)];
    if (sql.startsWith('SELECT * FROM bazi_consultation_turns WHERE user_id')) return [turns.filter(t => t.user_id === values[0] && t.request_id === values[1])];
    if (sql.startsWith('SELECT * FROM bazi_consultation_turns WHERE consultation_id')) {
      let selected = turns.filter(t => t.consultation_id === values[0] && t.user_id === values[1]);
      if (sql.includes('AND id <')) selected = selected.filter(t => t.id < Number(values[2]));
      if (sql.includes('DESC')) selected = selected.slice().reverse().slice(0, values.at(-1));
      return [selected];
    }
    if (sql.startsWith('INSERT INTO bazi_consultations')) {
      const keys = ['id','user_id','chart_id','chart_name','title','snapshot','prompt_version','created_at','updated_at'];
      consultations.push(Object.fromEntries(keys.map((k,i) => [k, values[i]]))); return [{}];
    }
    if (sql.startsWith('INSERT INTO bazi_consultation_turns')) {
      if (failInsertTurn) throw new Error('mock insert failure');
      const keys = ['consultation_id','user_id','request_id','request_hash','preset_id','user_content','assistant_content','status','created_at'];
      turns.push({ id: ++id, ...Object.fromEntries(keys.map((k,i) => [k,values[i]])) }); return [{ insertId: id }];
    }
    if (sql.startsWith('DELETE FROM bazi_consultation_turns')) {
      const retained = turns.filter(t => t.consultation_id !== values[0] || t.user_id !== values[1]);
      const affectedRows = turns.length - retained.length;
      turns.splice(0, turns.length, ...retained); return [{ affectedRows }];
    }
    if (sql.startsWith('DELETE FROM bazi_consultations')) {
      const retained = consultations.filter(c => c.id !== values[0] || c.user_id !== values[1]);
      const affectedRows = consultations.length - retained.length;
      consultations.splice(0, consultations.length, ...retained); return [{ affectedRows: deletedSessionRows ?? affectedRows }];
    }
    if (sql.startsWith('UPDATE bazi_consultation_turns')) {
      if (failSave) throw new Error('mock save failure');
      Object.assign(turns.find(t => t.id === values[3] && t.user_id === values[4]), { assistant_content: values[0], status: values[1], outcome: values[2] }); return [{}];
    }
    if (sql.startsWith('UPDATE bazi_consultations')) {
      consultations.find(c => c.id === values[1]).updated_at = values[0]; return [{}];
    }
    throw new Error('Unexpected SQL: ' + sql);
  };
  let transactionStart;
  const db = { query, getConnection: async () => {
    lifecycle.push('getConnection'); checkFailure('getConnection');
    return { query,
      beginTransaction: async () => { lifecycle.push('begin'); checkFailure('begin'); transactionStart = { consultations: structuredClone(consultations), turns: structuredClone(turns) }; },
      commit: async () => { lifecycle.push('commit'); checkFailure('commit'); transactionStart = null; },
      rollback: async () => {
        lifecycle.push('rollback'); checkFailure('rollback');
        consultations.splice(0, consultations.length, ...transactionStart.consultations);
        turns.splice(0, turns.length, ...transactionStart.turns); transactionStart = null;
      },
      release() { lifecycle.push('release'); },
      destroy() { lifecycle.push('destroy'); locked = false; },
    };
  } };
  const handler = createConsultationHandler({ db, ready: Promise.resolve(), checkAuth: req => req.user ? { username: req.user } : null,
    json: (res, data, status = 200) => { res.writeHead(status, {}); res.end(JSON.stringify(data)); },
    buildChart: params => ({ ok: true, chart: { factual: params }, thisYear: 2026, sizhu: 'server chart' }),
    checkQuota: async (username, connection) => { assert.equal(username, 'alice'); assert.equal(connection.query, query); },
    stream: async (res, opts) => {
      assert.equal(opts.billingDb.query, query);
      streams++;
      const outcome = await opts.onFinish({ fullText: 'answer', status: 'completed', billing: { status: 'charged', totalTokens: 12, pointsRemaining: 99 } });
      res.writeHead(200, {}); res.write(`event: done\ndata: ${JSON.stringify(outcome)}\n\n`); res.end();
    }, ...overrides });
  async function request(body, { user = 'alice', method = 'POST', pathname = '/api/bazi/consultations/send', search = '' } = {}) {
    const res = new Response();
    await handler({ method, user }, res, pathname, body, new URL('http://mock' + pathname + search));
    return res;
  }
  return { request, consultations, turns, charts, calls, faults, lifecycle, get streams() { return streams; }, setFailSave() { failSave = true; } };
}
const first = { chartId: 'chart-a', message: '  原始用户问题\n不改写  ', requestId: 'request_0001', presetId: 'overview' };

test('additive migration preserves all old tables; failures reject', async () => {
  const sql = [];
  await initConsultations({ query: async text => sql.push(text) });
  assert.equal(sql.length, 2); assert.ok(sql.every(s => s.startsWith('CREATE TABLE IF NOT EXISTS')));
  assert.match(sql[1], /UNIQUE KEY idx_user_request/);
  await assert.rejects(initConsultations({ query: async () => { throw new Error('db unavailable'); } }), /db unavailable/);
});

test('auth, ownership, validation, quota and failed readiness have explicit status', async () => {
  const f = fixture();
  assert.equal((await f.request(first, { user: null })).statusCode, 401);
  assert.equal((await f.request({ ...first, chartId: 'chart-b' })).statusCode, 404);
  assert.equal((await f.request({ ...first, presetId: '__proto__' })).statusCode, 400);
  assert.equal((await f.request({ ...first, consultationId: 'another' })).statusCode, 400);
  assert.equal((await f.request({ ...first, message: ' ' })).statusCode, 400);
  assert.equal((await fixture({ checkQuota: async () => { throw Object.assign(new Error('quota'), { status: 403 }); } }).request(first)).statusCode, 403);
  assert.equal((await fixture({ ready: () => Promise.reject(new Error('migration failed')) }).request(first)).statusCode, 503);
  assert.equal(f.consultations.length, 0);
});

test('actual registered quota callback uses checked-out points service and propagates 401/429/503', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
  const start = source.indexOf('const handleConsultations = baziConsultations.createConsultationHandler(');
  const registration = source.slice(start, source.indexOf('\n});', start) + 4);
  for (const sample of [{ remaining: 1, status: 200 }, { remaining: 0, status: 429 },
      { remaining: null, status: 200 }, { error: Object.assign(new Error('user missing'), { status: 401 }), status: 401 },
      { error: new Error('DB unavailable'), status: 503 }]) {
    let options, checked = false;
    vm.runInNewContext(registration, {
      baziConsultations: { createConsultationHandler: value => { options = value; } }, db: {},
      consultationReady: Promise.resolve(), consultationInitError: null, pointsReady: async () => {},
      checkAuth() {}, verifyUserTokenExists: async payload => payload, json() {}, baziChartFromParams() {}, streamBaziParse() {},
      pointsLockName: username => 'points:' + username, requirePoints: () => 1,
      pointsBilling: { getQuota: async (username, connection) => {
        checked = true; assert.equal(username, 'alice'); assert.equal(typeof connection.query, 'function');
        if (sample.error) throw sample.error;
        return { pointsRemaining: sample.remaining, tokensRemaining: sample.remaining === null ? null : 10000 };
      } },
    });
    const f = fixture({ checkQuota: options.checkQuota });
    const response = await f.request(first);
    assert.equal(response.statusCode, sample.status); assert.equal(checked, true);
    if (sample.status !== 200) { assert.equal(f.consultations.length, 0); assert.equal(f.streams, 0); }
  }
});

test('first turn insert failure rolls back consultation and never invokes model; lock released', async () => {
  const f = fixture({}, { failInsertTurn: true });
  assert.equal((await f.request(first)).statusCode, 503);
  assert.equal(f.consultations.length, 0); assert.equal(f.turns.length, 0); assert.equal(f.streams, 0);
  assert.equal(f.calls.filter(c => c.sql.startsWith('SELECT RELEASE_LOCK')).length, 1);
});

test('first send is atomic logical turn; duplicates replay once, mismatched or cross-user requests never replay', async () => {
  const f = fixture();
  const initial = await f.request(first);
  assert.equal(initial.statusCode, 200);
  assert.equal(f.consultations.length, 1); assert.equal(f.turns.length, 1);
  assert.equal(f.turns[0].user_content, first.message);
  assert.equal((await f.request(first)).frames().at(-1).data.replayed, true);
  assert.equal(f.streams, 1);
  assert.equal((await f.request({ ...first, message: 'changed' })).statusCode, 409);
  assert.equal((await f.request(first, { user: 'bob' })).statusCode, 404);
  const id = f.consultations[0].id;
  assert.equal((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations/' + id, user: 'bob' })).statusCode, 404);
  assert.equal((await f.request({ consultationId: id, message: 'stolen', requestId: 'request_stolen' }, { user: 'bob' })).statusCode, 404);
  assert.equal((await f.request({ consultationId: id, message: first.message, requestId: first.requestId })).statusCode, 409);
});

test('same chart has independent consultations; continuation uses original snapshot and full scoped history', async () => {
  const modelCalls = [];
  const f = fixture({ stream: async (res, opts) => {
    modelCalls.push(opts.messages);
    await opts.onFinish({ fullText: 'A'.repeat(450), status: 'completed', billing: { status: 'charged' } }); res.end();
  } });
  await f.request(first);
  const one = f.consultations[0].id;
  f.charts[0].birth_year = 2000;
  await f.request({ ...first, requestId: 'request_0002', message: '另一个主题' });
  await f.request({ consultationId: one, message: '继续', requestId: 'request_0003' });
  assert.equal(f.consultations.length, 2);
  assert.equal(modelCalls[1].length, 2);
  assert.equal(modelCalls[2].length, 4);
  assert.equal(modelCalls[2][1].content, first.message);
  assert.equal(modelCalls[2][2].content.length, 450);
  assert.match(modelCalls[2][0].content, /1990/);
  assert.doesNotMatch(modelCalls[2][0].content, /2000/);
  assert.equal(modelCalls[2][0].content.includes('本轮配置模板'), false);
  const history = JSON.parse((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations/' + one, search: '?limit=1' })).text);
  assert.equal(history.messages.length, 2); assert.ok(history.nextBefore);
  const older = JSON.parse((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations/' + one, search: '?limit=1&before=' + history.nextBefore })).text);
  assert.equal(older.messages[0].content, first.message);
  assert.equal(f.calls.some(c => /chat_history/.test(c.sql)), false);
});

test('list/history are user scoped and reject malformed pagination; deleted chart keeps old consultation', async () => {
  const f = fixture();
  await f.request(first);
  const id = f.consultations[0].id;
  const list = await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations' });
  assert.equal(JSON.parse(list.text).consultations[0].id, id);
  const others = await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations', user: 'bob' });
  assert.equal(JSON.parse(others.text).consultations.length, 0);
  assert.equal((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations', search: '?before=invalid' })).statusCode, 400);
  assert.equal((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations', search: '?limit=101' })).statusCode, 400);
  assert.equal((await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations/' + id, search: '?before=bad' })).statusCode, 400);
  f.charts.splice(0, 1);
  assert.equal((await f.request({ consultationId: id, message: '旧盘追问', requestId: 'request_deleted' })).statusCode, 200);
  const history = await f.request({}, { method: 'GET', pathname: '/api/bazi/consultations/' + id });
  assert.equal(JSON.parse(history.text).consultation.chartSnapshot.birth.year, 1990);
});

function deletionFixture(overrides = {}, options = {}) {
  const f = fixture({
    buildChart() { assert.fail('delete must not build charts'); },
    checkQuota() { assert.fail('delete must not check or refund quota'); },
    stream() { assert.fail('delete must not call model'); }, ...overrides,
  }, options);
  f.consultations.push({ id: 'bc_own', user_id: 'alice' }, { id: 'bc_other_own', user_id: 'alice' }, { id: 'bc_bob', user_id: 'bob' });
  f.turns.push({ id: 1, consultation_id: 'bc_own', user_id: 'alice' },
    { id: 2, consultation_id: 'bc_own', user_id: 'alice' },
    { id: 3, consultation_id: 'bc_other_own', user_id: 'alice' },
    { id: 4, consultation_id: 'bc_bob', user_id: 'bob' },
    { id: 5, consultation_id: 'bc_own', user_id: 'bob' });
  return f;
}
const deleteOptions = { method: 'DELETE', pathname: '/api/bazi/consultations/bc_own' };

test('delete requires auth and ownership, conceals missing sessions, and never invokes model', async () => {
  for (const options of [{ user: null }, { user: 'bob' }, { pathname: '/api/bazi/consultations/missing' }]) {
    const f = deletionFixture();
    const before = structuredClone([f.consultations, f.turns]);
    const res = await f.request(undefined, { ...deleteOptions, ...options });
    assert.equal(res.statusCode, options.user === null ? 401 : 404);
    assert.deepEqual(JSON.parse(res.text), { error: options.user === null ? '请先登录' : '咨询不存在' });
    assert.deepEqual([f.consultations, f.turns], before);
    assert.equal(f.calls.some(c => c.sql.startsWith('DELETE')), false);
    if (options.user === null) assert.deepEqual(f.lifecycle, []);
    else {
      assert.deepEqual(f.lifecycle, ['getConnection', 'begin', 'rollback', 'release']);
      assert.equal(f.calls.filter(c => c.sql.startsWith('SELECT RELEASE_LOCK')).length, 1);
    }
  }
});

test('delete commits only own consultation and its own turns; chart, other sessions/history and quota stay untouched', async () => {
  const f = deletionFixture();
  const charts = structuredClone(f.charts);
  const res = await f.request(undefined, deleteOptions);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.text), { ok: true, id: 'bc_own' });
  assert.deepEqual(f.consultations.map(c => c.id), ['bc_other_own', 'bc_bob']);
  assert.deepEqual(f.turns.map(t => t.id), [3, 4, 5]);
  assert.deepEqual(f.charts, charts);
  assert.deepEqual(f.lifecycle, ['getConnection', 'begin', 'commit', 'release']);
  assert.equal(f.streams, 0);
  assert.deepEqual(f.calls.filter(c => c.sql.startsWith('DELETE')).map(c => c.sql), [
    'DELETE FROM bazi_consultation_turns WHERE consultation_id = ? AND user_id = ?',
    'DELETE FROM bazi_consultations WHERE id = ? AND user_id = ?',
  ]);
  assert.ok(f.calls.every(c => !/charts|chat_history|users|analyses|mhys|liuyao/.test(c.sql)));
  assert.equal((await f.request(undefined, deleteOptions)).statusCode, 404);
});

test('delete DB failures explicitly return 503 and roll back child deletion, always cleaning up lock/connection', async () => {
  for (const step of ['getConnection', 'SELECT GET_LOCK', 'begin', 'SELECT * FROM bazi_consultations WHERE id',
    'DELETE FROM bazi_consultation_turns', 'DELETE FROM bazi_consultations', 'commit']) {
    const f = deletionFixture();
    const before = structuredClone([f.consultations, f.turns]);
    f.faults[step] = true;
    const res = await f.request(undefined, deleteOptions);
    assert.equal(res.statusCode, 503, step);
    assert.deepEqual(JSON.parse(res.text), { error: '咨询服务暂不可用，请稍后重试' });
    assert.deepEqual([f.consultations, f.turns], before, step);
    if (step !== 'getConnection') {
      assert.equal(f.lifecycle.at(-1), 'release', step);
      assert.equal(f.calls.filter(c => c.sql.startsWith('SELECT RELEASE_LOCK')).length, 1, step);
    }
    if (!['getConnection', 'SELECT GET_LOCK', 'begin'].includes(step)) assert.ok(f.lifecycle.includes('rollback'), step);
  }
  const unavailable = deletionFixture({ ready: async () => { throw new Error('migration unavailable'); } });
  assert.equal((await unavailable.request(undefined, deleteOptions)).statusCode, 503);
  assert.deepEqual(unavailable.lifecycle, []);
});

test('delete handles SQL lock NULL as unavailable, not busy; unexpected affected rows roll back', async () => {
  const unavailable = deletionFixture({}, { lockResult: null });
  const before = structuredClone([unavailable.consultations, unavailable.turns]);
  assert.equal((await unavailable.request(undefined, deleteOptions)).statusCode, 503);
  assert.deepEqual([unavailable.consultations, unavailable.turns], before);
  assert.equal(unavailable.calls.some(c => c.sql.startsWith('DELETE')), false);
  assert.equal(unavailable.calls.some(c => c.sql.startsWith('SELECT RELEASE_LOCK')), false);
  assert.deepEqual(unavailable.lifecycle, ['getConnection', 'release']);
  for (const deletedSessionRows of [0, 2]) {
    const f = deletionFixture({}, { deletedSessionRows });
    const state = structuredClone([f.consultations, f.turns]);
    assert.equal((await f.request(undefined, deleteOptions)).statusCode, 503);
    assert.deepEqual([f.consultations, f.turns], state);
    assert.deepEqual(f.lifecycle, ['getConnection', 'begin', 'rollback', 'release']);
  }
});

test('delete rollback or lock-release failure destroys connection instead of pooling unsafe state', async () => {
  const rollback = deletionFixture();
  rollback.faults['DELETE FROM bazi_consultations'] = true;
  rollback.faults.rollback = true;
  assert.equal((await rollback.request(undefined, deleteOptions)).statusCode, 503);
  assert.equal(rollback.lifecycle.at(-1), 'destroy');
  assert.equal(rollback.lifecycle.includes('release'), false);
  const release = deletionFixture();
  release.faults['SELECT RELEASE_LOCK'] = true;
  assert.equal((await release.request(undefined, deleteOptions)).statusCode, 200);
  assert.equal(release.lifecycle.at(-1), 'destroy');
  assert.equal(release.lifecycle.includes('release'), false);
});

test('delete uses send lock: active mocked model request gets busy409 without deleting or releasing its lock', async () => {
  let entered, unblock;
  const started = new Promise(resolve => { entered = resolve; });
  const waiting = new Promise(resolve => { unblock = resolve; });
  const f = fixture({ stream: async (res, opts) => {
    entered(); await waiting;
    await opts.onFinish({ fullText: 'mock', status: 'completed', billing: { status: 'charged' } }); res.end();
  } });
  const sending = f.request(first);
  await started;
  const id = f.consultations[0].id;
  try {
    for (let i = 0; i < 2; i++) {
      const res = await f.request(undefined, { ...deleteOptions, pathname: '/api/bazi/consultations/' + id });
      assert.equal(res.statusCode, 409);
      assert.deepEqual(JSON.parse(res.text), { error: '已有咨询正在生成，请稍后重试' });
    }
    assert.equal(f.calls.some(c => c.sql.startsWith('DELETE')), false);
    assert.equal(f.calls.some(c => c.sql.startsWith('SELECT RELEASE_LOCK')), false);
    const lockNames = f.calls.filter(c => c.sql.startsWith('SELECT GET_LOCK')).map(c => c.values[0]);
    assert.equal(new Set(lockNames).size, 1);
  } finally { unblock(); await sending; }
  assert.equal((await f.request(undefined, { ...deleteOptions, pathname: '/api/bazi/consultations/' + id })).statusCode, 200);
  assert.equal(f.consultations.length, 0); assert.equal(f.turns.length, 0);
});

test('effective model history skips unanswered attempts but retains marked partial pairs without truncating', () => {
  const messages = promptMessages({ chart: 'facts' }, [
    { user_content: 'failed question', assistant_content: '', status: 'failed' },
    { user_content: 'pending question', assistant_content: '', status: 'pending' },
    { user_content: 'partial question', assistant_content: 'X'.repeat(500), status: 'partial' },
  ], 'current raw', null);
  assert.equal(messages.length, 4);
  assert.equal(messages[1].content, 'partial question');
  assert.match(messages[2].content, /partial/); assert.ok(messages[2].content.endsWith('X'.repeat(500)));
  assert.equal(messages[3].content, 'current raw');
});

test('concurrent first sends reject with 409 instead of duplicate model or charge', async () => {
  let started, release;
  const entered = new Promise(resolve => { started = resolve; });
  const waiting = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const f = fixture({ stream: async (res, opts) => { calls++; started(); await waiting;
    await opts.onFinish({ fullText: 'ok', status: 'completed', billing: { status: 'charged' } }); res.end(); } });
  const sending = f.request(first);
  await entered;
  assert.equal((await f.request(first)).statusCode, 409);
  release(); await sending;
  assert.equal(calls, 1); assert.equal(f.consultations.length, 1);
});

test('stored failed/partial/stopped terminal outcomes replay; pending cannot repeat model', async () => {
  for (const status of ['failed', 'partial', 'stopped']) {
    const f = fixture({ stream: async (res, opts) => { await opts.onFinish({ fullText: status === 'failed' ? '' : 'some', status, billing: { status: 'not_charged' } }); res.end(); } });
    await f.request(first);
    const replay = await f.request(first);
    assert.equal(replay.frames().at(-1).data.status, status);
    f.turns[0].status = 'pending';
    assert.equal((await f.request(first)).statusCode, 409);
  }
});

// Exercise the real shared streaming function without importing the startup server,
// connecting DB, reading credentials, or contacting a model. Only boundary globals mock.
function streamFixture({ chunks = [], throwStream = false, failBilling = false, failSave = false, stop = false } = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
  const functionSource = source.slice(source.indexOf('async function streamBaziParse('), source.indexOf('\n/**\n * 把一条解读写进', source.indexOf('async function streamBaziParse(')));
  let charges = 0, received, aborted = false;
  const res = new Response();
  const context = { require: name => { assert.equal(name, 'openai'); return class {
    constructor() { this.chat = { completions: { create: async (params, options) => {
      received = params;
      options.signal.addEventListener('abort', () => { aborted = true; });
      return (async function* () {
        for (const chunk of chunks) { yield chunk; if (stop) { res.destroyed = true; res.emit('close'); throw new Error('aborted'); } }
        if (throwStream) throw new Error('upstream failed');
      })();
    } } }; }
  }; }, config: { deepseek: { apiKey: 'mock', baseURL: 'http://mock' } },
  LLM_MODEL: 'mock-model', LLM_MAX_TOKENS: 500, LLM_REASONING_EFFORT: 'low', BAZI_REPORT_TEMPERATURE: 0.3,
  EMPTY_UPSTREAM_NOTICE: 'empty', AbortController, console: { error() {} },
  estimateTokens: text => text.length, requirePoints: () => 500,
  pointsTrailer: () => '\nlegacy billing trailer',
  pointsBilling: { charge: async (_username, usage) => {
    charges++; if (failBilling) throw new Error('billing failed');
    assert.equal(usage.billingDate, '2026-01-01');
    return { totalTokens: usage.inputTokens + usage.outputTokens, pointsCharged: 0.0012,
      pointsRemaining: 9, pointsLimit: 10, chargeBillingDate: usage.billingDate };
  } }, db: {}, baziConsultations: require('./bazi_consultations') };
  const stream = vm.runInNewContext('(' + functionSource + ')', context);
  let saved;
  const run = (legacy = false) => stream(res, { username: 'alice', systemPrompt: 'system', userPrompt: 'question',
    requestId: 'request_test', pointsQuota: { billingDate: '2026-01-01', tokensRemaining: 100000 },
    ...(legacy ? {} : { protocol: 'consultation-v1', messages: [{ role: 'system', content: 'scope' }, { role: 'user', content: 'raw' }], consultationId: 'bc_test', requestId: 'request_test' }),
    onFinish: async result => { saved = result; if (failSave) throw new Error('save failed'); return { consultationId: 'bc_test', requestId: 'request_test', status: result.status, billing: result.billing, save: { status: 'saved' } }; },
  });
  return { res, run, get charges() { return charges; }, get saved() { return saved; }, get received() { return received; }, get aborted() { return aborted; } };
}
const content = text => ({ choices: [{ delta: { content: text } }] });
const finish = reason => ({ choices: [{ delta: {}, finish_reason: reason }], usage: { prompt_tokens: 5, completion_tokens: 7, total_tokens: 12 } });

test('real shared stream: explicit SSE, usage, terminal save, full messages, and legacy wire regression', async () => {
  const f = streamFixture({ chunks: [content('答案'), finish('stop')] });
  await f.run();
  assert.equal(f.received.messages.length, 2); assert.equal(f.received.messages[1].content, 'raw');
  const frames = f.res.frames();
  assert.equal(frames[0].data.consultationId, 'bc_test'); assert.equal(frames[0].data.text, '');
  assert.equal(frames[1].data.text, '答案');
  assert.equal(frames.at(-1).data.status, 'completed');
  assert.equal(frames.at(-1).data.billing.totalTokens, 12);
  assert.equal(frames.at(-1).data.save.status, 'saved'); assert.equal(f.charges, 1);
  const legacy = streamFixture({ chunks: [content('答案'), finish('stop')] });
  await legacy.run(true);
  assert.equal(legacy.res.text, '答案\nlegacy billing trailer'); assert.equal(legacy.charges, 1);
});

test('real shared stream: partial, empty, upstream failure, stopped, billing/save failures are not successful completion', async () => {
  const cases = [
    [{ chunks: [content('part'), finish('length')] }, 'partial', 'charged'],
    [{ chunks: [content('part')], throwStream: true }, 'partial', 'charged'],
    [{ chunks: [content('part')] }, 'partial', 'charged'],
    [{ chunks: [finish('stop')] }, 'failed', 'not_charged'],
    [{ throwStream: true }, 'failed', 'not_charged'],
    [{ chunks: [content('part')], stop: true }, 'stopped', 'not_charged'],
  ];
  for (const [options, expected, billing] of cases) {
    const f = streamFixture(options); await f.run();
    assert.equal(f.saved.status, expected); assert.equal(f.saved.billing.status, billing);
    if (expected === 'stopped') assert.equal(f.aborted, true);
    else assert.equal(f.res.frames().at(-1).data.status, expected);
  }
  const failedBilling = streamFixture({ chunks: [content('answer'), finish('stop')], failBilling: true });
  await failedBilling.run(); assert.equal(failedBilling.res.frames().at(-1).data.billing.status, 'unknown');
  const failedSave = streamFixture({ chunks: [content('answer'), finish('stop')], failSave: true });
  await failedSave.run(); assert.equal(failedSave.res.frames().at(-1).data.save.status, 'failed');
  assert.equal(failedSave.charges, 1);
});

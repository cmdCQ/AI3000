'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
function authFunctions(db) {
  const start = source.indexOf('async function withUserWriteLock(');
  const end = source.indexOf('// ===== Schema Migration', start);
  return vm.runInNewContext(source.slice(start, end) + '\n({verifyUserTokenExists,withUserWriteLock})', {
    db, pointsLockName: user => 'points:' + user, console,
  });
}
test('actual auth invalidates missing, ambiguous, recreated and equal-millisecond accounts', async () => {
  let rows = [{ username: 'alice', created_at: 100 }];
  const api = authFunctions({ query: async () => [rows] });
  const token = { username: 'alice', iat: 101 };
  assert.equal(await api.verifyUserTokenExists(token), token);
  assert.equal(await api.verifyUserTokenExists({ username: 'alice' }), null);
  assert.equal(await api.verifyUserTokenExists({ username: 'alice', iat: 100 }), null);
  rows = [];
  assert.equal(await api.verifyUserTokenExists(token), null);
  rows = [{ username: 'alice', created_at: 102 }];
  assert.equal(await api.verifyUserTokenExists(token), null);
  rows.push({ username: 'other', created_at: 1 });
  assert.equal(await api.verifyUserTokenExists(token), null);
});
test('actual write lock rechecks auth before writes and releases on rejection', async () => {
  const calls = [];
  const connection = {
    async query(sql) {
      calls.push(sql);
      if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
      return [[]];
    }, release() { calls.push('release'); }, destroy() { calls.push('destroy'); },
  };
  const api = authFunctions({ getConnection: async () => connection });
  let writes = 0;
  await assert.rejects(api.withUserWriteLock('alice', async () => { writes++; }, { username: 'alice', iat: 101 }), { status: 401 });
  assert.equal(writes, 0);
  assert.ok(calls.some(sql => sql.startsWith('SELECT RELEASE_LOCK')));
  assert.equal(calls.at(-1), 'release');
  await api.withUserWriteLock('alice', async () => { writes++; });
  assert.equal(writes, 1); // SMS reset performs its own snapshot recheck under this lock.
});

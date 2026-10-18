'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
const start = source.indexOf("  if (req.method === 'POST' && pathname === '/api/reset-password')");
const end = source.indexOf('  // GET /api/me', start);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('res','req','pathname','body','db','json','verifySmsCode','hashPassword','pointsReady','withUserWriteLock',source.slice(start,end));
test('actual password reset awaits canonical lock and rejects recreated account', async () => {
  for (const recreated of [false, true]) {
    let updated = false;
    const account = { username: 'alice', phone: '13800000000', created_at: 100 };
    const connection = { query: async sql => {
      if (sql.startsWith('SELECT')) return [[{ ...account, created_at: recreated ? 200 : 100 }]];
      await Promise.resolve(); updated = true; return [{ affectedRows: 1 }];
    }};
    const result = await run({}, {method:'POST'}, '/api/reset-password', {phone:account.phone,code:'123456',newPassword:'password'},
      {query:async()=>[[account]]}, (_res,data,status=200)=>({data,status}), ()=>({ok:true}), ()=> 'hashed', async()=>{},
      async (username,callback,payload)=> { assert.equal(username,'alice'); assert.equal(payload,undefined); return callback(connection); });
    assert.equal(result.status,recreated?404:200);
    assert.equal(updated,!recreated);
  }
});

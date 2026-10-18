'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('announcement route returns the single local Markdown source without external fetch', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../auth-server.js'), 'utf8');
  const markdown = fs.readFileSync(path.join(__dirname, 'announcement.md'), 'utf8');
  const start = source.indexOf('  // GET /api/announcement');
  const end = source.indexOf('  // POST /api/wechat/login', start);
  let result;
  const handle = vm.runInNewContext('(async () => {' + source.slice(start, end) + '})', {
    req: { method: 'GET' }, pathname: '/api/announcement', res: {}, ANNOUNCEMENT_MD: markdown,
    json: (_res, value) => { result = value; },
  });
  await handle();
  assert.equal(result.content, markdown);
  assert.match(source, /fs\.readFileSync\(path\.join\(__dirname, 'paipan', 'announcement\.md'\), 'utf8'\)/);
  assert.doesNotMatch(source, /share\.weiyun\.com|refreshAnnCache|ANN_CACHE_FILE|annCache/);
  assert.match(markdown, /每日 10 积分/);
  assert.match(markdown, /每日 50 积分/);
  assert.doesNotMatch(markdown, /token|10000|小数点|取整/i);
  assert.doesNotMatch(markdown, /即将上线|AI 对话|微云/);
});

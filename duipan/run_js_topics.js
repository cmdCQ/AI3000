/**
 * 对拍 · JS 侧：事项匹配 + 用神取定表（层 6c）。纯函数层，不装卦。
 *
 * 用法：node run_js_topics.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const Y = require(path.join(PAIPAN, 'yongshen.js'));

const goldenPath = process.argv[2] || path.join(__dirname, 'golden_topics.json');
const outPath = process.argv[3] || path.join(__dirname, 'js_topics.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

const out = { match: {}, yong_shen: {}, priority: {} };

for (const key of Object.keys(golden.match)) {
  // key 形如 `<事项>|<关键词>` 或 `无关键词|<问句>`
  const q = key.slice(key.indexOf('|') + 1);
  out.match[key] = Y.matchTopic(q);
}

for (const key of Object.keys(golden.yong_shen)) {
  const [topic, gender, proxy] = key.split('|');
  out.yong_shen[key] = Y.getYongShen(topic, gender, proxy === '1');
}

for (const key of Object.keys(golden.priority)) {
  const [et, q] = key.split('|');
  out.priority[key] = Y.resolveTopic(et === '(空)' ? '' : et, q);
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
const n = Object.keys(out.match).length + Object.keys(out.yong_shen).length
        + Object.keys(out.priority).length;
console.log(`已写 ${outPath}（${n} 条）`);

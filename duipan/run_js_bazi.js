#!/usr/bin/env node
/**
 * 八字排盘核 JS 侧跑批：读 golden_bazi.json 的样例输入，用 `paipan/bazi.js` 排盘，
 * 输出 `{ "<样例 id>": <chart> }`（与 golden_meihua.json 同形，供 diff.py 用）。
 *
 * 用法：
 *   node duipan/run_js_bazi.js > duipan/js_bazi.json
 *
 * 注意：这里**只排盘**（buildChart），不含 analyzeChart —— 3.5.1 分两步对拍：
 *   3.5.1a 排盘核（本脚本） 3.5.1b 十神/旺衰/格局/神煞（analyzeChart）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'build/backend/paipan/bazi.js'));

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, 'golden_bazi.json'), 'utf8'));
const cases = golden.cases || [];

const out = {};
for (const c of cases) {
  const i = c.input;
  // 传 `{y,mo,d,h,mi}`（ganzhi.normalize 的形状）——不是 {year,month,...}，键名错会抛
  out[c.id] = B.buildChart({ y: i.year, mo: i.month, d: i.day, h: i.hour, mi: i.minute });
}

process.stdout.write(JSON.stringify(out, null, 1));
process.stderr.write(`✓ 排盘 ${Object.keys(out).length} 例\n`);

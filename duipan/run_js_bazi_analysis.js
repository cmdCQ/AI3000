#!/usr/bin/env node
/**
 * 八字静态分析层（3.5.1b）JS 侧跑批：读 `golden_bazi_analysis.json` 的样例输入，
 * 排盘 + `analyzeChart`，输出 `{ "<样例 id>": {<分析字段>} }`。
 *
 * 输出形状**必须与金标准逐键对齐**（`pillar_shishen` 折出来的那套）——对拍脚本按字段集
 * 断言，少一个字段会显形，不会被静默跳过。
 *
 * 用法：node duipan/run_js_bazi_analysis.js > duipan/js_bazi_analysis.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'build/backend/paipan/bazi.js'));

const PILLARS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];
const TOP = ['shishen_summary', 'strength_info', 'strength',
  'pattern_info', 'pattern', 'pattern_desc', 'shensha'];

const golden = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'golden_bazi_analysis.json'), 'utf8'));
const cases = golden.cases || [];

const out = {};
for (const c of cases) {
  const i = c.input;
  const chart = B.buildChart({ y: i.year, mo: i.month, d: i.day, h: i.hour, mi: i.minute });
  B.analyzeChart(chart);
  const row = {
    pillar_shishen: {},
  };
  for (const p of PILLARS) {
    row.pillar_shishen[p] = {
      shishen_gan: chart[p].shishen_gan || '',
      shishen_zhi: chart[p].shishen_zhi || '',
    };
  }
  for (const k of TOP) row[k] = chart[k];
  out[c.id] = row;
}

process.stdout.write(JSON.stringify(out, null, 1));
process.stderr.write(`✓ 分析 ${Object.keys(out).length} 例\n`);

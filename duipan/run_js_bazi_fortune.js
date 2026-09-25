#!/usr/bin/env node
/**
 * 八字大运/流年层（3.5.2）JS 侧跑批。产出两个**被验方**文件：
 *
 *   duipan/js_bazi_fortune.json  `{id: {dayun, liunian, liuyue, liuri, liushi}}`
 *   duipan/js_bazi_start.json    `{id: {params, age, raw, forward, jie_name, jie_at}}`
 *
 * 参数（gender / query_*）**从金标准读**，不按序号自己重算：重算就是第二份实现，
 * 两侧一旦错开，「有差异」就分不清是移植错了还是输入不同了。出生时刻取自
 * `golden_bazi.json`（与生成器同一来源），`params` 取自 `golden_bazi_start.json`，
 * 两个 id 集合必须严丝合缝。
 *
 * `calculateFortune` 就是端点 `get_fortune` 的参数装配（见 `bazi_fortune.js` 头注），
 * 故这里一行就等价于「用 JS 跑一遍 `/api/v1/bazi/fortune`（不含 combos 层）」。
 *
 * 用法：node duipan/run_js_bazi_fortune.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'build/backend/paipan/bazi.js'));
const F = require(path.join(ROOT, 'build/backend/paipan/bazi_fortune.js'));

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));

const cases = readJson('golden_bazi.json').cases || [];
const goldStart = readJson('golden_bazi_start.json');

const inputs = new Map(cases.map((c) => [c.id, c.input]));

const missing = Object.keys(goldStart).filter((id) => !inputs.has(id));
if (missing.length) {
  throw new Error(`golden_bazi_start.json 里 ${missing.length} 个 id 在 golden_bazi.json 里`
    + `找不到出生输入，例如 ${missing.slice(0, 3)}`);
}

const fortuneOut = {};
const startOut = {};

for (const [id, st] of Object.entries(goldStart)) {
  const i = inputs.get(id);
  const p = st.params;

  const chart = B.buildChart({ y: i.year, mo: i.month, d: i.day, h: i.hour, mi: i.minute });
  B.analyzeChart(chart);

  fortuneOut[id] = F.calculateFortune(chart, p.gender, i.year, {
    year: p.query_year, month: p.query_month, day: p.query_day,
  });

  // 起运诊断：与金标准同源的量，`raw` 保留**未舍入**值，供对拍算残差。
  // `jie_at` 只用 `target.at`（`toYmdHms()` 的整秒串）—— 与金标准同粒度；
  // 金标准那边已把亚秒截掉再算 `raw`，两侧才对得上（见 gen_…py::start_diag 的注）。
  const s = F.dayunStartAgeRaw(chart.birth_dt, p.gender, chart.year_pillar.tiangan);
  startOut[id] = {
    // params 原样回抄：对拍脚本据此断言两侧用的是同一组输入
    // （不等就是「输入不同」，不是「结果不同」——这两种要分开报）。
    params: p,
    age: F.pyRound(s.age, 2),
    raw: s.target ? s.age : null,
    forward: s.forward,
    jie_name: s.target ? s.target.name : null,
    jie_at: s.target ? s.target.at : null,
    fallback: !s.target,
  };
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'js_bazi_fortune.json'),
  JSON.stringify(fortuneOut, null, 1), 'utf8');
fs.writeFileSync(path.join(outDir, 'js_bazi_start.json'),
  JSON.stringify(startOut, null, 1), 'utf8');

process.stderr.write(`✓ 大运/流年 ${Object.keys(fortuneOut).length} 例`
  + `（起运诊断 ${Object.keys(startOut).length} 例）\n`);

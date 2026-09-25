/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/bazi_combos.js`（3.5.3d 组合断层）。
 *
 * ── 摘要一律不在这里算 ──
 * 这里只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责
 * （金标准生成器的 `canon`）。两边各写一个摘要函数，就多一处「错得一样才看不出来」
 * 的漂移点。
 *
 * ── 样例与输入都从金标准读 ──
 * 本层的好几个家族（神煞名单子集、格局×十神子集、地支轮转盘）在 JS 里重写一遍
 * 就等于多一处可能对不齐的构造逻辑。金标准的 `cases[i].in` 就是两侧**逐字相同**的输入，
 * 直接拿来用。全局只保留一处构造逻辑：`buildChartFromGz`（与 Python 侧 `chart_from_gz` 同形）。
 *
 * 用法：node run_js_bazi_combos.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const B = require(path.join(PAIPAN, 'bazi.js'));
const CB = require(path.join(PAIPAN, 'bazi_combos.js'));
const T = require(path.join(PAIPAN, 'bazi_tables.js'));

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/** 四柱干支（四个两字串）→ chart。与金标准 `chart_from_gz` 同形。 */
function buildChartFromGz(gz) {
  const ch = {};
  PILLAR_KEYS.forEach((k, i) => {
    const g = gz[i];
    if (typeof g !== 'string' || g.length !== 2) {
      throw new Error(`第 ${i} 柱干支不是两字：${JSON.stringify(g)}`);
    }
    const dz = g[1];
    ch[k] = { tiangan: g[0], dizhi: dz, canggan: (T.CANGGAN[dz] || []).slice() };
  });
  ch.day_master = gz[2][0];
  return ch;
}

/** 逐期断要的最小盘 —— 与 Python 侧 `chart_min` 同形。 */
function chartMin(dm, strength, primary) {
  return { day_master: dm, strength, tiaohou: { primary } };
}

/** 按 kind 调本模块的对应函数。与 Python 侧 `run_case` 同构。 */
function runCase(c) {
  const k = c.kind;
  const i = c.in;
  if (k === 'chart') {
    const ch = buildChartFromGz(i.gz);
    B.analyzeChart(ch);
    return { combos: CB.baziCombos(ch) };
  }
  if (k === 'sha') {
    return { combos: CB.shenshaCombos({ shensha: i.names.map((n) => ({ name: n })) }) };
  }
  if (k === 'geju') {
    const ch = {
      pattern: i.pattern, strength: i.strength,
      shishen_summary: i.shishen.map((s) => ({ shishen: s })),
    };
    return { geju: CB.evaluateGeju(ch) };
  }
  if (k === 'suiyun') {
    const ch = {};
    PILLAR_KEYS.forEach((key, n) => { ch[key] = { dizhi: i.zhis[n] }; });
    const dy = i.dy; const ln = i.ln;
    return { suiyun: CB.analyzeSuiyun(ch, dy[0], dy[1], ln[0], ln[1]) };
  }
  if (k === 'xiji') {
    const ch = chartMin(i.dm, i.strength, i.primary);
    const dy = i.dy; const ln = i.ln;
    return {
      liunian_combo: CB.analyzeLiunianCombo(ch, dy[0], dy[1], ln[0], ln[1]),
      period_combo: CB.analyzePeriodCombo(ch, dy[0], dy[1], ln[0], ln[1], '流月', '流年'),
    };
  }
  if (k === 'period') {
    const ch = chartMin(i.dm, i.strength, i.primary);
    let pGan = null; let pZhi = null;
    if (typeof i.parent === 'string' && i.parent.length === 2) {
      pGan = i.parent[0]; pZhi = i.parent[1];
    } else if (i.parent === '') {
      pGan = ''; pZhi = '';
    }
    const cur = i.cur;
    return {
      period_combo: CB.analyzePeriodCombo(ch, pGan, pZhi, cur[0], cur[1],
        i.label, i.parent_label),
    };
  }
  throw new Error(`未知 kind：${k}`);
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_combos.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_combos.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const cases = golden.cases;
  if (!Array.isArray(cases) || !cases.length) throw new Error('金标准没有 cases');
  const schema = golden.meta.families;

  const outs = {};
  const shapes = {};                     // kind -> {outname: [每种出现过的键集]}，与金标准同格式
  for (const k of Object.keys(schema)) outs[k] = [];

  cases.forEach((c, idx) => {
    const r = runCase(c);
    const want = schema[c.kind];
    const got = Object.keys(r);
    if (want.length !== got.length || !want.every((x) => got.includes(x))) {
      throw new Error(`第 ${idx} 例（${c.id}）输出键不契约：期望 ${want} 实得 ${got}`);
    }
    outs[c.kind].push(r);
    // 形状集：与金标准 `meta.shapes` 逐字比 —— 少一种形状（例如格局的 available:false 那态）
    // 会让后面的摘要以「差异」的面目出现，先在闸门挡住
    const slot = (shapes[c.kind] = shapes[c.kind] || {});
    for (const name of got) {
      const ks = Object.keys(r[name]).sort();
      const list = (slot[name] = slot[name] || []);
      if (!list.some((x) => x.length === ks.length && x.every((v, n) => v === ks[n]))) {
        list.push(ks);
      }
    }
  });

  fs.writeFileSync(outPath, JSON.stringify({ schema, shapes, outs }));
  const total = Object.values(outs).reduce((n, a) => n + a.length, 0);
  console.log(`✓ JS 侧 ${total} 例：` + Object.entries(outs)
    .map(([k, a]) => `${k} ${a.length}`).join(' · '));
  console.log('  形状：' + Object.entries(shapes).map(([k, m]) => `${k} ` + Object.entries(m)
    .map(([n, l]) => `${n}×${l.length}`).join(',')).join(' · '));
}

main();

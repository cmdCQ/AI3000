/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/bazi_applications.js`（3.5.4a 八字应用层）。
 *
 * ── 摘要一律不在这里算 ──
 * 只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责（金标准的 `canon`）。
 * 两边各写一个摘要函数，就多一处「错得一样才看不出来」的漂移点。
 *
 * ── 样例与输入都从金标准读 ──
 * `field` / `pos` 两族要「直接指定 strength 与 shishen_summary」，这属于**构造**逻辑；
 * 若在 JS 里重写一遍就多一处可能对不齐的地方。金标准 `cases[i].in` 就是两侧逐字相同的
 * 输入，直接拿来用。全局只保留一处构造：`buildChartFromGz`（与 Python `chart_from_gz` 同形）。
 *
 * ── 「不包 try/except」这条差异在比对侧的体现 ──
 * `bazi_applications.js` 的装配体刻意不包异常（见该文件头）。所以这里**不做任何兜底**：
 * 真抛了就让它把整个 runner 炸掉 —— 那正是我们要的「红」，不是安静地少一个键。
 *
 * 用法：node run_js_bazi_applications.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const A = require(path.join(PAIPAN, 'bazi_applications.js'));
const B = require(path.join(PAIPAN, 'bazi.js'));
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

/** 定向盘：四柱由干支定，`strength` 与 `shishen_summary` **直接指定**（同 `chart_field`）。 */
function chartField(i) {
  const ch = buildChartFromGz(i.gz);
  ch.strength = i.strength;
  ch.shishen_summary = i.ss.map(([s, st]) => ({ shishen: s, stems: st.slice() }));
  return ch;
}

/** 六个输出名 —— 与生成器 `_ss_out` 逐字同构（含 aspects_m / aspects_f 两个装配体）。 */
function ssOut(ch) {
  return {
    career: A.careerAnalysis(ch),
    wealth: A.wealthAnalysis(ch),
    health: A.healthAnalysis(ch),
    marriage_m: A.marriageAnalysis(ch, 'male'),
    marriage_f: A.marriageAnalysis(ch, 'female'),
    aspects_m: A.buildLifeAspects(ch, 'male'),
    aspects_f: A.buildLifeAspects(ch, 'female'),
  };
}

/** 按 kind 调本模块的对应函数。与 Python 侧 `run_case` 同构。 */
function runCase(c) {
  const k = c.kind;
  const i = c.in;
  if (k === 'chart') {
    // 真实链路：干支 → 盘 → analyzeChart（补齐 strength / shishen_summary 等）
    const ch = buildChartFromGz(i.gz);
    B.analyzeChart(ch);
    return ssOut(ch);
  }
  if (k === 'field' || k === 'pos') {
    return ssOut(chartField(i));
  }
  if (k === 'gender') {
    return { marriage: A.marriageAnalysis(chartField(i), i.gender) };
  }
  throw new Error(`未知 kind：${k}`);
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_applications.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_applications.json');
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
    // 形状集：与金标准 `meta.shapes` 逐字比 —— 少一种形状（例如空串 strength 那态）
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

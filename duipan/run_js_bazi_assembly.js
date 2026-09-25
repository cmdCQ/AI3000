/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/`（3.5.4b 总断那一串）。
 *
 * ── 摘要一律不在这里算 ──
 * 只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责（金标准的 `canon`）。
 * 两边各写一个摘要函数，就多一处「错得一样才看不出来」的漂移点。
 *
 * ── 五个家族各自的入口 ──
 *   `cf`  `pickCurrentFortune`（**纯**函数，大运/流年由用例传入）
 *   `ov`  `synthesizeOverview`   `sy` `synthesizeMingju`   `ms` `buildMasterSynthesis`
 *   `asm` `bazi.js::buildChart` + `analyzeChart` + `bazi_full.js::assembleFull`
 *         —— 生产路径，逐字对齐金标准那一侧的真端点。
 *
 * ── 用例里有两个字段**本 runner 刻意不读**（`asm` 族的 `gz` 与 `inject`）──
 * `gz`：金标准用它逐例断言「端点起出的四柱 = 预期干支」，即「两侧历书在此时刻同盘」。
 *       本项目这一侧的四柱是由同一批 `y/mo/d/h/mi` 现算的，读 `gz` 就成了自证。
 * `inject`：金标准本轮喂给**基准**历法的固定大运/流年表（为的是绕开层 9 已申报的口径偏离）。
 *       基准算出的 `current_fortune` 整块经 `in.currentFortune` 传过来，
 *       本层只验「挂上去 + 下游消费」，不重算它。
 * 两者都是**记录**而非输入。若哪天发现 runner 需要读它们，说明分层被搞乱了。
 *
 * 用法：node run_js_bazi_assembly.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const B = require(path.join(PAIPAN, 'bazi.js'));
const FULL = require(path.join(PAIPAN, 'bazi_full.js'));
const CF = require(path.join(PAIPAN, 'current_fortune.js'));
const OV = require(path.join(PAIPAN, 'overview.js'));
const SY = require(path.join(PAIPAN, 'synthesis.js'));
const MS = require(path.join(PAIPAN, 'master_synthesis.js'));
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

function runCase(c) {
  const k = c.kind;
  const i = c.in;
  if (k === 'cf') {
    // 真实链路：干支 → 盘 → analyzeChart（补齐 strength / shishen_summary 等），
    // 再挂上用例题给的 `yong_shen`（`assembleFull` 之外的那一件，两边都显式设）。
    const ch = buildChartFromGz(i.gz);
    B.analyzeChart(ch);
    if (Object.prototype.hasOwnProperty.call(i, 'yong_shen')) ch.yong_shen = i.yong_shen;
    return { cf: CF.pickCurrentFortune(ch, i.gender, i.birthYear, i.currentYear,
      i.dayun || [], i.liunian || []) };
  }
  if (k === 'ov') return { ov: OV.synthesizeOverview(i.chart) };
  if (k === 'sy') return { sy: SY.synthesizeMingju(i.chart) };
  if (k === 'ms') return { ms: MS.buildMasterSynthesis(i.chart, i.moment) };
  if (k === 'asm') {
    // ⚠ 走 `buildBaziFull`（= 生产入口），**不要手拼** `buildChart + analyzeChart
    //   + assembleFull`：金标准那侧的盘来自 `api.bazi.get_chart`，它挂了
    //   `_gender` / `_solar_birth`；手拼的盘没有这两个键，两侧的**输入其实不同**，
    //   只是 `ASSEMBLED_KEYS` 里没有它们，判据盖不到才一直没露头
    //   （层 16 就是被同一个坑绊了一跤，见 `bazi_full.js::buildBaziFull` 的注释）。
    // 本层这两件确实不被任何 assembled 键读（所以改前改后都应全绿）——
    // 改成生产入口是为了让**夹具的输入与它自己的金标准一致**，去掉这个隐患。
    // `currentFortune` 由金标准注入（见文件头）；`moment` 亦然。
    const ch = FULL.buildBaziFull({ y: i.y, mo: i.mo, d: i.d, h: i.h, mi: i.mi }, {
      gender: i.gender,
      currentFortune: i.currentFortune,     // 可能是 null（= 基准也算不出）
      moment: i.moment,
    });
    const out = {};
    for (const key of FULL.ASSEMBLED_KEYS) {
      out[key] = Object.prototype.hasOwnProperty.call(ch, key) ? ch[key] : null;
    }
    return out;
  }
  throw new Error(`未知 kind：${k}`);
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_assembly.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_assembly.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const cases = golden.cases;

  const shapes = {};
  const outs = {};
  const FAM = golden.meta.families;
  // 按家族分桶（与其余各层同一约定）—— 比对器按 `outs[kind][m]` 取第 m 例，
  // 而不是按全局下标。写成平铺的数组会让比对器在闸门那一行就崩。
  for (const k of Object.keys(FAM)) outs[k] = [];
  cases.forEach((c, idx) => {
    const out = runCase(c);
    if (JSON.stringify(Object.keys(out)) !== JSON.stringify(FAM[c.kind])) {
      throw new Error(`第 ${idx} 例（${c.id}）输出键不契约：${Object.keys(out)}`);
    }
    for (const [name, ob] of Object.entries(out)) {
      if (ob === null) continue;              // `asm` 族「没挂上」的键
      const ks = Object.keys(ob).sort();
      shapes[c.kind] = shapes[c.kind] || {};
      const slot = shapes[c.kind][name] = shapes[c.kind][name] || [];
      if (!slot.some((x) => JSON.stringify(x) === JSON.stringify(ks))) slot.push(ks);
    }
    outs[c.kind].push(out);
  });

  fs.writeFileSync(outPath, JSON.stringify({
    schema: {
      layer: '3.5.4b',
      families: FAM,
      kinds: golden.meta.kinds,
      n_cases: cases.length,
    },
    shapes,
    outs,
  }), 'utf8');
  console.log(`✓ ${cases.length} 例 → ${outPath}`);
}

main();

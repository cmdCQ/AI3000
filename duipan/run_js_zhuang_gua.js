/**
 * 对拍 · JS 侧：用 ai3000 的 paipan/constants.js + paipan/liuyao.js 产出
 * 与 golden_zhuang_gua.json 同形的静态装卦结果，供 diff.py 逐字段比对。
 *
 * 为什么先拍静态层：装卦定式（纳甲/六亲/世应/宫/卦型/卦身）不依赖日辰月建，
 * 确定性、可 64 卦穷举，是最干净的第一块靶；先把表层证清白，
 * 再上依赖历法的动态层。
 *
 * 卦名分开处理：JS 的 HEX64_NAME 是上下卦全名（乾为天/雷火丰），
 * shushu 是文王卦序单名（乾/丰）。此处由 HEX64_NAME 自身反推单名
 * （去象前缀；八纯卦取「X为Y」的 X），与 shushu 单名比 —— 这才验得到标签。
 * 象前缀另用八经卦象表独立构造比对（象表 8 条，稽核成本极低）。
 *
 * 用法：node run_js_zhuang_gua.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const C = require(path.join(PAIPAN, 'constants.js'));
const { buildChart } = require(path.join(PAIPAN, 'liuyao.js'));

const goldenPath = process.argv[2] || path.join(__dirname, 'golden_zhuang_gua.json');
const outPath = process.argv[3] || path.join(__dirname, 'js_zhuang_gua.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

// 八经卦自然象（仅用于标签前缀的独立构造，不入 constants.js）
const XIANG = { 1: '天', 2: '泽', 3: '火', 4: '雷', 5: '风', 6: '水', 7: '山', 8: '地' };

/** 全名 → 单名：'乾为天'→'乾'，'雷火丰'→'丰'，'天火同人'→'同人' */
function shortOf(full) {
  const m = /^(.)为(.)$/.exec(full);
  if (m) return m[1];
  return full.slice(2);
}

// ── 自查 A：HEX64_NAME 须 64 个互异全名 ────────────────────
const names = Object.values(C.HEX64_NAME);
if (names.length !== 64 || new Set(names).size !== 64) {
  console.error(`✗ HEX64_NAME 异常：${names.length} 项 / ${new Set(names).size} 个互异名`);
  process.exit(2);
}
// ── 自查 B：先按 (上卦_下卦) 索引，再独立构造全名比对 ────────
const byKey = {};
for (const [k, full] of Object.entries(C.HEX64_NAME)) {
  const [u, l] = k.split('_').map(Number);
  const short = shortOf(full);
  const built = u === l ? short + '为' + XIANG[u] : XIANG[u] + XIANG[l] + short;
  byKey[k] = { full, short, built };
}

const out = {};
const problems = [];
for (const [numStr, g] of Object.entries(golden)) {
  const key = g.upper + '_' + g.lower;
  const entry = byKey[key];
  if (!entry) { problems.push(`卦 ${numStr}(${g.gua_name})：HEX64_NAME 缺 ${key}`); continue; }
  if (entry.built !== entry.full) {
    problems.push(`卦 ${numStr}：全名构造不符 ${entry.full} ≠ 构造 ${entry.built}`);
  }

  const chart = buildChart({ benUpper: g.upper, benLower: g.lower });
  if (!chart) { problems.push(`卦 ${numStr}：buildChart 返回 null`); continue; }
  const p = chart.ben.palace;
  const lines = chart.ben.lines;
  const world = p.shi;

  out[numStr] = {
    num: Number(numStr),
    upper: g.upper,
    lower: g.lower,
    upper_name: (C.TRIGRAMS[g.upper] || {}).name,
    lower_name: (C.TRIGRAMS[g.lower] || {}).name,
    gua_name: entry.short,          // JS 自反推的单名，比 shushu 单名
    palace: p.palaceName,
    palace_wuxing: p.palaceElement,
    palace_position: p.palacePosition,
    gua_type: p.generation,
    world_line: world,
    application_line: p.ying,
    lines,
    gua_shen: (chart.guaShen || {}).dizhi,
    world_yin_yang: lines[world - 1] === 1 ? '阳' : '阴',
    rows: chart.yaos.map((y) => ({
      position: y.position,
      name: y.yaoName,
      zhi: y.dizhi,
      wuxing: y.wuxing,
      liu_qin: y.liuqin,
      shi_ying: y.isShi ? '世' : (y.isYing ? '应' : ''),
    })),
  };
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log(`已写 ${outPath}（${Object.keys(out).length} 卦）`);
if (problems.length) {
  console.error(`内部问题 ${problems.length} 条：`);
  for (const s of problems.slice(0, 15)) console.error('  ' + s);
  process.exit(1);
}

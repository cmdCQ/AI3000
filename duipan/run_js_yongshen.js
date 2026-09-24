/**
 * 对拍 · JS 侧：用神层（层 6b）。用 paipan/yongshen.js + paipan/liuyao.js
 * 产出与 golden_yongshen.json 同形的结果。
 *
 * 走的是**生产路径**（`buildChart` 内部取用神），不是在 harness 里重算——
 * 这样验的是「liuyao.js 把 yongshen.js 接对了没有」。入参键名的对齐在
 * liuyao.js 内部完成（那几个函数只认固定键，零归一）。
 *
 * 用法：node run_js_yongshen.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const { buildChart } = require(path.join(PAIPAN, 'liuyao.js'));

const goldenPath = process.argv[2] || path.join(__dirname, 'golden_yongshen.json');
const outPath = process.argv[3] || path.join(__dirname, 'js_yongshen.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

const out = {};
const problems = [];
for (const [cid, g] of Object.entries(golden)) {
  const s = g.sizhu;
  const chart = buildChart({
    topic: g.topic, gender: g.gender, isProxy: g.is_proxy,
    benUpper: g.ben.upper, benLower: g.ben.lower,
    yearGZ: s.year_gz, monthGZ: s.month_gz, dayGZ: s.day_gz, hourGZ: s.hour_gz,
  });
  if (!chart) { problems.push(`${cid}: buildChart 返回 null`); continue; }

  // key_lines 每条爻按语义取子集（两侧爻的键集不同，见 gen 侧注释）
  const keyLines = {};
  for (const [k, v] of Object.entries(chart.deep.key_lines || {})) {
    keyLines[k] = v.map((l) => ({ position: l.position, liu_qin: l.liu_qin, branch: l.branch }));
  }

  out[cid] = {
    case: cid,
    sizhu: s,
    ben: { upper: g.ben.upper, lower: g.ben.lower },
    topic: g.topic, gender: g.gender, is_proxy: g.is_proxy,
    resolved_topic: chart.yongShen.topic,
    palace_trigram: chart.ben.palace.palaceName,
    world_line: chart.ben.palace.shi,
    application_line: chart.ben.palace.ying,
    yong_yuan_ji_chou: chart.deep.yong_yuan_ji_chou,
    summary: chart.deep.summary,
    key_lines: keyLines,
    fu_shen: chart.yongShen.fu_shen,
    shi_shen: chart.yongShen.shi_shen,
  };
}
// 注：卦名不参与比对（对拍铁律 2「身份用上下卦号，不用卦名」）——
// shushu 存文王卦序单名（乾/屯/…），ai3000 存「象前缀 + 单名」全名。
// 64 个卦名的构造已在层 1（golden_zhuang_gua）单独验过。

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log(`已写 ${outPath}（${Object.keys(out).length} 条）`);
if (problems.length) {
  console.error(`内部问题 ${problems.length} 条：`);
  for (const s of problems.slice(0, 10)) console.error('  ' + s);
  process.exit(1);
}

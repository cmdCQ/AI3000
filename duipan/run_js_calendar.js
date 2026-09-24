/**
 * 对拍 · JS 侧：历法层。用 paipan/ganzhi.js 产出与 golden_calendar.json 同形结果。
 *
 * 本层唯一预期偏离是「晚子时日柱进位」（见 gen_golden_calendar.py 头注），
 * 由 allow_calendar.json 申报；其它任何字段的差异都是真问题。
 *
 * 用法：node run_js_calendar.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const G = require(path.join(__dirname, '..', 'build', 'backend', 'paipan', 'ganzhi.js'));

const goldenPath = process.argv[2] || path.join(__dirname, 'golden_calendar.json');
const outPath = process.argv[3] || path.join(__dirname, 'js_calendar.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

const FIELDS = ['datetime', 'year_gz', 'month_gz', 'day_gz', 'hour_gz', 'hour_zhi',
                'hour_name', 'hour_wuxing', 'day_gan', 'day_gan_wuxing',
                'solar_term', 'seasonal_wx'];

const out = {};
const problems = [];
for (const cid of Object.keys(golden)) {
  const r = G.sizhu(cid);
  const row = {};
  for (const f of FIELDS) row[f] = r[f] == null ? '' : r[f];
  out[cid] = row;
  if (!r.day_gz || !r.hour_gz || !r.year_gz || !r.month_gz) {
    problems.push(`${cid}: 四柱有空（${r.year_gz}/${r.month_gz}/${r.day_gz}/${r.hour_gz}）`);
  }
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log(`已写 ${outPath}（${Object.keys(out).length} 条）`);
if (problems.length) {
  console.error(`内部问题 ${problems.length} 条：`);
  for (const s of problems.slice(0, 10)) console.error('  ' + s);
  process.exit(1);
}

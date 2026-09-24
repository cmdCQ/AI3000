/**
 * 对拍 · JS 侧：动态装卦层。用 paipan/constants.js + paipan/liuyao.js
 * 产出与 golden_dynamic.json 同形的结果。
 *
 * 本层 JS 侧多做两件事，顺带把这两个函数也验了：
 *   1) 由本卦爻象 + 动爻位推出变卦（changedLines + linesToTrigrams）
 *   2) 由宫位名 + 六合/六冲复现 hex_type 的覆盖逻辑
 * 四柱由金标准原样传入（历法层另有 对拍 3），故此层不验历法。
 *
 * 用法：node run_js_dynamic.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const C = require(path.join(PAIPAN, 'constants.js'));
const R = require(path.join(PAIPAN, 'relations.js'));
const { buildChart } = require(path.join(PAIPAN, 'liuyao.js'));

const goldenPath = process.argv[2] || path.join(__dirname, 'golden_dynamic.json');
const outPath = process.argv[3] || path.join(__dirname, 'js_dynamic.json');
const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

/** 全名 → 单名（同 run_js_zhuang_gua.js） */
function shortOf(full) {
  const m = /^(.)为(.)$/.exec(full);
  return m ? m[1] : full.slice(2);
}

const out = {};
const problems = [];
for (const [cid, g] of Object.entries(golden)) {
  const bu = g.ben.upper, bl = g.ben.lower;

  // ── 由动爻推变卦 ──────────────────────────────────────────
  const changed = C.changedLines(bu, bl, g.moving);
  const bt = C.linesToTrigrams(changed);
  const bianName = shortOf(C.getHexName(bt.upper, bt.lower));

  const s = g.sizhu;
  const chart = buildChart({
    benUpper: bu, benLower: bl,
    bianUpper: bt.upper, bianLower: bt.lower,
    yearGZ: s.year_gz, monthGZ: s.month_gz, dayGZ: s.day_gz, hourGZ: s.hour_gz,
  });
  if (!chart) { problems.push(`${cid}: buildChart 返回 null`); continue; }

  const p = chart.ben.palace;
  const gs = (chart.guaShen || {}).dizhi;
  const branches = chart.yaos.map((y) => y.dizhi);

  // ── hex_type：先判六合、再判六冲，否则保留宫位名（同 shushu najia.py:411-417）──
  // 初值用 palacePosName（shushu divination.py 那套「一变卦…」），不是 generation。
  const hc = chart.heChong || {};
  let hexType = p.palacePosName;
  if (hc.isHeGua) hexType = '六合卦';
  else if (hc.isChongGua) hexType = '六冲卦';

  // ── 层 4：卦体关系层（用神无关）────────────────────────────
  // 入参按 shushu 调用点的**键名**重构（那几个函数只认固定键），输出原形照抄。
  // 键名对齐 shushu（branch/liu_qin/is_changing），不在这里改名——零归一。
  const monthZhi = s.month_gz[1];
  const dayZhi = s.day_gz[1];
  const yaoIn = chart.yaos.map((y) => ({
    dong: !!y.isMoving,
    zhi: y.dizhi,
    branch: y.dizhi,
    liu_qin: y.liuqin,
    is_changing: !!y.isMoving,
    changed_zhi: y.changed ? y.changed.dizhi : '',
  }));
  // shushu 的 changed_yaos 恒为 6 条，非动爻用本爻支补齐（interpreter.py:971）
  const changedIn = chart.yaos.map((y) => ({
    branch: y.changed ? y.changed.dizhi : y.dizhi,
    liu_qin: y.liuqin,
  }));

  out[cid] = {
    case: cid,
    query_time: g.query_time,
    sizhu: s,
    ben: { upper: bu, lower: bl },
    bian: { upper: bt.upper, lower: bt.lower, name: bianName },
    moving: g.moving,
    gua_shen: gs,
    gua_shen_on_chart: branches.indexOf(gs) >= 0,
    kong_wang_branches: chart.kong,
    month_zhi: s.month_gz[1],
    day_gan: s.day_gz[0],
    day_zhi: s.day_gz[1],
    world_line: p.shi,
    application_line: p.ying,
    palace_name: p.palaceName,
    palace_element: p.palaceElement,
    palace_position: p.palacePosition,
    palace_trigram: p.palaceName,
    hex_type: hexType,
    dong_jing_analysis: R.analyzeDongJing(yaoIn),
    hua_he_chong: R.analyzeHuaHeChong(yaoIn),
    sanhe_sanhui: R.detectSanheSanhui(yaoIn),
    deep_relations: {
      line_details: R.lineDetails(yaoIn, monthZhi, dayZhi),
      changing_relations: R.changingRelations(yaoIn, changedIn),
    },
    yaos: chart.yaos.map((y) => ({
      position: y.position,
      stem: y.tiangan,
      branch: y.dizhi,
      ganzhi: y.ganzhi,
      element: y.wuxing,
      liu_qin: y.liuqin,
      liu_shen: y.liushen,
      kong_wang: y.kong,
      strength: y.strength,
      is_world: y.isShi,
      is_application: y.isYing,
      is_changing: y.isMoving,
      changed_stem: y.changed ? y.changed.tiangan : '',
      changed_branch: y.changed ? y.changed.dizhi : '',
      changed_ganzhi: y.changed ? y.changed.ganzhi : '',
      changed_liu_qin: y.changed ? y.changed.liuqin : '',
    })),
  };
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
console.log(`已写 ${outPath}（${Object.keys(out).length} 条）`);
if (problems.length) {
  console.error(`内部问题 ${problems.length} 条：`);
  for (const s of problems.slice(0, 10)) console.error('  ' + s);
  process.exit(1);
}

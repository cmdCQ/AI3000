/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/bazi_relations.js`（3.5.3a）。
 *
 * 输出**全量**（不自己算摘要）—— 摘要一律由 `gen_golden_bazi_relations.py::canon`
 * 单独一份实现算两次（金标准一次、这里的产物一次）。理由见金标准生成器的 docstring：
 * 两边各写一个摘要函数，就多一处「错得一样才看不出来」的漂移点。
 *
 * 四个支从金标准的 `grid` 取（而不是在 JS 里再写一遍 12 支）——
 * 若哪天金标准的网格改了（比如加了藏干支），这里会跟着变，而不是**静默对不齐**。
 *
 * 用法：node run_js_bazi_relations.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const R = require(path.join(HERE, '..', 'build', 'backend', 'paipan', 'bazi_relations.js'));

const PILLARS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/** 四支 → chart。`tiangan` 填「甲」——本层不读它，只为形状与真盘一致。 */
function chartOf(tup) {
  const ch = {};
  PILLARS.forEach((p, i) => { ch[p] = { tiangan: '甲', dizhi: tup[i] }; });
  return ch;
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_relations.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_relations.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const grid = golden.meta.grid;
  if (!Array.isArray(grid) || grid.length !== 12) {
    throw new Error(`grid 不是 12 支：${JSON.stringify(grid)}`);
  }

  // ── 全枚举 12⁴，索引序必须与金标准的 itertools.product 一致（后者末位最快） ──
  const rel = [];
  const fmt = [];
  for (const y of grid) {
    for (const m of grid) {
      for (const d of grid) {
        for (const h of grid) {
          const ch = chartOf([y, m, d, h]);
          const r = R.analyzeAllRelations(ch);
          rel.push(r);
          fmt.push(R.formatRelationsForPrompt(r));
        }
      }
    }
  }

  // ── 触发层：组合序与 target 序都照金标准 ──
  const trigBranches = golden.triggers.branches;
  const trigTargets = golden.triggers.targets;
  const trigLabel = golden.triggers.label;
  const trig = [];
  for (const s of trigBranches) {
    const ch = chartOf(s.split(''));
    for (const target of trigTargets) {
      trig.push(R.analyzeDayunLiunianTrigger(ch, target, trigLabel));
    }
  }

  fs.writeFileSync(outPath, JSON.stringify({ rel, fmt, trig }));
  console.log(`✓ JS 侧 ${rel.length} 例关系 + ${fmt.length} 例文案 + ${trig.length} 例触发 → ${outPath}`);
}

main();

/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/bazi_patterns.js`（3.5.3b 特殊格局层）。
 *
 * ── 为什么要「10 个检测器逐一出」 ──
 * 汇总 `detectAllSpecialPatterns` 只留下 `matched:true` 的条目，
 * 于是**没命中**的分支在产物里不留任何痕迹 —— 一个恒返回 `matched:false`
 * 的假实现，汇总层照样「全绿」。逐一出则把负分支也钉进比对里。
 *
 * ── 摘要一律不在这里算 ──
 * 这里只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责
 * （`norm_bazi_patterns.py` + 金标准生成器里的 `canon`）—— 两边各写一个摘要函数
 * 就多一处「错得一样才看不出来」的漂移点（层 7 静默 fallback 的教训）。
 *
 * ── 样例从金标准读，不在 JS 里再写一遍 ──
 * 若哪天金标准的样例集改了，这里会跟着变，而不是**静默对不齐**。
 *
 * 用法：node run_js_bazi_patterns.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const P = require(path.join(PAIPAN, 'bazi_patterns.js'));
const T = require(path.join(PAIPAN, 'bazi_tables.js'));

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/** 四柱干支（四个两字串）→ chart。藏干由表推出，日主取日干 —— 与金标准同一构造法。 */
function chartFromGz(gz) {
  const ch = {};
  PILLAR_KEYS.forEach((k, i) => {
    const g = gz[i];
    if (typeof g !== 'string' || g.length !== 2) {
      throw new Error(`第 ${i} 柱干支不是两字：${JSON.stringify(g)}`);
    }
    const dz = g[1];
    ch[k] = {
      tiangan: g[0],
      dizhi: dz,
      canggan: (T.CANGGAN[dz] || []).slice(),
    };
  });
  ch.day_master = gz[2][0];
  return ch;
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_patterns.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_patterns.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const cases = golden.cases;
  if (!Array.isArray(cases) || !cases.length) throw new Error('金标准没有 cases');

  // 检测器名单也从被验模块自己取 —— 少一处「名单对不上」的漂移点
  const detKeys = P.DETECTORS.map(([k]) => k);

  const det = [];
  const all = [];
  const fmt = [];
  for (const c of cases) {
    const ch = chartFromGz(c.gz);
    const row = [];
    for (const [, fn] of P.DETECTORS) row.push(fn(ch));
    det.push(row);
    const agg = P.detectAllSpecialPatterns(ch);
    all.push(agg);
    fmt.push(P.formatSpecialPatternsForPrompt(agg));
  }

  fs.writeFileSync(outPath, JSON.stringify({
    det_keys: detKeys,
    det, all, fmt,
  }));
  console.log(`✓ JS 侧 ${cases.length} 例 × ${detKeys.length} 检测器 = `
    + `${cases.length * detKeys.length} 个检测器输出 + ${all.length} 汇总 + ${fmt.length} 文案`);
}

main();

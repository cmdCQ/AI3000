/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/bazi_yongshen.js`（3.5.3c 用神/调候层）。
 *
 * ── 摘要一律不在这里算 ──
 * 这里只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责
 * （金标准生成器的 `canon`）。两边各写一个摘要函数，就多一处「错得一样才看不出来」
 * 的漂移点 —— 层 11 已经踩过这个坑的边（那边是 shushu 的 `list(set(...))` 顺序抖动）。
 *
 * ── 样例从金标准读，不在 JS 里再写一遍 ──
 * 金标准的样例集改了，这里跟着变，而不是**静默对不齐**。
 *
 * ── 日主档案按日干只出一份 ──
 * `getDayMasterProfile` 是纯查表、只与日干有关，逐例存 10825 份 = 同一件事重复 10825 遍。
 * 存 10 份（十个日干各一份）反而**表达力更强**：它证明的正是「只与日干有关」。
 * 金标准侧同形（`profile_digest` 也是按日干的表），两侧对得上。
 *
 * 用法：node run_js_bazi_yongshen.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const B = require(path.join(PAIPAN, 'bazi.js'));
const YS = require(path.join(PAIPAN, 'bazi_yongshen.js'));
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
    ch[k] = { tiangan: g[0], dizhi: dz, canggan: (T.CANGGAN[dz] || []).slice() };
  });
  ch.day_master = gz[2][0];
  return ch;
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_yongshen.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_yongshen.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const cases = golden.cases;
  if (!Array.isArray(cases) || !cases.length) throw new Error('金标准没有 cases');

  const tiaohou = [], geju = [], yong = [], pattern = [];
  for (const c of cases) {
    const ch = chartFromGz(c.gz);
    B.analyzeChart(ch);                       // 旺衰/格局由这八个字现算（层 8 已验的那条链）
    tiaohou.push(ch.tiaohou);
    geju.push(ch.geju_cheng_bai === undefined ? null : ch.geju_cheng_bai);
    yong.push(YS.analyzeYongShen(ch));
    // 格局名这一列**冗余**（它是层 8 的字段），但用神取「喜/忌」正是按这个名字查表，
    // 列出来失败时一眼看出是「名字不同」还是「表内容不同」，省一轮排查。
    pattern.push(ch.pattern);
  }

  // 日主档案：十个日干各一份（键顺序固定，便于比对时读）
  const profile = {};
  for (const dm of Object.keys(T.DAY_MASTER_PROFILES)) {
    profile[dm] = YS.getDayMasterProfile(dm);
  }

  // 字段集闸门：比对器先比这几个键，少挂/多挂字段要当场显形，而不是等摘要对不上再瞎猜
  const first = yong[0];
  fs.writeFileSync(outPath, JSON.stringify({
    top_keys: ['tiaohou', 'geju_cheng_bai', 'yong_shen', 'day_master_profile'],
    tiaohou_keys: Object.keys(tiaohou[0]).sort(),
    yong_keys: Object.keys(first).sort(),
    profile_keys: Object.keys(profile[Object.keys(profile)[0]]).sort(),
    day_masters: Object.keys(profile),
    tiaohou, geju, yong, pattern, profile,
  }));
  console.log(`✓ JS 侧 ${cases.length} 例：tiaohou + geju_cheng_bai + yong_shen 全量，`
    + `日主档案 ${Object.keys(profile).length} 份`);
}

main();

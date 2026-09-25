/**
 * 对拍 · JS 侧事实探针：给 `coverage_meihua.py` 取几组**只有 JS 侧才拿得到**的事实。
 *
 * 为什么不并进 run_js_meihua.js：那是「照调用说明跑金标准同款」，产出的是**被验值**；
 * 这里是**独立核对**（拿别的来源去验被验方自己的表），两者混在一起，
 * 「被验值」里就会掺进「自己验自己」的东西。
 *
 * 三组事实：
 *   hex64    —— `constants.HEX64_MAP` 与 `getHexName`（64 条）。与前端语料
 *               `build/nginx/js/hexagrams_data.js` 对照：那是**另一条来源**
 *               （cast64.com），不是本模块搬来的副本。
 *   strokes  —— `strokes.js` 的档表与逐字笔画数。与 shushu `core/meihua/strokes.py`
 *               对照：本表是**机械转写**自它，故必须逐字相等，不能只抽查。
 *   vvv      —— 防御分支冒烟（见下 `probe_vacuous`）。
 *
 * 用法：node probe_meihua.js [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PAIPAN = path.join(__dirname, '..', 'build', 'backend', 'paipan');
const C = require(path.join(PAIPAN, 'constants.js'));
const M = require(path.join(PAIPAN, 'meihua.js'));
const S = require(path.join(PAIPAN, 'strokes.js'));

// ── 前端语料：另一条独立来源 ──────────────────────────────────
// 该文件是给浏览器用的 `var` 声明，无 DOM 依赖，故 node 里 eval 得动。
// 不 require：它没有 module.exports。
const FRONT = path.join(__dirname, '..', 'build', 'nginx', 'js', 'hexagrams_data.js');
const frontSrc = fs.readFileSync(FRONT, 'utf8');
// 用 `new Function` 而不是 `eval`：`eval` 会把文件里的 `var` 泄进本模块作用域，
// 与上面已 `require` 进来的对象撞车。
const { HEXAGRAM_MAP, HEXAGRAM_DATA } = new Function(
  `${frontSrc}\n;return {HEXAGRAM_MAP, HEXAGRAM_DATA};`)();

// 前端每条：卦序 i、通行全名 g、上下卦 c（形如「上乾下乾」）
const front = Object.keys(HEXAGRAM_DATA).map((k) => {
  const d = HEXAGRAM_DATA[k];
  return { key: k, i: d.i, full: d.g, combo: d.c };
});

const hex64 = [];
for (let u = 1; u <= 8; u++) {
  for (let l = 1; l <= 8; l++) {
    hex64.push({ upper: u, lower: l, number: C.getHexNumber(u, l), name: M.hexName(u, l) });
  }
}

// 先天数 → 八卦名（前端语料的 `combo` 是「上乾下乾」这种**名字**串，
// 要与本模块的先天数对上，中间需要这一层）
const trigramName = {};
for (const k of Object.keys(C.TRIGRAMS)) trigramName[k] = C.TRIGRAMS[k].name;

// ── 防御分支冒烟 ──────────────────────────────────────────────
// `analyze` 在「月支为空」时返回 `{available:false}` 且不往 evidence 里加旺衰条。
// 这条在语料里**取不到**：`divine` 会自动补月支，只有历法坏掉才为空
// （见 gen_golden_meihua.py 的说明）。故这里直调 `analyze` 把该分支走一遍，
// 证明它**实现着、且形状对** —— 冒烟，不是对拍。
function probe_vacuous() {
  const q = M.qigua('number', { num1: 3, num2: 5, num3: null });
  const on = M.analyze(q, { monthDizhi: '巳' });
  const off = M.analyze(q, { monthDizhi: '' });
  return {
    off_strength: off.strength,
    off_evidence_len: off.evidence.length,
    on_strength: on.strength,
    on_evidence_len: on.evidence.length,
    off_has_strength_text: off.evidence.some((e) => e.includes('体气')),
    off_main_level: off.main_level,
    on_main_level: on.main_level,
  };
}

const out = {
  front,
  front_map: HEXAGRAM_MAP,
  trigram_name: trigramName,
  hex64,
  strokes: {
    by_stroke: S.BY_STROKE,
    stroke_count: S.STROKE_COUNT,
    n_chars: Object.keys(S.STROKE_COUNT).length,
    n_levels: Object.keys(S.BY_STROKE).length,
  },
  vacuous: probe_vacuous(),
};

const outPath = process.argv[2] || path.join(__dirname, 'probe_meihua.json');
fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');
console.log(`已写 ${outPath}：前端语料 ${front.length} 条、hex64 ${hex64.length} 条、`
  + `笔画表 ${out.strokes.n_chars} 字/${out.strokes.n_levels} 档`);

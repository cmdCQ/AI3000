/**
 * 对拍 · 被验方：ai3000 `build/backend/paipan/`（3.5.4c 八字解读 prompt）。
 *
 * ── 摘要一律不在这里算 ──
 * 只吐**完整 JSON**。规范化与 sha256 由 Python 侧唯一一份实现负责（金标准的 `canon`）。
 * 两边各写一个摘要函数，就多一处「错得一样才看不出来」的漂移点。
 *
 * ── 两个家族的入口**是同一个**（与基准那边一样）──
 *   `pv` 真实盘：`bazi.js::buildChart` → `analyzeChart` → `bazi_full.js::assembleFull`
 *        → `bazi_prompt.js::baziPrompt`（默认模板渲染）
 *   `pm` 变异盘：同上，但在**装配完之后**按 `in.mut` 改一个键 —— 顺序必须与金标准一致
 *        （基准那边是「端点出来的盘 → 改键」）。改了键**再**进提示词层。
 *
 * ── 用例里有两个字段**本 runner 刻意不读**（`inject` 与 `note`）──
 * `inject`：金标准喂给**基准**历法的固定大运/流年表（为的是绕开层 9 已申报的口径偏离）。
 *       基准算出的 `current_fortune` 整块经 `in.currentFortune` 传过来，
 *       本层只验「挂上去 + 下游消费」，不重算它。
 * `note`：给人看的变异说明。
 * 两者都是**记录**而非输入。若哪天发现 runner 需要读它们，说明分层被搞乱了。
 *
 * ⚠ `in.gz` 与层 15 的约定**相反**：那里 runner 不读 `gz`（读了就是自证），这里要读，
 *   因为它断的是**跨层一致性** ——「我起出的四柱 = 端点算出的四柱」，即两侧喂给
 *   提示词层的**是同一张盘**。四柱本身对不对是层 8 的活，本层不重复验。
 *
 * ⚠ 另出一份 `aux.vars`（被验方自报的变量表）：**只给比对器定位用，不参与判据**。
 *   金标准那边没有「变量表」这个东西（基准是把 ctx 直接 dict → JSON），
 *   拿自报的东西当判据就是让被验方定义契约。
 *
 * 用法：node run_js_bazi_prompt.js [golden.json] [out.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const PAIPAN = path.join(HERE, '..', 'build', 'backend', 'paipan');
const B = require(path.join(PAIPAN, 'bazi.js'));
const FULL = require(path.join(PAIPAN, 'bazi_full.js'));
const P = require(path.join(PAIPAN, 'bazi_prompt.js'));

// ⚠ 与金标准 `SRC_KEYS` **各写一份**（独立重算，互为对照）。
const SRC_KEYS = [
  'year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar', 'day_master',
  '_gender', 'day_master_wuxing', 'strength', 'strength_info', 'day_master_profile',
  'yong_shen', 'shensha', 'pattern', 'pattern_desc', 'dayun', 'analysis', 'advice',
  'taiyuan', 'minggong', 'shengong', 'shishen_summary', 'current_fortune',
  'overview', 'mingju_synthesis', 'master_synthesis', 'life_aspects',
  'relations', 'special_patterns', 'combos',
];

const PILLAR_KEYS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];

/** 与金标准 `apply_mut` 同语义（共用定义，见那边文件头）。 */
function applyMut(chart, ops) {
  for (const op of ops) {
    const p = op.p;
    let parent, key;
    if (p.length === 1) { parent = chart; key = p[0]; }
    else if (p.length === 2) {
      parent = chart[p[0]];
      if (parent === null || typeof parent !== 'object' || Array.isArray(parent)) {
        throw new Error(`变异路径 ${JSON.stringify(p)} 的父级不是 object：${typeof parent}`);
      }
      key = p[1];
    } else throw new Error(`变异路径太深：${JSON.stringify(p)}`);
    if (op.op === 'set') parent[key] = JSON.parse(JSON.stringify(op.v));
    else delete parent[key];
  }
  return chart;
}

/** 输入快照：逐键 `[在不在, 值]`（与金标准 `src_of` 同构）。 */
function srcOf(chart) {
  const out = {};
  for (const k of SRC_KEYS) {
    out[k] = Object.prototype.hasOwnProperty.call(chart, k) ? [1, chart[k]] : [0, null];
  }
  return out;
}

/**
 * 输出对象的形状。⚠ `'<str>'` / `'<null>'` 两个标记是与金标准**共用的约定**
 * （那边 `shape_of` 必须写同一对字面量），防的是「改成返回 `{text:…}`」这类结构漂移。
 */
function shapeOf(ob) {
  if (ob === null) return ['<null>'];
  if (typeof ob === 'string') return ['<str>'];
  return Object.keys(ob).sort();
}

/**
 * JS 异常 → 基准的 Python 异常**类名**。
 *
 * 为什么能这么映射：本项目移植时约定「Python 抛什么就抛什么」——
 * 消息逐字照抄（`throw new Error("KeyError: 'k'")`）或直接用 `TypeError`
 * （`pycompat.js` 里的 `throw new TypeError('...not subscriptable')`）。
 * ⚠ 只映射**类名**，不映射消息：基准那七处 `except` 不区分类型，行为只取决于
 *   「抛没抛」；而个别消息天然不同（`{}[:6]` 在 Python 是 `unhashable type: 'slice'`，
 *   移植侧写的是更正常的 `'dict' object is not subscriptable`）。
 */
function pyErrName(e) {
  if (e instanceof TypeError) return 'TypeError';
  const m = /^(KeyError|ValueError|AttributeError|IndexError|ZeroDivisionError)\b/
    .exec(String((e && e.message) || ''));
  return m ? m[1] : ((e && e.name) || 'Error');
}

function runCase(c, aux) {
  const i = c.in;
  // ⚠ 必须走 **`buildBaziFull`**（生产入口，对应基准的 `api/bazi.py::get_chart`），
  //   不能像层 15 那样手拼 `buildChart + analyzeChart + assembleFull`：
  //   `_gender` / `_solar_birth` 两个元数据是在 `buildBaziFull` 里挂的
  //   （对应 `api/bazi.py:70` 的 `chart["_gender"] = req.gender`）。
  //   漏了它，「性别」这一项在提示词里**永远是空**（基准的注释写明：婚姻/配偶星
  //   的判断依赖性别）—— 层 15 没读 `_gender`，所以这个坑一直没露头。
  // `currentFortune`/`moment` 由金标准注入（见文件头）。
  const ch = FULL.buildBaziFull({ y: i.y, mo: i.mo, d: i.d, h: i.h, mi: i.mi }, {
    gender: i.gender,
    currentFortune: i.currentFortune,
    moment: i.moment,
  });
  if (i.gz) {
    const got = PILLAR_KEYS.map((k) => ch[k].tiangan + ch[k].dizhi);
    if (JSON.stringify(got) !== JSON.stringify(i.gz)) {
      throw new Error(`${c.id}：本项目起出的四柱 ${JSON.stringify(got)} ≠ 端点算出的 `
        + `${JSON.stringify(i.gz)} —— 两侧喂给提示词层的不是同一张盘`);
    }
  }
  if (i.mut) applyMut(ch, i.mut);          // ⚠ 装配**之后**才改键，与金标准同序

  const opts = { tab: i.tab, question: i.question, ragText: i.rag };
  const src = srcOf(ch);
  // 判据走**公开 API** `baziPrompt`（端点上要用的就是它），不是自己拼 render+baziVars：
  // 万一哪天 `baziPrompt` 传错了模板，自己拼的那份验不出来。
  let prompt = null, err = '';
  try { prompt = P.baziPrompt(ch, opts); } catch (e) { err = pyErrName(e); }
  // `pv` 里 `err` 不进契约：真实盘上不该抛，抛了 `prompt` 就是 null，形状闸门会当场报出来。
  // 变量表**只做定位**（见文件头）：它自己抛了也记下来，绝不因此中断整个 runner。
  let vars = null;
  try { vars = P.baziVars(ch, opts); } catch (e) { vars = { __err__: pyErrName(e) }; }
  aux.push(vars);
  return c.kind === 'pm' ? { prompt, src, err } : { prompt, src };
}

function main() {
  const goldenPath = process.argv[2] || path.join(HERE, 'golden_bazi_prompt.json');
  const outPath = process.argv[3] || path.join(HERE, 'js_bazi_prompt.json');
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const cases = golden.cases;
  const FAM = golden.meta.families;

  const shapes = {};
  const outs = {};
  const aux = {};
  for (const k of Object.keys(FAM)) { outs[k] = []; aux[k] = []; }
  cases.forEach((c, idx) => {
    let out;
    try {
      out = runCase(c, aux[c.kind]);
    } catch (e) {
      // 变异把 `baziVars` 自己弄抛了（例如路径的父级不存在）—— 那是 runner 的锅，不是产物
      throw new Error(`第 ${idx} 例（${c.id}）runner 自己抛了：${e && e.stack}`);
    }
    if (JSON.stringify(Object.keys(out)) !== JSON.stringify(FAM[c.kind])) {
      throw new Error(`第 ${idx} 例（${c.id}）输出键不契约：${Object.keys(out)}`);
    }
    for (const name of FAM[c.kind]) {
      const ks = shapeOf(out[name]);
      shapes[c.kind] = shapes[c.kind] || {};
      const slot = shapes[c.kind][name] = shapes[c.kind][name] || [];
      if (!slot.some((x) => JSON.stringify(x) === JSON.stringify(ks))) slot.push(ks);
    }
    outs[c.kind].push(out);
  });

  fs.writeFileSync(outPath, JSON.stringify({
    schema: {
      layer: '3.5.4c',
      families: FAM,
      kinds: golden.meta.kinds,
      n_cases: cases.length,
    },
    shapes,
    outs,
    aux,
  }), 'utf8');
  console.log(`✓ ${cases.length} 例 → ${outPath}`);
  console.log('  ' + Object.entries(outs)
    .map(([k, v]) => `${k} ${v.length} 例（抛 ${v.filter((o) => o.err).length}）`).join(' · '));
}

main();

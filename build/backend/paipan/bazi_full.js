/**
 * paipan/bazi_full.js —— 八字·完整读盘装配（3.5.4b-5，一次完整读盘的入口）
 * ================================================================================
 *
 * 移植自 shushu（github.com/cmdCQ/shushu）`api/bazi.py` 的 `get_chart` 端点体内那一串装配
 * （`:85-200`）—— **不是** `_build_and_analyze`（那份只管起盘与元数据）。
 *
 * 前十四层各自把一件东西算对，本文件**只负责按基准的顺序挂上去**，
 * 一处断法都不新增。顺序即语义：后挂的读前挂的（`overview` 读 `combos.geju_evaluation`，
 * `mingju_synthesis` 读 `current_fortune`，`master_synthesis` 读前两者 + `life_aspects`）。
 *
 * ── 挂载次序（照抄 api/bazi.py，注释里是基准行号）──
 *   1. `day_master_profile`  :91   无条件（**不包** try —— 基准也没包，见下）
 *   2. `yong_shen`           :92   无条件（**不包** try，同上）
 *   3. `relations`           :97   无条件
 *   4. `special_patterns`    :103  无条件
 *   5. `combos`              :109  无条件
 *   6. `current_fortune`     :121  **仅当 available**
 *   7. `life_aspects`        :127  仅当**非空字典**（四函数各包一层 try/except）
 *   8. `overview`            :147  **仅当 available**
 *   9. `mingju_synthesis`    :158  **仅当 available**
 *  10. `master_synthesis`    :194  **仅当 available**
 * 3–10 每一处基准都单独包了 `try/except`，本文件照搬（见下）。
 *
 * ── 基准有、本文件**故意不挂**的三件（`perspectives` :170 / `consistency_audit` :180 /
 *    `classical_statements` :187）──
 * 这三件不在本次范围内（3.5.4b 只做「总断那一串」）。**不是忘了，是划出去的**：
 * 它们不在 `master_synthesis` 的输入里，也不影响已挂十件的任何一个字节。
 * 移植时要么单独一层连对拍一起做，要么明确不做 —— 但绝不能装作「读了盘」。
 *
 * ── ⚠⚠ 每个挂载点的 `try/except` **照搬**（本层对拍逼出来的修正）──
 * 我先前判「移植侧不包：JS 没有等价的异常面，包了只会把配错字段吞成缺键」（层 14 的同一条）。
 * **这个判断在本文件是错的**，两条理由：
 *   ① 基准的语义是「这一件失败 → 这个键**不存在**，其余照装」（`log_failure` 记一笔）。
 *      而 `asm` 族的标志位就是**逐键**记 `P|-` —— 吞不吞**进分支码**，是可观测的，
 *      不像 `master_synthesis` 里那段「当下」会静默少一维。所以「吞」在这里不是隐患。
 *   ② 不吞的后果不是「多一处红」，而是**整个端点炸**：JS 的异常会一路冒到调用方，
 *      而基准在 `api/bazi.py:202` 只把它变成 HTTP 400，前面已挂的九件照常返回。
 *      一个「十件里少一件」的盘，与一个「什么都拿不到」的盘，差别很大。
 * 正确性由**各件自己的对拍族**承担（`ov`/`sy`/`ms`/`cf` 四族 + 层 8–14），
 * 不靠装配层兜底 —— 这也是「吞」在本层可以放心的前提。
 *
 * ── `assembleFull` / `buildBaziFull` 的拆分，与 3.5.4b-1 同一条理由 ──
 * `assembleFull(chart, opts)`：只装配，不排盘、不分析、不碰「现在」。
 * `buildBaziFull(input, opts)`：起盘 + `analyzeChart` + 补元数据 + 装配。
 * 对拍走前者（盘由金标准同构地造好；`currentFortune` 与 `moment` 由金标准注入）——
 * 见 `duipan/gen_golden_bazi_assembly.py` 文件头「注入」一节。
 *
 * 对拍：`duipan/gen_golden_bazi_assembly.py`（家族 `asm`）。
 */
'use strict';

const { pyGet, pyTruthy } = require('./pycompat.js');
const G = require('./ganzhi.js');
const B = require('./bazi.js');
const YS = require('./bazi_yongshen.js');
const AR = require('./bazi_relations.js');
const AP = require('./bazi_patterns.js');
const CB = require('./bazi_combos.js');
const A = require('./bazi_applications.js');
const CF = require('./current_fortune.js');
const OV = require('./overview.js');
const SY = require('./synthesis.js');
const MS = require('./master_synthesis.js');

/** 本次装配会挂上的十个键（对拍时按这个名单逐一比对「在不在」与「值相不相同」）。 */
const ASSEMBLED_KEYS = [
  'day_master_profile', 'yong_shen', 'relations', 'special_patterns', 'combos',
  'current_fortune', 'life_aspects', 'overview', 'mingju_synthesis', 'master_synthesis',
];

/**
 * 把已分析好的 `chart` **就地**装配成完整读盘，返回同一个对象。
 *
 * @param {object} chart  已跑过 `bazi.js::analyzeChart` 的盘
 * @param {object} opts
 *   @param {string}  opts.gender       `male`/`female`（`life_aspects.marriage` 用）
 *   @param {number}  [opts.birthYear]  起运基准年（`current_fortune` 用；假值即「没给」）
 *   @param {number}  [opts.currentYear] 「今年」。**必须显式给**（基准的默认值是写死的 2026）
 *   @param {object}  [opts.currentFortune]  对拍注入：已算好的 `current_fortune`，
 *                                           给了就不再自己算（`null` = 基准算不出）
 *   @param {object}  [opts.moment]    此刻时空（`ganzhi.sizhu` 的产物）。
 *                                     不给则现取 `now` —— 对拍**必须**给。
 */
/**
 * 复刻基准的一处挂载：`try: build → (可选) 条件成立才挂 → except: log_failure`。
 * 失败即**这个键不存在**（不是缺值、不是空字典）—— `asm` 族按 `P|-` 记的就是这件事。
 *
 * `keep` 缺省为「一律挂」：基准里 `relations`/`special_patterns`/`combos` 三件没有
 * `available` 判断，算出来什么就挂什么（哪怕它返回 `False`）。
 */
function mount(chart, key, build, keep) {
  try {
    const piece = build();
    if (!keep || keep(piece)) chart[key] = piece;
  } catch (e) {
    console.error(`[bazi_full] 装配六件套/总汇 失败：${e.name}: ${e.message}（${key} 不挂）`);
  }
}

function assembleFull(chart, opts) {
  const o = opts || {};

  // 1–2. 无条件（基准 :91-92 在 try 之外，属于「起盘的一部分」）——
  //      故**不包** `mount`：它们抛的时候基准会一路冒到 `api/bazi.py:202` 变成 400，
  //      移植侧同样抛，两边一致。
  chart.day_master_profile = YS.getDayMasterProfile(chart.day_master);
  chart.yong_shen = YS.analyzeYongShen(chart);

  // 3–5. 无条件值 + 各自包 try（见文件头）
  mount(chart, 'relations', () => AR.analyzeAllRelations(chart));
  mount(chart, 'special_patterns', () => AP.detectAllSpecialPatterns(chart));
  mount(chart, 'combos', () => CB.baziCombos(chart));

  // 6. 当前运程 —— 仅当 available。`undefined` 表示「自己算」；`null`/对象表示「用注入的」。
  //    用 `undefined` 而不是「opts 里有没有这个键」来判，是为了让调用方可以显式写
  //    `currentFortune: undefined` 而不改变语义 —— 注入与自算之间不该有第三种状态。
  //    ⚠ 注入分支也**留在 build 里**：基准的 `cf.get("available")` 就在 try 内，
  //      注入 `null` 时它 `AttributeError` → 吞掉、键不挂，移植侧要一模一样。
  mount(chart, 'current_fortune', () => (o.currentFortune === undefined
    ? CF.buildCurrentFortune(chart, o.gender, o.birthYear, o.currentYear)
    : o.currentFortune),
  (p) => pyTruthy(pyGet(p, 'available', undefined)));

  // 7. 各专域（顺序 career→wealth→health→marriage，即 api/bazi.py 的插入顺序；
  //    字典键序会原样出现在 JSON 里，前端与 AI 都按它读，不许「顺手排整齐」）
  mount(chart, 'life_aspects', () => A.buildLifeAspects(chart, o.gender),
    (p) => Object.keys(p).length > 0);

  // 8. 命局总论
  mount(chart, 'overview', () => OV.synthesizeOverview(chart),
    (p) => pyTruthy(pyGet(p, 'available', undefined)));

  // 9. 命局力量综合推理链
  mount(chart, 'mingju_synthesis', () => SY.synthesizeMingju(chart),
    (p) => pyTruthy(pyGet(p, 'available', undefined)));

  // 10. 综合论断（总汇合参）—— 最后一件，读前面全部。
  //     ⚠ 「没给 moment」是**调用方 bug**，必须在 `mount` 之外先炸（见 `master_synthesis.js`
  //       文件头 ⑤）—— 否则它会被这层的 swallow 吃掉，变成「这个盘没有综合论断」。
  const moment = o.moment === undefined ? G.sizhu(new Date()) : o.moment;
  if (!moment) throw new Error('assembleFull 需要 moment（ganzhi.sizhu(now) 的产物）');
  mount(chart, 'master_synthesis', () => MS.buildMasterSynthesis(chart, moment),
    (p) => pyTruthy(pyGet(p, 'available', undefined)));

  return chart;
}

/**
 * 生产入口：起盘 → 分析 → 装配。
 *
 * `input` 是 `bazi.js::buildChart` 认的公历时刻（`{y,mo,d,h,mi}` 或 `Date`）。
 *
 * ⚠ **必须走这个入口，不要自己拼 `buildChart + analyzeChart + assembleFull`** ——
 *   下面两个元数据是在**这里**挂的（对应基准 `api/bazi.py:70`、`:77`），
 *   漏了它，提示词里「性别」永远是空。层 16 的对拍就是被这个坑绊了一跤：
 *   当时的 runner 手拼三步、漏了 `_gender`，442 例里 438 例报差异，
 *   而**层 15 的 runner 也是手拼的、同样漏了** —— 它没露头只是因为
 *   `ASSEMBLED_KEYS` 里没有 `_gender` 这个键（判据盖不到）。
 *
 * 基准那一侧还挂了 `_is_lunar` / `_lunar_input` / `_location`（`api/bazi.py:71-79`）。
 * 这三个**实测在整个 shushu 里只写不读**（`grep '"_is_lunar"\|"_lunar_input"\|"_location"'`
 * 除写入处外零命中），故本文件**故意不挂**：挂了也没任何下游会读，
 * 属于「验不到的死代码」。哪天基准开始读它们，这条注释与 `grep` 都会失效，
 * 那时再补 —— 补之前先复核这个 grep。
 */
function buildBaziFull(input, opts) {
  const o = opts || {};
  const chart = B.buildChart(input);
  B.analyzeChart(chart);
  chart._gender = o.gender;                     // api/bazi.py:70
  const t = G.normalize(input);
  chart._solar_birth = { year: t.y, month: t.mo, day: t.d };   // api/bazi.py:77
  return assembleFull(chart, o);
}

module.exports = { assembleFull, buildBaziFull, ASSEMBLED_KEYS };

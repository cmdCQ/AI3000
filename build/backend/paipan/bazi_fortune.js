/**
 * paipan/bazi_fortune.js —— 大运 / 流年 / 流月 / 流日 / 流时（八字 3.5.2）
 * =====================================================================
 *
 * 真源：shushu `core/bazi/forecaster.py`（572 行）。逐函数对应，一一可查：
 *
 *   _analyze_dayun_interactions → analyzeDayunInteractions
 *   _analyze_liunian_taisu      → analyzeLiunianTaisu
 *   _dayun_start_age            → dayunStartAgeRaw（+ `pyRound` 在外层）
 *   _dayun_direction            → dayunDirection
 *   calculate_dayun             → calculateDayun
 *   _shishen_label              → `bazi.js::getShiShen`（同名同形，不另抄）
 *   _assess_quality             → assessQuality
 *   calculate_liunian           → calculateLiunian
 *   _liunian_summary            → liunianSummary
 *   calculate_liuyue            → calculateLiuyue
 *   _liuyue_summary             → liuyueSummary
 *   calculate_liuri             → calculateLiuri
 *   calculate_liushi            → calculateLiushi
 *   （`api/bazi.py::get_fortune` 的参数装配）→ calculateFortune
 *
 * ── 本层**不产出**的键（显式排除，不是漏了）──────────────────────────
 * `/api/v1/bazi/fortune` 在 forecaster 之上还挂了一层 `core/bazi/combos.py`（507 行），
 * 给每个流年/流月/流日/流时补 `suiyun` / `liunian_combo` / `combo`，并**回填**
 * `liunian[*].shishen_zhi`（见下）。那层是「关系与用神」，归 **3.5.3**。
 * 故本模块的产出与 `forecaster.py` **字面一致**，不含上述四个键。
 *
 * ── 照搬的 shushu 缺陷（对拍要求字面一致；去「修」会让差异源头认不出来）──
 * 1. `liunian[*].shishen_zhi` 拿**五行**去查十神表：
 *    `_shishen_label(dm, DIZHI_WUXING[ly_zhi])` → `SHISHEN[(dm,'木')]` 根本不存在 → `''`。
 *    上游靠 combos 回填，本层照搬空串。
 * 2. `analyzeDayunInteractions` 的天干段里，「大运干生日主」与「大运干合日主」两条判据
 *    **不引用循环变量**，却写在四柱循环里 ⇒ 同一条吉语**重复 4 次**。照搬。
 * 3. `assessQuality` 的 `helps` 只含「官杀 + 比劫」、`drains` 只含「财 + 食伤」，
 *    **印（生我）两边都不落** ⇒ 身弱遇印得「平」。照搬。
 * 4. `analyzeLiunianTaisu` 冲各柱地支用的是 `if/elif` 链，只到「月支」为止 ——
 *    **冲时支既无告警也无标签**。照搬。
 * 5. `liunianSummary`/`liuyueSummary` 里「五行X旺」「日主旺」是**把五行/旺衰状态直接
 *    串进句子**，不问吉凶方向对不对（身弱遇旺本为凶，文案仍写「旺」）。照搬。
 *
 * 另有三处**死代码**，不搬（搬了反而掩盖「这里本该有东西」）：
 *   · `analyzeDayunInteractions` 里 `dy_zwx`、`month_zhi` 算了从未使用；
 *   · `calculateLiunian` 的 `gender`、`calculateLiuyue` 的 `year`、
 *     `calculateLiuri` 的 `liunian_gan` 三个形参在函数体内从未被引用
 *     （保留形参以求签名一致，注释标出）；
 *   · `calculateDayun` 判 `chart["strength"]` 是否为 dict 的那条分支是死的 ——
 *     `analyzer.analyze_chart` 写进去的是**字符串**（`analyzer.py:444`）。
 *
 * ── python 与 JS 的两处语义差（不过这一层就静默错）────────────────────
 * · `%`：python 恒非负、JS 对负数取负。流年的 `(yr-1984)%60`、流日/流时的
 *   `(距锚点天数)%60` 都可能为负（1984 年前出生、2000-01-07 之前的日期）⇒ 一律过 `mod()`。
 * · `round()`：python 是**银行家舍入**（半值取偶），JS `Math.round` 是半值向上。
 *   起运 `round(age,2)` 与 `period_*_age` 的 `round(x,1)` 都走 `pyRound`——
 *   起运岁数是**印给用户看的**数字（`perspectives.py` 会织进文案）。
 *
 * ── ⚠ 一处**未决的口径冲突**（不是 bug，是派别）──────────────────────
 * `calculateLiushi` 的 12 个时辰里，「子时 23:00-01:00」这一格用的是**当日**日干
 * （shushu 的 `_get_day_ganzhi` 取当日）。而本项目 2026-09-24 拍板**晚子时换日**：
 * 23:00 之后当归**次日**。两处口径不一致 —— 本层照搬 shushu 以求对拍一致，
 * **待用户拍板**（要么流时子时随四柱换日，要么维持 shushu）。已在 3.5.2 报告里列出。
 */
'use strict';

const C = require('./constants.js');
const G = require('./ganzhi.js');
const B = require('./bazi.js');
const T = require('./bazi_tables.js');

// shushu 里这几张表名 `WUXING_SHENG` / `WUXING_KE` / `TIANGAN_WUXING`；
// 本项目 `constants.js` 已有**同名同形**的 `SHENG` / `KE` / `GAN_WUXING`
// （逐字对过：SHENG.木=火、KE.木=土、GAN_WUXING.甲=木），直接用，不再另抄一份。
// 同理六冲/六合直接复用 `LIU_CHONG` / `LIU_HE`（与 forecaster.py 的本地副本逐字相同）。
// 三合用 `SAN_HE`：它是 `[{branches, wuxing}]`，**组内顺序**与 shushu 的
// `_SANHE_GROUPS` 不同，但四组两两不相交 ⇒ 一个支至多命中一组 ⇒ 输出与顺序无关。
const {
  TIANGAN, DIZHI, DIZHI_WUXING, GAN_WUXING,
  SHENG: WUXING_SHENG, KE: WUXING_KE,
  LIU_CHONG, LIU_HE, SAN_HE,
} = C;

/** 三刑（《滴天髓》四类）。`constants.js` 没有这张表（六爻层用不到），本地建，
 *  内容与 `forecaster.py::_SANXING` 逐字相同。
 *  ⚠ 它是**有向**的：寅→巳→申→寅、丑→戌→未→丑 各成环，子↔卯 互刑，
 *  辰午酉亥 自刑。查表读作「A 刑 B」，**不是**对称关系 —— 别当集合用。 */
const SANXING = {
  '寅': '巳', '巳': '申', '申': '寅',
  '子': '卯', '卯': '子',
  '丑': '戌', '戌': '未', '未': '丑',
  '辰': '辰', '午': '午', '酉': '酉', '亥': '亥',
};

/** 天干五合。shushu 在 `_analyze_dayun_interactions`（名 `_TIANGAN_HE`）与
 *  `_analyze_liunian_taisu`（名 `_TG_HE`）里各写了一份**内容完全相同**的表，这里合一份。 */
const TIANGAN_HE = {
  '甲': '己', '己': '甲', '乙': '庚', '庚': '乙',
  '丙': '辛', '辛': '丙', '丁': '壬', '壬': '丁', '戊': '癸', '癸': '戊',
};

/** 天干七冲（`_TG_CHONG`）：甲庚、乙辛、丙壬、丁癸。
 *  **戊己土居中不冲** —— 表里没有这两个键，故 `TG_CHONG['戊']` 为 `undefined`，
 *  与 `===` 比较恒 false。这是原表的意思，不是漏写。 */
const TG_CHONG = {
  '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁',
};

const PILLARS = ['year_pillar', 'month_pillar', 'day_pillar', 'hour_pillar'];
const ZHI_LABELS = ['年支', '月支', '日支', '时支'];

/** python `round(x, nd)` —— **在 float 的二进制真值上**做半值取偶，与 JS `Math.round`
 *  （半值向上）不同，也与 `toFixed`（半值向上）不同。
 *
 *  ⚠⚠ **不能用「`x * 10^nd` 再取整比较」那种写法**（第一版就是，错）：那一次乘法本身
 *  会重新舍入，可能把一个**明显低于半值**的数搬到**正好等于半值**上，于是走出取偶分支。
 *  实测：`x = 8.35` 的 double 真值是 `8.3499999999999996447…`，×10 的精确积是
 *  `83.499999999999996447…`，但它的**最近 double 恰好是 83.5** —— 于是被误判成半值，
 *  `round(8.35, 1)` 给出 8.4，而 python 给 8.3。两边都错开 0.1 岁是**用户能看到的字段**
 *  （大运起止岁数），且两者偏的方向还不一致（`0.95→1` vs `0.9`、`18.85→18.8` vs `18.9`）。
 *  实测量级：约 11% 的大运首尾岁数差 0.1 岁。
 *
 *  正确做法分两步，两步都不引入误差：
 *   ① 把 double 拆成精确的 `m · 2^e`（IEEE754 位域，BigInt），于是
 *      `x · 10^nd = m · 5^nd · 2^(e+nd)` 是**精确有理数** —— 在这一步上做半值取偶，
 *      得到的整数 `n` 与 python 那句 `round` 的十进制结果**完全一致**。
 *   ② `Number(`${n}e-${nd}`)`：JS 的「字符串→double」按规范是**正确舍入**的，
 *      与 python 把该十进制结果解析回 double 的结果逐位相同。
 *  这样才在**二进制真值**上判半值（`round(2.675,2) == 2.67` 同理：2.675 真值低于半值）。
 *
 *  由 `duipan/fuzz_pyround.py` 对拍 python 内置 `round`（含 2 位小数全域 + 对抗值），
 *  要求逐位相同 —— 改这个函数必须先跑它。只支持 `nd >= 0`（shushu 只用 1 和 2）。 */
function pyRound(x, nd) {
  if (!Number.isFinite(x) || nd < 0) {
    throw new Error(`bazi_fortune.pyRound: 只支持有限数与 nd≥0，收到 ${x} / ${nd}`);
  }
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const hi = dv.getUint32(0);
  const lo = dv.getUint32(4);
  const exp = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let e;
  if (exp === 0) {
    e = -1074;                                   // 次正规数：无隐含前导 1
  } else {
    mant |= 1n << 52n;
    e = exp - 1075;
  }
  if (mant === 0n) return x;                     // ±0：符号原样保留
  if (hi >>> 31) mant = -mant;

  const p = mant * 5n ** BigInt(nd);             // x·10^nd = p · 2^(e+nd)
  const shift = BigInt(e + nd);
  let n;
  if (shift >= 0n) {
    n = p << shift;                              // 已是精确整数，无半值可判
  } else {
    const twoK = 1n << -shift;
    let q = p / twoK;                            // BigInt 除法向零截断
    const r = p - q * twoK;
    const ar = r < 0n ? -r : r;
    const half = twoK >> 1n;
    const away = p < 0n ? -1n : 1n;
    if (ar > half) q += away;
    else if (ar === half && q % 2n !== 0n) q += away;   // 半值取偶
    n = q;
  }
  const out = Number(`${n}e-${nd}`);
  // 结果为 0 时**符号随 x**（python：`round(-0.4, 0) == -0.0`）。BigInt 没有 -0，
  // 所以只能在这里补 —— 模糊测试里这一类有上千例，正是靠那位模式比对的。
  return out === 0 && hi >>> 31 ? -0 : out;
}

/** 'YYYY-MM-DD[ T]HH:MM[:SS]' → 毫秒时间戳。
 *
 *  **用 `Date.UTC` 构造**：两侧这两个时刻都只是**没有时区的墙上时间标签**
 *  （python 侧是 naive datetime），做差才是唯一目的。用 Date.UTC 让差值**纯算术**，
 *  不受本机时区/夏令时影响 —— 拿 `new Date(...)` 会在跨夏令时切换的区间上凭空差一小时。
 *  （中国现行无夏令时，但这台机器/线上容器的 TZ 不该成为对拍结果的隐含变量。） */
function tsOf(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s));
  if (!m) throw new Error(`bazi_fortune.tsOf: 时刻无法解析 ${JSON.stringify(s)}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
}

/** 'YYYY-MM-DDTHH:MM:SS' → `{y,mo,d,h,mi,s}`。`ganzhi.normalize` 只认到分，
 *  故多带一个 `s` —— `nearestJie` 会**单独读它**：出生时刻正好落在节的那一分钟里时，
 *  秒决定它是「节前」还是「节后」，进而决定起运数到哪个节。差值那一侧走 `tsOf`。 */
function ymdhm(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(s));
  if (!m) throw new Error(`bazi_fortune.ymdhm: 时刻无法解析 ${JSON.stringify(s)}`);
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0) };
}

/** 60 甲子序。与 shushu `ganzhi_index` 同法：穷举 0..59 取唯一满足 `n%10==干序 且
 *  `n%12==支序` 的 n；不存在则抛（shushu 抛 `ValueError`）。闭式 `(6g−5z) mod 60`
 *  等价，但穷举顺带挡掉不存在的干支对 —— 这里宁可多跑 60 次循环。 */
function ganzhiIndex(gan, zhi) {
  const g = B.ganIndex(gan);
  const z = B.zhiIndex(zhi);
  for (let n = 0; n < 60; n++) {
    if (n % 10 === g && n % 12 === z) return n;
  }
  throw new Error(`bazi_fortune: 不存在的干支对 ${gan}${zhi}`);
}

function ganzhiFromIndex(idx) {
  const n = B.mod(idx, 60);
  return [TIANGAN[n % 10], DIZHI[n % 12]];
}

/** 十神。`SHISHEN[日主][目标干]`，目标不在表里给 `''` —— 与 shushu `_shishen_label`
 *  的 `.get(..., "")` 同形。**目标传「五行」时必然得 `''`**（表里只有天干键），
 *  见文件头「照搬的缺陷」第 1 条。 */
function shishenLabel(dm, stem) {
  return B.getShiShen(dm, stem);
}

// ─────────────────────────────────────────────────────────────
// 大运与命局的互动
// ─────────────────────────────────────────────────────────────

function analyzeDayunInteractions(chart, dyGan, dyZhi) {
  const natalGan = PILLARS.map((p) => chart[p].tiangan);
  const natalZhi = PILLARS.map((p) => chart[p].dizhi);
  const dayZhi = chart.day_pillar.dizhi;
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];

  const warnings = [];
  const auspicious = [];
  const dyWx = GAN_WUXING[dyGan] || '';

  // 天干段。**缩进决定重复次数，照搬时勿"顺手整理"**：
  //   `if WUXING_SHENG...`（shushu 8 空格 = 循环内）不引用 `natalG` ⇒ 「生日主」重复 4 次；
  //   `_TIANGAN_HE`/`if _TIANGAN_HE.get(dy_gan) == dm`（shushu **4 空格 = 循环外**）⇒ 「合日主」**只 1 次**。
  // 我第一版把两条都放进循环 ⇒ `auspicious` 多出 3 条「合日主」，对拍当场抓到（金标准 len=3 vs 被验 len=6）。
  // 这类"判据不引用循环变量却在循环里"的重复，是 shushu 自带的输出冗余，**属于要照搬的行为**，不是可清理的笔误。
  for (const natalG of natalGan) {
    const ngWx = GAN_WUXING[natalG] || '';
    if (WUXING_KE[dyWx] === ngWx && natalG === dm) {
      warnings.push(`大运${dyGan}（${dyWx}）克日主${natalG}，运中压力较大`);
    }
    if (WUXING_SHENG[dyWx] === dmWx) {
      auspicious.push(`大运${dyGan}生扶日主，运势有助`);
    }
  }
  // 合日主：循环外，恒至多一条
  if (TIANGAN_HE[dyGan] === dm) {
    auspicious.push(`大运${dyGan}与日主${dm}天干相合，运中有贵人缘`);
  }

  // 地支段
  natalZhi.forEach((natalZ, i) => {
    const label = ZHI_LABELS[i];
    if (LIU_CHONG[dyZhi] === natalZ) {
      const severity = natalZ === dayZhi ? '⚠ 重要' : '注意';
      warnings.push(
        `${severity}：大运支${dyZhi}冲${label}${natalZ}`
        + (natalZ === dayZhi ? '（冲日支，配偶宫/身体宫受冲，需谨慎）' : '')
      );
    }
    if (LIU_HE[dyZhi] === natalZ) {
      auspicious.push(`大运支${dyZhi}与${label}${natalZ}六合，${label}所主之事有益`);
    }
    if (SANXING[dyZhi] === natalZ && dyZhi !== natalZ) {
      warnings.push(`大运支${dyZhi}刑${label}${natalZ}，有是非争讼或身体隐患`);
    }
  });

  // 冲日支再单独提一条（与上面循环里那条**重复**，照搬）
  if (LIU_CHONG[dyZhi] === dayZhi) {
    warnings.push(
      `⚠ 大运地支${dyZhi}冲日支${dayZhi}（日支为配偶宫和本人安危宫），`
      + '此运感情婚姻多波折，身体需加注意'
    );
  }

  return {
    warnings,
    auspicious,
    clash_day_zhi: LIU_CHONG[dyZhi] === dayZhi,
  };
}

/** 流年太岁与命局的互动。`year` 形参在 shushu 里**未被引用**，保留以求签名一致。 */
function analyzeLiunianTaisu(chart, lyGan, lyZhi, year) {  // eslint-disable-line no-unused-vars
  const natalZhi = PILLARS.map((p) => chart[p].dizhi);
  const natalGan = PILLARS.map((p) => chart[p].tiangan);
  const dm = chart.day_master;

  const warnings = [];
  const auspicious = [];
  const tags = [];

  // 冲各柱地支：if/elif 只到「月支」，**冲时支不落任何分支**（照搬）。
  natalZhi.forEach((nz, i) => {
    const label = ZHI_LABELS[i];
    if (LIU_CHONG[lyZhi] !== nz) return;
    if (label === '日支') {
      warnings.push(`⚠ 太岁冲日支（${lyZhi}冲${nz}）：本命年遭冲，感情健康最须谨慎`);
      tags.push('太岁冲日支');
    } else if (label === '年支') {
      warnings.push(`太岁冲年支（${lyZhi}冲${nz}）：祖宅祖业有变动`);
      tags.push('冲年支');
    } else if (label === '月支') {
      warnings.push(`太岁冲月支（${lyZhi}冲${nz}）：事业健康有波折`);
      tags.push('冲月支');
    }
  });

  // 伏吟 / 反吟（《滴天髓·六亲论》）
  PILLARS.forEach((_, i) => {
    const label = ZHI_LABELS[i];
    const ng = natalGan[i];
    const nz = natalZhi[i];
    if (lyGan === ng && lyZhi === nz) {
      tags.push(`伏吟（${label}）`);
      warnings.push(`伏吟年（流年与${label}完全相同）：诸事停滞，宜守不宜动`);
    }
    if (TG_CHONG[lyGan] === ng && LIU_CHONG[lyZhi] === nz) {
      tags.push(`反吟（${label}）`);
      warnings.push(`反吟年（流年天干地支双冲${label}）：反复颠覆，最忌动作`);
    } else if (TG_CHONG[lyGan] === ng) {
      tags.push(`天干冲${label}`);
      warnings.push(`流年天干${lyGan}冲${label}${ng}：易有意外冲突，须防口舌官非`);
    }
  });

  if (TIANGAN_HE[lyGan] === dm) {
    auspicious.push(`流年${lyGan}与日主${dm}天干相合，此年有贵人际遇`);
  }

  // 流年支与命局三合。注意 shushu 用**集合交**（`set & set`）再 `'/'.join(hits)`，
  // 而 python 的 str hash 默认随机化 ⇒ 命中两个支时**它的文案顺序逐进程可变**。
  // 这里按三合组的固定顺序输出，对拍侧按「集合」比对（见 diff_bazi_fortune.py）。
  const natalZhiSet = new Set(natalZhi);
  for (const group of SAN_HE) {
    if (group.branches.indexOf(lyZhi) < 0) continue;
    const hits = group.branches.filter((z) => z !== lyZhi && natalZhiSet.has(z));
    if (hits.length >= 1) {
      auspicious.push(`流年${lyZhi}与命局${hits.join('/')}三合，运势有助推`);
    }
  }

  return {
    warnings,
    auspicious,
    tags,
    is_benming_chong: tags.indexOf('太岁冲日支') >= 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 起运
// ─────────────────────────────────────────────────────────────

/** 顺(+1) / 逆(-1) —— 阳男阴女顺、阴男阳女逆。年干阴阳按**甲丙戊庚壬为阳（序为偶）**。 */
function dayunDirection(gender, yearGan) {
  const yearYang = B.ganIndex(yearGan) % 2 === 0;
  const male = gender === 'male' || gender === '男';
  const forward = (yearYang && male) || (!yearYang && !male);
  return forward ? 1 : -1;
}

/** 起运岁数（**未舍入**）+ 推导过程 —— shushu `_dayun_start_age`。
 *
 *  传统法：阳男阴女顺行，数到**下一个节**；阴男阳女逆行，数到**上一个节**。
 *  3 天折 1 岁（`delta_days / 3`）。
 *
 *  **为什么把未舍入的值和用到的那个节一起返回**：两侧节表不同源（shushu 偏早
 *  4.6–8.2 分钟），起运岁数必然有差。分开返回后，对拍能逐例证明
 *  「岁数之差 **恰好等于** 两侧节时刻之差 ÷ 3」，残差为零 —— 这比写一条
 * 「start_age 允许不同」的申报扎实得多（那是撒胡椒面，见 memory: ai6000-duipan-harness）。
 *
 *  `target === null` 走 shushu 的**回退分支**（取不到节时按月估算）。正常情况下
 *  `nearestJie` 覆盖 y-1..y+1 必然取得到，故这条基本是死的；照搬以求字面一致，
 *  对拍侧遇到它会**显式计数**而不是静默放行。
 */
function dayunStartAgeRaw(birthDt, gender, yearGan) {
  const forward = dayunDirection(gender, yearGan) === 1;
  const { prev, next } = G.nearestJie(ymdhm(birthDt));
  const target = forward ? next : prev;

  if (!target) {
    const t = ymdhm(birthDt);
    let deltaDays;
    if (forward) {
      // 到下个月 1 日：`Date.UTC(y, mo, 1)` 里 mo 是 0 基，传 t.mo 即「下一个月」，
      // 传 12 会自动进位到次年 1 月 —— 与 shushu `replace(day=1)+32d` 的结果一致。
      deltaDays = (Date.UTC(t.y, t.mo, 1) - tsOf(birthDt)) / 86400000;
    } else {
      deltaDays = (tsOf(birthDt) - Date.UTC(t.y, t.mo - 1, 1)) / 86400000;
    }
    return { age: deltaDays / 3.0, target: null, forward };
  }

  const deltaDays = Math.abs(tsOf(target.at) - tsOf(birthDt)) / 86400000;
  return { age: deltaDays / 3.0, target, forward };
}

// ─────────────────────────────────────────────────────────────
// 大运
// ─────────────────────────────────────────────────────────────

/** 吉凶粗判。`helps` = 官杀 + 比劫；`drains` = 财 + 食伤；**印两边都不落 → 平**。
 *  见文件头「照搬的缺陷」第 3 条。 */
function assessQuality(dmWx, targetWx, strength) {
  const helps = targetWx === WUXING_SHENG[WUXING_KE[dmWx] || '']
    || targetWx === dmWx;
  const drains = targetWx === WUXING_KE[dmWx]
    || targetWx === WUXING_SHENG[dmWx];

  if (strength === '身强') {
    if (drains) return '吉';
    if (helps) return '凶';
  } else {
    if (helps) return '吉';
    if (drains) return '凶';
  }
  return '平';
}

/** 大运十步。起点是**月柱在 60 甲子里的下一步（或上一步）**。 */
function calculateDayun(chart, gender, birthYear, numPeriods = 10) {
  const yearGan = chart.year_pillar.tiangan;
  const monthGan = chart.month_pillar.tiangan;
  const monthZhi = chart.month_pillar.dizhi;

  const direction = dayunDirection(gender, yearGan);
  const startAge = pyRound(dayunStartAgeRaw(chart.birth_dt, gender, yearGan).age, 2);

  const monthIdx = ganzhiIndex(monthGan, monthZhi);
  const dmWx = GAN_WUXING[chart.day_master];
  const strengthLabel = resolveStrengthLabel(chart);

  const out = [];
  for (let i = 0; i < numPeriods; i++) {
    const [dyGan, dyZhi] = ganzhiFromIndex(monthIdx + direction * (i + 1));

    // 注意：区间起点用的是**已舍入到两位**的 start_age（shushu 同此），
    // 故 `floor` 只在岁数正好跨整数（x.99 ↔ (x+1).00）时才跟着动。
    const periodStartAge = startAge + i * 10;
    const periodEndAge = startAge + (i + 1) * 10;
    const interactions = analyzeDayunInteractions(chart, dyGan, dyZhi);

    out.push({
      index: i + 1,
      tiangan: dyGan,
      dizhi: dyZhi,
      start_age: pyRound(periodStartAge, 1),
      end_age: pyRound(periodEndAge, 1),
      start_year: birthYear + Math.floor(periodStartAge),
      end_year: birthYear + Math.floor(periodEndAge),
      quality: assessQuality(dmWx, GAN_WUXING[dyGan], strengthLabel),
      dm_shishen: shishenLabel(chart.day_master, dyGan),
      warnings: interactions.warnings,
      auspicious: interactions.auspicious,
      clash_day_zhi: interactions.clash_day_zhi,
    });
  }
  return out;
}

/** 旺衰标签。`analyze_chart` 写的是**字符串**（`analyzer.py:444`），
 *  故 shushu 里那条 `isinstance(dict)` 分支实际是死的；这里保留等价的兜底，
 *  但**不**再造一条 dict 路径（免得看起来像两种输入都支持）。 */
function resolveStrengthLabel(chart) {
  const s = chart.strength;
  if (typeof s === 'string' && s) return s;
  return B.calculateStrength(chart).strength || '中和';
}

// ─────────────────────────────────────────────────────────────
// 流年 / 流月 / 流日 / 流时
// ─────────────────────────────────────────────────────────────

/** 流年区间 [fromYear, toYear]（含两端）。`gender` 形参 shushu 未引用，保留以求签名一致。 */
function calculateLiunian(chart, gender, birthYear, fromYear, toYear) {  // eslint-disable-line no-unused-vars
  if (fromYear === undefined || fromYear === null) fromYear = birthYear;
  if (toYear === undefined || toYear === null) toYear = birthYear + 80;

  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const strength = chart.strength || '中和';

  const out = [];
  for (let yr = fromYear; yr <= toYear; yr++) {
    // 1984 = 甲子年（序 0）。JS 的 `%` 对负数取负 ⇒ 必须过 mod。
    const [lyGan, lyZhi] = ganzhiFromIndex(B.mod(yr - 1984, 60));
    const quality = assessQuality(dmWx, GAN_WUXING[lyGan], strength);
    const taisu = analyzeLiunianTaisu(chart, lyGan, lyZhi, yr);

    out.push({
      year: yr,
      tiangan: lyGan,
      dizhi: lyZhi,
      age: yr - birthYear,
      shishen_gan: shishenLabel(dm, lyGan),
      // 拿**五行**当地支查表 ⇒ 恒为 ''（照搬的缺陷第 1 条）。
      shishen_zhi: shishenLabel(dm, DIZHI_WUXING[lyZhi] || ''),
      quality,
      summary: liunianSummary(dm, lyGan, lyZhi, quality),
      warnings: taisu.warnings,
      auspicious: taisu.auspicious,
      tags: taisu.tags,
      is_benming_chong: taisu.is_benming_chong,
    });
  }
  return out;
}

function liunianSummary(dm, lyGan, lyZhi, quality) {
  const ssGan = shishenLabel(dm, lyGan);
  const wxGan = GAN_WUXING[lyGan] || '';
  if (quality === '吉') return `${lyGan}${lyZhi}年，${ssGan}临运，五行${wxGan}旺，诸事顺遂`;
  if (quality === '凶') return `${lyGan}${lyZhi}年，${ssGan}临运，五行${wxGan}克身，需谨慎行事`;
  return `${lyGan}${lyZhi}年，${ssGan}临运，运势平稳，宜守成待时`;
}

/** 某流年的 12 个月。月支序固定从寅起；月干用**流年干**起五虎遁。
 *  `year` 形参 shushu 未引用，保留以求签名一致。 */
function calculateLiuyue(chart, year, liunianGan) {  // eslint-disable-line no-unused-vars
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const strength = chart.strength || '中和';

  const monthDizhiSeq = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const out = [];

  monthDizhiSeq.forEach((mZhi, i) => {
    const mGan = B.getMonthGan(liunianGan, mZhi);
    const mWx = GAN_WUXING[mGan];
    // **藏干气势派**表（shushu `get_wuxing_strength` → `_STRENGTH_TABLE`），
    // 不是 `STRENGTH_STRICT`（那张是严格《子平真诠》四时表，六爻月建在用）。
    // 两张表在四季月的末月取值不同，混用会静默出错。
    const seasonStatus = T.STRENGTH_QISHI[dmWx][mZhi];

    const quality = assessQuality(dmWx, mWx, strength);
    let finalQuality;
    if (seasonStatus === '旺') finalQuality = quality !== '凶' ? '吉' : '平';
    else if (seasonStatus === '囚' || seasonStatus === '死') finalQuality = quality !== '吉' ? '凶' : '平';
    else finalQuality = quality;

    out.push({
      month_num: i + 1,
      tiangan: mGan,
      dizhi: mZhi,
      shishen_gan: shishenLabel(dm, mGan),
      season_status: seasonStatus,
      quality: finalQuality,
      summary: liuyueSummary(mGan, mZhi, finalQuality, seasonStatus),
    });
  });
  return out;
}

function liuyueSummary(mGan, mZhi, quality, status) {
  if (quality === '吉') return `${mGan}${mZhi}月，日主${status}，月运顺畅`;
  if (quality === '凶') return `${mGan}${mZhi}月，日主${status}，月运有阻，宜低调`;
  return `${mGan}${mZhi}月，日主${status}，月运平稳`;
}

/** 某流年-月的逐日干支。锚点 **2000-01-07 = 甲子日**（已与 `ganzhi.js` 的日柱互证）。
 *  `liunianGan` 形参 shushu 未引用，保留以求签名一致。 */
function calculateLiuri(chart, year, month, liunianGan) {  // eslint-disable-line no-unused-vars
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const strength = chart.strength || '中和';

  // 公历月天数 —— 等价 python `calendar.monthrange(y, m)[1]`（含闰年 2 月）。
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const delta = Math.round((Date.UTC(year, month - 1, d) - Date.UTC(2000, 0, 7)) / 86400000);
    const [dGan, dZhi] = ganzhiFromIndex(B.mod(delta, 60));
    out.push({
      day: d,
      date: `${year}-${pad2(month)}-${pad2(d)}`,
      tiangan: dGan,
      dizhi: dZhi,
      shishen_gan: shishenLabel(dm, dGan),
      quality: assessQuality(dmWx, GAN_WUXING[dGan], strength),
    });
  }
  return out;
}

/** 某日的 12 个时辰。时干用**当日日干**起五鼠遁。
 *  ⚠ 子时这一格见文件头「未决的口径冲突」：shushu 用当日日干，
 *  与本项目「晚子时换日」的拍板不一致，此处照搬 shushu 待用户定。 */
function calculateLiushi(chart, year, month, day) {
  const dm = chart.day_master;
  const dmWx = GAN_WUXING[dm];
  const strength = chart.strength || '中和';

  const delta = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 7)) / 86400000);
  const [dGan] = ganzhiFromIndex(B.mod(delta, 60));

  const hourDizhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const hourRanges = [
    '23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
    '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
    '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
  ];

  return hourDizhi.map((hZhi, i) => {
    const hGan = B.getHourGan(dGan, hZhi);
    return {
      hour_idx: i,
      tiangan: hGan,
      dizhi: hZhi,
      time_range: hourRanges[i],
      shishen_gan: shishenLabel(dm, hGan),
      quality: assessQuality(dmWx, GAN_WUXING[hGan], strength),
    };
  });
}

function pad2(n) { return String(n).padStart(2, '0'); }

/** `/api/v1/bazi/fortune` 的参数装配 —— 逐行对应 `api/bazi.py::get_fortune`：
 *  流年固定 21 年（query_year 起 +20）；流月/流日/流时**逐级可选**，
 *  只有给了上一级才往下算。**不含** combos 层（归 3.5.3）。
 *
 *  `query` = `{year?, month?, day?}`。`chart` 需已过 `analyzeChart`（要 `strength`）。 */
function calculateFortune(chart, gender, birthYear, query = {}) {
  const dayun = calculateDayun(chart, gender, birthYear);
  const fromYear = query.year || birthYear;
  const liunian = calculateLiunian(chart, gender, birthYear, fromYear, fromYear + 20);

  let liuyue = null;
  let liuri = null;
  let liushi = null;

  if (query.year) {
    const [lyGan] = ganzhiFromIndex(B.mod(query.year - 1984, 60));
    liuyue = calculateLiuyue(chart, query.year, lyGan);
    if (query.month) {
      liuri = calculateLiuri(chart, query.year, query.month, lyGan);
      if (query.day) {
        liushi = calculateLiushi(chart, query.year, query.month, query.day);
      }
    }
  }

  return { dayun, liunian, liuyue, liuri, liushi };
}

module.exports = {
  calculateDayun,
  calculateLiunian,
  calculateLiuyue,
  calculateLiuri,
  calculateLiushi,
  calculateFortune,
  dayunDirection,
  dayunStartAgeRaw,
  analyzeDayunInteractions,
  analyzeLiunianTaisu,
  assessQuality,
  ganzhiIndex,
  ganzhiFromIndex,
  tsOf,
  pyRound,
};

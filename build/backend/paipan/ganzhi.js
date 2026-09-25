/**
 * paipan/ganzhi.js —— 历法封装（四柱 + 时辰 + 节气）
 * ==================================================
 *
 * 真源：shushu `core/calendar/current_moment.py::current_sizhu`。
 * 那一版底层是 `lunar_python`，本项目后端已有**同一库的 JS 版** `lunar-javascript`
 * （backend/package.json 既有依赖），故方法名 1:1 对应：
 *
 *   getYearInGanZhiExact()     立春**时刻**换年（不用正月初一）
 *   getMonthInGanZhiExact()    交节**时刻**换月
 *   getDayInGanZhiExact()      日柱（23:00 进位）
 *   getTimeInGanZhi()          时柱
 *   getTimeZhi()               时支
 *   getPrevJieQi(true)         当前统辖之节气（**按「日」比较、且含「气」** —— 见 sizhu 里
 *                              的注：这是照搬 shushu 的缺陷，不是「只取十二节」）
 *
 * ── 两处刻意偏离 shushu：分界一律取「刻」不取「日」 ─────────────
 *
 * shushu 那一版用的是**日粒度**的三个方法（`getYearInGanZhiByLiChun` /
 * `getMonthInGanZhi` / `getDayInGanZhi`），即**整个「日」**就算作新的年/月，
 * 而不管分界时刻在当天几点。本模块一律改用同库的 `*Exact()`（精确到分）。
 * 两处的理由不同，但结论同向，故一起记在这里。
 *
 * ① **晚子时换日**（用户 2026-09-24 拍板）。
 *    不只是派别取舍——实测（2026-05-10 23:00，两边同库同法）：
 *      shushu：日=甲申（getDayInGanZhi 未进位）而 时=丙子
 *    而丙子只可能由**乙日**推出（乙庚丙作初），即 `getTimeInGanZhi()` 内部
 *    **本来就基于已进位的日干**。故 shushu 的日柱与时柱在晚子时这一小时里自相矛盾。
 *    改用 `getDayInGanZhiExact()` 后日柱与时柱同源自洽，矛盾消失。
 *
 * ② **立春/交节换年换月**（2026-09-25 定）。
 *    月建随**交节时刻**换，年柱随**立春时刻**换——万年历把交节时刻精确到分印出来，
 *    就是为此。日粒度口径与之相差的，恰是每个分界日的「分界时刻之前」那一段。
 *    实测 2024–2026 逐小时扫 26352 小时，月柱两版相差 **505 小时（1.9%）**，
 *    **全部**落在交节当日、交节时刻之前；年柱同理落在立春当日之前。
 *    ③ 与库内**另一条互不相干**的代码路径互证：`getJieQiTable()` 里十二「节」
 *    的时刻表（与官方《天文年历》一致，2025 惊蛰 16:07:18、立春 22:10:28），
 *    8 个交节日前后 ±4 小时每 5 分钟共 **776 点，0 处不一致**。
 *    ④ 旁证：shushu 自己也自相矛盾——它的 `solar_terms.get_month_dizhi_at`
 *    走的是交节**时刻**口径（docstring 明写 "which Jié boundary has most recently
 *    passed"），而它的 `current_sizhu` 用日粒度。一个项目里两种月支。
 *
 * 因此本模块**不得**混用日粒度的三个方法——会把矛盾带回来。
 * 代价：历法层对拍里这两年柱/月柱字段成为**已申报偏离**（由
 * `gen_golden_calendar.py` 按规则算出并附理由，不手工维护）。
 */

'use strict';

const path = require('path');

// lunar-javascript 是后端既有依赖；本地对拍（容器外无 node_modules）退回
// nginx 里那份同版本 UMD 构建。容器内该路径不存在，退回分支不会触发。
let lunar;
try {
  lunar = require('lunar-javascript');
} catch (e) {
  lunar = require(path.join(__dirname, '..', '..', 'nginx', 'js', 'lunar.min.js'));
}
const Solar = lunar.Solar;

const C = require('./constants');
const { pyGet, pyTruthy, pyStr, pyDictGet, pyStrJoin } = require('./pycompat.js');

// 时辰名（与 shushu `current_moment._ZHI_HOUR_NAME` 逐字相同）
const ZHI_HOUR_NAME = {
  子: '子时(23-1)', 丑: '丑时(1-3)', 寅: '寅时(3-5)', 卯: '卯时(5-7)',
  辰: '辰时(7-9)', 巳: '巳时(9-11)', 午: '午时(11-13)', 未: '未时(13-15)',
  申: '申时(15-17)', 酉: '酉时(17-19)', 戌: '戌时(19-21)', 亥: '亥时(21-23)',
};

function pad2(n) { return String(n).padStart(2, '0'); }

/**
 * 归一入参为本地（naive）时刻分量。
 *
 * 必须是**本地分量**而非 `new Date(str)`：后者会按运行环境时区解释，
 * 而 shushu 用 `datetime.fromisoformat` 取的就是字面分量。日柱时柱对
 * 时区极敏感，差几小时就换柱，故一律走分量。
 *
 * 接受：
 *   '2026-05-10T23:30:00' / '2026-05-10 23:30' / '2026-05-10'
 *   Date（取其本地分量）
 *   {y, mo, d, h, mi}
 */
function normalize(input) {
  if (input && typeof input === 'object' && !(input instanceof Date) && input.y) {
    return {
      y: +input.y, mo: +input.mo, d: +input.d,
      h: +(input.h || 0), mi: +(input.mi || 0),
    };
  }
  if (input instanceof Date) {
    return {
      y: input.getFullYear(), mo: input.getMonth() + 1, d: input.getDate(),
      h: input.getHours(), mi: input.getMinutes(),
    };
  }
  const s = String(input == null ? '' : input).trim();
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(s);
  if (!m) throw new Error(`ganzhi.sizhu: 无法解析时刻 ${JSON.stringify(input)}`);
  return {
    y: +m[1], mo: +m[2], d: +m[3],
    h: m[4] == null ? 0 : +m[4], mi: m[5] == null ? 0 : +m[5],
  };
}

/**
 * 四柱 + 时辰 + 节气。返回字段名与 shushu `current_sizhu` 逐字相同。
 * @param {string|Date|Object} input 见 normalize
 */
function sizhu(input) {
  const t = normalize(input);
  const lun = Solar.fromYmdHms(t.y, t.mo, t.d, t.h, t.mi, 0).getLunar();

  const yearGZ = lun.getYearInGanZhiExact();      // 立春时刻换年（偏离 shushu，见头注②）
  const monthGZ = lun.getMonthInGanZhiExact();    // 交节时刻换月（偏离 shushu，见头注②）
  const dayGZ = lun.getDayInGanZhiExact();        // 晚子时换日（偏离 shushu，见头注①）
  const hourGZ = lun.getTimeInGanZhi();
  const hourZhi = lun.getTimeZhi();

  // ⚠ `solar_term` 是**照搬 shushu** 的，连同它的缺陷：shushu `current_solar_term` 用的是
  // `get_prev_jie_qi(True)`，而那个 `True` 不是「只要节」而是**按「日」比较**，且**含「气」**。
  // 后果有两条，都是**用户可见**的：① 交节日**当天、交节时刻之前**，这里已经报出**新**节气
  // 名，而 `month_gz` 还是**旧**月 —— 同一次输出里自相矛盾（与 shushu `current_sizhu`
  // 日粒度月柱同源的毛病）；② 中气日会报出「气」（如「春分」）。
  // 2026-09-25 实测参数语义：1984-02-04 12:00 → `getPrevJieQi(true)` = 立春 23:18:44（**未来**），
  // `getPrevJieQi(false)` = 大寒；2025-03-20 12:00 → `(false)` = 惊蛰（对）、`(true)` = 春分（气）。
  // 六爻/梅花对拍能绿是因为**两侧共享**这个缺陷。要改请连带重跑那两层的对拍 —— 见 3.5.2 报告。
  let solarTerm = '';
  const jq = lun.getPrevJieQi(true);
  if (jq && typeof jq.getName === 'function') solarTerm = jq.getName();

  return {
    datetime: `${t.y}-${pad2(t.mo)}-${pad2(t.d)} ${pad2(t.h)}:${pad2(t.mi)}`,
    year_gz: yearGZ,
    month_gz: monthGZ,
    day_gz: dayGZ,
    hour_gz: hourGZ,
    hour_zhi: hourZhi,
    hour_name: ZHI_HOUR_NAME[hourZhi] || '',
    hour_wuxing: C.DIZHI_WUXING[hourZhi] || '',
    day_gan: dayGZ ? dayGZ[0] : '',
    day_gan_wuxing: dayGZ ? (C.GAN_WUXING[dayGZ[0]] || '') : '',
    solar_term: solarTerm,
    seasonal_wx: monthGZ && monthGZ.length > 1 ? (C.DIZHI_WUXING[monthGZ[1]] || '') : '',
  };
}

/**
 * 取 lunar 对象（农历侧的原生 API）。
 *
 * 只在此处 require 历法库一次：梅花起卦要用**农历**年支/月/日，那些字段
 * `sizhu()` 不提供（它只给四柱）。与其让 meihua.js 自己再 require 一份
 * lunar、多一处「库从哪来」的分支，不如从本模块取。
 */
function lunarOf(input) {
  const t = normalize(input);
  return Solar.fromYmdHms(t.y, t.mo, t.d, t.h, t.mi, 0).getLunar();
}

/**
 * 次日的 lunar 对象 —— 晚子时换日用。
 *
 * 走库的 `next(1)` 而不是 `d + 1`：月末、年末、以及农历闰月的进位由库处理，
 * 自己加一天会在这些边界上溢出或落到不存在的日期。
 */
function lunarOfNextDay(input) {
  const t = normalize(input);
  return Solar.fromYmdHms(t.y, t.mo, t.d, t.h, t.mi, 0).next(1).getLunar();
}

/**
 * 月支（月建）—— 精确到交节时刻。
 *
 * 与 `sizhu().month_gz` **同口径**（都走 `getMonthInGanZhiExact()`，
 * 理由见头注②）。留着这个函数是因为调用方常常**只要月支**：
 * 梅花断卦（`meihua.js`）判体卦旺衰就只用它，不必构造整个四柱对象。
 */
function monthDizhiAt(input) {
  const t = normalize(input);
  const gz = Solar.fromYmdHms(t.y, t.mo, t.d, t.h, t.mi, 0)
    .getLunar().getMonthInGanZhiExact();
  return gz && gz.length > 1 ? gz[1] : '';
}

/**
 * 当前统辖的节气 + 下一个节气 —— 盘面「节气」那一行要的是一个**区间**
 * （如「秋分2026.09.23 08:04 ~ 寒露2026.10.08 14:28」）。
 *
 * 与 `sizhu().solar_term` 同源（都是 `getPrevJieQi(true)`）。⚠ **`true` 不是「只要节」**：
 * 实测它是**按「日」比较**且**含「气」**（2025-03-20 12:00 → 春分；1984-02-04 12:00 →
 * 立春 23:18:44，一个**尚未到**的时刻）。故本函数在**交节日当天、交节时刻之前**会显示出
 * 一个「起点在未来」的区间；`sizhu().solar_term` 同理。这是照搬 shushu `current_solar_term`
 * 的缺陷（它的退路分支 `get_jie_dates` 反而是**纯节**，同一函数两条路语义不同），
 * 六爻/梅花对拍能绿是因为两侧共享。要改见 `sizhu` 里的注。
 * 时刻截到**分**：秒位来自天文算法，各家万年历印到分即可，多印几位
 * 反而会与用户手上那本对不上，像是错了。
 *
 * 起卦时刻不可解析时抛错，调用方自行兜底（盘面上少一行，比印个错的好）。
 */
function jieQiRange(input) {
  const t = normalize(input);
  const lun = Solar.fromYmdHms(t.y, t.mo, t.d, t.h, t.mi, 0).getLunar();
  const p = lun.getPrevJieQi(true);
  const n = lun.getNextJieQi(true);
  const at = (jq) => {
    const s = jq && typeof jq.getSolar === 'function' ? jq.getSolar() : null;
    return s ? s.toYmdHms().slice(0, 16) : '';
  };
  return {
    name: (p && p.getName && p.getName()) || '',
    at: at(p),
    nextName: (n && n.getName && n.getName()) || '',
    nextAt: at(n),
  };
}

/** 十二「节」—— 月建只随**节**换，故只有这 12 个参与前后夹逼（「气」不参与）。 */
const JIE_NAMES = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

/** 每个节所在的**公历月**：立春必在 2 月、惊蛰 3 月……大雪 12 月、小寒 1 月。
 *  用来断言「从表里取到的那一格确实是**本年**的那个节」。 */
const JIE_MONTH = {
  '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7,
  '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 12, '小寒': 1,
};

const _jieCache = new Map();

/** 某**公历年**的十二节时刻（升序）—— 对应 shushu `get_jie_dates(year)`。
 *
 *  **为什么不用 `getPrevJieQi`**：那个方法给的是「节 + 气」混着的一串
 *  （实测 2025-03-20 12:00 → `getPrevJieQi(false)` = **春分**，那是「气」；
 *  而 `getPrevJieQi(true)` 更是按**日**比较，见 `jieQiRange` 的注释）。
 *  月建只随节换，所以必须**筛表**才拿得到纯节。
 *
 *  表锚在该年 **3 月 1 日**那天取 —— 实测这样一张表覆盖上年 12 月到次年 3 月，
 *  含本年全部十二节（小寒在 1 月、大雪在 12 月）。**不靠这个观察吃饭**：逐个断言
 *  节的公历年与公历月，不符即抛。这类表最容易的错法就是跨农历年、取到相邻年份的
 *  同名节（差一整年，而月柱/起运全跟着错，且不抛错）。
 */
function jieDatesOfYear(year) {
  if (_jieCache.has(year)) return _jieCache.get(year);
  const table = Solar.fromYmdHms(year, 3, 1, 12, 0, 0).getLunar().getJieQiTable();
  const get = (k) => (typeof table.get === 'function' ? table.get(k) : table[k]);
  const out = JIE_NAMES.map((name) => {
    const s = get(name);
    if (!s) throw new Error(`ganzhi.jieDatesOfYear: ${year} 年表里没有「${name}」`);
    if (s.getYear() !== year || s.getMonth() !== JIE_MONTH[name]) {
      throw new Error(
        `ganzhi.jieDatesOfYear: ${year} 年的「${name}」取到 ${s.toYmdHms()}`
        + `（应在 ${year} 年 ${JIE_MONTH[name]} 月）—— 节气表锚点跨年了`);
    }
    return { name, at: s.toYmdHms() };
  });
  // 'YYYY-MM-DD HH:MM:SS' 定宽零填充 ⇒ 字典序即时序，不必解析成 Date。
  out.sort((a, b) => (a.at < b.at ? -1 : (a.at > b.at ? 1 : 0)));
  _jieCache.set(year, out);
  return out;
}

/**
 * 起运要用的「前一个节 / 后一个节」—— 对应 shushu `core/calendar/solar_terms.py::nearest_jie`：
 * 把 y−1、y、y+1 三年的节并起来升序，取**最后一个 ≤ 出生时刻**的为 prev、
 * **第一个 > 出生时刻**的为 next。只认「节」，不认「气」（shushu 的 `JIE_NAMES` 同此）。
 *
 * 交付的是**可参与算术的时刻**且保留到秒 —— 起运是「距节的时间 ÷ 3 天 = 1 岁」，
 * 精度直接进结果（12 分钟 ≈ 0.0028 岁，而岁数只印两位小数）。
 *
 * ⚠ **这是八字对拍里唯一「故意不同源」的地方**：shushu 的节表走 `ephem`，本模块走
 * lunar-javascript，实测 shushu **系统性偏早 4.6–8.2 分钟**（`duipan/probe_bazi_jieqi_offset.py`）。
 * 故起运岁数与 shushu 必然有差 —— 按**来源**申报，不当作排盘逻辑的差异；但差额必须能被
 * 「两侧节时刻之差 ÷ 3」**逐例算清、残差为零**，见 `duipan/diff_bazi_fortune.py`。
 *
 * `input` 可带 `s`（秒）：`normalize` 只到分，而秒在「正好落在节的那一分钟」时会决定
 * prev/next 的分界，故单独读一次。
 * 返回 `{prev, next}`，各为 `{name, at}` 或 `null`；`null` 时调用方按 shushu 的回退分支处理
 * （本函数覆盖 y−1..y+1，正常年份不会出现）。
 */
function nearestJie(input) {
  const t = normalize(input);
  const sec = (input && typeof input === 'object' && input.s != null) ? Number(input.s) : 0;
  const birthKey = `${String(t.y).padStart(4, '0')}-${pad2(t.mo)}-${pad2(t.d)} `
    + `${pad2(t.h)}:${pad2(t.mi)}:${pad2(sec)}`;

  const all = [];
  for (const y of [t.y - 1, t.y, t.y + 1]) {
    for (const j of jieDatesOfYear(y)) all.push(j);
  }
  all.sort((a, b) => (a.at < b.at ? -1 : (a.at > b.at ? 1 : 0)));

  let prev = null;
  let next = null;
  for (const j of all) {
    if (j.at <= birthKey) prev = j;
    else { next = j; break; }
  }
  return { prev, next };
}

/**
 * 农历「月日」文本，如「八月十四」「闰六月初八」。
 * 直接取库的 `getMonthInChinese()`——**闰月它自带「闰」字**，
 * 不要再自己判 `getMonth() < 0` 拼一次，那样会得到「闰闰六月」。
 */
function lunarText(input) {
  const lun = lunarOf(input);
  return lun.getMonthInChinese() + '月' + lun.getDayInChinese();
}

/**
 * 此刻时令五行（时辰 + 月令）对本命用神/忌神之扶抑。
 *
 * 移植自 shushu `core/calendar/current_moment.py::moment_vs_yongshen`（:81）：
 * 返回 `{tone: 扶用/助忌/中性, quality: 吉/中/凶, note, hour_wuxing, seasonal_wx}`。
 * 供 `master_synthesis` 织入「当下」一层（「此刻为…，时令五行于本命用神为扶/为抑」）。
 *
 * **纯函数**：只吃传进来的 `moment`（`sizhu()` 的产物）与用神/忌神五行，
 * 不读「现在」——「现在」由调用方决定，故这一条可对拍（见 `master_synthesis.js`）。
 *
 * 逐字照搬的三处细节：
 *  ① `yong_wx` 既可是字符串也可是列表（基准 `[x] if isinstance(x,str) else list(x or [])`），
 *     故空值要能落成空列表而不是 `[null]`；
 *  ② 生用神/克用神那一层**只在 w 既非用神也非忌神时才走**（else 分支），
 *     且**每个 w 会与所有 y 比较**，故一个 w 可能同时记 `生用神` 与 `克用神`
 *     （若用神列表里同时有被生者和被克者）——不合并、不去重；
 *  ③ `note` 里的顿号是**全角** `，`，`yong_s` 的连接符是 `、`。
 *
 * ── ⚠ `hour_wx`/`seas_wx` **不许提前 `pyStr`**（本层对拍逼出来的一条）──
 * 基准是 `hour_wx = moment.get("hour_wuxing", "")` —— **原值**，只有当它被插进
 * note 的 f-string 时才 `str()` 一次。原值要一路参与 `w in yong` 与 `_SHENG.get(w)`。
 * 我先前写成「进函数就 `pyStr` 一次」，于是 `hour_wuxing = ["水"]` 这种畸形样本：
 * 基准在 `_SHENG.get(["水"])` 上 `TypeError`（**被调用方 swallow，少一域**），
 * 移植侧却拿 `"['水']"` 查表查不到、安静地算出「中性」（**多一域**）。
 * 现在改成：原值参与逻辑，`pyDictGet` 复刻不可哈希就抛，
 * `pyStrJoin` 复刻非 str 元素就抛 —— 两处都在插值点才 `pyStr`。
 */
function momentVsYongshen(moment, yongWx, jiWx) {
  // `[x] if isinstance(x,str) else list(x or [])` —— 后面那一支是 **Python `list()`**：
  // 字典进 `list()` 出的是**键**，不是它自己；`{...}` 因此在 Python 里是**假**值（空容器）
  // 而 `list({})` 为 `[]`。写成 `Array.isArray ? slice : [x]` 会在字典上分叉。
  // 数字进 `list()` 基准会 TypeError —— 不猜，照抛。
  const toList = (x) => {
    if (typeof x === 'string') return [x];
    if (Array.isArray(x)) return x.slice();
    if (!pyTruthy(x)) return [];
    if (typeof x === 'object') return Object.keys(x);
    // ⚠ 用 `TypeError` 而不是光秃秃的 `Error`：这里照的是 Python 的
    //   `TypeError: 'int' object is not iterable`，而层 16 的 `err` 契约判**类名**。
    //   抛没抛不变（本来就在抛），只是把类名对齐，免得以后成为可修的假红。
    throw new TypeError(`momentVsYongshen: list(${typeof x}) 在基准里会 TypeError`);
  };
  const yong = toList(yongWx === undefined ? '' : yongWx).filter(pyTruthy);
  const ji = toList(jiWx === undefined ? '' : jiWx).filter(pyTruthy);

  // ⚠ 原值，不 `pyStr`（见文件头）。`pyGet` 保住「键在而值为 None」这一态。
  const hourWx = pyGet(moment, 'hour_wuxing', '');
  const seasWx = pyGet(moment, 'seasonal_wx', '');
  const curWxs = [hourWx, seasWx].filter(pyTruthy);

  let score = 0;
  const hits = [];
  for (const w of curWxs) {
    if (yong.includes(w)) {
      score += 1;
      hits.push(`${pyStr(w)}扶用`);
    } else if (ji.includes(w)) {
      score -= 1;
      hits.push(`${pyStr(w)}助忌`);
    } else {
      // 生用神者亦为助；克用神者为抑（见上面 ②）。
      // `pyDictGet` 而非 `C.SHENG[w]`：后者会把 `["水"]` 悄悄转成 `"水"`。
      for (const y of yong) {
        if (pyDictGet(C.SHENG, w) === y) { score += 1; hits.push(`${pyStr(w)}生用神${y}`); }
        else if (pyDictGet(C.KE, w) === y) { score -= 1; hits.push(`${pyStr(w)}克用神${y}`); }
      }
    }
  }

  let tone; let quality;
  if (score > 0) { tone = '扶用'; quality = '吉'; }
  else if (score < 0) { tone = '助忌'; quality = '凶'; }
  else { tone = '中性'; quality = '中'; }

  // `"、".join(yong) or "—"`：join 走 `pyStrJoin`（元素非 str 基准会抛），
  // `or "—"` 是空串兜底。
  const yongS = pyStrJoin(yong, '、') || '—';
  const note = `此刻${pyStr(pyGet(moment, 'hour_name', ''))}（${pyStr(hourWx)}），`
    + `月令${pyStr(seasWx)}，于本命用神（${yongS}）为${tone}`
    + (hits.length ? `（${hits.slice(0, 3).join('，')}）` : '') + '。';
  // ⚠ 返回的两个字段也是**原值**（基准 `"hour_wuxing": hour_wx`），上面只在该插值的地方 pyStr。
  return { tone, quality, note, hour_wuxing: hourWx, seasonal_wx: seasWx };
}

module.exports = { sizhu, normalize, ZHI_HOUR_NAME, monthDizhiAt, lunarOf, lunarOfNextDay, jieQiRange, nearestJie, jieDatesOfYear, lunarText, momentVsYongshen };

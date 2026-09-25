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
 *   getPrevJieQi(true)         当前统辖之节气
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

module.exports = { sizhu, normalize, ZHI_HOUR_NAME, monthDizhiAt, lunarOf };

/**
 * paipan/ganzhi.js —— 历法封装（四柱 + 时辰 + 节气）
 * ==================================================
 *
 * 真源：shushu `core/calendar/current_moment.py::current_sizhu`。
 * 那一版底层是 `lunar_python`，本项目后端已有**同一库的 JS 版** `lunar-javascript`
 * （backend/package.json 既有依赖），故方法名 1:1 对应：
 *
 *   getYearInGanZhiByLiChun()  立春换年（不用正月初一）
 *   getMonthInGanZhi()         节气换月
 *   getDayInGanZhi()           日柱
 *   getTimeInGanZhi()          时柱
 *   getTimeZhi()               时支
 *   getPrevJieQi(true)         当前统辖之节气
 *
 * ── 与 shushu 的唯一差异：晚子时换日 ──────────────────────────
 * 用户 2026-09-24 拍板：**23:00–23:59 日柱进位到次日**（shushu 不进位）。
 *
 * 这不只是派别取舍——实测（2026-05-10 23:00，两边同库同法）：
 *   shushu：日=甲申（getDayInGanZhi 未进位）而 时=丙子
 *   而丙子只可能由**乙日**推出（乙庚丙作初），即 getTimeInGanZhi() 内部
 *   **本来就基于已进位的日干**。故 shushu 的日柱与时柱在晚子时这一小时里
 *   自相矛盾。改用 getDayInGanZhiExact() 后日柱与时柱同源自洽，
 *   该矛盾消失。此为「事实大于 shushu」的一例。
 *
 * 因此本模块**不得**混用 getDayInGanZhi()——那会把矛盾带回来。
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

  const yearGZ = lun.getYearInGanZhiByLiChun();   // 立春换年
  const monthGZ = lun.getMonthInGanZhi();         // 节气换月
  const dayGZ = lun.getDayInGanZhiExact();        // 晚子时换日（唯一偏离 shushu 处）
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

module.exports = { sizhu, normalize, ZHI_HOUR_NAME };

import { AUTH } from '../shared/auth.js';
import { refreshAIPanel } from '../shared/aiPanel.js';
import { TRIGRAMS, currentGua, currentTopic, currentRecordId, currentResultMeta, currentAiPayload, renderAnalysis, renderResult } from '../shared/mhysRender.js';
import { setCurrentAiPayload, setCurrentRecordId, setCurrentResultMeta } from '../shared/mhysRender.js';
import { Solar, Lunar } from '../shared/lunar.js'

// 梅花易数起卦页 —— 「取数与渲染之外」的那一半：纯函数 + 时间选择器状态。
// 逐字搬运自 `src/web/js/page-mhys.js`（判据快照 `duipan/legacy_ref/page-mhys.js`，
// payload sha256 aad85d443209eaaa4e2080397480b5f163a76fc3049047b3adb762ca32b37f81）。
// ==========================================================================
//
// ⚠ **这个文件不许 import 任何东西**（React / CSS / 其它模块都不行）。
//   理由是判据：`duipan/diff_mhys.mjs` 要用 `node:vm` + 最小 DOM 桩把这个模块
//   直接 import 进 Node，逐函数与快照对拍。老 `page-mhys.js` 的形态本来就是
//   「纯函数 + 一坨 DOM 操作」混在一个 classic script 里，这里**一层不拆**：
//   拆成 pure.js / dom.js 反而会让「同一个文件 vs 快照」的对拍变成两份文件互拍。
//
// ─────────────────────────────────────────────────────────────
// 与老实现唯一的形态差异（机械改写，逐处标注）
// ─────────────────────────────────────────────────────────────
// 老实现有三个 **模块级变量** 被别处的函数读写：
//     var selectedTime = null;    // :562
//     var currentCalendar = 'gregorian';  // :563
//     var currentMethod = 'number';       // :322
// ESM 的 export 绑定是只读的，`import { selectedTime }` 后**不能**重新赋值
// （`selectedTime = x` 在 import 侧是 TypeError），而老代码里这三个都被重新赋值过。
// 所以把这三个收进一个可变的 `state` 对象，读写都写成 `state.xxx` ——
// 语义与老实现完全一致（同一份模块级可变状态），只是换了个装它的盒子。
// 差分脚本用 `setState()` 同时改两边的值，所以这条改写**不影响对拍结论**。
//
// 其余一切（字符串常量、分支顺序、变量名、注释里的老行号）都与快照逐字一致。
// 老行号用 `老 :NNN` 标注，方便随时回快照对照。

// ★ 阶段 4：`TRIGRAMS` 不再是 classic script 的全局。`hexagrams_data.js` 已经
//   搬成 `src/app/shared/hexagramsData.js`（ESM），`mhys_render` 从那里导出
//   `TRIGRAMS`（/mhys/ 与 /mhys/result.html 现在都走同一个 import 绑定）。
//   `calcGua` / `fillManualSelects` 里的裸名 `TRIGRAMS` 因此解析到本文件的
//   import（见文件头 import 那一行），装载顺序不再是硬依赖。

/** 老实现的模块级可变状态，收在一个盒子里（原因见文件头）。 */
export const state = {
  /** 老 :562  `var selectedTime = null;`  {year,month,day,hour,minute,calendar} */
  selectedTime: null,
  /** 老 :563  `var currentCalendar = 'gregorian';` */
  currentCalendar: 'gregorian',
  /** 老 :322  `var currentMethod = 'number';` 取值即后端起卦法名 */
  currentMethod: 'number',
  /** 老 :564  `var tpInitialized = false;`  —— 老实现里**只写不读**，照搬保留。 */
  tpInitialized: false,
};

// ==========================================================================
// 64 卦名表（老 :5-18）
// ==========================================================================
export var HEX64 = {};
(function(){
  var names = [
    ['乾为天','泽天夬','火天大有','雷天大壮','风天小畜','水天需','山天大畜','地天泰'],
    ['天泽履','兑为泽','火泽睽','雷泽归妹','风泽中孚','水泽节','山泽损','地泽临'],
    ['天火同人','泽火革','离为火','雷火丰','风火家人','水火既济','山火贲','地火明夷'],
    ['天雷无妄','泽雷随','火雷噬嗑','震为雷','风雷益','水雷屯','山雷颐','地雷复'],
    ['天风姤','泽风大过','火风鼎','雷风恒','巽为风','水风井','山风蛊','地风升'],
    ['天水讼','泽水困','火水未济','雷水解','风水涣','坎为水','山水蒙','地水师'],
    ['天山遁','泽山咸','火山旅','雷山小过','风山渐','水山蹇','艮为山','地山谦'],
    ['天地否','泽地萃','火地晋','雷地豫','风地观','水地比','山地剥','坤为地']
  ];
  for (var u=1; u<=8; u++) for (var l=1; l<=8; l++) HEX64[u+'_'+l] = names[l-1][u-1];
})();

// ==========================================================================
// 五行生克 / 爻与卦的互转（老 :20-47）
// ==========================================================================
export var WUXING = { '金':0, '水':1, '木':2, '火':3, '土':4 };
export function wuxingShengKe(from, to) {
  var f=WUXING[from], t=WUXING[to];
  if(f===t) return '比和';
  if((f+1)%5===t) return '生';
  if((t+1)%5===f) return '被生';
  if((f+2)%5===t) return '克';
  return '被克';
}

export function triToLines(num) {
  var m={1:[1,1,1],2:[1,1,0],3:[1,0,1],4:[1,0,0],5:[0,1,1],6:[0,1,0],7:[0,0,1],8:[0,0,0]};
  return m[num]||[0,0,0];
}
export function linesToTri(lines) {
  var k=lines.join(''), m={'111':1,'110':2,'101':3,'100':4,'011':5,'010':6,'001':7,'000':8};
  return m[k]||8;
}
export function guaToLines(upper,lower) {
  var up=triToLines(upper), lo=triToLines(lower);
  // 上卦在上 下卦在下: [上爻,五爻,四爻,三爻,二爻,初爻]
  return [up[2],up[1],up[0],lo[2],lo[1],lo[0]];
}
export function buildLines(upper,lower,movingPos) {
  var lines=guaToLines(upper,lower), r=[];
  for(var i=0;i<6;i++) r.push({yang:lines[i]===1,moving:(6-i)===movingPos,pos:6-i});
  return r;
}

// ==========================================================================
// 核心：爻象拼装（老 :49-115）
// ==========================================================================
export function calcGua(upperNum, lowerNum, moveNum) {
  var uTri=TRIGRAMS[upperNum], lTri=TRIGRAMS[lowerNum];
  var hexName=HEX64[upperNum+'_'+lowerNum];
  var benLinesData=buildLines(upperNum,lowerNum,moveNum);
  var benGua={
    upper:upperNum, lower:lowerNum,
    upperTri:uTri, lowerTri:lTri,
    name:hexName,
    lines:benLinesData,
    // 由爻象本身反推动爻，不从 moveNum 另抄一份，免得两处哪天不一致
    movingYao:benLinesData.filter(function(l){return l.moving;}).map(function(l){return l.pos;})
  };
  var benLines=guaToLines(upperNum,lowerNum);
  // benLines顺序: [上爻(6),五爻(5),四爻(4),三爻(3),二爻(2),初爻(1)]
  // 下互卦=二三四爻; 上互卦=三四五爻
  var huLowerNum=linesToTri([benLines[4],benLines[3],benLines[2]]);
  var huUpperNum=linesToTri([benLines[3],benLines[2],benLines[1]]);
  var huGua={
    upper:huUpperNum, lower:huLowerNum,
    upperTri:TRIGRAMS[huUpperNum], lowerTri:TRIGRAMS[huLowerNum],
    name:HEX64[huUpperNum+'_'+huLowerNum],
    lines:buildLines(huUpperNum,huLowerNum,0)
  };
  var changedLines=benLines.slice();
  // benLines[0]=上爻(6)...benLines[5]=初爻(1), moveNum 1-6 → index 6-moveNum
  changedLines[6-moveNum]=changedLines[6-moveNum]===1?0:1;
  // linesToTri 期望 [bottom,mid,top]
  var bianUpperNum=linesToTri([changedLines[2],changedLines[1],changedLines[0]]);
  var bianLowerNum=linesToTri([changedLines[5],changedLines[4],changedLines[3]]);
  var bianGua={
    upper:bianUpperNum, lower:bianLowerNum,
    upperTri:TRIGRAMS[bianUpperNum], lowerTri:TRIGRAMS[bianLowerNum],
    name:HEX64[bianUpperNum+'_'+bianLowerNum],
    lines:buildLines(bianUpperNum,bianLowerNum,0)
  };
  var tiNum, yongNum;
  if(moveNum<=3){ tiNum=upperNum; yongNum=lowerNum; }
  else{ tiNum=lowerNum; yongNum=upperNum; }
  var tiTri=TRIGRAMS[tiNum], yongTri=TRIGRAMS[yongNum];
  var relation=wuxingShengKe(tiTri.element, yongTri.element);
  // 吉凶分级取自《梅花易数·体用总诀》：用生体最吉，比和/体克用为吉，体生用/用克体为凶。
  // 判词顺序与分级参照 shushu core/meihua/analyzer.py 的 _RELATION_TEXT。
  var verdict;
  if(relation==='被生') verdict={text:'用生体 · 大吉',level:'大吉',score:2,cls:'v-daiji',desc:'外部力量来帮你，事情顺、容易成。宜顺势而为，借力而行。'};
  else if(relation==='比和') verdict={text:'体用比和 · 吉',level:'吉',score:1,cls:'v-ji',desc:'内外和谐、彼此不相克，和顺可成。守正持中，顺势而行。'};
  else if(relation==='克') verdict={text:'体克用 · 吉',level:'吉',score:1,cls:'v-ji',desc:'主动权在你手上，事情能成，但要费些力气。宜适度，过刚易折。'};
  else if(relation==='生') verdict={text:'体生用 · 凶',level:'凶',score:-1,cls:'v-xiong',desc:'你在往外耗力气，费力而未必讨好。宜量力而行，有所取舍。'};
  else verdict={text:'用克体 · 凶',level:'凶',score:-1,cls:'v-xiong',desc:'外部压力压在身上，受制于外、多有阻碍。宜守不宜攻，以柔克刚，待机而行。'};
  // 错卦：六爻全变（阴阳互变）
  var cuoLines=benLines.slice();
  for (var ci=0;ci<6;ci++) cuoLines[ci]=cuoLines[ci]===1?0:1;
  var cuoUpperNum=linesToTri([cuoLines[2],cuoLines[1],cuoLines[0]]);
  var cuoLowerNum=linesToTri([cuoLines[5],cuoLines[4],cuoLines[3]]);
  var cuoGua={upper:cuoUpperNum,lower:cuoLowerNum,upperTri:TRIGRAMS[cuoUpperNum],lowerTri:TRIGRAMS[cuoLowerNum],name:HEX64[cuoUpperNum+'_'+cuoLowerNum],lines:buildLines(cuoUpperNum,cuoLowerNum,0)};
  // 综卦：将本卦上下颠倒（六爻全反转）
  var zongLines = benLines.slice().reverse();
  var zongUpperNum=linesToTri([zongLines[2],zongLines[1],zongLines[0]]);
  var zongLowerNum=linesToTri([zongLines[5],zongLines[4],zongLines[3]]);
  var zongGua={upper:zongUpperNum,lower:zongLowerNum,upperTri:TRIGRAMS[zongUpperNum],lowerTri:TRIGRAMS[zongLowerNum],name:HEX64[zongUpperNum+'_'+zongLowerNum],lines:buildLines(zongUpperNum,zongLowerNum,0)};
  return {
    upper:upperNum, lower:lowerNum, move:moveNum,
    benGua:benGua, huGua:huGua, bianGua:bianGua,
    cuoGua:cuoGua, zongGua:zongGua,
    ti:{num:tiNum,tri:tiTri}, yong:{num:yongNum,tri:yongTri},
    relation:relation, verdict:verdict
  };
}

// ===== 时间计算（农历） =====
export function getShichen(hour) {
  var names=['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];
  var idx;
  if(hour>=23||hour<1) idx=0; else if(hour<3) idx=1; else if(hour<5) idx=2;
  else if(hour<7) idx=3; else if(hour<9) idx=4; else if(hour<11) idx=5;
  else if(hour<13) idx=6; else if(hour<15) idx=7; else if(hour<17) idx=8;
  else if(hour<19) idx=9; else if(hour<21) idx=10; else idx=11;
  return {name:names[idx], num:idx+1};
}

/* Solar / Lunar 已改成 ESM import（文件头） */
export function enrichTimeInfo() {
  if (!state.selectedTime) initTime();
  var info = {};
  try {
    if (typeof Solar !== 'undefined') {
      var y = state.selectedTime.year, m = state.selectedTime.month, d = state.selectedTime.day;
      var h = state.selectedTime.hour, min = state.selectedTime.minute;
      var isLunar = state.selectedTime.calendar === 'lunar';

      var solar, lunar;
      if (isLunar && typeof Lunar !== 'undefined') {
        // 农历输入也要带时辰，否则时柱恒为子时
        lunar = Lunar.fromYmdHms(y, m, d, h, min || 0, 0);
        solar = lunar.getSolar();
      } else {
        solar = Solar.fromYmdHms(y, m, d, h, min || 0, 0);
        lunar = solar.getLunar();
      }
      info.lunarYear = lunar.getYearInChinese();
      info.lunarMonth = lunar.getMonthInChinese();
      info.lunarDay = lunar.getDayInChinese();
      // 年柱以**立春时刻**换年、月柱以**交节时刻**换月。
      // 必须是 `*Exact()`：不带 Exact 的版本按「日」换（立春/交节当天整天算新柱），
      // 与后端 `paipan/ganzhi.js` 口径不同。两边不一致时，用户在页面上看到的月建
      // 与 AI 断卦用的月建会在交节当日**差一位** —— 而 AI 的解读照样头头是道，
      // 用户看不出它引用的不是自己眼前那张盘。
      info.yearGZ = lunar.getYearInGanZhiExact();
      info.monthGZ = lunar.getMonthInGanZhiExact();
      info.hourGZ = lunar.getTimeInGanZhi();
      // 晚子时(23:00-23:59)日柱进位次日。用库自带的 Exact 版：
      // 它与 getTimeInGanZhi() 同源（时干由进位后的日干推），两者不会脱节
      info.dayGZ = lunar.getDayInGanZhiExact();
      // 空亡：四柱各自推算
      info.xkYear = xunKongFromDayGZ(info.yearGZ);
      info.xkMonth = xunKongFromDayGZ(info.monthGZ);
      info.xkDay = xunKongFromDayGZ(info.dayGZ);
      info.xkHour = xunKongFromDayGZ(info.hourGZ);
      var prev = lunar.getPrevJieQi();
      var next = lunar.getNextJieQi();
      if (prev && next) info.jieQi = prev.getName() + ' ~ ' + next.getName();
      var prevJqTime = prev ? prev.getSolar().toYmd() : '';
      var nextJqTime = next ? next.getSolar().toYmd() : '';
      if (prevJqTime && nextJqTime) info.jieQiFull = prev.getName()+' '+prevJqTime+' ~ '+next.getName()+' '+nextJqTime;
    }
  } catch(e) {}
  return info;
}

// 干支 → 空亡（旬空）：先定旬，再取末尾二支
export function xunKongFromDayGZ(dayGZ) {
  if (!dayGZ || dayGZ.length < 2) return '';
  var stems  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var branchs = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var s = stems.indexOf(dayGZ.charAt(0));
  var b = branchs.indexOf(dayGZ.charAt(1));
  if (s === -1 || b === -1) return '';
  // 本旬甲所落地支 = 当前地支 - 当前天干偏移（mod 12）
  var jiaBranch = (b - s + 12) % 12;
  // 空亡 = 甲落支往后第10、11位
  var xk1 = (jiaBranch + 10) % 12;
  var xk2 = (jiaBranch + 11) % 12;
  return branchs[xk1] + branchs[xk2];
}

// ===== 起卦：一律交后端 =====
//
// 本页**不再有任何取数实现**。历史上起卦被抄成了三份（本页、六爻页、AI 对话页），
// 三份各自出错，且都是「看着正常但错」的卦：报数的动爻写成「第三个数÷6」（古法
// 是三数之和÷6）、拆半求和从已取模的上下卦取模、时间起卦拿公历年当农历年支。
// 用户分辨不出眼前的卦是错的 —— 所以取数只能有一份，在后端
// （`src/server/paipan/meihua.js`，逐例对拍过）。本页只做两件事：
// 收用户输入、把用户**选定的时间**原样送上去。
//
// 「用户选定的时间」是这里的关键。原先「动爻加时辰」读的是墙上时钟
// （`getLunarInfo()` 里 `new Date()`）：页面上选 08:00，只要此刻是 22:00，
// 动爻就按亥时加 —— 用户看不见这件事，只会觉得卦不准。

// selectedTime → 后端认的时刻串（`YYYY-MM-DDTHH:MM:00`）。
// 农历选择必须先换成公历：起卦公式取的是农历月/日/年支，但**时刻本身**得是
// 一个真实的时间点，后端才推得出四柱与月建。
export function selectedTimeToIso() {
  if (!state.selectedTime) initTime();
  var t = state.selectedTime, y = t.year, m = t.month, d = t.day;
  if (t.calendar === 'lunar') {
    // 没农历库时**不能**拿农历数字当公历顶上 —— 那会排出一个「看着正常的错卦」，
    // 用户分辨不出来，比直接报错危险。
    if (typeof Lunar === 'undefined') return null;
    try {
      var s = Lunar.fromYmdHms(y, m, d, t.hour, t.minute || 0, 0).getSolar();
      y = s.getYear(); m = s.getMonth(); d = s.getDay();
    } catch (e) { return null; }
  }
  var p2 = function (n) { return String(n).padStart(2, '0'); };
  return y + '-' + p2(m) + '-' + p2(d) + 'T' + p2(t.hour) + ':' + p2(t.minute || 0) + ':00';
}

// 报数（三个数）。判据是「有没有分隔符」：
//   「10 8 6」「10,8,6」→ 按三个**数**读（报 10 是常事，输入框原来却限死 3 位）
//   「386」            → 按三个**数字**逐位读（本页原来的读法，不改）
export function parseReportNumbers(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, msg: '请输入数字' };
  if (/[^0-9\s,，、]/.test(s)) return { ok: false, msg: '只能填数字，三个数之间可以用空格分开' };
  var parts = s.split(/[^0-9]+/).filter(function (x) { return x !== ''; });
  var nums = (parts.length > 1 || /[\s,，、]/.test(s))
    ? parts.map(function (x) { return parseInt(x, 10); })
    : s.split('').map(function (c) { return parseInt(c, 10); });
  if (nums.length !== 3) return { ok: false, msg: '需要正好三个数，现在有 ' + nums.length + ' 个' };
  // 0 **可以报**（用户 2026-10-19）：0 就按「余数为 0」算 —— 上/下卦取 8（坤）、
  // 动爻照旧按三个数之和取。所以这里不再拦 0；正则已保证只能是 0-9，不会出现负数。
  return { ok: true, nums: nums };
}

// 拆半求和：逐位数字。0 在这里**允许** —— 它只参与求和，不像报数那样直接当卦数。
export function parseSplitDigits(raw) {
  var s = String(raw == null ? '' : raw).trim();
  if (!s) return { ok: false, msg: '请输入数字' };
  if (/[^0-9]/.test(s)) return { ok: false, msg: '只能填数字（逐位输入，不用分隔符）' };
  return { ok: true, digits: s.split('').map(function (c) { return parseInt(c, 10); }) };
}

// 自动起卦 = 抽签。**抽签在页面发生**（用户没有数可报时的一条路），抽出卦号后按
// 「手动指定」入后端 —— 后端没有、也不该有「随机」这个起卦法。
export function drawRandom() {
  return {
    upper: Math.floor(Math.random() * 8) + 1,
    lower: Math.floor(Math.random() * 8) + 1,
    moving: Math.floor(Math.random() * 6) + 1
  };
}

// 收集当前选择 → 端点入参。返回 {ok:true, body, method, numbers, datetime}
// 或 {ok:false, msg}（msg 直接给人看）。
export function buildQiguaRequest() {
  var dt = selectedTimeToIso();
  if (!dt) {
    return { ok: false, msg: '起卦时间换算失败（农历数据未加载，或该日期不存在）。请刷新页面重试，或把时间改成公历。' };
  }
  var topic = document.getElementById('topicInput').value.trim();
  var body = { method: state.currentMethod, datetime: dt, topic: topic };
  var out = { ok: true, body: body, method: state.currentMethod, numbers: '', datetime: dt };

  if (state.currentMethod === 'time') {
    // 时间起卦：取数全在后端，用哪个时刻就是上面那一个
  } else if (state.currentMethod === 'manual') {
    var u = parseInt(document.getElementById('manualUpper').value, 10);
    var l = parseInt(document.getElementById('manualLower').value, 10);
    var m = parseInt(document.getElementById('manualMove').value, 10);
    // 必须校验：空值/越界会让 NaN 一路传下去，排出一个空卦
    if (!(u >= 1 && u <= 8) || !(l >= 1 && l <= 8) || !(m >= 1 && m <= 6)) {
      return { ok: false, msg: '请填写：上卦 1-8、下卦 1-8、动爻 1-6' };
    }
    body.upper = u; body.lower = l; body.moving = m;
  } else if (state.currentMethod === 'number') {
    var r1 = parseReportNumbers(document.getElementById('numberInput').value);
    if (!r1.ok) return r1;
    body.num1 = r1.nums[0]; body.num2 = r1.nums[1]; body.num3 = r1.nums[2];
    body.addShichen = document.getElementById('numberAddShichen').checked;
    out.numbers = r1.nums.join(' ');
  } else if (state.currentMethod === 'split') {
    var r2 = parseSplitDigits(document.getElementById('splitInput').value);
    if (!r2.ok) return r2;
    body.digits = r2.digits;
    body.addShichen = document.getElementById('splitAddShichen').checked;
    out.numbers = r2.digits.join(' ');
  } else if (state.currentMethod === 'character') {
    var txt = document.getElementById('charInput').value.trim();
    if (!txt) return { ok: false, msg: '请输入想占的字或一句话' };
    // 一字占：古法要按楷书拆左右笔画（《梅花易数·字占》「以左为阳画，以右为阴画」），
    // 本版没做 —— 前端先拦一道，后端同样拒收（别让用户白等一次请求）。字数按**非空白
    // 字符**数，与后端一致（「　日　」算一个字）。
    var nChar = Array.from(txt).filter(function (c) { return !/\s/.test(c); }).length;
    if (nChar === 1) {
      return { ok: false, msg: '古法一字占要按楷书分左右笔画取卦，本版还没做，请输入两个字以上（也可以改用数字或时间起卦）' };
    }
    body.text = txt;
  } else if (state.currentMethod === 'auto') {
    var drawn = drawRandom();
    body.method = 'manual';        // 后端无「随机」一法，抽完按指定卦号入
    body.upper = drawn.upper; body.lower = drawn.lower; body.moving = drawn.moving;
    out.method = 'auto';           // 记录与展示仍写「自动起卦」（用户点的是它）
  } else {
    return { ok: false, msg: '未知的起卦方式' };
  }
  return out;
}

// ===== 当前选中的方法 =====
// 取值即后端起卦法名（见下拉里的 data-method）。默认 `number` = 原来的「数字起卦2」
// （报三个数），页面上默认选中的那项与它一致。
// 老 :322 的 `var currentMethod` 现在住在 `state.currentMethod`（见文件头）。

export function toggleDropdown() {
  var dd=document.getElementById('methodDropdown');
  var ar=document.getElementById('methodArrow');
  if(dd.classList.contains('open')){
    dd.classList.remove('open');
    ar.textContent='▾';
  } else {
    dd.classList.add('open');
    ar.textContent='▴';
  }
}

export function selectMethod(method, el) {
  state.currentMethod = method;
  document.getElementById('methodLabel').textContent = el.textContent.replace('✓','');
  document.querySelectorAll('.method-option').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  document.getElementById('methodDropdown').classList.remove('open');
  document.getElementById('methodArrow').textContent='▾';
  renderMethodParams();
}

// 点击空白关闭下拉。
// ⚠ 老实现（快照 :347-353）是在 classic script **顶层**注册的；这里改成导出的
//   `bindDocumentClick()`，由 main.jsx 显式调用一次。原因是 ESM 模块求值时
//   `document` 一定在、但 `#methodSelector`（React 还没提交）不一定在 ——
//   顶层直接注册的话，用户在 React 提交前点到页面会走进 `sel.contains` 抛错。
//   调用点与 React 的 flushSync 提交绑在一起，等价于老实现的「DOM 就绪后可用」。
//   注册时机差异只影响「首屏提交前能否点到」，差分脚本对拍不到这一段。
export function bindDocumentClick() {
  document.addEventListener('click', function(e) {
    var sel=document.getElementById('methodSelector');
    if(!sel.contains(e.target)){
      document.getElementById('methodDropdown').classList.remove('open');
      document.getElementById('methodArrow').textContent='▾';
    }
  });
}

/* global TRIGRAMS */
export function renderMethodParams() {
  var container = document.getElementById('methodParams');
  var h = '';
  switch(state.currentMethod) {
    case 'time':
      h = '<div class="algo-text">起卦方法（月日数为农历）：\n上卦：(年支数 + 月数 + 日数) ÷ 8 所得余数为上卦\n下卦：(年支数 + 月数 + 日数 + 时支数) ÷ 8 所得余数为下卦\n动爻：(年支数 + 月数 + 日数 + 时支数) ÷ 6 所得余数</div>';
      break;
    case 'manual':
      h = '<div style="margin-top:0.6rem">'+
          '<div class="form-row"><label>上卦</label><select id="manualUpper"></select></div>'+
          '<div class="form-row"><label>下卦</label><select id="manualLower"></select></div>'+
          '<div class="form-row"><label>动爻</label><select id="manualMove"></select></div>'+
          '</div>';
      // 延迟填充下拉
      setTimeout(fillManualSelects, 50);
      break;
    case 'split':
      h += '<div style="margin-top:0.6rem">'+
          '<div class="num-input-row"><input type="text" id="splitInput" placeholder="连续输入数字，如 386 或 1234" inputmode="numeric" style="flex:1"><label class="cb-inline"><input type="checkbox" id="splitAddShichen" checked> 动爻加时辰</label></div>'+
          '<div class="algo-text">起卦算法（古法）：取输入的每一位数字，平分为前后两半，前一半之和 ÷8 得余数为上卦，后一半之和 ÷8 得余数为下卦，前后两半和数之和 ÷6 得余数为动爻。若数字个数为奇数，前部分比后部分少一个。</div>'+
          '</div>';
      break;
    case 'number':
      // 输入框**不再限 3 位**（原来 `maxlength="3"`）：那样只能报个位数，
      // 报数 10 / 16 根本打不出来。现在「386」仍按三个数字读（与原来一致），
      // 若用空格等分隔符写「10 8 6」则按三个**数**读。
      h += '<div style="margin-top:0.6rem">'+
          '<div class="num-input-row"><input type="text" id="numberInput" placeholder="输入一个三位的数字" inputmode="numeric" style="flex:1;text-align:center"><label class="cb-inline"><input type="checkbox" id="numberAddShichen" checked> 动爻加时辰</label></div>'+
          // §5.1（用户 2026-10-17）：原提示写「报的数都是 1 以上的正整数：0 不在先天卦数里
          //   （八卦对应 1-8）」，而 placeholder 示例却是两位数 `10 8 6` —— 自己跟自己打架。
          //   实测两边只有**文案**错：`parseReportNumbers` 与后端 `qiguaNumbers()` 都只要求
          //   正整数、不设上限，`10 8 6` / `16 8 6` 一直都能出盘。按计划「不许两边都改」，
          //   这里只把「两位数可以填、取的是除以 8 的余数」说明白，校验一个字没动。
          '<div class="algo-text">起卦算法（古法）：第1个数 ÷8 得余数为上卦，第2个数 ÷8 得余数为下卦，三个数之和 ÷6 得余数为动爻。\n报数填 0 以上的整数就行：两位数、三位数都可以，取的是除以 8 的余数（例：10 ÷ 8 余 2 取兑，16 ÷ 8 余 8 取坤）。\n0 也可以报：0 按余数为 0 算，上、下卦都取 8（坤）。</div>'+
          '</div>';
      break;
    case 'character':
      h += '<div style="margin-top:0.6rem">'+
          '<div class="num-input-row"><input type="text" id="charInput" placeholder="输入想占的字或一句话" style="flex:1"></div>'+
          '<div class="algo-text">起卦算法（依《梅花易数·字占》原文）：\n'+
          '两个字、三个字按笔画取数（笔画取自内置常用字表，表外字会提示改用别法）；\n'+
          '四个字以上不必数笔画，改按读音取数 —— 平声1、上声2、去声3、古入声字4；\n'+
          '十一个字以上连读音也不用，只按字数，每字算 1。\n'+
          '前一半之和 ÷8 得上卦，后一半之和 ÷8 得下卦，全部之和 ÷6 得动爻（余数为 0 时取 8、8、6）。\n'+
          '读音以今天的普通话为准、古入声字另外单算（多音字只要有入声读法就按入声算 —— 这一条是本版的约定，原文没规定）；每个字取几、依据是什么，明细里逐字列出。\n'+
          '古法一字占要按楷书拆左右笔画，本版未做 —— 请输入两个字以上（也可以改用数字或时间起卦）。</div>'+
          '</div>';
      break;
    case 'auto':
      h = ''; // 不显示输入框和说明
      break;
  }
  container.innerHTML = h;
}

export function fillManualSelects() {
  var selU=document.getElementById('manualUpper');
  var selL=document.getElementById('manualLower');
  var selM=document.getElementById('manualMove');
  if(!selU||selU.options.length>0) return;
  for(var i=1;i<=8;i++){
    var t=TRIGRAMS[i];
    selU.innerHTML+='<option value="'+i+'">'+t.symbol+' '+t.full+'</option>';
    selL.innerHTML+='<option value="'+i+'">'+t.symbol+' '+t.full+'</option>';
  }
  for(var j=1;j<=6;j++) selM.innerHTML+='<option value="'+j+'">第 '+j+' 爻</option>';
}

// ===== 开始排盘 =====
export async function startDivination(e) {
  if(e){ e.preventDefault(); e.stopPropagation(); }
  var btn = document.getElementById('startBtn');

  // ===== 1. 收集输入（校验也在这一步里） =====
  var req = buildQiguaRequest();
  if (!req.ok) { alert(req.msg); resetBtn(); return; }

  // ===== 2. 起卦：交给后端，页面等结果 =====
  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '排盘中…';
  var pay;
  try {
    var resp = await fetch('/api/meihua/paipan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    pay = await resp.json();
    if (!resp.ok) {
      // 后端拒了就说后端给的理由（如「报的数要 1 以上」「这些字不在笔画表里」），
      // 不吞掉换成「排盘失败」—— 用户照着理由改输入才有用
      alert('排盘失败：' + ((pay && pay.error) || ('HTTP ' + resp.status)));
      resetBtn(); return;
    }
  } catch (err) {
    alert('排盘请求失败，请检查网络后重试。');
    resetBtn(); return;
  }
  var q = pay && pay.qigua;
  if (!q || !q.upper_num) { alert('排盘结果不完整，请重试。'); resetBtn(); return; }

  // ===== 3. 组装记录 =====
  // 卦号只用后端回的这三个，页面**不再自己算一遍**。`result.gua` 仍由本页的
  // calcGua 拼出展示形状（互卦/错卦/综卦/体用判词），它只吃这三个卦号 ——
  // 那部分是**渲染**不是取数，它的正确性由 duipan/verify_meihua_vs_front.js
  // 用 64×64×6 全组合逐项核过。
  var topic = req.body.topic;
  var result = {
    method: req.method,
    addShichen: !!req.body.addShichen,
    calc: { upper: q.upper_num, lower: q.lower_num, move: q.moving },
    qigua: q,   // 后端起的卦（含取数过程），记录里留一份备查
    gua: calcGua(q.upper_num, q.lower_num, q.moving),
    topic: topic,
    divinationTime: req.datetime,
    createdAt: new Date().toISOString(),
    // 记录实际排盘时间（按钮点击时间，用于排序）
    recordTime: new Date().toISOString(),
    lunarInfo: enrichTimeInfo()
  };
  if (req.numbers) result.numbers = req.numbers;

  // 事项为空 → 临时排盘，不保存记录
  if (!topic) { showResultHere(result); return; }

  // 有事项 → 存一条记录。存不上不影响看结果（只是记录列表里没有这条）。
  var newRecordId = null;
  try {
    var sresp = await fetch('/api/mhys-records', {
      method: 'POST',
      headers: AUTH.isLoggedIn()
        ? { 'Content-Type':'application/json', 'Authorization':'Bearer '+AUTH.getToken() }
        : { 'Content-Type':'application/json' },
      body: JSON.stringify({
        topic: topic,
        method: result.method,
        resultData: result
      })
    });
    if (sresp.ok) {
      var saved = await sresp.json();
      newRecordId = saved.id;
    }
  } catch(e) {}
  showResultHere(result);
  // ⚠ 认记录 id 要**等 showResultHere 渲染完**再说：renderResult() 里会把
  //   `currentRecordId` 清空（它属于上一卦，见那个函数里的注释）。先设就被清掉了 ——
  //   那样这一卦的解读不会回写记录，而界面上一点异常都看不出来。
  setCurrentRecordId( newRecordId);
}

// 结果就渲染在本页下面（原先这里是跳 /mhys/result.html）。
// 结果页 result.html 没废：历史记录点进去看的还是它，两页共用 mhys_render.js。
export function showResultHere(result) {
  // 这两项 result.html 的 load() 会填，本页也得填 —— AI 面板（下一步）要用
  setCurrentResultMeta( {
    divinationTime: result.divinationTime || '',
    createdAt: result.createdAt || '',
    method: result.method || ''
  });
  setCurrentAiPayload( {
    numbers: result.numbers || '',
    lunarInfo: result.lunarInfo || {}
  });
  var area = document.getElementById('resultArea');
  area.innerHTML = renderResult(result);  // 顺手设好全局 g / currentTopic / currentGua
  renderAnalysis();                       // 必须在插进 DOM 之后，它要找 #analysisArea
  // 换卦了：让 AI 面板也按**这一卦**重画。数据层已经清空（`renderResult()` 里），
  // 但屏幕上的 DOM 还是上一卦的正文 —— 不叫这一声，用户就会看到
  // 「第二卦的盘 + 第一卦的解读」。面板关着时它是空操作。
  // （`typeof` 兜一下：页面与引擎分属两个文件，万一线上留了一版旧引擎，
  //  这里宁可少做一件事，也不要让整页因为一个未定义的函数停在这儿。）
  if (typeof refreshAIPanel === 'function') refreshAIPanel();
  resetBtn();
  if (area.scrollIntoView) area.scrollIntoView({ behavior:'smooth', block:'start' });
  // 结果一出来**不**自动解读。2026-09-25 用户拍板：「三个的 ai 解析都不要自动开始了，
  // 要点击才开始」—— 原来这里调 `autoStartAI()`（既开面板又立刻发请求），
  // 用户排完盘就被扣一次积分。现在只渲染结果，要解读自己点页头那颗
  // 「☯ 看不懂？试试自动解析」（面板在 /js/mhys_ai_panel.js 里）。
  // ⚠ 别把 `autoStartAI()` 加回来：引擎里那个函数已经一并删了（全站再无调用者）。
}

// ===== 初始化 =====
// 老实现的 `init()` 在快照最后一行**裸调**（`init();`）。搬过来之后由 main.jsx
// 在 React 外壳 flushSync 提交之后调用一次 —— 时序与老页面等价（都在页面可交互
// 之前、DOM 已在），唯一差别是老页面此时 #startBtn 还没被 React 建出来、老实现
// 靠 `disabled = false` 那一行；新实现调用时它一定在。**装载顺序是判据**：
// 见 main.jsx 顶部关于 ai_panel.js `mountAIPanel()` 的说明。
export function init() {
  initTime();
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 30000);
  renderMethodParams();
  document.getElementById('startBtn').disabled = false;
}

// 页面离开前重置按钮，确保 bfcache 恢复时按钮状态正常
export function bindPageLifecycle() {
  window.addEventListener('pagehide', function() {
    resetBtn();
  });

  // 双保险：pageshow 在从 bfcache 恢复时也触发
  window.addEventListener('pageshow', function() {
    // requestAnimationFrame 确保 DOM 已渲染后再重置
    requestAnimationFrame(function() { resetBtn(); });
  });
}

export function resetBtn() {
  var btn = document.getElementById('startBtn');
  if (btn) {
    btn.textContent = '开始排盘';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}
// ===== 时间选择器 =====
// 老 :562-564 的三个 `var` 现在住在 `state`（见文件头）。老 :564 的 `tpInitialized`
// 在快照里**只被写、从不被读**（renderPicker 里那个 if 是个空壳），照搬保留，
// 不修 —— 它是死代码，但「不顺手改进」是这次搬运的硬约束。
var LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
var LUNAR_DAYS30 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
var LUNAR_DAYS29 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九'];
var SHICHEN_NAMES = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];

// ⚠ 老实现里 `LUNAR_DAYS29` 与 `SHICHEN_NAMES` 这两个数组**从来没有被读过**
//   （`LUNAR_DAYS30` 与 `getShichen()` 内联的 names 才是真在用的）。
//   照搬保留：删掉它们等于顺手改进，而且以后有人加回「农历小月 29 天」时会没有参照。

export function initTime() {
  var now = new Date();
  state.selectedTime = {
    year: now.getFullYear(), month: now.getMonth()+1, day: now.getDate(),
    hour: now.getHours(), minute: now.getMinutes(),
    calendar: 'gregorian'
  };
  state.currentCalendar = 'gregorian';
  updateTimeDisplay();
}

export function updateTimeDisplay() {
  if (!state.selectedTime) return;
  var el = document.getElementById('timeDisplay');
  if (!el) return;
  if (state.selectedTime.calendar === 'lunar') {
    var m = state.selectedTime.month, d = state.selectedTime.day;
    var monName = (m>=1&&m<=12) ? LUNAR_MONTHS[m-1] : String(m);
    var dayName = (d>=1&&d<=30) ? LUNAR_DAYS30[d-1] : String(d);
    var sc = getShichen(state.selectedTime.hour);
    el.textContent = '农历'+state.selectedTime.year+'年'+monName+dayName+' '+state.selectedTime.hour+sc.name+String(state.selectedTime.minute).padStart(2,'0')+'分';
  } else {
    el.textContent = state.selectedTime.year+'-'+String(state.selectedTime.month).padStart(2,'0')+'-'+String(state.selectedTime.day).padStart(2,'0')+' '+
      String(state.selectedTime.hour).padStart(2,'0')+':'+String(state.selectedTime.minute).padStart(2,'0');
  }
}

export function openTimePicker() {
  if (!state.selectedTime) initTime();
  var overlay = document.getElementById('tpOverlay');
  overlay.style.display = 'flex';
  state.currentCalendar = state.selectedTime.calendar;

  // 更新切换按钮
  var btns = document.querySelectorAll('.tp-toggle-btn');
  btns.forEach(function(b){ b.classList.toggle('active', b.dataset.cal===state.currentCalendar); });

  renderPicker();

  // 滚动到当前值
  scrollToCurrent();
}

export function closeTimePicker(e) {
  if (e && e.target !== document.getElementById('tpOverlay')) return;
  document.getElementById('tpOverlay').style.display = 'none';
}

export function switchCalendar(cal) {
  if (cal === state.currentCalendar) return;
  state.currentCalendar = cal;
  var btns = document.querySelectorAll('.tp-toggle-btn');
  btns.forEach(function(b){ b.classList.toggle('active', b.dataset.cal===cal); });

  // 转换当前选中时间
  try {
    if (cal === 'lunar') {
      // 公历→农历
      if (typeof Solar !== 'undefined') {
        var s = Solar.fromYmd(state.selectedTime.year, state.selectedTime.month, state.selectedTime.day);
        var l = s.getLunar();
        state.selectedTime.year = l.getYear();
        state.selectedTime.month = l.getMonth();
        state.selectedTime.day = l.getDay();
      }
    } else {
      // 农历→公历
      if (typeof Lunar !== 'undefined') {
        var l2 = Lunar.fromYmd(state.selectedTime.year, state.selectedTime.month, state.selectedTime.day);
        var s2 = l2.getSolar();
        state.selectedTime.year = s2.getYear();
        state.selectedTime.month = s2.getMonth();
        state.selectedTime.day = s2.getDay();
      }
    }
    state.selectedTime.calendar = cal;
  } catch(e) { state.selectedTime.calendar = cal; }

  renderPicker();
  updateTopDisplay();
}

export function updateTopDisplay() {
  var el = document.getElementById('tpDisplay');
  if (!el) return;
  if (state.currentCalendar === 'lunar') {
    var m = state.selectedTime.month, d = state.selectedTime.day;
    var monName = (m>=1&&m<=12) ? LUNAR_MONTHS[m-1] : String(m);
    var dayName = (d>=1&&d<=30) ? LUNAR_DAYS30[d-1] : String(d);
    var sc = getShichen(state.selectedTime.hour);
    el.textContent = state.selectedTime.year+'年'+monName+dayName+' '+state.selectedTime.hour+sc.name+String(state.selectedTime.minute).padStart(2,'0')+'分';
  } else {
    el.textContent = state.selectedTime.year+'-'+String(state.selectedTime.month).padStart(2,'0')+'-'+String(state.selectedTime.day).padStart(2,'0')+' '+
      String(state.selectedTime.hour).padStart(2,'0')+':'+String(state.selectedTime.minute).padStart(2,'0');
  }
}

export function renderPicker() {
  var maxDay = getMaxDay();

  // 年份（不超过当前年份）
  var nowY = new Date().getFullYear();
  var yHtml = '';
  var yStart = 1900;
  for (var y=yStart; y<=nowY; y++) {
    yHtml += '<div class="tp-item" data-val="'+y+'">'+y+'</div>';
  }
  document.getElementById('tpColYear').innerHTML = yHtml;

  // 月份
  var mHtml = renderMonthColumn();
  document.getElementById('tpColMonth').innerHTML = mHtml;

  // 日期（不允许未来日）
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var nowD = new Date().getDate();
  var isFutureYM = state.selectedTime && (state.selectedTime.year > nowY || (state.selectedTime.year === nowY && state.selectedTime.month > nowM));
  var maxD = isFutureYM ? 1 : (state.selectedTime && state.selectedTime.year === nowY && state.selectedTime.month === nowM) ? Math.min(maxDay, nowD) : maxDay;
  var dHtml = '';
  for (var d=1; d<=maxD; d++) {
    var dLabel = state.currentCalendar==='lunar' ? (LUNAR_DAYS30[d-1]||String(d)) : String(d)+'日';
    dHtml += '<div class="tp-item" data-val="'+d+'">'+dLabel+'</div>';
  }
  document.getElementById('tpColDay').innerHTML = dHtml;

  // 时辰
  var hHtml = '';
  for (var h=0; h<24; h++) {
    var sc = getShichen(h);
    hHtml += '<div class="tp-item" data-val="'+h+'">'+h+' '+sc.name+'</div>';
  }
  document.getElementById('tpColHour').innerHTML = hHtml;

  // 分钟
  var minHtml = '';
  for (var min=0; min<60; min++) {
    minHtml += '<div class="tp-item" data-val="'+min+'">'+String(min).padStart(2,'0')+'分</div>';
  }
  document.getElementById('tpColMinute').innerHTML = minHtml;

  // 绑定滚动事件
  ['Year','Month','Day','Hour','Minute'].forEach(function(col){
    var el = document.getElementById('tpCol'+col);
    el.onscroll = function(){ onColScroll(col); };
  });

  if (!state.tpInitialized) {
    state.tpInitialized = true;
  }
}

export function scrollToCurrent() {
  ['Year','Month','Day','Hour','Minute'].forEach(function(col){
    var el = document.getElementById('tpCol'+col);
    var val = state.selectedTime[col.toLowerCase()];
    // Map for year: year
    if (col === 'Year') {
      var idx = val - 1900;
      el.scrollTop = idx * 38;
    } else if (col === 'Month') {
      el.scrollTop = (val-1) * 38;
    } else if (col === 'Day') {
      el.scrollTop = (val-1) * 38;
    } else if (col === 'Hour') {
      el.scrollTop = val * 38;
    } else if (col === 'Minute') {
      el.scrollTop = val * 38;
    }
  });
  updateTopDisplay();
  setTimeout(highlightActive, 100);
}

export function onColScroll(col) {
  var el = document.getElementById('tpCol'+col);
  var items = el.querySelectorAll('.tp-item');
  var center = el.scrollTop + el.clientHeight/2;

  items.forEach(function(item){
    var itemCenter = item.offsetTop + 19; // half of 38px
    var dist = Math.abs(center - itemCenter);
    item.classList.toggle('active', dist < 19);
  });

  // 找到最近的 item
  var best = null, bestDist = Infinity;
  items.forEach(function(item){
    var itemCenter = item.offsetTop + 19;
    var dist = Math.abs(center - itemCenter);
    if (dist < bestDist) { bestDist = dist; best = item; }
  });

  if (best) {
    var val = parseInt(best.dataset.val);
    var key = col.toLowerCase();
    if (state.selectedTime[key] !== val) {
      state.selectedTime[key] = val;
      updateTopDisplay();

      // 年变了 → 更新月和日
      if (col === 'Year') {
        updateMonthColumn();
        updateDayColumn();
      }
      // 月变了 → 更新日
      if (col === 'Month') {
        updateDayColumn();
      }
    }
  }
}

export function highlightActive() {
  ['Year','Month','Day','Hour','Minute'].forEach(function(col){
    onColScroll(col);
  });
  updateTopDisplay();
}

export function getMaxDay() {
  var y = state.selectedTime.year, m = state.selectedTime.month;
  if (state.currentCalendar === 'lunar') {
    // 农历大月30天，小月29天；简化处理，默认30天
    try {
      if (typeof Lunar !== 'undefined') {
        var l = Lunar.fromYmd(y, m, 1);
        // 检查是否有30日
        try { Lunar.fromYmd(y, m, 30); return 30; } catch(e) { return 29; }
      }
    } catch(e) {}
    return 30;
  }
  return new Date(y, m, 0).getDate();
}

export function updateDayColumn() {
  var maxDay = getMaxDay();
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var nowD = new Date().getDate();
  var isFutureYM = state.selectedTime && (state.selectedTime.year > nowY || (state.selectedTime.year === nowY && state.selectedTime.month > nowM));
  var maxD = isFutureYM ? 1 : (state.selectedTime && state.selectedTime.year === nowY && state.selectedTime.month === nowM) ? Math.min(maxDay, nowD) : maxDay;
  var currentDay = state.selectedTime.day;
  if (currentDay > maxD) {
    state.selectedTime.day = maxD;
    updateTopDisplay();
  }

  var dHtml = '';
  for (var d=1; d<=maxD; d++) {
    var dLabel = state.currentCalendar==='lunar' ? (LUNAR_DAYS30[d-1]||String(d)) : String(d)+'日';
    dHtml += '<div class="tp-item" data-val="'+d+'">'+dLabel+'</div>';
  }
  var dayCol = document.getElementById('tpColDay');
  dayCol.innerHTML = dHtml;
  dayCol.onscroll = function(){ onColScroll('Day'); };

  // 滚动到正确位置
  dayCol.scrollTop = (state.selectedTime.day-1) * 38;
  setTimeout(function(){ onColScroll('Day'); }, 150);
}

export function renderMonthColumn() {
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var maxM = (state.selectedTime && state.selectedTime.year >= nowY) ? nowM : 12;
  var h = '';
  for (var m=1; m<=maxM; m++) {
    var mL = state.currentCalendar==='lunar' ? LUNAR_MONTHS[m-1] : String(m)+'月';
    h += '<div class="tp-item" data-val="'+m+'">'+mL+'</div>';
  }
  return h;
}

export function updateMonthColumn() {
  var el = document.getElementById('tpColMonth');
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var maxM = (state.selectedTime && state.selectedTime.year >= nowY) ? nowM : 12;
  var h = '';
  for (var m=1; m<=maxM; m++) {
    var mL = state.currentCalendar==='lunar' ? LUNAR_MONTHS[m-1] : String(m)+'月';
    h += '<div class="tp-item" data-val="'+m+'">'+mL+'</div>';
  }
  el.innerHTML = h;
  el.onscroll = function(){ onColScroll('Month'); };
  // 如果当前选中的月份超出范围，回退
  if (state.selectedTime.month > maxM) {
    state.selectedTime.month = maxM;
    updateTopDisplay();
  }
  var scrollMonth = Math.min(state.selectedTime.month, maxM);
  el.scrollTop = (scrollMonth-1) * 38;
  setTimeout(function(){ onColScroll('Month'); }, 100);
}

export function confirmTimePicker() {
  state.selectedTime.calendar = state.currentCalendar;
  updateTimeDisplay();
  document.getElementById('tpOverlay').style.display = 'none';
}

// 老实现快照最后一行是裸调 `init();`。这里**不调** —— 由 main.jsx 在 React
// flushSync 提交之后调用（原因见 `init()` 上方的注释与 main.jsx 顶部）。
// 差分脚本也不依赖它：纯函数逐个喂输入，不需要页面自启。

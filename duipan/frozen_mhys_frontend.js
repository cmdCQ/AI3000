/**
 * 【冻结件 · 请勿修改】迁移前的梅花页起卦代码
 * ==================================================================
 *
 * 这不是活代码，是 `build/nginx/mhys/index.html` 在**起卦下沉到后端之前**
 * 的那一段（八卦数据 + calcGua + 五种起卦法的取数）的**原文切片**。
 *
 * 为什么必须冻结：`duipan/verify_qigua_vs_front.js` 用它当**外部判据** ——
 *   · 层 7 那 38 例「晚子时换日」整例申报，需要 shushu 之外的第二个来源证明
 *     「换日之后的值是对的」（前端是独立写的另一份实现，它也在换日）；
 *   · 「起卦搬到后端后，用户得到的卦不变」这条迁移前提，就是拿它逐点比出来的。
 * 前端一旦改为把起卦交给后端，这份**独立实现**就不复存在，两条判据都会随之
 * 消失 —— 所以先把原文冻在这里，判据仍可复跑，也不会随前端改版而漂移。
 *
 * 来源：build/nginx/mhys/index.html
 * 提交：2771935（切片时的 HEAD；该文件此提交的 blob 5fd1b3cd）
 * 切片标记：从「// ===== 八卦数据 =====」到「// ===== 当前选中的方法 =====」
 *
 * 冻结之后前端若又改了取数逻辑，**本文件不动** —— 它记的是「用户曾经实际
 * 得到的卦」，这正是判据要的那个东西。要跟着改就说明判据要重设，而不是
 * 悄悄把基准挪到新实现上（那就成了自己跟自己比）。
 */
// ===== 八卦数据 =====
var TRIGRAMS = {
  1: { name:'乾', symbol:'☰', full:'乾为天', element:'金', nature:'天' },
  2: { name:'兑', symbol:'☱', full:'兑为泽', element:'金', nature:'泽' },
  3: { name:'离', symbol:'☲', full:'离为火', element:'火', nature:'火' },
  4: { name:'震', symbol:'☳', full:'震为雷', element:'木', nature:'雷' },
  5: { name:'巽', symbol:'☴', full:'巽为风', element:'木', nature:'风' },
  6: { name:'坎', symbol:'☵', full:'坎为水', element:'水', nature:'水' },
  7: { name:'艮', symbol:'☶', full:'艮为山', element:'土', nature:'山' },
  8: { name:'坤', symbol:'☷', full:'坤为地', element:'土', nature:'地' }
};

var HEX64 = {};
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

var WUXING = { '金':0, '水':1, '木':2, '火':3, '土':4 };
function wuxingShengKe(from, to) {
  var f=WUXING[from], t=WUXING[to];
  if(f===t) return '比和';
  if((f+1)%5===t) return '生';
  if((t+1)%5===f) return '被生';
  if((f+2)%5===t) return '克';
  return '被克';
}

function triToLines(num) {
  var m={1:[1,1,1],2:[1,1,0],3:[1,0,1],4:[1,0,0],5:[0,1,1],6:[0,1,0],7:[0,0,1],8:[0,0,0]};
  return m[num]||[0,0,0];
}
function linesToTri(lines) {
  var k=lines.join(''), m={'111':1,'110':2,'101':3,'100':4,'011':5,'010':6,'001':7,'000':8};
  return m[k]||8;
}
function guaToLines(upper,lower) {
  var up=triToLines(upper), lo=triToLines(lower);
  // 上卦在上 下卦在下: [上爻,五爻,四爻,三爻,二爻,初爻]
  return [up[2],up[1],up[0],lo[2],lo[1],lo[0]];
}
function buildLines(upper,lower,movingPos) {
  var lines=guaToLines(upper,lower), r=[];
  for(var i=0;i<6;i++) r.push({yang:lines[i]===1,moving:(6-i)===movingPos,pos:6-i});
  return r;
}

function calcGua(upperNum, lowerNum, moveNum) {
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
function getShichen(hour) {
  var names=['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];
  var idx;
  if(hour>=23||hour<1) idx=0; else if(hour<3) idx=1; else if(hour<5) idx=2;
  else if(hour<7) idx=3; else if(hour<9) idx=4; else if(hour<11) idx=5;
  else if(hour<13) idx=6; else if(hour<15) idx=7; else if(hour<17) idx=8;
  else if(hour<19) idx=9; else if(hour<21) idx=10; else idx=11;
  return {name:names[idx], num:idx+1};
}

function getYearZhi(year) {
  // 年支（地支名，子丑寅…）。本页曾**同时存在两个同名定义**，另一个写成
  // `a[(y-4)%12]`：`%` 在 y<4 时给负数下标，取不到值就返回 `undefined`，
  // 而且它返回字符串、这个返回序号，两个「同名函数」语义不同 —— 谁生效只看
  // 定义先后。已删掉那个，只留这一处；负数年份一并挡住。
  var a = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  return a[((year - 4) % 12 + 12) % 12];
}

function getLunarInfo() {
  var now = new Date();
  var y=now.getFullYear(), m=now.getMonth()+1, d=now.getDate();
  var h=now.getHours(), min=now.getMinutes(), s=now.getSeconds();
  var sc=getShichen(h);
  var lunarMonth=m, lunarDay=d, lunarYearZhi=getYearZhi(y);

  // 尝试用 lunar-javascript 获取农历
  try {
    if (typeof Solar !== 'undefined') {
      var solar = Solar.fromYmdHms(y, m, d, h, min, s);
      var lunar = solar.getLunar();
      lunarMonth = lunar.getMonth();
      lunarDay = lunar.getDay();
      lunarYearZhi = getYearZhi(lunar.getYear());
    }
  } catch(e) {}

  return {
    gregorian: y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')+' '+String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+':'+String(s).padStart(2,'0'),
    lunarMonth: lunarMonth,
    lunarDay: lunarDay,
    yearZhi: lunarYearZhi,
    shichen: sc,
    shichenNum: sc.num
  };
}

function enrichTimeInfo() {
  if (!selectedTime) initTime();
  var info = {};
  try {
    if (typeof Solar !== 'undefined') {
      var y = selectedTime.year, m = selectedTime.month, d = selectedTime.day;
      var h = selectedTime.hour, min = selectedTime.minute;
      var isLunar = selectedTime.calendar === 'lunar';
      
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
function xunKongFromDayGZ(dayGZ) {
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

function timeDivination() {
  // 从 selectedTime 直接读取用户设定时间
  if (!selectedTime) initTime();
  var y = selectedTime.year, m = selectedTime.month, d = selectedTime.day;
  var h = selectedTime.hour;
  var isLunar = selectedTime.calendar === 'lunar';
  // 无农历库时**不能**拿公历年月日顶替农历 —— 那会算出一个「看着正常的错卦」，
  // 用户分辨不出卦是错的，比直接报错危险。起卦公式依赖农历，没有农历就不占。
  if (typeof Solar === 'undefined' || (isLunar && typeof Lunar === 'undefined')) {
    alert('农历数据未加载完成，无法起卦。请刷新页面后重试。');
    return null;
  }
  // 获取 shichen 和农历信息
  var sc = getShichen(h);
  var solar, lunar, calcLunar;
  try {
    if (isLunar) {
      lunar = Lunar.fromYmdHms(y, m, d, h, 0, 0);
      solar = lunar.getSolar();
    } else {
      solar = Solar.fromYmdHms(y, m, d, h, 0, 0);
      lunar = solar.getLunar();
    }
    // 晚子时(23:00-23:59)换日：农历月/日/年支一律取次日，与六爻日柱口径一致。
    // 走库的 next(1) 而非 lunarDay+1，月末/年末进位才不会溢出。
    calcLunar = h >= 23 ? solar.next(1).getLunar() : lunar;
  } catch(e) {
    alert('农历换算失败，无法起卦：' + (e && e.message ? e.message : e));
    return null;
  }
  var lunarMonth = Math.abs(calcLunar.getMonth());  // 闰月库返回负数，取绝对值（闰月按本月序数计）
  var lunarDay = calcLunar.getDay();
  // 年支数（子1 丑2 ... 亥12）—— 用**农历**年支，不是公历年
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var yearZhiNum = ZHI.indexOf(calcLunar.getYearZhi()) + 1;
  var upperRaw = yearZhiNum + lunarMonth + lunarDay;
  var lowerRaw = yearZhiNum + lunarMonth + lunarDay + sc.num;
  var moveRaw  = yearZhiNum + lunarMonth + lunarDay + sc.num;
  var upper = upperRaw % 8; if(upper===0) upper=8;
  var lower = lowerRaw % 8; if(lower===0) lower=8;
  var move = moveRaw % 6; if(move===0) move=6;
  return {
    method:'time',
    calc: {
      yearZhiNum:yearZhiNum, lunarMonth:lunarMonth, lunarDay:lunarDay, shichenNum:sc.num,
      upperRaw:upperRaw, upper:upper,
      lowerRaw:lowerRaw, lower:lower,
      moveRaw:moveRaw, move:move
    },
    gua: calcGua(upper, lower, move)
  };
}

function manualDivination() {
  var u=parseInt(document.getElementById('manualUpper').value,10);
  var l=parseInt(document.getElementById('manualLower').value,10);
  var m=parseInt(document.getElementById('manualMove').value,10);
  // 手动指定必须校验：空值/越界会让 NaN 一路传到 calcGua，排出一个空卦
  if (!(u>=1&&u<=8) || !(l>=1&&l<=8) || !(m>=1&&m<=6)) {
    alert('请填写：上卦 1-8、下卦 1-8、动爻 1-6');
    return null;
  }
  return { method:'manual', gua:calcGua(u,l,m) };
}

function num1Divination() {
  var raw=document.getElementById('num1Input').value.trim();
  var nums=raw.replace(/[^0-9]/g,'').split('').map(function(x){ return parseInt(x); }).filter(function(x){ return !isNaN(x); });
  var addShichen=document.getElementById('num1AddShichen').checked;
  
  var half=Math.floor(nums.length/2);
  var firstHalf=nums.slice(0,half);
  var secondHalf=nums.slice(half);
  var sum1=firstHalf.reduce(function(a,b){return a+b;},0);
  var sum2=secondHalf.reduce(function(a,b){return a+b;},0);
  var upper=sum1%8; if(upper===0) upper=8;
  var lower=sum2%8; if(lower===0) lower=8;
  
  // 动爻从**原始和**取模，不能用已取模的上卦/下卦（否则动爻被 8 的余数污染）
  var moveRaw=sum1+sum2;
  var timeInfo=null;
  if(addShichen){
    timeInfo=getLunarInfo();
    moveRaw+=timeInfo.shichenNum;
  }
  var move=moveRaw%6; if(move===0) move=6;
  
  return {
    method:'num1',
    numbers:nums.join(' '),
    addShichen:addShichen,
    time:timeInfo,
    calc:{sum1:sum1,sum2:sum2,upper:upper,lower:lower,moveRaw:moveRaw,move:move},
    gua:calcGua(upper,lower,move)
  };
}

function num2Divination() {
  var raw=document.getElementById('num2Input').value.trim();
  var digits=raw.replace(/[^0-9]/g,'').split('');
  var n1=parseInt(digits[0]), n2=parseInt(digits[1]), n3=parseInt(digits[2]);
  var upper=n1%8; if(upper===0) upper=8;
  var lower=n2%8; if(lower===0) lower=8;
  // 古法：上卦=第一数÷8，下卦=第二数÷8，动爻=**三数之和**÷6（不是第三个数本身）
  var moveRaw=n1+n2+n3;
  var timeInfo=null;
  if(document.getElementById('num2AddShichen').checked){
    timeInfo=getLunarInfo();
    moveRaw+=timeInfo.shichenNum;
  }
  var move=moveRaw%6; if(move===0) move=6;

  return {
    method:'num2',
    numbers:[n1,n2,n3].join(' '),
    addShichen:document.getElementById('num2AddShichen').checked,
    time:timeInfo,
    calc:{upper:upper,lower:lower,moveRaw:moveRaw,move:move},
    gua:calcGua(upper,lower,move)
  };
}

function autoDivination() {
  var u=Math.floor(Math.random()*8)+1;
  var l=Math.floor(Math.random()*8)+1;
  var m=Math.floor(Math.random()*6)+1;
  return { method:'auto', gua:calcGua(u,l,m) };
}



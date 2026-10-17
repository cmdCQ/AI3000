
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
function buildLines(upper,lower,movingPositions) {
  var lines=guaToLines(upper,lower), r=[];
  if (typeof movingPositions === 'number') movingPositions = [movingPositions];
  for(var i=0;i<6;i++) r.push({yang:lines[i]===1,moving:movingPositions.indexOf(6-i)!==-1,pos:6-i});
  return r;
}

function calcGua(upperNum, lowerNum, moveNums) {
  if (typeof moveNums === 'number') moveNums = [moveNums];
  var uTri=TRIGRAMS[upperNum], lTri=TRIGRAMS[lowerNum];
  var hexName=HEX64[upperNum+'_'+lowerNum];
  var benGua={
    upper:upperNum, lower:lowerNum,
    upperTri:uTri, lowerTri:lTri,
    name:hexName,
    lines:buildLines(upperNum,lowerNum,moveNums)
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
  for (var mi = 0; mi < moveNums.length; mi++) {
    var idx = 6 - moveNums[mi];
    changedLines[idx] = changedLines[idx] === 1 ? 0 : 1;
  }
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
  var firstMove = moveNums.length > 0 ? moveNums[0] : 0;
  if(firstMove<=3){ tiNum=upperNum; yongNum=lowerNum; }
  else{ tiNum=lowerNum; yongNum=upperNum; }
  var tiTri=TRIGRAMS[tiNum], yongTri=TRIGRAMS[yongNum];
  var relation=wuxingShengKe(tiTri.element, yongTri.element);
  var verdict;
  if(relation==='被生') verdict={text:'用生体',cls:'verdict-neutral',desc:'用卦生体卦，外部能量滋养自身，有外力相助之象。宜顺势而为，借力而行。'};
  else if(relation==='生') verdict={text:'体生用',cls:'verdict-neutral',desc:'体卦生用卦，自身能量外泄滋养外事。需量力而行，有所取舍。'};
  else if(relation==='比和') verdict={text:'体用比和',cls:'verdict-neutral',desc:'内外和谐共振，能量流通无碍。守正持中，顺势而行。'};
  else if(relation==='克') verdict={text:'体克用',cls:'verdict-neutral',desc:'体卦克用卦，自身克制外事。以己之力影响事态，但需适度，过刚易折。'};
  else verdict={text:'用克体',cls:'verdict-neutral',desc:'用卦克体卦，外部压力克制自身。宜守不宜攻，以柔克刚，待机而行。'};
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
    upper:upperNum, lower:lowerNum, moveNums:moveNums,
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
  // 地支编号：子1 丑2 ... 亥12
  return ((year - 4) % 12 + 12) % 12 + 1;
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
        lunar = Lunar.fromYmd(y, m, d);
        solar = lunar.getSolar();
      } else {
        solar = Solar.fromYmdHms(y, m, d, h, min || 0, 0);
        lunar = solar.getLunar();
      }
      info.lunarYear = lunar.getYearInChinese();
      info.lunarMonth = lunar.getMonthInChinese();
      info.lunarDay = lunar.getDayInChinese();
      info.yearGZ = lunar.getYearInGanZhi();
      info.monthGZ = lunar.getMonthInGanZhi();
      info.hourGZ = lunar.getTimeInGanZhi();
      // 子时(23:00+)日柱算次日
      if (h >= 23) {
        var nextDay = new Date(solar.getYear(), solar.getMonth()-1, solar.getDay()+1);
        var tmLunar = Solar.fromDate(nextDay).getLunar();
        info.dayGZ = tmLunar.getDayInGanZhi();
      } else {
        info.dayGZ = lunar.getDayInGanZhi();
      }
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

// ===== 铜钱摇卦交互逻辑 =====
var COIN = {
  state: 'idle',  // idle | spinning | complete
  round: 0,        // 0-5, 当前是第几爻
  results: [],     // [初爻(0),二爻(1),三爻(2),四爻(3),五爻(4),上爻(5)]
  spinTimer: null
};

var POS_NAMES = ['初爻','二爻','三爻','四爻','五爻','上爻'];
var TYPE_MAP = {
  laoyin: {label:'老阴',symbol:'━ ━ ━ ×',yang:0,num:6,changing:1},
  shaoyang: {label:'少阳',symbol:'━━━━━',yang:1,num:7,changing:0},
  shaoyin: {label:'少阴',symbol:'━ ━ ━',yang:0,num:8,changing:0},
  laoyang: {label:'老阳',symbol:'━━━━━ ○',yang:1,num:9,changing:1}
};

function initCoinToss() {
  COIN.state = 'idle';
  COIN.round = 0;
  COIN.results = [];
  if (COIN.spinTimer) { clearInterval(COIN.spinTimer); COIN.spinTimer = null; }
  // 预加载两种面图片，避免第一次翻转时延迟
  preloadCoinImages();
  // 默认显示三花
  for (var i = 0; i < 3; i++) setCoinImage(i, true);
  var la = document.getElementById('coinLinesArea');
  if (la) { la.style.display = 'none'; la.innerHTML = ''; }
  document.getElementById('coinResetBtn').style.display = 'none';
  document.querySelectorAll('.coin-slot').forEach(function(s){ s.classList.remove('spinning','stopped'); });
}

function preloadCoinImages() {
  ['/assets/img/liuyao/coin_hua.png', '/assets/img/liuyao/coin_zi.png'].forEach(function(src) {
    var img = new Image();
    img.src = src;
  });
}

function setCoinImage(idx, isHua) {
  // isHua=true → 花面(阳), isHua=false → 字面(阴)
  var img = document.getElementById('coinImg'+idx);
  if (img) img.src = isHua ? '/assets/img/liuyao/coin_hua.png' : '/assets/img/liuyao/coin_zi.png';
}

function coinClick() {
  if (COIN.state === 'idle') {
    startSpin();
  } else if (COIN.state === 'spinning') {
    stopSpin();
  }
}

function startSpin() {
  COIN.state = 'spinning';
  document.querySelectorAll('.coin-slot').forEach(function(s){ s.classList.remove('stopped'); s.classList.add('spinning'); });
  // 开始随机翻转
  if (COIN.spinTimer) clearInterval(COIN.spinTimer);
  COIN.spinTimer = setInterval(function(){
    for (var i = 0; i < 3; i++) {
      setCoinImage(i, Math.random() < 0.5);
    }
  }, 80);
}

function stopSpin() {
  COIN.state = 'spinning_stopped';
  if (COIN.spinTimer) { clearInterval(COIN.spinTimer); COIN.spinTimer = null; }
  document.querySelectorAll('.coin-slot').forEach(function(s){ s.classList.remove('spinning'); s.classList.add('stopped'); });
  
  // 随机决定最终三枚铜钱正反面
  var coinHuas = [];
  for (var i = 0; i < 3; i++) {
    var isHua = Math.random() < 0.5;
    coinHuas.push(isHua);
    setCoinImage(i, isHua);
  }
  
  // 数花面
  var huaCount = coinHuas.filter(function(x){return x;}).length;
  var lineType = getLineType(huaCount);
  
  // 记录结果
  COIN.results.push(lineType);
  COIN.round++;
  
  // 显示累计的爻
  renderAccumulatedLines();
  
  // 第几爻提示
  if (COIN.round < 6) {
    // 重新设回idle，等待再次点击
    COIN.state = 'idle';
    document.querySelectorAll('.coin-slot').forEach(function(s){ s.classList.remove('stopped'); });
  } else {
    // 六爻齐了
    document.getElementById('coinResetBtn').style.display = 'inline-block';
    COIN.state = 'complete';
  }
}

function getLineType(huaCount) {
  // 0花面=老阴, 1花面=少阳, 2花面=少阴, 3花面=老阳
  if (huaCount === 0) return 'laoyin';
  if (huaCount === 1) return 'shaoyang';
  if (huaCount === 2) return 'shaoyin';
  return 'laoyang';
}

function renderAccumulatedLines() {
  var el = document.getElementById('coinLinesArea');
  if (!el) return;
  el.style.display = '';
  var h = '';
  // 从最新的(上爻)到最旧的(初爻)，由底向上显示
  // results是[初爻(0),二爻(1),三爻(2)...]的顺序
  for (var i = COIN.results.length - 1; i >= 0; i--) {
    var type = COIN.results[i];
    var info = TYPE_MAP[type];
    // 画横杠UI
    var barHtml = '';
    if (type === 'shaoyang') {
      barHtml = '<div class="bar-yang"></div>';
    } else if (type === 'laoyang') {
      barHtml = '<div class="bar-yang"></div><span class="bar-mark">○</span>';
    } else if (type === 'shaoyin') {
      barHtml = '<div class="bar-yin"><span></span><span></span></div>';
    } else if (type === 'laoyin') {
      barHtml = '<div class="bar-yin"><span></span><span></span></div><span class="bar-mark">×</span>';
    }
    h += '<div class="coin-line-row">'+
      '<span class="cl-pos">'+POS_NAMES[i]+'</span>'+
      '<div class="cl-bar"><div class="cl-bar-inner">'+barHtml+'</div></div>'+
      '<span class="cl-type">'+info.label+'</span></div>';
  }
  el.innerHTML = h;
}

function coinReset() {
  if (COIN.spinTimer) { clearInterval(COIN.spinTimer); COIN.spinTimer = null; }
  initCoinToss();
}

// 从COIN.results构建卦
function coinDivination() {
  if (COIN.results.length !== 6) {
    // 如果还没完成6次，自动补齐
    while (COIN.results.length < 6) {
      var hua = Math.floor(Math.random()*4);
      COIN.results.push(getLineType(hua));
    }
  }
  var lines = COIN.results.map(function(t,i){
    var info = TYPE_MAP[t];
    return { num:info.num, yang:!!info.yang, changing:!!info.changing, type:t, pos:i+1 };
  });
  // 下卦：初爻(0)=bottom, 二爻(1)=mid, 三爻(2)=top
  var lowerYangs = [lines[0].yang?1:0, lines[1].yang?1:0, lines[2].yang?1:0];
  var lowerNum = linesToTri(lowerYangs);
  // 上卦：四爻(3)=bottom, 五爻(4)=mid, 上爻(5)=top
  var upperYangs = [lines[3].yang?1:0, lines[4].yang?1:0, lines[5].yang?1:0];
  var upperNum = linesToTri(upperYangs);
  // 动爻
  var movePos = [];
  for (var i = 0; i < 6; i++) {
    if (lines[i].changing) movePos.push(i+1);
  }
  var gua = calcGua(upperNum, lowerNum, movePos.slice());
  gua.coinLines = lines.slice();
  gua.movePositions = movePos;
  return { method:'coin', coinLines:lines.slice(), gua:gua };
}

function manualDivination() {
  var lines = [];
  for (var i = 0; i < 6; i++) {
    var type = MANUAL_LINES[i] || 'shaoyin';
    var yang = (type === 'shaoyang' || type === 'laoyang');
    var changing = (type === 'laoyin' || type === 'laoyang');
    var val = type === 'shaoyang' ? 7 : type === 'shaoyin' ? 8 : type === 'laoyang' ? 9 : 6;
    lines.push({ num:val, yang:yang, changing:changing, type:type });
  }
  // 下卦：初爻(0)=bottom, 二爻(1)=mid, 三爻(2)=top
  var lowerYangs = [lines[0].yang?1:0, lines[1].yang?1:0, lines[2].yang?1:0];
  var lowerNum = linesToTri(lowerYangs);
  // 上卦：四爻(3)=bottom, 五爻(4)=mid, 上爻(5)=top
  var upperYangs = [lines[3].yang?1:0, lines[4].yang?1:0, lines[5].yang?1:0];
  var upperNum = linesToTri(upperYangs);
  var movePos = [];
  for (var i = 0; i < 6; i++) {
    if (lines[i].changing) movePos.push(i + 1);
  }
  var gua = calcGua(upperNum, lowerNum, movePos.slice());
  gua.coinLines = lines.slice();
  gua.movePositions = movePos;
  return { method:'manual', coinLines:lines.slice(), gua:gua };
}

function autoDivination() {
  COIN.results = [];
  for (var i = 0; i < 6; i++) {
    var huaCount = Math.floor(Math.random()*4);
    COIN.results.push(getLineType(huaCount));
  }
  var lines = COIN.results.map(function(t,i){
    var info = TYPE_MAP[t];
    return { num:info.num, yang:!!info.yang, changing:!!info.changing, type:t, pos:i+1 };
  });
  // 下卦：初爻(0)=bottom, 二爻(1)=mid, 三爻(2)=top
  var lowerYangs = [lines[0].yang?1:0, lines[1].yang?1:0, lines[2].yang?1:0];
  var lowerNum = linesToTri(lowerYangs);
  // 上卦：四爻(3)=bottom, 五爻(4)=mid, 上爻(5)=top
  var upperYangs = [lines[3].yang?1:0, lines[4].yang?1:0, lines[5].yang?1:0];
  var upperNum = linesToTri(upperYangs);
  var movePos = [];
  for (var i = 0; i < 6; i++) {
    if (lines[i].changing) movePos.push(i+1);
  }
  var gua = calcGua(upperNum, lowerNum, movePos.slice());
  gua.coinLines = lines.slice();
  gua.movePositions = movePos;
  return { method:'auto', coinLines:lines.slice(), gua:gua };
}

// ===== 当前选中的方法 =====
var currentMethod = 'coin';
var currentGender = 'male';

function toggleDropdown() {
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

function selectMethod(method, el) {
  currentMethod = method;
  document.getElementById('methodLabel').textContent = el.textContent.replace('✓','');
  document.querySelectorAll('.method-option').forEach(function(o){ o.classList.remove('selected'); });
  el.classList.add('selected');
  document.getElementById('methodDropdown').classList.remove('open');
  document.getElementById('methodArrow').textContent='▾';
  renderMethodParams();
}

// 点击空白关闭下拉
document.addEventListener('click', function(e) {
  var sel=document.getElementById('methodSelector');
  if(!sel.contains(e.target)){
    document.getElementById('methodDropdown').classList.remove('open');
    document.getElementById('methodArrow').textContent='▾';
  }
});

function renderMethodParams() {
  var container = document.getElementById('methodParams');
  var h = '';
  switch(currentMethod) {
    case 'coin':
      h = '<div class="coin-toss-area">'+
          '<div class="coin-instr">请集中精力默想所占之事<br>点击铜钱开始旋转，再次点击可得一爻</div>'+
          '<div class="coin-row" id="coinRow" onclick="coinClick()">'+
          '  <div class="coin-slot" id="coinSlot0"><img src="/assets/img/liuyao/coin_hua.png" id="coinImg0"></div>'+
          '  <div class="coin-slot" id="coinSlot1"><img src="/assets/img/liuyao/coin_hua.png" id="coinImg1"></div>'+
          '  <div class="coin-slot" id="coinSlot2"><img src="/assets/img/liuyao/coin_hua.png" id="coinImg2"></div>'+
          '</div>'+
          '<div class="coin-lines-area" id="coinLinesArea" style="display:none"></div>'+
          '<div><button class="coin-reset-btn" id="coinResetBtn" onclick="coinReset()" style="display:none">重新摇卦</button></div>'+
          '</div>';
      setTimeout(initCoinToss, 50);
      break;
    case 'manual':
      // 清理铜钱残留状态
      if (COIN.spinTimer) { clearInterval(COIN.spinTimer); COIN.spinTimer = null; }
      COIN.state = 'idle';
      COIN.round = 0;
      COIN.results = [];
      h = '<div style="margin-top:0.6rem">'+
          '<div class="algo-text">从下往上手动指定每一爻的阴阳状态</div>'+
          '<div id="manualLines"></div>'+
          '</div>';
      setTimeout(fillManualLineSelects, 50);
      break;
    case 'auto':
      h = '';
      break;
  }
  container.innerHTML = h;
}

var MANUAL_LINES = ['shaoyin','shaoyin','shaoyin','shaoyin','shaoyin','shaoyin']; // [初爻,二爻,三爻,四爻,五爻,上爻]

function cycleManualLine(posIdx) {
  // posIdx: 0=初爻 ... 5=上爻
  var order = ['shaoyang','laoyang','shaoyin','laoyin'];
  var cur = MANUAL_LINES[posIdx];
  var nextIdx = (order.indexOf(cur) + 1) % order.length;
  MANUAL_LINES[posIdx] = order[nextIdx];
  renderManualLines();
}

function renderManualLines() {
  var el = document.getElementById('manualLines');
  if (!el) return;
  var posNames = ['初爻','二爻','三爻','四爻','五爻','上爻'];
  var typeInfo = {
    laoyin: {label:'老阴', bar:'yin', mark:'×'},
    shaoyang: {label:'少阳', bar:'yang', mark:''},
    shaoyin: {label:'少阴', bar:'yin', mark:''},
    laoyang: {label:'老阳', bar:'yang', mark:'○'}
  };
  var h = '';
  // 显示顺序：上爻(top) → 初爻(bottom)
  for (var i = 5; i >= 0; i--) {
    var type = MANUAL_LINES[i];
    var info = typeInfo[type];
    var barHtml = '';
    if (info.bar === 'yang') {
      barHtml = '<div class="bar-yang"></div>';
    } else {
      barHtml = '<div class="bar-yin"><span></span><span></span></div>';
    }
    if (info.mark) {
      barHtml += '<span class="bar-mark">'+info.mark+'</span>';
    }
    h += '<div class="coin-line-row" style="cursor:pointer" onclick="cycleManualLine('+i+')">'+
      '<span class="cl-pos">'+posNames[i]+'</span>'+
      '<div class="cl-bar"><div class="cl-bar-inner">'+barHtml+'</div></div>'+
      '<span class="cl-type">'+info.label+'</span></div>';
  }
  h += '<div class="algo-text" style="margin-top:0.4rem;font-size:0.7rem">点击每行可切换：少阳 → 老阳 → 少阴 → 老阴</div>';
  el.innerHTML = h;
}

function fillManualLineSelects() {
  // 兼容旧调用，重置手动行并渲染
  MANUAL_LINES = ['shaoyin','shaoyin','shaoyin','shaoyin','shaoyin','shaoyin'];
  renderManualLines();
}

// ===== 开始排盘 =====
async function startDivination(e) {
  if(e){ e.preventDefault(); e.stopPropagation(); }
  var btn = document.getElementById('startBtn');

  // ===== 1. 验证 =====
  if (currentMethod === 'coin') {
    if (COIN.results.length < 6) {
      alert('请先完成六次摇卦');
      resetBtn(); return;
    }
  }
  if (currentMethod === 'manual') {
    // 手动指定无需验证，已设默认值
  }

  // ===== 2. 计算卦象 =====
  var result;
  try {
    switch(currentMethod) {
      case 'coin': result = coinDivination(); break;
      case 'manual': result = manualDivination(); break;
      case 'auto': result = autoDivination(); break;
      default: resetBtn(); btn.textContent='开始排盘'; return;
    }
  } catch(err) {
    console.error('排盘计算失败:', err);
    alert('排盘出错：' + (err.message || '未知错误') + '，请刷新后重试');
    resetBtn();
    return;
  }

  // ===== 3. 统一：topic / gender / 起卦时间 / 农历 / 跳转 =====
  var topic = document.getElementById('topicInput').value.trim();
  result.topic = topic;
  result.gender = currentGender;
  // 起卦时间
  if (selectedTime) {
    result.divinationTime = selectedTime.year+'-'+String(selectedTime.month).padStart(2,'0')+'-'+String(selectedTime.day).padStart(2,'0')+' '+
      String(selectedTime.hour).padStart(2,'0')+':'+String(selectedTime.minute).padStart(2,'0');
  }
  result.createdAt = new Date().toISOString();
  // 记录实际排盘时间（按钮点击时间，用于排序）
  result.recordTime = new Date().toISOString();
  result.lunarInfo = enrichTimeInfo();

  // 事项为空 → 临时排盘，不保存记录
  if (!topic) {
    localStorage.setItem('liuyao_result', JSON.stringify(result));
    window.location.href = '/liuyao/result.html?v=3';
    return;
  }

  try {
    var resp = await fetch('/api/liuyao-records', {
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
    var saved = await resp.json();
    if (resp.ok) {
      window.location.href = '/liuyao/result.html?v=3&id=' + saved.id;
    } else {
      window.location.href = '/liuyao/result.html?v=3';
    }
  } catch(e) {
    localStorage.setItem('liuyao_result', JSON.stringify(result));
    window.location.href = '/liuyao/result.html?v=3';
  }
}

// ===== 初始化 =====
function init() {
  initTime();
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 30000);
  preloadCoinImages();
  renderMethodParams();
  document.getElementById('startBtn').disabled = false;
}

// ===== 性别切换 =====
function selectGender(gender) {
  currentGender = gender;
  document.querySelectorAll('.gender-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.gender === gender);
  });
}

// 页面离开前重置按钮，确保 bfcache 恢复时按钮状态正常
window.addEventListener('pagehide', function() {
  resetBtn();
});

// 双保险：pageshow 在从 bfcache 恢复时也触发
window.addEventListener('pageshow', function() {
  // requestAnimationFrame 确保 DOM 已渲染后再重置
  requestAnimationFrame(function() { resetBtn(); });
});

function resetBtn() {
  var btn = document.getElementById('startBtn');
  if (btn) {
    btn.textContent = '开始排盘';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}
// ===== 时间选择器 =====
var selectedTime = null; // { year, month, day, hour, minute, calendar:'gregorian'|'lunar' }
var currentCalendar = 'gregorian';
var tpInitialized = false;

var LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
var LUNAR_DAYS30 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
var LUNAR_DAYS29 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九'];
var SHICHEN_NAMES = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];

function getYearZhi(y) { var a=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']; return a[(y-4)%12]; }
function getShichen(h) { var names=['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时']; var idx; if(h===23||h===0) idx=0; else if(h===1) idx=1; else idx=Math.floor((h-1)/2)+1; return {name:names[idx],num:idx+1}; }

function initTime() {
  var now = new Date();
  selectedTime = {
    year: now.getFullYear(), month: now.getMonth()+1, day: now.getDate(),
    hour: now.getHours(), minute: now.getMinutes(),
    calendar: 'gregorian'
  };
  currentCalendar = 'gregorian';
  updateTimeDisplay();
}

function updateTimeDisplay() {
  if (!selectedTime) return;
  var el = document.getElementById('timeDisplay');
  if (!el) return;
  if (selectedTime.calendar === 'lunar') {
    var m = selectedTime.month, d = selectedTime.day;
    var monName = (m>=1&&m<=12) ? LUNAR_MONTHS[m-1] : String(m);
    var dayName = (d>=1&&d<=30) ? LUNAR_DAYS30[d-1] : String(d);
    var sc = getShichen(selectedTime.hour);
    el.textContent = '农历'+selectedTime.year+'年'+monName+dayName+' '+selectedTime.hour+sc.name+String(selectedTime.minute).padStart(2,'0')+'分';
  } else {
    el.textContent = selectedTime.year+'-'+String(selectedTime.month).padStart(2,'0')+'-'+String(selectedTime.day).padStart(2,'0')+' '+
      String(selectedTime.hour).padStart(2,'0')+':'+String(selectedTime.minute).padStart(2,'0');
  }
}

function openTimePicker() {
  if (!selectedTime) initTime();
  var overlay = document.getElementById('tpOverlay');
  overlay.style.display = 'flex';
  currentCalendar = selectedTime.calendar;
  
  // 更新切换按钮
  var btns = document.querySelectorAll('.tp-toggle-btn');
  btns.forEach(function(b){ b.classList.toggle('active', b.dataset.cal===currentCalendar); });
  
  renderPicker();
  
  // 滚动到当前值
  scrollToCurrent();
}

function closeTimePicker(e) {
  if (e && e.target !== document.getElementById('tpOverlay')) return;
  document.getElementById('tpOverlay').style.display = 'none';
}

function switchCalendar(cal) {
  if (cal === currentCalendar) return;
  currentCalendar = cal;
  var btns = document.querySelectorAll('.tp-toggle-btn');
  btns.forEach(function(b){ b.classList.toggle('active', b.dataset.cal===cal); });
  
  // 转换当前选中时间
  try {
    if (cal === 'lunar') {
      // 公历→农历
      if (typeof Solar !== 'undefined') {
        var s = Solar.fromYmd(selectedTime.year, selectedTime.month, selectedTime.day);
        var l = s.getLunar();
        selectedTime.year = l.getYear();
        selectedTime.month = l.getMonth();
        selectedTime.day = l.getDay();
      }
    } else {
      // 农历→公历
      if (typeof Lunar !== 'undefined') {
        var l2 = Lunar.fromYmd(selectedTime.year, selectedTime.month, selectedTime.day);
        var s2 = l2.getSolar();
        selectedTime.year = s2.getYear();
        selectedTime.month = s2.getMonth();
        selectedTime.day = s2.getDay();
      }
    }
    selectedTime.calendar = cal;
  } catch(e) { selectedTime.calendar = cal; }
  
  renderPicker();
  updateTopDisplay();
}

function updateTopDisplay() {
  var el = document.getElementById('tpDisplay');
  if (!el) return;
  if (currentCalendar === 'lunar') {
    var m = selectedTime.month, d = selectedTime.day;
    var monName = (m>=1&&m<=12) ? LUNAR_MONTHS[m-1] : String(m);
    var dayName = (d>=1&&d<=30) ? LUNAR_DAYS30[d-1] : String(d);
    var sc = getShichen(selectedTime.hour);
    el.textContent = selectedTime.year+'年'+monName+dayName+' '+selectedTime.hour+sc.name+String(selectedTime.minute).padStart(2,'0')+'分';
  } else {
    el.textContent = selectedTime.year+'-'+String(selectedTime.month).padStart(2,'0')+'-'+String(selectedTime.day).padStart(2,'0')+' '+
      String(selectedTime.hour).padStart(2,'0')+':'+String(selectedTime.minute).padStart(2,'0');
  }
}

function renderPicker() {
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
  var isFutureYM = selectedTime && (selectedTime.year > nowY || (selectedTime.year === nowY && selectedTime.month > nowM));
  var maxD = isFutureYM ? 1 : (selectedTime && selectedTime.year === nowY && selectedTime.month === nowM) ? Math.min(maxDay, nowD) : maxDay;
  var dHtml = '';
  for (var d=1; d<=maxD; d++) {
    var dLabel = currentCalendar==='lunar' ? (LUNAR_DAYS30[d-1]||String(d)) : String(d)+'日';
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
  
  if (!tpInitialized) {
    tpInitialized = true;
  }
}

function scrollToCurrent() {
  ['Year','Month','Day','Hour','Minute'].forEach(function(col){
    var el = document.getElementById('tpCol'+col);
    var val = selectedTime[col.toLowerCase()];
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

function onColScroll(col) {
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
    if (selectedTime[key] !== val) {
      selectedTime[key] = val;
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

function highlightActive() {
  ['Year','Month','Day','Hour','Minute'].forEach(function(col){
    onColScroll(col);
  });
  updateTopDisplay();
}

function getMaxDay() {
  var y = selectedTime.year, m = selectedTime.month;
  if (currentCalendar === 'lunar') {
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

function updateDayColumn() {
  var maxDay = getMaxDay();
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var nowD = new Date().getDate();
  var isFutureYM = selectedTime && (selectedTime.year > nowY || (selectedTime.year === nowY && selectedTime.month > nowM));
  var maxD = isFutureYM ? 1 : (selectedTime && selectedTime.year === nowY && selectedTime.month === nowM) ? Math.min(maxDay, nowD) : maxDay;
  var currentDay = selectedTime.day;
  if (currentDay > maxD) {
    selectedTime.day = maxD;
    updateTopDisplay();
  }
  
  var dHtml = '';
  for (var d=1; d<=maxD; d++) {
    var dLabel = currentCalendar==='lunar' ? (LUNAR_DAYS30[d-1]||String(d)) : String(d)+'日';
    dHtml += '<div class="tp-item" data-val="'+d+'">'+dLabel+'</div>';
  }
  var dayCol = document.getElementById('tpColDay');
  dayCol.innerHTML = dHtml;
  dayCol.onscroll = function(){ onColScroll('Day'); };
  
  // 滚动到正确位置
  dayCol.scrollTop = (selectedTime.day-1) * 38;
  setTimeout(function(){ onColScroll('Day'); }, 150);
}

function renderMonthColumn() {
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var maxM = (selectedTime && selectedTime.year >= nowY) ? nowM : 12;
  var h = '';
  for (var m=1; m<=maxM; m++) {
    var mL = currentCalendar==='lunar' ? LUNAR_MONTHS[m-1] : String(m)+'月';
    h += '<div class="tp-item" data-val="'+m+'">'+mL+'</div>';
  }
  return h;
}

function updateMonthColumn() {
  var el = document.getElementById('tpColMonth');
  var nowY = new Date().getFullYear();
  var nowM = new Date().getMonth() + 1;
  var maxM = (selectedTime && selectedTime.year >= nowY) ? nowM : 12;
  var h = '';
  for (var m=1; m<=maxM; m++) {
    var mL = currentCalendar==='lunar' ? LUNAR_MONTHS[m-1] : String(m)+'月';
    h += '<div class="tp-item" data-val="'+m+'">'+mL+'</div>';
  }
  el.innerHTML = h;
  el.onscroll = function(){ onColScroll('Month'); };
  // 如果当前选中的月份超出范围，回退
  if (selectedTime.month > maxM) {
    selectedTime.month = maxM;
    updateTopDisplay();
  }
  var scrollMonth = Math.min(selectedTime.month, maxM);
  el.scrollTop = (scrollMonth-1) * 38;
  setTimeout(function(){ onColScroll('Month'); }, 100);
}

function confirmTimePicker() {
  selectedTime.calendar = currentCalendar;
  updateTimeDisplay();
  document.getElementById('tpOverlay').style.display = 'none';
}

init();

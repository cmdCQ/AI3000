
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

var METHOD_NAMES = { coin:'铜钱摇卦', manual:'手动指定', auto:'自动起卦' };

// ===== 六爻纳甲 =====
var NAJIA = {
  1:{dizhi:['戌','申','午','辰','寅','子'], wuxing:['土','金','火','土','木','水'], yinyang:[0,0,0,0,0,0]}, // 乾
  2:{dizhi:['未','酉','亥','丑','卯','巳'], wuxing:['土','金','水','土','木','火'], yinyang:[1,1,1,1,1,1]}, // 兑
  3:{dizhi:['巳','未','酉','亥','丑','卯'], wuxing:['火','土','金','水','土','木'], yinyang:[1,1,1,1,1,1]}, // 离
  4:{dizhi:['戌','申','午','辰','寅','子'], wuxing:['土','金','火','土','木','水'], yinyang:[0,0,0,0,0,0]}, // 震
  5:{dizhi:['卯','巳','未','酉','亥','丑'], wuxing:['木','火','土','金','水','土'], yinyang:[1,1,1,1,1,1]}, // 巽
  6:{dizhi:['子','戌','申','午','辰','寅'], wuxing:['水','土','金','火','土','木'], yinyang:[0,0,0,0,0,0]}, // 坎
  7:{dizhi:['寅','子','戌','申','午','辰'], wuxing:['木','水','土','金','火','土'], yinyang:[0,0,0,0,0,0]}, // 艮
  8:{dizhi:['酉','亥','丑','卯','巳','未'], wuxing:['金','水','土','木','火','土'], yinyang:[1,1,1,1,1,1]}  // 坤
};

var DIZHI_WUXING = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
var DIZHI_YINYANG = {子:0,丑:1,寅:0,卯:1,辰:0,巳:1,午:0,未:1,申:0,酉:1,戌:0,亥:1};

// 六神顺序
var LIUSHEN = ['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
// 日干 → 起始六神索引
var LIUSHEN_START = {甲:0,乙:0,丙:1,丁:1,戊:2,己:3,庚:4,辛:4,壬:5,癸:5};

// 五行生克 (生我、我生)
var WUXING_SHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};
var WUXING_KE = {木:'土',土:'水',水:'火',火:'金',金:'木'};

// 卦宫五行
var PALACE_ELEMENT = {1:'金',2:'金',3:'火',4:'木',5:'木',6:'水',7:'土',8:'土'};

// ===== 八卦辅助函数 =====
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
  return [up[2],up[1],up[0],lo[2],lo[1],lo[0]];
}

// ===== 卦宫表（直接引用《增删卜易》八宫全图硬编码）=====
var PALACE_TABLE = null;

function buildPalaceTable() {
  if (PALACE_TABLE) return PALACE_TABLE;
  PALACE_TABLE = {};
  // 格式: [key, 宫, 世位, 应位, 世代名]
  // 世应：纯上六应三、一初四、二二五、三三上、四四初、五五二、游四初、归三上
  var entries = [
    // 乾宫(1)
    ['1_1',1,6,3,'pure'],['1_5',1,1,4,'一世'],['1_7',1,2,5,'二世'],['1_8',1,3,6,'三世'],
    ['5_8',1,4,1,'四世'],['7_8',1,5,2,'五世'],['3_8',1,4,1,'游魂'],['3_1',1,3,6,'归魂'],
    // 兑宫(2)
    ['2_2',2,6,3,'pure'],['2_6',2,1,4,'一世'],['2_8',2,2,5,'二世'],['2_7',2,3,6,'三世'],
    ['6_7',2,4,1,'四世'],['8_7',2,5,2,'五世'],['4_7',2,4,1,'游魂'],['4_2',2,3,6,'归魂'],
    // 离宫(3)
    ['3_3',3,6,3,'pure'],['3_7',3,1,4,'一世'],['3_5',3,2,5,'二世'],['3_6',3,3,6,'三世'],
    ['7_6',3,4,1,'四世'],['5_6',3,5,2,'五世'],['1_6',3,4,1,'游魂'],['1_3',3,3,6,'归魂'],
    // 震宫(4)
    ['4_4',4,6,3,'pure'],['4_8',4,1,4,'一世'],['4_6',4,2,5,'二世'],['4_5',4,3,6,'三世'],
    ['8_5',4,4,1,'四世'],['6_5',4,5,2,'五世'],['2_5',4,4,1,'游魂'],['2_4',4,3,6,'归魂'],
    // 巽宫(5)
    ['5_5',5,6,3,'pure'],['5_1',5,1,4,'一世'],['5_3',5,2,5,'二世'],['5_4',5,3,6,'三世'],
    ['1_4',5,4,1,'四世'],['3_4',5,5,2,'五世'],['7_4',5,4,1,'游魂'],['7_5',5,3,6,'归魂'],
    // 坎宫(6)
    ['6_6',6,6,3,'pure'],['6_2',6,1,4,'一世'],['6_4',6,2,5,'二世'],['6_3',6,3,6,'三世'],
    ['2_3',6,4,1,'四世'],['4_3',6,5,2,'五世'],['8_3',6,4,1,'游魂'],['8_6',6,3,6,'归魂'],
    // 艮宫(7)
    ['7_7',7,6,3,'pure'],['7_3',7,1,4,'一世'],['7_1',7,2,5,'二世'],['7_2',7,3,6,'三世'],
    ['3_2',7,4,1,'四世'],['1_2',7,5,2,'五世'],['5_2',7,4,1,'游魂'],['5_7',7,3,6,'归魂'],
    // 坤宫(8)
    ['8_8',8,6,3,'pure'],['8_4',8,1,4,'一世'],['8_2',8,2,5,'二世'],['8_1',8,3,6,'三世'],
    ['4_1',8,4,1,'四世'],['2_1',8,5,2,'五世'],['6_1',8,4,1,'游魂'],['6_8',8,3,6,'归魂']
  ];
  var genLabels = ['pure','一世','二世','三世','四世','五世','游魂','归魂'];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    PALACE_TABLE[e[0]] = {
      palace: e[1],
      palaceName: TRIGRAMS[e[1]].name,
      palaceElement: PALACE_ELEMENT[e[1]],
      generation: e[4],
      shi: e[2],
      ying: e[3]
    };
  }
  return PALACE_TABLE;
}

// ===== 获取卦宫信息 =====
function getPalaceInfo(upper, lower) {
  var table = buildPalaceTable();
  var key = upper+'_'+lower;
  return table[key] || { palace:upper, palaceName:TRIGRAMS[upper].name, palaceElement:PALACE_ELEMENT[upper], generation:'未知', shi:6, ying:3 };
}

// ===== 获取本卦各爻的纳甲信息 =====
function getYaoInfo(upper, lower) {
  var lines = guaToLines(upper, lower); // [上,五,四,三,二,初]
  var info = [];
  // 上卦地支: NAJIA[upper].dizhi[0]=上爻(6),[1]=五爻(5),[2]=四爻(4)
  // 下卦地支: NAJIA[lower].dizhi[0]=三爻(3),[1]=二爻(2),[2]=初爻(1)
  var upperDi = NAJIA[upper].dizhi;
  var lowerDi = NAJIA[lower].dizhi;
  var upperWx = NAJIA[upper].wuxing;
  var lowerWx = NAJIA[lower].wuxing;
  var allDizhi = [upperDi[0],upperDi[1],upperDi[2],lowerDi[3],lowerDi[4],lowerDi[5]];
  var allWuxing = [upperWx[0],upperWx[1],upperWx[2],lowerWx[3],lowerWx[4],lowerWx[5]];
  for (var i = 0; i < 6; i++) {
    info.push({ dizhi:allDizhi[i], wuxing:allWuxing[i], yang:lines[i]===1 });
  }
  return info; // [上爻(0),五爻(1),四爻(2),三爻(3),二爻(4),初爻(5)]
}

// ===== 计算六神 =====
function getLiuShen(dayGan, lineIdx) {
  var start = LIUSHEN_START[dayGan] || 0;
  var idx = (start + lineIdx) % 6;
  return LIUSHEN[idx];
}

// ===== 计算六亲 =====
function getLiuQin(palaceElement, yaoElement) {
  if (palaceElement === yaoElement) return '兄弟';
  if (WUXING_SHENG[yaoElement] === palaceElement) return '父母';   // 生我
  if (WUXING_SHENG[palaceElement] === yaoElement) return '子孙';    // 我生
  if (WUXING_KE[palaceElement] === yaoElement) return '妻财';      // 我克
  if (WUXING_KE[yaoElement] === palaceElement) return '官鬼';      // 克我
  return '';
}

// ===== 从日干支提取天干 =====
function getDayGanFromGZ(gz) {
  if (!gz) return '';
  return gz.charAt(0);
}

// ===== 渲染六爻结果 =====
function renderLines(lines) {
  var h = '<div class="yao-display">';
  for (var i=0; i<lines.length; i++) {
    var ln = lines[i];
    h += '<div class="yao-line';
    if (ln.yang) h += ' yao-yang'; else h += ' yao-yin';
    if (ln.moving) h += ' yao-moving';
    h += '">';
    if (!ln.yang) h += '<span></span><span></span>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function renderLiuyaoHex(gua, label, isBen) {
  return '';
}

var currentGua = 'ben';
var g = null;
var currentTopic = '';
var currentGender = 'male';
var currentRecordId = null;
var savedAnalysis = null;
var currentResultMeta = { divinationTime: '', createdAt: '' };
var currentAiPayload = null;

function getGuaShen(upper, lower, shiPos) {
  var yaoInfo = getYaoInfo(upper, lower);
  var shiDizhi = yaoInfo[6-shiPos].dizhi;
  var map = {子:'初',丑:'二',寅:'三',卯:'四',辰:'五',巳:'六',午:'初',未:'二',申:'三',酉:'四',戌:'五',亥:'六'};
  var posName = map[shiDizhi];
  var idx = {初:5,二:4,三:3,四:2,五:1,六:0}[posName];
  return yaoInfo[idx].dizhi;
}

function renderHexDuo(benGua, bianGua) {
  var u1=benGua.upper,l1=benGua.lower,u2=bianGua.upper,l2=bianGua.lower;
  var p1=getPalaceInfo(u1,l1),p2=getPalaceInfo(u2,l2);
  var y1=getYaoInfo(u1,l1),y2=getYaoInfo(u2,l2);
  var dg=getDayGanFromGZ((g&&g.dayGZ)||'');
  var gs=getGuaShen(u1,l1,p1.shi);
  var bl=guaToLines(u1,l1),b2=guaToLines(u2,l2);
  var ord=[0,1,2,3,4,5];
  function q(pe,wx){if(pe===wx)return'兄弟';var s={木:'火',火:'土',土:'金',金:'水',水:'木'},k={木:'土',土:'水',水:'火',火:'金',金:'木'};
    if(s[wx]===pe)return'父母';if(s[pe]===wx)return'子孙';if(k[pe]===wx)return'妻财';if(k[wx]===pe)return'官鬼';return'';}
  function ls(dg,yi){var a=['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
    return a[(({甲:0,乙:0,丙:1,丁:1,戊:2,己:3,庚:4,辛:4,壬:5,癸:5}[dg]||0)+yi)%6];}
  function bar(y){return y?'<span class="b-yang"></span>':'<span class="b-yin"><i></i><i></i></span>';}
  function hexTable(hex, palace, yaos, lines, isBen){
    var h='<table class="ht"><tr class="ht-title"><th colspan="5">'+hex.name+'('+palace.palaceName+'宫)</th></tr>';
    for(var ri=0;ri<6;ri++){
      var yi=ord[ri],yy=yaos[yi];
      var lq=q(palace.palaceElement,yy.wuxing);
      var yang=lines[yi]===1;
      var ch=isBen&&lines[yi]!==b2[yi];
      var xo=ch?(yang?'0→':'X→'):'',xc=ch?(yang?'o':'x'):'';
      h+='<tr class="hr">';
      if(isBen){h+='<td class="h-ls">'+ls(dg,5-yi)+'</td>';}
      else{h+='<td class="h-sp"></td>';}
      h+='<td class="h-lq">'+lq+'</td>';
      h+='<td class="h-dz">'+yy.dizhi+yy.wuxing+'</td>';
      h+='<td class="h-bar">'+bar(yang)+'</td>';
      h+='<td class="h-mv'+(xc?' '+xc:'')+'">'+xo+'</td>';
      h+='</tr>';
      if(isBen&&ri===2) h+='<tr class="h-gs"><td></td><td colspan="4">卦身为'+gs+'</td></tr>';
    }
    h+='</table>';
    return h;
  }
  var h='<div class="hd">'+hexTable(benGua,p1,y1,bl,true)
    +'<div class="h-div"></div>'+hexTable(bianGua,p2,y2,b2,false)+'</div>';
  h+='<div class="h-bottom"><span>本卦：'+benGua.name+'卦</span><span>变卦</span></div>';
  return h;
}

function selectGua(key) {
  currentGua = key;
  renderAnalysis();
}

function renderAnalysis() {
  var area = document.getElementById('analysisArea');
  var h = '';
  if (currentGua === 'ben') {
    var hexData = getHexagramByTrigrams(g.benGua.upper, g.benGua.lower);
    h += '<div class="card-title">☯ 本卦解析</div>';
    var pi = getPalaceInfo(g.benGua.upper, g.benGua.lower);
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);font-size:0.78rem">';
    h += '<span style="font-weight:600">'+pi.palaceName+'宫</span> · '+pi.generation+' · 世在'+(['初爻','二爻','三爻','四爻','五爻','上爻'][pi.shi-1])+' 应在'+(['初爻','二爻','三爻','四爻','五爻','上爻'][pi.ying-1])+'</div>';
    if(hexData) h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
  } else if (currentGua === 'bian') {
    var hexData = getHexagramByTrigrams(g.bianGua.upper, g.bianGua.lower);
    h += '<div class="card-title">🔮 变卦解析</div>';
    var pi = getPalaceInfo(g.bianGua.upper, g.bianGua.lower);
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);font-size:0.78rem"><span style="font-weight:600">'+pi.palaceName+'宫</span></div>';
    if(hexData) h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
  }
  area.innerHTML = h;
}

function buildLiuyaoAiPayload() {
  if (!g) return null;
  return {
    topic: currentTopic || '',
    divinationTime: currentResultMeta.divinationTime || currentResultMeta.createdAt || '',
    gender: currentGender,
    method: currentAiPayload && currentAiPayload.method ? currentAiPayload.method : '',
    coinLines: currentAiPayload && currentAiPayload.coinLines ? currentAiPayload.coinLines : [],
    lunarInfo: currentAiPayload && currentAiPayload.lunarInfo ? currentAiPayload.lunarInfo : {},
    hexagrams: {
      gender: currentGender,
      benGua: { name:g.benGua.name, upper:g.benGua.upper, lower:g.benGua.lower, upperTri:g.benGua.upperTri, lowerTri:g.benGua.lowerTri },
      bianGua: { name:g.bianGua.name, upper:g.bianGua.upper, lower:g.bianGua.lower, upperTri:g.bianGua.upperTri, lowerTri:g.bianGua.lowerTri },
      gong: g.gong || null,
      shiYao: g.shiYao || null,
      yingYao: g.yingYao || null,
      dayGZ: g.dayGZ || '',
      liuqin: g.liuqin || [],
      liushen: g.liushen || []
    }
  };
}

function renderResult(result) {
  g = result.gua;
  currentTopic = result.topic || '';
  currentGender = result.gender || 'male';
  currentGua = 'ben';
  var h = '';
  h += '<div class="card card-flush">';
  h += '<div class="card-title">排盘信息</div>';
  h += '<table class="info-table">';
  if (result.topic) h += '<tr><td class="td-label">事项</td><td class="td-value">'+escHtml(result.topic)+'</td></tr>';
  if (result.gender) {
    var genderLabel = result.gender === 'female' ? '女' : '男';
    var genderIcon = result.gender === 'female' ? '♀' : '♂';
    h += '<tr><td class="td-label">性别</td><td class="td-value">'+genderIcon+' '+genderLabel+'</td></tr>';
  }
  h += '<tr><td class="td-label">卦式</td><td class="td-value">'+(METHOD_NAMES[result.method]||result.method)+'</td></tr>';
  if (result.divinationTime) {
    h += '<tr><td class="td-label">时间</td><td class="td-value">'+escHtml(result.divinationTime)+'</td></tr>';
  } else if (result.createdAt) {
    var d = new Date(result.createdAt);
    h += '<tr><td class="td-label">时间</td><td class="td-value">'+formatTime(d)+'</td></tr>';
  }
  var li = result.lunarInfo || {};
  if (li.lunarMonth && li.lunarDay) h += '<tr><td class="td-label">农历</td><td class="td-value">'+li.lunarMonth+'月'+li.lunarDay+'</td></tr>';
  if (li.jieQiFull) h += '<tr><td class="td-label">节气</td><td class="td-value" style="font-size:0.75rem;line-height:1.5">'+escHtml(li.jieQiFull)+'</td></tr>';
  // 保存日天干到全局g，供六神计算用
  if (g) g.dayGZ = li.dayGZ || '';
  if (li.yearGZ) {
    h += '<tr><td class="td-label" style="text-align:center">干支<br><span style="font-size:0.65rem;color:#999;font-weight:400">空亡</span></td><td class="td-value" style="padding:0.3rem 0"><table style="width:100%;border-collapse:collapse"><tr>';
    h += '<td class="td-sub">'+escHtml(li.yearGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkYear||'')+'</span></td>';
    h += '<td class="td-sub td-pillar">'+escHtml(li.monthGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkMonth||'')+'</span></td>';
    h += '<td class="td-sub td-pillar">'+escHtml(li.dayGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkDay||'')+'</span></td>';
    h += '<td class="td-sub">'+escHtml(li.hourGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkHour||'')+'</span></td></tr></table></td></tr>';
  }
  if (result.coinLines && result.coinLines.length === 6) {
    var moveLines = []; var pn = ['初爻','二爻','三爻','四爻','五爻','上爻'];
    for (var mi = 0; mi < 6; mi++) if (result.coinLines[mi].changing) moveLines.push(pn[mi]);
    h += '<tr><td class="td-label">动爻</td><td class="td-value">'+(moveLines.length > 0 ? moveLines.join(' ') : '静卦（无动爻）')+'</td></tr>';
  }
  h += '</table></div>';
  h += renderHexDuo(g.benGua, g.bianGua);
  h += '<div class="analysis-card" id="analysisArea"></div>';
  return h;
}


function renderHexDetail(hexData) {
  if (!hexData) return '<div style="padding:0.6rem;color:var(--text-dim);font-size:0.75rem;text-align:center">暂无解卦数据</div>';
  var h = '';
  h += '<div class="hex-detail-title">';
  h += '<span class="hd-symbol">'+hexData.s+'</span>';
  h += '<div><span class="hd-name">'+hexData.n+'卦</span> ';
  h += '<span class="hd-pinyin">'+hexData.p+'</span></div>';
  h += '</div>';
  h += '<div class="hex-detail-meta">';
  h += '<span>'+hexData.g+'</span>';
  h += '<span>'+hexData.c+'</span>';
  h += '<span>第'+hexData.i+'卦</span>';
  h += '</div>';
  h += '<div class="hex-section">';
  h += '<div class="hex-section-label">☯ 核心要义</div>';
  h += '<div class="hex-section-content">'+hexData.m+'</div>';
  h += '</div>';
  h += '<div class="hex-section">';
  h += '<div class="hex-section-label">📜 卦辞</div>';
  h += '<div class="hex-block-quote">'+hexData.gc+'</div>';
  h += '<div class="hex-section-content">'+hexData.gb+'</div>';
  h += '</div>';
  h += '<div class="hex-section">';
  h += '<div class="hex-section-label">🐘 象传</div>';
  h += '<div class="hex-block-quote">'+hexData.xz+'</div>';
  h += '<div class="hex-section-content">'+hexData.st+'</div>';
  h += '</div>';
  h += '<div class="hex-section">';
  h += '<div class="hex-section-label">📊 爻辞详解（自下而上）</div>';
  h += '<div class="hex-yao-list">';
  for (var i=0; i<hexData.y.length; i++) {
    var yao = hexData.y[i];
    h += '<div class="hex-yao-item">';
    h += '<span class="yao-num">'+yao.n+'</span>';
    h += '<span class="yao-text">'+yao.t+'</span>';
    h += '</div>';
  }
  h += '</div>';
  if (hexData.yy) {
    h += '<div class="hex-yongyao">⚡ '+hexData.yy+'</div>';
  }
  h += '</div>';
  h += '<div class="hex-section">';
  h += '<div class="hex-section-label">🔮 现代应用指南</div>';
  h += '<div class="hex-app-grid">';
  h += '<div class="hex-app-item app-career"><strong>💼 事业</strong><br>'+hexData.a.ca+'</div>';
  h += '<div class="hex-app-item app-love"><strong>💕 感情</strong><br>'+hexData.a.re+'</div>';
  h += '<div class="hex-app-item app-decision"><strong>🎯 决策</strong><br>'+hexData.a.de+'</div>';
  h += '<div class="hex-app-item app-warning"><strong>⚠️ 警示</strong><br>'+hexData.a.wa+'</div>';
  h += '</div></div>';
  if (hexData.sc && hexData.sc.length > 0) {
    h += '<div class="hex-section">';
    h += '<div class="hex-section-label">🎯 适用场景</div>';
    h += '<div class="hex-scenarios">';
    for (var i=0; i<hexData.sc.length; i++) {
      h += '<span>'+hexData.sc[i]+'</span>';
    }
    h += '</div></div>';
  }
  if (hexData.hi) {
    h += '<div class="hex-section">';
    h += '<div class="hex-section-label">📚 历史典故</div>';
    h += '<div class="hex-history">'+hexData.hi+'</div>';
    h += '</div>';
  }
  if (hexData.r && hexData.r.length > 0) {
    h += '<div class="hex-section">';
    h += '<div class="hex-section-label">🔗 相关卦象</div>';
    h += '<div class="hex-related">';
    for (var i=0; i<hexData.r.length; i++) {
      var r = hexData.r[i];
      h += '<a onclick="showRelatedGua(\''+r.n+'\')">'+r.s+' '+r.n+'</a>';
    }
    h += '</div></div>';
  }
  if (hexData.kw && hexData.kw.length > 0) {
    h += '<div class="hex-keywords">';
    for (var i=0; i<hexData.kw.length; i++) {
      h += '<span>'+hexData.kw[i]+'</span>';
    }
    h += '</div>';
  }
  return h;
}

function showRelatedGua(name) {
  var info = getHexagramByName(name);
  if (!info) return;
  var area = document.getElementById('analysisArea');
  var h = '<div class="card-title" style="margin-bottom:0.5rem">🔗 相关卦象 · '+info.n+'卦</div>';
  h += '<div class="hex-detail-card" style="margin-top:0">';
  h += renderHexDetail(info);
  h += '<div style="text-align:center;margin-top:0.6rem"><a onclick="selectGua(\''+currentGua+'\')" style="color:var(--accent);font-size:0.75rem;cursor:pointer;text-decoration:none">← 返回当前卦象</a></div>';
  h += '</div>';
  area.innerHTML = h;
}

function formatTime(date) {
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+' '+
         String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')+':'+String(date.getSeconds()).padStart(2,'0');
}

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function load() {
  var area = document.getElementById('contentArea');
  var urlParams = new URLSearchParams(window.location.search);
  var id = urlParams.get('id');
  var isAdmin = urlParams.get('admin') === '1';

  if (id) {
    try {
      var token;
      if (isAdmin) {
        // 管理员查看：使用 admin token
        token = localStorage.getItem('sqw_admin_token');
      } else {
        token = AUTH.getToken();
      }
      var headers = token ? { 'Authorization':'Bearer '+token } : {};
      var resp = await fetch('/api/liuyao-records/'+id, { headers:headers });
      if (!resp.ok) {
        area.innerHTML = '<div class="load-state"><p>排盘记录不存在或已删除</p></div>';
        return;
      }
      currentRecordId = id;
      var data = await resp.json();
      var result = typeof data.result_data === 'string' ? JSON.parse(data.result_data) : data.result_data;
      result.topic = data.topic;
      result.createdAt = data.created_at ? new Date(data.created_at) : null;
      currentResultMeta = {
        divinationTime: result.divinationTime || '',
        createdAt: result.createdAt ? (result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt) : (data.created_at || '')
      };
      currentAiPayload = {
        method: result.method || '',
        coinLines: result.coinLines || [],
        lunarInfo: result.lunarInfo || {}
      };
      savedAnalysis = data.ai_analysis || '';
      area.innerHTML = renderResult(result);
      renderAnalysis();
      // 有保存的AI解读则在状态栏显示
      if (savedAnalysis) {
        var barBtn = document.getElementById('aiBarBtn');
        if (barBtn) barBtn.innerHTML = '<span class="ai-icon">☯</span><span>看不懂？试试自动解析</span>';
      }
    } catch(e) {
      area.innerHTML = '<div class="load-state"><p>加载失败，请重试</p></div>';
    }
  } else {
    var stored = localStorage.getItem('liuyao_result') || sessionStorage.getItem('liuyao_result');
    if (!stored) {
      area.innerHTML = '<div class="load-state"><p>没有排盘结果</p><a href="/liuyao/" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">返回排盘</a></div>';
      return;
    }
    localStorage.removeItem('liuyao_result');
    sessionStorage.removeItem('liuyao_result');
    var result = JSON.parse(stored);
    currentResultMeta = {
      divinationTime: result.divinationTime || '',
      createdAt: result.createdAt || ''
    };
    currentAiPayload = {
      method: result.method || '',
      coinLines: result.coinLines || [],
      lunarInfo: result.lunarInfo || {}
    };
    area.innerHTML = renderResult(result);
    renderAnalysis();
  }
}

load();

// 等 load 渲染完成后更新 AI bar 状态
setTimeout(function checkBar() {
  var barBtn = document.getElementById('aiBarBtn');
  if (!barBtn) { setTimeout(checkBar, 100); return; }
  if (currentTopic) {
    barBtn.classList.remove('ai-disabled');
    barBtn.setAttribute('title', '点击打开AI解析');
  }
  // overlay 点击关闭（用 JS 监听避免误触）
  var overlay = document.getElementById('aiPanelOverlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeAIPanel();
    });
  }
}, 200);

// ===== AI 智能解析 =====
var aiStreamAbort = null;
var aiPanelOpen = false;

function toggleAIPanel() {
  aiPanelOpen = !aiPanelOpen;
  document.getElementById('aiPanel').classList.toggle('open', aiPanelOpen);
  document.getElementById('aiPanelOverlay').classList.toggle('open', aiPanelOpen);
  if (aiPanelOpen) {
    showAIHome();
  }
}

function closeAIPanel() {
  aiPanelOpen = false;
  document.getElementById('aiPanel').classList.remove('open');
  document.getElementById('aiPanelOverlay').classList.remove('open');
  // 中断流式请求
  if (aiStreamAbort) {
    aiStreamAbort.abort();
    aiStreamAbort = null;
  }
}

function showAIToast(msg) {
  var el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position:'fixed', bottom:'5rem', left:'50%', transform:'translateX(-50%)',
    background:'rgba(0,0,0,0.75)', color:'#fff', padding:'0.5rem 1rem',
    borderRadius:'8px', fontSize:'0.78rem', zIndex:'200',
    maxWidth:'360px', textAlign:'center', lineHeight:'1.5',
    animation:'aiFadeIn 0.2s'
  });
  document.body.appendChild(el);
  setTimeout(function(){ el.remove(); }, 2500);
}

async function sendFollowUp() {
  // 未登录用户可追问一次
  if (!AUTH.isLoggedIn()) {
    if (localStorage.getItem('liuyao_anon_followup')) {
      var resp = document.getElementById('aiResponse');
      showLoginPrompt(resp);
      var fbar = document.getElementById('aiFollowBar');
      if (fbar) fbar.classList.remove('show');
      return;
    }
  }
  var input = document.getElementById('aiFollowInput');
  var q = input.value.trim();
  if (!q) return;

  var btn = document.getElementById('aiFollowBtn');
  btn.disabled = true;
  btn.textContent = '追问中…';
  input.value = '';
  input.disabled = true;

  // 追加追问历史
  var hist = document.getElementById('aiFollowHist');
  var item = document.createElement('div');
  item.className = 'ai-followup-item';
  item.innerHTML = '<div class="fq"><span class="fq-label">追问：</span>'+escHtml(q)+'</div><div class="ai-loading"><div class="ai-spinner"></div><span>输出中……</span></div>';
  hist.appendChild(item);
  // 滚动到底部
  var body = document.getElementById('aiPanelBody');
  setTimeout(function(){ body.scrollTop = body.scrollHeight; }, 50);

  // 隐藏追问栏（等流结束后再显示）
  var fbar = document.getElementById('aiFollowBar');
  fbar.classList.remove('show');

  var token = AUTH.getToken();
  var headers = { 'Content-Type':'application/json' };
  if (token) headers['Authorization'] = 'Bearer '+token;

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/chat/send');
  for (var k in headers) xhr.setRequestHeader(k, headers[k]);

  var prevAnswer = savedAnalysis || '';
  var fullText = '';

  xhr.onprogress = function() {
    var newText = xhr.responseText.substring(fullText.length);
    if (newText) {
      fullText = xhr.responseText;
      var ansDiv = item.querySelector('.ai-followup-answer') || document.createElement('div');
      if (!ansDiv.className) { ansDiv.className = 'ai-followup-answer'; item.appendChild(ansDiv); }
      ansDiv.innerHTML = renderMarkdown(fullText);
      body.scrollTop = body.scrollHeight;
    }
  };

  xhr.onloadend = function() {
    btn.disabled = false;
    btn.textContent = '发送';
    input.disabled = false;
    input.focus();
    fbar.classList.add('show');
    // 401 → 清除错误内容并弹出登录窗口
    if (handleApiUnauthorized(xhr, item)) return;
    // 未登录用户标记已使用追问次数
    if (!AUTH.isLoggedIn()) {
      localStorage.setItem('liuyao_anon_followup', '1');
    }
  };

  var payload = buildLiuyaoAiPayload();
  payload.followUp = q;
  payload.context = prevAnswer;
  xhr.send(JSON.stringify({
    message: q,
    cardType: 'liuyao',
    cardData: payload
  }));
}

function showAIHome() {
  var resp = document.getElementById('aiResponse');
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = '☯ 自动解析';
  resp.className = 'ai-response show';

  // 未登录用户且已使用过解析次数 → 引导注册
  if (!AUTH.isLoggedIn() && localStorage.getItem('liuyao_anon_used')) {
    showLoginPrompt(resp);
    return;
  }

  // 已有保存的解析 → 直接展示，并显示追问栏
  if (savedAnalysis) {
    showSavedAnalysis();
    var fbar = document.getElementById('aiFollowBar');
    if (fbar) fbar.classList.add('show');
    return;
  }

  // 无保存解析 → 显示开始按钮
  resp.innerHTML = '<div style="text-align:center;padding:1.5rem 0">' +
    '<div style="font-size:0.82rem;color:var(--text-dim);margin-bottom:1.2rem">点击下方按钮开始解卦分析</div>' +
    '<button class="ai-start-btn" onclick="startButtonClicked()">☯ 开始解卦</button>' +
    '</div>';
}

function showLoginPrompt(respEl) {
  respEl.innerHTML = '<div style="text-align:center;padding:1.5rem 1rem">' +
    '<div style="font-size:1.2rem;margin-bottom:0.5rem">🔒</div>' +
    '<div style="font-size:0.9rem;font-weight:600;color:var(--text);margin-bottom:0.3rem">免费解析次数已用完</div>' +
    '<div style="font-size:0.75rem;color:var(--text-dim);line-height:1.7;margin-bottom:1rem">注册登录后即可使用全部功能<br>登录可享最少 <strong style="color:var(--accent)">100 次</strong> AI 解析</div>' +
    '<div style="display:flex;gap:0.5rem;justify-content:center">' +
      '<a href="javascript:void(0)" onclick="openAuthModal(\'register\')" class="ai-start-btn" style="display:inline-block;text-decoration:none">注册</a>' +
      '<a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="ai-start-btn" style="display:inline-block;text-decoration:none;background:#fff;color:var(--accent);border:1px solid var(--accent);box-shadow:none">登录</a>' +
    '</div>' +
    '</div>';
}

function startButtonClicked() {
  if (!AUTH.isLoggedIn() && localStorage.getItem('liuyao_anon_used')) {
    var resp = document.getElementById('aiResponse');
    showLoginPrompt(resp);
    return;
  }
  if (savedAnalysis) {
    showSavedAnalysis();
  } else {
    startAIStream();
  }
}

function showSavedAnalysis() {
  var resp = document.getElementById('aiResponse');
  resp.className = 'ai-response show';
  resp.innerHTML = '<div class="ai-result">'+renderMarkdown(savedAnalysis)+'</div>';
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = '☯ 已保存的解析';
  // 显示追问输入栏
  var fbar = document.getElementById('aiFollowBar');
  if (fbar) fbar.classList.add('show');
}

async function startAIStream() {
  var resp = document.getElementById('aiResponse');
  resp.className = 'ai-response show';

  try {
    aiStreamAbort = new AbortController();
    
    var token = AUTH.getToken();
    var headers = { 'Content-Type':'application/json' };
    if (token) headers['Authorization'] = 'Bearer '+token;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/chat/send');
    for (var k in headers) xhr.setRequestHeader(k, headers[k]);
    
    var fullText = '';
    var respDiv = document.createElement('div');
    respDiv.className = 'ai-result';
    respDiv.innerHTML = '<div class="ai-loading"><div class="ai-spinner"></div><span>正在检索古籍，即将开始解卦...</span></div>';
    resp.innerHTML = '';
    resp.appendChild(respDiv);

    xhr.onprogress = function() {
      var newText = xhr.responseText.substring(fullText.length);
      if (newText) {
        fullText = xhr.responseText;
        respDiv.innerHTML = renderMarkdown(fullText);
        resp.scrollTop = resp.scrollHeight;
      }
    };

    xhr.onerror = function() {
      if (fullText) {
        respDiv.innerHTML = renderMarkdown(fullText) + '<p style="color:#991b1b;font-size:0.75rem;margin-top:0.5rem">⚠ 传输中断，以上为已接收内容</p>';
      } else {
        resp.innerHTML = '<div class="ai-error">❌ 连接失败，请重试</div>';
      }
    };

    xhr.onloadend = function() {
      aiStreamAbort = null;
      var fbar = document.getElementById('aiFollowBar');
      if (fbar) fbar.classList.add('show');
      var body = document.getElementById('aiPanelBody');
      if (body) setTimeout(function(){ body.scrollTop = body.scrollHeight; }, 100);

      // 401 → 清除错误内容并弹出登录窗口
      if (handleApiUnauthorized(xhr, respDiv)) return;

      var analysisText = fullText;
      if (analysisText) {
        var tokenIdx = analysisText.lastIndexOf('\n消耗 Token：');
        if (tokenIdx > 0) analysisText = analysisText.substring(0, tokenIdx).trim();
      }
      if (analysisText && currentRecordId) {
        fetch('/api/liuyao-records/'+currentRecordId+'/ai', {
          method:'PATCH',
          headers:headers,
          body:JSON.stringify({ analysis: analysisText })
        }).catch(function(){});
      }
      if (fullText) {
        savedAnalysis = analysisText || fullText;
        var barBtn = document.getElementById('aiBarBtn');
        if (barBtn) barBtn.innerHTML = '<span class="ai-icon">☯</span><span>看不懂？试试自动解析</span>';
        if (!AUTH.isLoggedIn()) {
          localStorage.setItem('liuyao_anon_used', '1');
        }
      }
    };

    var payload = buildLiuyaoAiPayload();
    xhr.send(JSON.stringify({
      message: currentTopic || '',
      cardType: 'liuyao',
      cardData: payload
    }));
    
  } catch (e) {
    if (e.name !== 'AbortError') {
      resp.innerHTML = '<div class="ai-error">❌ 解卦失败：'+escHtml(e.message)+'</div>';
    }
  }
}

function renderMarkdown(text) {
  if (!text) return '';
  // 转义 HTML
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // 代码块（先处理，避免内部内容被后续规则干扰）
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,a,code){ return '<pre style="background:#f5f4f0;padding:0.6rem;border-radius:6px;font-size:0.75rem;overflow-x:auto;margin:0.5rem 0;line-height:1.5">'+code.trim()+'</pre>'; });
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code style="background:#f5f4f0;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.78rem">$1</code>');
  // 水平分割线
  text = text.replace(/^---+\s*$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:0.6rem 0">');
  // 标题
  text = text.replace(/^### (.+)$/gm, '<h3 style="font-family:var(--serif);font-size:0.85rem;font-weight:600;margin:0.6rem 0 0.3rem;color:var(--text)">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="font-family:var(--serif);font-size:0.95rem;font-weight:600;margin:0.7rem 0 0.3rem;color:var(--text)">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="font-family:var(--serif);font-size:1.05rem;font-weight:700;margin:0.8rem 0 0.3rem;color:var(--text)">$1</h1>');
  // 金色区块标题 — 【一、回答】等
  text = text.replace(/^【([^】]+)】/gm, '<div style="font-family:var(--serif);font-size:0.88rem;font-weight:700;color:var(--accent);margin:0.7rem 0 0.2rem;letter-spacing:0.04em">【$1】</div>');
  // 引用块
  text = text.replace(/^> (.+)$/gm, '<blockquote style="padding:0.4rem 0.7rem;margin:0.4rem 0;border-left:3px solid var(--accent);background:var(--bg);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:0.78rem;color:var(--text-dim);line-height:1.7">$1</blockquote>');
  // 无序列表（- 或 * 开头）
  var ulCount = 0;
  text = text.replace(/^[\s]*[-*] (.+)$/gm, function(m,content){ return '<span style="display:block;padding-left:1.2rem;position:relative;line-height:1.8"><span style="position:absolute;left:0.3rem">•</span>'+content+'</span>'; });
  // 有序列表
  text = text.replace(/^[\s]*\d+\. (.+)$/gm, function(m,content){ return '<span style="display:block;padding-left:1.2rem;line-height:1.8">'+content+'</span>'; });
  // 加粗 — 重点结论用金色
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent)">$1</strong>');
  // 斜体
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // 段落：连续非空行用 <p> 包裹，保留 \n 只为分割
  var lines = text.split(/\n/);
  var out = [];
  var inPara = false;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    var isBlock = /^<(h[123]|pre|blockquote|hr|span|div)/.test(l);
    var isLine = /^<br\s*\/?>$/.test(l);
    var isEmpty = l.trim() === '';
    if (isBlock) {
      if (inPara) { out.push('</p>'); inPara = false; }
      out.push(l);
    } else if (isEmpty) {
      if (inPara) { out.push('</p>'); inPara = false; }
    } else {
      if (!inPara) { out.push('<p>'); inPara = true; }
      else { out.push('<br>'); }
      out.push(l);
    }
  }
  if (inPara) out.push('</p>');
  return out.join('');
}


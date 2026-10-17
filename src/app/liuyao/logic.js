import { AUTH } from '../shared/auth.js';
import { refreshAIPanel } from '../shared/aiPanel.js';
import { currentChart, currentTopic, currentGender, currentRecordId, renderLiuyaoResult } from '../shared/liuyaoRender.js';
import { setCurrentGender } from '../shared/liuyaoRender.js';
import { setCurrentRecordId } from '../shared/mhysRender.js';
import { Solar, Lunar } from '../shared/lunar.js'

/**
 * 六爻页（/liuyao/，主页面）的命令式逻辑层。
 *
 * 逐字搬运自 `src/web/js/page-liuyao.js`（判据快照 `duipan/legacy_ref/page-liuyao.js`，
 * payload sha256 `0796c79ced74f04f4d11705db5925af4f83ca27bc8b2249fec584b3ee6ffdf82`）。
 * 下面每个函数体与老实现逐字一致（只有 6 个被重新赋值的模块级名字换成了 `state.<名>`，
 * 以及两处顶层监听包成了函数 / export 前缀），`duipan/diff_liuyao.mjs` 的
 * 「逐字比对」段把这条断言钉住了。
 *
 * ⚠ **不许 import 任何东西**：这里读的 `Solar` / `Lunar` / `renderLiuyaoResult` /
 *   `currentRecordId` 全是 classic script（lunar.min.js / liuyao_render.js）留在
 *   `window` 上的裸全局。判据也是照这个形状跑的（duipan/legacy_liuyao.js 按老
 *   `<script>` 顺序把同一个沙箱灌起来）。import 进来会同时破坏判据与顺序保证。
 *
 * 与老实现的形态差异（只有这三类，别在这里顺手做别的）：
 *   1. 被重新赋值的 6 个模块级变量（老 :330-331 / :400 / :644-646）收进了下面的
 *      `state`；`COIN`（老 :132）从不整体重新赋值，所以保持 `var COIN`，
 *      `state.COIN` 只是**同一个对象的引用**。
 *   2. 老 :355-362 的顶层 `document.addEventListener('click', …)` → `bindDocumentClick()`；
 *      老 :624-633 的顶层 `pagehide`/`pageshow` → `bindPageLifecycle()`。
 *      ESM 不能留顶层副作用，两者都由 main.jsx 在装载时显式调用。
 *   3. 老末尾 :957 的裸调 `init();` → 由 main.jsx 在首屏同步提交后调用。
 *
 * 老实现里的死代码与「写了但行为怪」的地方**原样保留**（改它属产品决定），
 * 已逐处加 `⚠ 死代码` 注释，清单见 duipan/diff_liuyao.mjs 的报告段。
 */

/* global renderLiuyaoResult, refreshAIPanel, AUTH */

/**
 * 老实现的模块级可变状态，收在一个盒子里（mhys 同款，见 src/app/mhys/logic.js:37）。
 * 只有**会被整体重新赋值**的名字才需要进来；常量（POS_NAMES / TYPE_MAP / LUNAR_* 等）
 * 依旧是模块级 `var`，不进这里。
 */
export const state = {
  /** 老 :644 `var selectedTime = null;` —— { year, month, day, hour, minute, calendar:'gregorian'|'lunar' } */
  selectedTime: null,
  /** 老 :645 `var currentCalendar = 'gregorian';` */
  currentCalendar: 'gregorian',
  /** 老 :646 `var tpInitialized = false;` —— ⚠ 死代码：老实现里只写不读（:801-802），照搬保留。 */
  tpInitialized: false,
  /** 老 :330 `var currentMethod = 'coin';` */
  currentMethod: 'coin',
  /** 老 :331 `var setCurrentGender( 'male');` */
  currentGender: 'male',
  /** 老 :400 `var MANUAL_LINES = ['shaoyin' × 6];` —— [初爻,二爻,三爻,四爻,五爻,上爻] */
  MANUAL_LINES: ['shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin', 'shaoyin'],
  /** 老 :132 的 `COIN` 对象本身。下面的 `state.COIN = COIN;` 放的是同一个引用。 */
  COIN: null,
};

// ===== 取卦算术（只有卦号 ↔ 三爻，**不含装卦**）=====
//
// 摇出的六爻要折成上下卦号才能交给后端 —— 这是取卦，不是装卦。
// 纳甲、六亲、六神、世应、宫卦身、旺衰、用神一律**后端**算（`/api/liuyao/paipan`）。
// 改这个文件时请守住这条线：本页一旦自己算一份，用户看到的盘面与 AI 读到的那份
// 就会慢慢分叉，而两边都长得像「一个卦」，没人分辨得出来。
// 从前这里有一整份 TRIGRAMS / HEX64 / 纳甲表 / 八宫世应表 + calcGua，还有一套
// 梅花才用的体用互变错综（六爻页上显示「体用判词」是张冠李戴）—— 全部删掉。

export function triToLines(num) {
  var m={1:[1,1,1],2:[1,1,0],3:[1,0,1],4:[1,0,0],5:[0,1,1],6:[0,1,0],7:[0,0,1],8:[0,0,0]};
  return m[num]||[0,0,0];
}
export function linesToTri(lines) {
  var k=lines.join(''), m={'111':1,'110':2,'101':3,'100':4,'011':5,'010':6,'001':7,'000':8};
  return m[k]||8;
}

/**
 * 六爻（自初爻到上爻）→ 本卦与变卦的上下卦号 + 动爻位置。
 * @param {Array} lines 长度 6，每项 { yang:Boolean, changing:Boolean }，下标 0 = 初爻
 */
export function castToTrigrams(lines) {
  var yangs = [], bianYangs = [], movePositions = [];
  for (var i = 0; i < 6; i++) {
    var y = lines[i].yang ? 1 : 0;
    yangs.push(y);
    if (lines[i].changing) { movePositions.push(i + 1); bianYangs.push(y ? 0 : 1); }
    else bianYangs.push(y);
  }
  // linesToTri 吃 [下, 中, 上]
  return {
    upper: linesToTri([yangs[3], yangs[4], yangs[5]]),
    lower: linesToTri([yangs[0], yangs[1], yangs[2]]),
    bianUpper: linesToTri([bianYangs[3], bianYangs[4], bianYangs[5]]),
    bianLower: linesToTri([bianYangs[0], bianYangs[1], bianYangs[2]]),
    movePositions: movePositions,
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

export function getYearZhi(year) {
  // 年支（地支名，子丑寅…）。本页曾**同时存在两个同名定义**，另一个写成
  // `a[(y-4)%12]`：`%` 在 y<4 时给负数下标，取不到值就返回 `undefined`，
  // 而且它返回字符串、这个返回序号，两个「同名函数」语义不同 —— 谁生效只看
  // 定义先后。已删掉那个，只留这一处；负数年份一并挡住。
  var a = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  return a[((year - 4) % 12 + 12) % 12];
}

// ⚠ 死代码（老 :62-88）：`getLunarInfo()` 定义之后**全仓没有任何调用者**
// （`grep -rn getLunarInfo src/web src/app` 只剩它自己的定义与注释）。
// 连带着 `getYearZhi()`（老 :53-60）也只在这条死路上被调用 —— 它唯一活着的
// 可达路径就是这个函数。两条都原样保留（删它属产品决定）；差分脚本为了覆盖
// 它们，专门用「冻结 Date」挡位把 `new Date()` 钉死（见 diff_liuyao.mjs）。
export function getLunarInfo() {
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
      // 与后端 `paipan/ganzhi.js` 口径不同。月建是六爻的提纲，差一位则旺衰、
      // 月破、长生、世身全线不同 —— 而 AI 的解读照样头头是道，用户看不出来。
      info.yearGZ = lunar.getYearInGanZhiExact();
      info.monthGZ = lunar.getMonthInGanZhiExact();
      info.hourGZ = lunar.getTimeInGanZhi();
      // 晚子时(23:00-23:59)日柱进位次日。用库自带的 Exact 版：
      // 它与 getTimeInGanZhi() 同源（时干由进位后的日干推），两者不会脱节
      info.dayGZ = lunar.getDayInGanZhiExact();
      // 空亡（四柱各自起旬）与节气区间**这里不再算**：它们由后端返回的 `display`
      // 提供（`paipan/liuyao.js` 的 displayMeta），页面从那一份渲染。
      // 前端从前各算一份（`xunKongFromDayGZ` + getPrevJieQi），两处口径一旦不同，
      // 页面上的空亡与断卦用的空亡就会不是一回事 —— 而两行数字看上去都合理。
      // 这里只留四柱：cardData 要带一份给后端与起卦时刻互证（见 prompt.sizhuFromCard）。
    }
  } catch(e) {}
  return info;
}

// ===== 铜钱摇卦交互逻辑 =====
var COIN = {
  state: 'idle',  // idle | spinning | complete
  round: 0,        // 0-5, 当前是第几爻
  results: [],     // [初爻(0),二爻(1),三爻(2),四爻(3),五爻(4),上爻(5)]
  spinTimer: null
};

// ⚠ 老 :132 的 `COIN` 是**对象**：全页只改它的属性（`COIN.results = […]`、
//   `COIN.state = …`），从不整体重新赋值。所以它**不**进 `state.selectedTime` 那种
//   搬法，而是在 state 上放**同一个对象的引用** —— `state.COIN.results = x` 与老页的
//   `COIN.results = x` 是同一次写入，不是副本。
//   （差分脚本正是靠这条注入摇卦结果；main.jsx 的 __liuyaoTestApi.setCoinResults 同。）
state.COIN = COIN;

var POS_NAMES = ['初爻','二爻','三爻','四爻','五爻','上爻'];
var TYPE_MAP = {
  laoyin: {label:'老阴',symbol:'━ ━ ━ ×',yang:0,num:6,changing:1},
  shaoyang: {label:'少阳',symbol:'━━━━━',yang:1,num:7,changing:0},
  shaoyin: {label:'少阴',symbol:'━ ━ ━',yang:0,num:8,changing:0},
  laoyang: {label:'老阳',symbol:'━━━━━ ○',yang:1,num:9,changing:1}
};

export function initCoinToss() {
  // 它是 `setTimeout(initCoinToss, 50)` 叫起来的（`renderMethodParams` 里），而这
  // 50 毫秒里用户可能已经切到别的起卦法 —— 那样铜钱那一块 DOM 已经整个被换掉了。
  // 此时再往下走，`coinResetBtn` 是 null，`null.style` 抛 TypeError。这个错不白屏、
  // 不挡路，只是控制台里多一条，所以它在页面上活了很久没人发现
  // （`duipan/drive_liuyao_page.js` 第 ④ 例：导航后立刻点「手动指定」就复现）。
  // 判据用 `coinRow`：铜钱那一整块在，才谈得上初始化它。
  if (!document.getElementById('coinRow')) return;
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

export function preloadCoinImages() {
  ['/assets/img/liuyao/coin_hua.png', '/assets/img/liuyao/coin_zi.png'].forEach(function(src) {
    var img = new Image();
    img.src = src;
  });
}

export function setCoinImage(idx, isHua) {
  // isHua=true → 花面(阳), isHua=false → 字面(阴)
  var img = document.getElementById('coinImg'+idx);
  if (img) img.src = isHua ? '/assets/img/liuyao/coin_hua.png' : '/assets/img/liuyao/coin_zi.png';
}

export function coinClick() {
  if (COIN.state === 'idle') {
    startSpin();
  } else if (COIN.state === 'spinning') {
    stopSpin();
  }
}

export function startSpin() {
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

export function stopSpin() {
  // ⚠ 怪写法（老 :206、COIN 的枚举注释在老 :133）：老注释写的是
  //   `idle | spinning | complete`，但这里赋的是第四个值 `'spinning_stopped'`，
  //   全页没有任何地方读 `COIN.state` —— 也就是这个字段写进了一个自己注释里
  //   不存在的状态，且无人消费。原样保留。
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

export function getLineType(huaCount) {
  // 0花面=老阴, 1花面=少阳, 2花面=少阴, 3花面=老阳
  if (huaCount === 0) return 'laoyin';
  if (huaCount === 1) return 'shaoyang';
  if (huaCount === 2) return 'shaoyin';
  return 'laoyang';
}

export function renderAccumulatedLines() {
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

export function coinReset() {
  if (COIN.spinTimer) { clearInterval(COIN.spinTimer); COIN.spinTimer = null; }
  initCoinToss();
}

// 摇卦四象名 → 逐爻记录。三种起卦法共用：从前这段在 coin/auto 里各写一遍。
export function linesFromTypes(types) {
  return types.map(function(t, i){
    var info = TYPE_MAP[t];
    return { num:info.num, yang:!!info.yang, changing:!!info.changing, type:t, pos:i+1 };
  });
}

// 三种起卦法的**同一个出口**：给出六爻 + 折出的卦号 + 动爻位置。
// 返回值就是「起卦结果」的全部，没有装卦的东西 —— 装卦在后端。
export function castResult(method, lines) {
  var tri = castToTrigrams(lines);
  return {
    method: method,
    coinLines: lines,
    movePositions: tri.movePositions,
    // ⚠ 怪写法（老 :294-303）：`movePositions` 在这里出现**两次** —— 顶层一次，
    //   下面的 `trigrams: tri` 里还有一次（`castToTrigrams()` 的返回值自带）。
    //   两个值永远相等。原样保留，没顺手去重。
    // 上/下卦号与变卦上/下卦号，直接进 cardData.hexagrams
    trigrams: tri,
  };
}

export function coinDivination() {
  if (COIN.results.length !== 6) {
    // 如果还没完成6次，自动补齐
    while (COIN.results.length < 6) {
      var hua = Math.floor(Math.random()*4);
      COIN.results.push(getLineType(hua));
    }
  }
  return castResult('coin', linesFromTypes(COIN.results));
}

export function manualDivination() {
  var types = [];
  for (var i = 0; i < 6; i++) types.push(state.MANUAL_LINES[i] || 'shaoyin');
  // 手动指定的四象名是页面自己的交互词汇（少阴/少阳/老阴/老阳），
  // TYPE_MAP 认的就是它们 —— 交给同一张表转成逐爻记录，不另写一份。
  return castResult('manual', linesFromTypes(types));
}

export function autoDivination() {
  COIN.results = [];
  for (var i = 0; i < 6; i++) {
    var huaCount = Math.floor(Math.random()*4);
    COIN.results.push(getLineType(huaCount));
  }
  return castResult('auto', linesFromTypes(COIN.results));
}

// ===== 当前选中的方法 =====
// ⚠ 老 :330-331 的 `var currentMethod` / `var currentGender` 两行搬到了文件头的
//   `state` 里（原因见文件头「形态差异」）。

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
// ⚠ 老实现（快照 :355-362）是在 classic script **顶层**注册的；ESM 不能留顶层副作用，
//   这里包成导出的 `bindDocumentClick()`，由 main.jsx 在 React 外壳 flushSync 提交
//   之后调用一次。理由与 mhys 那处（src/app/mhys/logic.js:397-403）完全相同：
//   ESM 模块求值时 `document` 一定在、但 `#methodSelector`（React 还没提交）不一定在，
//   顶层直接注册的话用户在这之前点到页面就会走进 `sel.contains` 抛错。
//   注册时机的差异只影响「首屏提交前能否点到」，差分脚本对拍不到这一段。
export function bindDocumentClick() {
  document.addEventListener('click', function(e) {
    var sel=document.getElementById('methodSelector');
    if(!sel.contains(e.target)){
      document.getElementById('methodDropdown').classList.remove('open');
      document.getElementById('methodArrow').textContent='▾';
    }
  });
}

export function renderMethodParams() {
  var container = document.getElementById('methodParams');
  var h = '';
  switch(state.currentMethod) {
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

// ⚠ 老 :400 的 `var state.MANUAL_LINES = ['shaoyin' × 6];`（[初爻,二爻,三爻,四爻,五爻,上爻]）
//   搬到了文件头的 `state` 里。

export function cycleManualLine(posIdx) {
  // posIdx: 0=初爻 ... 5=上爻
  var order = ['shaoyang','laoyang','shaoyin','laoyin'];
  var cur = state.MANUAL_LINES[posIdx];
  var nextIdx = (order.indexOf(cur) + 1) % order.length;
  state.MANUAL_LINES[posIdx] = order[nextIdx];
  renderManualLines();
}

export function renderManualLines() {
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
    var type = state.MANUAL_LINES[i];
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

export function fillManualLineSelects() {
  // 与 initCoinToss 同一处境：它也是 50ms 后叫起来的，那时用户可能已经离开手动指定。
  // 手动那一块不在就**别动 state.MANUAL_LINES** —— 否则会在用户看不见的地方把六爻重置成
  // 全少阴，下次切回手动时他之前点的那六爻已经没了（`renderManualLines` 自己有
  // 判空，所以这里从前连报错都不报，只是静静地丢）。
  if (!document.getElementById('manualLines')) return;
  // 兼容旧调用，重置手动行并渲染
  state.MANUAL_LINES = ['shaoyin','shaoyin','shaoyin','shaoyin','shaoyin','shaoyin'];
  renderManualLines();
}

// ===== 开始排盘 =====
export async function startDivination(e) {
  if(e){ e.preventDefault(); e.stopPropagation(); }
  var btn = document.getElementById('startBtn');

  // ===== 1. 验证 =====
  if (state.currentMethod === 'coin') {
    if (COIN.results.length < 6) {
      alert('请先完成六次摇卦');
      resetBtn(); return;
    }
  }
  if (state.currentMethod === 'manual') {
    // ⚠ 怪写法（老 :536）：空分支 —— 条件成立什么都不做。原样保留。老注释原文
    //   就是「手动指定无需验证，已设默认值」。
    // 手动指定无需验证，已设默认值
  }

  // ===== 2. 取卦（本页只做这一件事） =====
  var result;
  try {
    switch(state.currentMethod) {
      case 'coin': result = coinDivination(); break;
      case 'manual': result = manualDivination(); break;
      case 'auto': result = autoDivination(); break;
      default: resetBtn(); return;
    }
  } catch(err) {
    console.error('取卦失败:', err);
    alert('起卦出错：' + (err.message || '未知错误') + '，请刷新后重试');
    resetBtn();
    return;
  }

  var card = buildCard(result);

  // ===== 3. 装卦：交给后端，页面等结果 =====
  // 盘面里的一切（卦名、宫、纳甲、六亲、六神、世应、卦身、旺衰、用神）都由
  // `/api/liuyao/paipan` 装出来。这里连「本卦叫什么名字」都不自己查 —— 页面自己
  // 查一份，AI 读的是后端那份，两者一旦分叉，用户看到「盘上是这个卦、解读里讲的
  // 是那个卦」，而两边各自看都正常。
  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '排盘中…';
  var pay;
  try {
    var resp = await fetch('/api/liuyao/paipan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    pay = await resp.json();
    if (!resp.ok) {
      alert('排盘失败：' + ((pay && pay.error) || ('HTTP ' + resp.status)));
      resetBtn(); return;
    }
  } catch (err) {
    alert('排盘请求失败，请检查网络后重试。');
    resetBtn(); return;
  }
  if (!pay || !pay.chart) { alert('排盘结果不完整，请重试。'); resetBtn(); return; }

  // ===== 4. 存记录（有事项才存；存不上不影响看结果，只是记录列表里没有这条） =====
  setCurrentRecordId( null);
  if (card.topic) {
    try {
      var sresp = await fetch('/api/liuyao-records', {
        method: 'POST',
        headers: AUTH.isLoggedIn()
          ? { 'Content-Type':'application/json', 'Authorization':'Bearer '+AUTH.getToken() }
          : { 'Content-Type':'application/json' },
        body: JSON.stringify({
          topic: card.topic,
          method: card.method,
          resultData: card   // 记录里存**这份 card**：起卦结果 + 起卦痕迹 + 四柱
        })
      });
      if (sresp.ok) {
        var saved = await sresp.json();
        setCurrentRecordId( saved.id);
      }
    } catch(e) {}
  }

  showResultHere(card, pay);
}

/**
 * 页面上的起卦结果 → 交给后端的 cardData。
 *
 * 只装**起卦结果**（上下卦号）与四柱：卦名、纳甲、六亲、六神、世应、宫、卦身、
 * 旺衰、用神全部由后端装（`/api/liuyao/paipan` → `prompt.liuyaoChartFromCard`）。
 *
 * `lunarInfo` 四柱必须带全：后端拿它跟 `divinationTime` 互证（`prompt.sizhuFromCard`
 * 要求日柱**与**时柱同时对上才采信后端重算的四柱）。带不上的后果不是报错，而是
 * 后端静默退回前端四柱 —— 那样「立春换年」这类修正就白做了。
 */
export function buildCard(result) {
  var tri = result.trigrams;
  var dt = '';
  if (state.selectedTime) {
    dt = state.selectedTime.year+'-'+String(state.selectedTime.month).padStart(2,'0')+'-'+String(state.selectedTime.day).padStart(2,'0')+' '+
      String(state.selectedTime.hour).padStart(2,'0')+':'+String(state.selectedTime.minute).padStart(2,'0');
  }
  return {
    topic: document.getElementById('topicInput').value.trim(),
    gender: state.currentGender,
    method: result.method,
    divinationTime: dt,
    createdAt: new Date().toISOString(),
    // 记录实际排盘时间（按钮点击时间，用于排序）
    recordTime: new Date().toISOString(),
    lunarInfo: enrichTimeInfo(),
    hexagrams: {
      gender: state.currentGender,
      benGua: { upper: tri.upper, lower: tri.lower },
      bianGua: { upper: tri.bianUpper, lower: tri.bianLower }
    },
    // 起卦痕迹：摇出的六爻与动爻位置。**只留档，不参与装卦** —— 装卦只看上面的
    // 卦号，爻象由后端从卦号反推。留着是为了「这卦当时是怎么摇出来的」可复查。
    coinLines: result.coinLines,
    movePositions: tri.movePositions
  };
}

// 结果就渲染在本页下面（原先这里是跳 /liuyao/result.html）。
// result.html 没废：历史记录点进去看的还是它，两页共用 liuyao_render.js。
export function showResultHere(card, pay) {
  var area = document.getElementById('resultArea');
  // renderLiuyaoResult 顺手设好全局（currentChart / currentTopic / …），
  // AI 面板读的就是那几个 —— 必须在用户点「☯ 自动解析」之前渲染好
  area.innerHTML = renderLiuyaoResult(pay.chart, pay.display, {
    topic: card.topic,
    gender: card.gender,
    method: card.method,
    divinationTime: card.divinationTime,
    createdAt: card.createdAt,
    recordId: currentRecordId,
    lunarInfo: card.lunarInfo
  });
  // 换卦了：让 AI 面板也按**这一卦**重画（数据层由 renderLiuyaoResult 的 meta 重设，
  // 但屏幕上的 DOM 还是上一卦的正文 —— 不叫这一声就会看到「第二卦的盘 + 第一卦的解读」）。
  // 面板关着时它是空操作；`typeof` 兜一下是为了「页面已更新、引擎还是旧的」那一瞬间。
  if (typeof refreshAIPanel === 'function') refreshAIPanel();
  resetBtn();
  if (area.scrollIntoView) area.scrollIntoView({ behavior:'smooth', block:'start' });
  // 结果一出来**不**自动解读。2026-09-25 用户拍板：「三个的 ai 解析都不要自动开始了，
  // 要点击才开始」—— 原来这里调 `autoStartAI()`（既开面板又立刻发请求），
  // 用户摇完卦就被扣一次积分。现在只渲染结果，要解读自己点页头那颗
  // 「☯ 看不懂？试试自动解析」（面板在 /js/liuyao_ai_panel.js 里）。
  // ⚠ 别把 `autoStartAI()` 加回来：引擎里那个函数已经一并删了（全站再无调用者）。
}

// ===== 初始化 =====
// ⚠ 老实现末尾（快照 :955、老 :957）是一行**裸调** `init();`。ESM 不能留顶层副作用，
//   那行已删除；改由 main.jsx 在 React 外壳 flushSync 提交之后调用一次 —— 时序与老页
//   面等价（都在页面可交互之前、DOM 已在）。装载顺序本身是判据，见 main.jsx 顶部。
export function init() {
  initTime();
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 30000);
  preloadCoinImages();
  renderMethodParams();
  document.getElementById('startBtn').disabled = false;
}

// ===== 性别切换 =====
export function selectGender(gender) {
  state.currentGender = gender;
  document.querySelectorAll('.gender-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.gender === gender);
  });
}

// 页面离开前重置按钮，确保 bfcache 恢复时按钮状态正常。
// ⚠ 老实现（快照 :624-633）是在 classic script **顶层**注册的；ESM 不能留顶层副作用，
//   这里包成 `bindPageLifecycle()`，由 main.jsx 在装载时调用一次（与 mhys 的
//   src/app/mhys/logic.js:608 同名同位置：在 init() 之前）。两个监听的回调体逐字未动。
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
// ⚠ 老 :644-646 的三行
//     var selectedTime = null; // { year, month, day, hour, minute, calendar:'gregorian'|'lunar' }
//     var currentCalendar = 'gregorian';
//     var tpInitialized = false;
//   搬到了文件头的 `state` 里。

var LUNAR_MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
var LUNAR_DAYS30 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
// ⚠ 死代码（老 :650）：`LUNAR_DAYS29` 声明后全页**从未被读过**（农历日名一律走
//   LUNAR_DAYS30 兜底，见 renderPicker/updateTopDisplay/renderPicker 那几处
//   `LUNAR_DAYS30[d-1]||String(d)`）。原样保留。
var LUNAR_DAYS29 = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九'];
// ⚠ 死代码（老 :651）：`SHICHEN_NAMES` 声明后全页**从未被读过** —— 时辰名走
//   `getShichen()` 自己那份 `names`（老 :47-51）。原样保留。
var SHICHEN_NAMES = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];


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
  // ⚠ 怪写法（老 :755 与老 :768）：同一个函数作用域里 `var nowY` **声明了两次**，
  //   里面还有 `var nowM` / `var nowD`。`var` 重复声明在 ESM 严格模式下依然合法，
  //   且第二次声明紧跟第一次、中间没有对 nowY 的写入，所以行为与只声明一次完全相同。
  //   原样保留（并进差分脚本的逐字比对范围）。
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
  
  // ⚠ 死代码（老 :801-803）：`tpInitialized` 只在这里被写、**全页从未被读**
  //   （所以 `renderPicker()` 里这段 if 没有任何可观察效果）。原样保留。
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
        // ⚠ 怪写法（老 :880）：`var l` 赋值后**从未被使用**（下面改用 `maxDay`）。
        //   保留是因为删掉它就改了老实现的文本，而它对行为没有任何影响。
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


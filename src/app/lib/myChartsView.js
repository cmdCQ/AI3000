// 「我的命盘」页的**纯**渲染函数 —— 逐字搬运自
// `duipan/legacy_ref/page-my-charts.js`（老实现快照，只读判据）。
// ==========================================================================
//
// 为什么这一份跟 ai-chat 那边不一样：老页是个 **IIFE**，所有渲染函数都在闭包里，
// 外面看不见。要逐字对拍只能**不去够函数、去够结果** —— 差分脚本
// `duipan/legacy_my_charts.js` 让它自己渲染一遍，把写进 `#mc-content` 的 innerHTML
// 交出来，再跟这里这些函数算出来的比。
//
// 所以本文件只有一条规矩：**输出逐字节等于老实现**。属性顺序、空格、`＋`/`⋯` 这些
// 全角符号、换行，一处都不能「顺手规整」。看着像死代码的（`renderListHTML` 里那个
// `baziShort` 算完从没用过）也照搬 —— 那正是「没被改过」的证据。
//
// 副作用一律不在这里：老代码里那些 `document.getElementById('mc-content').innerHTML = h`
// 由 `src/app/my-charts/main.jsx` 负责。本模块只回字符串 —— 只有这样它才能被差分脚本
// 喂输入、比输出。

export const ZODIAC_EMOJI = ['🐀','🐂','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];
export const ZODIAC_NAMES = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
export const SHICHEN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// EoT 查表（366天）。
// ⚠ 这 366 个浮点字面量是从快照里**整行切过来的**，不是人重打的 —— 抄错一位，
//   真太阳时那一行字就变，而且差分一跑就红却很难看出是哪个数错了。
//   切法：`tools` 步骤用脚本取 `legacy_ref/page-my-charts.js` 的 `EOT_TABLE` 数组原文替换
//   下面的 `__EOT_TABLE__` 占位符。改这一行请用同样的办法，别手改。
export const EOT_TABLE = [-3.71,-4.15,-4.59,-5.02,-5.45,-5.88,-6.29,-6.70,-7.10,-7.50,-7.89,-8.27,-8.64,-9.00,-9.35,-9.69,-10.03,-10.35,-10.66,-10.96,-11.26,-11.54,-11.81,-12.06,-12.31,-12.54,-12.76,-12.97,-13.17,-13.36,-13.53,-13.69,-13.84,-13.97,-14.09,-14.20,-14.30,-14.38,-14.45,-14.50,-14.55,-14.58,-14.59,-14.60,-14.59,-14.57,-14.54,-14.49,-14.43,-14.37,-14.28,-14.19,-14.08,-13.97,-13.84,-13.70,-13.55,-13.39,-13.22,-13.04,-12.85,-12.65,-12.45,-12.23,-12.00,-11.77,-11.53,-11.28,-11.02,-10.76,-10.49,-10.22,-9.94,-9.65,-9.36,-9.06,-8.76,-8.46,-8.15,-7.84,-7.53,-7.21,-6.90,-6.58,-6.26,-5.94,-5.62,-5.30,-4.98,-4.66,-4.34,-4.03,-3.71,-3.40,-3.10,-2.79,-2.49,-2.19,-1.90,-1.61,-1.32,-1.04,-0.77,-0.50,-0.24,0.02,0.26,0.51,0.74,0.97,1.19,1.40,1.60,1.80,1.98,2.16,2.33,2.49,2.64,2.79,2.92,3.04,3.15,3.26,3.35,3.44,3.51,3.58,3.63,3.68,3.71,3.74,3.75,3.76,3.76,3.74,3.72,3.69,3.65,3.60,3.54,3.47,3.40,3.31,3.22,3.12,3.01,2.89,2.77,2.64,2.50,2.36,2.20,2.05,1.89,1.72,1.54,1.37,1.18,1.00,0.81,0.61,0.42,0.22,0.01,-0.19,-0.40,-0.61,-0.82,-1.03,-1.24,-1.45,-1.66,-1.87,-2.08,-2.28,-2.49,-2.69,-2.89,-3.09,-3.28,-3.47,-3.66,-3.84,-4.02,-4.19,-4.36,-4.52,-4.68,-4.83,-4.97,-5.11,-5.24,-5.36,-5.48,-5.58,-5.68,-5.77,-5.86,-5.93,-5.99,-6.05,-6.10,-6.13,-6.16,-6.18,-6.19,-6.18,-6.17,-6.15,-6.11,-6.07,-6.02,-5.95,-5.88,-5.79,-5.70,-5.59,-5.48,-5.35,-5.21,-5.06,-4.91,-4.74,-4.56,-4.37,-4.18,-3.97,-3.75,-3.53,-3.29,-3.05,-2.80,-2.54,-2.27,-1.99,-1.71,-1.42,-1.12,-0.81,-0.50,-0.18,0.15,0.48,0.81,1.15,1.50,1.85,2.20,2.56,2.92,3.28,3.65,4.01,4.38,4.75,5.13,5.50,5.87,6.24,6.61,6.98,7.35,7.71,8.08,8.44,8.79,9.15,9.50,9.84,10.18,10.52,10.84,11.17,11.48,11.79,12.10,12.39,12.68,12.96,13.23,13.49,13.74,13.99,14.22,14.44,14.65,14.86,15.05,15.23,15.40,15.55,15.70,15.83,15.95,16.06,16.15,16.23,16.30,16.36,16.40,16.43,16.45,16.45,16.44,16.42,16.38,16.33,16.26,16.19,16.09,15.99,15.87,15.74,15.59,15.43,15.26,15.07,14.88,14.67,14.44,14.21,13.96,13.70,13.43,13.15,12.85,12.55,12.23,11.91,11.57,11.22,10.87,10.50,10.13,9.75,9.36,8.96,8.56,8.14,7.72,7.30,6.87,6.43,5.99,5.54,5.09,4.64,4.18,3.72,3.25,2.79,2.32,1.85,1.38,0.91,0.44,-0.03,-0.49,-0.96,-1.42,-1.89,-2.35,-2.80,-3.26,-3.71];

export const GAN = '甲乙丙丁戊己庚辛壬癸';

// ===== 工具 =====
// ⚠ `esc` **必须走 DOM**（老实现 :322 就是 `d.textContent=s; return d.innerHTML`）。
//   不要"顺手"换成手写正则转义：差分脚本两侧共用同一套 DOM 桩来比，换了就变成
//   「两个不同的转义器互相比」；而且真浏览器对 `textContent → innerHTML` 有它自己
//   一套规则（转义 & < > \u00a0，但**不**转义引号），手写版很难逐字节对上。
export function esc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
export function pad(n) { return String(n).padStart(2,'0'); }

export function formatDate(s) {
  try { var d=new Date(s); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  catch(e) { return ''; }
}
export function formatDateTime(s) {
  try { var d=new Date(s); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
  catch(e) { return ''; }
}

/** 生肖 emoji：本地表只用来挑图标，**不参与判断**（生肖本身由服务端给） */
export function zodiacEmojiOf(birthYear) {
  var zIdx = (birthYear - 4) % 12;
  if (zIdx < 0) zIdx += 12;
  return ZODIAC_EMOJI[zIdx];
}

/**
 * 真太阳时（显示用）。算法与 `charts/index.html` 里那份同源，**还没合并** ——
 * 合并的方向是把它挪进后端 `/api/bazi/paipan` 的 `display`，改完删掉这两份。
 */
export function trueSolarTextOf(chart) {
  var b = chart.birth || {};
  var y = b.year, mo = b.month, d = b.day;
  var hh = b.hour ?? 12, mi = b.minute ?? 0;
  try {
    var dayOfYear = Math.floor((new Date(y, mo - 1, d) - new Date(y, 0, 1)) / 86400000) + 1;
    var EoT = EOT_TABLE[dayOfYear - 1];
    if (EoT == null) return '';
    var adjMin = hh * 60 + mi + 4 * (Number(chart.longitude) - 120) + EoT;
    while (adjMin < 0) adjMin += 1440;
    while (adjMin >= 1440) adjMin -= 1440;
    var adjH = Math.floor(adjMin / 60);
    var adjMi = Math.round(adjMin % 60);
    if (adjMi === 60) { adjMi = 0; adjH = (adjH + 1) % 24; }
    return y + '-' + pad(mo) + '-' + pad(d) + ' ' + pad(adjH) + ':' + pad(adjMi) + ':00';
  } catch (e) { return ''; }
}

// ===== 空态（老 :311 renderEmpty） =====
export function renderEmptyHTML({ icon, title, desc, link, btnText }) {
  var btn;
  if (link === '/login/') {
    // ⚠ 过渡期胶水，**死期：阶段 4**。这条 `onclick="openAuthModal('login')"` 调的是
    //   老树 `src/web/js/auth.js` 挂在 window 上的弹窗（本页 footer 用 classic script
    //   引了它）。阶段 4 弹窗搬进 src/app/ 之后，这个内联 onclick 要换成 React 事件，
    //   这条分支跟着一起消掉。
    btn = '<a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="empty-btn">'+btnText+'</a>';
  } else {
    btn = '<a href="'+link+'" class="empty-btn">'+btnText+'</a>';
  }
  return '<div class="mc-empty"><div class="empty-icon">'+icon+'</div><p class="empty-title">'+title+'</p><p class="empty-desc">'+desc+'</p>'+btn+'</div>';
}

// ===== 列表（老 :38-70 那段 h 拼接） =====
export function renderListHTML(charts) {
  var h = '<div class="mc-topbar"><h1>我的命盘</h1><a href="/charts/?action=create" class="mc-add-btn" title="新建">＋</a></div><div class="mc-list">';

  charts.forEach(function(c){
    var birthYear = c.birth.year;
    var zIdx = (birthYear - 4) % 12;
    if (zIdx < 0) zIdx += 12;
    var zodiacEmoji = ZODIAC_EMOJI[zIdx];
    var genderLabel = c.gender==='male'?'男':'女';
    var scIdx = Math.floor(((c.birth.hour ?? 12) + 1) % 24 / 2);
    var dateStr = birthYear+'.'+pad(c.birth.month)+'.'+pad(c.birth.day);
    var createStr = c.createdAt ? formatDate(c.createdAt) : '';
    // 八字日柱（从服务端获取）
    // ⚠ 死代码：老实现里算完之后从没用过。照搬，别删 —— 删了就说明"改过"，
    //   而这一份存在的意义正是"没改过"。要清等阶段 4 收口时单独做。
    var baziShort = '';
    if (c.bazi) {
      var bp = c.bazi.split(' ');
      if (bp.length >= 3) baziShort = bp[2]; // 日柱
    }

    h += '<div class="mc-card" id="card-'+c.id+'">';
    h += '<div class="card-zodiac" onclick="location.href=\'/my-charts/?id='+c.id+'\'">'+zodiacEmoji+'</div>';
    h += '<div class="card-body" onclick="location.href=\'/my-charts/?id='+c.id+'\'">';
    h += '<div class="card-name">'+esc(c.name)+'</div>';
    var infoLine = genderLabel+' '+dateStr+' '+SHICHEN[scIdx]+'时';
    h += '<div class="card-info">'+infoLine+'</div>';
    h += '</div>';
    h += '<div class="card-meta-right">';
    // ⚠ `toggleMenu` 是内联 onclick，所以 main.jsx 必须把它挂到 window 上
    //   （老页是 classic script，顶层函数天然全局；ESM 里不是）。
    h += '<span class="card-arrow" onclick="event.stopPropagation();toggleMenu(\''+c.id+'\',\''+esc(c.name)+'\')">⋯</span>';
    if (createStr) h += '<span class="card-create-time">'+createStr+'</span>';
    h += '</div></div>';
  });

  h += '</div>';
  return h;
}

/**
 * 详情页的「账本」部分：出生原始参数（发给 `POST /api/bazi/paipan`）与给渲染器的 meta。
 *
 * ⚠ 这一个是我加的出口（老实现里它散在 `renderDetail` 里、算完直接闭包用掉）。
 *   加它的理由：`solarText` / `trueSolarStr` 的算法必须只有一处 —— 若让 main.jsx
 *   自己再算一遍，就成了"同一件事两份实现"，正是这一轮要治的病。
 *   它**不产生 HTML**，所以不影响任何逐字节对拍。
 *
 * ⚠ 老实现里这两样是在写完 `innerHTML` **之后**才算的；挪到之前不影响输出，
 *   但 main.jsx 必须仍然保持"先同步写骨架、再 fetch"的顺序（那才是被测的顺序）。
 */
export function detailMetaOf(chart) {
  var b = chart.birth || {};
  var birthYear = b.year, birthMonth = b.month, birthDay = b.day;
  var birthHour = b.hour ?? 12;
  var birthMinute = b.minute ?? 0;
  var gender = chart.gender === 'male' ? '男' : '女';

  var solarText = birthYear + '-' + pad(birthMonth) + '-' + pad(birthDay)
    + ' ' + pad(birthHour) + ':' + pad(birthMinute) + ':00';
  // 真太阳时：**这是显示用的一行字**，不参与排盘（后端那条端点也只收公历时刻）。
  var trueSolarStr = (chart.trueSolarTime && chart.longitude) ? trueSolarTextOf(chart) : '';

  return {
    birthReq: { y: birthYear, mo: birthMonth, d: birthDay,
      h: birthHour, mi: birthMinute, gender: chart.gender },
    meta: {
      name: chart.name, genderText: gender, solarText: solarText,
      trueSolarText: trueSolarStr, birthplace: chart.birthplace,
      createdAt: chart.createdAt ? formatDateTime(chart.createdAt) : '',
    },
  };
}

// ===== 详情骨架（老 :129-158） =====
export function renderDetailHTML(chart, { isAdminView }) {
  var b = chart.birth || {};
  var birthYear = b.year;

  var h = '';
  h += '<div class="detail-page">';
  h += isAdminView
    ? '<a href="/admin/" class="detail-back">← 返回后台</a>'
    : '<a href="/my-charts/" class="detail-back">← 返回列表</a>';
  h += '<div class="detail-hero">';
  h += '<div class="zodiac-frame" id="baziZodiac">' + zodiacEmojiOf(birthYear) + '</div>';
  h += '<div class="hero-name">' + esc(chart.name) + '</div>';
  h += '</div>';
  h += '<div id="baziChart"><div class="mc-loading" style="padding:2rem 1rem">正在排盘…</div></div>';
  // 解读区（管理员视图不给 —— 后台看的不是自己的盘，那条端点认的是用户 token）
  // ⚠ **顺序是用户点名要的**（2026-09-25，第一版做错了被骂过一次）：
  //   「先把 ai 解析块移到上面一些，让用户一眼就能看到（但可以选择折叠对话，所以不影响看
  //    下面的内容），除了排盘以外的不重要信息都给我放下面」。
  //   用户认的「排盘」= **生肖姓名 + 四柱八个字**（就 #baziChart 里那一段，别的都不是）。
  //   所以三块依次是：#baziChart（四柱）→ #baziAi（解读，标题那行可收起）
  //   → #baziRest（基本信息 + 四柱细盘 + 命局提要 + 大运）。
  //   ⚠ 手机上（390×844 实测）只要基本信息留在 AI 块上面，一屏就被它占满、AI 块只剩个标题。
  //   两块是**两次 innerHTML 写**（见 js/bazi_render.js 的 restHost），别合并回去。
  h += '<div id="baziAi"></div>';
  h += '<div id="baziRest"></div>';
  h += '<div class="detail-actions">';
  if (isAdminView) {
    h += '<a href="/admin/" class="btn">← 返回后台</a>';
  } else {
    h += '<a href="/charts/?action=edit&id=' + chart.id + '" class="btn">编辑此命盘</a>';
    // ⚠ 同样是内联 onclick，`doDelete` 也要挂 window（见 main.jsx）。
    h += '<button class="btn btn-danger" onclick="doDelete(\'' + chart.id + '\')">删除此命盘</button>';
  }
  h += '</div></div>';
  return h;
}

/**
 * 排盘取不到时的退路（老 :207-222）。信息表照给，四柱用**存库时的旧快照**
 * （`chart.bazi`），并**明说**这份是旧的 —— 宁可说清，也别让用户拿一份来路不明的盘
 * 去对 AI 的解读。解读区不给（没有盘就没有可解读的东西）。
 *
 * ⚠ 清空 `#baziAi` 与 `#baziRest` 是调用方的活（本模块是纯函数）。
 *   为什么必须清：退路是「这一次排盘没取到」，若留着上一次的细盘/大运，
 *   用户会把上一份盘的大运当成这一张的（切换命盘时最容易撞上）。老 :223-228。
 */
export function renderDetailFallbackHTML(chart, meta, err) {
  var h = '<div class="bz-sec" style="margin-top:0.4rem">';
  h += '<div class="detail-sheet">';
  h += '<div class="sheet-row"><span class="label">姓名：</span><span class="value">'
    + esc(chart.name) + ' ' + esc(meta.genderText) + '</span></div>';
  h += '<div class="sheet-row"><span class="label">公历：</span><span class="value">'
    + esc(meta.solarText) + '</span></div>';
  if (chart.bazi) {
    h += '<div class="sheet-row"><span class="label">四柱：</span><span class="value">'
      + esc(chart.bazi) + '</span></div>';
  }
  h += '</div>';
  h += '<div class="bz-note" style="border:none">⚠ 排盘没能取到（' + esc(err && err.message ? err.message : '网络不通')
    + '）。四柱若显示，是**存库时的旧快照**（按日粒度算的月柱，交节当天可能是错的）。'
    + '<br><a href="javascript:void(0)" onclick="location.reload()" style="color:var(--gold)">重试</a></div>';
  h += '</div>';
  return h;
}

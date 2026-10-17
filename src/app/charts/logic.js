import { CHINA_REGIONS } from '../shared/chinaRegions.js'
import { Solar } from '../shared/lunar.js'
import { ChartsStore } from '../shared/chartsStore.js'

// `/charts/`（新建 / 编辑命盘）的命令式逻辑 —— 阶段 3 第 12 页。
// 逐字搬运自 `src/web/js/page-charts.js`（955 行，判据快照见 git 历史：
// `git show 7ec4fda^:src/web/js/page-charts.js`）。
// ==========================================================================
//
// ─────────────────────────────────────────────────────────────
// 搬法：整段 IIFE 换成一个具名函数，函数体**一字未改**
// ─────────────────────────────────────────────────────────────
// 老文件是 `(function(){ 'use strict'; … })();` —— 整页逻辑都在一个 IIFE 里，
// 没有任何名字漏到 window（`grep -o 'on[a-z]*="' src/web/charts/index.html` 里
// 一个行内事件都没有，全是 meta/link 上的属性）。所以这里最忠实也最简单的搬法就是
// 把那层 IIFE 换成 `export function init()`：
//
//     (function(){ 'use strict';   →   export function init() {
//       … 955 行原样 …                    … 955 行原样 …
//     })();                        →   }
//
// 函数体逐字节保留（含缩进）—— 这样 `git diff -w` 与任何逐字对拍都还对得上，
// 而且**不需要**理解那 955 行就能保证移植是零风险的：唯一改变的是「谁在什么时候
// 调它一次」。老页面是 classic script 解析到就执行；新页面由 `main.jsx` 在
// `flushSync` 提交骨架之后调一次（见那边的注释）。
//
// ★ 两个必须放在 init() 内部、不能提到模块顶层的副作用
// ─────────────────────────────────────────────────────────────
//   ① 登录检查 `if (!AUTH.isLoggedIn()) { openAuthModal('login'); return; }` ——
//      放在函数里那个 `return` 就是「未登录 → 什么都不初始化」，与老行为等价；
//      放在模块顶层就变成语法错误（return 不在函数里）。
//   ② 一堆**模块求值即执行**的初始化：`updateDateDisplay()`、滚轮 track 的构建、
//      `document.addEventListener('click', …)`、地区 select 的填充 ——
//      它们全都要 DOM 已经在。老页此时标记已解析完；新页靠 flushSync 保证。
//
// ★ 依赖的全局（六条传统 script 提供，见 `charts/index.html`）
// ─────────────────────────────────────────────────────────────
//   · `AUTH`            `/js/auth.js`          —— `isLoggedIn()`
//   · `openAuthModal`   `/js/auth.js`          —— 未登录时弹登录框
//   · `ChartsStore`     ✂ 阶段 4 已改成 ESM import
//   · `CHINA_REGIONS`   ✂ 阶段 4 已改成 ESM import（见文件头 import 区）
//   · `Solar`           ✂ 同上
/* global AUTH, openAuthModal */

export function init() {
  'use strict';

  // ===== 登录检查 =====
  if (!AUTH.isLoggedIn()) { openAuthModal('login'); return; }

  // ===== 工具 =====
  function pad(n) { return String(n).padStart(2, '0'); }

  // ===== 编辑模式 =====
  var pageParams = new URLSearchParams(window.location.search);
  var editMode = pageParams.get('action') === 'edit';
  var editId = pageParams.get('id');

  // 编辑模式：立即更新标题，防止闪烁
  if (editMode && editId) {
    document.title = '编辑命盘 · 易三千';
    document.querySelector('.charts-header h1').textContent = '编辑命盘';
  }

  // ===== 状态 =====
  var selectedHour = 12;
  var selectedMinute = 0;
  var selectedLat = null;
  var selectedLng = null;
  var selectedPlace = '';
  var now = new Date();

  // ===== 日历滚轮选择器（年/月/日三段） =====
  var selectedYear, selectedMonth, selectedDay;
  var todayYear = now.getFullYear();
  var todayMonth = now.getMonth() + 1;
  var todayDay = now.getDate();

  selectedYear = todayYear;
  selectedMonth = todayMonth;
  selectedDay = todayDay;

  var YEAR_MIN = 1900, YEAR_MAX = 2100;

  function updateDateDisplay() {
    var text = selectedYear + '年' + pad(selectedMonth) + '月' + pad(selectedDay) + '日';
    document.getElementById('dateDisplayText').textContent = text;
    updateDateInfo(selectedYear + '-' + pad(selectedMonth) + '-' + pad(selectedDay));
  }

  function updateDateInfo(dateStr) {
    if (!dateStr) { document.getElementById('dateInfo').textContent = ''; return; }
    var d = new Date(dateStr + 'T00:00:00');
    var days = ['日','一','二','三','四','五','六'];
    document.getElementById('dateInfo').textContent = '星期' + days[d.getDay()];
  }

  updateDateDisplay();

  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

  function updateLunarPreview(y, m, d) {
    try {
      var solar = Solar.fromYmd(y, m, d);
      var lunar = solar.getLunar();
      document.getElementById('calLunarPreview').textContent =
        lunar.getYearInChinese() + '年 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese();
    } catch(e) { document.getElementById('calLunarPreview').textContent = ''; }
  }

  function updateCalValueDisplay() {
    document.getElementById('calValueDisplay').textContent =
      selectedYear + '-' + pad(selectedMonth) + '-' + pad(selectedDay);
    updateLunarPreview(selectedYear, selectedMonth, selectedDay);
  }

  // 构建滚轮
  var calColYear = document.getElementById('calColYear');
  var calColMonth = document.getElementById('calColMonth');
  var calColDay = document.getElementById('calColDay');
  var calTrackYear = document.getElementById('calTrackYear');
  var calTrackMonth = document.getElementById('calTrackMonth');
  var calTrackDay = document.getElementById('calTrackDay');

  function buildCalTrack(track, count, padLen, formatter) {
    track.innerHTML = '';
    for (var i = 1; i <= count; i++) {
      var opt = document.createElement('div');
      opt.className = 'cal-opt';
      opt.textContent = formatter ? formatter(i) : String(i).padStart(padLen || 2, '0');
      opt.dataset.index = i;
      track.appendChild(opt);
    }
  }

  var dayCount = daysInMonth(selectedYear, selectedMonth);
  buildCalTrack(calTrackYear, YEAR_MAX - YEAR_MIN + 1, 4, function(i) { return YEAR_MIN + i - 1; });
  buildCalTrack(calTrackMonth, 12, 2);
  buildCalTrack(calTrackDay, dayCount, 2);

  function getCalMetrics() {
    var firstOpt = calTrackYear.querySelector('.cal-opt');
    return { itemH: firstOpt ? firstOpt.offsetHeight : 40, colH: calColYear.offsetHeight || 176 };
  }

  function updateCalHighlight(track, idx) {
    var children = track.children;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.remove('selected', 'near');
      var dist = Math.abs(i - idx);
      if (dist === 0) children[i].classList.add('selected');
      else if (dist <= 2) children[i].classList.add('near');
    }
  }

  function snapCalTrack(track, idx, animate) {
    var m = getCalMetrics();
    var ty = m.colH / 2 - (idx * m.itemH + m.itemH / 2);
    track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)' : 'none';
    track.style.transform = 'translateY(' + ty + 'px)';
  }

  function setCalDate(yearIdx, monthIdx, dayIdx, animate) {
    selectedYear = YEAR_MIN + yearIdx;
    selectedMonth = monthIdx + 1;
    var maxDay = daysInMonth(selectedYear, selectedMonth);
    if (dayIdx >= maxDay) dayIdx = maxDay - 1;
    selectedDay = dayIdx + 1;
    if (dayCount !== maxDay) {
      dayCount = maxDay;
      buildCalTrack(calTrackDay, dayCount, 2);
      calDayCtrl = makeCalDraggable(calColDay, calTrackDay, dayCount, function(idx) {
        selectedDay = idx + 1; updateCalValueDisplay();
      }, { momentumFactor: 0.3, overscrollItems: 3 });
      calDayCtrl.snapTo(selectedDay - 1);
    }
    snapCalTrack(calTrackYear, yearIdx, animate);
    snapCalTrack(calTrackMonth, monthIdx, animate);
    if (dayIdx < dayCount) snapCalTrack(calTrackDay, dayIdx, animate);
    updateCalHighlight(calTrackYear, yearIdx);
    updateCalHighlight(calTrackMonth, monthIdx);
    updateCalHighlight(calTrackDay, Math.min(dayIdx, dayCount - 1));
    updateCalValueDisplay();
  }

  // 复刻 makeDraggable（日历专用）
  function makeCalDraggable(col, track, totalCount, onChange, cfg) {
    cfg = cfg || {};
    var mf = cfg.momentumFactor != null ? cfg.momentumFactor : 0.3;
    var os = cfg.overscrollItems != null ? cfg.overscrollItems : 4;
    var startY = 0, startTY = 0, startIdx = 0, dragging = false, currentIdx = 0;
    var lastMoveTime = 0, lastMoveY = 0, peakMargin = 0;

    function readTY() {
      var m = track.style.transform.match(/translateY\((-?[\d.]+)px\)/);
      return m ? parseFloat(m[1]) : 0;
    }
    function idxFromTY(ty) {
      var m = getCalMetrics();
      return Math.round((m.colH / 2 - ty - m.itemH / 2) / m.itemH);
    }
    function applyTY(ty, animate) {
      track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)' : 'none';
      track.style.transform = 'translateY(' + ty + 'px)';
      var idx = Math.max(0, Math.min(totalCount - 1, idxFromTY(ty)));
      if (idx !== currentIdx) { currentIdx = idx; onChange(idx); }
      updateCalHighlight(track, idx);
    }
    function snapTo(idx) {
      var m = getCalMetrics();
      var ty = m.colH / 2 - (idx * m.itemH + m.itemH / 2);
      currentIdx = idx; onChange(idx); applyTY(ty, true);
    }
    function handleMove(clientY) {
      if (!dragging) return;
      var n = Date.now();
      var dy = clientY - startY, ty = startTY + dy;
      var vel = lastMoveTime > 0 ? Math.abs((clientY - lastMoveY) / (n - lastMoveTime)) : 0;
      lastMoveTime = n; lastMoveY = clientY;
      var m = getCalMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);
      if (ty > maxTY || ty < minTY) {
        var wantMargin = Math.min(vel * m.itemH * 0.8, m.itemH * os);
        if (wantMargin > peakMargin) peakMargin = wantMargin;
        ty = ty > maxTY ? Math.min(ty, maxTY + peakMargin) : Math.max(ty, minTY - peakMargin);
      }
      applyTY(ty, false);
    }
    col.addEventListener('touchstart', function(e) {
      dragging = true; startY = e.touches[0].clientY;
      startTY = readTY(); startIdx = idxFromTY(startTY);
      peakMargin = 0; track.style.transition = 'none';
    }, { passive: false });
    col.addEventListener('touchmove', function(e) {
      e.preventDefault(); handleMove(e.touches[0].clientY);
    }, { passive: false });
    col.addEventListener('touchend', function() {
      if (!dragging) return; dragging = false;
      var m = getCalMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);
      var ct = readTY();
      if (ct > maxTY) { snapTo(0); return; }
      if (ct < minTY) { snapTo(totalCount - 1); return; }
      var delta = currentIdx - startIdx;
      var target = Math.max(0, Math.min(totalCount - 1, currentIdx + Math.round(delta * mf)));
      snapTo(target);
    });
    col.addEventListener('mousedown', function(e) {
      dragging = true; startY = e.clientY;
      startTY = readTY(); startIdx = idxFromTY(startTY);
      peakMargin = 0; track.style.transition = 'none'; e.preventDefault();
    });
    // Remove stale listeners before adding new ones
    if (col._mmH) window.removeEventListener('mousemove', col._mmH);
    if (col._muH) window.removeEventListener('mouseup', col._muH);
    col._mmH = function(e) { handleMove(e.clientY); };
    col._muH = function() {
      if (!dragging) return; dragging = false;
      var m = getCalMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);
      var ct = readTY();
      if (ct > maxTY) { snapTo(0); return; }
      if (ct < minTY) { snapTo(totalCount - 1); return; }
      var delta = currentIdx - startIdx;
      var target = Math.max(0, Math.min(totalCount - 1, currentIdx + Math.round(delta * mf)));
      snapTo(target);
    };
    window.addEventListener('mousemove', col._mmH);
    window.addEventListener('mouseup', col._muH);
    return { snapTo: snapTo };
  }

  var calYearCtrl = makeCalDraggable(calColYear, calTrackYear, YEAR_MAX - YEAR_MIN + 1, function(idx) {
    selectedYear = YEAR_MIN + idx;
    var maxDay = daysInMonth(selectedYear, selectedMonth);
    if (dayCount !== maxDay) {
      dayCount = maxDay;
      buildCalTrack(calTrackDay, dayCount, 2);
      calDayCtrl = makeCalDraggable(calColDay, calTrackDay, dayCount, function(dIdx) {
        selectedDay = dIdx + 1; updateCalValueDisplay();
      }, { momentumFactor: 0.3, overscrollItems: 3 });
      calDayCtrl.snapTo(Math.min(selectedDay - 1, dayCount - 1));
    }
    updateCalValueDisplay();
  }, { momentumFactor: 0.2, overscrollItems: 8 });

  var calMonthCtrl = makeCalDraggable(calColMonth, calTrackMonth, 12, function(idx) {
    selectedMonth = idx + 1;
    var maxDay = daysInMonth(selectedYear, selectedMonth);
    if (dayCount !== maxDay) {
      dayCount = maxDay;
      buildCalTrack(calTrackDay, dayCount, 2);
      calDayCtrl = makeCalDraggable(calColDay, calTrackDay, dayCount, function(dIdx) {
        selectedDay = dIdx + 1; updateCalValueDisplay();
      }, { momentumFactor: 0.3, overscrollItems: 3 });
      calDayCtrl.snapTo(Math.min(selectedDay - 1, dayCount - 1));
    }
    updateCalValueDisplay();
  });

  var calDayCtrl = makeCalDraggable(calColDay, calTrackDay, dayCount, function(idx) {
    selectedDay = idx + 1; updateCalValueDisplay();
  }, { momentumFactor: 0.3, overscrollItems: 3 });

  calTrackYear.addEventListener('click', function(e) {
    var opt = e.target.closest('.cal-opt');
    if (opt) calYearCtrl.snapTo(parseInt(opt.dataset.index) - 1);
  });
  calTrackMonth.addEventListener('click', function(e) {
    var opt = e.target.closest('.cal-opt');
    if (opt) calMonthCtrl.snapTo(parseInt(opt.dataset.index) - 1);
  });
  calTrackDay.addEventListener('click', function(e) {
    var opt = e.target.closest('.cal-opt');
    if (opt) calDayCtrl.snapTo(parseInt(opt.dataset.index) - 1);
  });

  // 打开面板
  document.getElementById('dateDisplay').addEventListener('click', function() {
    dayCount = daysInMonth(selectedYear, selectedMonth);
    buildCalTrack(calTrackDay, dayCount, 2);
    calDayCtrl = makeCalDraggable(calColDay, calTrackDay, dayCount, function(dIdx) {
      selectedDay = dIdx + 1; updateCalValueDisplay();
    }, { momentumFactor: 0.3, overscrollItems: 3 });
    setCalDate(selectedYear - YEAR_MIN, selectedMonth - 1, selectedDay - 1, false);
    document.getElementById('calOverlay').classList.add('show');
  });

  // 关闭
  document.getElementById('calOverlay').addEventListener('click', function(e) {
    if (e.target === this) this.classList.remove('show');
  });
  document.getElementById('calConfirm').addEventListener('click', function() {
    document.getElementById('calOverlay').classList.remove('show');
    updateDateDisplay();
  });

  setTimeout(function() {
    setCalDate(selectedYear - YEAR_MIN, selectedMonth - 1, selectedDay - 1, false);
  }, 50);

  function setSelectedDate(y, m, d) {
    selectedYear = y; selectedMonth = m; selectedDay = d;
    updateDateDisplay();
  }
  function getDateString() {
    return selectedYear + '-' + pad(selectedMonth) + '-' + pad(selectedDay);
  }
  // ===== 时间触控拖拽选择器 =====
  var hourCol = document.getElementById('hourCol');
  var minCol = document.getElementById('minCol');
  var hourTrack = document.getElementById('hourTrack');
  var minTrack = document.getElementById('minTrack');
  var timeDisplay = document.getElementById('timeDisplay');

  var selectedHour = 12;
  var selectedMinute = 0;

  function buildTrack(track, count, padLen) {
    for (var i = 0; i < count; i++) {
      var opt = document.createElement('div');
      opt.className = 'time-opt';
      opt.textContent = String(i).padStart(padLen, '0');
      opt.dataset.index = i;
      track.appendChild(opt);
    }
  }
  buildTrack(hourTrack, 24, 2);
  buildTrack(minTrack, 60, 2);

  function getMetrics() {
    var firstOpt = hourTrack.querySelector('.time-opt');
    return {
      itemH: firstOpt ? firstOpt.offsetHeight : 40,
      colH: hourCol.offsetHeight || 176
    };
  }

  function updateHighlight(track, idx) {
    var children = track.children;
    for (var i = 0; i < children.length; i++) {
      children[i].classList.remove('selected', 'near');
      var dist = Math.abs(i - idx);
      if (dist === 0) children[i].classList.add('selected');
      else if (dist <= 2) children[i].classList.add('near');
    }
  }

  function updateTimeDisplay() {
    timeDisplay.textContent = String(selectedHour).padStart(2, '0') + ':' + String(selectedMinute).padStart(2, '0');
  }

  function snapTrack(track, idx, animate) {
    var m = getMetrics();
    var ty = m.colH / 2 - (idx * m.itemH + m.itemH / 2);
    track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)' : 'none';
    track.style.transform = 'translateY(' + ty + 'px)';
  }

  function setTime(hour, minute, animate) {
    selectedHour = hour;
    selectedMinute = minute;
    snapTrack(hourTrack, hour, animate);
    snapTrack(minTrack, minute, animate);
    updateHighlight(hourTrack, hour);
    updateHighlight(minTrack, minute);
    updateTimeDisplay();
  }

  function makeDraggable(col, track, totalCount, onChange, cfg) {
    cfg = cfg || {};
    var mf = cfg.momentumFactor != null ? cfg.momentumFactor : 0.3;
    var os = cfg.overscrollItems != null ? cfg.overscrollItems : 4;

    var startY = 0, startTY = 0, startIdx = 0, dragging = false, currentIdx = 0;
    var lastMoveTime = 0, lastMoveY = 0, peakMargin = 0;

    function readTY() {
      var m = track.style.transform.match(/translateY\((-?[\d.]+)px\)/);
      return m ? parseFloat(m[1]) : 0;
    }

    function idxFromTY(ty) {
      var m = getMetrics();
      return Math.round((m.colH / 2 - ty - m.itemH / 2) / m.itemH);
    }

    function applyTY(ty, animate) {
      track.style.transition = animate ? 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)' : 'none';
      track.style.transform = 'translateY(' + ty + 'px)';
      var idx = Math.max(0, Math.min(totalCount - 1, idxFromTY(ty)));
      if (idx !== currentIdx) { currentIdx = idx; onChange(idx); }
      updateHighlight(track, idx);
    }

    function snapTo(idx) {
      var m = getMetrics();
      var ty = m.colH / 2 - (idx * m.itemH + m.itemH / 2);
      currentIdx = idx;
      onChange(idx);
      applyTY(ty, true);
    }

    function handleMove(clientY) {
      if (!dragging) return;
      var now = Date.now();
      var dy = clientY - startY;
      var ty = startTY + dy;
      var vel = lastMoveTime > 0 ? Math.abs((clientY - lastMoveY) / (now - lastMoveTime)) : 0;
      lastMoveTime = now; lastMoveY = clientY;

      var m = getMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);

      if (ty > maxTY || ty < minTY) {
        // 峰速边界：根据当前速度算应该开放的边界距离
        var wantMargin = Math.min(vel * m.itemH * 0.8, m.itemH * os);
        // 只扩不缩 —— 一次拖拽中边界只变大不变小
        if (wantMargin > peakMargin) peakMargin = wantMargin;
        ty = ty > maxTY ? Math.min(ty, maxTY + peakMargin) : Math.max(ty, minTY - peakMargin);
      }
      applyTY(ty, false);
    }

    col.addEventListener('touchstart', function(e) {
      dragging = true;
      startY = e.touches[0].clientY;
      startTY = readTY();
      startIdx = idxFromTY(startTY);
      peakMargin = 0;
      track.style.transition = 'none';
    }, { passive: false });

    col.addEventListener('touchmove', function(e) {
      e.preventDefault();
      handleMove(e.touches[0].clientY);
    }, { passive: false });

    col.addEventListener('touchend', function() {
      if (!dragging) return;
      dragging = false;
      var m = getMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);
      var ct = readTY();
      if (ct > maxTY) { snapTo(0); return; }
      if (ct < minTY) { snapTo(totalCount - 1); return; }
      // 动量：继续当前方向，不反弹
      var delta = currentIdx - startIdx;
      var momentum = Math.round(delta * mf);
      var target = Math.max(0, Math.min(totalCount - 1, currentIdx + momentum));
      snapTo(target);
    });

    col.addEventListener('mousedown', function(e) {
      dragging = true;
      startY = e.clientY;
      startTY = readTY();
      startIdx = idxFromTY(startTY);
      peakMargin = 0;
      track.style.transition = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e) {
      handleMove(e.clientY);
    });

    window.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      var m = getMetrics();
      var maxTY = m.colH / 2 - m.itemH / 2;
      var minTY = m.colH / 2 - ((totalCount - 1) * m.itemH + m.itemH / 2);
      var ct = readTY();
      if (ct > maxTY) { snapTo(0); return; }
      if (ct < minTY) { snapTo(totalCount - 1); return; }
      var delta = currentIdx - startIdx;
      var target = Math.max(0, Math.min(totalCount - 1, currentIdx + Math.round(delta * mf)));
      snapTo(target);
    });

    return { snapTo: snapTo };
  }

  var hourCtrl = makeDraggable(hourCol, hourTrack, 24, function(idx) {
    selectedHour = idx;
    updateTimeDisplay();
  });

  var minCtrl = makeDraggable(minCol, minTrack, 60, function(idx) {
    selectedMinute = idx;
    updateTimeDisplay();
  }, { momentumFactor: 0.5, overscrollItems: 6 });

  hourTrack.addEventListener('click', function(e) {
    var opt = e.target.closest('.time-opt');
    if (opt) hourCtrl.snapTo(parseInt(opt.dataset.index));
  });
  minTrack.addEventListener('click', function(e) {
    var opt = e.target.closest('.time-opt');
    if (opt) minCtrl.snapTo(parseInt(opt.dataset.index));
  });

  setTimeout(function() { setTime(12, 0, false); }, 100);
  updateTimeDisplay();

  // ===== 编辑模式加载 =====
  if (editMode && editId) {
    initEditMode(editId);
  }

  async function initEditMode(id) {
    var chart;
    try { chart = await ChartsStore.get(id); } catch(e) {}
    if (!chart) { alert('命盘不存在'); window.location.href = '/my-charts/'; return; }

    // 更新页面标题
    document.getElementById('btn-submit').textContent = '保存修改';

    // 填姓名
    document.getElementById('f-name').value = chart.name || '';

    // 填日期
    setSelectedDate(chart.birth.year, chart.birth.month, chart.birth.day);

    // 填性别
    document.getElementById('f-gender').value = chart.gender || 'male';

    // 填时间
    var h = chart.birth.hour ?? 12;
    var m = chart.birth.minute ?? 0;
    setTime(h, m, false);

    // 填真太阳时
    document.getElementById('f-true-solar').checked = !!chart.trueSolarTime;

    // 填出生地（预存储，延迟 fill 到 select 填充之后）
    window._editChart = chart;
  }

  // ===== 编辑模式延后填充地区（健壮版） =====
  if (window._editChart) {
    var maxTries = 30;
    var tryCount = 0;
    (function tryFillRegion() {
      tryCount++;
      var chart = window._editChart;
      if (!chart) { window._editChart = null; return; }

      // 检查省市区下拉是否已填充
      if (provSel.options.length <= 1) {
        if (tryCount < maxTries) setTimeout(tryFillRegion, 100);
        else console.warn('Region select not populated, giving up');
        return;
      }

      // 填搜索框
      if (chart.birthplace) {
        document.getElementById('placeSearch').value = chart.birthplace;
        selectedPlace = chart.birthplace;
      }

      // 填坐标
      if (chart.latitude != null && chart.longitude != null) {
        selectedLat = Number(chart.latitude);
        selectedLng = Number(chart.longitude);
        document.getElementById('coordLat').textContent = '纬度 ' + selectedLat.toFixed(4) + '°';
        document.getElementById('coordLng').textContent = '经度 ' + selectedLng.toFixed(4) + '°';
        coordDisplay.style.display = 'flex';
      }

      // 从 birthplace 字符串匹配省市区下拉
      if (chart.birthplace) {
        var parts = chart.birthplace.split(' ');
        // 找省份
        var foundProv = false;
        for (var pi = 0; pi < CHINA_REGIONS.length; pi++) {
          if (parts[0] && CHINA_REGIONS[pi].n.indexOf(parts[0]) !== -1) {
            provSel.value = pi;
            provSel.dispatchEvent(new Event('change'));
            foundProv = true;
            // 等城市填充后找城市
            if (parts[1]) {
              (function(provIdx, cityName, distName, retries) {
                var cityPoll = setInterval(function() {
                  if (citySel.options.length > 1 || --retries <= 0) {
                    clearInterval(cityPoll);
                    for (var ci = 0; ci < citySel.options.length; ci++) {
                      if (citySel.options[ci].text.indexOf(cityName) !== -1) {
                        citySel.value = ci;
                        citySel.dispatchEvent(new Event('change'));
                        // 等区县填充后找区县
                        if (distName) {
                          (function(dn, r2) {
                            var distPoll = setInterval(function() {
                              if (distSel.options.length > 1 || --r2 <= 0) {
                                clearInterval(distPoll);
                                for (var di = 0; di < distSel.options.length; di++) {
                                  if (distSel.options[di].text.indexOf(dn) !== -1) {
                                    distSel.value = di;
                                    distSel.dispatchEvent(new Event('change'));
                                    break;
                                  }
                                }
                              }
                            }, 100);
                          })(distName, 20);
                        }
                        break;
                      }
                    }
                  }
                }, 100);
              })(pi, parts[1], parts[2], 20);
            }
            break;
          }
        }
        if (!foundProv && tryCount < maxTries) {
          // 可能 CHINA_REGIONS 还没加载，等待重试
          setTimeout(tryFillRegion, 100);
        }
      }
      window._editChart = null;
    })();
  }

  // ===== EoT 查表（366天预计算值） =====
  var EOT_TABLE = [-3.71,-4.15,-4.59,-5.02,-5.45,-5.88,-6.29,-6.70,-7.10,-7.50,-7.89,-8.27,-8.64,-9.00,-9.35,-9.69,-10.03,-10.35,-10.66,-10.96,-11.26,-11.54,-11.81,-12.06,-12.31,-12.54,-12.76,-12.97,-13.17,-13.36,-13.53,-13.69,-13.84,-13.97,-14.09,-14.20,-14.30,-14.38,-14.45,-14.50,-14.55,-14.58,-14.59,-14.60,-14.59,-14.57,-14.54,-14.49,-14.43,-14.37,-14.28,-14.19,-14.08,-13.97,-13.84,-13.70,-13.55,-13.39,-13.22,-13.04,-12.85,-12.65,-12.45,-12.23,-12.00,-11.77,-11.53,-11.28,-11.02,-10.76,-10.49,-10.22,-9.94,-9.65,-9.36,-9.06,-8.76,-8.46,-8.15,-7.84,-7.53,-7.21,-6.90,-6.58,-6.26,-5.94,-5.62,-5.30,-4.98,-4.66,-4.34,-4.03,-3.71,-3.40,-3.10,-2.79,-2.49,-2.19,-1.90,-1.61,-1.32,-1.04,-0.77,-0.50,-0.24,0.02,0.26,0.51,0.74,0.97,1.19,1.40,1.60,1.80,1.98,2.16,2.33,2.49,2.64,2.79,2.92,3.04,3.15,3.26,3.35,3.44,3.51,3.58,3.63,3.68,3.71,3.74,3.75,3.76,3.76,3.74,3.72,3.69,3.65,3.60,3.54,3.47,3.40,3.31,3.22,3.12,3.01,2.89,2.77,2.64,2.50,2.36,2.20,2.05,1.89,1.72,1.54,1.37,1.18,1.00,0.81,0.61,0.42,0.22,0.01,-0.19,-0.40,-0.61,-0.82,-1.03,-1.24,-1.45,-1.66,-1.87,-2.08,-2.28,-2.49,-2.69,-2.89,-3.09,-3.28,-3.47,-3.66,-3.84,-4.02,-4.19,-4.36,-4.52,-4.68,-4.83,-4.97,-5.11,-5.24,-5.36,-5.48,-5.58,-5.68,-5.77,-5.86,-5.93,-5.99,-6.05,-6.10,-6.13,-6.16,-6.18,-6.19,-6.18,-6.17,-6.15,-6.11,-6.07,-6.02,-5.95,-5.88,-5.79,-5.70,-5.59,-5.48,-5.35,-5.21,-5.06,-4.91,-4.74,-4.56,-4.37,-4.18,-3.97,-3.75,-3.53,-3.29,-3.05,-2.80,-2.54,-2.27,-1.99,-1.71,-1.42,-1.12,-0.81,-0.50,-0.18,0.15,0.48,0.81,1.15,1.50,1.85,2.20,2.56,2.92,3.28,3.65,4.01,4.38,4.75,5.13,5.50,5.87,6.24,6.61,6.98,7.35,7.71,8.08,8.44,8.79,9.15,9.50,9.84,10.18,10.52,10.84,11.17,11.48,11.79,12.10,12.39,12.68,12.96,13.23,13.49,13.74,13.99,14.22,14.44,14.65,14.86,15.05,15.23,15.40,15.55,15.70,15.83,15.95,16.06,16.15,16.23,16.30,16.36,16.40,16.43,16.45,16.45,16.44,16.42,16.38,16.33,16.26,16.19,16.09,15.99,15.87,15.74,15.59,15.43,15.26,15.07,14.88,14.67,14.44,14.21,13.96,13.70,13.43,13.15,12.85,12.55,12.23,11.91,11.57,11.22,10.87,10.50,10.13,9.75,9.36,8.96,8.56,8.14,7.72,7.30,6.87,6.43,5.99,5.54,5.09,4.64,4.18,3.72,3.25,2.79,2.32,1.85,1.38,0.91,0.44,-0.03,-0.49,-0.96,-1.42,-1.89,-2.35,-2.80,-3.26,-3.71];

  // ===== 真太阳时计算（查表法） =====
  function calcTrueSolarTime(birthYear, birthMonth, birthDay, birthHour, birthMinute, longitude) {
    var stdTotalMin = birthHour * 60 + birthMinute;

    // 1. 一年中的第几天
    var dateObj = new Date(birthYear, birthMonth - 1, birthDay);
    var startOfYear = new Date(birthYear, 0, 1);
    var dayOfYear = Math.floor((dateObj - startOfYear) / (1000 * 60 * 60 * 24)) + 1;

    // 2. 查表获取 EoT（分钟）
    var EoT = EOT_TABLE[dayOfYear - 1];

    // 3. 平太阳时 = 北京时间 + 4×(经度-120) 分钟
    var meanSolarMin = stdTotalMin + 4 * (longitude - 120);

    // 4. 真太阳时 = 平太阳时 + EoT
    var TST_local_min = meanSolarMin + EoT;

    // 处理跨日
    while (TST_local_min < 0) TST_local_min += 24 * 60;
    while (TST_local_min >= 24 * 60) TST_local_min -= 24 * 60;

    var adjustedHour = Math.floor(TST_local_min / 60);
    var adjustedMinute = Math.round(TST_local_min % 60);
    if (adjustedMinute === 60) { adjustedMinute = 0; adjustedHour = (adjustedHour + 1) % 24; }

    return { hour: adjustedHour, minute: adjustedMinute };
  }

  // ===== 真太阳时（始终可用，仅控制后端计算逻辑） =====

  // ===== 构建搜索索引（全国城市+区县扁平索引） =====
  var searchIndex = []; // [{ text, provinceIdx, cityIdx, distIdx, path }]

  CHINA_REGIONS.forEach(function(prov, pi){
    prov.c.forEach(function(city, ci){
      // 城市级别
      searchIndex.push({
        text: city.n,
        provinceIdx: pi,
        cityIdx: ci,
        distIdx: -1,
        path: prov.n + ' · ' + city.n
      });
      // 区县级别
      if (city.d) {
        city.d.forEach(function(dist, di){
          searchIndex.push({
            text: dist.n,
            provinceIdx: pi,
            cityIdx: ci,
            distIdx: di,
            path: prov.n + ' · ' + city.n + ' · ' + dist.n
          });
        });
      }
    });
  });

  // ===== 省市区联动 =====
  var provSel = document.getElementById('f-province');
  var citySel = document.getElementById('f-city');
  var distSel = document.getElementById('f-district');
  var coordDisplay = document.getElementById('coordDisplay');
  var coordLat = document.getElementById('coordLat');
  var coordLng = document.getElementById('coordLng');

  // 填充省份
  CHINA_REGIONS.forEach(function(prov, i){
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = prov.n;
    provSel.appendChild(opt);
  });

  // 省份变更 → 更新城市
  provSel.addEventListener('change', function(){
    citySel.innerHTML = '<option value="">城市</option>';
    distSel.innerHTML = '<option value="">区县</option>';
    citySel.disabled = true;
    distSel.disabled = true;
    coordDisplay.style.display = 'none';
    selectedLat = null; selectedLng = null; selectedPlace = '';

    var provIdx = parseInt(this.value);
    if (isNaN(provIdx)) return;

    var cities = CHINA_REGIONS[provIdx].c;
    cities.forEach(function(city, i){
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = city.n;
      citySel.appendChild(opt);
    });
    citySel.disabled = false;
  });

  // 城市变更 → 更新区县 + 经纬度
  citySel.addEventListener('change', function(){
    distSel.innerHTML = '<option value="">区县</option>';
    distSel.disabled = true;
    var provIdx = parseInt(provSel.value);
    var cityIdx = parseInt(this.value);
    if (isNaN(provIdx) || isNaN(cityIdx)) {
      coordDisplay.style.display = 'none'; selectedLat = null; selectedLng = null; return;
    }

    var cityData = CHINA_REGIONS[provIdx].c[cityIdx];

    // 有区级数据
    if (cityData.d && cityData.d.length > 0) {
      cityData.d.forEach(function(dist, i){
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = dist.n;
        distSel.appendChild(opt);
      });
      distSel.disabled = false;
    }

    // 默认使用城市中心坐标
    if (cityData.lat !== undefined && cityData.lng !== undefined) {
      setCoord(cityData.lat, cityData.lng,
        CHINA_REGIONS[provIdx].n + ' ' + cityData.n);
    }
  });

  // 区县变更 → 更新经纬度
  distSel.addEventListener('change', function(){
    var provIdx = parseInt(provSel.value);
    var cityIdx = parseInt(citySel.value);
    var distIdx = parseInt(this.value);
    if (isNaN(provIdx) || isNaN(cityIdx) || isNaN(distIdx)) return;

    var cityData = CHINA_REGIONS[provIdx].c[cityIdx];
    var distData = cityData.d[distIdx];
    if (distData && distData.lat !== undefined) {
      setCoord(distData.lat, distData.lng,
        CHINA_REGIONS[provIdx].n + ' ' + cityData.n + ' ' + distData.n);
    }
  });

  function setCoord(lat, lng, place) {
    selectedLat = lat; selectedLng = lng; selectedPlace = place;
    coordLat.textContent = '纬度 ' + lat.toFixed(4) + '°';
    coordLng.textContent = '经度 ' + lng.toFixed(4) + '°';
    coordDisplay.style.display = 'flex';
  }

  // ===== 地点搜索功能 =====
  var placeSearch = document.getElementById('placeSearch');
  var placeSuggestions = document.getElementById('placeSuggestions');
  var searchTimer = null;

  placeSearch.addEventListener('input', function(){
    clearTimeout(searchTimer);
    var query = this.value.trim();

    if (!query || query.length < 1) {
      placeSuggestions.classList.remove('show');
      return;
    }

    // 防抖 200ms
    searchTimer = setTimeout(function(){
      doSearch(query);
    }, 200);
  });

  // 点击外部关闭建议
  document.addEventListener('click', function(e){
    if (!e.target.closest('.place-search-wrap')) {
      placeSuggestions.classList.remove('show');
    }
  });

  // 聚焦时如果已有输入内容则重新搜索
  placeSearch.addEventListener('focus', function(){
    if (this.value.trim()) {
      doSearch(this.value.trim());
    }
  });

  function doSearch(query) {
    var q = query.toLowerCase();
    var results = [];

    // 精确匹配优先，然后前缀匹配，最后包含匹配
    var exact = [], prefix = [], contains = [];

    searchIndex.forEach(function(item){
      var nameLower = item.text.toLowerCase();
      if (nameLower === q) {
        exact.push(item);
      } else if (nameLower.indexOf(q) === 0) {
        prefix.push(item);
      } else if (nameLower.indexOf(q) !== -1) {
        contains.push(item);
      }
    });

    results = exact.concat(prefix).concat(contains).slice(0, 30);

    if (results.length === 0) {
      placeSuggestions.innerHTML = '<div class="place-suggest-empty">未找到匹配的地区 (｡•́︿•̀｡)</div>';
      placeSuggestions.classList.add('show');
      return;
    }

    var html = '';
    results.forEach(function(item, idx){
      // 高亮匹配文字
      var displayName = highlightMatch(item.text, query);
      html += '<div class="place-suggest-item" data-idx="' + idx + '" ' +
        'data-pi="' + item.provinceIdx + '" ' +
        'data-ci="' + item.cityIdx + '" ' +
        'data-di="' + item.distIdx + '">' +
        '<span>' + displayName + '</span>' +
        '<span class="path">' + item.path + '</span>' +
        '</div>';
    });

    placeSuggestions.innerHTML = html;
    placeSuggestions.classList.add('show');

    // 点击建议项 → 一键填入
    placeSuggestions.querySelectorAll('.place-suggest-item').forEach(function(el){
      el.addEventListener('click', function(){
        var pi = parseInt(this.dataset.pi);
        var ci = parseInt(this.dataset.ci);
        var di = parseInt(this.dataset.di);

        // 选中省份
        provSel.value = pi;
        provSel.dispatchEvent(new Event('change'));

        // 等 city 填充完后选中城市
        setTimeout(function(){
          citySel.value = ci;
          citySel.dispatchEvent(new Event('change'));

          // 如果是区县级别，再选中区县
          if (di >= 0) {
            setTimeout(function(){
              distSel.value = di;
              distSel.dispatchEvent(new Event('change'));
            }, 50);
          }
        }, 50);

        // 关闭建议
        placeSuggestions.classList.remove('show');
        // 更新搜索框显示完整路径
        var resultItem = searchIndex.find(function(item){
          return item.provinceIdx === pi && item.cityIdx === ci && item.distIdx === di;
        });
        if (resultItem) {
          placeSearch.value = resultItem.path;
        }
      });
    });
  }

  function highlightMatch(text, query) {
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.substring(0, idx) +
      '<em style="color:var(--accent);font-style:normal">' +
      text.substring(idx, idx + query.length) + '</em>' +
      text.substring(idx + query.length);
  }

  // ===== 提交 =====
  document.getElementById('btn-submit').addEventListener('click', submitChart);

  async function submitChart() {
    var name = document.getElementById('f-name').value.trim() || '未命名';
    var gender = document.getElementById('f-gender').value;
    var calendar = 'gregorian';
    var trueSolarTime = document.getElementById('f-true-solar').checked;

    var birthYear = selectedYear;
    var birthMonth = selectedMonth;
    var birthDay = selectedDay;

    if (birthYear < 1900 || birthYear > 2100) { alert('年份超出范围（1900-2100）'); return; }

    var birthHour = selectedHour;
    var birthMinute = selectedMinute;

    // 真太阳时：校验地点
    if (trueSolarTime && (selectedLat === null || selectedLng === null)) {
      alert('请选择出生地（省份/城市/区县） (｡•́︿•̀｡)');
      return;
    }

    var btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.textContent = '保存中…';

    try {
      var payload = {
        name: name, gender: gender,
        birthYear: birthYear, birthMonth: birthMonth, birthDay: birthDay,
        birthHour: birthHour, birthMinute: birthMinute,
        calendar: calendar,
        trueSolarTime: trueSolarTime,
        birthplace: selectedPlace,
        latitude: selectedLat, longitude: selectedLng
      };

      var result;
      if (editMode && editId) {
        result = await ChartsStore.update(editId, payload);
      } else {
        result = await ChartsStore.add(payload);
      }

      window.location.href = '/my-charts/?id=' + result.id;
    } catch(e) {
      alert('保存失败: ' + (e.message || '请稍后重试'));
      btn.disabled = false; btn.textContent = '开始排盘';
    }
  }
}

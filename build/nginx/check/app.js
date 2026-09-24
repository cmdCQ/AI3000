/* Check time — 单词抽查 (纯前端 · 本地解析 · ES5 高兼容)
 * 2026-09-20  无构建、无框架、无外部 CDN，兼容所有浏览器（含旧版）
 */
(function () {
  'use strict';

  /* ================= Excel 解析 ================= */
  var HEADER_WORDS = {
    '序号': 1, '单词': 1, '编号': 1, '英文': 1, '英语': 1, '词汇': 1,
    'word': 1, 'words': 1, 'no': 1, 'number': 1, 'num': 1, 'index': 1, 'id': 1
  };
  var ALLOW_EXT = /\.(xlsx|xls)$/i;

  function trimStr(s) {
    return String(s === undefined || s === null ? '' : s).replace(/^\s+|\s+$/g, '');
  }
  function isNoise(s) { return !!HEADER_WORDS[trimStr(s).toLowerCase()]; }

  function isHeaderCell(s) {
    var t = trimStr(s).toLowerCase();
    var toks = t.split(/[\s\/|]+/);
    var i, has = false, all = true;
    for (i = 0; i < toks.length; i++) {
      if (toks[i]) { has = true; if (!HEADER_WORDS[toks[i]]) { all = false; } }
    }
    if (has && all) { return true; }
    return /序号|单词|编号|英文|英语|词汇/.test(t);
  }

  function stripWord(w) {
    return trimStr(w).replace(/^[\s"'“”‘’\.\-—、,:：;]+|[\s"'“”‘’、,;]+$/g, '');
  }

  /* 解析第一列：每行 → { no, word }
   * 兼容 A) 一列合并 "56 excel" / B) 两列拆分 A=56 B=excel
   * 自动忽略空行、表头、无法解析的行；按单词去重（忽略大小写）
   */
  function parseWorkbook(arrayBuffer) {
    if (typeof XLSX === 'undefined') { throw new Error('XLSX 库未加载'); }
    var data = new Uint8Array(arrayBuffer);
    var wb = XLSX.read(data, { type: 'array' });
    var name = wb.SheetNames[0];
    if (!name) { return []; }
    var rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' });

    var out = [], seen = {}, r, i;
    for (r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.length) { continue; }
      var c0 = row[0];
      if (c0 === undefined || c0 === null) { continue; }
      var s0 = trimStr(c0);
      if (!s0) { continue; }
      if (isHeaderCell(s0)) { continue; }

      var c1 = (row[1] !== undefined && row[1] !== null) ? trimStr(row[1]) : '';
      var no = '', word = '';

      if (/^[0-9]+$/.test(s0) && c1) {
        no = s0; word = c1;
      } else {
        var m = s0.match(/^([0-9]+)\s*[.、:：)\-—]?\s*(.+)$/);
        if (m) { no = m[1]; word = m[2]; } else { word = s0; }
      }

      word = stripWord(word);
      if (!word) { continue; }
      if (isNoise(word)) { continue; }
      if (no && isNoise(no)) { continue; }
      if (!/[A-Za-z\u4e00-\u9fa5]/.test(word)) { continue; }

      var key = word.toLowerCase();
      if (seen[key]) { continue; }
      seen[key] = 1;
      out.push({ no: no, word: word });
    }
    return out;
  }

  /* ================= DOM 助手（兼容旧浏览器） ================= */
  function $(id) { return document.getElementById(id); }
  function show(el, yes) { el.style.display = yes ? '' : 'none'; }
  function addCls(el, c) {
    if (!el.className || (' ' + el.className + ' ').indexOf(' ' + c + ' ') < 0) {
      el.className = (el.className ? el.className + ' ' : '') + c;
    }
  }
  function rmCls(el, c) {
    el.className = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, '');
  }
  function setText(el, t) { el.innerHTML = ''; el.appendChild(document.createTextNode(t)); }

  /* ================= 状态 ================= */
  var words = [];     // [{no, word}]
  var pool = [];      // 未抽的索引
  var current = null;
  var fileName = '';

  var elUpload = $('viewUpload'), elReady = $('viewReady'), elDraw = $('viewDraw');
  var elError = $('errorBox'), elDrop = $('dropzone'), elFile = $('fileInput');
  var elGrid = $('grid'), elChip = $('fileChip');
  var elGridInner = null, gridCells = [];
  var elStatTotal = $('statTotal'), elStatDrawn = $('statDrawn'), elStatLeft = $('statLeft');
  var elWordNo = $('wordNo'), elWordText = $('wordText');
  var elDone = $('doneBox'), elDoneSub = $('doneSub'), elProgress = $('progress');
  var btnDraw = $('btnDraw'), btnStart = $('btnStart');
  var btnReupload = $('btnReupload'), btnFull = $('btnFull');

  function total() { return words.length; }
  function drawn() { return words.length - pool.length; }

  function showView(name) {
    show(elUpload, name === 'upload');
    show(elReady, name === 'ready');
    show(elDraw, name === 'draw');
    show(btnReupload, name !== 'upload');
  }
  function showError(msg) {
    setText(elError, msg);
    show(elError, !!msg);
  }

  /* ================= 文件读取 ================= */
  function handleFile(file) {
    if (!file) { return; }
    showError('');
    if (!ALLOW_EXT.test(file.name || '')) {
      showError('只支持 .xlsx / .xls 文件');
      return;
    }
    if (typeof FileReader === 'undefined') {
      showError('当前浏览器不支持本地文件读取');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var parsed;
      try {
        parsed = parseWorkbook(e.target.result);
      } catch (err) {
        showError('文件解析失败，请确认是有效的 Excel 文件');
        return;
      }
      if (!parsed.length) {
        showError('没有解析到有效单词，请检查第一列格式（如：56 excel）');
        return;
      }
      words = parsed;
      pool = [];
      for (var i = 0; i < words.length; i++) { pool.push(i); }
      current = null;
      fileName = file.name;
      setText(elChip, '📄 ' + fileName);
      elChip.setAttribute('title', fileName);
      renderGrid();
      updateStats();
      showError('');
      showView('ready');
      scheduleFit();
    };
    reader.onerror = function () { showError('文件读取失败'); };
    reader.readAsArrayBuffer(file);
  }

  /* ================= 渲染 ================= */
  function renderGrid() {
    elGrid.innerHTML = '';
    gridCells = [];
    var wrap = document.createElement('div'); wrap.className = 'grid-inner';
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      var cell = document.createElement('div'); cell.className = 'cell';
      var inner = document.createElement('div'); inner.className = 'cell-inner';
      var no = document.createElement('span'); no.className = 'cell-no';
      setText(no, w.no ? w.no : '—');
      var wd = document.createElement('span'); wd.className = 'cell-word';
      setText(wd, w.word);
      inner.appendChild(no); inner.appendChild(wd); cell.appendChild(inner);
      wrap.appendChild(cell);
      gridCells.push(cell);
    }
    elGrid.appendChild(wrap);
    elGridInner = wrap;
  }

  /* 让单词列表在可用高度内完整展示：先按数量定列数，再整体等比缩放兜底 */
  function setTransform(el, v) {
    el.style.transform = v;
    el.style.webkitTransform = v;
    el.style.msTransform = v;
  }
  function fitGrid() {
    if (!elGridInner || !gridCells.length) { return; }
    setTransform(elGridInner, 'none');
    var availW = elGrid.clientWidth;
    var availH = elGrid.clientHeight;
    if (availW < 10 || availH < 10) { return; }
    var n = gridCells.length;
    var ROW = 48;               // 期望行高
    var rows = Math.floor(availH / ROW);
    if (rows < 1) { rows = 1; }
    var cols = Math.ceil(n / rows);
    var maxCols = Math.floor(availW / 88);   // 单元格最小宽度
    if (maxCols < 1) { maxCols = 1; }
    if (cols > maxCols) { cols = maxCols; }
    if (cols < 1) { cols = 1; }
    var wPct = (100 / cols).toFixed(4) + '%';
    for (var i = 0; i < gridCells.length; i++) { gridCells[i].style.width = wPct; }
    var natH = elGridInner.offsetHeight;
    if (!natH) { return; }
    var k = Math.min(1, availH / natH);
    if (k < 0.999) { setTransform(elGridInner, 'scale(' + k.toFixed(5) + ')'); }
  }
  function scheduleFit() { setTimeout(fitGrid, 0); }

  function updateStats() {
    setText(elStatTotal, String(total()));
    setText(elStatDrawn, String(drawn()));
    setText(elStatLeft, String(pool.length));
  }

  function renderDraw() {
    setText(elWordNo, current && current.no ? ('No.' + current.no) : '—');
    setText(elWordText, current ? current.word : '');

    var left = pool.length;
    setText(elProgress, '已抽 ' + drawn() + ' / ' + total() + '　·　剩余 ' + left);

    if (left === 0) {
      show(elDone, true);
      setText(elDoneSub, '共 ' + total() + ' 个单词，全部抽完啦');
      btnDraw.disabled = true;
      setText(btnDraw, '已全部抽完');
    } else {
      show(elDone, false);
      btnDraw.disabled = false;
      setText(btnDraw, '随机抽查');
    }
  }

  /* ================= 行为 ================= */
  function draw() {
    if (!words.length || pool.length === 0) { return; }
    var k = Math.floor(Math.random() * pool.length);
    var idx = pool[k];
    pool.splice(k, 1);
    current = words[idx];
    updateStats();
    showView('draw');
    renderDraw();
  }

  function reset() {
    if (!words.length) { return; }
    pool = [];
    for (var i = 0; i < words.length; i++) { pool.push(i); }
    current = null;
    updateStats();
    showView('ready');
  }

  function reupload() {
    words = []; pool = []; current = null; fileName = '';
    elFile.value = '';
    elGrid.innerHTML = '';
    showError('');
    showView('upload');
  }

  /* ---------- 全屏（跨浏览器） ---------- */
  function fullEl() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
           document.msFullscreenElement || document.mozFullScreenElement || null;
  }
  function toggleFull() {
    var root = document.documentElement;
    if (!fullEl()) {
      var fn = root.requestFullscreen || root.webkitRequestFullscreen ||
               root.msRequestFullscreen || root.mozRequestFullScreen;
      if (fn) { try { fn.call(root); } catch (e) {} }
    } else {
      var ex = document.exitFullscreen || document.webkitExitFullscreen ||
               document.msExitFullscreen || document.mozCancelFullScreen;
      if (ex) { try { ex.call(document); } catch (e) {} }
    }
  }
  function syncFull() { setText(btnFull, fullEl() ? '退出全屏' : '全屏'); }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    // 顶栏
    btnFull.onclick = toggleFull;
    btnReupload.onclick = reupload;
    btnStart.onclick = draw;
    btnDraw.onclick = draw;
    $('btnReset1').onclick = reset;
    $('btnReset2').onclick = reset;
    $('btnList').onclick = function () { updateStats(); showView('ready'); scheduleFit(); };

    // 窗口尺寸变化时重新适配
    var rt = null;
    window.onresize = function () {
      if (rt) { clearTimeout(rt); }
      rt = setTimeout(fitGrid, 120);
    };

    // 全屏状态
    var fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange', 'mozfullscreenchange'];
    for (var i = 0; i < fsEvents.length; i++) {
      document.addEventListener(fsEvents[i], syncFull, false);
    }

    // 上传：点击 / 键盘
    elDrop.onclick = function (e) { elFile.click(); };
    elDrop.onkeydown = function (e) {
      if (e.keyCode === 13 || e.keyCode === 32) { e.preventDefault(); elFile.click(); }
    };
    elFile.onchange = function () { if (elFile.files && elFile.files[0]) { handleFile(elFile.files[0]); } };

    // 拖拽
    function stop(e) { e.preventDefault(); e.stopPropagation(); }
    elDrop.addEventListener('dragenter', function (e) { stop(e); addCls(elDrop, 'is-drag'); }, false);
    elDrop.addEventListener('dragover', function (e) { stop(e); addCls(elDrop, 'is-drag'); }, false);
    elDrop.addEventListener('dragleave', function (e) { stop(e); rmCls(elDrop, 'is-drag'); }, false);
    elDrop.addEventListener('drop', function (e) {
      stop(e); rmCls(elDrop, 'is-drag');
      var dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length) { handleFile(dt.files[0]); }
    }, false);
    // 阻止浏览器默认打开文件
    document.addEventListener('dragover', function (e) { e.preventDefault(); }, false);
    document.addEventListener('drop', function (e) { e.preventDefault(); }, false);

    // 键盘快捷键
    document.addEventListener('keydown', function (e) {
      var t = e.target || e.srcElement;
      var tag = (t && t.tagName ? t.tagName : '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') { return; }
      if (elDraw.style.display === 'none' && elReady.style.display === 'none') { return; }
      if (e.keyCode === 32 || e.keyCode === 13 || e.keyCode === 39) {
        if (btnDraw.disabled) { return; }
        e.preventDefault(); draw();
      } else if (e.keyCode === 82) { // R
        reset();
      }
    }, false);
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, false);
  } else {
    bind();
  }
})();

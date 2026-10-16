// 梅花排盘渲染层 —— 由 mhys/result.html 整段搬出（2026-09-25）。
// result.html 与 index.html（原地出结果）共用这一份，勿在页面里再抄一份。
// 入口：renderResult(result) 返回 HTML；插进 DOM 之后必须再调一次 renderAnalysis()
//      （它要找 DOM 里的 #analysisArea）。
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

// 起卦法代码 → 中文。新记录用后端起卦法名（number/split/character），
// `num1`/`num2` 是旧记录里的代码，留着作别名，否则老记录只显示代码。
// （`character` 的括号说明只留在**起卦页的下拉项**里，这里与记录页/后台一样写「字占」；
//   2026-09-25 起字占按《梅花易数》原文分层取数，不再一律按笔画。）
var METHOD_NAMES = { time:'时间起卦', manual:'手动指定', auto:'自动起卦',
  number:'报数起卦（三个数）', split:'报数起卦（拆半求和）', character:'字占',
  num1:'数字起卦1', num2:'数字起卦2' };

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

function renderHexCell(gua, label, key, isActive) {
  var cls = 'hex-cell';
  if (isActive) cls += ' active';
  var h = '<div class="'+cls+'" onclick="selectGua(\''+key+'\')" id="cell-'+key+'">';
  h += '<div class="hlbl">'+label+'</div>';
  h += renderLines(gua.lines);
  h += '<div class="hname">'+gua.name+'</div>';
  h += '</div>';
  return h;
}

var currentGua = 'ben';
var g = null;
var currentTopic = '';
var currentRecordId = null;
var savedAnalysis = null;
var currentResultMeta = { divinationTime: '', createdAt: '', method: '' };
var currentAiPayload = null;

function selectGua(key) {
  currentGua = key;
  document.querySelectorAll('.hex-cell').forEach(function(c){ c.classList.remove('active'); });
  var cell = document.getElementById('cell-'+key);
  if(cell) cell.classList.add('active');
  renderAnalysis();
}

function renderAnalysis() {
  var area = document.getElementById('analysisArea');
  if (!area) return;              // 页面没摆这个槽（老页面/别处引用）时别炸
  area.hidden = false;            // 槽在页面 HTML 里是 hidden 的（起卦前它是个空框）
  var h = '';
  var targetGua, hexData;

  if (currentGua === 'ben') {
    targetGua = g.benGua;
    hexData = getHexagramByTrigrams(targetGua.upper, targetGua.lower);
    h += '<div class="card-title">☯ 本卦解析 · 体用生克</div>';
    h += '<div class="tiyong-box">';
    h += '<div class="tiyong-row"><span class="tiyong-label">体卦</span><span class="tiyong-badge ti">'+g.ti.tri.symbol+' '+g.ti.tri.name+'（'+g.ti.tri.element+'）</span><span style="font-size:0.72rem;color:var(--text-dim)">不动之卦，代表自己</span></div>';
    h += '<div class="tiyong-row"><span class="tiyong-label">用卦</span><span class="tiyong-badge yong">'+g.yong.tri.symbol+' '+g.yong.tri.name+'（'+g.yong.tri.element+'）</span><span style="font-size:0.72rem;color:var(--text-dim)">动爻所在，代表事体</span></div>';
    h += '<div class="tiyong-verdict '+g.verdict.cls+'">'+g.verdict.text+'</div>';
    h += '<p style="font-size:0.72rem;color:var(--text-dim);margin-top:0.3rem;text-align:center">'+g.verdict.desc+'</p>';
    h += '</div>';
    if(hexData){
      h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
    }
  } else if (currentGua === 'hu') {
    targetGua = g.huGua;
    hexData = getHexagramByTrigrams(targetGua.upper, targetGua.lower);
    h += '<div class="card-title">🔄 互卦解析</div>';
    h += '<p style="font-size:0.78rem;color:var(--text-dim);line-height:1.8;margin-bottom:0.6rem">互卦由本卦的中间四爻交互而成，代表事物发展过程中的中间状态和内在变化。上互卦为第三四五爻，下互卦为第二三四爻。</p>';
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);">';
    h += '<div class="tiyong-row" style="margin-bottom:0.2rem"><span class="tiyong-label">上卦</span><span class="tiyong-badge ti">'+targetGua.upperTri.symbol+' '+targetGua.upperTri.name+'（'+targetGua.upperTri.element+'）</span></div>';
    h += '<div class="tiyong-row"><span class="tiyong-label">下卦</span><span class="tiyong-badge yong">'+targetGua.lowerTri.symbol+' '+targetGua.lowerTri.name+'（'+targetGua.lowerTri.element+'）</span></div>';
    h += '</div>';
    if(hexData){
      h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
    }
  } else if (currentGua === 'bian') {
    targetGua = g.bianGua;
    hexData = getHexagramByTrigrams(targetGua.upper, targetGua.lower);
    h += '<div class="card-title">🔮 变卦解析</div>';
    h += '<p style="font-size:0.78rem;color:var(--text-dim);line-height:1.8;margin-bottom:0.6rem">变卦由本卦动爻变化而来，代表事物的最终走向和结果。</p>';
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);">';
    h += '<div class="tiyong-row" style="margin-bottom:0.2rem"><span class="tiyong-label">上卦</span><span class="tiyong-badge ti">'+targetGua.upperTri.symbol+' '+targetGua.upperTri.name+'（'+targetGua.upperTri.element+'）</span></div>';
    h += '<div class="tiyong-row"><span class="tiyong-label">下卦</span><span class="tiyong-badge yong">'+targetGua.lowerTri.symbol+' '+targetGua.lowerTri.name+'（'+targetGua.lowerTri.element+'）</span></div>';
    h += '</div>';
    if(hexData){
      h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
    }
  } else if (currentGua === 'cuo') {
    targetGua = g.cuoGua;
    hexData = getHexagramByTrigrams(targetGua.upper, targetGua.lower);
    h += '<div class="card-title">🪞 错卦解析</div>';
    h += '<p style="font-size:0.78rem;color:var(--text-dim);line-height:1.8;margin-bottom:0.6rem">错卦是将本卦六爻全部阴阳互变所得之卦，代表事物的反面/对立面，即「镜中之象」，揭示隐藏的危机或机遇。</p>';
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);">';
    h += '<div class="tiyong-row" style="margin-bottom:0.2rem"><span class="tiyong-label">上卦</span><span class="tiyong-badge ti">'+targetGua.upperTri.symbol+' '+targetGua.upperTri.name+'（'+targetGua.upperTri.element+'）</span></div>';
    h += '<div class="tiyong-row"><span class="tiyong-label">下卦</span><span class="tiyong-badge yong">'+targetGua.lowerTri.symbol+' '+targetGua.lowerTri.name+'（'+targetGua.lowerTri.element+'）</span></div>';
    h += '</div>';
    if(hexData){
      h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
    }
  } else if (currentGua === 'zong') {
    targetGua = g.zongGua;
    hexData = getHexagramByTrigrams(targetGua.upper, targetGua.lower);
    h += '<div class="card-title">🔃 综卦解析</div>';
    h += '<p style="font-size:0.78rem;color:var(--text-dim);line-height:1.8;margin-bottom:0.6rem">综卦是将本卦上下颠倒所得之卦，代表从另一个角度看待问题，即「换个角度看问题」。揭示事态的反转可能。</p>';
    h += '<div style="padding:0.6rem 0.8rem;background:var(--bg);border-radius:var(--radius-sm);">';
    h += '<div class="tiyong-row" style="margin-bottom:0.2rem"><span class="tiyong-label">上卦</span><span class="tiyong-badge ti">'+targetGua.upperTri.symbol+' '+targetGua.upperTri.name+'（'+targetGua.upperTri.element+'）</span></div>';
    h += '<div class="tiyong-row"><span class="tiyong-label">下卦</span><span class="tiyong-badge yong">'+targetGua.lowerTri.symbol+' '+targetGua.lowerTri.name+'（'+targetGua.lowerTri.element+'）</span></div>';
    h += '</div>';
    if(hexData){
      h += '<div class="hex-detail-card">'+renderHexDetail(hexData)+'</div>';
    }
  }
  area.innerHTML = h;
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

function buildMhysAiPayload() {
  if (!g) return null;
  return {
    topic: currentTopic || '',
    divinationTime: currentResultMeta.divinationTime || currentResultMeta.createdAt || '',
    method: currentResultMeta.method || '',
    numbers: currentAiPayload && currentAiPayload.numbers ? currentAiPayload.numbers : '',
    lunarInfo: currentAiPayload && currentAiPayload.lunarInfo ? currentAiPayload.lunarInfo : {},
    hexagrams: {
      benGua: { name:g.benGua.name, upper:g.benGua.upper, lower:g.benGua.lower, upperTri:g.benGua.upperTri, lowerTri:g.benGua.lowerTri, movingYao:g.benGua.movingYao },
      huGua: { name:g.huGua.name, upper:g.huGua.upper, lower:g.huGua.lower, upperTri:g.huGua.upperTri, lowerTri:g.huGua.lowerTri },
      bianGua: { name:g.bianGua.name, upper:g.bianGua.upper, lower:g.bianGua.lower, upperTri:g.bianGua.upperTri, lowerTri:g.bianGua.lowerTri },
      cuoGua: { name:g.cuoGua.name, upper:g.cuoGua.upper, lower:g.cuoGua.lower, upperTri:g.cuoGua.upperTri, lowerTri:g.cuoGua.lowerTri },
      zongGua: { name:g.zongGua.name, upper:g.zongGua.upper, lower:g.zongGua.lower, upperTri:g.zongGua.upperTri, lowerTri:g.zongGua.lowerTri },
      ti: g.ti,
      yong: g.yong,
      verdict: g.verdict
    }
  };
}

function renderResult(result) {
  g = result.gua;
  currentTopic = result.topic || '';
  currentGua = 'ben';
  // ⚠ 换一卦 = 与**上一卦**绑定的东西全部作废，不只是上面这三个。
  //
  // 原先这里只重置 g / currentTopic / currentGua，`savedAnalysis` 与 `currentRecordId`
  // 一直留着两卦之间 —— 于是**同一个页面上排第二次盘**之后（梅花/六爻都是原地出结果）：
  //   · AI 块里还是**上一卦**的解析：第二卦的盘配第一卦的解读。形式完全正常、内容是错的，
  //     用户会照着上一卦的建议去做事 —— 这是最坏的一种错（用户 2026-09-25 报的
  //     「用了两次之后…原来的 ai 解析块就消失了」就是这一族）。
  //   · 点「开始解卦」也拿不到新的：面板里 `aiSaved()` 为真就直接把旧的**再贴一遍**。
  //   · 若这一卦没存记录（没填事项），`currentRecordId` 还是上一卦的 id，
  //     这一卦的解析会被 PATCH 到**上一卦的记录**上，覆盖掉人家原来的解读（数据被改坏）。
  //
  // ⚠ 调用方要挂「本来就已经存在的解析」（记录页从 `/api/mhys-records/<id>` 取回的
  // `ai_analysis`）必须在**渲染之后**再挂 —— 顺序反过来就会被这里清掉。
  // 六爻那边 `renderLiuyaoResult()` 是同样的形状（`meta` 里逐项重设），别只改一边。
  savedAnalysis = null;
  currentRecordId = null;
  var h = '';

  // ===== 排盘信息表格 =====
  h += '<div class="card card-flush">';
  h += '<div class="card-title">排盘信息</div>';
  h += '<table class="info-table">';
  // 事项
  if (result.topic) {
    h += '<tr><td class="td-label">事项</td><td class="td-value">'+escHtml(result.topic)+'</td></tr>';
  }
  // 起卦方式
  h += '<tr><td class="td-label">卦式</td><td class="td-value">'+(METHOD_NAMES[result.method]||result.method)+'</td></tr>';
  // 输入数字
  if (result.numbers) {
    h += '<tr><td class="td-label">数字</td><td class="td-value">'+escHtml(result.numbers)+'</td></tr>';
  }
  // 字占的**取数明细**（后端 `qigua.derivation`，本页只渲染、不算）。
  //
  // 为什么非要给用户看这个：四个字以上不再数笔画，改成按读音的平仄取数 —— 同一个
  // 句子换一版读音表就换一个卦，用户看不见依据只会觉得「卦是随机的」。故逐字给
  // 「字 → 取数 → 依据」，再把三句算式原文摆出来（「前 3 字「今日动」取数 1+4+3 = 8，
  // ÷ 8 余 8」）。旧记录里没有 `qigua`（或老版本没写 derivation）→ 整块不出现。
  var _der = (result.qigua && result.qigua.derivation) || null;
  if (result.method === 'character' && _der && _der.chars && _der.chars.length) {
    var TONE_CN = { 1:'平声', 2:'上声', 3:'去声', 4:'入声' };
    var _per;
    if (_der.strokes_per_char) {
      // 两三个字（或调用方自带笔画）：逐字笔画
      _per = _der.chars.map(function (c, i) { return c + '·' + _der.strokes_per_char[i] + '画'; });
      if (_der.stroke_source) _per.push('（' + _der.stroke_source + '）');
    } else if (_der.count_source_per_char) {
      // 四到十个字：逐字取数 + 依据（入声 / 今音）
      _per = _der.chars.map(function (c, i) {
        var v = _der.counts_per_char[i];
        return c + '·' + (TONE_CN[v] || '') + v + '（' + _der.count_source_per_char[i] + '）';
      });
    } else {
      // 十一个字以上：只按字数
      _per = ['共 ' + _der.chars.length + ' 字，每字算 1 数'];
    }
    h += '<tr><td class="td-label">取数</td><td class="td-value" style="font-size:0.75rem;line-height:1.8">'
      + escHtml(_per.join('　')) + '</td></tr>';
    var _calc = [_der.upper_calc, _der.lower_calc, _der.moving_calc].filter(Boolean);
    if (_calc.length) {
      h += '<tr><td class="td-label">算式</td><td class="td-value" style="font-size:0.75rem;line-height:1.8">'
        + _calc.map(escHtml).join('<br>') + '</td></tr>';
    }
  }
  // 起卦时间（统一显示排盘时间）
  if (result.divinationTime) {
    h += '<tr><td class="td-label">时间</td><td class="td-value">'+escHtml(result.divinationTime)+'</td></tr>';
  } else if (result.createdAt) {
    // 旧版记录回退
    var d = new Date(result.createdAt);
    h += '<tr><td class="td-label">时间</td><td class="td-value">'+formatTime(d)+'</td></tr>';
  }
  // 农历
  var li = result.lunarInfo || {};
  if (li.lunarMonth && li.lunarDay) {
    h += '<tr><td class="td-label">农历</td><td class="td-value">'+li.lunarMonth+'月'+li.lunarDay+'</td></tr>';
  }
  // 节气
  if (li.jieQiFull) {
    h += '<tr><td class="td-label">节气</td><td class="td-value" style="font-size:0.75rem;line-height:1.5">'+escHtml(li.jieQiFull)+'</td></tr>';
  }
  // 干支四柱
  if (li.yearGZ) {
    h += '<tr>';
    h += '<td class="td-label" style="text-align:center">干支<br><span style="font-size:0.65rem;color:#999;font-weight:400">空亡</span></td>';
    h += '<td class="td-value" style="padding:0.3rem 0">';
    h += '<table style="width:100%;border-collapse:collapse"><tr>';
    h += '<td class="td-sub">'+escHtml(li.yearGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkYear||'')+'</span></td>';
    h += '<td class="td-sub td-pillar">'+escHtml(li.monthGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkMonth||'')+'</span></td>';
    h += '<td class="td-sub td-pillar">'+escHtml(li.dayGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkDay||'')+'</span></td>';
    h += '<td class="td-sub">'+escHtml(li.hourGZ)+'<br><span style="font-size:0.65rem;color:#999">'+escHtml(li.xkHour||'')+'</span></td>';
    h += '</tr></table>';
    h += '</td></tr>';
  }
  h += '</table>';
  h += '</div>';

  // ===== 五卦融合卡片 =====
  h += '<div class="card card-next">';
  h += '<div class="card-title">☯ 起卦结果</div>';
  h += '<div class="hex-panel">';
  h += renderHexCell(g.benGua, '本卦', 'ben', true);
  h += renderHexCell(g.huGua, '互卦', 'hu', false);
  h += renderHexCell(g.bianGua, '变卦', 'bian', false);
  h += renderHexCell(g.cuoGua, '错卦', 'cuo', false);
  h += renderHexCell(g.zongGua, '综卦', 'zong', false);
  h += '</div></div>';

  // ⚠ 解析区（`#analysisArea`）**不在这里**，它是页面 HTML 里的固定槽（`#resultArea` /
  // `#contentArea` 的**下一个兄弟**），`renderAnalysis()` 往它里面写。
  //
  // 为什么挪出去（2026-09-25，用户要求「梅花的自动解析移到卦象解析前面」）：
  // AI 面板的宿主 `#aiInlineHost` 是由引擎插在**正文容器的下一个兄弟**位置上的
  // （`ai_panel.js::aiInlineHost()`）。原先 `#analysisArea` 在容器**内部**，于是宿主
  // 只能排到整个结果之后 —— 页面顺序是「排盘信息 → 起卦结果 → 卦象解析 → AI 解读」，
  // 用户要的是「排盘信息 → 起卦结果 → **AI 解读** → 卦象解析」。
  // 把解析区放成容器的下一个兄弟之后，宿主正好插在两者之间，**引擎一行都不用改**。
  // 附带好处：容器整块 `innerHTML = …` 重建时，解析区不再跟着被清掉。

  return h;
}

// `formatTime` / `escHtml` 已搬到 `/js/ui_common.js`（全站共用一份）。
// 本文件与六爻页的渲染层都从那里取，页面记得先引 ui_common.js。

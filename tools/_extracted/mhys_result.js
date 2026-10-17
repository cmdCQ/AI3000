
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

var METHOD_NAMES = { time:'时间起卦', manual:'手动指定', num1:'数字起卦1', num2:'数字起卦2', auto:'自动起卦' };

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

  // 解析区
  h += '<div class="analysis-card" id="analysisArea"></div>';

  return h;
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

// ===== 加载数据 =====
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
      var resp = await fetch('/api/mhys-records/'+id, { headers:headers });
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
        createdAt: result.createdAt ? (result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt) : (data.created_at || ''),
        method: result.method || ''
      };
      currentAiPayload = {
        numbers: result.numbers || '',
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
    var stored = localStorage.getItem('mhys_result') || sessionStorage.getItem('mhys_result');
    if (!stored) {
      area.innerHTML = '<div class="load-state"><p>没有排盘结果</p><a href="/mhys/" style="color:var(--accent);font-size:0.85rem;text-decoration:none;margin-top:0.5rem;display:inline-block">返回排盘</a></div>';
      return;
    }
    localStorage.removeItem('mhys_result');
    sessionStorage.removeItem('mhys_result');
    var result = JSON.parse(stored);
    currentResultMeta = {
      divinationTime: result.divinationTime || '',
      createdAt: result.createdAt || '',
      method: result.method || ''
    };
    currentAiPayload = {
      numbers: result.numbers || '',
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
    if (localStorage.getItem('mhys_anon_followup')) {
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
      localStorage.setItem('mhys_anon_followup', '1');
    }
  };

  var payload = buildMhysAiPayload();
  payload.followUp = q;
  payload.context = prevAnswer;
  xhr.send(JSON.stringify({
    message: q,
    cardType: 'mhys',
    cardData: payload
  }));
}

function showAIHome() {
  var resp = document.getElementById('aiResponse');
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = '☯ 自动解析';
  resp.className = 'ai-response show';

  // 未登录用户且已使用过解析次数 → 引导注册
  if (!AUTH.isLoggedIn() && localStorage.getItem('mhys_anon_used')) {
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
  if (!AUTH.isLoggedIn() && localStorage.getItem('mhys_anon_used')) {
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
        fetch('/api/mhys-records/'+currentRecordId+'/ai', {
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
          localStorage.setItem('mhys_anon_used', '1');
        }
      }
    };

    var payload = buildMhysAiPayload();
    xhr.send(JSON.stringify({
      message: currentTopic || '',
      cardType: 'mhys',
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


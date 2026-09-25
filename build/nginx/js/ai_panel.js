// AI 解析面板（那套浮层 DOM + 取流 + 追问）—— 梅花页与六爻页共用一份。
//
// 来源：2026-09-25 从 `js/mhys_ai_panel.js`（当日早些时候刚上线的版本）里
// 把**与页面无关的那部分**整段搬出，逻辑逐字未改，只是把原来直接读页面全局
// 变量的地方改成读 `window.AI_PANEL_CONF` 里的钩子。这样做是因为六爻页也要
// 同一套面板：若各抄一份，两份就会慢慢长得不一样 —— 用户看到的「自动解析」
// 会随页面而变，而没人说得清哪份是对的。
//
// 页面要给的只有 `window.AI_PANEL_CONF`（见下），引擎不认「梅花」「六爻」这些
// 字眼。所有字段**惰性读取**（每次用的时候现取），故 conf 可以在本文件之前或
// 之后定义，脚本顺序不影响。
//
//   window.AI_PANEL_CONF = {
//     cardType:      'mhys',                 // 发给 /api/chat/send 的 cardType
//     recordsPath:   '/api/mhys-records',    // 解析存回哪个记录
//     anonUsedKey:   'mhys_anon_used',       // 游客「已用过一次」的标记
//     anonFollowKey: 'mhys_anon_followup',   // 游客「已追问过一次」的标记
//     barBtnId:      'aiBarBtn',             // 表头那颗按钮（流结束后改它的状态）
//     noChartHint:   '先起一卦，再来看解析',   // 还没卦就点面板时说的话
//     hasChart:  function(){ return …; },    // 有没有卦可解（决定放不放行）
//     topic:     function(){ return …; },    // 求测事项（当 message 发给后端）
//     recordId:  function(){ return …; },    // 当前记录 id（存解析用）
//     payload:   function(){ return …; },    // cardData（各页自己拼）
//     saved:     function(){ return …; },    // 已保存的解析文本
//     setSaved:  function(v){ …; },          // 记下刚拿到的解析
//   };

var MH_AI_PANEL_HTML = `
<!-- AI 面板背景遮罩 -->
<div class="ai-panel-overlay" id="aiPanelOverlay"></div>

<!-- AI 面板 -->
<div class="ai-panel" id="aiPanel">
  <div class="ai-panel-header">
    <span>☯ 自动解析</span>
    <span class="ai-panel-close" onclick="closeAIPanel()">✕</span>
  </div>
  <div class="ai-panel-body" id="aiPanelBody">
    <div class="ai-response" id="aiResponse"></div>
    <div class="ai-followup-hist" id="aiFollowHist"></div>
    <div class="ai-followup-bar" id="aiFollowBar">
      <textarea class="ai-followup-input" id="aiFollowInput" placeholder="追问…" rows="2"></textarea>
      <div class="ai-followup-row">
        <button class="ai-followup-send" id="aiFollowBtn" onclick="sendFollowUp()">发送</button>
      </div>
    </div>
  </div>
</div>`;

(function mountAIPanel() {
  function mount() {
    if (document.getElementById('aiPanel')) return;
    var box = document.createElement('div');
    box.innerHTML = MH_AI_PANEL_HTML;
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();

// ===== AI 智能解析 =====
var aiStreamAbort = null;
var aiPanelOpen = false;

/** 取页面给的配置。缺字段一律回落到「不会崩」的默认值，便于单页试跑 */
function AIC() { return window.AI_PANEL_CONF || {}; }
function aiHasChart() { var c = AIC(); return c.hasChart ? !!c.hasChart() : true; }
function aiTopic() { var c = AIC(); return c.topic ? (c.topic() || '') : ''; }
function aiRecordId() { var c = AIC(); return c.recordId ? c.recordId() : null; }
function aiSaved() { var c = AIC(); return c.saved ? (c.saved() || '') : ''; }
function aiSetSaved(v) { var c = AIC(); if (c.setSaved) c.setSaved(v); }
function aiPayload() { var c = AIC(); return c.payload ? c.payload() : null; }

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
  var anonFollowKey = AIC().anonFollowKey || '';
  // 未登录用户可追问一次
  if (!AUTH.isLoggedIn()) {
    if (localStorage.getItem(anonFollowKey)) {
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

  var prevAnswer = aiSaved() || '';
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
    if (!AUTH.isLoggedIn() && anonFollowKey) {
      localStorage.setItem(anonFollowKey, '1');
    }
  };

  var payload = aiPayload();
  payload.followUp = q;
  payload.context = prevAnswer;
  xhr.send(JSON.stringify({
    message: q,
    cardType: AIC().cardType || '',
    cardData: payload
  }));
}

function showAIHome() {
  var resp = document.getElementById('aiResponse');
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = '☯ 自动解析';
  resp.className = 'ai-response show';

  var anonUsedKey = AIC().anonUsedKey || '';
  // 未登录用户且已使用过解析次数 → 引导注册
  if (!AUTH.isLoggedIn() && anonUsedKey && localStorage.getItem(anonUsedKey)) {
    showLoginPrompt(resp);
    return;
  }

  // 已有保存的解析 → 直接展示，并显示追问栏
  if (aiSaved()) {
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
  // 排盘页在起卦之前也能点开面板（表头那颗按钮），此时还没有卦可解 —— 说一句就回去
  if (!aiHasChart()) { showAIToast(AIC().noChartHint || '先起一卦，再来看解析'); return; }
  var anonUsedKey = AIC().anonUsedKey || '';
  if (!AUTH.isLoggedIn() && anonUsedKey && localStorage.getItem(anonUsedKey)) {
    var resp = document.getElementById('aiResponse');
    showLoginPrompt(resp);
    return;
  }
  if (aiSaved()) {
    showSavedAnalysis();
  } else {
    startAIStream();
  }
}

function showSavedAnalysis() {
  var resp = document.getElementById('aiResponse');
  resp.className = 'ai-response show';
  resp.innerHTML = '<div class="ai-result">'+renderMarkdown(aiSaved())+'</div>';
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
      var recId = aiRecordId();
      if (analysisText && recId) {
        fetch(AIC().recordsPath + '/' + recId + '/ai', {
          method:'PATCH',
          headers:headers,
          body:JSON.stringify({ analysis: analysisText })
        }).catch(function(){});
      }
      if (fullText) {
        var saved = analysisText || fullText;
        aiSetSaved(saved);
        var barBtn = document.getElementById(AIC().barBtnId || '');
        if (barBtn) barBtn.innerHTML = '<span class="ai-icon">☯</span><span>看不懂？试试自动解析</span>';
        var anonUsedKey = AIC().anonUsedKey || '';
        if (!AUTH.isLoggedIn() && anonUsedKey) {
          localStorage.setItem(anonUsedKey, '1');
        }
      }
    };

    var payload = aiPayload();
    xhr.send(JSON.stringify({
      message: aiTopic(),
      cardType: AIC().cardType || '',
      cardData: payload
    }));

  } catch (e) {
    if (e.name !== 'AbortError') {
      resp.innerHTML = '<div class="ai-error">❌ 解卦失败：'+escHtml(e.message)+'</div>';
    }
  }
}

// 结果出来后自动开始解读：面板直接打开，不等用户再点一次。
// 「已保存的解析」「游客免费次数用完要登录」都沿用 startButtonClicked() 的原判断 ——
// 自动打开只是替用户点了那一下，不绕过任何一关。
function autoStartAI() {
  if (!aiHasChart()) return false;
  aiPanelOpen = true;
  document.getElementById('aiPanel').classList.add('open');
  document.getElementById('aiPanelOverlay').classList.add('open');
  startButtonClicked();
  return true;
}

// overlay 点击关闭（用 JS 监听避免误触）—— 原来写在 result.html 的 checkBar 里，
// 搬到面板自己的文件里：面板在哪一页就在哪一页生效，不必每页各写一次。
(function bindOverlayClose() {
  function bind() {
    var overlay = document.getElementById('aiPanelOverlay');
    if (!overlay) { setTimeout(bind, 100); return; }
    if (overlay.dataset.bound) return;
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeAIPanel();
    });
  }
  if (document.body) bind();
  else document.addEventListener('DOMContentLoaded', bind);
})();

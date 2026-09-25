// 梅花 AI 面板：自动解读 + 追问 —— 由 mhys/result.html 整段搬出（2026-09-25）。
// result.html 与 index.html（原地出结果后自动开始解读）共用这一份，勿再抄一份。
//
// 本文件自己把面板的 DOM 挂到 body 上（下面那句 mountAIPanel），页面只要先备好
//   g / currentTopic / currentResultMeta / currentAiPayload / currentRecordId
// 然后调 autoStartAI()（结果出来就解读）或 toggleAIPanel()（用户自己点）即可。
var MHYS_AI_PANEL_HTML = `
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
    box.innerHTML = MHYS_AI_PANEL_HTML;
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();

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
  // 排盘页在起卦之前也能点开面板（表头那颗按钮），此时还没有卦可解 —— 说一句就回去
  if (typeof g === 'undefined' || !g) { showAIToast('先起一卦，再来看解析'); return; }
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

// 结果出来后自动开始解读：面板直接打开，不等用户再点一次。
// 「已保存的解析」「游客免费次数用完要登录」都沿用 startButtonClicked() 的原判断 ——
// 自动打开只是替用户点了那一下，不绕过任何一关。
function autoStartAI() {
  if (typeof g === 'undefined' || !g) return false;
  aiPanelOpen = true;
  document.getElementById('aiPanel').classList.add('open');
  document.getElementById('aiPanelOverlay').classList.add('open');
  startButtonClicked();
  return true;
}

// 阶段 4 cut-over：`auth-modal.css` 从「运行时插 <link>」改成静态 import。
// 原来那条 `link.href = '/css/auth-modal.css'` 依赖 publicDir，删掉 src/web 后必然 404。
import './authModal.css';

// 阶段 4 cut-over：由 `src/web/js/auth.js` 逐字搬来，只给顶层声明加了 `export `。
/* 易三千 — Auth (cookie版) */

export function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(^| )' + escaped + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name, value, maxAge) {
  document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + (maxAge || 86400);
}

export function removeCookie(name) {
  document.cookie = name + '=; path=/; max-age=0';
}

export const AUTH = {
  isLoggedIn() { try { return !!getCookie('sqw_username'); } catch(e) { return false; } },
  getToken()    { try { return getCookie('sqw_token'); }     catch(e) { return null; } },
  getUsername() { try { return getCookie('sqw_username'); }  catch(e) { return null; } },
};
window.AUTH = AUTH;

// ═══════════════════════════════════════════════
// 401 统一处理：清除错误内容 + 弹出登录窗口
// ═══════════════════════════════════════════════
// 用法：在 XHR onloadend 里调用 handleApiUnauthorized(xhr, el)
// 返回 true 表示已处理 401（调用方应直接 return）
export function handleApiUnauthorized(xhr, el) {
  if (!xhr || xhr.status !== 401) return false;
  // ⚠ 401 **不等于「过期」**：从没登录过的访客也是 401 —— `/api/chat/send` 对匿名
  // 一律拒（`auth-server.js`：`if (!username) return json(res, {error:'请先登录'}, 401)`）。
  // 原来一律写「登录已过期，请重新登录」，对首次到访的人是句假话；线上截图里
  // 它就挂在刚排完盘的盘面正中间（匿名访客排完盘 → 面板自动起 → 401 → 弹框）。
  var logged = false;
  try { logged = !!(window.AUTH && AUTH.isLoggedIn()); } catch (e) {}
  if (el) {
    el.innerHTML = '<div style="text-align:center;padding:1.5rem 1rem">' +
      '<div style="font-size:1.2rem;margin-bottom:0.5rem">🔒</div>' +
      '<div style="font-size:0.9rem;font-weight:600;color:var(--text);margin-bottom:0.3rem">'
        + (logged ? '登录已过期，请重新登录' : '登录后即可使用 AI 解析') + '</div>' +
      '<div style="font-size:0.75rem;color:var(--text-dim);line-height:1.7;margin-bottom:1rem">'
        + (logged ? '登录后即可使用全部 AI 功能' : 'AI 解卦需要登录后使用') + '</div>' +
      '<a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="ai-start-btn" style="display:inline-block;text-decoration:none">去登录</a>' +
      '</div>';
  }
  try { openAuthModal('login'); } catch(e) {}
  return true;
}
window.handleApiUnauthorized = handleApiUnauthorized;

// ═══════════════════════════════════════════════
// 嵌入式登录/注册弹窗
// ═══════════════════════════════════════════════

export var _authModalInjected = false;
export var _authSmsTimer = 0;
export var _authModalCssPromise = null;

// 样式随包进首屏，不再需要「等 CSS 加载完再显形」的 Promise。
// 保留函数名与 `_authModalCssPromise`，是因为 auth.js 内部与过渡期全局还在调它们
// （死期：阶段 5 清 installGlobals / window 复用时一起删）。
export function _ensureAuthModalCSS() {
  if (!_authModalCssPromise) _authModalCssPromise = Promise.resolve();
  return _authModalCssPromise;
}

export function _injectAuthModalCSS() {
  _ensureAuthModalCSS();
}

export function _injectAuthModalHTML() {
  if (document.getElementById('authModalOverlay')) return;
  _injectAuthModalCSS();

  var html = '';
  html += '<div class="auth-modal-overlay" id="authModalOverlay" hidden aria-hidden="true">';
  html += '  <div class="auth-modal-card" id="authModalCard">';
  html += '    <button class="auth-modal-close" onclick="hideAuthModal()">✕</button>';
  html += '    <div class="auth-modal-h1">易三千</div>';
  html += '    <div class="auth-modal-sub" id="authModalSub">登录以使用 AI 命理解读</div>';
  html += '    <div class="auth-modal-tabs">';
  html += '      <button class="auth-modal-tab active" data-tab="login" onclick="switchAuthTab(\'login\')">登录</button>';
  html += '      <button class="auth-modal-tab" data-tab="register" onclick="switchAuthTab(\'register\')">注册</button>';
  html += '    </div>';

  html += '    <div id="authModalLogin">';
  html += '      <div class="auth-modal-form">';
  html += '        <label>手机号</label>';
  html += '        <input type="tel" id="authPhoneLogin" placeholder="输入手机号" maxlength="11" autocomplete="tel">';
  html += '        <label>密码</label>';
  html += '        <input type="password" id="authPwLogin" placeholder="输入密码" autocomplete="current-password">';
  html += '        <p class="auth-modal-error" id="authLoginError"></p>';
  html += '        <button type="button" class="auth-modal-btn" id="authLoginBtn" onclick="submitAuthLogin()">登录</button>';
  html += '      </div>';
  html += '      <div class="auth-modal-link">';
  html += '        <a onclick="switchAuthTab(\'register\')">还没有账号？去注册</a>';
  html += '        <span style="color:#ddd;margin:0 0.3rem">·</span>';
  html += '        <a href="/forgot-password/">忘记密码？</a>';
  html += '      </div>';
  html += '    </div>';

  html += '    <div id="authModalRegister" style="display:none">';
  html += '      <div class="auth-modal-form">';
  html += '        <label>手机号</label>';
  html += '        <input type="tel" id="authPhoneReg" placeholder="输入手机号" maxlength="11" autocomplete="tel">';
  html += '        <label>验证码</label>';
  html += '        <div class="auth-modal-sms-row">';
  html += '          <input type="text" id="authSmsCode" placeholder="短信验证码" maxlength="6" autocomplete="one-time-code">';
  html += '          <button type="button" class="auth-modal-sms-btn" id="authSendSmsBtn" onclick="submitAuthSms()">获取验证码</button>';
  html += '        </div>';
  html += '        <label>密码</label>';
  html += '        <input type="password" id="authPwReg" placeholder="至少 6 位密码" autocomplete="new-password">';
  html += '        <label>确认密码</label>';
  html += '        <input type="password" id="authPwConfirm" placeholder="再次输入密码" autocomplete="new-password">';
  html += '        <p class="auth-modal-error" id="authRegError"></p>';
  html += '        <button type="button" class="auth-modal-btn" id="authRegBtn" onclick="submitAuthRegister()">注册</button>';
  html += '      </div>';
  html += '      <div class="auth-modal-link">';
  html += '        <a onclick="switchAuthTab(\'login\')">已有账号？去登录</a>';
  html += '      </div>';
  html += '    </div>';

  html += '  </div>';
  html += '</div>';

  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstElementChild);

  document.addEventListener('keydown', function _authEsc(e) {
    if (e.key === 'Escape') hideAuthModal();
  });

  document.getElementById('authModalOverlay').addEventListener('click', function(e) {
    if (e.target === this) hideAuthModal();
  });

  document.getElementById('authPhoneLogin').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitAuthLogin();
  });
  document.getElementById('authPwLogin').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitAuthLogin();
  });
  document.getElementById('authPhoneReg').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('authSmsCode').focus();
  });
  document.getElementById('authSmsCode').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('authPwReg').focus();
  });
  document.getElementById('authPwReg').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('authPwConfirm').focus();
  });
  document.getElementById('authPwConfirm').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitAuthRegister();
  });
}

export function openAuthModal(tab) {
  tab = tab === 'register' ? 'register' : 'login';
  try {
    _injectAuthModalHTML();
    _ensureAuthModalCSS().then(function() {
      var overlay = document.getElementById('authModalOverlay');
      if (!overlay) {
        window.location.href = tab === 'register' ? '/register/' : '/login/';
        return;
      }
      switchAuthTab(tab);
      overlay.hidden = false;
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      setTimeout(function() {
        var phoneInput = document.getElementById(tab === 'register' ? 'authPhoneReg' : 'authPhoneLogin');
        if (phoneInput) phoneInput.focus();
      }, 0);
    });
  } catch(e) {
    window.location.href = tab === 'register' ? '/register/' : '/login/';
  }
}
window.openAuthModal = openAuthModal;

export function showAuthModal() { openAuthModal('login'); }
window.showAuthModal = showAuthModal;

export function showRegisterModal() { openAuthModal('register'); }
window.showRegisterModal = showRegisterModal;

window.getCookie = getCookie;
window.setCookie = setCookie;
window.removeCookie = removeCookie;

export function hideAuthModal() {
  try {
    var overlay = document.getElementById('authModalOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.hidden = true;
    }
    document.body.style.overflow = '';
  } catch(e) {}
}
window.hideAuthModal = hideAuthModal;


/* 切换 Tab */
export function switchAuthTab(tab) {
  var tabs = document.querySelectorAll('.auth-modal-tab');
  tabs.forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  document.getElementById('authModalLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('authModalRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authModalSub').textContent =
    tab === 'login' ? '登录以使用 AI 命理解读' : '注册账号，开启 AI 命理解读';
  // 清除错误
  document.getElementById('authLoginError').textContent = '';
  document.getElementById('authRegError').textContent = '';
}

/* ===== 登录提交 ===== */
export function submitAuthLogin() {
  var btn = document.getElementById('authLoginBtn');
  var err = document.getElementById('authLoginError');
  var phone = document.getElementById('authPhoneLogin').value.trim();
  var pw = document.getElementById('authPwLogin').value;

  if (!phone || !pw) { err.textContent = '请输入手机号和密码'; return; }
  btn.disabled = true; btn.textContent = '登录中…'; err.textContent = '';

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone, password: pw }),
  })
  .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    document.cookie = 'sqw_token=' + encodeURIComponent(r.data.token) + '; path=/; max-age=86400';
    document.cookie = 'sqw_username=' + encodeURIComponent(r.data.username) + '; path=/; max-age=86400';
    hideAuthModal();
    location.reload();
  })
  .catch(function(e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = '登录';
  });
}

/* ===== 发送验证码 ===== */
export function submitAuthSms() {
  var phone = document.getElementById('authPhoneReg').value.trim();
  var err = document.getElementById('authRegError');
  var btn = document.getElementById('authSendSmsBtn');

  if (!phone || !/^1\d{10}$/.test(phone)) {
    err.textContent = '请输入正确的手机号';
    return;
  }
  if (_authSmsTimer > 0) return;

  err.textContent = '';
  btn.disabled = true;
  btn.textContent = '发送中…';

  fetch('/api/send-sms-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone }),
  })
  .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
  .then(function(r) {
    if (!r.ok) {
      err.textContent = r.data.error;
      btn.disabled = false;
      btn.textContent = '获取验证码';
      if (r.data.cooldown) _startAuthSmsCooldown(r.data.cooldown);
      return;
    }
    _startAuthSmsCooldown(60);
  })
  .catch(function() {
    err.textContent = '网络异常，请重试';
    btn.disabled = false;
    btn.textContent = '获取验证码';
  });
}

export function _startAuthSmsCooldown(sec) {
  _authSmsTimer = sec;
  var btn = document.getElementById('authSendSmsBtn');
  btn.disabled = true;
  function tick() {
    if (_authSmsTimer <= 0) {
      btn.textContent = '获取验证码';
      btn.disabled = false;
      return;
    }
    btn.textContent = _authSmsTimer + 's 后重发';
    _authSmsTimer--;
    setTimeout(tick, 1000);
  }
  tick();
}

/* ===== 注册提交 ===== */
export function submitAuthRegister() {
  var btn = document.getElementById('authRegBtn');
  var err = document.getElementById('authRegError');
  var phone = document.getElementById('authPhoneReg').value.trim();
  var code = document.getElementById('authSmsCode').value.trim();
  var pw = document.getElementById('authPwReg').value;
  var cpw = document.getElementById('authPwConfirm').value;

  if (!phone) { err.textContent = '请输入手机号'; return; }
  if (!code) { err.textContent = '请输入短信验证码'; return; }
  if (pw.length < 6) { err.textContent = '密码至少需要 6 位'; return; }
  if (pw !== cpw) { err.textContent = '两次密码不一致'; return; }

  btn.disabled = true; btn.textContent = '注册中…'; err.textContent = '';

  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone, code: code, password: pw }),
  })
  .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
  .then(function(r) {
    if (!r.ok) throw new Error(r.data.error);
    document.cookie = 'sqw_token=' + encodeURIComponent(r.data.token) + '; path=/; max-age=86400';
    document.cookie = 'sqw_username=' + encodeURIComponent(r.data.username) + '; path=/; max-age=86400';
    hideAuthModal();
    location.reload();
  })
  .catch(function(e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = '注册';
  });
}

// 阶段 4：模块 A 的 state 由模块 B 写入，ESM 的 import 绑定不可赋值，所以给写方一对 setter。

// ── 阶段 4 桥：本模块生成的 HTML 里还是内联 `onclick="xxx()"`，这些名字必须是全局 ──
// `src/web/js/*.js` 是 classic script，顶层函数自动挂 window；搬成 ESM 之后不挂了，
// 内联处理器会抛 `xxx is not defined`（面板按钮点了没反应、控制台一条 pageerror）。
// 死期：阶段 5 把这批 HTML 换成真实事件监听，与 installGlobals 一起删。
if (typeof window !== 'undefined') {
  window.hideAuthModal = hideAuthModal;
  window.openAuthModal = openAuthModal;
  window.submitAuthLogin = submitAuthLogin;
  window.submitAuthRegister = submitAuthRegister;
  window.submitAuthSms = submitAuthSms;
  window.switchAuthTab = switchAuthTab;
}

if (AUTH.isLoggedIn()) { window.location.href = '/'; }

// 发送验证码
var smsTimer = 0;
async function sendSms() {
  var phone = document.getElementById('phone').value.trim();
  var err = document.getElementById('resetError');
  var btn = document.getElementById('sendSmsBtn');

  if (!phone || !/^1\d{10}$/.test(phone)) {
    err.textContent = '请输入正确的手机号';
    return;
  }
  if (smsTimer > 0) return;

  err.textContent = '';
  btn.disabled = true;
  btn.textContent = '发送中…';

  try {
    var res = await fetch('/api/send-sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone }),
    });
    var data = await res.json();
    if (!res.ok) {
      err.textContent = data.error;
      btn.disabled = false;
      btn.textContent = '获取验证码';
      if (data.cooldown) startCooldown(data.cooldown);
      return;
    }
    startCooldown(60);
  } catch (e) {
    err.textContent = '网络异常，请重试';
    btn.disabled = false;
    btn.textContent = '获取验证码';
  }
}

function startCooldown(sec) {
  smsTimer = sec;
  var btn = document.getElementById('sendSmsBtn');
  btn.disabled = true;
  function tick() {
    if (smsTimer <= 0) {
      btn.textContent = '获取验证码';
      btn.disabled = false;
      return;
    }
    btn.textContent = smsTimer + 's 后重发';
    smsTimer--;
    setTimeout(tick, 1000);
  }
  tick();
}

document.getElementById('resetForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = this.querySelector('button[type=submit]');
  var err = document.getElementById('resetError');
  var phone = document.getElementById('phone').value.trim();
  var code = document.getElementById('smsCode').value.trim();
  var pw = document.getElementById('password').value;

  if (!phone) { err.textContent = '请输入手机号'; return; }
  if (!code) { err.textContent = '请输入短信验证码'; return; }
  if (pw.length < 6) { err.textContent = '密码至少需要 6 位'; return; }

  btn.disabled = true; btn.textContent = '重置中…'; err.textContent = '';

  try {
    var res = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, code: code, newPassword: pw }),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert('密码重置成功，请重新登录');
    window.location.href = '/login/';
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = '重置密码';
  }
});

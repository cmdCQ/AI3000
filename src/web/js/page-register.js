if (AUTH.isLoggedIn()) { window.location.href = '/'; }

// 发送验证码
var smsTimer = 0;
async function sendSms() {
  var phone = document.getElementById('phone').value.trim();
  var err = document.getElementById('registerError');
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

document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = this.querySelector('button[type=submit]');
  var err = document.getElementById('registerError');
  var phone = document.getElementById('phone').value.trim();
  var code = document.getElementById('smsCode').value.trim();
  var pw = document.getElementById('password').value;
  var cpw = document.getElementById('confirm').value;

  if (!phone) { err.textContent = '请输入手机号'; return; }
  if (!code) { err.textContent = '请输入短信验证码'; return; }
  if (pw.length < 6) { err.textContent = '密码至少需要 6 位'; return; }
  if (pw !== cpw) { err.textContent = '两次密码不一致'; return; }

  btn.disabled = true; btn.textContent = '注册中…'; err.textContent = '';

  try {
    var res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, code: code, password: pw }),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.cookie = 'sqw_token=' + encodeURIComponent(data.token) + '; path=/; max-age=86400';
    document.cookie = 'sqw_username=' + encodeURIComponent(data.username) + '; path=/; max-age=86400';
    window.location.href = '/';
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = '注册';
  }
});

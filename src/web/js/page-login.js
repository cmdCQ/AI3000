if (AUTH.isLoggedIn()) { window.location.href = '/'; }

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var btn = this.querySelector('button');
  var err = document.getElementById('loginError');
  var phone = document.getElementById('phone').value.trim();
  var pw = document.getElementById('password').value;

  if (!phone || !pw) { err.textContent = '请输入手机号和密码'; return; }
  btn.disabled = true; btn.textContent = '登录中…'; err.textContent = '';

  try {
    var res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone, password: pw }),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.cookie = 'sqw_token=' + encodeURIComponent(data.token) + '; path=/; max-age=86400';
    document.cookie = 'sqw_username=' + encodeURIComponent(data.username) + '; path=/; max-age=86400';
    window.location.href = '/';
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = '登录';
  }
});

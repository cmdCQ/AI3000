(function() {
  'use strict';

  function getUser() {
    var m = document.cookie.match(new RegExp('(^| )sqw_username=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  window.loadMain = function() {
    var u = getUser();
    var el = document.getElementById('myContent');

    if (!u) {
      el.innerHTML =
        '<div class="my-guest">' +
          '<div class="guest-icon">👤</div>' +
          '<p class="guest-title">登录账号</p>' +
          '<p class="guest-desc">登录后使用全部功能</p>' +
          '<div class="guest-btns">' +
            '<a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="guest-btn primary">去登录</a>' +
            '<a href="javascript:void(0)" onclick="openAuthModal(\'register\')" class="guest-btn secondary">注册</a>' +
          '</div>' +
        '</div>';
      return;
    }

    window.loadTokenUsage(function(data) {
      if (!data) {
        el.innerHTML =
          '<div class="my-card" style="border-left-color:#bbb">' +
            '<div class="my-card-title">👤 ' + esc(u) + '</div>' +
            '<div class="my-card-body"><div style="font-size:0.75rem;color:#999;padding:0.3rem 0">加载失败</div></div>' +
          '</div>' +
          '<div class="my-card clickable" onclick="goSettings()">' +
            '<div class="my-card-row">⚙️ 设置<span class="arrow">›</span></div>' +
          '</div>';
        return;
      }

      var tierNames = { 0:'普通用户', 1:'普通会员', 2:'SVIP' };
      var tier = data.tier || 0;
      var tierName = tierNames[tier] || '普通用户';
      var tokenUsed = data.tokenUsed;
      var tokenLimit = data.tokenLimit;

      // 融合卡片：账户+等级+用量 在一张卡里
      var limitText = tokenLimit === null ? '无限' : tokenLimit.toLocaleString();
      var isUnlimited = tokenLimit === null;
      var pct = isUnlimited ? 100 : Math.min(100, (tokenUsed / tokenLimit * 100));
      var barColor = isUnlimited ? '#d4c9b0' : 'var(--gold)';
      var progressHtml =
        '<div style="margin-top:0.5rem;height:5px;background:#eee;border-radius:3px;overflow:hidden">' +
          '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:3px;transition:width 0.4s"></div>' +
        '</div>' +
        '<div style="font-size:0.68rem;color:#999;text-align:right;margin-top:0.15rem">' + (isUnlimited ? '∞' : pct.toFixed(1) + '%') + '</div>';
      var showLimitText = isUnlimited ? '（无限）' : 'Token 用量';
      var remainCount = isUnlimited ? null : Math.floor((tokenLimit - tokenUsed) / 1500);

      el.innerHTML =
        '<div class="my-card" style="border-left-color:' + (tier === 2 ? 'var(--gold)' : tier === 1 ? 'var(--text-muted)' : 'var(--text-muted)') + '">' +
          '<div class="my-card-body" style="gap:0.3rem">' +
            '<div style="display:flex;align-items:center;justify-content:space-between">' +
              '<span style="font-family:"Noto Serif SC",serif;font-size:0.88rem;font-weight:600;color:#1a1a1a">' + esc(u) + '</span>' +
              '<span style="font-size:0.68rem;padding:0.12rem 0.5rem;border-radius:8px;background:' + (tier === 2 ? 'var(--gold-wash)' : 'var(--bg-sunken)') + ';color:' + (tier === 2 ? 'var(--gold)' : 'var(--text-dim)') + ';font-weight:500">' + tierName + '</span>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.15rem">' +
              '<span style="font-size:0.72rem;color:#999">AI 解析用量</span>' +
              '<span style="font-size:0.78rem;color:#1a1a1a">' + tokenUsed.toLocaleString() + '</span>' +
              '<span style="font-size:0.72rem;color:#bbb">/</span>' +
              '<span style="font-size:0.78rem;color:#1a1a1a">' + limitText + '</span>' +
            '</div>' +
            progressHtml +
            '<div style="font-size:0.65rem;color:#bbb;margin-top:0.1rem">' + showLimitText + '</div>' +
            (remainCount !== null ? '<div style="font-size:0.65rem;color:#bbb;margin-top:0.05rem">剩余AI解析次数还剩约 ' + remainCount.toLocaleString() + ' 次</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="my-card clickable" onclick="goSettings()">' +
          '<div class="my-card-row">⚙️ 设置<span class="arrow">›</span></div>' +
        '</div>';
    });
  };

  window.loadTokenUsage = function(cb) {
    var token = window.getToken();
    if (!token) { cb(null); return; }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/user/tokens');
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    xhr.onload = function() {
      try {
        var data = JSON.parse(xhr.responseText);
        if (data.tokenUsed !== undefined) {
          cb({ tokenUsed: data.tokenUsed, tokenLimit: data.tokenLimit, tier: data.tier || 0 });
        } else {
          cb(null);
        }
      } catch(e) { cb(null); }
    };
    xhr.onerror = function() { cb(null); };
    xhr.send();
  };

  window.getToken = function() {
    var m = document.cookie.match(new RegExp('(^| )sqw_token=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  };

  window.goSettings = function() {
    var el = document.getElementById('myContent');
    el.innerHTML =
      '<a href="#" class="my-back-link" onclick="window.loadMain();return false">← 返回</a>' +
      '<div class="my-card" style="margin-top:0">' +
        '<div class="my-card-title">⚙️ 设置</div>' +
      '</div>' +
      '<div class="my-card danger" onclick="doLogout()">' +
        '<div class="my-card-row">退出账号<span class="arrow">›</span></div>' +
      '</div>';
  };

  window.doLogout = function() {
    if (confirm('确定退出登录吗？')) {
      document.cookie = 'sqw_token=; path=/; max-age=0';
      document.cookie = 'sqw_username=; path=/; max-age=0';
      window.location.href = '/';
    }
  };

  window.loadMain();
})();

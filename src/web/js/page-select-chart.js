(function() {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var type = params.get('type') || 'charts';

  var labels = { charts: '📜 四柱八字', ziwei: '🔮 紫微斗数', meihua: '🌸 梅花易数' };
  var info = labels[type] || '📜 四柱八字';

  document.querySelector('.icon').textContent = info.split(' ')[0];
  document.querySelector('.name').textContent = info.split(' ').slice(1).join(' ');

  document.getElementById('create-link').href = '/charts/?action=create&from=' + type;

  if (!AUTH.isLoggedIn()) {
    document.getElementById('content-area').innerHTML =
      '<div class="empty-state">' +
        '<div class="es-icon">🔒</div>' +
        '<p class="es-title">登录后使用</p>' +
        '<p class="es-desc">保存多份命盘，随时查看排盘</p>' +
      '</div>' +
      '<a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="add-btn">登录</a>' +
      '<p class="auth-link" style="margin-top:0.6rem"><a href="javascript:void(0)" onclick="openAuthModal(\'register\')">注册</a></p>';
    return;
  }

  (async function() {
    var content = document.getElementById('content-area');
    var charts;

    try {
      charts = await ChartsStore.getAll();
    } catch(e) {
      content.innerHTML =
        '<div class="empty-state">' +
          '<p class="es-desc" style="color:#c55">加载失败，请稍后重试</p>' +
        '</div>';
      return;
    }

    if (!charts || !charts.length) {
      content.innerHTML =
        '<div class="empty-state">' +
          '<div class="es-icon">📜</div>' +
          '<p class="es-title">还没有命盘</p>' +
          '<p class="es-desc">新建一份命盘，即可开始' + (type === 'ziwei' ? '紫微斗数' : type === 'meihua' ? '梅花易数' : '四柱八字') + '排盘</p>' +
        '</div>' +
        '<a href="/charts/?action=create&from=' + type + '" class="add-btn">＋ 新建命盘</a>';
      return;
    }

    var SHICHEN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    var ZODIAC_EMOJI = ['🐀','🐂','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'];

    var h = '<div class="chart-list">';
    for (var i = 0; i < charts.length; i++) {
      var x = charts[i];
      var zIdx = (x.birth.year - 4) % 12;
      if (zIdx < 0) zIdx += 12;
      var zodiacEmoji = ZODIAC_EMOJI[zIdx];
      var genderLabel = x.gender === 'male' ? '男' : '女';
      var scIdx = Math.floor(((x.birth.hour ?? 12) + 1) % 24 / 2);
      var dateStr = x.birth.year + '.' + pad(x.birth.month) + '.' + pad(x.birth.day);
      var createStr = x.createdAt ? formatDate(x.createdAt) : '';
      var detailUrl = '/my-charts/?id=' + x.id;

      var baziShort = '';
      if (x.bazi) {
        var bp = x.bazi.split(' ');
        if (bp.length >= 3) baziShort = bp[2];
      }

      h +=
        '<div class="mc-card" onclick="location.href=\'' + detailUrl + '\'">' +
          '<div class="card-zodiac">' + zodiacEmoji + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + esc(x.name) +
              (baziShort ? ' <span style="font-size:0.75rem;color:#9a8b7a;font-weight:400">' + baziShort + '</span>' : '') +
            '</div>' +
            '<div class="card-info">' +
              '<span>' + genderLabel + '</span>' +
              '<span>' + dateStr + '</span>' +
              '<span>' + SHICHEN[scIdx] + '时</span>';
      if (createStr) h += '<span>创建于 ' + createStr + '</span>';
      h += '</div>' +
          '</div>' +
          '<div class="card-arrow">›</div>' +
        '</div>';
    }
    h += '</div>';

    content.innerHTML = h;
  })();

  function pad(n) { return String(n).padStart(2, '0'); }
  function formatDate(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
})();

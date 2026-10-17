// 「我的」页（`/my/`）—— 阶段 3 第 8 页。
// 逻辑逐字搬运自 `src/web/js/page-my.js`（135 行，冻结快照
// `duipan/legacy_ref/page-my.js`，sha256 21123b04…）。
// ==========================================================================
//
// ★ 这里没有第二个 cookie 解析器
// ─────────────────────────────────────────────────────────────
// 老页面**没有引 `auth.js`**（`src/web/my/index.html` 只有一条
// `<script src="/js/page-my.js">`），所以它自己写了 `getUser()` 与 `getToken()`
// 两个正则去读 `sqw_username` / `sqw_token`。
//
// 新页要引 `auth.js`（理由见下），那两份就是纯重复 —— 读的是 `../lib/auth.js`
// 里同语义的那两个（正则的形状也一样：(^| )<name>=([^;]+) 再 decodeURIComponent）。
// 少一份手写解析器，就少一处「两份慢慢长歪」的地方。
//
// ★ 顺手修掉一个线上真实的死按钮
// ─────────────────────────────────────────────────────────────
// 游客态那张卡里有两颗按钮：
//     <a onclick="openAuthModal('login')">去登录</a>
//     <a onclick="openAuthModal('register')">注册</a>
// 而 `openAuthModal` 只在 `src/web/js/auth.js:183` 定义、`:206` 挂到 window。
// 老 `/my/` **没引 auth.js**，所以这两颗按钮点了没有任何反应 —— 不会白屏、不会有
// 可见错误，控制台只有一行 `openAuthModal is not defined`。
//
// 这正是 mhys/liuyao 那几页反复踩过的同一种坑：**行内 onclick 的名字没人挂，
// 症状是「点了没反应」而不是抛错**（`duipan/drive_liuyao_page.js` 的 ⑥bis 就是
// 为它加的）。所以新页的 `index.html` 引上 `/js/auth.js`。
//
// 这条属于「搬迁时发现的老缺陷」，不是行为变更：按钮在旧行为里**本来就该**弹
// 登录框。drivers 会把这两颗按钮焊进判据里。

import { getUsername as getUser, getToken } from '../lib/auth.js'

// 老页的 `esc()` 逐字保留。与 page-home / page-select-chart / bazi_render /
// admin 里那几份是同一段代码 —— 共用一个 `esc` 属于共享层收口（§4.18），
// 不在这一页里先造一个小号共享件。
export function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function loadMain() {
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

  loadTokenUsage(function(data) {
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
}

// 老页用 XHR 而不是 fetch —— 照搬。它没设 `Content-Type`，也没有重试/超时；
// 换成 fetch 只是换了个写法，判据（「拿 token 取 /api/user/tokens，成功给数据、
// 任何失败给 null」）一条都不会因此变强。
export function loadTokenUsage(cb) {
  var token = getToken();
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
}

export function goSettings() {
  var el = document.getElementById('myContent');
  el.innerHTML =
    '<a href="#" class="my-back-link" onclick="window.loadMain();return false">← 返回</a>' +
    '<div class="my-card" style="margin-top:0">' +
      '<div class="my-card-title">⚙️ 设置</div>' +
    '</div>' +
    '<div class="my-card danger" onclick="doLogout()">' +
      '<div class="my-card-row">退出账号<span class="arrow">›</span></div>' +
    '</div>';
}

export function doLogout() {
  if (confirm('确定退出登录吗？')) {
    document.cookie = 'sqw_token=; path=/; max-age=0';
    document.cookie = 'sqw_username=; path=/; max-age=0';
    window.location.href = '/';
  }
}

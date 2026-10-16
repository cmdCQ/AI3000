(function(){
  var M=document.getElementById('tab-modules');
  var C=document.getElementById('tab-charts');
  var P=document.getElementById('tab-profile');
  var N=document.querySelectorAll('.nav-item');
  var T='modules';

  function getUser(){ var m=document.cookie.match(new RegExp('(^| )sqw_username=([^;]+)')); return m?decodeURIComponent(m[2]):null; }

  function show(n){
    M.style.display=n==='modules'?'block':'none';
    C.style.display='none';
    P.style.display=n==='profile'?'block':'none';
  }

  async function go(n){
    if(n===T)return;T=n;show(n);
    N.forEach(function(b){b.classList.toggle('active',b.dataset.tab===n);});
    if(n==='profile')loadProfile();
  }

  N.forEach(function(b){b.addEventListener('click',function(){go(b.dataset.tab);});});

  // 模块卡片点击：统一跳转到命盘选择页
  window.handleModuleClick = async function(type) {
    // 梅花易数无需登录即可使用
    if (type === 'meihua') { window.location.href = '/mhys/'; return; }
    if (type === 'liuyao') { window.location.href = '/liuyao/'; return; }
    try {
      if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) { openAuthModal('login'); return; }
    } catch(e) { openAuthModal('login'); return; }
    window.location.href = '/select-chart/?type=' + type;
  };

  // 命盘管理已迁至独立页面 /my-charts/

  function loadProfile(){
    var el=document.getElementById('tab-profile-content');
    var u=getUser();
    if(!u){
      el.innerHTML='<div class="charts-guest"><div class="cg-icon">👤</div><p class="cg-title">登录账号</p><p class="cg-desc">登录后使用全部功能</p><div class="cg-btns"><a href="javascript:void(0)" onclick="openAuthModal(\'login\')" class="cg-btn cg-login">去登录</a><a href="javascript:void(0)" onclick="openAuthModal(\'register\')" class="cg-btn cg-register">注册</a></div></div>';
      return;
    }
    el.innerHTML='<div class="card"><h3 class="card-title">👤 账户信息</h3><div class="info-row"><span class="info-label">手机号</span><span>'+esc(u)+'</span></div></div><div class="card" style="cursor:pointer" onclick="goSettings()"><div class="info-row"><span>⚙️ 设置</span><span style="margin-left:auto;color:var(--text-muted)">›</span></div></div>';
  }

  window.goSettings=function(){
    var el=document.getElementById('tab-profile-content');
    el.innerHTML='<div style="padding:0.5rem 0"><a class="back-link" href="#" onclick="goBackProfile();return false">← 返回</a></div><div class="card" style="margin-top:0.5rem"><h3 class="card-title">⚙️ 设置</h3></div><div class="card" style="cursor:pointer;color:#b85a5a" onclick="doLogout()"><div class="info-row"><span>退出账号</span><span style="margin-left:auto;color:var(--text-muted)">›</span></div></div>';
  };

  window.goBackProfile=function(){loadProfile();};

  window.doLogout=function(){
    if(confirm('确定退出登录吗？')){
      document.cookie='sqw_token=; path=/; max-age=0';
      document.cookie='sqw_username=; path=/; max-age=0';
      window.location.href='/';
    }
  };

  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

  // 建议入口：未登录跳登录，已登录跳建议页
  window.handleSuggestionClick = function() {
    try {
      var isLoggedIn = !!(typeof getCookie === 'function' && getCookie('sqw_username'));
      if (isLoggedIn) { window.location.href = '/suggestion/'; }
      else { openAuthModal('login'); }
    } catch(e) { openAuthModal('login'); }
    return false;
  };

  // URL参数检测
  var tabParam = new URLSearchParams(window.location.search).get('tab');
  if (tabParam === 'charts') {
    window.location.href = '/my-charts/';
  }

  // ===== Uptime 计时器=====
  (function() {
    var LAUNCH = new Date('2026-06-06T00:00:00+08:00').getTime();
    function updateUptime() {
      var now = Date.now();
      var diff = Math.max(0, now - LAUNCH);
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var el = document.getElementById('uptimeTimer');
      if (el) el.textContent = d + 'D ' + h + 'H ' + m + 'M ' + s + 'S';
    }
    updateUptime();
    setInterval(updateUptime, 1000);
  })();

  // ===== AI 对话弹窗 =====
  window.openChatOverlay = function() {
    // 防御：如果 AUTH 未加载，直接弹登录
    try {
      if (typeof AUTH === 'undefined' || !AUTH.isLoggedIn()) { openAuthModal('login'); return; }
    } catch(e) { openAuthModal('login'); return; }
    var overlay = document.getElementById('chatOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  function closeChatOverlay() {
    var overlay = document.getElementById('chatOverlay');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // 监听 iframe 内传来的关闭事件
  window.addEventListener('closeChatOverlay', closeChatOverlay);

  // ESC 键关闭
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var annOverlay = document.getElementById('announcementOverlay');
      if (annOverlay && annOverlay.classList.contains('open')) {
        closeAnnouncement();
      } else {
        closeChatOverlay();
      }
    }
  });

  // 点击遮罩背景关闭（点击内部不会触发）
  document.getElementById('chatOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeChatOverlay();
  });

  // 如果直接访问 /ai-chat/ 路由则正常显示页面
  if (window.location.pathname === '/ai-chat/' || window.location.pathname === '/ai-chat') {
    // 直接访问独立路由，不做弹窗处理
  }

  // ===== 公告弹窗 =====
  var ANNOUNCEMENT_MD = '';  // 从后端同步

  var FALLBACK_MD =
    '# 欢迎来到易三千 🎉\n\n' +
    '易三千 AI 命理平台已正式上线，融合传统命理与现代人工智能，为你提供专业的命理解读服务。\n\n' +
    '## 🌟 已上线功能\n\n' +
    '- **八字命盘** — 创建与管理个人命盘，支持公历/农历\n' +
    '- **梅花易数** — 年月日时起卦，万物类象\n' +
    '- **六爻** — 铜钱起卦，六十四卦详断\n' +
    '- **六十四卦** — 卦辞、爻辞、象传详解\n' +
    '- **AI 对话** — DeepSeek 大模型实时解卦，SSE 流式输出\n\n' +
    '## 🚀 即将上线\n\n' +
    '- **紫微斗数** — 十四主星 · 十二宫 · 四化飞星\n' +
    '- **奇门遁甲** — 九宫 · 八门 · 九星 · 八神\n\n' +
    '---\n\n' +
    '感谢您的支持与信赖。如有建议，欢迎点击下方「我们需要你宝贵的建议」反馈。\n\n' +
    '> 问天 · 问命 · 问心';

  function getAnnouncementContent(data) {
    if (data && data.content && data.content.length > 10) {
      return data.content;
    }
    return FALLBACK_MD;
  }

  // 从公告内容中提取滚动条摘要（标题 + 第一段正文，或取前几个有意义的句子）
  function extractMarqueeText(md) {
    var lines = (md || '').split('\n');
    var parts = [];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      // 跳过空行、分隔线、纯标题行（后面单独取）
      if (!raw.trim() || raw.trim() === '---') continue;
      // 去掉行内 markdown 标记：标题 #、粗体 **、链接
      var t = raw.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      if (!t) continue;
      // 跳过明显是章节标题的行（长度太短的全角标题头）
      if (t.length <= 8 && !/[，。！？]/.test(t)) {
        // 太短且无标点，可能是章节标题，先收集供后面决定
        if (parts.length === 0) parts.push(t); // 第一行标题保留
        continue;
      }
      parts.push(t);
      if (parts.length >= 3) break;
    }
    if (parts.length === 0) return '欢迎来到易三千 · 点击查看公告详情';
    return parts.join(' · ');
  }

  // 页面加载时预取公告内容
  (function prefetchAnnouncement() {
    fetch('/api/announcement')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        ANNOUNCEMENT_MD = getAnnouncementContent(data);
        // 更新滚动条文字
        var track = document.getElementById('announcementTrack');
        if (track) track.textContent = extractMarqueeText(ANNOUNCEMENT_MD);
        // 内容就绪后检查是否需要自动弹窗
        tryAutoShow();
      })
      .catch(function() { /* 静默失败，点击时重试 */ });
  })();

  // ===== 24h 自动弹窗逻辑 =====
  var COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 小时

  function tryAutoShow() {
    // 检测是否刚从非登录态变为登录态（用 localStorage 持久化，跨会话保持）
    var currentUser = getUser(); // cookie sqw_username
    var lastKnownUser = '';
    try { lastKnownUser = localStorage.getItem('ann_last_user') || ''; } catch(e) {}
    var isNewLogin = !!(currentUser && currentUser !== lastKnownUser);

    // 更新记录
    try { if (currentUser) localStorage.setItem('ann_last_user', currentUser); } catch(e) {}

    // 决定是否自动弹出
    var shouldShow = false;
    var storageKey = currentUser ? 'ann_login_shown' : 'ann_guest_shown';

    if (isNewLogin) {
      // 刚登录，一定弹
      shouldShow = true;
      // 同时清理旧的登录记录，写入新的
      try { localStorage.setItem('ann_login_shown', Date.now()); } catch(e) {}
    } else {
      // 正常访问：检查 24h 冷却
      var lastShown = 0;
      try { lastShown = parseInt(localStorage.getItem(storageKey) || '0', 10); } catch(e) {}
      if (!lastShown || (Date.now() - lastShown) > COOLDOWN_MS) {
        shouldShow = true;
        try { localStorage.setItem(storageKey, Date.now()); } catch(e) {}
      }
    }

    if (shouldShow && ANNOUNCEMENT_MD) {
      openAnnouncement();
    }
  }

  window.openAnnouncement = function() {
    var overlay = document.getElementById('announcementOverlay');
    var body = document.getElementById('announcementModalBody');
    if (!overlay || !body) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // 已有缓存，直接渲染
    if (ANNOUNCEMENT_MD) {
      body.innerHTML = renderMarkdown(ANNOUNCEMENT_MD);
      return;
    }

    // 显示加载中，再请求一次
    body.innerHTML = '<p style=\"text-align:center;color:var(--text-muted)\">加载中...</p>';
    fetch('/api/announcement')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        ANNOUNCEMENT_MD = getAnnouncementContent(data);
        body.innerHTML = renderMarkdown(ANNOUNCEMENT_MD);
      })
      .catch(function() {
        ANNOUNCEMENT_MD = FALLBACK_MD;
        body.innerHTML = renderMarkdown(FALLBACK_MD);
      });
  };

  window.closeAnnouncement = function() {
    var overlay = document.getElementById('announcementOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  // 点击遮罩关闭
  document.getElementById('announcementOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeAnnouncement();
  });

  // 简单 Markdown 渲染器
  function renderMarkdown(md) {
    var html = md;
    // 转义 HTML
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 右对齐标记：行首 ○ 则该行右对齐
    html = html.replace(/^○\s?(.+)$/gm, '<div style="text-align:right">$1</div>');

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体 & 斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 行内代码
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 水平线
    html = html.replace(/^---$/gm, '<hr>');

    // 引用
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // 列表项
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    // 包裝连续 li 为 ul
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, function(m) {
      return '<ul>' + m + '</ul>';
    });

    // 段落：按双换行分割
    var parts = html.split(/\n\n+/);
    html = parts.map(function(p) {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-3]|ul|ol|li|hr|blockquote)/.test(p)) return p;
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return html;
  }
})();

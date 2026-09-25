// 八字页的「AI 解读」：五方面切换 + 每方面一条 + 旧版可展开 + 游客引导登录。
// ==========================================================================
//
// 它做两件事：
//   ① 给共用的面板引擎（`js/ai_panel.js`）一份配置 `window.AI_PANEL_CONF` ——
//      八字这条线请求的是 `/api/bazi/parse`、请求体是**出生原始参数**，与六爻/梅花
//      那套 `{message, cardType, cardData}` 不同，故用引擎新加的三个可选钩子接上。
//      **引擎一个分支都没为八字改**（不给钩子时行为与从前逐字相同）。
//   ② 页内那点八字独有的东西：五个方面的切换条、旧版的折叠列表、游客那两条规矩。
//
// 四条产品规矩（2026-09-25 用户拍板）就落在这里：
//   · **页内，不浮层**：面板挂在正文流里（引擎的 `.ai-panel.inline`，仓库早就有这份样式）
//   · **五方面选择**：一次只看一个
//   · **替换，不累积**：切到别的方面就是换一份内容，不把上一份留在屏幕上
//   · **每方面一条 + 旧版可展开**：同一方面解多次时新的在最前，旧的收进「旧版」
//   · **可折叠**（2026-09-25 加）：标题那行是开关，收起只把内容藏起来、**不中断正在跑的
//     那次解读**（详见 `setCollapsed()` 上面那段）。块的位置在**排盘下面、其余信息上面**
//     （`my-charts/index.html` 的三块顺序：#baziChart → #baziAi → #baziRest）
//   · **游客：只能解一次、不许解「综合」**；用完引导登录，**登录后回到刚才那个方面接着解**
//   · **追问：要，但不落库**（2026-09-25 拍板）—— 追问接着**当前方面**那份解读问一句话，
//     复用同一个解读端点（`/api/chat/send` 没有八字分支）；body 里带上 `followUp` 原话，
//     服务端据此换模板、带上刚才那份解读，**且不写库**
//
// ⚠ 真正的闸门在服务端（签名 cookie + 同 IP 日上限，见 `auth-server.js` 那条端点的注释）。
//   这里做的（localStorage 记一笔、综合先拦住）只是**让用户早点听懂**，
//   不是安全边界 —— 清掉 cookie 就能再来，那本来也不是要防的事。
//
// 用法：
//   BaziAI.mount(document.getElementById('baziAi'), {
//     chartId: 'abc123',
//     birth: { y:1984, mo:2, d:4, h:12, mi:0, gender:'male' },
//   });
// 挂载后**不自动开始**解析：八字的解读要花掉游客唯一的一次（或扣 token），
// 该由用户点一下 —— 「点方面」就是六爻那页「起卦」的对应动作。

var BaziAI = (function () {
  'use strict';

  /** 与后端 `BAZI_ASPECTS` 同一份、同一顺序。改了这里也得改那里（冒烟里有一条钉着它）。 */
  var ASPECTS = ['综合', '事业', '财运', '婚姻', '健康'];
  /** 各方面在界面上的副标题 —— 大白话，让不懂的人知道点下去会得到什么。 */
  var ASPECT_HINT = {
    综合: '整体看一遍（篇幅最长，需登录）',
    事业: '工作方向、变动与贵人',
    财运: '收入来源与破财风险',
    婚姻: '感情与伴侣关系',
    健康: '体质与需要注意的地方',
  };
  var PENDING_KEY = 'bazi_pending_aspect';
  var ANON_USED_KEY = 'bazi_anon_used';
  var CSS_ID = 'bz-ai-style';

  var state = {
    info: null,
    cur: ASPECTS[0],
    rows: {},       // aspect → 记录行（新到旧，来自 /api/bazi-analyses）
    mem: {},        // aspect → 本次刚拿到、还没落库的（游客）正文
    loaded: false,
  };

  function esc(s) {
    if (typeof escHtml === 'function') return escHtml(s == null ? '' : String(s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function loggedIn() { return !!(window.AUTH && AUTH.isLoggedIn && AUTH.isLoggedIn()); }
  function md(t) {
    return typeof renderMarkdown === 'function' ? renderMarkdown(t || '') : esc(t || '');
  }
  function safeJson(t) { try { return JSON.parse(t); } catch (e) { return null; } }

  var CSS = [
    '.bz-aspects{display:flex;flex-wrap:wrap;gap:0.35rem;padding:0.15rem 0 0.6rem}',
    '.bz-aspect{font-family:inherit;font-size:0.78rem;padding:0.34rem 0.75rem;border-radius:999px;',
    'border:1px solid var(--border,#e8e3d8);background:transparent;color:var(--text-dim,#6b6b6b);cursor:pointer;transition:all .2s}',
    '.bz-aspect.on{background:#b8960a;border-color:#b8960a;color:#fff;font-weight:500}',
    '.bz-aspect .bz-lock{font-size:0.62rem;opacity:0.8;margin-left:0.2rem}',
    '.bz-aspect-hint{font-size:0.7rem;color:var(--text-dim,#6b6b6b);line-height:1.7;padding:0 0.15rem 0.5rem}',
    '.bz-hist{margin-top:0.7rem;border:1px solid var(--border,#e8e3d8);border-radius:12px;background:var(--bg-card,#fff);overflow:hidden}',
    '.bz-hist > summary{font-size:0.76rem;color:#7a6208;padding:0.65rem 0.9rem;cursor:pointer;list-style:none}',
    '.bz-hist > summary::-webkit-details-marker{display:none}',
    '.bz-hist-item{border-top:1px solid var(--border,#e8e3d8)}',
    '.bz-hist-item > summary{font-size:0.72rem;color:var(--text-dim,#6b6b6b);padding:0.55rem 0.9rem;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:0.5rem}',
    '.bz-hist-item > summary::-webkit-details-marker{display:none}',
    '.bz-hist-body{padding:0.2rem 0.9rem 0.8rem;font-size:0.8rem;line-height:1.8;color:var(--text,#1a1a1a)}',
    '.bz-hist-q{color:#7a6208}',
    // ── 折叠开关（2026-09-25 用户要求：AI 块挪到排盘下面之后，要能收起来不挡着看盘）──
    // 标题那行本身就是开关，不另加一行提示文字（用户嫌界面上字多）。
    '.bz-ai-toggle{display:flex;align-items:center;gap:0.4rem;width:100%;box-sizing:border-box;',
    'background:none;border:none;padding:0;cursor:pointer;text-align:left;',
    'font-family:"Noto Serif SC",serif;font-size:0.86rem;font-weight:600;color:var(--text,#1a1a1a);',
    'letter-spacing:0.1em;margin:0 0 0.45rem 0}',
    '.bz-ai-toggle .bz-line{flex:1;height:1px;background:var(--border,#e8e3d8)}',
    '.bz-ai-toggle .bz-caret{flex:none;font-size:0.7rem;font-weight:400;letter-spacing:0;color:var(--text-dim,#6b6b6b)}',
    '#baziAiSec.collapsed #baziAiBody{display:none}',
    '#baziAiSec.collapsed .bz-ai-toggle{margin-bottom:0}',
  ].join('');

  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── 面板引擎要的配置 ────────────────────────────────────────────────
  function conf() {
    window.AI_PANEL_CONF = {
      // 八字这条线不经过 /api/chat/send（那条匿名一律 401），走自己的解读端点
      parsePath: function () { return '/api/bazi/parse'; },
      // 引擎对首次解读和追问**走同一条路**，只在 body 里分开：追问带上原话
      // （`payload.followUp`）与刚才那份解读（`payload.context`）—— 这两个键由引擎的
      // `sendFollowUp` 填（两条线共用那一套）。**服务端见 `followUp` 非空就换模板、
      // 换上下文、且不落库**（「不落库」不单独发开关，见端点注释）。
      buildBody: function (message, payload) {
        var b = state.info.birth;
        var follow = String((payload && payload.followUp) || '').trim();
        var body = {
          y: b.y, mo: b.mo, d: b.d, h: b.h, mi: b.mi, gender: b.gender,
          tab: state.cur,
          chartId: state.info.chartId || '',
          question: '',
        };
        if (follow) {
          body.followUp = follow;
          body.context = String((payload && payload.context) || '');
        }
        return body;
      },
      // 面板上的固定文案改成八字的话（默认那套是六爻/梅花的「解卦」）
      title: '☯ AI 解读',
      busyTitle: '☯ 正在解读',
      doneTitle: '☯ 本次解读',
      startText: '☯ 解读这一方面',
      startHint: '选一个方面，点下面开始',
      waitText: '正在检索古籍，即将开始解读...',
      noChartHint: '还没有命盘',
      // ⚠ **必须给**：引擎找页内宿主时只认 `#resultArea` / `#contentArea`（那是六爻、梅花
      // 的容器名），这一页两样都没有 —— 不给的话它会判定「找不到容器」，退回
      // `position:fixed` + 全屏遮罩的**浮层**，把刚排好的盘盖住。产品规矩是「页内，不浮层」。
      // （`aiInlineHost()` 是「取容器的兄弟」，故这里指到 mount() 建的那个稳定容器上。）
      hostSelector: '#baziAiArea',
      // 追问（2026-09-25 拍板：「要，但追问不落库」）：接在**当前方面**那份解读下面，
      // 接着问一句话。游客的追问会被服务端那道「只免费一次」的闸挡住 → 403 →
      // 走下面的 onRefusal 引导登录（这也是追问栏对游客**照摆**的原因：
      // 他刚看完免费那一份，正是最想问一句的时候，此刻拦人比藏起来有用）。
      anonUsedKey: ANON_USED_KEY,
      anonFollowKey: '',
      barBtnId: '',
      recordsPath: '/api/bazi-analyses',   // recordId() 返回 null，故引擎不会去 PATCH 它
      cardType: 'bazi',

      hasChart: function () { return !!state.info; },
      topic: function () { return state.cur; },
      recordId: function () { return null; },   // 落库由解读端点自己做，前端不写
      payload: function () { return state.info.birth; },
      saved: function () {
        return currentText();
      },
      setSaved: function (v) {
        state.mem[state.cur] = v;
        // 登录用户的解读由服务端落库；刚流完这一条去把记录取回来，
        // 「旧版」列表里立刻就有它（下次刷新也还在）。
        if (loggedIn()) setTimeout(loadRecords, 200);
      },
      // 游客不许解「综合」：**先拦住，别等服务端 403** —— 用户点一下就被拒，
      // 他会以为是坏了；先说清「综合要看通盘、要登录」，他才明白为什么要注册。
      canStart: function () {
        if (!loggedIn() && state.cur === '综合') {
          promptLogin(document.getElementById('aiResponse'),
            '「综合」要把整张盘通看一遍，登录后才能用。',
            '其它四个方面（事业、财运、婚姻、健康）游客可以先免费试一次。');
          return false;
        }
        return true;
      },
      // 非 2xx 由页面自己认：403 要登录 / 400 参数 / 5xx 出错。
      // `host` 可能是 `#aiResponse`（首次解读），也可能是追问那一条的容器
      // （`sendFollowUp` 把容器本身递进来）—— 两边都用「往容器里画」的写法，
      // 且**只 add('show')、不覆盖 className**，免得把 `ai-followup-item` 抹掉。
      onRefusal: function (xhr, host) {
        var d = safeJson(xhr.responseText) || {};
        if (xhr.status === 403 && d.needLogin) {
          rememberPending();
          promptLogin(host, d.error || '游客只能免费解读一次。',
            '登录后每个方面都能解读多次，记录会替你留着。');
          return true;
        }
        if (xhr.status === 400 || xhr.status === 429 || xhr.status >= 500) {
          if (host) {
            host.classList.add('show');
            host.innerHTML = '<div class="ai-error">❌ '
              + esc(d.error || ('请求失败（' + xhr.status + '）')) + '</div>';
          }
          return true;
        }
        return false;   // 401 之类交给引擎/ auth.js 的既有处理
      },
    };
  }

  // ── 状态 ────────────────────────────────────────────────────────────

  /** 当前方面要显示的那份正文：优先服务端记录里最新的一条，其次本次刚拿到的（游客） */
  function currentText() {
    var rows = state.rows[state.cur];
    if (rows && rows.length) return rows[0].analysis || '';
    return state.mem[state.cur] || '';
  }

  /** 记下「刚才想解哪个方面」—— 登录会整页刷新，回来时靠它接着解 */
  function rememberPending() {
    try { sessionStorage.setItem(PENDING_KEY, state.cur); } catch (e) { /* 无痕模式 */ }
  }
  function takePending() {
    var v = null;
    try { v = sessionStorage.getItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY); } catch (e) { /* 无痕 */ }
    return v && ASPECTS.indexOf(v) >= 0 ? v : null;
  }

  function promptLogin(respEl, why, extra) {
    if (!respEl) return;
    respEl.classList.add('show');   // 不覆盖 className：追问那条容器的类要留着
    respEl.innerHTML = '<div style="text-align:center;padding:1.5rem 1rem">'
      + '<div style="font-size:1.2rem;margin-bottom:0.5rem">🔒</div>'
      + '<div style="font-size:0.9rem;font-weight:600;color:var(--text);margin-bottom:0.35rem">'
      + esc(why) + '</div>'
      + '<div style="font-size:0.75rem;color:var(--text-dim);line-height:1.7;margin-bottom:1rem">'
      + esc(extra || '') + '</div>'
      + '<div style="display:flex;gap:0.5rem;justify-content:center">'
      + '<a href="javascript:void(0)" onclick="BaziAI.beforeLogin();openAuthModal(\'register\')" class="ai-start-btn" '
      + 'style="display:inline-block;text-decoration:none">注册</a>'
      + '<a href="javascript:void(0)" onclick="BaziAI.beforeLogin();openAuthModal(\'login\')" class="ai-start-btn" '
      + 'style="display:inline-block;text-decoration:none;background:#fff;color:var(--accent);border:1px solid var(--accent);box-shadow:none">登录</a>'
      + '</div>'
      + '<div style="font-size:0.68rem;color:var(--text-dim);margin-top:0.7rem">'
      + '登录后会自动回到「' + esc(state.cur) + '」接着解读</div>'
      + '</div>';
  }

  // ── 折叠 / 展开 ──────────────────────────────────────────────────────
  /**
   * 收起 = **只是藏起来，不停这次解读**（2026-09-25 用户拍板）。
   *
   * 用户原话：「（但可以选择折叠对话，所以不影响看下面的内容）」—— 折叠的用途是**腾地方
   * 看下面的盘**，不是「不看了」。所以这里**只切一个 class**，绝不调 `closeAIPanel()`：
   * 那个函数（`js/ai_panel.js`）会 `abortAIStream()` 把正在跑的那次请求掐掉，
   * 用户展开回来会看到半截正文或空白，还会白扣额度。**本函数是这块最容易写错的地方。**
   *
   * 隐藏不会影响 XHR/流：正文照写进 DOM，展开即见，也不用重放。
   */
  function setCollapsed(c) {
    var sec = document.getElementById('baziAiSec');
    if (!sec) return;
    sec.classList.toggle('collapsed', !!c);
    var b = document.getElementById('baziAiToggle');
    if (!b) return;
    b.setAttribute('aria-expanded', c ? 'false' : 'true');
    var g = b.querySelector('.bz-caret');
    if (g) g.textContent = c ? '展开 ▸' : '收起 ▾';
  }
  /** 展开（`select()` 与登录回跳前都先调它：答案不许生成在一个收起的块里） */
  function expand() { setCollapsed(false); }
  function toggleCollapsed() {
    var sec = document.getElementById('baziAiSec');
    setCollapsed(sec ? !sec.classList.contains('collapsed') : false);
  }

  // ── 切换方面 ────────────────────────────────────────────────────────
  function select(aspect, opts) {
    var o = opts || {};
    if (ASPECTS.indexOf(aspect) < 0) return;
    if (typeof abortAIStream === 'function') abortAIStream();   // 换方面 = 上一次不看了
    expand();   // 折叠着点方面（或登录回跳自动接着解）→ 先把块展开，否则正文流进看不见的地方
    state.cur = aspect;
    // **面板必须跟着打开**：方面按钮在页面上、一直点得动，而面板可以处于关着的状态
    // （`.ai-panel` 不带 `.open` 就是 `display:none`）。2026-09-25 用户报的
    // 「叉掉之后又他妈打不开解析了」就是这个 —— 点方面只把内容画进看不见的地方，
    // 屏幕上「点了没反应」。表头那颗 ✕ 已删除，但**这条修复不能跟着一起删**：
    // 登录回跳（`location.reload()` 之后面板从没开过）走的是同一条路。
    if (typeof openAIPanel === 'function') openAIPanel();
    renderBar();
    var resp = document.getElementById('aiResponse');
    // **替换，不累积**：换方面就把面板内容整个重画一遍，上一方面的正文不留在屏幕上
    if (resp) { resp.innerHTML = ''; resp.className = 'ai-response'; }
    if (typeof showAIHome === 'function') showAIHome();
    renderHistory();
    if (o.autoStart && typeof startButtonClicked === 'function') {
      // 登录回来接着解：用户刚才点过「解读」，这不是替他做决定。
      // ⚠ **必须先把面板打开**：`.ai-panel` 不带 `.open` 是 `display:none`，
      // 这条路上（页面刚 reload，面板从没开过）正文会流进一块看不见的地方 ——
      // 用户看到的是「登录回来了，然后什么都没发生」。mount() 的另一个分支
      // （没有待解意图）本来就调了 openAIPanel()，这里当时漏了。
      if (typeof openAIPanel === 'function') openAIPanel();
      startButtonClicked();
    }
  }

  // ── 渲染 ────────────────────────────────────────────────────────────
  function renderBar() {
    var bar = document.getElementById('baziAspectBar');
    if (!bar) return;
    var isGuest = !loggedIn();
    var h = '';
    ASPECTS.forEach(function (a) {
      h += '<button class="bz-aspect' + (a === state.cur ? ' on' : '') + '" data-aspect="' + esc(a) + '">'
        + esc(a) + (isGuest && a === '综合' ? '<span class="bz-lock">🔒</span>' : '') + '</button>';
    });
    bar.innerHTML = h;
    var hint = document.getElementById('baziAspectHint');
    if (hint) hint.textContent = ASPECT_HINT[state.cur] || '';
    Array.prototype.forEach.call(bar.querySelectorAll('.bz-aspect'), function (btn) {
      btn.addEventListener('click', function () { select(btn.getAttribute('data-aspect')); });
    });
  }

  /** 「旧版可展开」：同一方面解过多次时，第一份就是当前这份，其余收进折叠列表 */
  function renderHistory() {
    var box = document.getElementById('baziAiHistory');
    if (!box) return;
    var rows = state.rows[state.cur] || [];
    var older = rows.slice(1);
    if (!older.length) { box.innerHTML = ''; return; }
    var h = '<details class="bz-hist"><summary>旧版记录（' + older.length + ' 份，点开看）</summary>';
    older.forEach(function (r) {
      h += '<details class="bz-hist-item"><summary><span>'
        + esc(fmtTime(r.createdAt)) + '</span>'
        + (r.question ? '<span class="bz-hist-q">问：' + esc(r.question) + '</span>' : '')
        + '</summary><div class="bz-hist-body">' + md(r.analysis || '') + '</div></details>';
    });
    h += '</details>';
    box.innerHTML = h;
  }

  function fmtTime(t) {
    if (!t) return '';
    try {
      var d = new Date(t);
      if (typeof formatTime === 'function') return formatTime(d);
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    } catch (e) { return String(t); }
  }

  /** 取回这个命盘的全部解读记录（只有登录用户有；游客不落库） */
  async function loadRecords() {
    if (!loggedIn() || !state.info || !state.info.chartId) return;
    try {
      var token = AUTH.getToken();
      var resp = await fetch('/api/bazi-analyses?chartId=' + encodeURIComponent(state.info.chartId),
        { headers: token ? { Authorization: 'Bearer ' + token } : {} });
      if (!resp.ok) return;
      var rows = await resp.json();
      if (!Array.isArray(rows)) return;
      var byAspect = {};
      rows.forEach(function (r) {
        if (ASPECTS.indexOf(r.aspect) < 0) return;
        (byAspect[r.aspect] = byAspect[r.aspect] || []).push(r);
      });
      state.rows = byAspect;
      state.loaded = true;
      renderBar();
      renderHistory();
      // 若当前方面本来没内容、现在有了（比如刚才那次存进去了），把面板内容也跟着换过来
      var resp2 = document.getElementById('aiResponse');
      if (resp2 && !state.mem[state.cur] && currentText() && typeof showAIHome === 'function') {
        showAIHome();
      }
    } catch (e) { /* 记录取不到不该影响解盘：上面那块盘还在 */ }
  }

  /**
   * 挂载。
   * @param {HTMLElement} host 放在盘面下方的容器（本模块会往里塞切换条与面板宿主）
   * @param {object} info `{chartId, birth:{y,mo,d,h,mi,gender}}`
   */
  function mount(host, info) {
    if (!host || !info || !info.birth) return null;
    injectCss();
    state.info = info;
    state.cur = ASPECTS[0];
    state.rows = {};
    state.mem = {};

    host.innerHTML = '<div class="bz-sec" id="baziAiSec">'
      // 标题行 = 折叠开关（默认展开：用户要「一眼就看到」）
      + '<button type="button" class="bz-ai-toggle" id="baziAiToggle" aria-expanded="true"'
      + ' aria-controls="baziAiBody"><span>☯ AI 解读</span><span class="bz-line"></span>'
      + '<span class="bz-caret">收起 ▾</span></button>'
      + '<div id="baziAiBody">'
      + '<div class="bz-aspects" id="baziAspectBar"></div>'
      + '<div class="bz-aspect-hint" id="baziAspectHint"></div>'
      // 面板宿主：引擎的 aiInlineHost() 会把它建成这个容器的**兄弟**，
      // 故这里给个稳定的、不会被整块重画的容器
      + '<div id="baziAiArea"></div>'
      + '<div id="baziAiHistory"></div>'
      + '</div></div>';

    var tg = document.getElementById('baziAiToggle');
    if (tg) tg.addEventListener('click', toggleCollapsed);

    conf();
    renderBar();

    // 登录回来接着解：`auth.js` 登录成功是 `location.reload()`，
    // 所以「回跳」不需要造 URL 参数 —— 只要把「刚才想解哪个方面」存下来。
    var pending = takePending();
    if (pending && loggedIn()) {
      select(pending, { autoStart: true });
    } else {
      if (typeof openAIPanel === 'function') openAIPanel();
      if (typeof showAIHome === 'function') showAIHome();
    }

    loadRecords();
    return { select: select, reload: loadRecords };
  }

  // 登录弹窗里的按钮点了之后（注册/登录都可能中途关掉弹窗）先把意图记下来
  function beforeLogin() { rememberPending(); }

  return { mount: mount, select: select, beforeLogin: beforeLogin, ASPECTS: ASPECTS };
})();

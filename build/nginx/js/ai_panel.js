// AI 解析面板（那套浮层 DOM + 取流 + 追问）—— 梅花页与六爻页共用一份。
//
// 来源：2026-09-25 从 `js/mhys_ai_panel.js`（当日早些时候刚上线的版本）里
// 把**与页面无关的那部分**整段搬出，逻辑逐字未改，只是把原来直接读页面全局
// 变量的地方改成读 `window.AI_PANEL_CONF` 里的钩子。这样做是因为六爻页也要
// 同一套面板：若各抄一份，两份就会慢慢长得不一样 —— 用户看到的「自动解析」
// 会随页面而变，而没人说得清哪份是对的。
//
// 页面要给的只有 `window.AI_PANEL_CONF`（见下），引擎不认「梅花」「六爻」这些
// 字眼。所有字段**惰性读取**（每次用的时候现取），故 conf 可以在本文件之前或
// 之后定义，脚本顺序不影响。
//
//   window.AI_PANEL_CONF = {
//     cardType:      'mhys',                 // 发给 /api/chat/send 的 cardType
//     recordsPath:   '/api/mhys-records',    // 解析存回哪个记录
//     anonUsedKey:   'mhys_anon_used',       // 游客「已用过一次」的标记
//     anonFollowKey: 'mhys_anon_followup',   // 游客「已追问过一次」的标记
//     barBtnId:      'aiBarBtn',             // 表头那颗按钮（流结束后改它的状态）
//     noChartHint:   '先起一卦，再来看解析',   // 还没卦就点面板时说的话
//     hasChart:  function(){ return …; },    // 有没有卦可解（决定放不放行）
//     topic:     function(){ return …; },    // 求测事项（当 message 发给后端）
//     recordId:  function(){ return …; },    // 当前记录 id（存解析用）
//     payload:   function(){ return …; },    // cardData（各页自己拼）
//     saved:     function(){ return …; },    // 已保存的解析文本
//     setSaved:  function(v){ …; },          // 记下刚拿到的解析
//   };
//
// ── 2026-09-25 为八字页补的三个**可选**钩子 ────────────────────────────────
// 八字那条线不是「起一卦再解」，而是「一份命盘、五个方面各解一次」：请求体不是
// `{message, cardType, cardData}` 而是**出生原始参数**，请求也不是发往
// `/api/chat/send`（那条匿名一律 401）。故补三个钩子。**三个都不给时，本文件的
// 行为与从前逐字相同**（六爻/梅花两页一个字都不用改）：
//
//   parsePath: function(){ …; }   // 发给哪个端点，默认 '/api/chat/send'
//   buildBody: function(msg, payload){ …; }   // 拼请求体；默认 {message, cardType, cardData}
//   onRefusal: function(xhr, respDiv){ …; }   // 返回 true = 这个非 2xx 我处理过了
//                                             // （比如「游客次数用完，请登录」）
//   noFollowUp: true              // 不显示追问栏（八字的追问还没定形态，先不摆出来）
//   title / doneTitle / startText / waitText  // 面板上的固定文案，默认是六爻/梅花那套
//
// ⚠ 为什么用「钩子」而不是各页抄一份面板：面板与页面**互相耦合**的地方就那么几处
// （发哪个端点、怎么拼请求、非 2xx 怎么办）。抄一份的话，日后修面板的 bug（比如
// 2026-09-25 那个「收起面板是假中断」）就得改两遍，而第二遍一定会忘。

// ⚠⚠ 表头**故意没有关闭按钮（原来有个 ✕，2026-09-25 用户点名删掉）**。
//   他当时的话是「ai解读还是可以叉掉，叉掉之后又他妈打不开解析了，这个 x 的意义在哪」。
//   查下来是这样：八字页的面板是**页内**的（见 aiInlineHost），`BaziAI.mount()` 一进来
//   就 openAIPanel()；✕ 一按只剩 `display:none`，而**方面按钮还在页面上、还点得动** ——
//   点下去 select() 只把内容画进那块看不见的区域，用户看到的是「点了没反应」。
//   六爻/梅花两页本来就有页面级按钮（`☯ 看不懂？试试自动解析` → toggleAIPanel）
//   可以开关，✕ 对它们纯属重复；两页的浮层还能点遮罩关掉（见文件末的 overlay 监听）。
//   故整块删掉：**没有「只能进不能出」的口子，也没有「关了就没救」的口子**。
//   还需要「收起」的地方走 toggleAIPanel()（它能再打开），不要另加只关不开的按钮。
var MH_AI_PANEL_HTML = `
<!-- AI 面板背景遮罩 -->
<div class="ai-panel-overlay" id="aiPanelOverlay"></div>

<!-- AI 面板 -->
<div class="ai-panel" id="aiPanel">
  <div class="ai-panel-header">
    <span>☯ 自动解析</span>
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
    box.innerHTML = MH_AI_PANEL_HTML;
    while (box.firstChild) document.body.appendChild(box.firstChild);
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();

// ===== AI 智能解析 =====
//
// 正在跑的那次解析只留**一个句柄**，而且就是 XHR 自己的句柄（见 `abortAIStream`）。
// 形如 `{ xhr, respDiv, seq, aborted, timerId, elapsed }`。
var aiStream = null;
var aiStreamSeq = 0;
var aiPanelOpen = false;

/**
 * 中断正在跑的那次解析（`closeAIPanel` 与「换方面」都走它）。
 *
 * ⚠ **原实现是个假的中断**：`aiStreamAbort = new AbortController(); …; abort()`。
 * `abort()` 只对把 `signal` 传进去的请求有效，而本文件的请求走的是
 * `XMLHttpRequest` —— 那个 signal 从头到尾没接到任何东西上，所以 `abort()`
 * 一次也没停过任何请求。2026-09-25 用驱动脚本实测坐实（`drive_liuyao_page.js` ⑪）：
 * 用户收起面板之后，服务端**照样把第二段正文写完**、连接正常收尾（`aborts: []`）。
 *
 * 现在：直接掐 XHR，并在每个回调里先看 `aborted`。被掐掉的那次**不算数** ——
 * 不渲染、不保存、不置「游客已用过一次」、不写回记录。理由很简单：**用户没看见的
 * 解析不该扣他的次数**。原来那次被中途丢掉的解析：token 照扣、游客唯一的一次机会
 * 照烧、正文一个字都没显示出来 —— 用户再点就是「免费次数已用完」，
 * 于是「叉掉之后就不能重启了」。
 */
function abortAIStream() {
  var s = aiStream;
  if (!s) return;
  aiStream = null;
  s.aborted = true;
  if (s.timerId) { clearInterval(s.timerId); s.timerId = 0; }
  try { s.xhr.abort(); } catch (e) { /* 已经结束了 */ }
}

/**
 * 后端拼在正文末尾的记账尾巴，**切出来单独显示**（不再一律抹掉）。
 *
 * 后端流式返回的是**裸文本 + 一行魔法尾巴**：
 *   `\n\n---\n消耗积分：输入 X + 输出 Y = Z ｜ 剩余：R`
 * 它不是正文，是记账信息。
 *
 * 演进史（别把中间那个坑再踩回去）：原实现只在「存进记录」那一处 `lastIndexOf`
 * 抹了一次，**显示用的 fullText 没抹** → 用户看到正文最后挂着一行「消耗 Token：…」，
 * 存下来的却没有，同一份内容两个样。后来统一成「显示与保存都抹掉」→ 干净了，
 * 但**用户看不到自己扣了多少**。
 *
 * 2026-09-25 用户拍板：「每个解析都要显示消耗的积分数目」「把这个改称积分」。
 * 故本版：
 *   · 正文 = 尾巴之前的部分（顺手把尾巴前那条 `---` 也去掉 —— 原来只 `\s+$`，
 *     去不掉横线，正文末尾会挂一条分隔线）；
 *   · 尾巴 = 一行小字，显示在正文下面（`.ai-points`）；
 *   · **两个标记都认**：老记录里存的是旧字「消耗 Token：」，只认新标记的话，
 *     历史解读的尾巴会被当成正文渲染出来。
 *
 * ⚠ 标记必须与后端 `POINTS_LABEL` 逐字一致。将来流式改真 SSE 事件时，删掉本段
 * 与后端 `pointsTrailer()` 即可（见 3.5.4 / 阶段 3 的计划）。
 */
var AI_POINTS_MARKS = ['\n消耗积分：', '\n消耗 Token：'];

/** 尾巴在正文里的起点（取最靠后的那个标记）；没有尾巴回 -1。 */
function pointsIdx(t) {
  var i = -1;
  for (var k = 0; k < AI_POINTS_MARKS.length; k++) {
    var j = t.lastIndexOf(AI_POINTS_MARKS[k]);
    if (j > i) i = j;
  }
  return i;
}

/** 正文：抹掉记账尾巴与它前面那条 `---`。 */
function stripTokenTrailer(t) {
  if (!t) return t;
  var i = pointsIdx(t);
  if (i <= 0) return t;
  return t.substring(0, i).replace(/\s*---\s*$/, '').replace(/\s+$/, '');
}

/** 记账尾巴的文字（老记录的旧字统一改称「积分」）；没有则空串。 */
function pointsText(t) {
  if (!t) return '';
  var i = pointsIdx(t);
  if (i <= 0) return '';
  return t.substring(i + 1).replace(/\s+$/, '').replace(/^消耗 Token：/, '消耗积分：');
}

/** 记账行的小字 HTML；没尾巴时返回空串（不占位）。 */
function pointsHtml(t) {
  var p = pointsText(t);
  return p ? '<div class="ai-points">' + escHtml(p) + '</div>' : '';
}

/**
 * 存进记录里的形态 = **正文 + 记账行**。
 *
 * 为什么尾巴要跟着入库：用户要「每个解析都显示消耗的积分数目」，而记录页是把
 * `ai_analysis` 原样喂给 `resp.innerHTML` 的 —— 入库时抹掉，历史解读就永远看不到
 * 那一行（只能看到刚跑完的那一次）。展示端走同一个 `stripTokenTrailer()`，所以
 * 存进去的尾巴不会被当成正文渲染。
 *
 * 正文为空时不存尾巴：那就是「只有记账行、没有解读」，没有存的道理。
 */
function withPoints(t) {
  var body = stripTokenTrailer(t || '').trim();
  var p = pointsText(t);
  return (body && p) ? body + '\n\n---\n' + p : body;
}

/** 取页面给的配置。缺字段一律回落到「不会崩」的默认值，便于单页试跑 */
function AIC() { return window.AI_PANEL_CONF || {}; }
function aiHasChart() { var c = AIC(); return c.hasChart ? !!c.hasChart() : true; }
function aiTopic() { var c = AIC(); return c.topic ? (c.topic() || '') : ''; }
function aiRecordId() { var c = AIC(); return c.recordId ? c.recordId() : null; }
function aiSaved() { var c = AIC(); return c.saved ? (c.saved() || '') : ''; }
function aiSetSaved(v) { var c = AIC(); if (c.setSaved) c.setSaved(v); }
function aiPayload() { var c = AIC(); return c.payload ? c.payload() : null; }

// ── 2026-09-25 加的三个可选钩子（不给 = 原行为，见文件头注释）─────────────
//
// ⚠ `parsePath` 是**函数**（和 `topic`/`recordId` 那些一样惰性读），所以必须
// **调用它**。第一版这里写的是 `return c.parsePath || '/api/chat/send';` —— 把函数
// 本身交回给了 `xhr.open()`，于是 URL 变成把函数体当路径的那个鬼东西：
//   POST /my-charts/function%20()%20%7B%20return%20'/api/bazi/parse';%20%7D
// 它落到静态文件那条分支、回一个 404 正文，而 `onRefusal` 不认 404、`onprogress`
// 又把非 2xx 静音了 —— 屏幕上就永远停在「正在检索古籍，即将开始解读...」。
// **八字那条线的解读一次都没成功过**，六爻/梅花看不出来（它们走默认值，不给钩子）。
// 是 `duipan/drive_bazi_page.js` ①② 里那本「服务端收到过什么」的流水把它照出来的。
function aiParsePath() { var c = AIC(); return c.parsePath ? c.parsePath() : '/api/chat/send'; }
function aiBuildBody(message, payload) {
  var c = AIC();
  if (c.buildBody) return c.buildBody(message, payload);
  return { message: message, cardType: c.cardType || '', cardData: payload };
}
function aiOnRefusal(xhr, respDiv) {
  var c = AIC();
  return c.onRefusal ? !!c.onRefusal(xhr, respDiv) : false;
}
/** 页面自己认非 2xx 吗？只为「非 2xx 的响应体别当正文灌进去」这一处判断用。 */
function aiHasRefusal() { return !!AIC().onRefusal; }
function aiTxt(name, dflt) { var v = AIC()[name]; return v == null ? dflt : v; }

/**
 * 放不放行这次解析。页面可自己拦（八字那侧：游客不许解「综合」——
 * 拦在这里，用户才能**先听懂理由**，而不是点完收到一个 403）。
 * 页面若拦了，自己负责把话说清楚（它能把提示画进 `#aiResponse`）。
 */
function aiCanStart() {
  var c = AIC();
  return c.canStart ? !!c.canStart() : true;
}

/**
 * 追问栏该不该露出来。
 *
 * 八字那页暂时不适用（它的「追问」还没定形态 —— 五方面已经各占一条，追问算哪一条没想清），
 * 所以由页面用 `noFollowUp: true` 关掉。**不是**把按钮藏起来就算完：每处
 * `classList.add('show')` 都得走这里，否则流一结束它自己会冒出来。
 */
function aiNoFollowUp() { return !!AIC().noFollowUp; }
function showFollowBar() {
  if (aiNoFollowUp()) return;
  var fbar = document.getElementById('aiFollowBar');
  if (fbar) fbar.classList.add('show');
}

function toggleAIPanel() {
  if (aiPanelOpen) { closeAIPanel(); return; }
  showAIHome();
  openAIPanel();
}

/**
 * 面板的放置位置。
 *
 * ⚠ 用户报的「六爻前端显示问题很大」，主体就是这个：面板原先是 `position:fixed`
 * 的底部浮层 + 全屏遮罩，结果页上它**正好盖住刚排出来的卦象表** ——
 * 用户点了「看不懂？试试自动解析」，然后自己的盘就看不见了，盘与解读互相遮挡，
 * 谁都读不完整。
 *
 * 有正文容器时改成**放进正文流**，排在盘下面：从上往下读就是
 * 「先看盘 → 再看解读」，符合北极星那条（服务于不懂的人），也不再遮任何东西。
 *
 * ⚠ 找宿主不能只认 `#resultArea`：那是**排盘页**（原地出结果）的容器名，
 * 而**记录页**（`liuyao/result.html`、`mhys/result.html`，从历史列表点进来的）
 * 用的是 `#contentArea`。少了这一条，记录页就退回 position:fixed 的浮层 ——
 * 用户 2026-09-25 报的「点开的排盘记录不是把 AI 解析介入页面，而是叠在页面上面」
 * 就是这个，六爻与梅花两个记录页都中。页面也可用 `AI_PANEL_CONF.hostSelector`
 * 自己指定（各页容器名以后若再改，改 conf 就行，不必动引擎）。
 *
 * 宿主 `#aiInlineHost` 是容器的**兄弟**、只建一次：容器每次排盘都会
 * `innerHTML = …` 重建，面板若挂在容器**内部**会被一起清掉。
 */
function aiInlineHost() {
  var sel = AIC().hostSelector;
  var area = sel ? document.querySelector(sel) : null;
  if (!area) area = document.getElementById('resultArea');
  if (!area) area = document.getElementById('contentArea');
  if (!area || !area.parentNode) return null;
  var host = document.getElementById('aiInlineHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'aiInlineHost';
    area.parentNode.insertBefore(host, area.nextSibling);
  }
  return host;
}

function openAIPanel() {
  var p = document.getElementById('aiPanel');
  var o = document.getElementById('aiPanelOverlay');
  if (!p || !o) return;
  var host = aiInlineHost();
  aiPanelOpen = true;
  if (host) {
    if (p.parentNode !== host) host.appendChild(p);
    p.classList.add('inline', 'open');
    o.classList.remove('open');
  } else {
    p.classList.add('open');
    o.classList.add('open');
  }
}

/**
 * 收起面板 —— **并且真的停掉正在跑的那次解析**。
 *
 * 走这里的是「面板已经开着时再点一次表头按钮」(`toggleAIPanel`)，以及
 * 六爻/梅花浮层上点遮罩（文件末的 overlay 监听）。语义是：**收起 = 不看了，停掉**。
 * 所以收起之后不再有「后台偷偷跑完」的那次解析，也就不会再出现
 * 「屏幕上是空的、额度却被扣掉」。
 *
 * ⚠ 注意 `toggleAIPanel()` 是**能再打开**的（这是它存在的理由）；表头那颗只关不开的
 * ✕ 已在 2026-09-25 删掉（见 MH_AI_PANEL_HTML 上面那段），别再加回来。
 *
 * （若哪天想改成「收起但让它跑完、回来接着看」，只需把下面这行
 * `abortAIStream()` 删掉 —— 其余状态机已经能处理「面板关着而流在跑」，
 * 重开时会把它贴回来。）
 */
function closeAIPanel() {
  aiPanelOpen = false;
  var p = document.getElementById('aiPanel');
  var o = document.getElementById('aiPanelOverlay');
  if (p) p.classList.remove('open');
  if (o) o.classList.remove('open');
  abortAIStream();
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
  var anonFollowKey = AIC().anonFollowKey || '';
  // 未登录用户可追问一次
  if (!AUTH.isLoggedIn()) {
    if (localStorage.getItem(anonFollowKey)) {
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
  xhr.open('POST', aiParsePath());
  for (var k in headers) xhr.setRequestHeader(k, headers[k]);

  // ⚠ 上一份解读里**带记账行**（存记录时就存了它，见下方 `withPoints`），
  // 但喂给模型的「之前解读」不能捎上「消耗积分：…」那行 —— 那是给我们记账的，
  // 不是卦理内容。所以这里先切掉。
  var prevAnswer = stripTokenTrailer(aiSaved() || '');
  var fullText = '';

  xhr.onprogress = function() {
    // 同主流程：非 2xx 的响应体是 JSON，不能当正文渲染（页面配了 onRefusal 时）
    if (xhr.status >= 400 && aiHasRefusal()) return;
    var newText = xhr.responseText.substring(fullText.length);
    if (newText) {
      fullText = xhr.responseText;
      var ansDiv = item.querySelector('.ai-followup-answer') || document.createElement('div');
      if (!ansDiv.className) { ansDiv.className = 'ai-followup-answer'; item.appendChild(ansDiv); }
      ansDiv.innerHTML = renderMarkdown(stripTokenTrailer(fullText)) + pointsHtml(fullText);
      body.scrollTop = body.scrollHeight;
    }
  };

  xhr.onloadend = function() {
    btn.disabled = false;
    btn.textContent = '发送';
    input.disabled = false;
    input.focus();
    // 「输出中……」那句转圈得先撤掉：非 2xx 时不撤，屏幕上就永远停在「输出中」
    var spin = item.querySelector('.ai-loading');
    if (spin) spin.remove();
    showFollowBar();
    // 非 2xx 交页面处置（八字：403 → 追问要登录）。没配 onRefusal 的页面原样继续。
    if (aiOnRefusal(xhr, item)) return;
    // 401 → 清除错误内容并弹出登录窗口
    if (handleApiUnauthorized(xhr, item)) return;
    // 未登录用户标记已使用追问次数
    if (!AUTH.isLoggedIn() && anonFollowKey) {
      localStorage.setItem(anonFollowKey, '1');
    }
  };

  var payload = aiPayload();
  payload.followUp = q;
  payload.context = prevAnswer;
  xhr.send(JSON.stringify(aiBuildBody(q, payload)));
}

function showAIHome() {
  var resp = document.getElementById('aiResponse');
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = aiTxt('title', '☯ 自动解析');
  resp.className = 'ai-response show';

  // 正在解析：把**那一次**的正文贴回来，而不是画一个「开始解卦」按钮。
  // （原来这里无条件画按钮：老流还在跑，屏幕上却摆出「可以开始」；用户点下去
  //  要么又开一条流、要么被游客门拦住 —— 看到的都跟真实状态不符。实测见 ⑪。）
  if (aiStream && !aiStream.aborted && aiStream.respDiv) {
    if (hdr) hdr.textContent = aiTxt('busyTitle', '☯ 正在解析');
    resp.innerHTML = '';
    resp.appendChild(aiStream.respDiv);
    return;
  }

  var anonUsedKey = AIC().anonUsedKey || '';
  // 未登录用户且已使用过解析次数 → 引导注册
  if (!AUTH.isLoggedIn() && anonUsedKey && localStorage.getItem(anonUsedKey)) {
    showLoginPrompt(resp);
    return;
  }

  // 已有保存的解析 → 直接展示，并显示追问栏
  if (aiSaved()) {
    showSavedAnalysis();
    return;
  }

  // 无保存解析 → 显示开始按钮
  resp.innerHTML = '<div style="text-align:center;padding:1.5rem 0">' +
    '<div style="font-size:0.82rem;color:var(--text-dim);margin-bottom:1.2rem">'
      + escHtml(aiTxt('startHint', '点击下方按钮开始解卦分析')) + '</div>' +
    '<button class="ai-start-btn" onclick="startButtonClicked()">'
      + escHtml(aiTxt('startText', '☯ 开始解卦')) + '</button>' +
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
  if (!aiHasChart()) { showAIToast(AIC().noChartHint || '先起一卦，再来看解析'); return; }
  if (!aiCanStart()) return;
  var anonUsedKey = AIC().anonUsedKey || '';
  if (!AUTH.isLoggedIn() && anonUsedKey && localStorage.getItem(anonUsedKey)) {
    var resp = document.getElementById('aiResponse');
    showLoginPrompt(resp);
    return;
  }
  if (aiSaved()) {
    showSavedAnalysis();
  } else {
    startAIStream();
  }
}

function showSavedAnalysis() {
  var resp = document.getElementById('aiResponse');
  resp.className = 'ai-response show';
  // 存的正文里带着记账行，切出来显示成小字（老记录没有记账行 → 什么都不显示）
  resp.innerHTML = '<div class="ai-result">' + renderMarkdown(stripTokenTrailer(aiSaved()))
    + pointsHtml(aiSaved()) + '</div>';
  var hdr = document.querySelector('.ai-panel-header span:first-child');
  if (hdr) hdr.textContent = aiTxt('doneTitle', '☯ 已保存的解析');
  // 显示追问输入栏（页面用 noFollowUp 关掉时不显示）
  showFollowBar();
}

async function startAIStream() {
  abortAIStream();   // 不并发两条流：上面那次还在跑就先掐掉（否则两条流抢同一块屏）

  var resp = document.getElementById('aiResponse');
  resp.className = 'ai-response show';

  try {
    var s = { xhr: null, respDiv: null, aborted: false, timerId: 0, elapsed: 0, seq: ++aiStreamSeq };
    aiStream = s;

    var token = AUTH.getToken();
    var headers = { 'Content-Type':'application/json' };
    if (token) headers['Authorization'] = 'Bearer '+token;

    var xhr = new XMLHttpRequest();
    s.xhr = xhr;
    xhr.open('POST', aiParsePath());
    for (var k in headers) xhr.setRequestHeader(k, headers[k]);

    var fullText = '';
    var respDiv = document.createElement('div');
    s.respDiv = respDiv;
    respDiv.className = 'ai-result';
    respDiv.innerHTML = '<div class="ai-loading"><div class="ai-spinner"></div>'
      + '<span class="ai-wait"></span></div>';
    // 文案由页面给，故用 textContent 塞（别让配置里的字能变成标签）
    respDiv.querySelector('.ai-wait').textContent = aiTxt('waitText', '正在检索古籍，即将开始解卦...');
    resp.innerHTML = '';
    resp.appendChild(respDiv);

    // 等待秒数走字。**模型不出字的那段时间，屏幕上也该是「活着」的** ——
    // 原来是一个不动的转圈，用户唯一能得到的结论就是「卡住了」（他报的就是这个词）。
    // 这里不设超时门槛：多长算长是模型与网络的事，我们只如实报数，让用户自己决定
    // 要不要收起面板（收起是真取消，见 closeAIPanel）。
    s.timerId = setInterval(function () {
      if (s.aborted) return;
      var w = respDiv.querySelector('.ai-wait');
      if (!w) { clearInterval(s.timerId); s.timerId = 0; return; }
      s.elapsed += 1;
      w.textContent = aiTxt('waitText', '正在检索古籍，即将开始解卦...')
        + '（已等 ' + s.elapsed + ' 秒）';
    }, 1000);

    xhr.onprogress = function() {
      if (s.aborted) return;
      // 非 2xx 的响应体是 JSON（比如 403 那句「请先登录」），**不能当正文往 markdown 里灌**
      // —— 会在屏幕上闪一下 `{"error":…}`。页面配了 `onRefusal` 就交给它处置。
      // **没配的页面（六爻/梅花）保持原样**（老行为是那段 JSON 会闪一下，401 时由
      // `handleApiUnauthorized` 覆盖掉）—— 引擎不为八字改这两条线的观感。
      if (xhr.status >= 400 && aiHasRefusal()) return;
      var newText = xhr.responseText.substring(fullText.length);
      if (newText) {
        fullText = xhr.responseText;
        if (s.timerId) { clearInterval(s.timerId); s.timerId = 0; }
        respDiv.innerHTML = renderMarkdown(stripTokenTrailer(fullText)) + pointsHtml(fullText);
        resp.scrollTop = resp.scrollHeight;
      }
    };

    xhr.onerror = function() {
      if (s.aborted) return;
      if (fullText) {
        respDiv.innerHTML = renderMarkdown(stripTokenTrailer(fullText)) + pointsHtml(fullText)
          + '<p style="color:#991b1b;font-size:0.75rem;margin-top:0.5rem">⚠ 传输中断，以上为已接收内容</p>';
      } else {
        resp.innerHTML = '<div class="ai-error">❌ 连接失败，请重试</div>';
      }
    };

    xhr.onloadend = function() {
      if (s.timerId) { clearInterval(s.timerId); s.timerId = 0; }
      // 被中途收起而掐掉的那次解析：到此为止。**不渲染、不保存、不置游客标记、不写回记录**
      // —— 用户没看见的东西不该扣他的次数（原来这里一路往下跑，正好相反）。
      if (s.aborted) return;
      if (aiStream === s) aiStream = null;
      showFollowBar();
      var body = document.getElementById('aiPanelBody');
      if (body) setTimeout(function(){ body.scrollTop = body.scrollHeight; }, 100);

      // 非 2xx：先给页面一个机会自己处理（八字那侧要认「游客次数用完，请登录」）。
      // 页面处理了就到这儿为止 —— **不保存、不置「游客已用过」、不渲染正文**。
      if (aiOnRefusal(xhr, respDiv)) return;

      // 401 → 清除错误内容并弹出登录窗口
      if (handleApiUnauthorized(xhr, respDiv)) return;

      // 正文与记账行一起入库存（见 `withPoints`：记录页也要看得到扣了多少积分）。
      // 老行为是「入库只留正文」—— 那时显示端统一抹尾巴，留着也没用；现在显示端
      // 会把尾巴切出来显示，故存它。（原来这里单独写了一次 lastIndexOf。）
      var analysisText = fullText ? withPoints(fullText) : '';
      var recId = aiRecordId();
      if (analysisText && recId) {
        fetch(AIC().recordsPath + '/' + recId + '/ai', {
          method:'PATCH',
          headers:headers,
          body:JSON.stringify({ analysis: analysisText })
        }).catch(function(){});
      }
      if (fullText) {
        var saved = analysisText || fullText;
        aiSetSaved(saved);
        var barBtn = document.getElementById(AIC().barBtnId || '');
        if (barBtn) barBtn.innerHTML = '<span class="ai-icon">☯</span><span>看不懂？试试自动解析</span>';
        var anonUsedKey = AIC().anonUsedKey || '';
        if (!AUTH.isLoggedIn() && anonUsedKey) {
          localStorage.setItem(anonUsedKey, '1');
        }
      }
    };

    var payload = aiPayload();
    xhr.send(JSON.stringify(aiBuildBody(aiTopic(), payload)));

  } catch (e) {
    if (e.name !== 'AbortError') {
      resp.innerHTML = '<div class="ai-error">❌ 解卦失败：'+escHtml(e.message)+'</div>';
    }
  }
}

// ── 这里原来有一个 `autoStartAI()`：「结果出来后自动开始解读，面板直接打开，
// 不等用户再点一次」。2026-09-25 用户拍板**删掉**：「三个的 ai 解析都不要自动开始了，
// 要点击才开始」—— 排完盘就自动发一次请求、扣一次积分，用户没得选。
//
// 两个调用点（`mhys/index.html`、`liuyao/index.html` 的 `showResultHere()`）已一并删掉；
// 实测全站再无调用者，故函数本身也删了 —— 留着一个没人调的函数，下次改自动行为的人
// 会先看见它、以为它还活着。（**别再按老办法加回来**：要自动开始，先问用户。）
//
// ⚠ 与它不同、**保留**的一条路：八字登录回跳
// （`bazi_ai_panel.js` 里 `select(pending, { autoStart: true })`）。那条路上用户
// 已经点过「解读这一方面」，只是中途被登录弹窗打断，回来接着跑 —— 是「接着做」，
// 不是「替他做决定」。别顺手把它也删了。

// overlay 点击关闭（用 JS 监听避免误触）—— 原来写在 result.html 的 checkBar 里，
// 搬到面板自己的文件里：面板在哪一页就在哪一页生效，不必每页各写一次。
(function bindOverlayClose() {
  function bind() {
    var overlay = document.getElementById('aiPanelOverlay');
    if (!overlay) { setTimeout(bind, 100); return; }
    if (overlay.dataset.bound) return;
    overlay.dataset.bound = '1';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeAIPanel();
    });
  }
  if (document.body) bind();
  else document.addEventListener('DOMContentLoaded', bind);
})();

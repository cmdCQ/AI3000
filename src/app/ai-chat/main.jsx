// AI 对话页 —— 忠实搬运自 src/web/js/page-ai-chat.js（1264 行）+ src/web/ai-chat/index.html。
// 阶段 2a：**零行为变更**。不许顺手修的任何东西（extractDigits 的宽松匹配、
// 假 SSE、两支流式实现的不一致收尾）都原样留着，阶段 2b 才动。
//
// ─────────────────────────────────────────────────────────────
// 架构：外壳是 React，消息区是**命令式**的（有意为之）
// ─────────────────────────────────────────────────────────────
// React 负责静态外壳（顶栏 / 空态 / 待发送条 / 输入区 / 分享弹层），
// 消息流本身仍然用老代码那套 document.createElement + innerHTML 往 #msgsArea 里塞。
//
// 为什么消息区不改成 React 列表渲染 —— 有一条硬证据：
//   page-ai-chat.css:144 `.msg { animation: msgIn var(--dur-base) var(--ease-out); }`
//   老代码里流式气泡是**同一个 DOM 节点**：先是 `.msg.msg-ai.streaming`，收尾时
//   就地 `classList.remove('streaming')` + 换 innerHTML。msgIn 因此**只播一次**。
//   若改成 React 渲染列表、收尾时把流式气泡换成 messages 数组里的一条新元素，
//   React 会**新建一个节点** → msgIn 在回答结束时再播一次，肉眼可见的回归。
// 另外 clearHistory 的 `:scope > .msg/.msg-card/.msg-token` 删除、stopStream 的
//   "空才删"、doStreamRender 的节点缓存与 isNearBottom 跟随，全都依赖节点身份。
// 所以这一层保持命令式；等阶段 4 真正重构渲染时再一起改。
//
// 组件内**没有任何 state**，装载后 React 不再重渲染 —— 也就不会和命令式代码抢 DOM。
// ─────────────────────────────────────────────────────────────

import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

import { isLoggedIn, getToken, openAuthModal } from '../lib/auth.js'
import { streamChat } from '../lib/aiStream.js'
import { renderMarkdown } from '../lib/markdown.js'
import { splitPoints, pointsLabel } from '../lib/points.js'
import {
  TRIGRAMS, escHtml, escAttr, renderCard, getCardSummary,
} from '../lib/hexRender.js'
import './style.css'

// ===== 状态 =====
// 与老文件同名的模块级可变状态（page-ai-chat.js:44-49）。
// streamAbort 在老代码里声明了但从未赋值/使用 —— 一并留着，别当成"可以删的死变量"
// 而在阶段 2b 之前动它。
let isSending = false;
let streamAbort = null;
let currentXHR = null;
let allMessages = [];
let pendingCard = null;  // {type:'mhys'|'liuyao', cardData:{...}}

// ===== 初始化 =====
// 老代码挂在 DOMContentLoaded 上（page-ai-chat.js:52）。这里改成"mount 之后立刻调"，
// 时序等价：都在 visual-polish.js 的 boot() 之前，也都在用户可交互之前。
function initPage() {
  // 检查登录状态
  if (!isLoggedIn()) {
    openAuthModal('login');
    return;
  }
  // 首页输入框带来的首句：自动发出去，用户不必再打一遍。
  // 取完立刻删掉 —— 否则刷新一次就会重发。
  var pending = null;
  try {
    pending = sessionStorage.getItem('sqw_pending_ask');
    if (pending) sessionStorage.removeItem('sqw_pending_ask');
  } catch (e) { pending = null; }
  if (pending) {
    var input = document.getElementById('chatInput');
    if (input) {
      input.value = pending;
      if (typeof autoResizeInput === 'function') autoResizeInput(input);
    }
    // 等一帧，确保上面那些渲染函数都已就绪
    setTimeout(function () { sendMessage(); }, 120);
  }
}

// ===== 返回/关闭 =====
function handleBack() {
  // 如果在 iframe 中，通知父窗口关闭
  if (window.parent && window.parent !== window) {
    window.parent.dispatchEvent(new CustomEvent('closeChatOverlay'));
  } else {
    window.location.href = '/';
  }
}

// ===== 渲染消息 =====
// ⚠ 死代码：全文没有调用点（老文件里也没有）。按"忠实搬运"原样保留。
function renderMessages() {
  var area = document.getElementById('msgsArea');
  var empty = document.getElementById('emptyState');
  if (allMessages.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  area.innerHTML = '';
  for (var i = 0; i < allMessages.length; i++) {
    appendMessageDOM(normalizeHistoryMessage(allMessages[i]), false);
  }
  scrollToBottom();
}

// ⚠ 只被上面那个死函数调用，属传导性死代码。原样保留。
function normalizeHistoryMessage(msg) {
  if (!msg || typeof msg !== 'object') return { role:'assistant', content:'', type:'text' };
  var out = Object.assign({}, msg);
  if (typeof out.cardData === 'string') {
    try { out.cardData = JSON.parse(out.cardData); } catch (e) {}
  }
  if (!out.type && out.cardType) out.type = out.cardType;
  if (!out.type && out.cardData) out.type = out.cardData.chartType || out.cardData.type || '';
  if (out.type === 'meihua') out.type = 'mhys';
  if (out.type === 'mingpan') out.type = 'chart';
  if (out.cardData && out.type === 'chart') {
    if (!out.cardData.name && out.cardData.topic) out.cardData.name = out.cardData.topic;
    if (!out.cardData.topic && out.cardData.name) out.cardData.topic = out.cardData.name;
  }
  return out;
}

function appendMessageDOM(msg, animate) {
	var empty = document.getElementById('emptyState');
	if (empty) empty.style.display = 'none';
  var area = document.getElementById('msgsArea');
  if (msg.role === 'user' && msg.type && msg.type !== 'text' && msg.cardData) {
    // Card message - like user-sent bubble
    var div = document.createElement('div');
    div.className = 'msg msg-user' + (animate ? '' : '');
    div.innerHTML = renderCard(msg.type, msg.cardData, msg.content || '', true);
    area.appendChild(div);
    scrollToBottom();
    return;
  }
  if (msg.role === 'user') {
    var div = document.createElement('div');
    div.className = 'msg msg-user' + (animate ? '' : '');
    div.innerHTML = '<div class="msg-bubble">' + escHtml(msg.content || '') + '</div>';
    area.appendChild(div);
    scrollToBottom();
    return;
  }
  if (msg.role === 'assistant') {
    var div = document.createElement('div');
    div.className = 'msg msg-ai' + (animate ? '' : '');
    div.innerHTML = '<div class="msg-bubble">' + renderMarkdown(msg.content || '') + '</div>';
    area.appendChild(div);
    if (msg.tokenInfo) {
      var tokDiv = document.createElement('div');
      tokDiv.className = 'msg-token';
      // 历史消息里存的是旧字「消耗 Token」，显示时统一改称「积分」（存量不迁移）
      tokDiv.textContent = pointsLabel(msg.tokenInfo);
      area.appendChild(tokDiv);
    }
    scrollToBottom();
  }
}

// ===== 发送消息 =====
async function sendMessage() {
  if (isSending) return;
  var input = document.getElementById('chatInput');
  var text = input.value.trim();

  // 获取当前待发送的排盘卡片（如果有）
  var card = pendingCard;

  // 既没有文字也没有待发送卡片 → 不发送
  if (!text && !card) return;

  input.value = '';
  autoResizeInput(input);

  // 清除待发送卡片
  clearPendingCard();

  // 如果有待发送卡片，用户补充文字先显示为单独消息，卡片随后
  if (card) {
    // 补充文字 → 独立气泡在卡片上方
    if (text) {
      var txtMsg = { role: 'user', content: text, type: 'text', createdAt: Date.now() };
      allMessages.push(txtMsg);
      appendMessageDOM(txtMsg, true);
    }
    var cardMsg = { role: 'user', type: card.type, cardData: card.cardData, content: text, createdAt: Date.now() };
    allMessages.push(cardMsg);
    appendMessageDOM(cardMsg, true);
  }

  // 检测数字自动起卦（仅在非卡片模式下）
  if (!card) {
    var digits = extractDigits(text);
    if (digits && digits.length >= 2) {
      // 添加纯文字消息
      var userMsg = { role: 'user', content: text, type: 'text', createdAt: Date.now() };
      allMessages.push(userMsg);
      appendMessageDOM(userMsg, true);
      // 2个数字 → 数字起卦1（加动爻）；3个数字 → 数字起卦2；4+个 → 数字起卦1
      if (digits.length === 3) {
        doAutoDivination(digits[0], digits[1], digits[2], text);
      } else {
        doAutoDivinationNum1(digits, text);
      }
      return;
    }

    // 添加用户消息（正常文字）
    var userMsg = { role: 'user', content: text, type: 'text', createdAt: Date.now() };
    allMessages.push(userMsg);
    appendMessageDOM(userMsg, true);
  }

  // 禁用发送按钮，显示中断按钮
  isSending = true;
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('stopBtn').classList.add('visible');
  // 重置流式渲染状态
  streamFirstRender = true;
  if (streamRenderTimer) { clearTimeout(streamRenderTimer); streamRenderTimer = null; }
  streamDivCache = null;

  // 显示加载中
  var area = document.getElementById('msgsArea');
  var loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg msg-ai thinking';
  loadingDiv.innerHTML =
    '<div class="msg-bubble">' +
      '<span class="ai-spinner"><i></i></span>' +
      '<span class="think-text">' + (card ? '正在解析排盘…' : '正在推演…') + '</span>' +
      '<span class="think-timer"></span>' +
    '</div>';
  loadingDiv.id = 'aiLoading';
  area.appendChild(loadingDiv);
  scrollToBottom();

  try {
    // 构建请求体
    var reqBody = {
      message: text || '',
      cardType: card ? card.type : 'text',
    };
    if (card) reqBody.cardData = card.cardData;

    currentXHR = streamChat({
      body: reqBody,
      onChunk: function (fullText) { updateStreamText(fullText); },
      onLoadEnd: function (xhr, fullText) {
        isSending = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('stopBtn').classList.remove('visible');
        currentXHR = null;

        var loading = document.getElementById('aiLoading');
        if (loading) loading.remove();

        // 401 → 清除错误内容并弹出登录窗口
        // ⚠ 借老全局（src/web/js/auth.js:50 挂的），与 openAuthModal 同一条死期：阶段 4。
        var streamEl401 = document.querySelector('.msg-ai.streaming');
        if (window.handleApiUnauthorized(xhr, streamEl401)) return;

        if (fullText) {
          // 提取 token 信息
          var sp = splitPoints(fullText);
          var tokenInfo = sp.points;
          var aiContent = sp.body;

          // 替换流式 div 为最终消息
          var streamDiv = document.querySelector('.msg-ai.streaming');
          if (streamDiv) {
            streamDiv.classList.remove('streaming');
            streamDiv.innerHTML = '<div class="msg-bubble">' + renderMarkdown(aiContent) + '</div>';
            if (tokenInfo) {
              var tokDiv = document.createElement('div');
              tokDiv.className = 'msg-token';
              tokDiv.textContent = tokenInfo;
              streamDiv.parentNode.insertBefore(tokDiv, streamDiv.nextSibling);
            }
          }

          // 保存到历史
          var aiMsg = { role: 'assistant', content: aiContent, type: 'text', createdAt: Date.now() };
          if (tokenInfo) aiMsg.tokenInfo = tokenInfo;
          allMessages.push(aiMsg);
        }
        scrollToBottom();
      },
      onError: function () {
        isSending = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('stopBtn').classList.remove('visible');
        currentXHR = null;
        var loading = document.getElementById('aiLoading');
        if (loading) loading.remove();
        showError('连接失败，请重试');
      },
    });

  } catch (e) {
    isSending = false;
    document.getElementById('sendBtn').disabled = false;
    var loading = document.getElementById('aiLoading');
    if (loading) loading.remove();
    showError('发送失败：' + e.message);
  }
}

// ===== 流式渲染（首次立即渲染，后续节流 120ms）=====
let streamRenderTimer = null;
let streamPendingText = '';
let streamDivCache = null;
let streamFirstRender = true;

function updateStreamText(text) {
  streamPendingText = text;

  // 首次渲染：立即执行，不节流
  if (streamFirstRender) {
    streamFirstRender = false;
    doStreamRender();
    return;
  }

  // 后续更新：节流 120ms
  if (streamRenderTimer) return;
  streamRenderTimer = setTimeout(doStreamRender, 120);
}

function doStreamRender() {
  streamRenderTimer = null;
  var full = streamPendingText;
  if (!full) return;

  var streamDiv = streamDivCache;
  if (!streamDiv || !document.body.contains(streamDiv)) {
    streamDiv = document.querySelector('.msg-ai.streaming');
    if (!streamDiv) {
      var area = document.getElementById('msgsArea');
      streamDiv = document.createElement('div');
      streamDiv.className = 'msg msg-ai streaming';
      area.appendChild(streamDiv);
    }
    streamDivCache = streamDiv;
  }

  // 去掉记账行再渲染 markdown（尾巴由收尾处切成 `.msg-token` 单独显示）
  var displayText = splitPoints(full).body;

  streamDiv.innerHTML = '<div class="msg-bubble">' + renderMarkdown(displayText) + '</div>';
  // 流式输出中：只在用户位于底部时自动跟随，不强制打断用户阅读
  if (isNearBottom()) scrollToBottom();
}

function showError(msg) {
  var area = document.getElementById('msgsArea');
  var div = document.createElement('div');
  div.className = 'msg msg-ai';
  div.innerHTML = '<div class="msg-bubble msg-error">❌ ' + escHtml(msg) + '</div>';
  area.appendChild(div);
  scrollToBottom();
}

// ===== 发送排盘卡片（预览模式：卡片暂存于输入框上方，用户可补充文字后发送）=====
async function sendCard(type, record) {
  if (isSending) return;

  closeSharePicker();

  // 如果是命盘分享（type=chart），保留兼容但 tab 已移除
  if (type === 'chart') {
    var cardMsg = { role: 'user', type: 'chart', cardData: record, content: '', createdAt: Date.now() };
    allMessages.push(cardMsg);
    var area = document.getElementById('msgsArea');
    var empty = document.getElementById('emptyState');
    if (empty) empty.style.display = 'none';
    var cardDiv = document.createElement('div');
    cardDiv.className = 'msg msg-user';
    cardDiv.innerHTML = renderCard('chart', record, '', true);
    area.appendChild(cardDiv);
    scrollToBottom();
    if (typeof showErrorToast === 'function') showErrorToast('📤 命盘已分享到对话');
    return;
  }

  // 获取完整记录
  var fullData;
  try {
    var apiPath = type === 'mhys' ? '/api/mhys-records/' + record.id : '/api/liuyao-records/' + record.id;
    var resp = await fetch(apiPath, {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    if (!resp.ok) { showError('获取排盘详情失败'); return; }
    fullData = await resp.json();
  } catch (e) { showError('获取排盘详情失败'); return; }

  var resultData;
  try {
    resultData = typeof fullData.result_data === 'string' ? JSON.parse(fullData.result_data) : fullData.result_data;
  } catch(e) { showError('排盘数据解析失败'); return; }

  // 构建卡片数据
  var cardData = {
    topic: fullData.topic || '',
    divinationTime: resultData.divinationTime || '',
    method: resultData.method || fullData.method || '',
    gender: resultData.gender || '',
  };

  if (type === 'mhys') {
    cardData.hexagrams = resultData.gua || resultData.hexagrams;
    if (!cardData.hexagrams && resultData.result && resultData.result.gua) {
      cardData.hexagrams = resultData.result.gua;
    }
    // 修复 hexagrams 结构
    var hx = cardData.hexagrams;
    if (hx && hx.benGua) {
      // 确保有 upperTri/lowerTri
      var guas = ['benGua','huGua','bianGua','cuoGua','zongGua'];
      for (var gi = 0; gi < guas.length; gi++) {
        var gk = guas[gi], g = hx[gk];
        if (g && !g.upperTri && g.upper) g.upperTri = TRIGRAMS[String(g.upper)] || {name:'',symbol:''};
        if (g && !g.lowerTri && g.lower) g.lowerTri = TRIGRAMS[String(g.lower)] || {name:'',symbol:''};
        if (g && !g.name && g.upperTri && g.lowerTri) g.name = (g.upperTri.name||'')+(g.lowerTri.name||'');
      }
    }
  }

  if (type === 'liuyao') {
    cardData.hexagrams = resultData.gua || resultData.hexagrams;
    if (!cardData.hexagrams && resultData.result && resultData.result.gua) {
      cardData.hexagrams = resultData.result.gua;
    }
    var hx = cardData.hexagrams;
    if (hx && hx.benGua) {
      var guas = ['benGua','bianGua'];
      for (var gi = 0; gi < guas.length; gi++) {
        var gk = guas[gi], g = hx[gk];
        if (g && !g.upperTri && g.upper) g.upperTri = TRIGRAMS[String(g.upper)] || {name:'',symbol:''};
        if (g && !g.lowerTri && g.lower) g.lowerTri = TRIGRAMS[String(g.lower)] || {name:'',symbol:''};
      }
    }
  }

  // 设置为待发送卡片（预览模式），暂存于输入框上方
  pendingCard = { type: type, cardData: cardData };
  renderPendingCard();
}

// ===== 待发送卡片预览 =====
function renderPendingCard() {
  var bar = document.getElementById('pendingCardBar');
  var content = document.getElementById('pendingCardContent');
  if (!bar || !content) return;

  if (!pendingCard) {
    bar.style.display = 'none';
    return;
  }

  var type = pendingCard.type;
  var cardData = pendingCard.cardData;
  var icon = type === 'mhys' ? '🌸' : '🪙';
  var label = type === 'mhys' ? '梅花易数' : '六爻';
  var summary = getCardSummary(type, cardData);

  content.innerHTML = '<div class="pcard-label">📤 待发送 · ' + icon + ' ' + label + '</div>' +
    '<div class="pcard-title">' + escHtml(cardData.topic || '未命名') + '</div>' +
    '<div class="pcard-meta">' + escHtml(summary.time || '') + (summary.time && summary.essence ? ' · ' : '') + escHtml(summary.essence || '') + '</div>';

  bar.style.display = 'flex';
  // 聚焦输入框方便用户补充文字
  document.getElementById('chatInput').focus();
}

function clearPendingCard() {
  pendingCard = null;
  var bar = document.getElementById('pendingCardBar');
  if (bar) bar.style.display = 'none';
}

// ===== 分享排盘选择器 =====
let pickerType = 'mhys';

function openSharePicker() {
  document.getElementById('pickerOverlay').classList.add('open');
  document.getElementById('pickerPanel').classList.add('open');
  // 从 sessionStorage 恢复上次选择的 tab（比全局变量更可靠）
  var savedType = sessionStorage.getItem('sqw_pickerType');
  if (savedType && ['mhys','liuyao'].indexOf(savedType) !== -1) {
    pickerType = savedType;
  }
  // 更新 tab 高亮
  document.querySelectorAll('.picker-tab').forEach(function(t){
    t.classList.toggle('active', t.dataset.type === pickerType);
  });
  // 加载数据
  loadPickerData(pickerType);
}

// ===== 快速起卦 =====

// 从 picker 安全触发 sendCard（替代内联 onclick JSON.stringify）
function sendCardFromPicker(el) {
  try {
    var type = el.dataset.type;
    var item = JSON.parse(el.dataset.item);
    sendCard(type, item);
  } catch(e) { showError('数据解析失败'); }
}

function calcQuickGuaData(upper, lower, move) {
  var upTri = TRIGRAMS[String(upper)] || {name:'?',symbol:'?'};
  var loTri = TRIGRAMS[String(lower)] || {name:'?',symbol:'?'};
  var hexName = getHexagramName(upper, lower);

  // 互卦：本卦中间四爻
  var allLines = [
    triToLinesArr(upper)[2], triToLinesArr(upper)[1], triToLinesArr(upper)[0],
    triToLinesArr(lower)[2], triToLinesArr(lower)[1], triToLinesArr(lower)[0]
  ];
  var huUpper = linesToTriNum([allLines[1], allLines[2], allLines[3]]);  // 4-6爻
  var huLower = linesToTriNum([allLines[2], allLines[3], allLines[4]]);  // 3-5爻… 不对，互卦是2-4,3-5
  // 互卦是234爻为下卦，345爻为上卦 (linesToTriNum 期望 [bottom,mid,top])
  var huUpper2 = linesToTriNum([allLines[3], allLines[2], allLines[1]]);
  var huLower2 = linesToTriNum([allLines[4], allLines[3], allLines[2]]);

  // 错卦：全部阴阳互换
  var cuoLines = allLines.map(function(l){ return l === 1 ? 0 : 1; });
  var cuoUpper = linesToTriNum([cuoLines[2], cuoLines[1], cuoLines[0]]);
  var cuoLower = linesToTriNum([cuoLines[5], cuoLines[4], cuoLines[3]]);

  // 综卦：上下颠倒
  var zongLines = allLines.slice().reverse();
  var zongUpper = linesToTriNum([zongLines[2], zongLines[1], zongLines[0]]);
  var zongLower = linesToTriNum([zongLines[5], zongLines[4], zongLines[3]]);

  return {
    benGua: {
      upper: upper, lower: lower,
      name: hexName,
      upperTri: upTri, lowerTri: loTri,
      movingYao: [move]
    },
    huGua: {
      upper: huUpper2, lower: huLower2,
      name: getHexagramName(huUpper2, huLower2),
      upperTri: TRIGRAMS[String(huUpper2)] || {name:'?',symbol:'?'},
      lowerTri: TRIGRAMS[String(huLower2)] || {name:'?',symbol:'?'}
    },
    bianGua: {},
    cuoGua: {
      upper: cuoUpper, lower: cuoLower,
      name: getHexagramName(cuoUpper, cuoLower),
      upperTri: TRIGRAMS[String(cuoUpper)] || {name:'?',symbol:'?'},
      lowerTri: TRIGRAMS[String(cuoLower)] || {name:'?',symbol:'?'}
    },
    zongGua: {
      upper: zongUpper, lower: zongLower,
      name: getHexagramName(zongUpper, zongLower),
      upperTri: TRIGRAMS[String(zongUpper)] || {name:'?',symbol:'?'},
      lowerTri: TRIGRAMS[String(zongLower)] || {name:'?',symbol:'?'}
    },
    ti: (function(){ var ty=calcTiYong(upper,lower,move); return { tri: ty.ti }; })(),
    yong: (function(){ var ty=calcTiYong(upper,lower,move); return { tri: ty.yong }; })(),
    verdict: (function(){ var ty=calcTiYong(upper,lower,move); return ty.verdict; })()
  };
}

function calcTiYong(upper, lower, move) {
  // 体卦：不动之卦（动爻所在的三画卦为用）
  // move 1-3：下卦动，体为上卦；move 4-6：上卦动，体为下卦
  var isUpperMove = move >= 4;
  var tiTri = isUpperMove ? lower : upper;
  var yongTri = isUpperMove ? upper : lower;
  var tiT = TRIGRAMS[String(tiTri)] || {name:'?',symbol:'?',element:'?'};
  var yoN = TRIGRAMS[String(yongTri)] || {name:'?',symbol:'?',element:'?'};

  var wx = {1:'金',2:'金',3:'火',4:'木',5:'木',6:'水',7:'土',8:'土'};
  tiT.element = wx[tiTri] || '?';
  yoN.element = wx[yongTri] || '?';

  var sheng = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  var ke = {木:'土',土:'水',水:'火',火:'金',金:'木'};

  var txt, dsc;
  if (sheng[tiT.element] === yoN.element) { txt='体生用'; dsc='我去主动促成事情发展，但也意味着需要付出精力。'; }
  else if (sheng[yoN.element] === tiT.element) { txt='用生体'; dsc='事情发展有利，不必太费心力就有收获。'; }
  else if (ke[tiT.element] === yoN.element) { txt='体克用'; dsc='问题在可控范围内，花些功夫就能解决。'; }
  else if (ke[yoN.element] === tiT.element) { txt='用克体'; dsc='外部阻力较大，需要谨慎应对。'; }
  else { txt='体用比和'; dsc='内外一致，诸事顺利。'; }
  return { ti: tiT, yong: yoN, verdict: { text: txt, cls: '', desc: dsc } };
}

function triToLinesArr(n) {
  var m = {'1':[1,1,1],'2':[1,1,0],'3':[1,0,1],'4':[1,0,0],'5':[0,1,1],'6':[0,1,0],'7':[0,0,1],'8':[0,0,0]};
  return m[String(n)] || [0,0,0];
}

function linesToTriNum(lines) {
  var k = lines.join('');
  var m = {'111':1,'110':2,'101':3,'100':4,'011':5,'010':6,'001':7,'000':8};
  return m[k] || 8;
}

function getHexagramName(upper, lower) {
  var names = [
    ['乾为天','泽天夬','火天大有','雷天大壮','风天小畜','水天需','山天大畜','地天泰'],
    ['天泽履','兑为泽','火泽睽','雷泽归妹','风泽中孚','水泽节','山泽损','地泽临'],
    ['天火同人','泽火革','离为火','雷火丰','风火家人','水火既济','山火贲','地火明夷'],
    ['天雷无妄','泽雷随','火雷噬嗑','震为雷','风雷益','水雷屯','山雷颐','地雷复'],
    ['天风姤','泽风大过','火风鼎','雷风恒','巽为风','水风井','山风蛊','地风升'],
    ['天水讼','泽水困','火水未济','雷水解','风水涣','坎为水','山水蒙','地水师'],
    ['天山遁','泽山咸','火山旅','雷山小过','风山渐','水山蹇','艮为山','地山谦'],
    ['天地否','泽地萃','火地晋','雷地豫','风地观','水地比','山地剥','坤为地']
  ];
  return (names[lower-1] && names[lower-1][upper-1]) || (TRIGRAMS[String(upper)] && TRIGRAMS[String(lower)] ? TRIGRAMS[String(upper)].name + TRIGRAMS[String(lower)].name : '未知');
}

function showErrorToast(msg) {
  var el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position:'fixed', bottom:'6rem', left:'50%', transform:'translateX(-50%)',
    background:'rgba(0,0,0,0.75)', color:'#fff', padding:'0.5rem 1rem',
    borderRadius:'8px', fontSize:'0.78rem', zIndex:'300',
    maxWidth:'360px', textAlign:'center', lineHeight:'1.5',
    animation:'fadeIn 0.2s'
  });
  document.body.appendChild(el);
  setTimeout(function(){ el.remove(); }, 2500);
}

function closeSharePicker() {
  document.getElementById('pickerOverlay').classList.remove('open');
  document.getElementById('pickerPanel').classList.remove('open');
}

function switchPickerTab(type) {
  pickerType = type;
  sessionStorage.setItem('sqw_pickerType', type);
  document.querySelectorAll('.picker-tab').forEach(function(t){
    t.classList.toggle('active', t.dataset.type === type);
  });
  loadPickerData(type);
}

function loadPickerData(type) {
  var body = document.getElementById('pickerBody');
  body.innerHTML = '<div class="picker-loading"><div class="pk-spinner"></div><div>加载中…</div></div>';

  var apiPath;
  if (type === 'mhys') apiPath = '/api/mhys-records';
  else if (type === 'liuyao') apiPath = '/api/liuyao-records';
  else apiPath = '/api/charts';

  fetch(apiPath, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    var list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      body.innerHTML = '<div class="picker-empty">暂无记录</div>';
      return;
    }
    var h = '';
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var icon = type === 'mhys' ? '🌸' : (type === 'liuyao' ? '🪙' : '🔮');
      var topic = item.topic || item.name || '未命名';
      var meta = '';
      if (item.divinationTime) meta = item.divinationTime;
      else if (item.created_at) meta = new Date(item.created_at).toLocaleString('zh-CN');
      else if (item.birthYear) meta = item.birthYear + '年' + (item.birthMonth||'') + '月';
	      h += '<div class="picker-item" data-type="' + escAttr(type) + '" data-item="' + escAttr(JSON.stringify(item)) + '" onclick="sendCardFromPicker(this)">';
      h += '<span class="pi-icon">' + icon + '</span>';
      h += '<div class="pi-body"><div class="pi-topic">' + escHtml(topic) + '</div>';
      h += '<div class="pi-meta">' + escHtml(meta) + '</div></div></div>';
    }
    body.innerHTML = h;
  })
  .catch(function(){
    body.innerHTML = '<div class="picker-empty">加载失败</div>';
  });
}

// ===== 清空历史 =====
function clearHistory() {
  if (allMessages.length === 0) return;
  if (!confirm('确定清空所有对话历史？')) return;
  // 中断正在进行的请求
  if (currentXHR) { currentXHR.abort(); currentXHR = null; }
  isSending = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('stopBtn').classList.remove('visible');
  // 立即清空前端界面，不等后端响应
  allMessages = [];
  var area = document.getElementById('msgsArea');
  var empty = document.getElementById('emptyState');
  // 只移除消息元素，保留 emptyState
  area.querySelectorAll(':scope > .msg, :scope > .msg-card, :scope > .msg-token').forEach(function(el) { el.remove(); });
  if (empty) { empty.style.display = 'block'; }
  scrollToBottom();
  // 后端异步清空
  fetch('/api/chat/history', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + getToken() }
  }).catch(function(){});
  // 重置流式渲染状态
  streamFirstRender = true;
  if (streamRenderTimer) { clearTimeout(streamRenderTimer); streamRenderTimer = null; }
  streamDivCache = null;
  isSending = false;
  document.getElementById('sendBtn').disabled = false;
}

// ===== 工具函数 =====
// ===== 中断输出 =====
function stopStream() {
  if (currentXHR) {
    currentXHR.abort();
    currentXHR = null;
  }
  isSending = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('stopBtn').classList.remove('visible');
  var loading = document.getElementById('aiLoading');
  if (loading) loading.remove();
  var streamDiv = document.querySelector('.msg-ai.streaming');
  if (streamDiv) {
    streamDiv.classList.remove('streaming');
    if (!streamDiv.textContent.trim()) streamDiv.remove();
  }
  streamFirstRender = true;
  if (streamRenderTimer) { clearTimeout(streamRenderTimer); streamRenderTimer = null; }
  streamDivCache = null;
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// 判断用户是否在消息区域底部附近（50px 容差）
function isNearBottom() {
  var area = document.getElementById('msgsArea');
  if (!area) return true;
  return area.scrollHeight - area.scrollTop - area.clientHeight < 80;
}

function scrollToBottom(force) {
  if (window._scrollRaf) cancelAnimationFrame(window._scrollRaf);
  window._scrollRaf = requestAnimationFrame(function(){
    window._scrollRaf = null;
    var area = document.getElementById('msgsArea');
    if (!area) return;
    // 如果用户手动划上去了，不强制滚动（除非 force=true）
    if (!force && !isNearBottom()) return;
    area.scrollTop = area.scrollHeight;
  });
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ===== 自动起卦（检测用户消息中的三个数字）=====

function getShichenNum() {
  var h = new Date().getHours();
  if (h >= 23 || h < 1) return 1;
  if (h < 3) return 2;
  if (h < 5) return 3;
  if (h < 7) return 4;
  if (h < 9) return 5;
  if (h < 11) return 6;
  if (h < 13) return 7;
  if (h < 15) return 8;
  if (h < 17) return 9;
  if (h < 19) return 10;
  if (h < 21) return 11;
  return 12;
}

// 从消息中检测三个数字（1-9），返回 [n1,n2,n3] 或 null
// ⚠ 这个实现是出了名的宽松：strip 掉所有非数字后逐位拆开，只要有 >=2 位就返回，
//   所以「我今年 35 岁」会直接自动起卦。**阶段 2a 刻意原样保留**，2b 再改。
function extractDigits(text) {
  // 提取所有连续数字字符
  var digits = text.replace(/[^0-9]/g, '').split('').map(Number).filter(function(n){ return !isNaN(n); });
  if (digits.length >= 2) return digits;
  return null;
}

// 发送排盘卡片给 AI 解析（数字起卦 1 & 2 共用）
// ⚠ 两处与 sendMessage 的**不一致**是既存事实，忠实地留着：
//   · 加载文案是「正在解卦…」
//   · onloadend 里**没有**复位 #stopBtn（也没有 onerror、没有 try/catch）
//   · **不设 currentXHR** → 这条路径上点「中断输出」其实 abort 不掉（currentXHR 为 null）
function sendDivinationCard(cardData, userText) {
  var cardMsg = { role: 'user', type: 'mhys', cardData: cardData, content: '', createdAt: Date.now() };
  allMessages.push(cardMsg);

  document.getElementById('emptyState').style.display = 'none';
  var area = document.getElementById('msgsArea');
  var cardDiv = document.createElement('div');
  cardDiv.className = 'msg msg-user';
  cardDiv.innerHTML = renderCard('mhys', cardData, '', true);
  area.appendChild(cardDiv);
  scrollToBottom();

  // 发送给 AI 解析
  isSending = true;
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('stopBtn').classList.add('visible');
  streamFirstRender = true;
  if (streamRenderTimer) { clearTimeout(streamRenderTimer); streamRenderTimer = null; }
  streamDivCache = null;

  var loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg msg-ai thinking';
  loadingDiv.innerHTML =
    '<div class="msg-bubble">' +
      '<span class="ai-spinner"><i></i></span>' +
      '<span class="think-text">正在解卦…</span>' +
      '<span class="think-timer"></span>' +
    '</div>';
  loadingDiv.id = 'aiLoading';
  area.appendChild(loadingDiv);
  scrollToBottom();

  streamChat({
    body: { message: userText || '', cardType: 'mhys', cardData: cardData },
    onChunk: function (fullText) { updateStreamText(fullText); },
    onLoadEnd: function (xhr, fullText) {
      isSending = false;
      document.getElementById('sendBtn').disabled = false;
      var loading = document.getElementById('aiLoading');
      if (loading) loading.remove();

      // 401 → 清除错误内容并弹出登录窗口
      // ⚠ 借老全局（src/web/js/auth.js:50 挂的），与 openAuthModal 同一条死期：阶段 4。
      var streamEl401 = document.querySelector('.msg-ai.streaming');
      if (window.handleApiUnauthorized(xhr, streamEl401)) return;

      if (fullText) {
        var sp = splitPoints(fullText);
        var tokenInfo = sp.points;
        var aiContent = sp.body;
        var streamDiv = document.querySelector('.msg-ai.streaming');
        if (streamDiv) {
          streamDiv.classList.remove('streaming');
          streamDiv.innerHTML = '<div class="msg-bubble">' + renderMarkdown(aiContent) + '</div>';
          if (tokenInfo) {
            var tokDiv = document.createElement('div');
            tokDiv.className = 'msg-token';
            tokDiv.textContent = tokenInfo;
            streamDiv.parentNode.insertBefore(tokDiv, streamDiv.nextSibling);
          }
        }
        var aiMsg = { role: 'assistant', content: aiContent, type: 'text', createdAt: Date.now() };
        if (tokenInfo) aiMsg.tokenInfo = tokenInfo;
        allMessages.push(aiMsg);
      }
      scrollToBottom();
    },
  });
}

// 数字起卦1：任意位数，前后半求和作为上下卦，动爻=上+下（+时辰）
function doAutoDivinationNum1(digits, userText) {
  var half = Math.floor(digits.length / 2);
  var firstHalf = digits.slice(0, half);
  var secondHalf = digits.slice(half);
  var sum1 = firstHalf.reduce(function(a,b){return a+b;}, 0);
  var sum2 = secondHalf.reduce(function(a,b){return a+b;}, 0);
  var upper = sum1 % 8; if (upper === 0) upper = 8;
  var lower = sum2 % 8; if (lower === 0) lower = 8;
  var moveRaw = upper + lower + getShichenNum();
  var move = moveRaw % 6; if (move === 0) move = 6;

  var hexData = calcQuickGuaData(upper, lower, move);

  // 计算变卦
  var upLines = triToLinesArr(upper);
  var loLines = triToLinesArr(lower);
  var all = [upLines[2], upLines[1], upLines[0], loLines[2], loLines[1], loLines[0]];
  var moveIdx = 6 - move;
  all[moveIdx] = all[moveIdx] === 1 ? 0 : 1;
  var newUpper = linesToTriNum([all[2], all[1], all[0]]);
  var newLower = linesToTriNum([all[5], all[4], all[3]]);

  hexData.bianGua = {
    upper: newUpper, lower: newLower,
    name: getHexagramName(newUpper, newLower),
    upperTri: TRIGRAMS[String(newUpper)] || {name:'?',symbol:'?'},
    lowerTri: TRIGRAMS[String(newLower)] || {name:'?',symbol:'?'}
  };

  // 从用户原文提取求测事项
  var topic = '起卦：' + upper + ' ' + lower + ' (数字' + digits.length + '位)';
  if (userText) {
    var cleanTopic = userText.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    if (cleanTopic) topic = cleanTopic;
  }

  var cardData = {
    topic: topic,
    divinationTime: new Date().toLocaleString('zh-CN'),
    method: '数字起卦1',
    hexagrams: hexData
  };

  sendDivinationCard(cardData, userText);
}

// 数字起卦2：三位数字，n1=上卦 n2=下卦 n3=动爻（+时辰）
function doAutoDivination(n1, n2, n3, userText) {
  var upper = n1 % 8; if (upper === 0) upper = 8;
  var lower = n2 % 8; if (lower === 0) lower = 8;
  var moveRaw = n3;
  moveRaw += getShichenNum();
  var move = moveRaw % 6; if (move === 0) move = 6;

  var hexData = calcQuickGuaData(upper, lower, move);

  // 计算变卦
  var upLines = triToLinesArr(upper);
  var loLines = triToLinesArr(lower);
  var all = [upLines[2], upLines[1], upLines[0], loLines[2], loLines[1], loLines[0]];
  var moveIdx = 6 - move;
  all[moveIdx] = all[moveIdx] === 1 ? 0 : 1;
  var newUpper = linesToTriNum([all[2], all[1], all[0]]);
  var newLower = linesToTriNum([all[5], all[4], all[3]]);

  hexData.bianGua = {
    upper: newUpper, lower: newLower,
    name: getHexagramName(newUpper, newLower),
    upperTri: TRIGRAMS[String(newUpper)] || {name:'?',symbol:'?'},
    lowerTri: TRIGRAMS[String(newLower)] || {name:'?',symbol:'?'}
  };

  // 从用户原文提取求测事项：去掉数字，保留文字
  var topic = '起卦：' + n1 + ' ' + n2 + ' ' + n3;
  if (userText) {
    var cleanTopic = userText.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
    if (cleanTopic) topic = cleanTopic;
  }

  var cardData = {
    topic: topic,
    divinationTime: new Date().toLocaleString('zh-CN'),
    method: '数字起卦2',
    hexagrams: hexData
  };

  sendDivinationCard(cardData, userText);
}

// ===== React 外壳 =====
// 只有静态结构；动态内容全部由上面的命令式代码写进对应容器。
// 老 HTML 里的内联 onclick 在这里换成 React 事件处理器（行为相同，只是 DOM 上
// 不再有 onclick 属性）；**HTML 字符串里**那些内联 onclick 保持原样，因此
// sendCardFromPicker / showErrorToast 必须挂在 window 上（见文件末尾）。
function AiChatPage() {
  return (
    <>
      <div className="chat-app">

        {/* Top Bar */}
        <div className="chat-topbar">
          <button className="back-btn" id="backBtn" onClick={handleBack}>←</button>
          <span className="title">AI 对话</span>
          <button className="clear-btn" id="clearBtn" onClick={clearHistory}>清空</button>
        </div>

        {/* Messages */}
        <div className="msgs-area" id="msgsArea">
          <div className="msgs-empty" id="emptyState">
            <div className="empty-icon">💬</div>
            <div className="empty-title">开始对话</div>
            <div className="empty-desc">可以直接提问命理问题<br />或点击下方「分享排盘」发送排盘记录</div>
          </div>
        </div>

        {/* Pending Card Preview */}
        <div className="pending-card-bar" id="pendingCardBar" style={{ display: 'none' }}>
          <div className="pcard-content" id="pendingCardContent"></div>
          <button className="pcard-remove" onClick={clearPendingCard}>✕</button>
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-share-bar">
            <button className="input-share-btn" onClick={openSharePicker}><span className="share-icon">📤</span> 分享排盘</button>
          </div>
          <div className="input-row">
            <textarea
              id="chatInput" rows="1" placeholder="输入消息…" maxLength={2000}
              onKeyDown={onInputKeydown}
              onInput={function (e) { autoResizeInput(e.target); }}
            ></textarea>
            <button className="input-stop-btn" id="stopBtn" onClick={stopStream} title="中断输出">■</button>
            <button className="input-send-btn" id="sendBtn" onClick={sendMessage}>➤</button>
          </div>
        </div>

      </div>

      {/* Share Picker Overlay */}
      <div className="picker-overlay" id="pickerOverlay" onClick={closeSharePicker}></div>
      <div className="picker-panel" id="pickerPanel">
        <div className="picker-hdr">
          <span>📤 分享到对话</span>
          <button className="picker-close" onClick={closeSharePicker}>✕</button>
        </div>
        <div className="picker-tabs">
          <button className="picker-tab active" data-type="mhys" onClick={function () { switchPickerTab('mhys'); }}>🌸 梅花易数</button>
          <button className="picker-tab" data-type="liuyao" onClick={function () { switchPickerTab('liuyao'); }}>🪙 六爻</button>
        </div>
        <div className="picker-body" id="pickerBody">
          <div className="picker-loading"><div className="pk-spinner"></div><div>加载中…</div></div>
        </div>
      </div>
    </>
  );
}

// ===== 挂载 =====
// 用 flushSync 把首次提交做成**同步**的，这不是性能考虑，是正确性：
// visual-polish.js 的 boot()（它挂在 DOMContentLoaded 上）第一件事就是
// `document.getElementById('msgsArea')`，读不到就**直接 return 且不报错** ——
// 于是等待态的计时与阶段文案会静默失效。React 的并发渲染不保证在
// DOMContentLoaded 之前提交，同步提交才排得掉这个竞态。
const root = createRoot(document.getElementById('root'));
flushSync(function () {
  root.render(<AiChatPage />);
});

// 页面初始化（老代码挂在 DOMContentLoaded 上；此处此时机等价且更早）
initPage();

// ===== 必须挂在 window 上的两个名字（内联 HTML 里引用它们）=====
// 1) sendCardFromPicker —— loadPickerData 生成的条目里写死了
//    `onclick="sendCardFromPicker(this)"`。老页面是传统 script，顶层函数天然全局；
//    ESM 里不是，必须显式挂，否则**点分享列表里的任何一条都毫无反应**。
window.sendCardFromPicker = sendCardFromPicker;
// 2) showErrorToast —— visual-polish.js:62 会
//    `typeof window.showErrorToast === 'function'` 后再调（等待超过 60s 时提示
//    「等待时间较长，可点击 ■ 中断后重试」）。不挂，那句提示永远不会出现。
window.showErrorToast = showErrorToast;

// 卡片/卦象的 HTML 字符串生成器 —— 逐字取自 src/web/js/page-ai-chat.js。
// 全是纯字符串拼装（只有 escHtml 用了一次 DOM 做转义），**输出必须逐字节一致**：
// 这些串会直接进 innerHTML，改一个 class 名或空格就会改掉线上渲染。
//
// 行号来源（原文件 page-ai-chat.js）：
//   TRIGRAMS                     :2-6
//   renderCard                   :157-173   （父任务清单漏了这个，但它是必需的）
//   getCardIcon / getCardLabel   :175-186
//   renderCardInner              :188-206
//   renderHexMini                :208-213
//   renderMhysHexMiniInline      :216-237
//   renderLiuyaoHexMiniInline    :240-260
//   getCardSummary               :262-269
//   getMhysEssence               :271-282
//   getLiuyaoEssence             :284-294
//   getChartTime                 :296-299
//   getChartEssence              :301-308
//   renderMhysHex                :310-333   （死代码，照样搬）
//   renderLiuyaoHex              :335-362   （死代码，照样搬）
//   escHtml / escAttr            :961-968
//
// 注意 escHtml 里 `if (!s) return ''` 的 falsy 短路是有意义的行为
// （0 / '' / null 都返回空串），不是可以"顺手改成 String(s)"的东西。

// ===== 八卦/六爻帮助函数 =====
export const TRIGRAMS = {
  1:{name:'乾',symbol:'☰'},2:{name:'兑',symbol:'☱'},3:{name:'离',symbol:'☲'},
  4:{name:'震',symbol:'☳'},5:{name:'巽',symbol:'☴'},6:{name:'坎',symbol:'☵'},
  7:{name:'艮',symbol:'☶'},8:{name:'坤',symbol:'☷'}
};

export function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

export function renderCard(type, cardData, userText, asBubble) {
  if (asBubble) {
    var bubbleH = '<div style="background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:14px 14px 4px 14px;padding:0.56rem 0.7rem;font-size:0.8rem;line-height:1.6;max-width:100%;text-align:left;box-shadow:0 1px 3px rgba(0,0,0,0.04)">';
    bubbleH += renderCardInner(type, cardData, userText);
    bubbleH += '</div>';
    return bubbleH;
  }
  var h = '<div class="card-box">';
  h += '<div class="card-hdr"><span class="card-type-icon">' + getCardIcon(type) + '</span><span class="card-type-label">' + getCardLabel(type) + '</span></div>';
  h += '<div class="card-body">';
  var summary = getCardSummary(type, cardData);
  if (summary.time) h += '<div class="card-meta"><span>🕐 ' + escHtml(summary.time) + '</span></div>';
  h += renderHexMini(type, cardData);
  h += '<div class="card-essence"><div class="essence-label">卦象内容</div><div class="essence-value">' + escHtml(summary.essence || '暂无卦象内容') + '</div></div>';
  h += '</div></div>';
  return h;
}

export function getCardIcon(type) {
  if (type === 'mhys') return '🌸';
  if (type === 'liuyao') return '🪙';
  if (type === 'chart') return '🔮';
  return '📖';
}
export function getCardLabel(type) {
  if (type === 'mhys') return '梅花易数';
  if (type === 'liuyao') return '六爻';
  if (type === 'chart') return '命盘';
  return '排盘';
}

export function renderCardInner(type, cardData, userText) {
  var icon = getCardIcon(type), label = getCardLabel(type);
  var summary = getCardSummary(type, cardData);

  // 顶行：图标 + 类型 + 时间
  var h = '<div style="display:flex;align-items:center;gap:0.3rem;margin-bottom:0.3rem">';
  h += '<span style="font-size:0.85rem">' + icon + '</span>';
  h += '<span style="font-family:var(--serif);font-size:0.74rem;font-weight:600;color:var(--accent);letter-spacing:0.04em">' + label + '</span>';
  if (summary.time) h += '<span style="margin-left:auto;font-size:0.6rem;color:var(--text-muted)">' + escHtml(summary.time) + '</span>';
  h += '</div>';

  // 卦象缩略图
  h += renderHexMini(type, cardData);

  // 摘要文字
  h += '<div style="font-size:0.76rem;color:var(--text);line-height:1.55;margin-top:0.25rem">' + escHtml(summary.essence || cardData.topic || '') + '</div>';

  return h;
}

export function renderHexMini(type, cardData) {
  if (!cardData || !cardData.hexagrams) return '';
  if (type === 'mhys') return renderMhysHexMiniInline(cardData.hexagrams);
  if (type === 'liuyao') return renderLiuyaoHexMiniInline(cardData.hexagrams);
  return '';
}

// 梅花易数迷你五卦行内版（比原版更紧凑）
export function renderMhysHexMiniInline(g) {
  function triLines(n) { var m={'1':[1,1,1],'2':[1,1,0],'3':[1,0,1],'4':[1,0,0],'5':[0,1,1],'6':[0,1,0],'7':[0,0,1],'8':[0,0,0]}; return m[String(n)]||[0,0,0]; }
  var guas = [{key:'本',g:g.benGua},{key:'互',g:g.huGua},{key:'变',g:g.bianGua},{key:'错',g:g.cuoGua},{key:'综',g:g.zongGua}];
  var h = '<div style="display:flex;gap:0;margin:0.25rem 0;border:1px solid var(--border);border-radius:6px;overflow:hidden;font-size:0.6rem">';
  for (var i = 0; i < guas.length; i++) {
    var gg = guas[i].g;
    if (!gg) continue;
    var up = triLines(gg.upper), lo = triLines(gg.lower);
    var allLines = [up[2],up[1],up[0],lo[2],lo[1],lo[0]];
    h += '<div style="flex:1;text-align:center;padding:0.2rem 0.1rem;border-right:1px solid var(--border)">';
    h += '<div style="font-size:0.52rem;color:var(--text-muted);margin-bottom:0.1rem">' + guas[i].key + '</div>';
    h += '<div style="display:flex;flex-direction:column;align-items:center;gap:1px">';
    for (var li = 0; li < 6; li++) {
      h += '<div style="height:2px;border-radius:1px;' + (allLines[li] ? 'width:18px;background:var(--text)' : 'display:flex;gap:3px') + '">';
      if (!allLines[li]) h += '<span style="width:6px;height:2px;background:var(--text);border-radius:1px;display:block"></span><span style="width:6px;height:2px;background:var(--text);border-radius:1px;display:block"></span>';
      h += '</div>';
    }
    h += '</div><div style="font-family:var(--serif);font-weight:600;font-size:0.6rem;color:var(--text);margin-top:0.08rem">' + (gg.name||'') + '</div></div>';
  }
  h += '</div>';
  return h;
}

// 六爻双列行内版
export function renderLiuyaoHexMiniInline(g) {
  if (!g.benGua) return '';
  var ben = g.benGua, bian = g.bianGua;
  function triLines(n) { var m={'1':[1,1,1],'2':[1,1,0],'3':[1,0,1],'4':[1,0,0],'5':[0,1,1],'6':[0,1,0],'7':[0,0,1],'8':[0,0,0]}; return m[String(n)]||[0,0,0]; }
  var l1 = triLines(ben.upper).concat(triLines(ben.lower));
  l1 = [l1[2],l1[1],l1[0],l1[5],l1[4],l1[3]];
  var l2 = bian && bian.upper ? triLines(bian.upper).concat(triLines(bian.lower)) : null;
  if (l2) l2 = [l2[2],l2[1],l2[0],l2[5],l2[4],l2[3]];
  function bar(y) { return y ? '<span style="display:inline-block;width:14px;height:2px;background:var(--text);border-radius:1px"></span>' : '<span style="display:inline-flex;gap:3px"><i style="display:block;width:5px;height:2px;background:var(--text);border-radius:1px"></i><i style="display:block;width:5px;height:2px;background:var(--text);border-radius:1px"></i></span>'; }
  var h = '<div style="display:flex;gap:0;margin:0.25rem 0;border:1px solid var(--border);border-radius:6px;overflow:hidden;font-size:0.58rem">';
  h += '<div style="flex:1;text-align:center;padding:0.2rem 0.15rem"><div style="color:var(--text-muted);margin-bottom:0.15rem">本卦 · ' + (ben.name||'') + '</div>';
  for (var i = 0; i < 6; i++) h += '<div style="margin:1px 0">' + bar(l1[i]) + '</div>';
  h += '</div>';
  if (l2 && bian && bian.name) {
    h += '<div style="flex:1;text-align:center;padding:0.2rem 0.15rem;border-left:1px solid var(--border)"><div style="color:var(--text-muted);margin-bottom:0.15rem">变卦 · ' + bian.name + '</div>';
    for (var i = 0; i < 6; i++) h += '<div style="margin:1px 0">' + bar(l2[i]) + '</div>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

export function getCardSummary(type, cardData) {
  var summary = { time: '', essence: '' };
  if (!cardData) return summary;
  if (type === 'mhys') { summary.time = cardData.divinationTime || ''; summary.essence = getMhysEssence(cardData); return summary; }
  if (type === 'liuyao') { summary.time = cardData.divinationTime || ''; summary.essence = getLiuyaoEssence(cardData); return summary; }
  if (type === 'chart') { summary.time = getChartTime(cardData); summary.essence = getChartEssence(cardData); return summary; }
  return summary;
}

export function getMhysEssence(cardData) {
  var g = cardData.hexagrams || {};
  var parts = [];
  if (g.benGua && g.benGua.name) parts.push('本卦：' + g.benGua.name);
  if (g.huGua && g.huGua.name) parts.push('互卦：' + g.huGua.name);
  if (g.bianGua && g.bianGua.name) parts.push('变卦：' + g.bianGua.name);
  if (g.cuoGua && g.cuoGua.name) parts.push('错卦：' + g.cuoGua.name);
  if (g.zongGua && g.zongGua.name) parts.push('综卦：' + g.zongGua.name);
  if (g.verdict && g.verdict.text) parts.push('断：' + g.verdict.text);
  if (!parts.length && cardData.topic) parts.push(cardData.topic);
  return parts.join(' · ');
}

export function getLiuyaoEssence(cardData) {
  var g = cardData.hexagrams || {};
  var parts = [];
  if (g.benGua && g.benGua.name) parts.push('本卦：' + g.benGua.name);
  if (g.bianGua && g.bianGua.name) parts.push('变卦：' + g.bianGua.name);
  if (g.gong && g.gong.name) parts.push('宫：' + g.gong.name);
  if (g.shiYao && g.shiYao.name) parts.push('世：' + g.shiYao.name);
  if (g.yingYao && g.yingYao.name) parts.push('应：' + g.yingYao.name);
  if (!parts.length && cardData.topic) parts.push(cardData.topic);
  return parts.join(' · ');
}

export function getChartTime(cardData) {
  if (cardData.birthYear) return cardData.birthYear + '年' + (cardData.birthMonth || '') + '月' + (cardData.birthDay || '') + '日' + ((cardData.birthHour || cardData.birthTime) ? ' ' + (cardData.birthHour || cardData.birthTime) + '时' : '');
  return cardData.createdAt || cardData.created_at || cardData.savedAt || '';
}

export function getChartEssence(cardData) {
  var parts = [];
  if (cardData.bazi) parts.push('八字：' + cardData.bazi);
  if (cardData.zodiac || cardData.shengxiao) parts.push('生肖：' + (cardData.zodiac || cardData.shengxiao));
  if (cardData.dayMaster) parts.push('日主：' + cardData.dayMaster);
  if (!parts.length && (cardData.name || cardData.topic)) parts.push('命盘：' + (cardData.name || cardData.topic));
  return parts.join(' · ');
}

// ⚠ 死代码：全文没有调用点。按"忠实搬运"要求原样保留，阶段 2b 再决定去留。
export function renderMhysHex(g) {
  function triLines(n) { var m={'1':[1,1,1],'2':[1,1,0],'3':[1,0,1],'4':[1,0,0],'5':[0,1,1],'6':[0,1,0],'7':[0,0,1],'8':[0,0,0]}; return m[String(n)]||[0,0,0]; }
  function renderLines(lvs) { var h='<div class="hex-lines">'; for(var i=0;i<lvs.length;i++){h+='<div class="hex-line'+(lvs[i]?' hl-yang"':'"')+'><span></span><span></span></div>';} h+='</div>'; return h; }

  var guas = [
    {key:'本',g:g.benGua},{key:'互',g:g.huGua},{key:'变',g:g.bianGua},{key:'错',g:g.cuoGua},{key:'综',g:g.zongGua}
  ];
  var h = '<div class="card-hex-mini">';
  for (var i = 0; i < guas.length; i++) {
    var gg = guas[i].g;
    if (!gg) continue;
    var up = triLines(gg.upper), lo = triLines(gg.lower);
    var allLines = [up[2], up[1], up[0], lo[2], lo[1], lo[0]];
    h += '<div class="hex-item"><div class="hex-label">' + guas[i].key + '</div><div class="hex-lines">';
    for (var li = 0; li < 6; li++) {
      h += '<div class="hex-line' + (allLines[li] ? ' hl-yang' : '') + '">';
      if (!allLines[li]) h += '<span></span><span></span>';
      h += '</div>';
    }
    h += '</div><div class="hex-name">' + (gg.name || '') + '</div></div>';
  }
  h += '</div>';
  return h;
}

// ⚠ 死代码：全文没有调用点。同上。
export function renderLiuyaoHex(g) {
  if (!g.benGua) return '';
  // 简化的六爻卡片：本卦+变卦并排
  var ben = g.benGua, bian = g.bianGua;
  function triLines(n) { var m={'1':[1,1,1],'2':[1,1,0],'3':[1,0,1],'4':[1,0,0],'5':[0,1,1],'6':[0,1,0],'7':[0,0,1],'8':[0,0,0]}; return m[String(n)]||[0,0,0]; }
  var l1 = triLines(ben.upper).concat(triLines(ben.lower));
  var l2 = bian && bian.upper ? triLines(bian.upper).concat(triLines(bian.lower)) : null;
  // 反过来
  l1 = [l1[2],l1[1],l1[0],l1[5],l1[4],l1[3]];
  if (l2) l2 = [l2[2],l2[1],l2[0],l2[5],l2[4],l2[3]];

  function bar(y) { return y ? '<span class="b-yang"></span>' : '<span class="b-yin"><i></i><i></i></span>'; }
  var h = '<div class="card-ly-hex">';
  h += '<div class="ly-col"><div class="ly-title">本卦 · ' + (ben.name || '') + '</div><div class="card-ly-rows">';
  for (var i = 0; i < 6; i++) {
    h += '<div class="card-ly-row"><div class="ly-bar">' + bar(l1[i]) + '</div></div>';
  }
  h += '</div></div>';
  if (l2 && bian && bian.name) {
    h += '<div class="ly-col"><div class="ly-title">变卦 · ' + bian.name + '</div><div class="card-ly-rows">';
    for (var i = 0; i < 6; i++) {
      h += '<div class="card-ly-row"><div class="ly-bar">' + bar(l2[i]) + '</div></div>';
    }
    h += '</div></div>';
  }
  h += '</div>';
  return h;
}

// 全站前端公共小函数 —— 梅花页、六爻页共用这一份，勿再各抄一份。
//
// 本文件是 2026-09-25 从 `js/mhys_ai_panel.js` 里**整段搬出**的（原来梅花页与
// 六爻页各有一份 `renderMarkdown`，加上 ai-chat 页共三份 —— 改一处忘一处，
// 用户看到的渲染效果就跟着页面变）。搬的时候逐字未改，只把注释里的出处写清。
//
// 依赖：无。可以放在任何脚本之前。

/** Date → 'YYYY-MM-DD HH:MM:SS' */
function formatTime(date) {
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+' '+
         String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')+':'+String(date.getSeconds()).padStart(2,'0');
}

/** HTML 转义。走 DOM 而不是手写替换表：`&amp;` 之类的重复转义边界由浏览器负责 */
function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/**
 * 极简 Markdown → HTML，专供 AI 流式输出。
 * 支持：代码块 / 行内代码 / 分割线 / 标题 / 【小标题】/ 引用 / 有序无序列表 / 加粗 / 斜体。
 * 不支持嵌套、不支持表格 —— 模板产出的三段式用不到，加了反而会把 AI 偶然吐出的
 * 星号吃进标签里。
 */
function renderMarkdown(text) {
  if (!text) return '';
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 行内加粗/斜体 —— 抽成函数，供列表项与引用块内部复用。
  // 星号归一化：容忍数据里 "-**文字"（DB 公告里就有这种写法，
  // 单个 ** 会因为没有配对而成对匹配成空粗体，先把连续 3 个以上压成 2 个）。
  function inline(s) {
    s = s.replace(/\*{3,}/g, '**');
    s = s.replace(/\*\*([^*]*)\*\*/g, '<strong>$1</strong>')
         .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 兜底：清掉没配对的 ** / * 标记，避免把 markdown 符号显示给用户。
    // 典型来源是数据里的 "-**文字"（少一个空格）以及 AI 偶发的未闭合标记。
    return s.replace(/\*\*/g, '').replace(/\*(?=[^\s])/g, '');
  }

  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,a,code){ return '<pre>'+code.trim()+'</pre>'; });
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/^---+\s*$/gm, '<hr>');
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^【([^】]+)】/gm, function(m, t){ return '<div class="md-h">【'+t+'】</div>'; });

  // 引用块。注意：此处 '>' 已在上面被转义成 '&gt;'，
  // 所以必须匹配 '&gt;'，否则这条规则永远不会命中（历史 bug）。
  text = text.replace(/^&gt;\s?(.*)$/gm, function(m, body){
    return '<blockquote class="md-quote">' + inline(body) + '</blockquote>';
  });

  // 无序列表：允许 '-' / '*' 后**没有**空格（兼容 "-**重点**" 这种输出）
  // 无序列表：允许 '-' / '*' 后**没有**空格（兼容 "-**重点**" 这种输出）。
  // ⚠ 但必须排除「整行以 `**` 开头」——那是**加粗段落**，不是列表项。原来的
  //   `[-*]\s*` 会吃掉第一个 `*` 当项目符号，加粗标记被吃剩一半，用户眼前
  //   就多一个裸 `*`（八字报告里「**综合命盘评分：72/100…**」那行正是如此）。
  text = text.replace(/^(?!\s*\*\*)[\s]*[-*]\s*(.+)$/gm, function(m, content){
    if (!content.trim()) return m;
    return '<div class="md-li md-li-ul">' + inline(content) + '</div>';
  });
  // 有序列表 —— 保留原序号，交给 CSS counter 显示
  text = text.replace(/^[\s]*(\d+)\.\s*(.+)$/gm, function(m, num, content){
    return '<div class="md-li md-li-num" data-n="' + num + '">' + inline(content) + '</div>';
  });

  // 段落外的残留加粗/斜体（列表与引用已就地处理，这里兜底）
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  var lines = text.split(/\n/);
  var out = [], inPara = false;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    // div 也要算作块级，否则 .md-h / .md-li 会被塞进 <p> 里
    var isBlock = /^<(h[23]|pre|blockquote|hr|div|span)/.test(l);
    var isEmpty = l.trim() === '';
    if (isBlock) { if (inPara) { out.push('</p>'); inPara = false; } out.push(l); }
    else if (isEmpty) { if (inPara) { out.push('</p>'); inPara = false; } }
    else { if (!inPara) { out.push('<p>'); inPara = true; } else { out.push('<br>'); } out.push(l); }
  }
  if (inPara) out.push('</p>');
  return out.join('');
}

// renderMarkdown —— 合并了原来**重复的两份**，逐字取自：
//   · src/web/js/page-ai-chat.js:1001-1061
//   · src/web/js/ui_common.js:29-90
// 两者逐行 diff 只差一行注释（ui_common.js:30 多一句「无序列表：允许 '-' / '*'
// 后没有空格…」），实现完全相同。
//
// ⚠ 全站还有**第三份不同的**实现：首页的公告弹窗用它自己的极简渲染器
//   （原 `src/web/js/page-home.js:283`，2026-10 搬进 `src/app/home/home.logic.js`
//   的 `renderMarkdown()`，仍是逐行照搬、**没有**并到这份里来）。
//   两份有意不合并：这一份渲染 AI 回复与后台公告，支持 `*`/`-` 两种列表、
//   星号归一化、`&gt;` 引用；首页那份只服务公告弹窗，规则极简且被
//   `tests/home.logic.test.mjs` 逐条钉住了输出。合并会改变其中一边的输出，
//   属于「顺手重构」，得单独拍板 —— 所以这里只记录事实，不动代码。
//
// 这是个纯函数（不碰 DOM），行为逐字保留，包括几处容易被"顺手修"掉的地方：
//   · 引用块规则匹配的是 `&gt;` 而不是 `>`（因为上面已经转义过了；历史 bug 就是
//     写成了 `>` 导致这条规则永远不命中）
//   · 无序列表那条负向先行断言 `(?!\s*\*\*)` 是为了不把**整行加粗**当列表项吃掉
export function renderMarkdown(text) {
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

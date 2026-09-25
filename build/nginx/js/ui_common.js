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
  // 转义 HTML
  text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // 代码块（先处理，避免内部内容被后续规则干扰）
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m,a,code){ return '<pre style="background:#f5f4f0;padding:0.6rem;border-radius:6px;font-size:0.75rem;overflow-x:auto;margin:0.5rem 0;line-height:1.5">'+code.trim()+'</pre>'; });
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code style="background:#f5f4f0;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.78rem">$1</code>');
  // 水平分割线
  text = text.replace(/^---+\s*$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:0.6rem 0">');
  // 标题
  text = text.replace(/^### (.+)$/gm, '<h3 style="font-family:var(--serif);font-size:0.85rem;font-weight:600;margin:0.6rem 0 0.3rem;color:var(--text)">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="font-family:var(--serif);font-size:0.95rem;font-weight:600;margin:0.7rem 0 0.3rem;color:var(--text)">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="font-family:var(--serif);font-size:1.05rem;font-weight:700;margin:0.8rem 0 0.3rem;color:var(--text)">$1</h1>');
  // 金色区块标题 — 【一、回答】等
  text = text.replace(/^【([^】]+)】/gm, '<div style="font-family:var(--serif);font-size:0.88rem;font-weight:700;color:var(--accent);margin:0.7rem 0 0.2rem;letter-spacing:0.04em">【$1】</div>');
  // 引用块
  text = text.replace(/^> (.+)$/gm, '<blockquote style="padding:0.4rem 0.7rem;margin:0.4rem 0;border-left:3px solid var(--accent);background:var(--bg);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-size:0.78rem;color:var(--text-dim);line-height:1.7">$1</blockquote>');
  // 无序列表（- 或 * 开头）
  text = text.replace(/^[\s]*[-*] (.+)$/gm, function(m,content){ return '<span style="display:block;padding-left:1.2rem;position:relative;line-height:1.8"><span style="position:absolute;left:0.3rem">•</span>'+content+'</span>'; });
  // 有序列表
  text = text.replace(/^[\s]*\d+\. (.+)$/gm, function(m,content){ return '<span style="display:block;padding-left:1.2rem;line-height:1.8">'+content+'</span>'; });
  // 加粗 — 重点结论用金色
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--accent)">$1</strong>');
  // 斜体
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // 段落：连续非空行用 <p> 包裹，保留 \n 只为分割
  var lines = text.split(/\n/);
  var out = [];
  var inPara = false;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    var isBlock = /^<(h[123]|pre|blockquote|hr|span|div)/.test(l);
    var isEmpty = l.trim() === '';
    if (isBlock) {
      if (inPara) { out.push('</p>'); inPara = false; }
      out.push(l);
    } else if (isEmpty) {
      if (inPara) { out.push('</p>'); inPara = false; }
    } else {
      if (!inPara) { out.push('<p>'); inPara = true; }
      else { out.push('<br>'); }
      out.push(l);
    }
  }
  if (inPara) out.push('</p>');
  return out.join('');
}

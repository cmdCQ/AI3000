// 流式对话请求的唯一出口。老页面里这段 XHR 生命周期被抄了两遍
// （page-ai-chat.js 的 sendMessage `:441-527` 与 sendDivinationCard `:1122-1174`），
// 两遍的 onprogress 逐字相同，只有收尾/错误处理不同 —— 所以这里只抽 onprogress
// 那一段与请求头，收尾逻辑仍由调用方给（那正是两处**确实不一样**的地方）。
//
// ⚠ 与 src/app/lib/api.js 的 `api()` 刻意不合并：`api()` 是 fetch + 等整包 JSON，
//   这里是 XHR + onprogress 增量读 responseText，语义不同，合并会丢掉增量。
//
// ⚠ 接口形状本身是坏的（Content-Type 声称 text/event-stream，实际是裸文本，
//   前端也从不解析 SSE）—— 那是阶段 2b 的事，这里逐字复刻现状，不改。
import { getToken } from './auth.js'

/**
 * POST /api/chat/send，流式读。
 * @param body     请求体（JSON.stringify 后发）
 * @param onChunk  每次拿到新内容时调用，参数是**累计到目前的全文**
 * @param onLoadEnd (xhr, fullText) —— 结束（含出错后）都会走到这里
 * @param onError   可选；老页只有 sendMessage 传了它，sendDivinationCard 没传
 *                  （所以那条路径的 XHR 错误是静默的，只有 onloadend 会跑）
 * @returns XMLHttpRequest（调用方可 abort）
 */
export function streamChat({ body, onChunk, onLoadEnd, onError }) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/chat/send');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());

  var fullText = '';

  xhr.onprogress = function() {
    var newText = xhr.responseText.substring(fullText.length);
    if (newText) {
      if (fullText === '') {
        // 首个字节到了 → 把"思考中"的占位气泡摘掉
        var loading = document.getElementById('aiLoading');
        if (loading) loading.remove();
      }
      fullText = xhr.responseText;
      onChunk(fullText);
    }
  };

  xhr.onloadend = function() { onLoadEnd(xhr, fullText); };

  if (onError) xhr.onerror = function() { onError(); };

  xhr.send(JSON.stringify(body));
  return xhr;
}

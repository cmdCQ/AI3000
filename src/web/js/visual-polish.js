/* ═══════════════════════════════════════════════════════════════
   AI 对话页 · 等待态增强 (visual-polish.js)
   ───────────────────────────────────────────────────────────────
   背景：/api/chat/send 在拿到上游模型首个 token 之前不返回任何数据，
   实测长回答要等 16.8 秒（另两次 1.4~1.9 秒，波动大）。
   这段时间旧版只有一个不动的转圈，用户无法判断是在工作还是卡死。

   本脚本做三件事，全部是纯增强、不改动原有逻辑：
     1. 计时：把已等待秒数显示出来
     2. 阶段文案：等待越久，提示越具体，制造"在推进"的感知
     3. 超时兜底：超过 60 秒仍未出字，提示可重试

   设计原则：不劫持任何原有函数（sendMessage / doStreamRender 等），
   只做 DOM 观察，因此即使本文件加载失败，对话功能也不受影响。
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* 各阶段文案：[起始毫秒, 文案] —— 按等待时长递进 */
  var STAGES = [
    [0,     '正在推演…'],
    [3000,  '正在结合卦象推演…'],
    [8000,  '正在整理结论…'],
    [15000, '内容较长，仍在生成…'],
    [30000, '还在生成，请再稍候…']
  ];
  var HARD_TIMEOUT_MS = 60000;   /* 超过则提示重试，避免无限转圈 */

  var tickTimer = null;    /* 计时器 id */
  var startedAt = 0;       /* 本次等待起始时间 */
  var timedOut = false;

  function textFor(elapsed) {
    var t = STAGES[0][1];
    for (var i = 0; i < STAGES.length; i++) {
      if (elapsed >= STAGES[i][0]) t = STAGES[i][1];
    }
    return t;
  }

  /* 每一帧更新文案与秒数 */
  function tick() {
    var bar = document.getElementById('aiLoading');
    if (!bar) { stopTick(); return; }

    var elapsed = Date.now() - startedAt;

    var tEl = bar.querySelector('.think-timer');
    if (tEl) tEl.textContent = (elapsed / 1000).toFixed(1) + 's';

    var xEl = bar.querySelector('.think-text');
    if (xEl) {
      var next = textFor(elapsed);
      /* 只在变化时写 DOM，避免每秒一次无谓重排 */
      if (xEl.textContent !== next) xEl.textContent = next;
    }

    /* 超时兜底：只在第一次触发时提示 */
    if (!timedOut && elapsed >= HARD_TIMEOUT_MS) {
      timedOut = true;
      var area = document.getElementById('msgsArea');
      if (area && typeof window.showErrorToast === 'function') {
        window.showErrorToast('等待时间较长，可点击 ■ 中断后重试');
      }
      stopTick();
    }
  }

  function startTick() {
    if (tickTimer) return;
    startedAt = Date.now();
    timedOut = false;
    tick();
    tickTimer = setInterval(tick, 100);
  }

  function stopTick() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  /* ---- 用 MutationObserver 观察等待态的出现与消失 ----
     这样无需改动 sendMessage / stopStream，也不会漏掉任何一条发送路径
     （普通提问、分享排盘、数字起卦共用同一个 #aiLoading 元素）。 */
  function boot() {
    var area = document.getElementById('msgsArea');
    if (!area || typeof MutationObserver === 'undefined') return;

    var obs = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var nodes = records[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (n.nodeType === 1 && (n.id === 'aiLoading' || (n.querySelector && n.querySelector('#aiLoading')))) {
            startTick();
          }
        }
        var removed = records[i].removedNodes;
        for (var k = 0; k < removed.length; k++) {
          var r = removed[k];
          if (r.nodeType === 1 && (r.id === 'aiLoading' || (r.querySelector && r.querySelector('#aiLoading')))) {
            stopTick();
          }
        }
      }
      /* 兜底：等待态已不在页面上就停表 */
      if (tickTimer && !document.getElementById('aiLoading')) stopTick();
    });

    obs.observe(area, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

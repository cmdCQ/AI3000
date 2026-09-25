// 梅花页的 AI 面板配置 —— 引擎在 `/js/ai_panel.js`（与六爻页共用一份）。
//
// 本文件**只写梅花与六爻不同的那几处**，一行逻辑都不放：逻辑一旦分家，两页的
// 「自动解析」就会慢慢长得不一样。要改行为请改 `ai_panel.js`。
//
// 2026-09-25：本文件原来是整个面板（DOM + 取流 + 追问 + Markdown）的实现，
// 当日抽出引擎后瘦成这一份配置。上面那句「勿再抄一份」的注释仍然有效。
window.AI_PANEL_CONF = {
  cardType: 'mhys',
  recordsPath: '/api/mhys-records',
  anonUsedKey: 'mhys_anon_used',
  anonFollowKey: 'mhys_anon_followup',
  barBtnId: 'aiBarBtn',
  noChartHint: '先起一卦，再来看解析',
  // 有卦才放行：`g` 由 `mhys_render.js` 的 renderResult() 设好
  hasChart: function(){ return typeof g !== 'undefined' && !!g; },
  topic: function(){ return currentTopic || ''; },
  recordId: function(){ return currentRecordId; },
  payload: function(){ return buildMhysAiPayload(); },
  saved: function(){ return savedAnalysis; },
  setSaved: function(v){ savedAnalysis = v; },
};

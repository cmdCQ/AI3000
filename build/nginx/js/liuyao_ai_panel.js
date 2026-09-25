// 六爻页的 AI 面板配置 —— 引擎在 `/js/ai_panel.js`（与梅花页共用一份）。
//
// 本文件**只写六爻与梅花不同的那几处**，一行逻辑都不放：逻辑一旦分家，两页的
// 「自动解析」就会慢慢长得不一样。要改行为请改 `ai_panel.js`。
window.AI_PANEL_CONF = {
  cardType: 'liuyao',
  recordsPath: '/api/liuyao-records',
  anonUsedKey: 'liuyao_anon_used',
  anonFollowKey: 'liuyao_anon_followup',
  barBtnId: 'aiBarBtn',
  noChartHint: '先起一卦，再来看解析',
  // 有卦才放行：`currentChart` 由 `js/liuyao_render.js` 的 renderLiuyaoResult() 设好
  hasChart: function(){ return !!currentChart; },
  topic: function(){ return currentTopic || ''; },
  recordId: function(){ return currentRecordId; },
  payload: function(){ return buildLiuyaoAiPayload(); },
  saved: function(){ return savedAnalysis; },
  setSaved: function(v){ savedAnalysis = v; },
};

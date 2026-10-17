// 阶段 4 cut-over：由 `src/web/js/liuyao_ai_panel.js` 搬来。
// conf 的成员本来就是函数（调用时取值），切模块后闭包看不见别模块的变量，
// 所以把裸名换成同家族的读取器 —— 行为不变。
import { getCurrentChart, getCurrentTopic, getCurrentRecordId, getSavedAnalysis, setSavedAnalysis } from './liuyaoRender.js';
import { buildLiuyaoAiPayload } from './liuyaoRender.js';

// 六爻页的 AI 面板配置 —— 引擎在 `/js/ai_panel.js`（与梅花页共用一份）。
//
// 本文件**只写六爻与梅花不同的那几处**，一行逻辑都不放：逻辑一旦分家，两页的
// 「自动解析」就会慢慢长得不一样。要改行为请改 `ai_panel.js`。
export const AI_PANEL_CONF = {
  cardType: 'liuyao',
  recordsPath: '/api/liuyao-records',
  anonUsedKey: 'liuyao_anon_used',
  anonFollowKey: 'liuyao_anon_followup',
  noChartHint: '先起一卦，再来看解析',
  // 有卦才放行：`currentChart` 由 `js/liuyao_render.js` 的 renderLiuyaoResult() 设好
  hasChart: function(){ return !!getCurrentChart(); },
  topic: function(){ return getCurrentTopic() || ''; },
  recordId: function(){ return getCurrentRecordId(); },
  payload: function(){ return buildLiuyaoAiPayload(); },
  saved: function(){ return getSavedAnalysis(); },
  setSaved: function(v){ setSavedAnalysis(v); },
};

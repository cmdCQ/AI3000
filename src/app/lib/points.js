// 记账行（「消耗积分：…」）的切分 —— 逐字取自 src/web/js/page-ai-chat.js:8-42。
//
// 后端流式返回的正文末尾挂着后端拼的记账行，本页要把它**切成单独一行小字**
// （`.msg-token`），不能当正文渲染。
//
// ⚠ 标记字符串全站有第二份，没复用 `/js/ai_panel.js` 里那套：本页的 DOM 结构与
//   排盘面板完全不同（消息流 vs 单块面板），共用渲染反而要往引擎里塞本页的形状。
//   **代价是后端 `POINTS_LABEL` 改了要一起改**（两处都写了这条注释，就是为了改的
//   时候搜得到另一个）。老消息里存的是旧字「消耗 Token：」，故两个标记都认。
export var AI_POINTS_MARKS = ['\n消耗积分：', '\n消耗 Token：'];

export function pointsIdx(t) {
  var i = -1;
  for (var k = 0; k < AI_POINTS_MARKS.length; k++) {
    var j = t.lastIndexOf(AI_POINTS_MARKS[k]);
    if (j > i) i = j;
  }
  return i;
}

/** 切成 { body: 正文, points: 记账行（已统一改称「积分」） }。 */
export function splitPoints(t) {
  var i = pointsIdx(t || '');
  if (i <= 0) return { body: t || '', points: '' };
  return {
    body: t.substring(0, i).replace(/\s*---\s*$/, '').replace(/\s+$/, ''),
    points: t.substring(i + 1).trim().replace(/^消耗 Token：/, '消耗积分：')
  };
}

/** 老消息里存的旧字「消耗 Token」在显示时统一改称「积分」（存量数据不迁移）。 */
export function pointsLabel(t) {
  return t ? String(t).replace(/^消耗 Token：/, '消耗积分：') : t;
}

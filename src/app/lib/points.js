// 旧 Token 尾账保留原单位；新积分尾账由服务端完成换算，显示端不再除以 10000。
export var AI_POINTS_MARKS = ['\n消耗积分：', '\n消耗 Token：'];

export function pointsIdx(t) {
  var i = -1;
  for (var k = 0; k < AI_POINTS_MARKS.length; k++) {
    var j = (t || '').lastIndexOf(AI_POINTS_MARKS[k]);
    if (j > i) i = j;
  }
  return i;
}

/** 切分正文与原单位尾账；不迁移、不换算历史数据。 */
export function splitPoints(t) {
  t = t || '';
  var i = pointsIdx(t);
  if (i < 0) return { body: t, points: '' };
  return {
    body: t.substring(0, i).replace(/\s*---\s*$/, '').replace(/\s+$/, ''),
    points: t.substring(i + 1).trim()
  };
}

export function pointsLabel(t) {
  if (t == null) return t;
  var text = String(t);
  var match = text.match(/^消耗(积分| Token)：(?:输入\s*[\d,.]+\s*\+\s*输出\s*[\d,.]+\s*=\s*)?([\d,.]+)/);
  return match ? '本次消耗 ' + match[2] + (match[1] === '积分' ? ' 积分' : ' Token') : text;
}

/** 只格式化明确给出的积分值，未知结算不能用 0 伪装扣费成功。 */
export function billingNotice(billing) {
  if (billing?.status === 'not_charged') return '本次未扣积分';
  var charged = billing?.status === 'charged' ? formatPoints(billing.pointsCharged) : null;
  return charged !== null ? '本次消耗 ' + charged + ' 积分' : '积分结算未确认，请勿重复发送核扣';
}

export function formatPoints(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  var n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(4) : null;
}

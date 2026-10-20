// 后台里所有「时间」都从这里出。
//
// 为什么要有这个文件：`/api/admin/users` 返回的 `createdAt` / `lastActive` 是**毫秒数**
// （1792506865191 这种），早先 `Users.jsx` 直接 `String(value)` 渲染，于是页面上真的把
// 这串数字显示成了「注册时间」。数字本身没错，缺的是格式化。
//
// 统一钉成北京时间（Asia/Shanghai）：管理员在国内看，用自己机器的时区会让同一条记录
// 在不同电脑上显示不同时间；后台的账期又是按北京时间周一切换的，显示口径必须一致。
export function timeText(value) {
  if (value === null || value === undefined || value === '') return '—';
  // 兼容毫秒数、秒级时间戳与 ISO 串；数字串也当时间戳处理。
  const raw = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
}

/** 只到分钟：适合「注册时间」「最后活跃」这种不需要秒的场合。 */
export function timeMinuteText(value) {
  const text = timeText(value);
  if (text === '—' || !/^\d{4}\//.test(text)) return text;
  return text.replace(/(\d{1,2}:\d{2}):\d{2}$/, '$1');
}

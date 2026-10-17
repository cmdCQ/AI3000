/* 提交建议页（`/suggestion/`）的纯逻辑。
 *
 * 全部对应 `src/web/js/page-suggestion.js`（88 行）里的某几行，注释里标了行号。
 * 放在这里而不是塞进 `main.jsx`，是为了让 `tests/suggestion.logic.test.mjs`
 * 能在 node 里直接跑 —— 这一页的六行文案表**逐字**决定用户看到什么，
 * 值得有单元测试钉住，而不是只靠 e2e 点一遍。
 */

/** 六个维度的键，顺序 = 老 HTML 第 28-98 行的行序（渲染顺序也用它）。 */
export const RATING_KEYS = ['overall', 'ui', 'feature', 'ai', 'responseSpeed', 'accuracy']

/** 六个维度的中文标题，同样按老 HTML 的行序。 */
export const RATING_TITLES = {
  overall: '总体评价',
  ui: 'UI 界面舒适度',
  feature: '功能适用度',
  ai: 'AI 解析准确度',
  responseSpeed: '响应速度',
  accuracy: '解析内容丰富度',
}

/** 老 `page-suggestion.js:4-11` 的 `labelTexts`，逐字照抄。
 *
 *  索引 = 星数（0 = 还没点，显示「请评分」）。第 4 档之所以容易串行，是因为
 *  六行的第 3 档都是「一般」、第 5 档都是「非常"X"」，只有第 1、2、4 档区分度大。
 */
export const LABEL_TEXTS = {
  overall: ['请评分', '很差', '较差', '一般', '满意', '非常满意'],
  ui: ['请评分', '很不舒适', '不太舒适', '一般', '舒适', '非常舒适'],
  feature: ['请评分', '完全不适用', '不太适用', '一般', '适用', '非常适用'],
  ai: ['请评分', '完全不准确', '不太准确', '一般', '准确', '非常准确'],
  responseSpeed: ['请评分', '非常慢', '较慢', '一般', '较快', '非常快'],
  accuracy: ['请评分', '很贫乏', '不够丰富', '一般', '丰富', '非常丰富'],
}

/** 高亮色用的是 CSS 变量名而不是色值 —— 老代码就写 `var(--star-active)`（`:44`），
 *  照抄是为了让 `tokens.css` 里改主题色时这一页自动跟上。 */
export const STAR_ACTIVE_COLOR = 'var(--star-active)'

/** 老 `page-suggestion.js:1` 的 `getCookie`，语义逐字照抄：
 *  用 `(^| )` + `=([^;]+)` 切，命中第一个就返回，并且 `decodeURIComponent`。
 *  ★ 不命中的情况返回 `null`（不是 `''`），`main.jsx` 靠它判登录。 */
export function getCookie(name, cookieString) {
  const source =
    cookieString !== undefined
      ? cookieString
      : typeof document === 'undefined'
        ? ''
        : document.cookie
  const m = source.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

/** 老 `:32` —— 星符只看"这颗的序号 <= 已选分"。 */
export function starChar(starValue, score) {
  return starValue <= score ? '★' : '☆'
}

/** 老 `:33` —— `.active` 类同理。 */
export function isActive(starValue, score) {
  return starValue <= score
}

/** 老 `:36` —— `labels[score] || score + ' 星'`。
 *  分只在 1..5，所以后半段永远走不到；照抄是为了万一将来加了 6 星不用改这里。 */
export function labelFor(name, score) {
  const labels = LABEL_TEXTS[name]
  return (labels && labels[score]) || score + ' 星'
}

/** 老 `:39-47` 的 mouseenter：**只动"非 active"的星**，active 的那些连 inline style
 *  都不碰（所以它们身上残留的旧 inline 色不会被这次悬停刷掉）。
 *  返回新的一张 `{星值: 颜色}` 表，没提到的星保持 undefined（= 不写 inline style）。 */
export function colorsOnEnter(prevColors, score, hoverValue) {
  const next = { ...prevColors }
  for (let v = 1; v <= 5; v++) {
    if (!isActive(v, score)) next[v] = v <= hoverValue ? STAR_ACTIVE_COLOR : ''
  }
  return next
}

/** 老 `:48-52` 的 mouseleave：同样只清"非 active"的。 */
export function colorsOnLeave(prevColors, score) {
  const next = { ...prevColors }
  for (let v = 1; v <= 5; v++) {
    if (!isActive(v, score)) next[v] = ''
  }
  return next
}

// ★★★ 上面这两个函数刻意**不**从「当前分数 + 当前悬停」重新算一遍颜色，
//     而是"在上一份颜色表上打补丁"。这不是绕远路，是为了复刻老实现的一个
//     真实可见的缺陷：
//
//     鼠标（或手指）划过 1→2→3→4 去点第 4 颗时，mouseenter 先给当时还空心的
//     第 2、3、4 颗写上 inline `var(--star-active)`；紧接着 click 把它们变成
//     `.active`。之后再点回第 1 颗，第 2、3、4 颗**失去 `.active` 但 inline 色
//     还在**，于是屏幕上仍然是四颗金星 —— 用户以为选了 4 星。
//     实测（2026-10-17，线上老页）：
//       after click 4 : 四颗 active + inline var(--star-active)
//       after click 1 : 只剩第 1 颗 active，但 2/3/4 仍渲染 rgb(31,107,94)
//       after leave   : 才恢复正常（mouseleave 清掉非 active 的 inline 色）
//
//     §4.9 的规矩是"照搬、没修、注释标死、等拍板"，所以这里逐字复刻。
//     想修的话：把渲染颜色改成纯函数 `isActive(v, score) ? ACCENT : (hover && v<=hoverValue ? ACCENT : '')`，
//     同时 `tests/suggestion.spec.mjs` 里那条"降回 1 星"的断言要加颜色检查并改成新期望。

/** 老 `:56-60` —— 计数器数的是 `value.length`（**不 trim**），上限 4000。 */
export function charCountLabel(value) {
  return `${value.length} / 4000`
}

/** 老 `:73-77` 的请求体：六个分缺省补 0，正文 `trim()`。
 *  ★ 注意 trim 发生在**发请求前**，而计数器（`:57`）数的是没 trim 的长度 ——
 *    两者不一致是老行为，照抄。 */
export function buildSuggestionPayload(ratings, rawContent) {
  const payload = {}
  for (const key of RATING_KEYS) payload[key] = ratings[key] || 0
  payload.content = rawContent.trim()
  return payload
}

/** 老 `:64-65` —— 空正文（trim 后为空）直接 return，连请求都不发。 */
export function isSubmitBlocked(rawContent) {
  return !rawContent.trim()
}

/** 老 `:84` 的 alert 文案，逐字照抄（含半角冒号和全角逗号）。 */
export function submitErrorMessage(message) {
  return `提交失败: ${message}，请稍后重试`
}

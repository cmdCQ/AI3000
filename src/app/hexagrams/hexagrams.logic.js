/**
 * `/hexagrams/` 的纯逻辑：搜索筛选。
 *
 * 与老实现 `src/web/js/page-hexagrams.js:15-28` 的 `filterGrid(q)` **同构**，
 * 差别只有一处：老函数边匹配边改 DOM（`c.style.display`），这里只返回
 * 「哪些卦命中」，DOM 交给 React。这样它可以在 node 里直接单测，
 * 不需要 DOM 桩 —— 这是第 6 页之后换掉的判据方式（见计划文档 §5 档位表）。
 *
 * ★ 判据不照抄本函数：`src/app/tests/hexagrams.logic.test.mjs` 的期望值是按
 *   老函数**逐行读出来**的，不是按本函数的输出写的。
 */

/**
 * 一个卦是否命中查询串。
 *
 * 老实现的匹配面（`page-hexagrams.js:23-25`）是本函数唯一的真相：
 *   d.n   卦名（无「卦」后缀，如「乾」）
 *   d.p   拼音（如「qián」）
 *   d.g   卦象别名（如「乾为天」）
 *   d.c   结构描述（如「上乾下乾」）
 *   d.kw  关键词数组（含「乾卦」「第一卦」这类带后缀的写法）
 *
 * ★ 三处容易被「优化」掉的细节，都是老行为，不要动：
 *   1. `q.toLowerCase().trim()` 的顺序是**先小写再 trim**（老 `:17`），不是反过来。
 *      对纯 ASCII 结果相同，但这是唯一被线上验证过的顺序。
 *   2. `trim()` 之后为空串 → **全部命中**（老 `:22` 的 `if (!s) { display=''; return }`）。
 *      所以只输入空格 = 显示全部，不是「显示零个」。
 *   3. `d.i`（卦序号，1-64）**不参与匹配**。老函数没匹配它，所以搜「64」不会
 *      筛出未济卦 —— 搜「64」只能通过 kw 里的中文关键词命中。这是既有行为，
 *      不是缺陷，别顺手「修好」它。
 *
 * @param {object} d  单个卦的数据（`HEXAGRAM_DATA[name]`）
 * @param {string} q  用户输入的原始查询串
 * @returns {boolean}
 */
export function matchesHexagramQuery(d, q) {
  if (!d) return false
  const s = String(q == null ? '' : q).toLowerCase().trim()
  if (!s) return true
  if (String(d.n).indexOf(s) >= 0) return true
  if (String(d.p).toLowerCase().indexOf(s) >= 0) return true
  if (String(d.g).indexOf(s) >= 0) return true
  if (String(d.c).indexOf(s) >= 0) return true
  return (d.kw || []).some((k) => String(k).indexOf(s) >= 0)
}

/**
 * 按查询串筛出要渲染的卦，保持 `HEXAGRAM_DATA` 的原始键序。
 *
 * ★ 键序必须保：老实现用 `for (var name in HEXAGRAM_DATA)` 建卡片（`:4`），
 *   所以 64 张卡的顺序 = 数据文件里的插入顺序（乾、坤、屯…）。React 的
 *   `Object.entries` 对字符串键同样按插入顺序，两者一致；但如果这里用
 *   `sort()` 或先 filter 再拼，顺序就会变，视觉基线会红。
 *
 * @param {object} data  `HEXAGRAM_DATA`
 * @param {string} q
 * @returns {Array<[string, object]>}
 */
export function filterHexagrams(data, q) {
  if (!data) return []
  return Object.entries(data).filter(([, d]) => matchesHexagramQuery(d, q))
}

/**
 * 相关卦象的 `n`（如「坤卦」）→ 数据键（如「坤」）。
 *
 * 老实现是内联在模板串里的（`page-hexagrams.js:92`）：
 *   `r.n.replace(/卦$/, '')`
 * 只剥**末尾一个**「卦」字。抽出来是因为 jsx 里那段循环不便内联正则，
 * 且这里可以单测（64 卦里每个 r.n 剥完都必须能在数据里找到，
 * 否则老页那个 `<a onclick=...>` 点下去是空操作）。
 *
 * @param {string} n 相关卦的显示名
 * @returns {string}  数据键
 */
export function relatedKey(n) {
  return String(n == null ? '' : n).replace(/卦$/, '')
}

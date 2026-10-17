// `/select-chart/` 的纯函数层 —— 全部逐条对应老 `src/web/js/page-select-chart.js`
// 的行号，期望值由 Playwright 在**老页**上先跑绿反推出来（`tests/select-chart.spec.mjs`）。
//
// 这一页真正需要「算」的只有六个派生值，其余都是状态切换：
//   生肖 emoji / 时辰字 / 生日 / 创建日期 / 八字简写 / 性别字

/** 老 :7 —— 只有这三个 key 有名字，其它一律回落到四柱八字。 */
export const MODULES = {
  charts: { icon: '📜', name: '四柱八字' },
  ziwei: { icon: '🔮', name: '紫微斗数' },
  meihua: { icon: '🌸', name: '梅花易数' },
}

export const DEFAULT_TYPE = 'charts'

/**
 * 老 :5 `var type = params.get('type') || 'charts'`。
 * ★ 返回的是**原始 type**（没落到默认值），因为老代码里 `type` 同时被用来拼
 *   「新建命盘」链接：`?type=nope` 时图标和名字回落成四柱八字，但链接里
 *   仍然是 `from=nope`。这个不对称是照抄的，不是 bug 修正点。
 */
export function resolveType(search) {
  const raw = new URLSearchParams(search || '').get('type')
  return { type: raw || DEFAULT_TYPE, known: !!MODULES[raw || DEFAULT_TYPE] }
}

/** 老 :8-11 —— `labels[type] || '📜 四柱八字'`，再按空格切成图标 + 名字。 */
export function resolveModule(type) {
  return MODULES[type] || MODULES[DEFAULT_TYPE]
}

/** 老 :13 —— 原样拼接，不做 encode（老实现就是裸拼）。 */
export function createLinkHref(type) {
  return '/charts/?action=create&from=' + type
}

/** 老 :46 —— 空状态文案按 type 选词，未知 type 落到四柱八字。 */
export function emptyDescription(type) {
  const label = type === 'ziwei' ? '紫微斗数' : type === 'meihua' ? '梅花易数' : '四柱八字'
  return '新建一份命盘，即可开始' + label + '排盘'
}

export const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

export const ZODIAC_EMOJI = ['🐀', '🐂', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷']

/** 老 :58-60 —— `(year - 4) % 12`，负数回卷；1964 是龙年，2020 是鼠年。 */
export function zodiacEmoji(year) {
  let idx = (year - 4) % 12
  if (idx < 0) idx += 12
  return ZODIAC_EMOJI[idx]
}

/**
 * 老 :62 —— `Math.floor(((hour ?? 12) + 1) % 24 / 2)`。
 * ★ `??` 不是 `||`：hour=0 是**子时**（0 点），不能被当成缺省而跳到 12 点。
 * ★ 23 点要回卷成子时：`(23+1) % 24 === 0`。
 */
export function shichenIndex(hour) {
  const h = hour === null || hour === undefined ? 12 : hour
  return Math.floor(((h + 1) % 24) / 2)
}

export function shichenLabel(hour) {
  return SHICHEN[shichenIndex(hour)] + '时'
}

/** 老 :61 —— 只有 `'male'` 算男，其余任何值都是女。 */
export function genderLabel(gender) {
  return gender === 'male' ? '男' : '女'
}

export function pad(n) {
  return String(n).padStart(2, '0')
}

/** 老 :63 —— `YYYY.MM.DD`，月日补零，不补零年份（老实现没有）。 */
export function birthDateStr(birth) {
  return birth.year + '.' + pad(birth.month) + '.' + pad(birth.day)
}

/** 老 :96-99 —— 本地时区的 `YYYY-MM-DD`。 */
export function formatDate(ts) {
  const d = new Date(ts)
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/** 老 :67-71 —— `bazi.split(' ')` 且至少三段才取第三段；不分词就是空串。 */
export function baziShort(bazi) {
  if (!bazi) return ''
  const parts = String(bazi).split(' ')
  return parts.length >= 3 ? parts[2] : ''
}

export function detailUrl(id) {
  return '/my-charts/?id=' + id
}

/**
 * 把一条**后端记录**整理成卡片要渲染的全部字段。
 * 单独抽出来是为了让 Vitest 能直接喂记录断言，不必起浏览器。
 */
export function cardFields(chart) {
  return {
    key: chart.id,
    zodiac: zodiacEmoji(chart.birth.year),
    name: chart.name,
    baziShort: baziShort(chart.bazi),
    gender: genderLabel(chart.gender),
    dateStr: birthDateStr(chart.birth),
    shichen: shichenLabel(chart.birth.hour),
    createStr: chart.createdAt ? formatDate(chart.createdAt) : '',
    href: detailUrl(chart.id),
  }
}

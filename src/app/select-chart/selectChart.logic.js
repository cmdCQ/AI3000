// 选盘页的派生字段、入口兼容说明与异常态文案。
// 生肖统一取服务端年柱，其余字段保持现有展示。
import { zodiacEmojiFromBazi } from '../shared/baziZodiac.js'

/** 老 :7 —— 只有这三个 key 有名字，其它一律回落到四柱八字。 */
export const MODULES = Object.assign(Object.create(null), {
  charts: { icon: '📜', name: '四柱八字' },
  ziwei: { icon: '🔮', name: '紫微斗数' },
  meihua: { icon: '🌸', name: '梅花易数' },
})

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

/** 保留旧入口来源，但不能让 type 注入额外查询参数。 */
export function createLinkHref(type) {
  return '/charts/?action=create&from=' + encodeURIComponent(type)
}

export function emptyDescription() {
  return '新建一份四柱八字命盘，即可查看排盘与解读'
}

/** 旧模块入口继续可用，但 from 尚未被建盘页消费，不能暗示已接通。 */
export function compatibilityNotice(type) {
  if (type === DEFAULT_TYPE) return ''
  return '此入口暂仅支持查看和新建四柱八字命盘，尚未接通' +
    (MODULES[type] ? MODULES[type].name : '所选模块') + '选盘流程。'
}

export function listError(status) {
  return status === 401
    ? { title: '登录已过期', description: '请重新登录后查看已有命盘。', action: '重新登录', reauthenticate: true }
    : { title: '命盘加载失败', description: '加载失败，请稍后重试', action: '重试', reauthenticate: false }
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
  return '/my-charts/?id=' + encodeURIComponent(id)
}

/**
 * 把一条**后端记录**整理成卡片要渲染的全部字段。
 * 单独抽出来是为了让 Vitest 能直接喂记录断言，不必起浏览器。
 */
export function cardFields(chart) {
  return {
    key: chart.id,
    zodiac: zodiacEmojiFromBazi(chart.bazi),
    name: chart.name,
    baziShort: baziShort(chart.bazi),
    gender: genderLabel(chart.gender),
    dateStr: birthDateStr(chart.birth),
    shichen: shichenLabel(chart.birth.hour),
    createStr: chart.createdAt ? formatDate(chart.createdAt) : '',
    href: detailUrl(chart.id),
  }
}

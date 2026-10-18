// `/select-chart/` 的派生值单测。
//
// 这些公式全部来自老 `src/web/js/page-select-chart.js:52-71`，Playwright 的
// 行为判据已经在真浏览器里钉过一遍；这里再钉一遍的理由是**边界**：
// 生肖回卷、hour 缺省、23 点回卷、八字不足三段、gender 只有 male 算男 ——
// 这些在浏览器判据里要么需要造很多条假记录，要么根本造不出来（比如负数年份）。
import { describe, expect, it } from 'vitest'
import {
  baziShort,
  birthDateStr,
  cardFields,
  compatibilityNotice,
  detailUrl,
  listError,
  createLinkHref,
  emptyDescription,
  formatDate,
  genderLabel,
  resolveModule,
  resolveType,
  shichenIndex,
  shichenLabel,
  zodiacEmoji,
} from '../select-chart/selectChart.logic.js'

describe('resolveType / resolveModule', () => {
  it('缺省是 charts', () => {
    expect(resolveType('')).toEqual({ type: 'charts', known: true })
    expect(resolveType('?foo=1')).toEqual({ type: 'charts', known: true })
  })

  it('已知 type 原样保留', () => {
    expect(resolveType('?type=ziwei').type).toBe('ziwei')
    expect(resolveModule('meihua')).toEqual({ icon: '🌸', name: '梅花易数' })
  })

  it('★ 未知 type：名字回落四柱八字，但 type 本身不回落（链接里仍是未知值）', () => {
    expect(resolveType('?type=nope')).toEqual({ type: 'nope', known: false })
    expect(resolveModule('nope')).toEqual({ icon: '📜', name: '四柱八字' })
    expect(createLinkHref('nope')).toBe('/charts/?action=create&from=nope')
  })

  it('保留来源并编码额外查询字符', () => {
    expect(createLinkHref('ziwei')).toBe('/charts/?action=create&from=ziwei')
  })

  it('空态不宣称其他模块已接通', () => {
    for (const type of ['charts', 'ziwei', 'meihua', 'nope']) {
      expect(emptyDescription(type)).toBe('新建一份四柱八字命盘，即可查看排盘与解读')
    }
    expect(compatibilityNotice('charts')).toBe('')
    expect(compatibilityNotice('ziwei')).toContain('尚未接通紫微斗数')
    expect(compatibilityNotice('meihua')).toContain('尚未接通梅花易数')
    expect(compatibilityNotice('nope')).toContain('尚未接通所选模块')
    expect(compatibilityNotice('toString')).toContain('尚未接通所选模块')
  })

  it('URL 参数不能注入其他参数或片段', () => {
    expect(createLinkHref('x&action=edit#frag')).toBe('/charts/?action=create&from=x%26action%3Dedit%23frag')
    expect(detailUrl('x&id=y#frag')).toBe('/my-charts/?id=x%26id%3Dy%23frag')
  })

  it('401 引导重新登录，其他请求错误允许重试', () => {
    expect(listError(401)).toMatchObject({ action: '重新登录', reauthenticate: true })
    for (const status of [500, 403, null]) {
      expect(listError(status)).toMatchObject({ action: '重试', reauthenticate: false })
    }
  })
})

describe('zodiacEmoji', () => {
  it('(year-4)%12 的十二个位置', () => {
    expect(zodiacEmoji(2020)).toBe('🐀')
    expect(zodiacEmoji(2021)).toBe('🐂')
    expect(zodiacEmoji(2024)).toBe('🐲')
    expect(zodiacEmoji(1990)).toBe('🐴')
    expect(zodiacEmoji(1972)).toBe('🐀')
    expect(zodiacEmoji(1964)).toBe('🐲')
  })

  it('★ 负数年份要回卷，不能取到 undefined', () => {
    expect(zodiacEmoji(3)).toBe('🐷') // (3-4)%12 = -1 → 11
    expect(zodiacEmoji(4)).toBe('🐀')
  })
})

describe('shichen', () => {
  it('23 点回卷成子时、0 点是子时', () => {
    expect(shichenIndex(23)).toBe(0)
    expect(shichenLabel(23)).toBe('子时')
    expect(shichenLabel(0)).toBe('子时')
  })

  it('★ 缺 hour 走 ?? 12（午时），不是 || 12 也不是 0 点', () => {
    expect(shichenLabel(undefined)).toBe('午时')
    expect(shichenLabel(null)).toBe('午时')
    expect(shichenLabel(12)).toBe('午时')
  })

  it('每个时辰头尾各取一个', () => {
    expect(shichenLabel(1)).toBe('丑时')
    expect(shichenLabel(2)).toBe('丑时')
    expect(shichenLabel(14)).toBe('未时')
    expect(shichenLabel(22)).toBe('亥时')
  })
})

describe('日期与八字', () => {
  it('生日是 YYYY.MM.DD，月日补零', () => {
    expect(birthDateStr({ year: 2000, month: 1, day: 2 })).toBe('2000.01.02')
    expect(birthDateStr({ year: 1990, month: 12, day: 31 })).toBe('1990.12.31')
  })

  it('创建日期是本地时区 YYYY-MM-DD（用本地构造的时间戳，不受 TZ 影响）', () => {
    expect(formatDate(new Date(2026, 8, 1, 12, 0, 0).getTime())).toBe('2026-09-01')
  })

  it('★ 八字取第三段，不足三段不显示', () => {
    expect(baziShort('庚午 己卯 甲子 辛未')).toBe('甲子')
    expect(baziShort('两段 而已')).toBe('')
    expect(baziShort('')).toBe('')
    expect(baziShort(null)).toBe('')
  })

  it('gender 只有 male 算男', () => {
    expect(genderLabel('male')).toBe('男')
    expect(genderLabel('female')).toBe('女')
    expect(genderLabel('other')).toBe('女')
    expect(genderLabel(undefined)).toBe('女')
  })
})

describe('cardFields', () => {
  it('把一条后端记录整理成卡片字段', () => {
    expect(cardFields({
      id: 'abc',
      name: '张三',
      gender: 'male',
      birth: { year: 1990, month: 3, day: 7, hour: 14 },
      bazi: '庚午 己卯 甲子 辛未',
      createdAt: new Date(2026, 8, 1, 12, 0, 0).getTime(),
    })).toEqual({
      key: 'abc',
      zodiac: '🐴',
      name: '张三',
      baziShort: '甲子',
      gender: '男',
      dateStr: '1990.03.07',
      shichen: '未时',
      createStr: '2026-09-01',
      href: '/my-charts/?id=abc',
    })
  })

  it('没有 createdAt 就不显示创建时间（空串，不是 undefined）', () => {
    const f = cardFields({ id: 'x', name: 'n', gender: 'female', birth: { year: 2000, month: 1, day: 1, hour: 0 }, createdAt: null })
    expect(f.createStr).toBe('')
  })
})

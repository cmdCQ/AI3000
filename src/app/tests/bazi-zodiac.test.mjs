// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { zodiacEmojiFromBazi } from '../shared/baziZodiac.js'
import { cardFields } from '../select-chart/selectChart.logic.js'
import { renderListHTML } from '../lib/myChartsView.js'

describe('命盘列表统一按年柱生肖', () => {
  const chart = { id: 'synthetic', name: '测试', gender: 'male', birth: { year: 2010, month: 2, day: 2, hour: 21 }, bazi: '己丑 丁丑 癸未 癸亥' }
  it('立春前的2010年记录在两个列表都显示牛', () => {
    expect(cardFields(chart).zodiac).toBe('🐂')
    expect(renderListHTML([chart])).toContain('🐂')
    expect(renderListHTML([chart])).not.toContain('🐯')
  })
  it('立春后的庚寅年柱显示虎', () => {
    expect(zodiacEmojiFromBazi('庚寅 戊寅 甲子 甲子')).toBe('🐯')
  })
  it('缺少有效年柱不回退到公历猜测', () => {
    for (const bazi of [null, '', '无效']) expect(zodiacEmojiFromBazi(bazi)).toBe('—')
  })
})

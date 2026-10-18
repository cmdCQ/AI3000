import { describe, expect, it } from 'vitest'
import { billingNotice, formatPoints, pointsLabel, splitPoints } from '../lib/points.js'

describe('积分尾账与咨询结算单位', () => {
  it.each(['消耗 Token：输入 6000 + 输出 4000 = 10000 ｜ 剩余：90000', '消耗积分：1.0000 ｜ 剩余：9.0000'])('保留原单位且只切正文：%s', trailer => {
    expect(splitPoints(`正文\n\n---\n${trailer}`)).toEqual({ body:'正文', points:trailer })
    expect(pointsLabel(trailer)).toBe(trailer.startsWith('消耗 Token') ? '本次消耗 10000 Token' : '本次消耗 1.0000 积分')
  })
  it('新旧积分尾账均只展示合计，不展示计算过程', () => {
    expect(pointsLabel('消耗积分：输入 0.0001 + 输出 0.9999 = 1 ｜ 今日剩余：2.5')).toBe('本次消耗 1 积分')
    expect(pointsLabel('消耗积分：0.1234')).toBe('本次消耗 0.1234 积分')
  })
  it('没有尾账时保持原文', () => { expect(splitPoints('正文')).toEqual({ body:'正文', points:'' }) })
  it('charged 的 10000 tokens 只显示服务端已换算的 1.0000 积分', () => {
    expect(billingNotice({ status:'charged', inputTokens:6000, outputTokens:4000, totalTokens:10000, pointsCharged:1, pointsRemaining:9, pointsLimit:10, billingDate:'2026-09-26' })).toBe('本次消耗 1.0000 积分')
    expect(billingNotice({ status:'charged', totalTokens:1, pointsCharged:'0.0001' })).toBe('本次消耗 0.0001 积分')
  })
  it.each([undefined, { status:'failed' }, { status:'charged', totalTokens:10000 }, { status:'charged', pointsCharged:null }, { status:'charged', pointsCharged:'' }])('未知/缺失不假装成功 %j', billing => {
    expect(billingNotice(billing)).toContain('未确认')
  })
  it('明确未扣费与四位精度', () => {
    expect(billingNotice({ status:'not_charged' })).toBe('本次未扣积分')
    expect(formatPoints(0)).toBe('0.0000')
    expect(formatPoints(-1)).toBeNull()
  })
})

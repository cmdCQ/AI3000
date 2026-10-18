// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { BaziRender } from '../shared/baziRender.js'

// Synthetic API-shaped data: the renderer must display server facts, never recalculate them.
function fixture() {
  const pillar = {
    tiangan: '甲', dizhi: '子', wuxing_gan: '木', wuxing_zhi: '水',
    shishen_gan: '正印', canggan: ['癸', '辛'], shishen_zhi: '偏印', nayin: '海中金',
  }
  return {
    sizhu: { year_gz: '甲子', month_gz: '乙丑', day_gz: '丙寅', hour_gz: '丁卯' },
    display: {
      lunar: '合成农历日期', shengxiao: '鼠', kong: { year: '戌亥' },
      jieQi: { name: '立春', at: '2026-02-04 04:00', nextName: '雨水', nextAt: '2026-02-19 05:00' },
    },
    chart: {
      year_pillar: { ...pillar }, month_pillar: { ...pillar },
      day_pillar: { ...pillar }, hour_pillar: { ...pillar },
      renyuan_siling: { phase: '甲木司令' },
      taiyuan: { label: '戊辰' }, minggong: { label: '己巳' }, shengong: { label: '庚午' },
      overview: { available: true, headline: '判断标题', verdict_line: '判断结论', paragraphs: [{ title: '判断段标题', text: '判断段正文' }] },
      strength: '判断身强', pattern: '判断格局',
      strength_info: { help_score: 71, drain_score: 29, monthly_status: '判断月令' },
      yong_shen: { yong_shen_wx: '木', xi_shen_wx: '水', ji_shen_wx: '火', tiao_hou: { stem: '壬', wuxing: '水' } },
      shensha: [{ name: '天乙贵人', pillar: '年柱', dizhi: '子' }],
      relations: { chong: [{ branches: ['子', '午'], auspicious: false }] },
      dayun: [{ tiangan: '甲', dizhi: '子', start_age: 6, end_age: 15, start_year: 2020, end_year: 2029,
        dm_shishen: '比肩', quality: '吉', auspicious: ['判断大运吉因'], warnings: ['判断大运警告'] }],
      current_fortune: {
        current_dayun: { ganzhi: '甲子', start_age: 6, end_age: 15 },
        current_liunian: { year: 2026, ganzhi: '丙午', shishen: '食神', summary: '判断今年小结' },
        recent_years: [{ year: 2027, ganzhi: '丁未', shishen: '伤官', quality: '凶' }],
        suiyun_brief: '判断岁运小结',
      },
    },
  }
}
const meta = {
  name: '合成姓名', genderText: '男', yinYang: '阳', zao: '乾造',
  solarText: '2020-01-01 12:00', trueSolarText: '2020-01-01 11:50', hourName: '午时',
  birthplace: '合成出生地', createdAt: '2026-01-01 09:00',
}
const host = () => document.getElementById('chart')
const rest = () => document.getElementById('rest')
const text = () => document.body.textContent
const render = (options, resp = fixture(), split = true) => BaziRender.render(host(), resp, meta, split ? rest() : null, options)

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = '<div id="chart"></div><div id="rest"></div>'
})

describe('BaziRender opt-in neutral display', () => {
  it('keeps legacy judgments, rule explanations and quality output by default', () => {
    render()
    for (const value of ['命局提要', '判断标题', '判断结论', '判断段标题', '判断段正文', '判断身强',
      '判断格局', '用神', '喜神', '忌神', '调候', '帮身的力量 71', '泄耗的力量 29', '判断月令',
      '判断大运吉因', '判断大运警告', '判断今年小结', '判断岁运小结', '每一步的吉凶理由（2 条）']) {
      expect(text()).toContain(value)
    }
    expect(rest().querySelector('.bz-step .bz-q').textContent).toBe('吉现在')
    expect(rest().querySelector('.bz-chip.bz-bad').textContent).toContain('忌神')
    expect(rest().querySelector('.bz-tip[title]').title).toBe(BaziRender.GLOSS.主星)
    expect(text()).toContain(BaziRender.GLOSS.大运)
    expect(text()).toContain('古人用来旁参性格与体质')
  })

  it.each([undefined, {}, { mode: 'legacy' }, { mode: 'Neutral' }, null])('only the exact neutral option opts in: %j', options => {
    render()
    const legacy = document.body.innerHTML
    render(options)
    expect(document.body.innerHTML).toBe(legacy)
  })

  it('preserves neutral birth/calendar/pillar/auxiliary facts and existing element colors', () => {
    const resp = fixture()
    const before = JSON.stringify(resp)
    render({ mode: 'neutral' }, resp)
    expect([...host().querySelectorAll('.bz-gz')].map(el => el.textContent)).toEqual(['甲子', '乙丑', '丙寅', '丁卯'])
    expect(host().querySelectorAll('.bz-sec')).toHaveLength(0)
    for (const value of [meta.name, meta.genderText, meta.solarText, meta.trueSolarText, meta.birthplace, meta.createdAt,
      '午时', '合成农历日期', '属鼠', '立春', '2026-02-04 04:00', '雨水', '2026-02-19 05:00',
      '甲木司令', '胎元 戊辰', '命宫 己巳', '身宫 庚午', '旬空', '戌亥', '正印', '日元男', '癸辛', '偏印', '海中金',
      '盘面标记', '神煞', '地支关系', '天乙贵人年柱 · 子', '子午相冲']) expect(text()).toContain(value)
    expect(rest().querySelectorAll('.bz-pillar-sheet tbody tr')).toHaveLength(7)
    expect(host().querySelector('.bz-gan').style.color).toBe('rgb(46, 125, 79)')
    expect(JSON.stringify(resp)).toBe(before)
  })

  it('omits all judgments, quality styles, rule tooltips and prose while keeping flow facts', () => {
    render({ mode: 'neutral' })
    for (const value of ['命局提要', '判断', '旺衰', '格局', '用神', '喜神', '忌神', '调候', '帮身', '泄耗',
      '吉凶理由', '古人用来', '主变动', '主暗损']) expect(text()).not.toContain(value)
    for (const gloss of Object.values(BaziRender.GLOSS)) expect(text()).not.toContain(gloss)
    expect(rest().querySelector('.bz-tip, .bz-gloss, .bz-para, .bz-headline, .bz-q, .bz-good, .bz-bad, .bz-flat, details, [title]')).toBeNull()
    expect(rest().querySelector('.bz-step.now').textContent).toBe('甲子6–15 岁2020–2029比肩现在')
    for (const value of ['你现在走的是 甲子 运（6–15 岁）', '今年（2026 丙午年，食神）', '2027 丁未 · 伤官']) expect(text()).toContain(value)
  })

  it('retains factual pre-yun status without its interpretation', () => {
    const resp = fixture()
    resp.chart.current_fortune.pre_yun = true
    render({ mode: 'neutral' }, resp)
    expect(text()).toContain('还没起运（走的是「小运」）。')
    expect(text()).not.toContain(BaziRender.GLOSS.大运)
  })

  it('supports combined host and re-rendering between modes without leaking mode state', () => {
    render({ mode: 'neutral' }, fixture(), false)
    expect(host().querySelector('.bz-pillars')).not.toBeNull()
    expect(host().textContent).toContain('基本信息')
    expect(host().textContent).not.toContain('判断标题')
    render()
    expect(rest().textContent).toContain('判断标题')
    render({ mode: 'neutral' })
    expect(text()).not.toContain('判断标题')
    expect(document.querySelectorAll('#bz-style')).toHaveLength(1)
  })

  it('handles missing data/host without showing an unavailable judgment placeholder in neutral mode', () => {
    expect(() => BaziRender.render(null, null, null, null, { mode: 'neutral' })).not.toThrow()
    render({ mode: 'neutral' }, null)
    expect(rest().textContent).toContain('四柱细盘')
    expect(rest().textContent).not.toMatch(/命局提要|提要暂不可用|盘面标记|大运一览/)
    render(undefined, null)
    expect(rest().textContent).toContain('这张盘的提要暂不可用。')
  })

  it.each([undefined, { mode: 'neutral' }])('escapes server and metadata text in either mode: %j', options => {
    const resp = fixture()
    resp.chart.year_pillar.shishen_gan = '<img src=x onerror=alert(1)>'
    resp.chart.shensha[0].name = '<script>bad()</script>'
    resp.chart.current_fortune.current_liunian.shishen = '<b>untrusted</b>'
    BaziRender.render(host(), resp, { ...meta, name: '<svg onload=alert(1)>' }, rest(), options)
    expect(document.body.querySelector('script, img, svg')).toBeNull()
    expect(text()).toContain('<img src=x onerror=alert(1)>')
    expect(text()).toContain('<script>bad()</script>')
    expect(text()).toContain('<svg onload=alert(1)>')
    expect(text()).toContain('<b>untrusted</b>')
  })
})

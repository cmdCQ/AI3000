// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('../shared/auth.js', () => ({
  AUTH: { isLoggedIn: vi.fn(() => true), getToken: vi.fn(() => '') },
  handleApiUnauthorized: vi.fn(() => false), openAuthModal: vi.fn(),
}))
vi.mock('../shared/liuyaoRender.js', () => ({ savedAnalysis: '' }))
vi.mock('../shared/mhysRender.js', () => ({ savedAnalysis: '', renderResult: vi.fn() }))
import { AUTH, openAuthModal } from '../shared/auth.js'
import { BaziAI } from '../shared/baziAiPanel.js'
import { abortAIStream, abortAIFollowUp, startButtonClicked, setAIPanelFolded, refreshAIPanel } from '../shared/aiPanel.js'
const birth = { y:1990, mo:5, d:17, h:14, mi:30, gender:'male' }
class XHR {
  static all = []
  constructor() { this.responseText = ''; this.status = 200; XHR.all.push(this) }
  open(method, url) { this.method = method; this.url = url }
  setRequestHeader() {}
  send(body) { this.body = JSON.parse(body) }
  abort() { this.aborted = true; this.onloadend?.() }
  chunk(text) { this.responseText = text; this.onprogress?.() }
  finish(text, status = 200) { this.status = status; this.chunk(text); this.onloadend?.() }
}
const el = id => document.getElementById(id)
const mount = () => BaziAI.mount(el('baziAi'), { chartId:'synthetic', birth:{ ...birth } })
beforeEach(() => {
  vi.useFakeTimers(); XHR.all = []; vi.stubGlobal('XMLHttpRequest', XHR)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok:true, json:async () => [] })))
  AUTH.isLoggedIn.mockReturnValue(true); window.AUTH = AUTH
  localStorage.clear(); sessionStorage.clear()
  document.body.innerHTML = '<div id="baziAi"></div>'
})
afterEach(() => { abortAIStream(); abortAIFollowUp(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('八字 AI 独立交互保护（全部请求 stub）', () => {
  it('单一标题、五方面和唯一完整区域折叠；挂载/选择不发 AI', () => {
    mount(); BaziAI.select('事业')
    expect(document.querySelectorAll('.ai-panel-header')).toHaveLength(1)
    expect(document.querySelectorAll('[aria-controls="aiPanelBody"]')).toHaveLength(1)
    expect(el('baziAspectBar').closest('#aiPanelBody')).not.toBeNull()
    expect(el('baziAiHistory').closest('#aiPanelBody')).not.toBeNull()
    expect(document.querySelectorAll('.bz-aspect')).toHaveLength(5)
    expect(XHR.all).toHaveLength(0)
    expect(el('bz-ai-style')).toBeNull()
  })
  it.each(BaziAI.ASPECTS)('%s 主动开始传正确方面；折叠不断流，积分保留', aspect => {
    mount(); BaziAI.select(aspect); startButtonClicked()
    const xhr = XHR.all[0]
    expect(xhr.body).toMatchObject({ ...birth, tab:aspect, chartId:'synthetic' })
    setAIPanelFolded(true); xhr.chunk('第一段')
    expect(xhr.aborted).not.toBe(true)
    xhr.finish('完整解读\n\n---\n消耗积分：输入 1 + 输出 2 = 3 ｜ 剩余：10')
    setAIPanelFolded(false)
    expect(el('aiResponse').textContent).toContain('完整解读')
    expect(document.querySelector('.ai-points').textContent).toBe('本次消耗 3 积分')
    expect(window.AI_PANEL_CONF.saved()).toContain('完整解读')
  })
  it('切方面取消主流，迟到结果不串且不缓存', () => {
    mount(); BaziAI.select('事业'); startButtonClicked()
    const xhr = XHR.all[0]; xhr.chunk('事业开头'); BaziAI.select('财运')
    expect(xhr.aborted).toBe(true); xhr.finish('迟到事业')
    expect(el('aiResponse').textContent).not.toContain('迟到事业')
    BaziAI.select('事业'); expect(window.AI_PANEL_CONF.saved()).toBe('')
  })
  it('追问沿当前方面，切换取消且迟到拒绝不污染新方面/游客标记', async () => {
    mount(); BaziAI.select('事业'); startButtonClicked(); XHR.all[0].finish('事业报告')
    el('aiFollowInput').value = '下一年呢？'; await window.sendFollowUp()
    const xhr = XHR.all[1]
    expect(xhr.body).toMatchObject({ tab:'事业', followUp:'下一年呢？', context:'事业报告' })
    expect(birth).not.toHaveProperty('followUp')
    BaziAI.select('健康'); expect(xhr.aborted).toBe(true)
    xhr.finish('{"needLogin":true}', 403)
    expect(el('aiFollowHist').textContent).toBe('')
    expect(el('aiResponse').textContent).not.toContain('登录')
    expect(el('aiFollowBtn').disabled).toBe(false)
    expect(localStorage.getItem('bazi_anon_used')).toBeNull()
  })
  it('历史最新在前，旧版展开；已有记录不重复调用', async () => {
    fetch.mockResolvedValue({ ok:true, json:async () => [
      { aspect:'事业', analysis:'旧版', createdAt:'2025-01-01' },
      { aspect:'事业', analysis:'最新版', createdAt:'2026-01-01' },
    ] })
    const panel = mount(); await panel.reload(); BaziAI.select('事业'); startButtonClicked()
    expect(el('aiResponse').textContent).toContain('最新版')
    expect(el('baziAiHistory').textContent).toContain('旧版')
    expect(document.querySelector('.bz-hist details')).not.toBeNull()
    expect(XHR.all).toHaveLength(0)
  })
  it('新解读暂未保存时不吞掉原最新历史，保存后不重复它', async () => {
    let rows = [{ aspect:'事业', analysis:'原最新', createdAt:'2026-01-01' }]
    fetch.mockImplementation(async () => ({ ok:true, json:async () => rows }))
    const panel = mount(); await panel.reload(); BaziAI.select('事业')
    window.AI_PANEL_CONF.setSaved('刚完成的新报告')
    BaziAI.select('财运'); BaziAI.select('事业')
    expect(el('aiResponse').textContent).toContain('刚完成的新报告')
    expect(el('baziAiHistory').textContent).toContain('原最新')
    rows = [{ aspect:'事业', analysis:'刚完成的新报告', createdAt:'2026-02-01' }, ...rows]
    await panel.reload()
    expect(el('baziAiHistory').textContent).toContain('原最新')
    expect(el('baziAiHistory').textContent).not.toContain('刚完成的新报告')
  })
  it('游客综合须登录、一次限制和真实登录按钮记住方面；登录后接着开始', () => {
    AUTH.isLoggedIn.mockReturnValue(false); mount(); startButtonClicked()
    expect(XHR.all).toHaveLength(0)
    expect(el('aiResponse').textContent).toContain('综合')
    BaziAI.select('婚姻'); localStorage.setItem('bazi_anon_used','1'); startButtonClicked()
    el('aiResponse').querySelector('[data-auth="login"]').click()
    expect(openAuthModal).toHaveBeenCalledWith('login')
    expect(sessionStorage.getItem('bazi_pending_aspect')).toBe('婚姻')
    AUTH.isLoggedIn.mockReturnValue(true); mount()
    expect(XHR.all[0].body.tab).toBe('婚姻')
    expect(document.querySelectorAll('#baziAspectBar')).toHaveLength(1)
  })
  it.each(['network', 'http'])('失败不把半截标成已完成：%s', mode => {
    mount(); BaziAI.select('财运'); startButtonClicked(); const xhr = XHR.all[0]
    xhr.chunk('半截');
    if (mode === 'network') { xhr.status = 0; xhr.onerror() } else xhr.status = 500
    xhr.onloadend()
    expect(window.AI_PANEL_CONF.saved()).toBe('')
    expect(el('aiFollowBar').classList.contains('show')).toBe(false)
  })
  it('积分不足显示服务端提示，不缓存或发起记录写入', () => {
    mount(); BaziAI.select('事业'); startButtonClicked()
    XHR.all[0].finish('{"error":"积分不足，请充值"}', 429)
    expect(el('aiResponse').textContent).toContain('积分不足，请充值')
    expect(window.AI_PANEL_CONF.saved()).toBe('')
    expect(fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true)
  })
  it('新盘挂载忽略旧盘迟到历史', async () => {
    let resolve
    fetch.mockReturnValueOnce(new Promise(r => { resolve = r }))
    mount(); mount(); resolve({ ok:true, json:async () => [{ aspect:'综合', analysis:'旧盘迟到记录' }] })
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(window.AI_PANEL_CONF.saved()).toBe('')
    expect(document.querySelectorAll('#aiPanel')).toHaveLength(1)
  })
})
describe.each(['mhys', 'liuyao'])('公共引擎默认 %s 回归', cardType => {
  it.each([0, 302, 400, 429, 500])('首次非2xx %s 不保存/写库/消耗游客机会，保留重试', status => {
    AUTH.isLoggedIn.mockReturnValue(false)
    document.body.innerHTML = '<div id="resultArea"></div>'
    const setSaved = vi.fn()
    window.AI_PANEL_CONF = { cardType, recordsPath:'/api/mock-records', recordId:() => 'r1', anonUsedKey:`${cardType}_anon_used`, hasChart:() => true, setSaved }
    refreshAIPanel(); expect(XHR.all).toHaveLength(0); startButtonClicked()
    XHR.all[0].finish('{"error":"积分不足，请稍后重试"}', status)
    expect(setSaved).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(localStorage.getItem(`${cardType}_anon_used`)).toBeNull()
    expect(el('aiResponse').textContent).toContain('积分不足')
    expect(el('aiResponse').querySelector('.ai-start-btn').textContent).toBe('重试')
    expect(el('aiFollowBar').classList.contains('show')).toBe(false)
  })
  it.each([0, 302, 400, 429, 500])('追问非2xx %s 不消费机会，保留问题与重试栏', async status => {
    AUTH.isLoggedIn.mockReturnValue(false)
    document.body.innerHTML = '<div id="resultArea"></div>'
    const setSaved = vi.fn()
    window.AI_PANEL_CONF = { cardType, anonFollowKey:`${cardType}_anon_follow`, saved:() => '旧报告\n消耗 Token：10000', setSaved }
    refreshAIPanel(); expect(XHR.all).toHaveLength(0)
    el('aiFollowInput').value = '原问题'; await window.sendFollowUp()
    expect(XHR.all[0].body.cardData.context).toBe('旧报告')
    XHR.all[0].finish('{"error":"积分不足，请重试"}', status)
    expect(setSaved).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled()
    expect(localStorage.getItem(`${cardType}_anon_follow`)).toBeNull()
    expect(el('aiFollowInput').value).toBe('原问题')
    expect(el('aiFollowBtn').disabled).toBe(false)
    expect(el('aiFollowBar').classList.contains('show')).toBe(true)
    expect(el('aiFollowHist').textContent).toContain('积分不足')
  })
  it('游客引导是每周10积分而非次数，历史Token仍是Token', () => {
    AUTH.isLoggedIn.mockReturnValue(false)
    document.body.innerHTML = '<div id="resultArea"></div>'
    window.AI_PANEL_CONF = { cardType, anonUsedKey:'used' }
    localStorage.setItem('used', '1'); refreshAIPanel()
    expect(el('aiResponse').textContent).toContain('每周享 10 积分')
    expect(el('aiResponse').textContent).toContain('北京时间周一零点刷新')
    expect(el('aiResponse').textContent).toContain('免费解析一次')
    expect(el('aiResponse').textContent).not.toContain('100 次')
    window.AI_PANEL_CONF.saved = () => '历史\n消耗 Token：10000'
    refreshAIPanel()
    expect(document.querySelector('.ai-points').textContent).toBe('本次消耗 10000 Token')
  })
  it('主动开始、折叠流、积分、保存和追问协议不变', async () => {
    document.body.innerHTML = '<div id="resultArea"></div>'
    let saved = ''
    window.AI_PANEL_CONF = { cardType, hasChart:() => true, topic:() => '工作', payload:() => ({ test:'synthetic' }), saved:() => saved, setSaved:v => { saved = v } }
    refreshAIPanel(); expect(XHR.all).toHaveLength(0); startButtonClicked()
    expect(XHR.all[0].url).toBe('/api/chat/send')
    expect(XHR.all[0].body).toEqual({ message:'工作', cardType, cardData:{ test:'synthetic' } })
    setAIPanelFolded(true); XHR.all[0].chunk('解卦'); expect(XHR.all[0].aborted).not.toBe(true)
    XHR.all[0].finish('完整解卦\n消耗积分：3'); expect(saved).toContain('完整解卦')
    setAIPanelFolded(false); el('aiFollowInput').value = '追问'; await window.sendFollowUp()
    expect(XHR.all[1].body.cardData).toMatchObject({ followUp:'追问', context:'完整解卦' })
    XHR.all[1].finish('追问答复'); expect(el('aiFollowHist').textContent).toContain('追问答复')
    expect(saved).not.toContain('追问答复')
  })
})

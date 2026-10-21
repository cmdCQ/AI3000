import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AssistantRuntimeProvider, useLocalRuntime, ThreadPrimitive, MessagePrimitive, ComposerPrimitive, AuiIf } from '@assistant-ui/react'
import { getChart, getConsultation, params, requestId, sendConsultation } from './api.js'
import ConsultationHistory from './ConsultationHistory.jsx'
import { renderMarkdown } from '../shared/uiCommon.js'
import { billingNotice } from '../lib/points.js'
import './style.css'

const PRESETS = [
  ['overview', '我的命局有哪些主要特点？'],
  ['career', '事业发展适合重点考虑什么？'],
  ['relationship', '感情与相处模式有哪些特点？'],
  ['year', '今年有哪些值得关注的变化？'],
]
function toMessages(rows = []) {
  return rows.map(m => ({ id: m.id, role: m.role, content: [{ type: 'text', text: m.content || '' }] }))
}
function outcomeNotice(result) {
  const status = { completed: '回答生成完成', partial: '回答未完整生成', stopped: '已停止生成', failed: '生成失败' }[result.status] || '生成状态未知'
  const saved = result.save?.status === 'saved' ? '记录已保存' : '记录保存未确认，请重新加载记录核对'
  const billing = billingNotice(result.billing)
  return `${status}；${saved}；${billing}。`
}
function useConsultationAdapter({ chartId, consultationId, presetRef, report }) {
  const activeId = useRef(consultationId)
  return useMemo(() => ({
    run: async function* ({ messages, abortSignal }) {
      const text = messages.at(-1)?.content?.filter(p => p.type === 'text').map(p => p.text).join('\n') || ''
      const payload = { message: text, requestId: requestId() }
      if (activeId.current) payload.consultationId = activeId.current
      else payload.chartId = chartId
      if (presetRef.current?.text === text) payload.presetId = presetRef.current.id
      presetRef.current = null
      let full = ''
      report({ notice: '', draft: '', phase: 'running' })
      try {
        for await (const item of sendConsultation(payload, abortSignal)) {
          // 只有**第一次**拿到 id 时改地址栏。服务端在每个 delta 帧里都带 consultationId，
          // 逐帧 replaceState 会在 Safari 上撞上「Attempt to use history.replaceState() more than
          // 100 times per 10 seconds」——那是个**会抛异常**的限制，异常从 for-await 里冒出来，
          // 于是流被就地掐断、回答停在一句话中间（用户实测：iPhone 上「一直被截断」）。
          // 同一件事在 Chrome 上只是节流警告，所以只在她的设备上复现。
          if (item.data.consultationId && item.data.consultationId !== activeId.current) {
            activeId.current = item.data.consultationId
            try {
              window.history.replaceState(null, '', `/bazi-consult/?consultationId=${encodeURIComponent(activeId.current)}`)
            } catch { /* 地址栏同步失败不能影响正在生成的回答 */ }
          }
          if (item.event === 'delta') {
            full += item.data.text || ''
            yield { content: [{ type: 'text', text: full }] }
          } else if (item.event === 'done') {
            report({ notice: outcomeNotice(item.data), draft: item.data.status === 'completed' ? '' : text, phase: 'done' })
          }
        }
      } catch (error) {
        // 服务端的 4xx/5xx 自带可读文案（「请先登录」「咨询条数已达上限」），原样给用户；
        // 只有浏览器侧的意外（比如读取流时抛错）才在这里补一句人话，并保留控制台细节。
        const aborted = error.name === 'AbortError'
        if (!aborted && !error.status) console.error('[bazi-consult]', error)
        report({
          notice: aborted
            ? '已停止生成；已有内容保留，记录和积分请加载咨询记录确认。'
            : (error.status ? error.message : '这次回答中途断了，已经生成的部分保留在这里，可以重新提问。'),
          draft: text,
          phase: 'done',
        })
        if (!aborted) throw error
      }
    },
  }), [chartId, presetRef, report])
}
function UserMessage() {
  return <MessagePrimitive.Root className="bc-message bc-user"><MessagePrimitive.Content /></MessagePrimitive.Root>
}
function AnswerText({ text }) {
  return <div className="bc-markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
}
function AssistantMessage() {
  return <MessagePrimitive.Root className="bc-message bc-ai">
    <span className="bc-assistant-label">易三千</span>
    <MessagePrimitive.Content components={{ Text: AnswerText }} />
  </MessagePrimitive.Root>
}
function Chat({ chart, consultation, initialMessages }) {
  const [result, setResult] = useState({ notice: '', draft: '', phase: 'idle' })
  // 等待秒数：模型出第一个字之前，界面必须有东西在动。梅花那边是「已等 N 秒」，
  // 这里沿用同一口径 —— 用户能判断「在干活」还是「卡住了」，也才能决定要不要停。
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (result.phase !== 'running') { setSeconds(0); return undefined }
    setSeconds(0)
    const timer = setInterval(() => setSeconds(value => value + 1), 1000)
    return () => clearInterval(timer)
  }, [result.phase])
  const presetRef = useRef(null)
  const adapter = useConsultationAdapter({ chartId: chart.id, consultationId: consultation?.id, presetRef, report: setResult })
  const runtime = useLocalRuntime(adapter, { initialMessages })
  useEffect(() => { if (result.draft) runtime.thread.composer.setText(result.draft) }, [result, runtime])
  return <AssistantRuntimeProvider runtime={runtime}>
    <ThreadPrimitive.Root className="bc-thread">
      <section className="bc-chat">
        <ThreadPrimitive.Viewport className="bc-messages">
          <div className="bc-message-content">
            <AuiIf condition={s => s.thread.isEmpty}>
              <section className="bc-welcome">
                <span className="bc-welcome-mark" aria-hidden="true">✦</span>
                <h2>你想先了解什么？</h2>
                <p>已关联{chart.name || '当前命盘'}，直接提问即可。</p>
                <div className="bc-presets">{PRESETS.map(([id, label]) =>
                  <button key={id} onClick={() => {
                    presetRef.current = { id, text: label }
                    runtime.thread.append(label)
                  }}>{label}<span aria-hidden="true">↗</span></button>)}</div>
              </section>
            </AuiIf>
            <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
            <AuiIf condition={s => s.thread.isRunning}>
              <p className="bc-generating" role="status" aria-live="polite">
                <span className="bc-gen-dot" aria-hidden="true" />
                正在输出中<span className="bc-gen-elapsed">（已 {seconds} 秒）</span>
              </p>
            </AuiIf>
          </div>
        </ThreadPrimitive.Viewport>
          <ThreadPrimitive.ScrollToBottom className="bc-latest" aria-label="回到最新消息">↓ 回到最新</ThreadPrimitive.ScrollToBottom>
        <footer className="bc-input-area">
          {result.notice && <p role="status" className="bc-status">{result.notice}</p>}
          <ComposerPrimitive.Root className="bc-composer">
            <ComposerPrimitive.Input aria-label="输入你想问的问题……" placeholder="输入你想问的问题……" rows={1} maxLength={12000} />
            <AuiIf condition={s => !s.thread.isRunning}><ComposerPrimitive.Send className="bc-send" aria-label="发送消息">↑</ComposerPrimitive.Send></AuiIf>
            <AuiIf condition={s => s.thread.isRunning}><ComposerPrimitive.Cancel className="bc-cancel" aria-label="停止生成">■</ComposerPrimitive.Cancel></AuiIf>
          </ComposerPrimitive.Root>
          <p className="bc-input-hint">AI 内容仅供参考，请结合实际判断</p>
        </footer>
      </section>
    </ThreadPrimitive.Root>
  </AssistantRuntimeProvider>
}
function birthLabel(chart) {
  const b = chart.birth
  return b ? `${b.year}年${b.month}月${b.day}日 ${String(b.hour ?? 12).padStart(2, '0')}:${String(b.minute ?? 0).padStart(2, '0')}` : chart.birthDate || ''
}
function ConsultationState({ error, retry }) {
  const status = error?.status
  const missing = status === 404
  const unauthorized = status === 401
  const title = !error ? '正在加载咨询' : missing ? '咨询不存在或已删除' : unauthorized ? '请先登录' : '咨询加载失败'
  return <main className="bc-page">
    <header className="bc-header"><a className="bc-back" href="/select-chart/?type=charts" aria-label="返回命盘列表">←</a><div className="bc-heading"><h1>八字咨询</h1></div></header>
    <section className="bc-state" aria-busy={!error}>
      <span className="bc-state-mark" aria-hidden="true">{!error ? '…' : unauthorized ? '🔒' : '◇'}</span>
      <h2>{title}</h2>
      <p role={error ? 'alert' : 'status'}>{!error ? '正在读取咨询内容，请稍候。' : missing ? '这条咨询可能已被删除，或不属于当前账户。请返回记录查看其他咨询。' : unauthorized ? '登录后才能查看属于你的咨询记录。' : error.message}</p>
      <div className="bc-state-actions">
        {unauthorized ? <a className="bc-state-primary" href="/login/">去登录</a> : error && !missing && <button className="bc-state-primary" onClick={retry}>重试</button>}
        {error && <a className={missing ? 'bc-state-primary' : ''} href="/bazi-consult/?view=history">返回咨询记录</a>}
        {error && <a href="/select-chart/?type=charts">返回命盘列表</a>}
      </div>
    </section>
  </main>
}
function ConsultationPage() {
  const q = params()
  const chartId = q.get('chartId')
  const consultationId = q.get('consultationId')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    setError(null)
    setData(null)
    const controller = new AbortController()
    const signal = controller.signal
    ;(async () => {
      try {
        let chart, consultation, messages = []
        if (consultationId) {
          const response = await getConsultation(consultationId, signal)
          consultation = response.consultation
          chart = { ...consultation.chartSnapshot, id: consultation.chartId }
          messages = toMessages(response.messages)
        } else if (chartId) {
          const response = await getChart(chartId, signal)
          chart = response.chart || response
        } else throw new Error('请从命盘卡片发起咨询')
        if (!signal.aborted) setData({ chart, consultation, messages })
      } catch (e) { if (!signal.aborted) setError(e) }
    })()
    return () => controller.abort()
  }, [chartId, consultationId, revision])
  if (error || !data) return <ConsultationState error={error} retry={() => setRevision(value => value + 1)} />
  const { chart, consultation, messages } = data
  const currentChartId = chart?.id || chartId
  return <main className="bc-page">
    <header className="bc-header">
      <a className="bc-back" href="/select-chart/?type=charts" aria-label="返回命盘列表">←</a>
      <div className="bc-heading"><h1>{chart.name || '命盘'}的八字咨询</h1><p>{chart.gender === 'male' ? '男' : chart.gender === 'female' ? '女' : chart.gender} · {birthLabel(chart)}</p></div>
      <nav aria-label="咨询操作"><a href={`/my-charts/?id=${encodeURIComponent(chart.id)}`} target="_blank" rel="noreferrer">完整排盘</a><a href={`/bazi-consult/?view=history${currentChartId ? `&chartId=${encodeURIComponent(currentChartId)}` : ''}`}>记录</a></nav>
    </header>
    <Chat chart={chart} consultation={consultation} initialMessages={messages} />
  </main>
}
function App() {
  const q = params()
  return q.get('view') === 'history' ? <ConsultationHistory chartId={q.get('chartId')} /> : <ConsultationPage />
}
createRoot(document.getElementById('root')).render(<App />)

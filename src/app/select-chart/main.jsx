// 选盘入口保留五态；游客首帧不加载，也不请求私有列表。
import '../shared/authModalStyles.js'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { getToken, isLoggedIn, openAuthModal } from '../lib/auth.js'
import { cardFields, compatibilityNotice, createLinkHref, emptyDescription, listError, resolveModule, resolveType } from './selectChart.logic.js'

function ChartCard({ fields, consultationHref }) {
  return (
    <article className="mc-card">
      <a className="card-detail-link" href={fields.href}>
      <span className="card-zodiac" aria-hidden="true">{fields.zodiac}</span>
      <div className="card-body">
        <div className="card-name">{fields.name}{fields.baziShort ? <span className="card-bazi"> {fields.baziShort}</span> : null}</div>
        <div className="card-info">
          <span>{fields.gender}</span><span>{fields.dateStr}</span><span>{fields.shichen}</span>
          {fields.createStr ? <span className="card-created">创建于 {fields.createStr}</span> : null}
        </div>
      </div>
      <span className="card-arrow" aria-hidden="true">›</span>
      </a>
      {consultationHref ? <a className="card-consult-link secondary-btn" href={consultationHref}>发起咨询</a> : null}
    </article>
  )
}

function GuestState() {
  return (
    <div className="empty-state">
      <div className="es-icon" aria-hidden="true">🔒</div>
      <h2 className="es-title">登录后查看已有命盘</h2>
      <p className="es-desc">保存多份命盘，随时查看排盘；也可先进入新建入口。</p>
      <div className="state-actions">
        <button type="button" className="add-btn" onClick={() => openAuthModal('login')}>登录</button>
        <button type="button" className="secondary-btn" onClick={() => openAuthModal('register')}>注册</button>
      </div>
    </div>
  )
}

export default function App() {
  const { type } = resolveType(window.location.search)
  const { name } = resolveModule(type)
  const notice = compatibilityNotice(type)
  const [phase, setPhase] = useState(() => (isLoggedIn() ? 'loading' : 'guest'))
  const [charts, setCharts] = useState([])
  const [errorStatus, setErrorStatus] = useState(null)

  useEffect(() => {
    if (phase !== 'loading') return
    let alive = true
    const controller = new AbortController()
    fetch('/api/charts', { headers: { Authorization: 'Bearer ' + getToken() }, signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw Object.assign(new Error('GET /api/charts ' + res.status), { status: res.status })
        return res.json()
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid chart list')
        if (!alive) return
        setCharts(data)
        setPhase(data.length ? 'list' : 'empty')
      })
      .catch((error) => {
        if (!alive) return
        setErrorStatus(error.status || null)
        setPhase('error')
      })
    return () => { alive = false; controller.abort() }
  }, [phase])

  const error = listError(errorStatus)
  return (
    <main className="select-page">
      <header className="select-header"><a className="select-back" href="/">← 返回</a><h1 className="select-title">{name}</h1></header>
      {notice ? <p className="compatibility-notice">{notice}</p> : null}
      <section className="select-content" aria-label="选择命盘">
        <div className="select-toolbar">
          {phase !== 'empty' ? <a href={createLinkHref(type)} id="create-link" className={phase === 'list' ? 'add-btn' : 'secondary-btn'}>＋ 新建命盘</a> : null}
        </div>
        <div id="content-area" aria-live="polite" aria-busy={phase === 'loading'}>
          {phase === 'guest' ? <GuestState /> : null}
          {phase === 'loading' ? <p className="loading-msg" role="status">加载中…</p> : null}
          {phase === 'error' ? (
            <div className="empty-state" role="alert">
              <h2 className="es-title">{error.title}</h2>
              <p className="es-desc">{error.description}</p>
              <button type="button" className="add-btn" onClick={() => error.reauthenticate ? openAuthModal('login') : setPhase('loading')}>{error.action}</button>
            </div>
          ) : null}
          {phase === 'empty' ? (
            <div className="empty-state">
              <div className="es-icon" aria-hidden="true">📜</div>
              <h2 className="es-title">还没有命盘</h2>
              <p className="es-desc">{emptyDescription(type)}</p>
              <a href={createLinkHref(type)} id="create-link" className="add-btn">＋ 新建命盘</a>
            </div>
          ) : null}
          {phase === 'list' ? <div className="chart-list">{charts.map((c) => <ChartCard key={c.id} fields={cardFields(c)} consultationHref={type === 'charts' ? '/bazi-consult/?chartId=' + encodeURIComponent(c.id) : null} />)}</div> : null}
        </div>
        {type === 'charts' && phase === 'list' ? <nav className="consultation-records" aria-label="咨询记录"><a className="consultation-record-card" href="/bazi-consult/?view=history"><span className="records-entry-icon" aria-hidden="true">☰</span><span className="records-entry-copy"><strong>咨询记录</strong><small>查看、继续或管理已有咨询</small></span><span className="card-arrow" aria-hidden="true">›</span></a></nav> : null}
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)

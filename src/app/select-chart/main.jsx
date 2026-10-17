// `/select-chart/` 选盘页。
//
// 老实现 `src/web/js/page-select-chart.js` 只有 101 行、四个状态：
//   未登录 → 登录提示｜请求失败 → 加载失败｜没有记录 → 还没有命盘｜有记录 → 卡片列表
// 这里把状态机显式写出来（`phase`），不再靠 innerHTML 覆写——四段字符串模板
// 各自覆写同一个 `#content-area` 正是老实现容易漏分支的地方。
//
// ★ 一个必须照抄的时序：**未登录时不能闪「加载中…」**。老代码在第一次 await
//   之前就同步写了登录提示（:16-24 直接 return），所以游客永远看不到 loading。
//   这里用 `useState` 的惰性初值把 `isLoggedIn()` 在首帧就定下来，效果相同。

import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import './style.css'
import { getToken, isLoggedIn, openAuthModal } from '../lib/auth.js'
import {
  cardFields,
  createLinkHref,
  emptyDescription,
  resolveModule,
  resolveType,
} from './selectChart.logic.js'

/** 一条命盘卡片。整块可点（老实现是 onclick 跳转，不是 <a> 包裹）。 */
function ChartCard({ fields }) {
  return (
    <div className="mc-card" onClick={() => { window.location.href = fields.href }}>
      <div className="card-zodiac">{fields.zodiac}</div>
      <div className="card-body">
        <div className="card-name">
          {fields.name}
          {fields.baziShort ? (
            <span style={{ fontSize: '0.75rem', color: '#9a8b7a', fontWeight: 400 }}>
              {' '}{fields.baziShort}
            </span>
          ) : null}
        </div>
        <div className="card-info">
          <span>{fields.gender}</span>
          <span>{fields.dateStr}</span>
          <span>{fields.shichen}</span>
          {fields.createStr ? <span>创建于 {fields.createStr}</span> : null}
        </div>
      </div>
      <div className="card-arrow">›</div>
    </div>
  )
}

function GuestState() {
  return (
    <>
      <div className="empty-state">
        <div className="es-icon">🔒</div>
        <p className="es-title">登录后使用</p>
        <p className="es-desc">保存多份命盘，随时查看排盘</p>
      </div>
      <a href="javascript:void(0)" className="add-btn" onClick={() => openAuthModal('login')}>登录</a>
      <p className="auth-link" style={{ marginTop: '0.6rem' }}>
        <a href="javascript:void(0)" onClick={() => openAuthModal('register')}>注册</a>
      </p>
    </>
  )
}

function EmptyState({ type }) {
  return (
    <>
      <div className="empty-state">
        <div className="es-icon">📜</div>
        <p className="es-title">还没有命盘</p>
        <p className="es-desc">{emptyDescription(type)}</p>
      </div>
      <a href={createLinkHref(type)} className="add-btn">＋ 新建命盘</a>
    </>
  )
}

function ErrorState() {
  return (
    <div className="empty-state">
      <p className="es-desc" style={{ color: '#c55' }}>加载失败，请稍后重试</p>
    </div>
  )
}

export default function App() {
  const { type } = resolveType(window.location.search)
  const { icon, name } = resolveModule(type)

  const [phase, setPhase] = useState(() => (isLoggedIn() ? 'loading' : 'guest'))
  const [charts, setCharts] = useState([])

  useEffect(() => {
    if (phase !== 'loading') return
    let alive = true
    fetch('/api/charts', { headers: { Authorization: 'Bearer ' + getToken() } })
      .then((res) => {
        if (!res.ok) throw new Error('GET /api/charts ' + res.status)
        return res.json()
      })
      .then((data) => {
        if (!alive) return
        const list = Array.isArray(data) ? data : []
        setCharts(list)
        setPhase(list.length ? 'list' : 'empty')
      })
      .catch(() => { if (alive) setPhase('error') })
    return () => { alive = false }
  }, [phase])

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>易三千</h1>
        <p className="sub">选择命盘开始排盘</p>

        {/* ★ 两个 span 之间那个空格是**必须留住**的：老 HTML 里它们各占一行，
            换行在行内上下文里折成一个空格（3.19px），`.name` 才会从 x=86.19 开始。
            JSX 会吃掉元素之间的换行空白 —— 少了它 `.name` 落到 83.19，
            视觉基线立刻报 52×12 像素差。`{' '}` 就是那个空格。 */}
        <div className="module-label">
          <span className="icon">{icon}</span>{' '}
          <span className="name">{name}</span>
        </div>

        <div id="content-area">
          {phase === 'guest' ? <GuestState /> : null}
          {phase === 'loading' ? <div className="loading-msg">加载中…</div> : null}
          {phase === 'error' ? <ErrorState /> : null}
          {phase === 'empty' ? <EmptyState type={type} /> : null}
          {phase === 'list' ? (
            <div className="chart-list">
              {charts.map((c) => <ChartCard key={c.id} fields={cardFields(c)} />)}
            </div>
          ) : null}
        </div>

        <p className="auth-link" style={{ marginTop: '0.8rem' }}>
          <a href={createLinkHref(type)} id="create-link">新建命盘</a>
        </p>

        <a href="/" className="auth-back">← 返回首页</a>
      </div>
    </div>
  )
}

// 老 `page-select-chart.js` 是自上而下跑完即生效；这里等价于「挂载即渲染」。
createRoot(document.getElementById('root')).render(<App />)

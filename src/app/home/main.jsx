import '../shared/authModalStyles.js';
import { getCookie, AUTH, openAuthModal } from '../shared/auth.js';
// 首页 —— 阶段 3 的第一页用**真 React 组件**写成，不是 `dangerouslySetInnerHTML` 套壳。
//
// 为什么这一页不照前五页的套壳写法：那五页（`/my/` `/mhys/` `/liuyao/` …）套壳是为了
// 让「搬过来的 HTML」与老实现逐字节可比 —— 当时唯一的判据是手搓的差分脚本，只能比字符串。
// 首页现在有 `tests/home.spec.mjs` 的视觉基线兜底（Playwright，真浏览器截图比对），
// 判据从「字符串相同」升级成「画出来一样、点起来一样」，于是可以按目标架构写。
// 这也顺手消掉了那五页的技术债：`installGlobals()`（把函数挂 window 给 HTML 里的
// `onclick=` 用）在这一页**一个都不需要**，因为事件全部走 React 的 `onClick`。
import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import {
  FALLBACK_MD,
  LAUNCH_TS,
  extractMarqueeText,
  formatUptime,
  getAnnouncementContent,
  parseUserCookie,
  renderMarkdown,
  shouldAutoShow,
} from './home.logic.js'

// ── 与共享层的接缝 ────────────────────────────────────────────────
// `auth.js` 已在阶段 4 搬成 ESM（`src/app/shared/auth.js`），这里直接调模块导出。
function isLoggedIn() {
  try {
    return !!AUTH.isLoggedIn()
  } catch (e) {
    return false
  }
}

function currentUser() {
  return parseUserCookie(document.cookie)
}

// ── 公告 ─────────────────────────────────────────────────────────
function readLs(key) {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    return null
  }
}

function writeLs(key, val) {
  try {
    localStorage.setItem(key, val)
  } catch (e) {
    /* 隐私模式下 localStorage 会抛，静默忽略 —— 老实现也是这么吞的 */
  }
}

// ── AI 对话入口 ───────────────────────────────────────────────────
// 老实现是把 `/ai-chat/` 整个页面塞进 iframe 全屏盖住（page-home.js:98）。
// 本轮照旧用 iframe：`/ai-chat/` 自己已经是 React 页，改成组件嵌进来会动它的
// 路由与登录态，属于计划文档 §4.5 里明确推迟的事。iframe 与父页之间靠
// `window.dispatchEvent(new Event('closeChatOverlay'))` 通信（老实现 page-home.js:116）。
function ChatOverlay({ open, onClose }) {
  return (
    <div
      className={'chat-overlay' + (open ? ' open' : '')}
      id="chatOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="chat-overlay-inner">
        {/* 只有打开时才给 src：老实现一开始就挂着 src，导致首页一进来就预加载
            整个 AI 对话（含它的 React 包）。改成打开时再挂，首屏少一次
            ~88KB(gzip) 的请求；关闭时保留 DOM（与老实现一致，避免重开重新加载）。 */}
        <iframe
          className="chat-overlay-iframe"
          id="chatIframe"
          src={open ? '/ai-chat/' : undefined}
          title="AI 对话"
          frameBorder="0"
        />
      </div>
    </div>
  )
}

function AnnouncementModal({ open, md, onClose }) {
  return (
    <div
      className={'announcement-overlay' + (open ? ' open' : '')}
      id="announcementOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="announcement-modal">
        <div className="announcement-modal-header">
          {/* 标题前缀原来是个 📢 —— 和全站的玉青/暖金系统不搭，也吵。
              现在改成一个 3px 的玉青竖条（纯 CSS，见 home.css 的
              `.announcement-modal-title::before`），只用主色，不加 emoji。 */}
          <span className="announcement-modal-title">公告</span>
          <button className="announcement-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div
          className="announcement-modal-body markdown-body"
          id="announcementModalBody"
          // 这里必须是 innerHTML：`renderMarkdown()` 的输出就是一段 HTML 串，
          // 且它第一件事就是把 `& < >` 转义掉（home.logic.js 里逐行照搬老实现）。
          dangerouslySetInnerHTML={{ __html: renderMarkdown(md || '加载中...') }}
        />
      </div>
    </div>
  )
}

// ── 底部导航 ─────────────────────────────────────────────────────
const NAV = [
  { key: 'modules', label: '命理与术数' },
  { key: 'charts', label: '我的命盘', href: '/my-charts/' },
  { key: 'profile', label: '我的', href: '/my/' },
]

function BottomNav({ tab, onTab }) {
  return (
    <nav className="bottom-nav" id="bottomNav">
      {NAV.map((item) => (
        <button
          key={item.key}
          className={'nav-item' + (tab === item.key ? ' active' : '')}
          data-tab={item.key}
          // 老实现里后两项是 `onclick="location.href='/my-charts/'"`，即真跳页，
          // 不是切 tab；只有第一项是切 tab。保持原样。
          onClick={item.href ? () => (window.location.href = item.href) : () => onTab(item.key)}
          style={item.href ? { cursor: 'pointer' } : undefined}
        >
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ── Tab 1：命理与术数 ────────────────────────────────────────────
function ModuleCard({ icon, name, desc, onClick }) {
  return (
    <div className="module-card active" onClick={onClick}>
      <span className="icon">{icon}</span>
      <span className="body">
        <span className="name">{name}</span>
        <span className="desc">{desc}</span>
      </span>
    </div>
  )
}

function ModulesTab({ marquee, onOpenAnnouncement, onModule, onSuggestion, uptime }) {
  return (
    <div id="tab-modules" className="tab-content">
      <div className="announcement-bar" id="announcementBar" onClick={onOpenAnnouncement}>
        {/* 原来这里是 📢 emoji。改成一颗玉青小圆点：emoji 在 iOS/Android/桌面
            三处的字形、基线、颜色都不一样，而这一行只有 0.78rem 高，
            任何一点差异都能让滚动条跳。纯 CSS 画点最稳。 */}
        <span className="announcement-icon" aria-hidden="true" />
        <div className="announcement-marquee">
          <span className="announcement-track" id="announcementTrack">
            {marquee}
          </span>
        </div>
        <span className="announcement-arrow">›</span>
      </div>

      <section className="home-section">
        <div className="section-head">
          <span className="cat">命理</span>
          <span>命运推演 · 知命而行</span>
        </div>
        <div className="module-list">
          {/* 四柱八字的注释照抄老 HTML 第 86-92 行：这条路本来就是通的，
              只是首页没有一张卡调它。描述只写现在真有的东西。 */}
          <ModuleCard
            icon="📜"
            name="四柱八字"
            desc="四柱干支 · 农历生肖 · 真太阳时"
            onClick={() => onModule('charts')}
          />
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <span className="cat">术数</span>
          <span>即时占卜 · 问事而决</span>
        </div>
        <div className="module-list">
          <ModuleCard
            icon="📖"
            name="六十四卦"
            desc="卦辞 · 爻辞 · 象传 · 详解"
            onClick={() => (window.location.href = '/hexagrams/')}
          />
          <ModuleCard
            icon="🌸"
            name="梅花易数"
            desc="年月日时 · 万物类象"
            onClick={() => onModule('meihua')}
          />
          <ModuleCard
            icon="🪙"
            name="六爻"
            desc="铜钱起卦 · 六十四卦"
            onClick={() => onModule('liuyao')}
          />
        </div>
      </section>

      <div className="home-suggestion-wrap">
        <a
          className="home-suggestion-link"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            onSuggestion()
          }}
        >
          我们需要你宝贵的建议
          <span aria-hidden="true">›</span>
        </a>
      </div>

      <footer className="home-footer">
        <div>易三千 · 2026</div>
        <div className="home-footer-credit">
          Created by{' '}
          <a href="https://github.com/cmdCQ/" target="_blank" rel="noreferrer">
            CQ / 参群
          </a>
        </div>
        <div className="uptime-line">
          <span>已稳定运行</span>
          <span className="uptime-timer" id="uptimeTimer">
            {uptime}
          </span>
        </div>
      </footer>
    </div>
  )
}

// ── Tab 3：我的 ──────────────────────────────────────────────────
// 老实现在这里用 innerHTML 拼三块内容（page-home.js:37-60）。改成受控组件，
// 分类名与层级一个字没动 —— `home.css` 的 `.charts-guest` / `.cg-*` / `.card`
// 全是按这套 class 命中的，换结构就会丢样式。
function ProfileTab({ view, user, onSettings, onBack, onLogout, onAuth }) {
  if (!user) {
    return (
      <div id="tab-profile" className="tab-content">
        <div className="charts-guest">
          <div className="cg-icon">👤</div>
          <p className="cg-title">登录账号</p>
          <p className="cg-desc">登录后使用全部功能</p>
          <div className="cg-btns">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onAuth('login')
              }}
              className="cg-btn cg-login"
            >
              去登录
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                onAuth('register')
              }}
              className="cg-btn cg-register"
            >
              注册
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'settings') {
    return (
      <div id="tab-profile" className="tab-content">
        <div style={{ padding: '0.5rem 0' }}>
          <a
            className="back-link"
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onBack()
            }}
          >
            ← 返回
          </a>
        </div>
        <div className="card" style={{ marginTop: '0.5rem' }}>
          <h3 className="card-title">⚙️ 设置</h3>
        </div>
        <div
          className="card"
          style={{ cursor: 'pointer', color: '#b85a5a' }}
          onClick={onLogout}
        >
          <div className="info-row">
            <span>退出账号</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="tab-profile" className="tab-content">
      <div className="card">
        <h3 className="card-title">👤 账户信息</h3>
        <div className="info-row">
          <span className="info-label">手机号</span>
          <span>{user}</span>
        </div>
      </div>
      <div className="card" style={{ cursor: 'pointer' }} onClick={onSettings}>
        <div className="info-row">
          <span>⚙️ 设置</span>
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
        </div>
      </div>
    </div>
  )
}

// ── 应用根 ──────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useState('modules')
  const [annOpen, setAnnOpen] = useState(false)
  const [annMd, setAnnMd] = useState('')
  const [marquee, setMarquee] = useState(
    '欢迎来到易三千 · AI 命理解读平台已正式上线，八字排盘、梅花易数、六爻起卦，DeepSeek 智能解卦，点击查看详情'
  )
  const [chatOpen, setChatOpen] = useState(false)
  const [profileView, setProfileView] = useState('main')
  const [uptime, setUptime] = useState(() => formatUptime(Date.now(), LAUNCH_TS))

  // 计时器：老实现 setInterval(updateUptime, 1000)
  useEffect(() => {
    var id = setInterval(() => setUptime(formatUptime(Date.now(), LAUNCH_TS)), 1000)
    return () => clearInterval(id)
  }, [])

  // 公告预取 + 24h 冷却自动弹窗（老实现 page-home.js:191 的 prefetchAnnouncement）
  useEffect(() => {
    var alive = true
    fetch('/api/announcement')
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return
        var md = getAnnouncementContent(data)
        setAnnMd(md)
        setMarquee(extractMarqueeText(md))

        var user = currentUser()
        var lastKnownUser = readLs('ann_last_user') || ''
        var decision = shouldAutoShow({
          currentUser: user,
          lastKnownUser: lastKnownUser,
          // 冷却读的是**本次实际会用的那个 key**：登录态与游客态分开计数
          lastShown: parseInt(readLs(user ? 'ann_login_shown' : 'ann_guest_shown') || '0', 10),
          now: Date.now(),
        })
        if (user) writeLs('ann_last_user', user)
        if (decision.show) {
          writeLs(decision.storageKey, String(Date.now()))
          setAnnOpen(true)
        }
      })
      // 静默失败：老实现也是 `.catch(function(){})`，点开公告栏时会再请求一次
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // 打开任一浮层时锁滚动（老实现 page-home.js:106 / :248 各写了一次）
  useEffect(() => {
    document.body.style.overflow = annOpen || chatOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [annOpen, chatOpen])

  // iframe 内发来的关闭事件（老实现 page-home.js:116）
  useEffect(() => {
    var handler = () => setChatOpen(false)
    window.addEventListener('closeChatOverlay', handler)
    return () => window.removeEventListener('closeChatOverlay', handler)
  }, [])

  // ESC：公告优先，其次对话（老实现 page-home.js:119 的同一优先级）
  useEffect(() => {
    var handler = (e) => {
      if (e.key !== 'Escape') return
      if (annOpen) setAnnOpen(false)
      else setChatOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [annOpen])

  const openAnnouncement = useCallback(() => {
    setAnnOpen(true)
    // 缓存还没到就再请求一次（老实现 page-home.js:258）
    if (annMd) return
    fetch('/api/announcement')
      .then((r) => r.json())
      .then((data) => setAnnMd(getAnnouncementContent(data)))
      .catch(() => setAnnMd(FALLBACK_MD))
  }, [annMd])

  const onModule = useCallback((type) => {
    // 梅花/六爻不需要登录（老实现 page-home.js:27-28）
    if (type === 'meihua') return (window.location.href = '/mhys/')
    if (type === 'liuyao') return (window.location.href = '/liuyao/')
    if (!isLoggedIn()) return openAuthModal('login')
    window.location.href = '/select-chart/?type=' + type
  }, [])

  const onSuggestion = useCallback(() => {
    // 老实现这里用 getCookie('sqw_username') 判登录，与 isLoggedIn() 等价
    if (currentUser()) window.location.href = '/suggestion/'
    else openAuthModal('login')
  }, [])

  const onChat = useCallback(() => {
    if (!isLoggedIn()) return openAuthModal('login')
    setChatOpen(true)
  }, [])

  const onLogout = useCallback(() => {
    if (!window.confirm('确定退出登录吗？')) return
    document.cookie = 'sqw_token=; path=/; max-age=0'
    document.cookie = 'sqw_username=; path=/; max-age=0'
    window.location.href = '/'
  }, [])

  const user = tab === 'profile' ? currentUser() : null

  return (
    <>
      <div className="home-wrapper">
        <header className="home-header">
          <h1 className="home-title">易三千</h1>
          <p className="home-sub">问天 · 问命 · 问心</p>
          <div className="home-rule"></div>
        </header>

        <div className="ai-chat-entrance" onClick={onChat}>
          <span className="ai-ent-icon">💬</span>
          <span className="ai-ent-text">AI 对话</span>
          <span className="ai-ent-arrow">›</span>
        </div>

        <ChatOverlay open={chatOpen} onClose={() => setChatOpen(false)} />
        <AnnouncementModal open={annOpen} md={annMd} onClose={() => setAnnOpen(false)} />

        {/* Tab 2「我的命盘」已迁到独立页 `/my-charts/`，老实现留的是一个空的
            `<div id="tab-charts" style="display:none">`（src/web/index.html:130）。
            这里直接不渲染 —— 它永远 display:none，且 DOM 里少一个空 div 不影响任何
            CSS（home.css 没有任何规则命中 #tab-charts）。 */}
        {tab === 'modules' ? (
          <ModulesTab
            marquee={marquee}
            onOpenAnnouncement={openAnnouncement}
            onModule={onModule}
            onSuggestion={onSuggestion}
            uptime={uptime}
          />
        ) : (
          <ProfileTab
            view={profileView}
            user={user}
            onAuth={openAuthModal}
            onSettings={() => setProfileView('settings')}
            onBack={() => setProfileView('main')}
            onLogout={onLogout}
          />
        )}
      </div>
      {/* 底部导航是 `.home-wrapper` 的**兄弟节点**，不是子节点
          （老页 `src/web/index.html` 第 137 行关掉 wrapper、第 140 行才是 <nav>）。
          它 `position:fixed`，多嵌一层 wrapper 会因为 wrapper 的 max-width/居中
          把 fixed 的包含块换掉，位置会漂。 */}
      <BottomNav tab={tab} onTab={setTab} />
    </>
  )
}

// `?tab=charts` 直接跳独立页（老实现 page-home.js:75-78）。必须在挂载前跑完，
// 否则会先画出首页再跳，用户看到一下闪。
if (new URLSearchParams(window.location.search).get('tab') === 'charts') {
  window.location.replace('/my-charts/')
} else {
  createRoot(document.getElementById('root')).render(<App />)
}

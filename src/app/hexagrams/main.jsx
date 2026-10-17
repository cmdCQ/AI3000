import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { filterHexagrams, relatedKey } from './hexagrams.logic.js'
import { HEXAGRAM_DATA } from '../shared/hexagramsData.js'

/**
 * 六十四卦查询页。
 *
 * 老实现：`src/web/index.html` 里 38 行骨架 + `page-hexagrams.js` 105 行 /
 * 3 个顶层函数（`renderGrid` / `filterGrid` / `showDetail`）。
 *
 * ★ 这一页是全站第一个**不套 `dangerouslySetInnerHTML` 骨架**的搬迁页，
 *   理由与首页相同（见计划文档 §5）：判据从「innerHTML 逐字节相同」升级成
 *   「Playwright 视觉基线 + 行为对齐」，而视觉基线是拿老页拍的，
 *   所以真组件写坏了会直接变成一条红测试。
 *
 * 数据来自 `src/app/shared/hexagramsData.js`（阶段 4 cut-over：从
 * `src/web/js/hexagrams_data.js` 搬过来，逐字相同、只加了 `export`）。
 * 阶段 3 时这里读的是 `window.HEXAGRAM_DATA`（传统 script 的全局），现在没有那条 script 了。
 */
const DATA = HEXAGRAM_DATA

/** 老页 `:14-17` 的头部。 */
function Header() {
  return (
    <div className="header">
      <a href="/" className="back">← 首页</a>
      <h1 className="title">六十四卦</h1>
    </div>
  )
}

/** 老页 `:22-32` 的空态。用户还没点任何卦时显示「如何使用」四格说明。 */
function DetailEmpty() {
  return (
    <div className="detail-empty">
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>
        如何使用
      </div>
      <div className="use-grid">
        <div className="use-item">
          <span className="use-icon">🎯</span>
          <div className="use-body"><strong>浏览查询</strong>点击任意卦象，查看完整的卦辞、爻辞、象传和现代解读</div>
        </div>
        <div className="use-item">
          <span className="use-icon">🪙</span>
          <div className="use-body"><strong>占卜查卦</strong>使用三枚硬币/铜钱法起卦后，根据结果查看对应卦象</div>
        </div>
        <div className="use-item">
          <span className="use-icon">📚</span>
          <div className="use-body"><strong>学习研究</strong>系统学习六十四卦，每卦包含历史典故和现代应用案例</div>
        </div>
        <div className="use-item">
          <span className="use-icon">🔗</span>
          <div className="use-body"><strong>关联阅读</strong>每个卦象页面都推荐相关卦象，帮助理解卦象之间的联系</div>
        </div>
      </div>
    </div>
  )
}

/** 一张卦卡片（老 `renderGrid` 拼的 `<div class="hex-card">`，`:6-10`）。 */
function HexCard({ name, d, active, onPick, registerRef }) {
  return (
    <div
      className={'hex-card' + (active ? ' active' : '')}
      data-name={name}
      id={'card-' + name}
      ref={registerRef}
      onClick={() => onPick(name)}
    >
      <div className="sym">{d.s}</div>
      <div className="nm">{d.n}卦</div>
      <div className="py">{d.p}</div>
    </div>
  )
}

/**
 * 详情面板（老 `showDetail` 拼的那一大串，`:40-102`）。
 *
 * ★ 段落的**出现条件**逐个照抄，不要合并：
 *   · 爻辞后面那个 `.yongyao`（用九/用六）只有 2 个卦有（`page-hexagrams.js:68`）
 *   · 适用场景 `d.sc`、历史典故 `d.hi`、相关卦象 `d.r`、关键词 `d.kw` 都是可选的
 *   把某个可选段写成必渲染，视觉基线不会红（空 div 不占位），但 DOM 会多出空壳，
 *   而空 `.sec` 在 `page-hexagrams.css` 里是有 margin 的 —— 会红。所以条件必须保。
 */
function Detail({ name, onPick }) {
  const d = DATA[name]
  if (!d) return <DetailEmpty />
  return (
    <>
      <div className="detail-title">
        <span className="dsym">{d.s}</span>
        <div><span className="dname">{d.n}卦</span> <span className="dpy">{d.p}</span></div>
      </div>

      <div className="detail-meta">
        <span>{d.g}</span><span>{d.c}</span><span>第{d.i}卦</span>
      </div>

      <div className="sec">
        <div className="sec-label">☯ 核心要义</div>
        <div className="sec-text">{d.m}</div>
      </div>

      <div className="sec">
        <div className="sec-label">📜 卦辞</div>
        <div className="block-q">{d.gc}</div>
        <div className="sec-text">{d.gb}</div>
      </div>

      <div className="sec">
        <div className="sec-label">🐘 象传</div>
        <div className="block-q">{d.xz}</div>
        <div className="sec-text">{d.st}</div>
      </div>

      <div className="sec">
        <div className="sec-label">📊 爻辞详解</div>
        <div className="yao-list">
          {(d.y || []).map((y) => (
            <div className="yao-item" key={y.n}>
              <span className="yn">{y.n}</span><span className="yt">{y.t}</span>
            </div>
          ))}
        </div>
        {d.yy ? <div className="yongyao">⚡ {d.yy}</div> : null}
      </div>

      <div className="sec">
        <div className="sec-label">🔮 现代应用指南</div>
        <div className="app-grid">
          <div className="app-item app-career"><strong>💼 事业</strong><br />{d.a.ca}</div>
          <div className="app-item app-love"><strong>💕 感情</strong><br />{d.a.re}</div>
          <div className="app-item app-decision"><strong>🎯 决策</strong><br />{d.a.de}</div>
          <div className="app-item app-warning"><strong>⚠️ 警示</strong><br />{d.a.wa}</div>
        </div>
      </div>

      {d.sc && d.sc.length > 0 ? (
        <div className="sec">
          <div className="sec-label">🎯 适用场景</div>
          <div className="sc-tags">
            {d.sc.map((s) => <span key={s}>{s}</span>)}
          </div>
        </div>
      ) : null}

      {d.hi ? (
        <div className="sec">
          <div className="sec-label">📚 历史典故</div>
          <div className="history">{d.hi}</div>
        </div>
      ) : null}

      {d.r && d.r.length > 0 ? (
        <div className="sec">
          <div className="sec-label">🔗 相关卦象</div>
          <div className="related">
            {d.r.map((r) => (
              /* 老页 `:92` 是 `<a onclick="showDetail('坤')">`，没有 href —— 它不是链接，
                 是个长得像链接的按钮。这里保留 `<a>` + onClick 的形状（视觉基线按它拍），
                 不改成 `<button>`：改了就得同时改 CSS，而 CSS 是共享的
                 `page-hexagrams.css`（还没搬），改它会影响老页。 */
              <a key={r.n} onClick={() => onPick(relatedKey(r.n))}>{r.s} {r.n}</a>
            ))}
          </div>
        </div>
      ) : null}

      {d.kw && d.kw.length > 0 ? (
        <div className="kw-tags">
          {d.kw.map((k) => <span key={k}>{k}</span>)}
        </div>
      ) : null}
    </>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const cardRefs = useRef({})
  const detailRef = useRef(null)
  const pendingScroll = useRef(null)

  const rows = filterHexagrams(DATA, query)

  /**
   * 点卦 / 点相关卦象。
   *
   * 老 `showDetail`（`:35-38` + `:101-102`）做了两次 smooth 滚动：先滚卡片到
   * 视口中间，再滚详情到视口顶部。同一 tick 里发两条，实际生效的是后一条。
   * React 下详情要等下一帧才存在，所以这里把「滚详情」寄给 effect。
   */
  function pick(name) {
    if (!DATA[name]) return
    setSelected(name)
    pendingScroll.current = name
  }

  // 详情渲染出来后滚到顶（等价老 `:102`）。
  useEffect(() => {
    if (!pendingScroll.current) return
    pendingScroll.current = null
    if (detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // 老页 `:38` 还滚了卡片（block:center）。它发生在详情滚动之前，
    // 被后者覆盖；但卡片高亮本身要保留，否则用户看不出点了哪一张。
    const card = cardRefs.current[selected]
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected])

  return (
    <div className="wrapper">
      <Header />
      <div className="search-wrap">
        <input
          type="text"
          className="search-input"
          placeholder="搜索卦名、拼音、卦象…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="grid" id="grid">
        {rows.map(([name, d]) => (
          <HexCard
            key={name}
            name={name}
            d={d}
            active={name === selected}
            onPick={pick}
            registerRef={(el) => { cardRefs.current[name] = el }}
          />
        ))}
      </div>
      <div className="detail" id="detail" ref={detailRef}>
        <Detail name={selected} onPick={pick} />
      </div>
    </div>
  )
}

// 老页 `page-hexagrams.js:105` 末尾那行裸调 `renderGrid()`：页面一加载就画出 64 张卡。
// 这里等价于「挂载即渲染」，不需要额外的副作用。
createRoot(document.getElementById('root')).render(<App />)

/* `/suggestion/`（提交建议）—— 阶段 3 第 9 页。
 *
 * 老实现：`src/web/suggestion/index.html`（130 行）+ `src/web/js/page-suggestion.js`（88 行）。
 * 判据：`src/app/tests/suggestion.spec.mjs`（12 条，先在老页跑绿再对新页跑）。
 *
 * ── 这一页唯一值得解释的东西：星光是**命令式**的，不是纯函数 ──────────────
 * 老代码在 mouseenter / mouseleave 里直接改 `s.style.color`，而且只改"非 active"的星。
 * 于是 active 的星身上会残留之前写下的 inline 色 —— 降分之后那些星失去 `.active`
 * 却仍然显示金星。见 `suggestion.logic.js` 底部那段注释（有实测记录）。
 * §4.9 的规矩是"照搬、没修、注释标死、等拍板"，所以这里用一张 `colors` 状态表
 * 逐字复刻那套补丁逻辑：**click 不动颜色，只有 enter/leave 动，且只动非 active 的**。
 *
 * ── 第二处照搬的老缺陷：未登录时的「去登录」是死按钮 ─────────────────────
 * 老 HTML 第 116 行写的是 `onclick="openAuthModal(\'login\')"`：
 *   ① `\'` 在 HTML 属性里不是转义，浏览器拿到的源码是 `openAuthModal(\'login\')` —— 语法错；
 *   ② 这一页**没引** `/js/auth.js`，所以 `openAuthModal` 本来也不存在。
 * 两个原因叠加，线上点它没有任何反应（实测）。
 * 这里照搬"没反应"，**没有**顺手引 auth.js 修好它 —— 那会改变用户可见行为，
 * 属产品决定，已记入计划 §4.9 待拍板。
 * `tests/suggestion.spec.mjs` 里有一条判据专门锁住它：谁修好了，那条会红。
 */

import '../shared/authModalStyles.js';
import { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import {
  RATING_KEYS,
  RATING_TITLES,
  buildSuggestionPayload,
  charCountLabel,
  colorsOnEnter,
  colorsOnLeave,
  getCookie,
  isActive,
  isSubmitBlocked,
  labelFor,
  starChar,
  submitErrorMessage,
} from './suggestion.logic.js'

const STAR_VALUES = [1, 2, 3, 4, 5]

/** 老 `page-suggestion.js:2` 的 `var authToken = getCookie('sqw_token')` 是在**脚本加载时**
 *  读一次，之后整页生命周期都用这个常量 —— 哪怕用户在别的标签页重新登录了也不重读。
 *  这里用 `useState` 的惰性初始值复刻"只读一次"。 */
function readTokenOnce() {
  return getCookie('sqw_token')
}

function RatingRow({ name, score, colors, onClickStar, onEnterStar, onLeaveStars }) {
  return (
    <div className="sg-rating-row">
      <span className="sg-rating-name">{RATING_TITLES[name]}</span>
      <div className="sg-stars" data-rating={name}>
        {STAR_VALUES.map((v) => (
          <span
            key={v}
            // 老 `:32-33`：星符与 active 类都由"序号 <= 分数"决定
            className={isActive(v, score) ? 'sg-star active' : 'sg-star'}
            data-score={String(v)}
            // ★ 这一行是复刻的关键：颜色**只**来自那张补丁表，不从分数重算。
            //   `''` 与 undefined 都是"不写 inline style"（老代码赋 `''` 等于删掉属性）。
            style={{ color: colors[v] || undefined }}
            onClick={() => onClickStar(name, v)}
            onMouseEnter={() => onEnterStar(name, v)}
            onMouseLeave={() => onLeaveStars(name)}
          >
            {starChar(v, score)}
          </span>
        ))}
        <span className="sg-star-label" id={'label_' + name}>
          {labelFor(name, score)}
        </span>
      </div>
    </div>
  )
}

export default function App() {
  // 只在挂载时读一次（老 `:2`）
  const [token] = useState(readTokenOnce)

  // `ratings[name]`，未点的维度没有键 —— 发请求时补 0（老 `:74-75` 的 `|| 0`）
  const [ratings, setRatings] = useState({})
  // `colors[name][星值]`，复刻老代码写在 DOM 上的 inline 色
  const [colors, setColors] = useState({})
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const textareaRef = useRef(null)

  const scoreOf = (name) => ratings[name] || 0

  function handleClickStar(name, v) {
    // 老 `:27-37`：只改分数（星符、active 类、文案都是它的派生量），**不碰颜色**
    setRatings((prev) => ({ ...prev, [name]: v }))
  }

  function handleEnterStar(name, v) {
    // ★ 这里必须读"当前渲染的评分"：事件处理器捕获的是最近一次渲染的闭包，
    //   而 click 之后 React 会先重渲染再派发后续事件，所以读到的是新分数。
    setColors((prev) => ({ ...prev, [name]: colorsOnEnter(prev[name] || {}, scoreOf(name), v) }))
  }

  function handleLeaveStars(name) {
    setColors((prev) => ({ ...prev, [name]: colorsOnLeave(prev[name] || {}, scoreOf(name)) }))
  }

  async function handleSubmit() {
    if (submitting) return
    // 老 `:64-65`：trim 后为空 → 只聚焦，不发请求
    if (isSubmitBlocked(content)) {
      textareaRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(buildSuggestionPayload(ratings, content)),
      })
      // ★ 顺序照抄老 `:79-80`：先解析再判 ok。响应体不是 JSON 时这里会抛，
      //   于是用户看到的是解析错误而不是「服务暂时不可用」—— 老行为如此。
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '提交失败')
      setDone(true)
    } catch (e) {
      window.alert(submitErrorMessage(e.message))
    } finally {
      // 老 `:85-86`：失败时把按钮恢复可用并还原文案。成功时表单已藏起来，恢复也看不见。
      setSubmitting(false)
    }
  }

  const formDisplay = useMemo(() => {
    // 老 `:16`：未登录 → 藏表单；老 `:81`：提交成功 → 也藏表单
    if (!token || done) return { display: 'none' }
    return undefined
  }, [token, done])

  return (
    <div className="sg-wrap">
      <div className="sg-header">
        <a href="/" className="sg-back">
          ← 返回首页
        </a>
        <div className="sg-title">我们需要你宝贵的建议</div>
        <div className="sg-sub">你的每一条反馈，都在帮我们变得更好</div>
      </div>

      <div id="sgForm" style={formDisplay}>
        <div className="sg-ratings-card">
          <div className="sg-card-title">给各个维度打个分吧</div>
          {RATING_KEYS.map((name) => (
            <RatingRow
              key={name}
              name={name}
              score={scoreOf(name)}
              colors={colors[name] || {}}
              onClickStar={handleClickStar}
              onEnterStar={handleEnterStar}
              onLeaveStars={handleLeaveStars}
            />
          ))}
        </div>

        <div className="sg-text-card">
          <div className="sg-card-title">
            具体建议 <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>（必填）</span>
          </div>
          <textarea
            className="sg-textarea"
            id="sgContent"
            ref={textareaRef}
            placeholder="说说你的想法… 比如想增加什么功能、哪里不好用"
            maxLength={4000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="sg-char-counter" id="charCounter">
            {charCountLabel(content)}
          </div>
        </div>

        <button className="sg-submit" id="sgSubmitBtn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '提交中…' : '提交建议 ✦'}
        </button>
        <div className="sg-hint">你的信息仅管理员可见</div>
      </div>

      {/* 老 `:16-17`：未登录才把它 display 成 block（CSS 里默认 none） */}
      <div
        className="sg-login-required"
        id="sgLoginRequired"
        style={token ? undefined : { display: 'block' }}
      >
        <div className="cg-icon">🔒</div>
        <div className="cg-title">登录后提交建议</div>
        <div className="cg-desc">登录后才可以提交建议，让我知道你是谁</div>
        {/* ★ 死按钮：照搬老行为（点了没反应），原因见文件头注释。
            老写法是 onclick="openAuthModal(\'login\')" + 没引 auth.js。
            真修需要引 /js/auth.js 并调 openAuthModal('login')，属产品决定。 */}
        <a href="javascript:void(0)" className="cg-btn">
          去登录
        </a>
      </div>

      {/* 老 `:82`：成功后 display 成 block（CSS 里默认 none） */}
      <div className="sg-success" id="sgSuccess" style={done ? { display: 'block' } : undefined}>
        <div className="sg-success-icon">✓</div>
        <div className="sg-success-title">感谢你的建议</div>
        <div className="sg-success-desc">每一条反馈都会被认真对待</div>
      </div>
    </div>
  )
}

// 老 `page-suggestion.js` 是整段脚本自上而下跑完就生效，没有「渲染」这一步。
// 这里等价于「挂载即渲染」：登录态判断、六行星星、计数器都由首次渲染产出。
createRoot(document.getElementById('root')).render(<App />)

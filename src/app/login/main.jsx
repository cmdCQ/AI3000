import '../shared/authModalStyles.js';
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { isLoggedIn, sessionCookies } from '../lib/auth.js'
import {
  HOME_URL,
  validateLogin,
  failureMessage,
  requestLogin,
} from './login.logic.js'
import './style.css'

// 老 `src/web/js/page-login.js:1`：`if (AUTH.isLoggedIn()) { location.href = '/' }`
// 那一行在 classic script 的**模块求值**时跑，早于首帧。这里也在 render 之前跑，
// 不做成 useEffect —— 做成 effect 的话已登录用户会先看见一帧登录表单再被跳走
// （视觉基线拍的就是这一帧，会拍到假的东西）。
if (isLoggedIn()) window.location.href = HOME_URL

function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    const phoneValue = phone.trim()
    const message = validateLogin(phoneValue, password)
    if (message) {
      setError(message)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const data = await requestLogin(phoneValue, password)
      // 老 `:21-22`：先写 cookie，再整页跳转。
      for (const cookie of sessionCookies(data.token, data.username)) {
        document.cookie = cookie
      }
      window.location.href = HOME_URL
    } catch (err) {
      // 老 `:24-26`：失败时恢复按钮并显示 message。注意老代码**不清空** input。
      setError(failureMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>易三千</h1>
        <p className="sub">登录以使用 AI 命理解读</p>

        <form className="auth-form" id="loginForm" onSubmit={onSubmit}>
          <label>手机号</label>
          <input
            type="tel"
            id="phone"
            placeholder="输入手机号"
            maxLength={11}
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <label>密码</label>
          <input
            type="password"
            id="password"
            placeholder="输入密码"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <p className="auth-error" id="loginError">
            {error}
          </p>
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="auth-link">
          还没有账号？<a href="/register/">注册</a> · <a href="/forgot-password/">忘记密码？</a>
        </p>
        <a href="/" className="auth-back">
          ← 返回首页
        </a>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<LoginPage />)

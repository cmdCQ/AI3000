import '../shared/authModalStyles.js';
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { isLoggedIn, sessionCookies } from '../lib/auth.js'
import {
  validatePhoneForSms,
  validateRegister,
  cooldownLabel,
  requestSmsCode,
  requestRegister,
  SMS_COOLDOWN_SECONDS,
  SMS_IDLE_LABEL,
  SMS_SENDING_LABEL,
} from './register.logic.js'
import './style.css'

// 老 `page-register.js:1`：模块求值时跳转，早于首帧。理由同登录页。
if (isLoggedIn()) window.location.href = '/'

function RegisterPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  // 老实现是 `var smsTimer` + 递归 setTimeout；这里换成倒计时 state + 每秒减一，
  // 可观察行为一致：按钮文案 `60s 后重发` → … → `1s 后重发` → 归零回到 `获取验证码`。
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const smsLabel =
    cooldown > 0 ? cooldownLabel(cooldown) : smsSending ? SMS_SENDING_LABEL : SMS_IDLE_LABEL

  // 老 `:5-40` sendSms()。
  async function onSendSms() {
    const phoneValue = phone.trim()
    const message = validatePhoneForSms(phoneValue)
    if (message) {
      setError(message)
      return
    }
    if (cooldown > 0) return

    setError('')
    setSmsSending(true)
    try {
      const { ok, data } = await requestSmsCode(phoneValue)
      if (!ok) {
        setError(data.error)
        setSmsSending(false)
        // ★ 老 `:31`：失败也起冷却（如果后端回了 cooldown），防止连点轰炸。
        if (data.cooldown) setCooldown(data.cooldown)
        return
      }
      setSmsSending(false)
      setCooldown(SMS_COOLDOWN_SECONDS)
    } catch (e) {
      // ★ 老 `:35-39`：网络异常**有**兜底文案，而且是「网络异常，请重试」。
      setError('网络异常，请重试')
      setSmsSending(false)
    }
  }

  // 老 `:59-89`：表单提交。
  async function onSubmit(e) {
    e.preventDefault()
    const phoneValue = phone.trim()
    const codeValue = code.trim()
    const message = validateRegister(phoneValue, codeValue, password, confirm)
    if (message) {
      setError(message)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const data = await requestRegister(phoneValue, codeValue, password)
      for (const cookie of sessionCookies(data.token, data.username)) {
        document.cookie = cookie
      }
      window.location.href = '/'
    } catch (err) {
      setError(err && err.message ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>易三千</h1>
        <p className="sub">注册账号，开启 AI 命理解读</p>

        <form className="auth-form" id="registerForm" onSubmit={onSubmit}>
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

          <label>验证码</label>
          <div className="sms-row">
            <input
              type="text"
              id="smsCode"
              placeholder="短信验证码"
              maxLength={6}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {/* 老页是 `onclick="sendSms()"`；这里换成真事件处理，不需要全局 */}
            <button
              type="button"
              className="sms-btn"
              id="sendSmsBtn"
              disabled={smsSending || cooldown > 0}
              onClick={onSendSms}
            >
              {smsLabel}
            </button>
          </div>

          <label>密码</label>
          <input
            type="password"
            id="password"
            placeholder="至少 6 位密码"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>确认密码</label>
          <input
            type="password"
            id="confirm"
            placeholder="再次输入密码"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <p className="auth-error" id="registerError">
            {error}
          </p>
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '注册中…' : '注册'}
          </button>
        </form>

        <p className="auth-link">
          已有账号？<a href="/login/">登录</a>
        </p>
        <a href="/" className="auth-back">
          ← 返回首页
        </a>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<RegisterPage />)

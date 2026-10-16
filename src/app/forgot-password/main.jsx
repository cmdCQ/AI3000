import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { api } from '../lib/api.js'
import { isLoggedIn } from '../lib/auth.js'
import './style.css'

// 从 src/web/js/page-forgot-password.js 搬过来，行为逐条对齐：
// 手机号 /^1\d{10}$/、冷却按服务端给的 cooldown、密码至少 6 位、
// 成功后 alert 再跳 /login/。
function App() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // 老页面是脚本一开头就跳，这里等挂载后跳
  useEffect(() => {
    if (isLoggedIn()) window.location.href = '/'
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendSms() {
    if (!/^1\d{10}$/.test(phone.trim())) { setError('请输入正确的手机号'); return }
    if (sending || cooldown > 0) return
    setError('')
    setSending(true)
    try {
      await api('/api/send-sms-code', { body: { phone: phone.trim() } })
      setCooldown(60)
    } catch (e) {
      setError(e.message)
      if (e.data && e.data.cooldown) setCooldown(e.data.cooldown)
    } finally {
      setSending(false)
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    const p = phone.trim()
    const c = code.trim()
    if (!p) { setError('请输入手机号'); return }
    if (!c) { setError('请输入短信验证码'); return }
    if (password.length < 6) { setError('密码至少需要 6 位'); return }

    setSubmitting(true)
    setError('')
    try {
      await api('/api/reset-password', { body: { phone: p, code: c, newPassword: password } })
      alert('密码重置成功，请重新登录')
      window.location.href = '/login/'
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>重置密码</h1>
        <p className="sub">验证手机号，设置新密码</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>手机号</label>
          <input
            type="tel" placeholder="输入注册手机号" maxLength={11} autoComplete="tel" required
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />

          <label>验证码</label>
          <div className="sms-row">
            <input
              type="text" placeholder="短信验证码" maxLength={6} autoComplete="one-time-code" required
              value={code} onChange={(e) => setCode(e.target.value)}
            />
            <button
              type="button" className="sms-btn" onClick={sendSms}
              disabled={sending || cooldown > 0}
            >
              {sending ? '发送中…' : cooldown > 0 ? cooldown + 's 后重发' : '获取验证码'}
            </button>
          </div>

          <label>新密码</label>
          <input
            type="password" placeholder="至少 6 位新密码" autoComplete="new-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />

          <p className="auth-error">{error}</p>
          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '重置中…' : '重置密码'}
          </button>
        </form>

        <p className="auth-link">想起密码了？<a href="/login/">返回登录</a></p>
        <a href="/" className="auth-back">← 返回首页</a>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)

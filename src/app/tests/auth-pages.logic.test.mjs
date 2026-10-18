// `/login/` 与 `/register/` 的纯函数单测。
//
// ★ 这两页的 e2e 已经覆盖了交互，这里只钉三件 e2e 拍不到的东西：
//   ① 若干**校验分支的优先级**（哪条先报）——e2e 一次只能看到最后显示的那一条；
//   ② cookie 的**字面值**（`max-age=86400` / `path=/` / `encodeURIComponent`）；
//   ③ 手机号正则的**边界**（10 位、12 位、非 1 开头）。
//   第 ③ 项有个额外意义：老页面 `#phone` 的 `maxlength=11` 让「12 位」在界面上
//   不可达，所以 e2e 测不了它，只有单测能钉住「正则本身是什么」。

import { describe, it, expect } from 'vitest'
import { validatePhoneForSms, validateRegister, cooldownLabel } from '../register/register.logic.js'
import { sessionCookies } from '../lib/auth.js'
import { validateLogin, failureMessage, HOME_URL } from '../login/login.logic.js'

describe('登录页', () => {
  it('空手机号或空密码都被拦，文案是「请输入手机号和密码」', () => {
    expect(validateLogin('', 'pw')).toBe('请输入手机号和密码')
    expect(validateLogin('13800138000', '')).toBe('请输入手机号和密码')
    expect(validateLogin('', '')).toBe('请输入手机号和密码')
  })

  it('★ 只判非空，不判格式也不判长度：1 位密码也放行到后端', () => {
    expect(validateLogin('13800138000', 'x')).toBeNull()
  })

  it('登录成功后回首页', () => {
    expect(HOME_URL).toBe('/')
  })

  it('失败文案直接取 e.message，没有兜底', () => {
    expect(failureMessage(new Error('手机号或密码错误'))).toBe('手机号或密码错误')
    // 非 Error 也不会崩（老代码 `e.message` 会是 undefined，这里退化成 String(e)）
    expect(failureMessage('boom')).toBe('boom')
  })
})

describe('会话 cookie（登录/注册两页共用一份）', () => {
  it('两个 cookie 的顺序、path、max-age 都是契约', () => {
    expect(sessionCookies('tok', 'alice')).toEqual([
      'sqw_token=tok; path=/; max-age=86400',
      'sqw_username=alice; path=/; max-age=86400',
    ])
  })

  it('值要 encodeURIComponent：空格、中文、分号都不能原样写进 cookie', () => {
    const [token, username] = sessionCookies('a b;c', '测试用户')
    expect(token).toBe('sqw_token=a%20b%3Bc; path=/; max-age=86400')
    expect(username).toBe('sqw_username=%E6%B5%8B%E8%AF%95%E7%94%A8%E6%88%B7; path=/; max-age=86400')
  })
})

describe('注册页 · 发码前的手机号校验', () => {
  it('严格 11 位、必须 1 开头', () => {
    expect(validatePhoneForSms('13800138000')).toBeNull()
    expect(validatePhoneForSms('')).toBe('请输入正确的手机号')
    expect(validatePhoneForSms('1380013800')).toBe('请输入正确的手机号') // 10 位
    expect(validatePhoneForSms('138001380001')).toBe('请输入正确的手机号') // 12 位
    expect(validatePhoneForSms('23800138000')).toBe('请输入正确的手机号') // 不以 1 开头
    expect(validatePhoneForSms('1380013800a')).toBe('请输入正确的手机号')
  })
})

describe('注册页 · 提交前的四道校验（顺序就是优先级）', () => {
  const ok = ['13800138000', '123456', 'secret123', 'secret123', true]
  it('全合法返回 null', () => {
    expect(validateRegister(...ok)).toBeNull()
  })

  it('① 空手机号优先于一切', () => {
    expect(validateRegister('', '', '', '')).toBe('请输入手机号')
  })

  it('② 空验证码', () => {
    expect(validateRegister('13800138000', '', '1', '2')).toBe('请输入短信验证码')
  })

  it('★ ③ 密码太短优先于两次不一致（老代码 :70 在 :71 之前）', () => {
    expect(validateRegister('13800138000', '123456', '123', '999999')).toBe('密码至少需要 6 位')
  })

  it('④ 两次不一致', () => {
    expect(validateRegister('13800138000', '123456', 'secret123', 'secret124')).toBe('两次密码不一致')
  })

  it('★ 密码长度边界是 6：5 位拦、6 位放', () => {
    expect(validateRegister('13800138000', '123456', '12345', '12345')).toBe('密码至少需要 6 位')
    expect(validateRegister('13800138000', '123456', '123456', '123456')).toBeNull()
  })

  it('★ 提交前**不**校验手机号格式（与发码前不对称，老代码就这样）', () => {
    expect(validateRegister('abc', '123456', 'secret123', 'secret123')).toBeNull()
  })
})

describe('注册页 · 冷却文案', () => {
  it('`<秒>s 后重发`', () => {
    expect(cooldownLabel(60)).toBe('60s 后重发')
    expect(cooldownLabel(1)).toBe('1s 后重发')
  })
})

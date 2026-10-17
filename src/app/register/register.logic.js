// 注册页的纯函数部分，逐条对齐老 `src/web/js/page-register.js`（90 行）。
//
// 老实现四段真逻辑：① `:1` 已登录跳首页；② `:10` 手机号格式（**发验证码**前）；
// ③ `:68-71` 提交前四道校验，**顺序就是优先级**；④ `:83-84` 成功后写两个 cookie。
//
// ★ 两套手机号校验长得像但不是一回事，别合并：
//   `:10` 发码前 `/^1\d{10}$/` 严格 11 位数字，错了提示「请输入正确的手机号」；
//   `:68` 提交前只判 `!phone`，一条正则都不跑，提示「请输入手机号」。
//   老代码就是这么不对称的：直接点提交、手机号填「abc」，前端放行到后端。

/** 老 `:10`：发验证码前。`!phone || !/^1\d{10}$/.test(phone)`。 */
export function validatePhoneForSms(phone) {
  if (!phone || !/^1\d{10}$/.test(phone)) return '请输入正确的手机号'
  return null
}

/** 老 `:68-71`，顺序不可换：先空手机号、再空验证码、再长度、最后两次一致。 */
export function validateRegister(phone, code, password, confirm) {
  if (!phone) return '请输入手机号'
  if (!code) return '请输入短信验证码'
  if (password.length < 6) return '密码至少需要 6 位'
  if (password !== confirm) return '两次密码不一致'
  return null
}

/** 老 `:52`：`btn.textContent = smsTimer + 's 后重发'`。 */
export function cooldownLabel(seconds) {
  return seconds + 's 后重发'
}

/** 老 `:34`：发码成功后固定 60 秒冷却。 */
export const SMS_COOLDOWN_SECONDS = 60

export const SMS_IDLE_LABEL = '获取验证码'
export const SMS_SENDING_LABEL = '发送中…'

/** 老 `:21-33`：`/api/send-sms-code`。非 2xx 返回 `{error, cooldown?}` 由调用方处理，
 *  所以这里**不抛**，把 body 原样交回去 —— 老代码那个分支既要显示 error 又要按
 *  `data.cooldown` 起冷却，抛异常就把 cooldown 丢了。 */
export async function requestSmsCode(phone, fetchImpl) {
  const doFetch = fetchImpl || fetch
  const res = await doFetch('/api/send-sms-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  const data = await res.json()
  return { ok: res.ok, data }
}

/** 老 `:76-85`：`/api/register`，非 2xx 抛 `new Error(data.error)`。 */
export async function requestRegister(phone, code, password, fetchImpl) {
  const doFetch = fetchImpl || fetch
  const res = await doFetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

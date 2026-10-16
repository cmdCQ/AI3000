// 全站唯一的请求出口。老前端每个页面自己写一遍 XHR 生命周期、错误处理各写各的
// （同一个形状抄了四份），新前端只留这一个。
//
// 约定：非 2xx 抛 ApiError，message 取服务端的 error 字段，data 挂原始响应体
// （有些接口在失败时还要带东西回来，比如 send-sms-code 的 cooldown）。
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function api(path, { method = 'POST', body } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    throw new ApiError('网络异常，请重试', 0, null)
  }

  let data = null
  try { data = await res.json() } catch (e) { /* 无响应体 */ }

  if (!res.ok) throw new ApiError((data && data.error) || '请求失败', res.status, data)
  return data
}

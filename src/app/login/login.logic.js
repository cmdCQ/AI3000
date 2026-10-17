// 登录页的纯函数部分。全部逐字对齐老 `src/web/js/page-login.js`（28 行）。
//
// 老实现只有三段真逻辑：① `:1` 已登录直接跳首页；② `:10` 空表单拦截；
// ③ `:21-22` 成功后往 document.cookie 写两个键。其余是按钮态与文案。
//
// ★ 这里**不**碰 DOM、不碰 `document.cookie`。写 cookie 的那两行在两个页面里
// 逐字相同，已提到 `../lib/auth.js` 的 `sessionCookies()`（返回字符串数组，
// 由组件去写），这样「cookie 长什么样」才只有一份、也才有单测可钉
// （`max-age=86400`、`path=/`、`encodeURIComponent` 三件事任何一件漏了
// 都是「登录成功但下一刷新又变游客」）。

/** 老 `:1`。`AUTH.isLoggedIn()` 只看 `sqw_username` cookie 存在与否。 */
export const HOME_URL = '/'

/** 老 `:10`：`if (!phone || !pw) { err.textContent = '请输入手机号和密码'; return; }`
 *  ★ 注意老代码判的是 `!pw` 而非长度——空密码拦，1 位密码放行让后端拒。 */
export function validateLogin(phone, password) {
  if (!phone || !password) return '请输入手机号和密码'
  return null
}

/** 老 `:24-26` catch 分支：直接显示 `e.message`（没有兜底文案）。 */
export function failureMessage(err) {
  return err && err.message ? err.message : String(err)
}

/** 老 `:19-20`：非 2xx 抛 `new Error(data.error)` —— `data.error` 缺失时
 *  message 是字符串 'undefined'，老页面就是把这三个字显示给用户看的。 */
export async function requestLogin(phone, password, fetchImpl) {
  const doFetch = fetchImpl || fetch
  const res = await doFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data
}

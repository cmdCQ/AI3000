// 与老前端 src/web/js/auth.js 同一套 cookie 约定（sqw_username / sqw_token），
// 读法逐字对齐。老页面还在用那份全局脚本，两份必须一致；等 src/web/ 清空后
// 只剩这一份。
function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = document.cookie.match(new RegExp('(^| )' + escaped + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}

export function isLoggedIn() {
  try { return !!getCookie('sqw_username') } catch (e) { return false }
}

export function getUsername() {
  try { return getCookie('sqw_username') } catch (e) { return null }
}

export function getToken() {
  try { return getCookie('sqw_token') } catch (e) { return null }
}

/** 登录/注册成功后种下的两个 cookie。老实现把这两行**抄在每个页面里**
 *  （`page-login.js:21-22`、`page-register.js:83-84`），逐字相同；搬到
 *  `src/app/` 后放在这里，因为「cookie 长什么样」属于同一份契约，
 *  散在两条页面里迟早只改一处。
 *
 *  ★ `max-age=86400` = 一天；不写 `expires`、不写 `httponly`（老实现也没有，
 *    那是后端 Set-Cookie 才能干的），所以这份只负责「浏览器端可读的登录态」。 */
export function sessionCookies(token, username) {
  return [
    'sqw_token=' + encodeURIComponent(token) + '; path=/; max-age=86400',
    'sqw_username=' + encodeURIComponent(username) + '; path=/; max-age=86400',
  ]
}

// ⚠ 过渡期胶水，**死期：阶段 4**（随 src/web/js/auth.js 一起搬进 src/app/ 时删）。
//
// 登录/注册弹窗那一整套（DOM 注入、CSS、表单提交、验证码冷却）还有 300+ 行留在
// 老树 `src/web/js/auth.js` 里，它的 `window.openAuthModal` 是全局的，页面里
// `<script src="/js/auth.js">` 一引就有。现在照旧调它，不把那 300 行提前搬过来 ——
// 搬了会和老页面共用同一份实现的问题变成两份。
//
// 同样在过渡期借用老全局的还有 `window.handleApiUnauthorized`（流式收尾的 401
// 分支），它不在本文件里包一层：调用点在 ai-chat/main.jsx，直接写明是借的。
//
// 老实现见 src/web/js/auth.js:183-206（openAuthModal / window.openAuthModal）。
export function openAuthModal(tab) {
  if (typeof window !== 'undefined' && typeof window.openAuthModal === 'function') {
    window.openAuthModal(tab);
  }
}

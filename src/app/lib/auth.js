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

// 阶段 4 收口：这里原来是一层「借老全局 window.openAuthModal」的胶水，
// 现在 `src/web/js/auth.js` 已搬成 `src/app/shared/auth.js`，直接从那边来。
// 保留这个再导出，是为了不动 8 个页面的 import 路径（阶段 5 统一改成 shared/）。
export { openAuthModal } from '../shared/auth.js'

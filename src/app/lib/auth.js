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

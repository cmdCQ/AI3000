// 登录/注册弹窗的样式，只给**打包器**用的一行 import。
//
// 为什么单独一个模块：`shared/auth.js` 是「弹窗引擎 + 登录态读取」，纯 JS，
// 而 `duipan/` 下的差分与驱页脚本用 Node 直接 `import()` 它（没有打包器）。
// 一旦 CSS 挂在 auth.js 上，Node 就会报 `Unknown file extension ".css"` ——
// 判据装不上，整套对拍静默变成「测不出来」。样式是页面级的事，放在页面入口引，
// Vite 仍然只产出一份 css（多入口共享同一模块，去重是它的本职）。
import './authModal.css';

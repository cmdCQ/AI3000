/**
 * Node 侧把 `.css` 的 import 变成空模块
 * ==========================================================================
 *
 * 冻结门里有一批判据是 `await import('../src/app/xxx.js')` 直接跑真模块的
 * （`diff_pure_functions.mjs`、`diff_mhys.mjs`、`diff_liuyao_result_history.mjs`）。
 * 页面模块会 `import './css/xxx.css'` —— 浏览器里这是样式，Node 里是
 * `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".css"`，
 * 整条判据当场「装载失败（测不出来）」，红得跟产品坏掉一模一样，其实只是一句 import。
 *
 * 判据要的是**函数行为**，不是样式，所以这里把 `.css` 解析成一个空的 ESM 模块。
 * 不用 `require.extensions`：那是 CJS 的东西，ESM 的 import 不认。
 *
 * 用法：在用到动态 import 的判据脚本最上面写
 *
 *     import './register_css_stub.mjs';
 *
 * 必须在任何 `await import('../src/app/...')` **之前** —— register 只对之后加载的
 * 模块生效。
 */
import { register } from 'node:module';

register(new URL('./css_stub_hooks.mjs', import.meta.url));

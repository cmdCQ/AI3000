// lunar-javascript 1.7.7（jsDelivr Terser 压缩版）—— 阶段 4 cut-over 从 `src/web/js/lunar.min.js` 搬来。
//
// 为什么是 `.cjs` 而不是 `.js`：这个库是 **UMD**，尾巴长这样
//   `!function(n,i){ if(define.amd) define(i); else if(module.exports) module.exports=i();
//     else { var t=i(); for(var e in t) n[e]=t[e]; } }(this, function(){…})`
// 最后一个分支（浏览器 classic script 那条路）把导出**挂到 `this` 上**，
// 而 ESM 顶层 `this` 是 `undefined` —— 直接当 ESM 引就炸。
// 改名 `.cjs` 后 Node / Vite 都按 CommonJS 处理，走 `module.exports = i()` 那条路，
// `import lunar from './lunar.min.cjs'` 拿到的是整张导出表。
//
// ⚠ `src/web/js/lunar.min.js` 原文件暂时留着：还有两个老页面在用它（见阶段 4 收口清单），
//   等它们都搬完，那个文件随 `src/web/js/` 一起删。
import lunar from './lunar.min.cjs';

export const { Lunar, Solar } = lunar;

// 梅花易数排盘记录页（`/mhys/history.html`）—— 阶段 3 第 8 页。
// 逻辑**不在这个文件里**：13 个函数全在 `../lib/recordsHistory.js`，与六爻记录页共用
// 一份（两份老脚本逐字节相同、只差两张常量表，证据与理由写在那份文件的头注释）。
// ==========================================================================
//
// 本文件只做一件事：把**梅花这一户**的三个 URL 钉下来，然后交出一份页面实例。
//
// 这正是 `lib/recordsHistory.js` 头注释里写的那一步「下一户」：
//   `{ listUrl:'/api/mhys-records', detailsUrl:'/mhys/result.html?id=', homeUrl:'/mhys/' }`
// —— 没有再抄一份 220 行的页面控制器，也没有把 `EMOJI_MAP` / `METHOD_NAMES` 复制过来
// （那份 lib 已经取了两份老表的**并集**，梅花多出来的 number / split / character 三个
// 后端起卦法名本来就在里面）。
//
// ⚠ 三个 URL 都是**老 URL**，一个字节都不能改：`admin.js` 与六爻/梅花排盘页里的按钮
//   都还写着 `/mhys/result.html?id=`，改了就线上 404。这也是 HTML 落在
//   `src/app/mhys/history.html` 而不是 `src/app/mhys/history/index.html` 的原因
//   （后者会产出 `/mhys/history/`，见 `src/app/vite.config.mjs` 入口收集那段注释）。

import { createRecordsHistory } from '../lib/recordsHistory.js'

// 梅花这一户的参数（六爻那一户在 `src/app/liuyao/history.logic.js`）。
export const CONFIG = {
  // 记录列表 / 单条记录的 REST 前缀。DELETE 也是 `listUrl + '/' + id`。
  listUrl: '/api/mhys-records',
  // 详情页地址前缀，`viewRecord()` 直接拼 id（末尾必须带 `?id=`）。
  detailsUrl: '/mhys/result.html?id=',
  // 空列表时那颗「去排盘」的落点。
  homeUrl: '/mhys/',
}

// 一页一个实例：`state`（列表 / 管理模式 / 勾选表）收在闭包里。
// 与六爻记录页一样，**不导出** `state`。
const page = createRecordsHistory(CONFIG)

// 下面这 8 个名字是给 `./history.jsx` 挂 window 用的（7 个行内 onclick + 1 个启动调用）。
export const loadRecords = page.loadRecords
export const toggleManage = page.toggleManage
export const onSearch = page.onSearch
export const clearSearch = page.clearSearch
export const toggleSelectAll = page.toggleSelectAll
export const deleteSelected = page.deleteSelected
export const toggleCard = page.toggleCard
export const viewRecord = page.viewRecord

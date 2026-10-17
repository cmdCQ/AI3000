import { formatTime, escHtml } from '../shared/uiCommon.js';
// 六爻排盘记录页（`/liuyao/history.html`）—— 阶段 3 第 7 页。
// 逻辑**不在这个文件里**：13 个函数全在 `../lib/recordsHistory.js`，与梅花记录页共用
// 一份（两份老脚本逐字节相同、只差两张常量表，证据与理由写在那份文件的头注释）。
// ==========================================================================
//
// 本文件只做一件事：把**六爻这一户**的三个 URL 钉下来，然后交出一份页面实例。
//
// 为什么这三个值要单独一行一个、写在 六爻 目录下
// ─────────────────────────────────────────────────────────────
// 老文件 `src/web/js/page-liuyao-history.js`（215 行）里它们是三个裸字面量，散在
// 5 个地方（空态链接、DELETE 前缀、详情跳转、列表 fetch …）。散着写的结果是：
// `page-mhys-history.js` 复制过去时只改了这几处，其余 13 个函数一模一样 ——
// 于是同一张页的同一个 bug 要修两遍。现在它们只出现在这里一次。
//
// ⚠ 改这里的任何一个值，就等于改这一页的**入链**：`admin.js` 与
//   排盘页按钮都还写着 `/liuyao/result.html?id=`（老 URL）。三个值都必须保持老 URL，
//   否则线上 404 —— 这也是为什么 HTML 落在 `src/app/liuyao/history.html` 而不是
//   `src/app/liuyao/history/index.html`（后者会产出 `/liuyao/history/`，见
//   `src/app/vite.config.mjs` 里入口收集那段注释）。

import { createRecordsHistory } from '../lib/recordsHistory.js'

// 六爻这一户的参数（梅花那一户是 `/api/mhys-records` / `/mhys/result.html?id=` / `/mhys/`）。
export const CONFIG = {
  // 记录列表 / 单条记录的 REST 前缀。DELETE 也是 `listUrl + '/' + id`。
  listUrl: '/api/liuyao-records',
  // 详情页地址前缀，`viewRecord()` 直接拼 id（末尾必须带 `?id=`）。
  detailsUrl: '/liuyao/result.html?id=',
  // 空列表时那颗「去排盘」的落点。
  homeUrl: '/liuyao/',
}

// 一页一个实例：`state`（列表 / 管理模式 / 勾选表）收在闭包里，不再有模块级裸变量。
// 本文件**不导出** `state` —— 页面里没人读它，导出一个「随时会被控制器整体改写」的
// 对象只会诱使别人从外面改页面状态。要观察它请走 `duipan/diff_liuyao_result_history.mjs`
// 的适配层（那里是判据，不是产品代码）。
const page = createRecordsHistory(CONFIG)

// 下面这 8 个名字是给 `./history.jsx` 挂 window 用的（7 个行内 onclick + 1 个启动调用）。
// 其余 5 个（`formatTime` / `escHtml` / `getFilteredRecords` / `updateSelectedCount` /
// `renderCards`）只在控制器内部互相调，不对外 —— 老页把它们暴露成全局是「classic
// script 里函数天生是全局」的副作用，不是页面契约。
export const loadRecords = page.loadRecords
export const toggleManage = page.toggleManage
export const onSearch = page.onSearch
export const clearSearch = page.clearSearch
export const toggleSelectAll = page.toggleSelectAll
export const deleteSelected = page.deleteSelected
export const toggleCard = page.toggleCard
export const viewRecord = page.viewRecord

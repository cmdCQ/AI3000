/**
 * 差分脚本用的 DOM 桩 —— **只是 `duipan/dom_stub.js` 的 ESM 门面**。
 * ==========================================================================
 *
 * 为什么需要这个门面：差分脚本是 `.mjs`，而桩的唯一那份定义在 `dom_stub.js`（CJS）。
 * 这里用 `createRequire` 把它引进来再按 ESM 名字导出，**不复制任何形状**。
 *
 * 2026-10-17 之前本文件是一份手抄的副本，自己的头注释写着「改这里的形状必须同步改
 * legacy_mhys.js，否则这是本页差分最大的假绿来源」。搬 `/liuyao/` 时抽成了单一来源。
 *
 * 两侧仍然是「**同一个形状、不同的实例**」：老 classic script 在 `node:vm` 沙箱里
 * 用它自己的 document，新 ESM 模块用 `installGlobals()` 装进 `globalThis` 的那一个。
 */
'use strict';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const stub = require('./dom_stub.js');

export const ESC_TEXT = stub.ESC_TEXT;
export const makeDocument = stub.makeDocument;
export const installGlobals = stub.installGlobals;
export const applyDomSetup = stub.applyDomSetup;

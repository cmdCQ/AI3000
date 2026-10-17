#!/usr/bin/env node
// ============================================================================
// 对拍：`src/app/lib/auth.js`（新树，ESM）与 `src/web/js/auth.js`（老树，全局脚本）。
// 老侧读的是**冻结快照** `duipan/legacy_ref/auth.js`（源 `c617799^:src/web/js/auth.js`，
// 362 行，sha256 4f8e6f49c556ada1…）—— 老树已删，而且判据读活文件 = 判据跟着实现漂。
//       **同一套 cookie 读法**。
//
// 为什么要有这个对拍文件
// ---------------------------------------------------------------------------
// 新树那份 auth.js 只搬了「读 cookie」这一小块（`isLoggedIn` / `getToken` /
// `getUsername`），登录弹窗那 300 行还在老树里被当全局借用（见它的第 22-32 行注释，
// 死期写在阶段 4）。也就是说**过渡期里同一个语义有两份实现**。
//
// 两份实现的读法不是逐字节一样的（老文件 `getCookie` 带分号、新文件不带），所以
// 「看起来一样」不能当证据。一旦哪天有人只改了一份（比如给新文件加了
// `decodeURIComponent` 的 try/catch、或者把正则从 `(^| )` 改成 `(^|; )`），
// 症状会是「新页认得我是登录的、老页认不得」这种极难查的不一致。
//
// 所以这里把两份实现放进同一个沙箱、喂同一批 cookie 字符串、逐例比返回值。
//
// 用法
//   node duipan/diff_auth_cookie.mjs
//
// 退出码
//   0  全部一致
//   1  有用例不一致
//   2  装载失败（文件找不到 / 沙箱起不来 / 新文件不是 ESM）
//
// ⚠ 这个对拍**只覆盖 cookie 读法**，不覆盖 `openAuthModal` 那一套 DOM 逻辑
//   （那个在新树里是 `window.openAuthModal` 的一层转发，见 lib/auth.js:33-37，
//   不是重新实现，所以没有「两份不同」的风险）。
// ============================================================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const OLD = join(REPO, 'duipan', 'legacy_ref', 'auth.js');
const NEW = join(REPO, 'src', 'app', 'lib', 'auth.js');

function die(msg) {
  console.error(`\n✗ 装载失败：${msg}\n`);
  process.exit(2);
}

// ── 沙箱：只提供老文件顶层会碰到的那些东西（它顶层只有 `window.X = …` 赋值）────
//
// `document.cookie` 必须可写可读，而且**每次设置都要真的改变后面的读取结果** ——
// 老代码里有 `document.cookie = 'sqw_token=…'` 这种写，但我们这批用例只读不写，
// 所以给一个普通可变属性就够了。
function makeSandbox() {
  const win = {};
  const sandbox = {
    window: win,
    document: { cookie: '' },
    location: { href: '', reload() {} },
    console,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: () => { throw new Error('本对拍不碰网络'); },
    XMLHttpRequest: function () { throw new Error('本对拍不碰网络'); },
    setTimeout, clearTimeout, setInterval, clearInterval,
    navigator: { userAgent: 'node' },
    alert: () => {},
    onerror: null,
  };
  sandbox.globalThis = sandbox;
  return sandbox;
}

// ── 装老树（classic script，直接跑）────────────────────────────────────────
function loadOld(cookie) {
  let src;
  try {
    src = readFileSync(OLD, 'utf8');
  } catch (e) {
    die(`读不到 ${OLD}：${e.message}`);
  }
  const sandbox = makeSandbox();
  sandbox.document.cookie = cookie;
  const ctx = vm.createContext(sandbox);
  try {
    vm.runInContext(src, ctx, { filename: OLD });
  } catch (e) {
    die(`跑 ${OLD} 时抛异常：${e.message}`);
  }
  return {
    // AUTH 的三个方法（页面实际用的） 
    AUTH: sandbox.window.AUTH,
    // 裸 getCookie（我们想连底层一起比，因为 AUTH.* 会 try/catch 掉差异）
    getCookie: sandbox.window.getCookie,
  };
}

// ── 装新树（ESM，靠 globalThis 上的桩）────────────────────────────────────
//
// 它没有顶层副作用（只有函数声明与 export），所以可以 import 一次、反复换 cookie。
// 但它内部读的是**全局 document.cookie**，所以每批用例前改 globalThis.document。
let NEW_MOD = null;
async function loadNewOnce() {
  if (NEW_MOD) return NEW_MOD;
  const sandbox = makeSandbox();
  // 把桩挂到真 globalThis 上（ESM 里的自由变量解析到 globalThis）
  globalThis.window = sandbox.window;
  globalThis.document = sandbox.document;
  globalThis.location = sandbox.location;
  if (typeof globalThis.localStorage === 'undefined') globalThis.localStorage = sandbox.localStorage;
  if (typeof globalThis.navigator === 'undefined') {
    try { Object.defineProperty(globalThis, 'navigator', { value: sandbox.navigator, configurable: true }); } catch (e) { /* 新 node 已有只读 navigator，无所谓 */ }
  }
  try {
    NEW_MOD = await import(pathToFileURL(NEW).href);
  } catch (e) {
    die(`import ${NEW} 失败：${e.message}`);
  }
  for (const k of ['isLoggedIn', 'getToken', 'getUsername']) {
    if (typeof NEW_MOD[k] !== 'function') die(`新树 ${NEW} 没有导出 ${k}`);
  }
  return NEW_MOD;
}

async function loadNew(cookie) {
  const mod = await loadNewOnce();
  globalThis.document.cookie = cookie;
  return mod;
}

// ── 用例表 ─────────────────────────────────────────────────────────────────
//
// 每条：{ cookie, name, why }
//   `name` 是传给 getCookie 的名字；AUTH.* 那三项固定用 sqw_username / sqw_token。
const CASES = [
  // 常规
  { cookie: 'sqw_token=abc123', name: 'sqw_token', why: '普通值' },
  { cookie: 'sqw_username=alice', name: 'sqw_username', why: '普通值（用户名）' },
  { cookie: 'a=1; sqw_token=abc123; b=2', name: 'sqw_token', why: '夹在中间' },
  { cookie: 'sqw_token=abc123; b=2', name: 'sqw_token', why: '在开头' },
  { cookie: 'a=1; sqw_token=abc123', name: 'sqw_token', why: '在结尾' },

  // 编码
  { cookie: 'sqw_username=%E4%B8%AD%E6%96%87', name: 'sqw_username', why: 'URL 编码的中文（真实用户名）' },
  { cookie: 'sqw_username=a%20b', name: 'sqw_username', why: '编码的空格' },
  { cookie: 'sqw_token=a+b', name: 'sqw_token', why: '加号（decodeURIComponent 不把它当空格）' },

  // 畸形
  { cookie: 'sqw_token=%E4', name: 'sqw_token', why: '截断的 UTF-8 —— decodeURIComponent 会抛' },
  { cookie: 'sqw_token=%', name: 'sqw_token', why: '单个百分号 —— 同上' },
  { cookie: 'sqw_token=', name: 'sqw_token', why: '空值（正则要求 + 至少一个字符，所以匹配不到）' },
  { cookie: '', name: 'sqw_token', why: '根本没有 cookie' },
  { cookie: 'other=1', name: 'sqw_token', why: '别的键' },

  // 前缀 / 后缀碰撞 —— `(^| )` 这个锚是防这个的
  { cookie: 'xsqw_token=evil', name: 'sqw_token', why: '前面粘着别的字符（不该匹配）' },
  { cookie: 'sqw_token_extra=evil', name: 'sqw_token', why: '名字更长（不该匹配）' },
  { cookie: 'a=1;xsqw_token=evil', name: 'sqw_token', why: '分号后紧贴（老正则只认空格，两版都必须一致地「不匹配」）' },

  // 值里带等号 / 分号
  { cookie: 'sqw_token=a=b=c', name: 'sqw_token', why: '值里带等号' },
  { cookie: 'sqw_token=a,b', name: 'sqw_token', why: '值里带逗号' },

  // 同名多次 —— 取第一个
  { cookie: 'sqw_token=first; sqw_token=second', name: 'sqw_token', why: '同名重复' },

  // 名字里有正则元字符 —— `escaped` 那段就是为这个写的
  { cookie: 'a.b=v1', name: 'a.b', why: '名字含点（未转义会匹配任意字符）' },
  { cookie: 'axb=v2', name: 'a.b', why: '点不该通配到这个' },
  { cookie: 'a[0]=v3', name: 'a[0]', why: '名字含方括号' },
  { cookie: 'a*b=v4', name: 'a*b', why: '名字含星号' },
  { cookie: 'a(b)=v5', name: 'a(b)', why: '名字含括号' },
  { cookie: 'a|b=v6', name: 'a|b', why: '名字含竖线' },
  { cookie: 'a\\b=v7', name: 'a\\b', why: '名字含反斜杠' },
];


function safe(fn) {
  try {
    return { ok: true, v: fn() };
  } catch (e) {
    return { ok: false, e: e && e.message ? e.message : String(e) };
  }
}

function same(a, b) {
  if (a.ok !== b.ok) return false;
  if (!a.ok) return true; // 两边都抛错就算一致（错误文案不比，跨引擎可能不同）
  return a.v === b.v;
}

function show(r) {
  return r.ok ? JSON.stringify(r.v) : `抛错(${r.e})`;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────
const rows = [];
let bad = 0;

for (const c of CASES) {
  const oldSide = loadOld(c.cookie);
  const newSide = await loadNew(c.cookie);

  // ① 裸 getCookie 比
  if (typeof oldSide.getCookie !== 'function') die(`老树没有 window.getCookie（${OLD}）`);
  const og = safe(() => oldSide.getCookie(c.name));
  const ng = safe(() => newSide.getCookie ? newSide.getCookie(c.name) : undefined);
  // 新树**没有导出** getCookie（它是内部函数），所以这一项只对老树跑、作为记录；
  // 真正的等价性靠下面 AUTH 三项。若新树哪天导出了，这里自动开始比。
  const hasNewGetCookie = typeof newSide.getCookie === 'function';
  const gOk = hasNewGetCookie ? same(og, ng) : true;
  if (!gOk) bad++;
  rows.push({
    kind: 'getCookie',
    case: `${c.name} @ ${JSON.stringify(c.cookie)}`,
    why: c.why,
    old: show(og),
    neu: hasNewGetCookie ? show(ng) : '（未导出，跳过）',
    ok: gOk,
  });

  // ② AUTH 三项比
  for (const m of ['isLoggedIn', 'getToken', 'getUsername']) {
    const oa = safe(() => oldSide.AUTH[m]());
    const na = safe(() => newSide[m]());
    const ok = same(oa, na);
    if (!ok) bad++;
    rows.push({
      kind: `AUTH.${m}`,
      case: `${c.name} @ ${JSON.stringify(c.cookie)}`,
      why: c.why,
      old: show(oa),
      neu: show(na),
      ok,
    });
  }
}

// ── 输出 ───────────────────────────────────────────────────────────────────
console.log('');
console.log('════ 对拍：src/app/lib/auth.js ⟷ src/web/js/auth.js（cookie 读法）════');
console.log('');
console.log(`  用例：${CASES.length} 条 cookie 串 × 4 个入口（裸 getCookie + AUTH 三项）`);
console.log(`  合计：${rows.length} 项比对`);
console.log('');

const bads = rows.filter(r => !r.ok);
if (bads.length === 0) {
  console.log(`  ✅ 全部一致（${rows.length}/${rows.length}）`);
  console.log('');
  console.log('  说明：裸 getCookie 那一项新树未导出，记「跳过」；等价性由 AUTH 三项承担，');
  console.log('        而 AUTH 三项正是页面实际调用的入口。');
  console.log('');
  process.exit(0);
}

console.log(`  ✗ ${bads.length} 项不一致（共 ${rows.length} 项）`);
console.log('');
for (const r of bads.slice(0, 40)) {
  console.log(`  ✗ ${r.kind}  ← ${r.case}`);
  console.log(`      为什么有这一例：${r.why}`);
  console.log(`      老: ${r.old}`);
  console.log(`      新: ${r.neu}`);
}
if (bads.length > 40) console.log(`  …… 还有 ${bads.length - 40} 项，先修上面的`);
console.log('');
process.exit(1);

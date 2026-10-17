/**
 * 差分 · 「我的」页（`/my/`）老实现 vs 新实现
 * ==========================================================================
 *
 * 判据读**冻结快照** `duipan/legacy_ref/page-my.js`（不是 `src/web/js/page-my.js`）——
 * 读活文件等于让判据跟着实现漂，`src/web/` 里那份等收口时会被删。
 * 快照来源提交 `7ec4fda^`，`cp` 逐字节复制。
 *
 * 比两件事：
 *
 *  ① **行为**：同一份 cookie + 同一份 XHR 响应，老侧与新侧各跑一遍，比它们写进
 *     `#myContent` 的 `innerHTML` **逐字节相同**。这一页的全部可见输出就是这么来的，
 *     所以比字符串比比 DOM 树更严 —— 少一个分号、多一个空格都会红。
 *  ② **函数体**：把老侧 `window.loadMain = function {...}` 的正文与新侧
 *     `export function loadMain() {...}` 的正文，剥注释空白后逐字比。行为用例盖不到
 *     的分支（比如某个 if 的另一半）只有这一层能看出来。
 *
 * 老侧是 **IIFE**（`(function(){ … })()`），不是顶层函数 —— 它把 5 个函数挂到
 * `window` 上（`loadMain` / `loadTokenUsage` / `getToken` / `goSettings` / `doLogout`），
 * `getUser` / `esc` 是闭包内的私有函数。新侧把 `getUser` / `getToken` 换成了
 * `../lib/auth.js` 的同语义实现（老页自己写了两份正则读 cookie，那才是重复）。
 * 所以 `getUser` / `getToken` **不比**，其余 4 个 + `esc` 的可见效果都比。
 *
 * ★ 坑（写在这一页，因为它是第 8 页，前 7 页踩过的这里都要避）：
 *   老的库全局必须搬进 **Node 真实 globalThis**（新 ESM 模块走 `globalThis.document`），
 *   否则老侧有真 DOM、新侧空气 → 整片假红。
 *   新模块 `my.logic.js` 在 import 时就要 `document` 存在（`esc` 里 createElement），
 *   所以 **installGlobals 必须在动态 import 之前**。
 *
 * 用法：node duipan/diff_my_functions.mjs [--verbose]
 * 退出码：0 = 全一致；1 = 有差异；2 = 装载失败（测不出来，不是通过）
 */

import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const { makeDocument, installGlobals } = require('./dom_stub.js')

const VERBOSE = process.argv.includes('--verbose')
const LEGACY = join(HERE, 'legacy_ref', 'page-my.js')
const NEW_MOD = join(ROOT, 'src', 'app', 'my', 'my.logic.js')

let pass = 0, fail = 0
const failures = []
function ok(name, cond, detail) {
  if (cond) { pass++; if (VERBOSE) console.log(`   ✓ ${name}`) }
  else {
    fail++; failures.push(name)
    console.log(`   ✗ ${name}`)
    if (detail) console.log(String(detail).split('\n').map((l) => '       ' + l).join('\n'))
  }
}

// ─────────────────────────────────────────────────────────────
// 1. 一份「页面环境」：cookie 可设、XHR 可配、location 可读
//
// ⚠ 两侧必须**用同一份实现**跑，否则差异里混着环境差异。所以下面这个
//   `makeEnv()` 每次同时造出「老侧要的沙箱输入」和「新侧要的 globalThis」。
// ─────────────────────────────────────────────────────────────
function makeEnv({ cookie = '', xhr = null } = {}) {
  const document = makeDocument({ honorIds: true, richer: true })
  document.cookie = cookie

  const calls = []
  // XHR 桩：`loadTokenUsage` 只用到 open / setRequestHeader / onload / onerror / send。
  class FakeXHR {
    constructor() { this.headers = {}; this.status = 200; this.responseText = '' }
    open(method, url) { this.method = method; this.url = url }
    setRequestHeader(k, v) { this.headers[k] = v }
    send() {
      calls.push({ method: this.method, url: this.url, headers: { ...this.headers } })
      const r = xhr
      if (!r) { this.onerror && this.onerror(); return }
      if (r === 'error') { this.onerror && this.onerror(); return }
      this.status = r.status || 200
      this.responseText = typeof r.body === 'string' ? r.body : JSON.stringify(r.body)
      this.onload && this.onload()
    }
  }

  const location = { href: '/my/' }
  return { document, calls, location, FakeXHR }
}

/** 老侧：在 vm 沙箱里跑那个 IIFE，返回它挂到 window 上的东西 */
function loadLegacy(env) {
  const sandbox = {
    document: env.document,
    XMLHttpRequest: env.FakeXHR,
    location: env.location,
    confirm: () => true,
    console,
    JSON,
    Math,
    RegExp,
    String,
    Number,
    decodeURIComponent,
    encodeURIComponent,
    isNaN,
    parseInt,
    parseFloat,
    Object,
    Array,
    Date,
  }
  sandbox.window = sandbox
  sandbox.globalThis = sandbox
  vm.createContext(sandbox)
  vm.runInContext(readFileSync(LEGACY, 'utf8'), sandbox, { filename: 'legacy_ref/page-my.js' })
  return sandbox
}

// ─────────────────────────────────────────────────────────────
// 2. 新侧：把 globalThis 摆成页面环境，再动态 import
// ─────────────────────────────────────────────────────────────
let NEW = null

async function loadNew(env) {
  installGlobals(env.document)
  globalThis.XMLHttpRequest = env.FakeXHR
  globalThis.location = env.location
  globalThis.confirm = () => true
  // 缓存破坏：每次换 env 都要重新求值模块吗？**不用** —— 模块只依赖 globalThis 上的
  // document / XMLHttpRequest / location，这几个在调用时才读。所以 import 一次即可，
  // 换 env 只要把 globalThis 换掉。
  if (!NEW) NEW = await import(NEW_MOD)
  return NEW
}

// ─────────────────────────────────────────────────────────────
// 3. 用例
// ─────────────────────────────────────────────────────────────

/** 登录态用例要的 cookie 串。用户名故意带 HTML 特殊字符与中文。 */
const cookieFor = (u) => (u ? `sqw_username=${encodeURIComponent(u)}; sqw_token=stub-token-abc` : '')

/**
 * `loadMain` 的 12 种输入。覆盖：游客 / 三种 tier / 有限与无限 / 0 用量 /
 * 用量超限（`Math.min(100, …)` 的上界）/ 百分比的两种 toFixed 边界 /
 * 剩余次数取整（floor）/ 四种失败形态。
 */
const MAIN_CASES = [
  { name: '游客（无 cookie）', user: null, xhr: null },
  { name: '游客（只有 token 没有 username）', user: null, cookieOverride: 'sqw_token=abc', xhr: null },
  { name: 'tier=0 有限额度 15000/40000（37.5%）', user: 'alice', xhr: { body: { tokenUsed: 15000, tokenLimit: 40000, tier: 0 } } },
  { name: 'tier=1 有限额度 1499/40000（3.7%）', user: 'bob', xhr: { body: { tokenUsed: 1499, tokenLimit: 40000, tier: 1 } } },
  { name: 'tier=2 有限额度（SVIP 金色）', user: 'carol', xhr: { body: { tokenUsed: 999, tokenLimit: 30000, tier: 2 } } },
  { name: 'tier 缺省 → 当 0 用', user: 'dave', xhr: { body: { tokenUsed: 10, tokenLimit: 40000 } } },
  { name: 'tier=9（未知档）→ 落回「普通用户」', user: 'eve', xhr: { body: { tokenUsed: 10, tokenLimit: 40000, tier: 9 } } },
  { name: 'tokenUsed=0（0.0%）', user: 'frank', xhr: { body: { tokenUsed: 0, tokenLimit: 40000, tier: 0 } } },
  { name: '用量超限 50000/40000（Math.min 顶到 100.0%）', user: 'gina', xhr: { body: { tokenUsed: 50000, tokenLimit: 40000, tier: 1 } } },
  { name: '无限额度（tokenLimit=null）', user: 'hank', xhr: { body: { tokenUsed: 12345, tokenLimit: null, tier: 2 } } },
  { name: '剩余次数取整（40000-1499=38501 → floor/1500=25）', user: 'ivy', xhr: { body: { tokenUsed: 1499, tokenLimit: 40000, tier: 0 } } },
  { name: '用户名带 < & " 与中文（esc 的转义）', user: '张<三&"x">', xhr: { body: { tokenUsed: 1, tokenLimit: 40000, tier: 0 } } },
  { name: '失败：XHR onerror', user: 'alice', xhr: 'error' },
  { name: '失败：HTTP 500 + 非 JSON', user: 'alice', xhr: { status: 500, body: '<html>500</html>' } },
  { name: '失败：响应缺 tokenUsed（返回 {}）', user: 'alice', xhr: { body: {} } },
  { name: '失败：tokenUsed 存在但 tokenLimit 缺失', user: 'alice', xhr: { body: { tokenUsed: 5 } } },
]

async function runMain(side, c) {
  const env = makeEnv({ cookie: c.cookieOverride ?? cookieFor(c.user), xhr: c.xhr })
  if (side === 'legacy') {
    const sb = loadLegacy(env)
    // ★ 老脚本**末尾自己调了一次** `window.loadMain()`（`page-my.js` 最后一行），
    //   那一次已经发了一个 XHR。所以要清掉它留下的痕迹再重跑，否则老侧永远是
    //   「两次请求」而新侧一次 —— 这个差异是**驱动的**，不是实现的。
    sb.document.getElementById('myContent').innerHTML = ''
    env.calls.length = 0
    sb.window.loadMain()
    return { html: env.document.getElementById('myContent').innerHTML, calls: env.calls, env }
  }
  const mod = await loadNew(env)
  env.document.getElementById('myContent').innerHTML = ''
  mod.loadMain()
  return { html: env.document.getElementById('myContent').innerHTML, calls: env.calls, env }
}

// ─────────────────────────────────────────────────────────────
// 4. 函数体逐字比（剥注释与空白）
// ─────────────────────────────────────────────────────────────
/**
 * 归一化后再比。**归一化规则只有三条，全部是「搬迁必然产生、且不改变行为」的**：
 *
 *   ① `window.` 前缀去掉 —— 老侧是 IIFE 往 window 上挂函数、内部互相调要写
 *      `window.getToken()`；新侧是 ESM 模块，同作用域直接调 `getToken()`。
 *   ② `"` 统一成 `'` —— 新文件过了 prettier，引号风格变了；字符串内容里**没有**
 *      单引号（这一页的 HTML 都用 `"` 作属性引号、`'` 作 JS 引号，没有嵌套翻转）。
 *   ③ 空白全去掉 —— 缩进与换行。
 *
 * 除此之外一个字都不放过。**不允许**在这里加「大致等价」的规则（比如把 `var` 换
 * `const` 抹平）—— 那样这一层就不是逐字比了。
 */
function stripCode(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/\bwindow\./g, '')
    .replace(/"/g, "'")
    .replace(/\s+/g, '')
}

/** 从 `start` 位置的花括号开始，配对到配对的 `}`，返回正文（不含外壳大括号） */
function braceBody(src, fromIdx) {
  const i = src.indexOf('{', fromIdx)
  if (i < 0) return null
  let depth = 0
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) return { body: src.slice(i + 1, j), end: j }
    }
  }
  return null
}

/** 老侧窗口函数的正文 */
function legacyBody(src, name) {
  const re = new RegExp(`window\\.${name}\\s*=\\s*function\\s*\\([^)]*\\)`)
  const m = re.exec(src)
  if (!m) return null
  const r = braceBody(src, m.index + m[0].length)
  return r ? r.body : null
}

/** 新侧导出函数的正文 */
function newBody(src, name) {
  const re = new RegExp(`export\\s+function\\s+${name}\\s*\\([^)]*\\)`)
  const m = re.exec(src)
  if (!m) return null
  const r = braceBody(src, m.index + m[0].length)
  return r ? r.body : null
}

// ─────────────────────────────────────────────────────────────
// 5. 主流程
// ─────────────────────────────────────────────────────────────
async function main() {
  const legacySrc = readFileSync(LEGACY, 'utf8')
  const newSrc = readFileSync(NEW_MOD, 'utf8')

  // 5.0 装载自检 —— 老侧挂出来的 5 个名字必须都在，否则后面「比不出差异」是假绿
  console.log('\n【0】装载自检')
  {
    const env = makeEnv({ cookie: cookieFor('alice'), xhr: { body: { tokenUsed: 1, tokenLimit: 10, tier: 0 } } })
    const sb = loadLegacy(env)
    for (const n of ['loadMain', 'loadTokenUsage', 'getToken', 'goSettings', 'doLogout']) {
      ok(`老侧 window.${n} 是函数`, typeof sb.window[n] === 'function', typeof sb.window[n])
    }
    const mod = await loadNew(env)
    for (const n of ['loadMain', 'loadTokenUsage', 'goSettings', 'doLogout']) {
      ok(`新侧导出 ${n} 是函数`, typeof mod[n] === 'function', typeof mod[n])
    }
    // `loadTokenUsage(cb)` 是这一页唯一有回包的函数，自检它真被调用过
    const got = []
    mod.loadTokenUsage((d) => got.push(d))
    ok('新侧 loadTokenUsage 真回调了（不是永不回调）', got.length === 1, JSON.stringify(got))
    // `honorIds:false` 反向自检：证明 getElementById 不恒等
    const bad = makeDocument({ honorIds: false })
    ok('honorIds:false 挡位真的会让 getElementById 每次给新元素（证明上面那些断言不是恒真）',
      bad.getElementById('x') !== bad.getElementById('x'))
  }

  // 5.1 loadMain 行为
  console.log(`\n【1】loadMain 行为：${MAIN_CASES.length} 种输入，比 #myContent.innerHTML 逐字节`)
  for (const c of MAIN_CASES) {
    const a = await runMain('legacy', c)
    const b = await runMain('new', c)
    if (a.html === b.html) {
      ok(`loadMain · ${c.name}（${a.html.length} 字节）`, true)
    } else {
      let i = 0
      while (i < a.html.length && i < b.html.length && a.html[i] === b.html[i]) i++
      ok(`loadMain · ${c.name}`, false,
        `逐字节不同（第 ${i} 字节起；老 ${a.html.length} / 新 ${b.html.length} 字节）\n` +
        `老: ${JSON.stringify(a.html.slice(Math.max(0, i - 50), i + 70))}\n` +
        `新: ${JSON.stringify(b.html.slice(Math.max(0, i - 50), i + 70))}`)
    }
    // 请求形状也要一致：游客态「不发请求」、登录态「发一次带 Bearer」
    const shape = (x) => x.map((k) => `${k.method} ${k.url} ${k.headers.Authorization || '-'}`).join(' | ')
    ok(`loadMain · ${c.name} 的请求形状一致（${shape(a.calls) || '无请求'}）`,
      shape(a.calls) === shape(b.calls), `老 ${shape(a.calls)} / 新 ${shape(b.calls)}`)
  }

  // 5.2 goSettings 行为
  console.log('\n【2】goSettings 行为')
  for (const [label, initHtml] of [['空 #myContent', ''], ['已有账户卡（覆盖旧内容）', '<div class="my-card">旧</div>']]) {
    const a = makeEnv({ cookie: cookieFor('alice') })
    const sb = loadLegacy(a)
    a.document.getElementById('myContent').innerHTML = initHtml
    sb.window.goSettings()
    const b = makeEnv({ cookie: cookieFor('alice') })
    const mod = await loadNew(b)
    b.document.getElementById('myContent').innerHTML = initHtml
    mod.goSettings()
    const ha = a.document.getElementById('myContent').innerHTML
    const hb = b.document.getElementById('myContent').innerHTML
    ok(`goSettings · ${label}（${ha.length} 字节）`, ha === hb,
      ha === hb ? '' : `老: ${JSON.stringify(ha)}\n新: ${JSON.stringify(hb)}`)
  }

  // 5.3 doLogout 行为（取消 / 确认）
  console.log('\n【3】doLogout 行为：确认文案 / cookie 清理 / 跳转')
  for (const [label, answer] of [['取消', false], ['确认', true]]) {
    const run = async (side) => {
      const env = makeEnv({ cookie: cookieFor('alice') })
      const modal = []
      if (side === 'legacy') {
        const sb = loadLegacy(env)
        sb.confirm = (msg) => { modal.push(String(msg)); return answer }
        sb.window.doLogout()
        return { modal, cookie: env.document.cookie, href: env.location.href }
      }
      const mod = await loadNew(env)
      globalThis.confirm = (msg) => { modal.push(String(msg)); return answer }
      mod.doLogout()
      return { modal, cookie: env.document.cookie, href: env.location.href }
    }
    const a = await run('legacy')
    const b = await run('new')
    ok(`doLogout · ${label}：确认文案逐字相同（${JSON.stringify(a.modal)}）`,
      JSON.stringify(a.modal) === JSON.stringify(b.modal), `老 ${JSON.stringify(a.modal)} / 新 ${JSON.stringify(b.modal)}`)
    ok(`doLogout · ${label}：cookie 结果一致（${JSON.stringify(a.cookie)}）`,
      a.cookie === b.cookie, `老 ${JSON.stringify(a.cookie)} / 新 ${JSON.stringify(b.cookie)}`)
    ok(`doLogout · ${label}：跳转一致（${JSON.stringify(a.href)}）`,
      a.href === b.href, `老 ${JSON.stringify(a.href)} / 新 ${JSON.stringify(b.href)}`)
  }
  ok('doLogout · 取消时不跳转、不清 cookie（老侧自证这条用例没写反）',
    (await (async () => {
      const env = makeEnv({ cookie: cookieFor('alice') })
      const sb = loadLegacy(env)
      sb.confirm = () => false
      sb.window.doLogout()
      return env.location.href === '/my/' && env.document.cookie.indexOf('sqw_username=alice') >= 0
    })()))

  // 5.4 函数体逐字比
  console.log('\n【4】函数体逐字比（剥注释与空白）')
  for (const name of ['loadMain', 'loadTokenUsage', 'goSettings', 'doLogout']) {
    const lb = legacyBody(legacySrc, name)
    const nb = newBody(newSrc, name)
    if (!lb || !nb) { ok(`函数体 · ${name}`, false, `切不出来（老 ${!!lb} / 新 ${!!nb}）`); continue }
    const a = stripCode(lb)
    const b = stripCode(nb)
    if (a === b) { ok(`函数体 · ${name} 逐字一致（${a.length} 字符）`, true) }
    else {
      let i = 0
      while (i < a.length && i < b.length && a[i] === b[i]) i++
      ok(`函数体 · ${name}`, false,
        `第 ${i} 字符起不同\n老: ${JSON.stringify(a.slice(Math.max(0, i - 40), i + 60))}\n新: ${JSON.stringify(b.slice(Math.max(0, i - 40), i + 60))}`)
    }
  }

  // 5.5 只有这一页该少的重复：老侧自己写的 getToken 正则
  console.log('\n【5】重复代码审计')
  {
    const env = makeEnv({ cookie: cookieFor('alice') })
    const sb = loadLegacy(env)
    const mod = await loadNew(env)
    ok('老侧有 window.getToken（它自己写正则读 cookie）', typeof sb.window.getToken === 'function')
    ok('新侧**不导出** getToken（改由 ../lib/auth.js 提供，不再手写第二份）',
      !('getToken' in mod), JSON.stringify(Object.keys(mod)))
    const { getToken: libGetToken } = await import('../src/app/lib/auth.js')
    ok('  但 lib 的 getToken 读出来的值与老侧逐字相同（alice）',
      libGetToken() === sb.window.getToken(), `lib ${libGetToken()} / legacy ${sb.window.getToken()}`)
    // ★ 无 cookie 时两者都给 `null`（不是空串）。这条一开始我写成了「都返回空串」
    //   而红了一次 —— 红的是**我的期望**，不是实现。`if (!token)` 对两者同样成立，
    //   所以行为无差别，但值本身必须记在这里：`null` 若哪天被改成 `undefined`，
    //   序列化进 JSON 的形态会变。
    const e2 = makeEnv({ cookie: '' })
    const s2 = loadLegacy(e2)
    installGlobals(e2.document)
    const libNo = libGetToken()
    const legNo = s2.window.getToken()
    ok(`  无 cookie 时两者都返回 null（lib ${JSON.stringify(libNo)} / legacy ${JSON.stringify(legNo)}）`,
      libNo === null && legNo === null && libNo === legNo)
  }

  // 收尾
  console.log('\n' + '─'.repeat(60))
  if (fail === 0) {
    console.log(`✅ 全一致：${pass} 项`)
    process.exit(0)
  }
  console.log(`❌ ${fail} 项不一致 / 共 ${pass + fail} 项`)
  console.log('红的是：\n  · ' + failures.join('\n  · '))
  process.exit(1)
}

main().catch((e) => {
  console.error('\n⚠ 装载失败（测不出来，不是通过）：')
  console.error(e && e.stack || e)
  process.exit(2)
})

#!/usr/bin/env node
/**
 * 变异自检 · `duipan/diff_my_functions.mjs` 是不是真的会红
 * ==========================================================================
 *
 * 一条差分跑出 60 项全绿，只证明「当前两侧一样」；不证明「不一样时它会红」。
 * 这个脚本把新实现改坏一点点，看差分是否变成退出码 1，然后**逐字节还原**。
 *
 * 每个变异必须触发它**期望的那一类**判据（`expect` 里那行文字要出现在输出里）——
 * 只看退出码不够：M2 里 `Bearer` 大小写写错会让 `loadTokenUsage` 的请求头变，但如果
 * 差分自己挂了（退出码 2），也是非零，却什么都没证明。所以：
 *
 *   退出码 0 → ✗ 没抓到
 *   退出码 2 → ✗ 差分自己崩了（不算抓到，也不算没抓到 —— 单独记 invalid）
 *   退出码 1 且 expect 命中 → ✓
 *   退出码 1 但 expect 没命中 → ✗ 抓到了别的，说明我写的变异没落在以为的地方
 *
 * 用法：node duipan/mutate_my_functions.js
 * 退出码：0 = 每个变异都被抓、文件全还原；1 = 有漏网的或还原失败
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const TARGET = path.join(ROOT, 'src', 'app', 'my', 'my.logic.js')
const DIFF = path.join(__dirname, 'diff_my_functions.mjs')

const ORIG = fs.readFileSync(TARGET, 'utf8')
const SHA = crypto.createHash('sha256').update(ORIG).digest('hex')

const MUTATIONS = [
  {
    id: 'M1',
    what: 'loadMain 的百分比上限从 100 改成 99（用量超限那条的 Math.min 上界）',
    from: 'Math.min(100,',
    to: 'Math.min(99,',
    expect: '用量超限 50000/40000',
  },
  {
    id: 'M2',
    what: 'loadTokenUsage 的 Authorization 头从 `Bearer ` 改成 `bearer `（大小写）',
    from: "'Bearer ' + token",
    to: "'bearer ' + token",
    expect: '的请求形状一致',
  },
  {
    id: 'M3',
    what: 'goSettings 少渲染一张卡（删掉「退出登录」按钮所在的那段）',
    from: '退出登录',
    to: '退出',
    expect: 'goSettings',
  },
  {
    id: 'M4',
    what: 'doLogout 的确认文案改一个字（确定性：这句文案只有一处）',
    from: '确定退出登录吗？',
    to: '确定要退出登录吗？',
    expect: 'doLogout',
  },
  {
    id: 'M5',
    what: 'loadMain 的百分比小数位从 1 位改成 2 位（37.5% → 37.50%）',
    from: '.toFixed(1)',
    to: '.toFixed(2)',
    expect: 'tier=0 有限额度',
  },
]

function restore() {
  fs.writeFileSync(TARGET, ORIG)
  const now = crypto.createHash('sha256').update(fs.readFileSync(TARGET)).digest('hex')
  if (now !== SHA) {
    console.error(`❌ 还原失败！当前 sha256 ${now}，应为 ${SHA}`)
    process.exitCode = 1
  }
}

function runDiff() {
  const r = spawnSync(process.execPath, [DIFF], { cwd: ROOT, encoding: 'utf8', timeout: 180000 })
  const out = (r.stdout || '') + (r.stderr || '')
  // ★ 被信号杀掉时 status 是 null，`null !== 0` 为 true —— 不能拿它当「抓到了」
  const killed = r.status === null
  return { code: r.status, signal: r.signal, out, killed }
}

console.log(`目标：src/app/my/my.logic.js  sha256 ${SHA.slice(0, 16)}…`)
console.log(`变异 ${MUTATIONS.length} 个\n`)

let caught = 0
const missed = []
let invalid = 0

for (const m of MUTATIONS) {
  const hits = ORIG.split(m.from).length - 1
  if (hits !== 1) {
    console.log(`✗ ${m.id} 落点不唯一（原文里出现 ${hits} 次）：${JSON.stringify(m.from)}`)
    restore()
    invalid++
    continue
  }
  fs.writeFileSync(TARGET, ORIG.replace(m.from, m.to))
  const r = runDiff()
  restore()

  if (r.killed) {
    console.log(`⚠ ${m.id} 差分被 ${r.signal} 杀掉 —— 这个变异**没测出来**（不算抓到）`)
    invalid++
    continue
  }
  if (r.code === 2) {
    console.log(`⚠ ${m.id} 差分装载失败（退出码 2）—— 不是抓到了，是测不出来`)
    invalid++
    continue
  }
  if (r.code !== 0 && r.out.indexOf(m.expect) >= 0) {
    caught++
    const redCount = (r.out.match(/^   ✗ /gm) || []).length
    console.log(`✓ ${m.id} 抓到（${redCount} 条红，命中「${m.expect}」）—— ${m.what}`)
  } else if (r.code !== 0) {
    console.log(`✗ ${m.id} 变红了但没命中「${m.expect}」—— 说明变异没落在你以为的地方`)
    console.log(String(r.out.split('\n').filter((l) => l.includes('✗')).slice(0, 5).join('\n')))
    missed.push(m.id)
  } else {
    console.log(`✗ ${m.id} 没抓到（差分仍然全绿）—— ${m.what}`)
    missed.push(m.id)
  }
}

console.log('\n' + '─'.repeat(60))
const now = crypto.createHash('sha256').update(fs.readFileSync(TARGET)).digest('hex')
if (now !== SHA) {
  console.log(`❌ 文件没有逐字节还原（${now}）`)
  process.exit(1)
}
console.log(`文件已逐字节还原（sha256 ${now.slice(0, 16)}…）`)
if (missed.length === 0 && invalid === 0) {
  console.log(`✅ ${caught}/${MUTATIONS.length} 全部被抓，差分脚本有效`)
  process.exit(0)
}
if (missed.length) console.log(`❌ 漏网：${missed.join(', ')}`)
if (invalid) console.log(`⚠ 无效：${invalid} 个（落点不唯一 / 差分崩溃 / 被信号杀）`)
process.exit(1)

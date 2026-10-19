#!/usr/bin/env node
/**
 * 纯函数差分：老实现 vs 新模块，逐字节比。
 *
 * 为什么要有这个（计划 §5.1）：
 *   「流式渲染与积分尾巴逐字符一致」这条出口判据，**不能**靠上线盯真流式输出看 ——
 *   那既贵又盖不到冷分支。`renderMarkdown` / `splitPoints` 都是纯函数（字符串进、
 *   字符串出），所以把老实现原样跑起来、新实现 import 进来，喂同一批输入断言逐字节
 *   相同，是更强也更便宜的证据。不花钱、不写任何线上状态。
 *
 * 老实现怎么拿到：
 *   `src/web/js/page-ai-chat.js` 是 classic script，函数都是顶层 `function` 声明。
 *   用最小 DOM 桩在 `node:vm` 里跑一遍，那些函数就成了沙箱对象的属性，直接调。
 *   （`const TRIGRAMS` 是词法作用域、不会挂到沙箱上，但卡片渲染器是词法引用它，照跑。）
 *
 * 用法：
 *   node duipan/diff_pure_functions.mjs
 *   退出码 0 = 全部逐字节相同；1 = 有差异（逐条打印）
 */
import './register_css_stub.mjs';
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import legacy from './legacy_ai_chat.js'   // CJS，import 进来拿的是 module.exports

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// 老实现：DOM 桩那一份在 legacy_ai_chat.js 里，和驱页脚本共用，别在这抄第二份。
let sb
try {
  sb = legacy.loadLegacy()
} catch (e) {
  console.error(`✗ ${e.message}`)
  process.exit(2)
}
// 新模块跑在真实 Node 全局里，`document` 得显式给 —— 而且必须是**同一份**桩，
// 否则 `escHtml` 这类 DOM 转义函数两边根本不在比同一件事（见 legacy_ai_chat.js 注释）。
legacy.installDomGlobals(sb)

// ── 新模块（ESM）。缺失就明确报「还没写」，不是静默跳过 ────────────────────
async function loadNew() {
  const out = {}
  const want = {
    markdown: 'renderMarkdown',
    points: 'splitPoints',
  }
  for (const [mod, fn] of Object.entries(want)) {
    const p = path.join(ROOT, 'src', 'app', 'lib', `${mod}.js`)
    if (!fs.existsSync(p)) {
      console.error(`✗ 新模块还不存在：src/app/lib/${mod}.js（里面该有 ${fn}）`)
      process.exit(2)
    }
    const m = await import(p)
    if (typeof m[fn] !== 'function') {
      console.error(`✗ src/app/lib/${mod}.js 里没有导出 ${fn}`)
      process.exit(2)
    }
    out[mod] = m
  }
  return out
}

// ── 输入语料：专挑老代码里那些平时跑不到的分支 ────────────────────────────
const MD_CASES = [
  ['空串', ''],
  ['null', null],
  ['纯文本', '你好，这是普通一句话。'],
  ['多段', '第一段\n\n第二段\n\n第三段'],
  ['单换行', '第一行\n第二行'],
  ['井号标题', '# 一级标题\n## 二级标题\n### 三级标题'],
  ['中文方括号标题', '【综合命盘评分】\n下面是正文'],
  ['无序列表-空格', '- 第一项\n- 第二项'],
  ['无序列表-无空格', '-**重点**\n-第二项'],
  ['星号列表', '* 甲\n* 乙'],
  ['整行加粗(不是列表)', '**综合命盘评分：72/100 偏上**'],
  ['三连星号', '***很重的强调***'],
  ['未闭合加粗', '-**文字没闭合'],
  ['单独星号', '这是 * 一个裸星号'],
  ['有序列表', '1. 甲\n2. 乙\n10. 丙'],
  ['引用块', '> 这是一句引用\n> 第二行引用'],
  ['引用块内加粗', '> **要点**：注意'],
  ['代码块', '```js\nconst a = 1;\n```'],
  ['行内代码', '这是 `code` 行内代码'],
  ['分隔线', '上面\n---\n下面'],
  ['HTML 转义', '<script>alert(1)</script> & "引号"'],
  ['混合大杂烩', '# 标题\n\n正文一段。\n\n【小节】\n- 项目一\n- **项目二**\n\n> 引用\n\n```\ncode\n```\n\n1. 有序\n\n---\n\n收尾。'],
  ['连续空行', '甲\n\n\n\n乙'],
  ['只有换行', '\n\n\n'],
  ['段内换行+块级', '普通行\n<div class="md-h">【x】</div>\n普通行'],
]

const POINTS_CASES = [
  ['空串', ''],
  ['null', null],
  ['无记账行', '这是正文，没有记账行。'],
  ['积分尾巴', '这是正文。\n消耗积分：12 分'],
  ['旧字 Token 尾巴', '这是正文。\n消耗 Token：34 分', { 有意变更: { body: '这是正文。', points: '消耗 Token：34 分' }, 理由: '新实现同时识别旧 Token 标记' }],
  ['尾巴带分隔线', '这是正文。\n---\n消耗积分：56 分'],
  ['正文里有"消耗积分"字样但不在行首', '他问消耗积分：这个说法'],
  ['尾巴在中间(取 lastIndexOf)', '甲\n消耗积分：1\n乙\n消耗积分：2'],
  ['只有尾巴', '\n消耗积分：9', { 有意变更: { body: '', points: '消耗积分：9' }, 理由: '新实现把只剩记账行的正文裁成空串' }],
  ['尾巴前无换行前缀', '正文消耗积分：9'],
  ['多个 --- 结尾', '正文\n---\n---\n消耗积分：3'],
  ['尾巴后带空白', '正文\n消耗积分：7  \n'],
]

const LABEL_CASES = [
  ['空', ''], ['null', null], ['旧字', '消耗 Token：5', { 有意变更: '本次消耗 5 Token', 理由: '新标签统一成「本次消耗 N 单位」，旧 Token 保留单位' }],
  ['新字', '消耗积分：5', { 有意变更: '本次消耗 5 积分', 理由: '新标签统一成「本次消耗 N 单位」' }], ['中间出现', '前面消耗 Token：5'],
]

// ── 卡片渲染语料 ──────────────────────────────────────────────────────────
// 值本身是编的（两边喂同一份，编的也能差出来），但**结构照真数据**：字段名、层级、
// 缺字段的形态都抄自 page-ai-chat.js 的读取路径。重点盖冷分支 —— 缺 hexagrams、
// 只有本卦没有变卦、upper/lower 是字符串、trigram 编号越界、null。
const MHYS_FULL = {
  topic: '这件事能不能成', divinationTime: '2026/10/17 12:00:00', method: '数字起卦1', gender: '',
  hexagrams: {
    benGua: { upper: 6, lower: 3, name: '火水未济', movingYao: [3] },
    huGua: { upper: 3, lower: 6, name: '水火既济' },
    bianGua: { upper: 6, lower: 6, name: '坎为水' },
    cuoGua: { upper: 3, lower: 1, name: '火天大有' },
    zongGua: { upper: 1, lower: 3, name: '天火同人' },
    ti: { tri: { name: '坎', symbol: '☵' } }, yong: { tri: { name: '离', symbol: '☲' } },
    verdict: { text: '用克体', cls: '', desc: '外部阻力较大，需要谨慎应对。' },
  },
}
const LIUYAO_FULL = {
  topic: '六爻测试', divinationTime: '2026-10-17 12:00', method: '铜钱起卦',
  hexagrams: {
    benGua: { upper: 1, lower: 1, name: '乾为天' },
    bianGua: { upper: 8, lower: 8, name: '坤为地' },
    gong: { name: '乾宫' }, shiYao: { name: '世' }, yingYao: { name: '应' },
  },
}
const CHART_FULL = {
  name: '张三', topic: '命盘', birthYear: 1990, birthMonth: 5, birthDay: 20, birthHour: 14,
  bazi: '庚午 辛巳 乙酉 癸未', zodiac: '马', dayMaster: '乙',
}
const CARD_CASES = [
  ['mhys 全', ['mhys', MHYS_FULL, '我补的话', false]],
  ['mhys 气泡态', ['mhys', MHYS_FULL, '我补的话', true]],
  ['mhys 无 hexagrams', ['mhys', { topic: '只有题目', divinationTime: 'T' }, '', false]],
  ['mhys hexagrams 空对象', ['mhys', { topic: 'T', hexagrams: {} }, '', false]],
  ['mhys 只有本卦', ['mhys', { divinationTime: 'T', hexagrams: { benGua: { upper: 2, lower: 7, name: '山泽损' } } }, '', false]],
  ['mhys upper/lower 是字符串', ['mhys', { hexagrams: { benGua: { upper: '6', lower: '3', name: 'X' } } }, '', false]],
  ['mhys 编号越界', ['mhys', { hexagrams: { benGua: { upper: 9, lower: 0, name: 'X' } } }, '', false]],
  ['mhys cardData 为 null', ['mhys', null, '', false]],
  ['mhys 缺 name', ['mhys', { hexagrams: { benGua: { upper: 1, lower: 1 } }, topic: '兜底题目' }, '', false]],
  ['liuyao 全', ['liuyao', LIUYAO_FULL, '补充', false]],
  ['liuyao 气泡态', ['liuyao', LIUYAO_FULL, '补充', true]],
  ['liuyao 无变卦', ['liuyao', { topic: 'T', hexagrams: { benGua: { upper: 1, lower: 8, name: '天地否' } } }, '', false]],
  ['liuyao 变卦无 upper', ['liuyao', { hexagrams: { benGua: { upper: 1, lower: 1, name: 'A' }, bianGua: { name: 'B' } } }, '', false]],
  ['liuyao 无 benGua', ['liuyao', { topic: 'T', hexagrams: { gong: { name: '乾宫' } } }, '', false]],
  ['liuyao 无 hexagrams', ['liuyao', { topic: '兜底' }, '', false]],
  ['liuyao cardData 为 null', ['liuyao', null, '', false]],
  ['chart 全', ['chart', CHART_FULL, '', false]],
  ['chart 只有 createdAt', ['chart', { name: '李四', createdAt: '2026-10-17' }, '', false]],
  ['chart birthTime 代 birthHour', ['chart', { birthYear: 2000, birthTime: '子' }, '', false]],
  ['chart 只有 name', ['chart', { name: '王五' }, '', false]],
  ['chart 空对象', ['chart', {}, '', false]],
  ['chart cardData 为 null', ['chart', null, '', false]],
  ['未知 type', ['unknown', { topic: 'T' }, '', false]],
  ['topic 里有 HTML', ['mhys', { topic: '<img src=x onerror=alert(1)>', hexagrams: {} }, '<b>粗</b>', false]],
]

// 只吃单参的那几个（都是各自 `type` 之外唯一入参）
const ONE_ARG_CASES = {
  escHtml: [['普通', 'a<b>&"c"'], ['空', ''], ['null', null], ['undefined', undefined], ['中文', '卦名·「引号」'], ['数字', 42]],
  escAttr: [['普通', 'a<b>&"c"'], ['单引号', "it's"], ['空', ''], ['null', null], ['对象', { a: 1 }]],
  getMhysEssence: [['全', MHYS_FULL], ['空', {}], ['null', null], ['只有 topic', { topic: 'T' }], ['只有本卦', { hexagrams: { benGua: { name: 'A' } } }]],
  getLiuyaoEssence: [['全', LIUYAO_FULL], ['空', {}], ['null', null], ['只有 topic', { topic: 'T' }], ['只有宫', { hexagrams: { gong: { name: '坎宫' } } }]],
  getChartTime: [['birthYear 全', CHART_FULL], ['birthYear 缺 day', { birthYear: 1990, birthMonth: 5 }], ['无 birthYear 有 createdAt', { createdAt: 'C' }], ['无 birthYear 有 birth_time', { birth_time: 'B' }], ['空', {}], ['null', null]],
  getChartEssence: [['八字全', CHART_FULL], ['shengxiao 别名', { shengxiao: '蛇' }], ['只有 name', { name: 'N' }], ['只有 topic', { topic: 'T' }], ['空', {}], ['null', null]],
  renderMhysHexMiniInline: [['全', MHYS_FULL.hexagrams], ['只有本卦', { benGua: { upper: 1, lower: 1, name: 'A' } }], ['空', {}]],
  renderLiuyaoHexMiniInline: [['全', LIUYAO_FULL.hexagrams], ['只有本卦', { benGua: { upper: 1, lower: 1, name: 'A' } }], ['空', {}]],
  renderMhysHex: [['全', MHYS_FULL.hexagrams], ['只有本卦', { benGua: { upper: 1, lower: 1, name: 'A' } }], ['空', {}]],
  renderLiuyaoHex: [['全', LIUYAO_FULL.hexagrams], ['只有本卦', { benGua: { upper: 1, lower: 1, name: 'A' } }], ['空', {}]],
  getCardSummary: [['mhys', ['mhys', MHYS_FULL]], ['liuyao', ['liuyao', LIUYAO_FULL]], ['chart', ['chart', CHART_FULL]], ['未知 type', ['zzz', CHART_FULL]], ['null', ['mhys', null]]],
}

// 一个参数、但参数是数组（多参调用）
const MULTI_ARG_CASES = {
  renderCard: CARD_CASES,
  renderCardInner: CARD_CASES.map(([n, a]) => [n, a.slice(0, 3)]),
  renderHexMini: CARD_CASES.map(([n, a]) => [n, a.slice(0, 2)]),
}

// ── hexRender：本页**最大的未验证面**（248 行拼 HTML 的纯函数）──────────────
// 卡片渲染是「用户直接看得见」的那部分：属性转义少一层、卦名取错一个下标，都是
// 静默的可视回归，靠盯真流式输出根本盖不住。它同样是纯函数（值进、HTML 串出），
// 所以和老实现逐字节对拍是够强也够便宜的判据 —— 没有理由不测。
const HEX_FNS = [
  'escHtml', 'escAttr',
  'getCardIcon', 'getCardLabel',
  'renderCard', 'renderCardInner', 'renderHexMini',
  'renderMhysHexMiniInline', 'renderLiuyaoHexMiniInline',
  'getCardSummary', 'getMhysEssence', 'getLiuyaoEssence',
  'getChartTime', 'getChartEssence',
  'renderMhysHex', 'renderLiuyaoHex',
]
const hexPath = path.join(ROOT, 'src', 'app', 'lib', 'hexRender.js')
if (!fs.existsSync(hexPath)) {
  console.error('✗ 新模块还不存在：src/app/lib/hexRender.js')
  process.exit(2)
}
const nh = await import(hexPath)
for (const fn of HEX_FNS) {
  if (typeof nh[fn] !== 'function') {
    console.error(`✗ src/app/lib/hexRender.js 里没有导出 ${fn}（老实现里它是顶层 function）`)
    process.exit(2)
  }
}

// ── 跑 ────────────────────────────────────────────────────────────────────
const nj = await loadNew()
const nMods = { renderMarkdown: nj.markdown.renderMarkdown, splitPoints: nj.points.splitPoints }

let total = 0, bad = 0
function cmp(label, fnOld, fnNew, cases, show = (v) => JSON.stringify(v)) {
  console.log(`\n── ${label} ──`)
  for (const c of cases) {
    const [name, input] = c
    total++
    let a, b, ea = null, eb = null
    try { a = fnOld(input) } catch (e) { ea = e.message }
    try { b = fnNew(input) } catch (e) { eb = e.message }
    if (ea || eb) {
      if (ea !== eb) { bad++; console.log(`  ✗ ${name}\n      老抛: ${ea}\n      新抛: ${eb}`) }
      else console.log(`  ✓ ${name}（两边都抛同一句）`)
      continue
    }
    const sa = show(a), sbv = show(b)
    // 用例可以带第三项 `{ 有意变更: 期望的新值, 理由 }`：新实现**故意**改了行为时拿期望值比，
    // 一致就通过并打印理由。这样「改了什么」留在判据里，而不是把老期望默默改成新期望。
    const intentional = Array.isArray(c) ? c[2] : null
    if (sa === sbv) console.log(`  ✓ ${name}`)
    else if (intentional && show(intentional['有意变更']) === sbv) {
      console.log(`  ✓ ${name}（有意变更：${intentional['理由']}）`)
    } else {
      bad++
      console.log(`  ✗ ${name}`)
      console.log(`      老: ${sa}`)
      console.log(`      新: ${sbv}`)
    }
  }
}

// 多参/数组参版本。`cases` 里每条是 [名字, [参数…]]。
function cmpArgs(label, fnOld, fnNew, cases, show = (v) => String(v)) {
  console.log(`\n── ${label} ──`)
  for (const [name, args] of cases) {
    total++
    let a, b, ea = null, eb = null
    try { a = fnOld(...args) } catch (e) { ea = e.message }
    try { b = fnNew(...args) } catch (e) { eb = e.message }
    if (ea || eb) {
      if (ea !== eb) { bad++; console.log(`  ✗ ${name}\n      老抛: ${ea}\n      新抛: ${eb}`) }
      else console.log(`  ✓ ${name}（两边都抛同一句）`)
      continue
    }
    const sa = show(a), sbv = show(b)
    if (sa === sbv) console.log(`  ✓ ${name}`)
    else {
      bad++
      console.log(`  ✗ ${name}`)
      console.log(`      老: ${sa.length > 600 ? sa.slice(0, 600) + '…' : sa}`)
      console.log(`      新: ${sbv.length > 600 ? sbv.slice(0, 600) + '…' : sbv}`)
    }
  }
}

cmp('renderMarkdown', sb.renderMarkdown, nMods.renderMarkdown, MD_CASES, (v) => String(v))
cmp('splitPoints', sb.splitPoints, nMods.splitPoints, POINTS_CASES)

// ── 卡片渲染（hexRender）─────────────────────────────────────────────────
for (const [fn, cases] of Object.entries(ONE_ARG_CASES)) {
  if (typeof sb[fn] !== 'function') { console.log(`\n── ${fn} ──\n  ⚠ 老实现里没有这个顶层函数，跳过`); continue }
  cmpArgs(fn, sb[fn], nh[fn], cases)
}
for (const [fn, cases] of Object.entries(MULTI_ARG_CASES)) {
  if (typeof sb[fn] !== 'function') { console.log(`\n── ${fn} ──\n  ⚠ 老实现里没有这个顶层函数，跳过`); continue }
  cmpArgs(fn, sb[fn], nh[fn], cases)
}
for (const fn of ['getCardIcon', 'getCardLabel']) {
  cmpArgs(fn, sb[fn], nh[fn], [['mhys', ['mhys']], ['liuyao', ['liuyao']], ['chart', ['chart']], ['未知', ['zzz']], ['空串', ['']], ['null', [null]]])
}
if (typeof nj.points.pointsLabel === 'function') {
  cmp('pointsLabel', sb.pointsLabel, nj.points.pointsLabel, LABEL_CASES, (v) => String(v))
} else {
  console.log('\n── pointsLabel ──\n  ⚠ 新模块没导出 pointsLabel，跳过（若确实不再需要则无妨）')
}

console.log(`\n══════ 差分结果 ══════`)
console.log(`  用例 ${total} 条，差异 ${bad} 条`)
if (bad === 0) {
  console.log('  ✅ 逐字节相同')
  process.exit(0)
} else {
  console.log('  ❌ 有差异 —— 新实现没对齐，别上线')
  process.exit(1)
}

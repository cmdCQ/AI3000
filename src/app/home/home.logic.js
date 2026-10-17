// 首页的纯逻辑。从 `src/web/js/page-home.js`（331 行 / 18 个函数）里剥出来的
// 部分是「有判断、能出错、值得单独验证」的那几个；碰 DOM 的部分留在 `main.jsx`。
//
// 划分标准：**这个函数能不能只靠入参算出结果**。能 → 这里（Vitest 直接测，
// 不起浏览器）；不能 → `main.jsx`（Playwright 测）。

/** 从 `document.cookie` 字串里取 sqw_username（老实现 page-home.js:8 的同一套正则） */
export function parseUserCookie(cookieStr) {
  var m = String(cookieStr || '').match(new RegExp('(^| )sqw_username=([^;]+)'))
  if (!m) return null
  try {
    return decodeURIComponent(m[2])
  } catch (e) {
    // cookie 里是坏的百分号编码时老实现会抛，这里退化成原串。
    // 首页只拿它做「登录了吗」的判断与展示，展示串坏掉比整页崩掉好。
    return m[2]
  }
}

export var FALLBACK_MD =
  '# 欢迎来到易三千 🎉\n\n' +
  '易三千 AI 命理平台已正式上线，融合传统命理与现代人工智能，为你提供专业的命理解读服务。\n\n' +
  '## 🌟 已上线功能\n\n' +
  '- **八字命盘** — 创建与管理个人命盘，支持公历/农历\n' +
  '- **梅花易数** — 年月日时起卦，万物类象\n' +
  '- **六爻** — 铜钱起卦，六十四卦详断\n' +
  '- **六十四卦** — 卦辞、爻辞、象传详解\n' +
  '- **AI 对话** — DeepSeek 大模型实时解卦，SSE 流式输出\n\n' +
  '## 🚀 即将上线\n\n' +
  '- **紫微斗数** — 十四主星 · 十二宫 · 四化飞星\n' +
  '- **奇门遁甲** — 九宫 · 八门 · 九星 · 八神\n\n' +
  '---\n\n' +
  '感谢您的支持与信赖。如有建议，欢迎点击下方「我们需要你宝贵的建议」反馈。\n\n' +
  '> 问天 · 问命 · 问心'

/** 老实现 page-home.js:159：内容短于 10 字符就当没取到，用兜底 */
export function getAnnouncementContent(data) {
  if (data && data.content && data.content.length > 10) {
    return data.content
  }
  return FALLBACK_MD
}

/**
 * 从公告 Markdown 里取滚动条摘要（老实现 page-home.js:167 逐行搬）。
 * 规则：跳过空行与 `---`；去掉 `#`/`**`/链接语法；长度 ≤8 且无标点的当章节标题跳掉；
 * 最多取 3 段，用 ` · ` 连接。
 */
export function extractMarqueeText(md) {
  var lines = (md || '').split('\n')
  var parts = []
  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i]
    if (!raw.trim() || raw.trim() === '---') continue
    var t = raw
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()
    if (!t) continue
    if (t.length <= 8 && !/[，。！？]/.test(t)) {
      if (parts.length === 0) parts.push(t)
      continue
    }
    parts.push(t)
    if (parts.length >= 3) break
  }
  if (parts.length === 0) return '欢迎来到易三千 · 点击查看公告详情'
  return parts.join(' · ')
}

/** 老实现 page-home.js:283 的极简 Markdown 渲染器，逐行搬，输出逐字一致 */
export function renderMarkdown(md) {
  var html = md
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 右对齐标记：行首 ○ 则该行右对齐
  html = html.replace(/^○\s?(.+)$/gm, '<div style="text-align:right">$1</div>')

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')

  html = html.replace(/`(.+?)`/g, '<code>$1</code>')

  html = html.replace(/^---$/gm, '<hr>')

  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  html = html.replace(/^- (.+)$/gm, '<li>$1</li>')

  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, function (m) {
    return '<ul>' + m + '</ul>'
  })

  var parts = html.split(/\n\n+/)
  html = parts
    .map(function (p) {
      p = p.trim()
      if (!p) return ''
      if (/^<(h[1-3]|ul|ol|li|hr|blockquote)/.test(p)) return p
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>'
    })
    .join('\n')

  return html
}

/**
 * 底部「已稳定运行」计时（老实现 page-home.js:82 的内联 IIFE）。
 * 返回老实现那个格式：`N天D NH H NM MS`.
 */
export var LAUNCH_TS = new Date('2026-06-06T00:00:00+08:00').getTime()

export function formatUptime(now, launch) {
  // ★ 这里不能写 `launch || LAUNCH_TS`：`launch === 0` 是「从 epoch 起算」的
  // 合法入参，`||` 会把它当成「没给」而换回 LAUNCH_TS（单元测试第一次跑就撞上了）。
  // 老实现没有这个形参，是写死在闭包里的，所以这个区别只影响可测性，不影响线上。
  var diff = Math.max(0, now - (launch == null ? LAUNCH_TS : launch))
  var d = Math.floor(diff / 86400000)
  var h = Math.floor((diff % 86400000) / 3600000)
  var m = Math.floor((diff % 3600000) / 60000)
  var s = Math.floor((diff % 60000) / 1000)
  return d + 'D ' + h + 'H ' + m + 'M ' + s + 'S'
}

/**
 * 24 小时冷却判定（老实现 page-home.js:208 `tryAutoShow`）。
 * 拆成纯函数是为了能把「刚登录必定弹」「冷却期内不弹」「冷却过期再弹」
 * 这三种情况直接写进 Vitest，不用起浏览器等 24 小时。
 */
export var COOLDOWN_MS = 24 * 60 * 60 * 1000

export function shouldAutoShow(opts) {
  var currentUser = opts.currentUser || null
  var lastKnownUser = opts.lastKnownUser || ''
  var lastShown = opts.lastShown || 0
  var now = opts.now
  var cooldown = opts.cooldown == null ? COOLDOWN_MS : opts.cooldown

  var isNewLogin = !!(currentUser && currentUser !== lastKnownUser)
  var storageKey = currentUser ? 'ann_login_shown' : 'ann_guest_shown'

  if (isNewLogin) {
    return { show: true, storageKey: storageKey, isNewLogin: true }
  }
  if (!lastShown || now - lastShown > cooldown) {
    return { show: true, storageKey: storageKey, isNewLogin: false }
  }
  return { show: false, storageKey: storageKey, isNewLogin: false }
}

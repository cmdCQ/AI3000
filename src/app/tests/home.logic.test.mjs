import { describe, expect, it } from 'vitest'
import {
  COOLDOWN_MS,
  FALLBACK_MD,
  LAUNCH_TS,
  extractMarqueeText,
  formatUptime,
  getAnnouncementContent,
  parseUserCookie,
  renderMarkdown,
  shouldAutoShow,
} from '../home/home.logic.js'

// 首页纯逻辑的单元测试。
//
// 期望值全部按**老实现**（`src/web/js/page-home.js`）的语义写，不是照抄我自己的
// 输出 —— 否则就是「用实现证明实现」。每条用例旁边标了老代码的行号。

describe('parseUserCookie', () => {
  // page-home.js:8 —— 正则 `(^| )sqw_username=([^;]+)`
  it('取普通值', () => {
    expect(parseUserCookie('a=1; sqw_username=13800138000; b=2')).toBe('13800138000')
    expect(parseUserCookie('sqw_username=abc')).toBe('abc')
  })

  it('URL 解码（手机号不会编码，但中文用户名会）', () => {
    expect(parseUserCookie('sqw_username=%E5%BC%A0%E4%B8%89')).toBe('张三')
  })

  it('没有这个 cookie 就返回 null（不是空串）', () => {
    expect(parseUserCookie('a=1; b=2')).toBe(null)
    expect(parseUserCookie('')).toBe(null)
    expect(parseUserCookie(undefined)).toBe(null)
  })

  it('值不能为空：`sqw_username=;` 不匹配 `[^;]+`', () => {
    expect(parseUserCookie('sqw_username=; x=1')).toBe(null)
  })

  it('前缀更长的同名 cookie 不会误命中', () => {
    // 正则要求 `(^| )` 紧贴名字，`xsqw_username` 前面是 `x`，不匹配
    expect(parseUserCookie('xsqw_username=nope')).toBe(null)
  })

  it('坏的百分号编码不抛异常（老实现在这里会抛）', () => {
    expect(parseUserCookie('sqw_username=%E4')).toBe('%E4')
  })
})

describe('getAnnouncementContent', () => {
  // page-home.js:159 —— 内容长度必须 > 10，否则当没取到
  it('够长就用后端内容', () => {
    expect(getAnnouncementContent({ content: '这是一段足够长的公告内容' })).toBe('这是一段足够长的公告内容')
  })

  it('10 个字符是边界（不大于 10 就兜底）', () => {
    expect(getAnnouncementContent({ content: '1234567890' })).toBe(FALLBACK_MD)
    expect(getAnnouncementContent({ content: '12345678901' })).toBe('12345678901')
  })

  it('缺字段、null、空对象都兜底', () => {
    expect(getAnnouncementContent({})).toBe(FALLBACK_MD)
    expect(getAnnouncementContent(null)).toBe(FALLBACK_MD)
    expect(getAnnouncementContent({ content: null })).toBe(FALLBACK_MD)
  })
})

describe('extractMarqueeText', () => {
  // page-home.js:167 —— 滚动条的文案是从正文提炼的
  it('从兜底公告里提出 3 段以内、用 · 连接', () => {
    const out = extractMarqueeText(FALLBACK_MD)
    expect(out).toContain('·')
    expect(out.split(' · ').length).toBeLessThanOrEqual(3)
    // 第一行是 `# 欢迎来到易三千 🎉`，去掉 # 后长度 > 8 且有内容，会被留作第一段
    expect(out.startsWith('欢迎来到易三千')).toBe(true)
  })

  it('去掉 markdown 标记：标题 # / 粗体 ** / 链接', () => {
    const out = extractMarqueeText('## 这是标题段落\n\n- **粗体内容** — 说明\n\n[链接文字](https://example.com/a) 后面的话')
    expect(out).not.toContain('#')
    expect(out).not.toContain('**')
    expect(out).not.toContain('](')
    expect(out).toContain('链接文字')
  })

  it('跳过空行与 --- 分隔线', () => {
    const out = extractMarqueeText('\n\n---\n\n正文第一段比较长\n\n---')
    expect(out).toBe('正文第一段比较长')
  })

  it('全空或只有分隔线时给兜底文案', () => {
    expect(extractMarqueeText('')).toBe('欢迎来到易三千 · 点击查看公告详情')
    expect(extractMarqueeText('---\n\n---')).toBe('欢迎来到易三千 · 点击查看公告详情')
    expect(extractMarqueeText(null)).toBe('欢迎来到易三千 · 点击查看公告详情')
  })

  it('短且无标点的行只在第一段位置保留一次（章节标题）', () => {
    const out = extractMarqueeText('命理\n\n这是一段有标点，也有内容的正文。\n\n术数\n\n另一段正文，也该被收集。')
    expect(out).toBe('命理 · 这是一段有标点，也有内容的正文。 · 另一段正文，也该被收集。')
  })
})

describe('renderMarkdown', () => {
  // page-home.js:283 —— 极简渲染器，期望值按它的正则顺序推出来
  it('标题', () => {
    expect(renderMarkdown('# 一级')).toBe('<h1>一级</h1>')
    expect(renderMarkdown('## 二级')).toBe('<h2>二级</h2>')
    expect(renderMarkdown('### 三级')).toBe('<h3>三级</h3>')
  })

  it('先转义 HTML，再当文本处理（XSS 面）', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('粗体与斜体', () => {
    expect(renderMarkdown('**粗**')).toBe('<p><strong>粗</strong></p>')
    expect(renderMarkdown('*斜*')).toBe('<p><em>斜</em></p>')
  })

  it('链接：新窗口打开', () => {
    expect(renderMarkdown('[文字](https://a.com/b)')).toBe('<p><a href="https://a.com/b" target="_blank">文字</a></p>')
  })

  it('行内代码', () => {
    expect(renderMarkdown('`code`')).toBe('<p><code>code</code></p>')
  })

  it('水平线', () => {
    expect(renderMarkdown('---')).toBe('<hr>')
  })

  it('引用', () => {
    expect(renderMarkdown('> 引用内容')).toBe('<blockquote>引用内容</blockquote>')
  })

  it('列表被包成 ul', () => {
    expect(renderMarkdown('- 甲\n- 乙')).toBe('<ul><li>甲</li>\n<li>乙</li></ul>')
  })

  it('○ 行右对齐（注意它仍会被包一层 p —— 老实现就是这样）', () => {
    expect(renderMarkdown('○ 右对齐')).toBe('<p><div style="text-align:right">右对齐</div></p>')
  })

  it('多段落之间用换行连接，段内单换行变 br', () => {
    expect(renderMarkdown('第一段第一行\n第一段第二行\n\n第二段')).toBe(
      '<p>第一段第一行<br>第一段第二行</p>\n<p>第二段</p>'
    )
  })

  it('空串与纯空白不产出内容', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown('   ')).toBe('')
  })
})

describe('formatUptime', () => {
  // page-home.js:82 —— `d + 'D ' + h + 'H ' + m + 'M ' + s + 'S'`
  it('零时长', () => {
    expect(formatUptime(0, 0)).toBe('0D 0H 0M 0S')
  })

  it('各进位都单独算（不累加、不四舍五入）', () => {
    // 1 天 + 1 小时 + 1 分 + 1 秒
    expect(formatUptime(86400000 + 3600000 + 60000 + 1000, 0)).toBe('1D 1H 1M 1S')
  })

  it('秒不进位成分钟（59 秒还是 0 分）', () => {
    expect(formatUptime(59000, 0)).toBe('0D 0H 0M 59S')
  })

  it('时间倒退时钳到 0（老实现 Math.max(0, …)）', () => {
    expect(formatUptime(1000, 5000)).toBe('0D 0H 0M 0S')
  })

  it('默认发射时间是 2026-06-06T00:00:00+08:00', () => {
    expect(LAUNCH_TS).toBe(Date.parse('2026-06-06T00:00:00+08:00'))
  })
})

describe('shouldAutoShow', () => {
  // page-home.js:208 tryAutoShow
  const now = 1_700_000_000_000

  it('刚登录必弹（即使一分钟前刚弹过）', () => {
    const r = shouldAutoShow({ currentUser: 'u1', lastKnownUser: 'u0', lastShown: now - 60_000, now })
    expect(r).toEqual({ show: true, storageKey: 'ann_login_shown', isNewLogin: true })
  })

  it('同一用户冷却期内不弹', () => {
    const r = shouldAutoShow({ currentUser: 'u1', lastKnownUser: 'u1', lastShown: now - 60_000, now })
    expect(r.show).toBe(false)
    expect(r.storageKey).toBe('ann_login_shown')
  })

  it('过了 24 小时再弹', () => {
    const r = shouldAutoShow({ currentUser: 'u1', lastKnownUser: 'u1', lastShown: now - COOLDOWN_MS - 1, now })
    expect(r.show).toBe(true)
  })

  it('正好 24 小时那一刻还不弹（严格大于才过期）', () => {
    const r = shouldAutoShow({ currentUser: 'u1', lastKnownUser: 'u1', lastShown: now - COOLDOWN_MS, now })
    expect(r.show).toBe(false)
  })

  it('游客与登录态分开计数（key 不同）', () => {
    expect(shouldAutoShow({ currentUser: null, lastShown: 0, now }).storageKey).toBe('ann_guest_shown')
    expect(shouldAutoShow({ currentUser: 'u1', lastKnownUser: 'u1', lastShown: now, now }).storageKey).toBe(
      'ann_login_shown'
    )
  })

  it('游客第一次访问要弹', () => {
    expect(shouldAutoShow({ currentUser: null, lastShown: 0, now }).show).toBe(true)
  })
})

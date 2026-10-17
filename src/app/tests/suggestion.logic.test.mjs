// `/suggestion/` 的单元判据。
//
// 这一页 e2e 已经点了 12 条，为什么还要单元测试：
//
//  1. **六行文案表**（`LABEL_TEXTS`）是 36 个手抄字符串，e2e 只逐维度点了一档（第 4 档）。
//     抄错一格（比如把 ai 的「准确」抄成 ui 的「舒适」）在 e2e 里只有碰到那一格才会红。
//     这里把整张表连形状一起钉死：6 个维度 × 6 档，第 0 档必须都是「请评分」。
//  2. `getCookie` 的语义（`(^| )` 切、`decodeURIComponent`、不命中回 `null`）是从
//     老 `page-suggestion.js:1` 逐字搬来的正则，值得单独钉。
//  3. `colorsOnEnter` / `colorsOnLeave` 是**有状态补丁**，不是纯函数式的"按分数重算"，
//     行为反直觉（见函数下方那段注释），单元测试是记录这个反直觉最省事的地方。

import { describe, expect, it } from 'vitest'
import {
  LABEL_TEXTS,
  RATING_KEYS,
  RATING_TITLES,
  STAR_ACTIVE_COLOR,
  buildSuggestionPayload,
  charCountLabel,
  colorsOnEnter,
  colorsOnLeave,
  getCookie,
  isActive,
  isSubmitBlocked,
  labelFor,
  starChar,
  submitErrorMessage,
} from '../suggestion/suggestion.logic.js'

describe('维度表', () => {
  it('六个键、顺序与老 HTML 行序一致', () => {
    expect(RATING_KEYS).toEqual(['overall', 'ui', 'feature', 'ai', 'responseSpeed', 'accuracy'])
  })

  it('每个键都有中文标题', () => {
    for (const k of RATING_KEYS) expect(RATING_TITLES[k]).toBeTruthy()
    expect(RATING_TITLES).toEqual({
      overall: '总体评价',
      ui: 'UI 界面舒适度',
      feature: '功能适用度',
      ai: 'AI 解析准确度',
      responseSpeed: '响应速度',
      accuracy: '解析内容丰富度',
    })
  })
})

describe('LABEL_TEXTS（老 page-suggestion.js:4-11 逐字）', () => {
  it('六个维度、每行 6 档、第 0 档都是「请评分」', () => {
    expect(Object.keys(LABEL_TEXTS).sort()).toEqual([...RATING_KEYS].sort())
    for (const k of RATING_KEYS) {
      expect(LABEL_TEXTS[k]).toHaveLength(6)
      expect(LABEL_TEXTS[k][0]).toBe('请评分')
    }
  })

  it('整张表逐字比对', () => {
    expect(LABEL_TEXTS).toEqual({
      overall: ['请评分', '很差', '较差', '一般', '满意', '非常满意'],
      ui: ['请评分', '很不舒适', '不太舒适', '一般', '舒适', '非常舒适'],
      feature: ['请评分', '完全不适用', '不太适用', '一般', '适用', '非常适用'],
      ai: ['请评分', '完全不准确', '不太准确', '一般', '准确', '非常准确'],
      responseSpeed: ['请评分', '非常慢', '较慢', '一般', '较快', '非常快'],
      accuracy: ['请评分', '很贫乏', '不够丰富', '一般', '丰富', '非常丰富'],
    })
  })

  it('六行的第 3 档全是「一般」（这是"看起来没问题"的陷阱）', () => {
    for (const k of RATING_KEYS) expect(LABEL_TEXTS[k][3]).toBe('一般')
  })

  it('六行的第 4 档两两不同（抄串行最容易在这档露出来）', () => {
    const fourth = RATING_KEYS.map((k) => LABEL_TEXTS[k][4])
    expect(new Set(fourth).size).toBe(6)
  })
})

describe('getCookie（老 :1 的正则）', () => {
  it('取到值并 decodeURIComponent', () => {
    expect(getCookie('sqw_token', 'sqw_token=abc123')).toBe('abc123')
    expect(getCookie('sqw_token', 'a=1; sqw_token=abc%2Fdef; b=2')).toBe('abc/def')
  })

  it('分号后、开头都能切到', () => {
    expect(getCookie('x', 'x=1; y=2')).toBe('1')
    expect(getCookie('y', 'x=1; y=2')).toBe('2')
  })

  it('★ 分隔符必须是「分号+空格」：浏览器就是这么排的，但裸分号切不出来', () => {
    // 老正则写的是 `(^| )`，锚定的是"行首 或 空格"，不是分号。
    // 真实 cookie 串是 `a=1; b=2`（带空格），所以线上没问题；
    // 这条断言只是把正则的真实语义记下来，免得以后有人以为它能吃裸分号。
    expect(getCookie('y', 'x=1;y=2')).toBeNull()
  })

  it('不命中返回 null（不是空串）—— 登录判断全靠这个', () => {
    expect(getCookie('sqw_token', 'a=1; b=2')).toBeNull()
    expect(getCookie('sqw_token', '')).toBeNull()
  })

  it('键名是子串时不会误命中（(^| ) 前缀锚定）', () => {
    expect(getCookie('token', 'sqw_token=zzz')).toBeNull()
  })
})

describe('星星渲染', () => {
  it('starChar：序号 <= 分数为实心', () => {
    expect([1, 2, 3, 4, 5].map((v) => starChar(v, 0))).toEqual(['☆', '☆', '☆', '☆', '☆'])
    expect([1, 2, 3, 4, 5].map((v) => starChar(v, 3))).toEqual(['★', '★', '★', '☆', '☆'])
    expect([1, 2, 3, 4, 5].map((v) => starChar(v, 5))).toEqual(['★', '★', '★', '★', '★'])
  })

  it('isActive 与 starChar 同步', () => {
    for (let score = 0; score <= 5; score++) {
      for (let v = 1; v <= 5; v++) {
        expect(isActive(v, score)).toBe(starChar(v, score) === '★')
      }
    }
  })

  it('labelFor：0 分是「请评分」，1-5 用表里的文案', () => {
    expect(labelFor('overall', 0)).toBe('请评分')
    expect(labelFor('overall', 5)).toBe('非常满意')
    expect(labelFor('responseSpeed', 1)).toBe('非常慢')
    expect(labelFor('accuracy', 4)).toBe('丰富')
  })

  it('labelFor：超出表的分数退回「N 星」（老 :36 的后半段）', () => {
    expect(labelFor('overall', 6)).toBe('6 星')
    expect(labelFor('nope', 2)).toBe('2 星')
  })
})

describe('悬停上色（有状态补丁，照搬老实现）', () => {
  it('未点分时悬停第 3 颗：1-3 上色，4-5 写空串', () => {
    expect(colorsOnEnter({}, 0, 3)).toEqual({
      1: STAR_ACTIVE_COLOR,
      2: STAR_ACTIVE_COLOR,
      3: STAR_ACTIVE_COLOR,
      4: '',
      5: '',
    })
  })

  it('★ 已点 2 星时悬停第 4 颗：1、2 一起留在高亮色（尽管它们已经是 active）', () => {
    // 老代码的 mouseenter 只改"非 active"的星，所以 1、2 是**上一次**悬停留下的。
    const before = { 1: STAR_ACTIVE_COLOR, 2: STAR_ACTIVE_COLOR }
    const after = colorsOnEnter(before, 2, 4)
    expect(after[1]).toBe(STAR_ACTIVE_COLOR)
    expect(after[2]).toBe(STAR_ACTIVE_COLOR)
    expect(after[3]).toBe(STAR_ACTIVE_COLOR)
    expect(after[4]).toBe(STAR_ACTIVE_COLOR)
    expect(after[5]).toBe('')
  })

  it('移开：只清非 active 的，active 的保持原色不动', () => {
    const hovered = { 1: STAR_ACTIVE_COLOR, 2: STAR_ACTIVE_COLOR, 3: STAR_ACTIVE_COLOR, 4: '', 5: '' }
    const left = colorsOnLeave(hovered, 2)
    expect(left[1]).toBe(STAR_ACTIVE_COLOR) // active，不动
    expect(left[2]).toBe(STAR_ACTIVE_COLOR) // active，不动
    expect(left[3]).toBe('') // 非 active，清掉
    expect(left[4]).toBe('')
    expect(left[5]).toBe('')
  })

  it('★★ 缺陷复现：点 4 颗再点回 1 颗，2/3/4 的色**没被清**（所以仍然亮着）', () => {
    // 1) 划过 1-4 点第 4 颗 —— 老页实测这四颗都拿到 inline var(--star-active)
    let colors = colorsOnEnter({}, 0, 4)
    // 2) click 不动颜色（这是复刻的关键：点击不触发任何清色）
    const score = 1
    // 3) 渲染只看颜色表：2/3/4 非 active，但颜色仍是高亮色
    expect(isActive(2, score)).toBe(false)
    expect(colors[2]).toBe(STAR_ACTIVE_COLOR)
    expect(colors[3]).toBe(STAR_ACTIVE_COLOR)
    expect(colors[4]).toBe(STAR_ACTIVE_COLOR)
    // 4) 只有鼠标移开才清得掉
    colors = colorsOnLeave(colors, score)
    expect(colors[2]).toBe('')
    expect(colors[3]).toBe('')
    expect(colors[4]).toBe('')
    expect(colors[1]).toBe(STAR_ACTIVE_COLOR) // 第 1 颗是 active，一直亮
  })
})

describe('字数与提交', () => {
  it('charCountLabel 数的是原始长度，不 trim（老 :57）', () => {
    expect(charCountLabel('')).toBe('0 / 4000')
    expect(charCountLabel('abc')).toBe('3 / 4000')
    expect(charCountLabel('  ab  ')).toBe('6 / 4000')
  })

  it('isSubmitBlocked：只有空/纯空白算拦下', () => {
    expect(isSubmitBlocked('')).toBe(true)
    expect(isSubmitBlocked('   ')).toBe(true)
    expect(isSubmitBlocked('\n\t ')).toBe(true)
    expect(isSubmitBlocked(' a ')).toBe(false)
  })

  it('buildSuggestionPayload：缺省补 0、正文 trim（老 :73-77）', () => {
    expect(buildSuggestionPayload({}, '  想说两句  ')).toEqual({
      overall: 0,
      ui: 0,
      feature: 0,
      ai: 0,
      responseSpeed: 0,
      accuracy: 0,
      content: '想说两句',
    })
  })

  it('buildSuggestionPayload：只给了两个维度时其余是 0', () => {
    const p = buildSuggestionPayload({ overall: 5, accuracy: 2 }, 'x')
    expect(p.overall).toBe(5)
    expect(p.accuracy).toBe(2)
    expect(p.ui).toBe(0)
    expect(p.feature).toBe(0)
    expect(p.ai).toBe(0)
    expect(p.responseSpeed).toBe(0)
  })

  it('submitErrorMessage 与老 :84 逐字一致', () => {
    expect(submitErrorMessage('服务暂时不可用')).toBe('提交失败: 服务暂时不可用，请稍后重试')
  })
})

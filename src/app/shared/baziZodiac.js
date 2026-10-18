// 生肖由服务端八字年柱的地支确定，禁止用公历年份猜测立春边界。
export const ZODIAC_EMOJI = ['🐀','🐂','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷']
export const ZODIAC_NAMES = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪']
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
export function zodiacEmojiFromBazi(bazi) {
  const yearPillar = typeof bazi === 'string' ? bazi.trim().split(/\s+/)[0] : ''
  const index = yearPillar?.length === 2 ? BRANCHES.indexOf(yearPillar[1]) : -1
  return index >= 0 ? ZODIAC_EMOJI[index] : '—'
}

'use strict';
/**
 * 八字解读 · **产品输出层**（2026-09-25 用户拍板的新输出规格）
 * ==========================================================================
 *
 * ## 为什么单独一层，而不直接改 `bazi_prompt.js`
 *
 * `bazi_prompt.js` 是 shushu 的**逐字移植**，由 `duipan/diff_bazi_prompt.py` 把守。
 * 那一层**零申报** —— 文件头明写「本层没有申报表、没有分桶：有差异就是实现不同」，
 * 收尾打印「✓ 零申报」，并且比对器**自己写死一份契约**、不从金标准读。
 * 也就是说：**在那边改一个字的模板文案，那一层就永久变红，而且这个层根本没有申报口子。**
 *
 * 那一层的价值在**算法**：`baziVars` 的 ctx 变量表、五段正文块的段名与段序、编码规则
 * （`GEN` 与 `diff` 两侧各写一份实现互为对照）。文案不是算法，是产品决定。
 * 故本模块的分工是：
 *   · 算法（怎么把盘面组装成变量）留在 `bazi_prompt.js`，**一字不改**，由层 15 继续把守；
 *   · 文案（组装出来的东西怎么讲给用户听）搬到本模块，由 `duipan/check_bazi_report.js` 把守。
 *
 * ⚠ **两条禁令**：
 *   ① 不许把这条线的文案抄回 `bazi_prompt.js`（会让层 15 变红，且白抄一份）；
 *   ② 不许把 `baziVars` 的逻辑在这里抄一遍 —— 直接 `require` 它（见 `baziReportVars`）。
 *      这个仓库已经因为「同一件事两份实现」漂移过一次（见 `renderPrompt` 的头注）。
 *
 * ## 输入侧的两个新数据块
 *
 * 规格里的「大运列表（起止年龄／干支／十神／吉凶）」与「未来 5–10 年流年」，
 * 后端**早就算好了**（`bazi_fortune.js::calculateDayun/calculateLiunian`），
 * 只是从来没人往提示词里放 —— `baziVars` 的 `大运` 只截前 6 步的 3 个字段、
 * 流年只放当前那一年。这两个字段由**端点层**补挂在 `chart` 上
 * （`auth-server.js` 里 `chart.dayun` / `chart.liunian` 那两行）：
 * 与 `chart.dayun` 已有的先例同一条理由 —— 端点层补挂**不动移植层**，层 15 喂的是
 * 基准输入（没有这两个键），故仍逐字全绿。
 *
 * ⚠ **已知缺陷，别让模型去编**：`liunian[*].shishen_zhi` 恒为空串
 *   （`bazi_fortune.js:500` 把**五行**当**天干**喂进了十神表 —— 照搬基准的缺陷）。
 *   所以【未来流年】那一块的表头**自己写明**「地支十神本系统不提供，不要自行推算」。
 *   要修它属另一条线（见 `duipan/bazi_prompt_draft.md` 第三节）。
 *
 * ## 长度与天花板（这条最要紧，改本模块前必读）
 *
 * `auth-server.js:278` 的 `LLM_MAX_TOKENS = 8000` 是**上游硬顶**（官方文档：默认 4096、
 * 最大 8192），**不能靠调大腾地方**；而 `deepseek-v4-flash` 的思考与正文**共用这一个预算**
 * （同文件 `:255-277` 有实测分布：`reasoning_effort:'low'` 下正文只出 2266～2698 字，
 * 3 次里 2 次 `finish_reason='length'` 被截断）。
 * 本规格要求「评分表 + 8 个模块」，篇幅远超那个分布 ⇒ **思考开着就必然截断**。
 * 故八字这条线在 `auth-server.js` 里**关掉思考**（`thinking:{type:'disabled'}`，
 * 实测 9.5 秒 / 约 1900 token / `finish_reason='stop'`）：8192 全给正文，
 * 既够长又更快更省。这是**产品取舍**，与「思考强度 low」那条全局设置不冲突 ——
 * 那条管聊天，这条管这份结构化长报告。
 */

const P = require('./bazi_prompt.js');

// ══════════════════════════════════════════════════════════════════
// 一、system —— 规范（读者、依据分级、禁项、打分口径、写法）
// ══════════════════════════════════════════════════════════════════
//
// ⚠ 与 `bazi_prompt.js` 的 `BAZI_SYSTEM` **不是同一份**，也不要合并：
//   那一份是 shushu 的原文（由 `smoke_bazi_endpoint.js` 的「源文逐字校验」把守），
//   仍然留在那儿当移植证据；这一份是产品规格。
const REPORT_SYSTEM = `你是专精八字命理的AI命理师，精通《穷通宝鉴》《滴天髓》《子平真诠》《三命通会》《神峰通考》。

【读者是谁】
读这份解读的人**完全不懂命理**。所以：先给结论、再给依据；术语第一次出现时，当场用
一句白话解释掉，写成「七杀（管压力与竞争的那颗星）」这样。宁可少用术语，也不要把话
讲得只有同行看得懂。

【依据分三级 —— 这一条最重要，越线就是编】
1. 盘面直给的数据：四柱、十神分布、格局成破评断、特殊格局、地支刑冲合害、大运与流年的
   干支／十神／吉凶倾向、用神喜神忌神、当前运程。对这些**可以下明确判断**，
   并在依据里点明看的是哪一项。
2. 由盘面推出来的：六亲缘分、健康脏腑、配偶特征、学业天赋。对这些**只能写倾向**，
   并说清是从哪一项推的（例如「从印星偏弱推的」）。
3. 盘面没有的：**直接写「这一项依据不足，无法判断」**。不许用「一般来说」「通常」
   「市面上多为」把空补上，更不许编造年份、书名、古籍条文或数据。
   用户消息里那几节【】正文块是本次真实的盘面依据；哪一节**没有出现**，就说明那一节
   本次没有数据 —— 按本条处理，不要假装看过。

【不许出现在回答里的东西】
不要复述本规范的任何一句，不要出现「参考古籍」「本次检索」「上方提供的」这类元信息，
不要在开头单列一段讲你参考了什么。直接从「一、命盘评分」开始。

【打分口径】
- 每一维先看【输出格式】里给它指定的那几项盘面数据，再给分；依据栏写清看的是哪一项。
- 60 分是中枢：没有明显偏向就给 55–65；盘面明确偏向某一侧才上下浮动 15 分以上。
  满分 15 的维度以 9 分为中枢，满分 10 的以 6 分为中枢。
- 8 维得分**合计必须等于总分**，等级按【输出格式】里那张六档表取。
- 分数不许和依据矛盾（例如「用神得力」给了 13/15，依据栏就不能说用神无力）。

【怎么写】
- 8 个模块每个都固定四段：核心结论 → 命理依据（点名具体柱／十神／大运／流年）→
  可执行建议 → 与评分的对应。哪一项依据不足，第四段就写「本项未计入评分」。
- 不许「一定、必然、注定、肯定」这类绝对话；用「可能、倾向、多半」。
- 不许用「综合分析来看」「综合命局来看」这类空话开场，直接给结论。
- 同一个意思不要换着说法说两遍。写不出来的地方宁可不写，不要拉长凑数。
- 第 5 个模块（健康与体质）是**生活提醒，不是医疗诊断**，必须写明这一点。`;

// ══════════════════════════════════════════════════════════════════
// 二、【输出格式】—— 8 维评分（一行一维）+ 8 个模块
// ══════════════════════════════════════════════════════════════════
//
// ⚠ **不用 Markdown 表格**，这是有意的：本站的 `renderMarkdown`
//   （`build/nginx/js/ui_common.js:27`）**明确不支持表格** —— 注释写着
//   「不支持表格 —— 模板产出的三段式用不到，加了反而会把 AI 偶然吐出的星号吃进标签里」。
//   直接写表格，用户看到的会是一行行竖线。而且 4 列表格在 390px 手机上也太挤。
//   故改成「一行一维」的列表：同样可扫读，现有渲染器直接就能渲染。
//   ⚠ 要改成真表格，得先给渲染器加表格支持（它被五个页面共用，改动面比这里大），
//     并且要同步改 `duipan/check_bazi_report.js` 里那条「不许出现表格」的断言。
const REPORT_FORMAT = `

【输出格式】严格按下面两大部分组织，用 Markdown 二级标题。

## 一、命盘评分

直接给下面这 8 行，不要开场白、不要复述问题。**每行一维，顺序与分值都不许改**；
「依据」是提示你看哪几项盘面数据，控制在 30 字以内：

- **五行平衡与流通** 得分/15 —— 依据：（看五行分布是否流通、有无偏枯）
- **日主强弱与用神得力** 得分/15 —— 依据：（看身强弱、月令、得地、用神喜神忌神）
- **格局层次与清纯度** 得分/15 —— 依据：（看格局成破评断、特殊格局）
- **十神配置与性格才能** 得分/10 —— 依据：（看十神分布）
- **事业财运潜力** 得分/15 —— 依据：（看财星官星与格局、大运是否扶起）
- **婚姻感情倾向** 得分/10 —— 依据：（看配偶宫与财官星的受制情况）
- **健康体质倾向** 得分/10 —— 依据：（看五行偏枯与冲克）
- **大运流年配合** 得分/10 —— 依据：（看下面【大运一览】的吉凶分布与当前所行）

⚠ **不要用 Markdown 表格**（本站渲染器不支持，手机上也太挤），就用上面这种一行一维。

8 行之后另起一段，写这一行：
**综合命盘评分：__/100　等级：__　一句话总评：__**

等级只许从这六档里取：上上（90–100）、上（80–89）、中上（70–79）、
中（60–69）、中下（50–59）、偏弱（50 以下）。

## 二、综合内容

按顺序输出 8 个小节，每个都用三级标题，**8 个都要有、顺序不许换**。
标题就是下面这 8 行，**照抄、不要改字、也不要把下面的内容要求抄进标题**：

### 1. 性格与天赋
### 2. 事业与学业
### 3. 财运与财富模式
### 4. 婚姻与感情
### 5. 健康与体质
### 6. 六亲与家庭
### 7. 大运流年
### 8. 开运与调整建议

每个小节要写到的内容（**这些是要求，不是标题**）：
  1 性格与天赋：核心性格 / 优势天赋 / 容易出现的盲点 / 与评分中「十神配置与性格才能」的对应
  2 事业与学业：适合方向 / 不适合方向 / 职场模式、创业倾向、贵人特征 / 与「事业财运潜力」的对应
  3 财运与财富模式：正财偏财倾向 / 聚财方式 / 风险点与理财建议 / 与「事业财运潜力」的对应
  4 婚姻与感情：感情模式 / 配偶倾向 / 相处建议 / 需注意的年份或大运 / 与「婚姻感情倾向」的对应
  5 健康与体质：易关注的五行脏腑 / 情绪与作息建议 / 写明这不是医疗诊断 / 与「健康体质倾向」的对应
  6 六亲与家庭：父母、兄弟、子女缘分的倾向 / 家庭关系建议 / 与「十神配置、格局层次」的对应
  7 大运流年：起运时间 / 大运列表 / 当前大运分析 / 未来 5–10 年流年简析 / 重点机遇年与需谨慎年 / 与「大运流年配合」的对应
  8 开运与调整建议：颜色、方位、行业、习惯、心态等传统建议 / 可执行的后天改善方案 / 与「五行平衡与流通、日主强弱与用神得力」的对应

⚠ 第 7 节的干支与吉凶，**必须照用户消息里【大运一览】【未来流年】两节给出的写**，
不许自己另算年份或干支；那两节没给出的东西，就按 system 里第 3 条处理。`;

/**
 * 追问用的 system（首次解读那一份**不适用**于追问）。
 *
 * ⚠ 有这一份是**必须的**：`auth-server.js` 里追问与首次解读**共用**一个
 *   `systemPrompt` 位置。若追问也吃上面那份规格，用户问一句「那 2027 年呢」，
 *   模型会**重出一整套评分表和 8 个模块** —— 那是明显的坏。
 *   原来的代码是两条路都用 shushu 的三段式 system（`baziSystem()`），
 *   故改成新规格时，追问这条**必须单独给一份**，否则就是这次改动引入的回归。
 *
 * 本模块**不对拍**（shushu 没有追问这个产品动作，同 `bazi_prompt.js` 的
 * `DEFAULT_BAZI_FOLLOWUP` 那条注），守门靠 `duipan/check_bazi_report.js`。
 */
const REPORT_FOLLOWUP_SYSTEM = `你在接着上面那份解读回答用户的追问。

- **只答这一问**：不要再输出「命盘评分」，也不要重来一遍那 8 个模块。
- 与前文同一种语气：先给结论、再给依据；术语当场用白话解释掉。
- 依据不足就直说「这一点盘面看不出来」，不要拿「一般来说」凑。
- 不许「一定、必然、注定、肯定」这类绝对话。
- 没有新东西就答短一点，别为了凑长度重复上文已经说过的话。`;

// ══════════════════════════════════════════════════════════════════
// 三、两个新数据块的格式化（纯函数，好测）
// ══════════════════════════════════════════════════════════════════
//
// 约定与五段正文块一致（`bazi_prompt.js` 那几段）：**非空时自带前导两个换行，
// 空时返回空串**（空串 = 不出现，不是留个空行）。模板里它们紧挨着排，别在中间加空行。

/** 取值兜底：`chart.dayun` 可能是 undefined（端点没挂上时）。 */
function asArray(v) { return Array.isArray(v) ? v : []; }

/**
 * 去掉**一模一样的重复项**，保持原顺序。
 *
 * 为什么需要：`calculateDayun` 给的 `warnings` 里**同一句话会出现两遍**
 * （实测首步：`["大运甲（木）克日主戊，运中压力较大","大运甲（木）克日主戊，运中压力较大","注意：大运支子冲时支午"]`
 * —— 第 1、2 项逐字相同）。那是**基准自带的**行为，属「照搬」范畴，
 * `bazi_fortune.js` 一个字都不动（层 9 对拍比的就是它那份数据）。
 * 但**喂给 AI 的提示词**没必要把同一句说两遍：白费 token，还容易让模型
 * 把这条警告的分量看得比别的重。故只在**本层**（讲给用户听的地方）清一遍。
 * ⚠ 只删**完全相等**的项，不做任何近似合并 —— 措辞不同就是不同的事，不许自作主张归并。
 */
function dedupWarnings(ws) {
  const seen = Object.create(null);
  const out = [];
  for (const w of ws) {
    const k = String(w);
    if (!seen[k]) { seen[k] = 1; out.push(w); }
  }
  return out;
}

/**
 * 【大运一览】—— 全部大运，一行一步。
 *
 * 字段来自 `bazi_fortune.js::calculateDayun`（`:448-457`）：
 *   `index` `tiangan` `dizhi` `start_age` `end_age` `start_year` `end_year`
 *   `quality`（吉凶倾向）`dm_shishen`（**天干**十神）`warnings` `auspicious`
 *
 * ⚠ 年龄用**原值**（`pyRound(...,1)` 的 6.3 这种小数形态），不四舍五入：
 *   这是盘面事实，为了好看去改它就是改数据。
 * ⚠ `warnings` 里的每一条**自带前缀**（`analyzeDayunInteractions` 里是
 *   「⚠ 重要」／「注意」，`analyzeLiunianTaisu` 里是「⚠ 」／「太岁冲…」），
 *   所以这里**只加括号、不再加自己的「注意：」** —— 加了就会出现
 *   「注意：注意：大运支子冲年支午」这种双层前缀（已实测到）。
 *   也**不要去重写原文**：那些重复前缀是 shushu 自带的输出冗余，
 *   `bazi_fortune.js:237` 的注写明「属于要照搬的行为」。
 */
function dayunText(dayun, currentYear) {
  const arr = asArray(dayun);
  if (!arr.length) return '';
  const lines = arr.map((d) => {
    const gz = String(d.tiangan == null ? '' : d.tiangan) + String(d.dizhi == null ? '' : d.dizhi);
    const span = `${d.start_age}–${d.end_age} 岁 / ${d.start_year}–${d.end_year} 年`;
    const ss = d.dm_shishen ? ` · 天干十神：${d.dm_shishen}` : '';
    const q = d.quality ? ` · 吉凶：${d.quality}` : '';
    const ws = asArray(d.warnings);
    const w = ws.length ? `（${dedupWarnings(ws).join('；')}）` : '';
    const cur = (currentYear && currentYear >= d.start_year && currentYear < d.end_year)
      ? '　← 当前所在' : '';
    return `${d.index}. ${gz}（${span}）${ss}${q}${w}${cur}`;
  });
  return '\n\n【大运一览】共 ' + arr.length + ' 步，每步 10 年。'
    + '「吉凶」是这一步的总体倾向；括号里是这一步里冲克或合助的提示。\n'
    + lines.join('\n');
}

/**
 * 【未来流年】—— 从今年起 10 年，一行一年。
 *
 * 字段来自 `bazi_fortune.js::calculateLiunian`（`:494-506`）：
 *   `year` `tiangan` `dizhi` `age` `shishen_gan` `quality` `summary` `warnings` `tags`
 *
 * ⚠⚠ **`shishen_zhi` 恒为空串**（同文件 `:500` 拿五行当地支查表 —— 照搬基准的缺陷）。
 *   故本块表头**自己写明**「地支十神不提供」，把这个缺口挡在数据层，
 *   而不是指望模型不去编（写在提示词里的禁令挡不住「缺一个字段」这种诱惑）。
 */
function liunianText(liunian, currentYear) {
  const arr = asArray(liunian);
  if (!arr.length) return '';
  const lines = arr.map((l) => {
    const gz = String(l.tiangan == null ? '' : l.tiangan) + String(l.dizhi == null ? '' : l.dizhi);
    const ss = l.shishen_gan ? ` · 天干十神：${l.shishen_gan}` : '';
    const q = l.quality ? ` · 吉凶：${l.quality}` : '';
    const ws = asArray(l.warnings);
    const w = ws.length ? `（${ws.join('；')}）` : '';
    const t = asArray(l.tags).length ? ` · ${l.tags.join('、')}` : '';
    const sm = l.summary ? ` · ${l.summary}` : '';
    return `${l.year} 年 ${gz}（${l.age} 岁）${ss}${q}${w}${t}${sm}`;
  });
  return '\n\n【未来流年】从 ' + arr[0].year + ' 起 ' + arr.length + ' 年，一行一年。'
    + '（地支十神本系统不提供，不要自行推算。）\n'
    + lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════
// 四、用户消息模板
// ══════════════════════════════════════════════════════════════════
//
// 结构与 `DEFAULT_BAZI_PROMPT`（移植层那一份）**同形**，只多了两处：
//   · `{{dayunText}}{{liunianText}}` 接在 `{{combosText}}` 之后（新增的两块数据）；
//   · 末尾那句「请按步骤深度分析：①…⑥…最后必须有【结论】段落」**删掉了** ——
//     它与 shushu 的 `BAZI_SYSTEM` 绑在一起描述三段式，而本线由 REPORT_SYSTEM
//     管输出形态。留着它就会和规格打架：**这正是「输出不统一」的一条根因。**
//
// ⚠ 五段正文块**紧挨着写、中间不能加空行**：它们各自自带前导空行、为空时整段不出现。
//   `{{questionLine}}` 同理（非空时自带前导换行），所以它前面也不能加空行。
const DEFAULT_BAZI_REPORT_PROMPT = `八字命盘（{{tab}}）
{{vars}}{{overviewText}}{{classicalText}}{{relationsText}}{{specialPatternsText}}{{combosText}}{{dayunText}}{{liunianText}}{{questionLine}}

请针对「{{tab}}」重点展开，按 system 里的规范输出「一、命盘评分」与「二、综合内容」两部分。`;

/**
 * 变量表 = 移植层的 `baziVars` 原样 + 本层新增三个键。
 *
 * ⚠ **不复制 `baziVars` 的逻辑**：ctx 的每个键、五段正文的段序与编码都在那一份里，
 *   由层 15 逐字对拍。这里只做加法 —— 一旦这里出现「重算某个 ctx 字段」，
 *   就等于在移植层之外又养了一份实现，迟早漂移。
 */
function baziReportVars(chart, opts) {
  const o = opts || {};
  const v = P.baziVars(chart, o);
  const chartObj = chart || {};
  const currentYear = o.currentYear || new Date().getFullYear();
  return Object.assign({}, v, {
    dayunText: dayunText(chartObj.dayun, currentYear),
    liunianText: liunianText(chartObj.liunian, currentYear),
    // 提问为空时整行不出现 —— 不用 `{{question}}`（那会在空时留下一句
    // 「本次求测的问题：」的半句话）。与 `yongshenLine` 是同一个套路。
    questionLine: o.question ? '\n\n本次求测的问题：' + o.question : '',
  });
}

/** 首次解读的用户消息。模板替换走移植层那一份 `renderPrompt`（全站唯一一份实现）。 */
function baziReportPrompt(chart, opts) {
  return P.renderPrompt(DEFAULT_BAZI_REPORT_PROMPT, baziReportVars(chart, opts));
}

/** 首次解读的 system（规范 + 输出格式，两段各带自己的前导换行）。 */
function baziReportSystem() { return REPORT_SYSTEM + REPORT_FORMAT; }

/** 追问的 system（**不要**用 `baziReportSystem()`，见 `REPORT_FOLLOWUP_SYSTEM` 的注）。 */
function baziReportFollowUpSystem() { return REPORT_FOLLOWUP_SYSTEM; }

module.exports = {
  REPORT_SYSTEM, REPORT_FORMAT, REPORT_FOLLOWUP_SYSTEM,
  DEFAULT_BAZI_REPORT_PROMPT,
  dayunText, liunianText, baziReportVars, baziReportPrompt,
  baziReportSystem, baziReportFollowUpSystem,
};

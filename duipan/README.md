# 对拍 harness（shushu ←→ ai3000 新 JS 排盘）

**目的**：把 shushu 的 Python 断卦层移植到 ai3000 的 Node 后端时，逐层证明
「JS 实现忠实于 shushu 基准」。对拍**不能证明基准对**——基准侧由
`tools/verify_*.py` 独立校验（纳甲按方向规则重推、八宫按变卦规则重推、
旬空按旬覆支重推、旺衰按四时规则重推）。

**方法**：每移植一层，立刻 64 卦（或全样例）穷举对拍，逐字段比。不等全部写完再验。

## 铁律

1. **零归一**。两侧字段名/取值必须逐字相同。出现命名差异就**改实现去对齐基准**，
   不许在 harness 里加映射把差异藏掉。申报偏差只在确实无法对齐时使用，
   且必须在 `allow.json` 里写明理由，diff 仍会打印实际值。
2. **身份用上下卦号，不用卦名**。shushu 存文王卦序单名（乾/屯/丰），
   ai3000 存上下卦全名（乾为天/水雷屯/雷火丰），按名匹配会引入拼写依赖。
3. **对拍样例要能复用**。每组样例同时是将来回归的 fixture。

## 文件

| 文件 | 作用 |
|---|---|
| `gen_golden_*.py` | 从 shushu 导出金标准 JSON |
| `run_js_*.js` | 用 ai3000 `build/backend/paipan/*.js` 产出同形 JSON |
| `diff.py` | 通用深层 JSON 比对，按字段聚合，`--allow` 申报偏差，`--case-keys` 折样例 id |
| `allow_yongshen_common.py` | 层 6a/6b **共用**的申报判据（见下「申报偏差的判据」） |
| `coverage_yongshen.py` | 层 6 的**覆盖度断言**：证明全绿不是空绿（分支真被跑到 + 申报集≡金标准空值集） |
| `verify_format_chart.js` | **shushu 侧没有对拍物**的那一层：ai3000 独有的 `formatChart` 文本，用「旧版 vs 新版」归类校验收紧 |

### 申报偏差的判据（层 6）

申报最怕「按跑出来的差异反向拟合白名单」——那样白名单会随 bug 一起漂移，
看着全绿其实什么都没验。所以 `allow_yongshen_common.py` 的判据**独立于实跑差异**，
只由 shushu 自己的取法推出：**shushu 按它的算法注定取不到用神五行**才算申报。

shushu `analyze_liuyao_deep_relations` 取用神五行只有一条路——在**已现身**的爻里
反查 `liu_qin`。故取不到只有两种：

| 情形 | 覆盖层 | 理由（`allow_*.json` 里逐条写明） |
|---|---|---|
| 用神是**位置名**（世爻/应爻） | 6b 为主 | shushu 只按六亲名找爻，`yong_yuan_ji_chou`/`key_lines`/`summary` 三块恒空 |
| 用神六亲**不上卦** | 6a/6b 都有 | 只在已现身的爻里反查，取不到 |

ai3000 侧两条都补上了（`paipan/yongshen.js::resolveYongShen`）：位置名解析成该爻五行；
不上卦则由「宫五行反读六亲」定五行（六亲↔五行在固定宫下是一一对应，
即 `getLiuQin` 那张表倒读，与伏神五行同源）。
**其余情形（用神在卦中显象）shushu 能取到，故一律不许申报**——出现差异就是 bug。
补全后并非「自造取值」：用神在卦中显象时两侧逐字节相同（层 6b 256 例、层 6a 550 例，
见下）。

> **申报按路径前缀生效**（`diff.py::declared`，切在 `.` 或 `[` 处）：申报
> `例.summary` 同时盖住 `例.summary[0]`。这不是便利而是必需——列表一处加长会让
> 后面每一项都换下标，逐下标申报等于改一次内容就重刷一遍白名单。
> 但 `例.summaryX` **不**被盖住（前缀必须切在分隔处），否则 `例.a` 会顺手盖掉
> `例.ab`，白名单就宽到没意义了。此处有自测用例。

## 用法

```sh
PY=/home/cqsomt/Projects/shushu/.venv/bin/python
cd /home/cqsomt/Projects/ai3000/duipan

$PY gen_golden_zhuang_gua.py && node run_js_zhuang_gua.js
$PY diff.py golden_zhuang_gua.json js_zhuang_gua.json --case-keys

# 动态装卦层 + 卦体关系层 + 用神层 6a（共用 golden_dynamic.json；
# 金标准约 65 秒，JS 侧约 0.3 秒。gen 会**顺带重写** allow_dynamic.json）
$PY gen_golden_dynamic.py && node run_js_dynamic.js
$PY diff.py golden_dynamic.json js_dynamic.json --allow allow_dynamic.json --case-keys

# 历法层（约 5 秒；gen 会**顺带重写** allow_calendar.json）
$PY gen_golden_calendar.py && node run_js_calendar.js
$PY diff.py golden_calendar.json js_calendar.json --allow allow_calendar.json --case-keys

# 用神层 6b：事项/性别/代占 覆盖（448 例；gen 会**顺带重写** allow_yongshen.json）
$PY gen_golden_yongshen.py && node run_js_yongshen.js
$PY diff.py golden_yongshen.json js_yongshen.json --allow allow_yongshen.json --case-keys

# 用神层 6c：事项取定表（纯函数，不经 divine 管线，无申报）
$PY gen_golden_topics.py && node run_js_topics.js
$PY diff.py golden_topics.json js_topics.json --case-keys

# 层 6 覆盖度断言（证明全绿不是空绿；读上面产出的 json 与 allow）
$PY coverage_yongshen.py

# formatChart 文本层（ai3000 独有；需先备好旧版，见下「层 5」）
mkdir -p /tmp/oldliuyao
git -C .. show 3b2d04c:build/backend/paipan/liuyao.js > /tmp/oldliuyao/liuyao_old.js
ln -sf "$PWD/../build/backend/paipan/constants.js" /tmp/oldliuyao/constants.js
ln -sf "$PWD/../build/backend/paipan/relations.js"  /tmp/oldliuyao/relations.js
node verify_format_chart.js
```

> 层 5 的旧版**不能取 `HEAD`**：`baacf62` 就是那次重构本身，故 HEAD 已是新版。
> 固定的 `3b2d04c` 是重构前最后一版（硬编码哈希，不随 HEAD 移动）。
> 旧文件 `require('./constants')`，故同目录得有符号链接；缺谁补谁。
>
> `--case-keys`：顶层键是样例 id（本 harness 的 `golden_*.json` 都是这个形状）
> 时，聚合路径里的样例 id 折成 `<例>`。不加则逐例一行，几千行没信息量。
> 这是显式开关而非隐式猜测——若顶层键本身就是字段名，猜错会把字段名抹掉。

## 已完成的对拍层

### 1. 静态装卦层（`golden_zhuang_gua.json`）— ✅ 通过

shushu `core/liuyao/zhuang_gua.py::build_zhuang_gua`（不依赖日辰月建）
vs ai3000 `paipan/liuyao.js::buildChart`。

**64 卦穷举，3584 个叶子值，0 差异，0 申报偏差。**
覆盖：纳甲地支、五行、六亲、世应、宫名、宫五行、宫位序、卦型、
世爻位、应爻位、六爻爻象、卦身（含世爻阴阳）、爻名、
以及 64 个卦名（全名由「象前缀 + 单名」独立构造比对，单名反推自 `HEX64_NAME`）。

对拍过程中发现并修掉的一处不一致：`constants.js` 的 `generation` 原用
「六世/一世/游魂/归魂」，与 shushu 的「八纯卦/一世卦/游魂卦/归魂卦」不同名。
因只有一个消费方（`liuyao.js:272` 的 prompt 文本），已对齐基准，
并新增 `PALACE_POS_TYPE` / `PALACE_POS_OF` / `palacePosition` 消除序号换算。

### 2. 动态装卦层（`golden_dynamic.json`）— ✅ 通过

shushu 真实 `POST /api/v1/liuyao/divine` 管线 vs `paipan/liuyao.js::buildChart`。

**69016 个叶子值，0 差异，0 申报偏差**（当时 568 例）。
后续为覆盖层 4 的动静分支，样例集扩到 **720 例**；同一份
`golden_dynamic.json` 同时承载层 2 与层 4 的字段，故层 2 的字段现在也在
720 例上被验（全量 174262 值 0 差异，见下「层 4」）。
覆盖：纳甲天干与干支、五行、六亲、六神、旬空、逐爻旺衰、
世应、变爻（干/支/干支/六亲）、卦身、卦身在卦中、宫名/宫五行/宫位序/宫卦、
`hex_type`、月支日干日支。JS 侧另**自行推导变卦**（`changedLines` + `linesToTrigrams`），
故变卦上下卦与变卦名也在被验之列。

> 四柱由金标准原样传入，本层不验历法——历法层另拍，这样失败能定位到层。

对拍过程发现并补上的一处**真缺口**：`buildChart` 原先只产地支，**没有纳甲天干**，
而 shushu 每爻都带 `stem` / `ganzhi`，且**变爻之干取自变卦**（非本卦）。
已新增 `constants.js NAJIA_GAN`（乾纳甲壬、坤纳乙癸，余六卦内外同干）
并在 `buildChart` 产出 `tiangan`/`ganzhi`（本爻与变爻各一套）。

另有两处**命名不一致**，均按基准对齐、无算法差异：

| 项 | shushu | ai3000 原 | 处置 |
|---|---|---|---|
| 六神用字 | 腾蛇 | 螣蛇 | 改为腾蛇（同神异体字，随基准以免两处写法） |
| `hex_type` 宫位名 | 一变卦…五变卦 | 八纯卦/一世卦… | 新增 `PALACE_POS_NAME` 照基准取值 |

⚠ **`hex_type` 那处是 shushu 自身的不一致，已列为待拍板**：
同一个「宫位序 → 卦型名」8 值映射它在 `zhuang_gua.py:38` 写成
`一世卦/二世卦/…`，在 `divination.py:275` 又写成 `一变卦/二变卦/…`。
两处都无测试、无前端依赖。经典名为「一世卦」（《京房易传》），
建议统一为经典名并删掉重复表——但那要动 shushu 的 API 输出，
故先照基准对齐、待用户点头。

### 3. 历法层（`golden_calendar.json`）— ✅ 通过（含 1 处已拍板偏离）

shushu `core/calendar/current_moment.py::current_sizhu`（底层 lunar_python）
vs ai3000 新增 `paipan/ganzhi.js`（底层 `lunar-javascript`，**后端既有依赖，零新增**）。

样例 5830 条：2025–2026 每日 7 个时点（00/01/06/12/18/22/23 时）
＋ 全部节气的 ±2 小时、10 分钟一档（抓换月那一分钟）。

**69960 个叶子值，未申报差异 0，申报 1924。**

申报的 1924 处**全部**是**晚子时（23:00–23:59）日柱进位**这一条已拍板偏离的
派生结果：771 例 × (`day_gz` + `day_gan`) + 其中 382 例的 `day_gan_wuxing`。
（日干进位一位，五行只在半数情形下跟着变——甲乙同木、丙丁同火…，
故 382 而非 771。`day_gan_wuxing` 首轮**漏申报**，正是它造成了初跑的
382 处「未申报差异」；查证后确认 382 例的日干**无一例外**都不同，纯派生，遂补申报。）

申报项自身的取值分布也是独立佐证——成因只有一个，没有第二种混进来：

- `day_gan` 差异恰 **10 种**＝十天干各进一位（癸→甲、甲→乙、庚→辛…）
- `day_gz` 差异全是六十甲子里的**相邻**干支（戊寅→己卯、甲申→乙酉、癸亥→甲子）
- `day_gan_wuxing` 只出现**换了五行**的 5 种，甲乙同木那类不出现

> **为什么这条偏离算「事实」而不算派别偏好**：实测 2026-05-10 23:00，同库同法，
> shushu 给 日=甲申 而 时=丙子；而丙子只能由**乙日**推出（乙庚丙作初）——
> 即 `getTimeInGanZhi()` 内部本来就基于**已进位**的日干。
> 故 shushu 的日柱与时柱在晚子时这一小时里**自相矛盾**。
> 改用 `getDayInGanZhiExact()` 后日柱与时柱同源自洽，矛盾消失。
> （用户 2026-09-24 拍板；`ganzhi.js` 头注已写明**不得**混用 `getDayInGanZhi()`。）

覆盖：年柱（立春换年）、月柱（节气换月）、日柱、时柱、时支、时辰名、
时支五行、日干、日干五行、当前统辖节气、月令五行。

### 4. 卦体关系层（`golden_dynamic.json` 的层 4 字段）— ✅ 通过

shushu `divine` 响应里**用神无关**的那一半断卦结果
vs 新增 `paipan/relations.js`（六个纯函数，逐字移植）：

| 输出字段 | shushu 源 |
|---|---|
| `dong_jing_analysis` | `advanced_features.py:196` 独发/独静/多发/全动 |
| `hua_he_chong` | `advanced_features.py:281` 化合/化冲/化进退 |
| `sanhe_sanhui` | `najia.py:642` 三合局/三会方/半三合 |
| `deep_relations.line_details` | `relations.py:247` 逐爻十二长生 + 月破日破 + 合力 |
| `deep_relations.changing_relations` | `relations.py:180` 回头生克/化同/化泄/化克他 + 进退神 |

**720 例，174262 个叶子值，0 差异，0 申报偏差。**
（层 2 的 568 例扩到 720：补 4 动/5 动组合与全 64 卦 × 相邻动爻对，
原因见下「分支覆盖」。）

> `deep_relations` 只取了这两块：其余键（`yong_yuan_ji_chou` / `key_lines` /
> `summary`）依赖用神，属下一层。这是**分层取子集**，不是归一——被取的两块逐字比。

**分支覆盖**（首跑就全绿，但必须确认每条分支真被跑到，否则全绿等于没验）：

| 分支 | 覆盖 |
|---|---|
| `dong_jing_analysis.type` | 全静 384 / 独发 128 / 多发2 160 / 多发3 16 / 多发4 8 / **独静 16** / 全动 8 |
| 独静 `static_line` | 1 与 6 两端各命中 |
| `hua_he_chong` 四型 | 化合 46 / 化冲 74 / 化进神 31 / 化退神 29 |
| `sanhe_sanhui` | sanhe 560 条（重复命中行为亦被跑到）/ sanhui / ban_sanhe 均有 |
| `changing_relations` 五种关系 | 回头生 59 / 回头克 64 / 化同 56 / 化泄 52 / 化克他 57 |
| 十二长生 | status **12/12 全覆盖**，`overall` 五档全中，月破日破各 277 |

> 首版 568 例里 **「独静卦」（5 爻动）0 例**——那段 `static_line` 计算与其 desc
> 从未被验。补入 4/5 动组合后才覆盖，故样例集扩到 720。
> 另补全 64 卦 × 相邻动爻对，让化冲从 6 处升到 74 处。

#### 结构性事实（穷举证明，非抽样观察）

**「化冲」只可能是 亥↔巳 或 卯↔酉，且只发生在同一半卦内第 2、3 爻动时**
（绝对爻位 2、3 或 5、6）。

穷举全部 192 个 (半卦, 该半三爻翻转掩码, 爻位) 组合：恰好 8 个构成化冲，
其半内动爻组合**只有 (2,3) 一种**（半内可能的动爻组合共 7 种：`[1] [2] [3] [1,2] [1,3] [2,3] [1,2,3]`）。

推论：**子午 / 丑未 / 寅申 / 辰戌 的化冲在纳甲装卦下永不可达**；
单动爻亦不可能化冲（半内组合 (2,3) 至少两爻）。验化冲时若只喂单动爻，
会得到「全绿」但实际一个分支都没跑到。

#### 两处「查了调用点才免掉的假 bug」（记下来免得下次重犯）

1. `analyze_hua_he_chong` 内部读 `y.get("zhi")`/`changed_zhi`，而响应里的爻带
   `branch`/`changed_branch` —— 看似取不到值恒返回 `[]`。**实际调用点
   `interpreter.py:1047-1049` 已把 `branch`→`zhi` 映射过去**，两个探针样例返回
   `[]` 是正确结果（丑→卯 既非六合非六冲非进退）。
2. `analyze_liuyao_deep_relations` 用**全表下标**取 `changed_yaos[i]`，
   而调用点 `interpreter.py:965-971` 建的是「有变支才收」的稀疏表 —— 看似
   动爻非前缀时配对全错、`changing_relations` 静默丢数据。**第 971 行用本爻支
   把非动爻补齐成 6 条**，索引是对齐的。六种动爻组合实跑配对全对。

两处都是 `grep -A 20` 截断了后续行导致的误读。**结论：报 shushu 的 bug 前必须实跑。**

#### 发现但**不可达**的潜伏不一致（**shushu 侧**，已定不动）

- `advanced_features._is_jin_shen`（土进神含 `辰→未`、`戌→丑`）与
  `relations.DIZHI_PROGRESS_GROUPS`（不含）**两张表不同，但在所有可达对上一致**——
  差异全落在 `辰→未 / 戌→丑 / 未→辰 / 丑→戌`，而这四对结构上取不到。
  `relations.js` 照 shushu **各留各的表**，未擅自统一。
  用户 2026-09-24 定：**shushu 不改**，故这处双表**永久保留**，不再列待办。
  （ai3000 侧原先还有第三份表 —— `liuyao.js` 的 `JIN_SHEN`/`TUI_SHEN` ——
  已于同日删除、收敛到 `relations.js` 一张表，见「层 5」。）
- `najia.analyze_hua_qi` 是**死代码**（仅被测试引用，无生产调用点），
  其四库土进神表取向与上两者又相反；因无调用点故不可达，未移植。
- 关联发现：`tests/test_liuyao_pro_audit.py:356` 用 `inspect.getsource`
  断言上面那个**死函数**的源码字符串——橡皮章测试。

### 5. `formatChart` 文本层（ai3000 独有，shushu 无对拍物）— ✅ 通过

`formatChart` 的产物**就是**注入六爻 AI prompt 的那段盘面文本
（`auth-server.js:2624` → 默认模板 `:2726`）。shushu 没有对应实现，故不能对拍
shushu，改用**「旧版 vs 新版」逐例归类收紧**：
`git show 3b2d04c:build/backend/paipan/liuyao.js > /tmp/oldliuyao/liuyao_old.js`
（同目录要有 `constants.js` 符号链接，见脚本头注），再 `node verify_format_chart.js`。
**`3b2d04c` 是重构前最后一版**，不能用 `HEAD`——`baacf62` 就是那次重构本身。

2026-09-24 把 `formatChart` 从「自造近似判定」改接到 `relations.js` 之后的结果：
**720 例，所有差异逐类通过，无行为回退。**

| 校验项 | 阈值 | 实测 |
|---|---|---|
| 实跑可达支对落在旧表多出的四对上 | 必须 0 | **0** ✅（88 种实达支对穷举） |
| 进退神旧新不一致（排除不可达四对） | 必须 0 | **0** ✅ |
| 回头生克类别不一致 | 必须 0 | **0** ✅ |
| 旧已判成全三合、新侧丢失 | 必须 0 | **0** ✅ |
| 文本出现 `undefined`/`NaN` | 必须 0 | **0** ✅ |
| 旧漏判、新补上的「化同（伏吟、扶持）」 | 只增不减 | **+140 处** ✅ |
| 「占两支」由旧记作三合 → 新另归半合 | 预期有差 | 990 → 490（照 shushu 收窄，非丢失） |

> **可达性这里是实跑证明的，不是引定理**。旧 `JIN_SHEN`/`TUI_SHEN` 比
> `DIZHI_PROGRESS_GROUPS` 多 `辰→未 / 戌→丑 / 未→辰 / 丑→戌` 四对，故「换表
> 不掉行为」需要前提「这四对取不到」。720 例穷举出 88 种实达支对，与该四对
> **零交集** —— 定理到此才落成事实。

> 新文本**同时**给出两套旺衰，且明确标成 `月令:X`（四时旺衰，只看月令，对拍层 2 已验）
> 与 `综合:X`（月日十二长生加权，对拍层 4 已验）。二者**会不一致**（如丑月午火
> 「月令:死」而「综合:旺相」），这是两套体系本来的分歧，故并列并在读法里点明，
> 不替 AI 合并。`月长生/日长生` 与 `日辰:合/生/克/破` 同理逐项标注来源。

> **层 4 的取样路径在本次一并收紧了**：`run_js_dynamic.js` 原先自己重算
> `R.analyzeDongJing(...)` 等，现在直接读 `buildChart` 产出的 `chart.deep.*`。
> 于是层 4 验的不再只是 `relations.js` 本身，而是**`buildChart` 把这一层接对了没有**
> ——即生产代码真正走的那条路径。改后重跑 174262 个叶子值仍 0 差异。

### 6. 用神层 — ✅ 通过（三个子层 + 覆盖断言）

移植对象是 shushu 的**用神相关**的那一半：`interpreter.py` 的事项/用神取定
（`_TOPIC_MAP` / `_TOPIC_YONG_SHEN` / `get_yong_shen`）、`_find_fu_shen`、
`relations.py::analyze_liuyao_deep_relations`、`advanced_features.py::get_shi_shen`。

**模块边界**（与层 4 同一套纪律）：`relations.js` 只管**用神无关**的部分，
新增的 `paipan/yongshen.js` 只管**用神相关**的部分，且 `analyzeLiuyaoDeepRelations`
把两块用神无关的（`line_details` / `changing_relations`）**委派回** `relations.js`
——同一个东西只有一份实现，不出现「两处各算一遍然后祈祷一致」。

| 子层 | 金标准 | 样例 | 叶子值 | 申报 | 未申报 |
|---|---|---|---|---|---|
| 6a 用神三块 + 伏神 + 世身（`golden_dynamic.json`） | divine 管线 | 720（topic 恒「求财」） | 193864 | 1750 | **0** ✅ |
| 6b 事项/性别/代占覆盖（`golden_yongshen.json`） | divine 管线 | 448（7 事项 × 64 卦） | 14925 | 2400 | **0** ✅ |
| 6c 事项取定表（`golden_topics.json`） | **纯函数**，不经管线 | 307 例 | 386 | 0 | **0** ✅ |

6c 直接调 shushu 的 `get_yong_shen` / `_match_topic` 与 JS 侧的 `matchTopic` /
`resolveTopic` 对拍，三组共 307 例 / 386 个叶子值：

| 组 | 例数 | 内容 |
|---|---|---|
| `match` | 150 | `_TOPIC_MAP` 的**每个关键词**各作一问（146 条）＋ 4 组无关键词的提问（必须都判成「综合」） |
| `yong_shen` | 150 | `_TOPIC_YONG_SHEN` 的 12 个事项 ＋ 3 个表外事项名（`天气占候`／不存在的怪事项／空串）× 5 种性别写法（`male`/`female`/`女`/`''`/`MALE`）× 2 种代占 |
| `priority` | 7 | `resolveTopic` 的**三条分支**各来几例（含「显式事项不在表内但关键词能认出」这一夹缝） |

#### 申报偏差只有两条理由，各有实测例数

| 理由 | 6a | 6b | 说明 |
|---|---|---|---|
| 用神是**位置名**（世爻/应爻） | 0 | 192 | 求医疾病 64 + 综合 64 + 天气占候 64 |
| 用神六亲**不上卦** | 170 | 48 | 求财 16 + 求官仕途 8 + 婚姻感情 8 + 求子嗣 16 |
| **两侧逐字相同（无偏差）** | **550** | **208** | ← 这条是关键：用神在卦中显象时**零差异** |

判据出自 `allow_yongshen_common.shushu_unresolved`，**不看实跑差异**（见前文
「申报偏差的判据」）。补全后并非自造取值：用神一旦在卦中显象，两侧逐字节相同
（550 + 208 = 758 例），说明 `resolveYongShen` 与 shushu 的原取法**等价**，
只是把它取不到的两处按同一张表补完。

#### 结构性事实：伏神 6 个分支只有 4 个可达（穷举证明）

六亲 ↔ 五行在**固定宫五行**下是一一对应（`C.getLiuQin` 把 5 个五行映到
兄弟/父母/子孙/妻财/官鬼，是双射）。故在 `findFuShen` 里，
**飞神五行 === 宫五行 ⟺ 飞神六亲 === 宫六亲**，而后者意味着用神本就现身、
`findFuShen` 根本不会被调用。于是「飞伏比和」与「正伏」两支**结构上取不到**。

`coverage_yongshen.py` 把这条写成断言：两层的实跑 `emerge_type` 取值集合
必须恰好等于可达的 4 支，且与不可达的 2 支**零交集**。
⇒ 将来若有人声称「伏神 6 分支全覆盖」，那是假的；**4/6 就是全**。

| 实跑命中 | 6a | 6b |
|---|---|---|
| 伏克飞 / 伏生飞 / 飞克伏 / 飞生伏 | 20 / 70 / 40 / 40 | 14 / 12 / 20 / 18 |
| 飞伏比和 / 正伏 | **0 / 0** ✅ | **0 / 0** ✅ |

#### 覆盖断言（防「空绿」）

对拍全绿只说明「跑到的那些没差」。`coverage_yongshen.py` 要求每个分支都真被跑到，
并做一条**独立交叉检查**：申报集**必须等于**金标准侧的空值集 ——
申报是按 shushu 取法**算**出来的，空值是**实测**出来的，两条独立的路必须碰在
同一个集合上（实测 170 ≡ 170、240 ≡ 240）。对不上就说明有一侧错了。

| 断言 | 实测 |
|---|---|
| 被验方用神五行五类齐全 | 土170 木180 水180 火100 金90 ✅ |
| 世身旺衰五档齐全 | 旺203 相115 休118 囚146 死138 ✅ |
| 世身「上卦/不上卦」都出现 | 两种都有 ✅ |
| `summary` 长度分布 | len1…len8 **8 种**（含空）✅ |
| `key_lines` 四神各自都非空过 | 用神550 原神560 忌神650 仇神620 ✅ |
| 「认不出的事项→退回关键词」分支 | 天气占候 64 例全部退到位置名支 ✅ |
| 申报集 ≡ 金标准空值集 | 6a 170≡170；6b 240≡240 ✅ |

> 天气占候这一条得小心：它**在** `_TOPIC_MAP` 里但**不在** `_TOPIC_YONG_SHEN` 里，
> 故事项定夺会走「显式事项认不出 → 退回关键词」那一支。但退回后
> `resolved_topic` 仍**等于输入**（关键词表里有「天气」），所以
> `resolved ≠ 输入` **不能**用作判据；可观测的后果是它落进位置名支。
> 这条断言最初就写错了侧（查了被验方，而缺口在 shushu 侧），已改正。

#### `formatChart` 的【用神】【伏神】两段

`auth-server.js` 里原先那张外挂的**粗配表已删除**，用神现在唯一来源是
`buildChart`（`auth-server.js` 的注释里写明了）。新增两段文本：
【用神】给出取定理由、位置名提示、用神在卦中的状态、`deep.summary`（**逐字照抄
shushu 的 `summary`，不另造措辞**）、世身；【伏神】渲染 `fu_shen.desc` + 飞伏关系，
或用神已在卦中时说明为何无伏神。

**两套「伏神」不要混**：`yongShen.fu_shen` 是**用神限定**的伏神（shushu 语义，
命理上说的就是它），`fuShenAbsent` 是「本卦未现身的六亲各自伏于哪一爻」的
参考表。二者含义不同，`formatChart` 里把前者作正文、后者标成「参考」。
`liuyao.js` 头注专门写了这一节。

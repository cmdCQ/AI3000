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

## 用法

```sh
PY=/home/cqsomt/Projects/shushu/.venv/bin/python
cd /home/cqsomt/Projects/ai3000/duipan

$PY gen_golden_zhuang_gua.py && node run_js_zhuang_gua.js
$PY diff.py golden_zhuang_gua.json js_zhuang_gua.json --case-keys

# 装卦层 + 卦体关系层（共用 golden_dynamic.json；金标准约 65 秒，JS 侧约 0.3 秒）
$PY gen_golden_dynamic.py && node run_js_dynamic.js
$PY diff.py golden_dynamic.json js_dynamic.json --case-keys

# 历法层（约 5 秒；gen 会**顺带重写** allow_calendar.json）
$PY gen_golden_calendar.py && node run_js_calendar.js
$PY diff.py golden_calendar.json js_calendar.json --allow allow_calendar.json --case-keys
```

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

#### 发现但**不可达**的潜伏不一致（待用户拍板，本轮未动）

- `advanced_features._is_jin_shen`（土进神含 `辰→未`、`戌→丑`）与
  `relations.DIZHI_PROGRESS_GROUPS`（不含）**两张表不同，但在所有可达对上一致**——
  差异全落在 `辰→未 / 戌→丑 / 未→辰 / 丑→戌`，而这四对结构上取不到。
  `relations.js` 照 shushu **各留各的表**，未擅自统一。
- `najia.analyze_hua_qi` 是**死代码**（仅被测试引用，无生产调用点），
  其四库土进神表取向与上两者又相反；因无调用点故不可达，未移植。
- 关联发现：`tests/test_liuyao_pro_audit.py:356` 用 `inspect.getsource`
  断言上面那个**死函数**的源码字符串——橡皮章测试。

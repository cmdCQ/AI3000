#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：八字解读提示词（3.5.4c = 变量表 + 默认模板）

被验方：`ai3000/build/backend/paipan/bazi_prompt.js`
基准：  shushu `api/agent.py::_build_interpret_prompt` 的 **bazi 支**（`:1410-1593`）

── 这一层验什么 ──
最终 prompt 可拆成「变量表 + 模板」两半。本层的判据是**最终字符串逐字相同**；
另存一份输入快照（`src`）用于把「输入就不同」与「提示词层不同」分开。

── 两个家族 ──
  `pv` 真实路径：`api/bazi.py::get_chart` 起盘（与层 15 的 `asm` 族同一条路）
       → 交给**真的** `_build_interpret_prompt`。52 个生辰 × 7 种 tab。
  `pm` 变异（mutation）：在真实盘上**改一个键**再进同一个函数。为什么非要它 ——
       第一版只有 `pv`，覆盖断言当场报出 **`trunc` 一档 364 例里一次都没出现**：
       也就是说「JSON 块被 2000 字截断」这条路径（`jsonBlock`/`pyJsonDumps`，
       移植里最绕的一段）**完全没有被验到**，而它在 `pv` 里本来是绿的。
       `pm` 还把「键缺失/值为 None/类型畸形/基准会抛」这些分支逐个点名，
       这些分支在真实盘上大多**不可达**（例如 `dayun`/`analysis`/`advice`
       三个键在真实链路上**永远缺席**，于是 `[:6]`、`int(start_age)`、
       `isinstance(advice, list)` 那几支从来没跑过）。

── 走真链路 ──
`data` 由 **`api/bazi.py::get_chart`** 起，再交给**真的** `_build_interpret_prompt`。
绝不在生成器里复写取键顺序/装配顺序 —— 「顺序写错」这类缺陷会两边一起错、
对拍看不见（层 15 的教训）。

⚠ **真实链路里 `data` 是哪一份**（读码 + 实测，不是推测）：
`POST /api/agent/interpret` 的 `req.data`，而 shushu 前端
（`frontend/src/pages/Bazi/BaziPage.jsx:131`）把 **`/api/bazi/chart` 的产物**原样传进来。
由此实测出两件真实行为：
  ① `dayun` / `analysis` / `advice` **三个键从不在这份盘里**
     → ctx 的「大运 / 分析 / 建议」**在真实链路上永远是空的**（层 16 实测：缺席键数恒为 3）。
  ② `extra_context` 传的是**用户问题**，于是 `tab` 在真实链路上 = 用户那句话
     （空则退成「综合」），`TAB_TO_ASPECT` 的专项注入**取不到**。
     用户要的「页内五方面」正是要**接上**这段现成机制，故本层把
     **方面名与自由问题两种 tab 都造用例** —— 两种都必须是绿的。

── 注入（与层 15 同一套，理由见那边的文件头）──
大运/流年由用例给（历法口径偏离已在层 9 按原因分桶申报）；「此刻」固定注入。
另：`knowledge.rag` 换成**假模块**，`search_and_format` 返回用例给定的固定串 ——
【古籍参考】是**外部依赖**（ai3000 走自己的语料库，用户 2026-09-25 拍板），
两侧注入同一段文本即可，它本身不进对拍。

── `src` 是什么、不是什么 ──
`src` = 提示词的**输入快照**（29 个键的 `[在不在, 值]`）。它不是判据，是**定位器**：
prompt 不同时先看 `src` —— 若 `src` 也不同，差异在**上游**（层 8–15 那一摞），
不是本层；若 `src` 相同，差异只能在 `bazi_prompt.js` 里。

── `err` 的契约（只有 `pm` 有）──
基准那七处 `try/except` 会**静默吞掉**异常（段整段消失）。而 `ctx` 与尾部**不在**
try 里 —— 那里抛了，整个函数就抛，前端收到 500。两侧都必须抛在**同一处**，
否则「段少了」与「整体失败」会被混为一谈。故：
  · `err` = Python 异常**类名**（无异常则 `""`），`prompt` 为 `None` ⇔ `err != ""`。
  · **只判类名，不判消息**。理由：基准的 `except` 不区分类型，行为只取决于「抛没抛」；
    且个别消息天然不同（`{}[:6]` 在 Python 是 `unhashable type: 'slice'`，
    移植侧写的是更正常的 `'dict' object is not subscriptable`）—— 判消息会造出一类
    **假红**（见本层文件尾「为什么不判消息」）。

── 归一（**订正**：本层原写「零归一」，实测后推翻）──
第一次跑对拍时，442 例里有 28 例连**输入快照 `src` 都不同**，集中在三个生辰
（b26/b40/b50，每生辰 7 例）—— 一例一因不像，一生辰一因才像。真因是**基准自己**：

    shushu core/bazi/special_patterns.py:317
        ss_names = list(set([x[0] for x in important_ss]))       # ← 杂气月令格
        ... f"藏 {'/'.join(ss_names)}"

`list(set(...))` 的顺序取决于 **python str 的进程级哈希种子**。**实测**（不是推测）：
同一张盘、同一份代码，六个进程跑出 `七杀/正财` 与 `正财/七杀` **3:3**；
同一进程内重复 8 次则恒定。也就是说**「金标准」在这里本身是个随机变量**。
它经 `special_patterns` → `overview`（把格局文案嵌进「格局亮点」）→ prompt 三处露出，
所以光看 prompt 会误判成「被验方错」。

处置：**复用层 11 已申报的那一份归一**（`duipan/norm_bazi_patterns.py`，
`gen_golden_bazi_patterns.py` 与 `diff_bazi_patterns.py` 两侧共用同一实现）。
不另写第二份 —— 归一是**共用定义**不是独立判断（⚠⚠ 与分支码段名同类），
两份实现只会多一个「错得一样才看不出」的漂移点。
  · 归一只认 `藏 X` 这一条正则，且它自带靶向性自查（证明不会顺手改别的格局）。
  · `norm_deep` 只对**字符串叶子**过正则，**绝不**喂 `canon()` 出来的 JSON 串：
    序列化后十神串后面紧跟 `",`，字符类会把引号逗号一起吞进去再排序搬走 ——
    归一自己把 JSON 弄坏、造出满篇假差异（层 11 那版换行坑的同一族）。
  · `main()` 断言这条归一**至少命中一例**：0 命中 = 它在本层没被检查过（防空绿）。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_prompt.py [out.json]
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import sys
import types
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

# ── 【古籍参考】的假模块：必须在 import `api.agent` **之前**装好 ──
# 不 import 真的 `knowledge.rag`（那会去加载向量库）；直接占住 `sys.modules` 里
# 那个名字，函数体内的 `from knowledge.rag import get_rag` 自然取到这一份。
_RAG_TEXT = [""]                      # 每例调用前改写；假 RAG 读它


class _FakeRag:
    def search_and_format(self, query, top_k=4, header=""):
        # 连 header 一起返回（基准那边就是 `header + 内容`），故注入串自带 header。
        # ⚠ 这里**故意不做任何处理** —— 基准是把返回值直接 `+=` 进古典段的。
        return _RAG_TEXT[0]


_fake_mod = types.ModuleType("knowledge.rag")
_fake_mod.get_rag = lambda: _FakeRag()
sys.modules["knowledge.rag"] = _fake_mod

import core.bazi.current_fortune as CF                              # noqa: E402
import core.calendar.current_moment as CM                           # noqa: E402
from api.agent import _build_interpret_prompt                       # noqa: E402
from api.bazi import BaziRequest, get_chart                         # noqa: E402

from gen_golden_bazi_assembly import (                              # noqa: E402
    ASM_BIRTHS, CF_DAYUN, CF_LIUNIAN, _clone, _reach_corpus, moments,
)
from norm_bazi_patterns import norm_deep                            # noqa: E402

# ── 家族契约：输出对象名（**顺序即摘要顺序**，两侧必须一致）──
FAMILIES = {
    "pv": ["prompt", "src"],
    "pm": ["prompt", "src", "err"],
}

FULL_SAMPLE = 40
FULL_STRIDE = 9

# ⚠ 与 `run_js_bazi_prompt.js` 里那份**各写一份**（独立重算，互为对照）。
#   它列的是「提示词会从盘里读的全部输入」，用来把「输入不同」与「提示词层不同」分开。
SRC_KEYS = [
    "year_pillar", "month_pillar", "day_pillar", "hour_pillar", "day_master",
    "_gender", "day_master_wuxing", "strength", "strength_info", "day_master_profile",
    "yong_shen", "shensha", "pattern", "pattern_desc", "dayun", "analysis", "advice",
    "taiyuan", "minggong", "shengong", "shishen_summary", "current_fortune",
    "overview", "mingju_synthesis", "master_synthesis", "life_aspects",
    "relations", "special_patterns", "combos",
]

# 页内五方面（用户要的那五个）+ 真实链路里的两种 tab：
#   「今年适合换工作吗」= 基准真实用法（用户问题当 tab）
#   ""                = 基准里退成「综合」的那一支
TABS = ["综合", "事业", "财运", "婚姻", "健康", "今年适合换工作吗", ""]

# 后两句是**对抗样例**，不是凑数：
#  · `$&`/`$1`/`` $` ``/`$'`：JS 若把替换值当字符串交给 `String.replace`，这些会被
#    当成替换模式展开（Python 的 f-string 不会）—— 用户真能在问题框里打出这几个字符。
#  · `{{vars}}{{tab}}`：一轮一轮替换的实现会把**插入结果**再扫一遍，于是问题里写
#    `{{vars}}` 会把整块 JSON 拼进尾段（基准那边只是原样文本）。
# 两条都在**真链路**上验，故放进 question / rag。
QUESTIONS = [
    "",
    "我今年适合换工作吗？",
    "这个$&的价$1格`` $'怎么看？",
    "{{vars}}{{tab}}是什么意思？",
]
RAGS = [
    "",
    "\n\n【古籍参考】\n- 《滴天髓》：甲木参天，脱胎要火。$&$1\n"
    "- 《子平真诠》：财喜身旺以任之，官以护之。",
]

# ⚠ `apply_mut` 的**语义**（两侧各写一份实现，但这一段是共用定义）：
#   {"op":"set","p":[键…],"v":<任意 JSON>}  把 p 指向的位置设为 v；
#                                           **要求父级已存在**（错了就报错，不静默）
#   {"op":"del","p":[键…]}                 删除 p 指向的键；该键不存在则什么都不做
# 只支持「顶层键」与「顶层 dict 里的一个键」——够用就好，路径越通用越容易两边写得不一样。


def apply_mut(chart, ops):
    for op in ops:
        p = op["p"]
        if len(p) == 1:
            parent, key = chart, p[0]
        elif len(p) == 2:
            parent = chart.get(p[0])
            assert isinstance(parent, dict), f"变异路径 {p} 的父级不是 dict：{type(parent)}"
            key = p[1]
        else:
            raise AssertionError(f"变异路径太深：{p}")
        if op["op"] == "set":
            parent[key] = _clone(op["v"])
        else:
            parent.pop(key, None)
    return chart


def norm_birth(b):
    """`_reach_corpus` 的条目只有 y/mo/d/h/gender（无分钟）——补 0。"""
    return (b["y"], b["mo"], b["d"], b["h"], b.get("mi", 0), b["gender"])


def births():
    """52 个生辰：4 个**带预期四柱**的固定夹具 + 48 张真实盘。"""
    out = []
    for (y, mo, d, h, mi, g, gz) in ASM_BIRTHS:
        out.append(((y, mo, d, h, mi, g), gz))
    for b in _reach_corpus():
        out.append((norm_birth(b), None))       # None = 无独立预期，见 run_birth
    return out


def canon(obj):
    """与比对器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 起盘（走真端点；每个生辰一次，缓存）
# ─────────────────────────────────────────────────────────────

_CHART_CACHE: dict = {}


def run_birth(b, moment, expect_gz):
    """起一次盘（注入大运/流年/此刻），返回 `(盘, 四柱)`。

    注入是为了绕开层 9 已申报的历法口径偏离 —— 本层要验的是「盘 → 提示词」，
    不是再验一遍历法。`current_fortune` 因此由**基准端点算出**并回填进用例，
    JS 侧只负责把它喂给提示词层（与层 15 `asm` 族同一约定）。

    ⚠ 只有 4 个夹具**有**独立预期四柱（`ASM_BIRTHS` 里写死的、由本项目 `ganzhi.js`
      算出）；48 张真实盘的 `gz` 是「端点算出来的」，由 JS 侧断言「我起出的四柱 =
      端点算出的」，即**两侧同盘**（跨层一致性），而不是「四柱本身对」（那是层 8 的活）。
      两类断言强度不同，别混为一谈。
    """
    if b in _CHART_CACHE:
        return _CHART_CACHE[b]
    y, mo, d, h, mi, g = b
    req = BaziRequest(year=y, month=mo, day=d, hour=h, minute=mi, gender=g,
                      is_lunar=False, use_true_solar_time=False)
    dy = _clone(CF_DAYUN)
    ln = _clone(CF_LIUNIAN)
    CF.calculate_dayun = lambda chart, gender, birth_year, _d=dy: _clone(_d)
    CF.calculate_liunian = lambda chart, gender, birth_year, sy, ey, _l=ln: _clone(_l)
    CM.current_sizhu = lambda *a, **k: _clone(moment)
    resp = asyncio.run(get_chart(req))
    assert resp.success, f"{b}: 端点返回 success=False"
    chart = resp.data
    got = [chart[k]["tiangan"] + chart[k]["dizhi"]
           for k in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")]
    if expect_gz is not None:
        assert got == expect_gz, f"{b}: 端点四柱 {got} ≠ 夹具预期 {expect_gz}"
    _CHART_CACHE[b] = (chart, got)
    return _CHART_CACHE[b]


def src_of(chart):
    """提示词的**输入快照**：逐键 `[在不在, 值]`。

    在不在也要记 —— `dict.get(k, 默认)` 在「键缺失」与「键在而值为 None」上是
    **两种行为**，只比值会把这层差别抹掉。
    """
    return {k: ([1, chart[k]] if k in chart else [0, None]) for k in SRC_KEYS}


def birth_key(i):
    return (i["y"], i["mo"], i["d"], i["h"], i["mi"], i["gender"])


def case_of(bi, gz, ti, tab, mut=None, cid=None):
    """`pv`/`pm` 共用同一种用例（`pm` 多一个 `mut`）。"""
    b = births()[bi][0]
    return {
        "kind": "pm" if mut is not None else "pv",
        "id": cid or f"b{bi:02d}-t{ti}",
        "in": {
            "y": b[0], "mo": b[1], "d": b[2], "h": b[3], "mi": b[4], "gender": b[5],
            "gz": gz,                          # JS 侧断言「两侧同盘」
            "tab": tab,
            "question": QUESTIONS[bi % len(QUESTIONS)],
            "rag": RAGS[(bi + ti) % len(RAGS)],
            "moment": moments()[bi % 16],
            "currentFortune": None,            # 下面回填
            # JS 侧**不读**（仅记录）：金标准喂给基准历法的固定表
            "inject": {"dayun": CF_DAYUN, "liunian": CF_LIUNIAN},
            **({"mut": mut} if mut is not None else {}),
        },
    }


def build_cases():
    """`pv` = 52 生辰 × 7 tab；`pm` = 变异盘 × 指定的两个 tab。"""
    out = []
    pb_i = pb_chart = pb_gz = None
    for bi, (b, expect_gz) in enumerate(births()):
        chart, gz = run_birth(b, moments()[bi % 16], expect_gz)
        pb_i, pb_chart, pb_gz = bi, chart, gz      # `pm` 家族打在这张盘上
        for ti, tab in enumerate(TABS):
            c = case_of(bi, gz, ti, tab)
            c["in"]["currentFortune"] = _clone(chart.get("current_fortune"))
            out.append(c)
    for cid, note, ops, tab in muts(pb_chart, pb_gz):
        # `pm` 的两个 tab：`综合`（无专项）与一个方面 tab（有专项）—— 变异对两边的影响不同
        for ti, t in enumerate((tab, "综合" if tab != "综合" else "事业")):
            c = case_of(pb_i, pb_gz, ti, t, mut=ops, cid=f"{cid}-{ti}")
            c["in"]["currentFortune"] = _clone(pb_chart.get("current_fortune"))
            c["in"]["note"] = note
            out.append(c)
    return out


def muts(chart, gz):
    """变异清单。`note` 写清**这条是为了覆盖哪一支** —— 没有哪一支的变异就是凑数。

    基准里被 `try/except` 吞掉的段（ov / cls / rel / sp / combos）与**不在** try 里的
    `ctx`/尾部，是本家族的两大目标：前者验「吞」，后者验「抛」。
    """
    M = []
    b0 = chart          # 基数盘（最后一个生辰的真实盘）
    # 「未截断时 JSON 块有多长」只能问基准；`pattern_desc` 是块里最省事的可变长字段
    # （纯中文、无转义，一个字符就是一码位），故块长与它**线性对应**。
    L0 = len(ctx_block(_prompt_raw(b0, "综合")))
    d0 = len(b0.get("pattern_desc") or "")
    assert L0 < 2000, f"基数盘的 JSON 块已 {L0} 码位，边界用例的算术不成立"

    # ① 截断（`j(ctx)` 的 `[:2000] + "…"`）—— `pv` 里一次都没出现过
    M.append(("trunc-long", "JSON 块超 2000 字 → 必须出现「…」且切在码位上",
              [{"op": "set", "p": ["pattern_desc"], "v": "格" * 2500}], "综合"))
    M.append(("trunc-nonbmp", "块里混非 BMP 字符（𠮷 = 1 码位 / 2 UTF-16 单元）："
                              "按 UTF-16 切的实现会**早切 900 码位**",
              [{"op": "set", "p": ["pattern_desc"], "v": "𠮷" * 900 + "甲" * 1200}], "综合"))
    # 边界：恰好 2000（**不加**省略号）与 2001（加）—— 判的是 `>` 还是 `>=`
    for nm, want in (("trunc-exact2000", 2000), ("trunc-over2000", 2001)):
        d1 = want - L0 + d0
        assert d1 > 0, f"{nm}: 算出的补白长度 {d1} ≤ 0，算术不成立"
        M.append((nm, f"块长正好 {want} 码位（{'不' if want == 2000 else ''}该加省略号）",
                  [{"op": "set", "p": ["pattern_desc"], "v": "格" * d1}], "综合"))

    # ② 段整段消失（可选的 ctx 键 / 可选正文段）
    M.append(("no-ty", "胎元/命宫/身宫三个键全删 → 「胎元」三项消失",
              [{"op": "del", "p": ["taiyuan"]}, {"op": "del", "p": ["minggong"]},
               {"op": "del", "p": ["shengong"]}], "综合"))
    M.append(("no-ss", "shishen_summary = [] → 「十神分布」消失",
              [{"op": "set", "p": ["shishen_summary"], "v": []}], "综合"))
    M.append(("no-cf", "current_fortune 整个键删 → 「当前运程」消失",
              [{"op": "del", "p": ["current_fortune"]}], "综合"))
    M.append(("cf-unavail", "current_fortune.available = False → 「当前运程」消失",
              [{"op": "set", "p": ["current_fortune", "available"], "v": False}], "综合"))
    M.append(("no-ms", "master_synthesis 整个键删 → 「命局总断」「各维度简评」消失",
              [{"op": "del", "p": ["master_synthesis"]}], "综合"))
    M.append(("no-ov", "overview 整个键删 → 【命局总论】整段消失",
              [{"op": "del", "p": ["overview"]}], "综合"))
    M.append(("ov-unavail", "overview.available = False → 【命局总论】整段消失",
              [{"op": "set", "p": ["overview", "available"], "v": False}], "综合"))
    M.append(("ov-badpara", "overview.paragraphs = [{}] → `p['title']` KeyError，"
                            "基准**吞掉**整段（段消失而不是整体失败）",
              [{"op": "set", "p": ["overview", "paragraphs"], "v": [{}]}], "综合"))
    M.append(("no-combos", "combos 两个子块都空 → 【格局成破评断】【神煞组合】都消失",
              [{"op": "set", "p": ["combos"],
                "v": {"geju_evaluation": {}, "shensha_combos": {}}}], "综合"))
    M.append(("no-sp", "special_patterns.total = 0 → 【特殊格局深度识别】消失",
              [{"op": "set", "p": ["special_patterns"], "v": {"total": 0}}], "综合"))
    M.append(("rel-str", "relations = 'abc' → 格式化函数抛，基准**吞掉** → 该段消失",
              [{"op": "set", "p": ["relations"], "v": "abc"}], "综合"))

    # ③ 专项分析（页内五方面走的就是这一支）
    M.append(("asp-no-la", "life_aspects 整个键删 → 事业 tab 的「专项分析」消失",
              [{"op": "del", "p": ["life_aspects"]}], "事业"))
    M.append(("asp-empty", "life_aspects.career = {} → 假值 → 「专项分析」消失",
              [{"op": "set", "p": ["life_aspects", "career"], "v": {}}], "事业"))
    M.append(("asp-topiconly", "life_aspects.career 只剩 topic → 过滤后空表仍在"
                               "（验的是「出现但为空」而不是「消失」）",
              [{"op": "set", "p": ["life_aspects", "career"], "v": {"topic": "事业"}}], "事业"))
    M.append(("asp-tab-mismatch", "tab=事业 但 life_aspects 里只有 wealth → 消失",
              [{"op": "set", "p": ["life_aspects"],
                "v": {"wealth": {"topic": "财运", "a": 1}}}], "事业"))

    # ④ `dayun`/`advice` 的**出现**分支 —— 真实链路上这三个键永远缺席，
    #    于是 `[:6]`、`int(start_age)`、`isinstance(advice, list)` 从来没跑过。
    #    （产品上要做的「把 /fortune 的 dayun 并进盘」正好会踩这一支。）
    M.append(("dayun-list", "dayun 7 条（超 6 截断）+ start_age 是小数 9.7 → int() 截断为 9",
              [{"op": "set", "p": ["dayun"], "v": (
                  [{"tiangan": "甲", "dizhi": "子", "start_age": 9.7, "quality": "吉"}] * 1
                  + [{"tiangan": "乙", "dizhi": "丑", "start_age": i, "quality": "平"}
                     for i in range(15, 21)])}], "综合"))
    M.append(("dayun-strage", "start_age = '9.7' → `int('9.7')` **抛 ValueError**，整体失败",
              [{"op": "set", "p": ["dayun"],
                "v": [{"tiangan": "甲", "dizhi": "子", "start_age": "9.7"}]}], "综合"))
    M.append(("dayun-strage-ok", "start_age = '9' → `int('9')` 正常",
              [{"op": "set", "p": ["dayun"],
                "v": [{"tiangan": "甲", "dizhi": "子", "start_age": "9"}]}], "综合"))
    M.append(("advice-list", "advice 4 条 → 取前 3",
              [{"op": "set", "p": ["advice"], "v": ["一", "二", "三", "四"]}], "综合"))
    M.append(("advice-str", "advice = 'abc' → isinstance 不是 list → 空串",
              [{"op": "set", "p": ["advice"], "v": "abc"}], "综合"))
    M.append(("analysis-str", "analysis 补上（真实链路里恒缺席）",
              [{"op": "set", "p": ["analysis"], "v": "此人宜早立身。"}], "综合"))

    # ⑤ 类型畸形：`pyTruthy`/`pyOr`/`pyIndexSlice`/`pyInt` 的边角，多半**必须抛**
    M.append(("profile-list", "day_master_profile = [] → Python 假 / JS 真（`pyTruthy` 的分水岭）",
              [{"op": "set", "p": ["day_master_profile"], "v": []}], "综合"))
    M.append(("profile-none", "day_master_profile = None → 假值 → 日主性格空",
              [{"op": "set", "p": ["day_master_profile"], "v": None}], "综合"))
    M.append(("profile-str", "day_master_profile = 'x' → 真值但没 .get → **抛**",
              [{"op": "set", "p": ["day_master_profile"], "v": "x"}], "综合"))
    M.append(("shensha-dict", "shensha = {} → `{}[:6]` **抛 TypeError**",
              [{"op": "set", "p": ["shensha"], "v": {}}], "综合"))
    M.append(("shensha-none", "shensha = None → 键在而值为 None → `None[:6]` **抛**",
              [{"op": "set", "p": ["shensha"], "v": None}], "综合"))
    M.append(("si-str", "strength_info = 'x' → `.get` **抛 AttributeError**",
              [{"op": "set", "p": ["strength_info"], "v": "x"}], "综合"))
    M.append(("si-list", "strength_info = [] → `.get` **抛 AttributeError**",
              [{"op": "set", "p": ["strength_info"], "v": []}], "综合"))
    M.append(("yong-list", "yong_shen = [] → `.get` **抛 AttributeError**",
              [{"op": "set", "p": ["yong_shen"], "v": []}], "综合"))
    M.append(("ss-dict", "shishen_summary = {'a':1} → 真值但 `{}[:8]` **抛**",
              [{"op": "set", "p": ["shishen_summary"], "v": {"a": 1}}], "综合"))
    M.append(("gender-int", "_gender = 1 → `in ('male','男')` 假 → 性别空",
              [{"op": "set", "p": ["_gender"], "v": 1}], "综合"))
    M.append(("gender-list", "_gender = ['male'] → 假（列表 != 字符串）→ 性别空",
              [{"op": "set", "p": ["_gender"], "v": ["male"]}], "综合"))
    M.append(("desc-none", "pattern_desc = None → ctx 里是 null（不是空串）",
              [{"op": "set", "p": ["pattern_desc"], "v": None}], "综合"))
    M.append(("pillar-nonstr", "year_pillar.tiangan = None → `f'{}'` 出 'NoneNone'？"
                               "（`str()` 与 JS `String()` 的分水岭）",
              [{"op": "set", "p": ["year_pillar", "tiangan"], "v": None}], "综合"))
    M.append(("pillar-cang-list", "day_pillar.canggan = [] → 盘里少一个藏干",
              [{"op": "set", "p": ["day_pillar", "canggan"], "v": []}], "综合"))
    return M


def _prompt_raw(chart, tab):
    """只为了量「未截断的 JSON 块有多长」而跑一次基准（给 `trunc-exact*` 定位用）。"""
    return _build_interpret_prompt("bazi", _clone(chart), "", tab)


def run_case(c):
    """一例的产物。盘按生辰缓存，故 `self_check` 复跑很便宜。

    ⚠ 每例 `_clone` 一份：`baziVars` 只读，但把**同一份对象**发给 400 多例，
      哪天有人写了个会改盘的实现，缺陷会被「盘已被上一例改过」掩盖 ——
      而那种掩盖只在跑全套时才出现（单例复现不出来）。
    """
    i = c["in"]
    chart = _clone(_CHART_CACHE[birth_key(i)][0])
    if "mut" in i:
        apply_mut(chart, i["mut"])
    _RAG_TEXT[0] = i["rag"]
    err, prompt = "", None
    try:
        prompt = _build_interpret_prompt("bazi", chart, i["question"], i["tab"])
    except Exception as e:                      # 基准抛了 —— 记类名（见文件头 `err` 契约）
        err = type(e).__name__
    out = {"prompt": prompt, "src": src_of(chart)}
    if "err" in FAMILIES[c["kind"]]:
        out["err"] = err
    else:
        # `pv` 的契约里没有 `err`：真实盘上基准**不该**抛。真抛了就是一条必须知道的事实
        # （层 15 的 `asm` 族对端点失败也是这么处理的），当场报错比记成 null 清楚。
        assert not err, f"{c['id']}：真实盘上基准抛了 {err}（本层假设它不抛）"
    return out


# ─────────────────────────────────────────────────────────────
# 分支指纹与计数（比对器会**独立重写**这两支，改动前先读 diff 的文件头）
# ─────────────────────────────────────────────────────────────

# ⚠⚠ 段名、段序、编码方案是与比对器**共用的定义**，不是风格选择（层 14/15 都栽过：
#    改了段序/编码 → 几百例假红）。改这里之前先看 `diff_bazi_prompt.py::flag_of`。
#
# 每个段名对应基准里**一句可验证的拼接**（括号里是它出自哪一行）：
#   ov  【命局总论…】:1492      cls 【古籍参考】:1502（RAG 注入的表头）
#   chk 【《穷通宝鉴》调候】:1513   dt  【《滴天髓》X干】:1515
#   zy  【任铁樵注】:1528        ge  【X成格】/【X破格】:1531/1533
#   yun 【X行运】:1535           rel 【地支刑冲合害】relations.py:552/554
#   sp  【特殊格局深度识别】special_patterns.py:527
#   cb  【格局成破评断】:1572     cb2 【神煞组合】:1574
#   asp 「{方面}专项分析」:1485   ty  胎元/命宫/身宫:1446
#   ss  「十神分布」:1453        cf  「当前运程」:1462   ms 「命局总断」:1472
#   trunc JSON 块被 2000 字截断（`j(ctx)` 的 `[:2000] + "…"`）
#   nmiss 输入快照里**缺席**的键数
MARKS = [
    ("ov", "【命局总论（已综合，请在此基础上深化）】"),
    ("cls", "【古籍参考】"),
    ("chk", "【《穷通宝鉴》调候】"),
    ("dt", "【《滴天髓》"),
    ("zy", "【任铁樵注】"),
    ("yun", "行运】"),
    ("rel", "【地支刑冲合害】"),
    ("sp", "【特殊格局深度识别】"),
    ("cb", "【格局成破评断】"),
    ("cb2", "【神煞组合】"),
    ("asp", "专项分析"),
    ("ty", "胎元"),
    ("ss", "十神分布"),
    ("cf", "当前运程"),
    ("ms", "命局总断"),
]
GE_MARKS = ("成格】", "破格】")


def ctx_block(prompt):
    """JSON 块 = 表头行之后到**第一个空行**之前。

    `indent=2` 的 JSON 内部只会出现单个换行（`,\\n`、`{\\n`），真正的 `\\n\\n`
    只可能是「JSON 结束、下一段开始」。被 2000 字截断时块尾是 `…`，这条仍成立。

    ⚠ **不看表头文字**：`tab` 在基准里是 `extra_context or "综合"`（`""` 退成「综合」），
      拿用例里的原文去比表头会自己骗自己（第一版就是这么崩的：`八字命盘（）`）。
    ⚠ 比对器**自己另写一份**同样的规则（独立实现互为对照），不从本文件读。
    """
    assert prompt.startswith("八字命盘（"), f"表头不是「八字命盘（」：{prompt[:20]!r}"
    nl = prompt.find("\n")
    assert nl >= 0, "prompt 没有表头行"
    rest = prompt[nl + 1:]
    cut = rest.find("\n\n")
    assert cut >= 0, "找不到 JSON 块之后的空行"
    return rest[:cut]


def flag_of(kind, out):
    """分支指纹 —— 由**产物本身**现算（不读用例），比对器独立重算一份。"""
    if out.get("err"):
        return "err=" + out["err"]
    p = out["prompt"]
    seg = [f"{n}=" + ("1" if mk in p else "0") for n, mk in MARKS]
    seg.append("ge=" + ("1" if (GE_MARKS[0] in p or GE_MARKS[1] in p) else "0"))
    seg.append("trunc=" + ("1" if ctx_block(p).endswith("…") else "0"))
    seg.append("nmiss=" + str(sum(1 for k in SRC_KEYS if out["src"][k][0] == 0)))
    return "|".join(seg)


def count_of(kind, out):
    """计数。⚠ 字符串长度一律按**码位**算。

    本层产物就是字符串，长度是它唯一的结构指标；但 Python `len` 数码位、
    JS `.length` 数 UTF-16 单元，非 BMP 字符（如「𠮷」）上会差 —— 故 JS 侧
    必须 `[...s].length`。`trunc-nonbmp` 那条用例就是专门盯这条线的。
    """
    nmiss = sum(1 for k in SRC_KEYS if out["src"][k][0] == 0)
    if out.get("err"):
        return [-1, -1, -1, nmiss]
    cb = ctx_block(out["prompt"])
    return [len(out["prompt"]), len(cb), 1 if cb.endswith("…") else 0, nmiss]


def shape_of(ob):
    """输出对象的形状。`None` 与字符串没有键 —— 用固定标记。

    ⚠ 标签是两侧**共享的约定**（JS 侧 `shapeOf` 必须写同两个字面量）：
      `["<str>"]` 防「改成返回 `{text: …}`」这类结构漂移，
      `["<null>"]`（`pm` 里基准抛了、或 `asm` 式「没挂上」）同理。
    """
    if ob is None:
        return ["<null>"]
    if isinstance(ob, str):
        return ["<str>"]
    return sorted(ob.keys())


# ─────────────────────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_prompt.json"))
    a = ap.parse_args()

    cases = build_cases()

    digest, flags, counts, hist = {}, [], [], {}
    shapes, full = {}, []
    n_norm = 0                                     # 归一真改动的例数（防空绿，见下）
    for idx, c in enumerate(cases):
        raw = run_case(c)
        out = norm_deep(raw)
        if out != raw:
            n_norm += 1
        assert list(out) == FAMILIES[c["kind"]], f"{c['id']} 输出键不契约：{list(out)}"
        for name in FAMILIES[c["kind"]]:
            ks = shape_of(out[name])
            slot = shapes.setdefault(c["kind"], {}).setdefault(name, [])
            if ks not in slot:
                slot.append(ks)
        digest[str(idx)] = [sha(canon(out[n])) for n in FAMILIES[c["kind"]]]
        f = flag_of(c["kind"], out)
        flags.append(f)
        counts.append(count_of(c["kind"], out))
        hist[c["kind"]] = hist.get(c["kind"], {})
        hist[c["kind"]][f] = hist[c["kind"]].get(f, 0) + 1
        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"idx": idx, "kind": c["kind"], "id": c["id"],
                         "out": {n: out[n] for n in FAMILIES[c["kind"]]}})

    # ⚠ 防空绿：这条归一**这次真改动了产物**吗？
    #   0 例就是说它在本层一次都没被检查过 —— 那它要么已经不需要，要么正则失效了。
    #   两种都该当场报出来，而不是留着一个空跑的变换（「一个从没报过的检查等于没有检查」）。
    assert n_norm > 0, (
        "雜氣月令归一在本层 0 命中：基准的哈希抖动没出现在这批用例上，"
        "或 norm_bazi_patterns 的正则失效了。先查清楚，别留一个空跑的归一。")

    doc = {
        "meta": {
            "layer": "3.5.4c 八字解读 prompt（变量表 + 默认模板）",
            "source": "shushu api/agent.py::_build_interpret_prompt 的 bazi 支 (:1410-1593)",
            "n_cases": len(cases),
            "families": FAMILIES,
            "kinds": dict(Counter(c["kind"] for c in cases)),
            "src_keys": SRC_KEYS,
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) "
                     "→ sha256 hex。⚠ 字符串长度一律**码位**（Python len == JS [...s].length）",
            "norm": "**非零归一（实测后订正，见文件头「归一」）**：基准 shushu 的 "
                    "`special_patterns.py:317` 用 `list(set([...]))` 拼十神串，"
                    "顺序随 python 进程哈希种子变（实测 6 进程 3:3 两种顺序），"
                    "该串经 special_patterns → overview → prompt 三处露出。"
                    "归一是层 11 已申报的那一份（duipan/norm_bazi_patterns.py，"
                    "两侧共用同一实现，正则只认 `藏 X`、自带靶向性自查）。"
                    "除此之外零归一：逐例分支全由用例输入决定，遍历要么按列表序、"
                    "要么 sorted()，文本全部来自 json.dumps(ensure_ascii=False) 与静态古籍表。"
                    "⚠ 只对**字符串叶子**过正则，绝不喂 `canon()` 的 JSON 串（会把 `\",` 吞进十神串）。",
            "norm_hits": n_norm,
            "full_stride": FULL_STRIDE,
            "shapes": shapes,
        },
        "cases": cases,
        "digest": digest,
        "flags": flags,
        "counts": counts,
        "hist": hist,
        "full": full,
    }
    Path(a.out).write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {len(cases)} 例 → {a.out}（{Path(a.out).stat().st_size / 1024 / 1024:.1f} MB）")
    print(f"  家族：{dict(Counter(c['kind'] for c in cases))}")
    print(f"  雜氣月令归一命中 {n_norm} 例（正则只认 `藏 X`，其余零归一）")
    for k, h in sorted(hist.items()):
        print(f"  {k:<4} {len(h)} 种分支码（条目合计 {sum(h.values())}）")
    return self_check(cases)


def self_check(cases):
    """覆盖断言 —— 防空绿：**没真出现过的分支等于没有检查过**。

    第一版只有 `pv`，这里当场报出 `trunc` 364 例里 0 次出现（而 `pv` 本来是绿的）——
    「jsonBlock 被 2000 字截断」这条路径等于没验。`pm` 家族就是被这条断言逼出来的。
    """
    # 归一后再自查 —— 查的必须是**存进金标准的那一份**（这里是重算，两边同过归一）
    R = [(c, norm_deep(run_case(c))) for c in cases]
    probs = []

    # ① 用例维度
    by_tab = Counter(c["in"]["tab"] for c in cases)
    for t in TABS:
        if by_tab[t] == 0:
            probs.append(f"tab「{t}」没有用例")
    for label, cnt in (("空问题", sum(1 for c in cases if not c["in"]["question"])),
                       ("有问题", sum(1 for c in cases if c["in"]["question"])),
                       ("空检索", sum(1 for c in cases if not c["in"]["rag"])),
                       ("有检索", sum(1 for c in cases if c["in"]["rag"]))):
        if cnt == 0:
            probs.append(f"{label} 没有用例")

    # ② 分支维度：每档都至少要出现一次
    flags = Counter(flag_of(c["kind"], o) for c, o in R)
    for key in [n for n, _ in MARKS] + ["ge", "trunc"]:
        ones = sum(v for k, v in flags.items() if f"{key}=1" in k.split("|"))
        zeros = sum(v for k, v in flags.items() if f"{key}=0" in k.split("|"))
        print(f"   {'·' if ones else '✗'} {key:<6} 出现 {ones:>3} 例 / 不出现 {zeros:>3} 例")
        if ones == 0:
            probs.append(f"「{key}」在所有用例里都没出现 —— 这一档没被检查过")
    nerr = sum(1 for _, o in R if o.get("err"))
    kinds = sorted({o["err"] for _, o in R if o.get("err")})
    print(f"   · 基准抛异常：{nerr} 例（{', '.join(kinds) if kinds else '无'}）")
    if not nerr:
        probs.append("没有任何一例让基准抛异常 —— 「两侧都得抛」这条没被检查过")
    if nerr == len(R):
        probs.append("每一例都在抛 —— 多半是夹具坏了")

    # ③ 实测事实
    nmiss = sorted({sum(1 for k in SRC_KEYS if o["src"][k][0] == 0) for _, o in R})
    nmiss_pv = sorted({sum(1 for k in SRC_KEYS if o["src"][k][0] == 0)
                       for c, o in R if c["kind"] == "pv"})
    print(f"   · 输入快照缺席键数：{nmiss}（`pv` 恰好 {nmiss_pv}；"
          f"真实盘预期恰好 3：dayun/analysis/advice）")
    # 这条只在 `pv` 上断言 —— `pm` 的变异**就是**在改键的在场与否，全家族一起断就自相矛盾了。
    # 它守的是「真实链路的盘形状没变」：哪天上游把 dayun 并进盘，这条会红，那是**好事**。
    if nmiss_pv != [3]:
        probs.append(f"`pv` 的缺席键数不是 3：{nmiss_pv} —— 真实链路的盘形状变了，先查上游")
    ok = [(c, o) for c, o in R if not o.get("err")]
    trunc = sum(1 for _, o in ok if ctx_block(o["prompt"]).endswith("…"))
    print(f"   · JSON 块被 2000 字截断：{trunc}/{len(ok)} 例")
    asp = [c for c, o in ok if c["in"]["tab"] in ("事业", "财运", "婚姻", "健康")]
    lost = sum(1 for c, o in ok if c["in"]["tab"] in ("事业", "财运", "婚姻", "健康")
               and "专项分析" not in o["prompt"])
    print(f"   · 方面 tab 里「专项分析」被切掉：{lost}/{len(asp)} 例")
    lens = sorted(len(o["prompt"]) for _, o in ok)
    print(f"   · prompt 码位长度：min {lens[0]} / 中位 {lens[len(lens) // 2]} / max {lens[-1]}")

    if probs:
        print("✗ 覆盖不足：")
        for p in probs:
            print("   " + p)
        return 2
    print("✓ 覆盖断言全过（每一档都真出现过）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**总断那一串**（3.5.4b）
`current_fortune.py` + `overview.py` + `synthesis.py` + `master_synthesis.py`
+ `api/bazi.py` 的装配体。

── 这一层是「排完盘之后给用户看什么」的老家 ──
`api/bazi.py:get_chart` 挂上 `overview`（命局总论）、`mingju_synthesis`（推理链）、
`master_synthesis`（综合论断总汇），其中 `current_fortune` 又把大运流年并进先天静盘。
前端/AI 拿到的「结论段」全部来自这里。

── 五个家族 ──
  `cf`  当前运程：真实盘 + **注入**大运/流年列表 → `build_current_fortune`。
  `ov`  命局总论：**合成盘**（手写字段）→ `synthesize_overview`。
  `sy`  推理链：  合成盘 → `synthesize_mingju`。
  `ms`  综合论断：合成盘 + 注入此刻 → `build_master_synthesis`。
  `asm` 完整装配：**走真端点** `api.bazi.get_chart`，本层唯一的端到端家族。

── 为什么要「注入」（只对 `cf` / `asm`）──
① 大运/流年列表由层 9（`bazi_fortune.js`）负责，其口径偏离（shushu 节表偏早 4.6–16.3 分）
   已在层 9 按原因分桶处理。本层要验的是「从列表里挑出当前那一段」与「织进总论」，
   不是再验一遍历法 —— 与层 3「四柱由金标准原样传入，本层不验历法」同一条分层约定。
   故 `cf` 族把 dayun/liunian **原样传入**（金标准补 `core.bazi.current_fortune.calculate_dayun`、
   `calculate_liunian`），`asm` 族把算好的 `current_fortune` 整块注入。
② 「此刻」（`moment`）在基准里是 `current_sizhu()` 现取的，**同一盘不同时刻结果不同** ——
   不注入就无法对拍。故 `ms`/`asm` 族把 `current_sizhu` 补成固定值，逐例传入。
   这是层 1–14 里唯一真正读「现在」的地方。

── `asm` 为什么必须走真端点，而不是在生成器里手动复写装配顺序 ──
装配顺序**就是**本层被验的东西。若在生成器里照抄一遍 `api/bazi.py` 的十行，
「顺序写错」这一类缺陷会**两边一起错、对拍看不见**（与层 14 的 flag 遍历顺序同类的坑）。
故直接 `asyncio.run(get_chart(req))` —— 验的就是线上那个函数。
代价：得从「时刻」起盘，于是两侧的历书都得上场。应对是**逐例断言**端点的四柱等于
本族的预期干支（`_assert_pillars`），并把日期取在离交节与子时都远的地方：
断言一旦通过，就证明两侧历书在这批样例上给出的是同一张盘，历法差异没有混进来。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_assembly.py [out.json]
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import itertools
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

import core.bazi.current_fortune as CF                              # noqa: E402
import core.calendar.current_moment as CM                           # noqa: E402
from core.bazi.analyzer import analyze_chart                        # noqa: E402
from core.bazi.master_synthesis import build_master_synthesis       # noqa: E402
from core.bazi.overview import synthesize_overview                  # noqa: E402
from core.bazi.synthesis import synthesize_mingju                   # noqa: E402
from api.bazi import BaziRequest, get_chart                         # noqa: E402

from gen_golden_bazi_patterns import chart_from_gz                  # noqa: E402

# ── 家族契约：输出对象名（顺序即 digest 的顺序，两侧必须一致）──
_ASM_KEYS = ["day_master_profile", "yong_shen", "relations", "special_patterns", "combos",
             "current_fortune", "life_aspects", "overview", "mingju_synthesis",
             "master_synthesis"]
FAMILIES = {
    "cf":  ["cf"],
    "ov":  ["ov"],
    "sy":  ["sy"],
    "ms":  ["ms"],
    "asm": _ASM_KEYS,
}

FULL_SAMPLE = 300
FULL_STRIDE = 37

# 未经任何注入的原函数 —— `_restore_injections()` 靠它们还原真实链路（见 ⑥）。
_ORIG_CALC_DAYUN = CF.calculate_dayun
_ORIG_CALC_LIUNIAN = CF.calculate_liunian
_ORIG_CURRENT_SIZHU = CM.current_sizhu

DEL = object()          # `mk()` 里的「删掉这个键」哨兵


# ─────────────────────────────────────────────────────────────
# 合成盘的构造：基础盘 + 点路径覆盖
# ─────────────────────────────────────────────────────────────

BASE = {
    "day_master": "甲",
    "day_master_wuxing": "木",
    "strength": "身强",
    "strength_info": {"monthly_status": "旺", "deling": True, "deqi": False,
                      "help_score": 3, "drain_score": 1, "strength": "身强"},
    "pattern": "正官格",
    "combos": {"geju_evaluation": {
        "pattern": "正官格", "quality": "吉", "status": "成格",
        "verdict": "官星得地、身旺任官。", "cheng_hit": ["官星得地"],
        "po_hit": [], "jiu": ""}},
    "yong_shen": {"yong_shen_wx": "水", "xi_shen_wx": "木", "ji_shen_wx": "土",
                  "analysis": "日主偏旺，宜泄宜克。"},
    "tiaohou": {"primary": "水", "primary_in_chart": True},
    "special_patterns": {"matched": [{"name": "魁罡格", "auspicious": True,
                                      "interpretation": "庚辰日生——刚断明敏，掌权之象。果决。"}]},
    "relations": {"summary": {"total_chong": 1, "total_xing": 1, "total_he": 1,
                              "key_warnings": ["⚠ 子午相冲"], "key_blessings": ["✓ 寅亥六合"]}},
    "day_master_profile": {"symbol": "参天之木", "core_traits": "仁德进取"},
    "current_fortune": {
        "available": True, "current_year": 2026, "pre_yun": False,
        "current_dayun": {"ganzhi": "壬申", "tiangan": "壬", "dizhi": "申",
                          "start_age": 30, "end_age": 39, "start_year": 2020,
                          "end_year": 2029, "shishen": "偏印", "quality": "吉",
                          "help": "扶用", "warning": ""},
        "current_liunian": {"year": 2026, "ganzhi": "丙午", "shishen": "食神",
                            "quality": "吉", "summary": "食神生财，宜进取。"},
        "suiyun": {"success": True, "dayun": "壬申", "liunian": "丙午",
                   "tags": ["岁运地支相冲"], "notes": ["大运申与流年午相冲。"]},
        "suiyun_brief": "岁运地支相冲：大运申与流年午相冲。",
        "recent_years": [{"year": 2026, "ganzhi": "丙午", "quality": "吉", "shishen": "食神"}],
    },
    "life_aspects": {
        "career": {"topic": "事业", "analysis": "日主甲，五行属木，身强。宜从事水行业，宜守正。",
                   "career_fields": ["水利", "航运", "贸易", "教育", "文化", "传媒"],
                   "shishen_advice": ["以正官为用", "宜印绶护身"]},
        "wealth": {"topic": "财运", "level": "财运稳健", "advice": "宜稳中求进。",
                   "wealth_stems": ["水", "木"], "lucky_wuxing": ["水", "木"]},
        "health": {"topic": "健康", "dm_condition": "偏旺", "dm_organ": "肝胆",
                   "weak_organ": "脾胃", "weak_element": "土",
                   "analysis": ["木旺克土，脾胃易弱。"], "advice": "饮食有节。",
                   "wx_distribution": {"木": 4, "火": 1, "土": 1, "金": 1, "水": 3}},
        "marriage": {"topic": "婚姻", "quality": "婚姻宫平稳，婚缘较好，感情稳定",
                     "clash_present": False, "harmony_present": True,
                     "spouse_stars": ["正财"], "advice": "宜珍惜眼前人。"},
    },
    "overview": {"available": True, "headline": "甲木日主·身强·正官格", "quality": "吉",
                 "day_master": "甲木", "pattern": "正官格", "pattern_status": "成格",
                 "yong_shen_wx": "水", "ji_shen_wx": "土", "verdict_line": "格正用真。",
                 "paragraphs": [{"title": "一生大局", "text": "格正用真。"}]},
    "mingju_synthesis": {"available": True, "day_master": "甲木", "strength": "身强",
                         "pattern": "正官格", "quality": "吉",
                         "yong_shen_wx": "水", "ji_shen_wx": "土",
                         "factors": [{"module": "格局成破", "factor": "成格·正官格",
                                      "polarity": "利", "weight": 2, "note": "官星得地"}],
                         "composite_score": 3, "composite_label": "命局中平偏上",
                         "composite_desc": "格局有成、用神可取。",
                         "current_fortune_note": "",
                         "chain_text": "日主甲木（身强）　→　〔格局成破〕＋成格·正官格　⟹　命局中平偏上（先天综合力+3）"},
}


def setp(obj, path, val):
    """`"strength_info__deling"` → `obj["strength_info"]["deling"] = val`；`DEL` 则删键。"""
    parts = path.split("__")
    d = obj
    for p in parts[:-1]:
        d = d.setdefault(p, {})
    last = parts[-1]
    if val is DEL:
        d.pop(last, None)
    else:
        d[last] = val


def mk(**patch):
    obj = json.loads(json.dumps(BASE, ensure_ascii=False))   # 深拷贝（BASE 里全是 JSON 类型）
    for path, val in patch.items():
        setp(obj, path, val)
    return obj


# ─────────────────────────────────────────────────────────────
# 时机（moment）：此刻时空的固定样本
# ─────────────────────────────────────────────────────────────

def moments():
    """此刻时空样本。`moment_vs_yongshen` 只读 `hour_wuxing` / `seasonal_wx` /
    `hour_name` / `hour_gz`，故只造这四个字段的交叉 —— 造全字段反而把
    「基准读了什么」这件事藏起来。"""
    out = []
    for hw in ("水", "木", "土", "火", ""):
        for sw in ("水", "金", "土", ""):
            out.append({
                "hour_gz": "癸亥", "hour_name": "亥时",
                "hour_wuxing": hw, "seasonal_wx": sw,
            })
    # 极端/畸形：空 dict（`.get` 全走默认）、键在而值为 None（`str(None)` → "None"）
    out.append({})
    out.append({"hour_gz": "", "hour_name": None, "hour_wuxing": None, "seasonal_wx": None})
    out.append({"hour_gz": "甲子", "hour_name": "子时", "hour_wuxing": ["水"], "seasonal_wx": {"x": 1}})
    # 更多畸形：**假容器**（两边都该过滤掉 —— 与上面那条相反的那一半）、
    # 可哈希的怪值（数字/None → `_SHENG.get` 查不到，但**不炸**，故 tone 是「中性」）
    out.append({"hour_gz": "甲子", "hour_name": "子时", "hour_wuxing": {}, "seasonal_wx": []})
    out.append({"hour_gz": "甲子", "hour_name": {"a": 1}, "hour_wuxing": 1, "seasonal_wx": "水"})
    out.append({"hour_gz": None, "hour_name": None, "hour_wuxing": "水", "seasonal_wx": "金"})
    return out


# ─────────────────────────────────────────────────────────────
# 家族 cf —— 当前运程（注入大运/流年）
# ─────────────────────────────────────────────────────────────

CF_GZ = ["甲子", "丙寅", "戊辰", "庚申"]

CF_DAYUN = [
    {"tiangan": "甲", "dizhi": "子", "start_age": 5, "end_age": 14,
     "start_year": 1995, "end_year": 2004, "dm_shishen": "比肩", "quality": "平", "warning": ""},
    {"tiangan": "乙", "dizhi": "丑", "start_age": 15, "end_age": 24,
     "start_year": 2005, "end_year": 2014, "dm_shishen": "劫财", "quality": "吉", "warning": ""},
    {"tiangan": "丙", "dizhi": "寅", "start_age": 25, "end_age": 34,
     "start_year": 2015, "end_year": 2024, "dm_shishen": "食神", "quality": "吉", "warning": ""},
    {"tiangan": "丁", "dizhi": "卯", "start_age": 35, "end_age": 44,
     "start_year": 2025, "end_year": 2034, "dm_shishen": "伤官", "quality": "凶", "warning": "防口舌"},
]

CF_LIUNIAN = [
    {"year": y, "tiangan": g, "dizhi": z, "quality": q, "shishen_gan": s, "summary": f"{y}年运。",
     "shishen": s}
    for y, g, z, q, s in (
        (2024, "甲", "辰", "平", "比肩"), (2025, "乙", "巳", "吉", "劫财"),
        (2026, "丙", "午", "吉", "食神"), (2027, "丁", "未", "凶", "伤官"),
        (2028, "戊", "申", "平", "偏财"), (2029, "己", "酉", "吉", "正财"),
    )
]


def cf_case(cid, birth_year, current_year, dayun, liunian, yong_shen, gender="male"):
    return {"kind": "cf", "id": cid,
            "in": {"gz": CF_GZ, "gender": gender, "birthYear": birth_year,
                   "currentYear": current_year, "dayun": dayun, "liunian": liunian,
                   "yong_shen": yong_shen}}


def family_cf():
    out = []
    ys = BASE["yong_shen"]
    # ① birthYear 的假值形态：0 / None / 缺 —— 基准 `if not birth_year` 直接不可用
    for i, by in enumerate((0, None, -1, False)):
        out.append(cf_case(f"by{i}-{by!r}", by, 2026, CF_DAYUN, CF_LIUNIAN, ys))
    out.append({"kind": "cf", "id": "by-missing",
                "in": {"gz": CF_GZ, "gender": "male", "currentYear": 2026,
                       "dayun": CF_DAYUN, "liunian": CF_LIUNIAN, "yong_shen": ys}})
    # ② dayun 空 / 缺 → 不可用
    out.append(cf_case("dy-empty", 1990, 2026, [], CF_LIUNIAN, ys))
    out.append({"kind": "cf", "id": "dy-missing",
                "in": {"gz": CF_GZ, "gender": "male", "birthYear": 1990,
                       "currentYear": 2026, "liunian": CF_LIUNIAN, "yong_shen": ys}})
    # ③ 当前年落在大运区间内 / 未交运（早于首运）/ 超出末运
    for tag, yr in (("mid", 2026), ("pre", 1990), ("post", 2040), ("gap", 2014),
                    ("last", 2034), ("first", 1995)):
        out.append(cf_case(f"yr-{tag}-{yr}", 1990, yr, CF_DAYUN, CF_LIUNIAN, ys))
    # ④ 流年列表：命中今年 / 不含今年（退回首条）/ 空 / 缺
    for tag, ln in (("hit", CF_LIUNIAN), ("miss", CF_LIUNIAN[2:]), ("empty", []), ("one", CF_LIUNIAN[:1])):
        out.append(cf_case(f"ln-{tag}", 1990, 2026, CF_DAYUN, ln, ys))
    out.append({"kind": "cf", "id": "ln-missing",
                "in": {"gz": CF_GZ, "gender": "male", "birthYear": 1990,
                       "currentYear": 2026, "dayun": CF_DAYUN, "yong_shen": ys}})
    # ⑤ 大运天干的扶抑判定：扶用 / 助忌 / 中性 / 表里没有的干 / yong_shen 缺
    for tag, ysv in (
        ("fu", {"yong_shen_wx": "木", "ji_shen_wx": "土"}),      # 大运首干 甲=木 → 扶用
        ("ji", {"yong_shen_wx": "水", "ji_shen_wx": "木"}),      # 甲=木 → 助忌
        ("zhong", {"yong_shen_wx": "水", "ji_shen_wx": "土"}),   # 甲=木 → 中性
        ("noyong", {"ji_shen_wx": "土"}),                        # 无用神 → None
        ("badgan", {"yong_shen_wx": "水", "ji_shen_wx": "土"}),  # 配合「表外天干」用
    ):
        dy = CF_DAYUN if tag != "badgan" else ([dict(CF_DAYUN[0], tiangan="?")] + CF_DAYUN[1:])
        out.append(cf_case(f"help-{tag}", 1990, 1995, dy, CF_LIUNIAN, ysv))
    out.append({"kind": "cf", "id": "help-noyongshen",
                "in": {"gz": CF_GZ, "gender": "male", "birthYear": 1990, "currentYear": 2026,
                       "dayun": CF_DAYUN, "liunian": CF_LIUNIAN}})
    # ⑥ 岁运组合的 tags/notes 形态：并临/相战/仅冲/平和
    for tag, dy0, ln in (
        ("binglin", dict(CF_DAYUN[0], tiangan="丙", dizhi="午"), CF_LIUNIAN),
        ("xiangzhan", dict(CF_DAYUN[0], tiangan="庚", dizhi="子"), CF_LIUNIAN),
        ("chongonly", dict(CF_DAYUN[0], tiangan="甲", dizhi="子"), CF_LIUNIAN),
        ("pinghe", dict(CF_DAYUN[0], tiangan="甲", dizhi="巳"), CF_LIUNIAN),
    ):
        out.append(cf_case(f"suiyun-{tag}", 1990, 2026, [dy0], ln, ys))
    # ⑦ gender 取值（本层只有一处读 gender：`analyze_suiyun` 不读，故仅作对称性覆盖）
    for g in ("male", "female"):
        out.append(cf_case(f"gender-{g}", 1990, 2026, CF_DAYUN, CF_LIUNIAN, ys, gender=g))
    return out


# ─────────────────────────────────────────────────────────────
# 家族 ov —— 命局总论
# ─────────────────────────────────────────────────────────────

def family_ov():
    out = []

    def add(cid, **patch):
        out.append({"kind": "ov", "id": cid, "in": {"chart": mk(**patch)}})

    # ① 日主立命的四种「令」态：得令 / 得气 / 失令 / 两键都缺
    add("ling-deling")
    add("ling-deqi", strength_info__deling=False, strength_info__deqi=True)
    add("ling-shiling", strength_info__deling=False, strength_info__deqi=False)
    add("ling-none", strength_info__deling=DEL, strength_info__deqi=DEL)
    add("ling-empty-str", strength_info__deling="", strength_info__deqi="")
    add("ling-zero", strength_info__deling=0, strength_info__deqi=0)
    # ② strength_info 为**空字典** → 「（帮身x、泄耗y）」整段不出现（判的是字典非空）
    add("si-empty", strength_info={})
    add("si-missing", strength_info=DEL)
    add("si-null", strength_info=None)
    # ③ strength 的插值形态（层 14 的 7920 例教训：f-string 走 str()）
    for i, st in enumerate(("身强", "身弱", "中和", "", None, {"label": "身强"}, 0)):
        add(f"strength-{i}-{type(st).__name__}", strength=st)
    # ④ day_master_profile：有无 symbol / traits
    add("prof-none", day_master_profile={})
    add("prof-missing", day_master_profile=DEL)
    add("prof-symbol-only", day_master_profile={"symbol": "参天之木"})
    add("prof-empty-str", day_master_profile={"symbol": "", "core_traits": ""})
    # ⑤ 格局成破段：pattern 有/无 × status 有/无 × verdict 四种收尾
    add("pat-none", pattern="", pattern_desc="")
    add("pat-nostatus", combos__geju_evaluation__status="")
    add("pat-v-none", combos__geju_evaluation__verdict="")
    add("pat-v-ju", combos__geju_evaluation__verdict="官星得地。")
    add("pat-v-tan", combos__geju_evaluation__verdict="官星得地！")
    add("pat-v-bare", combos__geju_evaluation__verdict="官星得地")
    # ⑥ 用神趋避段：yw 有/无 × xw 同/异/缺 × jw 有/无
    add("ys-yw-none", yong_shen__yong_shen_wx="")
    add("ys-yw-missing", yong_shen__yong_shen_wx=DEL)
    add("ys-yw-null", yong_shen__yong_shen_wx=None)
    add("ys-xw-same", yong_shen__xi_shen_wx="水")
    add("ys-xw-none", yong_shen__xi_shen_wx="")
    add("ys-xw-missing", yong_shen__xi_shen_wx=DEL)
    add("ys-jw-none", yong_shen__ji_shen_wx="")
    add("ys-jw-missing", yong_shen__ji_shen_wx=DEL)
    add("ys-ana-ju", yong_shen__analysis="宜泄宜克。")
    add("ys-ana-bare", yong_shen__analysis="宜泄宜克")
    add("ys-ana-none", yong_shen__analysis="")
    # ⑦ 调候点睛：primary 有/无 × in_chart 真/假/缺
    add("th-none", tiaohou__primary="")
    add("th-missing", tiaohou__primary=DEL)
    add("th-in-missing", tiaohou__primary_in_chart=DEL)
    add("th-in-false", tiaohou__primary_in_chart=False)
    add("th-in-empty", tiaohou__primary_in_chart="")
    # ⑧ 格局亮点：matched 空/1/2/3 条（只用前 2）× auspicious 真/假/缺
    add("sp-empty", special_patterns__matched=[])
    add("sp-missing", special_patterns=DEL)
    add("sp-two", special_patterns__matched=[
        {"name": "魁罡格", "auspicious": True, "interpretation": "庚辰日生——刚断明敏。果决。"},
        {"name": "金神格", "auspicious": False, "interpretation": "无破折号的解读文本。"},
    ])
    add("sp-three", special_patterns__matched=[
        {"name": "甲", "auspicious": True, "interpretation": "x—y。z"},
        {"name": "乙", "auspicious": True, "interpretation": "x—y。z"},
        {"name": "丙", "auspicious": False, "interpretation": "x—y。z"},
    ])
    add("sp-nodash", special_patterns__matched=[
        {"name": "无破折号", "auspicious": True, "interpretation": "整段都是解读，没有破折号。"}])
    add("sp-noperiod", special_patterns__matched=[
        {"name": "无句号", "auspicious": None, "interpretation": "a—b"}])
    add("sp-aus-missing", special_patterns__matched=[
        {"name": "缺吉凶", "interpretation": "a—b。c"}])
    # ⑨ 支中动象：吉/忌四种组合
    add("rel-none", relations__summary__key_blessings=[], relations__summary__key_warnings=[])
    add("rel-bless", relations__summary__key_warnings=[])
    add("rel-warn", relations__summary__key_blessings=[])
    add("rel-missing", relations=DEL)
    add("rel-sum-missing", relations__summary=DEL)
    # ⑩ 当前运程段：available 假 → 整段不出现；流年 ganzhi 空 → 后半句不出现；
    #    suiyun_brief 空 / 短 / 超 40 码位（截断）
    add("cf-avail-false", current_fortune__available=False)
    add("cf-missing", current_fortune=DEL)
    add("cf-ln-ganzhi-empty", current_fortune__current_liunian__ganzhi="")
    add("cf-brief-empty", current_fortune__suiyun_brief="")
    add("cf-brief-short", current_fortune__suiyun_brief="短")
    add("cf-brief-long", current_fortune__suiyun_brief="长" * 41)
    add("cf-brief-40", current_fortune__suiyun_brief="长" * 40)
    add("cf-help-unknown", current_fortune__current_dayun__help="未知档")
    # ⑪ 一生大局的 four 档（quality 取自 `combos.geju_evaluation.quality`）
    for i, q in enumerate(("吉", "中", "凶", "", "其他", None)):
        add(f"tone-{i}-{q!r}", combos__geju_evaluation__quality=q)
    # ⑫ 无 pattern 时 headline 里 pattern 位置为空
    add("headline-nopat", pattern="", combos__geju_evaluation__pattern="")
    # ⑬ 五行值的畸形形态 —— 真实链路里恒为字符串，但基准对它们**又裸判真值又直接插值**
    #    （`if yw:` / `f"{yw}"` / `{jw or '—'}`），且 `xi != yong` 在 Python 是**值比较**：
    #    列表（`!=` 逐元素）、`{}`（Python 为假）、字典，都是只有合成族才碰得到的岔路。
    for i, v in enumerate(("水", ["水", "木"], {}, [], {"水": 1}, None, 0)):
        add(f"yw-{i}-{type(v).__name__}", yong_shen__yong_shen_wx=v)
    add("xw-eq-list", yong_shen__yong_shen_wx=["水", "木"], yong_shen__xi_shen_wx=["水", "木"])
    add("xw-eq-list-order", yong_shen__yong_shen_wx=["水", "木"],
        yong_shen__xi_shen_wx=["木", "水"])
    add("xw-eq-dict", yong_shen__yong_shen_wx={"水": 1}, yong_shen__xi_shen_wx={"水": 1})
    add("xw-empty-dict", yong_shen__xi_shen_wx={})
    add("xw-empty-list", yong_shen__xi_shen_wx=[])
    for i, v in enumerate(({}, [], ["土"], {"土": 1}, 0)):
        add(f"jw-{i}-{type(v).__name__}", yong_shen__ji_shen_wx=v)
    for i, v in enumerate((["水"], {}, [], {"水": 1}, 0)):
        add(f"thp-{i}-{type(v).__name__}", tiaohou__primary=v)
    add("th-in-dict", tiaohou__primary_in_chart={})
    add("th-in-list", tiaohou__primary_in_chart=[])
    # ⑭ 插值字段的非字符串形态（层 14 的 7920 例教训：基准 f-string 走 `str()`，
    #    JS 模板串不走 —— 只有**被拼进白话**的那一处才显形，结构字段两侧相同）
    add("dm-dict", day_master={"甲": 1}, day_master_wuxing={"木": 1})
    add("prof-dict", day_master_profile={"symbol": {"a": 1}, "core_traits": ["仁", "德"]})
    add("pat-dict", pattern={"a": 1}, combos__geju_evaluation__pattern={"a": 1})
    add("ps-dict", combos__geju_evaluation__status={"a": 1})
    add("sp-name-dict", special_patterns__matched=[
        {"name": {"a": 1}, "auspicious": True, "interpretation": "x—y。z"}])
    return out


# ─────────────────────────────────────────────────────────────
# 家族 sy —— 命局力量综合推理链
# ─────────────────────────────────────────────────────────────

def family_sy():
    out = []

    def add(cid, **patch):
        out.append({"kind": "sy", "id": cid, "in": {"chart": mk(**patch)}})

    # ① day_master 缺/空 → 直接 {available: False}
    add("dm-missing", day_master=DEL)
    add("dm-empty", day_master="")
    # ② 日主旺衰立基的三个字段形态
    add("si-missing", strength_info=DEL)
    add("si-il-missing", strength_info__monthly_status=DEL)
    add("si-il-empty", strength_info__monthly_status="")
    add("si-deling-missing", strength_info__deling=DEL)
    add("si-help-absent", strength_info__help_score=DEL, strength_info__drain_score=DEL)
    for i, v in enumerate((3, 0, "", None, "多")):
        add(f"si-help-{i}", strength_info__help_score=v)
    # ③ 格局成破：cheng_hit / po_hit 条数 × jiu 有无与长度
    for i in range(4):
        add(f"cheng-{i}", combos__geju_evaluation__cheng_hit=["成1"] * i)
    for i in range(3):
        add(f"po-{i}", combos__geju_evaluation__po_hit=["破1"] * i)
    add("po-jiu", combos__geju_evaluation__po_hit=["破格之象"], combos__geju_evaluation__jiu="救应：得印绶解之。")
    add("po-nojiu", combos__geju_evaluation__po_hit=["破格之象"], combos__geju_evaluation__jiu="")
    add("po-jiu-missing", combos__geju_evaluation__po_hit=["破格之象"],
        combos__geju_evaluation__jiu=DEL)
    add("cheng-hit-missing", combos__geju_evaluation__cheng_hit=DEL)
    add("cheng-hit-null", combos__geju_evaluation__cheng_hit=None)
    # `jiu[:60]` 的**码位**判据：59 / 60 / 61 码位，且含一个非 BMP 字（pyLen vs .length 的试金石）
    add("jiu-59", combos__geju_evaluation__po_hit=["破"], combos__geju_evaluation__jiu="𠮷" + "字" * 58)
    add("jiu-60", combos__geju_evaluation__po_hit=["破"], combos__geju_evaluation__jiu="𠮷" + "字" * 59)
    add("jiu-61", combos__geju_evaluation__po_hit=["破"], combos__geju_evaluation__jiu="𠮷" + "字" * 60)
    add("jiu-60-tailbmp", combos__geju_evaluation__po_hit=["破"], combos__geju_evaluation__jiu="字" * 59 + "𠮷")
    # ④ 用神 + 调候
    add("ys-none", yong_shen__yong_shen_wx="")
    add("ys-missing", yong_shen=DEL)
    add("ys-ana-long", yong_shen__analysis="甲" * 60)
    add("ys-ana-56", yong_shen__analysis="甲" * 56)
    add("ys-ana-missing", yong_shen__analysis=DEL)
    add("ys-list", yong_shen__yong_shen_wx=["水", "木"])
    add("th-none", tiaohou__primary="")
    add("th-missing", tiaohou=DEL)
    add("th-in-false", tiaohou__primary_in_chart=False)
    add("th-in-missing", tiaohou__primary_in_chart=DEL)
    # ⑤ 刑冲合害损益
    add("rel-missing", relations=DEL)
    add("rel-sum-missing", relations__summary=DEL)
    add("rel-c0x0h0", relations__summary={"total_chong": 0, "total_xing": 0, "total_he": 0,
                                          "key_warnings": [], "key_blessings": []})
    add("rel-c1x0", relations__summary={"total_chong": 1, "total_xing": 0, "total_he": 0,
                                        "key_warnings": ["⚠ 子午相冲"], "key_blessings": []})
    add("rel-c0x1", relations__summary={"total_chong": 0, "total_xing": 1, "total_he": 0,
                                        "key_warnings": [], "key_blessings": []})
    add("rel-nowarn", relations__summary={"total_chong": 2, "total_xing": 0, "total_he": 0,
                                          "key_warnings": [], "key_blessings": []})
    add("rel-h1nobless", relations__summary={"total_chong": 0, "total_xing": 0, "total_he": 1,
                                             "key_warnings": [], "key_blessings": []})
    add("rel-h1bless", relations__summary={"total_chong": 0, "total_xing": 0, "total_he": 1,
                                           "key_warnings": [], "key_blessings": ["✓ 寅亥六合"]})
    add("rel-bless-noprefix", relations__summary={"total_chong": 0, "total_xing": 0, "total_he": 1,
                                                  "key_warnings": [], "key_blessings": ["寅亥六合"]})
    add("rel-warn-noprefix", relations__summary={"total_chong": 1, "total_xing": 0, "total_he": 0,
                                                 "key_warnings": ["子午相冲"], "key_blessings": []})
    # ⑥ 当前运程（后天）：三种 help × 流年有无 × current_year 形态
    add("cf-missing", current_fortune=DEL)
    add("cf-avail-false", current_fortune__available=False)
    add("cf-help-fu", current_fortune__current_dayun__help="扶用")
    add("cf-help-ji", current_fortune__current_dayun__help="助忌")
    add("cf-help-other", current_fortune__current_dayun__help="其他")
    add("cf-help-missing", current_fortune__current_dayun__help=DEL)
    add("cf-ln-ganzhi-empty", current_fortune__current_liunian__ganzhi="")
    add("cf-ln-missing", current_fortune__current_liunian=DEL)
    add("cf-year-missing", current_fortune__current_year=DEL)
    add("cf-year-null", current_fortune__current_year=None)
    add("cf-year-str", current_fortune__current_year="2026")
    add("cf-dy-ganzhi-empty", current_fortune__current_dayun__ganzhi="")

    # ⑧ 畸形值 —— 真实链路里这些字段恒为字符串，但它们既被**裸判真值**又被**直接插值**
    #    （`if yw:` / `f"用神取{yw}"` / `f"月令{im or '—'}"`），只有合成族能碰到岔路。
    for i, v in enumerate(("水", ["水", "木"], {}, [], {"水": 1}, None, 0)):
        add(f"yw-{i}-{type(v).__name__}", yong_shen__yong_shen_wx=v)
    for i, v in enumerate(({}, [], ["土"], {"土": 1}, 0)):
        add(f"jw-{i}-{type(v).__name__}", yong_shen__ji_shen_wx=v)
    for i, v in enumerate((None, {}, [], 0, ["旺"])):
        add(f"im-{i}-{type(v).__name__}", strength_info__monthly_status=v)
    # ⚠ `analysis` 的**非空字典**不进这一族：基准那一行是 `(ys.get("analysis","") or "")[:56]`,
    #   `{"a":1}` 是真值、于是走到**字典上切片** `KeyError: slice(None, 56, None)` ——
    #   基准当场抛，两侧都是「炸」，验不出移植对错（真正该验的是「基准活下来时两边是否一致」）。
    for i, v in enumerate(({}, [], 0, None)):
        add(f"ana-{i}-{type(v).__name__}", yong_shen__analysis=v)
    for i, v in enumerate(({}, [], {"a": 1}, 0, None)):
        add(f"pat-{i}-{type(v).__name__}", combos__geju_evaluation__pattern=v)

    # ⑦ **分值边界**：把 (成格数, 破格数, 调候到位, 冲刑有无, 合有无) 全交叉，
    #    保证 -3 / -1 / 1 / 4 四个分档阈值两侧都有样本 —— 没有这一族，
    #    「命局受损」「命局上佳」两个极端标签可能一次都没跑过（检查从没报过 = 没检查）。
    n = 0
    for nc, np_, thin, has_ch, has_he in itertools.product((0, 1, 2, 3), (0, 1, 2),
                                                           (True, False), (0, 1), (0, 1)):
        add(f"score-{n}",
            combos__geju_evaluation__cheng_hit=["成"] * nc,
            combos__geju_evaluation__po_hit=["破"] * np_,
            tiaohou__primary_in_chart=thin,
            relations__summary={"total_chong": has_ch, "total_xing": 0, "total_he": has_he,
                                "key_warnings": ["⚠ 冲"] if has_ch else [],
                                "key_blessings": ["✓ 合"] if has_he else []})
        n += 1
    return out


# ─────────────────────────────────────────────────────────────
# 家族 ms —— 综合论断（总汇合参）
# ─────────────────────────────────────────────────────────────

def family_ms():
    out = []
    MOMS = moments()

    def add(cid, mi, **patch):
        out.append({"kind": "ms", "id": cid,
                    "in": {"chart": mk(**patch), "moment": MOMS[mi]}})

    # ① 双重不可用 → 早退 {available: False}
    add("early-out", 0, overview={"available": False}, mingju_synthesis={"available": False})
    add("early-out-missing", 0, overview=DEL, mingju_synthesis=DEL)
    add("early-out-null", 0, overview=None, mingju_synthesis=None)
    # ② 只有 overview / 只有 synthesis（ming_quality 的取法随之不同）
    add("only-ov", 0, mingju_synthesis=DEL)
    add("only-ov-false", 0, mingju_synthesis={"available": False})
    add("only-sy", 0, overview=DEL)
    add("only-sy-no-quality", 0, overview=DEL, mingju_synthesis__composite_label="")
    # ③ 各域缺席：单个缺席 / 全缺 / 缺键 / 置 None
    for dom in ("career", "wealth", "health", "marriage"):
        add(f"no-{dom}", 0, **{f"life_aspects__{dom}": {}})
    for dom in ("career", "wealth", "health", "marriage"):
        add(f"miss-{dom}", 0, **{f"life_aspects__{dom}": DEL})
    for dom in ("career", "wealth", "health", "marriage"):
        add(f"null-{dom}", 0, **{f"life_aspects__{dom}": None})
    add("no-aspects", 0, life_aspects={})
    add("no-aspects-missing", 0, life_aspects=DEL)
    add("no-aspects-null", 0, life_aspects=None)
    # ④ career 的 career_fields：列表（0/1/3/5 条）/ 非列表（str/dict/int）
    for i in range(6):
        add(f"cf-fields-{i}", 0, life_aspects__career__career_fields=["行业"] * i)
    add("cf-fields-str", 0, life_aspects__career__career_fields="水利航运贸易教育文化传媒")
    add("cf-fields-dict", 0, life_aspects__career__career_fields={"a": 1})
    add("cf-fields-int", 0, life_aspects__career__career_fields=7)
    add("cf-fields-missing", 0, life_aspects__career__career_fields=DEL)
    add("cf-fields-null", 0, life_aspects__career__career_fields=None)
    # ⑤ shishen_advice：列表 / 非列表 / 空形态 / 超 24 码位
    add("cf-adv-empty", 0, life_aspects__career__shishen_advice=[])
    add("cf-adv-str", 0, life_aspects__career__shishen_advice="以正官为用")
    add("cf-adv-long", 0, life_aspects__career__shishen_advice=["宜" * 30])
    add("cf-adv-missing", 0, life_aspects__career__shishen_advice=DEL)
    add("cf-adv-none", 0, life_aspects__career__shishen_advice=None)
    add("cf-adv-dict", 0, life_aspects__career__shishen_advice={"a": 1})
    # ⑥ 各域 advice 的「空容器」两态 —— Python 里 `[]`/`{}` 为假、JS 为真（`pyTruthy` 的靶子）
    for tag, v in (("empty-list", []), ("empty-dict", {}), ("empty-str", ""),
                   ("none", None), ("missing", DEL), ("text", "宜稳中求进。")):
        add(f"w-adv-{tag}", 0, life_aspects__wealth__advice=v)
    for tag, v in (("empty-list", []), ("empty-dict", {}), ("empty-str", ""),
                   ("none", None), ("missing", DEL), ("text", "宜珍惜眼前人。")):
        add(f"m-adv-{tag}", 0, life_aspects__marriage__advice=v)
    for tag, v in (("empty-list", []), ("empty-dict", {}), ("empty-str", ""),
                   ("none", None), ("missing", DEL)):
        add(f"h-adv-{tag}", 0, life_aspects__health__advice=v)
    # ⑦ 各域的 quality/level 值域（`_grade_to_q` 的吉/凶关键字命中与都不中）
    for i, q in enumerate(("婚姻宫平稳，婚缘较好，感情稳定", "日支受冲，婚姻多波折", "姻缘上佳",
                           "日支六合，姻缘和合", "", None, "平平")):
        add(f"m-q-{i}-{q!r}", 0, life_aspects__marriage__quality=q)
    for i, lv in enumerate(("财运丰厚", "财运稳健", "财来财去", "财运平稳", "", None, "怪档")):
        add(f"w-lv-{i}-{lv!r}", 0, life_aspects__wealth__level=lv)
    for i, c in enumerate(("偏旺", "受损", "中和", "", None, "极佳")):
        add(f"h-cond-{i}-{c!r}", 0, life_aspects__health__dm_condition=c)
    for i, a in enumerate(("日主甲，五行属木，身强。宜从事水行业，宜守正。", "日主受损", ["弱"], [], None, "")):
        add(f"c-ana-{i}-{type(a).__name__}", 0, life_aspects__career__analysis=a)
    for i, a in enumerate(("木旺克土。", "脾受损", ["弱"], [], None, "")):
        add(f"h-ana-{i}-{type(a).__name__}", 0, life_aspects__health__analysis=a)
    # ⑧ 婚姻的冲/合三态（含键缺）
    add("m-clash", 0, life_aspects__marriage__clash_present=True,
        life_aspects__marriage__harmony_present=False)
    add("m-both", 0, life_aspects__marriage__clash_present=True,
        life_aspects__marriage__harmony_present=True)
    add("m-neither", 0, life_aspects__marriage__clash_present=False,
        life_aspects__marriage__harmony_present=False)
    add("m-flags-missing", 0, life_aspects__marriage__clash_present=DEL,
        life_aspects__marriage__harmony_present=DEL)
    add("m-flags-empty", 0, life_aspects__marriage__clash_present="",
        life_aspects__marriage__harmony_present=[])
    add("m-flags-dict", 0, life_aspects__marriage__clash_present={},
        life_aspects__marriage__harmony_present={"a": 1})
    # ⑨ 健康域的三个回显字段
    add("h-weak-none", 0, life_aspects__health__weak_organ="")
    add("h-weak-missing", 0, life_aspects__health__weak_organ=DEL)
    add("h-organ-missing", 0, life_aspects__health__dm_organ=DEL)
    add("h-organ-empty", 0, life_aspects__health__dm_organ="")
    # ⑩ 运程维度：available 假 → 无此维；help 四态；流年 quality 三态 + 键缺（默认「中」）
    add("yun-no-cf", 0, current_fortune={"available": False})
    add("yun-cf-missing", 0, current_fortune=DEL)
    add("yun-cf-null", 0, current_fortune=None)
    for i, h in enumerate(("扶用", "助忌", "中性", "", None, "怪")):
        add(f"yun-help-{i}-{h!r}", 0, current_fortune__current_dayun__help=h)
    for i, q in enumerate(("吉", "中", "凶", "", None)):
        add(f"yun-q-{i}-{q!r}", 0, current_fortune__current_liunian__quality=q)
    add("yun-q-missing", 0, current_fortune__current_liunian__quality=DEL)
    add("yun-ln-missing", 0, current_fortune__current_liunian=DEL)
    add("yun-dy-ganzhi-missing", 0, current_fortune__current_dayun__ganzhi=DEL)
    add("yun-year-missing", 0, current_fortune__current_year=DEL)
    add("yun-year-none", 0, current_fortune__current_year=None)
    # ⑪ 当下维度：用神五行 × 此刻时空的四种 tone（见 moments()）
    for i in range(len(MOMS)):
        add(f"moment-{i}", i)
    add("moment-no-yong", 1, yong_shen__yong_shen_wx="", overview__yong_shen_wx="",
        mingju_synthesis__yong_shen_wx="")
    add("moment-yong-list", 2, mingju_synthesis__yong_shen_wx=["水", "木"])
    add("moment-yong-dict", 3, mingju_synthesis__yong_shen_wx={"水": 1})
    add("moment-fallback-ov", 4, mingju_synthesis__yong_shen_wx="",
        overview__yong_shen_wx="水", overview__ji_shen_wx="土")
    # ⑫ 三个档位的分派：ming_quality 吉/凶/中 × 各域均值的三个区间
    for (mq, doms) in (
        ("吉", ["吉", "吉", "吉", "吉"]),      # avg 2.0 → 吉
        ("吉", ["吉", "吉", "中", "中"]),      # avg 1.5 → 吉
        ("吉", ["吉", "中", "中", "中"]),      # avg 1.25 → 中（**低于 1.3**）
        ("中", ["吉", "吉", "吉", "吉"]),      # ming 非吉 → 中
        ("凶", ["吉", "吉", "吉", "吉"]),      # ming 凶 → 凶
        ("中", ["中", "中", "凶", "凶"]),      # avg 0.5 → 凶
        ("中", ["中", "凶", "中", "中"]),      # avg 0.75 → 中（**不低于 0.7**）
        ("中", ["吉", "凶", "中", "中"]),      # avg 1.0 → 中
        ("吉", ["凶", "凶", "凶", "凶"]),      # avg 0.0 → 凶（ming 吉也压不住）
    ):
        add(f"overall-{mq}-{''.join(doms)}", 0,
            overview__quality=mq,
            life_aspects__career__analysis=q_analysis(doms[0]),
            life_aspects__wealth__level=q_level(doms[1]),
            life_aspects__health__dm_condition=q_cond(doms[2]),
            life_aspects__marriage__quality=q_quality(doms[3]))
    # ⑬ 无任何专域时 domain_qs 为空 → avg = 1
    add("overall-no-doms", 0, life_aspects={})
    # ⑬′ 维数谱 0..6 全出场：维数 = 专域数(k) + 运程 + 当下，故
    #     k=2 → 4 维、k=3 → 3 维（③ 只有 k=1 与 k=4，3/4 两档原本没样本）；
    #     k=4 且运程不挂 → 只剩「当下」1 维；再用会触发 swallow 的 moment(22) 把「当下」也去掉 → 0 维
    #     （0 维那一支才有「只剩命局那一段」的输出形态，段落拼接的另一半）。
    add("dim-4", 0, life_aspects__career={}, life_aspects__wealth={})
    add("dim-3", 0, life_aspects__career={}, life_aspects__wealth={}, life_aspects__health={})
    add("dim-1", 0, life_aspects={}, current_fortune={"available": False})
    add("dim-0", 22, life_aspects={}, current_fortune={"available": False})
    # ⑭ 婚姻为凶 → 总建议多一句。（⚠ 先前这里手写「日支受冲，婚姻多波折」，**判不出「凶」**
    #    —— 它一个凶关键字都不含，于是这一支根本没被逼出来，断言当场红。用 q_quality 定向造句。）
    add("advice-marriage-xiong", 0, life_aspects__marriage__quality=q_quality("凶"))
    add("advice-marriage-ji", 0, life_aspects__marriage__quality=q_quality("吉"))
    # ⑮ ming_label / day_master 的回退：synthesis 无 composite_label 时取 overview.quality
    add("label-fallback", 0, mingju_synthesis__composite_label="",
        mingju_synthesis__composite_desc="")
    add("label-desc-missing", 0, mingju_synthesis__composite_desc=DEL)
    add("dm-from-sy", 0, overview__day_master="")           # 回退到 synthesis 的 day_master
    add("dm-both-empty", 0, overview__day_master="", mingju_synthesis__day_master="")
    # ⑯ 用神/忌神五行的畸形形态 —— 这一族的靶子是**三处语义**：
    #    ① `synth.get(...) or overview.get(...)` 是 Python 的 `or`（空容器要**退**到后者）；
    #    ② `_txt`/`stripChar` 之前的插值走 `str()`；
    #    ③ 五行进了 `moment_vs_yongshen` 的 `"、".join` / `_SHENG.get` —— 见 ⑪ 那两条。
    for tag, v in (("empty-dict", {}), ("empty-list", []), ("dict", {"水": 1}),
                   ("list", ["水"]), ("zero", 0), ("none", None)):
        add(f"yongw-{tag}", 1, mingju_synthesis__yong_shen_wx=v)
        add(f"yongw-ov-{tag}", 1, mingju_synthesis__yong_shen_wx=DEL,
            overview__yong_shen_wx=v)
    add("jiw-ov-empty-dict", 1, mingju_synthesis__ji_shen_wx=DEL, overview__ji_shen_wx={})
    add("jiw-ov-empty-list", 1, mingju_synthesis__ji_shen_wx=DEL, overview__ji_shen_wx=[])
    add("mingq-dict", 1, mingju_synthesis__composite_label={"a": 1})
    add("dm-dict", 1, overview__day_master={"甲": 1}, mingju_synthesis__day_master="")
    return out


def q_analysis(q):
    """把一个「吉/中/凶」档翻成能过 `_grade_to_q` 的专域文案。

    ⚠ 「吉」这一档**真实链路到不了**：`career_analysis` 的正文是
    `日主X，五行属Y，{strength}。宜从事A行业，B。` —— 命中 `_grade_to_q` 吉关键字的
    一个都没有（`身强` 里的「强」不在表内，只有 `身弱` 的「弱」在**凶**表里）。
    故事业域在真实数据里只出「中」与「凶」。此处定向造句，把「吉」这一档逼出来。
    """
    return {"吉": "上佳之象", "中": "平平", "凶": "受损之象"}[q]


def q_level(q):
    """财运档。真实四档是 财运丰厚/稳健/财来财去/平稳 —— 实测**四档全判「中」**
    （我先前以为「丰厚」会命中吉关键字，没有：`_grade_to_q` 的吉表里是「富」，
    「丰厚」不含「富」）。四档也都没命中凶表。故「吉」「凶」两档都只能定向造句。

    ⚠ 这条「实测算出来」与「我以为」的差别，正是 ⑥ 里那条断言的由来：
    基准改一个字，那条断言当场红 —— 这比注释可靠（注释不会有人跑）。"""
    return {"吉": "财运丰厚", "中": "财运平稳", "凶": "财运受损"}[q]


def q_cond(q):
    return {"吉": "极佳", "中": "中和", "凶": "受损"}[q]


def q_quality(q):
    """婚姻档。真实四条（`applications.py:156-162`）**全部判「中」** ——
    「日支受冲，婚姻易有波折，需多包容沟通」里的「波折」不是「破」，
    「日支六合，婚姻和谐」里的「和谐」不是「和合」。后果：`master_synthesis` 里
    「婚姻一域尤须留意刑冲」那句追加建议在真实数据上**永远不触发**。
    此处定向造句逼出「凶」这一档（并在 self_check 里把上述可达性写成断言）。"""
    return {"吉": "姻缘上佳", "中": "平平", "凶": "婚姻受损"}[q]


# ─────────────────────────────────────────────────────────────
# 家族 asm —— 完整装配（走真端点）
# ─────────────────────────────────────────────────────────────

# 离交节、离子时都远的出生时刻：两侧历书在这批样例上给出同一张盘（逐例断言）。
# 预期四柱由**本项目的 `ganzhi.js` 独立算出**（不是从 shushu 抄的）—— 断言于是成为
# 「两侧历书在这几个时刻上是否同盘」的独立核对，而不是自证。
ASM_BIRTHS = [
    # (年, 月, 日, 时, 分, 性别, 预期四柱)
    (1984, 6, 15, 12, 0, "male",   ["甲子", "庚午", "庚辰", "壬午"]),
    (1990, 3, 20, 9, 30, "female", ["庚午", "己卯", "甲申", "己巳"]),
    (2000, 9, 10, 15, 20, "male",  ["庚辰", "乙酉", "辛未", "丙申"]),
    (2024, 6, 10, 6, 0, "female",  ["甲辰", "庚午", "乙巳", "己卯"]),
]

# 全部落在 2026 之后的大运 → 端点内 current_year=2026 时走「未交运」那一支（pre_yun=True）。
CF_DAYUN_FUTURE = [
    {"tiangan": "戊", "dizhi": "辰", "start_age": 45, "end_age": 54,
     "start_year": 2035, "end_year": 2044, "dm_shishen": "偏财", "quality": "平", "warning": ""},
    {"tiangan": "己", "dizhi": "巳", "start_age": 55, "end_age": 64,
     "start_year": 2045, "end_year": 2054, "dm_shishen": "正财", "quality": "吉", "warning": ""},
]


def family_asm():
    """`in` 里只有 JS 侧**真正会读**的键：`y/mo/d/h/mi/gender/currentFortune/moment`
    （`gz` 供断言、`inject` 供金标准自己用 —— 这两个 JS 侧不读，runner 里有对应注释）。
    `currentFortune` 在 `run_asm` 里回填：它是**基准端点算出来的那一块**，
    JS 侧只负责「把它挂上去并让下游消费」，故必须由金标准给出。"""
    out = []
    for i, (y, mo, d, h, mi, g, gz) in enumerate(ASM_BIRTHS):
        base = {"y": y, "mo": mo, "d": d, "h": h, "mi": mi, "gender": g, "gz": gz}
        # (a) 注入了大运/流年 + 此刻 → 十件应齐全
        out.append({"kind": "asm", "id": f"full-{i}",
                    "in": dict(base, inject={"dayun": CF_DAYUN, "liunian": CF_LIUNIAN},
                               moment=moments()[i % 16])})
        # (b) 大运列表为空 → `current_fortune` 不挂，其余九件仍应齐全
        out.append({"kind": "asm", "id": f"nocf-{i}",
                    "in": dict(base, inject={"dayun": [], "liunian": CF_LIUNIAN},
                               moment=moments()[i])})
        # (c) 大运全在 2026 之后 → 端点的 current_year 仍写死 2026 → 走「未交运」(pre_yun)
        out.append({"kind": "asm", "id": f"preyun-{i}",
                    "in": dict(base, inject={"dayun": CF_DAYUN_FUTURE, "liunian": CF_LIUNIAN},
                               moment=moments()[i + 3])})
    # (d) gender 取「男/女」两值：`life_aspects.marriage` 的配偶星判定随之不同
    for i, g in enumerate(("male", "female", "男", "女")):
        y, mo, d, h, mi, _, gz = ASM_BIRTHS[0]
        out.append({"kind": "asm", "id": f"gender-{i}-{g}",
                    "in": {"y": y, "mo": mo, "d": d, "h": h, "mi": mi, "gender": g, "gz": gz,
                           "inject": {"dayun": CF_DAYUN, "liunian": CF_LIUNIAN},
                           "moment": moments()[5]}})
    return out


# ─────────────────────────────────────────────────────────────
# 运行
# ─────────────────────────────────────────────────────────────

def _build_cf_chart(i):
    """`cf` 族的盘：干支 → 盘 → analyze_chart（与 JS 侧同构），再挂上用例给的 yong_shen。"""
    ch = chart_from_gz(i["gz"])
    analyze_chart(ch)
    if "yong_shen" in i:
        ch["yong_shen"] = json.loads(json.dumps(i["yong_shen"], ensure_ascii=False))
    return ch


def _assert_pillars(chart, gz, cid):
    """断言端点起出的盘就是本族预期的四柱 —— 两侧历书在这批样例上没分叉。"""
    got = [chart[k]["tiangan"] + chart[k]["dizhi"]
           for k in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")]
    assert got == gz, f"{cid}: 端点四柱 {got} ≠ 预期 {gz}（交节/子时附近的样例不能用）"


def _clone(x):
    return json.loads(json.dumps(x, ensure_ascii=False))


def run_asm(i, cid):
    """走真端点。逐例：注入大运流年与此刻时空，再把端点算出的 `current_fortune`
    **回填进用例**（给 JS 侧用），返回十个挂载点的值（未挂 = None）。"""
    req = BaziRequest(year=i["y"], month=i["mo"], day=i["d"], hour=i["h"],
                      minute=i["mi"], gender=i["gender"], is_lunar=False,
                      use_true_solar_time=False)
    dy = _clone(i["inject"]["dayun"])
    ln = _clone(i["inject"]["liunian"])
    CF.calculate_dayun = lambda chart, gender, birth_year, _d=dy: _clone(_d)
    CF.calculate_liunian = lambda chart, gender, birth_year, sy, ey, _l=ln: _clone(_l)
    CM.current_sizhu = lambda *a, **k: _clone(i["moment"])
    resp = asyncio.run(get_chart(req))
    assert resp.success, f"{cid}: 端点返回 success=False"
    chart = resp.data
    _assert_pillars(chart, i["gz"], cid)
    i["currentFortune"] = chart.get("current_fortune")      # ← 回填，见 family_asm 的说明
    return {k: chart.get(k) for k in _ASM_KEYS}


def run_case(c):
    k, i = c["kind"], c["in"]
    if k == "cf":
        # 大运/流年列表**由用例给、原样传给基准**（见文件头「为什么要注入」）：
        # 与本项目 `pickCurrentFortune(..., dayun, liunian)` 的显式传参逐一对齐。
        dy = _clone(i.get("dayun", []))
        ln = _clone(i.get("liunian", []))
        CF.calculate_dayun = lambda chart, gender, birth_year, _d=dy: _clone(_d)
        CF.calculate_liunian = lambda chart, gender, birth_year, sy, ey, _l=ln: _clone(_l)
        return {"cf": CF.build_current_fortune(_build_cf_chart(i), i["gender"],
                                              i.get("birthYear"), i["currentYear"])}
    if k == "ov":
        return {"ov": synthesize_overview(_clone(i["chart"]))}
    if k == "sy":
        return {"sy": synthesize_mingju(_clone(i["chart"]))}
    if k == "ms":
        CM.current_sizhu = lambda *a, **kk: _clone(i["moment"])
        return {"ms": build_master_synthesis(_clone(i["chart"]))}
    if k == "asm":
        return run_asm(i, c["id"])
    raise AssertionError(f"未知 kind：{k}")


def canon(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 分支指纹与计数（比对器会**独立重写**这两支，改动前先读 diff 的文件头）
# ─────────────────────────────────────────────────────────────

def _tf(v):
    """语言中立的布尔编码 —— 绝不用 `str(True)`（Python `True` vs JS `true`）。"""
    return "T" if v else "F"


# ⚠⚠ 下面 `_repr` 的**编码方案**与段名、段序，是和比对器共用的**定义**，不是风格选择。
#    比对器会独立重算这一串并逐例比对；改了这里的方案（例如把 `I2026` 改回 `2026`），
#    结果不是「更整齐」，而是**每一例都报差异**。层 14 的 `count_of` 就是栽在这上面
#    （我把键序「顺手改整齐」，34323 例全红）。
#    可以各自写不同的**实现**，但定义必须一致。所以：动这里之前先看 `diff_bazi_assembly.py`。
def _repr(v):
    """判定字段的语言中立回显：类型前缀 + repr。

    为什么要类型前缀：`current_year` 在基准那边可能是整数、在容错分支里可能是字符串，
    裸 repr 会把 `1` 与 `"1"` 写成同一个字符，把「该判的分支」藏起来。
    """
    if v is None:
        return "N"
    if isinstance(v, bool):
        return "B" + _tf(v)
    if isinstance(v, int):
        return f"I{v}"
    if isinstance(v, float):
        return f"F{v!r}"
    if isinstance(v, str):
        return f"S{v!r}"
    if isinstance(v, list):
        return f"L{v!r}"
    if isinstance(v, dict):
        return f"D{v!r}"
    raise AssertionError(f"没见过的类型：{type(v).__name__}")


def flags_of(kind, out):
    # ⚠⚠ 段名/段序/段内编码是与 `diff_bazi_assembly.py::flag_of` **共享的契约**，
    #   不是被验对象。改动此处必须同步改比对器 —— 否则会造出一整族**假红**
    #   （本层真实发生过一次：`sy` 的 `score` 段两边位置不同 → 180 例假差异）。
    if kind == "cf":
        cf = out["cf"]
        if not cf.get("available"):
            return "unavailable"
        cdy = cf.get("current_dayun", {}) or {}
        cln = cf.get("current_liunian")
        su = cf.get("suiyun") or {}
        seg = []
        for nm, v in (("pre", cf.get("pre_yun")), ("help", cdy.get("help")),
                      ("dy", cdy.get("ganzhi")), ("ln", (cln or {}).get("ganzhi"))):
            seg.append(nm + "=" + (_tf(v) if nm == "pre" else _repr(v)))
        seg.append("hasln=" + _tf(cln is not None))
        seg.append("tags=" + ",".join(su.get("tags") or []))
        seg.append("yr=" + _repr(cf.get("current_year")))
        seg.append("recent=" + str(len(cf.get("recent_years") or [])))
        return "|".join(seg)
    if kind == "ov":
        ov = out["ov"]
        if not ov.get("available"):
            return "unavailable"
        seg = []
        for nm, key in (("q", "quality"), ("hl", "headline"), ("dm", "day_master"),
                        ("pat", "pattern"), ("ps", "pattern_status"),
                        ("yw", "yong_shen_wx"), ("jw", "ji_shen_wx")):
            seg.append(nm + "=" + _repr(ov.get(key)))
        seg.append("titles=" + ",".join(p.get("title", "") for p in ov.get("paragraphs") or []))
        seg.append("vl=" + _repr(ov.get("verdict_line")))
        return "|".join(seg)
    if kind == "sy":
        sy = out["sy"]
        if not sy.get("available"):
            return "unavailable"
        fs = sy.get("factors") or []
        seg = []
        for nm, key in (("dm", "day_master"), ("label", "composite_label"),
                        ("st", "strength"), ("pat", "pattern"),
                        ("yw", "yong_shen_wx"), ("jw", "ji_shen_wx")):
            seg.append(nm + "=" + _repr(sy.get(key)))
        seg.append("score=" + str(sy.get("composite_score")))
        seg.append("mods=" + ",".join(x.get("module", "") for x in fs))
        seg.append("pols=" + ",".join(x.get("polarity", "") for x in fs))
        seg.append("hasnote=" + _tf(sy.get("current_fortune_note") != ""))
        return "|".join(seg)
    if kind == "ms":
        ms = out["ms"]
        if not ms.get("available"):
            return "unavailable"
        dvs = ms.get("dimension_verdicts") or []
        seg = []
        for nm, key in (("oq", "overall_quality"), ("hl", "headline"),
                        ("ml", "ming_label"), ("dm", "day_master")):
            seg.append(nm + "=" + _repr(ms.get(key)))
        seg.append("doms=" + ",".join(f"{d.get('domain')}{d.get('quality')}" for d in dvs))
        seg.append("paras=" + str(len(ms.get("integrated_paragraphs") or [])))
        seg.append("advlen=" + str(len(ms.get("master_advice") or "")))
        return "|".join(seg)
    if kind == "asm":
        return "|".join(f"{k}=" + ("-" if out.get(k) is None else "P") for k in _ASM_KEYS)
    raise AssertionError(kind)


def counts_of(kind, out):
    if kind == "cf":
        cf = out["cf"]
        if not cf.get("available"):
            return [0, 0, 0, 0, -1, -1]
        su = cf.get("suiyun") or {}
        return [len(cf), len(cf.get("current_dayun") or {}),
                len(cf.get("current_liunian") or {}), len(cf.get("recent_years") or []),
                len(su.get("tags") or []), len(su.get("notes") or [])]
    if kind == "ov":
        ov = out["ov"]
        return [len(ov), len(ov.get("paragraphs") or []),
                sum(len(p.get("text") or "") for p in ov.get("paragraphs") or [])]
    if kind == "sy":
        sy = out["sy"]
        if not sy.get("available"):
            return [0, 0, 0, 0, 0]
        ge = (sy.get("factors") or [])
        return [len(sy), len(ge), len(sy.get("chain_text") or ""),
                len(sy.get("composite_desc") or ""), len(sy.get("current_fortune_note") or "")]
    if kind == "ms":
        ms = out["ms"]
        if not ms.get("available"):
            return [0, 0, 0, 0]
        dvs = ms.get("dimension_verdicts") or []
        return [len(ms), len(dvs), sum(len(d.get("verdict") or "") for d in dvs),
                len(ms.get("integrated_paragraphs") or [])]
    if kind == "asm":
        return [sum(1 for k in _ASM_KEYS if out.get(k) is not None)] + [
            (len(out[k]) if out.get(k) is not None else 0) for k in _ASM_KEYS]
    raise AssertionError(kind)


# ─────────────────────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_assembly.json"))
    a = ap.parse_args()

    cases = family_cf() + family_ov() + family_sy() + family_ms() + family_asm()

    digest, flags, counts, hist = {}, [], [], {}
    shapes, full = {}, []
    for idx, c in enumerate(cases):
        out = run_case(c)
        assert list(out.keys()) == FAMILIES[c["kind"]], f"{c['id']} 输出键不契约：{list(out)}"
        for name, ob in out.items():
            if ob is None:                       # `asm` 族「没挂上」的键
                continue
            ks = sorted(ob.keys())
            slot = shapes.setdefault(c["kind"], {}).setdefault(name, [])
            if ks not in slot:
                slot.append(ks)
        digest[str(idx)] = [sha(canon(out[o])) for o in FAMILIES[c["kind"]]]
        f = flags_of(c["kind"], out)
        flags.append(f)
        counts.append(counts_of(c["kind"], out))
        hist[c["kind"]] = hist.get(c["kind"], {})
        hist[c["kind"]][f] = hist[c["kind"]].get(f, 0) + 1
        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"idx": idx, "kind": c["kind"], "id": c["id"], "out": out})

    doc = {
        "meta": {
            "layer": "3.5.4b 总断那一串（当前运程 + 命局总论 + 推理链 + 综合论断 + 完整装配）",
            "source": "shushu core/bazi/{current_fortune,overview,synthesis,master_synthesis}.py"
                      " + api/bazi.py:get_chart",
            "n_cases": len(cases),
            "families": FAMILIES,
            "kinds": dict(Counter(c["kind"] for c in cases)),
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "norm": "零归一。逐例可用性与分支都由用例本身决定（假值/空容器/缺键都是**输入**），"
                    "不靠「两侧都算不出所以跳过」。进程哈希顺序无影响：本层所有遍历要么按列表序、"
                    "要么按 sorted()，且已用 PYTHONHASHSEED=0/1 复跑核对逐字节相同。",
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
    for k, h in sorted(hist.items()):
        print(f"  {k:<4} {len(h)} 种分支码（条目合计 {sum(h.values())}）")
    self_check(cases)


def self_check(cases):
    R = [(c, run_case(c)) for c in cases]

    # ① cf：不可用样本**恰好**是这几个 —— 不写「够多就行」：`bornYear=-1` 是**真值**
    #    （`-1` 在 Python 里为真），故它必须在可用的那一侧；写成 `n_un >= 8` 只会
    #    让我以为「还差两条」，而真相是我对「假值」的枚举少了一个。
    cf = {c["id"]: r["cf"] for c, r in R if c["kind"] == "cf"}
    UNAVAIL = {"by0-0", "by1-None", "by3-False", "by-missing", "dy-empty", "dy-missing"}
    got_un = {cid for cid, v in cf.items() if not v.get("available")}
    assert got_un == UNAVAIL, \
        f"cf 不可用集合变了：多出 {sorted(got_un - UNAVAIL)}，少了 {sorted(UNAVAIL - got_un)}"
    assert cf["by2--1"].get("available"), "cf：birthYear=-1 是真值，这个盘应当**可用**"
    assert any(v.get("pre_yun") for v in cf.values()), "cf：未交运（pre_yun=True）没出场"
    assert any(v.get("current_liunian") is None for v in cf.values()), "cf：流年取不到（None）没出场"
    helps = {(v.get("current_dayun") or {}).get("help") for v in cf.values() if v.get("available")}
    assert helps == {"扶用", "助忌", "中性", None}, f"cf：大运扶抑四态没跑全：{helps}"
    briefs = {v.get("suiyun_brief") for v in cf.values() if v.get("available")}
    assert "" in briefs and any(b for b in briefs), "cf：岁运简语的空/非空两态没跑全"
    tagsets = {tuple((v.get("suiyun") or {}).get("tags") or []) for v in cf.values()
               if v.get("available")}
    assert len(tagsets) >= 4, f"cf：岁运标签谱太窄：{tagsets}"
    print(f"  ✓ cf：可用 {sum(1 for v in cf.values() if v.get('available'))}/{len(cf)}，"
          f"扶抑四态齐、岁运标签 {len(tagsets)} 种、pre_yun 与「流年 None」均出场")

    # ② ov：四档语气的**全部**都要出场（含「其他档 → 兜底文案]）
    ov = {c["id"]: r["ov"] for c, r in R if c["kind"] == "ov"}
    assert all(v.get("available") for v in ov.values()), "ov：有样例判成了不可用（不该）"
    tones = {v.get("verdict_line") for v in ov.values()}
    assert len(tones) == 4, f"ov：一生大局的语气档没跑全（应 4 种，实得 {len(tones)}）"
    ling = set()
    for v in ov.values():
        p = (v.get("paragraphs") or [{}])[0].get("text", "")
        for tag in ("得令当时", "得气不得令", "失令"):
            if tag in p:
                ling.add(tag)
    assert ling == {"得令当时", "得气不得令", "失令"}, f"ov：三种「令」态没跑全：{ling}"
    titles = {t for v in ov.values() for t in (p.get("title") for p in v.get("paragraphs") or [])}
    for t in ("日主立命", "格局成破", "用神趋避", "格局亮点", "支中动象", "当前运程", "一生大局"):
        assert t in titles, f"ov：段「{t}」一次都没出场"
    # headline 缺 pattern 那一支。⚠ 先前这里是 `count("·") == 1` —— **一条永远为假的断言**：
    # headline 的模板固定是 `{日主}·{强弱}·{格局}（{成破}）`，`·` 恒为 2 个。
    # 它之所以没暴露，是因为排在 ① cf 之后，而 ① 一直在抛 —— 「检查从没报过」再次成立。
    # 改成**带对照组的内容断言**：默认例必须有格局名，pattern 为空的那一例必须没有、且留下空位。
    assert "正官格" in ov["ling-deling"]["headline"], \
        f"ov：默认例 headline 竟不含格局名：{ov['ling-deling']['headline']!r}"
    assert "正官格" not in ov["pat-none"]["headline"], \
        f"ov：pattern 为空时 headline 里仍有格局名：{ov['pat-none']['headline']!r}"
    assert "·（成格）" in ov["pat-none"]["headline"], \
        f"ov：pattern 为空时该留下空位：{ov['pat-none']['headline']!r}"
    print(f"  ✓ ov：七段全出场、语气四档全出场、三种「令」态全出场")

    # ③ sy：五个综合评定档位**全**出场 + jiu 的码位截断两侧 + 破而有救
    sy = {c["id"]: r["sy"] for c, r in R if c["kind"] == "sy"}
    assert sum(1 for v in sy.values() if v["available"]) >= 10, "sy：可用样本太少"
    labels = {v.get("composite_label") for v in sy.values() if v.get("available")}
    want = {"命局上佳", "命局中平偏上", "命局中平", "命局偏弱", "命局受损"}
    assert labels == want, f"sy：五档综合评定没跑全：缺 {want - labels}"
    mods = {x["module"] for v in sy.values() if v.get("available") for x in v.get("factors") or []}
    for m in ("日主旺衰", "格局成破", "用神喜忌", "调候", "刑冲合害", "当前大运（后天）"):
        assert m in mods, f"sy：因子模块「{m}」一次都没出场"
    jiu = {c["id"]: v for c, v in R if c["kind"] == "sy"}
    # 61 码位的救应文字必须被截断并加省略号；59/60 码位必须**原样**
    a61 = sy["jiu-61"]["factors"]
    assert any(x["note"].endswith("…") for x in a61), "sy：>60 码位的救应文字没加省略号"
    a60 = sy["jiu-60"]["factors"]
    assert all(not x["note"].endswith("…") for x in a60), \
        "sy：恰 60 码位（含非 BMP 字）竟被截断 —— `len` 与 UTF-16 单元数被搞混了"
    a59 = sy["jiu-59"]["factors"]
    assert all(not x["note"].endswith("…") for x in a59), "sy：59 码位竟被截断"
    print(f"  ✓ sy：五档全出场、六个因子模块全出场、救应截断 59/60/61 码位边界全对")

    # ④ ms：三个档位全出场 + 域数 0..5 全出场 + 婚姻凶的追加建议两侧
    ms = {c["id"]: r["ms"] for c, r in R if c["kind"] == "ms"}
    assert any(not v.get("available") for v in ms.values()), "ms：早退（不可用）没出场"
    oq = {v.get("overall_quality") for v in ms.values() if v.get("available")}
    assert oq == {"吉", "中", "凶"}, f"ms：三档总评没跑全：{oq}"
    # 「当下」这一维**恰好**在这几例上消失 —— 基准把那一整段包在 `try/except` 里，
    # 畸形输入（不可哈希的 `hour_wuxing`、非 str 的用神元素）会让它抛，于是少一维。
    # 移植侧照搬这个 swallow（见 `master_synthesis.js` 文件头 ⑤），故两份产物必须**同集合**地少。
    # 写成「恰好这个集合」而不是「至少要有几例」：多一例说明我方多吞了（真错被吃掉），
    # 少一例说明我方该吞没吞（对拍会报差异）。
    # `dim-0` 也在里面：它专门用 moment 22（那条不可哈希的时辰）去凑「连当下都没有」的 0 维形态。
    SWALLOW = {"moment-22", "moment-yong-dict", "yongw-dict", "yongw-ov-dict", "dim-0"}
    no_moment = {cid for cid, v in ms.items() if v.get("available")
                 and "当下" not in [d["domain"] for d in v["dimension_verdicts"]]}
    assert no_moment == SWALLOW, \
        f"ms：「当下」缺席集合变了：多出 {sorted(no_moment - SWALLOW)}，" \
        f"少了 {sorted(SWALLOW - no_moment)}"
    # 维数谱：专域数 k(0..4) + 运程 + 当下 ⇒ 6-k 维（运程不挂时再减一，swallow 再减一），
    # 故 0..6 每一档都该有样本 —— 缺哪一档就说出来（防空绿）。
    ndom = {len(v.get("dimension_verdicts") or []) for v in ms.values() if v.get("available")}
    assert ndom == {0, 1, 2, 3, 4, 5, 6}, f"ms：分域维数谱不全：{sorted(ndom)}"
    doms = {d["domain"] for v in ms.values() if v.get("available")
            for d in v.get("dimension_verdicts") or []}
    assert doms == {"事业", "财运", "婚姻", "健康", "运程", "当下"}, f"ms：分域没跑全：{doms}"
    # 「当下」永远是最后一维（swallow 那几例除外 —— 它整个不见了，末维退成「运程」）
    for cid, v in ms.items():
        if not v.get("available"):
            continue
        ds = [d["domain"] for d in v["dimension_verdicts"]]
        if cid in SWALLOW:
            assert "当下" not in ds, f"ms：{cid} 该吞掉「当下」却还在：{ds}"
            assert not ds or ds[-1] == "运程", \
                f"ms：{cid} 吞掉「当下」后末维该退成「运程」（或干脆 0 维）：{ds}"
            continue
        assert ds[-1] == "当下", f"ms：最后一维该是「当下」：{ds}"
    # 用神为空（或只剩非字符串）时，note 里用「—」而不是空括号
    assert "用神（—）" in ms["moment-no-yong"]["dimension_verdicts"][-1]["verdict"], \
        f"ms：用神为空时该显「—」：{ms['moment-no-yong']['dimension_verdicts'][-1]['verdict']!r}"
    a_x = ms["advice-marriage-xiong"]["master_advice"]
    a_j = ms["advice-marriage-ji"]["master_advice"]
    assert a_x.endswith("婚姻一域尤须留意刑冲，宜缓择良配、善加经营。"), "ms：婚姻凶的追加建议没出"
    assert not a_j.endswith("善加经营。"), "ms：婚姻非凶却追加了建议"
    # `_grade_to_q`：空容器 advice 必须**不**拼那一段（Python 假值）
    for cid in ("w-adv-empty-list", "w-adv-empty-dict", "m-adv-empty-list", "m-adv-empty-dict",
                "h-adv-empty-list", "h-adv-empty-dict"):
        assert cid in ms, f"ms：缺用例 {cid}"
    print(f"  ✓ ms：三档全出场、六个域全出场、维数谱 0..6 全出场、早退与婚姻追加建议两侧均验；"
          f"「当下」缺席集合恰好 {len(SWALLOW)} 例（基准 swallow 的可达路径）")

    # ⑤ asm：十件齐全/缺席两种形态 + 端点四柱断言（在 run_asm 里逐例做）
    asm = [(c["id"], r) for c, r in R if c["kind"] == "asm"]
    present = {k: 0 for k in _ASM_KEYS}
    for _, r in asm:
        for k in _ASM_KEYS:
            if r[k] is not None:
                present[k] += 1
    for k in _ASM_KEYS:
        assert present[k] > 0, f"asm：「{k}」一次都没挂上"
    n_full = sum(1 for _, r in asm if all(r[k] is not None for k in _ASM_KEYS))
    n_nocf = sum(1 for _, r in asm if r["current_fortune"] is None)
    assert n_full > 0, "asm：没有「十件齐全」的样例"
    assert n_nocf > 0, "asm：没有「current_fortune 不挂」的样例"
    assert all(r["overview"] is not None for _, r in asm), "asm：命局总论挂不上（不该）"
    print(f"  ✓ asm：十件齐全 {n_full} 例、缺 current_fortune {n_nocf} 例，"
          f"其余九件 {len(asm)} 例全挂上；端点四柱逐例断言通过")

    # ⑥ 真实链路的**可达性**：哪些档位根本到不了，一律**量出来**并写成断言，不写注释。
    #    语料 = 1962–2015 各季、男女交替的 48 张盘（`_reach_corpus()`，确定性），走真端点，
    #    全程 0.4 秒 —— 便宜到每次生成都跑得起。
    # ⚠ 量的是**产物**（`dimension_verdicts` / `overall_quality` / `master_advice`），
    #   不是我自己再抽一遍文字去比。自己抽就得复刻一遍 `_grade_to_q` 的取字口径，
    #   那是第二份实现 —— 基准改了字，第二份实现会跟着一起错，反而看不出来。
    #   这样一旦 shushu 改文案改到档位变了，这里当场红（写进注释的话没人会跑）。
    _restore_injections()
    dim_q = {"事业": set(), "财运": set(), "婚姻": set(), "健康": set()}
    overall, tail_seen = set(), []
    for c in _reach_corpus():
        req = BaziRequest(year=c["y"], month=c["mo"], day=c["d"], hour=c["h"],
                          gender=c["gender"], is_lunar=False, use_true_solar_time=False)
        ms = (asyncio.run(get_chart(req)).data).get("master_synthesis") or {}
        for d in ms.get("dimension_verdicts") or []:
            if d.get("domain") in dim_q:
                dim_q[d["domain"]].add(d.get("quality"))
        overall.add(ms.get("overall_quality"))
        if _MS_MARRIAGE_TAIL in (ms.get("master_advice") or ""):
            tail_seen.append(c)
    # 四域可达集：事业 {中,凶}、财运 {中}、婚姻 {中}、健康 {凶}
    assert dim_q["事业"] == {"中", "凶"}, f"真实事业域的可达档变了：{dim_q['事业']}"
    assert dim_q["财运"] == {"中"}, f"真实财运域的可达档变了：{dim_q['财运']}"
    assert dim_q["婚姻"] == {"中"}, f"真实婚姻域的可达档变了：{dim_q['婚姻']}"
    assert dim_q["健康"] == {"凶"}, f"真实健康域的可达档变了：{dim_q['健康']}"
    # 于是总评：`avg` 只可能 (中+1+1+凶)/4 ∈ {0.5, 0.75} —— 0.5 落 `avg < 0.7` 判凶、
    # 0.75 判中；「吉」要 `ming 吉 且 avg ≥ 1.3`，在真实数据上永远够不到。
    assert overall == {"中", "凶"}, f"真实总评的可达档变了：{overall}（「吉」是不是可达了？）"
    # 「婚姻一域尤须留意刑冲」那句追加建议由 `婚姻 == 凶` 触发，故这 48 张盘一次都不该出现。
    assert not tail_seen, f"婚姻凶的追加建议竟然出场了（{len(tail_seen)} 例）：{tail_seen[:3]}"
    print(f"  ✓ 可达性（48 真实盘走真端点量产物）：事业 {sorted(dim_q['事业'])}、"
          f"财运 {sorted(dim_q['财运'])}、婚姻 {sorted(dim_q['婚姻'])}、"
          f"健康 {sorted(dim_q['健康'])} → 总评只出 {sorted(overall)}；"
          f"「吉」档与「婚姻一域…」追加建议在真实数据上不可达（只有定向盘能触发）")


def _txt20(v):
    """复算 `master_synthesis._txt(v, 20)`（健康域那一支）。**当前无调用方** ——
    ⑥ 改成直接量产物后就不需要自己抽字了；留着是因为 `_grade_to_q` 那类「取字口径」
    的迁移（改文案时用来定位哪一域漂了）偶而要用它手工比对。若一直空着，删掉即可。"""
    if isinstance(v, list):
        return "；".join(str(x) for x in v)[:20]
    return str(v or "")[:20]


# ─────────────────────────────────────────────────────────────
# ⑥ 用的真实盘语料与注入还原
# ─────────────────────────────────────────────────────────────

# 那句只有「婚姻判凶」才会追加的总建议（照抄 `master_synthesis.py` 的原文）。
_MS_MARRIAGE_TAIL = "婚姻一域尤须留意刑冲，宜缓择良配、善加经营。"


def _reach_corpus():
    """48 张真实盘：1962/1975/1988/1996/2005/2015 × 2/5/8/11 月 × 5/20 日，男女交替。

    固定写死（不用随机、不用 `now`）—— 可达性断言必须**可复现**，否则它红一次绿一次
    就等于没红。日期取在 5/20 与 2/5…，刻意避开交节与 23:00 子时边界，故对本项目
    历书与基准历书的微小分歧不敏感（层 9 已单独对拍过历法）。
    """
    out = []
    for yi, y in enumerate((1962, 1975, 1988, 1996, 2005, 2015)):
        for mi, mo in enumerate((2, 5, 8, 11)):
            for di, d in enumerate((5, 20)):
                out.append({"y": y, "mo": mo, "d": d, "h": 10,
                            "gender": "male" if (yi + mi + di) % 2 == 0 else "female"})
    return out


def _restore_injections():
    """把 `cf`/`asm` 族为了确定性打的猴子补丁**还原**成基准原函数。

    为什么必须还原：本文件在模块导入时存下了三个原函数（`_ORIG_CALC_DAYUN` 等），
    各族用字符串替换式的赋值改了模块属性。⑥ 要的是**真实链路**，若带着别人的补丁跑，
    量出来的就不是真实链路 —— 而且「⑥ 跑在 asm 之后」这种隐式顺序依赖会让
    「单独跑某个族」和「跑全套」给出不同结论。
    """
    CF.calculate_dayun = _ORIG_CALC_DAYUN
    CF.calculate_liunian = _ORIG_CALC_LIUNIAN
    CM.current_sizhu = _ORIG_CURRENT_SIZHU


if __name__ == "__main__":
    main()

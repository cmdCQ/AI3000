#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字应用层**（3.5.4a）
`core/bazi/applications.py`（264 行）：事业 / 婚姻 / 健康 / 财运 + 装配 `life_aspects`。

── 这一层是「五个方面」结构化数据的老家 ──
端点层 `api/bazi.py:127-145` 调这四个函数装出 `chart.life_aspects`（键 `career`
`wealth` `marriage` `health`，**没有** `general`），prompt 层 `api/agent.py:1477` 用
`TAB_TO_ASPECT` 把中文 tab 名映射到这些键。所以「用户选事业 → AI 拿到事业专项数据」
这条路的地基就是本层。

── 家族 ──
  A `chart`  真实链路：465 真实盘 + 10000 天干全枚举（与层 11/12/13 同一批），
             跑 `analyze_chart` 得完整盘再调四函数 —— 验「装在一起、输入真实可达时也对」。
  B `field`  定向字段盘：**绕过 analyze_chart**，直接指定 `strength` 与 `shishen_summary`
             （四函数只读 `day_master` / `strength` / `shishen_summary` / 四柱，
             读源码确认）。全交叉：十干 × 十二日支 × 六种 strength × 11 种十神盘。
  C `pos`    冲/合**落位**族：日支取遍十二支，把六冲支与六合支分别摆到年/月/时柱，
             并为每支备一条「命局里既无冲也无合」的负例。
  D `gender` 性别取值的判定分支（`male`/`男` 同判，其余一律走女）。

── B 族为什么要绕过 analyze_chart ──
真实盘里 `strength` 只会是「身强/身弱/中和」三值之一，另外三态（空串 / None / dict）
到不了；而 `chart.get("strength", "中和")` 的语义差异**只在空串上暴露**：
键存在而值为 `""` 时 Python 返回 `""`，写成 `chart.strength || '中和'` 就会漂成「中和」。
这一支必须定向造，否则「检查从没报过 = 没检查」。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_applications.py [out.json]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

from core.bazi.analyzer import analyze_chart                             # noqa: E402
from core.bazi.applications import (                                     # noqa: E402
    career_analysis, marriage_analysis, health_analysis, wealth_analysis,
)
from core.constants import (                                             # noqa: E402
    DIZHI, TIANGAN, LIUCHONG, LIUHE, TIANGAN_WUXING,
)

from gen_golden_bazi_patterns import cases_real, cases_stems, chart_from_gz  # noqa: E402

PILLARS = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")
FULL_SAMPLE = 300
FULL_STRIDE = 271

# ── 家族契约：每个家族的输出对象名（顺序即 digest 的顺序，两侧必须一致）──
_ASPECT_OUT = ["career", "wealth", "health",
               "marriage_m", "marriage_f", "aspects_m", "aspects_f"]
FAMILIES = {
    "chart":  _ASPECT_OUT,
    "field":  _ASPECT_OUT,
    "pos":    _ASPECT_OUT,
    "gender": ["marriage"],
}

# strength 的六种形态：三真实值 + 空串 + None + dict（见文件头「B 族为什么要绕过」）
STRENGTHS = ["身强", "身弱", "中和", "", None, {"label": "身强"}]

# 十神盘：覆盖配偶星（正财/偏财/正官/七杀）、财星条数 0..3、有词条/无词条、
# 「首位有词条次位没有」与反过来的两种排列、以及「条目在但 stems 为空」
SS_PATS = [
    [],
    [("正财", ["甲"])],
    [("正财", ["甲", "乙"])],
    [("正财", ["甲"]), ("偏财", ["乙", "丙"])],
    [("正官", ["甲"]), ("七杀", ["乙"])],
    [("比肩", ["甲"]), ("劫财", ["乙"])],
    [("正官", ["甲"]), ("比肩", ["乙"])],
    [("比肩", ["甲"]), ("正官", ["乙"])],
    [("食神", ["甲"]), ("伤官", ["乙"])],
    [("正印", ["甲"]), ("偏印", ["乙"])],
    [("正财", [])],
]

# 十干盘：日干取遍十干（第 3 位），其余三干打散，让 `_wuxing_count` 的分布不至于退化
GAN_FILLERS = [("甲", "丙", "庚"), ("壬", "戊", "辛"), ("乙", "丁", "癸")]


def build_life_aspects(ch: dict, gender: str) -> dict:
    """照 `api/bazi.py:127-145` 装配。**顺序即 api 里的插入顺序**：career→wealth→health→marriage。"""
    return {
        "career":   career_analysis(ch),
        "wealth":   wealth_analysis(ch),
        "health":   health_analysis(ch),
        "marriage": marriage_analysis(ch, gender),
    }


def chart_full(gz):
    """真实链路：干支 → 盘 → analyze_chart（补齐 strength / shishen_summary 等）。"""
    ch = chart_from_gz(gz)
    analyze_chart(ch)
    return ch


def chart_field(i):
    """定向盘：四柱由干支定（藏干照表推），`strength` 与 `shishen_summary` **直接指定**。"""
    ch = chart_from_gz(i["gz"])
    ch["strength"] = i["strength"]
    ch["shishen_summary"] = [{"shishen": s, "stems": list(st)} for s, st in i["ss"]]
    return ch


def _ss_out(out):
    return {"career": career_analysis(out), "wealth": wealth_analysis(out),
            "health": health_analysis(out),
            "marriage_m": marriage_analysis(out, "male"),
            "marriage_f": marriage_analysis(out, "female"),
            "aspects_m": build_life_aspects(out, "male"),
            "aspects_f": build_life_aspects(out, "female")}


def run_case(c):
    """金标准侧：按 kind 调 shushu 的对应函数。JS 侧 `run_js_bazi_applications.js` 同构。"""
    k, i = c["kind"], c["in"]
    if k == "chart":
        return _ss_out(chart_full(i["gz"]))
    if k in ("field", "pos"):
        return _ss_out(chart_field(i))
    if k == "gender":
        return {"marriage": marriage_analysis(chart_field(i), i["gender"])}
    raise AssertionError(f"未知 kind：{k}")


def canon(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 家族构造
# ─────────────────────────────────────────────────────────────

def family_chart():
    """A：与层 11/12/13 同一批（真实 465 + 天干 10000），按四柱干支去重。"""
    cases, seen = [], set()
    for c in cases_real() + cases_stems():
        key = "".join(c["gz"])
        if key in seen:
            continue
        seen.add(key)
        cases.append({"kind": "chart", "id": c["id"], "in": {"gz": c["gz"]}})
    return cases


def _free_zhis(z, n):
    """取 n 个「既不是 z、也不是 z 的冲支/合支」的地支 —— 把冲合关系整个让给 C 族。

    `DIZHI` 有 12 支，排除 3 支后余 9 支，故 n ≤ 9 恒成立。
    """
    busy = {z, LIUCHONG[z], LIUHE[z]}
    free = [d for d in DIZHI if d not in busy]
    assert len(free) >= n, f"空闲地支不足：要 {n} 只得 {len(free)}"
    return free[:n]


def family_field():
    """B：十干 × 十二日支 × 六种 strength × 11 种十神盘。日支为「唯一有冲合关系的那一支」，
    冲/合的落位由 C 族单独穷举 —— 两族合起来才盖满，任一单独都不够。"""
    out = []
    for (f1, f2, f3) in GAN_FILLERS:
        for dm in TIANGAN:
            for z in DIZHI:
                free1, free2 = _free_zhis(z, 2)      # 三支都避开 z 的冲合，冲合留给 C 族
                gz = [f1 + free1, f2 + free2, dm + z, f3 + free1]
                for st in STRENGTHS:
                    for si, ss in enumerate(SS_PATS):
                        out.append({
                            "kind": "field",
                            "id": f"{dm}{z}|{f1}{f2}{f3}|{si}|{type(st).__name__}",
                            "in": {"gz": gz, "strength": st, "ss": ss},
                        })
    return out


def family_pos():
    """C：日支取遍十二支，冲支/合支分别摆到年 / 月 / 时柱，每支再备一条「既无冲也无合」的负例。

    「月支放合支」那条是**关键负例**：`marriage_analysis` 只把年支与时支拿去比六合
    （`harmony in (year_zhi, hour_zhi)`），月支的合**不算数**，而冲是年/月/时三柱都算
    （`any(... for pk in (year, month, hour))`）。这一条非对称判据必须有负例顶着。
    """
    out = []
    for z in DIZHI:
        chong, he = LIUCHONG[z], LIUHE[z]
        others = [d for d in DIZHI if d not in (z, chong, he)]
        f1, f2 = others[0], others[1]
        variants = {
            "none":    [f1, f2, z, f1],       # 既无冲也无合 → 负例
            "chongY":  [chong, f2, z, f1],
            "chongM":  [f1, chong, z, f2],
            "chongH":  [f1, f2, z, chong],
            "heY":     [he, f2, z, f1],
            "heM":     [f1, he, z, f2],       # 月支放合 → **不算** harmony（见 docstring）
            "heH":     [f1, f2, z, he],
            "bothYH":  [chong, f2, z, he],    # 冲合同现 → 冲优先
            "bothMH":  [f1, chong, z, he],
        }
        for tag, zhis in variants.items():
            gz = [a + b for a, b in zip(["甲", "丙", "戊", "庚"], zhis)]
            out.append({"kind": "pos", "id": f"{z}-{tag}",
                        "in": {"gz": gz, "strength": "中和", "ss": [("正财", ["甲"])]}})
    return out


GENDERS = ["male", "男", "female", "女", "", "other", None, 123]


def family_gender():
    """D：性别取值的判定分支。`male = gender in ("male", "男")` —— 只有这两种算男。

    ⚠ 两张盘都是**必需**的，一张不足以验出分支：配偶星男看正财、女看正官，
    若十神盘里两个都没有，男女两侧会落进同一条「婚姻宫平稳」的默认断语，
    断言就分不出判定究竟走了哪一支（正是「检查从没报过」）。
    故 `cai` 盘只放正财（男分支有断语）、`guan` 盘只放正官（女分支有断语），
    每一张都让两侧结果**必须不同**。
    """
    gz = ["甲子", "丙寅", "戊辰", "庚申"]
    specs = {"cai": [("正财", ["甲"])], "guan": [("正官", ["甲"])]}
    out = []
    for sk, ss in specs.items():
        for i, g in enumerate(GENDERS):
            out.append({"kind": "gender", "id": f"{sk}-g{i}-{g!r}",
                        "in": {"gz": gz, "strength": "身强", "ss": ss, "gender": g}})
    return out


# ─────────────────────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_applications.json"))
    a = ap.parse_args()

    cases = (family_chart() + family_field() + family_pos() + family_gender())

    digest, flags, counts, hist = {}, [], [], {}
    shapes = {}          # kind -> {outname: [每种出现过的键集]}
    full = []
    for idx, c in enumerate(cases):
        out = run_case(c)
        assert list(out.keys()) == FAMILIES[c["kind"]], f"{c['id']} 输出键不契约"
        for name, ob in out.items():
            ks = sorted(ob.keys())
            slot = shapes.setdefault(c["kind"], {}).setdefault(name, [])
            if ks not in slot:
                slot.append(ks)
        digest[str(idx)] = [sha(canon(out[o])) for o in FAMILIES[c["kind"]]]
        f = flags_of(out)
        flags.append(f)
        counts.append(counts_of(out))
        hist[c["kind"]] = hist.get(c["kind"], {})
        hist[c["kind"]][f] = hist[c["kind"]].get(f, 0) + 1
        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"idx": idx, "kind": c["kind"], "id": c["id"], "out": out})

    out = {
        "meta": {
            "layer": "3.5.4a 八字应用层（事业/婚姻/健康/财运）",
            "source": "shushu core/bazi/applications.py",
            "n_cases": len(cases),
            "families": FAMILIES,
            "kinds": dict(Counter(c["kind"] for c in cases)),
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "norm": "零归一。理由：本层无任何依赖进程哈希顺序的遍历 —— "
                    "`_wuxing_count` 的字典是**字面量起手**（木火土金水）后只增计数、键序不变，"
                    "`shishen_summary` 是列表，其余全是标量与列表。"
                    "已用 PYTHONHASHSEED=0/1 复跑核对逐字节相同。",
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
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {len(cases)} 例 → {a.out}（{Path(a.out).stat().st_size / 1024 / 1024:.1f} MB）")
    print(f"  家族：{dict(Counter(c['kind'] for c in cases))}")
    # 分支谱：本层的「标志位」是**逐例的分支组合码**（每个方面各自的分支拼起来），
    # 故条目数接近样例数，整谱打出来就是几十万字符的噪声。只报规模；不一致时
    # 由比对器（`diff_bazi_applications.py`）整谱对比并定位。
    for k, h in sorted(hist.items()):
        print(f"  {k:<8} {len(h)} 种分支码（条目合计 {sum(h.values())}）")

    # ─────────────────────────────────────────────────────────
    # 落地自查（防「空绿」+ 防「家族前提被改」）
    # ─────────────────────────────────────────────────────────
    self_check(cases)


def _st_code(v):
    """strength 回显值的语言中立编码。**不许用 `str(v)`** ——
    Python 的 `str(True)` 是 `True`、`str({"a":1})` 是 `{'a': 1}`（单引号），
    JS 分别是 `true` 与 `[object Object]`：照直取字符串化会造出一类**假差异**，
    而假差异比不检查更贵（要花时间去证伪）。故布尔走 T/F、字典走 D、空串走 E。
    """
    if v is None:
        return "N"
    if isinstance(v, dict):
        return "D"
    if v == "":
        return "E"
    return {"身强": "Q", "身弱": "R", "中和": "Z"}.get(v, "?")


def flags_of(out):
    """分支指纹：只收**判定性字段**，用来看「每个分支都出场了吗」。

    ⚠ 全部字段都必须是**语言中立**的（中文串、整数、T/F），不得出现由语言
    决定的字符串化结果 —— 比对器会**独立重算**这一串，两边算不出同一个串就是假差异。
    """
    f = []
    for name in sorted(out):
        ob = out[name]
        if name.startswith("aspects_"):
            continue                     # 装配体只是四个函数的打包，指纹由各自出
        g = ob.get
        f.append("|".join([
            name,
            str(g("topic", "")),                        # 中文串，两侧同
            str(g("level", "")),                        # 财运四档
            str(g("quality", "")),                      # 婚姻四断
            str(g("weak_element", "")),                 # 健康：最弱一行
            "T" if g("clash_present") else "F",         # 婚姻：冲（布尔 → T/F）
            "T" if g("harmony_present") else "F",       # 婚姻：合
            str(len(g("career_fields") or [])),         # 事业：行业条数
            str(len(g("shishen_advice") or [])),        # 事业：十神建议条数
            _st_code(g("strength")),                    # **回显的 strength 形态**（空串靠它现身）
        ]))
    return " ␟ ".join(f)


def counts_of(out):
    """逐例计数：只数**结构长度**，一律不数字符串长度。

    ⚠ 不许改成 `len(canon(ob))` 之类的「序列化长度」——那在 Python 是码位数、
    在 JS 是 UTF-16 单元数，非 BMP 字符上会不等，凭空造出一类假差异。
    键名排序后逐一取数，两侧各语言都能逐位算出同一个整数。
    """
    keys = ("career_fields", "shishen_advice", "advice", "spouse_stars",
            "wealth_stems", "lucky_wuxing")
    r = []
    for name in sorted(out):
        ob = out[name]
        row = [len(ob)]
        for k in keys:
            row.append(len(ob.get(k) or []))
        wd = ob.get("wx_distribution")
        row.append(sum(wd.values()) if isinstance(wd, dict) else 0)
        r.append(row)
    return r


def self_check(cases):
    ALL = [run_case(c) for c in cases]
    # `gender` 族的输出只有 `marriage`（它专验性别判定），下面凡是取四方面字段的断言
    # 都只能跑在带全套输出的家族上 —— 直接对 ALL 取 r["health"] 会 KeyError。
    R = [r for c, r in zip(cases, ALL) if c["kind"] in ("chart", "field", "pos")]

    # ① 健康：最弱五行必须五行齐全（`min` 的第一极值语义靠并列样本才验得出）
    WUXING = set(TIANGAN_WUXING.values())             # 从基准的表取值，不手抄
    assert len(WUXING) == 5
    weak = {r["health"]["weak_element"] for r in R}
    assert weak == WUXING, f"最弱五行没跑全：缺 {WUXING - weak}"
    organs = {r["health"]["weak_organ"] for r in R}
    assert len(organs) == 5, f"弱脏没跑全：{organs}"
    dm_organs = {r["health"]["dm_organ"] for r in R}
    assert len(dm_organs) == 5, f"日主脏腑没跑全：{dm_organs}"
    # 并列极值：`_wuxing_count` 五行同数时 `min` 取「木火土金水」序里第一个 —— 必须有样本踩到
    n_tie = sum(1 for r in R
                if list(r["health"]["wx_distribution"].values()).count(
                    r["health"]["wx_distribution"][r["health"]["weak_element"]]) > 1)
    assert n_tie > 0, "一条并列极值样本都没有 —— `min` 的取首语义等于没验"
    print(f"  ✓ 健康：最弱五行 5/5、弱脏 5/5、日主脏腑 5/5、并列极值样本 {n_tie} 例")

    # ② 财运：四档全出场
    levels = {r["wealth"]["level"] for r in R}
    want_levels = {"财运丰厚", "财运稳健", "财来财去", "财运平稳"}
    assert levels == want_levels, f"财运档没跑全：缺 {want_levels - levels}"
    print(f"  ✓ 财运：四档 4/4（{'、'.join(sorted(levels))}）")

    # ③ 婚姻：四条**分支**全出场 × 冲/合四组合全出场
    #    注意「四条分支 ≠ 四种文案」：配偶星那一支按性别出两种文案（男正财/女正官），
    #    故文案共 5 种。这里按分支判，并把「配偶星支的两种性别都出场」单列一条 ——
    #    否则「文案数对了」也可能只是两条分支各出一种性别。
    quals = {r["marriage_m"]["quality"] for r in R} | {r["marriage_f"]["quality"] for r in R}
    b_clash = [q for q in quals if q.startswith("日支受冲")]
    b_he = [q for q in quals if q.startswith("日支六合")]
    b_star = [q for q in quals if q.endswith("婚缘较好，感情稳定")]
    b_flat = [q for q in quals if q.startswith("婚姻宫平稳")]
    assert len(b_clash) == len(b_he) == len(b_flat) == 1, f"冲/合/兜底三支没各出一种文案：{quals}"
    assert len(b_star) == 2, f"配偶星支应出两种文案（男正财/女正官），实得 {b_star}"
    assert any("正财" in q for q in b_star) and any("正官" in q for q in b_star), \
        f"配偶星支没按性别分文案：{b_star}"
    combos = {(r["marriage_m"]["clash_present"], r["marriage_m"]["harmony_present"]) for r in R}
    assert combos == {(False, False), (True, False), (False, True), (True, True)}, \
        f"冲/合组合没跑全：{combos}"
    print(f"  ✓ 婚姻：四条分支全出场（文案 5 种，配偶星支含男女两种）、冲合组合 4/4")

    # ④ 事业：有词条/无词条两态 + 行业恒 6 条（lucky_wx 两个五行各 5 个 → 去重后恒 ≥6）
    n_adv = {len(r["career"]["shishen_advice"]) for r in R}
    assert n_adv == {0, 1, 2}, f"事业十神建议条数没跑全：{n_adv}"
    n_fields = {len(r["career"]["career_fields"]) for r in R}
    assert n_fields == {6}, f"事业行业条数不是恒 6：{n_fields}"
    print(f"  ✓ 事业：十神建议 0/1/2 条全出场、行业恒 6 条")

    # ⑤ strength 的三态（含**空串**）必须真的走到 —— 这一支是 JS 侧最容易写成 `||` 的地方
    #    注意 `sts` 存的是 json 序列化后的形态（带引号），期望值同样要过一遍 dumps，
    #    否则「带引号的实得 vs 裸字符串的期望」永远不相等 —— 那是断言写错，不是用例没跑到。
    sts = {json.dumps(r["career"]["strength"], ensure_ascii=False) for r in R}
    for want_raw in ("身强", "身弱", "中和", "", None, {"label": "身强"}):
        want = json.dumps(want_raw, ensure_ascii=False)
        assert want in sts, f"strength 形态 {want} 没出场（实得 {sts}）"
    print(f"  ✓ strength 六态全出场（含空串 / null / dict）：{len(sts)} 种")

    # ⑥ 装配体必须与四个函数逐字一致（否则 B 族白造）
    n = 0
    for c, r in zip(cases, R):
        if not c["kind"] in ("chart", "field", "pos"):
            continue
        m = {"career": r["career"], "wealth": r["wealth"], "health": r["health"],
             "marriage": r["marriage_m"]}
        assert canon(m) == canon(r["aspects_m"]), f"{c['id']} 装配体(male)与四函数不一致"
        m["marriage"] = r["marriage_f"]
        assert canon(m) == canon(r["aspects_f"]), f"{c['id']} 装配体(female)与四函数不一致"
        n += 1
    assert n > 0
    print(f"  ✓ 装配体与四函数逐字一致 {n} 例（male/female 各一遍）")

    # ⑦ 性别判定：只有 male/男 走男分支，另 6 种取值一律落女分支
    by = {}
    for c, r in zip(cases, ALL):
        if c["kind"] == "gender":
            by.setdefault(c["in"]["ss"][0][0], {})[str(c["in"]["gender"])] = r["marriage"]["quality"]
    assert set(by) == {"正财", "正官"}, f"性别族的两张盘不齐：{set(by)}"
    others = ("female", "女", "", "other", "None", "123")
    cai, guan = by["正财"], by["正官"]
    # 正财盘：男分支取到配偶星，其余全落默认断语
    assert cai["male"] == cai["男"] and "正财" in cai["male"], f"正财盘男分支不对：{cai}"
    assert all(cai[k] == cai["female"] for k in others), f"非男值没全落女分支：{cai}"
    assert "正财" not in cai["female"], "女分支不该取正财作配偶星"
    # 正官盘：女分支取到配偶星，男分支全落默认 —— 两侧必须**不同**，否则本族验不出分支
    assert guan["female"] == guan["女"] and "正官" in guan["female"], f"正官盘女分支不对：{guan}"
    assert all(guan[k] == guan["male"] for k in ("male", "男")), f"男值没全落男分支：{guan}"
    assert cai["male"] != cai["female"] and guan["male"] != guan["female"], \
        "两张盘的男女断语相同 —— 本族分不出判定走了哪一支，等于没测"
    print(f"  ✓ 性别：male/男 同判，另 6 种取值一律走女分支（两张盘男女断语互不相同）")

    # ⑧ 婚姻的「月支放合支不算合」这条非对称判据，必须真有样本且真为假
    he_m = [r for c, r in zip(cases, R) if c["kind"] == "pos" and c["id"].endswith("-heM")]
    assert len(he_m) == 12, f"月支放合的样本数不对：{len(he_m)}"
    assert all(r["marriage_m"]["harmony_present"] is False for r in he_m), \
        "月支放合支竟被判为六合 —— shushu 改了判据，回来更新结论"
    n_he_y = [r for c, r in zip(cases, R) if c["kind"] == "pos" and c["id"].endswith("-heY")]
    assert all(r["marriage_m"]["harmony_present"] is True for r in n_he_y), \
        "年支放合支却没判六合"
    print(f"  ✓ 婚姻六合只看年/时柱：月支放合 12 例全为假，年支放合 {len(n_he_y)} 例全为真")


if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字组合断层**（3.5.3d）
`core/bazi/combos.py`（507 行）：神煞组合 / 格局成破评断 / 岁运组合 / 流年逐年 / 通用逐期。

── 这一层为什么能全枚举 ──
前几层（11/12）吃的是整张盘（干支八个字 → 十神/格局/神煞），输入域大到只能结构化采样。
这一层相反：`combos.py` 的每个函数只读命盘的**几个离散字段**，输入域小且可数：

  `shensha_combos`   只读神煞名单       → 22 个名字的子集，穷举 ≤3 元
  `evaluate_geju`    只读格局名 + 十神集合 + 强弱 → 格名 × 十神子集 × 强弱，穷举
  `analyze_suiyun`   读四柱地支 + 大运/流年干支 → 12 盘 × 60×60 对，穷举
  逐期断             读日主 + 强弱 + 调候主用 + 干支 → 十条轴全交叉

故本层**不用覆盖断言兜底**（断言只用来防「空绿」与防「家族前提被改」），
「每一分支都跑到」由穷举本身保证。

── 家族 ──
  A `chart`  真实链路：465 真实盘 + 10000 天干全枚举 + 360 调候定向（与层 12 同一批），
             跑 `analyze_chart` 后调 `bazi_combos` —— 验「装在一起也对」。
  B `sha`    神煞名单子集（22 名取自 shushu 自己的两张表，不手抄）。
  C `geju`   格局名 × 十神子集 × 强弱值。
  D `suiyun` 12 张地支轮转盘 × 六十甲子全对。
  E `xiji`   逐期断的十条轴交叉（日主与干支索引联动，见下）。
  F `period` 通用逐期的 label/parent 轴（含 `parent_gan` 为 None —— `api/bazi.py:295` 真会传）。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_combos.py [out.json]
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

from core.bazi.analyzer import analyze_chart                              # noqa: E402
from core.bazi.combos import (                                            # noqa: E402
    _OVERLAP_NOTE, _PAIR_COMBOS, _GEJU_RULES, DIZHI_CHONG,
    shensha_combos, evaluate_geju, analyze_suiyun, bazi_combos,
    analyze_liunian_combo, analyze_period_combo,
)
from core.constants import DIZHI, SHISHEN, TIANGAN                        # noqa: E402

from gen_golden_bazi_patterns import cases_real, cases_stems, chart_from_gz  # noqa: E402
from gen_golden_bazi_yongshen import cases_tiaohou                        # noqa: E402

PILLARS = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")
FULL_SAMPLE = 300
FULL_STRIDE = 271

# 十神：从 shushu 自己的表里取，不手抄
SHISHEN_NAMES = sorted(set(SHISHEN.values()))
assert len(SHISHEN_NAMES) == 10, f"十神不止十个：{SHISHEN_NAMES}"

# 神煞名：两张表的并集。shushu 加一条规则，这一族自动跟着长
SHENSHA_NAMES = sorted(set(_OVERLAP_NOTE) | {n for r in _PAIR_COMBOS for n in r["set"]})

# 六十甲子
JIAZI = [TIANGAN[i % 10] + DIZHI[i % 12] for i in range(60)]
assert len(set(JIAZI)) == 60

# 强弱取值：三个真实值 + 空串 + **dict 形态**（见 JS 文件头 ②：防御分支，正面验过）
STRENGTHS = ["身强", "身弱", "中和", "", {"label": "身强"}]
# 调候主用天干：主族取五阳干各一（五行全枚举）；十干全集由 B 子族补
PRIMARY_YANG = ["甲", "丙", "戊", "庚", "壬"]

# ── 家族契约：每个家族的输出对象名（顺序即 digest 的顺序，两侧必须一致）──
FAMILIES = {
    "chart": ["combos"],
    "sha": ["combos"],
    "geju": ["geju"],
    "suiyun": ["suiyun"],
    "xiji": ["liunian_combo", "period_combo"],
    "period": ["period_combo"],
}


def chart_min(dm, strength, primary):
    """逐期断要的最小盘：它只读这三个字段（读源码确认）。"""
    return {"day_master": dm, "strength": strength, "tiaohou": {"primary": primary}}


def run_case(c):
    """金标准侧：按 kind 调 shushu 的对应函数。JS 侧 `run_js_bazi_combos.js` 同构。"""
    k, i = c["kind"], c["in"]
    if k == "chart":
        ch = chart_from_gz(i["gz"])
        analyze_chart(ch)
        return {"combos": bazi_combos(ch)}
    if k == "sha":
        return {"combos": shensha_combos({"shensha": [{"name": n} for n in i["names"]]})}
    if k == "geju":
        ch = {"pattern": i["pattern"], "strength": i["strength"],
              "shishen_summary": [{"shishen": s} for s in i["shishen"]]}
        return {"geju": evaluate_geju(ch)}
    if k == "suiyun":
        ch = {key: {"dizhi": z} for key, z in zip(PILLARS, i["zhis"])}
        dy, ln = i["dy"], i["ln"]
        return {"suiyun": analyze_suiyun(ch, dy[0], dy[1], ln[0], ln[1])}
    if k == "xiji":
        ch = chart_min(i["dm"], i["strength"], i["primary"])
        dy, ln = i["dy"], i["ln"]
        return {"liunian_combo": analyze_liunian_combo(ch, dy[0], dy[1], ln[0], ln[1]),
                "period_combo": analyze_period_combo(ch, dy[0], dy[1], ln[0], ln[1],
                                                     label="流月", parent_label="流年")}
    if k == "period":
        ch = chart_min(i["dm"], i["strength"], i["primary"])
        pg = i["parent"]
        if pg is None:
            p_gan, p_zhi = None, None
        else:
            p_gan, p_zhi = (pg[0], pg[1]) if pg else ("", "")
        cur = i["cur"]
        return {"period_combo": analyze_period_combo(
            ch, p_gan, p_zhi, cur[0], cur[1],
            label=i["label"], parent_label=i["parent_label"])}
    raise AssertionError(f"未知 kind：{k}")


def canon(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 家族构造
# ─────────────────────────────────────────────────────────────

def family_chart():
    """A：与层 11/12 同一批样例（真实 465 去重 + 天干 10000 + 调候定向 360）。"""
    cases, seen = [], set()
    for c in cases_real() + cases_stems() + cases_tiaohou():
        key = "".join(c["gz"])
        if key in seen:
            continue
        seen.add(key)
        cases.append({"kind": "chart", "id": c["id"], "in": {"gz": c["gz"]}})
    return cases


def family_sha():
    """B：神煞名单子集。≤3 元穷举 → 20 条相会规则与全部单/双名组合全被触发；
    再补 ×2/×3 重复族与「不在任何表里的名字」。"""
    out = []
    for n in SHENSHA_NAMES:
        for cnt in (1, 2, 3):
            out.append({"kind": "sha", "id": f"one-{n}-{cnt}", "in": {"names": [n] * cnt}})
    for size in (1, 2, 3):
        for combo in itertools.combinations(SHENSHA_NAMES, size):
            out.append({"kind": "sha", "id": "sub-" + "-".join(combo),
                        "in": {"names": list(combo)}})
    # 相会 + 重叠同时出现（pair 加一个重复成员）
    for idx, r in enumerate(_PAIR_COMBOS):
        a, b = sorted(r["set"])
        out.append({"kind": "sha", "id": f"dup-{idx}", "in": {"names": [a, b, b]}})
    out.append({"kind": "sha", "id": "empty", "in": {"names": []}})
    # 未收录名：计不进 `present` 的任何规则里，但必须不干扰吉凶计数
    for names in (["国印"], ["国印", "国印", "国印"], ["国印", "天乙贵人"],
                  ["国印", "桃花", "驿马"]):
        out.append({"kind": "sha", "id": "unknown-" + "-".join(names), "in": {"names": names}})
    return out


def family_geju():
    """C：格名 × 十神子集 × 强弱值。

    ── 为什么 ≤3 元子集就够 ──
    每条成/破判据的 `need` 都是**单元素**（`['正财']` 这种），故 size-1 子集即可单独触发它；
    三种 status 的另外两种组合（破而有救）需要 size-2。下面的断言把这个前提钉死：
    shushu 哪天改成多元素 need，这里会**当场炸**，而不是静默少测。
    """
    for pname, rules in _GEJU_RULES.items():
        for need, _txt in rules["cheng"] + rules["po"]:
            assert len(need) == 1, f"格 {pname} 出现多元素 need {need}，≤3 元子集不再完备"

    patterns = sorted(set(_GEJU_RULES) | _real_patterns() | {""})
    out = []
    subsets = [list(c) for size in (0, 1, 2, 3)
               for c in itertools.combinations(SHISHEN_NAMES, size)]
    subsets.append(list(SHISHEN_NAMES))        # 再加全集，十万无一失
    for pname in patterns:
        for st in STRENGTHS:
            # 无规则的格名：verdict 与子集无关，只留一条，省 8850×12 例
            if pname not in _GEJU_RULES:
                out.append({"kind": "geju", "id": f"norule-{pname}-{type(st).__name__}",
                            "in": {"pattern": pname, "strength": st, "shishen": []}})
                continue
            for sub in subsets:
                out.append({"kind": "geju",
                            "id": f"{pname}|{len(sub)}|{'-'.join(sub)}|{st!r}",
                            "in": {"pattern": pname, "strength": st, "shishen": sub}})
    return out


_REAL_PAT = None


def _real_patterns():
    """真实盘里出现过的格名 —— 由 A 族的盘现算，不手抄清单。"""
    global _REAL_PAT
    if _REAL_PAT is None:
        seen = set()
        for c in family_chart():
            ch = chart_from_gz(c["in"]["gz"])
            analyze_chart(ch)
            seen.add(ch["pattern"])
        _REAL_PAT = seen
    return _REAL_PAT


def family_suiyun():
    """D：12 张地支轮转盘 × 六十甲子全对。

    12 张盘的地支取 (k, k+1, k+2, k+3) mod 12 —— k 走一圈，**每个柱位都取遍十二支**，
    故「流年/大运地支冲命局某柱」这条判据的 2×4×12 种情形全被触发，且每种都有负例。
    """
    out = []
    for k in range(12):
        zhis = [DIZHI[(k + o) % 12] for o in range(4)]
        for dy in JIAZI:
            for ln in JIAZI:
                out.append({"kind": "suiyun", "id": f"k{k}-{dy}-{ln}",
                            "in": {"zhis": zhis, "dy": dy, "ln": ln}})
    return out


def family_xiji():
    """E：逐期断的十条轴交叉。36000 例。

    ── 日主与干支索引联动 ──
    `dm = TIANGAN[(li + di) % 10]`（li = 流年天干序、di = 大运天干序）。这样：
      · 固定 li 时 di 走一圈 → **十个日主各出现一次**，且各配一个不同的大运天干
      · 固定 dm 时 li 走一圈 → 流年天干取遍十干、大运天干也取遍十干
    于是 (日主×流年天干) 与 (日主×大运天干) 两两组合**双双全枚举**，而样例数只有 10×10 而非 10×10×10。
    """
    out = []
    for li, ln_gan in enumerate(TIANGAN):
        for di, dy_gan in enumerate(TIANGAN):
            dm = TIANGAN[(li + di) % 10]
            # 大运地支：取该天干名下合法的地支，随 di 轮转（`analyze_liunian_combo`
            # 并不读大运地支；被验方若误读它，摘要就会与金标准不同 → 当场显形）
            dy_pair = next(g for g in JIAZI if g[0] == dy_gan)
            for ln_zhi in DIZHI:
                ln = ln_gan + ln_zhi
                for st in STRENGTHS[:3]:
                    for primary in PRIMARY_YANG:
                        out.append({
                            "kind": "xiji", "id": f"x-{dm}{st}{primary}-{dy_pair}-{ln}",
                            "in": {"dm": dm, "strength": st, "primary": primary,
                                   "dy": dy_pair, "ln": ln}})
    return out


def family_period():
    """F：通用逐期的 label / parent 轴（含 `parent` 为 None —— `api/bazi.py:295` 真会传）。"""
    # 上一级周期的干支：None、空串、十天干各取第一个合法六十甲子
    # （`analyze_period_combo` 只读 parent 的天干；地支取合法值是为了不喂非法干支）
    parents = [None, ""] + [next(g for g in JIAZI if g[0] == gan) for gan in TIANGAN]
    labels = [("流月", "流年"), ("流日", "流月"), ("流时", "流日"), ("", "")]
    out = []
    for cur_gan in TIANGAN:
        for cur_zhi in DIZHI:
            cur = cur_gan + cur_zhi
            for pi, pg in enumerate(parents):
                for strength in ("身强", "中和"):   # 中和 → 走喜忌的第三条路（否则「平」一例都跑不到）
                    for label, plabel in labels:
                        out.append({
                            "kind": "period",
                            "id": f"p-{cur}-{strength}-{pi}-{label}{plabel}",
                            "in": {"dm": "甲", "strength": strength, "primary": "丙",
                                   "parent": pg, "cur": cur,
                                   "label": label, "parent_label": plabel}})
    return out


# ─────────────────────────────────────────────────────────────
# 标志位（比对器会用**同样的算法**从被验方产物现算，不信自报）
# ─────────────────────────────────────────────────────────────

def _sha_part(kind, out):
    """家族 A 的产出是 `bazi_combos`（内含 `shensha_combos`），家族 B 才是 `shensha_combos` 本身。"""
    return out["combos"]["shensha_combos"] if kind == "chart" else out["combos"]


def flags_of(kind, out):
    """每例一串短标志，用于**便宜地**看分支分布（真正的判据是摘要）。"""
    if kind in ("chart", "sha"):
        c = _sha_part(kind, out)
        if not c["combos"]:
            b = "0"
        elif c["ji_count"] > c["xiong_count"]:
            b = "1"
        elif c["xiong_count"] > c["ji_count"]:
            b = "2"
        else:
            b = "3"
        return b
    if kind == "geju":
        g = out["geju"]
        if not g["available"]:
            return "0"
        return {"格成": "1", "破而有救": "2", "格破": "3", "格局未显": "4"}[g["status"]]
    if kind == "suiyun":
        # ⚠ `tags` 可以是**空列表**：shushu 的平和兜底写的是 `if not tags and len(notes) <= 0`，
        #   所以「无并临/相战/相冲、但有引动命局」时 tags 空、notes 非空。这是它的真实行为，
        #   移植照搬；这里把「空 tags」单列一档，正好把这个怪癖钉进谱里。
        tags = out["suiyun"]["tags"]
        if not tags:
            return "0"
        return {"岁运并临": "1", "岁运相战(天克地冲)": "2",
                "岁运地支相冲": "3", "岁运平和": "4"}[tags[0]]
    if kind in ("xiji", "period"):
        key = "liunian_combo" if kind == "xiji" else "period_combo"
        return {"喜": "1", "忌": "2", "平": "3"}[out[key]["xiji"]]
    raise AssertionError(kind)


def counts_of(kind, out):
    if kind in ("chart", "sha"):
        c = _sha_part(kind, out)
        return [len(c["combos"]), c["ji_count"], c["xiong_count"]]
    if kind == "geju":
        g = out["geju"]
        # 无规则的格名走 `available:False` 那条路，返回里**没有** cheng_hit/po_hit
        if not g["available"]:
            return [0, 0]
        return [len(g["cheng_hit"]), len(g["po_hit"])]
    if kind == "suiyun":
        return [len(out["suiyun"]["tags"]), len(out["suiyun"]["notes"])]
    if kind == "xiji":
        return [len(out["liunian_combo"]["themes"]), len(out["period_combo"]["themes"])]
    if kind == "period":
        return [len(out["period_combo"]["themes"])]
    raise AssertionError(kind)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_combos.json"))
    a = ap.parse_args()

    cases = (family_chart() + family_sha() + family_geju()
             + family_suiyun() + family_xiji() + family_period())

    digest, flags, counts, hist = {}, [], [], {}
    shapes = {}          # kind -> {outname: [每种出现过的键集]}。逐例收，去重排序
    full = []
    for idx, c in enumerate(cases):
        out = run_case(c)
        assert list(out.keys()) == FAMILIES[c["kind"]], f"{c['id']} 输出键不契约"
        # 形状集：有的家族**本来就有多种形状**（格局的 available 真/假两态键集不同），
        # 故收「出现过的全部形状」而不是断言唯一 —— 少一种形状也要当场显形。
        for name, ob in out.items():
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

    out = {
        "meta": {
            "layer": "3.5.3d 八字组合断层",
            "source": "shushu core/bazi/combos.py",
            "n_cases": len(cases),
            "families": FAMILIES,
            "kinds": dict(Counter(c["kind"] for c in cases)),
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "norm": "零归一。理由：本层无任何依赖进程哈希顺序的遍历 —— "
                    "`counts.items()` 是插入序、`chart_zhis.items()` 是字面量序、"
                    "`sorted(frozenset)` 是码位序、其余全是列表。已用 PYTHONHASHSEED=0/1 复跑核对逐字节相同。",
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
    for k, h in sorted(hist.items()):
        print(f"  {k:<8}{json.dumps(h, ensure_ascii=False, sort_keys=True)}")

    # ─────────────────────────────────────────────────────────
    # 落地自查（防「空绿」+ 防「家族前提被改」）
    # ─────────────────────────────────────────────────────────
    assert set(hist["sha"]) == {"0", "1", "2", "3"}, "神煞组合的四种 summary 分支没全出场"
    assert set(hist["geju"]) == {"0", "1", "2", "3", "4"}, "格局五态没全出场"
    assert set(hist["suiyun"]) == {"0", "1", "2", "3", "4"}, \
        "岁运标签谱缺档：0=空 tags（只有引动）、1=并临、2=相战、3=地支相冲、4=平和"
    assert set(hist["xiji"]) == {"1", "2", "3"}, "逐期喜忌三态没全出场"
    assert set(hist["period"]) == {"1", "2", "3"}, "通用逐期喜忌三态没全出场"
    print("  ✓ 五组分支谱全满（每档都真出现过）")

    # 20 条相会规则、10 条重叠规则：逐条必须至少命中一次
    hit_pair, hit_overlap = set(), set()
    for c in cases:
        if c["kind"] != "sha":
            continue
        r = shensha_combos({"shensha": [{"name": n} for n in c["in"]["names"]]})
        for x in r["combos"]:
            (hit_pair if x["type"] == "相会" else hit_overlap).add(x["name"].split("×")[0])
    want_pair = {r["name"] for r in _PAIR_COMBOS}
    want_overlap = set(_OVERLAP_NOTE)
    assert hit_pair == want_pair, f"相会规则没跑全：缺 {want_pair - hit_pair}"
    assert hit_overlap == want_overlap, f"重叠规则没跑全：缺 {want_overlap - hit_overlap}"
    print(f"  ✓ 相会 {len(hit_pair)}/{len(want_pair)} 条、重叠 {len(hit_overlap)}/{len(want_overlap)} 条全部命中")

    # ① 七杀格的「羊刃驾杀」这条判据：**恒不命中**（羊刃是神煞，不进十神集合）。
    #    这一条是**取证**不是断言 bug：shushu 哪天把羊刃补进 present，这里会炸，提示回来更新结论。
    yangren = "羊刃驾杀、武贵之格"
    n_hit = 0
    for c in cases:
        if c["kind"] != "geju" or c["in"]["pattern"] != "七杀格":
            continue
        g = evaluate_geju({"pattern": "七杀格", "strength": c["in"]["strength"],
                           "shishen_summary": [{"shishen": s} for s in c["in"]["shishen"]]})
        if yangren in g["cheng_hit"]:
            n_hit += 1
    assert n_hit == 0, f"「羊刃驾杀」竟然命中了 {n_hit} 次 —— shushu 改了，回来更新结论"
    assert "羊刃" not in SHISHEN_NAMES
    print("  ✓ 七杀格「羊刃驾杀」全枚举下命中 0 次（死判据，已取证）")

    # ② `isinstance(strength, dict)` 分支：dict 形态与同名字符串形态必须同判
    n_dict = 0
    for c in cases:
        if c["kind"] != "geju" or not isinstance(c["in"]["strength"], dict):
            continue
        n_dict += 1
        a1 = run_case(c)["geju"]
        c2 = dict(c)
        c2["in"] = dict(c["in"], strength="身强")
        assert canon(a1) == canon(run_case(c2)["geju"]), "dict 形态 strength 与字符串形态结果不同"
    assert n_dict > 0, "dict 形态 strength 一例都没造出来"
    print(f"  ✓ strength 的 dict 形态 {n_dict} 例，与同名字符串形态逐字同判（防御分支可测）")

    # ③ 空 parent_gan：`parent_combo` 必须为空串（`api/bazi.py:295` 真会传 None）
    n_empty = 0
    for c in cases:
        if c["kind"] != "period" or c["in"]["parent"] not in (None, ""):
            continue
        r = run_case(c)["period_combo"]
        assert r["parent_combo"] == "", f"空 parent_gan 却出了 parent_combo：{r['parent_combo']!r}"
        n_empty += 1
    assert n_empty > 0
    print(f"  ✓ 空 parent_gan（含 None）{n_empty} 例，parent_combo 均为空串")


if __name__ == "__main__":
    main()

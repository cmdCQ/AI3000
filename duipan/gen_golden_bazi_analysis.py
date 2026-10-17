#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字静态分析层**（3.5.1b）——
`core/bazi/analyzer.py::analyze_chart` 加在盘上的那些字段：
逐柱十神、十神统计、旺衰、格局、神煞。

**样例集不重新设计，直接读 `golden_bazi.json` 的 `id`/`input`/`near_jie`**。
两层共用同一批样例是刻意的：分析层的每个字段都是四柱的**函数**，若两层各生成一套样例，
「分析层差异」就分不清是移植错了、还是样例不同了。同一批样例下，分析层与排盘层的申报
可以一一对上（交节样例的月柱差异 → 十神/格局/神煞的全套连带差异）。

**不产出 `tiaohou` / `geju_cheng_bai`**：那两个来自 `core/bazi/tiaohou_yongshen.py`，
属 3.5.3 范围。本文件只收 3.5.1b 的三块（十神 / 旺衰 / 格局 / 神煞）。

逐柱十神**折到 `pillar_shishen` 一个键下**（而不是塞回 `year_pillar` 里）：
`analyze_chart` 是**原地改** pillar 字典，若照原样输出，本文件与 `golden_bazi.json`
会在同名的 pillar 键上携带不同字段集，两个对拍各自看到的「字段集」就都对不齐了。
折出来之后，本文件里出现的键**全部**是分析层的产物，一眼可查。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_analysis.py [out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))

from core.bazi import chart as bchart                                   # noqa: E402
from core.bazi.analyzer import analyze_chart                            # noqa: E402

PILLARS = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")

# 3.5.1b 收的字段。tiaohou / geju_cheng_bai 属 3.5.3，**不在内**（不产出、不假装产出）。
ANALYSIS_TOP = ("shishen_summary", "strength_info", "strength",
                "pattern_info", "pattern", "pattern_desc", "shensha")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_analysis.json"))
    a = ap.parse_args()

    src = json.loads((HERE / "golden_bazi.json").read_text(encoding="utf-8"))["cases"]
    cases = []
    for c in src:
        i = c["input"]
        # 真太阳时样例（城市/经度）在 3.5.1a 就明确未纳入，分析层同样不纳入，
        # 但**照旧携带 id/input/near_jie**，让分桶脚本自己去判、去计数。
        kw = {}
        if i.get("city"):
            kw["city"] = i["city"]
        if i.get("longitude") is not None:
            kw["longitude"] = i["longitude"]

        chart = bchart.build_chart(i["year"], i["month"], i["day"],
                                   i["hour"], i["minute"], **kw)
        analyze_chart(chart)

        row = {
            "id": c["id"],
            "input": i,
            "near_jie": c.get("near_jie", False),
            # 逐柱十神折出来
            "pillar_shishen": {
                p: {"shishen_gan": chart[p].get("shishen_gan", ""),
                    "shishen_zhi": chart[p].get("shishen_zhi", "")}
                for p in PILLARS
            },
        }
        for k in ANALYSIS_TOP:
            row[k] = chart.get(k)
        cases.append(row)

    out = {"cases": cases}
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"✓ {len(cases)} 例 → {a.out}")
    # 落地自查：字段集必须与约定的分析层字段**逐字**一致，缺一个都要当场炸
    got = {k for k in cases[0] if k not in ("id", "input", "near_jie")}
    want = set(ANALYSIS_TOP) | {"pillar_shishen"}
    assert got == want, f"输出字段与约定不一致：多 {got - want}，缺 {want - got}"
    print(f"  字段：{' '.join(sorted(want))}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
八字对拍（3.5.1）：`paipan/bazi.js`  vs  shushu `core/bazi/`。
两个部分共用同一批样例与同一套分桶：

  3.5.1a 排盘核    `buildChart`   vs `chart.py::build_chart`
  3.5.1b 静态分析  `analyzeChart` vs `analyzer.py::analyze_chart`
                  （十神逐柱与汇总 / 旺衰 / 格局 / 神煞）
  —— 调候与格局成败（`tiaohou_yongshen.py`）属 3.5.3，两边都不产出。

**为什么不能只跑一次 `diff.py`**：1214 例里有 623 例落在交节窗口、182 例是晚子时，
而两侧**历书不同源** —— shushu 的节气表系统性偏早 4.6–8.2 分钟（实测见
`probe_bazi_jieqi_offset.py`）。这些例子的月柱/年柱差异**不是排盘逻辑的差异**。
若混在一起，就只能写一张覆盖 `例.year_pillar` 的申报表 —— 那是**撒胡椒面**：
它会连带盖住真正排盘逻辑的错，白名单宽到没有意义（见 memory: ai3000-duipan-harness）。

故按**原因**分桶，严格段**一条申报都不给**：

  · 严格段 = 非交节窗口 且 非晚子时 → `diff.py`，**必须 0 差异**。这一段的绿有信息量。
  · 申报段 = 交节 和/或 晚子时 → 差异**必须落在该原因带出的字段闭包内**，否则算真 bug。
  · 未纳入 = 真太阳时（城市/经度）→ 3.5.1 不含此能力，**显式计数**，不静默跳过。

字段闭包（申报不是「这些字段可以不一样」，而是「**因为已申报的原因**，这些字段会连带变」）：

  · 晚子时换日 ⇒ 日柱变 ⇒ 日主/日主五行变（日主即日柱天干）、时柱随日干变（五鼠遁）
  · 交节换月/换年 ⇒ 月柱/年柱变 ⇒ 胎元(月干+1/月支+3)、命宫与身宫(含月支序；天干以年干
    起五虎遁)、人元司令(以月支为键)全变
  · 分析层的一切都是四柱的函数 ⇒ 四柱变了，分析层全部字段都属「派生」

用法：
    node   duipan/run_js_bazi.js          > duipan/js_bazi.json
    node   duipan/run_js_bazi_analysis.js > duipan/js_bazi_analysis.json
    python3 duipan/diff_bazi_chart.py
退出码：0 = 两部分均无非申报差异。
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent

# 排盘层：按原因给字段闭包
REASON_FIELDS_CHART = {
    "晚子时": {"day_pillar", "hour_pillar", "day_master", "day_master_wuxing"},
    "交节": {"year_pillar", "month_pillar", "taiyuan", "minggong", "shengong",
             "renyuan_siling", "day_master", "day_master_wuxing"},
}

ANALYSIS_TOP = ("pillar_shishen", "shishen_summary", "strength_info", "strength",
                "pattern_info", "pattern", "pattern_desc", "shensha")
# 分析层再无「非派生」字段可留：全部由四柱推出，故两个原因都放行整个分析层。
REASON_FIELDS_ANALYSIS = {
    "晚子时": set(ANALYSIS_TOP),
    "交节": set(ANALYSIS_TOP),
}

PARTS = [
    {
        "name": "3.5.1a 排盘核",
        "gold": "golden_bazi.json", "js": "js_bazi.json",
        "reason_fields": REASON_FIELDS_CHART,
        "strict_gold": "golden_bazi_strict.json", "strict_js": "js_bazi_strict.json",
    },
    {
        "name": "3.5.1b 静态分析",
        "gold": "golden_bazi_analysis.json", "js": "js_bazi_analysis.json",
        "reason_fields": REASON_FIELDS_ANALYSIS,
        "strict_gold": "golden_bazi_analysis_strict.json",
        "strict_js": "js_bazi_analysis_strict.json",
    },
]


def collect_values(charts, extractor):
    """把一批盘过一遍 extractor，收 distinct 值。"""
    out = Counter()
    for _, ch in charts.items():
        for v in extractor(ch):
            out[v] += 1
    return out


def extractors(part):
    """该层的「分支枚举字段」——用来断言严格段确实走到了这些分支。

    为什么非做不可：严格段只占三分之一（434/1214），若某个格局/某组十神**只出现在
    申报段**，那它在严格段里根本没被验过，而「0 差异」看起来一样是绿的 ——
    那是橡皮章。这里把「全样例的分支数」与「严格段的分支数」摆在一起，缺口就会显形。
    """
    if part["name"].startswith("3.5.1a"):
        return {
            "日主": lambda c: [c["day_master"]],
            "四柱干支": lambda c: [c[k]["tiangan"] + c[k]["dizhi"]
                                   for k in ("year_pillar", "month_pillar",
                                             "day_pillar", "hour_pillar")],
            "月支": lambda c: [c["month_pillar"]["dizhi"]],
            "纳音": lambda c: [c[k]["nayin"] for k in ("year_pillar", "month_pillar",
                                                       "day_pillar", "hour_pillar")],
        }
    return {
        "格局": lambda c: [c["pattern"]],
        "旺衰": lambda c: [c["strength"]],
        "逐柱十神": lambda c: [v["shishen_gan"] for v in c["pillar_shishen"].values()]
                              + [v["shishen_zhi"] for v in c["pillar_shishen"].values()],
        "神煞名": lambda c: [s["name"] for s in c["shensha"]],
    }


def report_coverage(part, golden, strict_gold):
    print("  ── 覆盖断言：严格段是否真的走到了这些分支")
    gaps = []
    for label, fn in extractors(part).items():
        full = collect_values({c["id"]: c for c in golden}, fn)
        strict = collect_values(strict_gold, fn)
        only_declared = sorted(set(full) - set(strict))
        line = f"     {label:8s} 全样例 {len(full):3d} 种 / 严格段 {len(strict):3d} 种"
        if only_declared:
            line += f"  ⚠ 仅出现在申报段：{only_declared}"
            gaps.append((label, only_declared))
        print(line)
    return gaps


def load(part):
    golden = json.loads((HERE / part["gold"]).read_text(encoding="utf-8"))["cases"]
    jsp = HERE / part["js"]
    # 被验方是跑 node 生成的：文件不在或为空，是**没跑**而不是「有差异」。
    # 直接 json.loads 会抛一大段 traceback，把「你忘了跑哪条命令」这条信息埋掉。
    if not jsp.exists() or not jsp.read_text(encoding="utf-8").strip():
        raise SystemExit(f"✗ 被验方 {part['js']} 不存在或为空 —— 先跑 run_js_bazi*.js 生成它")
    js = json.loads(jsp.read_text(encoding="utf-8"))
    return golden, js


def run_part(part) -> int:
    print(f"\n════ {part['name']}   （金标准 {part['gold']} ← 被验 {part['js']}）")
    golden, js = load(part)

    missing = [c["id"] for c in golden if c["id"] not in js]
    if missing:
        print(f"  ✗ JS 侧缺 {len(missing)} 例，例如 {missing[:3]}")
        return 2

    strict_gold, strict_js, decl = {}, {}, []
    skipped_tst = []
    key_mismatch = Counter()

    for c in golden:
        cid = c["id"]
        jchart = js[cid]
        # 只保留 JS 侧也有的键，并要求**键集完全一致**：少一个字段说明移植漏了，
        # 多一个说明凭空造的，两种都不该静默通过。
        gchart = {k: v for k, v in c.items() if k in jchart}
        if set(gchart) != set(jchart):
            key_mismatch[tuple(sorted(set(jchart) - set(gchart)))] += 1
            key_mismatch[tuple("缺:" + k for k in sorted(set(gchart) - set(jchart)))] += 1
            continue

        inp = c["input"]
        # 真太阳时**先判**：它整体平移时刻，连日期都能挪一天（乌鲁木齐 00:30 → 前一日
        # 22:18），放进任何申报桶都会掩盖真 bug。单列计数、不静默跳过。
        if inp.get("city") or inp.get("longitude") is not None:
            skipped_tst.append(cid)
            continue

        reasons = []
        if inp["hour"] == 23:
            reasons.append("晚子时")
        if c.get("near_jie"):
            reasons.append("交节")
        if reasons:
            decl.append((cid, gchart, jchart, "+".join(reasons)))
        else:
            strict_gold[cid] = gchart
            strict_js[cid] = jchart

    if key_mismatch:
        print("  ✗ 字段集不一致（移植漏字段，或凭空加字段）——分析层尤其要看这条：")
        for k, n in key_mismatch.most_common(10):
            print(f"     {n:4d} 例  {list(k)}")
        return 2

    # ── 严格段 ──
    (HERE / part["strict_gold"]).write_text(
        json.dumps(strict_gold, ensure_ascii=False, indent=1), encoding="utf-8")
    (HERE / part["strict_js"]).write_text(
        json.dumps(strict_js, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"  ── 严格段：{len(strict_gold)} 例（非交节、非晚子时）—— **不给任何申报**")
    r = subprocess.run(
        [sys.executable, str(HERE / "diff.py"),
         str(HERE / part["strict_gold"]), str(HERE / part["strict_js"]), "--case-keys"],
        capture_output=True, text=True)
    for ln in r.stdout.strip().splitlines()[-14:]:
        print("     " + ln)
    strict_ok = (r.returncode == 0)

    report_coverage(part, golden, strict_gold)

    if skipped_tst:
        print(f"  ── **未纳入**：{len(skipped_tst)} 例真太阳时（城市/经度）"
              f"—— 3.5.1 不含此能力，不参与对拍")
        for cid in skipped_tst[:10]:
            print(f"        {cid}")

    # ── 申报段 ──
    print(f"  ── 申报段：{len(decl)} 例，按申报原因核查")
    stat = Counter()
    unexpected = []
    for cid, gchart, jchart, reason in decl:
        diffs = sorted(k for k in jchart if gchart.get(k) != jchart[k])
        if not diffs:
            stat[f"[{reason}] 无差异"] += 1
            continue
        allowed = set()
        for one in reason.split("+"):
            allowed |= part["reason_fields"][one]
        bad = [k for k in diffs if k not in allowed]
        if bad:
            unexpected.append((cid, reason, bad, diffs))
        stat[f"[{reason}] 差异字段={diffs}"] += 1

    for line, n in stat.most_common(20):
        print(f"     {n:4d} 例  {line}")

    if unexpected:
        print(f"\n  ✗ 申报段出现**申报形态之外**的差异 {len(unexpected)} 例"
              f"——这是真 bug，不是历书来源差异：")
        for cid, reason, bad, diffs in unexpected[:10]:
            print(f"        {cid}  [{reason}] 意外字段={bad} 全部差异={diffs}")
        return 2

    print("     ✓ 申报段差异全部落在该原因带出的字段内")
    return 0 if strict_ok else 2


def main() -> int:
    rc = 0
    for part in PARTS:
        rc |= run_part(part)
    print("\n" + ("═" * 60))
    print("✓ 全部通过" if rc == 0 else "✗ 有未申报差异，见上")
    return rc


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字地支关系层**（3.5.3a）
`core/bazi/relations.py`：刑冲合害破 + 大运流年触发 + prompt 格式化。

── 为什么这一层的做法与前面各层不同 ──
`analyze_all_relations` 是**纯函数**：只读四柱的 `dizhi`，不碰历法、十神、旺衰。
输入域是 12⁴ = **20736 个有序四支**，小到可以**全枚举**。于是：
  · 不需要抽样（也就没有「样例没覆盖到某分支」这类漏洞）；
  · 不需要「按原因申报」（两侧输入**逐字相同**，没有任何可归因于历书的差异）；
  · 覆盖度不需要另外断言 —— 全枚举本身就是覆盖证明。

── 为什么存「摘要」而不是存全量输出 ──
全量输出约 16MB（每个组合带若干条中文解读），远超仓库里其他金标准。
改为：**逐例比对的值一律由本脚本用 Python 规范化后再摘要**（`canon` + sha256），
JS 侧只负责把它算出来的完整 JSON 原样吐出来。
关键在于**规范化只有一份实现（Python 的 `json.dumps(sort_keys=True)`）**：
若让 JS 也自己算摘要，就多出一处「两边各自实现同一件事」的漂移点 ——
那种错误会伪装成被验方的错误（层 7 的静默 fallback 就是这么骗过一次）。

摘要不够诊断时**不需要重新生成金标准**：`diff_bazi_relations.py` 会就地 import
shushu 重算那**一个**样例并打印两侧完整差异。

── triggers 与 format 为什么分开摘要 ──
`analyze_all_relations` / `format_relations_for_prompt` / `analyze_dayun_liunian_trigger`
各出各的摘要数组，失败时能立刻定位到**是关系算错了还是文案拼错了**。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_relations.py [out.json]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from itertools import product
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))

from core.bazi.relations import (                                       # noqa: E402
    analyze_all_relations, analyze_dayun_liunian_trigger, format_relations_for_prompt,
)

# 与本项目 `constants.js` 的 DIZHI 同序（子起）。
GRID = list("子丑寅卯辰巳午未申酉戌亥")
PILLARS = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")

# 全量样例里挑多少例存完整输出（供 diff 直接看，不必重算）
FULL_SAMPLE = 240
# 抽样步长与网格规模互质，保证抽到的例在 12⁴ 索引上铺得开
FULL_STRIDE = 86


def chart_of(tup):
    """四支 → shushu `analyze_all_relations` 要吃的那种 chart。

    `tiangan` 固定填「甲」：本层两个函数都**不读**它，填什么是等价的。
    之所以要填，是为了让这个 dict 的形状与真盘一致 —— 若哪天 shushu 的关系层
    开始读天干，对拍会立刻显形（而不是因为字段缺失被 `except` 吞掉）。
    """
    return {p: {"tiangan": "甲", "dizhi": b} for p, b in zip(PILLARS, tup)}


def canon(obj):
    """规范化：键排序、无空格、不转义非 ASCII。**摘要的唯一实现**。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def trigger_cases():
    """触发层要覆盖的 (target, natal, 位置) 全组合。

    触发函数对每根命柱各判一次，输出只取决于 (target 支, 该柱支) 这一对。
    所以全覆盖 = 12 target × 12 natal × 4 位置 = 576 个三元组。

    构造方式：对每个 (位置 pos, 支 n) 造一个四支组合 —— pos 位放 n，其余三位
    按支序**顺时针**填另外三支（刻意让它们彼此也成关系，这样其余三柱的产出
    同样落在逐字比对里；只挑目标位置那几条比等于放掉三根柱）。

    ⚠ 因此组合数只有 4 × 12 = **48 个**（不是 576）—— 576 是「组合 × target」的调用数。
    我第一版这里多套了一层 `for t in GRID` 却没用上 t，写出 48 个组合、docstring 却
    声称 576 个；调用数是对的，**说明文字是假的**。留此注以免后手再误读。
    """
    cases = []
    for pos in range(4):
        for n in GRID:
            rest = [GRID[(GRID.index(n) + k + 1) % 12] for k in range(3)]
            tup = []
            it = iter(rest)
            for i in range(4):
                tup.append(n if i == pos else next(it))
            cases.append(tup)
    # 去重（不同 pos 可能构造出同一个组合，留着只是浪费）
    seen, uniq = set(), []
    for tup in cases:
        k = "".join(tup)
        if k not in seen:
            seen.add(k)
            uniq.append(tup)
    return uniq


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_relations.json"))
    a = ap.parse_args()

    tuples = list(product(GRID, repeat=4))
    assert len(tuples) == 12 ** 4, len(tuples)

    rel_digest, fmt_digest, counts = [], [], []
    full = []
    # 事件类型谱：全枚举下每种关系都该出现过，且总数能对上「关系总数 × 组合数」
    type_hist = {}

    for idx, tup in enumerate(tuples):
        ch = chart_of(tup)
        rel = analyze_all_relations(ch)
        txt = format_relations_for_prompt(rel)
        rel_digest.append(sha(canon(rel)))
        fmt_digest.append(sha(txt))
        counts.append([rel["summary"]["total_he"], rel["summary"]["total_chong"],
                       rel["summary"]["total_xing"], rel["summary"]["total_hai"],
                       rel["summary"]["total_po"]])
        for e in rel["he"] + rel["chong"] + rel["xing"] + rel["hai"] + rel["po"]:
            type_hist[e["type"]] = type_hist.get(e["type"], 0) + 1
        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"branches": "".join(tup), "relations": rel, "format": txt})

    # ── 触发层 ──
    tcases, t_rel, t_counts = trigger_cases(), [], []
    for tup in tcases:
        ch = chart_of(tup)
        row = {}
        for target in GRID:
            trig = analyze_dayun_liunian_trigger(ch, target, "大运")
            row[target] = trig
            t_rel.append(sha(canon(trig)))
            t_counts.append(len(trig))
    trig = {
        "branches": ["".join(t) for t in tcases],
        "targets": GRID,
        "label": "大运",
        "digest": t_rel,
        "counts": t_counts,
    }

    out = {
        "meta": {
            "layer": "3.5.3a 八字地支关系层",
            "source": "shushu core/bazi/relations.py",
            "grid": GRID,
            "pillars": list(PILLARS),
            "n_tuples": len(tuples),
            "n_trigger_tuples": len(tcases),
            # 摘要算法写进金标准：算法变了要能立刻看出「这不是被验方变了」
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "full_stride": FULL_STRIDE,
        },
        "rel_digest": rel_digest,
        "fmt_digest": fmt_digest,
        "counts": counts,
        "full": full,
        "triggers": trig,
        "type_hist": type_hist,
    }
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    size = Path(a.out).stat().st_size
    print(f"✓ 全枚举 {len(tuples)} 个四支组合 → {a.out}（{size / 1024:.0f} KB）")
    print(f"  触发层 {len(tcases)} 组合 × {len(GRID)} target = {len(t_rel)} 例")
    print(f"  完整输出样例 {len(full)} 例（步长 {FULL_STRIDE}）")
    print(f"  事件类型谱：{json.dumps(type_hist, ensure_ascii=False)}")

    # 落地自查：全枚举下每类关系都必须出现过。
    # **这一条不能省**：若某类关系一条都没产出，两侧摘要照样「一致」—— 那正是
    # 「空绿」（层 7 的教训）。所以要对**类型集合**本身断言，而不是只比摘要。
    # 下界取 288 = 三支类关系的最小出现数：C(4,3)=4 个位置选法 × 3!=6 种支分配
    # × 剩下一柱任取 12 = 288。两支类关系的下界更高（≥ 6×2×12² = 1728），
    # 故 288 对**所有**类型都成立，用一个数就够。
    EXPECT_TYPES = {"六合", "三合局", "半三合", "三会方", "六冲",
                    "互刑", "三刑", "刑（部分三刑）", "自刑", "相害", "相破"}
    assert set(type_hist) == EXPECT_TYPES, (
        f"关系类型谱不对：多 {set(type_hist) - EXPECT_TYPES}，缺 {EXPECT_TYPES - set(type_hist)}")
    for t, n in type_hist.items():
        assert n >= 288, f"关系类型 {t} 只出现 {n} 次，低于下界 288 —— 全枚举不该如此"
    print(f"  ✓ {len(EXPECT_TYPES)} 类关系全部出现，且每类 ≥ 288 次（全枚举下界）")


if __name__ == "__main__":
    main()

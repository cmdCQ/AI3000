#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字地支关系层（3.5.3a）。

与前面各层不同，这里**没有申报表、也没有分桶** —— 输入域被全枚举了
（12⁴ = 20736 个有序四支），两侧喂的是**同一批支**，不存在任何可归因于
历书/派别的差异。有差异就是实现不同。

比对三层，逐层定位：
  ① `rel_digest`  关系结构本身（六合/三合/三会/冲/刑/害/破 + summary 文案）
  ② `fmt_digest`  prompt 文案（拼串、截断、顺序）
  ③ `triggers`    大运流年触发（同法）
另有 `counts`（五类关系的条数）与 `type_hist`（事件类型谱）两份**冗余**比对：
它们被 ①② 蕴含，但失败时能一眼看出「是全空还是只少一类」，省一轮排查。
冗余比对不算浪费 —— 它证明的是「金标准本身非空」，防的是「空绿」。

诊断：摘要不一致时，本脚本**就地 import shushu** 重算那一例并打印两侧完整差异
（`diff.py::walk` 复用）。因此金标准里不必存全量输出。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_relations.py
    [golden.json] [js.json]
退出码：0 = 全同。
"""
from __future__ import annotations

import hashlib
import json
import sys
from itertools import product
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

from diff import walk                                                    # noqa: E402

GOLDEN = HERE / "golden_bazi_relations.json"
JS = HERE / "js_bazi_relations.json"
MAX_SHOW = 8


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def rel_counts(r):
    s = r["summary"]
    return [s["total_he"], s["total_chong"], s["total_xing"], s["total_hai"], s["total_po"]]


def show_case(idx, tuples, grid, js_rel):
    """就地重算 shushu 那一例，打印完整差异。"""
    tup = tuples[idx]
    from core.bazi.relations import analyze_all_relations                # noqa: E402

    pillars = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")
    ch = {p: {"tiangan": "甲", "dizhi": b} for p, b in zip(pillars, tup)}
    gold = analyze_all_relations(ch)
    out = []
    walk(gold, js_rel, "", out, {})
    print(f"     四支 {''.join(tup)}  差异 {len(out)} 处")
    for p, a, b, _ in out[:6]:
        print(f"       {p or '<根>'}：金标准={a!r}  被验={b!r}")
    if len(out) > 6:
        print(f"       …另有 {len(out) - 6} 处")


def main() -> int:
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else GOLDEN
    jp = Path(sys.argv[2]) if len(sys.argv) > 2 else JS
    g = json.loads(gp.read_text(encoding="utf-8"))
    j = json.loads(jp.read_text(encoding="utf-8"))

    grid = g["meta"]["grid"]
    tuples = list(product(grid, repeat=4))
    n = g["meta"]["n_tuples"]
    assert n == 12 ** 4 and len(tuples) == n, f"金标准网格不是全枚举：{n}"

    problems = []

    # 长度先查：长度不对时逐例索引没有意义，直接说清
    for key, gold_len in (("rel", n), ("fmt", n),
                          ("trig", len(g["triggers"]["digest"]))):
        got = len(j.get(key, []))
        if got != gold_len:
            problems.append(f"[{key}] JS 出 {got} 例，金标准 {gold_len} 例")
    if problems:
        for p in problems:
            print(f"✗ {p}")
        return 2

    print(f"── ① 关系结构（{n} 例，全枚举 12⁴）")
    bad_rel = [i for i in range(n) if sha(canon(j["rel"][i])) != g["rel_digest"][i]]
    print(f"   差异 {len(bad_rel)} 例")

    print(f"── ② prompt 文案（{n} 例）")
    bad_fmt = [i for i in range(n) if sha(j["fmt"][i]) != g["fmt_digest"][i]]
    print(f"   差异 {len(bad_fmt)} 例")

    tn = len(g["triggers"]["digest"])
    print(f"── ③ 大运流年触发（{tn} 例 = 48 组合 × 12 target）")
    bad_trig = [i for i in range(tn) if sha(canon(j["trig"][i])) != g["triggers"]["digest"][i]]
    print(f"   差异 {len(bad_trig)} 例")

    print("── ④ 冗余：五类关系条数")
    bad_cnt = [i for i in range(n) if rel_counts(j["rel"][i]) != g["counts"][i]]
    print(f"   差异 {len(bad_cnt)} 例")

    print("── ⑤ 冗余：事件类型谱（防「空绿」）")
    hist = {}
    for r in j["rel"]:
        for k in ("he", "chong", "xing", "hai", "po"):
            for e in r[k]:
                hist[e["type"]] = hist.get(e["type"], 0) + 1
    if hist != g["type_hist"]:
        problems.append(f"类型谱不一致：\n     金标准 {g['type_hist']}\n     被验   {hist}")
    else:
        print(f"   {len(hist)} 类全同（{sum(hist.values())} 条事件）")

    # ── 抽样全量对拍：金标准里存了完整输出的那些例，直接逐字比 ──
    stride = g["meta"]["full_stride"]
    print(f"── ⑥ 抽样全量（{len(g['full'])} 例，步长 {stride}）")
    bad_full = []
    for k, row in enumerate(g["full"]):
        idx = k * stride
        out = []
        walk(row["relations"], j["rel"][idx], "", out, {})
        if out:
            bad_full.append((idx, out))
        if j["fmt"][idx] != row["format"]:
            bad_full.append((idx, [("format", row["format"], j["fmt"][idx], None)]))
    print(f"   差异 {len(bad_full)} 例")

    for name, bad in (("①关系", bad_rel), ("②文案", bad_fmt), ("③触发", bad_trig),
                      ("④条数", bad_cnt)):
        if bad:
            problems.append(f"{name} 有 {len(bad)} 例不同：索引 {bad[:MAX_SHOW]}"
                            f"{' …' if len(bad) > MAX_SHOW else ''}")

    if bad_rel:
        print()
        print(f"── 关系层前 {MAX_SHOW} 例差异明细（就地重算 shushu）")
        for idx in bad_rel[:MAX_SHOW]:
            print(f"   [{idx}]")
            show_case(idx, tuples, grid, j["rel"][idx])

    if bad_full:
        print()
        print("── 抽样全量差异明细")
        for idx, out in bad_full[:MAX_SHOW]:
            print(f"   [{idx}] 四支 {''.join(tuples[idx])}")
            for p, a, b, _ in out[:6]:
                print(f"     {p or '<根>'}：金标准={a!r}  被验={b!r}")

    if problems:
        print()
        for p in problems:
            print(f"✗ {p}")
        return 2

    print()
    print(f"✓ 全枚举 {n} 例逐例摘要比对（sha256 不同即内容不同，等价逐字）"
          f" + 触发 {tn} 例 + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同，不存在需要申报的差异来源）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

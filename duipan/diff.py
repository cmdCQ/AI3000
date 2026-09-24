# -*- coding: utf-8 -*-
"""对拍 · 逐字段比对两份同形 JSON，带「已申报偏差」白名单。

原则：对拍的作用是证明 **实现忠实于基准**，不是证明基准对（基准侧另有
独立校验脚本 verify_*.py）。所以这里只做机械比对，不做价值判断。

申报偏差（allow）必须写明理由，且**仍会打印实际值**——这样偏差本身
若发生变化也能看见，不会变成一个藏 bug 的黑洞。

用法：
    python diff.py golden.json other.json [--allow allow.json] [--max 20] [--case-keys]
`--case-keys`：顶层键是样例 id（本 harness 的 golden_*.json 都是这个形状）时
把聚合路径里的样例 id 折成 `<例>`，否则逐例一行、几千行没信息量。
退出码：0 = 无非申报差异。
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path


def walk(a, b, path, out, allow):
    """递归比对，把差异收集到 out（(path, a, b, declared)）。"""
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            p = f"{path}.{k}" if path else str(k)
            if k not in a:
                out.append((p, "<缺>", b[k], p in allow))
            elif k not in b:
                out.append((p, a[k], "<缺>", p in allow))
            else:
                walk(a[k], b[k], p, out, allow)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            out.append((path, f"len={len(a)}", f"len={len(b)}", path in allow))
        for i in range(min(len(a), len(b))):
            walk(a[i], b[i], f"{path}[{i}]", out, allow)
    else:
        if a != b:
            out.append((path, a, b, path in allow))


def field_of(path: str) -> str:
    """把 a.b[0].c 归一成 a.b[].c，便于按字段聚合。"""
    parts = []
    for seg in path.split("."):
        if "[" in seg:
            parts.append(seg.split("[")[0] + "[]")
        else:
            parts.append(seg)
    return ".".join(parts)


def strip_case(path: str, case_keys) -> str:
    """把顶层样例 id 折成 <例>，否则每例一行、几千行没信息量。

    只在 `--case-keys` 下生效：该假定（顶层键=样例 id）对本 harness 的
    golden_*.json 成立，但对「顶层键就是字段名」的 JSON 不成立，
    故不做隐式猜测——猜错会把字段名抹掉，比对报告失真。
    """
    head, _, rest = path.partition(".")
    if head in case_keys:
        return f"<例>.{rest}" if rest else "<例>"
    return path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("golden")
    ap.add_argument("other")
    ap.add_argument("--allow", help="申报偏差 JSON：{path 前缀: 理由}")
    ap.add_argument("--max", type=int, default=20, help="每类最多打印几条")
    ap.add_argument("--case-keys", action="store_true",
                    help="顶层键是样例 id（golden_*.json 即此形）；聚合时折成 <例>")
    args = ap.parse_args()

    a = json.loads(Path(args.golden).read_text("utf-8"))
    b = json.loads(Path(args.other).read_text("utf-8"))
    case_keys = set(a) if args.case_keys and isinstance(a, dict) else set()

    def agg(path: str) -> str:
        return strip_case(field_of(path), case_keys)

    allow = {}
    if args.allow and Path(args.allow).exists():
        allow = json.loads(Path(args.allow).read_text("utf-8"))

    diffs = []
    walk(a, b, "", diffs, set(allow))

    declared = [d for d in diffs if d[3]]
    real = [d for d in diffs if not d[3]]

    total_leaves = [0]

    def count(x):
        if isinstance(x, dict):
            for v in x.values():
                count(v)
        elif isinstance(x, list):
            for v in x:
                count(v)
        else:
            total_leaves[0] += 1

    count(a)

    print(f"金标准 {args.golden}")
    print(f"被验方 {args.other}")
    print(f"比较叶子值 {total_leaves[0]} 个；差异 {len(diffs)} 处"
          f"（申报 {len(declared)} / 未申报 {len(real)}）")

    if declared:
        print(f"\n── 已申报偏差（{len(declared)} 处，仍需人工确认实际值未漂移）──")
        # 按「字段 + 理由」聚合（不按精确路径，否则每例一行、成百上千行没信息量）
        byr = Counter((agg(d[0]), allow.get(d[0], "")) for d in declared)
        for (f, why), n in byr.most_common():
            print(f"  {n:4d}× {f}   理由：{why}")
        # 取值分布：申报的偏差本身也可能漂移（比如同一字段冒出新的取值组合）
        byv = Counter((agg(d[0]), str(d[1]), str(d[2])) for d in declared)
        tag = "" if len(byv) <= args.max else f"（取值组合 {len(byv)} 种，抽样）"
        if tag:
            print(f"        {tag}")
        for (f, x, y), n in byv.most_common(args.max):
            print(f"        {n:4d}× {f}: 金标准={x!r} 被验方={y!r}")

    if real:
        print(f"\n── 未申报差异（{len(real)} 处）──")
        byf = Counter(agg(d[0]) for d in real)
        for f, n in byf.most_common():
            print(f"  {n:4d}× {f}")
        print()
        for p, x, y, _ in real[: args.max]:
            print(f"  ✗ {p}\n      金标准={x!r}\n      被验方={y!r}")
        if len(real) > args.max:
            print(f"  … 另有 {len(real) - args.max} 处")
        return 1

    print("\n✓ 无非申报差异")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

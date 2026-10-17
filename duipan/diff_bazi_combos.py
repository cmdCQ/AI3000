#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字组合断层（3.5.3d）。

两侧输入逐字相同（金标准的 `cases[i].in` 就是双方共用的输入，JS 侧照读），
故与关系层/特殊格局层/用神层一样**没有申报表、没有分桶**：有差异就是实现不同。

比对六层，逐层定位：
  ⓪ 闸门 —— 家族契约、每家族每输出的**形状集**、条数。形状集是这一层特有的闸门：
     `evaluate_geju` 的 `available` 真/假**键集不同**，少一种形状会让后面的摘要
     全以「差异」的面目出现，先在闸门挡住。
  ① 逐例摘要 —— 每家族每输出一份 sha256（共 94314 例、7 个输出对象）。
  ② 逐例标志位 —— 分支代号。由**比对器**从被验方产物现算，不是被验方自报，
     也不是照抄金标准生成器的实现（两份独立实现互为对照）。
  ③ 逐例计数 —— 同上，独立重算。
  ④ 六组分支谱 —— **防「空绿」**：谱一致才证明金标准本身非空、每档都真出现过。
  ⑤ 抽样深层逐字段 —— `full` 里的原例用 `diff.py::walk` 递归比到叶子。

本层**零归一**（金标准 `meta.norm` 写着理由）：没有任何依赖进程哈希顺序的遍历。
已用 `PYTHONHASHSEED=0/1` 复跑核对金标准逐字节相同（三家 md5 全同）。
不归一是**故意**的：归一是把「已知的抖动」抹平，没有抖动还归一，只会连真差异一起抹掉。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_combos.py [golden.json] [js.json]
退出码：0 = 全同，2 = 有差异。
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))   # 差异明细要就地重算 shushu 侧
sys.path.insert(0, str(HERE))

from diff import walk                                                    # noqa: E402

GOLDEN = HERE / "golden_bazi_combos.json"
JS = HERE / "js_bazi_combos.json"
MAX_SHOW = 5

# 家族 → 输出对象名（顺序即摘要顺序）。比对器**自己**写死一份，不从金标准读：
# 从金标准读就等于让被验方定义契约，少一个输出对象也不会被发现。
FAMILIES = {
    "chart": ["combos"],
    "sha": ["combos"],
    "geju": ["geju"],
    "suiyun": ["suiyun"],
    "xiji": ["liunian_combo", "period_combo"],
    "period": ["period_combo"],
}


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ── ②③ 的实现：与生成器**各写一份**（独立重算，互为对照）──

def sha_part(kind, out):
    return out["combos"]["shensha_combos"] if kind == "chart" else out["combos"]


def flag_of(kind, out):
    if kind in ("chart", "sha"):
        c = sha_part(kind, out)
        if not c["combos"]:
            return "0"
        if c["ji_count"] > c["xiong_count"]:
            return "1"
        if c["xiong_count"] > c["ji_count"]:
            return "2"
        return "3"
    if kind == "geju":
        g = out["geju"]
        if not g["available"]:
            return "0"
        return {"格成": "1", "破而有救": "2", "格破": "3", "格局未显": "4"}[g["status"]]
    if kind == "suiyun":
        tags = out["suiyun"]["tags"]
        if not tags:                       # shushu 的平和兜底漏了「有引动无并冲」这一支
            return "0"
        return {"岁运并临": "1", "岁运相战(天克地冲)": "2",
                "岁运地支相冲": "3", "岁运平和": "4"}[tags[0]]
    if kind in ("xiji", "period"):
        key = "liunian_combo" if kind == "xiji" else "period_combo"
        return {"喜": "1", "忌": "2", "平": "3"}[out[key]["xiji"]]
    raise AssertionError(kind)


def count_of(kind, out):
    if kind in ("chart", "sha"):
        c = sha_part(kind, out)
        return [len(c["combos"]), c["ji_count"], c["xiong_count"]]
    if kind == "geju":
        g = out["geju"]
        return [0, 0] if not g["available"] else [len(g["cheng_hit"]), len(g["po_hit"])]
    if kind == "suiyun":
        return [len(out["suiyun"]["tags"]), len(out["suiyun"]["notes"])]
    if kind == "xiji":
        return [len(out["liunian_combo"]["themes"]), len(out["period_combo"]["themes"])]
    if kind == "period":
        return [len(out["period_combo"]["themes"])]
    raise AssertionError(kind)


def show_case(c, js, tag=""):
    """就地对**这一例**重算 shushu 侧，再逐字段 walk —— 差异定位不必去翻金标准。"""
    from gen_golden_bazi_combos import run_case                         # noqa: E402

    py = run_case(c)
    print(f"   [{c['kind']}/{c['id']}] {json.dumps(c['in'], ensure_ascii=False)[:150]}{tag}")
    for name in FAMILIES[c["kind"]]:
        out = []
        walk(py[name], js[name], name, out, {})
        if out:
            print(f"     ✗ {name} 差 {len(out)} 处")
            for p, x, y, _ in out[:6]:
                print(f"         {p or '<根>'}：金标准={x!r}  被验={y!r}")


def main() -> int:
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else GOLDEN
    jp = Path(sys.argv[2]) if len(sys.argv) > 2 else JS
    g = json.loads(gp.read_text(encoding="utf-8"))
    j = json.loads(jp.read_text(encoding="utf-8"))

    cases, n = g["cases"], len(g["cases"])
    assert n == g["meta"]["n_cases"], "金标准自身长度不一致"
    problems = []

    # ── ⓪ 闸门 ──
    if j.get("schema") != g["meta"]["families"]:
        print(f"✗ 闸门 家族契约不一致：\n   金标准 {g['meta']['families']}\n   被验   {j.get('schema')}")
        return 2
    for k, m in g["meta"]["shapes"].items():
        jm = j.get("shapes", {}).get(k)
        if jm != m:
            print(f"✗ 闸门 家族 {k} 的形状集不一致：\n   金标准 {m}\n   被验   {jm}")
            return 2
    for k, want in g["meta"]["kinds"].items():
        got = len(j.get("outs", {}).get(k, []))
        if got != want:
            problems.append(f"家族 {k}：JS 出 {got} 例，金标准 {want} 例")
    if problems:
        for p in problems:
            print(f"✗ 闸门未过：{p}")
        return 2
    print(f"── 闸门：六家族契约一致；形状集一致（"
          + " · ".join(f"{k} " + ",".join(f"{o}×{len(v)}" for o, v in m.items())
                       for k, m in g["meta"]["shapes"].items()) + "）")

    # 逐例：金标准按 kind 顺序排列，JS 侧按 kind 分桶 —— 这里对齐两边的下标
    pos = []                      # pos[idx] = (kind, 桶内序号)
    slot = {}
    for idx, c in enumerate(cases):
        k = c["kind"]
        m = slot.get(k, 0)
        slot[k] = m + 1
        pos.append((k, m))

    # ── ① 摘要 ──
    bad_dig, bad_flag, bad_cnt = [], [], []
    hist = {}
    for idx, c in enumerate(cases):
        k, m = pos[idx]
        js = j["outs"][k][m]
        got = [sha(canon(js[o])) for o in FAMILIES[k]]
        if got != g["digest"][str(idx)]:
            bad_dig.append(idx)
        f = flag_of(k, js)
        if f != g["flags"][idx]:
            bad_flag.append(idx)
        if count_of(k, js) != g["counts"][idx]:
            bad_cnt.append(idx)
        hist.setdefault(k, {})
        hist[k][f] = hist[k].get(f, 0) + 1

    print(f"── ① 逐例摘要（{n} 例 · "
          f"{sum(len(v) for v in FAMILIES.values())} 个输出对象）：差异 {len(bad_dig)} 例")
    print(f"── ② 逐例标志位（比对器独立重算）：差异 {len(bad_flag)} 例")
    print(f"── ③ 逐例计数（比对器独立重算）：差异 {len(bad_cnt)} 例")

    # ── ④ 六组分支谱（防空绿）──
    print("── ④ 分支谱（防空绿：谱同才证明每档都真出现过）")
    for k in sorted(hist):
        if hist[k] != g["hist"][k]:
            problems.append(f"谱「{k}」不一致：\n     金标准 {sorted(g['hist'][k].items())}\n"
                            f"     被验   {sorted(hist[k].items())}")
        else:
            print(f"   {k:<8} 全同 {json.dumps(hist[k], ensure_ascii=False, sort_keys=True)}")

    # ── ⑤ 抽样深层逐字段 ──
    stride = g["meta"]["full_stride"]
    print(f"── ⑤ 抽样深层逐字段（{len(g['full'])} 例，步长 {stride}）")
    bad_full = []
    for row in g["full"]:
        idx = row["idx"]
        k, m = pos[idx]
        js = j["outs"][k][m]
        out = []
        for name in FAMILIES[k]:
            walk(row["out"][name], js[name], name, out, {})
        if out:
            bad_full.append((idx, out))
    print(f"   差异 {len(bad_full)} 例")

    for name, bad in (("①摘要", bad_dig), ("②标志位", bad_flag),
                      ("③计数", bad_cnt)):
        if bad:
            problems.append(f"{name} 有 {len(bad)} 例不同：索引 {bad[:8]}"
                            f"{' …' if len(bad) > 8 else ''}")

    if bad_dig or bad_flag or bad_cnt:
        print()
        print(f"── 差异明细（前 {MAX_SHOW} 例，就地对同一例重算 shushu 并逐字段定位）")
        seen = []
        for i in (bad_dig + bad_flag + bad_cnt):
            if i not in seen:
                seen.append(i)
        for idx in seen[:MAX_SHOW]:
            k, m = pos[idx]
            show_case(cases[idx], j["outs"][k][m])

    if bad_full:
        print()
        print("── 抽样深层差异明细")
        for idx, out in bad_full[:MAX_SHOW]:
            print(f"   [{idx}] {cases[idx]['kind']}/{cases[idx]['id']}")
            for p, x, y, _ in out[:8]:
                print(f"     {p or '<根>'}：金标准={x!r}  被验={y!r}")

    if problems:
        print()
        for p in problems:
            print(f"✗ {p}")
        return 2

    print()
    print(f"✓ {n} 例逐例比对：①摘要 ②标志位 ③计数 全同")
    print("✓ 六组分支谱全同（防空绿）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同）；**零归一**（本层无哈希顺序抖动，已用 PYTHONHASHSEED=0/1 复跑核对）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

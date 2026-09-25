#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字特殊格局层（3.5.3b）。

输入两侧逐字相同（样例定义成四柱干支八个字，藏干由表推出），
故与关系层一样**没有申报表、没有分桶**：有差异就是实现不同。

比对六层，逐层定位：
  ① 逐检测器命中标志 —— **负分支**。汇总只留 `matched:true`，
     一个恒返回 false 的假实现在汇总层照样「全绿」；标志位钉住它。
  ② 汇总结构摘要     —— 正分支全量（含 condition/interpretation/evidence 文案）
  ③ prompt 文案摘要  —— 拼串、顺序、空串处理
  ④ 计数             —— total / total_aus / total_inaus（冗余，失败时一眼看出是全空还是少一类）
  ⑤ 格局命中谱       —— **防「空绿」**：证明金标准本身非空、每类格局都真出现过
  ⑥ 抽样深层逐字段   —— 240 例用 `diff.py::walk` 递归比到叶子

②③ 摘要前一律过 `norm_bazi_patterns`：shushu 的 雜氣月令用 `list(set(...))`，
顺序随进程哈希种子变（实测 15688 例里 3134 例受影响）。归一在**两侧同做**，
于是差异只剩「集合本身不同」——那才是真差异。归一只命中 雜氣一处，不撒胡椒面。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_patterns.py
    [golden.json] [js.json]
退出码：0 = 全同。
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

from diff import walk                                                    # noqa: E402
from gen_golden_bazi_patterns import chart_from_gz, DETECTORS            # noqa: E402
from norm_bazi_patterns import norm_entry, norm_format, norm_result      # noqa: E402

GOLDEN = HERE / "golden_bazi_patterns.json"
JS = HERE / "js_bazi_patterns.json"
MAX_SHOW = 5


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def show_case(c, js_all, js_det, js_fmt, det_keys):
    """就地重算 shushu 那一例，逐检测器定位到底是哪一个格局差了。"""
    from core.bazi.special_patterns import detect_all_special_patterns    # noqa: E402

    ch = chart_from_gz(c["gz"])
    gold = detect_all_special_patterns(ch)
    print(f"     四柱 {' '.join(c['gz'])}  ({c['kind']}/{c['id']})")

    # 先按检测器名把差异缩小到某一个格局。
    # ⚠ 检测器返回的是**裸 dict**（不在 matched/auspicious/inauspicious 三个数组里），
    # 所以这里要用 `norm_entry` 而不是 `norm_result` —— 用错就完全不归一，
    # 把 雜氣 的顺序抖动误报成「检测器不一致」。
    for j, (key, fn) in enumerate(DETECTORS):
        a, b = norm_entry(fn(ch)), norm_entry(js_det[j])
        out = []
        walk(a, b, "", out, {})
        if out:
            print(f"       ✗ 检测器 {key}（{det_keys[j]}）差 {len(out)} 处")
            for p, x, y, _ in out[:4]:
                print(f"           {p or '<根>'}：金标准={x!r}  被验={y!r}")

    out = []
    walk(norm_result(gold), norm_result(js_all), "", out, {})
    if out:
        print(f"       ✗ 汇总层差 {len(out)} 处")
        for p, x, y, _ in out[:6]:
            print(f"           {p or '<根>'}：金标准={x!r}  被验={y!r}")
    a = norm_format(_fmt_of(gold))
    if a != js_fmt:
        print(f"       ✗ 文案层不同\n           金标准={a!r}\n           被验  ={js_fmt!r}")


def _fmt_of(res):
    from core.bazi.special_patterns import format_special_patterns_for_prompt  # noqa: E402
    return format_special_patterns_for_prompt(res)


def main() -> int:
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else GOLDEN
    jp = Path(sys.argv[2]) if len(sys.argv) > 2 else JS
    g = json.loads(gp.read_text(encoding="utf-8"))
    j = json.loads(jp.read_text(encoding="utf-8"))

    cases = g["cases"]
    n = len(cases)
    assert n == g["meta"]["n_cases"] == len(g["digest"]), "金标准自身长度不一致"
    problems = []

    # ── 闸门：检测器名单与顺序（顺序错了不会报错，只会把 A 的输出记到 B 名下）──
    if j["det_keys"] != g["meta"]["det_keys"]:
        print(f"✗ 检测器名单/顺序不一致：\n   金标准 {g['meta']['det_keys']}\n   被验   {j['det_keys']}")
        return 2
    print(f"── 闸门：检测器名单与顺序一致（{len(j['det_keys'])} 个）")

    for key, want in (("det", n), ("all", n), ("fmt", n)):
        got = len(j.get(key, []))
        if got != want:
            problems.append(f"[{key}] JS 出 {got} 例，金标准 {want} 例")
    if problems:
        for p in problems:
            print(f"✗ {p}")
        return 2

    # ── ① 逐检测器命中标志（负分支）＋ 结果形状与 name ──
    # 只看 `matched` 是不够的：未命中的结果汇总里根本不出现，于是「把检测器 5 的名字
    # 复制成检测器 3 的」「未命中却多带了个字段」这类缺陷在 ② 里都是隐形的。
    print("── ① 逐检测器命中标志 + 未命中结果形状 + 逐检测器 name（覆盖 `matched:false` 那一半）")
    bad_flag, bad_shape = [], []
    for i in range(n):
        row = j["det"][i]
        flags = "".join("1" if r.get("matched") else "0" for r in row)
        if flags != g["det_flags"][i]:
            bad_flag.append(i)
        for jj, r in enumerate(row):
            if r.get("name") != g["meta"]["det_names"][jj]:
                bad_shape.append((i, jj, f"name={r.get('name')!r}"))
            elif not r.get("matched") and set(r.keys()) != {"name", "matched"}:
                bad_shape.append((i, jj, f"未命中却带字段 {sorted(r.keys())}"))
    print(f"   差异 {len(bad_flag)} 例；形状/名字异常 {len(bad_shape)} 处")

    # ── ②③④ ──
    print(f"── ② 汇总结构（{n} 例）")
    bad_all = [i for i in range(n)
               if sha(canon(norm_result(j["all"][i]))) != g["digest"][i]]
    print(f"   差异 {len(bad_all)} 例")

    print(f"── ③ prompt 文案（{n} 例）")
    bad_fmt = [i for i in range(n)
               if sha(norm_format(j["fmt"][i])) != g["fmt_digest"][i]]
    print(f"   差异 {len(bad_fmt)} 例")

    print("── ④ 冗余：格局计数 total/total_aus/total_inaus")
    bad_cnt = [i for i in range(n)
               if [j["all"][i]["total"], j["all"][i]["total_aus"],
                   j["all"][i]["total_inaus"]] != g["counts"][i]]
    print(f"   差异 {len(bad_cnt)} 例")

    # ── ⑤ 命中谱（防空绿）──
    print("── ⑤ 冗余：格局命中谱（防「空绿」）")
    hist = {}
    for res in j["all"]:
        for p in res["matched"]:
            hist[p["name"]] = hist.get(p["name"], 0) + 1
            hist[f"{p['name']}·{'吉' if p['auspicious'] else '凶'}"] = \
                hist.get(f"{p['name']}·{'吉' if p['auspicious'] else '凶'}", 0) + 1
    if hist != g["pattern_hist"]:
        problems.append(f"命中谱不一致：\n     金标准 {g['pattern_hist']}\n     被验   {hist}")
    else:
        pure = {k: v for k, v in hist.items() if "·" not in k}
        print(f"   {len(pure)} 个格局全同（共 {sum(pure.values())} 次命中）")

    # ── ⑥ 抽样深层逐字段 ──
    stride = g["meta"]["full_stride"]
    print(f"── ⑥ 抽样深层逐字段（{len(g['full'])} 例，步长 {stride}）")
    bad_full = []
    for k, row in enumerate(g["full"]):
        idx = k * stride
        out = []
        walk(norm_result(row["result"]), norm_result(j["all"][idx]), "", out, {})
        if out:
            bad_full.append((idx, out))
        if norm_format(row["format"]) != norm_format(j["fmt"][idx]):
            bad_full.append((idx, [("format", row["format"], j["fmt"][idx], None)]))
    print(f"   差异 {len(bad_full)} 例")

    for name, bad in (("①命中标志", bad_flag), ("②汇总", bad_all), ("③文案", bad_fmt),
                      ("④计数", bad_cnt)):
        if bad:
            problems.append(f"{name} 有 {len(bad)} 例不同：索引 {bad[:8]}"
                            f"{' …' if len(bad) > 8 else ''}")
    if bad_shape:
        problems.append(f"①结果形状/名字异常 {len(bad_shape)} 处：{bad_shape[:6]}"
                        f"{' …' if len(bad_shape) > 6 else ''}")

    if bad_all or bad_flag or bad_fmt or bad_shape:
        print()
        print(f"── 差异明细（前 {MAX_SHOW} 例，就地重算 shushu 并逐检测器定位）")
        seen = []
        for i in (bad_all + bad_flag + bad_fmt + [x[0] for x in bad_shape]):
            if i not in seen:
                seen.append(i)
        for idx in seen[:MAX_SHOW]:
            print(f"   [{idx}]")
            show_case(cases[idx], j["all"][idx], j["det"][idx], j["fmt"][idx],
                      j["det_keys"])

    if bad_full:
        print()
        print("── 抽样深层差异明细")
        for idx, out in bad_full[:MAX_SHOW]:
            print(f"   [{idx}] {' '.join(cases[idx]['gz'])}")
            for p, x, y, _ in out[:6]:
                print(f"     {p or '<根>'}：金标准={x!r}  被验={y!r}")

    if problems:
        print()
        for p in problems:
            print(f"✗ {p}")
        return 2

    print()
    print(f"✓ {n} 例逐例比对：①命中标志＋结果形状＋name（{n}×{len(j['det_keys'])} 个输出）"
          f" ②汇总结构 ③prompt 文案 ④计数 全同")
    print(f"✓ 10 个格局命中谱全同（{sum(1 for k in g['pattern_hist'] if '·' not in k)} 类，"
          f"{sum(v for k, v in g['pattern_hist'].items() if '·' not in k)} 次命中）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同）；雜氣月令的十神串两侧同归一（"
          f"{g['meta']['norm']}）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

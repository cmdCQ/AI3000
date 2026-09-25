#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：总断那一串（3.5.4b 当前运程/命局总论/推理链/综合论断/完整装配）。

两侧输入逐字相同（金标准的 `cases[i].in` 就是双方共用的输入，JS 侧照读），
故与关系层/组合层一样**没有申报表、没有分桶**：有差异就是实现不同。

比对六层，逐层定位：
  ⓪ 闸门 —— 家族契约、每家族每输出的**形状集**、条数。
     `asm` 族有个本层特有的坑：没挂上的键在两侧都必须是 `null`（不是缺键、不是空字典），
     形状集因此**只收挂上的那些**；「挂没挂」另由 ② 的标志位逐个点名，不靠形状集。
  ① 逐例摘要 —— 每家族每输出一份 sha256。
  ② 逐例标志位 —— 分支指纹。由**比对器**从被验方产物现算，不是被验方自报，
     也不照抄生成器的实现（两份独立实现互为对照）。
  ③ 逐例计数 —— 同上，独立重算。
  ④ 五组分支谱 —— **防「空绿」**：谱一致才证明金标准本身非空、每档都真出现过。
  ⑤ 抽样深层逐字段 —— `full` 里的原例用 `diff.py::walk` 递归比到叶子。

本层**零归一**（金标准 `meta.norm` 写着理由）：本层没有依赖进程哈希顺序的遍历 ——
所有字典要么按 `sorted()`、要么按列表序；逐例的可用性/分支全由用例输入决定，
不靠「两边都算不出所以跳过」。不归一是故意的：没有抖动还归一，只会连真差异一起抹掉。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_assembly.py [golden.json] [js.json]
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

GOLDEN = HERE / "golden_bazi_assembly.json"
JS = HERE / "js_bazi_assembly.json"
MAX_SHOW = 5

# 家族 → 输出对象名（**顺序即摘要顺序**，必须与生成器一致 —— 摘要是个 list）。
# 比对器**自己**写死一份，不从金标准读：从金标准读就等于让被验方定义契约。
ASM_KEYS = ["day_master_profile", "yong_shen", "relations", "special_patterns", "combos",
            "current_fortune", "life_aspects", "overview", "mingju_synthesis",
            "master_synthesis"]
FAMILIES = {
    "cf":  ["cf"],
    "ov":  ["ov"],
    "sy":  ["sy"],
    "ms":  ["ms"],
    "asm": ASM_KEYS,
}


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _tf(v):
    """布尔 → T/F。⚠ 不能用 `str(v)`：那是语言决定的字符串化结果。"""
    return "T" if v else "F"


def _repr(v):
    """判定字段的语言中立回显。

    与生成器不同：生成器直接用 f-string 的 `{v!r}`（repr）；本文件改用
    「类型前缀 + repr」，这样 `1`（整数）与 `"1"`（字符串）不会写成同一个字符 ——
    `current_year` 正是这一对（基准给整数、容错时可能给字符串）。
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


# ── ② 的逐家族实现：与生成器**各写一份**（独立重算，互为对照）──
#
# ⚠⚠ 「独立重算」= 独立**写实现**，不是独立**定义契约**。段名、段序、段内编码是
#   两侧**共享的约定** —— 它们不是被验对象，而是比对能成立的前提。本文件第一版把
#   `sy` 的 `score` 段放在 `jw` 之后，生成器放在 `label` 之后，于是 **180 例「差异」**
#   全是段序不同造成的假红（值一个不差）。这种假红比漏检更费时间：它会让人去查
#   `synthesis` 的算法，而问题在比对器自己的字符串拼接顺序。
#   改段名/段序必须**同时**改 `gen_golden_bazi_assembly.py::flags_of` 的对应家族。
#   `counts_of` 同理（那里还多一条：只数结构长度，不数字符串长度，见下方注释）。

def flag_of(kind, out):
    if kind == "cf":
        cf = out["cf"]
        if not cf.get("available"):
            return "unavailable"
        cdy = cf.get("current_dayun") or {}
        cln = cf.get("current_liunian")
        su = cf.get("suiyun") or {}
        seg = ["pre=" + _tf(cf.get("pre_yun")),
               "help=" + _repr(cdy.get("help")),
               "dy=" + _repr(cdy.get("ganzhi")),
               "ln=" + _repr((cln or {}).get("ganzhi")),
               "hasln=" + _tf(cln is not None),
               "tags=" + ",".join(su.get("tags") or []),
               "yr=" + _repr(cf.get("current_year")),
               "recent=" + str(len(cf.get("recent_years") or []))]
        return "|".join(seg)

    if kind == "ov":
        ov = out["ov"]
        if not ov.get("available"):
            return "unavailable"
        titles = [p.get("title", "") for p in (ov.get("paragraphs") or [])]
        return "|".join([
            "q=" + _repr(ov.get("quality")),
            "hl=" + _repr(ov.get("headline")),
            "dm=" + _repr(ov.get("day_master")),
            "pat=" + _repr(ov.get("pattern")),
            "ps=" + _repr(ov.get("pattern_status")),
            "yw=" + _repr(ov.get("yong_shen_wx")),
            "jw=" + _repr(ov.get("ji_shen_wx")),
            "titles=" + ",".join(titles),
            "vl=" + _repr(ov.get("verdict_line")),
        ])

    if kind == "sy":
        sy = out["sy"]
        if not sy.get("available"):
            return "unavailable"
        fs = sy.get("factors") or []
        # 段序与生成器 `flags_of` 的 `sy` 支**逐段对齐**（见本函数上方的 ⚠⚠）：
        # dm → label → st → pat → yw → jw → score → mods → pols → hasnote
        # （`score` 在 `jw` 之后 —— 我第一次「对齐」时想当然地把它挪到 `label` 后面，
        #  于是 180 例假红原地不动。改段序**必须拿生成器的原文逐行对**，不能凭印象。）
        return "|".join([
            "dm=" + _repr(sy.get("day_master")),
            "label=" + _repr(sy.get("composite_label")),
            "st=" + _repr(sy.get("strength")),
            "pat=" + _repr(sy.get("pattern")),
            "yw=" + _repr(sy.get("yong_shen_wx")),
            "jw=" + _repr(sy.get("ji_shen_wx")),
            "score=" + str(sy.get("composite_score")),
            "mods=" + ",".join(x.get("module", "") for x in fs),
            "pols=" + ",".join(x.get("polarity", "") for x in fs),
            "hasnote=" + _tf(sy.get("current_fortune_note") != ""),
        ])

    if kind == "ms":
        ms = out["ms"]
        if not ms.get("available"):
            return "unavailable"
        dvs = ms.get("dimension_verdicts") or []
        return "|".join([
            "oq=" + _repr(ms.get("overall_quality")),
            "hl=" + _repr(ms.get("headline")),
            "ml=" + _repr(ms.get("ming_label")),
            "dm=" + _repr(ms.get("day_master")),
            "doms=" + ",".join(f"{d.get('domain')}{d.get('quality')}" for d in dvs),
            "paras=" + str(len(ms.get("integrated_paragraphs") or [])),
            "advlen=" + str(len(ms.get("master_advice") or "")),
        ])

    if kind == "asm":
        return "|".join(
            f"{k}=" + ("-" if out.get(k) is None else "P") for k in ASM_KEYS)

    raise AssertionError(kind)


# ⚠ 与生成器的 `counts_of` 是**同一个契约**：只数结构长度，一律不数字符串长度。
#   不许改成 `len(canon(ob))` 之类的「序列化长度」—— 那在 Python 是码位数、
#   在 JS 是 UTF-16 单元数，非 BMP 字符上会不等，凭空造出一类假差异。
#   （`sy` 族里那三条 `jiu-59/60/61` 用例就是专门盯这条线的：
#    「𠮷」占 1 个码位、2 个 UTF-16 单元，60 码位那一例在两侧的判据必须都判「不加省略号」。）

def count_of(kind, out):
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
        ps = ov.get("paragraphs") or []
        return [len(ov), len(ps), sum(len(p.get("text") or "") for p in ps)]

    if kind == "sy":
        sy = out["sy"]
        if not sy.get("available"):
            return [0, 0, 0, 0, 0]
        return [len(sy), len(sy.get("factors") or []), len(sy.get("chain_text") or ""),
                len(sy.get("composite_desc") or ""), len(sy.get("current_fortune_note") or "")]

    if kind == "ms":
        ms = out["ms"]
        if not ms.get("available"):
            return [0, 0, 0, 0]
        dvs = ms.get("dimension_verdicts") or []
        return [len(ms), len(dvs), sum(len(d.get("verdict") or "") for d in dvs),
                len(ms.get("integrated_paragraphs") or [])]

    if kind == "asm":
        row = [sum(1 for k in ASM_KEYS if out.get(k) is not None)]
        row += [len(out[k]) if out.get(k) is not None else 0 for k in ASM_KEYS]
        return row

    raise AssertionError(kind)


def show_case(c, js, tag=""):
    """就地对**这一例**重算 shushu 侧，再逐字段 walk —— 差异定位不必去翻金标准。"""
    from gen_golden_bazi_assembly import run_case                        # noqa: E402

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
    if j.get("schema", {}).get("families") != g["meta"]["families"]:
        print(f"✗ 闸门 家族契约不一致：\n   金标准 {g['meta']['families']}\n"
              f"   被验   {j.get('schema', {}).get('families')}")
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
    print(f"── 闸门：{len(FAMILIES)} 家族契约一致；形状集一致（"
          + " · ".join(f"{k} " + ",".join(f"{o}×{len(v)}" for o, v in m.items())
                       for k, m in g["meta"]["shapes"].items()) + "）")

    # 逐例：金标准按 kind 顺序排列，JS 侧按 kind 分桶 —— 这里对齐两边的下标
    pos = []
    slot = {}
    for idx, c in enumerate(cases):
        k = c["kind"]
        m = slot.get(k, 0)
        slot[k] = m + 1
        pos.append((k, m))

    # ── ① 摘要 ② 标志位 ③ 计数 ──
    bad_dig, bad_flag, bad_cnt = [], [], []
    hist = {}
    for idx, c in enumerate(cases):
        k, m = pos[idx]
        js = j["outs"][k][m]
        if [sha(canon(js[o])) for o in FAMILIES[k]] != g["digest"][str(idx)]:
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

    # ── ④ 分支谱（防空绿）──
    print("── ④ 分支谱（防空绿：谱同才证明每档都真出现过）")
    for k in sorted(hist):
        if hist[k] != g["hist"][k]:
            problems.append(f"谱「{k}」不一致：\n     金标准 {sorted(g['hist'][k].items())}\n"
                            f"     被验   {sorted(hist[k].items())}")
        else:
            print(f"   {k:<5} 全同 {len(hist[k])} 种分支码")

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

    for name, bad in (("①摘要", bad_dig), ("②标志位", bad_flag), ("③计数", bad_cnt)):
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
    print(f"✓ {len(FAMILIES)} 组分支谱全同（防空绿）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同）；**零归一**（本层无哈希顺序抖动）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

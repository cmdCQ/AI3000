#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字应用层（3.5.4a 事业/婚姻/健康/财运）。

两侧输入逐字相同（金标准的 `cases[i].in` 就是双方共用的输入，JS 侧照读），
故与关系层/组合层一样**没有申报表、没有分桶**：有差异就是实现不同。

比对六层，逐层定位：
  ⓪ 闸门 —— 家族契约、每家族每输出的**形状集**、条数。形状集是本层特有的关键闸门：
     `strength` 有 **6 种形态**（身强/身弱/中和/空串/null/dict），而**空串与 dict 的键集
     与正常态相同**、只是值不同 —— 形状集逮不住它们，所以另有 ② 的 `strength` 回显码。
     闸门挡的是「少一种形状」（例如 dict 盘整族消失）让后面全以差异面目出现。
  ① 逐例摘要 —— 每家族每输出一份 sha256（共 34323 例、7 个输出对象 / gender 族 1 个）。
  ② 逐例标志位 —— 分支指纹。由**比对器**从被验方产物现算，不是被验方自报，
     也不是照抄生成器的实现（两份独立实现互为对照；本文件的写法与生成器刻意不同）。
  ③ 逐例计数 —— 同上，独立重算。
  ④ 四组分支谱 —— **防「空绿」**：谱一致才证明金标准本身非空、每档都真出现过。
  ⑤ 抽样深层逐字段 —— `full` 里的原例用 `diff.py::walk` 递归比到叶子。

本层**零归一**（金标准 `meta.norm` 写着理由）：没有任何依赖进程哈希顺序的遍历。
不归一是**故意**的：归一是把「已知的抖动」抹平，没有抖动还归一，只会连真差异一起抹掉。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_applications.py [golden.json] [js.json]
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

GOLDEN = HERE / "golden_bazi_applications.json"
JS = HERE / "js_bazi_applications.json"
MAX_SHOW = 5

# 家族 → 输出对象名（**顺序即摘要顺序**，必须与生成器一致 —— 摘要是个 list）。
# 比对器**自己**写死一份，不从金标准读：从金标准读就等于让被验方定义契约，
# 少一个输出对象（比如 aspects_f 整个消失）也不会被发现。
FAMILIES = {
    "chart": ["career", "wealth", "health", "marriage_m", "marriage_f",
              "aspects_m", "aspects_f"],
    "field": ["career", "wealth", "health", "marriage_m", "marriage_f",
              "aspects_m", "aspects_f"],
    "pos": ["career", "wealth", "health", "marriage_m", "marriage_f",
            "aspects_m", "aspects_f"],
    "gender": ["marriage"],
}


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ── ②③ 的实现：与生成器**各写一份**（独立重算，互为对照）──

def _strength_code(v):
    """`strength` 回显形态的代号 —— 语言中立，且必须区分「空串」与「没这个值」。

    生成器用的是「先判 None → 再判 dict → 再判空串 → 查表」的写法；
    这里改写成语义等价但结构不同的版本（用类型分派），以免两边共享同一个笔误。

    为什么非要这个码：**空串**那一支（`chart.get("strength","中和")` 只在键不存在时兜默认）
    在键集上与其他态毫无差别，只有值不同 —— 摘要能逮住，但摘要逮住的差异定位起来
    只告诉你「这个输出对象不同」。这个码把「哪一态」直接写进指纹，为的是**分支谱**能分辨。
    """
    if v is None:
        return "N"
    if isinstance(v, dict):
        return "D"
    if isinstance(v, str):
        if v == "":
            return "E"
        if v == "身强":
            return "Q"
        if v == "身弱":
            return "R"
        if v == "中和":
            return "Z"
        return "?"
    raise AssertionError(f"strength 出现了没见过的类型：{type(v).__name__}")


def flag_of(kind, out):
    """分支指纹：只收**判定性字段**，用来判「每个分支都出场了吗」。

    生成器是「遍历 `sorted(out)`、跳装配体、逐段 `"|".join`、段间 `" ␟ "` 连」；
    本文件是同一个**定义**的另一种写法（先筛出待收的键名，再逐段拼，段内字段用
    列表推导 + 一次 join）。⚠ 这里**不能**改用 `FAMILIES[kind]` 的顺序 ——
    拼接顺序是两侧共用的定义的一部分，换了顺序就变成「每一例都假差异」，
    那不是独立实现，是把定义改了。（摘要那边倒是必须按 `FAMILIES` 序，
    因为那是有意声明的契约，写在 `meta.families` 里。）
    """
    keys = [n for n in sorted(out) if not n.startswith("aspects_")]
    segs = []
    for name in keys:
        ob = out[name]
        segs.append("|".join([
            name,
            str(ob.get("topic", "")),                        # 中文串，两侧同
            str(ob.get("level", "")),                        # 财运四档
            str(ob.get("quality", "")),                      # 婚姻四断语
            str(ob.get("weak_element", "")),                 # 健康：最弱一行
            "T" if ob.get("clash_present") else "F",         # 婚姻：冲（布尔 → T/F）
            "T" if ob.get("harmony_present") else "F",       # 婚姻：合
            str(len(ob.get("career_fields") or [])),         # 事业：行业条数
            str(len(ob.get("shishen_advice") or [])),        # 事业：十神建议条数
            _strength_code(ob.get("strength")),              # **回显的 strength 形态**
        ]))
    return " ␟ ".join(segs)


# ⚠ 与生成器的 `counts_of` 是**同一个契约**：只数结构长度，一律不数字符串长度。
#   不许改成 `len(canon(ob))` 之类的「序列化长度」—— 那在 Python 是码位数、
#   在 JS 是 UTF-16 单元数，非 BMP 字符上会不等，凭空造出一类假差异。
#
# ⚠⚠ 这两条**看起来像风格选择，其实是定义**，改动就是「每一例都假差异」：
#    ① 输出的遍历序 —— 生成器用 `sorted(out)`，**不是** `FAMILIES[kind]` 的序；
#    ② 键的取数序 —— 生成器那条 tuple 的**特定**顺序，**不是**字母序。
#    写这一版时我两条都「顺手改成了更整齐的写法」，结果 34323 例全报差异。
#    教训：「独立重算」是指独立**写**实现，不是独立**定义**契约。
#    （同理见上面 `flag_of` 的注释。）
COUNT_KEYS = ("career_fields", "shishen_advice", "advice", "spouse_stars",
              "wealth_stems", "lucky_wuxing")


def count_of(kind, out):
    rows = []
    for name in sorted(out):
        ob = out[name]
        row = [len(ob)]
        for k in COUNT_KEYS:
            row.append(len(ob.get(k) or []))
        wd = ob.get("wx_distribution")
        row.append(sum(wd.values()) if isinstance(wd, dict) else 0)
        rows.append(row)
    return rows


def show_case(c, js, tag=""):
    """就地对**这一例**重算 shushu 侧，再逐字段 walk —— 差异定位不必去翻金标准。"""
    from gen_golden_bazi_applications import run_case                  # noqa: E402

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
    print(f"── 闸门：{len(FAMILIES)} 家族契约一致；形状集一致（"
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

    # ── ④ 分支谱（防空绿）──
    print("── ④ 分支谱（防空绿：谱同才证明每档都真出现过）")
    for k in sorted(hist):
        if hist[k] != g["hist"][k]:
            problems.append(f"谱「{k}」不一致：\n     金标准 {sorted(g['hist'][k].items())}\n"
                            f"     被验   {sorted(hist[k].items())}")
        else:
            print(f"   {k:<8} 全同 {len(hist[k])} 种分支码")

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
    print(f"✓ {len(FAMILIES)} 组分支谱全同（防空绿）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print("✓ 零申报（本层输入两侧逐字相同）；**零归一**（本层无哈希顺序抖动）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

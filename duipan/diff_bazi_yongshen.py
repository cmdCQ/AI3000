#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 比对：八字用神/调候层（3.5.3c）。

两侧输入逐字相同（样例定义成四柱干支八个字，藏干由表推出，日主取日干），
故与关系层、特殊格局层一样**没有申报表、没有分桶**：有差异就是实现不同。

比对八层，逐层定位：
  ⓪ 闸门 —— 顶层字段集、`tiaohou`/`yong_shen`/档案的键集、样例条数。少挂一个字段
     会让后面每一层的摘要都以「差异」的面目出现，先在闸门挡住，省得到处找。
  ① 逐例标志位 —— 6 列（含两条**不可达分支的取证**与三个**负分支**）：
     `yong_source` 走调候（证明格局/扶抑是死代码）、`tiaohou.available` 恒真、
     `secondary_in_chart` 的 null/true/false 三态、`gejv` 空、`recommendations` 非空。
     标志位由**比对器**从 JS 产物现算，不是 JS 自己报的 —— 自报等于自证。
  ② 调候（含 grade/level/verdict 文案）逐例摘要
  ③ 成败救应逐例摘要 + **有/无**（该键按用例存在/不存在，存在性本身要查）
  ④ 用神全景逐例摘要（含 tiao_hou/gejv/shigan/wuxing_colors/recommendations 全量）
  ⑤ 日主档案：十个日干各一份（它只与日干有关，逐例 10825 份是同一件事重复 10825 遍）
  ⑥ 冗余计数与谱 —— **防「空绿」**：六列计数逐例比，九张谱整体比。
     谱一致才证明金标准本身非空、每档都真出现过。
  ⑦ 抽样深层逐字段 —— `full` 里的原例用 `diff.py::walk` 递归比到叶子。

本层**零归一**（金标准 `meta.norm` 写着理由）：没有任何依赖进程哈希顺序的遍历，
两侧都不归一。已用 `PYTHONHASHSEED=0/1` 复跑核对金标准逐字节相同。
不归一是**故意**的：归一是把「已知的抖动」抹平，没有抖动还归一，只会连真差异一起抹掉。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python diff_bazi_yongshen.py [golden.json] [js.json]
退出码：0 = 全同。
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))   # 差异明细要就地重算 shushu 侧
sys.path.insert(0, str(HERE))

from diff import walk                                                        # noqa: E402

GOLDEN = HERE / "golden_bazi_yongshen.json"
JS = HERE / "js_bazi_yongshen.json"
MAX_SHOW = 6

# 标志位与金标准的 `meta.flag_names` 同序，此处写下**算法**（比对器现算，不信 JS 自报）
FLAG_ALGO = [
    ("yong_source 走调候", lambda t, g, y: "1" if y["yong_source"].startswith("《穷通宝鉴》调候：") else "0"),
    ("tiaohou.available", lambda t, g, y: "1" if t["available"] else "0"),
    ("secondary_in_chart:null", lambda t, g, y: "1" if t["secondary_in_chart"] is None else "0"),
    ("secondary2_in_chart:null", lambda t, g, y: "1" if t["secondary2_in_chart"] is None else "0"),
    ("gejv 非空", lambda t, g, y: "1" if y["gejv"] else "0"),
    ("recommendations 非空", lambda t, g, y: "1" if y["recommendations"]["lucky_direction"] else "0"),
]


def canon(obj):
    """与金标准生成器**同一个**规范化实现（算法写在金标准 meta.canon 里）。"""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def sec_state(t):
    return {True: "true", False: "false", None: "null"}[t["secondary_in_chart"]]


def show_case(c, j, idx):
    """就地对**这一例**重算 shushu 侧，再逐字段 walk —— 差异定位不必去翻金标准。"""
    from core.bazi.analyzer import analyze_chart                              # noqa: E402
    from core.bazi.day_master_profiles import analyze_yong_shen               # noqa: E402
    from gen_golden_bazi_patterns import chart_from_gz                        # noqa: E402

    ch = chart_from_gz(c["gz"])
    analyze_chart(ch)
    ys = analyze_yong_shen(ch)
    py_geju = ch.get("geju_cheng_bai")

    print(f"   [{idx}] {' '.join(c['gz'])}  ({c['kind']}/{c['id']})  "
          f"日主 {ch['day_master']} 旺衰 {ch['strength']} 格局 {ch['pattern']}")
    for label, a, b in (("tiaohou", ch["tiaohou"], j["tiaohou"][idx]),
                        ("yong_shen", ys, j["yong"][idx])):
        out = []
        walk(a, b, label, out, {})
        if out:
            print(f"     ✗ {label} 差 {len(out)} 处")
            for p, x, y, _ in out[:6]:
                print(f"         {p}：金标准={x!r}  被验={y!r}")
    if (py_geju is None) != (j["geju"][idx] is None):
        print(f"     ✗ geju_cheng_bai 存在性不同：金标准={'有' if py_geju else '无'} "
              f"被验={'有' if j['geju'][idx] is not None else '无'}")
    elif py_geju is not None:
        out = []
        walk(py_geju, j["geju"][idx], "geju_cheng_bai", out, {})
        if out:
            print(f"     ✗ geju_cheng_bai 差 {len(out)} 处")
            for p, x, y, _ in out[:6]:
                print(f"         {p}：金标准={x!r}  被验={y!r}")


def main() -> int:
    gp = Path(sys.argv[1]) if len(sys.argv) > 1 else GOLDEN
    jp = Path(sys.argv[2]) if len(sys.argv) > 2 else JS
    g = json.loads(gp.read_text(encoding="utf-8"))
    j = json.loads(jp.read_text(encoding="utf-8"))

    cases, n = g["cases"], len(g["cases"])
    assert n == g["meta"]["n_cases"], "金标准自身长度不一致"
    problems = []

    # ── ⓪ 闸门 ──
    for key in ("top_keys", "tiaohou_keys", "yong_keys", "profile_keys"):
        if j.get(key) != g["meta"][key]:
            print(f"✗ 闸门 {key} 不一致：\n   金标准 {g['meta'][key]}\n   被验   {j.get(key)}")
            problems.append(key)
    for key, want in (("tiaohou", n), ("geju", n), ("yong", n), ("pattern", n)):
        got = len(j.get(key, []))
        if got != want:
            problems.append(f"[{key}] JS 出 {got} 例，金标准 {want} 例")
    if j.get("day_masters") != g["meta"]["day_masters"]:
        problems.append(f"日主档案的日干名单/顺序不一致：{j.get('day_masters')} "
                        f"vs {g['meta']['day_masters']}")
    if problems:
        for p in problems:
            print(f"✗ 闸门未过：{p}")
        return 2
    print(f"── 闸门：字段集与键集一致（顶层 {len(j['top_keys'])} 个 · tiaohou {len(j['tiaohou_keys'])} 键 · "
          f"yong_shen {len(j['yong_keys'])} 键 · 档案 {len(j['profile_keys'])} 键）；"
          f"{n} 例 × 3 段全量 + 档案 10 份")

    # ── ① 逐例标志位 ──
    print(f"── ① 逐例标志位（{len(FLAG_ALGO)} 列，含不可达取证与负分支）")
    bad_flag = []
    for i in range(n):
        want = g["det_flags"][i]
        got = "".join(fn(j["tiaohou"][i], j["geju"][i], j["yong"][i]) for _, fn in FLAG_ALGO)
        if got != want:
            bad_flag.append(i)
    print(f"   差异 {len(bad_flag)} 例")

    # ── ② 调候 ──
    print(f"── ② 调候 tiaohou（{n} 例，全量含 grade/level/verdict 文案）")
    bad_th = [i for i in range(n) if sha(canon(j["tiaohou"][i])) != g["digest"][i]]
    print(f"   差异 {len(bad_th)} 例")

    # ── ③ 成败救应（含存在性）──
    print(f"── ③ 格局成败救应 geju_cheng_bai（{n} 例，含**该键的存在与否**）")
    bad_gj = []
    for i in range(n):
        jg = j["geju"][i]
        want = g["geju_digest"][i]
        got = sha(canon(jg)) if jg is not None else ""
        if got != want:
            bad_gj.append(i)
    print(f"   差异 {len(bad_gj)} 例")

    # ── ④ 用神全景 ──
    print(f"── ④ 用神 yong_shen（{n} 例，全量）")
    bad_ys = [i for i in range(n) if sha(canon(j["yong"][i])) != g["yong_digest"][i]]
    print(f"   差异 {len(bad_ys)} 例")

    # ── ⑤ 日主档案 ──
    print(f"── ⑤ 日主档案（10 个日干各一份）")
    bad_pf = [dm for dm, want in g["profile_digest"].items()
              if sha(canon(j["profile"][dm])) != want]
    print(f"   差异 {len(bad_pf)} 个日干：{bad_pf}")

    # ── ⑥ 冗余计数与谱（防空绿）──
    print("── ⑥ 冗余：逐例六列计数 + 九张谱")
    bad_cnt = []
    for i in range(n):
        t, y = j["tiaohou"][i], j["yong"][i]
        got = [t["grade"], y["yong_shen_wx"], y["strength"], j["pattern"][i],
               "有" if j["geju"][i] is not None else "无", sec_state(t)]
        if got != g["counts"][i]:
            bad_cnt.append(i)
    print(f"   逐例计数差异 {len(bad_cnt)} 例")

    hist = {"grade": {}, "yong_shen_wx": {}, "strength": {}, "pattern": {}, "gejv": {},
            "geju_cheng_bai": {}, "secondary_in_chart": {}, "secondary2": {},
            "yong_source_kind": {}}
    for i in range(n):
        t, y = j["tiaohou"][i], j["yong"][i]
        for k, v in (("grade", t["grade"]), ("yong_shen_wx", y["yong_shen_wx"]),
                     ("strength", y["strength"]), ("pattern", j["pattern"][i]),
                     ("gejv", "非空" if y["gejv"] else "空"),
                     ("geju_cheng_bai", "有" if j["geju"][i] is not None else "无"),
                     ("secondary_in_chart", sec_state(t)),
                     ("secondary2", "有" if t["secondary2"] else "无"),
                     ("yong_source_kind", y["yong_source"].split("：")[0])):
            hist[k][v] = hist[k].get(v, 0) + 1
    for k, got in hist.items():
        if got != g["hist"][k]:
            problems.append(f"谱「{k}」不一致：\n     金标准 {sorted(g['hist'][k].items())}\n"
                            f"     被验   {sorted(got.items())}")
        else:
            print(f"   {k:<20} 全同 {json.dumps(got, ensure_ascii=False, sort_keys=True)}")

    # ── ⑦ 抽样深层逐字段 ──
    stride = g["meta"]["full_stride"]
    print(f"── ⑦ 抽样深层逐字段（{len(g['full'])} 例，步长 {stride}）")
    bad_full = []
    for k, row in enumerate(g["full"]):
        idx = k * stride
        out = []
        walk(row["tiaohou"], j["tiaohou"][idx], "tiaohou", out, {})
        if row["geju_cheng_bai"] is None:
            if j["geju"][idx] is not None:
                out.append(("geju_cheng_bai", "<无>", "<有>", None))
        else:
            walk(row["geju_cheng_bai"], j["geju"][idx], "geju_cheng_bai", out, {})
        walk(row["yong_shen"], j["yong"][idx], "yong_shen", out, {})
        if out:
            bad_full.append((idx, out))
    print(f"   差异 {len(bad_full)} 例")

    for name, bad in (("①标志位", bad_flag), ("②调候", bad_th), ("③成败救应", bad_gj),
                      ("④用神", bad_ys), ("⑤档案", bad_pf), ("⑥计数", bad_cnt)):
        if bad:
            problems.append(f"{name} 有 {len(bad)} 例不同：索引 {bad[:8]}"
                            f"{' …' if len(bad) > 8 else ''}")

    if bad_th or bad_gj or bad_ys or bad_flag:
        print()
        print(f"── 差异明细（前 {MAX_SHOW} 例，就地对同一例重算 shushu 并逐字段定位）")
        seen = []
        for i in (bad_th + bad_gj + bad_ys + bad_flag):
            if i not in seen:
                seen.append(i)
        for idx in seen[:MAX_SHOW]:
            show_case(cases[idx], j, idx)

    if bad_full:
        print()
        print("── 抽样深层差异明细")
        for idx, out in bad_full[:MAX_SHOW]:
            print(f"   [{idx}] {' '.join(cases[idx]['gz'])}")
            for p, x, y, _ in out[:8]:
                print(f"     {p or '<根>'}：金标准={x!r}  被验={y!r}")

    if problems:
        print()
        for p in problems:
            print(f"✗ {p}")
        return 2

    print()
    print(f"✓ {n} 例逐例比对：①标志位 {len(FLAG_ALGO)} 列 ②调候 ③成败救应（含存在性）"
          f" ④用神全景 ⑤档案 10 份 ⑥六列计数 全同")
    print(f"✓ 九张谱全同（防空绿）"
          f" + 抽样 {len(g['full'])} 例**深层逐字段**比对")
    print(f"✓ 零申报（本层输入两侧逐字相同）；**零归一**（本层无哈希顺序抖动，两侧都不归一）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

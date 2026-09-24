# -*- coding: utf-8 -*-
"""对拍 · **覆盖度断言**（层 6a/6b）：证明「全绿」不是因为根本没跑到。

对拍全绿只说明「跑到的那些没差」。若某分支一次都没跑到，它绿不绿都没有信息量。
故每条断言都要求**某个取值真的出现过**，不满足即失败。

这不是走过场：最初层 6a 报「0 差异 0 申报」时，申报集其实是空的——
后来才看清 170 例的上卦缺口的分布，也才把断言写成现在这样。

三条**互不依赖**的检查（任一条挂了都说明别处有问题）：
  ① 覆盖：每个分支都有实例被跑到（防「空绿」）。
  ② 一致性：申报集 **必须等于** 金标准侧空值集。申报是按 shushu 取法算出来的
     （`allow_yongshen_common.shushu_unresolved`），空值是**实测**出来的，
     两条独立的路必须碰在同一个集合上 —— 对不上就说明有一侧错了。
  ③ 边界：结构上不可达的分支必须**从未出现**（见 README「可达性」）。

用法：
    python coverage_yongshen.py
退出码：0 = 全部满足；1 = 有断言不满足（对拍结果不可信）。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent

# findFuShen 的 6 个分支里**结构上可达**的只有 4 个（证明见 README「可达性」）
EMERGE_REACHABLE = {"飞生伏", "伏生飞", "飞克伏", "伏克飞"}
EMERGE_UNREACHABLE = {"飞伏比和", "正伏"}


def load(name):
    p = HERE / name
    if not p.exists():
        print(f"缺 {name} —— 先跑对应的 gen/run（见 README「用法」）。")
        sys.exit(2)
    return json.loads(p.read_text("utf-8"))


def yong_wx(node, dyn: bool):
    """取该例的 用神_wx，**区分「键不存在」与「空串」**——两者含义不同。"""
    o = (node.get("deep_relations") if dyn else node) or {}
    o = o.get("yong_yuan_ji_chou") or {}
    return o["用神_wx"] if "用神_wx" in o else None


def declared_cases(allow_path: Path, dyn: bool):
    """从 allow 文件反推「被申报的样例 id」集合（路径形如 `<cid>.<...>`）。"""
    if not allow_path.exists():
        return None
    allow = json.loads(allow_path.read_text("utf-8"))
    suf = ".deep_relations." if dyn else "."
    return {p.split(suf)[0] for p in allow}


def main() -> int:
    g6a, j6a = load("golden_dynamic.json"), load("js_dynamic.json")
    g6b, j6b = load("golden_yongshen.json"), load("js_yongshen.json")
    fails: list = []

    def check(label, ok, detail):
        print(f"  {'✅' if ok else '❌'} {label}：{detail}")
        if not ok:
            fails.append(label)

    # ══ 层 6a（golden_dynamic.json，主题恒「求财」）════════════════
    print("层 6a（golden_dynamic.json，主题恒「求财」，720 例）")

    ga = [c for c in g6a if yong_wx(g6a[c], True) is None]
    ja = [c for c in j6a if yong_wx(j6a[c], True) is None]
    check("金标准侧「用神五行取不到」例数", len(ga) == 170,
          f"{len(ga)}/720（＝用神六亲不上卦的例数）")
    check("被验方侧无空缺（缺口已补全）", len(ja) == 0, f"{len(ja)}/720")

    wxj = Counter(yong_wx(d, True) for d in j6a.values())
    ne = {k: v for k, v in wxj.items() if k}
    check("被验方用神五行五类齐全", len(ne) == 5,
          " ".join(f"{k}×{v}" for k, v in sorted(ne.items())))

    fu = [d["fu_shen"] for d in j6a.values() if d.get("fu_shen")]
    check("伏神分支被跑到", len(fu) == 170, f"{len(fu)}/720")
    em = Counter(f["emerge_type"].split(" — ")[0] for f in fu)
    check("伏神四分支全命中", set(em) == EMERGE_REACHABLE,
          " ".join(f"{k}×{v}" for k, v in sorted(em.items())))
    check("两个不可达分支从未出现", not (set(em) & EMERGE_UNREACHABLE),
          f"未出现 {'/'.join(sorted(EMERGE_UNREACHABLE))}")

    ss = [d["shi_shen"] for d in j6a.values() if d.get("shi_shen")]
    ws = Counter(s["wang_shuai"].split("（")[0] for s in ss)
    check("世身旺衰五档齐全", len(ws) == 5, " ".join(f"{k}×{v}" for k, v in sorted(ws.items())))
    check("世身「上卦/不上卦」两种都出现",
          {s["on_chart"] for s in ss} == {True, False},
          f"on_chart ∈ {sorted({s['on_chart'] for s in ss})}")

    lens = Counter(len(d["deep_relations"]["summary"]) for d in j6a.values())
    check("summary 长度分布 ≥6 种（防只跑一种形状）", len(lens) >= 6,
          " ".join(f"len{k}×{v}" for k, v in sorted(lens.items())))
    kl = Counter(k for d in j6a.values()
                 for k, v in (d["deep_relations"]["key_lines"] or {}).items() if v)
    check("key_lines 四神各自都非空过", len(kl) == 4,
          " ".join(f"{k}×{v}" for k, v in sorted(kl.items())))

    dc = declared_cases(HERE / "allow_dynamic.json", dyn=True)
    if dc is not None:
        check("申报集 ≡ 金标准空值集（两条独立路径须碰头）", dc == set(ga),
              f"申报 {len(dc)} 例，空值 {len(ga)} 例，"
              f"仅一侧有 {len(dc ^ set(ga))} 例")

    # ══ 层 6b（golden_yongshen.json，7 事项 × 64 卦 = 448 例）═════
    print("层 6b（golden_yongshen.json，7 事项 × 64 卦，448 例）")
    tp = Counter(d["topic"] for d in j6b.values())
    check("事项覆盖 7 种", len(tp) == 7, " ".join(f"{k}×{v}" for k, v in sorted(tp.items())))
    check("性别两值都出现", {d["gender"] for d in j6b.values()} == {"male", "female"},
          str(sorted({d["gender"] for d in j6b.values()})))

    gb = [c for c in g6b if yong_wx(g6b[c], False) is None]
    jb = [c for c in j6b if yong_wx(j6b[c], False) is None]
    # 240 = 192 位置名（求医疾病 64 + 综合 64 + 天气占候 64）+ 48 不上卦
    check("金标准侧取不到 240 例（192 位置名 + 48 不上卦）", len(gb) == 240, f"{len(gb)}/448")
    check("被验方侧无空缺", len(jb) == 0, f"{len(jb)}/448")

    fu6b = Counter(d["topic"] for d in j6b.values() if d.get("fu_shen"))
    check("6b 伏神分布在 5 个事项（位置名事项靠取首个六亲名）",
          fu6b == Counter({"求财": 16, "求官仕途": 8, "婚姻感情": 8,
                           "求医疾病": 16, "求子嗣": 16}),
          " ".join(f"{k}×{v}" for k, v in sorted(fu6b.items())))
    em6 = Counter(d["fu_shen"]["emerge_type"].split(" — ")[0]
                  for d in j6b.values() if d.get("fu_shen"))
    check("6b 伏神四分支亦全命中", set(em6) == EMERGE_REACHABLE,
          " ".join(f"{k}×{v}" for k, v in sorted(em6.items())))

    # 天气占候：在 _TOPIC_MAP 里但**不在** _TOPIC_YONG_SHEN 里 —— 事项定夺走
    # 「显式事项认不出→退回关键词」那一支。注意退回后 resolved_topic 仍等于输入
    # （关键词表里有「天气」），故**不能**用 resolved≠输入 来断言这一支被跑到；
    # 可观测的后果是：它不在 _TOPIC_YONG_SHEN 里 → 用神退回「世爻」（位置名）。
    fb = [c for c in j6b if j6b[c]["topic"] == "天气占候"]
    fb_pos = [c for c in fb if yong_wx(g6b[c], False) is None]   # 取不到 → 位置名支
    check("「认不出的事项→退回关键词」分支被跑到（后果：用神退为位置名）",
          len(fb) == 64 and len(fb_pos) == 64,
          f"天气占候 {len(fb)} 例**金标准侧**全部取不到用神（＝走位置名支）；"
          f"resolved_topic={sorted({j6b[c]['resolved_topic'] for c in fb})} "
          f"与输入同值，故不作为判据")

    dc6 = declared_cases(HERE / "allow_yongshen.json", dyn=False)
    if dc6 is not None:
        check("申报集 ≡ 金标准空值集", dc6 == set(gb),
              f"申报 {len(dc6)} 例，空值 {len(gb)} 例")

    # ══ 结论 ═══════════════════════════════════════════════════
    print()
    if fails:
        print(f"⚠ {len(fails)} 项断言不满足：{'；'.join(fails)}")
        print("  对拍全绿也不可信 —— 有分支没被跑到，或申报与实测对不上。")
        return 1
    print("✅ 覆盖断言全部满足：全绿不是空绿")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

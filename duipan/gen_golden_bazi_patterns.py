#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字特殊格局层**（3.5.3b）
`core/bazi/special_patterns.py`：10 个特殊格局 + 汇总 + prompt 文案。

── 与 3.5.3a 的不同：这一层**不能**全枚举 ──
`detect_all_special_patterns` 吃的是整张盘：日干、四柱天干、四柱地支、月支藏干。
天干 10⁴ × 地支 12⁴ ≈ 2 亿，全枚举不现实。于是回到项目既有的做法：
**结构化样例 + 覆盖断言**（见 `diff_bazi_patterns.py` 的第 ⑤ 节）。

── 为什么输入要「只喂四柱干支」 ──
与关系层同理：样例里的盘由**干支八个字**定义，藏干由表推出，日主取日干。
这样两侧的输入逐字相同，**历法层的任何口径差异都进不来**
（3.5.1 已单独验过历法层；混进来只会让失败无法定位到层）。

── 样例集的三块 ──
A. **真实盘** 1214 例：直接读 `golden_bazi.json`（shushu `build_chart` 的产物），
   只取四柱干支入例。真实干支组合（六十甲子合法）是合成样例覆盖不到的。
B. **天干全枚举** 10 日干 × 10 年干 × 10 月干 × 10 时干 = 10000 例：
   十神共现的所有组合（官印相生/食神制杀/伤官见官/财官印三全 全在干上），
   四柱地支按索引轮转铺满 12⁴ 的各个角落。
C. **定向族**：日禄归时（日干×时支）、拱禄拱贵（日干×邻柱对×位置）、
   魁罡（日干×辰戌冲有无）、天乙受刑冲（日干×贵人支×冲刑伙伴），各按判据穷举。
   这几族是 B 的轮转**结构上取不到**的（例：禄位要求「时支恰好等于该日干的禄」）。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_patterns.py [out.json]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))

from core.bazi import chart as bchart                                    # noqa: E402
from core.constants import CANGGAN, DIZHI, TIANGAN                       # noqa: E402
from core.bazi.special_patterns import (                                 # noqa: E402
    LUWEI, TIANYI_GUI, detect_all_special_patterns,
    format_special_patterns_for_prompt,
    detect_rilu_guishi, detect_guanyin_xiangsheng, detect_shishen_zhisha,
    detect_shangguan_jianguan, detect_cai_guan_yin_quanju, detect_yangren_jiasha,
    detect_zaqi_yueling, detect_gonglu_gonggui, detect_tianyi_dugui, detect_kuigang_ge,
)
from norm_bazi_patterns import norm_format, norm_result                   # noqa: E402

# 检测器名单与顺序：**照抄** shushu `detect_all_special_patterns` 里的局部变量
# `detectors`，也照抄 ai3000 侧 `bazi_patterns.js` 的 `DETECTORS`。
# 三处必须同序 —— 顺序错了不会报错，只会把「第 3 个格局的输出」记到第 5 个名下。
# 防这个的闸门在比对器里：它断言 JS 报的 `det_keys` 与金标准 `meta.det_keys` 逐字相同。
DETECTORS = [
    ("rilu_guishi", detect_rilu_guishi),
    ("guanyin_xiangsheng", detect_guanyin_xiangsheng),
    ("shishen_zhisha", detect_shishen_zhisha),
    ("shangguan_jianguan", detect_shangguan_jianguan),
    ("cai_guan_yin_quanju", detect_cai_guan_yin_quanju),
    ("yangren_jiasha", detect_yangren_jiasha),
    ("zaqi_yueling", detect_zaqi_yueling),
    ("gonglu_gonggui", detect_gonglu_gonggui),
    ("tianyi_dugui", detect_tianyi_dugui),
    ("kuigang_ge", detect_kuigang_ge),
]

PILLARS = ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")
FULL_SAMPLE = 240
FULL_STRIDE = 79


def chart_from_gz(gz):
    """四柱干支（四个两字串）→ shushu 要吃的 chart。藏干由表推出。"""
    ch = {}
    for key, g in zip(PILLARS, gz):
        dz = g[1]
        ch[key] = {"tiangan": g[0], "dizhi": dz, "canggan": list(CANGGAN.get(dz, []))}
    ch["day_master"] = gz[2][0]
    return ch


def canon(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 样例集构造
# ─────────────────────────────────────────────────────────────

def cases_real():
    src = json.loads((HERE / "golden_bazi.json").read_text(encoding="utf-8"))["cases"]
    out = []
    for c in src:
        i = c["input"]
        kw = {}
        if i.get("city"):
            kw["city"] = i["city"]
        if i.get("longitude") is not None:
            kw["longitude"] = i["longitude"]
        # 不吞异常：实测这一批 1214 例 **0 失败**，所以 `build_chart` 一旦开始
        # 抛错，就是 shushu 变了或金标准坏了 —— 静默跳过会伪装成「样例变少」。
        ch = bchart.build_chart(i["year"], i["month"], i["day"],
                                i["hour"], i["minute"], **kw)
        gz = [ch[p]["tiangan"] + ch[p]["dizhi"] for p in PILLARS]
        out.append({"kind": "real", "id": c["id"], "gz": gz, "input": i})
    return out


def cases_stems():
    """天干全枚举：日干 × 年干 × 月干 × 时干；地支按索引轮转。"""
    out = []
    for di, dm in enumerate(TIANGAN):
        for yi, yg in enumerate(TIANGAN):
            for mi, mg in enumerate(TIANGAN):
                for hi, hg in enumerate(TIANGAN):
                    k = di * 1000 + yi * 100 + mi * 10 + hi
                    # 地支：四柱各按不同步长轮转，避免四柱永远同时踩同一支
                    zs = [DIZHI[(k + o * 5) % 12] for o in range(4)]
                    zs[2] = DIZHI[(k * 7 + di) % 12]          # 日支再打散一次
                    gz = [yg + zs[0], mg + zs[1], dm + zs[2], hg + zs[3]]
                    out.append({"kind": "stems", "id": f"s{k:04d}", "gz": gz})
    return out


def cases_targeted():
    """定向族：把每个判据里「结构上取不到」的组合补出来。"""
    out = []

    def add(kind, gz, tag):
        out.append({"kind": kind, "id": tag, "gz": gz})

    # ① 日禄归时：日干 × 时支（禄支/非禄支各一遍），其余柱固定
    for dm in TIANGAN:
        for hz in DIZHI:
            add("rilu", ["甲子", "丙寅", dm + "辰", "戊" + hz], f"rilu-{dm}{hz}")
        # 官星有无两种（日禄归时忌见官）
        add("rilu-guan", ["庚子", "辛卯", dm + "辰", "壬" + LUWEI[dm]], f"rilu-guan-{dm}")
        add("rilu-wuguan", ["乙丑", "丁卯", dm + "辰", "己" + LUWEI[dm]], f"rilu-noguan-{dm}")

    # ② 拱禄拱贵：日干 × 邻柱对 × 位置，另补「夹支已在盘中」（该被过滤掉）
    pairs = [(a, b) for a in DIZHI for b in DIZHI]
    for dm in TIANGAN:
        for pos in range(3):
            for d1, d2 in pairs:
                gz = ["甲子", "丙寅", dm + "辰", "戊午"]
                gz[pos], gz[pos + 1] = "甲" + d1, "丙" + d2
                gz[2] = dm + gz[2][1]
                add("gong", gz, f"gong-{dm}-{pos}-{d1}{d2}")

    # ③ 魁罡：四组日柱 ×（辰戌冲有无）
    for dg, dz in (("庚", "辰"), ("庚", "戌"), ("壬", "辰"), ("戊", "戌")):
        for other in ("辰", "戌"):
            add("kuigang", ["甲子", "丙寅", dg + dz, "戊" + other], f"kuigang-{dg}{dz}-{other}")
        add("kuigang-noc", ["甲子", "丙寅", dg + dz, "戊午"], f"kuigang-{dg}{dz}-none")

    # ④ 天乙独贵：日干 × 贵人支 × 与之相冲/相刑的伙伴支
    CHONG = dict(zip(DIZHI, DIZHI[6:] + DIZHI[:6]))
    for dm in TIANGAN:
        for g in TIANYI_GUI.get(dm, []):
            for other in DIZHI:
                gz = ["甲子", "丙寅", dm + "辰", "戊午"]
                gz[1], gz[3] = "丙" + g, "戊" + other      # 邻柱，方便同时测拱
                add("tianyi", gz, f"tianyi-{dm}-{g}-{other}")
            # 同柱/异柱各一遍（贵人落年柱、日柱）
            for zz in DIZHI:
                gz = ["甲" + g, "丙寅", dm + "辰", "戊" + zz]
                add("tianyi-year", gz, f"tianyi-y-{dm}-{g}-{zz}")

    # ⑤ 杂气月令：日干 × 四库月 × 干支搭配（藏干十神有无）
    for dm in TIANGAN:
        for mz in "辰戌丑未":
            for yg in TIANGAN:
                add("zaqi", [yg + "子", "丙" + mz, dm + "辰", "戊午"],
                    f"zaqi-{dm}{mz}{yg}")

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_patterns.json"))
    a = ap.parse_args()

    cases = cases_real() + cases_stems() + cases_targeted()
    # 去重（同 gz 只留一条），保留首次出现的 id —— 重复入例只让金标准变大
    seen, uniq = set(), []
    for c in cases:
        k = "".join(c["gz"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(c)
    cases = uniq

    digest, fmt_digest, counts, hist = [], [], [], {}
    det_flags = []                      # 每例 10 个 '0'/'1'：逐检测器的命中与否
    det_names = [None] * len(DETECTORS)  # 每个检测器固定的 name（逐例断言不变）
    full = []
    for idx, c in enumerate(cases):
        ch = chart_from_gz(c["gz"])
        res = detect_all_special_patterns(ch)
        fmt = format_special_patterns_for_prompt(res)
        # 归一后才摘要（归一只有 norm_bazi_patterns.py 一份实现，两侧共用）
        digest.append(sha(canon(norm_result(res))))
        fmt_digest.append(sha(norm_format(fmt)))
        # 逐检测器存**命中标志**而非逐检测器摘要：
        #   命中的内容已由汇总摘要全量覆盖（汇总把检测器返回的整个 dict 原样 push
        #   进 matched/auspicious/inauspicious，所以检测器正文写错 → 汇总摘要必变），
        #   而汇总覆盖不到的恰恰是**没命中**这件事 —— 标志位正好钉住它，
        #   且 10 个 0/1 比 10 个 sha256 便宜 64 倍（10MB → 157KB）。
        flags = []
        for j, (_, fn) in enumerate(DETECTORS):
            r = fn(ch)
            flags.append("1" if r.get("matched") else "0")
            # 未命中结果的形状：shushu 约定**只有** name+matched。
            # 多带字段或少了 name 都是实现变了，得显形（汇总看不到未命中的结果）。
            if not r.get("matched"):
                assert set(r.keys()) == {"name", "matched"}, (
                    f"检测器 {DETECTORS[j][0]} 未命中却带了额外字段：{sorted(r.keys())}")
            if det_names[j] is None:
                det_names[j] = r.get("name")
            else:
                assert det_names[j] == r.get("name"), (
                    f"检测器 {DETECTORS[j][0]} 的 name 逐例不一致："
                    f"{det_names[j]!r} vs {r.get('name')!r}")
        det_flags.append("".join(flags))
        counts.append([res["total"], res["total_aus"], res["total_inaus"]])
        for p in res["matched"]:
            hist[p["name"]] = hist.get(p["name"], 0) + 1
            key = f"{p['name']}·{'吉' if p['auspicious'] else '凶'}"
            hist[key] = hist.get(key, 0) + 1
        # `full` 存**未归一**的原文：shushu 的原样输出是有诊断价值的，
        # 归一留给比对时做（两侧同归一，效果一样，但金标准里留下了真迹）。
        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"gz": c["gz"], "id": c["id"], "result": res, "format": fmt})

    out = {
        "meta": {
            "layer": "3.5.3b 八字特殊格局层",
            "source": "shushu core/bazi/special_patterns.py",
            "n_cases": len(cases),
            "kinds": sorted({c["kind"] for c in cases}),
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "norm": "duipan/norm_bazi_patterns.py（雜氣月令十神串按 '/' 切分后排序，两侧同归一）",
            "det_keys": [k for k, _ in DETECTORS],
            # 每个检测器的 name：比对器要断言**所有**（含未命中）结果的 name 正确 ——
            # 否则「检测器 5 少写一行、把名字复制成了检测器 3 的」不会被发现。
            "det_names": det_names,
            "full_stride": FULL_STRIDE,
        },
        "cases": [{"id": c["id"], "kind": c["kind"], "gz": c["gz"]} for c in cases],
        "digest": digest,
        "fmt_digest": fmt_digest,
        "det_flags": det_flags,
        "counts": counts,
        "full": full,
        "pattern_hist": hist,
    }
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {len(cases)} 例 → {a.out}（{Path(a.out).stat().st_size / 1024:.0f} KB）")
    from collections import Counter
    print(f"  样例族：{dict(Counter(c['kind'] for c in cases))}")
    print(f"  格局命中谱：{json.dumps(hist, ensure_ascii=False, sort_keys=True)}")

    # 落地自查：10 个格局**每一个**都必须至少命中一次，且吉/凶两侧都出现
    # （凶侧只有 伤官见官/天乙独贵受冲/魁罡有冲/食神制杀印重 四种，不查就会空过）
    EXPECT = {"日禄归时格", "官印相生", "食神制杀", "伤官见官", "财官印三全",
              "羊刃驾杀", "杂气月令格", "拱禄拱贵", "天乙独贵", "魁罡格"}
    got = {k for k in hist if "·" not in k}
    assert got == EXPECT, f"格局谱不对：多 {got - EXPECT}，缺 {EXPECT - got}"
    for name in EXPECT:
        assert hist.get(f"{name}·吉", 0) > 0 or hist.get(f"{name}·凶", 0) > 0, name
    aus = sum(1 for k in hist if k.endswith("·吉"))
    inaus = sum(1 for k in hist if k.endswith("·凶"))
    assert aus >= 3 and inaus >= 2, f"吉/凶分支覆盖不足：吉 {aus} 类、凶 {inaus} 类"
    print(f"  ✓ {len(EXPECT)} 个格局全部命中（吉 {aus} 类 · 凶 {inaus} 类）")

    # ── 负分支覆盖（汇总层看不到的那一半）──
    # 每个检测器的命中列里必须有 0 也必须有 1。若某列全是 0，说明这一族样例
    # 压根没走到那个判据（或实现恒返回 false），而**汇总摘要两侧照样一致** —— 空绿。
    for j, (key, _) in enumerate(DETECTORS):
        col = [f[j] for f in det_flags]
        ones, zeros = col.count("1"), col.count("0")
        assert ones > 0, f"检测器 {key} 一例都没命中，该判据未被样例覆盖"
        assert zeros > 0, f"检测器 {key} 例例命中，负分支未被覆盖"
        print(f"     {key:<22} 命中 {ones:>6} / 未命中 {zeros:>6}")


if __name__ == "__main__":
    main()

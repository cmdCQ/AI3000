#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字用神/调候层**（3.5.3c）

被测的四件事（都在 shushu 一侧）：
  `core/bazi/tiaohou_yongshen.py`  : `analyze_tiaohou_in_chart` / `analyze_geju_cheng_bai`
  `core/bazi/day_master_profiles.py`: `analyze_yong_shen` / `get_day_master_profile`

── 为什么输入要「只喂四柱干支」──
与关系层（3.5.3a）、特殊格局层（3.5.3b）同理：样例里的盘由**干支八个字**定义，
藏干由表推出，日主取日干。于是两侧输入逐字相同，**历法层的口径差异进不来**。

⚠ 但这一层比 3.5.3b 多一处依赖：`analyze_yong_shen` 还要读 `chart["strength"]` 与
`chart["pattern"]`，而这两个是**从同样八个字现算**的（shushu `analyze_chart` vs
ai3000 `bazi.js::analyzeChart`）。即本层叠在 3.5.1b（层 8）已验的那条链上。
实测（`/tmp/probe2.py`）：只用干支造的盘与 `build_chart` 的真盘相比，
旺衰/格局 **465/465 逐例相同** —— 这条路是通的，不是假设。
比对器把 `strength`/`pattern` 也当**被比字段**，故层 8 若哪天漂了，本层会直接显形，
不会「用错的前提静默算出对不上的结论」。

── 样例集的三块 ──
A. **真实盘** 1214 例（去重后 465）：读 `golden_bazi.json` 的四柱干支。
B. **天干全枚举** 10⁴ 例：日干×年干×月干×时干，地支按索引轮转。与 3.5.3b 同一族
   （直接复用它的构造函数，不写第四份）。
C. **调候表全枚举** 10 日干 × 12 月支 × **3 个变体** = 360 例：
   调候用神的键空间只有 120 格，这族**把它一格格铺满**，并刻意分三档铺 ——
     变体 p：四天干全填调候主用神        → 主用神必在盘中
     变体 s：天干铺非辅用神、地支避辅用神 → 逼出「部分到位」（主在辅缺）
     变体 x：天干地支全避主用神          → 逼出「失司」
   为什么值得单独一族：真实盘 465 例里 **用神五行=土的只有 1 例**（调候首干为土的
   只有 3/120 格），`_get_yong_shen_recommendations` 里土的那几条查表几乎没被执行过。
   靠真实盘撞不如按表铺满 —— 铺满后土出 250 例，谱与表本身的分布一致。

── 本层零归一 ──
3.5.3b 需要归一（shushu 的雜氣月令用 `list(set(...))`，顺序随进程哈希种子变）。
本层**没有任何依赖哈希顺序的遍历**：查表都是 `.get(dm,{}).get(mz)`，
列表都是字面量保序，`WX_CHARS` 那种内层映射的顺序**就是优先级**（Python 字面量保序 /
JS 对象字符串键保序，两侧一致）。故两侧都不归一 —— 归一是把「已知的抖动」抹平，
没有抖动还归一，只会把真差异一起抹掉。已用 `PYTHONHASHSEED` 两个取值复跑核对过。

── 三条**不可达**分支：照搬 + 留证，不假装验过 ──
① `analyze_yong_shen` 的用神优先级是 调候 > 格局 > 扶抑，但 `TIAO_HOU_TABLE` 120/120
   全覆盖 → 第 1 条必然命中，`elif gejv_yong_wx` 与身强/身弱扶抑两条**是死代码**。
   取证：断言**每一例**的 `yong_source` 都以「《穷通宝鉴》调候：」开头。
② `analyze_tiaohou_in_chart` 的 `available:false` 与 `get_tiaohou_yongshen` 的兜底文案：
   只有表缺格才会走到，表满格 → 不可达。取证：断言 `available` 恒 true。
③ `BAZIGE_SYSTEM` 13 格里，`专旺格 / 偏官格 / 化格` 在本层的 1 万余例中**一次都没取到**
   —— `detect_pattern` 从来判不出这三个名字（它判「润下格/炎上格/曲直格」而不判「专旺格」、
   判「七杀格」而不判「偏官格」）。这是 shushu 侧的名字对不上，**不是本层漏测**：
   断言未覆盖集恰好是这三个，谁哪天补上了，这里会响。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi_yongshen.py [out.json]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))
sys.path.insert(0, str(HERE))

from core.bazi.analyzer import analyze_chart                              # noqa: E402
from core.bazi.day_master_profiles import (                               # noqa: E402
    DAY_MASTER_PROFILES, analyze_yong_shen, get_day_master_profile,
)
from core.bazi.tiaohou_yongshen import (                                  # noqa: E402
    GE_JU_CHENG_BAI, TIAOHOU_TABLE as TIAOHOU_STRUCT, analyze_tiaohou_in_chart,
)
from core.constants import CANGGAN, DIZHI, TIANGAN                        # noqa: E402
from knowledge.bazi_classical import BAZIGE_SYSTEM                        # noqa: E402

# 样例族 A/B 与 3.5.3b **共用同一份构造函数**。写第四份 `chart_from_gz` 就多一处
# 「两边构造法悄悄分叉」的机会（真分叉了，对拍会以「实现不同」的面目出现，白查半天）。
from gen_golden_bazi_patterns import cases_real, cases_stems, chart_from_gz  # noqa: E402

FULL_SAMPLE = 180
FULL_STRIDE = 59

# 本层产出、且逐字参与比对的顶层字段。比对器拿它当闸门（少挂一个字段要显形）。
TOP_KEYS = ["tiaohou", "geju_cheng_bai", "yong_shen", "day_master_profile"]

# `BAZIGE_SYSTEM` 的键里，`detect_pattern` 判不出来的那三个（见文件头 ③）。
UNREACHABLE_BAZIGE = {"专旺格", "偏官格", "化格"}

# `analyze_yong_shen` 里那三条不可达分支的「取证词」（见文件头 ①）。
TIAOHOU_SOURCE_PREFIX = "《穷通宝鉴》调候："


def canon(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


# ─────────────────────────────────────────────────────────────
# 样例集构造
# ─────────────────────────────────────────────────────────────

def cases_tiaohou():
    """调候表全枚举：10 日干 × 12 月支 × 3 变体。

    三个变体各自**定向**铺一档评级，而不是撞运气：
      p —— 年/月/时干全填主用神 → 主用神必在盘中（到位 或 部分到位）
      s —— 年干填主用神、其余干与三支避辅用神 → 逼出「部分到位」（主在、辅缺）
      x —— 年/月/时干与三支全避主用神 → 逼出「失司」
    月支**必须**是这一格的月支（它正是调候表的第二个键），故它不可选：
    该支的藏干里若恰好含主用神，变体 x 在这一格就注定到不了「失司」——
    这是表本身的性质，不是构造失误，故照铺、不硬凑，覆盖率由全局断言兜底。
    """
    out = []

    def safe_zhis(avoid):
        """藏干与 `avoid` 不相交的地支（保序）。"""
        return [z for z in DIZHI if not (set(CANGGAN.get(z, [])) & avoid)]

    def pick3(pool, fallback="子"):
        """从池子里取 3 个（不够就循环），保序确定性。"""
        if not pool:
            pool = [fallback]
        return [pool[i % len(pool)] for i in range(3)]

    for dm in TIANGAN:
        for mz in DIZHI:
            cell = TIAOHOU_STRUCT[dm][mz]
            p = cell.get("primary", "")
            s = cell.get("secondary", "")
            s2 = cell.get("secondary2", "")

            if p:
                # ① 主用神铺满四天干（月支它自己、其余支随便取但避开辅用神，好让 p 变体
                #    尽量落在「到位」而不是被辅用神缺失拖成「部分到位」）
                zs = pick3(safe_zhis({s, s2} - {""}))
                out.append({"kind": "tiaohou-p", "id": f"th-p-{dm}{mz}",
                            "gz": [p + zs[0], p + mz, dm + zs[1], p + zs[2]]})

                # ② 主在、辅缺 → 部分到位
                others = [g for g in TIANGAN if g != p and g not in ({s, s2} - {""})]
                g_other = others[0] if others else p
                zs = pick3(safe_zhis({s, s2} - {""}))
                out.append({"kind": "tiaohou-s", "id": f"th-s-{dm}{mz}",
                            "gz": [p + zs[0], g_other + mz, dm + zs[1], g_other + zs[2]]})

                # ③ 主缺 → 失司
                nos = [g for g in TIANGAN if g != p and g not in ({s, s2} - {""})]
                g_no = nos[0] if nos else ("甲" if p != "甲" else "乙")
                zs = pick3(safe_zhis({p}))
                out.append({"kind": "tiaohou-x", "id": f"th-x-{dm}{mz}",
                            "gz": [g_no + zs[0], g_no + mz, dm + zs[1], g_no + zs[2]]})

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(HERE / "golden_bazi_yongshen.json"))
    a = ap.parse_args()

    cases = cases_real() + cases_stems() + cases_tiaohou()
    seen, uniq = set(), []
    for c in cases:
        k = "".join(c["gz"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(c)
    cases = uniq

    # ── 逐例 ──
    tiaohou_digest, yong_digest, geju_digest = [], [], []
    counts, det_flags = [], []
    grade_hist, yongwx_hist, pattern_hist = Counter(), Counter(), Counter()
    gejv_hist, sec_hist, sec2_hist, geju_flag_hist = Counter(), Counter(), Counter(), Counter()
    yong_source_kind = Counter()
    strength_hist = Counter()
    bad_prefix = []
    full = []
    keys0 = {}                                  # 首个样例的键集，用于「逐例键集恒定」断言

    for idx, c in enumerate(cases):
        ch = chart_from_gz(c["gz"])
        analyze_chart(ch)                       # 旺衰/格局由这八个字现算（见文件头 ⚠）
        ys = analyze_yong_shen(ch)
        prof = get_day_master_profile(ch["day_master"])

        # 键集逐例恒定 —— 否则「闸门」比的就只是「第一例的键集」，后面变了也看不出来。
        # （`geju_cheng_bai` 例外：它**按用例存在/不存在**，故单独用存在性标志比。）
        for name, obj in (("tiaohou", ch["tiaohou"]), ("yong_shen", ys), ("profile", prof)):
            ks = sorted(obj)
            if name not in keys0:
                keys0[name] = ks
            else:
                assert ks == keys0[name], (
                    f"{name} 的键集在第 {idx} 例变了：{ks} vs {keys0[name]}")

        tiaohou_digest.append(sha(canon(ch["tiaohou"])))
        yong_digest.append(sha(canon(ys)))
        geju_digest.append(sha(canon(ch["geju_cheng_bai"])) if ch.get("geju_cheng_bai") else "")

        # 冗余取证件：失败时一眼看出是「全空」还是「少一类」，不必去翻摘要
        counts.append([
            ch["tiaohou"]["grade"],
            ys["yong_shen_wx"],
            ch["strength"],
            ch["pattern"],
            "有" if ch.get("geju_cheng_bai") else "无",
            {True: "true", False: "false", None: "null"}[ch["tiaohou"]["secondary_in_chart"]],
        ])
        # 逐例 6 个标志位：不可达分支的取证 + 各分支的命中与否（负分支也钉住）
        det_flags.append("".join([
            "1" if ys["yong_source"].startswith(TIAOHOU_SOURCE_PREFIX) else "0",
            "1" if ch["tiaohou"]["available"] else "0",
            "1" if ch["tiaohou"]["secondary_in_chart"] is None else "0",
            "1" if ch["tiaohou"]["secondary2_in_chart"] is None else "0",
            "1" if ys["gejv"] else "0",
            "1" if ys["recommendations"]["lucky_direction"] else "0",
        ]))
        if not ys["yong_source"].startswith(TIAOHOU_SOURCE_PREFIX):
            bad_prefix.append((idx, ys["yong_source"]))

        grade_hist[ch["tiaohou"]["grade"]] += 1
        yongwx_hist[ys["yong_shen_wx"]] += 1
        strength_hist[ch["strength"]] += 1
        pattern_hist[ch["pattern"]] += 1
        gejv_hist["非空" if ys["gejv"] else "空"] += 1
        geju_flag_hist["有" if ch.get("geju_cheng_bai") else "无"] += 1
        sec_hist[{True: "true", False: "false", None: "null"}[ch["tiaohou"]["secondary_in_chart"]]] += 1
        sec2_hist["有" if ch["tiaohou"]["secondary2"] else "无"] += 1
        yong_source_kind[ys["yong_source"].split("：")[0]] += 1

        if idx % FULL_STRIDE == 0 and len(full) < FULL_SAMPLE:
            full.append({"gz": c["gz"], "id": c["id"], "kind": c["kind"],
                         "tiaohou": ch["tiaohou"],
                         "geju_cheng_bai": ch.get("geju_cheng_bai"),
                         "yong_shen": ys})

    # 日主档案：10 个日干 → 10 个取值，逐例存 10600 份摘要 = 10600 次重复同一件事。
    # 存**按日主的表**，比逐例更有表达力（它证明的正是「只与日干有关」这件事）。
    # 顺序用 TIANGAN（甲乙丙丁…）而不是汉字码位序（sorted() 会给出丁丙乙壬…）：
    # JS 侧的表就是按 TIANGAN 序生成的，两边序号对不上会让闸门误报。
    profile_digest = {dm: sha(canon(get_day_master_profile(dm))) for dm in TIANGAN}
    assert set(profile_digest) == set(DAY_MASTER_PROFILES), "日主档案的日干集不是十个天干"
    # 顺带证明「档案确实只由日干决定」：逐例再算一遍，与表里那一份不一致就炸。
    for c in cases:
        dm = c["gz"][2][0]
        assert sha(canon(get_day_master_profile(dm))) == profile_digest[dm], dm

    out = {
        "meta": {
            "layer": "3.5.3c 八字用神/调候层",
            "source": ("shushu core/bazi/tiaohou_yongshen.py + "
                       "core/bazi/day_master_profiles.py"),
            "n_cases": len(cases),
            "kinds": sorted({c["kind"] for c in cases}),
            "canon": "json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',',':')) → sha256 hex",
            "norm": "无 —— 本层零归一（无任何依赖进程哈希顺序的遍历），两侧都不归一",
            "top_keys": TOP_KEYS,
            # 各段的键集：比对器拿它当闸门 —— 少挂一个字段会让后面每层摘要都以「差异」
            # 的面目出现，先在闸门挡住，省得到处找。
            "tiaohou_keys": keys0["tiaohou"],
            "yong_keys": keys0["yong_shen"],
            "profile_keys": keys0["profile"],
            "day_masters": list(TIANGAN),
            "full_stride": FULL_STRIDE,
            "flag_names": ["yong_source 走调候", "tiaohou.available", "secondary_in_chart:null",
                           "secondary2_in_chart:null", "gejv 非空", "recommendations 非空"],
            "unreachable_bazige": sorted(UNREACHABLE_BAZIGE),
            "unreachable_note": ("detect_pattern 判不出 专旺格/偏官格/化格 这三个名字，"
                                 "故 BAZIGE_SYSTEM 这 3 条在这条链上取不到（shushu 侧名字对不上）"),
        },
        "cases": [{"id": c["id"], "kind": c["kind"], "gz": c["gz"]} for c in cases],
        "digest": tiaohou_digest,
        "yong_digest": yong_digest,
        "geju_digest": geju_digest,
        "profile_digest": profile_digest,
        "det_flags": det_flags,
        "counts": counts,
        "full": full,
        "hist": {
            "grade": dict(grade_hist),
            "yong_shen_wx": dict(yongwx_hist),
            "strength": dict(strength_hist),
            "pattern": dict(pattern_hist),
            "gejv": dict(gejv_hist),
            "geju_cheng_bai": dict(geju_flag_hist),
            "secondary_in_chart": dict(sec_hist),
            "secondary2": dict(sec2_hist),
            "yong_source_kind": dict(yong_source_kind),
        },
    }
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"✓ {len(cases)} 例 → {a.out}（{Path(a.out).stat().st_size / 1024:.0f} KB）")
    print(f"  样例族：{dict(Counter(c['kind'] for c in cases))}")
    for k, v in out["hist"].items():
        print(f"  {k:<20} {json.dumps(v, ensure_ascii=False, sort_keys=True)}")

    # ── 落地自查 ──
    # ① 不可达分支的取证：每一例都必须走「调候」，否则说明前提变了（不是缺陷，是**消息**）
    assert not bad_prefix, (
        f"{len(bad_prefix)} 例的用神不是走调候分支，前提已变（原先 120/120 全覆盖使"
        f"格局/扶抑两条不可达）：{bad_prefix[:5]}")
    print(f"  ✓ 不可达取证：{len(cases)}/{len(cases)} 例的 yong_source 都走「调候」分支"
          f"（格局/扶抑两条为死代码，此处留证）")
    assert all(f[1] == "1" for f in det_flags), "tiaohou.available 出现了 false —— 表缺格了？"
    print("  ✓ 不可达取证：tiaohou.available 恒 true（表缺格时才有的兜底分支不可达）")

    # ② 各分支覆盖（含负分支）——「全绿」必须是「两侧一致」而不是「两边都空」
    for k, need in (("grade", {"调候到位", "调候部分到位", "调候失司"}),
                    ("yong_shen_wx", {"木", "火", "土", "金", "水"}),
                    ("strength", {"身强", "身弱", "中和"}),
                    ("gejv", {"空", "非空"}),
                    ("geju_cheng_bai", {"有", "无"}),
                    ("secondary_in_chart", {"true", "false", "null"}),
                    ("secondary2", {"有", "无"})):
        got = set(out["hist"][k])
        assert got == need, f"{k} 覆盖不全：多 {got - need}、缺 {need - got}"
    print(f"  ✓ 七张谱全覆盖（grade 三档 / 用神五行五种 / 旺衰三种 / gejv 空非空 / "
          f"成败救应有 无 / secondary 三态 / secondary2 有 无）")
    # 用神五行=土 是探针里发现的最薄一支（真实盘 465 例只有 1 例），单独点名
    assert yongwx_hist["土"] >= 100, f"用神五行=土 只有 {yongwx_hist['土']} 例，调候族没铺到？"
    print(f"  ✓ 最薄一支（用神五行=土）{yongwx_hist['土']} 例 —— 真实盘只有 1 例，靠调候族铺满")

    # ③ 八正格成败救应：8 个键必须全部命中过
    hit8 = {p for p in pattern_hist if p in GE_JU_CHENG_BAI}
    assert hit8 == set(GE_JU_CHENG_BAI), \
        f"成败救应有键没被任何样例命中：{set(GE_JU_CHENG_BAI) - hit8}"
    print(f"  ✓ 成败救应 8 个正格全部命中（{sum(pattern_hist[p] for p in hit8)} 例）")

    # ④ BAZIGE_SYSTEM 的未覆盖键：**应当**恰好是那三个（前提变化的报警器）
    uncovered = set(BAZIGE_SYSTEM) - set(pattern_hist)
    assert uncovered == UNREACHABLE_BAZIGE, (
        f"BAZIGE_SYSTEM 未覆盖键变了：{sorted(uncovered)}（原以为恰是 "
        f"{sorted(UNREACHABLE_BAZIGE)}）—— 要么 shushu 的 detect_pattern 改了判格名字，"
        f"要么样例集变了，两种情况都要人看一眼")
    print(f"  ✓ BAZIGE_SYSTEM 13 格中 {len(set(BAZIGE_SYSTEM) - uncovered)} 格命中，"
          f"未覆盖的恰是 {sorted(uncovered)}（detect_pattern 判不出这三个名字）")
    thin = {k: v for k, v in pattern_hist.items() if v <= 5}
    if thin:
        print(f"  ⚠ 命中数极少的格局（覆盖薄，但逐字比对仍然有效）："
              f"{json.dumps(thin, ensure_ascii=False, sort_keys=True)}")

    # ⑤ 调候族是不是真把 120 格铺满了
    th_kinds = [c for c in cases if c["kind"].startswith("tiaohou-")]
    cells = {(c["gz"][2][0], c["gz"][1][1]) for c in th_kinds}
    want_cells = {(dm, mz) for dm in TIANGAN for mz in DIZHI}
    assert cells == want_cells, f"调候族漏格：{sorted(want_cells - cells)[:8]}"
    for v in ("tiaohou-p", "tiaohou-s", "tiaohou-x"):
        n = sum(1 for c in cases if c["kind"] == v)
        assert n == 120, f"{v} 应 120 例，实得 {n}"
    print(f"  ✓ 调候表 120 格全枚举（10 日干 × 12 月支）× 3 变体 = 360 例，一格不漏")

    # ⑥ 标志位的负分支覆盖
    for j, name in enumerate(out["meta"]["flag_names"]):
        col = [f[j] for f in det_flags]
        ones, zeros = col.count("1"), col.count("0")
        assert ones > 0, f"标志「{name}」一例都没命中"
        print(f"     flag {name:<26} 命中 {ones:>6} / 未命中 {zeros:>6}")


if __name__ == "__main__":
    main()

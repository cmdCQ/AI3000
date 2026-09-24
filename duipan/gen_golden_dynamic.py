# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**动态装卦层**（纳甲 + 日辰月建诸作用）。

与静态层的分工：
  · 静态层（gen_golden_zhuang_gua.py）只验定式，不含历法。
  · 本层验「给定四柱后每个爻的动态标注」：六神、旬空、旺衰、世应、变爻
    （化进退神/回头生克靠 changed_* 体现）、卦身、卦型。
  · **四柱由 shushu 历法给出并原样喂给 JS**，故本层不验历法——
    历法层另有 对拍 3 单独拍，这样出问题能定位到层。

金标准走真实 divine 管线（`/api/v1/liuyao/divine`），非旁路调内部函数，
以免金标准与线上产物脱节。变卦由 shushu 自己的表推导后导出。

用法：
    .venv/bin/python gen_golden_dynamic.py [--limit N] [out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from fastapi.testclient import TestClient                                  # noqa: E402
# 注意必须写成别名：本文件末尾的 `def main()` 会把全局名 main 重绑成函数，
# 若用 `import main` 则模块对象被覆盖，main.app 取不到。
import main as shushu_app                                                   # noqa: E402
from core.calendar.current_moment import current_sizhu                     # noqa: E402
from core.liuyao.hexagram_data import HEXAGRAM_DATA, HEXAGRAM_TRIGRAM_MAPPING  # noqa: E402
from allow_yongshen_common import declare, shushu_unresolved             # noqa: E402

TRI_LINES = {
    "乾": "111", "兑": "110", "离": "101", "震": "100",
    "巽": "011", "坎": "010", "艮": "001", "坤": "000",
}
TRI_NUM = {"乾": 1, "兑": 2, "离": 3, "震": 4, "巽": 5, "坎": 6, "艮": 7, "坤": 8}
NUM_TRI = {v: k for k, v in TRI_NUM.items()}
# 三画爻象串（升序 初..三）→ 先天卦数
LINES2NUM = {v: TRI_NUM[k] for k, v in TRI_LINES.items()}
# 六爻爻象串（升序 初..上）→ 文王卦序
STR2NUM = {}
for _num, (_lo, _up) in HEXAGRAM_TRIGRAM_MAPPING.items():
    STR2NUM[TRI_LINES[_lo] + TRI_LINES[_up]] = _num


def lines_of(num: int) -> str:
    lo, up = HEXAGRAM_TRIGRAM_MAPPING[num]
    return TRI_LINES[lo] + TRI_LINES[up]


def yao_values(num: int, moving) -> list:
    """七/八为静，九/六为动（初→上）。"""
    s = lines_of(num)
    mv = set(moving)
    out = []
    for i, ch in enumerate(s):
        yang = ch == "1"
        if (i + 1) in mv:
            out.append(9 if yang else 6)
        else:
            out.append(7 if yang else 8)
    return out


def bian_of(num: int, moving):
    """变卦（卦号, 上下卦号）——按 shushu 自身表推导。"""
    s = list(lines_of(num))
    for p in moving:
        s[p - 1] = "0" if s[p - 1] == "1" else "1"
    t = "".join(s)
    num2 = STR2NUM[t]
    return num2, LINES2NUM[t[3:6]], LINES2NUM[t[0:3]]   # 上卦, 下卦


# ── 样例集 ────────────────────────────────────────────────────
# 6 个占时覆盖不同月支/日干/旬组；立春前后与子时另在历法层验。
TIMES = [
    "2026-01-15T10:00:00",   # 小寒后 土/水月
    "2026-03-20T14:00:00",   # 春分后 木月
    "2026-05-10T10:00:00",   # 立夏后 火月
    "2026-07-22T16:00:00",   # 大暑 火/土月
    "2026-09-10T08:00:00",   # 白露后 金月
    "2026-11-11T20:00:00",   # 立冬后 水月
]
# 多动组合：1~6 爻动都要出现一遍，否则 dong_jing_analysis 的某个分支
# （尤其「独静卦」＝5 动，及其 static_line 计算）根本没被跑到，全绿等于没验。
MULTI_MOVING = [[1, 2], [2, 3], [5, 6], [1, 2, 3], [1, 2, 3, 4], [4, 5, 6],
                [1, 2, 3, 4, 5], [2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6], [1, 4]]
# 同一半卦内的**相邻**动爻对 —— 结构上唯一能产生「化冲」的配置
# （见 build/backend/paipan/relations.js 头注 1）
ADJACENT_PAIRS = [[2, 3], [5, 6]]


def build_cases():
    cases = []
    # A：6 个占时 × 64 卦 静卦
    for ti, qt in enumerate(TIMES):
        for num in range(1, 65):
            cases.append((f"T{ti}-{num}-静", num, [], qt))
    # B：2 个占时 × 64 卦 单动
    for ti, qt in enumerate(TIMES[:2]):
        for num in range(1, 65):
            cases.append((f"T{ti}-{num}-动{(num % 6) + 1}", num, [(num % 6) + 1], qt))
    # C：8 卦 × 各多动组合（覆盖动静分析各分支）
    for num in [1, 2, 3, 23, 29, 51, 52, 64]:
        for mv in MULTI_MOVING:
            cases.append((f"T0-{num}-多动{''.join(map(str, mv))}", num, mv, TIMES[0]))
    # D：全 64 卦 × 相邻动爻对 —— 系统覆盖 化冲/化合/化进退
    for num in range(1, 65):
        for mv in ADJACENT_PAIRS:
            cases.append((f"T0-{num}-邻动{''.join(map(str, mv))}", num, mv, TIMES[0]))
    return cases


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(Path(__file__).with_name("golden_dynamic.json")))
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    client = TestClient(shushu_app.app)
    cases = build_cases()
    if args.limit:
        cases = cases[: args.limit]
    print(f"样例 {len(cases)} 条，开始跑 shushu divine 管线 …", flush=True)

    golden = {}
    bad = []
    liuqins = {}      # cid → 本卦六亲（申报判据要用，见 allow_yongshen_common）
    allow = {}
    for i, (cid, num, mv, qt) in enumerate(cases):
        yv = yao_values(num, mv)
        r = client.post("/api/v1/liuyao/divine", json={
            "method": "manual", "yao_values": yv, "question": "求财",
            "topic": "求财", "gender": "male", "query_time": qt,
        })
        if r.status_code != 200:
            bad.append(f"{cid}: HTTP {r.status_code}")
            continue
        d = r.json().get("data") or {}
        if not d.get("yaos"):
            bad.append(f"{cid}: 无 yaos")
            continue

        bnum, bup, blo = bian_of(num, mv)
        lo_n, up_n = HEXAGRAM_TRIGRAM_MAPPING[num]
        sz = current_sizhu(datetime.fromisoformat(qt))
        liuqins[cid] = [y.get("liu_qin", "") for y in d["yaos"]]
        golden[cid] = {
            "case": cid,
            "query_time": qt,
            "sizhu": {k: sz[k] for k in ("year_gz", "month_gz", "day_gz", "hour_gz")},
            "ben": {"upper": TRI_NUM[up_n], "lower": TRI_NUM[lo_n]},
            "bian": {"upper": bup, "lower": blo, "name": HEXAGRAM_DATA[bnum]["name"]},
            "moving": list(mv),
            "gua_shen": d["gua_shen"]["zhi"],
            "gua_shen_on_chart": d["gua_shen"]["in_chart"]["on_chart"],
            "kong_wang_branches": d["kong_wang_branches"],
            "month_zhi": d["month_zhi"],
            "day_gan": d["day_gan"],
            "day_zhi": d["day_zhi"],
            "world_line": d["world_line"],
            "application_line": d["application_line"],
            "palace_name": d["palace_name"],
            "palace_element": d["palace_element"],
            "palace_position": d["palace_position"],
            "palace_trigram": d["palace_trigram"],
            "hex_type": d["hex_type"],
            # ── 层 4：卦体关系层（**用神无关**的那一半）──────────────
            # 原名原形照抄，不做任何改名/整形（对拍铁律「零归一」）。
            "dong_jing_analysis": d["dong_jing_analysis"],
            "hua_he_chong": d["hua_he_chong"],
            "sanhe_sanhui": d["sanhe_sanhui"],
            # deep_relations 全量五键：
            #   line_details / changing_relations 用神无关（层 4 已验）
            #   yong_yuan_ji_chou / key_lines / summary 用神相关（层 6）
            # key_lines 里的每条是**原样展开的爻**，两侧爻的键集不同（金标准是
            # shushu 响应里的爻，JS 侧是喂进函数的瘦爻），故按**语义取子集**：
            # 只比 position / liu_qin / branch —— 恰好是 summary 实际消费的三个字段。
            # 这是分层取子集，不是归一：被取的三个字段逐字比。
            "deep_relations": {
                "line_details": (d.get("deep_relations") or {}).get("line_details", []),
                "changing_relations": (d.get("deep_relations") or {}).get("changing_relations", []),
                "yong_yuan_ji_chou": (d.get("deep_relations") or {}).get("yong_yuan_ji_chou", {}),
                "summary": (d.get("deep_relations") or {}).get("summary", []),
                "key_lines": {
                    k: [
                        {"position": l.get("position"),
                         "liu_qin": l.get("liu_qin", ""),
                         "branch": l.get("branch", "")}
                        for l in v
                    ]
                    for k, v in ((d.get("deep_relations") or {}).get("key_lines") or {}).items()
                },
            },
            # ── 层 6：用神层（用神取定 / 伏神 / 世身）──────────────
            # 本层金标准的 topic 恒为「求财」（见上方 divine 请求），即用神层
            # 只被验了「用神＝妻财」这一条路径；其余事项/性别/代占另由
            # verify_yongshen_topics.js 走 shushu 纯函数对拍（不经 divine 管线）。
            "fu_shen": d.get("fu_shen"),
            "shi_shen": d.get("shi_shen"),
            "yaos": [
                {
                    "position": y["position"],
                    "stem": y.get("stem", ""),
                    "branch": y["branch"],
                    "ganzhi": y.get("ganzhi", ""),
                    "element": y["element"],
                    "liu_qin": y["liu_qin"],
                    "liu_shen": y["liu_shen"],
                    "kong_wang": y["kong_wang"],
                    "strength": (y.get("strength") or {}).get("label", ""),
                    "is_world": y["is_world"],
                    "is_application": y["is_application"],
                    "is_changing": y["is_changing"],
                    "changed_stem": y.get("changed_stem", ""),
                    "changed_branch": y.get("changed_branch", ""),
                    "changed_ganzhi": y.get("changed_ganzhi", ""),
                    "changed_liu_qin": y.get("changed_liu_qin", ""),
                }
                for y in d["yaos"]
            ],
        }
        if (i + 1) % 100 == 0:
            print(f"  … {i + 1}/{len(cases)}", flush=True)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已写 {out}（{len(golden)} 条）")

    # 层 6a 的申报偏差：本文件 topic 恒为「求财」，故只会撞上「用神不上卦」那一条。
    # 判据出自 shushu 自己的取法（见 allow_yongshen_common），不看实跑差异。
    for cid, num, mv, qt in cases:
        if cid not in golden:
            continue
        declare(allow, cid, shushu_unresolved("求财", "male", False, liuqins.get(cid, [])),
                prefix="deep_relations.")
    if allow:
        ap_out = out.with_name("allow_dynamic.json")
        ap_out.write_text(json.dumps(allow, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"已写 {ap_out}（申报偏离 {len(allow)} 条路径）")
    if bad:
        print(f"失败 {len(bad)} 条：")
        for s in bad[:10]:
            print("  " + s)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

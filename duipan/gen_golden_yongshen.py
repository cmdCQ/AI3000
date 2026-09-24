# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：六爻**用神层**（层 6b —— 事项/性别/代占 覆盖）。

层 6a（`golden_dynamic.json` 里的 `yong_yuan_ji_chou` / `key_lines` / `summary` /
`fu_shen` / `shi_shen`）的 topic 恒为「求财」，只验了 14 个事项里的 1 个，
且 `fu_shen` 的用神六亲恒为妻财。本层补上事项维度的覆盖：
**64 卦 × 6 个事项（含性别区分与无伏神事项）**，走真实 divine 管线。

选这 6 个事项的理由（覆盖而非凑数）：
  · 求财     (male)  用神=妻财，有伏神
  · 求官仕途 (male)  用神=官鬼，有伏神
  · 婚姻感情 (female) 性别覆盖 → 用神=官鬼（男占是妻财，同卦不同用神）
  · 求医疾病 (male)  用神=**世爻**（位置名）——shushu 四神恒空，ai3000 侧补全
  · 求子嗣   (female) 性别覆盖 + 用神=子孙（女占次看官鬼）
  · 综合     (male)  用神=世爻，且**不取伏神**（interpreter.py:805 的分支）
  · 天气占候 (male)  在 `_TOPIC_MAP` 里但**不在** `_TOPIC_YONG_SHEN` 里 ——
                     事项定夺走「显式事项认不出→退回关键词」那一支

用法：
    .venv/bin/python gen_golden_yongshen.py [--limit N] [out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from fastapi.testclient import TestClient                                  # noqa: E402
import main as shushu_app                                                   # noqa: E402
from core.calendar.current_moment import current_sizhu                     # noqa: E402
from core.liuyao.hexagram_data import HEXAGRAM_TRIGRAM_MAPPING           # noqa: E402
from allow_yongshen_common import declare, shushu_unresolved            # noqa: E402

TRI_LINES = {
    "乾": "111", "兑": "110", "离": "101", "震": "100",
    "巽": "011", "坎": "010", "艮": "001", "坤": "000",
}
TRI_NUM = {"乾": 1, "兑": 2, "离": 3, "震": 4, "巽": 5, "坎": 6, "艮": 7, "坤": 8}

QT = "2026-09-10T08:00:00"      # 白露后（金月），与 golden_dynamic 的 T4 同

# (事项, 性别, 代占) —— 每项都要在 README 里写明它覆盖了哪条分支
TOPICS = [
    ("求财",     "male",   False),
    ("求官仕途", "male",   False),
    ("婚姻感情", "female", False),
    ("求医疾病", "male",   False),
    ("求子嗣",   "female", False),
    ("综合",     "male",   False),
    ("天气占候", "male",   False),
]


def lines_of(num: int) -> str:
    lo, up = HEXAGRAM_TRIGRAM_MAPPING[num]
    return TRI_LINES[lo] + TRI_LINES[up]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(Path(__file__).with_name("golden_yongshen.json")))
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    client = TestClient(shushu_app.app)
    cases = []
    for topic, gender, proxy in TOPICS:
        for num in range(1, 65):
            cases.append((f"{topic}-{gender}-{'proxy' if proxy else 'self'}-{num}",
                          num, topic, gender, proxy))
    if args.limit:
        cases = cases[: args.limit]
    print(f"样例 {len(cases)} 条，开始跑 shushu divine 管线 …", flush=True)

    sz = current_sizhu(datetime.fromisoformat(QT))
    sizhu = {k: sz[k] for k in ("year_gz", "month_gz", "day_gz", "hour_gz")}
    golden, bad, allow, liuqins = {}, [], {}, {}

    for i, (cid, num, topic, gender, proxy) in enumerate(cases):
        lo_n, up_n = HEXAGRAM_TRIGRAM_MAPPING[num]
        s = lines_of(num)
        yv = [7 if ch == "1" else 8 for ch in s]          # 全静
        r = client.post("/api/v1/liuyao/divine", json={
            "method": "manual", "yao_values": yv, "question": topic,
            "topic": topic, "gender": gender, "is_proxy": proxy, "query_time": QT,
        })
        if r.status_code != 200:
            bad.append(f"{cid}: HTTP {r.status_code}")
            continue
        d = r.json().get("data") or {}
        if not d.get("yaos"):
            bad.append(f"{cid}: 无 yaos")
            continue
        dr = d.get("deep_relations") or {}
        liuqins[cid] = [y.get("liu_qin", "") for y in d["yaos"]]
        golden[cid] = {
            "case": cid,
            "sizhu": sizhu,
            "ben": {"upper": TRI_NUM[up_n], "lower": TRI_NUM[lo_n]},
            "topic": topic, "gender": gender, "is_proxy": proxy,
            # 事项定夺结果（shushu interpret 里 explicit_topic/question 的优先级）
            "resolved_topic": d.get("topic"),
            # 卦名不导出：对拍铁律 2「身份用上下卦号，不用卦名」。
            # shushu 存文王卦序单名（乾/屯/…），ai3000 存「象前缀 + 单名」全名。
            "palace_trigram": d["palace_trigram"],
            "world_line": d["world_line"],
            "application_line": d["application_line"],
            # 用神层三块（用神相关）
            "yong_yuan_ji_chou": dr.get("yong_yuan_ji_chou", {}),
            "summary": dr.get("summary", []),
            "key_lines": {
                k: [
                    {"position": l.get("position"),
                     "liu_qin": l.get("liu_qin", ""),
                     "branch": l.get("branch", "")}
                    for l in v
                ]
                for k, v in (dr.get("key_lines") or {}).items()
            },
            "fu_shen": d.get("fu_shen"),
            "shi_shen": d.get("shi_shen"),
        }
        if (i + 1) % 64 == 0:
            print(f"  … {i + 1}/{len(cases)}", flush=True)

    out = Path(args.out)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已写 {out}（{len(golden)} 条）")

    # 申报偏差：判据是「shushu 按它的取法**注定**取不到用神五行」（见 common 模块），
    # 不是「跑出来有差异」——后者会把白名单养成藏 bug 的黑洞。
    for cid, num, topic, gender, proxy in cases:
        if cid not in golden:
            continue
        declare(allow, cid, shushu_unresolved(topic, gender, proxy, liuqins.get(cid, [])))
    if allow:
        ap_out = out.with_name("allow_yongshen.json")
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

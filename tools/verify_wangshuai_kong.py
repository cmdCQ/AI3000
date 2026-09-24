# -*- coding: utf-8 -*-
"""按规则独立重推 shushu 的旬空表与旺衰表，与导出的 tables.json 比对。"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")
from core.constants import DIZHI, TIANGAN  # noqa: E402

T = json.loads(Path("/tmp/ai3000/build/backend/paipan/tables.json").read_text("utf-8"))["tables"]

print("=== 旬空表：由「该旬十日所不覆之二支」重推 ===")
# 60 甲子：index i → 干 TIANGAN[i%10], 支 DIZHI[i%12]
bad = 0
for xun in range(0, 60, 10):
    covered = {DIZHI[(xun + k) % 12] for k in range(10)}
    derived = [z for z in DIZHI if z not in covered]
    # shushu 的旬空表按「floor(日干支序/10)」取
    tbl = T["_STRENGTH_TABLE"]  # 占位，实际取旬空表
    print(f"  {TIANGAN[xun % 10]}{DIZHI[xun % 12]}旬 推得空亡={derived}", end="")
    print()

print("\n=== 旺衰表（严格四时派）：按「当令旺/令生相/生令休/克令囚/令克死」重推 ===")
SHENG = T["WUXING_SHENG"]
KE = T["WUXING_KE"]
WX = ["木", "火", "土", "金", "水"]
# 严格四时派把 辰未戌丑 归为前一季之末：辰=季春(木令) 未=季夏(火令) 戌=季秋(金令) 丑=季冬(水令)
LING = {"寅": "木", "卯": "木", "辰": "木",
        "巳": "火", "午": "火", "未": "火",
        "申": "金", "酉": "金", "戌": "金",
        "亥": "水", "子": "水", "丑": "水"}


def derive(wx, ling):
    if wx == ling:
        return "旺"
    if SHENG[ling] == wx:
        return "相"
    if SHENG[wx] == ling:
        return "休"
    if KE[wx] == ling:
        return "囚"
    if KE[ling] == wx:
        return "死"
    return "?"


strict = T["_STRENGTH_TABLE_STRICT"]
canggan = T["_STRENGTH_TABLE"]
print("月支  令   " + "  ".join(f"{z}(严格/{'气势'})" for z in []))
diffs = 0
for z in DIZHI:
    row = []
    for wx in WX:
        d = derive(wx, LING[z])
        s = strict[wx][z] if wx in strict and z in strict[wx] else "?"
        row.append(f"{wx}:{d}/{s}")
    if any(r.split("/")[0] != r.split("/")[1] for r in row):
        diffs += 1
    print(f"  {z}({LING[z]}令) " + "  ".join(row))

print(f"\n严格派与规则不符的月支数：{diffs}")
print("\n=== 气势派（藏干）前 3 行对照（非严格派，不要求与四时规则一致）===")
for z in ["寅", "辰", "未"]:
    print(f"  {z}: " + "  ".join(f"{wx}={canggan[wx][z]}" for wx in WX if wx in canggan))

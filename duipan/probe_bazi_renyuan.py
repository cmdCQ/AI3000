#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
人元司令分野：shushu 用「公历日号」，古法用「交节起第几天」—— 差多少、错多少？

为什么量而不是讲：`chart.py:_get_renyuan_siling` 拿 `day`（**公历日号**）去比藏干的分野
天数（寅月「丙 1-7、甲 8-14、戊 15-30」）。分野本意是**从交节当天算起的第几天**。
交节一般落在 3~8 号，于是公历日号与「交节起第几天」整体错开几天，交节靠月末时错得最多。
但我不能断言「所以司令取错了」—— 得数出**有多少天真的取到了另一个干**。

用法：cd shushu && .venv/bin/python ../ai3000/duipan/probe_bazi_renyuan.py
"""

import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shushu"))

from lunar_python import Solar                                 # noqa: E402
from core.bazi import chart as bc                              # noqa: E402
from core.constants import TIANGAN_WUXING                      # noqa: E402

SILING = {                                                     # 与 shushu 同表（照抄自 chart.py）
    "寅": [("丙", 7), ("甲", 14), ("戊", 30)],
    "卯": [("甲", 10), ("乙", 30)],
    "辰": [("乙", 9), ("癸", 12), ("戊", 30)],
    "巳": [("戊", 7), ("庚", 14), ("丙", 30)],
    "午": [("丙", 10), ("己", 11), ("丁", 30)],
    "未": [("丁", 9), ("乙", 12), ("己", 30)],
    "申": [("戊", 7), ("壬", 14), ("庚", 30)],
    "酉": [("庚", 10), ("辛", 30)],
    "戌": [("辛", 9), ("丁", 12), ("戊", 30)],
    "亥": [("戊", 7), ("甲", 14), ("壬", 30)],
    "子": [("壬", 10), ("癸", 30)],
    "丑": [("癸", 9), ("辛", 12), ("己", 30)],
}


def commander(month_zhi, n):
    """按分野第 n 天取司令干（n 从 1 起）。"""
    for gan, end in SILING.get(month_zhi, []):
        if n <= end:
            return gan
    return ""


def jie_datetimes(year):
    table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable()
    out = {}
    for name in ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
                 "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]:
        s = table.get(name)
        if s:
            out[name] = datetime.strptime(s.toYmdHms(), "%Y-%m-%d %H:%M:%S")
    return out


def main():
    print("月支  天数  公历日号 vs 交节起第几天：偏移(天) 取干不同的天数")
    tot_days = 0
    tot_wrong = 0
    tot_off = []
    for year in (2025, 2026):
        for name, jie in jie_datetimes(year).items():
            # 该节起、下一个节止，逐日走
            nxt = min((j for j in jie_datetimes(year).values() if j > jie), default=None)
            if not nxt:
                continue
            d = jie.date()
            while d < nxt.date():
                # shushu 实际给的
                c = bc.build_chart(d.year, d.month, d.day, 12, 0)
                mz = c["month_pillar"]["dizhi"]
                shushu_cmd = c["renyuan_siling"]["commander"]
                # 古法：交节起第几天
                since = (d - jie.date()).days + 1
                off = since - d.day
                right = commander(mz, since)
                tot_days += 1
                tot_off.append(off)
                if shushu_cmd != right:
                    tot_wrong += 1
                    if tot_wrong <= 12:
                        print(f"  {mz}  {d}  交节起第{since}天(公历{d.day}号,偏移{off:+d})  "
                              f"shushu取「{shushu_cmd}」 古法应取「{right}」")
                d += timedelta(days=1)
    print(f"\n共 {tot_days} 天：偏移 {min(tot_off):+d}~{max(tot_off):+d} 天；"
          f"**司令取错 {tot_wrong} 天（{tot_wrong/tot_days*100:.0f}%）**")
    print("→ 若取错比例可观：这是 shushu 侧真缺陷（分野基准用错），"
          "移植时先照搬以求对拍字面一致，再报给用户决定是否在 shushu 本体修。")


if __name__ == "__main__":
    main()

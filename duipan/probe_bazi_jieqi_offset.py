#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
shushu 八字的交节时刻与本项目历法层（lunar_python 的节气表）差多少？

为什么非量不可：换月/换年都在交节那一刻，两侧若用的**节气源不同**，就会在每个交节
前后各差几分钟。这几分钟里算出来的月柱（乃至年柱）是另一个 —— 对拍时会把它们记成
「差异」，但根子不在排盘逻辑，而在**历书来源**。先知道窗口有多宽，才知道该怎么申报。

做法：对每个节，从「明确在节前」到「明确在节后」逐分钟问 shushu 八字，找出它**切换
的那一分钟**，与 lunar_python 节气表给的时刻比。逐分钟问是因为 shushu 内部用的是
lunarcalendar/`ephem`（见 core/calendar/solar_terms.py），与 lunar_python 不是同一本书。

用法：$PY duipan/probe_bazi_jieqi_offset.py
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shushu"))

from lunar_python import Solar                        # noqa: E402
from core.bazi import chart as bchart                 # noqa: E402

JIE = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑",
       "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]


def month_zhi(dt):
    c = bchart.build_chart(dt.year, dt.month, dt.day, dt.hour, dt.minute)
    return c["month_pillar"]["dizhi"]


def switch_minute(t0, before, after, span_min=12):
    """在 [t0-span, t0+span] 里逐分钟找 month_zhi 从 before 变成 after 的那一分钟。"""
    for k in range(-span_min, span_min + 1):
        t = t0 + timedelta(minutes=k)
        if month_zhi(t) == after:
            return t, k
    return None, None


def main():
    print("节            历书(lunar_python)       shushu八字切换于           差")
    worst = 0
    for year in (2025, 2026):
        table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable()
        for name in JIE:
            s = table.get(name)
            if s is None:
                continue
            lib = datetime.strptime(s.toYmdHms(), "%Y-%m-%d %H:%M:%S")
            before = month_zhi(lib - timedelta(minutes=13))
            after = month_zhi(lib + timedelta(minutes=13))
            if before == after:
                print(f"{name}({year})  月支前后相同（{before}）—— 该节不换月支，跳过")
                continue
            sw, k = switch_minute(lib, before, after)
            if sw is None:
                print(f"{name}({year})  没找到切换点（13 分钟内）")
                continue
            # 差 = shushu 切换时刻 − 历书时刻（负=提前换）
            delta = (sw - lib).total_seconds() / 60.0
            worst = max(worst, abs(delta))
            print(f"{name}({year})  {lib:%Y-%m-%d %H:%M}      {sw:%Y-%m-%d %H:%M}  "
                  f"{delta:+.0f} 分")
    print(f"\n最大偏差 {worst:.0f} 分钟。")
    print("→ 若偏差达到分钟级：两侧不是同一本历书，交节前后这几分钟必须**按来源**申报，"
          "不能当成排盘逻辑的差异去改。")


if __name__ == "__main__":
    main()

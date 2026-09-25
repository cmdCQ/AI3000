#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
八字口径真值探针：把**三套**四柱实现放在同一批边界时刻上比。

为什么单独有这一步（而不是直接开始移植）：八字这条线在项目里有**三套**历法：
  ① `core/bazi/chart.py`（shushu 八字，自带一套：`_day_index` 纯日期推算 + `hour_to_dizhi`）
  ② `core/calendar/current_moment.py`（shushu 的 current_sizhu，六爻/梅花对拍用的那个）
  ③ `paipan/ganzhi.js`（本项目已下沉的历法层，*Exact 口径）
外加 ai3000 老的 `auth-server.calcBazi`。**不先钉死用哪套就往 Node 里搬排盘层，
等于把口径分歧固化进新代码**（六爻那层就是这么吃过亏的）。

已知（读码得到，本脚本负责实测确认）：
  · shushu 八字的年/月 = **精确交节时刻**（`dt >= jie_dt`）
  · shushu 八字的日/时 = **完全不换日**（`_day_index(dt.date())`；`hour_to_dizhi` 把 0 和 23 都算子）
  · `ganzhi.js` 日柱走 `getDayInGanZhiExact()` = **晚子时换日**

用法（用 shushu 的 venv）：
    PY=/home/cqsomt/Projects/shushu/.venv/bin/python
    $PY duipan/gen_bazi_sizhu_probe.py > duipan/bazi_sizhu_boundary.json

输出看的是「三套口径在边界时刻上怎么分家」。**它不是对拍脚本**，只用来定口径；
口径落地后的正式对拍在 `diff_bazi_chart.py`（`run_js_bazi.js` 出品），
那里的交节/晚子时差异按**来源**分桶申报，覆盖 1214 例而非这里的几十个点。
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shushu"))

from lunar_python import Solar                      # noqa: E402
from core.bazi import chart as bchart               # noqa: E402
from core.calendar.current_moment import current_sizhu   # noqa: E402

PAD = lambda n: f"{n:02d}"                          # noqa: E731


def jie_datetimes(year: int):
    """十二节的交节时刻，从库里取（不抄常数）。"""
    table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable()
    out = {}
    for name in ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露",
                 "寒露", "立冬", "大雪", "小寒"]:
        s = table.get(name)
        if s is None:
            continue
        out[name] = datetime.strptime(s.toYmdHms(), "%Y-%m-%d %H:%M:%S")
    return out


def moments():
    """要试的时刻：交节时刻 ±1分/±60分、晚子时与早子时、平日对照。"""
    out = []
    for year in (2025, 2026):
        for name, t in jie_datetimes(year).items():
            for dm in (-60, -1, 0, 1, 60):
                u = t + timedelta(minutes=dm)
                out.append((u, f"{name}{dm:+d}分"))
    for y, mo, d in [(2026, 3, 17), (2026, 6, 5), (2026, 12, 31), (1990, 7, 7)]:
        for h, mi in [(12, 0), (22, 59), (23, 0), (23, 30), (23, 59)]:
            out.append((datetime(y, mo, d, h, mi), "子时边界" if h >= 22 else "平日"))
        out.append((datetime(y, mo, d, 0, 30), "早子时"))
    return out


def main():
    rows = []
    for dt, tag in moments():
        # ① shushu 八字（不经 API，直调，避免 TestClient 开销）
        c = bchart.build_chart(dt.year, dt.month, dt.day, dt.hour, dt.minute)
        shushu_bazi = " ".join(
            c[k]["tiangan"] + c[k]["dizhi"]
            for k in ("year_pillar", "month_pillar", "day_pillar", "hour_pillar")
        )
        # ② shushu current_sizhu（六爻/梅花对拍的那个口径）
        s = current_sizhu(dt)
        cur = " ".join([s["year_gz"], s["month_gz"], s["day_gz"], s["hour_gz"]])
        rows.append({
            "at": f"{dt.year}-{PAD(dt.month)}-{PAD(dt.day)} {PAD(dt.hour)}:{PAD(dt.minute)}",
            "tag": tag,
            "shushu_bazi": shushu_bazi,
            "shushu_current": cur,
        })
    json.dump({"cases": rows}, sys.stdout, ensure_ascii=False, indent=1)
    print()


if __name__ == "__main__":
    main()

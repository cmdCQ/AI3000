# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**历法层**（四柱 + 时辰 + 节气）。

金标准 = shushu `core/calendar/current_moment.py::current_sizhu`（底层 lunar_python）。

**本层含一处「已拍板偏离」**：用户 2026-09-24 决定 **晚子时（23:00–23:59）日柱进位**，
shushu 不进位。故 h>=23 的样例里 `day_gz` / `day_gan` 两侧必然不同，
派生字段 `day_gan_wuxing` 亦然——这些路径由本脚本**按规则算出来**
写进 allow_calendar.json（附理由），不靠人手工维护，也不会掩盖其它字段的漂移。

为什么该偏离是「事实」而非偏好：实测 2026-05-10 23:00，shushu 给 日=甲申 而 时=丙子，
而丙子只可能由乙日推出（乙庚丙作初）——`getTimeInGanZhi()` 内部本就基于**已进位**的
日干，故 shushu 的日柱与时柱在晚子时自相矛盾。改用 getDayInGanZhiExact() 即自洽。

用法：.venv/bin/python gen_golden_calendar.py [--limit N] [out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from lunar_python import Solar                                          # noqa: E402
from core.calendar.current_moment import current_sizhu                  # noqa: E402

FIELDS = ("datetime", "year_gz", "month_gz", "day_gz", "hour_gz", "hour_zhi",
          "hour_name", "hour_wuxing", "day_gan", "day_gan_wuxing",
          "solar_term", "seasonal_wx")
YEAR_LO, YEAR_HI = 2025, 2026
SWEEP_HOURS = (0, 1, 6, 12, 18, 22, 23)


def jieqi_times():
    """2025–2026 全部节气时刻（含节与气）。"""
    out = []
    seen = set()
    for y in (YEAR_LO - 1, YEAR_HI):
        for m in range(1, 13):
            try:
                tbl = Solar.fromYmd(y, m, 15).getLunar().getJieQiTable()
            except Exception:
                continue
            for name, sol in tbl.items():
                if not name or name.endswith("后") or "DA" in name:
                    continue
                key = (name, sol.getYear(), sol.getMonth(), sol.getDay(),
                       sol.getHour(), sol.getMinute())
                if key in seen:
                    continue
                seen.add(key)
                out.append((name, datetime(sol.getYear(), sol.getMonth(), sol.getDay(),
                                           sol.getHour(), sol.getMinute())))
    return sorted(set(out), key=lambda x: x[1])


def build_cases():
    cases = []
    d = datetime(YEAR_LO, 1, 1, 0, 0)
    end = datetime(YEAR_HI, 12, 31, 23, 59)
    while d <= end:
        for h in SWEEP_HOURS:
            cases.append(d.replace(hour=h, minute=0))
        d += timedelta(days=1)
    # 节气前后 ±2 小时，10 分钟一档 —— 抓换月的那一分钟
    for _name, t in jieqi_times():
        if not (YEAR_LO <= t.year <= YEAR_HI):
            continue
        for off in range(-120, 121, 10):
            cases.append(t + timedelta(minutes=off))
    # 去重保序
    out, seen = [], set()
    for c in cases:
        k = c.strftime("%Y-%m-%dT%H:%M")
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(Path(__file__).with_name("golden_calendar.json")))
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    cases = build_cases()
    if args.limit:
        cases = cases[: args.limit]
    print(f"样例 {len(cases)} 条 …", flush=True)

    golden, allow = {}, {}
    for i, t in enumerate(cases):
        cid = t.strftime("%Y-%m-%dT%H:%M")
        s = current_sizhu(t)
        golden[cid] = {k: s.get(k, "") for k in FIELDS}
        # 已拍板偏离：晚子时日柱进位 → day_gz / day_gan 两侧必异。
        # day_gan_wuxing 是**派生字段**：日干进位一位，五行只在半数情形下变
        # （甲乙同木、丙丁同火…），故它必然同源、只是不全数触发——一并申报，
        # 否则 ~382 条纯派生的差异会被当成真问题（首次跑就是这么被误报的）。
        if t.hour >= 23:
            allow[f"{cid}.day_gz"] = "晚子时(23:00-23:59)日柱进位——用户 2026-09-24 拍板，不跟 shushu"
            allow[f"{cid}.day_gan"] = "同上（日干随日柱进位）"
            allow[f"{cid}.day_gan_wuxing"] = "同上（日干五行为日干的派生字段）"
        if (i + 1) % 2000 == 0:
            print(f"  … {i + 1}/{len(cases)}", flush=True)

    out = Path(args.out)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    ap_out = out.with_name("allow_calendar.json")
    ap_out.write_text(json.dumps(allow, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已写 {out}（{len(golden)} 条）")
    print(f"已写 {ap_out}（申报偏离 {len(allow)} 条路径）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

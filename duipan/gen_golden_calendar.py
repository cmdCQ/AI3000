# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**历法层**（四柱 + 时辰 + 节气）。

金标准 = shushu `core/calendar/current_moment.py::current_sizhu`（底层 lunar_python）。

**本层含两处「已拍板偏离」**（都由本脚本**按规则算出来**写进
allow_calendar.json，附理由，不靠人手工维护，也不会掩盖其它字段的漂移）：

① **晚子时（23:00–23:59）日柱进位**（用户 2026-09-24 拍板，shushu 不进位）：
   h>=23 的样例里 `day_gz` / `day_gan` 必然不同，派生字段 `day_gan_wuxing` 亦然
   （五行只在半数情形下变，故不全数触发——一并申报）。
   该偏离是「事实」而非偏好：实测 2026-05-10 23:00，shushu 给 日=甲申 而 时=丙子，
   而丙子只可能由乙日推出（乙庚丙作初）——`getTimeInGanZhi()` 内部本就基于**已进位**的
   日干，故 shushu 的日柱与时柱在晚子时自相矛盾。改用 getDayInGanZhiExact() 即自洽。

② **立春/交节换年换月取「刻」不取「日」**（2026-09-25 定，shushu 用日粒度）：
   shushu 用 `getYearInGanZhiByLiChun()` / `getMonthInGanZhi()`（**整个「日」**就算作
   新年/新月），本项目用同库的 `*Exact()`（精确到分）。两版相差的恰是每个分界日的
   「分界时刻之前」那一段：实测 2024–2026 逐小时扫 26352 小时，**月柱差 505 小时
   （1.9%）**，**全部**落在交节当日、交节时刻之前；年柱同理落在立春当日之前。
   该偏离是「事实」：月建随**交节时刻**换（万年历把交节时刻精确到分印出来就是为此），
   且与库内另一条互不相干的路径（`getJieQiTable()` 十二「节」时刻表，与官方
   《天文年历》一致）在 8 个交节日 ±4 小时每 5 分钟共 776 点**零不一致**。
   旁证：shushu 自己也有两种月支——`solar_terms.get_month_dizhi_at` 是交节**时刻**口径
   （docstring 明写 "which Jié boundary has most recently passed"），`current_sizhu`
   是日粒度。详见 `paipan/ganzhi.js` 头注②。

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
from lunar_python.util import LunarUtil                                 # noqa: E402
from core.calendar.current_moment import current_sizhu                  # noqa: E402
from core.constants import DIZHI_WUXING as _ZHI_WX, TIANGAN_WUXING as _GAN_WX  # noqa: E402

_JIAZI = {gz: i for i, gz in enumerate(LunarUtil.JIA_ZI)}

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
        # 已拍板偏离①：晚子时日柱进位 → day_gz / day_gan 两侧必异。
        if t.hour >= 23:
            allow[f"{cid}.day_gz"] = "晚子时(23:00-23:59)日柱进位——用户 2026-09-24 拍板，不跟 shushu"
            allow[f"{cid}.day_gan"] = "同上（日干随日柱进位）"
            # `day_gan_wuxing` 是**派生**字段：日干进位一位，五行只在半数情形下变
            # （甲乙同木、丙丁同火…）。故**只申报真的变了**的那些 ——
            # 判据只看金标准自己的日柱与干支/五行表（进位一格取下一干支），
            # 不看被验方输出。曾按 h>=23 全量申报，`coverage_calendar.py` 的
            # 「申报的每格必须真的不同」当场查出 488 格是白送的（申报了两侧相同的
            # 格子＝白白放弃一格验证）。
            nxt = LunarUtil.JIA_ZI[(_JIAZI[s["day_gz"]] + 1) % 60]
            if _GAN_WX.get(nxt[0]) != _GAN_WX.get(s["day_gz"][0]):
                allow[f"{cid}.day_gan_wuxing"] = "同上（日干五行为日干的派生字段）"

        # 已拍板偏离②：分界取「刻」不取「日」。判据独立于实跑差异 ——
        # 直接问历法库「日粒度与精确版是否不同」，不同才申报；
        # 派生字段再问一次「五行是否真的变了」。两处都**只申报真的不同的格子**，
        # 不撒胡椒面（`coverage_calendar.py` 会逐格核验这一点）。
        lun = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar()
        old_m, new_m = lun.getMonthInGanZhi(), lun.getMonthInGanZhiExact()
        if old_m != new_m:
            allow[f"{cid}.month_gz"] = (
                "交节**时刻**换月建（精确到分）——shushu current_sizhu 用日粒度 "
                "getMonthInGanZhi()（交节当日整天算新月），实测两者仅在交节当日、"
                "交节时刻之前不同。详见 ganzhi.js 头注②")
            # `seasonal_wx` 同样是**派生**字段：月支换而五行不变的月份不少
            # （寅→卯同为木、巳→午同为火、申→酉同为金、亥→子同为水），
            # 故只申报真的变了五行的那些（理由同上）。
            if _ZHI_WX.get(old_m[1]) != _ZHI_WX.get(new_m[1]):
                allow[f"{cid}.seasonal_wx"] = "同上（当令五行为月支的派生字段）"
        if lun.getYearInGanZhiByLiChun() != lun.getYearInGanZhiExact():
            allow[f"{cid}.year_gz"] = (
                "立春**时刻**换年柱（精确到分）——shushu current_sizhu 用日粒度 "
                "getYearInGanZhiByLiChun()。理由同 month_gz")
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

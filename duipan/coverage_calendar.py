# -*- coding: utf-8 -*-
"""对拍 · **覆盖度断言**（层 3：历法）。

本层的申报表是**按规则算出来的**（`gen_golden_calendar.py` 里两条偏离规则），
这带来一个别处没有的风险：**撒胡椒面式申报** —— 申报一大堆其实两侧一致的字段，
把它们从验证里悄悄拿掉，看着「0 未申报」其实什么都没验。
（这不是假想：首版把派生字段 `day_gan_wuxing` 按 `h>=23` **全量**申报，
本脚本当场查出其中 **488 格两侧其实完全相同**。）

三条检查，互不构成循环论证：

  ① **上界**：申报集必须落在两条偏离规则的作用域内
     （`h>=23` / 日粒度与精确版不同）。这挡的是「申报了一个跟这两条规则
     毫无关系的字段」——那说明有人拿白名单去盖真 bug。
  ② **紧**：申报集 ≡ **实测差异集**（逐字段比金标准与被验方算出，不看规则）。
     两个方向都要满足：多了 = 白送一格验证，少了 = 漏报（diff.py 也会红）。
  ③ **分支**：十二「节」的交节时刻**前后各 10 分钟**都必须有样例，且必须呈现
     「前 10 分钟两侧不同、后 10 分钟两侧相同」—— 这正是本层要拍的东西。
     少了这条，286 处月柱差异可能只是碰巧落在别处，而不是真的卡在分界上。

① 只给上界、② 独立实测 —— 两者合起来才锁死，任何一条单独都能被绕过。

**须用 shushu 的 venv python 跑**（要 import lunar_python 复算规则）：
    /home/cqsomt/Projects/shushu/.venv/bin/python coverage_calendar.py

前置：gen_golden_calendar.py → run_js_calendar.js（gen 顺带重写 allow_calendar.json）。
退出码：0 = 全部满足；1 = 有断言不满足（对拍结果不可信）。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from lunar_python import Solar                                          # noqa: E402
from gen_golden_calendar import YEAR_HI, YEAR_LO, jieqi_times           # noqa: E402

JIE = {"小寒", "立春", "惊蛰", "清明", "立夏", "芒种",
       "小暑", "立秋", "白露", "寒露", "立冬", "大雪"}


def load(name):
    p = HERE / name
    if not p.exists():
        print(f"缺 {name} —— 先跑对应的 gen/run（见 README「用法」）。")
        sys.exit(2)
    return json.loads(p.read_text("utf-8"))


def parse(cid: str) -> datetime:
    return datetime.strptime(cid, "%Y-%m-%dT%H:%M")


def pick(cid: str, path: str):
    """取 `<cid>.<字段>` 的值。本层路径只有一层，故直接取。"""
    return load_cache[cid].get(path.split(".", 1)[1])


def rule_upper_bound() -> set:
    """两条偏离规则的**作用域**（上界，不是精确集）。

    判据只问历法库「日粒度与精确版是否不同」与「h>=23 吗」，不看实跑差异。
    精确到「哪几格真的变了」是 ② 的事（实测），这里只划边界。
    """
    out = set()
    for cid in load_cache:
        t = parse(cid)
        lun = Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0).getLunar()
        if t.hour >= 23:
            out |= {f"{cid}.day_gz", f"{cid}.day_gan", f"{cid}.day_gan_wuxing"}
        if lun.getMonthInGanZhi() != lun.getMonthInGanZhiExact():
            out |= {f"{cid}.month_gz", f"{cid}.seasonal_wx"}
        if lun.getYearInGanZhiByLiChun() != lun.getYearInGanZhiExact():
            out.add(f"{cid}.year_gz")
    return out


def main() -> int:
    global load_cache
    load_cache = load("golden_calendar.json")
    js = load("js_calendar.json")
    allow = load("allow_calendar.json")
    fails: list = []

    def check(label, ok, detail):
        print(f"  {'✅' if ok else '❌'} {label}：{detail}")
        if not ok:
            fails.append(label)

    print(f"层 3（历法）：金标准 {len(load_cache)} 条、被验方 {len(js)} 条、"
          f"申报 {len(allow)} 条路径")

    # ══ ① 上界：申报不许跑到两条规则的作用域之外 ═══════════════
    print("① 上界：申报集落在两条偏离规则的作用域内")
    check("两侧样例 id 一致", set(load_cache) == set(js),
          f"仅金标准 {len(set(load_cache) - set(js))} 条，仅被验方 {len(set(js) - set(load_cache))} 条")

    upper = rule_upper_bound()
    outside = set(allow) - upper
    check("无「规则之外」的申报（防拿白名单盖真 bug）", not outside,
          f"{len(outside)} 条越界：{sorted(outside)[:4]}" if outside
          else f"申报 {len(allow)} ⊆ 上界 {len(upper)}")

    # ══ ② 紧：申报集 ≡ 实测差异集（逐字段比，不看规则）═════════
    print("② 紧：申报集 ≡ 实测差异集（多了＝白送一格，少了＝漏报）")
    actual = set()
    for cid, row in load_cache.items():
        for f, v in row.items():
            if js[cid].get(f) != v:
                actual.add(f"{cid}.{f}")
    too_many = sorted(set(allow) - actual)
    too_few = sorted(actual - set(allow))
    check("申报的每格都**真的不同值**", not too_many,
          f"{len(too_many)} 格其实两侧相同：{too_many[:4]}" if too_many
          else f"{len(allow)} 格逐条核过")
    check("实测差异**一格不漏**", not too_few,
          f"{len(too_few)} 格漏报：{too_few[:4]}" if too_few else "无漏报")
    check("每条申报都写明了理由", all(isinstance(v, str) and len(v) >= 8 for v in allow.values()),
          f"最短理由 {min(len(v) for v in allow.values())} 字")

    # ══ ③ 分支覆盖：分界确实卡在时刻上 ═════════════════════════
    print("③ 分支：十二「节」的交节时刻前后各 10 分钟都有样例，且呈现预期形状")
    bad_probe, miss = [], []
    for name, t in jieqi_times():
        if not (YEAR_LO <= t.year <= YEAR_HI) or name not in JIE:
            continue
        before = (t - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M")
        after = (t + timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M")
        if before not in load_cache or after not in load_cache:
            miss.append((name, before in load_cache, after in load_cache))
            continue
        # 交节前 10 分钟：金标准（日粒度）已换月，被验方（精确）仍在上一个月
        if load_cache[before]["month_gz"] == js[before]["month_gz"]:
            bad_probe.append((name, "交节前 10 分钟两侧相同（没卡住分界）"))
        # 交节后 10 分钟：两侧应当一致（改动只在分界之前）
        if load_cache[after]["month_gz"] != js[after]["month_gz"]:
            bad_probe.append((name, "交节后 10 分钟两侧仍不同（改动溢出了分界）"))
        # 立春另验年柱
        if name == "立春" and load_cache[before]["year_gz"] == js[before]["year_gz"]:
            bad_probe.append((name, "立春前 10 分钟年柱两侧相同（没卡住分界）"))
    check("十二节前后各 10 分钟都有样例", not miss, f"缺 {miss}" if miss else "12 节 × 2 点齐全")
    check("分界形状符合预期（前不同、后相同）", not bad_probe,
          f"{bad_probe}" if bad_probe else "12 节全部前/后形状正确")

    # 申报按字段分布：两个偏离各自都真的被触发过
    fld = Counter(k.split(".")[-1] for k in allow)
    for f in ("day_gz", "day_gan", "day_gan_wuxing"):
        check(f"偏离①「晚子时换日」触发过：{f}", fld[f] > 0, f"{fld[f]} 条")
    for f in ("month_gz", "seasonal_wx", "year_gz"):
        check(f"偏离②「分界取刻不取日」触发过：{f}", fld[f] > 0, f"{fld[f]} 条")

    # 晚子时的结构性佐证：日柱差异必是**六十甲子相邻**一位（进位一格），不是乱变
    from lunar_python.util import LunarUtil
    idx = {gz: i for i, gz in enumerate(LunarUtil.JIA_ZI)}
    steps = Counter((idx[js[k.split('.')[0]]["day_gz"]] - idx[load_cache[k.split('.')[0]]["day_gz"]]) % 60
                    for k in allow if k.endswith(".day_gz"))
    check("晚子时日柱差异恒为**相邻一位**（进位一格，非乱变）",
          set(steps) == {1}, f"步长分布 {dict(steps)}")

    # ══ 结论 ═══════════════════════════════════════════════════
    print()
    if fails:
        print(f"⚠ {len(fails)} 项断言不满足：{'；'.join(fails)}")
        print("  对拍全绿也不可信 —— 申报表可能把该验的格子拿掉了。")
        return 1
    print("✅ 覆盖断言全部满足：全绿不是空绿"
          f"（申报 {len(allow)} 条，逐条验过确实不同值）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

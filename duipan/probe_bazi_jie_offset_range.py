#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""量「shushu 十二节表」与「本项目历法层十二节表」在**全样本年份范围**内到底差多少。

为什么要量：八字 3.5.2 的起运岁数 = 出生到所用节的距离 ÷ 3（天）。两侧若历书不同，
岁数就会差 —— 但根子在**历书来源**，不在排盘逻辑。对拍要能把两者分开，就得先知道
「历书差」的**上界**是多少；否则只能写一条「起运允许不同」的申报，那是撒胡椒面。

已有探针 `probe_bazi_jieqi_offset.py` 只覆盖 2025–2026，且走「逐分钟问 shushu 换月」
（每个节约 25 次 `build_chart`）—— 它对**换月柱**是对的，但起运用的是
`nearest_jie()` 直接给出的**节时刻**，与月支切换无关。故本探针直接比两张表的原始时刻，
既更贴题，也便宜得多（每节 1 次查询）。

两侧来源（**必须知道自己在比谁**）：
  shushu    `core/calendar/solar_terms.py::get_jie_dates` —— 走 lunarcalendar/ephem
  本项目    `build/backend/paipan/ganzhi.js::jieDatesOfYear` —— 走 lunar-javascript
                                              （题记：与官方《天文年历》对齐的节气表）

输出的 `max|Δ|` 就是 `diff_bazi_fortune.py` 起运段那条上界的**来源**；
按十年分段打印，因为偏移随年代变（实测 2025–2026 是 4.6–8.2 分钟，1893 年更大）。

用法：
    PY=/home/cqsomt/Projects/shushu/.venv/bin/python
    $PY duipan/probe_bazi_jie_offset_range.py [--from 1890] [--to 2050]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT.parent / "shushu"))

from core.calendar.solar_terms import get_jie_dates   # noqa: E402


def js_table(y0: int, y1: int) -> dict:
    """向 node 要本项目历法层的十二节表 —— 用**被对拍的那份实现**，不另写一份。"""
    js = f"""
const G = require({json.dumps(str(ROOT / 'build/backend/paipan/ganzhi.js'))});
const out = {{}};
for (let y = {y0}; y <= {y1}; y++) {{
  out[y] = {{}};
  for (const j of G.jieDatesOfYear(y)) out[y][j.name] = j.at;
}}
process.stdout.write(JSON.stringify(out));
"""
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"node 取节表失败：{r.stderr.strip()[:500]}")
    return json.loads(r.stdout)


EPOCH = datetime(1970, 1, 1)


def secs_of(s):
    """datetime 或 'YYYY-MM-DD HH:MM:SS' → 相对 1970 的秒数。

    显式用 `(d − EPOCH).total_seconds()` 而**不用 `d.timestamp()`**：后者按本机时区解释
    naive datetime，两侧都带同一偏移虽会抵消，但一旦一侧是 aware 就会错。纯算术，
    与本机 TZ/夏令时无关（与 `bazi_fortune.js::tsOf` 同一口径）。
    """
    d = datetime.strptime(s, "%Y-%m-%d %H:%M:%S") if isinstance(s, str) else s
    if d.tzinfo is not None:
        d = d.replace(tzinfo=None) - d.utcoffset()
    return (d - EPOCH).total_seconds()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="y0", type=int, default=1890)
    ap.add_argument("--to", dest="y1", type=int, default=2050)
    a = ap.parse_args()

    print(f"区间 {a.y0}–{a.y1}（{a.y1 - a.y0 + 1} 年 × 12 节）")
    print("  shushu    = core/calendar/solar_terms.py::get_jie_dates（lunarcalendar/ephem）")
    print(f"  本项目    = build/backend/paipan/ganzhi.js::jieDatesOfYear（lunar-javascript）")
    print()

    jst = js_table(a.y0, a.y1)

    by_decade = defaultdict(list)
    worst = []
    missing = []
    for y in range(a.y0, a.y1 + 1):
        for name, dt in get_jie_dates(y):
            j = jst.get(str(y), {}).get(name)
            if j is None:
                missing.append((y, name))
                continue
            d = secs_of(j) - secs_of(dt)
            by_decade[y // 10 * 10].append(d)
            worst.append((abs(d), y, name, d))

    worst.sort(reverse=True)
    print("偏移（本项目 − shushu，秒；正 = 本项目更晚）")
    print(f"  {'年代':<8}{'例数':>5}{'max|Δ|':>10}{'均值':>10}   （分钟）max|Δ| / 均值")
    tot = []
    for dec in sorted(by_decade):
        v = by_decade[dec]
        tot += v
        mx = max(abs(x) for x in v)
        print(f"  {dec}s{'':<4}{len(v):>5}{mx:>10.0f}{sum(v)/len(v):>10.1f}"
              f"   {mx/60:.1f} / {sum(v)/len(v)/60:+.1f}")

    mx = max(abs(x) for x in tot)
    print()
    print(f"  ── 全区间 max|Δ| = {mx:.0f}s = {mx/60:.1f} 分钟（{len(tot)} 个节例）")
    print("  最偏的 5 例：")
    for ad, y, name, d in worst[:5]:
        print(f"    {y} {name}  Δ={d:+.0f}s（{d/60:+.1f} 分）")
    if missing:
        print(f"  ⚠ 有 {len(missing)} 个节在 JS 表里没配到（例：{missing[:3]}）")


if __name__ == "__main__":
    main()

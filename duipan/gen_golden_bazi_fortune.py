#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**大运/流年/流月/流日/流时**层（八字 3.5.2）——
`core/bazi/forecaster.py`，即 `/api/v1/bazi/fortune` 在**不含 combos 层**时的产出。

产出两个文件，各管一件事：

  `golden_bazi_fortune.json`  端点形状 `{id: {dayun, liunian, liuyue, liuri, liushi}}`
                              —— 与 `get_fortune` 的 `data` 逐键相同，**减去** combos 层
                              后加的 `suiyun`/`liunian_combo`/`combo`（那层归 3.5.3）。
  `golden_bazi_start.json`    起运诊断 `{id: {params, age, raw, forward, jie_name, jie_at}}`
                              —— `raw` 是**未舍入**的岁数，`jie_at` 是 shushu 用的那个节。
                              有它才能把「与 shushu 的岁数差」证明成「恰等于两侧节时刻之差 ÷3」，
                              而不是写一条「start_age 允许不同」的申报（那是撒胡椒面）。

**为什么不走 HTTP 端点**：`get_fortune` 会在 forecaster 之上再挂 combos 层并**回填**
`liunian[*].shishen_zhi`。本阶段要验的是 forecaster 本身，故直调其函数，并按
`api/bazi.py::get_fortune` **逐行照搬参数装配**（`from_yr = query_year or birth.year`、
`to_yr = from_yr + 20`、流月/流日/流时逐级可选）。金标准因此是**更严**的目标：
shushu 原产的 `shishen_zhi` 恒为 `''`（见 `bazi_fortune.js` 头注的缺陷第 1 条），
端点会把它回填掉 —— 直调则保留原样，对拍会**逐例核这个空串**。

**样例集复用 `golden_bazi.json`**（id/input/near_jie），与 3.5.1 两层同一批：
大运/流年的一切都是四柱与旺衰的函数，样例不同就分不清「移植错」还是「样例不同」。
`--stride N` 可按固定步长抽样（产物大小与覆盖的取舍见 README §9）。

用法（须用 shushu 的 venv）：
    PY=/home/cqsomt/Projects/shushu/.venv/bin/python
    $PY gen_golden_bazi_fortune.py [--stride 1]
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "shushu"))

from core.bazi import chart as bchart                                    # noqa: E402
from core.bazi.analyzer import analyze_chart                             # noqa: E402
from core.bazi import forecaster as fc                                   # noqa: E402
from core.calendar.ganzhi import ganzhi_from_index                       # noqa: E402
from core.calendar.solar_terms import nearest_jie, get_jie_dates          # noqa: E402

# 逐条目字段集 —— **用于断言**：shushu 哪天多/少一个键，这里当场炸，
# 不会静默漏掉一个字段（3.5.1 就靠这个抓到漏 import 的 SHENSHA_EXTENDED）。
DAYUN_KEYS = ("index", "tiangan", "dizhi", "start_age", "end_age", "start_year",
              "end_year", "quality", "dm_shishen", "warnings", "auspicious",
              "clash_day_zhi")
LIUNIAN_KEYS = ("year", "tiangan", "dizhi", "age", "shishen_gan", "shishen_zhi",
                "quality", "summary", "warnings", "auspicious", "tags",
                "is_benming_chong")
LIUYUE_KEYS = ("month_num", "tiangan", "dizhi", "shishen_gan", "season_status",
               "quality", "summary")
LIURI_KEYS = ("day", "date", "tiangan", "dizhi", "shishen_gan", "quality")
LIUSHI_KEYS = ("hour_idx", "tiangan", "dizhi", "time_range", "shishen_gan", "quality")
FORTUNE_KEYS = ("dayun", "liunian", "liuyue", "liuri", "liushi")


def plan(k: int, year: int) -> dict:
    """按**抽样后的序号**定确定性参数 —— 两侧共用同一组输入，且覆盖端点「逐级可选」的四条分支。

    variant 0 不给 query_year  ⇒ 流月/流日/流时 三者皆 null
    variant 1 只给 query_year  ⇒ 只有流月
    variant 2 再加 query_month ⇒ 流月 + 流日
    variant 3 三个都给         ⇒ 五者齐全

    ⚠ 入参是**抽样后**的序号，不是源序号。踩过：`stride` 是 4 的倍数时，
    源序号 `% 4` 恒定 ⇒ 样本全落进同一个 variant，流月/流日/流时**一个都没验到**，
    而打印出来只是三行 0，看起来像「本来就没有」。用抽样序号后，各 variant 均匀铺开。
    """
    variant = k % 4
    p = {
        "gender": "male" if k % 2 == 0 else "female",
        "variant": variant,
        "query_year": None if variant == 0 else year + 20 + (k % 11),
        "query_month": 1 + (k % 12),
        "query_day": 1 + (k % 28),
    }
    return p


def check_keys(entries, want, label):
    """逐条目核字段集 —— 少一个（移植漏）或多一个（shushu 加了字段）都要当场炸。"""
    for e in entries:
        got = set(e)
        if got != set(want):
            raise AssertionError(
                f"{label} 字段集不符：多 {sorted(got - set(want))}，缺 {sorted(set(want) - got)}")


def jie_name_of(target) -> str | None:
    """反查节名。`nearest_jie` 只回时刻不回名，而从 `get_jie_dates` 里按时刻配对是确定的
    （同一年的十二节互不相同）。留个名便于对拍失败时一眼看出「选到别的节了」。"""
    if target is None:
        return None
    for y in (target.year - 1, target.year, target.year + 1):
        for name, dt in get_jie_dates(y):
            if dt == target:
                return name
    return None


def start_diag(chart, gender) -> dict:
    """起运诊断。**重算一遍** shushu 的公式（3 行），再用它的 `_dayun_start_age`
    对账 —— 对上了才证明这份诊断与 shushu 同源，可以拿去算残差。

    ⚠⚠ **发布精度必须自洽**（踩过）：shushu 的节时刻**都带亚秒**（实测 48/48），
    而本项目历法层走 lunar-javascript，`toYmdHms()` **只到秒** —— 故 `jie_at` 只能发布到秒。
    那么 `raw` 就必须用**同一个（截到秒的）节时刻**来算；第一版直接拿全精度 `target` 算，
    于是发布出来的 `(jie_at, raw)` 彼此不自洽，对拍残差里永远混着一个
    「被截掉的亚秒 ÷ 3 天」（实测 0.24–0.98s ⇒ 残差 1e-6 ~ 4e-6 年）——
    那既不是移植差异、也不是历书差异，而是**金标准自己没把话说全**。
    全精度那一遍仍然要算，但只用于与 shushu 逐位对账（`assert`），不发布。
    """
    birth_dt = datetime.fromisoformat(chart["birth_dt"])
    year_gan = chart["year_pillar"]["tiangan"]
    forward = fc._dayun_direction(gender, year_gan) == 1
    prev_jie, next_jie = nearest_jie(birth_dt)
    target = next_jie if forward else prev_jie

    if target is None:
        # shushu 的回退分支：没有可用节时按「到月初/下月初」估。此时没有节可发布。
        age = fc._dayun_start_age(birth_dt, gender, year_gan)
        return {"age": age, "raw": None, "forward": forward,
                "jie_name": None, "jie_at": None, "fallback": True}

    # ① 同源对账（全精度）：必须与 shushu 的 `_dayun_start_age` 逐位相同。
    raw_full = abs((target - birth_dt).total_seconds()) / 86400.0 / 3.0
    assert round(raw_full, 2) == fc._dayun_start_age(birth_dt, gender, year_gan), (
        "重算的起运岁数与 shushu `_dayun_start_age` 不一致 —— 这份诊断不可作为金标准")

    # ② 发布值（同粒度）：节时刻截到整秒，与 `jie_at` 一致。
    target_s = target.replace(microsecond=0)
    raw = abs((target_s - birth_dt).total_seconds()) / 86400.0 / 3.0
    return {
        "age": round(raw, 2),
        "raw": raw,
        "forward": forward,
        "jie_name": jie_name_of(target),           # 用全精度对象反查（反查表是同一对象）
        "jie_at": target_s.strftime("%Y-%m-%d %H:%M:%S"),
        "fallback": False,
    }


def build_fortune(chart, gender, birth_year, p) -> dict:
    """逐行照搬 `api/bazi.py::get_fortune` 的参数装配，只去掉 combos 那一层。"""
    dayun = fc.calculate_dayun(chart, gender, birth_year)
    from_yr = p["query_year"] or birth_year
    liunian = fc.calculate_liunian(chart, gender, birth_year, from_yr, from_yr + 20)

    liuyue = liuri = liushi = None
    if p["query_year"]:
        ly_gan, _ = ganzhi_from_index((p["query_year"] - 1984) % 60)
        liuyue = fc.calculate_liuyue(chart, p["query_year"], ly_gan)
        if p["query_month"]:
            liuri = fc.calculate_liuri(chart, p["query_year"], p["query_month"], ly_gan)
            if p["query_day"]:
                liushi = fc.calculate_liushi(chart, p["query_year"], p["query_month"],
                                             p["query_day"])

    check_keys(dayun, DAYUN_KEYS, "dayun")
    check_keys(liunian, LIUNIAN_KEYS, "liunian")
    if liuyue is not None:
        check_keys(liuyue, LIUYUE_KEYS, "liuyue")
    if liuri is not None:
        check_keys(liuri, LIURI_KEYS, "liuri")
    if liushi is not None:
        check_keys(liushi, LIUSHI_KEYS, "liushi")

    return {"dayun": dayun, "liunian": liunian,
            "liuyue": liuyue, "liuri": liuri, "liushi": liushi}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stride", type=int, default=1, help="样例抽样步长（1 = 全取）")
    ap.add_argument("--out-dir", default=str(HERE))
    a = ap.parse_args()

    src = json.loads((HERE / "golden_bazi.json").read_text(encoding="utf-8"))["cases"]
    # 用序号配对，不用 `list.index`（那是 O(n²) 的字典深比较，且语义上也不必）。
    picked = [(k, c) for k, c in enumerate(src) if k % a.stride == 0]

    fortune, starts = {}, {}
    for pick_idx, (_, c) in enumerate(picked):
        i = c["input"]
        p = plan(pick_idx, i["year"])

        # 真太阳时样例（城市/经度）：3.5.1a 已明确**未纳入**，本层同样不纳入 ——
        # 但照旧携带 id/near_jie 让它进桶，由分桶脚本自己计数，不静默消失。
        kw = {}
        if i.get("city"):
            kw["city"] = i["city"]
        if i.get("longitude") is not None:
            kw["longitude"] = i["longitude"]
        chart = bchart.build_chart(i["year"], i["month"], i["day"],
                                   i["hour"], i["minute"], **kw)
        analyze_chart(chart)

        fortune[c["id"]] = build_fortune(chart, p["gender"], i["year"], p)
        starts[c["id"]] = {"params": p, **start_diag(chart, p["gender"])}

    out = Path(a.out_dir)
    (out / "golden_bazi_fortune.json").write_text(
        json.dumps(fortune, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "golden_bazi_start.json").write_text(
        json.dumps(starts, ensure_ascii=False, indent=1), encoding="utf-8")

    # 落地自查：样例集必须与 golden_bazi.json 的 id 集合一致（错位就是「样例不同」，
    # 那会让后面的差异无法归因）。抽样模式下按抽样后的集合核。
    want_ids = {c["id"] for _, c in picked}
    assert set(fortune) == want_ids and set(starts) == want_ids, "id 集合与样例集不符"
    assert set(picked[0][1]) >= {"id", "input"}, "样例缺 id/input"

    n_ly = sum(1 for f in fortune.values() if f["liuyue"] is not None)
    n_lr = sum(1 for f in fortune.values() if f["liuri"] is not None)
    n_ls = sum(1 for f in fortune.values() if f["liushi"] is not None)
    print(f"✓ {len(picked)} 例（stride={a.stride}，源 {len(src)} 例）")
    print(f"  流月 {n_ly} / 流日 {n_lr} / 流时 {n_ls}（其余为端点「未给 query_*」的 null 分支）")
    print(f"  字段：{' '.join(FORTUNE_KEYS)}  + start{{params,age,raw,forward,jie_name,jie_at}}")


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**梅花层**（起卦 + 断卦），即移植到
`build/backend/paipan/meihua.js` 的那一块。

金标准走**真实 API**（`POST /api/v1/meihua/divine`，TestClient 直连不起服务），
不旁路调内部函数 —— 免得金标准与线上产物脱节。两处例外，都在 id 上标出来：

* `core:` 前缀 —— 走 `divine()` 直调。原因：这些用例要注入 API 不暴露的参数
  （`dt`，用于把「自动取月支」变成确定性的），API 有意不开放它。
* 错误路径（`__error__`）—— 也走直调。原因：API 把 `ValueError` 转成了
  HTTPException，那是 API 层的事；本层要拍的是 core 层的报错文案。

**排除项（分层取子集，不是归一）**：`gua.*.{judgment,image,lines,interpretation}`
——那是 64 卦的**卦辞爻辞语料**，属独立的数据层，与梅花算法无关，ai3000 侧
另有语料来源。算法层的字段一个不少地比。

**不可对拍项（已排除，理由写在 coverage_meihua.py 的断言里）**：数字法/字数法
留空 `month_dizhi` 时月支取「当下」，本身不确定；其取值函数与时间法同一处
（历法层 5830 例已拍）。

样例设计见下方各 SAMPLE 段的注释 —— 原则是**每个分支都要有例**，且在注释里
写清「这一批是为了打到哪个分支」，而不是随手撒点。

用法：
    .venv/bin/python gen_golden_meihua.py [out.json]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from fastapi.testclient import TestClient                                  # noqa: E402
# 必须写别名：本文件末尾的 `def main()` 会把全局名 main 重绑成函数。
import main as shushu_app                                                   # noqa: E402
from core.calendar.solar_terms import get_jie_dates                         # noqa: E402
from core.meihua.qigua import METHOD_META                                   # noqa: E402
from core.meihua.strokes import stroke_count                                # noqa: E402

# ── 排除项（见模块 docstring）：只在**五个卦对象内部**排除 ──────
# 不能按 key 名全局递归删 —— `lines` 在 `qigua.lines` 那里是算法字段
# （六爻阴阳，自下而上），全局删会把它一并抹掉，于是「金标准里没有、被验方有」
# 看不出问题，反而是金标准缺了要验的东西。
#
# `name` 也在排除之列，理由与语料不同：那是**同一卦序的两种命名约定** ——
# shushu 用文王卦序单名（「恒」），ai3000 用通行全名（「雷风恒」）。对拍铁律 2
# 明写「身份用上下卦号，不用卦名」，而 `number` 与 `trigrams`（上下卦）都在
# 被验之列，故卦名不参与比对**不损失任何算法信号**。
CORPUS_KEYS = ("judgment", "image", "lines", "interpretation", "name")
GUA_KEYS = ("main", "mutual", "changed", "opposite", "reversed")

ZHI = "子丑寅卯辰巳午未申酉戌亥"

# ── 时间法 ────────────────────────────────────────────────────
GRID_YEARS = (2024, 2025, 2026, 2027)
GRID_DAYS = ((1, 15), (5, 20), (9, 10))     # 分散在三个季节，月支各不相同
GRID_HOURS = (0, 5, 11, 17, 23)             # 含子时两端

# 十二时辰全覆盖：整点 0..23 各来一遍（子时两段 0 点与 23 点各有算例）
HOUR_DAYS = ("2026-03-15", "2026-09-20")

# 子时/丑时边界 —— 起卦公式里唯一有 if 的地方（h==23 归子时）
EDGE_DAYS = ("2026-01-15", "2026-06-15")
EDGE_HM = ((23, 0), (23, 30), (23, 59), (0, 0), (0, 30), (0, 59), (1, 0))

# 立春前后（农历年支在此换）
LICHUN_DAYS = ((2026, 2, 3), (2026, 2, 4), (2026, 2, 5))

# ── 数字法 ────────────────────────────────────────────────────
NUM12 = (1, 2, 7, 8, 9, 16, 17)   # 含 8/16 两个「余数为 0 取 8」
NUM3 = (None, 1, 5, 6, 7, 12, 13)  # 含 6/12 两个「余数为 0 取 6」

# ── 字数法 ────────────────────────────────────────────────────
CHAR_TEXTS = [
    "一", "山", "爨", "齉",                       # 1 字：含笔画极值 1/3/30/36
    "问财", "你好", "卜卦",                       # 2 字（n//2=1，前后各 1）
    "梅花易", "求财运",                            # 3 字（n//2=1，前 1 后 2 —— 古法「一字上二字下」）
    "梅花易数", "心想事成",                         # 4 字
    "求财问前程",                                  # 5 字（前 2 后 3 —— 古法「二字上三字下」）
    "明日出行吉凶",                                # 6 字
    "今年财运如何发展",                             # 8 字
    "今日所求之事何时能够成就",                      # 12 字
    "请问今年的事业与财运整体走势会如何",              # 17 字（11 字以上分支）
    "梅花 易数",                                   # 含半角空格：空白不计入字数
    "求财　问事业",                                # 含全角空格 U+3000
]
# 显式笔画数（模拟按繁体/康熙笔画起卦的调用方）
CHAR_WITH_STROKES = [("问财", [11, 10]), ("梅", [11])]

# ── 错误路径 ──────────────────────────────────────────────────
BAD_NUMBERS = [
    (0, 1, None), (1, 0, None), (-1, 2, None), (1, 2, 0), (1.5, 2, None),
]
BAD_TEXT = "求财，问事业"        # 「，」不在笔画表内
BAD_TEXT_2 = "龘"                # 48 画，超出表内 1–36 的范围（表内最大 36 画的「齉」）
BAD_STROKES = [("问财", [11])]   # 笔画数与字数对不上

# ── 月支 ──────────────────────────────────────────────────────
MONTH_DIZHI = tuple(ZHI)         # 12 支各来一例（时间法，固定日期）

# 数字法/字数法直调注入 dt 的例（API 不暴露 dt，见 docstring）
CORE_DT = ("2026-05-10T23:00:00", "2026-08-07T09:30:00", "2026-12-21T14:00:00")


def strip_corpus(divine_out: dict) -> dict:
    """删掉五个卦对象里的语料字段与卦名（见模块 docstring 的排除项）。

    只动 `gua.{main,mutual,changed,opposite,reversed}` 这一层，
    其余一律原样保留 —— 排除范围写死结构，不按 key 名全局扫。
    """
    out = json.loads(json.dumps(divine_out))
    for gname in GUA_KEYS:
        g = out["gua"][gname]
        for k in CORPUS_KEYS:
            g.pop(k, None)
    return out


def leap_months(y0: int, y1: int):
    """扫出 [y0, y1] 年间所有农历闰月的（月号, 该月首日、十五、廿九的公历日）。

    闰月在 lunar_python 里 `getMonth()` 返回负数，故取 abs 即月号。
    """
    from lunar_python import Solar

    out, seen = [], set()
    d = datetime(y0, 1, 1)
    while d.year <= y1:
        lun = Solar.fromYmdHms(d.year, d.month, d.day, 0, 0, 0).getLunar()
        m = lun.getMonth()
        # 闰月首日：本月为负、且与前一日的 abs 月号不同
        if m < 0 and (d.year, -m) not in seen:
            seen.add((d.year, -m))
            out.append((d.date(), -m))
        d += timedelta(days=1)
    return out


def build_cases():
    """返回 (cases, errors)：cases 是 id → 请求体，errors 是 id → 期望报错文案。"""
    cases, errors = {}, {}

    def add(cid, body):
        cases[cid] = body

    # ── 时间法：常规网格 ──
    for y in GRID_YEARS:
        for mo, dd in GRID_DAYS:
            for h in GRID_HOURS:
                add(f"time|{y}-{mo:02d}-{dd:02d}T{h:02d}:00",
                    {"method": "time", "year": y, "month": mo, "day": dd,
                     "hour": h, "minute": 0})

    # ── 时间法：十二时辰整点全覆盖 ──
    for ds in HOUR_DAYS:
        y, mo, dd = (int(x) for x in ds.split("-"))
        for h in range(24):
            add(f"time|{ds}T{h:02d}:00|整点",
                {"method": "time", "year": y, "month": mo, "day": dd,
                 "hour": h, "minute": 0})

    # ── 时间法：子时/丑时边界（h==23 归子时，00:00-00:59 也算子时）──
    for ds in EDGE_DAYS:
        y, mo, dd = (int(x) for x in ds.split("-"))
        for h, mi in EDGE_HM:
            add(f"time|{ds}T{h:02d}:{mi:02d}|子丑界",
                {"method": "time", "year": y, "month": mo, "day": dd,
                 "hour": h, "minute": mi})

    # ── 时间法：闰月（农历月取 abs() 的那一支）──
    leaps = leap_months(2024, 2027)
    for first, mnum in leaps:
        for off, tag in ((0, "初一"), (14, "十五"), (28, "廿九")):
            d = first + timedelta(days=off)
            for h in (2, 10, 22):
                add(f"time|{d.isoformat()}T{h:02d}:00|闰{mnum}月{tag}",
                    {"method": "time", "year": d.year, "month": d.month,
                     "day": d.day, "hour": h, "minute": 0})

    # ── 时间法：十二「节」交节日当天（月支在此换）──
    for name, jdt in get_jie_dates(2026):
        if name not in ("小寒", "立春", "惊蛰", "清明", "立夏", "芒种",
                        "小暑", "立秋", "白露", "寒露", "立冬", "大雪"):
            continue                                   # 只要「节」，不要「气」
        for h in (0, 12, 23):
            add(f"time|{jdt.date().isoformat()}T{h:02d}:00|{name}",
                {"method": "time", "year": jdt.year, "month": jdt.month,
                 "day": jdt.day, "hour": h, "minute": 0})

    # ── 时间法：立春前后（农历年支在此换）──
    for y, mo, dd in LICHUN_DAYS:
        for h in (0, 12, 23):
            add(f"time|{y}-{mo:02d}-{dd:02d}T{h:02d}:00|立春前后",
                {"method": "time", "year": y, "month": mo, "day": dd,
                 "hour": h, "minute": 0})

    # ── 时间法：不给 hour（API 视作 0）──
    for ds in ("2026-01-01", "2026-07-07", "2026-11-11"):
        y, mo, dd = (int(x) for x in ds.split("-"))
        add(f"time|{ds}|hour缺省",
            {"method": "time", "year": y, "month": mo, "day": dd})

    # ── 时间法：显式月支 12 支各一 ──
    for mz in MONTH_DIZHI:
        add(f"time|2026-03-15T10:00|月支{mz}",
            {"method": "time", "year": 2026, "month": 3, "day": 15,
             "hour": 10, "minute": 0, "month_dizhi": mz})

    # ── 时间法：留空月支（走自动取月支；时间法下由起卦时刻决定，确定）──
    for ds in ("2026-02-03", "2026-08-07", "2026-12-21"):
        y, mo, dd = (int(x) for x in ds.split("-"))
        add(f"time|{ds}T23:00|月支自动",
            {"method": "time", "year": y, "month": mo, "day": dd,
             "hour": 23, "minute": 0})

    # ── 数字法：全组合 ──
    for n1 in NUM12:
        for n2 in NUM12:
            for n3 in NUM3:
                tag = "无第三数" if n3 is None else f"三数{n3}"
                add(f"number|{n1}|{n2}|{tag}",
                    {"method": "number", "num1": n1, "num2": n2, "num3": n3})

    # ── 数字法：大数 ──
    for n1, n2, n3 in ((99, 100, None), (365, 24, 7), (12345, 67890, 999)):
        add(f"number|{n1}|{n2}|{n3}",
            {"method": "number", "num1": n1, "num2": n2, "num3": n3})

    # ── 数字法：上下卦 8×8 全对 ──
    # 数字法里 `num % 8 || 8` 把 1..8 **原样**映到先天数 1..8，故 num1 就是上卦、
    # num2 就是下卦。上面那批 NUM12 只取 7 个值（去重后上/下卦只有 {1,2,7,8}），
    # 主卦位因此只落到 50/64 个卦序 —— 若 `HEX64_MAP` 错一条，恰好错在没跑到的那
    # 14 卦上就看不出来。补这一批，让 64 卦序**全部**出现在主卦位。
    for u in range(1, 9):
        for lo in range(1, 9):
            add(f"number|{u}|{lo}|全卦对",
                {"method": "number", "num1": u, "num2": lo, "num3": None})

    # ── 字数法：内置笔画表 ──
    for t in CHAR_TEXTS:
        add(f"character|{t}", {"method": "character", "text": t})

    # ── 字数法：显式笔画（繁体/康熙笔画路径）──
    for t, sk in CHAR_WITH_STROKES:
        add(f"character|{t}|笔画{sk}",
            {"method": "character", "text": t, "strokes": sk})

    # ── 错误路径 ──
    for n1, n2, n3 in BAD_NUMBERS:
        errors[f"err|number|{n1}|{n2}|{n3}"] = {"method": "number",
                                                "num1": n1, "num2": n2, "num3": n3}
    errors["err|character|空文本"] = {"method": "character", "text": "   "}
    errors[f"err|character|标点不在表|{BAD_TEXT}"] = {"method": "character", "text": BAD_TEXT}
    errors[f"err|character|生僻不在表|{BAD_TEXT_2}"] = {"method": "character", "text": BAD_TEXT_2}
    for t, sk in BAD_STROKES:
        errors[f"err|character|笔画数不符|{t}|{sk}"] = {
            "method": "character", "text": t, "strokes": sk}
    errors["err|method|不存在起卦法"] = {"method": "不存在的起卦法"}

    return cases, errors


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(Path(__file__).with_name("golden_meihua.json")))
    args = ap.parse_args()

    from core.meihua.analyzer import divine

    client = TestClient(shushu_app.app)
    cases, errors = build_cases()

    golden = {}
    # 调用说明（sidecar）：被验方按这个去调，不由 id 反推参数。
    # 与金标准分开存 —— 金标准是**参照物**，调用说明是**harness 的一部分**，
    # 混在一起会让「比对了什么」变得含混。
    specs = {}

    for cid, body in cases.items():
        r = client.post("/api/v1/meihua/divine", json=body)
        if r.status_code != 200:
            raise SystemExit(f"{cid} 金标准请求失败 {r.status_code}：{r.text[:300]}")
        golden[cid] = strip_corpus(r.json()["data"])
        specs[cid] = {"kind": "api", "body": body}

    # 直调注入 dt：把「自动取月支」在数字法/字数法下也变成确定的。
    #
    # 调用说明里的 `dt` 一律是 **ISO 字符串** —— 那是唯一能跨语言原样传递的形态
    # （json.dumps 不认 datetime）。两侧各自按自己的类型系统还原：
    #   Python：`datetime.fromisoformat`，shushu 的 `month_dizhi_at` 只收 datetime；
    #   JS    ：字符串直接进 `ganzhi.normalize`。
    # 曾经踩过：这里把 ISO 字符串原样喂给 shushu，`month_dizhi_at` 抛异常，
    # 被 `_default_month_dizhi` 的 `except Exception: return ""` 吞掉 ——
    # 金标准于是静默变成 `strength.available=false`（「没判旺衰」），
    # 看着像被验方差了，其实是金标准生成器传错了类型。
    for k, iso in enumerate(CORE_DT):
        calls = {
            f"core|number|auto月支|{iso}":
                {"method": "number", "num1": 3 + k, "num2": 5 + k, "dt": iso},
            f"core|character|auto月支|{iso}":
                {"method": "character", "text": "求财问前程", "dt": iso},
        }
        for cid, call in calls.items():
            kw = {kk: vv for kk, vv in call.items() if kk != "method"}
            kw["dt"] = datetime.fromisoformat(kw["dt"])
            golden[cid] = strip_corpus(divine(call["method"], **kw))
            specs[cid] = {"kind": "core", "call": call}

    # 错误路径（直调，见 docstring）
    for cid, body in errors.items():
        call = {"method": body["method"]}
        for kk in ("num1", "num2", "num3", "text", "strokes"):
            if body.get(kk) is not None:
                call[kk] = body[kk]
        try:
            divine(call["method"], **{k: v for k, v in call.items() if k != "method"})
        except ValueError as e:
            golden[cid] = {"__error__": str(e)}
            specs[cid] = {"kind": "error", "call": call}
        else:
            raise SystemExit(f"{cid} 本应报 ValueError，却成功返回了")

    out = Path(args.out)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    side = out.with_name("meihua_cases.json")
    side.write_text(json.dumps(specs, ensure_ascii=False, indent=1), encoding="utf-8")

    # ── 申报表：晚子时换日（已拍板偏离） ────────────────────────────────
    # 判据**独立于实跑差异**（层 3 的教训：按跑出来的差异反向拟合白名单，白名单
    # 会随 bug 一起漂移）：只看**金标准自己**记下的起卦时刻，小时 >= 23 就申报。
    # 换日使农历日 +1 → 三数全变 → 整卦、体用、互变、旺衰、应期全线变，故这里
    # 申报到**整例**粒度：那一例的每一个叶子值都已不同，逐字段申报只是把同一句
    # 话写十二遍（`coverage_meihua.py` 断言申报集恰好等于「time 法且 h>=23」）。
    #
    # 代价写明白：这 38 例从此**不参与**与 shushu 的比对。替代判据有两条，缺一不可
    # （见 coverage_meihua.py）：① 由「关掉换日后与金标准 0 差异」证明差异只来自
    # 换日这一个开关；② 由 `verify_qigua_vs_front.js` 与**线上前端**逐点核对取数。
    allow = {}
    for cid, g in golden.items():
        if g.get("method") != "time":
            continue
        dt = (g.get("inputs") or {}).get("datetime") or ""
        m = re.search(r"[T ](\d{1,2}):", dt)
        if m and int(m.group(1)) >= 23:
            allow[cid] = (
                "晚子时(23:00-23:59)换日：农历日进一位——用户 2026-09-24 拍板，"
                "不跟 shushu（shushu 直接 lunar.getDay() 不换日）。换日则三数全变、"
                "整卦随之全变，故整例申报；本条由 gen 按「time 法且 h>=23」规则生成，"
                "替代判据见 coverage_meihua.py")
    ap_out = out.with_name("allow_meihua.json")
    ap_out.write_text(json.dumps(allow, ensure_ascii=False, indent=1), encoding="utf-8")

    n_err = sum(1 for v in golden.values() if "__error__" in v)
    print(f"已写 {out}：{len(golden)} 例（其中错误路径 {n_err} 例、"
          f"直调注入 dt {len(CORE_DT) * 2} 例）")
    print(f"已写 {side}：调用说明，供 run_js_meihua.js 照着调")
    print(f"已写 {ap_out}：申报 {len(allow)} 例（晚子时换日，整例）")
    print(f"  起卦法：{sorted(METHOD_META)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

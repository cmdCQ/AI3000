# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的**八字四柱层**，即准备移植到
`build/backend/paipan/` 的排盘那一块（`bazi.js` 尚未落地；三套四柱实现的口径表见同
目录 `gen_bazi_sizhu_probe.py`）。

**直调，不经 API**：`core/bazi/chart.py::build_chart` 是本层唯一的排盘入口，
`POST /api/v1/bazi/chart` 在它外面又套了 pydantic + 解读层，那些不是本层要拍的东西。
直调同时让 1893/1900 这类年份、以及 `longitude`/`city` 参数进得来（API 是否开放它们，
与本层的忠实度无关）。

**为什么每个样例都带 `near_jie`**：实测 shushu 八字的历书
（`core/calendar/solar_terms.py`：lunarcalendar 定日 + ephem 定时刻）比本项目历法层
（lunar_python 节气表）**系统性早 4.6–8.2 分钟，2025–2026 全部 24 个节无一例外**
（见 `probe_bazi_jieqi_offset.py`；本脚本再测一遍的口径同此）。交节前后这几分钟里
月柱（乃至年柱）两侧必然不同 —— 那是**历书来源**差异，不是排盘逻辑差异。
`near_jie=true` 的样例因此必须能被单独申报出去，否则一跑就是几百条「差异」，
真 bug 淹没在里面。

`near_jie` 的判据见 `jie_moments()`：落在**两本历书任一**交节时刻的 ±10 分钟内即算。
只算一本会漏 —— 两本差近 8 分，取并集才能保证「两边的切换点都被窗口包住」。

**被验方（JS）必须原样回带 `id` / `input` / `near_jie`，不要自己重算 `near_jie`**：
它是对**样例**的标记（申报用），不是 `build_chart` 的产物。重算等于拿被验方的历书去
判金标准的历书，两侧历书一旦不同，标记本身就成了新的差异源。

**已知的另一处口径偏离（不在 `near_jie` 覆盖范围内）**：shushu 八字**晚子时不换日**
（`_day_index(dt.date())`，且 `hour_to_dizhi` 把 0 与 23 都算子），而本项目历法层
`paipan/ganzhi.js` 的日柱走 `getDayInGanZhiExact()` = **换日**。23:00–23:59 的样例
必然在日柱/时干上与 shushu 不同 —— 那是已拍板的口径差，得**按规则单独申报**，
理由与替代判据照 `allow_meihua.json`（晚子时换日那 38 例）的办法写。

**输出形状**：`{"cases": [{"id", "input", "near_jie", ...build_chart 全部字段}]}`。
`build_chart` 的返回**一个字段不筛**（JS 侧字段范围还没定，先全量留档）。
`diff.py` 比的是**列表下标**，故被验方必须与金标准**同序**；`--case-keys` 对这种形状
不起作用（顶层键是 `cases`，不是样例 id）。

样例设计见下方各批的注释 —— 原则是**每个分支都要有例**，并写清「这批是为了打到哪个
分支」，而不是随手撒点。

用法（须用 shushu 的 venv）：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_bazi.py [out.json]
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from calendar import monthrange
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "shushu"))

from lunar_python import Solar                                          # noqa: E402
from core.bazi import chart as bchart                                   # noqa: E402
from core.calendar.solar_terms import get_jie_dates                     # noqa: E402

# ── near_jie 的窗口宽度（分钟）──────────────────────────────────
# 取 10：实测两本历书最大差 8.2 分（probe_bazi_jieqi_offset.py），窗口得比它宽，
# 否则「shushu 已换月、历书还没换」的那几分钟会漏掉。
NEAR_JIE_MIN = 10

# ── ② 系统性网格 ────────────────────────────────────────────────
GRID_YEARS = (2025, 2026)
# 每天 6 个时辰：含晚子时两端(23:00/23:30)与早子时(00:30) —— 子时是唯一横跨
# 两日的时辰，换日口径之争全落在这里。
GRID_HM = ((23, 0), (23, 30), (0, 30), (5, 0), (11, 0), (17, 0))

# ── ③ 交节窗口 ──────────────────────────────────────────────────
JIE_SPAN_MIN = 10      # ±10 分钟
JIE_STEP_MIN = 2       # 每 2 分钟一个点
JIE_YEARS = (2025, 2026)

# ── ④ 子时/早子时边界（h==23 与 h==0 都算子时，且不换日）────────
EDGE_DAYS = ("2026-01-15", "2026-06-15")
# 23:59 与次日 00:00 是**同一时辰、同一(不换日的)日柱**，故成对摆；
# 00:30 是早子时的另一端。
EDGE_HM = ((23, 0), (23, 30), (23, 59), (0, 0), (0, 30))

# ── ⑤ 十二时支全覆盖（时干走五鼠遁，需 12 支各来一遍）──────────
HOUR_DAYS = ("2025-08-08", "2026-11-11")

# ── ⑥ 人元司令分野的日界（网格只到 28 日，打不到这段）──────────
# `_get_renyuan_siling` 按「日 ≤ 该段末日」定司令，十二支最后一段的末日**都是 30**，
# 故 31 日恒判空（`commander` 与 `phase` 都是空串）—— 这是 shushu 的既有行为，
# JS 侧对这一格要有**明确决定**（照抄空串，还是补一个兜底）。空串也是被验的取值，
# 故把月尾这几天照抄进金标准。没有 31 日的月份不生成（避免 2 月 31 日这种假输入）。
SILING_DAYS = (29, 30, 31)
SILING_YEAR = 2026

# ── ⑦ 真太阳时（longitude/city 分支，build_chart 里唯一的第二个入口）──
# 不整的是**均时差 + 经度修正**（见 true_solar_time.diff_minutes）：北京 116.4 与
# 乌鲁木齐 87.6 分处东经两端，修正量一正一负、幅度差得远；两个子时样例则叠上
# 「校正会不会把时刻推出当日」这一层。
SOLAR_CASES = (
    ((2026, 6, 24, 14, 30), {"longitude": 116.4}, "经度116.4"),
    ((2026, 6, 24, 14, 30), {"city": "北京"}, "城市北京"),
    ((2026, 6, 24, 0, 30), {"city": "乌鲁木齐"}, "城市乌鲁木齐"),   # 早子时×西端经度
    ((2026, 6, 24, 23, 30), {"city": "上海"}, "城市上海"),           # 晚子时×东端经度
)

ZHIDEX = "子丑寅卯辰巳午未申酉戌亥"   # 只为给时支批的 id 写个可读的支名


def iso(y: int, mo: int, d: int, h: int, mi: int) -> str:
    return f"{y:04d}-{mo:02d}-{d:02d}T{h:02d}:{mi:02d}"


def jie_moments(years) -> dict:
    """[years] 年内**两本历书**的交节时刻之并：{datetime: 名字}。

    两本都要，理由见模块 docstring：只取一本，另一本的切换点可能落在 ±10 窗外。
      · 历书 —— `lunar_python` 的节气表（本项目 `paipan/ganzhi.js` 那一口径）；
      · shushu —— `core/calendar/solar_terms.get_jie_dates`（lunarcalendar 定日 +
        ephem 定时刻，即 `build_chart` 实际用的那本）。

    lunar_python 的表里混着**相邻年份**与**拼音别名**键（`DONG_ZHI` 等），
    故一律按解析出来的 `dt.year` 过滤，不按名字。
    """
    out: dict = {}
    for y in sorted(set(years)):
        table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable()
        for name, s in table.items():
            if s is None:
                continue
            dt = datetime.strptime(s.toYmdHms(), "%Y-%m-%d %H:%M:%S")
            if dt.year == y:
                out.setdefault(dt, name)
        for name, dt in get_jie_dates(y):
            out.setdefault(dt, name)
    return out


def near_jie(dt: datetime, moments: dict) -> bool:
    """该时刻是否落在**任一**交节时刻的 ±NEAR_JIE_MIN 分钟内。"""
    return any(abs((dt - m).total_seconds()) <= NEAR_JIE_MIN * 60
               for m in moments)


def fixture_cases() -> list:
    """① 测试里的固定夹具 —— 逐条照抄 shushu 自己的测试输入，tag 写明出处。

    两处「夹具没钉、我代钉」的地方，都在 tag 里点明，免得日后当成测试的断言：
      · 夹具只给日期（`datetime(2026, 6, 24)`）时，时分即 00:00，照抄；
      · 毛泽东那条只钉了年/月/日三柱（时柱不在断言里），故取正午 12:00 ——
        这是我显式选的点，不是夹具里的数。
    """
    out = []

    def add(y, mo, d, h, mi, tag):
        out.append(((y, mo, d, h, mi), tag))

    # test_bazi_classical_validation::test_famous_case_mao
    #   断言 年癸巳·月甲子·日丁酉（时柱夹具未钉，取正午）
    add(1893, 12, 26, 12, 0, "test_famous_case_mao(时柱夹具未钉,取12:00)")
    # test_bazi_classical_validation：日柱锚点 1900-01-01 = 甲戌（_REF_DATE/_REF_DAY_IDX）
    add(1900, 1, 1, 12, 0, "日柱锚点1900-01-01=甲戌")
    add(1900, 1, 1, 0, 0, "日柱锚点(早子时)")
    add(1900, 1, 1, 23, 0, "日柱锚点(晚子时,不换日)")
    # test_bazi_classical_validation::test_year_pillar_switches_at_lichun
    #   2024-02-03 立春前 = 癸卯；2024-02-05 立春后 = 甲辰（立春 2024-02-04 16:27）
    add(2024, 2, 3, 12, 0, "test_year_pillar_switches_at_lichun(立春前)")
    add(2024, 2, 5, 12, 0, "test_year_pillar_switches_at_lichun(立春后)")
    # test_current_moment::test_sizhu_complete
    #   current_sizhu(2026-06-24 14:30) = 丙午 甲午 己巳 辛未（八字侧同一时刻）
    add(2026, 6, 24, 14, 30, "test_current_moment::test_sizhu_complete")
    # test_current_moment::test_all_modules_have_current_moment（bazi 端点入参）
    add(1990, 5, 22, 8, 0, "test_current_moment::test_all_modules_have_current_moment")
    # test_calendar_canonical::test_day_ganzhi（2026-06-24 14:00 → 日柱己巳）
    add(2026, 6, 24, 14, 0, "test_calendar_canonical::test_day_ganzhi")
    # test_calendar_canonical::test_month_ganzhi_and_dizhi /
    # test_alias_consistency（无时分 → 00:00）
    add(2026, 6, 24, 0, 0, "test_calendar_canonical::test_month_ganzhi_and_dizhi+alias")
    add(2026, 7, 15, 0, 0, "test_calendar_canonical::test_alias_consistency")
    # test_calendar_canonical::test_month_dizhi_by_solar_term（按节气定月支的五个点）
    for (y, mo, d), exp in (((2026, 1, 15), "丑"), ((2026, 6, 3), "巳"),
                            ((2026, 7, 15), "未"), ((2026, 8, 10), "申"),
                            ((2026, 12, 20), "子")):
        add(y, mo, d, 0, 0, f"month_dizhi_by_solar_term(应{exp})")
    # test_calendar_canonical::test_solar_term_on / test_current_solar_term
    add(2026, 6, 21, 0, 0, "test_solar_term_on(夏至当天)")

    # test_bazi_classical_validation::test_day_pillar_differential —— 25 组随机日期，
    # 连 `random.seed(7)` 一起照抄，故复现是确定的（同一 CPython 的 Mersenne Twister
    # 序列固定）。这 25 组横跨 1900–2025，顺带把日柱的干支对铺得比网格更散。
    random.seed(7)
    for _ in range(25):
        y = random.randint(1900, 2025)
        mo = random.randint(1, 12)
        d = random.randint(1, 28)
        add(y, mo, d, 12, 0, "test_day_pillar_differential(seed7)")
    return out


def build_cases() -> list:
    """返回 [(id, build_chart 的 kwargs)]，顺序即输出顺序（去重后按 id 排序）。"""
    cases: dict = {}

    def add(cid: str, kw: dict):
        if cid in cases:
            raise SystemExit(f"样例 id 撞车：{cid}")      # 撞车＝后一条悄悄盖掉前一条
        cases[cid] = kw

    # ── ① 固定夹具 ──
    for (y, mo, d, h, mi), tag in fixture_cases():
        add(f"fixture|{iso(y, mo, d, h, mi)}|{tag}",
            {"year": y, "month": mo, "day": d, "hour": h, "minute": mi})

    # ── ② 系统性网格：24 个月 × 3 天 × 6 时辰 ──
    # 抽日之法：`1 + ((3k + 11i) mod 28)`（i=月序号、k=0..2）。步长 11 与 28 互质，
    # 故月内三天必不相同；且相对月首的位移逐月变化，避免「每月同一天」——
    # 那样日柱会跟着六十甲子的 10 天周期原地打转，10 个日干未必到得齐。
    # （断言在 main() 里：本批必须打出 10 个日干、12 个日支、12 个月支。）
    for i, (y, mo) in enumerate([(y, m) for y in GRID_YEARS for m in range(1, 13)]):
        for k in range(3):
            d = 1 + ((3 * k + 11 * i) % 28)
            for h, mi in GRID_HM:
                add(f"grid|{iso(y, mo, d, h, mi)}|第{k + 1}天",
                    {"year": y, "month": mo, "day": d, "hour": h, "minute": mi})

    # ── ③ 交节窗口：每个节 ±10 分钟内每 2 分钟一个点 ──
    # 中心取**两本历书各自的**交节时刻（见 jie_moments），故同一点的窗口会重叠 ——
    # 重叠处按时刻去重，tag 里把撞上的节名都列上。
    # 为什么要两套中心：shushu 比历书早 4.6–8.2 分换月，窗口只用历书中心时，
    # 「shushu 已换、历书未换」那几分钟靠 ±10 的余量兜住；用两套则两边都正对。
    # 中心一律**截断到分钟**：`build_chart` 只收 (hour, minute)，秒级差异进不去，
    # 不截断则同一分钟会生成两个采样点、id 撞车（两本历书的交节时刻都带秒）。
    centers: dict = {}
    for y in JIE_YEARS:
        for dt, name in jie_moments((y,)).items():
            if dt.year == y:
                centers.setdefault(dt.replace(second=0, microsecond=0),
                                   set()).add(name)
    pts: dict = {}
    for center, names in centers.items():
        for off in range(-JIE_SPAN_MIN, JIE_SPAN_MIN + 1, JIE_STEP_MIN):
            t = center + timedelta(minutes=off)
            pts.setdefault(t, set()).update(names)
    for t in sorted(pts):
        tag = "+".join(sorted(pts[t]))
        add(f"jie|{iso(t.year, t.month, t.day, t.hour, t.minute)}|{tag}",
            {"year": t.year, "month": t.month, "day": t.day,
             "hour": t.hour, "minute": t.minute})
    # 两本历书的中心相差近 8 分，窗口因此叠成 20–28 分的连通段（仍是**每个中心各自
    # 的 ±10**）。最外圈那几个点离真实交节时刻 10 分零几秒，`near_jie` 会（正确地）
    # 判 false —— 申报范围就是 ±10 分，不外扩。

    # ── ④ 子时/早子时边界 ──
    for ds in EDGE_DAYS:
        y, mo, d = (int(x) for x in ds.split("-"))
        for h, mi in EDGE_HM:
            tag = "晚子时" if h == 23 else "早子时"
            add(f"zi|{iso(y, mo, d, h, mi)}|{tag}",
                {"year": y, "month": mo, "day": d, "hour": h, "minute": mi})
        # 跨日成对：d 日 23:59 与 d+1 日 00:00 —— 不换日口径下二者同柱
        nxt = datetime(y, mo, d) + timedelta(days=1)
        add(f"zi|{iso(nxt.year, nxt.month, nxt.day, 0, 0)}|早子时(承接前一日晚子时)",
            {"year": nxt.year, "month": nxt.month, "day": nxt.day,
             "hour": 0, "minute": 0})

    # ── ⑤ 十二时支全覆盖（偶数整点，0→子 2→丑 … 22→亥）──
    for ds in HOUR_DAYS:
        y, mo, d = (int(x) for x in ds.split("-"))
        for h in range(0, 24, 2):
            add(f"hour|{iso(y, mo, d, h, 0)}|{ZHIDEX[h // 2]}时",
                {"year": y, "month": mo, "day": d, "hour": h, "minute": 0})

    # ── ⑥ 人元司令分野的日界（29/30/31 日，见 SILING_DAYS 注释）──
    for mo in range(1, 13):
        last = monthrange(SILING_YEAR, mo)[1]
        for d in SILING_DAYS:
            if d > last:
                continue
            add(f"siling|{iso(SILING_YEAR, mo, d, 12, 0)}|{d}日",
                {"year": SILING_YEAR, "month": mo, "day": d,
                 "hour": 12, "minute": 0})

    # ── ⑦ 真太阳时（longitude / city）──
    for (y, mo, d, h, mi), extra, tag in SOLAR_CASES:
        add(f"solar|{iso(y, mo, d, h, mi)}|{tag}",
            {"year": y, "month": mo, "day": d, "hour": h, "minute": mi, **extra})

    return [(cid, cases[cid]) for cid in sorted(cases)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?",
                    default=str(Path(__file__).with_name("golden_bazi.json")))
    args = ap.parse_args()

    plan = build_cases()

    # 第一趟：排盘。金标准一侧**只调 build_chart**，不做任何加工。
    built = []
    for cid, kw in plan:
        built.append((cid, kw, bchart.build_chart(**kw)))

    # near_jie：按**排盘实际用的那个时刻**判（给了 longitude/city 时，build_chart
    # 会先做真太阳时校正，birth_dt 是校正后的）—— 换月换年看的是校正后的时刻，
    # 标记就该跟着它走。未校正时 birth_dt 与输入逐字相同。
    eff = [datetime.fromisoformat(r["birth_dt"]) for _, _, r in built]
    moments = jie_moments({e.year + dy for e in eff for dy in (-1, 0, 1)})

    out_cases = []
    meta = {"id", "input", "near_jie"}
    for (cid, kw, res), e in zip(built, eff):
        clash = meta & set(res)
        if clash:                       # build_chart 若真加了同名字段，宁可炸不许盖
            raise SystemExit(f"{cid}：build_chart 的返回与本脚本的元字段撞名 {clash}")
        out_cases.append({
            "id": cid,
            "input": kw,
            "near_jie": near_jie(e, moments),
            **res,                      # 全量带出，一个字段不筛
        })

    # ── 覆盖度断言：全绿之前先证明不是空绿 ────────────────────────
    # 只断言**样本设计承诺过的**覆盖面（网格那批承诺 10 日干/12 日支/12 月支，
    # 时支那批承诺 12 时支），不按跑出来的分布反向拟合。
    grid = [c for c in out_cases if c["id"].startswith("grid|")]
    gan = {c["day_pillar"]["tiangan"] for c in grid}
    dzh = {c["day_pillar"]["dizhi"] for c in grid}
    mzh = {c["month_pillar"]["dizhi"] for c in grid}
    hzh = {c["hour_pillar"]["dizhi"] for c in out_cases}
    if len(gan) != 10 or len(dzh) != 12 or len(mzh) != 12:
        raise SystemExit(f"网格覆盖面不足：日干 {len(gan)}/10 日支 {len(dzh)}/12 "
                         f"月支 {len(mzh)}/12")
    if len(hzh) != 12:
        raise SystemExit(f"时支覆盖面不足：{len(hzh)}/12")

    out = Path(args.out)
    out.write_text(json.dumps({"cases": out_cases}, ensure_ascii=False, indent=1),
                   encoding="utf-8")

    n_near = sum(1 for c in out_cases if c["near_jie"])
    print(f"已写 {out}：{len(out_cases)} 例，其中 near_jie=true {n_near} 例"
          f"（±{NEAR_JIE_MIN} 分钟内）")
    print(f"  交节时刻库 {len(moments)} 个（两本历书之并，"
          f"{min(moments).date()}–{max(moments).date()}）")
    print(f"  覆盖面：日干 {len(gan)}/10、日支 {len(dzh)}/12、月支 {len(mzh)}/12、"
          f"时支 {len(hzh)}/12（网格 {len(grid)} 例）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

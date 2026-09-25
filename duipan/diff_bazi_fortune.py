#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
八字对拍（3.5.2）：`paipan/bazi_fortune.js`  vs  shushu `core/bazi/forecaster.py`。
即 `/api/v1/bazi/fortune` 在**不含 combos 层**时的产出（combos 归 3.5.3）。

分四段，每段管一件不同的事：

 ① **骨架段**（全部样例）—— 只由**请求参数**推出的那些字段：流年的 `year`/`age`/干支、
    流月的 `month_num`/干支、流日的 `day`/`date`/干支、流时的 `hour_idx`/`dizhi`/`time_range`/
    `tiangan`（时干只由**流日日干**与时辰定）、大运的 `index`。
    **任何桶里都不许差**。为什么单列一段：其余字段在申报桶里是放行的，而「日期/年数/日序算错」
    恰好会落在那一片放行区里 —— 骨架段把这块信息量捞回来。
 ② **严格段**（非交节、非晚子时、非真太阳时）—— 去掉起运相关的四个字段后，
    **一条申报都不给**，必须 0 差异。这一段的绿有信息量。
 ③ **申报段**（交节 和/或 晚子时）—— 非骨架字段的差异**必须落在该原因带出的闭包内**。
    闭包是「四柱变 ⇒ 这些字段都是四柱的函数」，逐条在前注里对过（见 `reason_closure`）。
 ④ **起运段**（全部样例）—— `start_age` 一类的字段**不放进任何桶**，因为它们的自变量不是四柱，
    而是「出生时刻到某个**节**的距离」，而两侧**节表不同源**。这里不给「允许不同」这种
    空口径，而是**逐例证明**：
        js.raw − gold.raw  ==  ±(js.jie_at − gold.jie_at) / 86400 / 3   残差须为 0
    （符号随顺逆：顺用未来节，逆用已过节 —— 见 `run_start` 里的推导）
    并另加 |Δjie_at| ≤ `JIE_OFFSET_BOUND_S` 的**来源上界**。这样「起运差」就被钉死成
    **完全由节表偏移解释**，而不是一句「历书不同」了事。
 ⑤ **派生段**（全部样例）—— `start_age`/`end_age`/`start_year`/`end_year` 被 ②③ 剥掉、
    又被 ④ 放过之后，一度**没有任何一处覆盖**。两侧不能互比（自变量含节偏移），
    但它们必须与**自己那侧的岁数**严丝合缝 —— 见 `run_derived`（用与舍入无关的整数关系写）。

字段集也要核（少一个=移植漏，多一个=凭空造），两侧逐键对齐。

用法：
    python3 duipan/gen_golden_bazi_fortune.py --stride 6   # 金标准（须 shushu venv）
    node    duipan/run_js_bazi_fortune.js                  # 被验方
    python3 duipan/diff_bazi_fortune.py
退出码：0 = 四段全过。
"""
from __future__ import annotations

import json
import math
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

# 复用 3.5.1 那套「分支计数」收集器 —— 覆盖断言的写法在两层是同一件事，不重写一份。
from diff_bazi_chart import collect_values

HERE = Path(__file__).resolve().parent

FORTUNE_TOP = ("dayun", "liunian", "liuyue", "liuri", "liushi")

# 起运派生字段：不进任何桶，只走第 ④ 段的残差检查。
START_DERIVED = ("start_age", "end_age", "start_year", "end_year")

# 起运段：两侧所选节时刻之差的上界（秒）。**这个数不是拍的**，来自实测：
#     $PY duipan/probe_bazi_jie_offset_range.py        # 1890–2050
#   ⇒ 1932 个节例，max|Δ| = 980s = 16.3 分钟，且**全为正**（本项目更晚 ⇒ shushu 表偏早，
#     与 3.5.0 的结论同向）；按十年分段 max 落在 568–980s。
# 取 1000s 作天花板（略高于实测 980s，仍在量级内）。
# ⚠ 曾误取 600s：那个数只由 2025–2026 的三例样本得出（4.6–8.2 分），既不覆盖样本的
#   1893 年，连 2024 年都不够（实测 2024 立夏 +640s）—— **上界必须量在样本的年份范围上**。
# 这条界只防「同名的节却差出十几分钟」这种来源层面的异常；真正证明移植无误的是残差 == 0。
JIE_OFFSET_BOUND_S = 1000

# 逐条目字段集（与 gen_golden_bazi_fortune.py 里的断言同表）
ENTRY_KEYS = {
    "dayun": {"index", "tiangan", "dizhi", "start_age", "end_age", "start_year",
              "end_year", "quality", "dm_shishen", "warnings", "auspicious",
              "clash_day_zhi"},
    "liunian": {"year", "tiangan", "dizhi", "age", "shishen_gan", "shishen_zhi",
                "quality", "summary", "warnings", "auspicious", "tags",
                "is_benming_chong"},
    "liuyue": {"month_num", "tiangan", "dizhi", "shishen_gan", "season_status",
               "quality", "summary"},
    "liuri": {"day", "date", "tiangan", "dizhi", "shishen_gan", "quality"},
    "liushi": {"hour_idx", "tiangan", "dizhi", "time_range", "shishen_gan", "quality"},
}

# ① 骨架字段：只由请求参数/日期推出，与命局无关 ⇒ 任何桶里都不许差。
SKELETON = {
    "dayun": ("index",),
    "liunian": ("year", "age", "tiangan", "dizhi"),
    "liuyue": ("month_num", "tiangan", "dizhi"),
    "liuri": ("day", "date", "tiangan", "dizhi"),
    "liushi": ("hour_idx", "dizhi", "time_range", "tiangan"),
}

# ③ 申报闭包：四柱变 ⇒ 连带变。逐条给出来源，便于复核（不是「这些字段可以不一样」）。
REASON_FIELDS = {
    # 晚子时换日 ⇒ 日柱变 ⇒ 日主变、时柱随日干变；分析的旺衰随之变。
    "晚子时": {"quality", "dm_shishen", "warnings", "auspicious", "clash_day_zhi",
               "shishen_gan", "shishen_zhi", "summary", "tags", "is_benming_chong",
               "season_status"},
    # 交节换月/换年 ⇒ 月柱变 ⇒ 大运干支序列整条平移；年柱变 ⇒ 流年参照变；
    # 四柱全变 ⇒ 十神/旺衰/太岁标签/互动吉凶全变。
    "交节": {"tiangan", "dizhi", "quality", "dm_shishen", "warnings", "auspicious",
             "clash_day_zhi", "shishen_gan", "shishen_zhi", "summary", "tags",
             "is_benming_chong", "season_status"},
}
# 注：`start_age`/`end_age`/`start_year`/`end_year` **不在**上面的闭包里 ——
# 它们的自变量不是四柱，而是「到某个节的距离」，走第 ④ 段的残差检查（见文件头）。


def ts_of(s: str) -> datetime:
    """'YYYY-MM-DD HH:MM:SS' → datetime。两侧都只是无时区的墙上时间标签，做差即所求。"""
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S")


def is_true_solar(inp: dict) -> bool:
    """真太阳时样例（带城市或经度）—— 3.5.1/3.5.2 都**未纳入**这个能力，
    它整体平移时刻（连日期都可能挪一天），塞进任何申报桶都会掩盖真 bug，故单列计数。"""
    return bool(inp.get("city")) or inp.get("longitude") is not None


def load_two(gold_name, js_name, empty_hint):
    g = json.loads((HERE / gold_name).read_text(encoding="utf-8"))
    p = HERE / js_name
    if not p.exists() or not p.read_text(encoding="utf-8").strip():
        raise SystemExit(f"✗ 被验方 {js_name} 不存在或为空 —— 先跑 {empty_hint}")
    return g, json.loads(p.read_text(encoding="utf-8"))


def strip_start(f: dict) -> dict:
    """去掉起运派生字段（它们走第 ④ 段），其余原样 —— 并**顺手规范化**。

    规范化放在这里是因为严格段要把结果写盘再交给 `diff.py` 逐字比，
    在那儿没法再改；而申报段用的是同一份，一并覆盖。
    """
    out = {}
    for k, v in f.items():
        if k == "dayun" and v:
            out[k] = [canon({kk: vv for kk, vv in d.items() if kk not in START_DERIVED})
                      for d in v]
        else:
            out[k] = canon(v)
    return out


def skeleton_of(f: dict) -> dict:
    """只留骨架字段。"""
    out = {}
    for k, v in f.items():
        if v is None:
            out[k] = None
        else:
            keep = SKELETON[k]
            out[k] = [{kk: d[kk] for kk in keep} for d in v]
    return out


def reason_closure(reasons) -> set:
    allow = set()
    for one in reasons.split("+"):
        allow |= REASON_FIELDS[one]
    return allow


_ZHI = '子丑寅卯辰巳午未申酉戌亥'
_SANHE_MSG = re.compile(
    rf'^(流年[{_ZHI}]{{1,2}}与命局)([{_ZHI}](?:/[{_ZHI}])*)(三合，运势有助推)$')


def canon(v):
    """比对前的规范化 —— **只动 shushu 那句「三合」文案里的支序**，其余一律逐字比。

    为什么非动不可：shushu 的写法是 `set(natal_zhi) & set(others)` 再 `'/'.join(hits)`
    （`forecaster.py:207-210`），而 python 的 str hash **默认逐进程随机化** ——
    命中两个支时，同一份输入两次运行会给出「丑/巳」或「巳/丑」。也就是说
    **金标准自己不可复现**（换个进程重生成就翻过来），这是 shushu 的缺陷，不是移植差异。
    规范化只把该段的支列表**排序**；句子其余字符必须逐字相同，所以不是整句放行。
    ⚠ `bazi_fortune.js` 那边按三合组的固定顺序输出（可复现），故两侧只能这样比。
    """
    if isinstance(v, str):
        m = _SANHE_MSG.match(v)
        return m.group(1) + '/'.join(sorted(m.group(2).split('/'))) + m.group(3) if m else v
    if isinstance(v, list):
        return [canon(x) for x in v]
    if isinstance(v, dict):
        return {k: canon(x) for k, x in v.items()}
    return v


def diff_entries(a_entries, b_entries, only_keys=None) -> list:
    """逐条目比，返回差异描述列表（`[条号].字段`）。
    `only_keys` 给了就只比这些键（骨架段用），否则比两边键的并集。"""
    if a_entries is None or b_entries is None:
        return [] if a_entries == b_entries else ["一边为 null"]
    if len(a_entries) != len(b_entries):
        return [f"条数 {len(a_entries)} vs {len(b_entries)}"]
    bad = []
    for i, (x, y) in enumerate(zip(a_entries, b_entries)):
        keys = only_keys if only_keys is not None else (set(x) | set(y))
        for k in sorted(keys):
            if k in START_DERIVED:
                continue          # 起运派生字段走第 ④ 段，这里一律不比
            if canon(x.get(k)) != canon(y.get(k)):
                bad.append(f"[{i}].{k}")
    return bad


def run_skeleton(gold, js, meta) -> tuple:
    """① 骨架段：全部样例（真太阳时除外）。真太阳时**单独计数**，不算失败。"""
    stat = Counter()
    examples = []
    n_cases = 0
    n_tst = 0
    for cid, gf in gold.items():
        if is_true_solar(meta[cid]["input"]):
            n_tst += 1
            continue
        n_cases += 1
        jf = js[cid]
        for key in FORTUNE_TOP:
            diffs = diff_entries(gf[key], jf[key], only_keys=SKELETON[key])
            if diffs:
                stat[f"{key}: {sorted(set(d.split('.')[1] for d in diffs))}"] += 1
                if len(examples) < 8:
                    examples.append((cid, key, diffs[:6]))
    return n_cases, n_tst, stat, examples


def run_strict_and_declared(gold, js, meta) -> tuple:
    """②③ 严格段 + 申报段（都先去掉起运派生字段）。"""
    strict_g, strict_j = {}, {}
    decl = []
    for cid, gf in gold.items():
        inp = meta[cid]["input"]
        if is_true_solar(inp):
            continue
        g2, j2 = strip_start(gf), strip_start(js[cid])
        if inp["hour"] == 23 or meta[cid]["near_jie"]:
            reasons = []
            if inp["hour"] == 23:
                reasons.append("晚子时")
            if meta[cid]["near_jie"]:
                reasons.append("交节")
            decl.append((cid, g2, j2, "+".join(reasons)))
        else:
            strict_g[cid] = g2
            strict_j[cid] = j2

    (HERE / "golden_bazi_fortune_strict.json").write_text(
        json.dumps(strict_g, ensure_ascii=False, indent=1), encoding="utf-8")
    (HERE / "js_bazi_fortune_strict.json").write_text(
        json.dumps(strict_j, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"  ── 严格段：{len(strict_g)} 例（非交节、非晚子时、非真太阳时）—— **不给任何申报**")
    r = subprocess.run(
        [sys.executable, str(HERE / "diff.py"),
         str(HERE / "golden_bazi_fortune_strict.json"),
         str(HERE / "js_bazi_fortune_strict.json"), "--case-keys"],
        capture_output=True, text=True)
    for ln in r.stdout.strip().splitlines()[-14:]:
        print("     " + ln)
    strict_ok = (r.returncode == 0)

    print(f"  ── 申报段：{len(decl)} 例，按申报原因核查")
    stat = Counter()
    unexpected = []
    for cid, g2, j2, reason in decl:
        allow = reason_closure(reason)
        hits = []
        for key in FORTUNE_TOP:
            if g2[key] == j2[key]:
                continue
            if g2[key] is None or j2[key] is None:
                hits.append(f"{key}: null 不一致")
                continue
            diffkeys = set()
            for x, y in zip(g2[key], j2[key]):
                for k in set(x) | set(y):
                    if x.get(k) != y.get(k):
                        diffkeys.add(k)
            outside = sorted(diffkeys - allow)
            if outside:
                hits.append(f"{key}: 申报外字段 {outside}")
            elif diffkeys:
                stat[f"[{reason}] {key} 差异={sorted(diffkeys)}"] += 1
        if hits:
            unexpected.append((cid, reason, hits))
    for line, n in stat.most_common(20):
        print(f"     {n:4d} 例  {line}")
    return strict_ok, decl, unexpected


def run_start(gold, js, meta) -> tuple:
    """④ 起运段：逐例证明差额完全由节表偏移解释。"""
    print(f"  ── 起运段：{len(gold)} 例（**全部**样例，含申报桶）")
    stat = Counter()
    fails = []
    age_flip = []
    for cid, g in gold.items():
        inp = meta[cid]["input"]
        if is_true_solar(inp):
            stat["未纳入（真太阳时）"] += 1
            continue
        j = js.get(cid)
        if j is None:
            fails.append((cid, "JS 侧缺这一例"))
            continue
        if g["params"] != j["params"]:
            fails.append((cid, f"**输入不同**：gold={g['params']} js={j['params']}"))
            continue
        if g["forward"] != j["forward"]:
            fails.append((cid, f"顺逆不一致 gold={g['forward']} js={j['forward']}"))
            continue
        if g["jie_at"] is None or j["jie_at"] is None:
            # shushu 的回退分支（找不到可用节，按月初估）：没有节可比对，
            # 只能核「两侧都走了回退」且岁数一致 —— 不许一侧有节另一侧没有。
            if g["jie_at"] is not None or j["jie_at"] is not None:
                fails.append((cid, f"一侧走回退、另一侧没有：gold={g['jie_at']} js={j['jie_at']}"))
                continue
            stat["回退分支（无节可比，仅核岁数）"] += 1
            if j["age"] != g["age"]:
                age_flip.append((cid, g["age"], j["age"]))
            continue
        if g["jie_name"] != j["jie_name"]:
            # 只有「出生时刻贴着交节」才可能选到不同的节；此时差额必然是一整个节的距离。
            if not meta[cid]["near_jie"]:
                fails.append((cid, f"节选错（非交节样例）：gold={g['jie_name']} js={j['jie_name']}"))
                continue
            stat["节选到相邻的节（交节样例，已申报）"] += 1
        else:
            dt = abs((ts_of(j["jie_at"]) - ts_of(g["jie_at"])).total_seconds())
            if dt > JIE_OFFSET_BOUND_S:
                fails.append((cid, f"所选节相同时刻却差 {dt:.0f}s"
                                    f"（>{JIE_OFFSET_BOUND_S}s 上界）"
                                    f" gold={g['jie_at']} js={j['jie_at']}"))
                continue
            stat[f"节时刻偏移 ≤{int(dt // 60) + 1} 分钟"] += 1

        # 残差：js.raw − gold.raw 必须**恰好等于**两侧所选节之差 ÷ 3（天）。
        # ⚠ 符号随顺逆而变：raw = |出生 − 所用节| ÷ 3 天，
        #   顺（用未来节）：raw = (节 − 出生)/3d      ⇒ ∂raw/∂节 = +1/3d
        #   逆（用已过节）：raw = (出生 − 节)/3d      ⇒ ∂raw/∂节 = −1/3d
        # 第一版漏了这个符号 ⇒ 逆方向的样例全部报「残差 ≠ 0」，
        # 而残差数值恰是 2×偏移/3d（例 −3.518e-03 对应偏移 456s≈7.6 分）——
        # 看着像移植 bug，其实是**验证脚本自己的错**。
        d_jie = (ts_of(j["jie_at"]) - ts_of(g["jie_at"])).total_seconds()
        expect = (1.0 if j["forward"] else -1.0) * d_jie / 86400.0 / 3.0
        resid = (j["raw"] - g["raw"]) - expect
        if abs(resid) > 1e-9:
            fails.append((cid, f"起运残差 {resid:.3e} ≠ 0（应完全由节偏移解释）"
                                f" gold.raw={g['raw']:.6f} js.raw={j['raw']:.6f}"))
            continue
        if j["age"] != g["age"]:
            age_flip.append((cid, g["age"], j["age"]))
    return stat, fails, age_flip


def run_derived(gold_f, js_f, gold_s, js_s, meta) -> list:
    """⑤ 派生段：`dayun[*]` 的 `start_age`/`end_age`/`start_year`/`end_year` **逐侧自洽**。

    为什么这两侧不能互比：它们的自变量是**起运岁数**，而岁数含节表偏移（见 ④），
    所以两侧本来就允许差 0.01 ~ 0.1 年、甚至差 1 年（`floor` 跨界）—— 互比只会得到
    「历书来源不同」这个已知结论。**但它们各自必须与自己的岁数严丝合缝**，这条谁也没比过：
    这四字段被 `START_DERIVED` 从 ②③ 桶里剥掉后，④ 只核了 `age` 一个字段 ⇒
    「`start_year` 算错年数」「两段大运接不上」这类错误**此前没有任何一处能发现**。

    shushu 的派生式（`forecaster.py:308-311`、`337-340`），逐字照抄成期望值：
        period_start_age = 岁数 + 10i            period_end_age = 岁数 + 10(i+1)
        start_age[i] = round(period_start_age, 1)   end_age[i] = round(period_end_age, 1)
        start_year[i] = 生年 + floor(period_start_age)   end_year[i] = 生年 + floor(period_end_age)
    期望值直接用 **python 内置 `round`/`math.floor`** 算 —— 与 shushu 是同一个原语、
    同一串浮点运算（`岁数 + 10i` 这个加法也一并复现）。这里之所以敢用 python 的 `round`
    去核 **JS 侧**，是因为 `pyRound ≡ python round` 已被 `fuzz_pyround.py` 逐位验过
    （906,696 例，含 nd∈{0,1,2} 全域 2 位小数与对抗值），它是一条**引理**，不是假设。

    ⚠ 曾经写成「与舍入无关的精确关系」（`start_age[i] − start_age[0] == 10i` 之类）——
    那是**错的**：1 位小数的舍入在二进制浮点下**不满足平移不变性**。
    实测 `岁数 = 8.35` 时 python 给 `round(8.35,1)=8.3` 但 `round(18.35,1)=18.4`，
    差 10.1 —— 这条「精确关系」在 22 例上把**shushu 的正确输出**判成了错误。
    凡是要复现浮点结果，就得复现**同一串运算**，不能改用「数学上等价」的写法。
    """
    problems = []
    n = 0
    for cid, gf in gold_f.items():
        birth_year = meta[cid]["input"]["year"]
        for side, fortune, start in (("gold", gf, gold_s.get(cid)),
                                     ("js", js_f.get(cid), js_s.get(cid))):
            if fortune is None or start is None:
                problems.append((cid, f"[{side}] 缺 dayun 或起运诊断"))
                continue
            age = start["age"]
            raw = start.get("raw")
            days = fortune["dayun"]
            if len(days) != 10:
                problems.append((cid, f"[{side}] dayun 长度 {len(days)} ≠ 10"))
                continue
            if raw is not None and abs(raw - age) > 0.005 + 1e-9:
                problems.append((cid, f"[{side}] age={age} 不是 raw={raw!r} 的两位小数"))
            for i, d in enumerate(days):
                ps = age + i * 10
                pe = age + (i + 1) * 10
                want = {"start_age": round(ps, 1), "end_age": round(pe, 1),
                        "start_year": birth_year + math.floor(ps),
                        "end_year": birth_year + math.floor(pe)}
                for k, w in want.items():
                    if d[k] != w:
                        problems.append((cid, f"[{side}] dayun[{i}].{k}={d[k]!r} ≠ {w!r}"
                                              f"（岁数={age!r}）"))
            n += 1
    print(f"  ── 派生段：{n} 侧·例（逐侧自洽；两侧因节偏移本就允许不同，故不互比）")
    return problems


def check_field_sets(gold, js, meta) -> list:
    """字段集逐键核：少一个（移植漏）或多一个（凭空造）都不该静默过。"""
    problems = []
    if set(gold) != set(js):
        problems.append(f"id 集合不同：gold 多 {sorted(set(gold) - set(js))[:3]}，"
                        f"js 多 {sorted(set(js) - set(gold))[:3]}")
        return problems
    for cid, gf in gold.items():
        if set(gf) != set(FORTUNE_TOP):
            problems.append(f"{cid} 顶层字段集 {sorted(set(gf))}")
            return problems
        jf = js[cid]
        if set(jf) != set(gf):
            problems.append(f"{cid} 顶层键不一致 {sorted(set(jf) ^ set(gf))}")
            return problems
        for key in FORTUNE_TOP:
            a, b = gf[key], jf[key]
            if (a is None) != (b is None):
                problems.append(f"{cid}.{key} 一边为 null")
                return problems
            if a is None:
                continue
            # 条数先核 —— 后面的逐条目比是按 `zip` 走的，条数不等会**静默截断**成「看起来没差」。
            if len(a) != len(b):
                problems.append(f"{cid}.{key} 条数 {len(a)} vs {len(b)}")
                return problems
            for x, y in zip(a, b):
                if set(x) != ENTRY_KEYS[key] or set(y) != ENTRY_KEYS[key]:
                    problems.append(f"{cid}.{key} 条目字段集："
                                    f"gold 多 {sorted(set(x) - ENTRY_KEYS[key])} 缺 {sorted(ENTRY_KEYS[key] - set(x))}；"
                                    f"js 多 {sorted(set(y) - ENTRY_KEYS[key])} 缺 {sorted(ENTRY_KEYS[key] - set(y))}")
                    return problems
    return problems


def fortune_extractors():
    """严格段的分支枚举 —— 用来断言严格段确实走到了这些分支（防橡皮章）。"""
    def tags(f):
        return [t for ln in (f["liunian"] or []) for t in ln["tags"]]
    return {
        "大运吉凶": lambda f: [d["quality"] for d in f["dayun"]],
        "大运十神": lambda f: [d["dm_shishen"] for d in f["dayun"]],
        "大运干支": lambda f: [d["tiangan"] + d["dizhi"] for d in f["dayun"]],
        "大运告警类": lambda f: [w.split("：")[0].split("（")[0].strip("⚠ ")
                                for d in f["dayun"] for w in d["warnings"]],
        "冲日支": lambda f: [str(d["clash_day_zhi"]) for d in f["dayun"]],
        "流年吉凶": lambda f: [ln["quality"] for ln in (f["liunian"] or [])],
        "流年十神": lambda f: [ln["shishen_gan"] for ln in (f["liunian"] or [])],
        "流年支": lambda f: [ln["dizhi"] for ln in (f["liunian"] or [])],
        "流年标签": tags,
        "本命逢冲": lambda f: [str(ln["is_benming_chong"]) for ln in (f["liunian"] or [])],
        "流月旺衰": lambda f: [m["season_status"] for m in (f["liuyue"] or [])],
        "流月吉凶": lambda f: [m["quality"] for m in (f["liuyue"] or [])],
        "流月干支": lambda f: [m["tiangan"] + m["dizhi"] for m in (f["liuyue"] or [])],
        "流日吉凶": lambda f: [d["quality"] for d in (f["liuri"] or [])],
        "流时干支": lambda f: [h["tiangan"] + h["dizhi"] for h in (f["liushi"] or [])],
        "空分支": lambda f: [k for k in ("liuyue", "liuri", "liushi") if f[k] is None],
    }


def report_coverage(strict_gold, full_gold):
    print("  ── 覆盖断言：严格段是否真的走到了这些分支")
    gaps = []
    for label, fn in fortune_extractors().items():
        full = collect_values(full_gold, fn)
        strict = collect_values(strict_gold, fn)
        only = sorted(set(full) - set(strict))
        line = f"     {label:9s} 全样例 {len(full):3d} 种 / 严格段 {len(strict):3d} 种"
        if only:
            line += f"  ⚠ 仅出现在申报段：{only[:8]}"
            gaps.append(label)
        print(line)
    return gaps


def main() -> int:
    meta = {c["id"]: {"input": c["input"], "near_jie": c.get("near_jie", False)}
            for c in json.loads((HERE / "golden_bazi.json").read_text(encoding="utf-8"))["cases"]}

    print(f"════ 3.5.2 大运与流年   （金标准 golden_bazi_fortune.json ← 被验 js_bazi_fortune.json）")
    gold, js = load_two("golden_bazi_fortune.json", "js_bazi_fortune.json",
                        "run_js_bazi_fortune.js")
    gold_s, js_s = load_two("golden_bazi_start.json", "js_bazi_start.json",
                            "run_js_bazi_fortune.js")

    problems = check_field_sets(gold, js, meta)
    if problems:
        print("  ✗ 字段集不一致：")
        for p in problems[:10]:
            print("     " + p)
        return 2

    n, n_tst, stat, examples = run_skeleton(gold, js, meta)
    print(f"  ── 骨架段：{n} 例（另有 {n_tst} 例真太阳时未纳入）"
          f"—— 只由请求参数推出的字段，**任何桶都不许差**")
    if stat:
        for line, cnt in stat.most_common(10):
            print(f"     {cnt:4d} 例  {line}")
        for cid, key, d in examples:
            print(f"        {cid}.{key}  {d}")
        print("  ✗ 骨架段有差异 —— 这是「日期/年数/日序算错」一类，真 bug")
        return 2
    print("     ✓ 0 差异")

    strict_ok, decl, unexpected = run_strict_and_declared(gold, js, meta)
    if unexpected:
        print(f"\n  ✗ 申报段出现**申报形态之外**的差异 {len(unexpected)} 例 —— 真 bug，不是历书来源差异：")
        for cid, reason, hits in unexpected[:8]:
            print(f"        {cid}  [{reason}] {hits}")
        return 2
    print("     ✓ 申报段差异全部落在该原因带出的字段内")

    start_stat, start_fails, age_flip = run_start(gold_s, js_s, meta)
    for line, cnt in start_stat.most_common(10):
        print(f"     {cnt:4d} 例  {line}")
    if start_fails:
        print(f"\n  ✗ 起运段 {len(start_fails)} 例不能由节表偏移解释：")
        for cid, why in start_fails[:8]:
            print(f"        {cid}  {why}")
        return 2
    print(f"     ✓ 残差全为 0；其中 {len(age_flip)} 例的**两位小数**岁数因节偏移而不同"
          f"（例：{age_flip[:3]}）")

    derived = run_derived(gold, js, gold_s, js_s, meta)
    if derived:
        print(f"\n  ✗ 派生段 {len(derived)} 处不自洽 —— 这些字段此前无任何一处覆盖：")
        for cid, why in derived[:8]:
            print(f"        {cid}  {why}")
        return 2
    print("     ✓ 逐侧自洽：岁数/年数/旬接续都对得上")

    strict_gold = {}
    for cid, gf in gold.items():
        inp = meta[cid]["input"]
        if is_true_solar(inp):
            continue
        if inp["hour"] == 23 or meta[cid]["near_jie"]:
            continue
        strict_gold[cid] = gf
    report_coverage(strict_gold, gold)

    print("\n" + ("═" * 60))
    ok = strict_ok
    print("✓ 五段全过" if ok else "✗ 严格段有差异，见上")
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
八字排盘核对拍（3.5.1a）：`paipan/bazi.js` 的 buildChart  vs  shushu `core/bazi/chart.py`。

**为什么不能只跑一次 diff.py**：1185 例里有 623 例落在交节前后，而两侧**历书不同源** ——
shushu 的节气表系统性偏早 3–7 分钟（实测见 `probe_bazi_jieqi_offset.py`）。这些例子的月柱/
年柱差异**不是排盘逻辑的差异**，是历书来源差异。若把它们一起丢进 diff.py，就只能写一张
覆盖 `例.year_pillar` 的申报表 —— 那是**撒胡椒面**：它会连带盖住真正排盘逻辑的错，
白名单宽到没有意义（见 memory: ai3000-duipan-harness）。

故分两段，严格段**一条申报都不给**：
  · 严格段 = 非交节窗口 且 非晚子时 → `diff.py`，**必须 0 差异**。这一段的绿是有信息量的。
  · 申报段 = 交节窗口（near_jie） 或 晚子时（23 时）→ 逐例按其**来源**打印差异，
    只允许出现**申报过的形态**（交节：柱变；晚子时：日柱/时柱成对变），出现别的就是真 bug。

用法：
    python3 duipan/diff_bazi_chart.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ── 申报形态：差异必须长这样，否则视为排盘逻辑出错 ──
# 申报不是「这个字段可以不一样」，而是「**因为已申报的原因**，这些字段会连带变」。
# 所以按**原因**给字段闭包：原因成立才放行它带出来的字段，换成别的原因出现同样字段
# 不放行。闭包里的连带关系都写清来源，方便复核：
#   · 晚子时换日 → 日柱变 ⇒ 日主/日主五行变（日主就是日柱天干）；时柱随之变（五鼠遁基于日干）
#   · 交节换月 → 月柱变 ⇒ 胎元(月干+1/月支+3)、命宫与身宫(含月支序)、人元司令(以月支为键)全变；
#                        年柱(立春换年)变 ⇒ 命宫/身宫天干(以年干起五虎遁)变
REASON_FIELDS = {
    "晚子时": {"day_pillar", "hour_pillar", "day_master", "day_master_wuxing"},
    "交节": {"year_pillar", "month_pillar", "taiyuan", "minggong", "shengong",
             "renyuan_siling", "day_master", "day_master_wuxing"},
}


def load():
    golden = json.loads((HERE / "golden_bazi.json").read_text(encoding="utf-8"))["cases"]
    js = json.loads((HERE / "js_bazi.json").read_text(encoding="utf-8"))
    return golden, js


def chart_of(case_or_chart: dict, ref: dict):
    """从 golden 的样例对象里取出「盘」本身：只保留 JS 侧也有的键。

    并且**要求键集完全一致** —— 少一个字段说明移植漏了，多一个说明凭空造的，
    两种都不该静默通过。
    """
    chart = {k: v for k, v in case_or_chart.items() if k in ref}
    return chart


def main():
    golden, js = load()
    missing = [c["id"] for c in golden if c["id"] not in js]
    if missing:
        print(f"✗ JS 侧缺 {len(missing)} 例，例如 {missing[:3]}")
        return 2

    strict_gold, strict_js, decl = {}, {}, []
    key_mismatch = Counter()
    skipped_tst = []                                     # 真太阳时：本次不纳入
    for c in golden:
        cid = c["id"]
        jchart = js[cid]
        gchart = chart_of(c, jchart)
        if set(gchart) != set(jchart):
            key_mismatch[tuple(sorted(set(jchart) - set(gchart)))] += 1
            key_mismatch[tuple("缺:" + k for k in sorted(set(gchart) - set(jchart)))] += 1
            continue

        inp = c["input"]
        # 真太阳时（城市/经度）**先判**：它会整体平移时刻，连日期都能挪一天
        # （乌鲁木齐 00:30 → 前一日 22:18），放进任何申报桶都会掩盖真 bug。
        # 本项属 3.5.1a **明确不纳入**的能力（与前端 EOT 表去重一并做），故单列计数、不静默跳过。
        if inp.get("city") or inp.get("longitude") is not None:
            skipped_tst.append(cid)
            continue

        reasons = []
        if inp["hour"] == 23:
            reasons.append("晚子时")
        if c.get("near_jie"):
            reasons.append("交节")
        if reasons:
            decl.append((cid, gchart, jchart, "+".join(reasons)))
        else:
            strict_gold[cid] = gchart
            strict_js[cid] = jchart

    if key_mismatch:
        print("✗ 字段集不一致（移植漏字段或凭空加字段）：")
        for k, n in key_mismatch.most_common(10):
            print(f"   {n:4d} 例  {list(k)}")
        return 2

    # ── 严格段 ──
    (HERE / "golden_bazi_strict.json").write_text(
        json.dumps(strict_gold, ensure_ascii=False, indent=1), encoding="utf-8")
    (HERE / "js_bazi_strict.json").write_text(
        json.dumps(strict_js, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"── 严格段：{len(strict_gold)} 例（非交节窗口、非晚子时）——**不给任何申报**")
    r = subprocess.run(
        [sys.executable, str(HERE / "diff.py"),
         str(HERE / "golden_bazi_strict.json"), str(HERE / "js_bazi_strict.json"),
         "--case-keys"],
        capture_output=True, text=True)
    tail = r.stdout.strip().splitlines()
    for ln in tail[-14:]:
        print("   " + ln)
    if r.returncode != 0:
        print("   ✗ 严格段有差异 —— 排盘核有真 bug，先修这个")

    # ── 未纳入段（必须显式计数，不能静默跳过）──
    if skipped_tst:
        print(f"\n── **未纳入**：{len(skipped_tst)} 例真太阳时（城市/经度）"
              f"—— 3.5.1a 不含此能力，故不参与对拍")
        for cid in skipped_tst[:10]:
            print(f"      {cid}")

    # ── 申报段 ──
    print(f"\n── 申报段：{len(decl)} 例，按申报原因核查（原因成立才放行它带出的字段）")
    reason_stat = Counter()
    unexpected = []
    for cid, gchart, jchart, reason in decl:
        diffs = sorted(k for k in jchart if gchart.get(k) != jchart[k])
        allowed = set()
        for one_reason in reason.split("+"):
            allowed |= REASON_FIELDS[one_reason]
        if not diffs:
            reason_stat[f"[{reason}] 无差异"] += 1
            continue
        bad = [k for k in diffs if k not in allowed]
        if bad:
            unexpected.append((cid, reason, bad, diffs))
        reason_stat[f"[{reason}] 差异字段={diffs}"] += 1

    for line, n in reason_stat.most_common(20):
        print(f"   {n:4d} 例  {line}")

    if unexpected:
        print(f"\n   ✗ 申报段出现**申报形态之外**的差异 {len(unexpected)} 例"
              f"（{len(unexpected)} 处非柱字段变动）——这是真 bug，不是历书来源差异：")
        for cid, reason, bad, diffs in unexpected[:10]:
            print(f"      {cid}  [{reason}] 意外字段={bad} 全部差异={diffs}")
        return 2

    print("\n   ✓ 申报段差异全部落在柱字段上，与申报形态相符")
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""`bazi_fortune.js::pyRound` 必须与 python 内置 `round(x, nd)` **逐位相同**。

为什么值得单写一个模糊测试：八字里 4 处 `round(` 全部落在它身上
（起运岁数 `round(age,2)`、大运首尾 `round(x,1)`），而这些是**用户能看到的字段**
（"X 岁起运"）。第一版实现按「`x*10^nd` 取整比较」写，实测约 11% 的大运首尾岁数
与 shushu 差 0.1 岁，且偏的方向两边都有 —— 肉眼看不出来，只有逐位比才拦得住。

比的是 **IEEE754 位模式**（16 位十六进制），不是十进制打印：后者会把 -0 印成 0、
也会把相邻的两个 double 印成同一个串，那样"相同"就可能是假的。

样本集要能真的打到边界：
  ① `k/100` 全域（2 位小数，正是 `age` 的全部形态）
  ② 精确的 `.x5` 值（半值取偶只在**真值正好**是半值时触发；这些是最近的候选）
  ③ 随机 double（含跨数量级）
  ④ 金标准里**真实出现**的 raw 起运岁数（对面真的会遇到的输入）
  ⑤ 病态值：次正规、极大极小、±0、整数
  ⑥ `nd = 0`（`_dayun_start_age` 的回退分支与 `floor` 语义相邻，一并钉住）

用法：python3 duipan/fuzz_pyround.py
退出码：0 = 逐位全同。
"""

from __future__ import annotations

import json
import random
import struct
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def hexbits(v: float) -> str:
    return struct.pack(">d", v).hex()


def gen():
    rng = random.Random(20260925)          # 固定种子：失败必须可复现
    vals = []

    # ① k/100 全域（-1000.00 ~ 1000.00，覆盖岁数的实际量程并留余量）
    vals += [k / 100 for k in range(-100_000, 100_001, 1)]

    # ② 精确 .x5（半值候选）：k/10 + 0.05
    vals += [k / 10 + 0.05 for k in range(-1000, 1001)]

    # ③ 随机 double，跨数量级
    for _ in range(60_000):
        vals.append(rng.uniform(-200, 200))
    for _ in range(20_000):
        vals.append(rng.uniform(-1, 1) * 10 ** rng.randint(-8, 8))

    # ④ 金标准里真实的 raw 起运岁数（对面真会遇到）
    gs = HERE / "golden_bazi_start.json"
    if gs.exists():
        for st in json.loads(gs.read_text(encoding="utf-8")).values():
            if st.get("raw") is not None:
                vals.append(st["raw"])

    # ⑤ 病态值
    vals += [0.0, -0.0, 1.0, -1.0, 2.5, -2.5, 0.5, 1.5, 2.5, 3.5, 4.5,
             5e-324, -5e-324, 1e-308, 1.7976931348623157e308, 1e15, -1e15,
             2 ** 52, 2 ** 52 + 2.0, 0.1, 0.2, 0.3, 1 / 3, 2.675, 8.35, 0.95, 10.95]

    # ⑥ 打印用的十进制字面量再解析一遍（float 往返）
    for _ in range(20_000):
        vals.append(float(f"{rng.uniform(-200, 200):.17g}"))

    cases = [(v, nd) for v in vals for nd in (0, 1, 2)]
    return cases


def main() -> int:
    cases = gen()
    print(f"样本 {len(cases)} 例（{len(cases) // 3} 个值 × nd∈{{0,1,2}}）")
    print("  pyRound  = build/backend/paipan/bazi_fortune.js::pyRound")
    print("  round    = python 内置（shushu 用的是它）")
    print()

    payload = json.dumps([[x, nd] for x, nd in cases])
    r = subprocess.run(["node", str(HERE / "run_fuzz_pyround.js")],
                       input=payload, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr.strip()[:2000])
        return 2
    got = json.loads(r.stdout)
    if len(got) != len(cases):
        print(f"✗ JS 侧返回 {len(got)} 个，期望 {len(cases)} 个")
        return 2

    bad = []
    for (x, nd), g in zip(cases, got):
        want = hexbits(round(x, nd))
        if g != want:
            bad.append((x, nd, g, want, round(x, nd)))

    if bad:
        print(f"✗ {len(bad)} / {len(cases)} 例不同（逐位）—— pyRound 不能替代 python `round`：")
        for x, nd, g, w, pv in bad[:12]:
            gv = struct.unpack(">d", bytes.fromhex(g))[0]
            print(f"    x={x!r} nd={nd}  pyRound={gv!r}  round={pv!r}")
        return 2

    print(f"✓ {len(cases)} 例**逐位全同**（含 {sum(1 for v, nd in cases if nd == 1)} 个 nd=1、"
          f"{sum(1 for v, nd in cases if nd == 2)} 个 nd=2）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""探针：`_build_interpret_prompt`（bazi 支）在真实盘上**哪些段被 except 吞掉了**。

为什么要单独探一次：那七处 `try/except` 各自只写一行 `log_failure`，**吞掉之后
产物里只会「少一段」** —— 少了哪一段、为什么少，从产物上是看不出来的，
而「基准会抛的地方移植侧必须也抛」是本项目的移植铁律（异常改变控制流）。
`log_failure` 是**调用时**才 `from core.log import log_failure` 的，故替换模块属性
即可拿到完整 traceback。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python probe_bazi_prompt_swallow.py [生辰序号…]
"""
from __future__ import annotations

import sys
import traceback

HERE_PATH = __file__.rsplit("/", 1)[0]
sys.path.insert(0, HERE_PATH)

import gen_golden_bazi_prompt as G            # noqa: E402  （它有 RAG 假模块与注入逻辑）

import core.log as LOG                        # noqa: E402

_sink = []


def _loud(module, what, e):
    _sink.append((what, e, traceback.format_exc()))


LOG.log_failure = _loud


def one(seq):
    b, expect_gz = G.births()[seq]
    chart, gz = G.run_birth(b, G.moments()[seq % 16], expect_gz)
    segs = {}
    for ti, tab in enumerate(G.TABS):
        _sink.clear()
        G._RAG_TEXT[0] = G.RAGS[ti % len(G.RAGS)]
        p = G._build_interpret_prompt("bazi", G._clone(chart), G.QUESTIONS[ti % 4], tab)
        segs[tab] = (len(p), [w for w, _, _ in _sink])
        for what, e, tb in _sink:
            head = [ln for ln in tb.splitlines() if "api/agent.py" in ln]
            print(f"  ⚠ tab={tab!r} 抛：{type(e).__name__}: {e}")
            print(f"     {head[-1].strip() if head else '<无 agent.py 帧>'}")
    print(f"生辰 {seq} {b} → {gz}")
    for tab, (n, warns) in segs.items():
        print(f"   tab={tab!r:<12} prompt {n:>5} 字  ①吞掉 {len(warns)} 段"
              + (f"（{', '.join(warns)}）" if warns else ""))
    for hit in ("【地支刑冲合害】", "【特殊格局深度识别】", "【格局成破评断】",
                "【神煞组合】", "【命局总论", "专项分析"):
        got = sum(1 for tab in G.TABS
                  if hit in G._build_interpret_prompt(
                      "bazi", G._clone(chart), "", tab))
        print(f"   · 各种 tab 里含「{hit}」的：{got}/{len(G.TABS)}")


if __name__ == "__main__":
    for s in ([int(x) for x in sys.argv[1:]] or [0, 1, 2, 3, 20, 51]):
        one(s)

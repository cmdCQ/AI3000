# -*- coding: utf-8 -*-
"""对拍 · 用神层申报偏差的**共用判据**（层 6a / 6b 都用）。

为什么单列一个模块：申报偏差最怕「按跑出来的差异反向拟合白名单」——
那样白名单会随 bug 一起漂移，看着全绿其实什么都没验。
所以判据必须**独立于实跑差异**，只由 shushu 自己的取法推出：
「shushu 按它的算法**注定取不到**用神五行」才算申报，其余一律算未申报差异。

shushu 取不到用神五行只有两条路（见 build/backend/paipan/yongshen.js 的
`resolveYongShen` 注）：
  ① 用神是位置名（世爻/应爻）—— it 只按六亲名找爻
  ② 用神是六亲名但**不上卦** —— it 只在已现身的爻里反查
其余情形（用神在卦中显象）shushu 能取到，故**不许**申报，出现差异就是 bug。
"""
from __future__ import annotations

import sys

sys.path.insert(0, "/home/cqsomt/Projects/shushu")
from core.liuyao.interpreter import get_yong_shen                        # noqa: E402

# 用神五行取不到时，`analyze_liuyao_deep_relations` 里恒空的 10 条路径（相对前缀）
YONG_PATHS = [
    "yong_yuan_ji_chou.用神_wx", "yong_yuan_ji_chou.原神_wx",
    "yong_yuan_ji_chou.忌神_wx", "yong_yuan_ji_chou.仇神_wx",
    "yong_yuan_ji_chou.食神_wx",
    "summary",
    "key_lines.用神_lines", "key_lines.原神_lines",
    "key_lines.忌神_lines", "key_lines.仇神_lines",
]

REASON_POS = ("用神为位置名（世爻/应爻）：shushu 的 analyze_liuyao_deep_relations "
              "只按六亲名找爻，此三块恒空；ai3000 把位置名解析成该爻五行后传入"
              "（build/backend/paipan/yongshen.js 注 a）。"
              "金标准侧为空是 shushu 的取法缺口，非取值分歧。")

REASON_ABSENT = ("用神六亲不上卦：shushu 只在已现身的爻里反查用神五行，取不到；"
                 "ai3000 改由「宫五行反读六亲」定其五行（六亲↔五行在固定宫下是"
                 "一一对应，即 getLiuQin 那张表倒读，与伏神的五行同源）。"
                 "金标准侧为空是 shushu 的取法缺口，非取值分歧。")


def shushu_unresolved(topic: str, gender: str, proxy: bool, liu_qins) -> str:
    """shushu 是否**注定**取不到该例的用神五行？是则返回申报理由，否则返回空串。"""
    names = get_yong_shen(topic, gender, proxy) or ["世爻"]
    primary = names[0]
    if primary in ("世爻", "应爻"):
        return REASON_POS
    if primary not in set(liu_qins):
        return REASON_ABSENT
    return ""


def declare(allow: dict, cid: str, reason: str, prefix: str = "") -> None:
    """把该例的 10 条路径写进申报表。prefix 形如 `deep_relations.`。"""
    if not reason:
        return
    for p in YONG_PATHS:
        allow[f"{cid}.{prefix}{p}"] = reason

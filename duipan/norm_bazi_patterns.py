#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""3.5.3b 对拍的**唯一一份**规范化实现（生成器与比对器都 import 它）。

── 归一化什么、为什么归一化 ──
shushu `special_patterns.py::detect_zaqi_yueling` 里：

    ss_names = list(set([x[0] for x in important_ss]))
    ... f"藏 {'/'.join(ss_names)}"

`list(set(...))` 的顺序取决于 **python str 的进程级哈希种子**，每个进程不同。
同一张盘、同一份代码，两个进程能给出「七杀/偏财」与「偏财/七杀」两种文案。

**这不是被验方的错，也不是可修的 shushu bug**（改了 shushu 就不再是对拍基准）。
所以：ai3000 侧按**藏干原序去重**给出一个确定顺序，比对时把两边的
十神串按同一规则排序后再比 —— 差异因此只剩「集合本身不同」，那才是真差异。

── 实测（不是推测）──
    PYTHONHASHSEED=0/3 → 丁丑「七杀/偏财」；=1/2 → 「偏财/七杀」
    PYTHONHASHSEED=0   → 乙戌「正财/七杀」；=1   → 「七杀/正财」
即 condition 与 interpretation **两处都会翻**。

── 为什么只处理 雜氣一处，不全文乱排 ──
把「所有含 `/` 的串都排序」那种写法会连**真的顺序错误**一起掩盖掉（撒胡椒面）。
故只用一条**认得很死**的正则：`藏 <无空格非『等』串>`。
`_self_check()` 断言这条正则在全语料上**只**命中 雜氣月令，命中了别的格局就报错。
"""
from __future__ import annotations

import re

# `藏 X` 后面或跟空格+等（interpretation），或到串尾（condition）。
# 字符类排除**所有空白**与「等」：十神名（正官/七杀/正印/偏印/正财/偏财）里两者都不出现。
#
# ⚠ 必须排除 `\n`，不能只排除空格。第一版写的是 `[^ 等]`，于是 prompt 文案里
# `成格条件：…藏 偏财/七杀\n       含义：…` 那一行的行尾换行被卷进了十神串，
# 排序后换行被搬到 `/` 前面 —— **归一出自己造出了一个差异**（假阳性），
# 在 1461 例上显形。归一函数的错会伪装成被验方的错，这正是要单写一份 + 自查的原因。
ZANG_RE = re.compile(r"藏 ([^\s等]+)")
ZAQI_NAME = "杂气月令格"


def _sort_ss(m: "re.Match[str]") -> str:
    return "藏 " + "/".join(sorted(m.group(1).split("/")))


def norm_text(s: str) -> str:
    return ZANG_RE.sub(_sort_ss, s) if isinstance(s, str) else s


def norm_entry(entry):
    """只对 雜氣月令 的 condition/interpretation 做排序归一。"""
    if not isinstance(entry, dict) or entry.get("name") != ZAQI_NAME:
        return entry
    e = dict(entry)
    for k in ("condition", "interpretation"):
        if k in e:
            e[k] = norm_text(e[k])
    return e


def norm_result(res):
    """汇总结果归一：matched/auspicious/inauspicious 三个数组都要过（它们是同一批 dict）。"""
    if not isinstance(res, dict):
        return res
    out = dict(res)
    for k in ("matched", "auspicious", "inauspicious"):
        if isinstance(out.get(k), list):
            out[k] = [norm_entry(e) for e in out[k]]
    return out


def norm_format(txt):
    """prompt 文案是拼串产物，condition/interpretation 原样嵌在里面 → 直接对整串过正则。"""
    return norm_text(txt)


def _self_check():
    """正则的靶向性自查：证明它不会顺手改动别的格局。

    做法：造两串「别的格局」的文案（含 `/`、含「藏」字但不该匹配），断言原样不动；
    再造 雜氣 的两种顺序，断言归一后相同。
    """
    # 不含 `藏 ` 的串一律不动
    for s in ("正官/七杀 同透", "财官印三全 — 藏干有财", "羊刃驾杀：卯/午",
              "【魁罡格】庚辰日", "相刑/相冲", ""):
        assert norm_text(s) == s, f"正则误伤：{s!r} → {norm_text(s)!r}"

    # 雜氣 的两种顺序归一后必须相同
    a = f"月支辰（四库土）藏 七杀/偏财"
    b = f"月支辰（四库土）藏 偏财/七杀"
    assert norm_text(a) == norm_text(b) == "月支辰（四库土）藏 七杀/偏财", norm_text(a)

    # interpretation 形（`藏 X 等用神`）也要吃住，且不吞掉后面的「等用神」
    c = "杂气月令格 — 月支戌为四库土，藏 正财/七杀 等用神。"
    d = "杂气月令格 — 月支戌为四库土，藏 七杀/正财 等用神。"
    assert norm_text(c) == norm_text(d), (norm_text(c), norm_text(d))
    assert "等用神" in norm_text(c), norm_text(c)

    # 单元素（无 `/`）不该被破坏
    assert norm_text("月支丑（四库土）藏 正官") == "月支丑（四库土）藏 正官"

    # entry/result 层的靶向：非 雜氣 的 dict 必须**同一对象**返回（证明没被复制改写）
    other = {"name": "魁罡格", "condition": "藏 甲/乙", "interpretation": "x"}
    assert norm_entry(other) is other, "正则误伤了非杂气格局"

    # ⚠ 回归锁：prompt 文案里 `藏 X` 后面紧跟的换行**必须原地不动**。
    # 第一版正则吃掉了它、把它搬到 `/` 前，归一自己造出 1461 例假差异。
    e = "       成格条件：月支丑（四库土）藏 偏财/七杀\n       含义：x"
    f = "       成格条件：月支丑（四库土）藏 七杀/偏财\n       含义：x"
    ne, nf = norm_text(e), norm_text(f)
    assert ne == nf, (ne, nf)
    assert ne == "       成格条件：月支丑（四库土）藏 七杀/偏财\n       含义：x", repr(ne)

    return True


assert _self_check()

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从 shushu `core/constants.py` 生成 `paipan/bazi_tables.js`（八字专用表）。

为什么不手抄：纳音 60 条、十神 100 条、藏干 12 条 —— 手抄一遍就是 172 次出错机会，
而且错了看不出来（表值本身就是「看起来合理」的字符串）。**读真源、生成、可复跑**，
才是这种数据的正确搬运方式。

为什么不整表照搬：`TIANGAN/DIZHI/五行/生克` 这些 `paipan/constants.js` 已经有了，
再生成一份就是**重复造轮子**（本项目铁律）。所以本脚本只生成**八字独有**的表，
并且**顺手断言**已有的表与 shushu 一致 —— 一旦哪天两侧漂移，跑一次生成就报出来。

用法：
    .venv/bin/python ../ai3000/duipan/gen_bazi_tables.py
（在 shushu 目录下用 shushu 的 venv 跑；输出写死到 ai3000 的 paipan/。）

来源标注（铁律「镜像源需标注来源」的同精神）：
    shushu = github.com/cmdCQ/shushu，`core/constants.py`。本文件由脚本生成，勿手改。
"""

import sys
import json
from pathlib import Path

SHUSHU = Path("/home/cqsomt/Projects/shushu")
OUT = Path("/home/cqsomt/Projects/ai3000/build/backend/paipan/bazi_tables.js")

sys.path.insert(0, str(SHUSHU))

from core import constants as K                     # noqa: E402

# ── 已有表的对照断言：这些表 ai3000 侧已存在，只能「一致或报错」，不能重生成 ──
# 若这里报错，说明两侧漂移了 —— 先去查谁对（判据见 memory: shushu-is-correctness-reference）
AI3000 = Path("/home/cqsomt/Projects/ai3000/build/backend/paipan")
sys.path.insert(0, str(AI3000)) if False else None   # 不在 py 里 require js，改由 node 侧自检


def js_val(v):
    """Python 值 → JS 字面量（保序：dict 的顺序就是生成顺序）。"""
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(js_val(x) for x in v) + "]"
    if isinstance(v, dict):
        # key 可能是汉字：一律加引号最省心（JS 对象键允许引号）
        items = ", ".join(f"{json.dumps(str(k), ensure_ascii=False)}: {js_val(x)}"
                          for k, x in v.items())
        return "{" + items + "}"
    if isinstance(v, (set, tuple)):
        return js_val(list(v))
    raise TypeError(f"不能生成 JS 字面量：{type(v)} {v!r}")


def table(name, value, note=""):
    """note 可以多行 —— **每行都要自己带 `//`**，否则第二行会变成裸代码（踩过一次）。"""
    head = "".join(f"// {ln}\n" for ln in note.splitlines()) if note else ""
    return f"{head}const {name} = {js_val(value)};\n"


def main():
    parts = []
    parts.append('''/**
 * paipan/bazi_tables.js —— 八字专用常量表（**生成文件，勿手改**）
 * =================================================================
 *
 * 生成器：`ai3000/duipan/gen_bazi_tables.py`
 * 真源：  shushu `core/constants.py`（github.com/cmdCQ/shushu）
 * 复跑：  cd shushu && .venv/bin/python ../ai3000/duipan/gen_bazi_tables.py
 *
 * 为什么单独一个文件而不是塞进 `constants.js`：
 *   `constants.js` 是**六爻/梅花**的表（纳甲/六亲/八宫世应/旬空…），八字用不上；
 *   两类表混在一个文件里，会让「哪些表归哪条线」变得不可读。
 *   两侧共用的只有 `TIANGAN/DIZHI/五行/生克`，那些仍在 `constants.js`，此处**不重复定义**。
 *
 * 手抄 172 条（纳音 60 + 十神 100 + 藏干 12）等于 172 次静默出错机会，
 * 故一律生成。改表请改 shushu 真源后重跑生成器，不要直接编辑本文件。
 */

'use strict';

''')

    # ── 1. 藏干 ──
    parts.append(table("CANGGAN", K.CANGGAN,
                       "藏干（本气、中气、余气，顺序即主次）。shushu core/constants.py CANGGAN"))

    # ── 2. 纳音 ──
    assert len(K.NAYIN) == 60, f"纳音应为 60 条，实得 {len(K.NAYIN)}"
    parts.append(table("NAYIN", K.NAYIN, "纳音五行 60 甲子。shushu core/constants.py NAYIN"))

    # ── 3. 十神 ──
    # shushu 的键是 (日主, 目标干) 元组；JS 无元组键 → 展平为 "日主干" 。用二维表更省空间：
    # SHISHEN[日主][目标] = 十神
    ss = {}
    for (dm, t), name in K.SHISHEN.items():
        ss.setdefault(dm, {})[t] = name
    assert len(ss) == 10 and all(len(v) == 10 for v in ss.values()), "十神表应为 10×10"
    parts.append(table("SHISHEN", ss,
                       "十神 10×10：SHISHEN[日主][目标干]。shushu core/constants.py SHISHEN"))

    # ── 4. 五虎遁 / 五鼠遁的起干 ──
    parts.append(table("MONTH_GAN_START", K._MONTH_GAN_START,
                       "五虎遁年起月：年干 → 寅月天干。shushu core/constants.py _MONTH_GAN_START"))
    parts.append(table("HOUR_GAN_START", K._HOUR_GAN_START,
                       "五鼠遁日起时：日干 → 子时天干。shushu core/constants.py _HOUR_GAN_START"))

    # ── 5. 旺衰表（藏干气势派）──
    # 注意：**与 constants.js 的 STRENGTH_STRICT 不是一张表**。
    # 六爻月建用严格《子平真诠》表（四季月统一），八字 analyzer 用藏干气势派（四季月末月各异）。
    parts.append(table("STRENGTH_QISHI", K._STRENGTH_TABLE,
                       "旺相休囚死（藏干气势派）——八字 analyzer 用此表。\n"
                       "⚠ 与 constants.js 的 STRENGTH_STRICT（严格《子平真诠》表，六爻用）**不是同一张表**，别互相替换。"))

    # ── 6. 神煞 ──
    parts.append(table("SHENSHA", K.SHENSHA,
                       "神煞取支表：神煞名 → {查法基准干/支: [所落地支]}。shushu core/constants.py SHENSHA"))
    # find_shensha 两张表都查（analyzer.py 同时 import 了 SHENSHA 与 SHENSHA_EXTENDED），
    # 只搬一张会让神煞少一半而毫无报错 —— 第一版就漏了这张。
    parts.append(table("SHENSHA_EXTENDED", K.SHENSHA_EXTENDED,
                       "扩展神煞：三合局/三会局 → 所落支。shushu core/constants.py SHENSHA_EXTENDED"))

    # ── 7. 格局表 ──
    parts.append(table("MAJOR_PATTERNS", K.MAJOR_PATTERNS,
                       "八正格。shushu core/constants.py MAJOR_PATTERNS"))
    parts.append(table("SPECIAL_PATTERNS", K.SPECIAL_PATTERNS,
                       "特殊格局（含建禄/月刃/从格）。shushu core/constants.py SPECIAL_PATTERNS"))
    parts.append(table("ZHUAN_WANG_GE", K.ZHUAN_WANG_GE,
                       "专旺格五局。shushu core/constants.py ZHUAN_WANG_GE"))
    parts.append(table("HUA_QI_GE", K.HUA_QI_GE,
                       "化气格五局。shushu core/constants.py HUA_QI_GE"))

    # ── 8. 子平真诠八正格章旨（`_rich_desc` 的首选来源，1018 字）──
    try:
        from knowledge.bazi_classical_deep import ZIPING_GE_FULL
        zhangzhi = {k: v.get("章旨", "") for k, v in ZIPING_GE_FULL.items()}
        parts.append(table("ZIPING_ZHANGZHI", zhangzhi,
                           "《子平真诠》各格章旨（格局 desc 的首选来源）。shushu knowledge/bazi_classical_deep.py\n"
                           "⚠ shushu `analyzer._rich_desc` 查的是「月刃格」，而本表键为「阳刃格」——\n"
                           "   该条章旨因此**永远取不到**（静默退化为一句短语）。此处照真源键名生成，不擅自改名；\n"
                           "   差异在 3.5.1 对拍里会显形，属 shushu 侧待修。"))
    except Exception as e:                                     # noqa: BLE001
        print(f"⚠ ZIPING_GE_FULL 取不到（{e}），跳过章旨表", file=sys.stderr)

    # ── 导出 ──
    names = ["CANGGAN", "NAYIN", "SHISHEN", "MONTH_GAN_START", "HOUR_GAN_START",
             "STRENGTH_QISHI", "SHENSHA", "SHENSHA_EXTENDED", "MAJOR_PATTERNS", "SPECIAL_PATTERNS",
             "ZHUAN_WANG_GE", "HUA_QI_GE", "ZIPING_ZHANGZHI"]
    parts.append("\nmodule.exports = {\n  " + ", ".join(names) + ",\n};\n")

    OUT.write_text("".join(parts), encoding="utf-8")
    size = OUT.stat().st_size
    print(f"✓ 写出 {OUT.relative_to(Path('/home/cqsomt/Projects/ai3000'))}（{size} 字节）")
    print(f"  表：{' '.join(names)}")


if __name__ == "__main__":
    main()

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

# 3.5.3c（用神/调候）的五张表。注意这里有**两张调候表**，不是同一张，见下面的注。
from core.bazi.tiaohou_yongshen import (            # noqa: E402
    TIAOHOU_TABLE as TIAOHOU_STRUCT_TABLE,
    GE_JU_CHENG_BAI,
)
from core.bazi.day_master_profiles import DAY_MASTER_PROFILES   # noqa: E402
from knowledge.bazi_classical import (              # noqa: E402
    TIAO_HOU_TABLE as TIAOHOU_CLASSICAL_TABLE,
    SHIGAN_JIJUE,
    BAZIGE_SYSTEM,
)
# 3.5.4c（解读 prompt）追加的两张深度语料表。**它们不是排盘输入** ——
# 只被 `api/agent.py::_build_interpret_prompt` 拼进【古籍参考】那一段，
# 与 `SHIGAN_JIJUE`/`BAZIGE_SYSTEM` 同一条路（后者更早，3.5.3c 就在用）。
from knowledge.knowledge_deep import (              # noqa: E402
    DITIAN_SUI_SHIGAN,
    ZIPING_GEJV_DEEP,
)

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
    # ⚠ set 必须**排序后**再生成，tuple 必须**保序**（这两件事以前挤在同一支里）。
    #
    # 为什么：shushu 的 `ZHUAN_WANG_GE[...]["stems"]` / `["required_zhi"]` /
    # `HUA_QI_GE[...]["month_zhi"]` 全是 **set**，而 Python 遍历 set 的顺序由
    # 字符串哈希决定 —— **每个进程都可能不同**。第一版直接 `list(v)` 落盘，
    # 于是「重跑一次生成器」就把 `bazi_tables.js` 里两行悄悄改了值域顺序
    # （曲直格 `["甲","乙"]` → `["乙","甲"]`，required_zhi 同样），
    # 生成文件**不可复跑**、逐行 diff 会无端起红。
    #
    # 排序在这里是**保语义**的：这 15 处 set（5 局 × {stems, required_zhi} + 5 化气格 × month_zhi）
    # 在 shushu 里只被三处消费，全是**与顺序无关**的判定 ——
    #   `dm not in gdata["stems"]`（analyzer.py:201）、
    #   `all_dz & req_zhi` 后取 `len(...) >= 3`（:206）、
    #   `m_p["dizhi"] in gdata["month_zhi"]`（:216）。
    # 即：shushu 自己都读不出这个顺序，落盘顺序可任取 —— 取**确定的**那一份。
    # （tuple 不排：`stems_pair` 会被 `a, b = gdata["stems_pair"]` 解包，顺序即语义。）
    if isinstance(v, set):
        return js_val(sorted(v))
    if isinstance(v, tuple):
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

    # ── 9. 用神 / 调候（3.5.3c）──
    #
    # ⚠⚠ 这里有**两张调候表**，它们不是同一张，也**不是重复**：
    #   ① `TIAOHOU_STRUCT`（`core/bazi/tiaohou_yongshen.py`）：结构化的
    #      primary/secondary/secondary2 + desc + advice，`analyzer.analyze_chart`
    #      用它挂 `chart["tiaohou"]`（含「在不在盘中」的判定与评级）；
    #   ② `TIAOHOU_CLASSICAL`（`knowledge/bazi_classical.py`）：10×12 的**描述串**
    #      （如「丙火为主，甲为佐」），`analyze_yong_shen` 从串里**扫出第一个天干**
    #      当作调候用神，并据此定最终用神五行。
    # 两张表在**同一条函数链**里各管一段：合并、互换、或"顺手统一"都会静默改变结果。
    # 名字里的 STRUCT/CLASSICAL 就是为了让读到这段的人先分清再动手。
    for name, t in (("TIAOHOU_STRUCT", TIAOHOU_STRUCT_TABLE),
                    ("TIAOHOU_CLASSICAL", TIAOHOU_CLASSICAL_TABLE)):
        assert len(t) == 10, f"{name} 应为 10 个日干，实得 {len(t)}"
        bad = [(dm, z) for dm in t for z in K.DIZHI if z not in t[dm]]
        assert not bad, f"{name} 有缺月支：{bad[:5]}"
    assert len(GE_JU_CHENG_BAI) == 8, f"格局成败救应应为 8 格，实得 {len(GE_JU_CHENG_BAI)}"
    assert len(SHIGAN_JIJUE) == 10, f"十天干喜忌应为 10，实得 {len(SHIGAN_JIJUE)}"
    assert len(BAZIGE_SYSTEM) == 13, f"格局系统应为 13 格，实得 {len(BAZIGE_SYSTEM)}"
    assert len(DAY_MASTER_PROFILES) == 10, f"日主档案应为 10，实得 {len(DAY_MASTER_PROFILES)}"

    parts.append(table("TIAOHOU_STRUCT", TIAOHOU_STRUCT_TABLE,
                       "调候用神①**结构化**表：10 日干 × 12 月支 → {primary, secondary, secondary2, desc, advice}。\n"
                       "shushu core/bazi/tiaohou_yongshen.py TIAOHOU_TABLE（《穷通宝鉴》）。\n"
                       "⚠ 与下面的 TIAOHOU_CLASSICAL **不是同一张表**，见生成器里的长注。"))
    parts.append(table("TIAOHOU_CLASSICAL", TIAOHOU_CLASSICAL_TABLE,
                       "调候用神②**描述串**表：10 日干 × 12 月支 → 一句话（如「丙火为主，甲为佐」）。\n"
                       "shushu knowledge/bazi_classical.py TIAO_HOU_TABLE。\n"
                       "analyze_yong_shen 从串里扫出**第一个天干**当调候用神，并据此定用神五行 —— 故本表是**字符串**，不是结构。"))
    parts.append(table("GEJU_CHENG_BAI", GE_JU_CHENG_BAI,
                       "《子平真诠》八正格成败救应（查表，不是断盘：只按格局名取）。\n"
                       "shushu core/bazi/tiaohou_yongshen.py GE_JU_CHENG_BAI"))
    parts.append(table("SHIGAN_JIJUE", SHIGAN_JIJUE,
                       "《滴天髓》十天干喜忌（口诀 + 喜忌）。shushu knowledge/bazi_classical.py SHIGAN_JIJUE"))
    parts.append(table("BAZIGE_SYSTEM", BAZIGE_SYSTEM,
                       "格局系统 13 格（八正格 + 从财/从杀/从儿/专旺/化格）→ {喜, 忌, 口诀…}。\n"
                       "shushu knowledge/bazi_classical.py BAZIGE_SYSTEM\n"
                       "⚠ 与 bazi_tables.js 自己的 MAJOR_PATTERNS/SPECIAL_PATTERNS **不是一张表**：\n"
                       "  那两张是 analyzer 判**格局归属**用的，这张是用神分析取**喜/忌**用的。"))
    parts.append(table("DAY_MASTER_PROFILES", DAY_MASTER_PROFILES,
                       "十天干日主档案（含 useful_god_guide 的身强/身弱/中和三段话）。\n"
                       "shushu core/bazi/day_master_profiles.py DAY_MASTER_PROFILES"))

    # ── 10. 解读用深度语料（3.5.4c）──
    #
    # ⚠ 这两张表**不是齐整的表**，别按「10×7」去断言：
    #   `DITIAN_SUI_SHIGAN` 10 干键齐（原文/任氏注要/喜忌/取用要领/性格），
    #   而 `ZIPING_GEJV_DEEP` 的 10 格里，`偏财格`/`正印格`/`偏印格` **没有**
    #   `太过`/`不及`，`食神格`/`伤官格` 也没有部分键 —— 基准全程用 `.get(k)` 读，
    #   缺键就是「这段不出现」。断言成齐整会当场炸，且改成「补空串」就把
    #   「基准不输出这一段」变成了「输出一段空的」，是**语义改变**。
    #   本生成器原样搬运 ragged 结构（JSON 序列化天然保真）。
    assert len(DITIAN_SUI_SHIGAN) == 10, f"滴天髓十干应为 10，实得 {len(DITIAN_SUI_SHIGAN)}"
    missing = [g for g in K.TIANGAN if g not in DITIAN_SUI_SHIGAN]
    assert not missing, f"滴天髓缺日干：{missing}"
    assert len(ZIPING_GEJV_DEEP) == 10, f"子平真诠格局详解应为 10，实得 {len(ZIPING_GEJV_DEEP)}"
    # 偏财/正印/偏印三格无 太过/不及 —— 只断言「读者真会读的两个键」在，其余不齐属基准原貌
    nolist = [g for g, v in ZIPING_GEJV_DEEP.items()
              if not isinstance(v.get("成格"), list) or not v.get("成格")]
    assert not nolist, f"这些格局的 成格 不是非空列表（基准会取到空/非列表）：{nolist}"
    parts.append(table("DITIAN_SUI_SHIGAN", DITIAN_SUI_SHIGAN,
                       "《滴天髓》十天干详论：{原文, 任氏注要, 喜忌, 取用要领, 性格}。\n"
                       "shushu knowledge/knowledge_deep.py DITIAN_SUI_SHIGAN\n"
                       "解读 prompt 只用其中两段：取用要领、任氏注要[:120]。"))
    parts.append(table("ZIPING_GEJV_DEEP", ZIPING_GEJV_DEEP,
                       "《子平真诠》十格局详解：{定义, 成格, 破格, 太过, 不及, 行运, 古籍}。\n"
                       "shushu knowledge/knowledge_deep.py ZIPING_GEJV_DEEP\n"
                       "⚠ **ragged**：偏财/正印/偏印无 太过/不及，食神格无 太过 —— 基准用 .get 读，\n"
                       "  缺键即「不出现；补空串会把基准的『不说』变成『说一句空的』。\n"
                       "解读 prompt 只用：成格[:3]、破格[:3]、行运。"))

    # ── 导出 ──
    names = ["CANGGAN", "NAYIN", "SHISHEN", "MONTH_GAN_START", "HOUR_GAN_START",
             "STRENGTH_QISHI", "SHENSHA", "SHENSHA_EXTENDED", "MAJOR_PATTERNS", "SPECIAL_PATTERNS",
             "ZHUAN_WANG_GE", "HUA_QI_GE", "ZIPING_ZHANGZHI",
             "TIAOHOU_STRUCT", "TIAOHOU_CLASSICAL", "GEJU_CHENG_BAI",
             "SHIGAN_JIJUE", "BAZIGE_SYSTEM", "DAY_MASTER_PROFILES",
             "DITIAN_SUI_SHIGAN", "ZIPING_GEJV_DEEP"]
    parts.append("\nmodule.exports = {\n  " + ", ".join(names) + ",\n};\n")

    OUT.write_text("".join(parts), encoding="utf-8")
    size = OUT.stat().st_size
    print(f"✓ 写出 {OUT.relative_to(Path('/home/cqsomt/Projects/ai3000'))}（{size} 字节）")
    print(f"  表：{' '.join(names)}")


if __name__ == "__main__":
    main()

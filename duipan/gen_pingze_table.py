#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
生成 `build/backend/paipan/pingze.js`（梅花「字占」四字以上的取数表）+ 冻结夹具。

## 为什么要这张表

《梅花易数·字占》原文：「四字以上，不必数画数，只以平仄声音调之。平声为一数，上声为
二数，去声为三数，入声为四数。」——**四字以上的取数来自读音，不来自笔画**。
读音表在本仓与 shushu 里都不存在，故必须新建一张。

## 音系怎么定的（这一步最容易搞错，写明白）

**不是**平水韵的中古四声，而是「**现代普通话读音为底 + 古入声字覆写为 4**」。判据是原文
自带的验算例（「今日动静如何」，见 `verify_meihua_zishan.js` 头注）：
  · 原文把「动」「静」算**去声**（3）—— 这两个字中古是**浊上声**，平水韵会算成上声（2）；
    它们的今音 dòng/jìng 本来就是去声（浊上归去已固化在现代读音里，故不需要中古声母数据）
  · 原文把「日」算**入声**（4）—— 今音 rì 是去声，只有「入声字表覆写」才能给出 4
两者同时成立，只有「今音为底 + 入声覆写」这一种口径能做到；用平水韵中古四声得 7/4/…，
原文例当场红。

## 三条**约定**（原文没有规定，是本项目的取舍，别冒充古法）

1. **多音字：入声优先** —— 一个字只要在平水韵入声部里（如「易」「数」「不」），就取 4；
   否则按今音首读音折算。原文只给了单音字的例子，没有多音字的判例。
2. **今音取首读音**：`pinyin.txt` 一条里的第一个读音；若它只有轻声（无调号，如「们」
   「吗」「吧」的首读音），跳到该字第一个**带调**的读音。
3. **平水韵查不到的字**（表外字）按今音折算，明细里标「今音」；今音也查不到 → **拒收**
   （不猜。本仓两侧 docstring 都写了「宁可报错也不猜」）。

## 来源（三个，全部钉死版本；本仓铁律「镜像源需标注来源」）

| 用途 | 上游 | 协议 | 版本/分支 | 文件 |
|---|---|---|---|---|
| 入声字集 | github.com/rbnyng/pingshui_rhyme | MIT | main | pingshui_rhyme/data/organized_ping_ze_rhyme_dict.json |
| 今音调类 | github.com/mozillazg/pinyin-data | MIT | 0.15.0 | pinyin.txt |
| 繁→简 | github.com/BYVoid/OpenCC | Apache-2.0 | ver.1.1.7 | data/dictionary/TSCharacters.txt |

（`pingshui_rhyme` 的默认分支是 `main` 不是 `master` —— `codeload` 上拿 `master` 会 404。）

用法：
    python gen_pingze_table.py [--cache ~/.cache/ai3000-tables] [--force-download]
输出（两处，都是生成物）：
    build/backend/paipan/pingze.js      表本体（勿手改）
    duipan/frozen_pingshui_ru.txt       入聲部原文逐字副本（判据侧独立夹具，勿手改）
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JS = ROOT / "build" / "backend" / "paipan" / "pingze.js"
OUT_RU = Path(__file__).resolve().parent / "frozen_pingshui_ru.txt"

SOURCES = {
    "pingshui_organized.json": (
        "https://raw.githubusercontent.com/rbnyng/pingshui_rhyme/main/"
        "pingshui_rhyme/data/organized_ping_ze_rhyme_dict.json",
        "rbnyng/pingshui_rhyme main（MIT）",
    ),
    "pinyin_data_0.15.0.txt": (
        "https://raw.githubusercontent.com/mozillazg/pinyin-data/master/pinyin.txt",
        "mozillazg/pinyin-data 0.15.0（MIT）",
    ),
    "opencc_TSCharacters_1.1.7.txt": (
        "https://raw.githubusercontent.com/BYVoid/OpenCC/ver.1.1.7/"
        "data/dictionary/TSCharacters.txt",
        "BYVoid/OpenCC ver.1.1.7（Apache-2.0）",
    ),
}

# 带调元音 → 调类（1 阴平 2 阳平 3 上声 4 去声）。**显式列举**而不是靠 Unicode 分解：
# 分解会把 ü 的分音符也当成调号，且漏掉 m̀ 这类特殊音节。
TONE_MARKS = {
    "ā": 1, "á": 2, "ǎ": 3, "à": 4,
    "ē": 1, "é": 2, "ě": 3, "è": 4,
    "ī": 1, "í": 2, "ǐ": 3, "ì": 4,
    "ō": 1, "ó": 2, "ǒ": 3, "ò": 4,
    "ū": 1, "ú": 2, "ǔ": 3, "ù": 4,
    "ǖ": 1, "ǘ": 2, "ǚ": 3, "ǜ": 4,
    "ń": 2, "ň": 3, "ǹ": 4, "ḿ": 2,
}
# 调类 → 取数（平声为一数：阴平阳平都是平）
TONE_TO_COUNT = {1: 1, 2: 1, 3: 2, 4: 3}

# 少数读音把调号写成「字母 + 组合符」而不是预组合字符：欸 ê̄/ê̌、呣 m̀（上游原样如此）。
# 不认它就等于把这几个字当轻声丢掉 —— 所以显式认下来（生成器会报未识别字符，见 NO_TONE_LETTERS）。
COMBINING_TONE = {0x0304: 1, 0x030C: 3, 0x0300: 4, 0x0301: 2}   # ˉ ˇ ˋ ˊ

# 带变音符但**不是调号**的字母：ü/ê 在任何调里都长这样（ǖǘǚǜ 是调号形态，已在上表）。
# 不列在这里的变音字母一律算「不认识」→ 生成时报错（防我漏掉某个调号，见 verify 脚本的同类断言）。
NO_TONE_LETTERS = set("üÜêÊ")

HAN = re.compile(r"[㐀-䶿一-鿿]")


def fetch(cache: Path, name: str, force: bool) -> Path:
    url, _ = SOURCES[name]
    dst = cache / name
    if dst.exists() and not force:
        return dst
    cache.mkdir(parents=True, exist_ok=True)
    print(f"↓ 下载 {name} …")
    with urllib.request.urlopen(url, timeout=300) as r, dst.open("wb") as f:
        f.write(r.read())
    return dst


def load_ru(psy_path: Path) -> dict[str, str]:
    """入聲部：{韵部名: 字串}（原样，不做任何转换）。"""
    psy = json.loads(psy_path.read_text("utf-8"))
    ze = psy.get("ze") or {}
    parts = {k: v for k, v in ze.items() if "入" in k}
    if len(parts) != 1:
        raise SystemExit(f"✗ 预期 `ze` 下只有一个入声部，实得 {list(ze)}")
    out: dict[str, str] = {}
    for part, groups in parts.items():
        for gname, els in groups.items():
            s = "".join(els)
            if not s:
                raise SystemExit(f"✗ 韵部 {gname} 是空的")
            out[gname] = s
    return out


def load_ts(path: Path) -> dict[str, str]:
    """繁→简：{繁: 简简简}（OpenCC TSCharacters，一行一对）。"""
    m: dict[str, str] = {}
    for line in path.read_text("utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        p = line.split("\t")
        if len(p) >= 2:
            m[p[0]] = p[1]
    if len(m) < 3000:
        raise SystemExit(f"✗ 繁简表只有 {len(m)} 条，不像 TSCharacters")
    return m


def load_pinyin(path: Path) -> tuple[dict[str, list[str]], dict[str, int]]:
    """今音：{字: [读音,…]}（按上游原序，第一个是常用读音）。

    返回 (表, 未识别字符计数)。**未识别 = 带变音符但我们不认识的字母**（如 ê̄ 这种）。
    没调号的音节不算未识别（那是轻声，按约定跳过）。
    """
    out: dict[str, list[str]] = {}
    unparsed: dict[str, int] = {}
    for line in path.read_text("utf-8").splitlines():
        if not line.startswith("U+"):
            continue
        code, _, rest = line.partition(":")
        ch = chr(int(code[2:], 16))
        readings = [r.strip() for r in rest.split("#")[0].strip().split(",") if r.strip()]
        out[ch] = readings
        for r in readings:
            for c in r:
                if c in TONE_MARKS or c in NO_TONE_LETTERS or ord(c) in COMBINING_TONE:
                    continue
                if unicodedata.combining(c) or 0x00C0 <= ord(c) <= 0x024F:
                    unparsed[c] = unparsed.get(c, 0) + 1
    return out, unparsed


def tone_of(reading: str) -> int | None:
    """读音 → 调类；无调号（轻声）返回 None。"""
    for c in reading:
        if c in TONE_MARKS:
            return TONE_MARKS[c]
        if ord(c) in COMBINING_TONE:
            return COMBINING_TONE[ord(c)]
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=str(Path.home() / ".cache" / "ai3000-tables"))
    ap.add_argument("--force-download", action="store_true")
    args = ap.parse_args()
    cache = Path(args.cache)

    ru = load_ru(fetch(cache, "pingshui_organized.json", args.force_download))
    ts = load_ts(fetch(cache, "opencc_TSCharacters_1.1.7.txt", args.force_download))
    py, unparsed = load_pinyin(fetch(cache, "pinyin_data_0.15.0.txt", args.force_download))

    ru_chars = {c for s in ru.values() for c in s}
    if len(ru_chars) < 1500:
        raise SystemExit(f"✗ 入声字只解析出 {len(ru_chars)} 个，太少（上游结构变了？）")
    if unparsed:
        top = sorted(unparsed.items(), key=lambda kv: -kv[1])[:12]
        raise SystemExit(f"✗ 有 {len(unparsed)} 个变音字母没被 TONE_MARKS/NO_TONE_LETTERS 覆盖 "
                         f"（共 {sum(unparsed.values())} 次）：{top}\n"
                         "  补进 TONE_MARKS（若是调号）或 NO_TONE_LETTERS（若不是），再跑")

    # ── 取数：入声优先，其余按今音首读音（轻声跳过）────────────────
    count: dict[str, tuple[int, str]] = {}   # 字 → (取数, 来源)

    def put(ch: str, c: int, src: str) -> None:
        # 同一个字若两条路都到达（繁简合流），**入声优先**
        old = count.get(ch)
        if old and old[0] == 4:
            return
        count[ch] = (c, src)

    for t in ru_chars:
        put(t, 4, "入声")                      # 入声字本体（繁）
        for s in ts.get(t, ""):
            put(s, 4, "入声")                   # 及其简体形
    light = 0
    for ch, readings in py.items():
        if not HAN.match(ch):
            continue
        c = None
        for r in readings:
            t = tone_of(r)
            if t is not None:
                c = TONE_TO_COUNT[t]
                break
        if c is None:
            light += 1                          # 全轻声，取不到调类 → 不入表（起卦时拒收）
            continue
        put(ch, c, "入声" if count.get(ch, (None,))[0] == 4 else "今音")

    # ── 自检：原文①号例逐字复现（音系的唯一硬判据）──────────────────
    want = {"今": 1, "日": 4, "动": 3, "静": 3, "如": 1, "何": 1}
    got = {c: count.get(c, (None, "缺"))[0] for c in want}
    if got != want:
        raise SystemExit(f"✗ 原文例「今日动静如何」取数不符：期望 {want}，实得 {got}\n"
                         "  音系口径错了 —— 见本文件头注「音系怎么定的」")
    # 入声覆写的方向（正反各一组）
    must4 = "日月出入不一十白竹木六國國學業發吉"
    not4 = "天山水火土今如何动静"
    bad = [c for c in must4 if count.get(c, (None,))[0] != 4]
    bad += [c for c in not4 if count.get(c, (None,))[0] == 4]
    if bad:
        raise SystemExit(f"✗ 入声方向不对：{bad}")

    # ── 落盘：表 ────────────────────────────────────────────────
    by_count: dict[int, list[str]] = {1: [], 2: [], 3: [], 4: []}
    for ch, (c, _src) in count.items():
        by_count[c].append(ch)
    for k in by_count:
        by_count[k].sort()

    def js_str(s: str) -> str:
        return json.dumps(s, ensure_ascii=False)

    lines = [
        "/**",
        " * paipan/pingze.js —— 梅花「字占」四字以上的取数表（**生成文件，勿手改**）。",
        " *",
        " * 原文《梅花易数·字占》：「四字以上，不必数画数，只以平仄声音调之。平声为一数，",
        " * 上声为二数，去声为三数，入声为四数。」十一字以上不用本表（只按字数）。",
        " *",
        " * 口径 = **现代普通话读音为底 + 古入声字覆写为 4**。判据是原文自带的验算例",
        " * 「今日动静如何」：原文把「动」「静」算去声（中古浊上声 → 浊上归去已固化在今音里）、",
        " * 把「日」算入声（今音读去声，只有覆写才给得出 4）。用平水韵中古四声会得 7/4/…，",
        " * 与原文不符 —— 详见 duipan/gen_pingze_table.py 头注与 duipan/verify_meihua_zishan.js。",
        " *",
        " * 三条**约定**（原文没有规定，是本项目的取舍，别当成古法）：",
        " *   1) 多音字**入声优先**（在平水韵入声部里就取 4，如「易」「数」「不」）；",
        " *   2) 今音取首读音；首读音只有轻声的（们/吗/吧），跳到第一个**带调**的读音；",
        " *   3) 平水韵查不到的字按今音折算（明细里标「今音」）；今音也查不到 → 起卦时**拒收**，",
        " *      不猜。",
        " *",
        " * 来源（三份，均未改写；本项目铁律「镜像源需标注来源」）：",
        " *   入声字集  github.com/rbnyng/pingshui_rhyme（MIT，分支 main）",
        " *             pingshui_rhyme/data/organized_ping_ze_rhyme_dict.json 的「入聲部」",
        " *   今音调类  github.com/mozillazg/pinyin-data 0.15.0（MIT）pinyin.txt",
        " *   繁→简     github.com/BYVoid/OpenCC ver.1.1.7（Apache-2.0）",
        " *             data/dictionary/TSCharacters.txt",
        " *",
        " * 复跑： python duipan/gen_pingze_table.py        （缺缓存会自动下载；见 --cache/--force-download）",
        " *",
        f" * 统计：可定取数 {len(count)} 字 —— 平1 {len(by_count[1])} / 上2 {len(by_count[2])} /"
        f" 去3 {len(by_count[3])} / 入4 {len(by_count[4])}；"
        f"全轻声无调而拒收 {light} 字。",
        " *",
        " * 表形照 strokes.js 的老范式：按取数分档存**字串**（不是 {字:数} 的大对象），",
        " * 载入时建一次 Map。改这张表请改生成器，别手改这里。",
        " */",
        "'use strict';",
        "",
        "// 取数 → 字（同一档内按码位序，便于逐行 diff）",
        "const BY_COUNT = {",
    ]
    for k in (1, 2, 3, 4):
        lines.append(f"  {k}: {js_str(''.join(by_count[k]))},")
    lines += [
        "};",
        "",
        "// 字 → 取数（载入时建一次）",
        "const COUNT_OF = new Map();",
        "for (const k of Object.keys(BY_COUNT)) {",
        "  for (const ch of BY_COUNT[k]) COUNT_OF.set(ch, Number(k));",
        "}",
        "",
        "/** 该字的取数（1 平 / 2 上 / 3 去 / 4 入）；表里没有 → undefined（调用方须**拒收**）。 */",
        "function countOf(ch) { return COUNT_OF.get(ch); }",
        "",
        "/** 取数的依据：'入声'（平水韵入声部，含多音取入）/ '今音'（按现代读音折算）/ undefined。 */",
        "function sourceOf(ch) {",
        "  const c = COUNT_OF.get(ch);",
        "  if (c === undefined) return undefined;",
        "  return c === 4 ? '入声' : '今音';",
        "}",
        "",
        "module.exports = { BY_COUNT, countOf, sourceOf };",
        "",
    ]
    OUT_JS.write_text("\n".join(lines), encoding="utf-8")

    # ── 落盘：判据侧的冻结夹具（入聲部原文逐字，不做转换）──────────
    ru_lines = [
        "# 平水韵「入聲部」原文逐字副本（繁体，按韵部）—— 供 duipan/verify_meihua_zishan.js 独立判据使用。",
        "# 本文件由 duipan/gen_pingze_table.py 从上游原样导出，**不做任何转换**；勿手改。",
        "# 来源：github.com/rbnyng/pingshui_rhyme（MIT，分支 main）",
        "#       pingshui_rhyme/data/organized_ping_ze_rhyme_dict.json 的 ze.入聲部",
        f"# 韵部 {len(ru)} 个，字 {len(ru_chars)} 个（去重后）。",
        "",
    ]
    for gname, s in ru.items():
        ru_lines.append(f"{gname} {s}")
    OUT_RU.write_text("\n".join(ru_lines) + "\n", encoding="utf-8")

    print(f"已写 {OUT_JS}")
    print(f"  可定取数 {len(count)} 字：平1 {len(by_count[1])} / 上2 {len(by_count[2])} /"
          f" 去3 {len(by_count[3])} / 入4 {len(by_count[4])}；全轻声拒收 {light} 字")
    print(f"  原文例「今日动静如何」逐字复现：{got}")
    print(f"已写 {OUT_RU}（入聲部 {len(ru)} 部 / {len(ru_chars)} 字）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

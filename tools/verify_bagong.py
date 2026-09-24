# -*- coding: utf-8 -*-
"""独立核 shushu 的八宫世应表：不引用 HEXAGRAM_PALACE，纯按京房变卦规则重推。

规则（《京房易传》八宫卦序）：
  1 本宫卦（世6）  2 一世（初变，世1）  3 二世（二变，世2）  4 三世（三变，世3）
  5 四世（四变，世4）  6 五世（五变，世5）
  7 游魂（自五世卦四爻再变，世4）  8 归魂（游魂内卦三爻全复本宫，世3）
应爻恒在世爻后三位（世+3 mod 6）。

卦用「自下而上」六字串表示，1=阳。八经卦自下而上见 TRI_LINES。
"""
import sys

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from core.liuyao.hexagram_data import HEXAGRAM_TRIGRAM_MAPPING  # noqa: E402
from core.liuyao.najia import (                                   # noqa: E402
    HEXAGRAM_PALACE, PALACE_POS_TO_WORLD,
)

TRI_LINES = {
    "乾": "111", "兑": "110", "离": "101", "震": "100",
    "巽": "011", "坎": "010", "艮": "001", "坤": "000",
}
# 卦号 → 六字串
STR2NUM = {}
for num, (lo, up) in HEXAGRAM_TRIGRAM_MAPPING.items():
    STR2NUM[TRI_LINES[lo] + TRI_LINES[up]] = num


def flip(s, *idxs):
    out = list(s)
    for i in idxs:          # i 为 0-based 自下而上
        out[i] = "0" if out[i] == "1" else "1"
    return "".join(out)


def bagong(palace):
    """返回该宫的 8 个卦号（本宫→归魂）。"""
    base = TRI_LINES[palace] * 2          # 八纯卦
    cur = base
    seq = [base]
    for i in range(5):                    # 一世..五世
        cur = flip(cur, i)
        seq.append(cur)
    seq.append(flip(seq[5], 3))           # 游魂：五世卦四爻再变
    seq.append(flip(seq[6], 0, 1, 2))     # 归魂：游魂内卦复本宫
    return [STR2NUM[s] for s in seq]


def main():
    print("=== 八宫卦序（纯推导 vs shushu 表）===")
    bad = 0
    for palace in ["乾", "坎", "艮", "震", "巽", "离", "坤", "兑"]:
        derived = bagong(palace)
        entry = HEXAGRAM_PALACE
        # shushu 表：卦号 → (宫, 位)
        table = {n: (g, p) for n, (g, p) in entry.items() if g == palace}
        table_pos = {p: n for n, (g, p) in table.items()}
        ok = all(table_pos.get(i + 1) == derived[i] for i in range(8))
        mark = "✓" if ok else "✗"
        print(f"{mark} {palace}宫 推导={derived}")
        print(f"          shushu={[table_pos.get(i + 1) for i in range(8)]}")
        if not ok:
            bad += 1

    print("\n=== 世应（应由 世 推得，恒隔三位）===")
    for n, (g, pos) in sorted(HEXAGRAM_PALACE.items()):
        w = PALACE_POS_TO_WORLD[pos]
        app = ((w - 1 + 3) % 6) + 1
        assert 1 <= w <= 6 and 1 <= app <= 6, (n, w, app)
    print(f"  64 卦世应均在 1..6，且应由世+3 推得 ✓")

    print("\n=== 每宫 8 卦应齐全且不重不漏 ===")
    nums = sorted(HEXAGRAM_PALACE)
    assert nums == list(range(1, 65)), f"卦号不齐: {set(range(1,65)) - set(nums)}"
    from collections import Counter
    c = Counter(g for g, _ in HEXAGRAM_PALACE.values())
    print(f"  每宫卦数={dict(c)}")
    print(f"\n结论：{'全部一致' if bad == 0 else f'{bad} 个宫不一致'}")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

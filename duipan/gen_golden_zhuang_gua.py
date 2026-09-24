# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：shushu 的静态装卦层（64 卦静态定式）。

金标准来自 shushu `core/liuyao/zhuang_gua.py::build_zhuang_gua`，它不依赖日辰月建，
纯由卦象定式生成纳甲地支/五行/六亲/世应/宫/卦型，故可 64 卦穷举对拍。

**身份用上下卦号，不用卦名**：shushu 存的是文王卦序单名（乾/屯/丰…），
ai3000 的 HEX64_NAME 存的是上下卦全名（乾为天/水雷屯/雷火丰…），
按名匹配会引入拼写依赖。故此处把上下卦号显式导出，卦名另作标签校验。

用法：
    /home/cqsomt/Projects/shushu/.venv/bin/python gen_golden_zhuang_gua.py [out.json]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from core.liuyao.hexagram_data import HEXAGRAM_DATA, HEXAGRAM_TRIGRAM_MAPPING  # noqa: E402
from core.liuyao.zhuang_gua import build_zhuang_gua                            # noqa: E402
from core.liuyao.advanced_features import get_gua_shen                         # noqa: E402

# 八经卦 → 先天卦数
TRI_NUM = {"乾": 1, "兑": 2, "离": 3, "震": 4, "巽": 5, "坎": 6, "艮": 7, "坤": 8}
# 八经卦爻象（自下而上，升序）
TRI_LINES = {
    "乾": "111", "兑": "110", "离": "101", "震": "100",
    "巽": "011", "坎": "010", "艮": "001", "坤": "000",
}


def yao_lines(num: int) -> list:
    """某卦六爻爻象，升序 [初..上]，1=阳 0=阴。"""
    lower_n, upper_n = HEXAGRAM_TRIGRAM_MAPPING[num]
    return [int(c) for c in TRI_LINES[lower_n] + TRI_LINES[upper_n]]


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else
               Path(__file__).with_name("golden_zhuang_gua.json"))
    golden = {}
    for num in range(1, 65):
        zg = build_zhuang_gua(num)
        assert zg.get("success"), f"卦 {num} 装卦失败: {zg}"
        lower_n, upper_n = HEXAGRAM_TRIGRAM_MAPPING[num]
        world = zg["world_line"]
        lines = yao_lines(num)
        # 卦身：需世爻阴阳（爻象，非纳甲地支阴阳）
        gs = get_gua_shen(world, "阳" if lines[world - 1] == 1 else "阴")
        golden[str(num)] = {
            "num": num,
            # 身份
            "upper": TRI_NUM[upper_n],
            "lower": TRI_NUM[lower_n],
            "upper_name": upper_n,
            "lower_name": lower_n,
            # 标签
            "gua_name": HEXAGRAM_DATA[num]["name"],
            # 定式
            "palace": zg["palace"],
            "palace_wuxing": zg["palace_wuxing"],
            "palace_position": zg["palace_position"],
            "gua_type": zg["gua_type"],
            "world_line": world,
            "application_line": zg["application_line"],
            "lines": lines,
            "gua_shen": gs["zhi"],
            "world_yin_yang": gs["world_yin_yang"],
            "rows": [
                {
                    "position": r["position"],
                    "name": r["name"],
                    "zhi": r["zhi"],
                    "wuxing": r["wuxing"],
                    "liu_qin": r["liu_qin"],
                    "shi_ying": r["shi_ying"],
                }
                for r in zg["rows"]
            ],
        }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已写 {out}（{len(golden)} 卦）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

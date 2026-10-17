# -*- coding: utf-8 -*-
"""从 shushu 的 core.constants 直接导出术数常量表为 JSON。

为什么不用手抄：手抄是漂移的起点。ai3000 现有三份排盘副本就是这么坏掉的。
直接把「正确性基准」的表导出来，JS 端加载，零转写风险，且出处可追溯。

用法：
    python3 dump_shushu_tables.py [输出路径]

默认输出 /tmp/ai3000/build/backend/paipan/tables.json
"""
import enum
import json
import sys
from pathlib import Path

SHUSHU = "/home/cqsomt/Projects/shushu"
sys.path.insert(0, SHUSHU)

import core.constants as C  # noqa: E402

# 要导出的纯数据符号（逻辑函数另行手写，它们每个只有几行）
SYMBOLS = [
    # 基础
    "TIANGAN", "DIZHI", "TIANGAN_INDEX", "DIZHI_INDEX",
    "TIANGAN_WUXING", "DIZHI_WUXING", "WUXING", "WUXING_SHENG", "WUXING_KE",
    "WUXING_BEI_SHENG", "WUXING_BEI_KE",
    "TIANGAN_YIN_YANG", "DIZHI_YIN_YANG",
    # 藏干 / 纳音 / 十神
    "CANGGAN", "NAYIN", "SHISHEN",
    # 刑冲合害
    "SANHEP", "SANHE_MAP", "LIUHE", "LIUCHONG", "LIUHAI", "SANXING", "SANHE_GROUPS",
    # 历法
    "JIE_TO_DIZHI", "_MONTH_GAN_START", "_HOUR_GAN_START", "HOUR_DIZHI",
    # 旺衰
    "_STRENGTH_TABLE", "_STRENGTH_TABLE_STRICT",
    # 八卦
    "TRIGRAMS", "KING_WEN_TRIGRAM",
    # 神煞 / 格局
    "SHENSHA", "SHENSHA_EXTENDED", "MAJOR_PATTERNS", "SPECIAL_PATTERNS",
    "ZHUAN_WANG_GE", "HUA_QI_GE",
    # 奇门（先导出来，用不用以后说）
    "JIUGONG_POSITIONS", "JIUXING", "BAMEN", "BASHEN", "BAMEN_AUSPICIOUS",
]


class Enc(json.JSONEncoder):
    """处理 tuple 键、set、enum。"""
    def default(self, o):
        if isinstance(o, enum.Enum):
            return o.value
        if isinstance(o, set):
            return sorted(o)
        if isinstance(o, tuple):
            return list(o)
        return super().default(o)

    def iterencode(self, o, _one_shot=False):
        return super().iterencode(self._norm(o), _one_shot)

    def _norm(self, o):
        if isinstance(o, dict):
            return {self._key(k): self._norm(v) for k, v in o.items()}
        if isinstance(o, (list, tuple)):
            return [self._norm(v) for v in o]
        if isinstance(o, enum.Enum):
            return o.value
        if isinstance(o, set):
            return sorted(self._norm(v) for v in o)
        return o

    def _key(self, k):
        if isinstance(k, tuple):
            return "|".join(self._key(x) for x in k)
        if isinstance(k, enum.Enum):
            return k.value
        return str(k)


def main() -> int:
    out = Path(sys.argv[1] if len(sys.argv) > 1
               else "/tmp/ai3000/build/backend/paipan/tables.json")
    out.parent.mkdir(parents=True, exist_ok=True)

    data = {}
    missing = []
    for name in SYMBOLS:
        if not hasattr(C, name):
            missing.append(name)
            continue
        data[name] = getattr(C, name)

    payload = {
        "_source": "shushu core/constants.py",
        "_repo": SHUSHU,
        "tables": data,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1, cls=Enc),
                   encoding="utf-8")

    print(f"导出 {len(data)} 张表 → {out}  ({out.stat().st_size:,} 字节)")
    if missing:
        print(f"缺失（shushu 里没有，需手写）: {missing}")
    for name in SYMBOLS:
        if name in data:
            v = data[name]
            n = len(v) if hasattr(v, "__len__") else "?"
            print(f"  {name:24s} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

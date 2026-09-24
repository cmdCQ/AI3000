# -*- coding: utf-8 -*-
"""对拍 · 金标准生成：**事项匹配 + 用神取定表**（层 6c）。

这一层不走 divine 管线——`_match_topic` / `get_yong_shen` 是纯函数，
纯函数的金标准就该直接调它（走管线反而绕）。全枚举：

  · `matchTopic`：12 个事项的关键词表**逐词**各造一条问句（每条只含该词），
    外加 3 条一个关键词都不中的问句 → 必须落回「综合」。
    这样每个关键词都被至少一次命中路径跑到，不是抽样。
  · `getYongShen`：13 个事项名（含实际不在表内的「天气占候」与未知事项）
    × {male, female, 女} × {自占, 代占} —— 全组合穷举。
  · `resolveTopic`：显式事项 × 问句 的优先级三种分支。

用法：
    .venv/bin/python gen_golden_topics.py [out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, "/home/cqsomt/Projects/shushu")

from core.liuyao.interpreter import (                                       # noqa: E402
    _TOPIC_MAP, _TOPIC_YONG_SHEN, _TOPIC_YONG_SHEN_GENDER,
    _TOPIC_YONG_SHEN_PROXY, _match_topic, get_yong_shen,
)

# 一个关键词都不含的问句 —— _match_topic 必须返回「综合」
NO_KEYWORD = ["随便问问", "？", "我想知道结果", "请帮我看看"]

# 不在 _TOPIC_YONG_SHEN 里的事项名（用于覆盖 get_yong_shen 的兜底行）
EXTRA_TOPICS = ["天气占候", "不存在的怪事项", ""]

# resolveTopic 的三条分支各来几例
PRIORITY = [
    # (显式事项, 问句)  —— 显式事项在表内 → 用它
    ("求财", "我什么时候能升职"),
    ("综合", "今年财运如何"),
    # 显式事项不在表内但关键词能认出 → 用认出的
    ("天气占候", "随便问问"),
    ("求财求官", "随便问问"),
    # 显式认不出 → 退回按问句推
    ("不存在的怪事项", "我想问问婚姻"),
    ("", "我孩子什么时候能出生"),
    ("", "随便问问"),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out", nargs="?", default=str(Path(__file__).with_name("golden_topics.json")))
    args = ap.parse_args()

    golden = {"match": {}, "yong_shen": {}, "priority": {}}

    # 1. 逐关键词 —— 每条问句只含一个关键词，命中该关键词所属事项
    for topic, keywords in _TOPIC_MAP.items():
        for k in keywords:
            golden["match"][f"{topic}|{k}"] = _match_topic(k)
    for q in NO_KEYWORD:
        golden["match"][f"无关键词|{q}"] = _match_topic(q)

    # 2. 用神取定表全枚举
    topics = list(_TOPIC_YONG_SHEN.keys()) + EXTRA_TOPICS
    for t in topics:
        for g in ("male", "female", "女", "", "MALE"):
            for proxy in (False, True):
                golden["yong_shen"][f"{t}|{g}|{int(proxy)}"] = get_yong_shen(t, g, proxy)

    # 3. 事项定夺优先级
    for et, q in PRIORITY:
        # shushu interpret 的三级取法（interpreter.py:784-789）
        if et and et in _TOPIC_YONG_SHEN:
            got = et
        elif et and _match_topic(et) != "综合":
            got = _match_topic(et)
        else:
            got = _match_topic(q)
        golden["priority"][f"{et or '(空)'}|{q}"] = got

    out = Path(args.out)
    out.write_text(json.dumps(golden, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"已写 {out}：match {len(golden['match'])}　"
          f"yong_shen {len(golden['yong_shen'])}　priority {len(golden['priority'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/bin/sh
# 八字各层回归：层 8 排盘 / 9 大运流年 / 10 地支关系 / 11 特殊格局 / 12 用神调候 / 13 组合断
#              / 14 应用层（事业·财运·健康·婚姻）/ 15 总断那一串（运程·总论·推理链·综合·完整装配）
#              / 16 解读 prompt（变量表 + 默认模板）/ PR 产品层（输出规格 + 渲染）
#              / EP 端点行为冒烟（闸门·限额·落库·记账·两条模板不许串）。
# 每层「先跑被验方 JS，再对拍」。退出码非 0 的层会被单独标出，最后汇总。
#   sh regress_bazi.sh 2>&1 | tail -40
#
# ⚠ 层 16 直接依赖 `pycompat.js`（`pyGet` 的「不是字典就抛 AttributeError」）与
#   `ganzhi.js` —— 动过这两个共用件**必须**跑这一整轮，不能只看层 16 绿。
cd "$(dirname "$0")" || exit 2
PY=/home/cqsomt/Projects/shushu/.venv/bin/python
FAIL=""

run() {          # run <层名> <命令...>
  name="$1"; shift
  printf '\n───── %s ─────\n' "$name"
  if "$@" > "/tmp/regress_${name}.log" 2>&1; then
    tail -4 "/tmp/regress_${name}.log"
  else
    echo "✗ 退出码 $? —— 见 /tmp/regress_${name}.log"
    tail -20 "/tmp/regress_${name}.log"
    FAIL="$FAIL $name"
  fi
}

run L8a  node run_js_bazi.js
run L8b  node run_js_bazi_analysis.js
run L8   $PY diff_bazi_chart.py
run L9   node run_js_bazi_fortune.js
run L9d  $PY diff_bazi_fortune.py
run L10  node run_js_bazi_relations.js
run L10d $PY diff_bazi_relations.py
run L11  node run_js_bazi_patterns.js
run L11d $PY diff_bazi_patterns.py
run L12  node run_js_bazi_yongshen.js
run L12d $PY diff_bazi_yongshen.py
run L13  node run_js_bazi_combos.js
run L13d $PY diff_bazi_combos.py
run L14  node run_js_bazi_applications.js
run L14d $PY diff_bazi_applications.py
# 层 15 一次跑五个家族（cf/ov/sy/ms/asm 共 509 例）—— 装配顺序本身是被验对象，
# 故 `asm` 族走**真端点** `api.bazi.get_chart`。
run L15  node run_js_bazi_assembly.js
run L15d $PY diff_bazi_assembly.py
# 层 16：`pv` 真实盘 364 例 + `pm` 变异盘 78 例（变异专门点名那些真实盘上不可达的分支：
# 键缺席 / 值为 None / 类型畸形 / 让基准抛）。prompt 的最终字符串逐字判，
# 另判输入快照 `src` 用来把「输入就不同」与「提示词层不同」分开。
run L16  node run_js_bazi_prompt.js
run L16d $PY diff_bazi_prompt.py
# 产品层（不在对拍口径里，是 ai3000 自己的输出规格）：①bazi_report.js 的规范与
# 两块新数据；②新规范喂给真 renderMarkdown 能不能渲染成想要的样子。
# 这两层证明的是**产品输出**，不是「与 shushu 逐字相同」—— 别混着看。
run PR1  node check_bazi_report.js
run PR2  node check_bazi_render.js
# 端点行为冒烟（既不是对拍、也不是输出规格）：三道闸门、游客日上限、落库、记账取上游
# **真数**、以及「首次解读」与「追问」两条模板不许串。
# ⚠ 它之所以进这一轮：2026-09-25 首读换到 `bazi_report.js` 之后它一直红着而**没人知道**
#   —— 因为它不在本脚本里，谁也不会想起来单跑它。手动维护的检查等于没有检查。
run EP   node smoke_bazi_parse.js

printf '\n═════ 汇总 ═════\n'
if [ -n "$FAIL" ]; then echo "✗ 未过：$FAIL"; exit 1; else echo "✓ 层 8–16、产品层与端点冒烟全部通过"; fi

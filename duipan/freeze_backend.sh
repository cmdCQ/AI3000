#!/bin/sh
# 冻结基线总入口：一条命令把三层对拍顺序跑完，只回一个总判决。
#
#   层 7            梅花（regress_meihua.sh）
#   层 8~16 / PR / EP 八字（regress_bazi.sh）
#   PG              页面驱动 + 变异套件（regress_pages.sh）
#
# 为什么要有它：前端重写期间会反复改 `src/server/` 与 `src/web/`，每次都得知道
# 「排盘数学和页面行为是不是还忠实于基准」。三层各跑一遍要记三条命令、三套环境变量、
# 还得自己判断哪层的退出码 2 是环境问题而不是真红 —— 记不住就等于不跑，不跑就等于没有。
#
#   sh freeze_backend.sh 2>&1 | tail -30
#
# ⚠ 本机没有 shushu（那套 Python 基准实现不在磁盘上），对拍层必须显式降级：
#     NO_SHUSHU=1 PY=/usr/bin/python3 sh freeze_backend.sh
#   不给就**红**，这是故意的：静默少核一段比红危险得多（见各脚本里的 NO_SHUSHU 说明）。
#
# ⚠ 需要真 Firefox（页面层走 marionette 线协议）。跑之前别留无头 firefox —— 留了的话
#   `drive_lib.js` 会先收掉再起，但它会在日志里说一句，别当没看见。
cd "$(dirname "$0")" || exit 2

PY=${PY:-/home/cqsomt/Projects/shushu/.venv/bin/python}

# 解释器不对就别往下走：三层会各报一次「not found」，最后那句话说不清是环境坏了还是真红
if [ ! -x "$PY" ]; then
  if [ "${NO_SHUSHU:-}" = "1" ]; then
    echo "⚠ PY=$PY 不存在，但 NO_SHUSHU=1 —— 依赖 shushu 的那几条断言会逐条打「跳过」，不静默算绿。"
  else
    echo "✗ PY=$PY 不存在：本机没有 shushu 的 venv。两条路："
    echo "    指对解释器：PY=/path/to/python sh freeze_backend.sh"
    echo "    显式降级：  NO_SHUSHU=1 PY=/usr/bin/python3 sh freeze_backend.sh"
    exit 2
  fi
fi

FAIL=""
T0=$(date +%s)

run() {          # run <层名> <命令...>
  name="$1"; shift
  printf '\n══════════ %s ══════════\n' "$name"
  s=$(date +%s)
  if "$@" > "/tmp/freeze_${name}.log" 2>&1; then
    tail -4 "/tmp/freeze_${name}.log"
  else
    echo "✗ 退出码 $? —— 见 /tmp/freeze_${name}.log"
    tail -25 "/tmp/freeze_${name}.log"
    FAIL="$FAIL $name"
  fi
  printf '  ── %s 用了 %ss\n' "$name" "$(( $(date +%s) - s ))"
}

run 梅花    sh regress_meihua.sh
run 八字    sh regress_bazi.sh
run 页面层  sh regress_pages.sh

printf '\n══════════ 汇总（共 %ss）══════════\n' "$(( $(date +%s) - T0 ))"
if [ -z "$FAIL" ]; then
  echo "✅ 冻结基线全绿：梅花 + 八字 + 页面驱动与变异套件"
  exit 0
fi
echo "❌ 未过：$FAIL"
echo -n "   逐层日志："
for n in $FAIL; do echo -n "/tmp/freeze_${n}.log "; done
echo
exit 1

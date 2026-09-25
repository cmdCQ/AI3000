#!/bin/sh
# 页面层回归：四个页面的端到端驱动（真 Firefox + 本机静态站 + 真端点切片）与变异套件。
#
#   梅花 mhys   ① 排盘页二次排盘（drive_mhys_twice.js）—— AI 块自动出现 / 折叠不停流 / 换卦作废旧解析
#   梅花 mhys   ② 排盘页 + 记录页（drive_mhys_page.js）
#   六爻 liuyao ③ 排盘页 + 记录页（drive_liuyao_page.js）
#   八字 bazi   ④ 详情页（drive_bazi_page.js）—— 页面只渲染、追问不落库、页内不浮层
#   变异测试   ⑤ mutate_mhys_twice.js —— 把 ① 里每处做好的改动逐个改回坏的，看它抓不抓得住
#
# ⚠ 为什么单有这个脚本：2026-09-25 引擎那块（`js/ai_panel.js` + 各页配置）改了三次形态
#   （删页头按钮 → 块跟着卦自己出来 → 折叠控件挪进块的标题栏），每次都只手动跑过一两个
#   驱动；`drive_bazi_page.js` 因此烂掉了**一整天没人知道** —— 后端把排盘那段接上
#   `bazi_report.js` 之后，本脚本注入的依赖表没跟着补，整条驱动从第一条用例起就在红。
#   手动维护的检查等于没有检查：改完引擎就把本脚本跑一遍。
#
# ⚠ 依赖：真 Firefox（无头，marionette 线协议，见 drive_lib.js）。四个驱动各用各的端口
#   （mhys 8899/2828、liuyao 8898/2829、bazi 8897/2830），但本脚本**串行**跑 —— 一次
#   只起一个浏览器，机器不忙，出事时的日志也不会互相踩。
#
# 用法： sh duipan/regress_pages.sh            # 全跑（约 20 分钟）
#        sh duipan/regress_pages.sh fast       # 跳过变异套件（约 10 分钟）
#
# ⚠ 本脚本跑的是**本机 build/nginx**（本地绿只证明产物对）。上线之后另跑一次
#   `node duipan/verify_live_page.js both` —— 那个连真站，证明线上浏览器里跑起来也对。
# 退出码：0 = 全绿；1 = 有用例失败；2 = 有环境/切片问题（**测不出来**，不是通过）
cd "$(dirname "$0")" || exit 2
FAIL=""
ENVFAIL=""

run() {          # run <层名> <命令...>
  name="$1"; shift
  printf '\n───── %s ─────\n' "$name"
  "$@" > "/tmp/regress_pages_${name}.log" 2>&1
  rc=$?
  if [ "$rc" -eq 0 ]; then
    tail -3 "/tmp/regress_pages_${name}.log"
  elif [ "$rc" -eq 2 ]; then
    # 退出码 2 是驱动自己定的「测不出来」（站点起不来 / 切片标记失效）——
    # 跟「测出来是坏的」不是一回事，分开记，别混进失败里一起看。
    echo "⚠ 退出码 2 = 环境/切片问题（**没测到东西**）—— 见 /tmp/regress_pages_${name}.log"
    tail -12 "/tmp/regress_pages_${name}.log"
    ENVFAIL="$ENVFAIL $name"
  else
    echo "✗ 退出码 $rc —— 见 /tmp/regress_pages_${name}.log"
    tail -25 "/tmp/regress_pages_${name}.log"
    FAIL="$FAIL $name"
  fi
}

run mhys-twice node drive_mhys_twice.js
run mhys-page  node drive_mhys_page.js
run liuyao     node drive_liuyao_page.js
run bazi       node drive_bazi_page.js
# 变异套件自己会把驱动跑九遍（每遍改坏一处再还原），故它最慢、放在最后。
# `fast` 只跳过它 —— 但**发版前必须跑**：驱动里那些断言是写驱动的人自己写的，
# 只有变异能证伪「这些断言是不是橡皮章」。
SKIPPED=""
if [ "$1" = "fast" ]; then
  SKIPPED="（fast：变异套件没跑）"
  printf '\n───── mutate-mhys-twice ─────\n（fast：跳过）\n'
else
  run mutate-mhys-twice node mutate_mhys_twice.js
fi

printf '\n═════ 汇总 ═════\n'
if [ -n "$ENVFAIL" ]; then echo "⚠ 没测到东西：$ENVFAIL"; fi
if [ -n "$FAIL" ]; then echo "✗ 未过：$FAIL"; exit 1; fi
if [ -n "$ENVFAIL" ]; then exit 2; fi
echo "✓ 四个页面驱动（含变异套件）全部通过 $SKIPPED"

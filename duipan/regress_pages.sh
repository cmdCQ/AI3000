#!/bin/sh
# 页面层回归：页面的端到端驱动（真 Firefox + 本机静态站 + 真端点切片）、纯函数差分与变异套件。
#
#   梅花 mhys   ① 排盘页二次排盘（drive_mhys_twice.js）—— AI 块自动出现 / 折叠不停流 / 换卦作废旧解析
#   梅花 mhys   ② 排盘页 + 记录页（drive_mhys_page.js）
#   六爻 liuyao ③ 排盘页 + 记录页（drive_liuyao_page.js）
#   八字 bazi   ④ 详情页（drive_bazi_page.js）—— 页面只渲染、追问不落库、页内不浮层
#   AI 对话     ⑤ 对话页（drive_ai_chat_page.js）—— 游客弹框不跳转 / 流式逐字节对齐老 renderMarkdown /
#                 积分尾巴切出来当兄弟节点 / 401 换成引导 / 首页首句自动发出且取完即删 / iframe 返回通知父窗
#   我的命盘     ⑥ 命盘页（drive_my_charts_page.js）—— 每一屏的 HTML 都与**冻结的老实现快照**
#                 逐字节对齐 / 排盘失败退路要清空 AI 与细盘 / 卡片菜单 / 删除 / 打包后 CSS 顺序
#   纯函数差分  ⑦ diff_pure_functions.mjs —— ⑥ 的那几个纯函数（renderMarkdown / splitPoints /
#                 pointsLabel / hexRender 全家）与**冻结的老实现快照**逐字节对拍，不开浏览器，秒级
#   纯函数差分  ⑧ diff_mhys.mjs —— 梅花那 15 个纯函数（calcGua / buildQiguaRequest / enrichTimeInfo /
#                 getMaxDay / getShichen / parseReportNumbers / parseSplitDigits / selectedTimeToIso /
#                 triToLines / linesToTri / guaToLines / buildLines / wuxingShengKe / xunKongFromDayGZ /
#                 fillManualSelects）与冻结快照对拍，**820 例**，不开浏览器
#   变异测试    ⑨ mutate_mhys_twice.js —— 把 ① 里每处做好的改动逐个改回坏的，看它抓不抓得住
#
#   ⚠ 覆盖怎么分工：**纯函数走差分，碰 DOM 的走驱页**。`diff_mhys.mjs` 只盖 15 个纯函数，
#     `logic.js` 另外那 24 个（openTimePicker / renderPicker / startDivination / showResultHere / …）
#     全是要 document 的，归 ② 的 drive_mhys_page.js（62 条断言）。**两边都不漏，也不重复**。
#
# ⚠ 为什么单有这个脚本：2026-09-25 引擎那块（`js/ai_panel.js` + 各页配置）改了三次形态
#   （删页头按钮 → 块跟着卦自己出来 → 折叠控件挪进块的标题栏），每次都只手动跑过一两个
#   驱动；`drive_bazi_page.js` 因此烂掉了**一整天没人知道** —— 后端把排盘那段接上
#   `bazi_report.js` 之后，本脚本注入的依赖表没跟着补，整条驱动从第一条用例起就在红。
#   手动维护的检查等于没有检查：改完引擎就把本脚本跑一遍。
#
# ⚠ 依赖：真 Firefox（无头，marionette 线协议，见 drive_lib.js）。五个驱动各用各的端口
#   （mhys 页 8892/2828、mhys 用两次 8901/2831、liuyao 8898/2829、bazi 8897/2830、
#   ai-chat 8893/2832、my-charts 8894/2833），但本脚本**串行**跑 —— 一次只起一个浏览器，机器不忙，出事时的
#   日志也不会互相踩。mhys 页那个端口可以被 `DRIVE_PORT` 顶掉：默认原本是 8899，
#   本机被 FreeP 占了。
# ⚠ 五个端口都只为「不撞车」存在，不是契约；真冲突就换，别去改别的东西。
# ⚠ 端口错开**不代表能并行**：`drive_lib.launchFirefox()` 上来就把全机的无头 Firefox
#   杀掉（snap 版不认 `-profile`，只能共用同一个真 profile），两个驱动同时跑就是互相掐死。
#   端口错开防的是「上一个没退干净」的残留 —— 那也会让下一个撞 EADDRINUSE。
#
# 用法： sh duipan/regress_pages.sh            # 全跑（2026-10-17 实测 159s ≈ 2.7 分钟）
#        sh duipan/regress_pages.sh fast       # 跳过变异套件（少跑 9 遍驱动，更快）
# ⚠ 这里原先写「约 20 分钟」—— 是估的，比实测大 7 倍。时间估值报大了的坏处不是浪费，
#   是让人「懒得跑」，而本脚本存在的理由正是「手动维护的检查等于没有检查」。
#
# ⚠ 本脚本跑的是**构建产物 `build/nginx`**（不是 `src/web`）。2026-10-17 改的：页面一旦搬进
#   `src/app/`，`src/web` 里就没有它了 —— 继续服务 `src/web` 的驱动会在页面上什么都读不到，
#   被误判成「页面坏了」（`/my-charts/` 搬完当天就是这么坑了一次）。`build/nginx` 是超集：
#   没搬的页面是 `src/web` 的逐字拷贝，搬了的在里面。要临时换根：`DRIVE_ROOT=/somewhere`。
#   所以**本地绿只证明产物对**，上线之后另跑一次 `node duipan/verify_live_page.js both`
#   —— 那个连真站，证明线上浏览器里跑起来也对。
# 退出码：0 = 全绿；1 = 有用例失败；2 = 有环境/切片问题（**测不出来**，不是通过）
cd "$(dirname "$0")" || exit 2
FAIL=""
ENVFAIL=""

run() {          # run <层名> <命令...>
  name="$1"; shift
  printf '\n───── %s ─────\n' "$name"
  # ⚠ 必须套 timeout。2026-10-17 实测：`drive_liuyao_page.js` 卡在 Marionette 的
  #   `ep_poll` 上（页面等一个永远不出现的选择器），**不抛错、不退出**，本脚本
  #   就跟着一起卡死 —— 整条冻结门看起来「还在跑」，其实是永远不会结束。
  #   这种「卡住」和「断言红了」不是一回事，但**都不能算绿**，所以记进 FAIL 并单独写清楚。
  #   超时默认 600s（单层实测最长约 160s，四倍余量）。要改：REGRESS_TIMEOUT=300 sh …
  timeout --kill-after=10 "${REGRESS_TIMEOUT:-600}" "$@" > "/tmp/regress_pages_${name}.log" 2>&1
  rc=$?
  if [ "$rc" -eq 0 ]; then
    tail -3 "/tmp/regress_pages_${name}.log"
  elif [ "$rc" -eq 124 ] || [ "$rc" -eq 137 ]; then
    # 卡死 ≠ 测出来是坏的 ≠ 测不出来。三种都记，但话要分开说，
    # 否则下次看到红会照着「页面坏了」的方向去查，浪费一整轮。
    echo "⏱ 超时 ${REGRESS_TIMEOUT:-600}s —— 驱动卡死（**没测完，也没测出坏**）"
    echo "   见 /tmp/regress_pages_${name}.log；常见原因：页面等一个永远不出现的选择器、"
    echo "   上一轮 Firefox/端口没退干净、或者另一个驱页在同时跑（全机只能有一个）。"
    tail -12 "/tmp/regress_pages_${name}.log"
    FAIL="$FAIL $name(timeout)"
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
run ai-chat    node drive_ai_chat_page.js
run my-charts  node drive_my_charts_page.js
# 纯函数差分：不开浏览器，但它是 ai-chat 那条断言链的**判据来源** ——
# 期望值不是手抄的常量，是当场从 duipan/legacy_ref/ 里那份冻结的老实现算出来的。
# 快照被改动 = 判据被换成新实现自己 = 差分退化成橡皮章，所以它必须每次都跑。
run diff-pure  node diff_pure_functions.mjs
# 梅花那 15 个纯函数的差分（820 例）。它盖的正是 ② 那 62 条断言**碰不到**的部分：
# 驱动只能抽查几个卦，差分把 calcGua 按 403 组上下卦/动爻全铺开。两边互补，都别删。
run diff-mhys  node diff_mhys.mjs
# `src/app/lib/auth.js` 与 `src/web/js/auth.js` 的 cookie 读法对拍（104 项）。
# 过渡期里**同一个语义有两份实现**（新树只搬了读 cookie，登录弹窗那 300 行还在老树里
# 被当全局借用），两份不是逐字节一样（老文件带分号、新文件不带），所以「看起来一样」
# 不能当证据。谁哪天只改了一份（给新文件补 try/catch、把锚从 `(^| )` 改成 `(^|; )`、
# 换掉 `decodeURIComponent`），症状会是「新页认得我是登录的、老页认不得」这种极难查的
# 不一致。这条差分对 AUTH.isLoggedIn / getToken / getUsername 逐个 cookie 串比返回值。
run diff-auth  node diff_auth_cookie.mjs
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
echo "✓ 六个页面驱动 + 三个纯函数差分（含变异套件）全部通过 $SKIPPED"

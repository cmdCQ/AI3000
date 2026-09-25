#!/bin/sh
# 层 7（梅花）回归入口 —— 一条命令跑完整条链，**产物全部重新生成**。
#
# 为什么必须先把产物删掉：`run_js_meihua.js` 若中途崩掉（比如某例抛到顶层），
# 盘上留的是**上一轮**的 js_meihua.json，后面的 diff 会拿旧数据比出一个绿 ——
# 假绿比红危险。故一律 `rm -f` 起手。（这个坑真踩过：字占 n==1 那 5 例曾把它整脚本崩掉。）
#
# 为什么要在这里重生成三个对照组产物（`js_meihua_{nohuanri,oldzishan,neither}.json`）：
# `coverage_meihua.py` 的 R1/R2/R3 三条集合断言**读盘上的这三个文件**。它们若不是这次
# 跑出来的，那三条断言比的是旧代码的结果 —— 等于没验。放在这里重生成，R 段才活。
#
# 链上每一步各自的判据（谁红谁负责，别混）：
#   diff.py            —— 未申报差异必须为 0（申报表见 allow_meihua.json 与 gen 里的 _zishan_allow）
#   probe_meihua.js    —— 把结构上「取不到」的防御分支直调一遍，coverage 的 ② 段要它的实跑证据
#   coverage_meihua.py —— 覆盖度（防空绿）+ 不可达 + 独立核对 + R1/R2/R3 集合相等
#   verify_meihua_zishan.js —— **原文判据**（独立于对拍：字占整例申报后，对拍对取数已无约束力）
#   verify_meihua_vs_front.js —— 前后端一致（384 例；判据是前端，不是 shushu）
#
# `--no-zishan`：只跑对拍那一半，跳过原文判据。给 `mutate_meihua_zishan.js` 用 ——
# 它要把「对拍抓得到什么 / 抓不到什么」与「原文判据抓得到什么」**分开**断言：
# 「入声不覆写」这条变异对拍就是**抓不到**（整例申报把 4 字以上全豁免了），
# 若两条判据混在一条命令里，这个结论（以及它背后的风险）就被掩掉了。
#
# `fast`：跳过最后一格的变异套件。**它默认要跑** —— 手动维护的检查等于没有检查
# （`regress_pages.sh` 的头注记着这个教训：`drive_bazi_page.js` 曾烂了一整天没人知道）。
# 变异套件自己会调回本脚本（`fast --no-zishan`），故它跑的那一轮不含变异，不会递归。
#
# 用法：sh duipan/regress_meihua.sh             # 全跑（约 15 秒）
#       sh duipan/regress_meihua.sh fast        # 跳过变异套件（约 1 秒）
# 退出码：0 = 全绿；非 0 = 有判据红（先分清是哪一步红的，再动代码）
set -e
PY=${PY:-/home/cqsomt/Projects/shushu/.venv/bin/python}
cd "$(dirname "$0")"

FAST=0; ZISHAN=1
for a in "$@"; do
  case "$a" in
    fast) FAST=1 ;;
    --no-zishan) ZISHAN=0 ;;
    *) echo "未知参数：$a（只有 fast / --no-zishan）"; exit 2 ;;
  esac
done

rm -f js_meihua.json js_meihua_nohuanri.json js_meihua_oldzishan.json js_meihua_neither.json

# ① 主链：与金标准 0 未申报差异（申报 57 = 晚子时换日 38 + 字占分层 19）
node run_js_meihua.js
$PY diff.py golden_meihua.json js_meihua.json --allow allow_meihua.json --case-keys

# ② 三个对照组产物（只生成，不在这里判 —— 它们的差异是**预期**的：对照组本就该与
#    金标准不同。判它们的是 coverage_meihua.py 的 R1/R2/R3 集合断言，故不调 diff.py）
node run_js_meihua.js meihua_cases.json js_meihua_nohuanri.json --no-huanri
node run_js_meihua.js meihua_cases.json js_meihua_oldzishan.json --old-zishan
node run_js_meihua.js meihua_cases.json js_meihua_neither.json --no-huanri --old-zishan

# ③ 防御分支冒烟（coverage 的「不可达」段要它的实跑证据）
node probe_meihua.js

# ④ 覆盖度 + 不可达 + 独立核对 + R 段
$PY coverage_meihua.py

# ⑤ 原文判据（字占取数、分半点、动爻、拒收；判据取自《梅花易数》原文，不取自 shushu）
if [ "$ZISHAN" = 1 ]; then
  node verify_meihua_zishan.js
fi

# ⑥ 前后端一致（384 例）：用户在页面上看到的本卦/互卦/变卦/错卦/综卦/体用/判词，是前端
#    `calcGua()` 算的；后端若自己重算，必须逐项相同 —— 这类错用户看不出来（两边都是「一个卦」，
#    只是不是同一个）。**2026-09-25 它曾烂成 exit 2 没人知道**（前端「只渲染」迁移把切片标记
#    搬去了别的文件），就是「不挂进 runner 的检查会红着烂掉」那条教训的又一例。
node verify_meihua_vs_front.js

# ⑦ 变异套件：把上面各条判据逐个改回坏的，看它们抓不抓得住（不挂进 runner 的检查会红着烂掉）
if [ "$FAST" = 0 ]; then
  node mutate_meihua_zishan.js
fi

echo "✅ 层 7 梅花回归全绿"

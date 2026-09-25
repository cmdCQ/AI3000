#!/bin/sh
# 部署前端（nginx 静态根）到线上：
#   备份 → 上传 → 解到暂存区按清单核对（不匹配不落地）→ 落地 → 核对 → 线上取回验证
#
# 为什么单有这一支：后端那支（`deploy_paipan.sh`）管的是容器里的排盘层，改完要
# 重启容器；这里是 nginx 的静态根，落地即生效、不用 reload。两者的**风险不同**
# （静态文件改坏了是所有页面一起白屏），故各留各的备份与回滚命令，不混在一个脚本里。
#
# 备份与回滚：
#   备份落到 /root/ai3000-nginx-<时间戳>.tgz
#   回滚：tar xzf /root/ai3000-nginx-<时间戳>.tgz -C $REMOTE_WEB && 无（静态文件无需重启）
#
# 用法：
#   SSHPASS=... sh tools/deploy_nginx.sh --check    # 只读：比哈希，不动线上
#   SSHPASS=... sh tools/deploy_nginx.sh --apply    # 备份 + 上传 + 落地
#   SSHPASS=... sh tools/deploy_nginx.sh --verify   # 落地后从线上取回，再比一次哈希
#
# 密码只走 SSHPASS 环境变量（见 tools/ss.sh），**不落盘、不进命令行**。
# 若 SSHPASS 未设，回落读 /tmp/ai3000_pass（由**本人**创建，不在仓库内）。
#
# 要部署的文件：**逐个列**（与后端那一支不同）。后端列整个 `paipan/` 目录是因为
# 那是整体挂载、不列全就会留下旧版；前端这边是在一个几千文件的站点根里改十来个
# 文件，整站核对既慢又会被 assets 之类的历史差异刷屏。所以这里逐个列，且列完
# `--verify` 会**从线上取回**再比一次 —— 清单只在「传上去的那一份」上生效，
# 真正要确认的是「线上拿到的是不是这一份」。
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/.." && pwd)
REMOTE_WEB=/var/www/sqw.somtfly.com/build/nginx
SRC=build/nginx
MODE=${1:---check}

if [ -z "${SSHPASS:-}" ] && [ -r /tmp/ai3000_pass ]; then
  SSHPASS=$(cat /tmp/ai3000_pass)
  export SSHPASS
fi
: "${SSHPASS:?未设 SSHPASS —— 见本文件头注}"

ss() { sh "$HERE/ss.sh" "$@"; }

# ⚠ `css/mhys_result.css` 是**梅花与六爻共用的底**（令牌、卡片、AI 面板、卦象画法），
# 它原先不在清单里 —— 那份清单是随第一批（ui_common/ai_panel/render）列的，
# 之后往共用底里加规则就会被静默漏掉：本地截图全绿、线上纹丝不动。
FILES="js/ui_common.js js/ai_panel.js js/auth.js js/liuyao_render.js js/liuyao_ai_panel.js \
js/mhys_ai_panel.js js/mhys_render.js css/liuyao_result.css css/mhys_result.css \
liuyao/index.html liuyao/result.html mhys/index.html mhys/result.html"

for f in $FILES; do
  [ -f "$REPO/$SRC/$f" ] || { echo "缺文件：$SRC/$f"; exit 1; }
done

manifest() { ( cd "$REPO/$SRC" && md5sum $FILES ); }

case "$MODE" in
  --check)
    ss "cd $REMOTE_WEB && md5sum $FILES 2>/dev/null || true" > /tmp/ai3000-nginx-remote.md5
    echo "── 线上 $REMOTE_WEB"
    if [ ! -s /tmp/ai3000-nginx-remote.md5 ]; then echo "  （取不到）"; else
      ( cd "$REPO/$SRC" && md5sum -c /tmp/ai3000-nginx-remote.md5 2>/dev/null ) \
        | awk -F': ' '{ if ($2=="OK") ok++; else print "  ✗ 不一致: "$1 } END { printf "  一致 %d 个\n", ok }'
      for f in $FILES; do
        grep -q " $f\$" /tmp/ai3000-nginx-remote.md5 || echo "  ✗ 线上缺失: $f"
      done
    fi
    echo "  本地待部署共 $(echo $FILES | wc -w) 个文件。"
    ;;

  --apply)
    TS=$(date +%Y%m%d-%H%M%S)
    MANIFEST=/tmp/ai3000-nginx-manifest-local.txt
    # 备份**线上已有的**那些：本批里有几个文件是新增的（线上还没有），tar 遇到
    # 不存在的路径会整条命令失败并 `set -e` 退出 —— 第一次跑就这么死在备份这一步。
    # 新增文件的「回滚」不是解压覆盖，是删掉，故它本来也没什么可备份的。
    EXIST=$(ss "cd $REMOTE_WEB && for f in $FILES; do [ -f \"\$f\" ] && echo \$f; done" | tr '\n' ' ')
    echo "── 1/5 备份线上 $REMOTE_WEB → /root/ai3000-nginx-$TS.tgz（已有 $([ -n "$EXIST" ] && echo "$EXIST" | wc -w || echo 0) 个；新增的不在里面，回滚＝删）"
    ss "tar czf /root/ai3000-nginx-$TS.tgz -C $REMOTE_WEB $EXIST && ls -l /root/ai3000-nginx-$TS.tgz"
    echo "$EXIST" > /tmp/ai3000-nginx-wave-$TS.txt

    echo "── 2/5 上传（tar 走 ssh 管道，不经第三方中转）"
    ( cd "$REPO/$SRC" && tar czf - $FILES ) | ss "cat > /tmp/ai3000-nginx-$TS.tgz"
    ss "ls -l /tmp/ai3000-nginx-$TS.tgz"

    echo "── 3/5 解到暂存区并按清单核对（不匹配就**不落地**）"
    manifest > "$MANIFEST"
    ss 'cat > /tmp/ai3000-nginx-manifest.txt' < "$MANIFEST"
    ss "rm -rf /tmp/ai3000-nginx-stage-$TS && mkdir -p /tmp/ai3000-nginx-stage-$TS \
        && tar xzf /tmp/ai3000-nginx-$TS.tgz -C /tmp/ai3000-nginx-stage-$TS \
        && cd /tmp/ai3000-nginx-stage-$TS && md5sum -c /tmp/ai3000-nginx-manifest.txt"

    echo "── 4/5 落地到 $REMOTE_WEB"
    ss "cd $REMOTE_WEB && tar xzf /tmp/ai3000-nginx-$TS.tgz \
        && md5sum -c /tmp/ai3000-nginx-manifest.txt"

    echo "── 5/5 线上取回再核一次（清单证明的是「传对了」，这一步证明「线上就是它」）"
    sh "$0" --verify || echo "  ⚠ 取回核对未全绿 —— 看上面的清单"

    echo
    echo "完成。回滚（先还原被替换的，再删掉本批新增的）："
    echo "  SSHPASS=... sh tools/ss.sh 'tar xzf /root/ai3000-nginx-$TS.tgz -C $REMOTE_WEB'"
    echo "  SSHPASS=... sh tools/ss.sh 'cd $REMOTE_WEB && rm -f js/ui_common.js js/ai_panel.js js/liuyao_render.js js/liuyao_ai_panel.js css/liuyao_result.css'"
    echo "  （备份里没有的那几个就是本批新增的；删掉后页面回到改前 —— 老页面不引它们）"
    ;;

  --verify)
    # 从**线上公开 URL** 取回（走 nginx 而不是读磁盘）：读磁盘只能证明文件落对了地方，
    # 取回才能证明 nginx 真在发这一份（路径写错、被别的 location 截走都会在这里露出来）。
    BASE=${BASE:-https://sqw.somtfly.com}
    bad=0
    for f in $FILES; do
      a=$(cd "$REPO/$SRC" && md5sum "$f" | cut -d' ' -f1)
      b=$(curl -s -m 20 "$BASE/$f" | md5sum | cut -d' ' -f1)
      if [ "$a" = "$b" ]; then printf "  ✓ %s\n" "$f"; else printf "  ✗ %s (local %s live %s)\n" "$f" "${a%${a#??????}}" "${b%${b#??????}}"; bad=1; fi
    done
    [ "$bad" = 0 ] && echo "  线上取回逐文件一致。" || { echo "  ✗ 有不一致。"; exit 1; }
    ;;

  *) echo "用法：$0 [--check|--apply|--verify]"; exit 2 ;;
esac

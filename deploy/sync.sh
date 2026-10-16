#!/bin/sh
# ════════════════════════════════════════════════════════════
# sync.sh — 把 src/ 下的源码同步到容器实际读取的 build/ 目录
#
# 为什么需要这个脚本
#   以前 build/ 同时充当四个身份：git 的真相来源、容器挂载的产物目录、
#   手工编辑的工作区、备份堆放处。结果是源码和产物互相覆盖，.bak 代替 git 干回滚。
#   现在只有一个规则：**人只改 src/，build/ 是它生成出来的**。
#
# 用法
#   ./deploy/sync.sh              同步所有目标
#   ./deploy/sync.sh --dry-run    只看会改什么，不动文件
#
# 两个容易踩的坑（都是实际发生过事故的）
#
#   1) 目录挂载 vs 单文件挂载
#      nginx 挂的是整个目录 → 普通 rsync 就行。
#      后端挂的是三个**单文件**（auth-server.js / config.js / chat-proxy.js）。
#      单文件 bind mount 钉在 inode 上：如果用编辑器 / sed -i 替换文件（新 inode），
#      容器会继续读旧 inode —— 改了代码"不生效"，而且完全静默。
#      所以后端用 rsync --inplace：直接写进原文件，inode 不变，挂载始终有效。
#
#   2) build/ 整个被删掉之后
#      rm -rf build 会让容器的挂载指向已删除的旧 inode（它还在服务旧内容）。
#      脚本检测到产物目录是新建的，就 --force-recreate 对应容器重新绑定。
# ════════════════════════════════════════════════════════════
set -eu

cd "$(dirname "$0")/.."

COMPOSE="docker/docker-compose.yml"

DRY=""
case "${1:-}" in
    -n|--dry-run) DRY="-n" ;;
    "") ;;
    *) echo "用法: $0 [--dry-run]" >&2; exit 2 ;;
esac

RECREATE=""          # 需要重建的 compose 服务名，空格分隔

# sync_dir <源码目录> <产物目录> <rsync 附加参数> <需要重建的服务名> <说明>
sync_dir() {
    src=$1
    dest=$2
    extra=$3
    service=$4
    note=$5

    [ -d "$src" ] || { echo "错误: 找不到源码目录 $src" >&2; exit 1; }

    if [ ! -d "$dest" ]; then
        [ -n "$DRY" ] || mkdir -p "$dest"
        RECREATE="$RECREATE $service"
    fi

    # --delete 是刻意的: 产物必须严格等于源码。少了它，从 src 删掉的文件会
    # 永远留在线上 —— 这正是当初孤儿文件堆积的机制。
    # -c 用校验和判断要不要传，不靠「大小 + 修改时间」：后者在同一秒内、
    # 大小不变的改写下会误判成「无需更新」，那就又变成静默不生效了。
    # shellcheck disable=SC2086
    rsync -a -c --delete $extra $DRY "$src"/ "$dest"/

    if [ -n "$DRY" ]; then
        echo "  [dry-run] $src/ → $dest/   ($note)"
    else
        echo "  $src/ → $dest/   共 $(find "$dest" -type f | wc -l) 个文件   ($note)"
    fi
}

echo "同步源码到产物目录："
sync_dir "src/web"    "build/nginx"   ""          "nginx"   "目录挂载，普通 rsync"
sync_dir "src/server" "build/backend" "--inplace" "backend" "单文件挂载，--inplace 保住 inode"

# 版本化：给 build/nginx 里每个静态资源引用打上内容哈希（?v=<sha256 前8位>）。
# 必须跑在 rsync 之后、自检之前 —— 版本号是产物的一部分，自检比的是
# 「容器读到的 == 产物里的」，晚了就比的是半成品。
# src/ 里不写任何版本号，人也不需要记得改：URL 永远跟着内容走。
if [ -n "$DRY" ]; then
    echo "  [dry-run] deploy/version-assets.py build/nginx   （给静态资源引用打内容哈希）"
else
    echo "版本化静态资源引用（src/ 里不写版本号，这里按内容算）："
    python3 deploy/version-assets.py build/nginx
fi

# 回归闸门: 内联 CSS/JS 曾经占了半个页面（ai-chat/index.html 80KB 里有 71KB 是内联），
# 外提到 css/page-*.css 与 js/page-*.js 之后才能被浏览器独立缓存、被工具检查。
# 这里挡住它再长回来。只告警不阻断 —— 部署不该因为一个风格问题停住。
echo "内联代码检查（>=1KB 的内联 <style>/<script> 应外提到 css/ 与 js/）："
if python3 deploy/extract-inline.py --check; then
    :
else
    echo "  ⚠ 执行 python3 deploy/extract-inline.py 外提后再提交（这会顺带修好上面这些）"
fi

if [ -n "$DRY" ]; then
    echo "(dry-run，未改动任何文件)"
    exit 0
fi

if [ -n "$RECREATE" ]; then
    echo "以下产物目录是新建的，重建容器以重新绑定挂载：$RECREATE"
    # shellcheck disable=SC2086
    docker compose -f "$COMPOSE" up -d --force-recreate $RECREATE
fi

# 自检: 逐文件比对 md5，确认容器读到的就是产物的内容。
# 为什么不是数文件个数: backend 容器的 /app 里还有镜像自带的 node_modules
# （6361 个文件），个数天然对不上；而且个数也发现不了「挂载绑在旧 inode 上、
# 内容已经过期」这种事故 —— 那恰恰是 nginx 配置事故的形态。要比内容。
echo "自检（逐文件 md5，容器读到的必须就是产物内容）："

host_web=$( (cd build/nginx && find . -type f -exec md5sum {} +) | sort | md5sum | cut -c1-12 )
ctr_web=$( docker exec ai3000-nginx sh -c 'cd /usr/share/nginx/html && find . -type f -exec md5sum {} +' 2>/dev/null | sort | md5sum | cut -c1-12 )
host_api=$( (cd build/backend && { md5sum auth-server.js config.js chat-proxy.js; find paipan -type f -exec md5sum {} +; }) | sort | md5sum | cut -c1-12 )
ctr_api=$( docker exec ai3000-backend sh -c 'cd /app && { md5sum auth-server.js config.js chat-proxy.js; find paipan -type f -exec md5sum {} +; }' 2>/dev/null | sort | md5sum | cut -c1-12 )

printf "  %-18s 产物 %s / 容器 %s  %s\n" "ai3000-nginx"   "$host_web" "$ctr_web" "$([ "$host_web" = "$ctr_web" ] && echo ✓ || echo ✗)"
printf "  %-18s 产物 %s / 容器 %s  %s\n" "ai3000-backend" "$host_api" "$ctr_api" "$([ "$host_api" = "$ctr_api" ] && echo ✓ || echo ✗)"

if [ "$host_web" != "$ctr_web" ] || [ "$host_api" != "$ctr_api" ]; then
    echo "  ✗ 有容器读到的不是产物内容（多半是挂载绑在旧 inode 上，改了代码不生效）"
    echo "    修复: docker compose -f $COMPOSE up -d --force-recreate <服务名>"
fi

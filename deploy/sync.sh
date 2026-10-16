#!/bin/sh
# ════════════════════════════════════════════════════════════
# sync.sh — 把 src/web/ 同步到 nginx 实际服务的目录 build/nginx/
#
# 为什么需要这个脚本
#   以前 build/nginx/ 同时充当四个身份：git 的真相来源、nginx 的挂载产物目录、
#   手工编辑的工作区、备份堆放处。结果是源码和产物互相覆盖，.bak 代替 git 干回滚。
#   现在只有一个规则：**人只改 src/web/，build/nginx/ 是它生成出来的**。
#
# 用法
#   ./deploy/sync.sh              同步
#   ./deploy/sync.sh --dry-run    只看会改什么，不动文件
#
# 两个要点
#   - build/nginx 已存在时，rsync 只改目录里的内容，不换目录 inode，
#     所以容器立刻能看到新文件，不需要重启 nginx。
#   - build/nginx 不存在时（首次部署，或 rm -rf build 之后），新建目录后必须
#     重建 nginx 容器，否则容器还绑在已删除的旧 inode 上（会一直服务旧内容）。
# ════════════════════════════════════════════════════════════
set -eu

cd "$(dirname "$0")/.."

SRC="src/web"
DEST="build/nginx"
COMPOSE="docker/docker-compose.yml"
CONTAINER="ai3000-nginx"

DRY=""
case "${1:-}" in
    -n|--dry-run) DRY="-n" ;;
    "") ;;
    *) echo "用法: $0 [--dry-run]" >&2; exit 2 ;;
esac

[ -d "$SRC" ] || { echo "错误: 找不到源码目录 $SRC" >&2; exit 1; }

FRESH=0
if [ ! -d "$DEST" ]; then
    FRESH=1
    [ -n "$DRY" ] || mkdir -p "$DEST"
    echo "注意: $DEST 不存在，将新建"
fi

# --delete 是刻意的: 产物的内容必须严格等于源码。
# 少了它，从 src/web 删掉的文件会永远留在线上（这正是当初孤儿文件堆积的机制）。
# shellcheck disable=SC2086
rsync -a --delete $DRY "$SRC"/ "$DEST"/

if [ -n "$DRY" ]; then
    echo "(dry-run，未改动任何文件)"
    exit 0
fi

echo "已同步 $SRC/ → $DEST/   共 $(find "$DEST" -type f | wc -l) 个文件"

if [ "$FRESH" = 1 ]; then
    echo "重建 $CONTAINER 容器以重新绑定挂载点…"
    docker compose -f "$COMPOSE" up -d --force-recreate nginx
fi

# 自检: 容器内看到的文件数应当与产物一致。
# 这条检查是有来历的 —— 单文件挂载时换 inode 曾导致容器读的是旧配置，
# 当时靠比对 md5 才发现。文件数是同类问题的廉价哨兵。
if docker ps --filter "name=$CONTAINER" --format '{{.Names}}' 2>/dev/null | grep -q "$CONTAINER"; then
    local_n=$(find "$DEST" -type f | wc -l)
    in_container=$(docker exec "$CONTAINER" sh -c 'find /usr/share/nginx/html -type f | wc -l' 2>/dev/null || echo "?")
    echo "自检: 产物 $local_n 个文件 / 容器内 $in_container 个文件"
    [ "$local_n" = "$in_container" ] || echo "警告: 数量不一致，容器可能绑在旧 inode 上，试试 docker compose -f $COMPOSE up -d --force-recreate nginx"
fi

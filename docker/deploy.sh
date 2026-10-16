#!/bin/bash
# 易三千 部署入口
#
# 现在只有一条路能保证「源码 → 产物 → 容器」三者一致：deploy/sync.sh
# （它做 rsync -c + 必要时 --force-recreate + md5 自检）。这个脚本只是它的快捷方式，
# 免得有人凭记忆敲 docker compose restart，然后发现改了 src/ 却什么都没变。
#
# 用法:
#   ./deploy.sh              同步源码到产物并自检（等价于 ../deploy/sync.sh）
#   ./deploy.sh --dry-run    只看会改什么，不动任何文件
#   ./deploy.sh --build      重建镜像（⚠️ 见下）

set -e
cd "$(dirname "$0")"

case "${1:-}" in
  --build)
    echo "⚠️  --build 已失效。"
    echo "    docker-compose.yml 里所有服务都是 image: docker-*:latest，没有 build: 键，"
    echo "    所以 docker compose build 是空操作（不会报错，也不会重建任何东西）。"
    echo "    真要重建镜像，手动指定 dockerfile 和上下文："
    echo "      docker build -f src/server/Dockerfile -t docker-backend:latest src/server"
    echo "      docker build -f src/rag/Dockerfile    -t docker-rag:latest     src/rag"
    echo "      docker build -f src/upload/Dockerfile -t docker-upload:latest  src/upload"
    exit 1
    ;;
  *)
    exec ../deploy/sync.sh "$@"
    ;;
esac

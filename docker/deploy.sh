#!/bin/bash
# 易三千 快速部署脚本
# 用法:
#   ./deploy.sh           — 重启 nginx + backend，前端/后端代码修改即时生效
#   ./deploy.sh --build   — 完整重建镜像（依赖变更时需要）

set -e
cd "$(dirname "$0")"

if [ "$1" = "--build" ]; then
  echo "==> 完整重建 Docker 镜像..."
  docker compose build
  echo "==> 重新部署..."
  docker compose up -d
else
  echo "==> 文件变更即时生效（bind mount），重启容器..."
  docker compose restart nginx backend
fi

echo "==> 等待健康检查..."
sleep 5
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep ai3000
echo ""
echo "✅ 部署完成"
echo "   现在修改文件后只需运行 ./deploy.sh 即可生效"
echo "   依赖变更时运行 ./deploy.sh --build"

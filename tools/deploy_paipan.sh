#!/bin/sh
# 部署六爻排盘/断卦层到线上：
#   备份 → 上传 → 清单核对 → 落地 → 容器内预检 → 重启 → （另跑）端到端探针
#
# 为什么不用 `docker compose up -d`：`paipan/` 在 compose 里是**整目录**挂载，
# 新增 `yongshen.js` 无需改 compose；`auth-server.js` 是单文件挂载，内容变了
# 只需**重启容器**（require 有缓存）。配置未变时 compose up -d 是空操作。
#
# 用法：
#   SSHPASS=... sh tools/deploy_paipan.sh --check    # 只读：比哈希，不动线上
#   SSHPASS=... sh tools/deploy_paipan.sh --apply    # 备份 + 上传 + 重启
#   SSHPASS=... sh tools/deploy_paipan.sh --probe    # 只跑容器内端到端探针
#
# 密码只走 SSHPASS 环境变量（见 tools/ss.sh），**不落盘、不进命令行**。
# 若 SSHPASS 未设，回落读 /tmp/ai3000_pass（由**本人**创建，不在仓库内）。
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/.." && pwd)
REMOTE_BUILD=/var/www/sqw.somtfly.com/build/backend
CONTAINER=ai3000-backend
MODE=${1:---check}

if [ -z "${SSHPASS:-}" ] && [ -r /tmp/ai3000_pass ]; then
  SSHPASS=$(cat /tmp/ai3000_pass)
  export SSHPASS
fi
: "${SSHPASS:?未设 SSHPASS —— 见本文件头注}"

ss() { sh "$HERE/ss.sh" "$@"; }

# 要部署的文件（相对 build/backend/）。relations.js 本批未改，不列，避免无谓覆盖。
FILES="paipan/yongshen.js paipan/liuyao.js auth-server.js"
for f in $FILES; do
  [ -f "$REPO/build/backend/$f" ] || { echo "缺文件：build/backend/$f"; exit 1; }
done

manifest() { ( cd "$REPO/build/backend" && md5sum $FILES ); }

preflight_container() {
  # 预检脚本先落到宿主机，再 docker cp 进容器（容器里没有这个文件）
  ss 'cat > /tmp/preflight_paipan.js' < "$HERE/preflight_paipan.js"
  ss "docker cp /tmp/preflight_paipan.js $CONTAINER:/tmp/preflight_paipan.js"
  ss "docker exec $CONTAINER node /tmp/preflight_paipan.js"
}

case "$MODE" in
  --check)
    echo "── 本地（待部署）"
    manifest | sed 's/^/  /'
    echo "── 线上宿主机挂载源 $REMOTE_BUILD"
    ss "cd $REMOTE_BUILD && md5sum $FILES 2>&1 | sed 's/^/  /'"
    echo "── 线上容器内（实际运行的即此份）"
    ss "docker exec $CONTAINER sh -c 'cd /app && md5sum $FILES 2>&1' | sed 's/^/  /'"
    ;;

  --probe)
    echo "── 容器内端到端探针（用容器自身的 DEEPSEEK_API_KEY，不传密钥）"
    ss 'cat > /tmp/probe_liuyao_ai.js' < "$REPO/tools/probe_liuyao_ai.js"
    ss "docker cp /tmp/probe_liuyao_ai.js $CONTAINER:/tmp/probe_liuyao_ai.js"
    ss "docker exec $CONTAINER node /tmp/probe_liuyao_ai.js"
    ;;

  --apply)
    TS=$(date +%Y%m%d-%H%M%S)
    MANIFEST=/tmp/ai3000-manifest-local.txt
    echo "── 1/6 备份线上 $REMOTE_BUILD → /root/ai3000-backend-$TS.tgz"
    ss "tar czf /root/ai3000-backend-$TS.tgz -C $REMOTE_BUILD paipan auth-server.js && ls -l /root/ai3000-backend-$TS.tgz"

    echo "── 2/6 上传（tar 走 ssh 管道，不经第三方中转）"
    ( cd "$REPO/build/backend" && tar czf - $FILES ) | ss "cat > /tmp/ai3000-deploy-$TS.tgz"
    ss "ls -l /tmp/ai3000-deploy-$TS.tgz"

    echo "── 3/6 解到暂存区并按清单核对（不匹配就**不落地**）"
    manifest > "$MANIFEST"
    ss 'cat > /tmp/ai3000-manifest.txt' < "$MANIFEST"
    ss "rm -rf /tmp/ai3000-stage-$TS && mkdir -p /tmp/ai3000-stage-$TS \
        && tar xzf /tmp/ai3000-deploy-$TS.tgz -C /tmp/ai3000-stage-$TS \
        && cd /tmp/ai3000-stage-$TS && md5sum -c /tmp/ai3000-manifest.txt"

    echo "── 4/6 落地到 $REMOTE_BUILD"
    ss "cd $REMOTE_BUILD && tar xzf /tmp/ai3000-deploy-$TS.tgz \
        && md5sum -c /tmp/ai3000-manifest.txt"

    echo "── 5/6 容器内预检（restart 之前先确认能加载）"
    preflight_container

    echo "── 6/6 重启 $CONTAINER"
    ss "docker restart $CONTAINER"
    sleep 3
    ss "docker ps --filter name=$CONTAINER --format '  {{.Names}} {{.Status}}'"
    echo
    echo "完成。回滚："
    echo "  tar xzf /root/ai3000-backend-$TS.tgz -C $REMOTE_BUILD && docker restart $CONTAINER"
    echo "接着跑：SSHPASS=... sh tools/deploy_paipan.sh --probe"
    ;;

  *) echo "用法：$0 [--check|--apply|--probe]"; exit 2 ;;
esac

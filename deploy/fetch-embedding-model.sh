#!/bin/sh
# ════════════════════════════════════════════════════════════
# fetch-embedding-model.sh — 把 rag 的本地向量模型灌进持久卷
#
# 为什么需要这个脚本
#   rag 用 fastembed 跑本地 ONNX 模型（BAAI/bge-small-zh-v1.5，512 维）。
#   两个坑叠在一起：① 该模型在 fastembed 0.3.5 的注册表里**只有 GCS 一个下载源**，
#   而那个源已经 403（所以设 HF_ENDPOINT 也没用 —— 它根本没有 hf 源可走）；
#   ② 容器没设 FASTEMBED_CACHE_PATH，缓存默认落在容器内 /tmp，容器一重建就丢。
#   于是模型下载不回来、也留不住，检索接口全 500，解卦拿不到【参考古籍】。
#
#   所以模型不能指望容器自己下，必须由本脚本预先放进 compose 挂的卷里。
#   fastembed 认的路径是 <FASTEMBED_CACHE_PATH>/fast-<模型名最后一段>。
#
# 用法
#   ./deploy/fetch-embedding-model.sh           已有就跳过
#   ./deploy/fetch-embedding-model.sh --force   强制重下
# ════════════════════════════════════════════════════════════
set -eu

VOLUME=ai3000_model_cache
SUBDIR=fast-bge-small-zh-v1.5
REPO=Qdrant/bge-small-zh-v1.5
MIRROR=${HF_MIRROR:-https://hf-mirror.com}
IMAGE=${RAG_IMAGE:-docker-rag:latest}
FILES="model_optimized.onnx config.json tokenizer.json tokenizer_config.json special_tokens_map.json vocab.txt"

FORCE=""
[ "${1:-}" = "--force" ] && FORCE=1

command -v docker >/dev/null || { echo "找不到 docker" >&2; exit 1; }

# 卷里已经有模型就跳过（除非 --force）
if [ -z "$FORCE" ]; then
  if docker run --rm -v "$VOLUME":/dst "$IMAGE" \
       test -s "/dst/$SUBDIR/model_optimized.onnx" 2>/dev/null; then
    echo "模型已在卷 $VOLUME 里，跳过（要重下加 --force）"
    exit 0
  fi
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT INT TERM
mkdir -p "$STAGE/$SUBDIR"

echo "从 $MIRROR 下载 $REPO（约 95MB）..."
for f in $FILES; do
  printf '  %-26s' "$f"
  curl -fsSL --retry 3 --retry-delay 2 -o "$STAGE/$SUBDIR/$f" \
    "$MIRROR/$REPO/resolve/main/$f"
  printf '%s\n' "$(du -h "$STAGE/$SUBDIR/$f" | cut -f1)"
done

docker volume create "$VOLUME" >/dev/null
docker run --rm -v "$VOLUME":/dst -v "$STAGE":/src:ro "$IMAGE" \
  sh -c "rm -rf /dst/$SUBDIR && cp -r /src/$SUBDIR /dst/"

# 断网加载一次：这才是真正的验收（网络被切断，能出向量就证明模型真的在卷里）
echo "断网自检..."
docker run --rm --network none -v "$VOLUME":/app/model_cache \
  -e FASTEMBED_CACHE_PATH=/app/model_cache "$IMAGE" python -c "
from fastembed import TextEmbedding
m = TextEmbedding(model_name='BAAI/bge-small-zh-v1.5', threads=1)
v = next(iter(m.embed(['求财'])))
assert len(v) == 512, len(v)
print('  ✓ 缓存目录', m.model.cache_dir, '维度', len(v))
"
echo "完成。"

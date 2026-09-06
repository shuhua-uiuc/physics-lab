#!/usr/bin/env bash
# 构建 web + backend 镜像
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "❌ 未找到 .env，请先：cp docker.env.example .env  并填入真实密钥"
  exit 1
fi

docker compose build "$@"
echo
echo "✔ 构建完成。启动：scripts/docker-up.sh"

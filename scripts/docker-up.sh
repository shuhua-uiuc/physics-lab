#!/usr/bin/env bash
# 启动（构建后/已构建）
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "❌ 未找到 .env，请先：cp docker.env.example .env  并填入真实密钥"
  exit 1
fi

docker compose up -d "$@"
echo
echo "✔ 已启动。前端: http://localhost:${WEB_PORT:-8080}  日志: docker compose logs -f"

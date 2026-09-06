#!/usr/bin/env bash
# 停止并移除容器（保留 db-data 卷与镜像）
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose down "$@"

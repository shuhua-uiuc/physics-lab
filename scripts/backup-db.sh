#!/bin/bash
#
# 物理实验室数据库备份。
#
# 在**部署服务器**上执行（需要 docker 权限）。用 SQLite 官方的在线备份 API
# （`Connection.backup`）而不是直接 cp 文件——直接复制一个正在写入的 SQLite 文件
# 可能拿到撕裂的、无法打开的副本。
#
# 用法：
#   ./backup-db.sh                    # 备份到默认目录
#   BACKUP_DIR=/mnt/x ./backup-db.sh  # 指定目录
#
# 建议配 cron 每日自动执行（可用 scripts/install-backup-cron.sh 一键安装）。
set -euo pipefail

# 与 docker-compose.yml 中的卷名保持一致；改过 COMPOSE_PROJECT_NAME 时需同步
VOLUME="${VOLUME:-physics_lab_db-data}"
IMAGE="${IMAGE:-physics_lab-backend}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/physics_lab}"
KEEP_DAYS="${KEEP_DAYS:-30}"

STAMP="$(date +%F_%H%M)"
OUT="physics_lab_${STAMP}.db"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "${VOLUME}:/data" \
  -v "${BACKUP_DIR}:/backup" \
  -e OUT="$OUT" \
  --entrypoint python \
  "$IMAGE" -c "
import os, sqlite3, sys
src = sqlite3.connect('/data/physics_lab.db')
dst = sqlite3.connect('/backup/' + os.environ['OUT'])
with dst:
    src.backup(dst)
dst.close()
src.close()
"

SIZE="$(du -h "${BACKUP_DIR}/${OUT}" | cut -f1)"
echo "$(date +'%F %T')  备份完成  ${OUT}  (${SIZE})"

# 清理过期备份
DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name 'physics_lab_*.db' -type f -mtime "+${KEEP_DAYS}" -print -delete | wc -l)"
if [ "$DELETED" -gt 0 ]; then
  echo "$(date +'%F %T')  已清理 ${DELETED} 份超过 ${KEEP_DAYS} 天的旧备份"
fi

#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date +%F-%H%M%S)"
mkdir -p backups

# 数据库备份
docker exec mysql sh -lc 'mysqldump -uroot -proot jianliao' > "backups/mysql-${STAMP}.sql"

# 文件备份（首版先按 uploads 目录约定；目录不存在则跳过）
if [[ -d uploads ]]; then
  tar -czf "backups/files-${STAMP}.tgz" uploads
else
  echo "uploads 目录不存在，跳过文件备份"
fi


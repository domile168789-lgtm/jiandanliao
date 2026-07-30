#!/usr/bin/env bash
set -euo pipefail

SQL_FILE="${1:?Usage: restore.sh <sql_file>}"
docker exec -i mysql sh -lc 'mysql -uroot -proot jianliao' < "$SQL_FILE"


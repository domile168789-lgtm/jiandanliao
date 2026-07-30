#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="${ROOT_DIR}/infra/compose"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
ENV_FILE="${PHASE1_ENV_FILE:-${COMPOSE_DIR}/.env}"
COMPOSE_ARGS=(-f "${COMPOSE_FILE}")
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -f "${ENV_FILE}" && -f "${COMPOSE_DIR}/.env.example" ]]; then
  ENV_FILE="${COMPOSE_DIR}/.env.example"
fi

if [[ -f "${ENV_FILE}" ]]; then
  echo "[backup] loading env file: ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  COMPOSE_ARGS=(--env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}")
fi

BACKUP_ROOT="${PHASE1_BACKUP_DIR:-${ROOT_DIR}/backups/phase1}"
BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"
MYSQL_DUMP_FILE="${BACKUP_DIR}/mysql-${TIMESTAMP}.sql"
BOOTSTRAP_ARCHIVE="${BACKUP_DIR}/bootstrap-${TIMESTAMP}.tar.gz"
MINIO_ARCHIVE="${BACKUP_DIR}/minio-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

echo "[backup] exporting mysql database: ${MYSQL_DATABASE}"
docker compose "${COMPOSE_ARGS[@]}" exec -T mysql \
  mysqldump -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" > "${MYSQL_DUMP_FILE}"

echo "[backup] archiving bootstrap assets"
tar -czf "${BOOTSTRAP_ARCHIVE}" -C "${ROOT_DIR}" infra/compose infra/nginx infra/mysql

MINIO_CONTAINER_ID="$(docker compose "${COMPOSE_ARGS[@]}" ps -q minio)"
if [[ -n "${MINIO_CONTAINER_ID}" ]]; then
  echo "[backup] archiving minio objects"
  docker run --rm \
    --volumes-from "${MINIO_CONTAINER_ID}" \
    -v "${BACKUP_DIR}:/backup" \
    busybox tar -czf "/backup/$(basename "${MINIO_ARCHIVE}")" -C /data .
else
  echo "[backup] minio container not found, skipping object archive"
fi

echo "[backup] done"
echo "[backup] mysql dump: ${MYSQL_DUMP_FILE}"
echo "[backup] bootstrap archive: ${BOOTSTRAP_ARCHIVE}"
if [[ -f "${MINIO_ARCHIVE}" ]]; then
  echo "[backup] minio archive: ${MINIO_ARCHIVE}"
fi

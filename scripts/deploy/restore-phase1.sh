#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: bash scripts/deploy/restore-phase1.sh <mysql_dump.sql> [minio_backup.tar.gz]"
  exit 1
fi

resolve_path() {
  local target="$1"
  local target_dir

  target_dir="$(cd "$(dirname "${target}")" && pwd)"
  printf '%s/%s\n' "${target_dir}" "$(basename "${target}")"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="${ROOT_DIR}/infra/compose"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
ENV_FILE="${PHASE1_ENV_FILE:-${COMPOSE_DIR}/.env}"
COMPOSE_ARGS=(-f "${COMPOSE_FILE}")

if [[ ! -f "${ENV_FILE}" && -f "${COMPOSE_DIR}/.env.example" ]]; then
  ENV_FILE="${COMPOSE_DIR}/.env.example"
fi

if [[ -f "${ENV_FILE}" ]]; then
  echo "[restore] loading env file: ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  COMPOSE_ARGS=(--env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}")
fi

MYSQL_DUMP_FILE="$(resolve_path "$1")"
if [[ ! -f "${MYSQL_DUMP_FILE}" ]]; then
  echo "[restore] mysql dump not found: ${MYSQL_DUMP_FILE}"
  exit 1
fi

MINIO_ARCHIVE_FILE=""
if [[ $# -ge 2 ]]; then
  MINIO_ARCHIVE_FILE="$(resolve_path "$2")"
  if [[ ! -f "${MINIO_ARCHIVE_FILE}" ]]; then
    echo "[restore] minio archive not found: ${MINIO_ARCHIVE_FILE}"
    exit 1
  fi
fi

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"

echo "[restore] ensuring mysql and minio are running"
docker compose "${COMPOSE_ARGS[@]}" up -d mysql minio >/dev/null

echo "[restore] importing mysql dump"
docker compose "${COMPOSE_ARGS[@]}" exec -T mysql \
  mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < "${MYSQL_DUMP_FILE}"

if [[ -n "${MINIO_ARCHIVE_FILE}" ]]; then
  echo "[restore] restoring minio objects"
  MINIO_CONTAINER_ID="$(docker compose "${COMPOSE_ARGS[@]}" ps -q minio)"
  if [[ -z "${MINIO_CONTAINER_ID}" ]]; then
    echo "[restore] minio container is not available"
    exit 1
  fi

  docker run --rm \
    --volumes-from "${MINIO_CONTAINER_ID}" \
    -v "$(dirname "${MINIO_ARCHIVE_FILE}"):/backup:ro" \
    busybox sh -lc \
    "rm -rf /data/* && tar -xzf \"/backup/$(basename "${MINIO_ARCHIVE_FILE}")\" -C /data"

  docker compose "${COMPOSE_ARGS[@]}" restart minio >/dev/null
fi

echo "[restore] done"

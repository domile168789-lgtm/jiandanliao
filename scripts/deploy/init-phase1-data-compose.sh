#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="${ROOT_DIR}/infra/compose"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
ENV_FILE="${PHASE1_ENV_FILE:-${COMPOSE_DIR}/.env}"
COMPOSE_ARGS=(-f "${COMPOSE_FILE}")

if [[ ! -f "${ENV_FILE}" && -f "${COMPOSE_DIR}/.env.example" ]]; then
  ENV_FILE="${COMPOSE_DIR}/.env.example"
fi

if [[ -f "${ENV_FILE}" ]]; then
  echo "[init] loading env file: ${ENV_FILE}"
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  COMPOSE_ARGS=(--env-file "${ENV_FILE}" "${COMPOSE_ARGS[@]}")
fi

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"

echo "[init] using compose file: ${COMPOSE_FILE}"
echo "[init] ensuring core services are running..."
docker compose "${COMPOSE_ARGS[@]}" up -d mysql redis minio api ws nginx >/dev/null

# 1) 确保 schema 已加载（docker-entrypoint-initdb.d 只会在首次创建数据卷时执行）
SCHEMA_EXISTS="$(
  docker compose "${COMPOSE_ARGS[@]}" exec -T mysql \
    mysql -N -B -uroot "-p${MYSQL_ROOT_PASSWORD}" information_schema \
    -e "SELECT COUNT(*) FROM tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='messages';"
)"

if [[ "${SCHEMA_EXISTS}" == "0" ]]; then
  echo "[init] applying schema..."
  docker compose "${COMPOSE_ARGS[@]}" exec -T mysql \
    mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < "${ROOT_DIR}/infra/mysql/001_init.sql"
else
  echo "[init] schema already present, skipping schema apply"
fi

# 2) 写入演示数据
echo "[init] inserting demo data..."
cat <<'SQL' | docker compose "${COMPOSE_ARGS[@]}" exec -T mysql \
  mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}"
INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
VALUES
  ('u_demo_1', '85510000001', '演示用户1', 'ACTIVE', NOW(), NOW()),
  ('u_demo_2', '85510000002', '演示用户2', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);

INSERT INTO conversations (id, type, title, last_message, updated_at)
VALUES ('c_demo_1', 'DM', NULL, NULL, NOW())
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);

INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
VALUES
  ('cm_demo_1', 'c_demo_1', 'u_demo_1', 'OWNER', NOW()),
  ('cm_demo_2', 'c_demo_1', 'u_demo_2', 'MEMBER', NOW())
ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at);

INSERT INTO reports (id, reporter_user_id, target_type, target_id, reason, status, created_at)
VALUES (
  'r_demo_1',
  'u_demo_1',
  'USER',
  'u_demo_2',
  'spam links in direct messages',
  'OPEN',
  NOW()
)
ON DUPLICATE KEY UPDATE
  reason = VALUES(reason),
  status = VALUES(status),
  created_at = VALUES(created_at);

INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, created_at)
VALUES ('aa_demo_1', 'admin:operator', 'INIT_DEMO', 'SYSTEM', 'phase1', NOW())
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);
SQL

echo "[init] done"

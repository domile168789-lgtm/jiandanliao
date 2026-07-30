#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SCHEMA_FILE="${PROJECT_ROOT}/infra/mysql/001_init.sql"
DATABASE_URL="${DATABASE_URL:-mysql://root:root@127.0.0.1:3306/jianliao}"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client is required but was not found in PATH" >&2
  exit 1
fi

mapfile -t MYSQL_ARGS < <(python3 - "${DATABASE_URL}" <<'PY'
from urllib.parse import urlparse, unquote
import sys

raw = sys.argv[1]
parsed = urlparse(raw)

if parsed.scheme and parsed.scheme != "mysql":
    raise SystemExit(f"unsupported DATABASE_URL scheme: {parsed.scheme}")

database = parsed.path.lstrip("/") or "jianliao"
args = [
    f"--host={parsed.hostname or '127.0.0.1'}",
    f"--port={parsed.port or 3306}",
    f"--user={unquote(parsed.username or 'root')}",
]

password = unquote(parsed.password or "")
if password:
    args.append(f"--password={password}")

args.append(database)

for arg in args:
    print(arg)
PY
)

mysql "${MYSQL_ARGS[@]}" < "${SCHEMA_FILE}"

mysql "${MYSQL_ARGS[@]}" <<'SQL'
INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
VALUES
  ('u_demo_1', '85510000001', '演示用户1', 'ACTIVE', NOW(), NOW()),
  ('u_demo_2', '85510000002', '演示用户2', 'ACTIVE', NOW(), NOW()),
  ('u_demo_3', '85510000003', '运营演示账号', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  status = VALUES(status),
  updated_at = VALUES(updated_at);

INSERT INTO conversations (id, type, title, last_message, updated_at)
VALUES ('c_demo_1', 'DM', NULL, '欢迎来到柬聊阶段1演示会话', NOW())
ON DUPLICATE KEY UPDATE
  last_message = VALUES(last_message),
  updated_at = VALUES(updated_at);

INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at)
VALUES
  ('cm_demo_1', 'c_demo_1', 'u_demo_1', 'OWNER', NOW()),
  ('cm_demo_2', 'c_demo_1', 'u_demo_2', 'MEMBER', NOW())
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  joined_at = VALUES(joined_at);

INSERT INTO messages (id, conversation_id, sender_id, type, status, body, created_at)
VALUES (
  'm_demo_1',
  'c_demo_1',
  'u_demo_1',
  'TEXT',
  'SENT',
  JSON_OBJECT('text', '欢迎来到柬聊阶段1演示会话'),
  NOW()
)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  body = VALUES(body);

INSERT INTO announcements (id, title, content, status, created_by, created_at)
VALUES (
  'a_demo_1',
  '阶段1联调公告',
  '共享后端平台阶段1演示数据已准备完成，可用于多端联调。',
  'PUBLISHED',
  'SYSTEM',
  NOW()
)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content),
  status = VALUES(status);

INSERT INTO reports (id, reporter_user_id, target_type, target_id, reason, status, created_at)
VALUES (
  'r_demo_1',
  'u_demo_2',
  'MESSAGE',
  'm_demo_1',
  '演示举报数据，用于后台联调。',
  'OPEN',
  NOW()
)
ON DUPLICATE KEY UPDATE
  reason = VALUES(reason),
  status = VALUES(status);

INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, created_at)
VALUES (
  'aa_demo_1',
  'SYSTEM',
  'CREATE_ANNOUNCEMENT',
  'ANNOUNCEMENT',
  'a_demo_1',
  NOW()
)
ON DUPLICATE KEY UPDATE
  action = VALUES(action),
  target_id = VALUES(target_id);
SQL

echo "Phase 1 schema and demo data initialized successfully."

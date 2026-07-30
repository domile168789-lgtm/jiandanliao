#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PHASE1_BASE_URL:-http://127.0.0.1}"

curl -fsS "${BASE_URL}/healthz" >/dev/null
curl -fsS "${BASE_URL}/api/health" >/dev/null
curl -fsS "${BASE_URL}/health" >/dev/null

echo "[phase1-smoke] nginx ok"
echo "[phase1-smoke] api ok"
echo "[phase1-smoke] ws ok"
echo "[phase1-smoke] uploads entrypoint: ${BASE_URL}/uploads/"

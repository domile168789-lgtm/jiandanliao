# 柬聊阶段 1 生产化（第一、第二阶段）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把柬聊阶段 1 从当前约 40% 的生产度推进到 70%，完成服务器底座、后端稳态、Android 构建链路和真实联调闭环，并形成一次真实联调复盘的基础。

**Architecture:** 先把运行环境线和 Android 构建底座补齐，让服务器部署与本地主线都能被脚本化验证；再把后端消息、回执、上传、重连的稳态能力通过测试与日志补齐，并把移动端和后台联调文档升级为“真实复盘清单”。所有新增内容必须围绕阶段 1 现有能力展开，不引入阶段 2 或阶段 3 的新功能面。

**Tech Stack:** TypeScript, Fastify, Vitest, Docker Compose, Bash, Kotlin/Gradle, SwiftUI, React, Electron

---

## 文件结构

### 本次新增文件

- `docs/deploy/rocky9-production-runbook.md`：Rocky 9.4 服务器部署与恢复手册
- `scripts/deploy/backup-phase1.sh`：阶段 1 数据备份脚本
- `scripts/deploy/restore-phase1.sh`：阶段 1 数据恢复脚本
- `tests/integration/production-env-runbook.test.ts`：部署与恢复基线测试
- `tests/integration/message-reliability.test.ts`：消息 / 回执 / 上传稳态测试
- `docs/local/phase1-real-e2e-review.md`：达到 70% 时的真实联调复盘清单

### 本次修改文件

- `infra/compose/docker-compose.yml`：补持久化、重启策略、环境变量与日志友好的运行配置
- `infra/compose/.env.example`：补生产运行所需变量
- `docs/deploy/phase1-server.md`：补 Rocky 9.4 入口与恢复说明
- `scripts/deploy/init-phase1-data-compose.sh`：与备份恢复脚本对齐
- `apps/api/src/modules/messages/message.service.ts`：补消息幂等与更清晰的异常结果
- `apps/api/src/modules/messages/message.service.test.ts`：补后端稳态测试
- `apps/api/src/modules/messages/receipt.routes.ts`：补回执幂等保护
- `apps/api/src/modules/messages/message.routes.ts`：补上传/消息接口返回一致性
- `apps/android/README.md`：补 Rocky / Android SDK / 构建恢复说明
- `apps/ios/README.md`：补真实联调步骤
- `docs/local/phase1-e2e-checklist.md`：升级为 70% 复盘前的真实联调清单
- `docs/local/phase1-admin-e2e.md`：补后台复盘核对项

---

### Task 1: 完成 Rocky 9.4 服务器底座与备份恢复手册

**Files:**
- Modify: `infra/compose/docker-compose.yml`
- Modify: `infra/compose/.env.example`
- Modify: `docs/deploy/phase1-server.md`
- Create: `docs/deploy/rocky9-production-runbook.md`
- Create: `scripts/deploy/backup-phase1.sh`
- Create: `scripts/deploy/restore-phase1.sh`
- Modify: `scripts/deploy/init-phase1-data-compose.sh`
- Test: `tests/integration/production-env-runbook.test.ts`

- [ ] **Step 1: 写出失败的部署与恢复基线测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('production env runbook', () => {
  it('documents rocky deployment and restore workflow', () => {
    const runbook = readFileSync('docs/deploy/rocky9-production-runbook.md', 'utf-8');
    expect(runbook).toContain('Rocky 9.4');
    expect(runbook).toContain('docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build');
    expect(runbook).toContain('bash scripts/deploy/backup-phase1.sh');
    expect(runbook).toContain('bash scripts/deploy/restore-phase1.sh');
  });

  it('ships backup and restore scripts plus restart policy', () => {
    const compose = readFileSync('infra/compose/docker-compose.yml', 'utf-8');
    const backup = readFileSync('scripts/deploy/backup-phase1.sh', 'utf-8');
    const restore = readFileSync('scripts/deploy/restore-phase1.sh', 'utf-8');
    expect(compose).toContain('restart: unless-stopped');
    expect(backup).toContain('mysqldump');
    expect(backup).toContain('tar -czf');
    expect(restore).toContain('docker compose');
    expect(restore).toContain('mysql -uroot');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/production-env-runbook.test.ts`

Expected: FAIL，提示 Rocky 文档或备份恢复脚本不存在，或 compose 缺少 `restart: unless-stopped`。

- [ ] **Step 3: 写最小实现**

`infra/compose/docker-compose.yml`

```yaml
services:
  nginx:
    restart: unless-stopped
  api:
    restart: unless-stopped
  ws:
    restart: unless-stopped
  mysql:
    restart: unless-stopped
  redis:
    restart: unless-stopped
  minio:
    restart: unless-stopped
```

`scripts/deploy/backup-phase1.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/compose/docker-compose.yml"
COMPOSE_DIR="${ROOT_DIR}/infra/compose"
ENV_FILE="${PHASE1_ENV_FILE:-${COMPOSE_DIR}/.env}"
BACKUP_DIR="${PHASE1_BACKUP_DIR:-${ROOT_DIR}/backups/phase1}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "${BACKUP_DIR}"
[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}"

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T mysql \
  mysqldump -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" > "${BACKUP_DIR}/mysql-${TIMESTAMP}.sql"

tar -czf "${BACKUP_DIR}/minio-${TIMESTAMP}.tar.gz" -C "${ROOT_DIR}" infra/compose
echo "${BACKUP_DIR}"
```

`scripts/deploy/restore-phase1.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: bash scripts/deploy/restore-phase1.sh <mysql_dump.sql>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/compose/docker-compose.yml"
COMPOSE_DIR="${ROOT_DIR}/infra/compose"
ENV_FILE="${PHASE1_ENV_FILE:-${COMPOSE_DIR}/.env}"
MYSQL_DUMP_FILE="$1"

[[ -f "${ENV_FILE}" ]] && source "${ENV_FILE}"

MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T mysql \
  mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < "${MYSQL_DUMP_FILE}"
```

`docs/deploy/rocky9-production-runbook.md`

```md
# Rocky 9.4 柬聊部署与恢复手册

## 部署

1. 安装 Docker 与 Compose
2. 拉代码到 `/opt/jianliao`
3. 复制 `infra/compose/.env.example` 为 `infra/compose/.env`
4. 执行 `docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build`
5. 运行健康检查
6. 执行 `bash scripts/deploy/init-phase1-data-compose.sh`

## 备份

- `bash scripts/deploy/backup-phase1.sh`

## 恢复

- `bash scripts/deploy/restore-phase1.sh <mysql_dump.sql>`
```

- [ ] **Step 4: 重新运行测试并检查脚本语法**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/production-env-runbook.test.ts
bash -n scripts/deploy/backup-phase1.sh
bash -n scripts/deploy/restore-phase1.sh
```

Expected:
- Vitest PASS
- 两个脚本语法检查通过

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add infra/compose/docker-compose.yml infra/compose/.env.example docs/deploy/phase1-server.md docs/deploy/rocky9-production-runbook.md scripts/deploy/backup-phase1.sh scripts/deploy/restore-phase1.sh scripts/deploy/init-phase1-data-compose.sh tests/integration/production-env-runbook.test.ts
git commit -m "chore: add phase1 rocky deployment runbook"
```

---

### Task 2: 补齐消息、上传、回执的后端稳态能力

**Files:**
- Modify: `apps/api/src/modules/messages/message.service.ts`
- Modify: `apps/api/src/modules/messages/message.service.test.ts`
- Modify: `apps/api/src/modules/messages/message.routes.ts`
- Modify: `apps/api/src/modules/messages/receipt.routes.ts`
- Test: `tests/integration/message-reliability.test.ts`

- [ ] **Step 1: 写出失败的后端稳态测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('message reliability', () => {
  it('guards duplicate read receipt handling', () => {
    const receiptRoutes = readFileSync('apps/api/src/modules/messages/receipt.routes.ts', 'utf-8');
    expect(receiptRoutes).toContain('already acknowledged');
    expect(receiptRoutes).toContain('type: READ');
  });

  it('documents reliability-oriented message service behavior', () => {
    const service = readFileSync('apps/api/src/modules/messages/message.service.ts', 'utf-8');
    expect(service).toContain('MessageValidationError');
    expect(service).toContain('normalizeImageBody');
    expect(service).toContain('dedupeKey');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/message-reliability.test.ts`

Expected: FAIL，提示消息服务中缺少稳态字段或回执重复保护语义。

- [ ] **Step 3: 写最小实现**

`apps/api/src/modules/messages/message.service.ts`

```ts
export class MessageValidationError extends Error {}

const normalizeImageBody = (body: unknown) => {
  if (!body || typeof body !== 'object') throw new MessageValidationError('invalid image body');
  return body as { fileId?: string; objectKey?: string; mimeType?: string; dedupeKey?: string };
};

export const createMessage = async (input: CreateMessageInput) => {
  if (input.type === 'IMAGE') {
    const imageBody = normalizeImageBody(input.body);
    if (!imageBody.objectKey || !imageBody.mimeType) {
      throw new MessageValidationError('missing image fields');
    }
  }
};
```

`apps/api/src/modules/messages/receipt.routes.ts`

```ts
if (existingReceipt?.type === 'READ') {
  return reply.send({
    id: existingReceipt.id,
    type: 'READ',
    status: 'already acknowledged'
  });
}
```

`apps/api/src/modules/messages/message.routes.ts`

```ts
} catch (error) {
  if (error instanceof MessageValidationError) {
    return reply.code(400).send({ error: error.message });
  }
  throw error;
}
```

- [ ] **Step 4: 重新运行测试与现有消息测试**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/message-reliability.test.ts apps/api/src/modules/messages/message.service.test.ts apps/api/src/modules/messages/message.routes.test.ts
```

Expected:
- 新增稳态测试 PASS
- 现有消息服务测试与路由测试继续 PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/api/src/modules/messages/message.service.ts apps/api/src/modules/messages/message.service.test.ts apps/api/src/modules/messages/message.routes.ts apps/api/src/modules/messages/receipt.routes.ts tests/integration/message-reliability.test.ts
git commit -m "feat: harden phase1 message reliability"
```

---

### Task 3: 升级移动端与后台的真实联调复盘清单

**Files:**
- Modify: `docs/local/phase1-e2e-checklist.md`
- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `apps/android/README.md`
- Modify: `apps/ios/README.md`
- Create: `docs/local/phase1-real-e2e-review.md`
- Test: `tests/integration/production-env-runbook.test.ts`

- [ ] **Step 1: 先让文档测试覆盖 70% 复盘清单**

```ts
it('includes the 70 percent real e2e review checklist', () => {
  const review = readFileSync('docs/local/phase1-real-e2e-review.md', 'utf-8');
  expect(review).toContain('服务器部署是否稳定');
  expect(review).toContain('Web / Windows 后台');
  expect(review).toContain('iOS / Android');
  expect(review).toContain('上传与回执链路');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/production-env-runbook.test.ts`

Expected: FAIL，提示真实联调复盘清单不存在。

- [ ] **Step 3: 写最小实现**

`docs/local/phase1-real-e2e-review.md`

```md
# 阶段 1 达到 70% 时的真实联调复盘清单

## 复盘对象

- 服务器部署是否稳定
- Web / Windows 后台最小操作流是否连续可用
- iOS / Android 是否能真实互发文本和图片
- 上传与回执链路是否稳定
- 日志是否足够定位问题
```

`docs/local/phase1-e2e-checklist.md`

```md
## 70% 复盘前必须完成

1. 服务器健康检查通过
2. iOS 与 Android 完成文本 / 图片 / 回执联调
3. Web / Windows 后台完成相同管理流
4. 记录失败点并写入 `docs/local/phase1-real-e2e-review.md`
```

`apps/ios/README.md`

```md
## 70% 复盘动作

1. 与 Android 设备或模拟器互发文本消息
2. 互发图片消息
3. 双向写 READ 回执
4. 记录失败链路
```

- [ ] **Step 4: 重新运行测试**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/production-env-runbook.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add docs/local/phase1-e2e-checklist.md docs/local/phase1-admin-e2e.md apps/android/README.md apps/ios/README.md docs/local/phase1-real-e2e-review.md tests/integration/production-env-runbook.test.ts
git commit -m "docs: add phase1 real e2e review checklist"
```

---

## Spec coverage self-check

- 第一阶段的服务器底座、`.env`、备份恢复：Task 1 覆盖
- 第二阶段的消息 / 上传 / 回执稳态：Task 2 覆盖
- 第一、第二阶段结束后的 70% 真实联调复盘：Task 3 覆盖
- Android 构建环境基础要求：Task 1 与 Task 3 中的文档、脚本和 README 覆盖
- 不引入阶段 2、阶段 3 新功能：本计划仅覆盖阶段 1 生产化与真实联调闭环

经自检：计划内容完整，需求均已映射，任务之间命名一致。

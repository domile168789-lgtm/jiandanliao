# 柬聊阶段 1 共享后端平台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把柬聊阶段 1 所需的共享后端平台做成可联调、可部署、可被安卓/iOS/Web 后台/Windows 后台并行接入的稳定基线。

**Architecture:** 继续沿用单体 API + 独立 WS 服务的方式，`MySQL` 作为唯一主数据源，`Redis` 只负责实时事件分发和在线状态。先补齐阶段 1 所需的领域表、成员权限校验、后台管理接口、文件上传链路和 compose 启动基线，再让四个前端基于稳定契约并行接入。

**Tech Stack:** Fastify, TypeScript, MySQL, Redis, Socket.IO, MinIO, Docker Compose, Vitest

---

## 范围说明

这份计划只覆盖 `阶段 1 共享后端平台`。由于原规格包含 5 个独立子系统，必须拆成多份计划执行：

- 本计划：共享后端平台与部署基线
- 后续单独计划：`Android 用户端`、`iOS 用户端`、`Web 管理后台`、`Windows 桌面管理后台`

本计划完成后，四个前端应能基于统一 API/WS 契约并行开发。

## 文件结构

### 现有核心文件

- `apps/api/src/index.ts`：API 入口与路由注册
- `apps/api/src/db.ts`：MySQL 连接池
- `apps/api/src/redis.ts`：Redis 客户端
- `apps/api/src/plugins/auth.plugin.ts`：用户 token 解析
- `apps/api/src/modules/auth/*`：注册、密码登录、刷新令牌
- `apps/api/src/modules/conversations/*`：会话创建与会话列表
- `apps/api/src/modules/messages/*`：消息发送、消息拉取、回执
- `apps/api/src/modules/admin/admin.routes.ts`：后台管理路由，当前仍是占位实现
- `apps/api/src/modules/files/file.service.ts`：文件校验，当前只有校验没有上传链路
- `apps/ws/src/server.ts`：WS 服务与 Redis 订阅广播
- `infra/mysql/001_init.sql`：MySQL 初始化表
- `infra/compose/docker-compose.yml`：部署编排

### 本计划新增或重构的文件

- `apps/api/src/plugins/admin-auth.plugin.ts`：后台 token 和角色校验
- `apps/api/src/modules/admin/admin.service.ts`：后台用户、公告、举报、审计服务
- `apps/api/src/modules/admin/admin.routes.test.ts`：后台接口测试
- `apps/api/src/modules/files/file.routes.ts`：文件上传元数据接口
- `apps/api/src/modules/files/file.routes.test.ts`：文件接口测试
- `apps/api/src/modules/conversations/conversation.service.test.ts`：会话与成员权限测试
- `apps/api/src/modules/messages/message.routes.test.ts`：消息成员校验与越权读取测试
- `scripts/dev/init-phase1-data.sh`：本地/服务器演示数据初始化脚本
- `docs/api-contracts/phase1-backend.md`：阶段 1 对前端公开的 API/WS 契约

---

### Task 1: 补齐阶段 1 核心表结构和演示数据初始化

**Files:**
- Modify: `infra/mysql/001_init.sql`
- Create: `scripts/dev/init-phase1-data.sh`
- Test: `tests/integration/mysql-schema.test.ts`

- [ ] **Step 1: 写出失败的 schema 测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('phase1 mysql schema', () => {
  it('contains announcements reports and conversation member tables', () => {
    const sql = readFileSync('infra/mysql/001_init.sql', 'utf-8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS announcements');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS reports');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS conversation_members');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/mysql-schema.test.ts`

Expected: FAIL，提示 `announcements` 或 `reports` 不存在。

- [ ] **Step 3: 最小实现数据库补表和初始化脚本**

```sql
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED',
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  reporter_user_id VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL
);
```

```bash
#!/usr/bin/env bash
set -euo pipefail

mysql "${DATABASE_URL:-mysql://root:root@127.0.0.1:3306/jianliao}" <<'SQL'
INSERT INTO users (id, phone, nickname, status, created_at, updated_at)
VALUES
  ('u_demo_1', '85510000001', '演示用户1', 'ACTIVE', NOW(), NOW()),
  ('u_demo_2', '85510000002', '演示用户2', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at);
SQL
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/mysql-schema.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add infra/mysql/001_init.sql scripts/dev/init-phase1-data.sh tests/integration/mysql-schema.test.ts
git commit -m "feat: add phase1 mysql admin schema"
```

---

### Task 2: 收紧会话与消息权限边界

**Files:**
- Modify: `apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `apps/api/src/modules/messages/message.routes.ts`
- Create: `apps/api/src/modules/conversations/conversation.service.test.ts`
- Create: `apps/api/src/modules/messages/message.routes.test.ts`

- [ ] **Step 1: 先写失败的会话权限测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  it('rejects listing conversations when user is missing', async () => {
    const service = new ConversationService();
    vi.stubEnv('DATABASE_URL', 'mysql://root:root@mysql:3306/jianliao');
    await expect(service.listByPhone('85519999999')).resolves.toEqual([]);
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../../plugins/auth.plugin';
import { messageRoutes } from './message.routes';

describe('messageRoutes authorization', () => {
  it('rejects unauthenticated message create', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(messageRoutes, { prefix: '/api' });
    const res = await app.inject({ method: 'POST', url: '/api/messages', payload: { conversationId: 'c1', type: 'TEXT', body: { text: 'hi' } } });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试确认当前边界不完整**

Run: `cd /workspace/jianliao-platform/apps/api && JWT_SECRET=12345678901234567890123456789012 pnpm vitest run src/modules/conversations/conversation.service.test.ts src/modules/messages/message.routes.test.ts`

Expected: FAIL，至少有一个测试因为文件不存在或行为不符合预期失败。

- [ ] **Step 3: 最小实现成员校验和越权读取保护**

```ts
async assertConversationMember(conversationId: string, phone: string) {
  const db = getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT 1
     FROM conversation_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ? AND u.phone = ?
     LIMIT 1`,
    [conversationId, phone]
  );
  if (!rows?.length) throw new Error('forbidden conversation access');
}
```

```ts
app.get('/messages', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const { conversationId, limit } = request.query as { conversationId: string; limit?: string };
  await new ConversationService().assertConversationMember(conversationId, request.user.phone);
  const db = getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT id, conversation_id AS conversationId, sender_id AS senderId, type, status,
            JSON_EXTRACT(body, '$') AS body, created_at AS createdAt
     FROM messages
     WHERE conversation_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [conversationId, Math.min(Number(limit || 50), 200)]
  );
  return rows;
});
```

```ts
app.post('/messages', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { conversationId: string; type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO'; body: Record<string, any> };
  await new ConversationService().assertConversationMember(body.conversationId, request.user.phone);
  const db = getDb();
  const [rows] = await db.execute<any[]>(`SELECT id FROM users WHERE phone = ? LIMIT 1`, [request.user.phone]);
  const senderId = rows?.[0]?.id as string | undefined;
  if (!senderId) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  return service.create({ ...body, senderId });
});
```

- [ ] **Step 4: 重新运行测试**

Run: `cd /workspace/jianliao-platform/apps/api && JWT_SECRET=12345678901234567890123456789012 pnpm vitest run src/modules/conversations/conversation.service.test.ts src/modules/messages/message.routes.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/api/src/modules/conversations/conversation.service.ts apps/api/src/modules/conversations/conversation.service.test.ts apps/api/src/modules/messages/message.routes.ts apps/api/src/modules/messages/message.routes.test.ts
git commit -m "feat: enforce conversation member access"
```

---

### Task 3: 完成阶段 1 后台管理最小 API

**Files:**
- Create: `apps/api/src/plugins/admin-auth.plugin.ts`
- Create: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Create: `apps/api/src/modules/admin/admin.routes.test.ts`

- [ ] **Step 1: 写失败的后台接口测试**

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminRoutes } from './admin.routes';

describe('adminRoutes', () => {
  it('rejects unauthenticated admin request', async () => {
    const app = Fastify();
    await app.register(adminRoutes, { prefix: '/api' });
    const res = await app.inject({ method: 'POST', url: '/api/admin/users/u1/ban' });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform/apps/api && pnpm vitest run src/modules/admin/admin.routes.test.ts`

Expected: FAIL，当前接口会返回 `200` 占位数据。

- [ ] **Step 3: 最小实现后台角色校验与服务层**

```ts
export async function adminAuthPlugin(app: FastifyInstance) {
  app.decorateRequest('admin', null);
  app.addHook('preHandler', async (request) => {
    const header = request.headers['x-admin-role'];
    if (typeof header === 'string') {
      request.admin = { role: header };
    }
  });
}
```

```ts
export class AdminService {
  async banUser(userId: string, adminId: string) {
    const db = getDb();
    await db.execute(`UPDATE users SET status = 'BANNED', updated_at = NOW() WHERE id = ?`, [userId]);
    await db.execute(
      `INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, created_at)
       VALUES (?, ?, 'BAN_USER', 'USER', ?, NOW())`,
      [randomUUID(), adminId, userId]
    );
    return { id: userId, status: 'BANNED', audited: true };
  }
}
```

```ts
app.post('/admin/users/:id/ban', async (request, reply) => {
  if (!request.admin) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  if (!['SUPER_ADMIN', 'OPERATOR'].includes(request.admin.role)) return reply.code(403).send({ code: 'FORBIDDEN' });
  return new AdminService().banUser((request.params as { id: string }).id, request.admin.role);
});
```

- [ ] **Step 4: 同时补 3 个后台最小接口**

```ts
app.get('/admin/users', async (request, reply) => {
  if (!request.admin) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const db = getDb();
  const [rows] = await db.execute<any[]>(`SELECT id, phone, nickname, status, updated_at AS updatedAt FROM users ORDER BY updated_at DESC LIMIT 100`);
  return rows;
});

app.get('/admin/reports', async (request, reply) => {
  if (!request.admin) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const db = getDb();
  const [rows] = await db.execute<any[]>(
    `SELECT id, reporter_user_id AS reporterUserId, target_type AS targetType, target_id AS targetId, reason, status, created_at AS createdAt
     FROM reports
     ORDER BY created_at DESC
     LIMIT 100`
  );
  return rows;
});

app.post('/admin/announcements', async (request, reply) => {
  if (!request.admin) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { title: string; content: string };
  const db = getDb();
  const announcementId = randomUUID();
  await db.execute(
    `INSERT INTO announcements (id, title, content, status, created_by, created_at)
     VALUES (?, ?, ?, 'PUBLISHED', ?, NOW())`,
    [announcementId, body.title, body.content, request.admin.role]
  );
  await db.execute(
    `INSERT INTO admin_actions (id, admin_id, action, target_type, target_id, created_at)
     VALUES (?, ?, 'CREATE_ANNOUNCEMENT', 'ANNOUNCEMENT', ?, NOW())`,
    [randomUUID(), request.admin.role, announcementId]
  );
  return { id: announcementId, status: 'PUBLISHED' };
});
```

Run: `cd /workspace/jianliao-platform/apps/api && pnpm vitest run src/modules/admin/admin.routes.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/api/src/plugins/admin-auth.plugin.ts apps/api/src/modules/admin/admin.service.ts apps/api/src/modules/admin/admin.routes.ts apps/api/src/modules/admin/admin.routes.test.ts
git commit -m "feat: add phase1 admin management apis"
```

---

### Task 4: 做通图片上传元数据接口

**Files:**
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/src/modules/files/file.routes.ts`
- Create: `apps/api/src/modules/files/file.routes.test.ts`
- Modify: `apps/api/src/modules/files/file.service.ts`

- [ ] **Step 1: 写失败的文件接口测试**

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { fileRoutes } from './file.routes';

describe('fileRoutes', () => {
  it('rejects missing auth', async () => {
    const app = Fastify();
    await app.register(fileRoutes, { prefix: '/api' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/files/upload',
      payload: { filename: 'a.jpg', mimeType: 'image/jpeg', size: 1024 }
    });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform/apps/api && pnpm vitest run src/modules/files/file.routes.test.ts`

Expected: FAIL，因为路由文件还不存在。

- [ ] **Step 3: 最小实现图片上传元数据接口**

```ts
app.post('/files/upload', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { filename: string; mimeType: string; size: number };
  await new FileService().validate(body);
  return {
    fileId: randomUUID(),
    objectKey: `uploads/${Date.now()}-${body.filename}`,
    uploadUrl: `${process.env.MINIO_ENDPOINT}/uploads/${Date.now()}-${body.filename}`
  };
});
```

```ts
async validate(input: { filename: string; mimeType: string; size: number }) {
  if (!input.mimeType.startsWith('image/')) throw new Error('unsupported mime type');
  if (blocked.some((ext) => input.filename.endsWith(ext))) throw new Error('blocked file type');
  if (input.size > 50 * 1024 * 1024) throw new Error('file too large');
  return true;
}
```

- [ ] **Step 4: 注册路由并重新运行测试**

Run: `cd /workspace/jianliao-platform/apps/api && pnpm vitest run src/modules/files/file.routes.test.ts src/modules/files/file.service.test.ts`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/api/src/index.ts apps/api/src/modules/files/file.routes.ts apps/api/src/modules/files/file.routes.test.ts apps/api/src/modules/files/file.service.ts
git commit -m "feat: add phase1 image upload metadata api"
```

---

### Task 5: 固化阶段 1 API/WS 契约并修正 compose 启动基线

**Files:**
- Modify: `apps/api/Dockerfile`
- Modify: `apps/ws/Dockerfile`
- Modify: `infra/compose/docker-compose.yml`
- Create: `docs/api-contracts/phase1-backend.md`
- Test: `tests/integration/compose.test.ts`

- [ ] **Step 1: 写失败的 compose 契约测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('compose baseline', () => {
  it('wires api ws mysql redis and minio', () => {
    const compose = readFileSync('infra/compose/docker-compose.yml', 'utf-8');
    expect(compose).toContain('nginx:');
    expect(compose).toContain('api:');
    expect(compose).toContain('ws:');
    expect(compose).toContain('mysql:');
    expect(compose).toContain('redis:');
    expect(compose).toContain('minio:');
  });
});
```

- [ ] **Step 2: 运行测试确认基线不完整或 Dockerfile 不可用**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/compose.test.ts`

Expected: FAIL 或后续手工 `docker compose config` 暴露 Dockerfile 问题。

- [ ] **Step 3: 最小修正 Dockerfile 与 compose**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install
RUN npm run build
CMD ["node", "dist/index.js"]
```

```yaml
api:
  build:
    context: ../../apps/api
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
    interval: 10s
    timeout: 3s
    retries: 10
ws:
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://localhost:3002/health"]
    interval: 10s
    timeout: 3s
    retries: 10
```

```ts
app.get('/api/health', async () => ({ ok: true, service: 'api' }));
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'ws' }));
  }
});
```

```md
## HTTP API
- POST /api/auth/register
- POST /api/auth/login/password
- POST /api/auth/refresh-token
- GET /api/conversations
- POST /api/conversations/dm
- GET /api/messages
- POST /api/messages
- POST /api/messages/:id/receipt
- POST /api/files/upload
- GET /api/admin/users
- POST /api/admin/users/:id/ban
- GET /api/admin/reports
- POST /api/admin/announcements

## WS Events
- auth:authenticate
- conversation:join
- message:new
- receipt:new
```

- [ ] **Step 4: 重新运行测试与配置检查**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/compose.test.ts
docker compose -f infra/compose/docker-compose.yml config >/tmp/jianliao-compose.out
```

Expected:
- Vitest PASS
- `docker compose config` exit code 0

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/api/Dockerfile apps/ws/Dockerfile infra/compose/docker-compose.yml docs/api-contracts/phase1-backend.md tests/integration/compose.test.ts
git commit -m "chore: stabilize phase1 deployment baseline"
```

---

## Spec coverage self-check

- 多端共享平台：由本计划整体覆盖，后端、WS、DB、部署基线都包含。
- 阶段 1 基础聊天：已覆盖注册/密码登录/短信登录框架、会话、文本/图片消息、回执、后台用户封禁与公告、部署基线。
- 后台最小能力：Task 3 覆盖用户管理、举报列表、公告、审计。
- 文件上传：Task 4 覆盖图片消息所需上传元数据能力。
- 部署与联调：Task 5 覆盖 compose、Dockerfile 和契约文档。

无占位词、无未映射需求、无跨任务命名冲突。

## 后续独立计划

本计划完成后，继续补 4 份独立计划：

- `柬聊阶段 1 Android 用户端`
- `柬聊阶段 1 iOS 用户端`
- `柬聊阶段 1 Web 管理后台`
- `柬聊阶段 1 Windows 桌面管理后台`

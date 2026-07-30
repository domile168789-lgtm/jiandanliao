# 柬聊阶段 1 并行联调与部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把柬聊阶段 1 的本地闭环主线和服务器部署影子线同时跑通，形成可演示、可复现、可迁移的端到端 MVP。

**Architecture:** 以现有 `phase1-backend` 契约为中心，先补齐本地联调编排与检查脚本，再统一 Android/iOS 的访问入口和 WS 时序，再让 Web/Windows 管理后台对齐相同的管理员身份注入与联调入口，最后把 `compose` 改成环境变量驱动并补齐服务器验证路径。所有端只认 `/api`、`/socket.io/`、`/uploads/` 三个统一入口，不允许直接依赖容器内地址。

**Tech Stack:** TypeScript, Vitest, Bash, Docker Compose, Kotlin/Gradle, SwiftUI, React, Electron

---

## 文件结构

### 本次新增文件

- `scripts/dev/phase1-up.sh`：本地一键启动阶段 1 依赖服务
- `scripts/dev/phase1-smoke-check.sh`：本地健康检查与核心链路检查脚本
- `docs/local/phase1-e2e-checklist.md`：本地主线联调说明
- `apps/ios/README.md`：iOS 本地联调说明
- `docs/local/phase1-admin-e2e.md`：后台联调说明
- `infra/compose/.env.example`：服务器部署环境变量模板
- `tests/integration/phase1-local-baseline.test.ts`：本地基线检查
- `tests/integration/mobile-e2e-config.test.ts`：移动端配置一致性检查
- `tests/integration/admin-console-parity.test.ts`：后台控制台一致性检查
- `tests/integration/deploy-env-baseline.test.ts`：部署环境变量基线检查

### 本次修改文件

- `package.json`：增加主线脚本入口
- `apps/android/app/build.gradle.kts`：拆分 Android 的 API / WS 运行地址
- `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`：统一 Android 的 HTTP / WS 基础地址
- `apps/android/README.md`：更新 Android 联调说明
- `apps/ios/JianliaoIOS/App/AppConfig.swift`：固定 iOS 默认 API / WS 地址说明
- `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`：让 iOS 服务地址设置与本地主线一致
- `apps/admin-web/src/api/client.ts`：让 Web 后台支持运行期 base URL
- `apps/admin-web/src/pages/LoginPage.tsx`：补后台运行期 base URL 输入
- `apps/admin-web/src/state/adminSession.tsx`：保存后台运行期 base URL
- `apps/admin-desktop/src/renderer/api/client.ts`：统一桌面后台 base URL 字段命名与默认值
- `apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx`：补运行期 base URL 输入说明
- `infra/compose/docker-compose.yml`：改成环境变量驱动的部署基线
- `docs/deploy/phase1-server.md`：补 `.env`、服务器验证与迁移说明
- `scripts/deploy/init-phase1-data-compose.sh`：读取环境变量并兼容服务器目录

---

### Task 1: 建立本地主线编排与检查脚本

**Files:**
- Modify: `package.json`
- Create: `scripts/dev/phase1-up.sh`
- Create: `scripts/dev/phase1-smoke-check.sh`
- Create: `docs/local/phase1-e2e-checklist.md`
- Test: `tests/integration/phase1-local-baseline.test.ts`

- [ ] **Step 1: 写出失败的本地基线测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('phase1 local baseline', () => {
  it('defines local up and smoke scripts in package.json', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    expect(pkg.scripts['dev:phase1-up']).toBe('bash scripts/dev/phase1-up.sh');
    expect(pkg.scripts['dev:phase1-smoke']).toBe('bash scripts/dev/phase1-smoke-check.sh');
  });

  it('documents the fixed local entrypoints', () => {
    const doc = readFileSync('docs/local/phase1-e2e-checklist.md', 'utf-8');
    expect(doc).toContain('http://127.0.0.1/api');
    expect(doc).toContain('http://127.0.0.1/socket.io/');
    expect(doc).toContain('http://127.0.0.1/uploads/');
    expect(doc).toContain('pnpm dev:phase1-up');
    expect(doc).toContain('pnpm dev:phase1-smoke');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/phase1-local-baseline.test.ts`

Expected: FAIL，提示 `dev:phase1-up`、`dev:phase1-smoke` 或文档文件不存在。

- [ ] **Step 3: 写最小实现**

`package.json`

```json
{
  "scripts": {
    "dev:phase1-up": "bash scripts/dev/phase1-up.sh",
    "dev:phase1-smoke": "bash scripts/dev/phase1-smoke-check.sh"
  }
}
```

`scripts/dev/phase1-up.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT_DIR}"

docker compose -f infra/compose/docker-compose.yml up -d --build
echo "[phase1-up] services started"
echo "[phase1-up] next: pnpm dev:phase1-smoke"
```

`scripts/dev/phase1-smoke-check.sh`

```bash
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
```

`docs/local/phase1-e2e-checklist.md`

```md
# 阶段 1 本地主线联调清单

## 固定入口

- API：`http://127.0.0.1/api`
- WS：`http://127.0.0.1/socket.io/`
- Uploads：`http://127.0.0.1/uploads/`

## 启动步骤

1. `pnpm dev:phase1-up`
2. `pnpm dev:phase1-smoke`
3. `bash scripts/deploy/init-phase1-data-compose.sh`

## 检查顺序

1. 健康检查
2. Android / iOS 登录
3. 单聊发文本
4. 图片上传
5. Web / Windows 后台操作
```

- [ ] **Step 4: 重新运行测试并验证脚本存在**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/phase1-local-baseline.test.ts
test -x scripts/dev/phase1-up.sh
test -x scripts/dev/phase1-smoke-check.sh
```

Expected:
- Vitest PASS
- 两个 `test -x` 都返回 exit code 0

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add package.json scripts/dev/phase1-up.sh scripts/dev/phase1-smoke-check.sh docs/local/phase1-e2e-checklist.md tests/integration/phase1-local-baseline.test.ts
git commit -m "chore: add phase1 local e2e baseline scripts"
```

---

### Task 2: 对齐 Android / iOS 的联调入口和 WS 时序

**Files:**
- Modify: `apps/android/app/build.gradle.kts`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/README.md`
- Create: `apps/ios/README.md`
- Modify: `apps/ios/JianliaoIOS/App/AppConfig.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`
- Test: `tests/integration/mobile-e2e-config.test.ts`

- [ ] **Step 1: 写出失败的移动端配置一致性测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('mobile e2e config', () => {
  it('android splits api and ws base urls', () => {
    const gradle = readFileSync('apps/android/app/build.gradle.kts', 'utf-8');
    const locator = readFileSync('apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt', 'utf-8');
    expect(gradle).toContain('buildConfigField("String", "API_BASE_URL"');
    expect(gradle).toContain('buildConfigField("String", "WS_BASE_URL"');
    expect(locator).toContain('BuildConfig.API_BASE_URL');
    expect(locator).toContain('BuildConfig.WS_BASE_URL');
  });

  it('ios documents the same default entrypoints', () => {
    const config = readFileSync('apps/ios/JianliaoIOS/App/AppConfig.swift', 'utf-8');
    const readme = readFileSync('apps/ios/README.md', 'utf-8');
    expect(config).toContain('http://127.0.0.1/api');
    expect(config).toContain('http://127.0.0.1');
    expect(readme).toContain('http://127.0.0.1/api');
    expect(readme).toContain('http://127.0.0.1');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/mobile-e2e-config.test.ts`

Expected: FAIL，提示 Android 尚未拆分 `API_BASE_URL / WS_BASE_URL` 或 iOS README 不存在。

- [ ] **Step 3: 写最小实现**

`apps/android/app/build.gradle.kts`

```kotlin
defaultConfig {
    buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2/api\"")
    buildConfigField("String", "WS_BASE_URL", "\"http://10.0.2.2\"")
}
```

`apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`

```kotlin
retrofit = Retrofit.Builder()
    .baseUrl("${BuildConfig.API_BASE_URL.trimEnd('/')}/")
    .client(okHttp)
    .addConverterFactory(MoshiConverterFactory.create(moshi))
    .build()

fun ensureSocketConnected() {
    val s = sessionState.value
    val userId = s.userId ?: return
    val wsBaseUrl = BuildConfig.WS_BASE_URL.trimEnd('/')
    if (!socketRepository.isConnected()) {
        socketRepository.connect(wsBaseUrl, userId)
    }
}
```

`apps/ios/JianliaoIOS/App/AppConfig.swift`

```swift
static var defaultAPIBaseURL: URL { URL(string: "http://127.0.0.1/api")! }
static var defaultWSBaseURL: URL { URL(string: "http://127.0.0.1")! }
```

`apps/ios/README.md`

```md
# 柬聊 iOS（SwiftUI）联调说明

## 默认入口

- API：`http://127.0.0.1/api`
- WS：`http://127.0.0.1`

## 联调顺序

1. 启动 `docker compose`
2. 打开登录页的“服务地址设置”
3. 确认 API / WS 地址与本地主线一致
4. 完成登录、建单聊、发文本、发图片、写 READ 回执
```

`apps/ios/JianliaoIOS/Features/Login/LoginView.swift`

```swift
Section("联调配置") {
  Button("服务地址设置") { showConfig = true }
  LabeledContent("API Base URL", value: AppConfig.apiBaseURL.absoluteString)
  LabeledContent("WS Base URL", value: AppConfig.wsBaseURL.absoluteString)
  Text("本地主线默认：API=http://127.0.0.1/api，WS=http://127.0.0.1")
    .font(.footnote)
    .foregroundStyle(.secondary)
}
```

- [ ] **Step 4: 重新运行测试并做构建检查**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/mobile-e2e-config.test.ts
cd /workspace/jianliao-platform/apps/android && ./gradlew :app:assembleDebug
```

Expected:
- Vitest PASS
- Android Debug 构建成功

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/android/app/build.gradle.kts apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt apps/android/README.md apps/ios/README.md apps/ios/JianliaoIOS/App/AppConfig.swift apps/ios/JianliaoIOS/Features/Login/LoginView.swift tests/integration/mobile-e2e-config.test.ts
git commit -m "feat: align phase1 mobile e2e endpoints"
```

---

### Task 3: 对齐 Web / Windows 后台的管理员身份与联调入口

**Files:**
- Modify: `apps/admin-web/src/api/client.ts`
- Modify: `apps/admin-web/src/pages/LoginPage.tsx`
- Modify: `apps/admin-web/src/state/adminSession.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/client.ts`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx`
- Create: `docs/local/phase1-admin-e2e.md`
- Test: `tests/integration/admin-console-parity.test.ts`

- [ ] **Step 1: 写出失败的后台一致性测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('admin console parity', () => {
  it('web and desktop both support runtime base url and admin headers', () => {
    const webClient = readFileSync('apps/admin-web/src/api/client.ts', 'utf-8');
    const webLogin = readFileSync('apps/admin-web/src/pages/LoginPage.tsx', 'utf-8');
    const desktopClient = readFileSync('apps/admin-desktop/src/renderer/api/client.ts', 'utf-8');
    const desktopLogin = readFileSync('apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx', 'utf-8');

    expect(webClient).toContain('baseUrl?: string');
    expect(webLogin).toContain('API Base URL');
    expect(desktopClient).toContain('baseUrl?: string');
    expect(desktopLogin).toContain('API Base URL');
  });

  it('documents the same admin flow for both consoles', () => {
    const doc = readFileSync('docs/local/phase1-admin-e2e.md', 'utf-8');
    expect(doc).toContain('GET /api/admin/users');
    expect(doc).toContain('POST /api/admin/users/:id/ban');
    expect(doc).toContain('POST /api/admin/announcements');
    expect(doc).toContain('GET /api/admin/audit-actions');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/admin-console-parity.test.ts`

Expected: FAIL，提示 Web 后台还没有运行期 base URL，或后台联调文档不存在。

- [ ] **Step 3: 写最小实现**

`apps/admin-web/src/api/client.ts`

```ts
export type AdminIdentity = {
  role: 'SUPER_ADMIN' | 'OPERATOR' | 'AUDITOR';
  id?: string;
  baseUrl?: string;
};

function getBaseUrl(admin?: AdminIdentity) {
  return admin?.baseUrl?.trim() || import.meta.env.VITE_API_BASE_URL?.trim() || '/api';
}

const url = `${getBaseUrl(init.admin)}${path.startsWith('/') ? '' : '/'}${path}`;
```

`apps/admin-web/src/pages/LoginPage.tsx`

```tsx
const [baseUrl, setBaseUrl] = React.useState(admin?.baseUrl || '/api');

login({ role, id: adminId.trim() || undefined, baseUrl: baseUrl.trim() || '/api' });

<label className="field">
  <span>API Base URL</span>
  <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="/api 或 http://127.0.0.1:3001/api" />
</label>
```

`apps/admin-desktop/src/renderer/api/client.ts`

```ts
export type AdminSession = {
  role: string;
  id?: string;
  baseUrl?: string;
};

const base = session.baseUrl?.replace(/\/+$/, '') || '/api';
```

`apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx`

```tsx
const [baseUrl, setBaseUrl] = useState('/api');

props.onLogin({
  role,
  id: id.trim() || undefined,
  baseUrl: baseUrl.trim() || '/api'
});
```

`docs/local/phase1-admin-e2e.md`

```md
# 阶段 1 后台联调清单

## 统一登录约定

- `x-admin-role`
- `x-admin-id`
- `API Base URL`

## 最小操作流

1. `GET /api/admin/users`
2. `POST /api/admin/users/:id/ban`
3. `GET /api/admin/reports`
4. `POST /api/admin/announcements`
5. `GET /api/admin/audit-actions`
```

- [ ] **Step 4: 重新运行测试并验证两个后台都能构建**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/admin-console-parity.test.ts
pnpm --filter @jianliao/admin-web build
pnpm --filter @jianliao/admin-desktop build
```

Expected:
- Vitest PASS
- Web 后台构建成功
- Windows 桌面后台构建成功

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add apps/admin-web/src/api/client.ts apps/admin-web/src/pages/LoginPage.tsx apps/admin-web/src/state/adminSession.tsx apps/admin-desktop/src/renderer/api/client.ts apps/admin-desktop/src/renderer/ui/pages/LoginPage.tsx docs/local/phase1-admin-e2e.md tests/integration/admin-console-parity.test.ts
git commit -m "feat: align phase1 admin console runtime entrypoints"
```

---

### Task 4: 把服务器影子线改成环境变量驱动

**Files:**
- Modify: `infra/compose/docker-compose.yml`
- Create: `infra/compose/.env.example`
- Modify: `docs/deploy/phase1-server.md`
- Modify: `scripts/deploy/init-phase1-data-compose.sh`
- Test: `tests/integration/deploy-env-baseline.test.ts`

- [ ] **Step 1: 写出失败的部署环境变量测试**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('deploy env baseline', () => {
  it('uses env placeholders in compose', () => {
    const compose = readFileSync('infra/compose/docker-compose.yml', 'utf-8');
    expect(compose).toContain('${JWT_SECRET:-');
    expect(compose).toContain('${MYSQL_ROOT_PASSWORD:-');
    expect(compose).toContain('${MINIO_ROOT_USER:-');
    expect(compose).toContain('${MINIO_ROOT_PASSWORD:-');
  });

  it('ships an env example for server deploy', () => {
    const envExample = readFileSync('infra/compose/.env.example', 'utf-8');
    expect(envExample).toContain('JWT_SECRET=');
    expect(envExample).toContain('MYSQL_ROOT_PASSWORD=');
    expect(envExample).toContain('MINIO_ROOT_USER=');
    expect(envExample).toContain('MINIO_ROOT_PASSWORD=');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /workspace/jianliao-platform && pnpm vitest run tests/integration/deploy-env-baseline.test.ts`

Expected: FAIL，提示 compose 尚未使用环境变量表达式，或 `.env.example` 不存在。

- [ ] **Step 3: 写最小实现**

`infra/compose/docker-compose.yml`

```yaml
api:
  environment:
    PORT: ${API_PORT:-3001}
    JWT_SECRET: ${JWT_SECRET:-12345678901234567890123456789012}
    DATABASE_URL: mysql://root:${MYSQL_ROOT_PASSWORD:-root}@mysql:3306/${MYSQL_DATABASE:-jianliao}
    REDIS_URL: ${REDIS_URL:-redis://redis:6379}
    MINIO_ENDPOINT: ${MINIO_ENDPOINT:-http://nginx}

mysql:
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-root}
    MYSQL_DATABASE: ${MYSQL_DATABASE:-jianliao}

minio:
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
```

`infra/compose/.env.example`

```dotenv
JWT_SECRET=replace-with-32-char-secret
MYSQL_ROOT_PASSWORD=replace-with-db-password
MYSQL_DATABASE=jianliao
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://your-domain.example.com
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=replace-with-minio-password
API_PORT=3001
WS_PORT=3002
```

`scripts/deploy/init-phase1-data-compose.sh`

```bash
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-jianliao}"

docker compose -f "${COMPOSE_FILE}" exec -T mysql \
  mysql -uroot "-p${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < "${ROOT_DIR}/infra/mysql/001_init.sql"
```

`docs/deploy/phase1-server.md`

```md
## 部署前准备

1. 复制 `infra/compose/.env.example` 为 `infra/compose/.env`
2. 填写 `JWT_SECRET`、`MYSQL_ROOT_PASSWORD`、`MINIO_ROOT_PASSWORD`
3. 如果前端通过域名联调，设置 `MINIO_ENDPOINT=http(s)://<域名>`

## 启动

    docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

- [ ] **Step 4: 重新运行测试并检查 compose 配置展开**

Run:

```bash
cd /workspace/jianliao-platform
pnpm vitest run tests/integration/deploy-env-baseline.test.ts
docker compose --env-file infra/compose/.env.example -f infra/compose/docker-compose.yml config >/tmp/jianliao-compose.env.out
```

Expected:
- Vitest PASS
- `docker compose config` exit code 0

- [ ] **Step 5: 提交**

```bash
cd /workspace/jianliao-platform
git add infra/compose/docker-compose.yml infra/compose/.env.example docs/deploy/phase1-server.md scripts/deploy/init-phase1-data-compose.sh tests/integration/deploy-env-baseline.test.ts
git commit -m "chore: add phase1 env driven deploy baseline"
```

---

## Spec coverage self-check

- 主线 / 影子线拆分：Task 1、Task 4 覆盖
- Android / iOS 用户端统一链路：Task 2 覆盖
- Web / Windows 后台统一操作流：Task 3 覆盖
- 统一入口 `/api`、`/socket.io/`、`/uploads/`：Task 1、Task 2、Task 4 覆盖
- 关键失败点：上传地址、WS 时序、演示数据、后台身份注入均被任务映射
- 验收标准：每个子项目都有对应测试、构建检查和提交步骤

无占位式空白步骤、无未映射需求、无跨任务命名冲突。

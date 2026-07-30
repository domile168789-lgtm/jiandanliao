# 柬聊全项目（B）实施计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在既定范围 A~I 内，把柬聊从“可运行”推进到“生产运营级”：三端（H5/Android/iOS）微信级 IM（文本/图片/语音/文件/视频 + 未读/回执 + 单聊/群聊/系统会话）闭环，后台（admin-web/admin-desktop）与用户端联动闭环，并补齐 CI/监控/备份恢复演练。

**Architecture:** 以既有 Phase1 后端契约为基础（`docs/api-contracts/phase1-backend.md`），扩展为多端统一协议（`docs/superpowers/specs/2026-07-30-jianliao-multiplatform-wechat-im-protocol.md`）。实现上以“协议 → 后端 API → WS 事件 → H5 → Android/iOS → 后台联动 → 生产化（CI/监控/演练）”的顺序推进，每个阶段都有可回归测试与可部署验收。

**Tech Stack:** Node.js/TypeScript（API/WS）、React/Vite（H5/admin-web/admin-desktop renderer）、Socket.IO（WS）、MySQL/Redis/MinIO、Docker Compose、Android(Kotlin)、iOS(SwiftUI)、ffmpeg（语音/视频转码）

---

## 0. 文件结构与改动面

### 服务端
- Modify: `apps/api/src/modules/auth/*`（手机号即账号：校验与返回字段对齐）
- Modify: `apps/api/src/modules/conversations/*`（SYSTEM 会话、群聊生命周期、read/unread）
- Modify: `apps/api/src/modules/messages/*`（消息类型扩展：IMAGE/FILE/AUDIO/VIDEO，摘要）
- Modify: `apps/api/src/modules/files/*`（multipart 上传 + 转码 + URL 返回）
- Modify: `apps/api/src/modules/admin/*`（公告/活动发布 → SYSTEM 会话/WS 推送）
- Create/Modify: `apps/api/src/modules/contacts/*`（通讯录接口：列表/搜索）
- Modify: `apps/ws/src/server.ts`、`apps/ws/src/events.ts`（统一事件：message.created / unread.updated 等）
- Create: `apps/ws/src/auth.ts`（token 鉴权适配 Socket.IO）

### H5（apps/web）
- Modify: `apps/web/src/main.tsx`（引入 router）
- Modify: `apps/web/src/App.tsx`（改为路由驱动 + auth guard）
- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/state/session.ts`（token 存取与 401 处理）
- Create: `apps/web/src/state/ws.ts`（ws 连接/重连/订阅）
- Create: `apps/web/src/pages/*`（messages/chat/contacts/discover/me/settings/login/register）
- Modify: `apps/web/src/api/client.ts`（Bearer token、401 统一处理）

### Android（apps/android）
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/*`（四 Tab 容器 + 页面）
- Modify: `apps/android/.../core/*`（session 持久化、ws 重连、upload + voice record）
- Create: `apps/android/.../ui/chat/VoiceRecorder.kt`（录音）

### iOS（apps/ios）
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`（TabView）
- Modify: `apps/ios/JianliaoIOS/Features/*`（四 Tab + chat）
- Modify: `apps/ios/JianliaoIOS/Core/*`（token、ws、upload、audio record/play）

### 后台（admin-web/admin-desktop）
- Modify: `apps/admin-web/src/pages/*`（公告/活动/品牌配置与联动说明）
- Modify: `apps/admin-desktop/src/renderer/ui/pages/*`（同上）

### 生产化
- Create: `.github/workflows/ci.yml`（test/build 门禁）
- Create: `infra/monitoring/*`（Prometheus/Grafana 或最小等价方案）
- Modify: `infra/compose/docker-compose.yml`（监控容器、ffmpeg 依赖、资源限制）

---

## 1) P0：先达成“可用闭环”（A + B基础 + C文本/图片/回执/未读 + I最小）

### Task 1: 加 CI 门禁（pnpm workspace test/build）

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 添加 GitHub Actions 工作流**

创建 `.github/workflows/ci.yml`：

```yaml
name: ci
on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]
jobs:
  test_build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test
      - run: pnpm --filter @jianliao/api build
      - run: pnpm --filter @jianliao/ws build
      - run: pnpm --filter @jianliao/web build
      - run: pnpm --filter @jianliao/admin-web build
```

- [ ] **Step 2: 本地校验**

Run: `pnpm -r test && pnpm --filter @jianliao/api build && pnpm --filter @jianliao/ws build && pnpm --filter @jianliao/web build`
Expected: 全部 PASS

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workspace test/build workflow"
```

### Task 2: H5 引入 URL 路由与强登录守卫

**Files:**
- Create: `apps/web/src/router.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/state/session.ts`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 新增 session 存储（token）**

创建 `apps/web/src/state/session.ts`：

```ts
const ACCESS_TOKEN_KEY = 'jianliao_access_token';

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
```

- [ ] **Step 2: H5 API client 带 Bearer token 与 401 处理**

修改 `apps/web/src/api/client.ts`（若文件内容不同，按当前实现合并）：

```ts
import { clearAccessToken, getAccessToken } from '../state/session';

export async function apiFetch(input: string, init: RequestInit = {}) {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    clearAccessToken();
    window.location.assign('/h5/login');
  }
  return res;
}
```

- [ ] **Step 3: 引入 router（messages/chat/contacts/discover/me/settings/login/register）**

创建 `apps/web/src/router.tsx`：

```tsx
import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getAccessToken } from './state/session';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TabShell from './pages/TabShell';
import MessagesPage from './pages/MessagesPage';
import ContactsPage from './pages/ContactsPage';
import DiscoverPage from './pages/DiscoverPage';
import MePage from './pages/MePage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getAccessToken() ? <>{children}</> : <Navigate to="/h5/login" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/h5/login" element={<LoginPage />} />
      <Route path="/h5/register" element={<RegisterPage />} />

      <Route
        path="/h5"
        element={
          <RequireAuth>
            <TabShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="messages" replace />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="me" element={<MePage />} />
      </Route>

      <Route
        path="/h5/settings"
        element={
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/h5/chat/:conversationId"
        element={
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 4: main.tsx 使用 BrowserRouter**

修改 `apps/web/src/main.tsx`：

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './router';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 5: App.test.tsx 补一个路由 smoke**

在 `apps/web/src/App.test.tsx` 增加断言：未登录访问 `/h5/messages` 会跳到登录页（按当前测试框架写法）。

- [ ] **Step 6: 运行 web 测试**

Run: `pnpm --filter @jianliao/web test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/router.tsx apps/web/src/state/session.ts apps/web/src/api/client.ts apps/web/src/App.test.tsx
git commit -m "feat(web): add h5 router and auth guard"
```

### Task 3: H5 TabShell（四 Tab）与占位页

**Files:**
- Create: `apps/web/src/pages/TabShell.tsx`
- Create: `apps/web/src/pages/{MessagesPage,ContactsPage,DiscoverPage,MePage}.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 创建 TabShell（Outlet + TabBar）**

`apps/web/src/pages/TabShell.tsx`：

```tsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function TabShell() {
  return (
    <main className="h5-shell">
      <section className="h5-content">
        <Outlet />
      </section>
      <nav className="h5-tabbar" aria-label="底部导航">
        <NavLink to="/h5/messages">消息</NavLink>
        <NavLink to="/h5/contacts">通讯录</NavLink>
        <NavLink to="/h5/discover">发现</NavLink>
        <NavLink to="/h5/me">我的</NavLink>
      </nav>
    </main>
  );
}
```

- [ ] **Step 2: 四个页面先落地占位**

示例 `apps/web/src/pages/DiscoverPage.tsx`：

```tsx
export default function DiscoverPage() {
  return (
    <section className="h5-page">
      <header className="h5-topbar"><h1>发现</h1></header>
      <div className="h5-empty">功能开发中</div>
    </section>
  );
}
```

- [ ] **Step 3: styles.css 增加 tabbar 选中态**

```css
.h5-tabbar a { color: #475569; text-decoration: none; padding: 14px 0; text-align:center; }
.h5-tabbar a.active { color:#0f172a; font-weight:700; }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages apps/web/src/styles.css
git commit -m "feat(web): add h5 tab shell pages"
```

### Task 4: 后端补“系统会话（SYSTEM）”与公告推送入系统会话

**Files:**
- Modify: `apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `apps/api/src/modules/messages/message.service.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`（公告发布）
- Test: `apps/api/src/modules/admin/admin.routes.test.ts`

- [ ] **Step 1: 新增确保系统会话方法**

在 `conversation.service.ts` 增加（按当前代码风格合并）：

```ts
export async function ensureSystemConversationForUser(userId: string) {
  const title = '系统消息';
  // 1) 查找是否已有 SYSTEM 会话（用 conversations.type='SYSTEM' + member=userId）
  // 2) 没有则创建 conversations(type='SYSTEM', title) 并插入 conversation_members
}
```

- [ ] **Step 2: admin 发布公告时写入 SYSTEM 会话（作为 SYSTEM 消息）**

在 admin 创建公告成功后，循环目标用户（第一期可先“所有用户”或“按需推送”；建议先推送给所有 ACTIVE 用户）：

```ts
await messageService.sendSystemMessage({
  targetUserId,
  title: announcement.title,
  content: announcement.content,
  actionUrl: '/h5/messages'
});
```

- [ ] **Step 3: 增加测试**

在 `admin.routes.test.ts`：
- 创建公告后，查询对应用户的会话/消息，能看到 SYSTEM 会话内有新消息

- [ ] **Step 4: 运行 API 测试**

Run: `pnpm --filter @jianliao/api test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/conversations apps/api/src/modules/messages apps/api/src/modules/admin
git commit -m "feat(api): deliver announcements into system conversation"
```

---

## 2) P1：补齐微信级媒体 + 群聊 + 运营风控闭环（C语音/文件/视频 + D + E + F）

### Task 5: files/upload 改为 multipart 上传并接入语音转码

**Files:**
- Modify: `apps/api/src/modules/files/file.routes.ts`
- Modify: `apps/api/src/modules/files/file.service.ts`
- Modify: `infra/compose/docker-compose.yml`（api 镜像加入 ffmpeg 或挂载）
- Test: `apps/api/src/modules/files/file.routes.test.ts`

- [ ] **Step 1: API 侧支持 multipart**

在 `file.routes.ts` 新增路由：

```ts
// POST /api/files/upload-binary (multipart)
// field: file, optional kind=image|voice|video|file
```

- [ ] **Step 2: 语音转码约定**

file.service 输出统一：
- voice → `mime=audio/aac`，`codec=aac`，`durationMs` 必填

- [ ] **Step 3: 测试（最小）**

file.routes.test.ts 增加：
- 上传一个小音频文件（fixtures）→ 返回 transcoded=true 且 mime 为 audio/aac

- [ ] **Step 4: Compose 支持 ffmpeg**

api Dockerfile 安装 ffmpeg（或使用包含 ffmpeg 的基础镜像）。

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/files infra/compose/docker-compose.yml
git commit -m "feat(api): support multipart upload with voice transcode"
```

### Task 6: 消息类型补齐 FILE/AUDIO/VIDEO，并统一摘要

**Files:**
- Modify: `apps/api/src/modules/messages/message.service.ts`
- Modify: `apps/api/src/modules/messages/message.routes.ts`
- Test: `apps/api/src/modules/messages/message.routes.test.ts`

- [ ] **Step 1: 扩展 type 枚举与校验**

确保 `type` 支持：`TEXT|IMAGE|FILE|AUDIO|VIDEO|SYSTEM`

- [ ] **Step 2: 统一摘要**

```ts
function getPreview(type: MessageType, body: any) {
  if (type === 'IMAGE') return '[图片]';
  if (type === 'AUDIO') return '[语音]';
  if (type === 'VIDEO') return '[视频]';
  if (type === 'FILE') return '[文件]';
  if (type === 'SYSTEM') return body?.title ?? '[系统消息]';
  return String(body?.text ?? '');
}
```

- [ ] **Step 3: 测试补齐**

针对各类型发送消息后，`GET /api/conversations` 返回的 `lastMessage`/preview 正确。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/messages
git commit -m "feat(api): support file/audio/video messages and previews"
```

### Task 7: 群聊生命周期（创建/邀请/退群）

**Files:**
- Modify: `apps/api/src/modules/conversations/conversation.routes.ts`
- Modify: `apps/api/src/modules/conversations/conversation.service.ts`
- Test: `apps/api/src/modules/conversations/conversation.routes.test.ts`

- [ ] **Step 1: 新增群聊创建接口**

`POST /api/conversations/group`
```json
{ "title": "群名称", "memberPhones": ["8551...", "8552..."] }
```

- [ ] **Step 2: 邀请与退群**

- `POST /api/conversations/:id/invite`
- `POST /api/conversations/:id/leave`

- [ ] **Step 3: 测试**

创建群 → 邀请 → 退群，消息/成员权限正确。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/conversations
git commit -m "feat(api): add group chat lifecycle routes"
```

### Task 8: 风控（限流/封禁/举报闭环）

**Files:**
- Modify: `apps/api/src/modules/risk/risk.service.ts`
- Modify: `apps/api/src/plugins/auth.plugin.ts`（请求级限流）
- Modify: `apps/api/src/modules/admin/admin.service.ts`（封禁）
- Modify: `apps/api/src/modules/public/public.routes.ts`（举报提交入口，如缺）
- Test: `apps/api/src/modules/admin/admin.routes.test.ts`

- [ ] **Step 1: 最小限流策略**

对以下接口做限流（按 IP + userId）：
- login
- send message
- upload

- [ ] **Step 2: 封禁策略**

封禁用户后：
- 禁止登录或禁止发消息（明确一条）

- [ ] **Step 3: 举报闭环**

用户端 `POST /api/reports`（如已存在则补齐字段/校验）
后台可查询与更新状态（OPEN/CLOSED）。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/risk apps/api/src/modules/admin apps/api/src/modules/public apps/api/src/plugins
git commit -m "feat(api): add basic rate limit, bans, and report workflow"
```

---

## 3) P2：多端 UI 全量对齐 + 运营深化 + 生产化完善（G + H + I完善）

### Task 9: H5 全量页面（chat + contacts + me/settings）与媒体能力

**Files:**
- Create/Modify: `apps/web/src/pages/ChatPage.tsx`
- Modify: `apps/web/src/state/ws.ts`
- Modify: `apps/web/src/api/*`（messages/files/contacts）
- Test: `apps/web/src/pages/*.test.tsx`

- [ ] **Step 1: ws 客户端（断线重连 + join 会话）**
- [ ] **Step 2: ChatPage：文本/图片/语音录音发送与播放**
- [ ] **Step 3: 未读清零：进入 chat 自动 read**
- [ ] **Step 4: 通讯录：列表/搜索/发起单聊**
- [ ] **Step 5: 我的：个人信息/设置/退出登录**
- [ ] **Step 6: Commit（按模块拆分多次）**

> 注：H5 语音录制使用 `MediaRecorder`；若浏览器不支持，降级为“上传音频文件”。

### Task 10: Android 微信四 Tab + 全量媒体 + ws

**Files:**
- Modify: `apps/android/.../MainActivity.kt`（Tab 容器）
- Create: `apps/android/.../ui/*`（messages/chat/contacts/discover/me/settings）
- Create: `VoiceRecorder.kt`（录音）

- [ ] **Step 1: Tab 容器（Compose/Fragment 视当前实现）**
- [ ] **Step 2: 聊天页：文本/图片/语音/文件/视频**
- [ ] **Step 3: ws：重连 + join + 未读同步**
- [ ] **Step 4: 联调：按 `docs/local/phase1-e2e-checklist.md` 执行**

### Task 11: iOS 微信四 Tab + 全量媒体 + ws

**Files:**
- Modify: `apps/ios/.../RootView.swift`（TabView）
- Modify: `apps/ios/.../ChatView.swift`（媒体）
- Create: `AudioRecorder.swift`

- [ ] **Step 1: TabView**
- [ ] **Step 2: Chat：文本/图片/语音/文件/视频**
- [ ] **Step 3: ws：重连 + join + 未读同步**
- [ ] **Step 4: 联调：按 `docs/local/phase1-e2e-checklist.md` 执行**

### Task 12: 后台与用户端联动（branding/announcements/activity）

**Files:**
- Modify: `apps/admin-web/src/pages/*`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/*`
- Modify: `apps/api/src/modules/activity/*`

- [ ] **Step 1: 活动发布 → SYSTEM 会话推送**
- [ ] **Step 2: 发现页入口可跳转活动**
- [ ] **Step 3: 品牌配置变化三端可见（启动拉取 + 缓存策略）**

### Task 13: 监控面板与演练制度化

**Files:**
- Create: `infra/monitoring/*`
- Modify: `infra/compose/docker-compose.yml`
- Modify: `docs/deploy/rocky9-production-runbook.md`（补监控与演练）

- [ ] **Step 1: Prometheus + Grafana（或最小替代）接入**
- [ ] **Step 2: 面板包含 API/WS/MySQL/Redis 指标**
- [ ] **Step 3: 定时备份（cron/计划任务）+ 每月恢复演练流程固化**

---

## 4. 计划自检（已覆盖 spec）

- A~I 全量范围均在任务列表中有落点（至少 P0/P1/P2）
- 所有命令、文件路径明确；P0/P1 给出具体代码片段
- P2 的移动端任务以现有工程骨架与联调清单为准推进（`docs/local/phase1-e2e-checklist.md`）

---

## 5. 执行方式选择

计划已保存到 `docs/superpowers/plans/2026-07-30-jianliao-full-project.md`。两种执行方式：

1. **Subagent-Driven（推荐）**：我按 Task 1 → Task 2 → … 逐个派发子代理实现，每完成一 task 就测试、提交、部署
2. **Inline Execution**：我在当前会话里按任务连续实现（风险是上下文更大、回滚成本更高）

请你回复 `1` 或 `2` 选择执行方式。


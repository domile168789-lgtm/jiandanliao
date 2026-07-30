# Admin Desktop And Web Production Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `admin-desktop` 与 `web` 收口到“真实数据优先、鉴权失败直接报错、列表页允许演示兜底且必须显式标注”的生产化策略。

**Architecture:** `web` 侧新增统一的数据加载结果层，把真实数据、演示兜底和鉴权错误分开处理；各页面只消费明确的数据来源与提示文案。`admin-desktop` 侧不改后端协议，重点补齐已有 fallback 页的显式来源提示与一致的错误表达，避免把演示数据伪装成真实运营数据。

**Tech Stack:** TypeScript, React, Vite, Vitest, Electron

---

### Task 1: 统一 Web 数据加载与演示兜底语义

**Files:**
- Create: `apps/web/src/api/loadable.ts`
- Modify: `apps/web/src/api/profile.ts`
- Modify: `apps/web/src/api/chat.ts`
- Modify: `apps/web/src/api/branding.ts`

- [ ] **Step 1: 定义统一数据来源结果**
- [ ] **Step 2: 让 profile/chat/branding 都返回真实或演示两种明确来源**
- [ ] **Step 3: 保证 401/403 不进入 demo fallback**
- [ ] **Step 4: 保证普通网络异常与 5xx 可按页面策略返回 demo**

### Task 2: 收口 Web 登录、注册与列表页展示

**Files:**
- Create: `apps/web/src/components/DataModeNotice.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/components/MainShell.tsx`
- Modify: `apps/web/src/pages/LoginPage.tsx`
- Modify: `apps/web/src/pages/RegisterEntryPage.tsx`
- Modify: `apps/web/src/pages/ChatPage.tsx`
- Modify: `apps/web/src/pages/ContactsPage.tsx`
- Modify: `apps/web/src/pages/DiscoverPage.tsx`
- Modify: `apps/web/src/pages/SystemNoticePage.tsx`
- Modify: `apps/web/src/pages/WalletPage.tsx`
- Modify: `apps/web/src/pages/EarningsPage.tsx`
- Modify: `apps/web/src/pages/AgentPage.tsx`
- Modify: `apps/web/src/pages/ProfilePage.tsx`
- Modify: `apps/web/src/pages/SecurityPage.tsx`
- Modify: `apps/web/src/pages/MePage.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 登录注册去掉 demo token 自动放行**
- [ ] **Step 2: 列表页接入统一演示提示条**
- [ ] **Step 3: 动作型页面失败时直接报错，不再创建假会话或假登录态**
- [ ] **Step 4: 补样式，保证提示条与错误提示可见**

### Task 3: 收口 Admin Desktop 兜底提示

**Files:**
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupOwnersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`

- [ ] **Step 1: 给 fallback 数据页补显式演示状态**
- [ ] **Step 2: 保留真实接口优先与已有错误提示**
- [ ] **Step 3: 把“推导数据 / 本地示例”说明收敛为统一视觉**

### Task 4: 验证

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 更新 Web 测试覆盖真实品牌与无会话列表**
- [ ] **Step 2: 更新 Admin smoke 覆盖演示数据显式标识**
- [ ] **Step 3: 运行 `pnpm --filter @jianliao/web test`**
- [ ] **Step 4: 运行 `pnpm --filter @jianliao/admin-desktop test`**
- [ ] **Step 5: 运行两个应用构建，确认无编译错误**

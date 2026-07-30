# 柬单聊全端交付 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `柬单聊` 的唯一暗色管理后台、完整用户端三端功能，以及后台与用户端的真实联动闭环，并在完成后先打开用户端和管理后台给用户确认。

**Architecture:** 以 `apps/api` + `apps/ws` 作为统一业务与实时后端，`apps/admin-desktop` 作为唯一管理后台，`apps/web`、`apps/android`、`apps/ios` 作为三端用户入口。实现顺序固定为“先功能完整，再统一视觉”，并通过主代理统一接口、命名、联动规则，再由各端子代理并行开发。

**Tech Stack:** Fastify、Socket.IO、MySQL、React + Vite、Electron、Jetpack Compose、SwiftUI、Vitest、Android Gradle、xcodebuild、Docker Compose

---

## 文件结构

### 共享后端

- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/admin/branding.service.ts`
- Modify: `apps/api/src/modules/activity/activity.service.ts`
- Modify: `apps/api/src/modules/auth/auth.routes.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/conversations/conversation.routes.ts`
- Modify: `apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `apps/api/src/modules/messages/message.routes.ts`
- Modify: `apps/api/src/modules/messages/message.service.ts`
- Modify: `apps/api/src/modules/messages/receipt.routes.ts`
- Modify: `apps/api/src/modules/reports/report.routes.ts`
- Modify: `apps/api/src/modules/risk/risk.service.ts`
- Modify: `apps/ws/src/events.ts`
- Modify: `apps/ws/src/server.ts`
- Modify: `infra/mysql/001_init.sql`
- Test: `tests/integration/auth-wiring.test.ts`
- Test: `tests/integration/schema.test.ts`
- Test: `tests/integration/mysql-schema.test.ts`

### 管理后台

- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/api/client.ts`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/UsersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupOwnersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/FinanceReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ProxyManagementPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`
- Test: `tests/integration/admin-console-parity.test.ts`

### Web/H5 用户端

- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/api/chat.ts`
- Modify: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/profile.ts`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/components/MainShell.tsx`
- Modify: `apps/web/src/components/DownloadPage.tsx`
- Modify: `apps/web/src/pages/LoginPage.tsx`
- Modify: `apps/web/src/pages/MessagesPage.tsx`
- Modify: `apps/web/src/pages/ChatPage.tsx`
- Modify: `apps/web/src/pages/ContactsPage.tsx`
- Modify: `apps/web/src/pages/DiscoverPage.tsx`
- Modify: `apps/web/src/pages/MePage.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Create: `apps/web/src/pages/SystemNoticePage.tsx`
- Create: `apps/web/src/pages/WalletPage.tsx`
- Create: `apps/web/src/pages/EarningsPage.tsx`
- Create: `apps/web/src/pages/AgentPage.tsx`
- Create: `apps/web/src/pages/ProfilePage.tsx`
- Create: `apps/web/src/pages/SecurityPage.tsx`
- Test: `apps/web/src/App.test.tsx`
- Test: `apps/web/src/components/MainShell.test.tsx`

### Android 用户端

- Modify: `apps/android/app/src/main/java/com/jianliao/android/MainActivity.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/SessionState.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/JianliaoNav.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SystemNoticeScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/WalletScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/EarningsScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/AgentScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ProfileScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SecurityScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/DiscoverScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ContactsScreen.kt`
- Modify: `apps/android/README.md`

### iOS 用户端

- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`
- Modify: `apps/ios/JianliaoIOS/App/AppConfig.swift`
- Modify: `apps/ios/JianliaoIOS/Core/Auth/AuthStore.swift`
- Create: `apps/ios/JianliaoIOS/Features/SystemNotice/SystemNoticeView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Wallet/WalletView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Earnings/EarningsView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Agent/AgentView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Profile/ProfileView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Security/SecurityView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Discover/DiscoverView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Contacts/ContactsView.swift`
- Modify: `apps/ios/README.md`

### 文档与验收

- Modify: `README.md`
- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `docs/local/phase1-real-e2e-review.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/deploy/phase1-server.md`

---

### Task 1: 统一产品名称与联动数据结构

**Files:**
- Modify: `apps/api/src/modules/admin/branding.service.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/activity/activity.service.ts`
- Modify: `infra/mysql/001_init.sql`
- Modify: `README.md`
- Test: `tests/integration/mysql-schema.test.ts`

- [ ] **Step 1: 先补数据库和品牌文案的失败断言**

```ts
it('stores jiandanliao-facing branding fields', () => {
  const schema = readFileSync('infra/mysql/001_init.sql', 'utf-8');
  expect(schema).toContain('branding_configs');
  expect(schema).toContain('project_name');
  expect(schema).toContain('theme_asset_url');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts -v`  
Expected: FAIL

- [ ] **Step 3: 调整数据库与品牌服务字段**

```sql
ALTER TABLE branding_configs
  ADD COLUMN project_name VARCHAR(128) NOT NULL DEFAULT '柬单聊';
```

```ts
export type BrandingConfig = {
  platformGroup: 'mobile' | 'pc';
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
};
```

- [ ] **Step 4: 更新 README 对外名称**

```md
# 柬单聊

柬单聊是一个覆盖 Web/H5、Android、iOS 与唯一暗色管理后台的即时通讯项目。
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add infra/mysql/001_init.sql apps/api/src/modules/admin/branding.service.ts apps/api/src/modules/admin/admin.routes.ts apps/api/src/modules/activity/activity.service.ts README.md tests/integration/mysql-schema.test.ts
git commit -m "feat: align jiandanliao branding baseline"
```

### Task 2: 补齐后台联动接口与实时事件

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/modules/admin/admin.service.ts`
- Modify: `apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `apps/api/src/modules/messages/message.service.ts`
- Modify: `apps/api/src/modules/messages/receipt.routes.ts`
- Modify: `apps/api/src/modules/reports/report.routes.ts`
- Modify: `apps/api/src/modules/risk/risk.service.ts`
- Modify: `apps/ws/src/events.ts`
- Modify: `apps/ws/src/server.ts`
- Test: `tests/integration/auth-wiring.test.ts`

- [ ] **Step 1: 先写联动事件失败断言**

```ts
it('wires admin-driven system notices and moderation events', () => {
  const ws = readFileSync('apps/ws/src/events.ts', 'utf-8');
  expect(ws).toContain('system_notice');
  expect(ws).toContain('moderation_result');
  expect(ws).toContain('activity_published');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/integration/auth-wiring.test.ts -v`  
Expected: FAIL

- [ ] **Step 3: 扩展 WS 事件定义**

```ts
export type ServerEvent =
  | { type: 'message_created'; conversationId: string }
  | { type: 'message_read'; conversationId: string; messageId: string }
  | { type: 'system_notice'; conversationId: string; noticeId: string }
  | { type: 'moderation_result'; userId: string; status: 'restricted' | 'released' }
  | { type: 'activity_published'; activityId: string };
```

- [ ] **Step 4: 在后台服务中写入系统通知会话**

```ts
await conversationService.ensureSystemConversation(targetUserId);
await messageService.createSystemMessage({
  targetUserId,
  category: 'moderation_result',
  content,
});
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run tests/integration/auth-wiring.test.ts -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/index.ts apps/api/src/modules/admin/admin.service.ts apps/api/src/modules/conversations/conversation.service.ts apps/api/src/modules/messages/message.service.ts apps/api/src/modules/messages/receipt.routes.ts apps/api/src/modules/reports/report.routes.ts apps/api/src/modules/risk/risk.service.ts apps/ws/src/events.ts apps/ws/src/server.ts tests/integration/auth-wiring.test.ts
git commit -m "feat: add jiandanliao admin-to-client linkage events"
```

### Task 3: 完成唯一暗色管理后台主流程

**Files:**
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/api/client.ts`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/UsersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupOwnersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/FinanceReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ProxyManagementPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`
- Test: `tests/integration/admin-console-parity.test.ts`

- [ ] **Step 1: 先补后台导航失败断言**

```ts
it('exposes all jiandanliao admin sections in the desktop app', () => {
  const app = readFileSync('apps/admin-desktop/src/renderer/ui/App.tsx', 'utf-8');
  expect(app).toContain("key: 'dashboard'");
  expect(app).toContain("key: 'groups'");
  expect(app).toContain("key: 'groupOwners'");
  expect(app).toContain("key: 'finance'");
  expect(app).toContain("key: 'proxy'");
  expect(app).toContain("key: 'activity'");
  expect(app).toContain("key: 'branding'");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @jianliao/admin-desktop test`  
Expected: FAIL

- [ ] **Step 3: 收口后台导航与页面路由**

```ts
const productionRoutes = [
  { key: 'dashboard', label: '仪表盘', page: DashboardPage },
  { key: 'users', label: '用户管理', page: UsersPage },
  { key: 'groups', label: '群组管理', page: GroupsPage },
  { key: 'groupOwners', label: '群主管理', page: GroupOwnersPage },
  { key: 'reports', label: '举报审核', page: ReportsPage },
  { key: 'finance', label: '财务报表', page: FinanceReportsPage },
  { key: 'proxy', label: '代理管理', page: ProxyManagementPage },
  { key: 'activity', label: '活动管理', page: ActivityCenterPage },
  { key: 'branding', label: '品牌配置', page: BrandingPage },
];
```

- [ ] **Step 4: 后台 API 层统一真实接口**

```ts
export async function fetchAdminDashboard() {
  return request<DashboardPayload>('/api/admin/dashboard');
}

export async function updateBranding(input: BrandingPayload) {
  return request('/api/admin/branding', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @jianliao/admin-desktop test && pnpm vitest run tests/integration/admin-console-parity.test.ts -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin-desktop/src/renderer/ui/App.tsx apps/admin-desktop/src/renderer/api/admin.ts apps/admin-desktop/src/renderer/api/client.ts apps/admin-desktop/src/renderer/styles.css apps/admin-desktop/src/renderer/ui/pages/*.tsx apps/admin-desktop/src/renderer/smoke.test.ts tests/integration/admin-console-parity.test.ts
git commit -m "feat: complete jiandanliao desktop admin console"
```

### Task 4: 完成 Web/H5 用户端完整版主流程

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/api/chat.ts`
- Modify: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/profile.ts`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/components/MainShell.tsx`
- Modify: `apps/web/src/components/DownloadPage.tsx`
- Modify: `apps/web/src/pages/LoginPage.tsx`
- Modify: `apps/web/src/pages/MessagesPage.tsx`
- Modify: `apps/web/src/pages/ChatPage.tsx`
- Modify: `apps/web/src/pages/ContactsPage.tsx`
- Modify: `apps/web/src/pages/DiscoverPage.tsx`
- Modify: `apps/web/src/pages/MePage.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Create: `apps/web/src/pages/SystemNoticePage.tsx`
- Create: `apps/web/src/pages/WalletPage.tsx`
- Create: `apps/web/src/pages/EarningsPage.tsx`
- Create: `apps/web/src/pages/AgentPage.tsx`
- Create: `apps/web/src/pages/ProfilePage.tsx`
- Create: `apps/web/src/pages/SecurityPage.tsx`
- Test: `apps/web/src/App.test.tsx`
- Test: `apps/web/src/components/MainShell.test.tsx`

- [ ] **Step 1: 先补完整版路由失败断言**

```ts
it('routes to all jiandanliao client sections', () => {
  const router = readFileSync('apps/web/src/router.tsx', 'utf-8');
  expect(router).toContain("path: '/messages'");
  expect(router).toContain("path: '/contacts'");
  expect(router).toContain("path: '/discover'");
  expect(router).toContain("path: '/me'");
  expect(router).toContain("path: '/system-notice'");
  expect(router).toContain("path: '/wallet'");
  expect(router).toContain("path: '/earnings'");
  expect(router).toContain("path: '/agent'");
  expect(router).toContain("path: '/security'");
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @jianliao/web test`  
Expected: FAIL

- [ ] **Step 3: 收口 Web 路由与底部导航**

```ts
export const appRoutes = [
  { path: '/messages', element: <MessagesPage /> },
  { path: '/contacts', element: <ContactsPage /> },
  { path: '/discover', element: <DiscoverPage /> },
  { path: '/me', element: <MePage /> },
  { path: '/system-notice', element: <SystemNoticePage /> },
  { path: '/wallet', element: <WalletPage /> },
  { path: '/earnings', element: <EarningsPage /> },
  { path: '/agent', element: <AgentPage /> },
  { path: '/security', element: <SecurityPage /> },
];
```

- [ ] **Step 4: 聊天与个人中心接入完整入口**

```ts
export async function fetchWalletSummary() {
  return request<WalletSummary>('/api/profile/wallet');
}

export async function fetchAgentOverview() {
  return request<AgentOverview>('/api/profile/agent');
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --filter @jianliao/web test`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/router.tsx apps/web/src/styles.css apps/web/src/api/*.ts apps/web/src/components/*.tsx apps/web/src/pages/*.tsx
git commit -m "feat: complete jiandanliao web client flows"
```

### Task 5: 完成 Android 用户端完整版主流程

**Files:**
- Modify: `apps/android/app/src/main/java/com/jianliao/android/MainActivity.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/SessionState.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/JianliaoNav.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SystemNoticeScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/WalletScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/EarningsScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/AgentScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ProfileScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SecurityScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/DiscoverScreen.kt`
- Create: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ContactsScreen.kt`
- Modify: `apps/android/README.md`

- [ ] **Step 1: 先补 Android 导航结构失败断言**

```kotlin
// MainActivity.kt
assertContains(source, "Messages")
assertContains(source, "Contacts")
assertContains(source, "Discover")
assertContains(source, "Me")
assertContains(source, "SystemNotice")
assertContains(source, "Wallet")
assertContains(source, "Earnings")
assertContains(source, "Agent")
assertContains(source, "Security")
```

- [ ] **Step 2: 运行静态检查确认缺失**

Run: `grep -R "SystemNotice" apps/android/app/src/main/java/com/jianliao/android || true`  
Expected: no matches or incomplete matches

- [ ] **Step 3: 补齐 Compose 导航入口**

```kotlin
sealed class JianliaoRoute(val route: String) {
    data object Messages : JianliaoRoute("messages")
    data object Contacts : JianliaoRoute("contacts")
    data object Discover : JianliaoRoute("discover")
    data object Me : JianliaoRoute("me")
    data object SystemNotice : JianliaoRoute("system_notice")
    data object Wallet : JianliaoRoute("wallet")
    data object Earnings : JianliaoRoute("earnings")
    data object Agent : JianliaoRoute("agent")
    data object Security : JianliaoRoute("security")
}
```

- [ ] **Step 4: ServiceLocator 接入钱包、代理、系统通知仓储**

```kotlin
val profileRepository by lazy { ProfileRepository(apiClient) }
val walletRepository by lazy { WalletRepository(apiClient) }
val agentRepository by lazy { AgentRepository(apiClient) }
```

- [ ] **Step 5: 运行构建检查**

Run: `cd apps/android && ./gradlew assembleDebug`  
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add apps/android/app/src/main/java/com/jianliao/android/MainActivity.kt apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt apps/android/app/src/main/java/com/jianliao/android/core/SessionState.kt apps/android/app/src/main/java/com/jianliao/android/ui/JianliaoNav.kt apps/android/app/src/main/java/com/jianliao/android/ui/screens/*.kt apps/android/README.md
git commit -m "feat: complete jiandanliao android client flows"
```

### Task 6: 完成 iOS 用户端完整版主流程

**Files:**
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`
- Modify: `apps/ios/JianliaoIOS/App/AppConfig.swift`
- Modify: `apps/ios/JianliaoIOS/Core/Auth/AuthStore.swift`
- Create: `apps/ios/JianliaoIOS/Features/SystemNotice/SystemNoticeView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Wallet/WalletView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Earnings/EarningsView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Agent/AgentView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Profile/ProfileView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Security/SecurityView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Discover/DiscoverView.swift`
- Create: `apps/ios/JianliaoIOS/Features/Contacts/ContactsView.swift`
- Modify: `apps/ios/README.md`

- [ ] **Step 1: 先补 iOS 根导航失败断言**

```swift
// RootView.swift
assertContains(source, "Messages")
assertContains(source, "Contacts")
assertContains(source, "Discover")
assertContains(source, "Me")
assertContains(source, "SystemNoticeView")
assertContains(source, "WalletView")
assertContains(source, "EarningsView")
assertContains(source, "AgentView")
assertContains(source, "SecurityView")
```

- [ ] **Step 2: 检查现有 Features 是否缺页**

Run: `find apps/ios/JianliaoIOS/Features -maxdepth 2 -type f | sort`  
Expected: 缺少系统通知、钱包、收益、代理、安全等页面文件

- [ ] **Step 3: 扩展 SwiftUI 根容器**

```swift
TabView {
    ConversationsView().tabItem { Label("消息", systemImage: "message") }
    ContactsView().tabItem { Label("通讯录", systemImage: "person.2") }
    DiscoverView().tabItem { Label("发现", systemImage: "safari") }
    ProfileView().tabItem { Label("我的", systemImage: "person.crop.circle") }
}
```

- [ ] **Step 4: AuthStore 接入系统通知与安全态**

```swift
@Published var isRestricted = false
@Published var pendingNotices: [SystemNotice] = []
```

- [ ] **Step 5: 运行 iOS 构建检查**

Run: `cd apps/ios && xcodebuild -project JianliaoIOS.xcodeproj -scheme JianliaoIOS -sdk iphonesimulator -configuration Debug build`  
Expected: BUILD SUCCEEDED

- [ ] **Step 6: Commit**

```bash
git add apps/ios/JianliaoIOS/App/RootView.swift apps/ios/JianliaoIOS/App/AppConfig.swift apps/ios/JianliaoIOS/Core/Auth/AuthStore.swift apps/ios/JianliaoIOS/Features apps/ios/README.md
git commit -m "feat: complete jiandanliao ios client flows"
```

### Task 7: 后台与三端联动验收

**Files:**
- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `docs/local/phase1-real-e2e-review.md`
- Modify: `docs/release-checklist.md`
- Modify: `docs/deploy/phase1-server.md`
- Test: `tests/integration/compose.test.ts`
- Test: `tests/integration/deploy-env-baseline.test.ts`

- [ ] **Step 1: 补联动验收断言**

```ts
it('documents jiandanliao preview and linkage checks', () => {
  const review = readFileSync('docs/local/phase1-real-e2e-review.md', 'utf-8');
  expect(review).toContain('柬单聊');
  expect(review).toContain('先打开用户端');
  expect(review).toContain('再打开管理后台');
  expect(review).toContain('封禁联动');
  expect(review).toContain('举报联动');
  expect(review).toContain('活动联动');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/integration/compose.test.ts tests/integration/deploy-env-baseline.test.ts -v`  
Expected: FAIL or doc mismatch

- [ ] **Step 3: 更新文档为最终验收顺序**

```md
1. 先打开 `Web/H5 / Android / iOS` 用户端预览并确认功能。
2. 再打开唯一暗色管理后台并确认联动。
3. 记录封禁、举报、活动、公告、钱包与代理数据是否闭环。
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run tests/integration/compose.test.ts tests/integration/deploy-env-baseline.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/local/phase1-admin-e2e.md docs/local/phase1-real-e2e-review.md docs/release-checklist.md docs/deploy/phase1-server.md tests/integration/compose.test.ts tests/integration/deploy-env-baseline.test.ts
git commit -m "docs: add jiandanliao end-to-end acceptance flow"
```

### Task 8: 全端视觉统一与最终预览

**Files:**
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/android/app/src/main/res/values/themes.xml`
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`
- Modify: `README.md`

- [ ] **Step 1: 先整理统一视觉令牌**

```css
:root {
  --jd-bg: #050816;
  --jd-panel: #0a1230;
  --jd-panel-soft: #111d46;
  --jd-line: rgba(116, 143, 255, 0.24);
  --jd-accent: #6e7cff;
  --jd-accent-soft: #8d5cff;
  --jd-text: #f3f6ff;
  --jd-text-muted: #99a7d9;
}
```

- [ ] **Step 2: 将后台与 Web/H5 统一到同一套暗色变量**

Run: `pnpm --filter @jianliao/admin-desktop build && pnpm --filter @jianliao/web build`  
Expected: both builds PASS

- [ ] **Step 3: 同步 Android / iOS 基础主题色**

```xml
<color name="jd_bg">#050816</color>
<color name="jd_surface">#0A1230</color>
<color name="jd_accent">#6E7CFF</color>
```

```swift
let jdBackground = Color(red: 5 / 255, green: 8 / 255, blue: 22 / 255)
let jdAccent = Color(red: 110 / 255, green: 124 / 255, blue: 1.0)
```

- [ ] **Step 4: 启动最终预览并记录链接**

Run: `pnpm --filter @jianliao/web dev`  
Expected: 本地用户端可预览

Run: `pnpm --filter @jianliao/admin-desktop dev`  
Expected: 本地管理后台可预览

- [ ] **Step 5: Commit**

```bash
git add apps/admin-desktop/src/renderer/styles.css apps/web/src/styles.css apps/android/app/src/main/res/values/themes.xml apps/ios/JianliaoIOS/App/RootView.swift README.md
git commit -m "style: unify jiandanliao cross-platform visual system"
```

---

## 子代理执行分工

- `子代理 A：共享后端 + WS`
  - 负责 Task 1、Task 2
- `子代理 B：唯一管理后台`
  - 负责 Task 3
- `子代理 C：Web/H5 用户端`
  - 负责 Task 4
- `子代理 D：Android 用户端`
  - 负责 Task 5
- `子代理 E：iOS 用户端`
  - 负责 Task 6
- `主代理整合`
  - 负责 Task 7、Task 8

并行规则：

- Task 1 完成后，Task 2 可开始
- Task 2 完成后，Task 3/4/5/6 可并行
- Task 3/4/5/6 全部完成后，才进入 Task 7
- Task 7 通过后，才进入 Task 8

---

## 计划自检

- 规格覆盖：唯一后台、三端用户端、命名统一、联动闭环、先功能后视觉、先预览后收尾，均已映射到对应任务
- 占位扫描：未使用 `TBD`、`TODO`、`后续再说` 等占位项
- 类型一致：统一使用 `柬单聊`、`admin-desktop`、`Web/H5`、`Android`、`iOS`、`system_notice` 等命名

# Jianliao iOS Profile Lightweight Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 iOS 端“我的 / 钱包 / 收益 / 代理 / 系统通知 / 发现”接入 `/api/profile/*` 轻量接口，同时尽量保持现有页面结构不变。

**Architecture:** 新增 `ProfileService` 负责轻量接口类型与拉取逻辑，新增 `ProfileStore` 作为聚合状态层。应用层将 `ProfileStore` 注入为环境对象，相关页面仅替换数据来源与刷新逻辑，不改动现有页面主结构。

**Tech Stack:** SwiftUI, Foundation, async/await, ObservableObject

---

### Task 1: 新增轻量 Profile 数据层

**Files:**
- Create: `apps/ios/JianliaoIOS/Core/Profile/ProfileService.swift`
- Create: `apps/ios/JianliaoIOS/Core/Profile/ProfileStore.swift`

- [ ] **Step 1: 定义轻量接口模型与请求方法**

```swift
struct ProfileSummaryPayload: Codable { ... }
struct ProfileWalletPayload: Codable { ... }
struct ProfileEarningsPayload: Codable { ... }
struct ProfileAgentPayload: Codable { ... }
struct ProfileNoticePayload: Codable, Identifiable { ... }

final class ProfileService {
  private let api: APIClient
  init(authProvider: AuthProviding) { self.api = APIClient(authProvider: authProvider) }
  func fetchSummary() async throws -> ProfileSummaryPayload { try await api.request("/profile/summary", method: .get) }
  func fetchWallet() async throws -> ProfileWalletPayload { try await api.request("/profile/wallet", method: .get) }
  func fetchEarnings() async throws -> ProfileEarningsPayload { try await api.request("/profile/earnings", method: .get) }
  func fetchAgent() async throws -> ProfileAgentPayload { try await api.request("/profile/agent", method: .get) }
  func fetchSystemNotices() async throws -> [ProfileNoticePayload] { try await api.request("/profile/system-notices", method: .get) }
}
```

- [ ] **Step 2: 实现聚合状态与刷新入口**

```swift
@MainActor
final class ProfileStore: ObservableObject {
  @Published private(set) var summary: ProfileSummaryPayload
  @Published private(set) var wallet: ProfileWalletPayload
  @Published private(set) var earnings: ProfileEarningsPayload
  @Published private(set) var agent: ProfileAgentPayload
  @Published private(set) var notices: [ProfileNoticePayload]

  func refreshAll(phoneHint: String?) async { ... }
  func markAllNoticesRead() { ... }
  func clear(phoneHint: String?) { ... }
}
```

### Task 2: 注入环境对象并在登录态切换时同步

**Files:**
- Modify: `apps/ios/JianliaoIOS/App/JianliaoIOSApp.swift`
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`

- [ ] **Step 1: 在 App 初始化时创建 `ProfileStore`**

```swift
let auth = AuthStore()
_authStore = StateObject(wrappedValue: auth)
_profileStore = StateObject(wrappedValue: ProfileStore(service: ProfileService(authProvider: auth)))
```

- [ ] **Step 2: 在 `RootView` 中根据登录态刷新或清空**

```swift
.task(id: auth.userId) {
  if auth.isLoggedIn {
    await profile.refreshAll(phoneHint: auth.phone)
  } else {
    profile.clear(phoneHint: nil)
  }
}
```

### Task 3: 页面改为读取 `ProfileStore`

**Files:**
- Modify: `apps/ios/JianliaoIOS/Features/Profile/ProfileView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Wallet/WalletView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Earnings/EarningsView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Agent/AgentView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/SystemNotice/SystemNoticeView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Discover/DiscoverView.swift`

- [ ] **Step 1: 保持原有 `List/Section` 结构，替换静态值为接口值**

```swift
@EnvironmentObject private var profile: ProfileStore
Text(profile.summary.displayName)
Text(profile.wallet.balance.formatted(.currency(code: profile.wallet.currency)))
ForEach(profile.notices) { notice in ... }
```

- [ ] **Step 2: 为相关页增加拉取与下拉刷新**

```swift
.task { await profile.refreshIfNeeded(phoneHint: auth.phone) }
.refreshable { await profile.refreshAll(phoneHint: auth.phone) }
```

### Task 4: 校验

**Files:**
- Review: `apps/ios/JianliaoIOS/**/*.swift`

- [ ] **Step 1: 检查工作区改动**

```bash
git diff -- apps/ios/JianliaoIOS apps/ios/JianliaoIOSTests
```

- [ ] **Step 2: 在可用范围内执行本地校验**

```bash
swift --version
```

- [ ] **Step 3: 汇总无法在 Linux 沙箱完成的验证项**

```text
Xcode / iOS Simulator 构建与运行需在 macOS 环境补充验证。
```

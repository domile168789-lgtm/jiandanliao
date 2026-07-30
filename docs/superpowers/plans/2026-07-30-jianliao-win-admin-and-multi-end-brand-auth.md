# 柬聊 Windows 管理后台与多端品牌登录页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个符合设计图的 Windows `exe` 管理后台，同时为 `H5 / Android / iOS / PC 网页端` 落地按组读取的品牌登录页能力。

**Architecture:** 后端新增 `branding_configs` 表与管理/公开接口；`apps/admin-desktop` 成为唯一管理员后台交付物，负责暗色仪表盘首页、品牌配置页和 Windows `exe` 打包；`apps/web` 负责 `H5` 与 `PC 网页端` 的品牌登录页；Android 与 iOS 接入 `mobile` 品牌配置。当前仓库没有独立“用户 Windows 桌面端”目录，本轮先将 `pc` 配置应用在 `PC 网页端`，并在文档中记录后续 Windows 用户端接入协议。

**Tech Stack:** Fastify、MySQL、React + Vite、Electron、electron-builder、Jetpack Compose、SwiftUI、Vitest、Android Gradle、xcodebuild

---

## 文件结构

### 后端

- Create: `apps/api/src/modules/admin/branding.service.ts`
- Create: `apps/api/src/modules/public/public.routes.ts`
- Create: `apps/api/src/modules/public/public.routes.test.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `infra/mysql/001_init.sql`
- Modify: `tests/integration/mysql-schema.test.ts`

### Windows 管理后台

- Modify: `apps/admin-desktop/package.json`
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Create: `apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx`
- Create: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`

### 用户 Web

- Create: `apps/web/src/api/branding.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Create: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.test.tsx`

### Android

- Create: `apps/android/app/src/main/java/com/jianliao/android/data/repo/BrandingRepository.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/data/api/JianliaoApi.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt`

### iOS

- Create: `apps/ios/JianliaoIOS/Core/Branding/BrandingStore.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`

### 文档

- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `docs/local/phase1-real-e2e-review.md`

---

### Task 1: 后端品牌配置表与接口

**Files:**
- Create: `apps/api/src/modules/admin/branding.service.ts`
- Create: `apps/api/src/modules/public/public.routes.ts`
- Create: `apps/api/src/modules/public/public.routes.test.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `infra/mysql/001_init.sql`
- Test: `tests/integration/mysql-schema.test.ts`

- [ ] **Step 1: 先补 schema 失败断言**

```ts
it('contains branding_configs table for mobile and pc groups', () => {
  const schema = readFileSync('infra/mysql/001_init.sql', 'utf-8');
  expect(schema).toContain('CREATE TABLE IF NOT EXISTS branding_configs');
  expect(schema).toContain('platform_group VARCHAR(16) NOT NULL UNIQUE');
  expect(schema).toContain('project_name VARCHAR(128) NOT NULL');
  expect(schema).toContain('logo_url VARCHAR(512) NULL');
  expect(schema).toContain('theme_asset_url VARCHAR(512) NULL');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts`  
Expected: FAIL

- [ ] **Step 3: 修改 MySQL 初始化脚本**

```sql
CREATE TABLE IF NOT EXISTS branding_configs (
  id VARCHAR(64) PRIMARY KEY,
  platform_group VARCHAR(16) NOT NULL UNIQUE,
  project_name VARCHAR(128) NOT NULL,
  logo_url VARCHAR(512) NULL,
  theme_asset_url VARCHAR(512) NULL,
  updated_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL
);
```

- [ ] **Step 4: 新增 branding service**

```ts
export type BrandingGroup = 'mobile' | 'pc';

export class BrandingService {
  async list() { /* SELECT branding_configs */ }
  async getByGroup(group: BrandingGroup) { /* SELECT ... WHERE platform_group = ? */ }
  async upsert(input: {
    platformGroup: BrandingGroup;
    projectName: string;
    logoUrl?: string | null;
    themeAssetUrl?: string | null;
    adminId: string;
  }) { /* INSERT ... ON DUPLICATE KEY UPDATE */ }
}
```

- [ ] **Step 5: 扩展 admin/public 路由**

```ts
app.get('/admin/branding', async (request, reply) => { /* read roles */ });
app.put('/admin/branding/:platformGroup', async (request, reply) => { /* write roles */ });
app.get('/public/branding', async (request, reply) => { /* query group=mobile|pc */ });
```

- [ ] **Step 6: 注册新路由并补测试**

```ts
await app.register(publicRoutes, { prefix: '/api' });
```

```ts
it('returns branding config for requested group', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/public/branding?group=mobile' });
  expect(res.statusCode).toBe(200);
});
```

- [ ] **Step 7: 运行测试**

Run:
- `pnpm vitest run apps/api/src/modules/admin/admin.routes.test.ts`
- `pnpm vitest run apps/api/src/modules/public/public.routes.test.ts`
- `pnpm vitest run tests/integration/mysql-schema.test.ts`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add infra/mysql/001_init.sql \
  apps/api/src/index.ts \
  apps/api/src/modules/admin/admin.routes.ts \
  apps/api/src/modules/admin/admin.routes.test.ts \
  apps/api/src/modules/admin/branding.service.ts \
  apps/api/src/modules/public/public.routes.ts \
  apps/api/src/modules/public/public.routes.test.ts \
  tests/integration/mysql-schema.test.ts
git commit -m "feat: add branding config backend APIs"
```

### Task 2: Windows 管理后台视觉重构与品牌配置页

**Files:**
- Modify: `apps/admin-desktop/package.json`
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Create: `apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx`
- Create: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先补 smoke 失败断言**

```ts
it('contains dashboard and branding routes for desktop admin', () => {
  const app = readFileSync('apps/admin-desktop/src/renderer/ui/App.tsx', 'utf-8');
  expect(app).toContain("'dashboard'");
  expect(app).toContain("'branding'");
});

it('contains designed dashboard sections', () => {
  const dashboard = readFileSync('apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx', 'utf-8');
  expect(dashboard).toContain('用户总数');
  expect(dashboard).toContain('平台分布');
  expect(dashboard).toContain('最近活跃用户');
  expect(dashboard).toContain('消息动态实时监控');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @jianliao/admin-desktop test`  
Expected: FAIL

- [ ] **Step 3: 扩展桌面端 admin API**

```ts
export type BrandingRow = {
  platformGroup: 'mobile' | 'pc';
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
};

export const adminApi = {
  listBranding(session: AdminSession) { /* GET /admin/branding */ },
  updateBranding(session: AdminSession, group: 'mobile' | 'pc', input: Omit<BrandingRow, 'platformGroup'>) {
    /* PUT /admin/branding/:group */
  }
};
```

- [ ] **Step 4: 新增 DashboardPage**

```tsx
export const DashboardPage = () => (
  <section className="dashboard">
    <div className="stats-grid">
      <article className="stat-card"><span>用户总数</span><strong>12,846</strong></article>
      <article className="stat-card"><span>在线用户</span><strong>3,291</strong></article>
      <article className="stat-card"><span>今日消息量</span><strong>158,432</strong></article>
      <article className="stat-card"><span>违规举报</span><strong>1,204</strong></article>
    </div>
    <div className="dashboard-grid">
      <section className="panel"><h3>近7日消息趋势</h3></section>
      <section className="panel"><h3>平台分布</h3></section>
    </div>
    <section className="panel"><h3>最近活跃用户</h3></section>
    <section className="panel"><h3>消息动态实时监控</h3></section>
  </section>
);
```

- [ ] **Step 5: 新增 BrandingPage，并接入导航**

```tsx
type Route = 'dashboard' | 'users' | 'reports' | 'announce' | 'audits' | 'branding';

if (route === 'dashboard') return <DashboardPage />;
if (route === 'branding') return <BrandingPage />;
```

```tsx
export const BrandingPage = () => (
  <section className="panel branding-panel">
    <h2>品牌配置</h2>
    <div className="branding-grid">
      <div className="branding-group"><h3>移动端配置</h3></div>
      <div className="branding-group"><h3>PC 端配置</h3></div>
    </div>
  </section>
);
```

- [ ] **Step 6: 按设计图重写暗色样式**

```css
.dashboard { display: grid; gap: 16px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.dashboard-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.stat-card, .panel { border: 1px solid #1f2a37; border-radius: 16px; background: #111827; padding: 16px; }
.branding-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
```

- [ ] **Step 7: 增加 Windows exe 打包脚本**

```json
{
  "scripts": {
    "dist:win": "vite build && tsc -p tsconfig.electron.json && electron-builder --win nsis"
  },
  "devDependencies": {
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.jianliao.admin.desktop",
    "productName": "柬聊管理员后台",
    "files": ["dist/**", "dist-electron/**", "package.json"],
    "win": { "target": ["nsis"] },
    "nsis": { "oneClick": false, "perMachine": false }
  }
}
```

- [ ] **Step 8: 运行测试与构建**

Run:
- `pnpm --filter @jianliao/admin-desktop test`
- `pnpm --filter @jianliao/admin-desktop build`
- `pnpm --filter @jianliao/admin-desktop dist:win`

Expected: PASS，并产出 Windows 安装包

- [ ] **Step 9: Commit**

```bash
git add apps/admin-desktop/package.json \
  apps/admin-desktop/src/renderer/ui/App.tsx \
  apps/admin-desktop/src/renderer/api/admin.ts \
  apps/admin-desktop/src/renderer/ui/pages/DashboardPage.tsx \
  apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx \
  apps/admin-desktop/src/renderer/styles.css \
  apps/admin-desktop/src/renderer/smoke.test.ts
git commit -m "feat: redesign desktop admin console and add branding"
```

### Task 3: 用户 Web 登录页重做并接品牌配置

**Files:**
- Create: `apps/web/src/api/branding.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Create: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试**

```tsx
it('defaults to login page on /h5 and shows register action', () => {
  window.history.replaceState({}, '', '/h5');
  render(<App />);
  expect(screen.getByText('登录')).toBeInTheDocument();
  expect(screen.getByText('注册账号')).toBeInTheDocument();
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- App.test.tsx`  
Expected: FAIL

- [ ] **Step 3: 新增品牌读取客户端**

```ts
export async function fetchBranding(group: 'mobile' | 'pc') {
  const res = await fetch(`/api/public/branding?group=${group}`);
  if (!res.ok) throw new Error('branding request failed');
  return res.json();
}
```

- [ ] **Step 4: 重写 AuthPage 与 RegisterPage**

```tsx
<button className="primary-button" onClick={props.onLogin}>登录</button>
<div className="helper-row">
  <button type="button">记住密码</button>
  <button type="button">忘记密码</button>
</div>
<button className="secondary-button" onClick={props.onGoRegister}>注册账号</button>
```

- [ ] **Step 5: 在 App 中按端映射品牌组**

```tsx
const group = path.startsWith('/h5') ? 'mobile' : 'pc';
useEffect(() => {
  fetchBranding(group).then(setBranding).catch(() => setBranding(fallbackBranding[group]));
}, [group]);
```

- [ ] **Step 6: 跑 Web 测试**

Run: `npm test -- App.test.tsx`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/api/branding.ts \
  apps/web/src/App.tsx \
  apps/web/src/components/AuthPage.tsx \
  apps/web/src/components/RegisterPage.tsx \
  apps/web/src/styles.css \
  apps/web/src/App.test.tsx
git commit -m "feat: redesign web auth pages with branding"
```

### Task 4: Android 接入移动端品牌配置并重做登录页

**Files:**
- Create: `apps/android/app/src/main/java/com/jianliao/android/data/repo/BrandingRepository.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/data/api/JianliaoApi.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt`

- [ ] **Step 1: 新增品牌仓库与 API**

```kotlin
class BrandingRepository(private val api: JianliaoApi) {
    suspend fun getMobileBranding(): BrandingModel { /* fallback 柬聊 */ }
}
```

- [ ] **Step 2: 在 ViewModel 暴露 branding 状态**

```kotlin
data class AuthUiState(
    val branding: BrandingModel = BrandingModel("mobile", "柬聊", null, null),
    ...
)
```

- [ ] **Step 3: 重写 LoginScreen 为默认登录页**

```kotlin
Text(state.branding.projectName)
Button(onClick = { vm.login(onLoginSuccess) }) { Text("登录") }
TextButton(onClick = { mode = AuthMode.REGISTER }) { Text("注册账号") }
TextButton(onClick = { }) { Text("记住密码") }
TextButton(onClick = { }) { Text("忘记密码") }
TextButton(onClick = { }) { Text("全球语言切换") }
```

- [ ] **Step 4: 构建 Android**

Run: `./gradlew :app:assembleDebug`  
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add apps/android/app/src/main/java/com/jianliao/android/data/repo/BrandingRepository.kt \
  apps/android/app/src/main/java/com/jianliao/android/data/api/JianliaoApi.kt \
  apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt \
  apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt \
  apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt
git commit -m "feat: add branded mobile login on android"
```

### Task 5: iOS 接入移动端品牌配置并重做登录页

**Files:**
- Create: `apps/ios/JianliaoIOS/Core/Branding/BrandingStore.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`

- [ ] **Step 1: 新增 BrandingStore**

```swift
@MainActor
final class BrandingStore: ObservableObject {
  @Published var projectName: String = "柬聊"
  @Published var logoUrl: String?
  @Published var themeAssetUrl: String?
}
```

- [ ] **Step 2: 在登录页接入默认登录态**

```swift
@StateObject private var branding = BrandingStore()
@State private var isRegister: Bool = false

Button("登录") { Task { await submit() } }
Button("注册账号") { isRegister = true }
Button("记住密码") { }
Button("忘记密码") { }
Button("全球语言切换") { }
```

- [ ] **Step 3: 运行 iOS 测试/构建**

Run:
- `cd apps/ios && xcodegen generate`
- `xcodebuild test -project JianliaoIOS.xcodeproj -scheme JianliaoIOS -destination 'platform=iOS Simulator,name=iPhone 15'`

Expected: TEST SUCCEEDED  
If current environment lacks Xcode, record blocker and do static verification only.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/JianliaoIOS/Core/Branding/BrandingStore.swift \
  apps/ios/JianliaoIOS/Features/Login/LoginView.swift \
  apps/ios/JianliaoIOS/App/RootView.swift
git commit -m "feat: add branded mobile login on ios"
```

### Task 6: 文档、演示与跨端回归

**Files:**
- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `docs/local/phase1-real-e2e-review.md`

- [ ] **Step 1: 更新后台演示文档**

```md
1. 打开 Windows 管理后台首页，确认暗色仪表盘布局
2. 进入品牌配置页
3. 修改移动端项目名称 / 项目 LOGO / 底部背景主题位
4. 打开 `/h5`，确认登录页变化
5. 修改 PC 端配置
6. 打开 `/`，确认 PC 网页端登录页变化
7. 运行 `pnpm --filter @jianliao/admin-desktop dist:win` 并确认产出 exe
```

- [ ] **Step 2: 加入当前仓库边界说明**

```md
本仓库当前没有独立“用户 Windows 桌面端”代码目录。
本轮先将 `pc` 品牌配置作用于 `PC 网页端`，后续 Windows 用户端需接入：
`GET /api/public/branding?group=pc`
```

- [ ] **Step 3: 运行回归测试**

Run:
- `pnpm vitest run tests/integration/mysql-schema.test.ts`
- `pnpm --filter @jianliao/api test`
- `pnpm --filter @jianliao/admin-desktop test`
- `npm --prefix apps/web test -- App.test.tsx`

Expected: PASS

- [ ] **Step 4: 本地演示构建**

Run:
- `pnpm --filter @jianliao/admin-desktop build`
- `pnpm --filter @jianliao/admin-desktop dist:win`
- `npm --prefix apps/web run build`
- `./apps/android/gradlew -p apps/android :app:assembleDebug`

Expected: Windows 管理后台产出 exe；其余构建成功；如 iOS 环境不足，单独记录

- [ ] **Step 5: Commit**

```bash
git add docs/local/phase1-admin-e2e.md \
  docs/local/phase1-real-e2e-review.md
git commit -m "docs: update desktop admin branding demo checklist"
```

## 自检

- Spec coverage:
  - 默认登录页：Task 3 / Task 4 / Task 5 覆盖
  - 后台移动端/PC 端两组品牌配置：Task 1 / Task 2 覆盖
  - 项目名称 / LOGO / 底部主题位：Task 1 / Task 2 / Task 3 / Task 4 / Task 5 覆盖
  - 管理员后台仅 Windows exe：Task 2 / Task 6 覆盖
  - H5 / Android / iOS / PC 网页端：Task 3 / Task 4 / Task 5 覆盖
  - 用户 Windows 桌面端：当前仓库缺代码目录，Task 6 写入接入约束

- Placeholder scan:
  - 无 `TODO` / `TBD`
  - 所有任务都有文件路径、命令和代码片段

- Type consistency:
  - 品牌配置组统一使用 `mobile | pc`
  - 字段统一使用 `projectName / logoUrl / themeAssetUrl`

---

Plan complete and saved to `docs/superpowers/plans/2026-07-30-jianliao-win-admin-and-multi-end-brand-auth.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

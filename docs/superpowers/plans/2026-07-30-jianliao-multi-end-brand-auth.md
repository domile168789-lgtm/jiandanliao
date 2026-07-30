# 柬聊多端品牌登录页与后台品牌配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有代码库中的用户端与管理后台落地“移动端一套、PC 端一套”的品牌登录页和后台品牌配置能力，让 `H5 / Android / iOS / PC 网页端` 都能读取对应品牌配置并默认进入登录页。

**Architecture:** 后端新增 `branding_configs` 持久化表、管理端读写接口和用户公开读取接口；`admin-web` 与 `admin-desktop` 保持品牌配置页能力一致；`apps/web` 负责 H5 与 PC 网页端的品牌登录页与注册页切换；Android 与 iOS 通过新增公开品牌读取能力更新移动端登录页。当前仓库中没有独立的“用户 Windows 桌面端”代码目录，本计划先把同组 `pc` 配置在 `apps/web` 上落地，并把 Windows 用户端接入约束写入文档，作为下一计划承接。

**Tech Stack:** Fastify、MySQL、React + Vite、Electron Renderer、Jetpack Compose、SwiftUI、Vitest、Android Gradle、xcodebuild

---

## 文件结构

### 后端

- Create: `apps/api/src/modules/admin/branding.service.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.test.ts`
- Create: `apps/api/src/modules/public/public.routes.ts`
- Create: `apps/api/src/modules/public/public.routes.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `infra/mysql/001_init.sql`
- Modify: `tests/integration/mysql-schema.test.ts`

### 管理后台 Web

- Modify: `apps/admin-web/src/App.tsx`
- Modify: `apps/admin-web/src/components/Layout.tsx`
- Modify: `apps/admin-web/src/api/admin.ts`
- Create: `apps/admin-web/src/pages/BrandingPage.tsx`
- Modify: `apps/admin-web/src/styles.css`
- Modify: `apps/admin-web/src/smoke.test.ts`

### 管理后台 Windows

- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Create: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`

### 用户 Web（H5 + PC 网页）

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
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.test.ts`
- Create: `apps/api/src/modules/public/public.routes.test.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `infra/mysql/001_init.sql`
- Test: `tests/integration/mysql-schema.test.ts`

- [ ] **Step 1: 先写 schema 失败断言**

```ts
// tests/integration/mysql-schema.test.ts
it('contains branding_configs table for mobile and pc groups', () => {
  const schema = readFileSync('infra/mysql/001_init.sql', 'utf-8');
  expect(schema).toContain('CREATE TABLE IF NOT EXISTS branding_configs');
  expect(schema).toContain('platform_group VARCHAR(16) NOT NULL UNIQUE');
  expect(schema).toContain('project_name VARCHAR(128) NOT NULL');
  expect(schema).toContain('logo_url VARCHAR(512) NULL');
  expect(schema).toContain('theme_asset_url VARCHAR(512) NULL');
});
```

- [ ] **Step 2: 跑测试确认先失败**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts`  
Expected: FAIL，提示 `branding_configs` 表不存在。

- [ ] **Step 3: 在 MySQL 初始化脚本加入品牌配置表**

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

- [ ] **Step 4: 新增品牌配置 service**

```ts
// apps/api/src/modules/admin/branding.service.ts
export type BrandingGroup = 'mobile' | 'pc';

export class BrandingService {
  async list() {
    const db = getDb();
    const [rows] = await db.execute<any[]>(
      `SELECT platform_group AS platformGroup, project_name AS projectName,
              logo_url AS logoUrl, theme_asset_url AS themeAssetUrl,
              updated_by AS updatedBy, updated_at AS updatedAt
       FROM branding_configs
       ORDER BY platform_group ASC`
    );
    return rows;
  }

  async upsert(input: {
    platformGroup: BrandingGroup;
    projectName: string;
    logoUrl?: string | null;
    themeAssetUrl?: string | null;
    adminId: string;
  }) {
    const db = getDb();
    const id = randomUUID();
    const updatedAt = new Date();
    await db.execute(
      `INSERT INTO branding_configs
         (id, platform_group, project_name, logo_url, theme_asset_url, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         project_name = VALUES(project_name),
         logo_url = VALUES(logo_url),
         theme_asset_url = VALUES(theme_asset_url),
         updated_by = VALUES(updated_by),
         updated_at = VALUES(updated_at)`,
      [id, input.platformGroup, input.projectName, input.logoUrl ?? null, input.themeAssetUrl ?? null, input.adminId, updatedAt]
    );
    return {
      platformGroup: input.platformGroup,
      projectName: input.projectName,
      logoUrl: input.logoUrl ?? null,
      themeAssetUrl: input.themeAssetUrl ?? null,
      updatedBy: input.adminId,
      updatedAt
    };
  }
}
```

- [ ] **Step 5: 扩展管理端与公开端路由**

```ts
// apps/api/src/modules/admin/admin.routes.ts
app.get('/admin/branding', async (request, reply) => {
  if (!ensureAdmin(request, reply, adminReadRoles)) return;
  return brandingService.list();
});

app.put('/admin/branding/:platformGroup', async (request, reply) => {
  if (!ensureAdmin(request, reply, adminWriteRoles)) return;
  const { platformGroup } = request.params as { platformGroup: 'mobile' | 'pc' };
  const body = request.body as { projectName?: string; logoUrl?: string | null; themeAssetUrl?: string | null };
  if (!['mobile', 'pc'].includes(platformGroup) || !body?.projectName?.trim()) {
    return reply.code(400).send({ code: 'BAD_REQUEST' });
  }
  return brandingService.upsert({
    platformGroup,
    projectName: body.projectName.trim(),
    logoUrl: body.logoUrl ?? null,
    themeAssetUrl: body.themeAssetUrl ?? null,
    adminId: request.admin!.id
  });
});

// apps/api/src/modules/public/public.routes.ts
app.get('/public/branding', async (request, reply) => {
  const { group } = request.query as { group?: 'mobile' | 'pc' };
  if (!group || !['mobile', 'pc'].includes(group)) {
    return reply.code(400).send({ code: 'BAD_REQUEST' });
  }
  return brandingService.getByGroup(group);
});
```

- [ ] **Step 6: 补测试并注册新路由**

```ts
// apps/api/src/index.ts
await app.register(publicRoutes, { prefix: '/api' });
```

```ts
// apps/api/src/modules/public/public.routes.test.ts
it('returns branding config for requested group', async () => {
  executeMock.mockResolvedValueOnce([[{ platformGroup: 'mobile', projectName: '柬聊', logoUrl: '/logo.png', themeAssetUrl: '/theme.png' }]]);
  const app = Fastify();
  await app.register(publicRoutes, { prefix: '/api' });
  const res = await app.inject({ method: 'GET', url: '/api/public/branding?group=mobile' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({
    platformGroup: 'mobile',
    projectName: '柬聊',
    logoUrl: '/logo.png',
    themeAssetUrl: '/theme.png'
  });
});
```

- [ ] **Step 7: 运行后端与 schema 测试**

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

### Task 2: 管理后台 Web 品牌配置页

**Files:**
- Create: `apps/admin-web/src/pages/BrandingPage.tsx`
- Modify: `apps/admin-web/src/App.tsx`
- Modify: `apps/admin-web/src/components/Layout.tsx`
- Modify: `apps/admin-web/src/api/admin.ts`
- Modify: `apps/admin-web/src/styles.css`
- Test: `apps/admin-web/src/smoke.test.ts`

- [ ] **Step 1: 先补 smoke 失败断言**

```ts
// apps/admin-web/src/smoke.test.ts
it('contains branding entry and platform group form labels', () => {
  const app = readFileSync('apps/admin-web/src/App.tsx', 'utf-8');
  const page = readFileSync('apps/admin-web/src/pages/BrandingPage.tsx', 'utf-8');
  expect(app).toContain('branding');
  expect(page).toContain('移动端配置');
  expect(page).toContain('PC 端配置');
  expect(page).toContain('项目名称');
  expect(page).toContain('项目 LOGO');
  expect(page).toContain('底部背景 / 主题位');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @jianliao/admin-web test`  
Expected: FAIL，提示 `BrandingPage.tsx` 不存在或文案未命中。

- [ ] **Step 3: 扩展管理端 API 客户端**

```ts
// apps/admin-web/src/api/admin.ts
export type BrandingRow = {
  platformGroup: 'mobile' | 'pc';
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
  updatedBy?: string;
  updatedAt?: string;
};

listBranding(admin: AdminIdentity) {
  return requestJson<BrandingRow[]>('/admin/branding', { method: 'GET', admin });
},

updateBranding(admin: AdminIdentity, platformGroup: 'mobile' | 'pc', input: Omit<BrandingRow, 'platformGroup'>) {
  return requestJson<BrandingRow>(`/admin/branding/${platformGroup}`, {
    method: 'PUT',
    admin,
    body: JSON.stringify(input)
  });
}
```

- [ ] **Step 4: 新增品牌配置页面**

```tsx
// apps/admin-web/src/pages/BrandingPage.tsx
export function BrandingPage() {
  const { admin } = useAdminSession();
  const [rows, setRows] = React.useState<Record<'mobile' | 'pc', BrandingRow>>({
    mobile: { platformGroup: 'mobile', projectName: '', logoUrl: '', themeAssetUrl: '' },
    pc: { platformGroup: 'pc', projectName: '', logoUrl: '', themeAssetUrl: '' }
  });
  // useEffect 拉取 branding，form 分两组渲染
}
```

页面中每组表单至少渲染：

```tsx
<label className="field">
  <span>项目名称</span>
  <input value={rows.mobile.projectName} />
</label>
<label className="field">
  <span>项目 LOGO</span>
  <input value={rows.mobile.logoUrl ?? ''} />
</label>
<label className="field">
  <span>底部背景 / 主题位</span>
  <input value={rows.mobile.themeAssetUrl ?? ''} />
</label>
```

- [ ] **Step 5: 接入路由、侧栏入口和样式**

```tsx
// apps/admin-web/src/App.tsx
<Route path="branding" element={<BrandingPage />} />
```

```tsx
// apps/admin-web/src/components/Layout.tsx
<NavLink to="/branding">品牌配置</NavLink>
```

```css
/* apps/admin-web/src/styles.css */
.branding-grid {
  display: grid;
  gap: 16px;
}
.branding-group {
  border: 1px solid #dbe1ea;
  border-radius: 16px;
  padding: 16px;
  background: #fff;
}
```

- [ ] **Step 6: 跑 Web 后台测试**

Run: `pnpm --filter @jianliao/admin-web test`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/admin-web/src/App.tsx \
  apps/admin-web/src/components/Layout.tsx \
  apps/admin-web/src/api/admin.ts \
  apps/admin-web/src/pages/BrandingPage.tsx \
  apps/admin-web/src/styles.css \
  apps/admin-web/src/smoke.test.ts
git commit -m "feat: add web admin branding page"
```

### Task 3: 管理后台 Windows 品牌配置页对齐

**Files:**
- Create: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先写 parity 失败断言**

```ts
// apps/admin-desktop/src/renderer/smoke.test.ts
it('contains branding route and form fields', () => {
  const app = readFileSync('apps/admin-desktop/src/renderer/ui/App.tsx', 'utf-8');
  const page = readFileSync('apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx', 'utf-8');
  expect(app).toContain(\"'branding'\");
  expect(page).toContain('移动端配置');
  expect(page).toContain('PC 端配置');
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm --filter @jianliao/admin-desktop test`  
Expected: FAIL

- [ ] **Step 3: 扩展桌面端 admin API**

```ts
// apps/admin-desktop/src/renderer/api/admin.ts
export type BrandingRow = {
  platformGroup: 'mobile' | 'pc';
  projectName: string;
  logoUrl: string | null;
  themeAssetUrl: string | null;
};

listBranding(session: AdminSession) {
  return requestJson<BrandingRow[]>('/admin/branding', { method: 'GET', admin: session });
},
updateBranding(session: AdminSession, platformGroup: 'mobile' | 'pc', input: Omit<BrandingRow, 'platformGroup'>) {
  return requestJson<BrandingRow>(`/admin/branding/${platformGroup}`, {
    method: 'PUT',
    admin: session,
    body: JSON.stringify(input)
  });
}
```

- [ ] **Step 4: 新增桌面端品牌配置页面与导航**

```tsx
// apps/admin-desktop/src/renderer/ui/App.tsx
type Route = 'users' | 'reports' | 'announce' | 'audits' | 'branding';
if (route === 'branding') return <BrandingPage />;
```

```tsx
// apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx
export const BrandingPage = () => {
  return (
    <section className="card">
      <h2>品牌配置</h2>
      <h3>移动端配置</h3>
      <h3>PC 端配置</h3>
    </section>
  );
};
```

- [ ] **Step 5: 补样式并跑测试**

Run: `pnpm --filter @jianliao/admin-desktop test`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/admin-desktop/src/renderer/ui/App.tsx \
  apps/admin-desktop/src/renderer/api/admin.ts \
  apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx \
  apps/admin-desktop/src/renderer/styles.css \
  apps/admin-desktop/src/renderer/smoke.test.ts
git commit -m "feat: add desktop admin branding page"
```

### Task 4: 用户 Web 登录页重做并接品牌配置

**Files:**
- Create: `apps/web/src/api/branding.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Create: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试，确认默认登录页与品牌拉取**

```tsx
// apps/web/src/App.test.tsx
it('defaults to login page on /h5 and shows register action', () => {
  window.history.replaceState({}, '', '/h5');
  render(<App />);
  expect(screen.getByText('登录')).toBeInTheDocument();
  expect(screen.getByText('注册账号')).toBeInTheDocument();
});

it('shows pc layout on wide screen when path is not /h5', () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByText('PC 端品牌区')).toBeInTheDocument();
});
```

- [ ] **Step 2: 跑 Web 测试确认失败**

Run: `npm test -- App.test.tsx`  
Expected: FAIL

- [ ] **Step 3: 新增品牌读取客户端**

```ts
// apps/web/src/api/branding.ts
export async function fetchBranding(group: 'mobile' | 'pc') {
  const res = await fetch(`/api/public/branding?group=${group}`);
  if (!res.ok) throw new Error('branding request failed');
  return res.json() as Promise<{
    platformGroup: 'mobile' | 'pc';
    projectName: string;
    logoUrl: string | null;
    themeAssetUrl: string | null;
  }>;
}
```

- [ ] **Step 4: 重写认证页为默认登录态并拆出注册页**

```tsx
// apps/web/src/components/AuthPage.tsx
export default function AuthPage(props: {
  branding: BrandingViewModel;
  onLogin: () => void;
  onGoRegister: () => void;
}) {
  const [remember, setRemember] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  return (
    <main className="auth-shell auth-shell-mobile">
      <section className="auth-card auth-card-login">
        <BrandHeader branding={props.branding} subtitle="网页端入口" />
        <AccountField label="账号" />
        <PasswordField label="密码" showPassword={showPassword} onToggle={() => setShowPassword(v => !v)} />
        <button className="primary-button" onClick={props.onLogin}>登录</button>
        <div className="helper-row">
          <button type="button">记住密码</button>
          <button type="button">忘记密码</button>
        </div>
        <button className="secondary-button" onClick={props.onGoRegister}>注册账号</button>
        <ThemePanel branding={props.branding} />
        <button className="text-button">全球语言切换</button>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: 在 App 中按端映射品牌组，并支持 PC 网页布局**

```tsx
// apps/web/src/App.tsx
const group = path.startsWith('/h5') ? 'mobile' : 'pc';
const [branding, setBranding] = useState<BrandingViewModel>(fallbackBranding[group]);
const [authView, setAuthView] = useState<'login' | 'register'>('login');

useEffect(() => {
  fetchBranding(group).then(setBranding).catch(() => setBranding(fallbackBranding[group]));
}, [group]);

if (path.startsWith('/app')) return <DownloadPage />;
if (path.startsWith('/h5')) {
  return isLoggedIn ? <MainShell /> : authView === 'login'
    ? <AuthPage branding={branding} onLogin={() => setIsLoggedIn(true)} onGoRegister={() => setAuthView('register')} />
    : <RegisterPage branding={branding} onBackToLogin={() => setAuthView('login')} onEnter={() => setIsLoggedIn(true)} />;
}

return <DesktopAuthPage branding={branding} ... />;
```

- [ ] **Step 6: 补样式并跑测试**

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

### Task 5: Android 接入移动端品牌配置并重做登录页

**Files:**
- Create: `apps/android/app/src/main/java/com/jianliao/android/data/repo/BrandingRepository.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/data/api/JianliaoApi.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt`

- [ ] **Step 1: 写 ViewModel 与页面文案失败断言**

```kotlin
// 计划中的检查点
// LoginScreen.kt 至少包含：
// Text("登录")
// Text("注册账号")
// Text("记住密码")
// Text("忘记密码")
// Text("全球语言切换")
```

- [ ] **Step 2: 新增品牌仓库**

```kotlin
// BrandingRepository.kt
class BrandingRepository(private val api: JianliaoApi) {
    suspend fun getMobileBranding(): BrandingModel {
        return try {
            api.getBranding("mobile")
        } catch (_: Exception) {
            BrandingModel(
                platformGroup = "mobile",
                projectName = "柬聊",
                logoUrl = null,
                themeAssetUrl = null
            )
        }
    }
}
```

- [ ] **Step 3: 扩展 API 与 ServiceLocator**

```kotlin
// JianliaoApi.kt
@GET("/api/public/branding")
suspend fun getBranding(@Query("group") group: String): BrandingModel

// ServiceLocator.kt
val brandingRepository by lazy { BrandingRepository(api) }
```

- [ ] **Step 4: 在 AuthViewModel 暴露 branding 状态**

```kotlin
data class AuthUiState(
    val branding: BrandingModel = BrandingModel("mobile", "柬聊", null, null),
    ...
)

fun loadBranding() = viewModelScope.launch {
    mutate { it.copy(branding = brandingRepository.getMobileBranding()) }
}
```

- [ ] **Step 5: 重写 LoginScreen 为默认登录页**

```kotlin
// LoginScreen.kt
LaunchedEffect(Unit) { vm.loadBranding() }
Text(state.branding.projectName)
Button(onClick = { vm.login(onLoginSuccess) }) { Text("登录") }
TextButton(onClick = { mode = AuthMode.REGISTER }) { Text("注册账号") }
TextButton(onClick = { /* remember */ }) { Text("记住密码") }
TextButton(onClick = { /* forgot */ }) { Text("忘记密码") }
TextButton(onClick = { /* language */ }) { Text("全球语言切换") }
```

- [ ] **Step 6: 构建 Android**

Run: `./gradlew :app:assembleDebug`  
Expected: BUILD SUCCESSFUL

- [ ] **Step 7: Commit**

```bash
git add apps/android/app/src/main/java/com/jianliao/android/data/repo/BrandingRepository.kt \
  apps/android/app/src/main/java/com/jianliao/android/data/api/JianliaoApi.kt \
  apps/android/app/src/main/java/com/jianliao/android/core/ServiceLocator.kt \
  apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt \
  apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt
git commit -m "feat: add branded mobile login on android"
```

### Task 6: iOS 接入移动端品牌配置并重做登录页

**Files:**
- Create: `apps/ios/JianliaoIOS/Core/Branding/BrandingStore.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`
- Modify: `apps/ios/JianliaoIOS/App/RootView.swift`

- [ ] **Step 1: 先定义品牌 store**

```swift
// BrandingStore.swift
@MainActor
final class BrandingStore: ObservableObject {
  @Published var projectName: String = "柬聊"
  @Published var logoUrl: String?
  @Published var themeAssetUrl: String?

  func loadMobileBranding() async {
    guard let url = URL(string: "\(API.baseURL)/public/branding?group=mobile") else { return }
    do {
      let (data, _) = try await URLSession.shared.data(from: url)
      let branding = try JSONDecoder().decode(BrandingDTO.self, from: data)
      projectName = branding.projectName
      logoUrl = branding.logoUrl
      themeAssetUrl = branding.themeAssetUrl
    } catch {
      projectName = "柬聊"
      logoUrl = nil
      themeAssetUrl = nil
    }
  }
}
```

- [ ] **Step 2: 在登录页接入默认登录态和品牌信息**

```swift
// LoginView.swift
@StateObject private var branding = BrandingStore()
@State private var isRegister: Bool = false

.task { await branding.loadMobileBranding() }
.navigationTitle("欢迎使用\(branding.projectName)")

Button("登录") { Task { await submit() } }
Button("注册账号") {
  errorText = nil
  isRegister = true
}
Button("记住密码") { }
Button("忘记密码") { }
Button("全球语言切换") { }
```

- [ ] **Step 3: 保持注册页入口但不默认进入**

```swift
if isRegister {
  TextField("昵称(可选)", text: $nickname)
  Button("注册并进入") { Task { await submit() } }
  Button("已有账号？去登录") { isRegister = false }
}
```

- [ ] **Step 4: 运行 iOS 测试/构建**

Run:
- `cd apps/ios && xcodegen generate`
- `xcodebuild test -project JianliaoIOS.xcodeproj -scheme JianliaoIOS -destination 'platform=iOS Simulator,name=iPhone 15'`

Expected: TEST SUCCEEDED  
If current environment lacks Xcode, record blocker and do static verification only.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/JianliaoIOS/Core/Branding/BrandingStore.swift \
  apps/ios/JianliaoIOS/Features/Login/LoginView.swift \
  apps/ios/JianliaoIOS/App/RootView.swift
git commit -m "feat: add branded mobile login on ios"
```

### Task 7: 文档、演示与跨端回归

**Files:**
- Modify: `docs/local/phase1-admin-e2e.md`
- Modify: `docs/local/phase1-real-e2e-review.md`
- Test: `apps/admin-web/src/smoke.test.ts`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 更新后台与用户端演示文档**

```md
## 品牌配置演示

1. 进入后台品牌配置页
2. 修改移动端项目名称、项目 LOGO、底部背景 / 主题位
3. 打开 `/h5`，确认移动端登录页变化
4. 修改 PC 端配置
5. 打开 `/`，确认 PC 网页端登录页变化
```

- [ ] **Step 2: 加入 Windows 用户端缺口说明**

```md
## 当前仓库边界

本仓库尚未包含独立“用户 Windows 桌面端”代码目录。
本轮通过 `pc` 配置组先覆盖 `PC 网页端`，并约定后续 Windows 用户端接入同一公开接口：

- `GET /api/public/branding?group=pc`
```

- [ ] **Step 3: 运行跨端测试**

Run:
- `pnpm vitest run tests/integration/mysql-schema.test.ts`
- `pnpm --filter @jianliao/api test`
- `pnpm --filter @jianliao/admin-web test`
- `pnpm --filter @jianliao/admin-desktop test`
- `npm --prefix apps/web test -- App.test.tsx`

Expected: PASS

- [ ] **Step 4: 本地演示构建**

Run:
- `npm --prefix apps/web run build`
- `pnpm --filter @jianliao/admin-web build`
- `pnpm --filter @jianliao/admin-desktop build`
- `./apps/android/gradlew -p apps/android :app:assembleDebug`

Expected: 构建成功；如 iOS 环境不足，单独记录。

- [ ] **Step 5: Commit**

```bash
git add docs/local/phase1-admin-e2e.md \
  docs/local/phase1-real-e2e-review.md
git commit -m "docs: update branding auth demo checklist"
```

## 自检

- Spec coverage:
  - 默认登录页：Task 4 / Task 5 / Task 6 覆盖
  - 后台移动端/PC 端两组品牌配置：Task 1 / Task 2 / Task 3 覆盖
  - 项目名称 / LOGO / 底部主题位：Task 1 / Task 2 / Task 4 / Task 5 / Task 6 覆盖
  - H5 / Android / iOS / PC 网页端：Task 4 / Task 5 / Task 6 覆盖
  - Windows 用户端：当前仓库缺代码目录，Task 7 写入接入约束与后续入口

- Placeholder scan:
  - 无 `TODO` / `TBD`
  - 所有任务都有文件路径、命令和代码片段

- Type consistency:
  - 品牌配置组统一使用 `mobile | pc`
  - 字段统一使用 `projectName / logoUrl / themeAssetUrl`

---

Plan complete and saved to `docs/superpowers/plans/2026-07-30-jianliao-multi-end-brand-auth.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

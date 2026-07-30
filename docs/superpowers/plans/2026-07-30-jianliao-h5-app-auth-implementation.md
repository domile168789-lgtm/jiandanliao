# 柬聊 H5 与下载入口改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付三端“未登录默认注册”体验，并新增公网 `/h5` 用户入口与 `/app` Android+iOS 下载页，同时不影响现有后台根路径。

**Architecture:** Web 端继续沿用 `apps/web` 单工程，但通过 `window.location.pathname` 识别 `/h5` 与 `/app` 两个入口，分别渲染用户 H5 认证壳和下载页；Android 与 iOS 只改未登录认证默认态，不改登录成功后的既有流转。网关层通过 `infra/nginx/default.conf` 为 `/h5`、`/app` 和 Android 安装包静态路径新增分流，并保留 `/` 指向后台。

**Tech Stack:** React 19 + Vite + Vitest、Android Jetpack Compose、SwiftUI、Nginx

---

## 文件结构

### Web 用户端与下载页

- Modify: `apps/web/src/App.tsx`
  - 负责根据 URL 路径选择渲染 `/h5` 用户 H5 或 `/app` 下载页
- Create: `apps/web/src/components/AuthPage.tsx`
  - H5 未登录认证页，默认注册态，可切换到登录态
- Create: `apps/web/src/components/MainShell.tsx`
  - H5 已登录后的最小主界面壳
- Create: `apps/web/src/components/DownloadPage.tsx`
  - `/app` 下载页，含 Android 下载按钮与 iOS 说明
- Modify: `apps/web/src/styles.css`
  - 统一 H5 与下载页样式
- Modify: `apps/web/src/App.test.tsx`
  - 覆盖 `/h5`、`/app` 的渲染行为

### Android

- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt`
  - 登录/注册页切换为模式驱动，默认注册态
- Optionally Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt`
  - 若需要单独清理错误或字段，补充轻量方法

### iOS

- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`
  - 默认注册态，切换文案改成双向文案

### 网关与分发

- Modify: `infra/nginx/default.conf`
  - 新增 `/h5`、`/app` 与 Android 安装包静态路径
- Modify: `tests/integration/compose.test.ts`
  - 增加 Nginx 路由断言
- Optionally Create: `apps/web/public/downloads/README.md`
  - 记录 APK 放置约定

---

### Task 1: Web 入口路由骨架

**Files:**
- Create: `apps/web/src/components/MainShell.tsx`
- Create: `apps/web/src/components/DownloadPage.tsx`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 写一个失败的 Web 入口测试**

```tsx
import { describe, expect, it, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App route entry', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/h5');
    cleanup();
  });

  it('renders h5 auth entry on /h5', () => {
    window.history.replaceState({}, '', '/h5');
    render(<App />);
    expect(screen.getByText('欢迎使用柬聊')).toBeInTheDocument();
    expect(screen.getByText('网页端入口')).toBeInTheDocument();
  });

  it('renders download page on /app', () => {
    window.history.replaceState({}, '', '/app');
    render(<App />);
    expect(screen.getByText('柬聊下载')).toBeInTheDocument();
    expect(screen.getByText('下载安装 Android 版')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- App.test.tsx`  
Expected: FAIL，报找不到 `欢迎使用柬聊` 和 `柬聊下载`

- [ ] **Step 3: 创建 `MainShell.tsx`**

```tsx
import React from 'react';

export default function MainShell() {
  return (
    <main className="phone-shell">
      <header className="top-bar">
        <h1>消息</h1>
      </header>
      <section className="placeholder-list">
        <article>系统通知</article>
        <article>产品群 32</article>
        <article>阿哲</article>
      </section>
      <nav className="tab-bar">
        <button>消息</button>
        <button>通讯录</button>
        <button>发现</button>
        <button>我的</button>
      </nav>
    </main>
  );
}
```

- [ ] **Step 4: 创建 `DownloadPage.tsx`**

```tsx
import React from 'react';

export default function DownloadPage() {
  return (
    <main className="download-shell">
      <section className="download-hero">
        <h1>柬聊下载</h1>
        <p>请选择你的设备</p>
      </section>

      <section className="download-card">
        <h2>Android</h2>
        <p>可下载安装</p>
        <a className="primary-button" href="/downloads/jianliao-android.apk">
          下载安装 Android 版
        </a>
      </section>

      <section className="download-card muted">
        <h2>iPhone / iPad</h2>
        <p>安装通道准备中</p>
        <p>当前正在申请签名证书，证书就绪后将开放下载安装</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: 改造 `App.tsx` 按路径分流**

```tsx
import React from 'react';
import DownloadPage from './components/DownloadPage';
import MainShell from './components/MainShell';

function H5Placeholder() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>欢迎使用柬聊</h1>
        <p>网页端入口</p>
      </section>
    </main>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path.startsWith('/app')) {
    return <DownloadPage />;
  }

  if (path.startsWith('/h5')) {
    return <H5Placeholder />;
  }

  return <MainShell />;
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `npm test -- App.test.tsx`  
Expected: PASS，`/h5` 和 `/app` 两个 case 通过

- [ ] **Step 7: 提交**

```bash
git add apps/web/src/App.tsx apps/web/src/components/MainShell.tsx apps/web/src/components/DownloadPage.tsx apps/web/src/App.test.tsx
git commit -m "feat: add web entry routing skeleton"
```

### Task 2: Web 认证页默认注册

**Files:**
- Create: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 增加失败测试，要求 `/h5` 默认注册**

```tsx
it('defaults to register mode on /h5 and allows switching to login', async () => {
  window.history.replaceState({}, '', '/h5');
  render(<App />);

  expect(screen.getByRole('button', { name: '注册并进入' })).toBeInTheDocument();
  expect(screen.getByText('已有账号？去登录')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '已有账号？去登录' }));

  expect(screen.getByRole('button', { name: '密码登录' })).toBeInTheDocument();
  expect(screen.getByText('新用户？去注册')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test -- App.test.tsx`  
Expected: FAIL，找不到 `注册并进入` 和切换按钮

- [ ] **Step 3: 实现 `AuthPage.tsx`**

```tsx
import React, { useMemo, useState } from 'react';

type AuthMode = 'register' | 'login';

type AuthPageProps = {
  onEnter: () => void;
};

export default function AuthPage({ onEnter }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('register');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const title = useMemo(() => '欢迎使用柬聊', []);
  const isRegister = mode === 'register';

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>{title}</h1>
        <p>网页端入口</p>

        <label>
          手机号
          <input value={phone} onChange={e => setPhone(e.target.value)} />
        </label>

        <label>
          密码
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>

        {isRegister ? (
          <label>
            昵称
            <input value={nickname} onChange={e => setNickname(e.target.value)} />
          </label>
        ) : null}

        <button className="primary-button" onClick={onEnter}>
          {isRegister ? '注册并进入' : '密码登录'}
        </button>

        <button
          className="text-button"
          onClick={() => setMode(isRegister ? 'login' : 'register')}
        >
          {isRegister ? '已有账号？去登录' : '新用户？去注册'}
        </button>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 在 `App.tsx` 中接入轻量登录态**

```tsx
import React, { useState } from 'react';
import AuthPage from './components/AuthPage';
import DownloadPage from './components/DownloadPage';
import MainShell from './components/MainShell';

export default function App() {
  const path = window.location.pathname;
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (path.startsWith('/app')) {
    return <DownloadPage />;
  }

  if (path.startsWith('/h5')) {
    return isLoggedIn ? <MainShell /> : <AuthPage onEnter={() => setIsLoggedIn(true)} />;
  }

  return <MainShell />;
}
```

- [ ] **Step 5: 运行 Web 测试，确认通过**

Run: `npm test -- App.test.tsx`  
Expected: PASS，`/h5` 默认注册、可切换登录、`/app` 不受影响

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/components/AuthPage.tsx apps/web/src/App.tsx apps/web/src/App.test.tsx
git commit -m "feat: default h5 auth entry to register"
```

### Task 3: 下载页样式与 Android 安装包容错

**Files:**
- Modify: `apps/web/src/components/DownloadPage.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 添加下载页容错测试**

```tsx
it('shows android download and iOS notice on /app', () => {
  window.history.replaceState({}, '', '/app');
  render(<App />);

  expect(screen.getByRole('link', { name: '下载安装 Android 版' })).toHaveAttribute(
    'href',
    '/downloads/jianliao-android.apk'
  );
  expect(screen.getByText('当前正在申请签名证书，证书就绪后将开放下载安装')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认当前只部分通过或样式未覆盖**

Run: `npm test -- App.test.tsx`  
Expected: 如果链接已经存在，测试通过；继续执行样式实现

- [ ] **Step 3: 增强 `DownloadPage.tsx` 展示构建信息与安装提示**

```tsx
import React from 'react';

const androidMeta = 'Android 包：阶段 1 演示版';

export default function DownloadPage() {
  return (
    <main className="download-shell">
      <section className="download-hero">
        <h1>柬聊下载</h1>
        <p>请选择你的设备</p>
      </section>

      <section className="download-card">
        <h2>Android</h2>
        <p>可下载安装</p>
        <p className="download-meta">{androidMeta}</p>
        <a className="primary-button" href="/downloads/jianliao-android.apk" download>
          下载安装 Android 版
        </a>
        <p className="download-hint">如浏览器提示风险，请按设备提示继续安装。</p>
      </section>

      <section className="download-card muted">
        <h2>iPhone / iPad</h2>
        <p>安装通道准备中</p>
        <p>当前正在申请签名证书，证书就绪后将开放下载安装</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 在 `styles.css` 中补充 H5 与下载页样式**

```css
.auth-shell,
.download-shell {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: 32px 16px;
  background: linear-gradient(180deg, #f4f7fb 0%, #eef2f7 100%);
}

.auth-card,
.download-card,
.download-hero {
  width: min(430px, 100%);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}

.auth-card {
  padding: 24px;
  display: grid;
  gap: 12px;
}

.auth-card input {
  width: 100%;
  margin-top: 6px;
  padding: 12px;
  border: 1px solid #dbe1ea;
  border-radius: 12px;
  box-sizing: border-box;
}

.primary-button,
.text-button {
  width: 100%;
  border: 0;
  border-radius: 12px;
  padding: 14px 16px;
  text-align: center;
  cursor: pointer;
}

.primary-button {
  display: inline-block;
  background: #0f172a;
  color: #fff;
  text-decoration: none;
}

.text-button {
  background: transparent;
  color: #2563eb;
}

.download-shell {
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.download-hero,
.download-card {
  padding: 24px;
}

.download-card.muted {
  background: #f8fafc;
}

.download-meta,
.download-hint {
  color: #64748b;
  font-size: 14px;
}
```

- [ ] **Step 5: 运行 Web 测试**

Run: `npm test -- App.test.tsx`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/components/DownloadPage.tsx apps/web/src/styles.css apps/web/src/App.test.tsx
git commit -m "feat: style app download page"
```

### Task 4: Android 认证页默认注册

**Files:**
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt`
- Optionally Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt`

- [ ] **Step 1: 将 `LoginScreen.kt` 改为模式切换**

```kotlin
enum class AuthMode {
    REGISTER,
    LOGIN
}
```

```kotlin
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    vm: AuthViewModel = viewModel()
) {
    val state by vm.state.collectAsState()
    var mode by remember { mutableStateOf(AuthMode.REGISTER) }
    val isRegister = mode == AuthMode.REGISTER

    Scaffold(
        topBar = { TopAppBar(title = { Text("欢迎使用柬聊") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = state.phone,
                onValueChange = vm::updatePhone,
                label = { Text("手机号") },
                singleLine = true
            )

            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = state.password,
                onValueChange = vm::updatePassword,
                label = { Text("密码") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation()
            )

            if (isRegister) {
                OutlinedTextField(
                    modifier = Modifier.fillMaxWidth(),
                    value = state.nickname,
                    onValueChange = vm::updateNickname,
                    label = { Text("昵称（可选）") },
                    singleLine = true
                )
            }

            state.error?.let { Text("错误：$it") }

            if (state.loading) {
                CircularProgressIndicator()
            }

            Button(
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(12.dp),
                onClick = {
                    if (isRegister) vm.register(onLoginSuccess) else vm.login(onLoginSuccess)
                }
            ) {
                Text(if (isRegister) "注册并进入" else "密码登录")
            }

            TextButton(onClick = {
                mode = if (isRegister) AuthMode.LOGIN else AuthMode.REGISTER
            }) {
                Text(if (isRegister) "已有账号？去登录" else "新用户？去注册")
            }
        }
    }
}
```

- [ ] **Step 2: 如错误态切换后需要清理，补充 `AuthViewModel` 方法**

```kotlin
fun clearError() {
    _state.update { it.copy(error = null) }
}
```

- [ ] **Step 3: 切换模式时调用清理**

```kotlin
TextButton(onClick = {
    vm.clearError()
    mode = if (isRegister) AuthMode.LOGIN else AuthMode.REGISTER
}) {
    Text(if (isRegister) "已有账号？去登录" else "新用户？去注册")
}
```

- [ ] **Step 4: 运行 Android 编译验证**

Run: `./gradlew :app:assembleDebug`  
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: 提交**

```bash
git add apps/android/app/src/main/java/com/jianliao/android/ui/screens/LoginScreen.kt apps/android/app/src/main/java/com/jianliao/android/ui/vm/AuthViewModel.kt
git commit -m "feat: default android auth screen to register"
```

### Task 5: iOS 认证页默认注册

**Files:**
- Modify: `apps/ios/JianliaoIOS/Features/Login/LoginView.swift`

- [ ] **Step 1: 修改默认模式与切换文案**

```swift
@State private var isRegister: Bool = true
```

```swift
Section {
  Button(isRegister ? "注册并进入" : "密码登录") {
    Task { await submit() }
  }
  .disabled(isLoading)

  Button(isRegister ? "已有账号？切换到登录" : "新用户？切换到注册") {
    errorText = nil
    isRegister.toggle()
  }
}
```

- [ ] **Step 2: 调整标题文案**

```swift
.navigationTitle("欢迎使用柬聊")
```

- [ ] **Step 3: 运行 iOS 测试或最小构建检查**

Run: `xcodebuild test -project apps/ios/JianliaoIOS.xcodeproj -scheme JianliaoIOS -destination 'platform=iOS Simulator,name=iPhone 15'`  
Expected: TEST SUCCEEDED  
If project file is generated from `project.yml`, first run: `cd apps/ios && xcodegen generate`

- [ ] **Step 4: 提交**

```bash
git add apps/ios/JianliaoIOS/Features/Login/LoginView.swift
git commit -m "feat: default ios auth screen to register"
```

### Task 6: Nginx 路由与 Android 下载路径

**Files:**
- Modify: `infra/nginx/default.conf`
- Modify: `tests/integration/compose.test.ts`
- Optionally Create: `apps/web/public/downloads/.gitkeep`

- [ ] **Step 1: 为 `/h5`、`/app` 与 `/downloads/` 写失败断言**

```ts
it('routes h5 app and downloads paths to the intended upstreams', () => {
  expect(nginxConfig).toContain('location /h5');
  expect(nginxConfig).toContain('location /app');
  expect(nginxConfig).toContain('location /downloads/');
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm vitest run tests/integration/compose.test.ts`  
Expected: FAIL，提示新 location 不存在

- [ ] **Step 3: 修改 `infra/nginx/default.conf`**

```nginx
server {
  listen 80;

  location /api/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Authorization $http_authorization;
    proxy_pass http://api:3001;
  }

  location /socket.io/ {
    proxy_pass http://ws:3002/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }

  location /uploads/ {
    proxy_pass http://minio:9000/uploads/;
  }

  location /downloads/ {
    proxy_pass http://user-web:80/downloads/;
  }

  location /h5 {
    proxy_pass http://user-web:80/h5;
  }

  location /app {
    proxy_pass http://user-web:80/app;
  }

  location = /health {
    proxy_pass http://ws:3002/health;
  }

  location /healthz {
    add_header Content-Type text/plain;
    return 200 "ok";
  }

  location / {
    proxy_pass http://admin-web:80;
  }
}
```

- [ ] **Step 4: 在 `compose.test.ts` 中补齐断言**

```ts
expect(nginxConfig).toContain('location /h5');
expect(nginxConfig).toContain('proxy_pass http://user-web:80/h5;');
expect(nginxConfig).toContain('location /app');
expect(nginxConfig).toContain('proxy_pass http://user-web:80/app;');
expect(nginxConfig).toContain('location /downloads/');
expect(nginxConfig).toContain('proxy_pass http://user-web:80/downloads/;');
```

- [ ] **Step 5: 运行测试**

Run: `pnpm vitest run tests/integration/compose.test.ts`  
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add infra/nginx/default.conf tests/integration/compose.test.ts apps/web/public/downloads/.gitkeep
git commit -m "feat: route h5 and app entries through nginx"
```

### Task 7: Web 最终回归与公网手工验证

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Test: `tests/integration/compose.test.ts`

- [ ] **Step 1: 补一个已登录回退主界面的 Web 测试**

```tsx
it('enters main shell after auth action on /h5', async () => {
  window.history.replaceState({}, '', '/h5');
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: '注册并进入' }));

  expect(screen.getAllByText('消息').length).toBeGreaterThan(0);
  expect(screen.getByText('通讯录')).toBeInTheDocument();
});
```

- [ ] **Step 2: 跑完整 Web 与集成测试**

Run: `npm test -- App.test.tsx && pnpm vitest run tests/integration/compose.test.ts`  
Expected: PASS

- [ ] **Step 3: 构建 Web**

Run: `npm run build`  
Expected: `dist/` 生成成功

- [ ] **Step 4: 公网回归**

Run:

```bash
python3 - <<'PY'
import urllib.request
for url in [
    'http://45.202.0.14/',
    'http://45.202.0.14/h5',
    'http://45.202.0.14/app',
]:
    with urllib.request.urlopen(url, timeout=20) as r:
        body = r.read(400).decode('utf-8', 'ignore')
        print(url, body[:160].replace('\n', ' '))
PY
```

Expected:
- `/` 返回后台页 HTML
- `/h5` 返回用户 H5 HTML
- `/app` 返回下载页 HTML

- [ ] **Step 5: Android 下载回归**

Run:

```bash
python3 - <<'PY'
import urllib.request
url = 'http://45.202.0.14/downloads/jianliao-android.apk'
with urllib.request.urlopen(url, timeout=20) as r:
    print(r.status, r.getheader('Content-Type'), r.getheader('Content-Length'))
PY
```

Expected: `200`，返回安装包内容头

- [ ] **Step 6: 提交**

```bash
git add apps/web/src/App.test.tsx
git commit -m "test: cover public h5 and app entry flow"
```

---

## 自检

### Spec 覆盖

- 三端未登录默认注册：Task 2、Task 4、Task 5
- `/h5` 用户入口：Task 1、Task 2、Task 7
- `/app` 下载页：Task 1、Task 3、Task 7
- iOS 仅说明：Task 3
- Nginx 路径分流：Task 6
- 后台根路径不回归：Task 7

### 占位检查

- 无 `TODO` / `TBD`
- 所有修改步骤给出了具体文件和代码
- 所有测试步骤给出了明确命令和预期

### 一致性检查

- Web 默认注册态始终通过 `AuthPage` 的初始 `mode = 'register'`
- Android 默认注册态通过 `AuthMode.REGISTER`
- iOS 默认注册态通过 `isRegister = true`
- `/` 根路径始终保留给后台，`/h5` 和 `/app` 单独分流

# 柬聊马年主题登录页重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 H5 / 前端登录页重做为马年新春主题页面，采用压淡的红金白马背景、顶部居中的柬聊品牌、中部极简登录区和底部辅助区。

**Architecture:** 保持现有登录逻辑和页面边界不变，只重构 `AuthPage` 的页面结构和 `styles.css` 的视觉系统，让背景图承担氛围层、登录区承担前景层。注册页本轮不是主目标，只做必要的一致性验证，不扩散到聊天页、活动页或后端协议层。

**Tech Stack:** React、TypeScript、Vite、Vitest、CSS

---

## 文件结构

- Modify: `apps/web/src/components/AuthPage.tsx`
  - 登录页结构改为顶部品牌区、中部登录区、底部辅助区
- Modify: `apps/web/src/styles.css`
  - 登录页背景、遮罩、品牌区、输入框、按钮、辅助区样式
- Modify: `apps/web/src/App.test.tsx`
  - 增加马年主题登录页关键结构断言
- Optional Modify: `apps/web/src/components/RegisterPage.tsx`
  - 如需维持最小样式一致性，仅做小范围兼容调整，不改成海报式页面

---

### Task 1: 重构登录页结构为三段式

**Files:**
- Modify: `apps/web/src/components/AuthPage.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试，确认登录页结构只保留用户确认的元素**

```tsx
it('renders horse-theme auth structure with minimal sections', async () => {
  render(<App />);

  expect(await screen.findByText('柬聊移动品牌')).toBeInTheDocument();
  expect(screen.getByLabelText('账号')).toBeInTheDocument();
  expect(screen.getByLabelText('密码')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '记住密码' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '全球语言切换' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 跑 web 测试确认先失败**

Run: `pnpm --filter @jianliao/web test`
Expected: FAIL，原因是当前登录页还有表单标题说明或结构与目标不一致

- [ ] **Step 3: 把 `AuthPage.tsx` 改成顶部品牌区**

用以下结构替换现有登录页顶部部分：

```tsx
<header className="horse-brand-zone">
  <div className="horse-brand-mark" aria-hidden="true">
    {brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <span>柬</span>}
  </div>
  <h1>{brand.projectName}</h1>
</header>
```

- [ ] **Step 4: 把中部登录区精简为账号、密码、登录按钮**

```tsx
<section className="horse-form-zone">
  <label className="horse-field">
    <span>账号</span>
    <input
      value={account}
      onChange={(e) => setAccount(e.target.value)}
      placeholder="请输入账号"
      autoComplete="username"
    />
  </label>

  <label className="horse-field">
    <span>密码</span>
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="请输入密码"
      autoComplete="current-password"
    />
  </label>

  <button className="horse-login-button" onClick={onEnter}>登录</button>
</section>
```

- [ ] **Step 5: 把底部辅助区收敛为三个入口**

```tsx
<footer className="horse-footer-zone">
  <button className="horse-footer-link" type="button">记住密码</button>
  <button className="horse-footer-link" type="button" onClick={onSwitchToRegister}>注册账号</button>
  <button className="horse-footer-link" type="button">全球语言切换</button>
</footer>
```

- [ ] **Step 6: 删除不再需要的登录页说明文案**

确保以下内容不再出现在 `AuthPage.tsx`：

```tsx
欢迎回来
账号密码登录
使用你的账号登录柬聊，继续安全连接与即时沟通。
忘记密码
```

- [ ] **Step 7: 复跑 web 测试**

Run: `pnpm --filter @jianliao/web test`
Expected: PASS 或仅剩样式/文案相关断言需要后续处理

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/AuthPage.tsx apps/web/src/App.test.tsx
git commit -m "feat: restructure auth page for horse theme"
```

### Task 2: 实现马年主题背景与前景层级

**Files:**
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 先移除旧的登录页重点样式**

从 `styles.css` 中删除或停用这类旧结构样式：

```css
.brand-card
.brand-card-dark
.brand-card-copy
.auth-form-head
.auth-form-grid
.auth-field
```

- [ ] **Step 2: 为登录页背景建立马年主题基础层**

新增这组样式：

```css
.auth-shell.horse-theme {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(112, 16, 18, 0.18), rgba(53, 8, 12, 0.34)),
    linear-gradient(180deg, #7f1117 0%, #a2161f 40%, #7d1118 100%);
}

.auth-shell.horse-theme::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--horse-theme-image);
  background-size: cover;
  background-position: center;
  opacity: 0.26;
  transform: scale(1.04);
}

.auth-shell.horse-theme::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(125, 17, 24, 0.24), rgba(50, 9, 11, 0.38)),
    radial-gradient(circle at top, rgba(255, 214, 153, 0.12), transparent 28%);
}
```

- [ ] **Step 3: 让登录卡片退化为透明前景层**

```css
.auth-shell.horse-theme .auth-card {
  position: relative;
  z-index: 1;
  width: min(410px, 100%);
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 24px 20px;
}
```

- [ ] **Step 4: 定义顶部品牌区样式**

```css
.horse-brand-zone {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding-top: 8px;
}

.horse-brand-mark {
  width: 66px;
  height: 66px;
  border-radius: 20px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(255, 248, 236, 0.16);
  border: 1px solid rgba(255, 232, 196, 0.22);
  backdrop-filter: blur(8px);
}

.horse-brand-zone h1 {
  margin: 0;
  color: #fff7ea;
  font-size: 30px;
  letter-spacing: 0.12em;
  font-weight: 700;
  text-shadow: 0 3px 16px rgba(0, 0, 0, 0.18);
}
```

- [ ] **Step 5: 定义中部登录区样式**

```css
.horse-form-zone {
  margin-top: 72px;
  display: grid;
  gap: 14px;
}

.horse-field {
  display: grid;
  gap: 8px;
}

.horse-field span {
  color: rgba(255, 244, 227, 0.92);
  font-size: 13px;
}

.horse-field input {
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(255, 227, 180, 0.22);
  background: rgba(255, 251, 244, 0.18);
  color: #fff8ed;
  backdrop-filter: blur(10px);
}
```

- [ ] **Step 6: 定义按钮和底部辅助区样式**

```css
.horse-login-button {
  min-height: 50px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #f2d29b 0%, #c8944d 100%);
  color: #fffdf8;
  font-weight: 700;
  box-shadow: 0 16px 32px rgba(92, 35, 10, 0.18);
}

.horse-footer-zone {
  margin-top: 28px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.horse-footer-link {
  border: 0;
  background: transparent;
  color: rgba(255, 238, 214, 0.82);
}
```

- [ ] **Step 7: 让输入区成为真正前景**

补焦点态和 placeholder：

```css
.horse-field input::placeholder {
  color: rgba(255, 241, 219, 0.66);
}

.horse-field input:focus {
  outline: none;
  border-color: rgba(255, 224, 168, 0.48);
  box-shadow: 0 0 0 4px rgba(255, 216, 137, 0.12);
}
```

- [ ] **Step 8: 跑构建前测试**

Run: `pnpm --filter @jianliao/web test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/styles.css
git commit -m "style: add horse theme auth background and form layers"
```

### Task 3: 把背景图接入登录页并删除多余元素

**Files:**
- Modify: `apps/web/src/components/AuthPage.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试，确认不再出现旧元素**

```tsx
it('removes extra auth text and keeps only approved footer actions', async () => {
  render(<App />);
  await screen.findByText('柬聊移动品牌');

  expect(screen.queryByText('VIP')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '忘记密码' })).not.toBeInTheDocument();
  expect(screen.queryByText('欢迎回来')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 把背景图变量挂到登录页 root**

在 `AuthPage.tsx` 中给最外层加：

```tsx
const horseTheme = brand.holidayThemeAssetUrl || brand.themeAssetUrl || '';

<main
  className={`auth-shell horse-theme ${isPc ? 'is-pc' : 'is-mobile'}`}
  style={{ ['--horse-theme-image' as any]: horseTheme ? `url(${horseTheme})` : 'none' }}
>
```

- [ ] **Step 3: 清除旧按钮和旧辅助区**

确保以下旧结构不再存在：

```tsx
helper-row
text-button
primary-button
language-button
helper-link
helper-toggle
```

改为只使用：

```tsx
horse-login-button
horse-footer-zone
horse-footer-link
```

- [ ] **Step 4: 让 Logo / 名称在顶部居中且无多余说明**

确保顶部区域最终只有：

```tsx
horse-brand-mark
brand.projectName
```

- [ ] **Step 5: 复跑 web 测试**

Run: `pnpm --filter @jianliao/web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/AuthPage.tsx apps/web/src/App.test.tsx
git commit -m "feat: wire horse theme image into auth page"
```

### Task 4: 完整验证与预览刷新

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 补最终断言，确认底部只剩三个辅助入口**

```tsx
expect(screen.getByRole('button', { name: '记住密码' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '注册账号' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: '全球语言切换' })).toBeInTheDocument();
expect(screen.queryByRole('button', { name: '忘记密码' })).not.toBeInTheDocument();
```

- [ ] **Step 2: 跑完整 web 验证**

Run: `pnpm --filter @jianliao/web test && pnpm --filter @jianliao/web build`
Expected: 全部 PASS

- [ ] **Step 3: 启动或刷新 H5 预览**

Run: `pnpm --filter @jianliao/web dev -- --host 0.0.0.0 --port 5173`
Expected: 输出 `http://localhost:5173/`

- [ ] **Step 4: 手动检查页面**

检查项：

```txt
1. 背景是压淡后的红金白马主题图
2. 页面无 VIP
3. 顶部只有柬聊 Logo / 名称
4. 中部只有账号、密码、登录按钮
5. 底部只有记住密码、注册账号、语言切换
6. 背景图能看出年味，但不抢登录区
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.test.tsx apps/web/src/components/AuthPage.tsx apps/web/src/styles.css
git commit -m "test: cover horse theme auth layout"
```

## 自检

### Spec 覆盖检查

- 压淡背景图：Task 2、Task 3
- 删除 VIP：Task 3、Task 4
- 顶部只保留柬聊品牌：Task 1、Task 3
- 中部只保留账号、密码、登录按钮：Task 1
- 底部只保留记住密码、注册账号、语言切换：Task 1、Task 4
- 不扩展到更多页面：任务边界已限制在 `AuthPage`、`styles.css`、`App.test.tsx`

无缺口。

### 占位检查

- 无 `TODO`
- 无 `TBD`
- 每个任务都有明确文件、代码片段、命令和预期结果

### 类型一致性检查

- 登录页 root 统一使用 `horse-theme`
- 顶部统一使用 `horse-brand-zone`
- 中部统一使用 `horse-form-zone`
- 底部统一使用 `horse-footer-zone`


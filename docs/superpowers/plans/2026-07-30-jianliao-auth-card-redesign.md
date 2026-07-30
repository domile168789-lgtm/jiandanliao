# 柬聊登录注册页品牌卡片重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 H5 / 前端登录注册页改成“浅色页面 + 深色品牌卡片”方案，把 `手机号` 全部替换为 `账号`，并让视觉气质与管理后台统一。

**Architecture:** 保留现有 `AuthPage` / `RegisterPage` 页面边界，不改后端协议和页面切换逻辑，只重做顶部品牌卡片、表单字段文案和样式系统。样式改动集中在 `apps/web/src/styles.css`，页面逻辑只做最小必要调整，避免把这次重设计扩散到聊天壳、下载页或品牌配置接口层。

**Tech Stack:** React、TypeScript、Vite、Vitest、CSS

---

## 文件结构

- Modify: `apps/web/src/components/AuthPage.tsx`
  - 登录页 UI，从 `phone` 表达改为 `account`，去掉重型头部，换成小型品牌卡片
- Modify: `apps/web/src/components/RegisterPage.tsx`
  - 注册页 UI，与登录页对齐品牌卡片和账号体系
- Modify: `apps/web/src/styles.css`
  - 重构登录/注册相关头部、表单、品牌卡片样式
- Modify: `apps/web/src/App.test.tsx`
  - 补登录页和注册页的关键文案断言

---

### Task 1: 重写登录页文案与品牌卡片结构

**Files:**
- Modify: `apps/web/src/components/AuthPage.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试，验证登录页出现“账号”而不是“手机号”**

```tsx
it('renders account field instead of phone field on login page', async () => {
  render(<App />);
  expect(await screen.findByText('账号')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('请输入账号')).toBeInTheDocument();
  expect(screen.queryByText('手机号')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 跑 web 测试确认先失败**

Run: `pnpm test -- --runInBand`
Expected: FAIL，测试里会找不到 `账号` 或仍能找到 `手机号`

- [ ] **Step 3: 把登录页字段名和 state 从 phone 改成 account**

```tsx
const [account, setAccount] = useState('');
const [password, setPassword] = useState('');
```

并把输入框改成：

```tsx
<label>
  账号
  <input
    value={account}
    onChange={(e) => setAccount(e.target.value)}
    placeholder="请输入账号"
  />
</label>
```

- [ ] **Step 4: 删除当前重型头部，替换为小型品牌卡片**

把当前 `brand-panel + auth-hero` 两段结构替换为：

```tsx
<div className="brand-card brand-card-dark">
  <div className="brand-mark" aria-hidden="true">
    {brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <span>{isPc ? 'PC' : 'JL'}</span>}
  </div>
  <div className="brand-card-copy">
    <strong>{brand.projectName}</strong>
    <span>{isPc ? '安全连接 · 即时沟通' : '移动连接 · 即时沟通'}</span>
  </div>
</div>
```

- [ ] **Step 5: 保留现有辅助操作，只调整上下层级**

保留以下结构：

```tsx
<button className="primary-button" onClick={onEnter}>登录</button>
<div className="helper-row">...</div>
<button className="text-button" type="button" onClick={onSwitchToRegister}>注册账号</button>
<button className="language-button" type="button">全球语言切换</button>
```

- [ ] **Step 6: 复跑登录页相关测试**

Run: `pnpm test -- --runInBand`
Expected: PASS，登录页测试通过

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/AuthPage.tsx apps/web/src/App.test.tsx
git commit -m "feat: redesign auth page brand card and account field"
```

### Task 2: 重写注册页文案与品牌卡片结构

**Files:**
- Modify: `apps/web/src/components/RegisterPage.tsx`
- Test: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 先写失败测试，验证注册页使用“账号”字段**

```tsx
it('renders account field on register page', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: '注册账号' }));
  expect(await screen.findByText('账号')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('请输入账号')).toBeInTheDocument();
  expect(screen.queryByText('手机号')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 跑测试确认先失败**

Run: `pnpm test -- --runInBand`
Expected: FAIL，注册页仍然显示 `手机号`

- [ ] **Step 3: 把注册页字段从 phone 改成 account**

```tsx
const [account, setAccount] = useState('');
const [password, setPassword] = useState('');
const [nickname, setNickname] = useState('');
```

替换输入框：

```tsx
<label>
  账号
  <input
    value={account}
    onChange={(e) => setAccount(e.target.value)}
    placeholder="请输入账号"
  />
</label>
```

- [ ] **Step 4: 注册页与登录页共用同一品牌卡片结构**

把当前 `brand-panel + auth-hero` 替换为：

```tsx
<div className="brand-card brand-card-dark">
  <div className="brand-mark" aria-hidden="true">
    {brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : <span>{isPc ? 'PC' : 'JL'}</span>}
  </div>
  <div className="brand-card-copy">
    <strong>{brand.projectName}</strong>
    <span>{isPc ? '创建账号 · 安全接入' : '创建账号 · 快速开始'}</span>
  </div>
</div>
```

- [ ] **Step 5: 保持注册页字段顺序不变**

最终结构：

```tsx
账号
密码
昵称
注册并进入
已有账号？去登录
全球语言切换
```

- [ ] **Step 6: 复跑测试**

Run: `pnpm test -- --runInBand`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/RegisterPage.tsx apps/web/src/App.test.tsx
git commit -m "feat: redesign register page with account-based form"
```

### Task 3: 重构登录注册页样式系统

**Files:**
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 先删除不再需要的大块头部样式**

删除或停用以下样式块：

```css
.brand-panel
.auth-eyebrow
.auth-copy
.auth-hero
.auth-hero::after
.auth-hero-copy
.auth-hero-copy strong
.auth-hero-copy p
.auth-hero-label
```

- [ ] **Step 2: 新增品牌卡片样式**

```css
.brand-card {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 18px;
}

.brand-card-dark {
  background: linear-gradient(135deg, #0b1328 0%, #111c3f 100%);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
}

.brand-card-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
  color: #f8fafc;
}

.brand-card-copy strong {
  font-size: 22px;
  line-height: 1.1;
}

.brand-card-copy span {
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
}
```

- [ ] **Step 3: 调整 brand mark，让 logo 更精致**

```css
.brand-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%);
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.04em;
}
```

- [ ] **Step 4: 调整 auth-shell 和 auth-card，使页面更轻**

```css
.auth-shell {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px 16px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%);
}

.auth-card {
  width: min(430px, 100%);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
  padding: 24px;
  display: grid;
  gap: 16px;
}
```

- [ ] **Step 5: 调整按钮和辅助区颜色，靠拢管理后台**

```css
.primary-button {
  background: #0b1328;
  color: #fff;
}

.text-button,
.helper-link,
.language-button,
.helper-toggle.is-active {
  color: #2563eb;
}
```

- [ ] **Step 6: 复跑 web 测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: 跑生产构建**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/styles.css
git commit -m "style: refresh auth pages with mixed light-dark brand card"
```

### Task 4: 统一回归与预览确认

**Files:**
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/components/AuthPage.tsx`
- Modify: `apps/web/src/components/RegisterPage.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 补最终断言，确保登录页没有“手机号”**

```tsx
expect(screen.queryByText('手机号')).not.toBeInTheDocument();
expect(screen.getByText('账号')).toBeInTheDocument();
```

- [ ] **Step 2: 补最终断言，确保注册页没有大主题区残留**

```tsx
expect(screen.queryByText('欢迎加入')).not.toBeInTheDocument();
expect(screen.queryByText('欢迎回到移动端')).not.toBeInTheDocument();
```

- [ ] **Step 3: 跑完整 web 验证**

Run: `pnpm test && pnpm build`
Expected: 全部 PASS

- [ ] **Step 4: 启动或刷新 H5 预览**

Run: `pnpm dev -- --host 0.0.0.0 --port 5173`
Expected: 输出 `http://localhost:5173/`

- [ ] **Step 5: 手动检查页面要点**

检查项：

```txt
1. 顶部只有小型品牌卡片，没有大主题图
2. 登录字段为“账号 / 密码”
3. 注册字段为“账号 / 密码 / 昵称”
4. 主按钮为深色，整体背景为浅色
5. 链接蓝色风格与管理后台同源
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/App.test.tsx apps/web/src/components/AuthPage.tsx apps/web/src/components/RegisterPage.tsx apps/web/src/styles.css
git commit -m "test: cover auth card redesign"
```

## 自检

### Spec 覆盖检查

- `手机号改账号`：Task 1、Task 2
- `LOGO 图片和名称重新设计`：Task 1、Task 2、Task 3
- `深浅混合品牌卡片`：Task 3
- `参考管理后台颜色`：Task 3
- `保留其他功能`：Task 1、Task 2、Task 4

无遗漏。

### 占位检查

- 无 `TODO`
- 无 `TBD`
- 每个任务都给了代码片段、命令和预期结果

### 类型一致性检查

- 登录页和注册页统一使用 `account`
- 品牌卡片统一使用 `brand-card / brand-card-dark / brand-card-copy`
- 不再混用 `phone` 与 `account`


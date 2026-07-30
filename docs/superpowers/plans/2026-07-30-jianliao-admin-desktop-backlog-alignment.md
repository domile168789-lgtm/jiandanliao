# 柬聊 Admin Desktop 后台补齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于当前仓库已有的 `apps/admin-desktop` 页面，开放已隐藏的后台入口，补齐活动创建、公告反馈与数据来源提示，并完成测试与构建校验。

**Architecture:** 保持现有 Electron + React 单页后台结构不变，只在现有页面与 API 客户端上做增量补齐。导航层开放已存在的群组、群主、财务、代理、活动页面；活动中心对接现有 `/api/admin/activity-campaigns` 创建接口；公告、品牌、群组、群主、财务、代理页增加“真实数据 / 推导数据 / 演示数据”提示，降低误导风险。

**Tech Stack:** React 19、TypeScript、Vite、Electron、Vitest

---

## 文件结构

- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/AnnouncementNewPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupOwnersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/FinanceReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ProxyManagementPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`

### Task 1: 开放桌面后台已存在但被隐藏的入口

**Files:**
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先补导航断言**

```ts
it('exposes all existing desktop admin routes in navigation', () => {
  const app = readFileSync(new URL('./ui/App.tsx', import.meta.url), 'utf-8');
  expect(app).toContain("'groups'");
  expect(app).toContain("'owners'");
  expect(app).toContain("'finance'");
  expect(app).toContain("'agents'");
  expect(app).toContain("'activity'");
});
```

- [ ] **Step 2: 跑测试确认当前实现不完整**

Run: `pnpm --filter @jianliao/admin-desktop test`
Expected: FAIL，导航断言不满足

- [ ] **Step 3: 调整桌面端导航过滤**

```ts
const productionRoutes: Route[] = [
  'dashboard',
  'users',
  'groups',
  'owners',
  'finance',
  'agents',
  'activity',
  'reports',
  'announce',
  'audits',
  'branding'
];
```

- [ ] **Step 4: 重新运行桌面端测试**

Run: `pnpm --filter @jianliao/admin-desktop test`
Expected: PASS 或只剩后续任务相关失败

### Task 2: 活动中心补活动创建能力

**Files:**
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先补活动创建接线断言**

```ts
it('wires activity creation from desktop admin to backend api', () => {
  const activityPage = readFileSync(new URL('./ui/pages/ActivityCenterPage.tsx', import.meta.url), 'utf-8');
  const api = readFileSync(new URL('./api/admin.ts', import.meta.url), 'utf-8');
  expect(activityPage).toContain('createActivityCampaign');
  expect(activityPage).toContain('提交活动');
  expect(api).toContain('/api/admin/activity-campaigns');
});
```

- [ ] **Step 2: 在桌面端 API 客户端补活动创建方法**

```ts
export type CreateActivityCampaignInput = {
  activityType: ActivityCampaign['activityType'];
  title: string;
  content: string;
  coverUrl?: string | null;
  status?: ActivityCampaign['status'];
  startAt?: string | null;
  endAt?: string | null;
  config?: Record<string, unknown>;
};

export const createActivityCampaign = (input: CreateActivityCampaignInput) =>
  request<ActivityCampaign>('/api/admin/activity-campaigns', {
    method: 'POST',
    body: input
  });
```

- [ ] **Step 3: 在活动中心增加创建表单与成功回写**

```tsx
const [draft, setDraft] = useState({
  activityType: 'DISCOUNT' as ActivityCampaign['activityType'],
  title: '',
  content: '',
  coverUrl: '',
  status: 'DRAFT' as ActivityCampaign['status'],
  startAt: '',
  endAt: '',
  configText: '{}'
});

const submit = async () => {
  const created = await createActivityCampaign({
    activityType: draft.activityType,
    title: draft.title.trim(),
    content: draft.content.trim(),
    coverUrl: draft.coverUrl.trim() || null,
    status: draft.status,
    startAt: draft.startAt ? new Date(draft.startAt).toISOString() : null,
    endAt: draft.endAt ? new Date(draft.endAt).toISOString() : null,
    config: JSON.parse(draft.configText || '{}')
  });
  setCampaigns((current) => [created, ...current]);
};
```

- [ ] **Step 4: 增加数据来源提示与表单样式**

```css
.data-source-note {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(129, 140, 248, 0.14);
  background: rgba(8, 11, 25, 0.84);
  color: var(--text-soft);
}
```

- [ ] **Step 5: 运行桌面端测试**

Run: `pnpm --filter @jianliao/admin-desktop test`
Expected: PASS 或只剩其他页面补齐任务相关失败

### Task 3: 公告反馈与页面数据来源提示

**Files:**
- Modify: `apps/admin-desktop/src/renderer/ui/pages/AnnouncementNewPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/BrandingPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupOwnersPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/FinanceReportsPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/ProxyManagementPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Test: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先补页面提示断言**

```ts
it('documents announcement feedback and data source notes in desktop pages', () => {
  const announce = readFileSync(new URL('./ui/pages/AnnouncementNewPage.tsx', import.meta.url), 'utf-8');
  const groups = readFileSync(new URL('./ui/pages/GroupsPage.tsx', import.meta.url), 'utf-8');
  const finance = readFileSync(new URL('./ui/pages/FinanceReportsPage.tsx', import.meta.url), 'utf-8');
  const proxy = readFileSync(new URL('./ui/pages/ProxyManagementPage.tsx', import.meta.url), 'utf-8');
  expect(announce).toContain('系统会话');
  expect(groups).toContain('数据来源');
  expect(finance).toContain('推导');
  expect(proxy).toContain('演示数据');
});
```

- [ ] **Step 2: 公告页补清晰反馈**

```tsx
{msg && <div className={msg.startsWith('已发布') ? 'ok' : 'error'}>{msg}</div>}
<div className="data-source-note">
  发布成功后，公告会写入后台公告表，并尝试进入用户端系统会话供 `/h5/messages` 展示。
</div>
```

- [ ] **Step 3: 为品牌、群组、群主、财务、代理页面增加来源说明**

```tsx
<div className="data-source-note">
  数据来源：品牌页优先读取真实接口；失败时回退到本地示例。群组、群主、财务、代理页会混合真实接口、推导数据或演示数据，并在页面中明确说明。
</div>
```

- [ ] **Step 4: 运行桌面端测试**

Run: `pnpm --filter @jianliao/admin-desktop test`
Expected: PASS

### Task 4: 构建校验与交付说明

**Files:**
- Test: `apps/admin-desktop/package.json`

- [ ] **Step 1: 运行桌面端测试**

Run: `pnpm --filter @jianliao/admin-desktop test`
Expected: PASS

- [ ] **Step 2: 运行桌面端构建**

Run: `pnpm --filter @jianliao/admin-desktop build`
Expected: PASS

- [ ] **Step 3: 运行 Windows 打包命令**

Run: `pnpm --filter @jianliao/admin-desktop dist:win`
Expected: 若 Linux 环境可交叉打包则 PASS；若受宿主环境限制，则记录失败原因而不伪报成功

---

## 自检

- Spec coverage:
  - 开放已有隐藏后台页面入口：Task 1 覆盖
  - 活动创建：Task 2 覆盖
  - 公告反馈：Task 3 覆盖
  - 数据来源提示：Task 2 / Task 3 覆盖
  - 更新测试并跑构建：Task 4 覆盖

- Placeholder scan:
  - 无 `TODO` / `TBD`
  - 每个任务都给出具体文件、命令和实现方向

- Type consistency:
  - 活动类型与状态复用 `ActivityCampaign` 的 `activityType` / `status`
  - 仍沿用现有桌面端 `request()` 客户端封装

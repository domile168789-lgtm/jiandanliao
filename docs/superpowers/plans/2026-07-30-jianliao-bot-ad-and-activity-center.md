# 柬聊机器人广告任务与活动中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把广告发送做成真实任务链路，让机器人消息在 H5、Android、iOS 前台会话可见，并新增活动管理栏。

**Architecture:** 继续复用现有 `conversations/messages` 作为唯一消息通道；广告发送、购买退款提醒、称呼提醒全部走“任务/提醒记录 -> 投递记录 -> 真实消息”链路。管理后台只负责建任务、配活动、看状态，前台三端统一读取真实会话与消息接口。

**Tech Stack:** Fastify、Vitest、MySQL、React + Vite、Electron、Kotlin + Retrofit、SwiftUI

---

## 文件结构

### 后端

- Modify: `infra/mysql/001_init.sql`
  - 新增 `activity_campaigns`，补齐广告任务与活动中心表结构
- Modify: `tests/integration/mysql-schema.test.ts`
  - 校验新增表结构
- Modify: `apps/api/src/modules/group-bot/group-bot.service.ts`
  - 广告任务创建、立即发送、定时状态、投递记录
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
  - 广告任务与活动管理后台接口
- Create: `apps/api/src/modules/activity/activity.service.ts`
  - 活动中心增删改查与发布/暂停
- Create: `apps/api/src/modules/activity/activity.routes.test.ts`
  - 活动中心接口测试
- Modify: `apps/api/src/modules/group-bot/group-bot.routes.test.ts`
  - 广告任务立即发送/定时发送测试
- Modify: `apps/api/src/index.ts`
  - 注册活动中心或复用后台路由入口

### 管理后台

- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
  - 补广告任务、活动中心接口类型和请求函数
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
  - 新增 `活动管理`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
  - 广告任务真实提交、任务状态展示
- Create: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
  - 活动管理栏页面
- Modify: `apps/admin-desktop/src/renderer/styles.css`
  - 活动管理和任务表单样式
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`
  - 活动管理与广告任务入口 smoke

### H5

- Create: `apps/web/src/api/client.ts`
  - H5 端真实接口请求封装
- Create: `apps/web/src/api/chat.ts`
  - 会话/消息 API
- Modify: `apps/web/src/components/MainShell.tsx`
  - 从占位壳升级成真实会话列表
- Modify: `apps/web/src/App.tsx`
  - 登录后进入真实 H5 会话壳
- Modify: `apps/web/src/App.test.tsx`
  - 覆盖真实会话壳入口
- Modify: `apps/web/src/styles.css`
  - 会话列表样式

### Android / iOS

- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SessionsScreen.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ChatScreen.kt`
  - 补机器人会话标题和系统消息样式
- Modify: `apps/ios/JianliaoIOS/Features/Conversations/ConversationsView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Chat/ChatView.swift`
  - 补机器人会话标题和系统消息样式

---

### Task 1: 建活动中心与广告任务后端模型

**Files:**
- Modify: `infra/mysql/001_init.sql`
- Modify: `tests/integration/mysql-schema.test.ts`
- Create: `apps/api/src/modules/activity/activity.service.ts`

- [ ] **Step 1: 先写表结构断言**

```ts
it('contains activity center tables', () => {
  const sql = readFileSync('/workspace/jianliao-platform/infra/mysql/001_init.sql', 'utf-8');

  expect(sql).toContain('CREATE TABLE IF NOT EXISTS activity_campaigns');
  expect(sql).toContain('activity_type VARCHAR(32) NOT NULL');
  expect(sql).toContain('config_json JSON NOT NULL');
});
```

- [ ] **Step 2: 跑 schema 测试确认先失败**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts`
Expected: FAIL，提示缺少 `activity_campaigns`

- [ ] **Step 3: 在 SQL 中补活动中心表**

```sql
CREATE TABLE IF NOT EXISTS activity_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  activity_type VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  cover_url VARCHAR(512) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  config_json JSON NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

- [ ] **Step 4: 新建活动中心 service**

```ts
export class ActivityService {
  private ensureDb() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    return getDb();
  }

  async list(limit = 100) {
    const db = this.ensureDb();
    const safeLimit = Math.min(Math.max(Number(limit) || 0, 1), 100);
    const [rows] = await db.execute<any[]>(
      `SELECT id, activity_type AS activityType, title, content, cover_url AS coverUrl,
              status, start_at AS startAt, end_at AS endAt, JSON_EXTRACT(config_json, '$') AS config,
              created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
       FROM activity_campaigns
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`
    );
    return rows;
  }
}
```

- [ ] **Step 5: 复跑 schema 测试**

Run: `pnpm vitest run tests/integration/mysql-schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add infra/mysql/001_init.sql tests/integration/mysql-schema.test.ts apps/api/src/modules/activity/activity.service.ts
git commit -m "feat: add activity center data model"
```

### Task 2: 完成广告任务与活动中心后台接口

**Files:**
- Modify: `apps/api/src/modules/group-bot/group-bot.service.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Create: `apps/api/src/modules/activity/activity.routes.test.ts`
- Modify: `apps/api/src/modules/group-bot/group-bot.routes.test.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: 先写广告任务接口测试**

```ts
it('creates ad task for admin', async () => {
  const app = Fastify();
  app.addHook('preHandler', async (request) => {
    request.admin = { id: '10001', role: 'SUPER_ADMIN' };
  });
  await app.register(adminRoutes, { prefix: '/api' });

  const res = await app.inject({
    method: 'POST',
    url: '/api/admin/group-bot/ad-tasks',
    payload: {
      conversationIds: ['c1', 'c2'],
      content: '活动广告',
      sendMode: 'NOW',
      enabledScopes: ['ADS']
    }
  });

  expect(res.statusCode).toBe(200);
});
```

- [ ] **Step 2: 写活动中心接口测试**

```ts
it('lists activity campaigns for admin', async () => {
  listMock.mockResolvedValueOnce([{ id: 'ac1', activityType: 'DISCOUNT', title: '周末优惠' }]);
  const app = Fastify();
  app.addHook('preHandler', async (request) => {
    request.admin = { id: '10001', role: 'SUPER_ADMIN' };
  });
  await app.register(adminRoutes, { prefix: '/api' });

  const res = await app.inject({ method: 'GET', url: '/api/admin/activity-campaigns' });
  expect(res.statusCode).toBe(200);
});
```

- [ ] **Step 3: 跑新增接口测试确认先失败**

Run: `pnpm vitest run apps/api/src/modules/group-bot/group-bot.routes.test.ts apps/api/src/modules/activity/activity.routes.test.ts`
Expected: FAIL，提示路由或 mock 缺失

- [ ] **Step 4: 在 `group-bot.service.ts` 中补活动与广告任务方法**

```ts
async createAdTask(input: {
  createdBy: string;
  conversationIds: string[];
  content: string;
  sendMode: 'NOW' | 'CUSTOM';
  scheduledAt?: string | null;
  enabledScopes: string[];
}) {
  // 保留当前实现：NOW 立即 dispatch，CUSTOM 写 SCHEDULED
}
```

- [ ] **Step 5: 在 `admin.routes.ts` 中补活动中心接口**

```ts
app.get('/admin/activity-campaigns', async (request, reply) => {
  if (!ensureAdmin(request, reply, adminReadRoles)) return;
  return activityService.list();
});

app.post('/admin/activity-campaigns', async (request, reply) => {
  if (!ensureAdmin(request, reply, adminWriteRoles)) return;
  return activityService.create(request.body as any, request.admin!.id);
});
```

- [ ] **Step 6: 注册活动 service / 路由依赖**

```ts
const activityService = new ActivityService();
```

- [ ] **Step 7: 跑 API 定向测试**

Run: `pnpm vitest run apps/api/src/modules/admin/admin.routes.test.ts apps/api/src/modules/group-bot/group-bot.routes.test.ts apps/api/src/modules/activity/activity.routes.test.ts`
Expected: PASS

- [ ] **Step 8: 跑完整 API 测试**

Run: `pnpm --filter @jianliao/api test`
Expected: PASS with all tests green

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/group-bot/group-bot.service.ts apps/api/src/modules/admin/admin.routes.ts apps/api/src/modules/activity/activity.service.ts apps/api/src/modules/activity/activity.routes.test.ts apps/api/src/index.ts
git commit -m "feat: add ad task and activity admin apis"
```

### Task 3: 管理后台接入广告任务真实提交与活动管理栏

**Files:**
- Modify: `apps/admin-desktop/src/renderer/api/admin.ts`
- Modify: `apps/admin-desktop/src/renderer/ui/App.tsx`
- Modify: `apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx`
- Create: `apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx`
- Modify: `apps/admin-desktop/src/renderer/styles.css`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`

- [ ] **Step 1: 先写 smoke 断言**

```ts
it('contains activity center route', () => {
  const app = readFileSync(new URL('./ui/App.tsx', import.meta.url), 'utf-8');
  expect(app).toContain("'activity'");
  expect(app).toContain('ActivityCenterPage');
});
```

- [ ] **Step 2: 跑 smoke 测试确认先失败**

Run: `pnpm test`
Expected: FAIL，提示缺少 `activity`

- [ ] **Step 3: 给后台 API 增活动中心类型**

```ts
export type ActivityCampaign = {
  id: string;
  activityType: string;
  title: string;
  content: string;
  coverUrl: string | null;
  status: string;
  startAt: string | null;
  endAt: string | null;
  config: Record<string, any>;
};

export const getActivityCampaigns = () => request<ActivityCampaign[]>('/api/admin/activity-campaigns');
```

- [ ] **Step 4: 新建活动管理页面**

```tsx
export const ActivityCenterPage = () => {
  const modules = [
    '优惠活动',
    '签到活动',
    '大转盘活动',
    '邀请好友活动',
    '轮播图管理',
    '发红包'
  ];
  return (
    <section className="page-section">
      <div className="page-header">
        <div>
          <div className="section-kicker">活动中心</div>
          <h1>活动管理</h1>
        </div>
      </div>
      <div className="stats-grid">
        {modules.map((name) => (
          <article key={name} className="stat-card">
            <span className="stat-label">{name}</span>
            <strong className="stat-value">可配置</strong>
          </article>
        ))}
      </div>
    </section>
  );
};
```

- [ ] **Step 5: 在 `App.tsx` 注册导航**

```tsx
type Route = 'dashboard' | 'users' | 'groups' | 'owners' | 'finance' | 'agents' | 'activity' | 'reports' | 'announce' | 'audits' | 'branding';
```

- [ ] **Step 6: 在 `GroupsPage.tsx` 用真实任务返回更新列表**

```tsx
const task = await createGroupAdTask({
  conversationIds: selectedGroups,
  content: adContent,
  sendMode: mode,
  scheduledAt: mode === 'CUSTOM' ? scheduledAt : null,
  enabledScopes: botScopes
});
setAdTasks((current) => [task, ...current]);
```

- [ ] **Step 7: 补样式**

```css
.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
```

- [ ] **Step 8: 跑后台测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 9: 跑后台构建**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add apps/admin-desktop/src/renderer/api/admin.ts apps/admin-desktop/src/renderer/ui/App.tsx apps/admin-desktop/src/renderer/ui/pages/GroupsPage.tsx apps/admin-desktop/src/renderer/ui/pages/ActivityCenterPage.tsx apps/admin-desktop/src/renderer/styles.css apps/admin-desktop/src/renderer/smoke.test.ts
git commit -m "feat: add activity center and real ad tasks"
```

### Task 4: H5 升级为真实会话壳并显示机器人消息

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/api/chat.ts`
- Modify: `apps/web/src/components/MainShell.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: 先写 H5 会话壳测试**

```tsx
it('renders real conversation shell after login', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ platformGroup: 'mobile', projectName: '柬聊移动品牌', logoUrl: null, themeAssetUrl: null }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1', type: 'DM', title: '群机器人提醒', lastMessage: '用户购买成功', updatedAt: '2026-07-30T12:00:00Z' }] })
  );
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(await screen.findByText('群机器人提醒')).toBeInTheDocument();
});
```

- [ ] **Step 2: 跑 web 测试确认先失败**

Run: `pnpm test`
Expected: FAIL，找不到真实会话列表

- [ ] **Step 3: 新建 H5 API client**

```ts
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}
```

- [ ] **Step 4: 新建 chat API**

```ts
export type ConversationRow = {
  id: string;
  type: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string | null;
};

export const listConversations = () => apiGet<ConversationRow[]>('/api/conversations');
```

- [ ] **Step 5: 把 `MainShell.tsx` 改成真实会话壳**

```tsx
export default function MainShell() {
  const [rows, setRows] = React.useState<ConversationRow[]>([]);
  React.useEffect(() => {
    void listConversations().then(setRows).catch(() => setRows([]));
  }, []);
  return (
    <main className="phone-shell">
      <header className="top-bar"><h1>消息</h1></header>
      <section className="placeholder-list">
        {rows.map((row) => (
          <article key={row.id}>
            <strong>{row.title || row.type}</strong>
            <span>{row.lastMessage || '暂无消息'}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: 调整 `App.tsx` 登录后行为**

```tsx
if (isLoggedIn) {
  return <MainShell />;
}
```

- [ ] **Step 7: 补样式**

```css
.placeholder-list article {
  display: grid;
  gap: 6px;
}
```

- [ ] **Step 8: 跑 web 测试和构建**

Run: `pnpm test && pnpm build`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/api/client.ts apps/web/src/api/chat.ts apps/web/src/components/MainShell.tsx apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/styles.css
git commit -m "feat: show real bot conversations in h5"
```

### Task 5: Android 与 iOS 显示机器人会话和系统消息

**Files:**
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/SessionsScreen.kt`
- Modify: `apps/android/app/src/main/java/com/jianliao/android/ui/screens/ChatScreen.kt`
- Modify: `apps/ios/JianliaoIOS/Features/Conversations/ConversationsView.swift`
- Modify: `apps/ios/JianliaoIOS/Features/Chat/ChatView.swift`

- [ ] **Step 1: 先改 Android 会话标题**

```kt
val title = conversation.title?.takeIf { it.isNotBlank() }
    ?: if (conversation.type == "DM") "群机器人提醒" else "群会话"
```

- [ ] **Step 2: 再改 Android 系统消息样式**

```kt
val isBotMessage = message.senderId.startsWith("system") || (message.body["text"] as? String)?.contains("群机器人") == true
```

- [ ] **Step 3: 改 iOS 会话标题**

```swift
private func title(for c: Conversation) -> String {
  if let t = c.title, !t.isEmpty { return t }
  return c.type == "DM" ? "群机器人提醒" : "群会话"
}
```

- [ ] **Step 4: 改 iOS 聊天中机器人消息样式**

```swift
let isBot = message.senderId.hasPrefix("system")
```

- [ ] **Step 5: 做静态验证**

Run: `git diff --check -- apps/android/app/src/main/java/com/jianliao/android/ui/screens/SessionsScreen.kt apps/android/app/src/main/java/com/jianliao/android/ui/screens/ChatScreen.kt apps/ios/JianliaoIOS/Features/Conversations/ConversationsView.swift apps/ios/JianliaoIOS/Features/Chat/ChatView.swift`
Expected: exit code 0

- [ ] **Step 6: Commit**

```bash
git add apps/android/app/src/main/java/com/jianliao/android/ui/screens/SessionsScreen.kt apps/android/app/src/main/java/com/jianliao/android/ui/screens/ChatScreen.kt apps/ios/JianliaoIOS/Features/Conversations/ConversationsView.swift apps/ios/JianliaoIOS/Features/Chat/ChatView.swift
git commit -m "feat: surface bot messages in mobile clients"
```

### Task 6: 统一回归与预览刷新

**Files:**
- Modify: `apps/api/src/modules/group-bot/group-bot.routes.test.ts`
- Modify: `apps/api/src/modules/admin/admin.routes.test.ts`
- Modify: `apps/admin-desktop/src/renderer/smoke.test.ts`
- Modify: `apps/web/src/App.test.tsx`

- [ ] **Step 1: 补广告任务立即发送断言**

```ts
expect(res.statusCode).toBe(200);
expect(createAdTaskMock).toHaveBeenCalledWith(
  expect.objectContaining({
    conversationIds: ['c1', 'c2'],
    sendMode: 'NOW'
  })
);
```

- [ ] **Step 2: 补活动管理 smoke**

```ts
expect(activityPage).toContain('活动管理');
expect(activityPage).toContain('发红包');
```

- [ ] **Step 3: 跑完整验证**

Run: `pnpm --filter @jianliao/api test && pnpm --filter @jianliao/admin-desktop test && pnpm --filter @jianliao/admin-desktop build && pnpm --filter @jianliao/web test && pnpm --filter @jianliao/web build`
Expected: 全部 PASS

- [ ] **Step 4: 启动后台预览**

Run: `pnpm exec vite --host 0.0.0.0 --port 4175`
Expected: 输出 `http://localhost:4175/`

- [ ] **Step 5: 启动 H5 预览**

Run: `pnpm dev -- --host 0.0.0.0 --port 5173`
Expected: 输出 `http://localhost:5173/`

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/group-bot/group-bot.routes.test.ts apps/api/src/modules/admin/admin.routes.test.ts apps/admin-desktop/src/renderer/smoke.test.ts apps/web/src/App.test.tsx
git commit -m "test: cover activity center and bot ad delivery"
```

## 自检

### Spec 覆盖检查

- 广告发送真实任务：Task 1、Task 2、Task 3
- 前台会话可见机器人消息：Task 4、Task 5
- 活动管理栏：Task 1、Task 2、Task 3
- 定时发送真实落库：Task 2、Task 3
- 三端会话统一：Task 4、Task 5

没有遗漏 spec 里的核心要求。

### 占位检查

- 无 `TODO`
- 无 `TBD`
- 每个任务都给了文件、代码片段、命令和预期结果

### 类型一致性检查

- 广告任务统一用 `sendMode: 'NOW' | 'CUSTOM'`
- 活动管理统一用 `activityType`
- 三端前台都围绕现有 `conversations/messages` 协议，不引入第二套通知类型


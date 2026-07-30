# Jiandanliao Four Tabs WeChat Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the H5 `消息`、`通讯录`、`发现`、`我的` tabs into a WeChat-style information architecture while preserving and reusing Jiandanliao's real capabilities.

**Architecture:** Keep the existing Tab shell and route map, but replace the homepage structures of the four tabs with WeChat-style list sections and service entries. Reuse the already built `+ -> 发起群聊` flow, wire existing real pages where available, and add small skeleton pages for the new WeChat-style entries that do not yet have business logic.

**Tech Stack:** React, React Router, TypeScript, existing H5 APIs, Vitest

---

### Task 1: Add new route skeleton pages for WeChat-style entries

**Files:**
- Create: `/workspace/jiandanliao/apps/web/src/pages/FriendsRequestsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/GroupChatsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/TagsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/OfficialAccountsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/MomentsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/ScanPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/ChannelsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/SearchHubPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/ServicesPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/FavoritesPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/CardsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/StickersPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/router.tsx`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write failing route tests**

```ts
it('opens the contacts service pages', async () => {
  renderAt('/h5/contacts/friends', { token: 'demo-token' });
  expect(await screen.findByRole('heading', { level: 1, name: '新的朋友' })).toBeInTheDocument();
});

it('opens the discover service pages', async () => {
  renderAt('/h5/discover/moments', { token: 'demo-token' });
  expect(await screen.findByRole('heading', { level: 1, name: '朋友圈' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL because the routes do not exist

- [ ] **Step 3: Add minimal pages and routes**

```tsx
// Example page
export default function FriendsRequestsPage() {
  return (
    <section className="h5-page">
      <header className="top-bar"><h1>新的朋友</h1></header>
      <div className="placeholder-list">
        <section className="section-card">
          <p>这里会展示新的好友请求和手机号添加入口。</p>
        </section>
      </div>
    </section>
  );
}
```

```tsx
// router.tsx
<Route path="/h5/contacts/friends" element={<FriendsRequestsPage />} />
<Route path="/h5/discover/moments" element={<MomentsPage />} />
<Route path="/h5/me/services" element={<ServicesPage />} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add apps/web/src/pages apps/web/src/router.tsx apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): add four-tab service routes"
```

### Task 2: Refresh the messages homepage and complete WeChat-style plus menu

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/components/MainShell.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/components/MainShell.test.tsx`

- [ ] **Step 1: Write failing menu tests**

```ts
it('shows all plus menu entries', async () => {
  render(
    <MemoryRouter>
      <MainShell />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
  expect(await screen.findByRole('link', { name: '添加朋友' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '扫一扫' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '收付款' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx`
Expected: FAIL because the menu only contains `发起群聊`

- [ ] **Step 3: Add the missing menu entries and lighter message header**

```tsx
const menuItems = [
  { label: '发起群聊', to: '/h5/group/new' },
  { label: '添加朋友', to: '/h5/contacts/friends' },
  { label: '扫一扫', to: '/h5/discover/scan' },
  { label: '收付款', to: '/h5/wallet' }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add apps/web/src/components/MainShell.tsx apps/web/src/components/MainShell.test.tsx apps/web/src/styles.css
git -C /workspace/jiandanliao commit -m "feat(web): complete messages plus menu"
```

### Task 3: Rebuild the contacts homepage

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/pages/ContactsPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write failing contacts tests**

```ts
it('renders wechat-style contacts entry rows', async () => {
  renderAt('/h5/contacts', { token: 'demo-token' });
  expect(await screen.findByRole('link', { name: /新的朋友/ })).toHaveAttribute('href', '/h5/contacts/friends');
  expect(screen.getByRole('link', { name: /群聊/ })).toHaveAttribute('href', '/h5/contacts/groups');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL because the entry rows do not exist

- [ ] **Step 3: Replace the top of ContactsPage with entry rows**

```tsx
const contactEntries = [
  { title: '新的朋友', to: '/h5/contacts/friends', subtitle: '查看新的添加请求' },
  { title: '群聊', to: '/h5/contacts/groups', subtitle: '查看和管理群会话' },
  { title: '标签', to: '/h5/contacts/tags', subtitle: '管理联系人分组' },
  { title: '公众号', to: '/h5/contacts/official-accounts', subtitle: '查看服务账号' }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add apps/web/src/pages/ContactsPage.tsx apps/web/src/styles.css apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): refresh contacts homepage"
```

### Task 4: Rebuild the discover homepage

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/pages/DiscoverPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write failing discover tests**

```ts
it('renders wechat-style discover rows', async () => {
  renderAt('/h5/discover', { token: 'demo-token' });
  expect(await screen.findByRole('link', { name: /朋友圈/ })).toHaveAttribute('href', '/h5/discover/moments');
  expect(screen.getByRole('link', { name: /看一看/ })).toHaveAttribute('href', '/h5/discover/channels');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: Convert discover cards into grouped rows**

```tsx
const primaryRows = [
  { title: '朋友圈', to: '/h5/discover/moments' },
  { title: '扫一扫', to: '/h5/discover/scan' },
  { title: '看一看', to: '/h5/discover/channels' },
  { title: '搜一搜', to: '/h5/discover/search' }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add apps/web/src/pages/DiscoverPage.tsx apps/web/src/styles.css apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): refresh discover homepage"
```

### Task 5: Rebuild the me homepage

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/pages/MePage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write failing me-page tests**

```ts
it('renders wechat-style me sections', async () => {
  renderAt('/h5/me', { token: 'demo-token' });
  expect(await screen.findByRole('link', { name: /服务/ })).toHaveAttribute('href', '/h5/me/services');
  expect(screen.getByRole('link', { name: /卡包/ })).toHaveAttribute('href', '/h5/me/cards');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: Add WeChat-style profile card and grouped service rows**

```tsx
const meRows = [
  { title: '服务', to: '/h5/me/services' },
  { title: '收藏', to: '/h5/me/favorites' },
  { title: '朋友圈', to: '/h5/discover/moments' },
  { title: '卡包', to: '/h5/me/cards' },
  { title: '表情', to: '/h5/me/stickers' }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add apps/web/src/pages/MePage.tsx apps/web/src/styles.css apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): refresh me homepage"
```

### Task 6: Verification, acceptance notes, and push

**Files:**
- Modify: `/workspace/jiandanliao/docs/local/jiandanliao-final-acceptance.md`
- Test: `/workspace/jiandanliao/apps/web/src/components/MainShell.test.tsx`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Update acceptance notes**

```md
- Web/H5 的消息、通讯录、发现、我的四个 Tab 已完成微信式信息架构改版
- 消息页 `+` 菜单、通讯录服务入口、发现服务入口、我的服务分区均可访问
```

- [ ] **Step 2: Run frontend tests**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx src/App.test.tsx`
Expected: PASS

- [ ] **Step 3: Manual browser verification**

Run:

```bash
pnpm --filter @jianliao/web dev -- --host 0.0.0.0 --port 4174
```

Expected:
- 消息页可打开并显示完整 `+` 菜单
- 通讯录显示新的朋友/群聊/标签/公众号
- 发现显示朋友圈/扫一扫/看一看/搜一搜
- 我的显示个人卡片、服务、收藏、卡包、表情

- [ ] **Step 4: Commit**

```bash
git -C /workspace/jiandanliao add docs/local/jiandanliao-final-acceptance.md
git -C /workspace/jiandanliao commit -m "docs: record four-tab wechat refresh acceptance"
```

# Jiandanliao Plus Group Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WeChat-style `+` menu entry on the H5 messages page that lets users create a real group chat and land in the new conversation.

**Architecture:** Reuse the existing H5 messages shell and IM API flow. Add a small UI flow for `+ -> 发起群聊 -> 选择联系人 -> 填写群名`, and add a minimal backend `POST /api/conversations/group` path wired to both the database-backed service and the no-database preview store.

**Tech Stack:** React, React Router, TypeScript, Fastify, existing preview store, Vitest

---

### Task 1: Add backend group creation API

**Files:**
- Modify: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/im-preview/preview-store.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.test.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
it('creates a group conversation in preview mode', async () => {
  const app = await buildApp();
  const auth = await registerPreviewUser(app, '855010100010');

  const peerOne = await registerPreviewUser(app, '855010100011');
  const peerTwo = await registerPreviewUser(app, '855010100012');

  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations/group',
    headers: {
      authorization: `Bearer ${auth.accessToken}`
    },
    payload: {
      title: '项目群',
      memberPhones: [peerOne.phone, peerTwo.phone]
    }
  });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    type: 'GROUP',
    title: '项目群'
  });
});

it('rejects group creation with fewer than two peers', async () => {
  const app = await buildApp();
  const auth = await registerPreviewUser(app, '855010100020');
  const peerOne = await registerPreviewUser(app, '855010100021');

  const response = await app.inject({
    method: 'POST',
    url: '/api/conversations/group',
    headers: {
      authorization: `Bearer ${auth.accessToken}`
    },
    payload: {
      title: '人数不足',
      memberPhones: [peerOne.phone]
    }
  });

  expect(response.statusCode).toBe(400);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/api test -- conversation.routes.test.ts`
Expected: FAIL because `/api/conversations/group` does not exist yet

- [ ] **Step 3: Implement minimal route and service support**

```ts
// conversation.routes.ts
app.post('/api/conversations/group', { preHandler: [app.authenticate] }, async (request, reply) => {
  const body = request.body as { title?: string; memberPhones: string[] };

  if (!Array.isArray(body.memberPhones) || body.memberPhones.length < 2) {
    return reply.code(400).send({ code: 'BAD_REQUEST', message: 'memberPhones must contain at least 2 items' });
  }

  return conversationService.createGroupByPhones({
    ownerPhone: request.user.phone,
    title: body.title,
    memberPhones: body.memberPhones
  });
});

// conversation.service.ts
async createGroupByPhones(input: { ownerPhone: string; title?: string; memberPhones: string[] }) {
  if (!process.env.DATABASE_URL) {
    return previewStore.createGroup(input);
  }
  throw new Error('group creation not implemented for database mode yet');
}
```

- [ ] **Step 4: Extend preview store**

```ts
createGroup(input: { ownerPhone: string; title?: string; memberPhones: string[] }) {
  const uniquePhones = Array.from(new Set([input.ownerPhone, ...input.memberPhones]));
  if (uniquePhones.length < 3) {
    throw new Error('group requires at least 3 members including owner');
  }

  const members = uniquePhones.map((phone) => getUserByPhone(phone));
  const conversation: PreviewConversation = {
    id: `preview-group-${randomUUID()}`,
    type: 'GROUP',
    title: input.title?.trim() || '新的群聊',
    lastMessage: null,
    updatedAt: new Date().toISOString(),
    members: members.map((item) => item.id),
    ownerUserId: members[0].id
  };

  store.conversations.unshift(conversation);
  store.messages[conversation.id] = [];
  return mapConversation(conversation);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @jianliao/api test -- conversation.routes.test.ts`
Expected: PASS with new group route covered

- [ ] **Step 6: Commit**

```bash
git -C /workspace/jiandanliao add \
  apps/api/src/modules/conversations/conversation.service.ts \
  apps/api/src/modules/conversations/conversation.routes.ts \
  apps/api/src/modules/im-preview/preview-store.ts \
  apps/api/src/modules/conversations/conversation.routes.test.ts
git -C /workspace/jiandanliao commit -m "feat(api): add preview group creation flow"
```

### Task 2: Add H5 API and routes for group creation flow

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/api/chat.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/router.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/NewGroupPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/NewGroupConfirmPage.tsx`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the failing UI route test**

```ts
it('opens the new group flow route', async () => {
  renderAt('/h5/group/new', { token: 'demo-token' });
  expect(await screen.findByRole('heading', { level: 1, name: '选择联系人' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL because the route and page do not exist

- [ ] **Step 3: Add chat API helpers**

```ts
export async function createGroupConversation(input: { title?: string; memberPhones: string[] }) {
  return apiPost('/api/conversations/group', input);
}

export async function loadSelectableContacts() {
  return previewContacts.map((item) => ({
    phone: item.phone,
    title: item.title,
    type: item.type
  }));
}
```

- [ ] **Step 4: Add routes and pages**

```tsx
// router.tsx
<Route path="/h5/group/new" element={<NewGroupPage />} />
<Route path="/h5/group/new/confirm" element={<NewGroupConfirmPage />} />
```

```tsx
// NewGroupPage.tsx
export default function NewGroupPage() {
  return (
    <section className="h5-page">
      <header className="top-bar"><h1>选择联系人</h1></header>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS for the new route coverage

- [ ] **Step 6: Commit**

```bash
git -C /workspace/jiandanliao add \
  apps/web/src/api/chat.ts \
  apps/web/src/router.tsx \
  apps/web/src/pages/NewGroupPage.tsx \
  apps/web/src/pages/NewGroupConfirmPage.tsx \
  apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): add group creation routes"
```

### Task 3: Add WeChat-style plus menu and group selection UI

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/components/MainShell.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/components/MainShell.test.tsx`

- [ ] **Step 1: Write the failing menu test**

```ts
it('opens the plus menu and exposes 发起群聊', async () => {
  render(
    <MemoryRouter>
      <MainShell />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: '打开快捷菜单' }));
  expect(await screen.findByRole('link', { name: '发起群聊' })).toHaveAttribute('href', '/h5/group/new');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx`
Expected: FAIL because the plus menu is not implemented

- [ ] **Step 3: Implement the floating menu**

```tsx
const [menuOpen, setMenuOpen] = React.useState(false);

<button
  type="button"
  aria-label="打开快捷菜单"
  className="mini-link mini-link-icon"
  onClick={() => setMenuOpen((value) => !value)}
>
  +
</button>

{menuOpen ? (
  <div className="plus-menu">
    <Link to="/h5/group/new" onClick={() => setMenuOpen(false)}>
      发起群聊
    </Link>
  </div>
) : null}
```

- [ ] **Step 4: Implement the visual style**

```css
.plus-menu {
  position: absolute;
  top: 56px;
  right: 16px;
  width: 168px;
  padding: 8px 0;
  border-radius: 14px;
  background: #1f2937;
  color: #fff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.24);
}

.plus-menu a {
  display: block;
  padding: 12px 16px;
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx`
Expected: PASS with the new plus menu behavior

- [ ] **Step 6: Commit**

```bash
git -C /workspace/jiandanliao add \
  apps/web/src/components/MainShell.tsx \
  apps/web/src/components/MainShell.test.tsx \
  apps/web/src/styles.css
git -C /workspace/jiandanliao commit -m "feat(web): add plus menu for group creation"
```

### Task 4: Complete contact selection and group confirmation flow

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/pages/NewGroupPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/NewGroupConfirmPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Write the failing flow test**

```ts
it('creates a group from the group flow', async () => {
  renderAt('/h5/group/new', { token: 'demo-token' });

  fireEvent.click(await screen.findByLabelText('选择 商务对接'));
  fireEvent.click(screen.getByLabelText('选择 渠道伙伴群'));
  fireEvent.click(screen.getByRole('button', { name: '下一步' }));

  fireEvent.change(await screen.findByLabelText('群名称'), {
    target: { value: '测试群聊' }
  });
  fireEvent.click(screen.getByRole('button', { name: '完成' }));

  expect(await screen.findByRole('heading', { level: 1, name: '测试群聊' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: FAIL because the flow is not implemented yet

- [ ] **Step 3: Implement selection page**

```tsx
const [selectedPhones, setSelectedPhones] = React.useState<string[]>([]);
const navigate = useNavigate();

const next = () => {
  if (selectedPhones.length < 2) return;
  navigate('/h5/group/new/confirm', { state: { memberPhones: selectedPhones } });
};
```

- [ ] **Step 4: Implement confirm-and-create page**

```tsx
const location = useLocation();
const navigate = useNavigate();
const memberPhones = (location.state as { memberPhones?: string[] } | null)?.memberPhones ?? [];

const submit = async () => {
  const created = await createGroupConversation({ title, memberPhones });
  navigate(`/h5/chat/${created.id}`);
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @jianliao/web test -- --run src/App.test.tsx`
Expected: PASS with the full UI flow

- [ ] **Step 6: Commit**

```bash
git -C /workspace/jiandanliao add \
  apps/web/src/pages/NewGroupPage.tsx \
  apps/web/src/pages/NewGroupConfirmPage.tsx \
  apps/web/src/styles.css \
  apps/web/src/App.test.tsx
git -C /workspace/jiandanliao commit -m "feat(web): complete group creation flow"
```

### Task 5: Verify end-to-end behavior and sync docs

**Files:**
- Modify: `/workspace/jiandanliao/docs/local/jiandanliao-final-acceptance.md`
- Test: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.test.ts`
- Test: `/workspace/jiandanliao/apps/web/src/components/MainShell.test.tsx`
- Test: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: Update acceptance notes**

```md
- Web/H5 消息页已支持微信式 `+` 菜单中的发起群聊链路
- 用户可从选择联系人到填写群名并进入新群聊天页
```

- [ ] **Step 2: Run backend tests**

Run: `pnpm --filter @jianliao/api test -- conversation.routes.test.ts`
Expected: PASS

- [ ] **Step 3: Run frontend tests**

Run: `pnpm --filter @jianliao/web test -- --run src/components/MainShell.test.tsx src/App.test.tsx`
Expected: PASS

- [ ] **Step 4: Manual browser verification**

Run:

```bash
pnpm --filter @jianliao/web dev -- --host 0.0.0.0 --port 4174
```

Expected:
- 消息页 `+` 菜单可打开
- 发起群聊可进入联系人选择页
- 建群成功后进入新群聊天页

- [ ] **Step 5: Commit**

```bash
git -C /workspace/jiandanliao add docs/local/jiandanliao-final-acceptance.md
git -C /workspace/jiandanliao commit -m "docs: record plus menu group chat acceptance"
```

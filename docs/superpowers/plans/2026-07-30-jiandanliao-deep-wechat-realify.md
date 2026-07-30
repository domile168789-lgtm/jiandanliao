# Jiandanliao Deep WeChat Realify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把四个 Tab 中仍偏演示态的高频微信式能力继续补成真实链路，并按阶段持续测试、提交、推送正式仓库。

**Architecture:** 继续沿用现有 `apps/api` + `apps/web` + preview fallback 的双模式结构。消息阶段优先复用现有 `messages`、`conversations`、`ws` 能力补未读、已读、图片、语音与实时推送；通讯录与群阶段围绕现有 `contacts` 与 `conversations` 模块扩展好友和群管理；我的与发现阶段优先把静态页升级为最小真实能力，不做无关重构。

**Tech Stack:** React, React Router, TypeScript, Fastify, WebSocket, Vitest, Prisma, MySQL

---

## File Map

- `apps/web/src/api/chat.ts`
  负责会话列表、消息列表、消息发送、预览态 IM store，同步扩展未读、已读、图片、语音和 WS 客户端。
- `apps/web/src/components/MainShell.tsx`
  负责消息首页会话列表显示，补未读状态、红点、静音/置顶位。
- `apps/web/src/pages/ChatPage.tsx`
  负责聊天页 UI，补图片上传、语音发送、已读刷新和实时消息接入。
- `apps/api/src/modules/messages/message.service.ts`
  负责消息发送、图片/语音 body 规范化、消息预览和服务端事件。
- `apps/api/src/modules/messages/*.test.ts`
  负责消息阶段的接口与服务测试。
- `apps/api/src/modules/contacts/contacts.service.ts`
  负责好友申请发送、好友详情、删除/拉黑/举报、标签成员管理。
- `apps/api/src/modules/contacts/contacts.routes.ts`
  负责通讯录新增路由。
- `apps/web/src/api/contacts.ts`
  负责好友搜索、发送申请、详情、关系管理、标签成员管理等前端 API 封装。
- `apps/web/src/pages/ContactsPage.tsx`
  从本地静态联系人切换到真实联系人与搜索结果。
- `apps/web/src/pages/FriendsRequestsPage.tsx`
  继续承接新的朋友列表，同时增加发送申请后的状态回显。
- `apps/web/src/pages/GroupChatsPage.tsx`
  扩展为群管理入口页。
- `apps/web/src/pages/ChatSettingsPage.tsx`
  新增群管理页，承接邀请成员、退群、群成员查看。
- `apps/web/src/pages/ProfilePage.tsx`
  从只读卡片升级为查看 + 编辑。
- `apps/web/src/pages/SecurityPage.tsx`
  补设备、黑名单、隐私等真实设置项。
- `apps/web/src/pages/ScanPage.tsx`
  从模拟输入升级为图片识别优先的扫码链路。
- `docs/local/jiandanliao-final-acceptance.md`
  记录每阶段验收结果。

### Task 1: 补齐消息阶段后端与 WS 合同

**Files:**
- Modify: `/workspace/jiandanliao/apps/api/src/modules/messages/message.service.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/messages/message.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.service.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/im-preview/preview-store.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/messages/message.routes.test.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.test.ts`

- [ ] **Step 1: 写未读、已读、图片、语音的失败测试**

```ts
it('returns unreadCount in conversation rows', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/conversations',
    headers: { authorization: `Bearer ${token}` }
  });

  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)[0]).toMatchObject({
    id: expect.any(String),
    unreadCount: expect.any(Number)
  });
});

it('marks a conversation as read', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'POST',
    url: '/api/messages/read',
    headers: { authorization: `Bearer ${token}` },
    payload: { conversationId: 'preview-dm-business' }
  });

  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toMatchObject({ ok: true });
});

it('creates an image message', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'POST',
    url: '/api/messages',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      conversationId: 'preview-dm-business',
      type: 'IMAGE',
      body: {
        objectKey: 'preview/demo-image.png',
        mimeType: 'image/png',
        dedupeKey: 'preview:demo-image'
      }
    }
  });

  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toMatchObject({ type: 'IMAGE' });
});
```

- [ ] **Step 2: 运行消息相关测试确认失败**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/messages/message.routes.test.ts apps/api/src/modules/conversations/conversation.routes.test.ts`
Expected: FAIL，提示缺少 `unreadCount`、`/api/messages/read` 或相关断言不成立。

- [ ] **Step 3: 最小实现后端字段与已读接口**

```ts
// conversation.service.ts
return rows.map((row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  lastMessage: row.last_message,
  updatedAt: row.updated_at,
  unreadCount: Number(row.unread_count || 0),
  isPinned: Boolean(row.is_pinned),
  isMuted: Boolean(row.is_muted)
}));

// message.routes.ts
app.post('/messages/read', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { conversationId: string };
  return service.markReadByPhone({ phone: request.user.phone, conversationId: body.conversationId });
});

// preview-store.ts
markConversationRead(input: { phone: string; conversationId: string }) {
  this.state.receipts = this.state.receipts.filter(
    (item) => !(item.userPhone === input.phone && item.conversationId === input.conversationId)
  );
  return { ok: true };
}
```

- [ ] **Step 4: 为图片和语音消息补 body 规范化与事件**

```ts
// message.service.ts
type AudioMessageBody = {
  objectKey: string;
  mimeType: string;
  durationMs: number;
  dedupeKey: string;
};

const normalizeAudioBody = (body: unknown): AudioMessageBody => {
  const payload = ensureObjectBody(body);
  const objectKey = normalizeStringField(payload.objectKey);
  const mimeType = normalizeStringField(payload.mimeType).toLowerCase();
  const durationMs = Number(payload.durationMs || 0);
  const dedupeKey = normalizeStringField(payload.dedupeKey) || `${objectKey}:${durationMs}`;
  if (!objectKey || !mimeType || durationMs <= 0) {
    throw new MessageValidationError('missing audio fields');
  }
  return { ...payload, objectKey, mimeType, durationMs, dedupeKey };
};

private normalizeBody(input: CreateMessageInput) {
  if (input.type === 'IMAGE') return normalizeImageBody(input.body);
  if (input.type === 'AUDIO') return normalizeAudioBody(input.body);
  return ensureObjectBody(input.body);
}
```

- [ ] **Step 5: 重新运行消息相关测试确认通过**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/messages/message.routes.test.ts apps/api/src/modules/conversations/conversation.routes.test.ts`
Expected: PASS

- [ ] **Step 6: 提交第一部分后端消息合同**

```bash
git add apps/api/src/modules/messages/message.service.ts \
  apps/api/src/modules/messages/message.routes.ts \
  apps/api/src/modules/messages/message.routes.test.ts \
  apps/api/src/modules/conversations/conversation.service.ts \
  apps/api/src/modules/conversations/conversation.routes.test.ts \
  apps/api/src/modules/im-preview/preview-store.ts
git commit -m "feat(api): add message unread and media contract"
```

### Task 2: 接入消息页未读、图片、语音和实时更新

**Files:**
- Modify: `/workspace/jiandanliao/apps/web/src/api/chat.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/components/MainShell.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/ChatPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/App.test.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/styles.css`

- [ ] **Step 1: 写 Web 端消息能力失败测试**

```ts
it('shows unread badge in message list', async () => {
  renderAt('/h5/messages', { token: 'demo-token' });
  expect(await screen.findByText('2')).toHaveClass('conversation-unread-badge');
});

it('sends image messages from chat page', async () => {
  renderAt('/h5/chat/demo-business', { token: 'demo-token' });
  const file = new File(['demo'], 'proof.png', { type: 'image/png' });
  const input = await screen.findByLabelText('发送图片');
  fireEvent.change(input, { target: { files: [file] } });
  expect(await screen.findByText('[图片消息]')).toBeInTheDocument();
});

it('marks conversation as read after opening chat', async () => {
  renderAt('/h5/chat/demo-business', { token: 'demo-token' });
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/messages/read'),
    expect.objectContaining({ method: 'POST' })
  );
});
```

- [ ] **Step 2: 运行前端消息测试确认失败**

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: FAIL，提示未读徽标、图片上传控件、已读接口调用不存在。

- [ ] **Step 3: 扩展前端 API 类型和方法**

```ts
export type ConversationRow = {
  id: string;
  type: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: string | null;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
};

export async function markConversationRead(conversationId: string, fetcher: typeof fetch = fetch) {
  return apiPost<{ ok: true }>('/api/messages/read', { conversationId }, fetcher);
}

export async function sendImageMessage(
  conversationId: string,
  file: File,
  fetcher: typeof fetch = fetch
) {
  return apiPost<MessageRow>('/api/messages', {
    conversationId,
    type: 'IMAGE',
    body: { objectKey: `preview/${file.name}`, mimeType: file.type, dedupeKey: `${file.name}:${file.size}` }
  }, fetcher);
}
```

- [ ] **Step 4: 最小实现消息首页与聊天页 UI**

```tsx
// MainShell.tsx
{row.unreadCount ? <span className="conversation-unread-badge">{row.unreadCount}</span> : null}

// ChatPage.tsx
React.useEffect(() => {
  void markConversationRead(conversationId).catch(() => undefined);
}, [conversationId]);

<label className="composer-tool" htmlFor="chat-image-upload">
  <span>图片</span>
  <input
    id="chat-image-upload"
    aria-label="发送图片"
    type="file"
    accept="image/*"
    onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void handleSendImage(file);
    }}
  />
</label>
```

- [ ] **Step 5: 接入真实 WS 与 preview 回退**

```ts
// chat.ts
export function subscribeRealtimeMessages(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const ws = new WebSocket(getWsUrl());
  ws.addEventListener('message', () => listener());
  ws.addEventListener('close', () => {
    window.setTimeout(() => subscribeRealtimeMessages(listener), 1500);
  });
  return () => ws.close();
}

// MainShell.tsx / ChatPage.tsx
const unsubscribeRealtime = subscribeRealtimeMessages(() => {
  void refresh();
});
```

- [ ] **Step 6: 重新运行前端消息测试确认通过**

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 7: 提交消息阶段前端**

```bash
git add apps/web/src/api/chat.ts \
  apps/web/src/components/MainShell.tsx \
  apps/web/src/pages/ChatPage.tsx \
  apps/web/src/App.test.tsx \
  apps/web/src/styles.css
git commit -m "feat(web): realify message unread media and ws"
```

### Task 3: 补齐好友闭环与标签成员管理

**Files:**
- Modify: `/workspace/jiandanliao/apps/api/src/modules/contacts/contacts.service.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/contacts/contacts.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/contacts/contacts.routes.test.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/api/contacts.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/ContactsPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/FriendsRequestsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/ContactProfilePage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/router.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: 写好友申请、详情、管理动作的失败测试**

```ts
it('sends a friend request', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'POST',
    url: '/api/contacts/friend-requests',
    headers: { authorization: `Bearer ${token}` },
    payload: { phone: '855010188009', note: '你好，我想加你为好友' }
  });

  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toMatchObject({ status: '待通过' });
});

it('loads contact profile', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/contacts/profile?phone=855010188001',
    headers: { authorization: `Bearer ${token}` }
  });

  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toMatchObject({ phone: '855010188001' });
});
```

- [ ] **Step 2: 运行通讯录测试确认失败**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/contacts/contacts.routes.test.ts`
Expected: FAIL，提示新增路由或字段缺失。

- [ ] **Step 3: 最小实现好友申请、资料、删除/拉黑/举报与标签成员接口**

```ts
app.post('/contacts/friend-requests', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { phone: string; note?: string };
  return contactsService.createFriendRequest({
    phone: request.user.phone,
    targetPhone: body.phone,
    note: body.note
  });
});

app.get('/contacts/profile', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const query = request.query as { phone: string };
  return contactsService.getContactProfile({ ownerPhone: request.user.phone, targetPhone: query.phone });
});
```

- [ ] **Step 4: 扩展前端通讯录 API 与页面**

```ts
export async function createFriendRequest(phone: string, note: string) {
  return apiPost<FriendRequestRow>('/api/contacts/friend-requests', { phone, note });
}

export async function loadContactProfile(phone: string) {
  return apiGet<ContactProfileRow>(`/api/contacts/profile?phone=${encodeURIComponent(phone)}`);
}
```

```tsx
// ContactsPage.tsx
const [remoteRows, setRemoteRows] = React.useState<SearchEntryRow[]>([]);
React.useEffect(() => {
  void searchHub(keyword).then(setRemoteRows).catch(() => setRemoteRows([]));
}, [keyword]);

<Link to={`/h5/contacts/profile/${contact.phone}`}>查看资料</Link>
```

- [ ] **Step 5: 新增联系人资料页并补路由测试**

```tsx
export default function ContactProfilePage() {
  const { phone = '' } = useParams();
  const [profile, setProfile] = React.useState<ContactProfileRow | null>(null);

  React.useEffect(() => {
    void loadContactProfile(phone).then(setProfile);
  }, [phone]);

  return (
    <section className="h5-page">
      <header className="top-bar"><h1>联系人资料</h1></header>
      <div className="placeholder-list list-stack">
        <article className="list-row"><strong>{profile?.name || '--'}</strong></article>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: 重新运行前后端通讯录测试确认通过**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/contacts/contacts.routes.test.ts`
Expected: PASS

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 7: 提交好友与标签阶段**

```bash
git add apps/api/src/modules/contacts/contacts.service.ts \
  apps/api/src/modules/contacts/contacts.routes.ts \
  apps/api/src/modules/contacts/contacts.routes.test.ts \
  apps/web/src/api/contacts.ts \
  apps/web/src/pages/ContactsPage.tsx \
  apps/web/src/pages/FriendsRequestsPage.tsx \
  apps/web/src/pages/ContactProfilePage.tsx \
  apps/web/src/router.tsx \
  apps/web/src/App.test.tsx
git commit -m "feat: complete contact relationship workflow"
```

### Task 4: 补齐群管理页和群成员操作

**Files:**
- Modify: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.service.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/conversations/conversation.routes.test.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/api/chat.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/GroupChatsPage.tsx`
- Create: `/workspace/jiandanliao/apps/web/src/pages/ChatSettingsPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/router.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: 写群成员、邀请、退群页的失败测试**

```ts
it('lists group members', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/conversations/preview-group-agency/members',
    headers: { authorization: `Bearer ${token}` }
  });
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toEqual(expect.any(Array));
});

it('opens chat settings page', async () => {
  renderAt('/h5/chat/preview-group-agency/settings', { token: 'demo-token' });
  expect(await screen.findByRole('heading', { level: 1, name: '群聊设置' })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行群管理测试确认失败**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/conversations/conversation.routes.test.ts`
Expected: FAIL

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: 最小实现群成员列表接口**

```ts
app.get('/conversations/:id/members', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const { id } = request.params as { id: string };
  return service.listConversationMembers({ conversationId: id, phone: request.user.phone });
});
```

- [ ] **Step 4: 新增群设置页并接入邀请、退群**

```tsx
export default function ChatSettingsPage() {
  const { conversationId = '' } = useParams();
  const [members, setMembers] = React.useState<GroupMemberRow[]>([]);

  React.useEffect(() => {
    void loadConversationMembers(conversationId).then(setMembers);
  }, [conversationId]);

  return (
    <section className="h5-page">
      <header className="top-bar"><h1>群聊设置</h1></header>
      <div className="placeholder-list list-stack">
        {members.map((member) => <article key={member.userId} className="list-row">{member.name}</article>)}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: 重新运行群管理测试确认通过**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/conversations/conversation.routes.test.ts`
Expected: PASS

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交群管理阶段**

```bash
git add apps/api/src/modules/conversations/conversation.routes.ts \
  apps/api/src/modules/conversations/conversation.service.ts \
  apps/api/src/modules/conversations/conversation.routes.test.ts \
  apps/web/src/api/chat.ts \
  apps/web/src/pages/GroupChatsPage.tsx \
  apps/web/src/pages/ChatSettingsPage.tsx \
  apps/web/src/router.tsx \
  apps/web/src/App.test.tsx
git commit -m "feat: add group management pages"
```

### Task 5: 补齐我的与发现真实化能力

**Files:**
- Modify: `/workspace/jiandanliao/apps/api/src/modules/profile/profile.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/profile/profile.service.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/security/security.routes.ts`
- Modify: `/workspace/jiandanliao/apps/api/src/modules/security/security.service.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/profile/profile.routes.test.ts`
- Test: `/workspace/jiandanliao/apps/api/src/modules/security/security.routes.test.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/api/profile.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/api/security.ts`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/ProfilePage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/SecurityPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/SettingsPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/pages/ScanPage.tsx`
- Modify: `/workspace/jiandanliao/apps/web/src/App.test.tsx`

- [ ] **Step 1: 写资料编辑、黑名单、扫码上传的失败测试**

```ts
it('updates profile nickname', async () => {
  const token = signAccessToken({ sub: '855010100000', deviceId: 'ios-1' });
  const res = await app.inject({
    method: 'POST',
    url: '/api/profile',
    headers: { authorization: `Bearer ${token}` },
    payload: { displayName: '新的昵称' }
  });
  expect(res.statusCode).toBe(200);
  expect(JSON.parse(res.body)).toMatchObject({ displayName: '新的昵称' });
});

it('uploads scan image and resolves result', async () => {
  renderAt('/h5/discover/scan', { token: 'demo-token' });
  expect(await screen.findByLabelText('上传二维码图片')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行我的与发现测试确认失败**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/profile/profile.routes.test.ts apps/api/src/modules/security/security.routes.test.ts`
Expected: FAIL

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: FAIL

- [ ] **Step 3: 最小实现资料编辑和安全设置接口**

```ts
app.post('/profile', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  const body = request.body as { displayName?: string; avatarUrl?: string };
  return service.updateOverview({ phone: request.user.phone, ...body });
});

app.get('/security/devices', async (request, reply) => {
  if (!request.user?.phone) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  return service.listDevices(request.user.phone);
});
```

- [ ] **Step 4: 升级资料页、安全页和扫码页**

```tsx
// ProfilePage.tsx
<form onSubmit={handleSave}>
  <label className="search-box">
    <span>昵称</span>
    <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
  </label>
  <button className="primary-button" type="submit">保存资料</button>
</form>

// ScanPage.tsx
<label className="search-box" htmlFor="scan-image-upload">
  <span>上传二维码图片</span>
  <input
    id="scan-image-upload"
    aria-label="上传二维码图片"
    type="file"
    accept="image/*"
    onChange={(event) => {
      const file = event.target.files?.[0];
      if (file) void handleScanImage(file);
    }}
  />
</label>
```

- [ ] **Step 5: 重新运行我的与发现测试确认通过**

Run: `pnpm --filter @jianliao/api test -- --runInBand apps/api/src/modules/profile/profile.routes.test.ts apps/api/src/modules/security/security.routes.test.ts`
Expected: PASS

Run: `pnpm --filter @jianliao/web test -- --runInBand src/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交我的与发现阶段**

```bash
git add apps/api/src/modules/profile/profile.routes.ts \
  apps/api/src/modules/profile/profile.service.ts \
  apps/api/src/modules/security/security.routes.ts \
  apps/api/src/modules/security/security.service.ts \
  apps/api/src/modules/profile/profile.routes.test.ts \
  apps/api/src/modules/security/security.routes.test.ts \
  apps/web/src/api/profile.ts \
  apps/web/src/api/security.ts \
  apps/web/src/pages/ProfilePage.tsx \
  apps/web/src/pages/SecurityPage.tsx \
  apps/web/src/pages/SettingsPage.tsx \
  apps/web/src/pages/ScanPage.tsx \
  apps/web/src/App.test.tsx
git commit -m "feat: realify profile security and scan flows"
```

### Task 6: 全量回归、验收记录和正式仓库同步

**Files:**
- Modify: `/workspace/jiandanliao/docs/local/jiandanliao-final-acceptance.md`

- [ ] **Step 1: 更新验收文档**

```md
- 已补齐消息真链路：未读红点、已读状态、图片/语音消息、WebSocket 实时更新。
- 已补齐通讯录真链路：添加好友、好友资料、关系管理、标签成员管理。
- 已补齐群管理页：群成员、邀请成员、退群。
- 已补齐我的与发现高频真实化：资料编辑、安全设置、图片扫码。
```

- [ ] **Step 2: 运行 API 全量测试**

Run: `pnpm --filter @jianliao/api test -- --runInBand`
Expected: PASS

- [ ] **Step 3: 运行 API 构建**

Run: `pnpm --filter @jianliao/api build`
Expected: PASS

- [ ] **Step 4: 运行 Web 全量测试**

Run: `pnpm --filter @jianliao/web test -- --runInBand`
Expected: PASS

- [ ] **Step 5: 运行 Web 构建**

Run: `pnpm --filter @jianliao/web build`
Expected: PASS

- [ ] **Step 6: 启动 Web 手动验收**

Run: `pnpm --filter @jianliao/web dev -- --host 0.0.0.0 --port 4174`
Expected:
- 消息页显示未读徽标并可实时刷新。
- 聊天页可以发送文本、图片、语音。
- 通讯录可以搜索并发起好友申请。
- 群聊设置页可查看成员并执行邀请/退群。
- 个人资料可编辑，扫一扫可上传图片识别。

- [ ] **Step 7: 提交验收与推仓**

```bash
git add docs/local/jiandanliao-final-acceptance.md
git commit -m "docs: record deep wechat realify acceptance"
git push origin main
```

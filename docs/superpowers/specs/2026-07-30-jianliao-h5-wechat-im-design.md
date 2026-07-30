# 柬聊 H5 微信级四 Tab + 真实 IM（文本/图片/语音）设计稿

## 目标

在现有柬聊 H5 基础上，实现微信风格的底部四 Tab，并且完成真实 IM 行为闭环：

- 四 Tab：`消息 / 通讯录 / 发现 / 我的`
- 路由：采用 URL 路由，可刷新恢复、可分享直达、可浏览器返回
- 强登录：未登录强制进入登录/注册；登录后刷新不掉线
- 会话范围：`单聊 + 群聊 + 系统消息`（均参与未读红点与会话排序）
- 消息类型：`文本 + 图片 + 语音（录音发送 + 播放）`
- 实时性：通过 WebSocket 推送新消息/未读变化/会话变化

本设计以“生产运营级”可落地为标准：需具备基本安全、可回归测试、可部署升级与故障可定位能力。

## 非目标（本轮不做）

- 朋友圈/视频号/小程序等发现页能力的真实业务实现（仅 UI 入口与占位）
- 语音转文字、噪声抑制、回声消除等高级音频能力
- 消息撤回/引用/转发/多选/收藏/置顶/免打扰（可留接口位但不实现）
- 端到端加密
- 多端同时登录的复杂冲突策略（先实现基本一致性）

---

## 术语

- **Tab**：底部导航项（消息/通讯录/发现/我的）
- **Conversation**：会话（单聊/群聊/系统）
- **Message**：消息（文本/图片/语音）
- **Unread**：未读数/红点

---

## 页面与路由

### 路由清单（H5）

| 路由 | 页面 | 说明 |
|---|---|---|
| `/h5/login` | 登录页 | 强登录入口 |
| `/h5/register` | 注册页 | 强登录入口 |
| `/h5/messages` | 消息 Tab | 会话列表 |
| `/h5/chat/:conversationId` | 聊天页 | 进入某个会话 |
| `/h5/contacts` | 通讯录 Tab | 联系人/群入口/搜索 |
| `/h5/discover` | 发现 Tab | 微信式入口列表（占位为主） |
| `/h5/me` | 我的 Tab | 个人信息 + 设置入口 |
| `/h5/settings` | 设置页 | 从“我的”进入 |

### UI 结构规则

- TabBar 在四个 Tab 页面常驻（messages/contacts/discover/me）
- 进入聊天页 `/h5/chat/:conversationId` 时 TabBar 默认隐藏（更像微信）
- 顶部导航栏标题随路由变化

---

## 登录态（强登录）

### 客户端状态

- 存储：`accessToken`（必要时 `refreshToken`）
- 启动流程：
  1. 读取 token
  2. 无 token：跳 `/h5/login`
  3. 有 token：并行执行
     - 拉取会话列表、未读信息
     - 建立 WebSocket 连接并鉴权

### API 鉴权策略

- 所有 IM 相关接口（会话/消息/联系人/个人信息/系统通知）必须鉴权
- 任何 401：
  - 清理 token
  - 跳 `/h5/login`
  - 断开 ws

---

## IM 数据模型（概念）

> 本模型用于对齐前端行为与后端存储/推送。具体字段以现有表结构为基础扩展。

### Conversation

- `id`
- `type`: `DIRECT | GROUP | SYSTEM`
- `title`（群名称/系统会话名称）
- `lastMessagePreview`（用于会话列表摘要）
- `lastMessageAt`
- `unreadCount`
- `updatedAt`

### Message

- `id`
- `conversationId`
- `senderId`
- `type`: `TEXT | IMAGE | VOICE | SYSTEM`
- `status`: `SENT | DELIVERED | READ`（可先实现 SENT/READ）
- `body`（按 type 不同结构不同）
- `createdAt`

#### body 结构建议

**TEXT**
```json
{ "text": "hello" }
```

**IMAGE**
```json
{ "fileId": "xxx", "url": "https://...", "width": 1080, "height": 720 }
```

**VOICE**
```json
{ "fileId": "xxx", "url": "https://...", "durationMs": 3200 }
```

**SYSTEM**
```json
{ "title": "系统提醒", "content": "..." , "actionUrl": "/h5/..." }
```

---

## 后端接口（初稿）

> 按现有 `apps/api` 的 routes 体系扩展。URL 前缀示例以 `/api` 表示。

### 会话

- `GET /api/conversations?cursor=&limit=`
  - 返回会话列表（含未读数、lastMessage、时间）
- `POST /api/conversations`
  - 创建会话（单聊/群聊/系统会话触发可内部创建）
- `GET /api/conversations/:id`
  - 获取会话详情
- `POST /api/conversations/:id/read`
  - 标记会话已读（未读清零）

### 消息

- `GET /api/conversations/:id/messages?cursor=&limit=`
  - 拉取消息分页
- `POST /api/conversations/:id/messages`
  - 发送消息（文本/图片/语音/系统）

### 文件（图片/语音）

- `POST /api/files/upload`
  - 上传文件，返回 `fileId` 与访问 URL
  - 需要支持图片与音频

### 通讯录

- `GET /api/contacts?cursor=&limit=`
  - 联系人列表
- `GET /api/contacts/search?q=`
  - 搜索联系人（可选，第一期可先前端本地过滤）

### 我的

- `GET /api/me`
  - 个人信息（头像、昵称、账号标识）
- `POST /api/logout`
  - 登出（可选；也可仅清 token）

---

## WebSocket（apps/ws）

### 连接与鉴权

- 建议：`wss://<host>/ws?token=...` 或连接后发送 `auth` 消息
- 连接成功后，服务端推送与该用户相关的事件

### 事件清单（最小可用）

1. `message.created`
```json
{
  "type": "message.created",
  "data": {
    "conversationId": "c1",
    "message": { "...": "..." }
  }
}
```

2. `conversation.updated`
```json
{
  "type": "conversation.updated",
  "data": {
    "conversationId": "c1",
    "lastMessagePreview": "...",
    "lastMessageAt": "..."
  }
}
```

3. `unread.updated`
```json
{
  "type": "unread.updated",
  "data": {
    "conversationId": "c1",
    "unreadCount": 3
  }
}
```

4. `system.notification`
```json
{
  "type": "system.notification",
  "data": {
    "title": "活动提醒",
    "content": "...",
    "actionUrl": "/h5/..."
  }
}
```

### 前端接收策略

- 收到 `message.created`：
  - 若当前在该会话页面：追加消息并触发已读（或延迟触发）
  - 否则：增加未读数并提升会话排序
- 收到 `unread.updated`：
  - 更新会话列表对应条目的红点/数字

---

## 前端交互设计（微信对齐点）

### TabBar

- 点击 Tab：切换 URL 并切换页面
- Tab 选中态：高亮
- “消息”Tab 支持全局红点（可选：累加未读总数）

### 消息 Tab（会话列表）

- 支持加载状态、空状态
- 会话项点击进入聊天页
- 会话摘要：
  - TEXT：显示文本截断
  - IMAGE：显示 `[图片]`
  - VOICE：显示 `[语音]`
  - SYSTEM：显示系统标题或 `[系统消息]`

### 聊天页

- 文本：输入框 + 发送按钮
- 图片：选择图片 → 上传 → 发送图片消息
- 语音：录音按钮
  - 录音交互：优先“按住说话”（移动端更像微信）；如浏览器限制则退化为“点开始/点结束”
  - 录音格式：优先 `audio/webm` 或 `audio/ogg`（按浏览器能力选择）
  - 播放：点击播放，显示时长
- 已读：进入会话立即调用 `POST /read` 或基于 ws 上报

### 通讯录

- 顶部搜索框
- 列表按首字母分组（第一期可在前端按拼音首字母计算）
- 点击联系人：打开单聊（create or open）
- 群聊入口：展示你加入的群列表（若后端暂缺，先占位）

### 发现/我的

- 发现：入口列表，先占位
- 我的：头像昵称 + 设置入口 + 退出登录

---

## 生产运营级要求（本功能相关）

### 可靠性

- 关键 API：会话列表、消息发送、文件上传需要有清晰错误提示
- WebSocket：断线重连（指数退避），并在重连后做一次增量同步（至少刷新会话列表）

### 安全

- 上传文件必须限制类型/大小
- 发送消息接口必须鉴权
- 基本防刷：对发送消息、上传接口做限流（至少服务端）

### 可观测性（最小）

- ws 连接数、连接失败率、重连次数（至少日志）
- 消息发送成功率、文件上传失败率（至少日志）

---

## 验收标准（必须全部满足）

1. 四 Tab 可点击切换，URL 正确变化，刷新仍停留在当前 Tab
2. 未登录访问 `/h5/*` 会跳转登录；登录后刷新不掉线
3. 会话列表能显示未读红点/数字；进入会话后未读清零
4. 聊天页能发送/展示：文本、图片、语音；语音支持录制与播放
5. 系统消息会话存在并参与未读与排序（可用最小系统推送验证）
6. ws 断线后能自动重连，重连后会话列表不会长期失真


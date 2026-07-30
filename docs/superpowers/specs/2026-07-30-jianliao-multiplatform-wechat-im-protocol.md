# 柬聊多端微信级 IM 统一协议（H5/Android/iOS + Admin 联动）

## 目标

将柬聊用户端 **H5 / Android / iOS** 三端统一到同一套“微信级”能力标准，并与 **admin-web / admin-desktop** 后台运营能力联动：

- 四 Tab：消息 / 通讯录 / 发现 / 我的（URL/原生路由一致）
- 强登录：未登录无法进入 IM；登录后刷新/重启保持登录态
- 会话范围：单聊 + 群聊 + 系统消息（均参与未读红点与会话排序）
- 消息类型：文本 + 图片 + 语音（录音发送 + 播放）
- 实时性：WebSocket 推送新消息、未读变化、系统通知
- 后台功能：凡属于“用户可用”的后台配置/内容，必须同步落到用户前端可见与可用

用户已确认：
- 账号体系：`手机号即账号`（前端仍可显示“账号”，但输入必须是手机号含区号）
- 语音：服务端统一转码（推荐）以保证跨端播放一致

---

## 统一原则（必须遵守）

1. **协议优先**：三端 UI 可以各自适配，但消息/会话/未读/文件等数据协议必须一致。
2. **能力同标**：H5/Android/iOS 最终能力必须一致（同一消息类型都能发送、展示、播放）。
3. **可运营**：必须具备最小风控、审计与可观测性（至少日志 + 关键指标/告警入口）。
4. **后台→用户闭环**：后台做出来的“用户相关配置/内容”，必须有用户端落点，不允许“只做后台不做前台”。

---

## 账号体系（手机号即账号）

### 用户输入规则

- 登录/注册 UI 显示为“账号”，但实际校验为 **手机号（建议 E.164）**
  - 例：`+855xxxxxxxx`
- 密码：最小长度与复杂度按现有规则（若未定义，默认 >= 6）

### Token

- `accessToken`：API 与 WS 必须携带
- 可选 `refreshToken`：用于续期（如暂未实现，可先只做 accessToken + 过期重新登录）

### 登录态保持（客户端）

- H5：localStorage + 内存态（刷新恢复）
- Android/iOS：Keychain/Keystore + 内存态（重启恢复）

---

## 会话（Conversation）统一模型

### 类型

- `DIRECT`：单聊
- `GROUP`：群聊
- `SYSTEM`：系统会话（活动、公告、机器人提醒等）

### 统一字段

- `id: string`
- `type: 'DIRECT'|'GROUP'|'SYSTEM'`
- `title: string | null`
- `avatarUrl: string | null`（可选）
- `lastMessagePreview: string | null`
- `lastMessageAt: string | null`（ISO）
- `unreadCount: number`
- `updatedAt: string`（ISO）
- 可选扩展（留接口位）：`isPinned`, `isMuted`

### 会话列表排序规则

1. 置顶会话（若实现）优先
2. 其他会话按 `lastMessageAt` 倒序
3. 无 lastMessageAt 的会话放底部

---

## 消息（Message）统一模型

### 类型

- `TEXT`
- `IMAGE`
- `VOICE`
- `SYSTEM`

### 统一字段

- `id: string`
- `conversationId: string`
- `senderId: string`
- `type: 'TEXT'|'IMAGE'|'VOICE'|'SYSTEM'`
- `status: 'SENT'|'DELIVERED'|'READ'`（第一期最小可只保证 SENT/READ）
- `body: object`（见下）
- `createdAt: string`（ISO）

### body 协议（必须一致）

**TEXT**
```json
{ "text": "hello" }
```

**IMAGE**
```json
{ "fileId": "f1", "url": "https://...", "width": 1080, "height": 720 }
```

**VOICE**
```json
{ "fileId": "f2", "url": "https://...", "durationMs": 3200, "codec": "aac", "mime": "audio/aac" }
```

**SYSTEM**
```json
{ "title": "系统提醒", "content": "...", "actionUrl": "/h5/..." }
```

---

## 文件上传与转码（图片 + 语音）

### 统一上传接口

`POST /api/files/upload`

请求：
- multipart form-data
- 字段：`file`
- 可选：`kind=image|voice`

响应：
```json
{
  "fileId": "xxx",
  "url": "https://cdn/...",
  "mime": "image/jpeg",
  "size": 12345,
  "width": 1080,
  "height": 720,
  "durationMs": 3200,
  "transcoded": true
}
```

### 图片规则

- 支持常见格式：jpg/png/webp（可选 gif）
- 限制大小（例：<= 10MB）
- 前端发送 IMAGE 消息时必须携带 `width/height`（便于渲染占位）

### 语音规则（服务端统一转码）

目标：跨端播放一致，避免 H5/机型兼容问题。

- Android/iOS 录音建议：
  - 采集：aac/m4a（推荐）或 opus（备选）
- H5：
  - 采集：MediaRecorder 输出 webm/opus 或 ogg/opus（按浏览器能力）
- 服务端：
  - 接收后统一转码为 `aac`（或 `mp3`），并返回统一 `url` 与 `mime`
  - `VOICE.body` 必须携带 `durationMs`、`codec`、`mime`

---

## 未读与已读（微信级）

### 未读计算

- `unreadCount` 以“会话维度”维护
- 新消息到达该会话且用户不在该会话阅读时：未读 +1（或按条数累加）

### 已读触发

当用户进入 `/chat/:conversationId`（或原生聊天页）：

- 客户端调用 `POST /api/conversations/:id/read`
- 服务端将该会话 unread 清零，并通过 ws 推送 `unread.updated`

---

## WebSocket 统一事件

### 鉴权

建议二选一（两种都可支持）：

1. `wss://<host>/ws?token=<accessToken>`
2. connect 后发送：
```json
{ "type": "auth", "token": "..." }
```

### 事件（统一 JSON）

**message.created**
```json
{ "type": "message.created", "data": { "conversationId": "c1", "message": { "id": "...", "type": "TEXT", "body": {"text":"hi"}, "createdAt":"..." } } }
```

**conversation.updated**
```json
{ "type": "conversation.updated", "data": { "conversationId": "c1", "lastMessagePreview": "...", "lastMessageAt": "..." } }
```

**unread.updated**
```json
{ "type": "unread.updated", "data": { "conversationId": "c1", "unreadCount": 0 } }
```

**system.notification**
```json
{ "type": "system.notification", "data": { "title":"活动提醒", "content":"...", "actionUrl": "/h5/..." } }
```

### 客户端处理策略（统一）

- `message.created`：
  - 若当前会话打开：追加并触发 read（可延迟 300ms 防抖）
  - 否则：增加 unread 并提升会话排序
- `unread.updated`：直接刷新会话列表对应会话的红点
- `system.notification`：写入 SYSTEM 会话（无则创建）并增加未读

---

## 多端 UI 对齐点（微信风格）

### TabBar（四 Tab）

- 选中态高亮
- 支持红点（会话未读总数）显示在“消息”Tab（可选：只显示点/显示数字）

### 消息页（会话列表）

- 每行：头像/标题/摘要/时间/未读
- 摘要规则：
  - IMAGE → `[图片]`
  - VOICE → `[语音]`
  - SYSTEM → 系统标题或 `[系统消息]`

### 聊天页

- 文本输入 + 发送
- 图片按钮：选择图片 → 上传 → 发送
- 语音按钮：按住录音（推荐）/或点击开始结束（兼容）
- 语音播放：点击播放、显示时长

### 通讯录

- 顶部搜索
- A-Z 分组（可先前端本地分组）
- 点击联系人：打开/创建单聊会话
- 群聊入口：你加入的群列表

### 发现/我的

- 发现：入口列表（第一期可占位）
- 我的：个人信息 + 设置 + 退出登录

---

## 后台（admin-web/admin-desktop）与用户前端映射

> 规则：后台存在“用户相关能力”的，必须同时有用户端落点。

| 后台模块/能力 | 数据来源 | 用户端落点 | 行为要求 |
|---|---|---|---|
| Branding（品牌/主题配置） | `branding_configs` | 登录页/注册页/启动页主题 | 三端一致；节日主题优先级最高 |
| 公告（Announcements） | `announcements` | SYSTEM 会话 | 新公告推送到系统会话并计入未读 |
| 活动（Activity campaigns） | `activity_campaigns` | SYSTEM 会话 + 发现入口（可选） | 活动提醒可作为系统消息；可跳转 actionUrl |
| 举报（Reports） | `reports` | 用户端举报入口（后续） | 后台处理状态应可追溯 |
| 管理操作日志 | `admin_actions` | 无（后台内部） | 必须完整留痕 |

---

## 生产运营级硬要求（本轮）

### 安全

- 发送消息 / 上传文件 必须鉴权
- 对发送消息/上传加基本限流（服务端）
- 上传文件类型/大小校验

### 可观测性（最小）

- ws 连接/断开/重连日志
- 消息发送成功率/失败率日志
- 上传成功率/失败率日志

### 可回归

- 至少有：会话列表、切换 tab、发送文本、上传图片、发送语音的自动化测试或最小 smoke 测试

---

## 验收标准

1. 三端（H5/Android/iOS）四 Tab 全部可用，且行为一致
2. 强登录：未登录无法进入 IM；登录后刷新/重启仍保持
3. 会话：单聊/群聊/系统会话都参与未读红点与排序
4. 消息：文本/图片/语音三类都可发送与展示；语音可录制与播放；跨端可播放
5. ws：新消息与未读能实时同步到会话列表与 Tab 红点
6. 后台：品牌/公告/活动配置能在用户端看到对应效果（主题/系统消息/跳转）


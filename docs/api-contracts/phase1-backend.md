# 柬聊阶段 1 后端 API / WS 契约

本文档固化阶段 1 共享后端平台对多端客户端公开的最小联调契约，覆盖 HTTP API、WebSocket 事件、鉴权约定和部署健康检查。

## 1. 基线信息

- HTTP 基础前缀：`/api`
- WS 连接入口：`/socket.io/`
- API 服务健康检查：`GET /api/health`
- WS 服务健康检查：`GET /health`
- 默认编码：`application/json`

## 2. 鉴权约定

### 2.1 用户接口

除登录、注册、刷新令牌、健康检查外，其余用户接口都要求：

```http
Authorization: Bearer <accessToken>
```

当前服务端通过 token 解析出 `request.user.phone` 作为业务身份。

### 2.2 后台接口

后台管理接口使用请求头透传管理员身份：

```http
x-admin-role: SUPER_ADMIN | OPERATOR | AUDITOR
x-admin-id: <optional-admin-id>
```

- 只读接口允许：`SUPER_ADMIN`、`OPERATOR`、`AUDITOR`
- 写接口允许：`SUPER_ADMIN`、`OPERATOR`

## 3. HTTP API 契约

### 3.1 健康检查

#### `GET /api/health`

响应：

```json
{
  "ok": true,
  "service": "api"
}
```

### 3.2 认证

#### `POST /api/auth/register`

请求体：

```json
{
  "phone": "85510000001",
  "password": "pass123456",
  "deviceId": "android-demo-1",
  "platform": "ANDROID",
  "nickname": "演示用户"
}
```

#### `POST /api/auth/login/password`

请求体：

```json
{
  "phone": "85510000001",
  "password": "pass123456",
  "deviceId": "android-demo-1",
  "platform": "ANDROID"
}
```

#### `POST /api/auth/refresh-token`

请求体：

```json
{
  "phone": "85510000001",
  "refreshToken": "<refreshToken>",
  "deviceId": "android-demo-1"
}
```

典型响应字段：

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "user": {
    "id": "u_demo_1",
    "phone": "85510000001",
    "nickname": "演示用户"
  }
}
```

### 3.3 会话

#### `GET /api/conversations`

说明：返回当前登录用户可见的会话列表。

#### `POST /api/conversations/dm`

请求体：

```json
{
  "peerPhone": "85510000002"
}
```

### 3.4 消息

#### `GET /api/messages?conversationId=<id>&limit=50`

说明：仅允许会话成员读取，非成员返回 `403 FORBIDDEN`。

#### `POST /api/messages`

请求体：

```json
{
  "conversationId": "c_demo_1",
  "type": "TEXT",
  "body": {
    "text": "你好"
  }
}
```

支持类型：`TEXT | IMAGE | FILE | AUDIO | VIDEO`

#### `POST /api/messages/:id/receipt`

请求体：

```json
{
  "type": "READ"
}
```

支持回执类型：`DELIVERED | READ`

### 3.5 文件上传元数据

#### `POST /api/files/upload`

请求体：

```json
{
  "filename": "demo.jpg",
  "mimeType": "image/jpeg",
  "size": 102400
}
```

响应：

```json
{
  "fileId": "<uuid>",
  "objectKey": "uploads/<timestamp>-demo.jpg",
  "uploadUrl": "http://minio:9000/uploads/<timestamp>-demo.jpg"
}
```

限制：

- 仅接受 `image/*`
- 禁止危险后缀
- 单文件最大 50MB

### 3.6 后台管理

#### `GET /api/admin/users`

说明：返回后台可见的用户列表。

#### `POST /api/admin/users/:id/ban`

说明：封禁指定用户并记录审计日志。

#### `GET /api/admin/reports`

说明：返回举报列表。

#### `POST /api/admin/announcements`

请求体：

```json
{
  "title": "系统公告",
  "content": "维护窗口将于今晚开始"
}
```

#### `GET /api/admin/audit-actions`

说明：返回后台审计动作列表。

## 4. HTTP 错误语义

统一错误码字段：`code`

- `UNAUTHORIZED`：未登录或缺少身份头
- `FORBIDDEN`：已登录但无权访问目标资源
- `BAD_REQUEST`：请求参数不合法
- `NOT_FOUND`：目标资源不存在
- `NOT_IMPLEMENTED`：依赖环境未启用，例如缺失数据库连接

## 5. WebSocket 契约

### 5.1 连接方式

客户端通过 `Socket.IO` 连接 `/socket.io/`，建立连接后按以下顺序发送事件：

1. `auth:authenticate`
2. `conversation:join`

### 5.2 客户端上行事件

#### `auth:authenticate`

```json
{
  "userId": "u_demo_1"
}
```

作用：将用户标记为在线。

#### `conversation:join`

```json
{
  "conversationId": "c_demo_1"
}
```

作用：加入 `conversation:<conversationId>` 房间，接收该会话实时消息与回执。

### 5.3 服务端下行事件

#### `message:new`

来源：Redis 频道 `jianliao:message:new`

```json
{
  "id": "m_demo_1",
  "conversationId": "c_demo_1",
  "senderId": "u_demo_1",
  "type": "TEXT",
  "body": {
    "text": "你好"
  },
  "status": "SENT",
  "createdAt": "2026-07-29T12:00:00.000Z"
}
```

#### `receipt:new`

来源：Redis 频道 `jianliao:receipt:new`

```json
{
  "messageId": "m_demo_1",
  "userId": "u_demo_2",
  "type": "READ",
  "createdAt": "2026-07-29T12:01:00.000Z"
}
```

## 6. Compose 联调约定

- `nginx` 反向代理 `/api/` 到 API 服务
- `nginx` 反向代理 `/socket.io/` 到 WS 服务
- `api` 依赖：`mysql`、`redis`、`minio`
- `ws` 依赖：`api`、`redis`
- compose 健康检查依赖：
  - `api`：`GET http://localhost:3001/api/health`
  - `ws`：`GET http://localhost:3002/health`

以上契约作为阶段 1 Android / iOS / Web 后台 / Windows 后台并行联调的统一基线。

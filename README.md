# 柬单聊 Jiandanliao

柬单聊是一个面向阶段 1 快速联调与试运营的多端即时通讯项目，当前仓库已经包含共享后端、Android 用户端、iOS 用户端、统一管理后台，以及本地与服务器部署基线。

项目目标不是一次性做成“大而全”的 IM 平台，而是先把最小可演示、可联调、可部署的闭环跑通，再逐步扩展群聊、运营能力和更完整的 IM 能力。

## 当前包含

- `apps/api`：共享 HTTP API
- `apps/ws`：Socket.IO / WebSocket 实时服务
- `apps/android`：Android 原生用户端
- `apps/ios`：iOS 原生用户端
- `apps/admin-desktop`：统一管理后台（Renderer 作为服务器后台界面，Electron 作为 Windows 打包壳）
- `infra/compose`：Docker Compose 部署编排
- `infra/nginx`：统一入口与反向代理
- `infra/mysql`：阶段 1 基础表结构

## 阶段 1 能力

当前阶段 1 重点是“基础聊天 + 最小后台 + 可部署基线”，包括：

- 注册、密码登录、刷新令牌
- 单聊、文本消息、图片消息
- Socket.IO 实时消息与回执
- 后台用户列表、封禁、举报、公告、审计
- Nginx + API + WS + MySQL + Redis + MinIO 的部署基线

## 仓库结构

```text
apps/
  api/             共享后端 API
  ws/              实时服务
  android/         Android 原生工程
  ios/             iOS 原生工程
  admin-desktop/   统一管理后台
infra/
  compose/         Docker Compose 配置
  nginx/           Nginx 配置
  mysql/           MySQL 初始化 SQL
docs/
  api-contracts/   接口契约
  deploy/          部署文档
  local/           本地联调文档
```

## 本地快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动阶段 1 依赖服务

```bash
pnpm dev:phase1-up
```

### 3. 运行 smoke 检查

```bash
pnpm dev:phase1-smoke
```

### 4. 初始化演示数据

```bash
bash scripts/deploy/init-phase1-data-compose.sh
```

### 5. 运行集成测试

```bash
pnpm vitest run tests/integration/phase1-local-baseline.test.ts tests/integration/mobile-e2e-config.test.ts tests/integration/admin-console-parity.test.ts tests/integration/deploy-env-baseline.test.ts
```

## 常用入口

本地主线默认入口：

- API：`http://127.0.0.1/api`
- WS：`http://127.0.0.1/socket.io/`
- Uploads：`http://127.0.0.1/uploads/`

Android 模拟器默认入口：

- API：`http://10.0.2.2/api`
- WS：`http://10.0.2.2`

## 详细文档

### 联调

- [阶段 1 本地主线联调清单](docs/local/phase1-e2e-checklist.md)
- [阶段 1 后台联调清单](docs/local/phase1-admin-e2e.md)
- [阶段 1 API / WS 契约](docs/api-contracts/phase1-backend.md)

### 部署

- [阶段 1 服务器部署说明](docs/deploy/phase1-server.md)
- [宝塔终端一键部署说明](docs/deploy/baota-terminal-one-click.md)

### 设计与计划

- [阶段 1 并行联调与部署设计](docs/superpowers/specs/2026-07-29-jianliao-phase1-parallel-e2e-design.md)
- [阶段 1 并行联调与部署实施计划](docs/superpowers/plans/2026-07-29-jianliao-phase1-parallel-e2e.md)

## 宝塔终端一键部署

如果你在宝塔面板里直接用终端部署，可以参考完整文档：

- [宝塔终端一键部署说明](docs/deploy/baota-terminal-one-click.md)

最短流程是：

```bash
cd /opt
git clone https://github.com/domile168789-lgtm/jianliao.git
cd /opt/jianliao
cp infra/compose/.env.example infra/compose/.env
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

## 项目说明

### 技术栈

- 后端：TypeScript、Fastify、MySQL、Redis、Socket.IO
- 存储：MinIO
- 部署：Docker Compose、Nginx
- Android：Kotlin + Compose
- iOS：SwiftUI
- 管理后台：Electron + React（Renderer 同时用于服务器后台页面）

### 当前状态

已完成：

- 多端阶段 1 骨架
- 本地联调基线脚本
- 管理后台统一为单一实现
- Android / iOS 联调入口对齐
- 环境变量驱动的服务器部署基线

仍需在真实环境验证：

- Docker 实际启动链路
- Android 完整 SDK 环境下的最终构建
- 真机或服务器域名联调

## 发布前检查

上线前建议至少确认：

- `pnpm dev:phase1-smoke` 通过
- 初始化脚本成功执行
- 管理后台能查用户、封禁、发公告、看审计
- 两台客户端能互发文本和图片
- 回执和实时消息正常

## 备注

当前仓库默认使用 `master` 分支，并已同步到：

- GitHub: `https://github.com/domile168789-lgtm/jianliao`

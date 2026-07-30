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

## 用户端功能

当前仓库里的用户端覆盖 `Web/H5`、`Android`、`iOS` 三端，已规划并接入以下核心功能：

### 账号与启动

- 账号注册
- 密码登录
- 登录态恢复
- 封禁状态提示
- 下载引导与版本提示

### 消息主链路

- 会话列表
- 单聊
- 群聊
- 文本消息
- 图片消息
- 送达与已读回执
- 系统通知会话

### 联系人与群

- 联系人列表
- 搜索与发起单聊
- 创建群
- 群成员查看
- 群公告查看
- 举报用户 / 举报群 / 举报消息

### 发现与运营入口

- 发现页
- 活动中心入口
- 系统公告入口
- 邀请推广入口
- 钱包 / 收益 / 代理入口

### 我的与安全

- 个人资料页
- 钱包页
- 收益页
- 代理页
- 系统通知页
- 设置页
- 安全页
- 退出登录

### 当前用户端说明

- `Web/H5`：当前是最完整、最方便直接预览的一端
- `Android`：页面结构与数据入口已补齐，最终 APK 构建仍需完整 Android 构建环境验证
- `iOS`：页面结构与轻量接口接线已补齐，最终编译仍需 macOS + Xcode 环境验证

## 管理后台功能

当前仓库只保留一个统一管理后台：`apps/admin-desktop`

### 后台模块

- 仪表盘
- 用户管理
- 群组管理
- 群主管理
- 举报审核
- 公告发布
- 审计记录
- 财务报表
- 代理管理
- 活动管理
- 品牌配置

### 已支持的后台能力

- 用户列表查询
- 用户封禁与状态处置
- 举报查看与处理
- 公告发布并下发系统通知
- 活动创建
- 仪表盘关键指标展示
- 后台品牌与展示信息配置

### 当前后台说明

- `admin-desktop` 的 React Renderer 同时用于服务器后台页面预览
- Electron 壳用于后续 Windows 桌面后台打包
- 群组、群主管理、财务、代理等页面已接入统一后台导航
- 部分页面仍混合真实数据、推导数据和演示态提示，后续会继续收口到完整真实接口

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
- [柬单聊全端交付设计](docs/superpowers/specs/2026-07-30-jiandanliao-full-delivery-design.md)
- [柬单聊全端交付实施计划](docs/superpowers/plans/2026-07-30-jiandanliao-full-delivery.md)

## 宝塔终端一键部署

如果你在宝塔面板里直接用终端部署，可以参考完整文档：

- [宝塔终端一键部署说明](docs/deploy/baota-terminal-one-click.md)

最短流程是：

```bash
cd /opt
git clone https://github.com/domile168789-lgtm/jiandanliao.git
cd /opt/jiandanliao
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

当前仓库默认主线分支为 `main`，并已同步到：

- GitHub: `https://github.com/domile168789-lgtm/jiandanliao`

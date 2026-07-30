# 阶段 1 服务器部署（nginx + api + ws + mysql + redis + minio）

本文档用于把 `jianliao-platform` 的阶段 1 后端能力部署到服务器，并提供安卓/iOS/统一管理后台可直接联调的统一入口。

如果你是在宝塔面板里直接通过终端部署，优先参考：

- `docs/deploy/baota-terminal-one-click.md`

如果你要在正式 Rocky 9.4 服务器上完成部署、备份、恢复与故障演练，优先参考：

- `docs/deploy/rocky9-production-runbook.md`

## 目标

- 通过 `docker compose` 启动：`nginx/api/ws/mysql/redis/minio`
- 统一对外入口：
  - HTTP API：`http(s)://<域名>/api/*`
  - WS（Socket.IO）：`http(s)://<域名>/socket.io/*`
  - 文件直传/访问：`http(s)://<域名>/uploads/*`
- 健康检查：
  - `GET /healthz`（nginx）
  - `GET /api/health`（api）
  - `GET /health`（ws）

## 端口规划（建议）

- 对外暴露：
  - `80`（nginx）
  - （可选）`443`（nginx，配置证书后开启）
- 建议仅内网或不暴露：
  - `3001`（api）
  - `3002`（ws）
  - `3306`（mysql）
  - `6379`（redis）
  - `9000/9001`（minio 与控制台）

> 当前 `infra/compose/docker-compose.yml` 默认暴露了这些端口，正式上线建议收紧，只保留 `80/443`。

## 环境变量

默认 `docker-compose.yml` 已带一套可跑通的兜底值，但服务器部署建议显式使用 `infra/compose/.env`：

- `JWT_SECRET`：32 位以上随机字符串
- `MYSQL_ROOT_PASSWORD`：MySQL root 密码
- `MYSQL_DATABASE`：默认 `jianliao`
- `REDIS_URL`：默认 `redis://redis:6379`
- `MINIO_ENDPOINT`：对外给客户端返回的上传访问基址，推荐填 `http(s)://<域名>`
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- `API_PORT` / `WS_PORT`：默认 `3001 / 3002`。如果继续使用仓库内置 `infra/nginx/default.conf`，建议保持默认值。
- `DOCKER_LOG_MAX_SIZE` / `DOCKER_LOG_MAX_FILE`：控制容器日志轮转大小与保留份数。
- `PHASE1_BACKUP_DIR`：备份脚本默认输出目录。

## 部署前准备

1. 复制环境变量模板

```bash
cd /opt/jianliao-platform
cp infra/compose/.env.example infra/compose/.env
```

2. 编辑 `infra/compose/.env`

- 必填：`JWT_SECRET`、`MYSQL_ROOT_PASSWORD`、`MINIO_ROOT_PASSWORD`
- 按需修改：`MYSQL_DATABASE`、`MINIO_ROOT_USER`
- 如果安卓/iOS/管理后台通过域名联调上传，设置 `MINIO_ENDPOINT=http(s)://<域名>`
- 若沿用当前 nginx 反代，请保持 `API_PORT=3001`、`WS_PORT=3002`

## 启动步骤

1. 在服务器准备代码

建议把整个仓库放到某个目录（示例：`/opt/jianliao-platform`）。

2. 启动服务

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

3. 先做 compose 配置展开校验

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml config
```

4. 验证健康检查

```bash
curl -sS http://127.0.0.1/healthz
curl -sS http://127.0.0.1/api/health
curl -sS http://127.0.0.1/health
```

5. 初始化演示数据（可选，用于联调）

```bash
cd /opt/jianliao-platform
bash scripts/deploy/init-phase1-data-compose.sh
```

## 备份与恢复入口

在 Rocky 9.4 服务器上建议先完成一次真实演练，确认 MySQL、MinIO 与部署配置都能被回收：

```bash
cd /opt/jianliao-platform
bash scripts/deploy/backup-phase1.sh
```

恢复 MySQL 时执行：

```bash
cd /opt/jianliao-platform
bash scripts/deploy/restore-phase1.sh backups/phase1/<timestamp>/mysql-<timestamp>.sql
```

如果需要连同 MinIO 对象一起恢复，可追加第二个参数传入 `minio-<timestamp>.tar.gz`。完整的 Rocky 9.4 运维流程、firewalld 放行、健康检查、回滚与故障排查说明见 `docs/deploy/rocky9-production-runbook.md`。

## MinIO 与上传说明（阶段 1 直传）

阶段 1 的客户端上传流程为：

1. `POST /api/files/upload` 获取 `{ uploadUrl, objectKey, fileId }`
2. 客户端 `PUT uploadUrl` 直传二进制
3. 客户端再 `POST /api/messages` 发图片消息（body 带 `objectKey/url` 等元数据）

为了让「客户端直传」在不做签名的情况下能快速跑通，本仓库的 compose 启动时会自动执行：

- 创建 MinIO bucket：`uploads`
- 设置 `uploads` 为匿名 public

后续如需收紧安全策略，建议升级为「签名 URL / STS 临时凭证」方案。

## 反代路径

nginx 配置在 `infra/nginx/default.conf`：

- `/api/` → `api:3001/`
- `/socket.io/` → `ws:3002/socket.io/`
- `/uploads/` → `minio:9000/uploads/`
- `/healthz` → nginx 200

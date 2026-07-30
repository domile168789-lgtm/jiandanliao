# Rocky 9.4 柬聊生产部署与恢复手册

本文档用于在 Rocky Linux 9.4 服务器上部署柬聊阶段 1 基础服务，并完成一次可复用的备份、恢复与故障演练。目标是把 `nginx + api + ws + mysql + redis + minio` 收敛为一套可以长期运行、可检查、可回收的生产底座。

## 1. 适用范围

- 操作系统：Rocky Linux 9.4
- 部署目录：`/opt/jianliao-platform`
- 编排方式：Docker Compose
- 服务清单：`nginx`、`api`、`ws`、`mysql`、`redis`、`minio`
- 适用阶段：柬聊阶段 1 生产化第一阶段

## 2. 服务器准备

### 2.1 安装基础包

```bash
sudo dnf update -y
sudo dnf install -y git curl ca-certificates tar
```

### 2.2 安装 Docker Engine 与 Compose Plugin

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

如需让非 root 用户执行 Docker，可额外执行：

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

### 2.3 放行常用端口

生产环境建议只开放 `80/443`；若调试需要临时暴露其他端口，完成后应及时收回。

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 3. 拉取代码与准备环境变量

```bash
sudo mkdir -p /opt/jianliao-platform
sudo chown -R "$USER":"$USER" /opt/jianliao-platform
git clone <your-repository-url> /opt/jianliao-platform
cd /opt/jianliao-platform
cp infra/compose/.env.example infra/compose/.env
```

最少需要确认以下变量：

- `JWT_SECRET`：32 位以上随机字符串
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MINIO_ENDPOINT`：建议配置为 `https://<你的域名>`
- `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`
- `DOCKER_LOG_MAX_SIZE` / `DOCKER_LOG_MAX_FILE`
- `PHASE1_BACKUP_DIR`

建议先执行一次 compose 配置展开，确认变量已生效：

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml config
```

## 4. 首次部署

### 4.1 构建并启动

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

### 4.2 初始化阶段 1 演示数据

```bash
cd /opt/jianliao-platform
bash scripts/deploy/init-phase1-data-compose.sh
```

### 4.3 检查容器状态

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml ps
```

关键服务都应处于 `running` / `healthy`。

## 5. 健康检查与日常巡检

### 5.1 HTTP 与服务健康检查

```bash
curl -sS http://127.0.0.1/healthz
curl -sS http://127.0.0.1/api/health
curl -sS http://127.0.0.1/health
```

### 5.2 查看容器日志

```bash
cd /opt/jianliao-platform
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml logs --tail=200 nginx api ws mysql redis minio
```

当前 compose 已为常驻服务启用 `restart: unless-stopped` 与 JSON 日志轮转，避免宿主机重启或容器异常退出后服务停摆、日志无限增长。

## 6. 备份流程

### 6.1 备份范围

`bash scripts/deploy/backup-phase1.sh` 会生成：

- MySQL 数据导出：`mysql-<timestamp>.sql`
- 部署配置归档：`bootstrap-<timestamp>.tar.gz`
- MinIO 对象归档：`minio-<timestamp>.tar.gz`（容器存在时）

### 6.2 执行备份

```bash
cd /opt/jianliao-platform
bash scripts/deploy/backup-phase1.sh
```

默认输出目录取自 `PHASE1_BACKUP_DIR`，未设置时使用仓库内的 `backups/phase1`。

### 6.3 备份后核对项

- 备份目录下存在 `mysql-*.sql`
- 备份目录下存在 `bootstrap-*.tar.gz`
- 若 `minio` 容器已运行，存在 `minio-*.tar.gz`
- 备份脚本输出的路径与当前部署环境一致

## 7. 恢复流程

### 7.1 恢复前确认

恢复前至少确认以下事项：

1. 当前服务已经通过 `docker compose ... up -d` 启动出 `mysql` 与 `minio`
2. `infra/compose/.env` 与待恢复环境匹配
3. 需要导入的 SQL 与对象备份文件已复制到服务器
4. 已经保留当前现场的最新备份，避免误覆盖后无法回退

### 7.2 恢复 MySQL

```bash
cd /opt/jianliao-platform
bash scripts/deploy/restore-phase1.sh backups/phase1/<timestamp>/mysql-<timestamp>.sql
```

### 7.3 恢复 MySQL + MinIO 对象

```bash
cd /opt/jianliao-platform
bash scripts/deploy/restore-phase1.sh \
  backups/phase1/<timestamp>/mysql-<timestamp>.sql \
  backups/phase1/<timestamp>/minio-<timestamp>.tar.gz
```

脚本会自动拉起 `mysql` 与 `minio`，导入 MySQL 数据；若提供第二个参数，还会清空 MinIO 数据目录后再恢复对象包。

### 7.4 恢复后验证

恢复完成后，至少执行以下检查：

```bash
curl -sS http://127.0.0.1/healthz
curl -sS http://127.0.0.1/api/health
curl -sS http://127.0.0.1/health
```

并在应用侧验证：

- 账号可登录
- 会话列表正常加载
- 文本消息可收发
- 图片上传链接可访问

## 8. 建议的演练节奏

- 每次正式发版前先执行一次 `docker compose ... config`
- 每周至少做一次 `bash scripts/deploy/backup-phase1.sh`
- 每月在预发或备用机完成一次 `bash scripts/deploy/restore-phase1.sh`
- 每次恢复演练后，更新恢复时间、问题与处理结果

## 9. 常见问题

### 9.1 `docker compose config` 失败

通常是 `.env` 缺变量、格式错误或含特殊字符未正确转义。优先检查 `JWT_SECRET`、`MYSQL_ROOT_PASSWORD`、`MINIO_ROOT_PASSWORD`。

### 9.2 `mysqldump` 或 `mysql` 执行失败

- 确认 `mysql` 容器已启动并通过健康检查
- 确认 `.env` 中的 `MYSQL_ROOT_PASSWORD` 与当前实例一致
- 使用 `docker compose ... logs mysql` 查看启动日志

### 9.3 恢复后图片访问失败

- 确认是否同时恢复了 `minio-*.tar.gz`
- 确认 `MINIO_ENDPOINT` 与 nginx `/uploads/` 反代保持一致
- 如恢复了对象包，确认 `minio` 已被脚本重启并重新就绪

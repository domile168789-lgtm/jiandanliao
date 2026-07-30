# 宝塔终端一键部署柬聊

本文档适用于在宝塔面板终端中，用一组命令把柬聊项目拉到服务器并启动阶段 1 基线服务。

## 适用场景

- 服务器已装好 Docker 与 Docker Compose
- 你准备直接在宝塔终端里部署
- 目标是先把阶段 1 的 API、WS、MySQL、Redis、MinIO、Nginx 跑起来

## 部署前确认

先确认下面命令在服务器里可用：

```bash
docker --version
docker compose version
git --version
```

如果 Docker 还没装好，先完成 Docker 安装，再继续下面步骤。

## 一键部署命令

把下面整段复制到宝塔终端执行：

```bash
set -e

cd /opt

if [ ! -d /opt/jianliao/.git ]; then
  rm -rf /opt/jianliao
  git clone https://github.com/domile168789-lgtm/jianliao.git
fi

cd /opt/jianliao
git fetch origin
git reset --hard origin/master

if [ ! -f infra/compose/.env ]; then
  cp infra/compose/.env.example infra/compose/.env
fi

docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml config
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build

sleep 5

curl -fsS http://127.0.0.1/healthz
curl -fsS http://127.0.0.1/api/health
curl -fsS http://127.0.0.1/health
```

## 第一次部署后要做的事

### 1. 编辑环境变量

第一次部署后，建议立刻检查：

```bash
cd /opt/jianliao
vi infra/compose/.env
```

至少修改这些变量：

- `JWT_SECRET`
- `MYSQL_ROOT_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `MINIO_ENDPOINT`

如果你准备用域名联调上传，`MINIO_ENDPOINT` 应设置为：

```bash
MINIO_ENDPOINT=https://你的域名
```

### 2. 重新加载服务

改完环境变量后重新执行：

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

### 3. 初始化演示数据

执行：

```bash
cd /opt/jianliao
bash scripts/deploy/init-phase1-data-compose.sh
```

## 常用运维命令

### 查看服务状态

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml ps
```

### 查看日志

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml logs --tail=200
```

### 只看 API 日志

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml logs --tail=200 api
```

### 重启服务

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml restart
```

### 更新代码并重启

```bash
cd /opt/jianliao
git fetch origin
git reset --hard origin/master
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build
```

## 健康检查

部署后优先检查：

```bash
curl -fsS http://127.0.0.1/healthz
curl -fsS http://127.0.0.1/api/health
curl -fsS http://127.0.0.1/health
```

预期：

- `/healthz`：nginx 正常
- `/api/health`：api 正常
- `/health`：ws 正常

## 联调入口

对外统一入口：

- API：`http(s)://<域名>/api`
- WS：`http(s)://<域名>/socket.io/`
- Uploads：`http(s)://<域名>/uploads/`

不要让客户端直接访问容器内部地址，例如：

- `api:3001`
- `ws:3002`
- `minio:9000`

## 常见问题

### `docker compose config` 失败

优先检查：

- `infra/compose/.env` 是否存在
- 是否有变量写错
- Docker Compose 插件是否安装

### 健康检查不通

执行：

```bash
cd /opt/jianliao
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml ps
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml logs --tail=200
```

### 图片上传失败

优先检查：

- `MINIO_ENDPOINT` 是否对客户端可达
- `/uploads/` 是否已经被 Nginx 正常代理
- 客户端拿到的 `uploadUrl` 是否是域名地址，而不是容器内部地址

## 建议

如果你是第一次部署，建议按下面顺序验证：

1. `docker compose config`
2. `up -d --build`
3. 健康检查
4. 初始化数据
5. Web 后台用户列表
6. 客户端登录、文本消息、图片消息、回执

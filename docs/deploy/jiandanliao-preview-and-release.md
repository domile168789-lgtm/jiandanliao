# 柬单聊预览与发布说明

## 浏览器预览

当前沙箱环境没有 `docker`，也无法直接提供 Android / iOS 真机运行环境，因此本地预览采用浏览器方式：

- Web/H5：
  - 启动命令：`pnpm --filter @jianliao/web dev -- --host 0.0.0.0 --port 4173`
  - 预览地址：`/h5/messages?preview=demo`
- 管理后台渲染层：
  - 启动命令：`pnpm --filter @jianliao/admin-desktop exec vite --host 0.0.0.0 --port 4175`
  - 预览地址：`/?preview=demo`

说明：

- `preview=demo` 只用于浏览器预览注入演示会话，避免因为外部接口或数据库不可用而无法进入界面。
- 该模式不会替代正常登录流程；正常生产环境仍以真实接口和正式鉴权为准。
- Web 端进入预览后，个人中心、发现页等会沿用“真实接口优先，失败时显式演示兜底”的既有策略。
- 管理后台进入预览后，可查看完整导航与页面结构；若接口不可用，页面会显示无数据或错误提示，而不是伪造成功写操作。

## 本地完整联调

若运行环境具备 `docker compose`，可以直接使用仓库现有脚本：

```bash
pnpm install
bash scripts/dev/phase1-up.sh
bash scripts/dev/phase1-smoke-check.sh
```

对应核心服务：

- `nginx`
- `user-web`
- `api`
- `ws`
- `mysql`
- `redis`
- `minio`

Compose 文件位置：`infra/compose/docker-compose.yml`

## 生产发布建议

推荐把当前仓库拆成以下发布单元：

- `apps/web`：打包后交给 Nginx 静态托管
- `apps/api`：Node.js 常驻服务
- `apps/ws`：Node.js 常驻服务
- `mysql` / `redis` / `minio`：独立基础设施
- `apps/admin-desktop`：Windows 环境下执行 `dist:win` 打包

## 当前环境限制

- Android：当前沙箱无法访问 Google Maven，不能完成最终 `assembleDebug`
- iOS：当前沙箱不是 macOS，不能执行 `xcodebuild`
- Admin Windows 安装包：当前 Linux 沙箱缺少 `wine`

因此本仓库已经完成代码层生产化收口，但移动端与 Windows 安装包仍需要进入对应原生构建环境做最后发布校验。

# 柬单聊核心平台发布检查单

## 发布前

- 确认 GitHub `main` 已推送到目标版本
- 确认 `README.md`、`docs/deploy/jiandanliao-preview-and-release.md` 与当前部署方式一致
- 确认对外品牌名统一为 `柬单聊`
- 确认后台管理员密码与 `ADMIN_JWT_SECRET` 已替换默认值
- 确认 `JWT_SECRET`、`DATABASE_URL`、`REDIS_URL`、`MINIO_*` 已配置到目标环境

## 核心验证

- 用户端注册、登录、刷新令牌通过
- 单聊文本消息、会话列表、消息回执通过
- 群聊创建、邀请、退群通过
- 用户中心的系统通知、钱包、收益、代理、资料页通过
- 管理后台登录、用户管理、公告发布、品牌配置、活动管理通过
- 后台封禁后，用户侧系统通知/风控提醒联动可见

## 运维验证

- 监控面板可见 API / WS / MySQL / Redis 指标
- 执行一次 `scripts/backup.sh`
- 执行一次 `scripts/restore.sh <sql>`
- 确认 `infra/compose/docker-compose.yml` 的健康检查全部通过

## 原生端补验

- Android 在真实构建环境执行一次 `./gradlew assembleDebug`
- iOS 在 macOS / Xcode 环境执行一次 `xcodebuild` 或 Xcode Archive
- Windows 管理后台在 Windows 打包环境执行一次 `pnpm --filter @jianliao/admin-desktop dist:win`

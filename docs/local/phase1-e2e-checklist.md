# 阶段 1 本地主线联调清单

## 固定入口

- API：`http://127.0.0.1/api`
- WS：`http://127.0.0.1/socket.io/`
- Uploads：`http://127.0.0.1/uploads/`

## 启动步骤

1. `pnpm dev:phase1-up`
2. `pnpm dev:phase1-smoke`
3. `bash scripts/deploy/init-phase1-data-compose.sh`

## 70% 真实联调复盘前必须完成

1. 健康检查通过，确认 API / WS / Uploads 都能从固定入口访问。
2. Android 与 iOS 至少各准备 1 个真实账号，能完成登录、进入同一单聊。
3. Android 与 iOS 完成双向文本消息联调，并核对消息列表刷新与 Socket 推送。
4. Android 与 iOS 完成双向图片消息联调，确认上传成功后能在另一端回显。
5. Android 与 iOS 都完成 `READ` 回执写入，并确认另一端与后台日志都能看到回执结果。
6. 统一管理后台完成一次完整管理流，结果一致。
7. 所有失败点、重试步骤、日志定位结论都记录到 `docs/local/phase1-real-e2e-review.md`。

## 推荐联调顺序

1. 先做健康检查，并记录当前 compose / 服务状态。
2. Android / iOS 分别登录，确认服务地址与固定入口一致。
3. 建立同一单聊，先双向发文本，再双向发图片。
4. 对每一条文本与图片消息都补一次 `READ` 回执，观察移动端 UI 与服务端日志。
5. 再切换到统一管理后台，执行用户、举报、公告、审计的最小管理流。
6. 把通过项、失败项、日志证据、阻塞原因整理到真实复盘文档。

## 联调记录要求

- 文档入口：`docs/local/phase1-real-e2e-review.md`
- 每次联调至少记录：
  - 时间、环境、参与端（iOS / Android / Admin）
  - 使用的账号、会话 ID、消息类型
  - 是否出现上传失败、回执重复、后台数据不一致
  - 对应日志位置、临时规避手段、是否可稳定复现

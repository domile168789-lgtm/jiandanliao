# 柬单聊最终验收记录

## 当前结论

- 共享后端、管理后台、Web/H5 已完成代码层生产化收口
- Android、iOS 已完成代码层生产化收口，但最终构建仍需进入对应原生环境补验
- 浏览器预览入口已提供，可用于功能确认与界面验收

## 已完成项

- 后端：
  - 管理员真实登录、Bearer 鉴权、公告回读、消息回执校验与测试补齐
- 管理后台：
  - 唯一暗色后台完整导航、活动管理、公告发布、品牌配置、演示数据显式提示
- Web/H5：
  - 完整四 Tab、聊天、发现、我的、钱包、收益、代理、系统通知、资料、安全页
  - 真实数据优先，非鉴权错误允许演示兜底并显式标注
- Android：
  - 我的/发现相关页统一加载、错误、空态、来源提示
- iOS：
  - 资料域、会话、通讯录、通知相关页统一加载、错误、空态、来源提示

## 可直接预览

- 用户端：`http://localhost:4174/h5/messages?preview=demo`
- 管理后台：`http://localhost:4176/?preview=demo`

## 当前环境已验证

- `pnpm --filter @jianliao/api test -- admin.routes.test.ts receipt.routes.test.ts`
- `pnpm --filter @jianliao/web test`
- `pnpm --filter @jianliao/web build`
- `pnpm --filter @jianliao/admin-desktop test`
- `pnpm --filter @jianliao/admin-desktop build`
- `pnpm exec vitest run tests/integration/*.test.ts`

## 环境限制

- 当前沙箱无 `docker`，因此未在此环境执行完整 compose 联调
- 当前沙箱无 Google Maven 外网访问能力，Android 最终构建受限
- 当前沙箱不是 macOS，无法执行 iOS 最终构建
- 当前沙箱缺少 `wine`，无法在 Linux 下完成 Windows 安装包封装

## 建议的最终发布顺序

1. 在服务器执行 compose 或等价服务部署
2. 验证 API / WS / MySQL / Redis / MinIO 健康状态
3. 在 Windows 环境打包管理后台安装包
4. 在 Android / iOS 原生环境补跑最终构建
5. 按 `docs/release-checklist.md` 完成上线前检查

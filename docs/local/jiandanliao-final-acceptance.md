# 柬单聊最终验收记录

## 当前结论

- 共享后端、管理后台、Web/H5 已完成代码层生产化收口
- Android、iOS 已完成代码层生产化收口，且已按当前后端预览基线收口为 IM 主链路
- Android、iOS 的最终构建与真机验收仍需进入对应原生环境补验
- 浏览器预览入口已提供，可用于功能确认与界面验收

## 已完成项

- 后端：
  - 管理员真实登录、Bearer 鉴权、公告回读、消息回执校验与测试补齐
- 管理后台：
  - 唯一暗色后台完整导航、活动管理、公告发布、品牌配置、演示数据显式提示
- Web/H5：
  - 完整四 Tab、聊天、发现、我的、钱包、收益、代理、系统通知、资料、安全页
  - 真实数据优先，非鉴权错误允许演示兜底并显式标注
  - 消息页已支持微信式 `+` 菜单中的 `发起群聊`，可完成选择联系人、填写群名、创建群聊并进入新群会话
  - 消息、通讯录、发现、我的四个 Tab 首页已按微信式结构改版，新增入口均已接入真实能力或骨架页
  - 预览模式下即使鉴权失效，消息页也会自动回落到本地 IM 演示会话，不再直接停留在登录失效提示
- Android：
  - 我的/发现相关页统一加载、错误、空态、来源提示
  - 会话列表、聊天页、发送后刷新、自动 READ 回执、预览会话标题映射已对齐 IM 主链路
- iOS：
  - 资料域、会话、通讯录、通知相关页统一加载、错误、空态、来源提示
  - 会话列表、聊天页、发送后刷新、已读同步、预览会话标题映射已对齐 IM 主链路

## 可直接预览

- 用户端：`http://localhost:4174/h5/messages?preview=demo`
- 管理后台：`http://localhost:4176/?preview=demo`

## 当前环境已验证

- `pnpm --filter @jianliao/api test -- admin.routes.test.ts receipt.routes.test.ts`
- `pnpm --filter @jianliao/api test -- conversation.routes.test.ts`
- `pnpm --filter @jianliao/web test`
- `pnpm --filter @jianliao/web build`
- 浏览器实测 `http://localhost:4174/h5/messages?preview=demo`
  - 已验证消息、通讯录、发现、我的四个 Tab 首页可正常打开
  - 已验证消息页展示微信式会话列表与 `+` 菜单入口
  - 已验证我的页不再残留“登录状态已失效，请重新登录”错误提示
- `pnpm --filter @jianliao/admin-desktop test`
- `pnpm --filter @jianliao/admin-desktop build`
- `pnpm exec vitest run tests/integration/*.test.ts`

## 环境限制

- 当前沙箱无 `docker`，因此未在此环境执行完整 compose 联调
- 当前沙箱无 Google Maven / Gradle 远端访问能力，Android 最终构建受限
- 当前沙箱不是 macOS，无法执行 iOS 最终构建与 SwiftUI 真机验收
- 当前沙箱缺少 `wine`，无法在 Linux 下完成 Windows 安装包封装

## 建议的最终发布顺序

1. 在服务器执行 compose 或等价服务部署
2. 验证 API / WS / MySQL / Redis / MinIO 健康状态
3. 在 Windows 环境打包管理后台安装包
4. 在 Android / iOS 原生环境补跑最终构建
5. 按 `docs/release-checklist.md` 完成上线前检查

# 柬单聊 Android（Kotlin + Jetpack Compose）

本目录是 `柬单聊` Android 用户端原生工程，现已从最小联调骨架扩展为可运行的完整版主流程入口：

- 登录 / 注册 / 登录态恢复
- 消息页、会话列表、单聊消息、图片上传、已读回执
- 通讯录页、群组概览、继续聊天入口
- 发现页、公告/活动入口、代理推广入口、下载引导文案
- 我的页、个人资料、钱包、收益、代理、安全、系统通知入口

## 联调入口

默认在 `app/build.gradle.kts` 中配置：

```kotlin
buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2/api\"")
buildConfigField("String", "WS_BASE_URL", "\"http://10.0.2.2\"")
```

- Android 模拟器访问宿主机使用 `10.0.2.2`
- 若使用真机，请改为局域网 IP，并确认手机能访问到宿主机的 `80` 端口
- Socket.IO 路径固定为 `/socket.io/`

## 运行与构建

```bash
cd /workspace/jianliao-private/apps/android
./gradlew assembleDebug
```

构建要求：

- JDK 17
- Android SDK Platform 34
- 已配置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`
- 首次执行 `./gradlew` 可能需要下载 Gradle 与依赖

## 页面结构

1. 登录页
   - 品牌信息、账号登录、注册切换、忘记密码入口占位
2. 消息页
   - 会话列表、创建私聊、进入聊天页、文本/图片/回执链路
3. 通讯录页
   - 好友概览、群组概览、继续聊天入口
4. 发现页
   - 活动中心、公告入口、代理推广、下载引导
5. 我的页
   - 个人资料、钱包、收益、代理、安全、系统通知、退出登录
6. 扩展页
   - 系统通知页、钱包页、收益页、代理页、安全页、个人资料页

## 现阶段说明

- 消息、上传、回执沿用真实后端接口
- 钱包、收益、代理、系统通知当前先使用 `ServiceLocator` 注入的数据仓储，便于后续替换为正式 API
- 三端功能边界按 `柬单聊全端交付` 的 Task 5 对齐，视觉统一放到后续统一主题阶段处理

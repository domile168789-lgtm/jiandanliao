# Android 安装包发布说明

固定下载地址：

- `http://45.202.0.14/downloads/jianliao-android.apk`

仓库内固定文件路径：

- `apps/web/public/downloads/jianliao-android.apk`

推荐发布方式：

```bash
scripts/dev/publish-android-apk.sh apps/android/app/build/outputs/apk/debug/app-debug.apk
```

执行后会把传入的 APK 复制为固定文件名：

- `apps/web/public/downloads/jianliao-android.apk`

后续步骤：

1. `git add apps/web/public/downloads/jianliao-android.apk`
2. 提交并推送仓库
3. 在服务器执行：

```bash
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.yml up -d --build user-web nginx
```

校验方式：

- 打开 `http://45.202.0.14/app`
- 点击“下载安装 Android 版”
- 或直接访问 `http://45.202.0.14/downloads/jianliao-android.apk`

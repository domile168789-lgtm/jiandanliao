#!/usr/bin/env bash

set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "用法: scripts/dev/publish-android-apk.sh <apk路径>"
  exit 1
fi

SOURCE_APK="$1"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_DIR="$ROOT_DIR/apps/web/public/downloads"
TARGET_APK="$TARGET_DIR/jianliao-android.apk"

if [ ! -f "$SOURCE_APK" ]; then
  echo "未找到 APK: $SOURCE_APK"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_APK" "$TARGET_APK"

echo "已发布 Android 安装包:"
echo "源文件: $SOURCE_APK"
echo "目标文件: $TARGET_APK"
ls -lh "$TARGET_APK"

if command -v sha256sum >/dev/null 2>&1; then
  echo "SHA256:"
  sha256sum "$TARGET_APK"
fi

echo
echo "下一步："
echo "1. git add apps/web/public/downloads/jianliao-android.apk"
echo "2. 提交并推送代码"
echo "3. 在服务器重建 user-web 与 nginx"

import SwiftUI

struct SecurityView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var ws: WSClient

  var body: some View {
    List {
      Section("安全状态") {
        LabeledContent("登录状态", value: auth.isLoggedIn ? "已登录" : "未登录")
        LabeledContent("账号限制", value: auth.isRestricted ? "受限" : "正常")
        LabeledContent("待处理通知", value: "\(auth.pendingNotices.filter { $0.isUnread }.count)")
      }

      Section("设备与环境") {
        LabeledContent("deviceId", value: auth.deviceId)
        LabeledContent("WS 连接", value: ws.isConnected ? "已连接" : "未连接")
        LabeledContent("API Base URL", value: AppConfig.apiBaseURL.absoluteString)
        LabeledContent("WS Base URL", value: AppConfig.wsBaseURL.absoluteString)
      }

      Section("建议") {
        Text(AppConfig.securityAdvice)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }

      Section("操作") {
        Button("全部通知标记为已读") {
          auth.markAllNoticesRead()
        }

        Button(auth.isRestricted ? "模拟解除限制" : "模拟限制账号") {
          auth.updateRestriction(!auth.isRestricted)
        }
      }
    }
    .navigationTitle("安全")
  }
}

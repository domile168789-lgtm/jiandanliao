import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore
  @EnvironmentObject private var ws: WSClient

  private var unreadNoticeCount: Int {
    profile.unreadNoticeCount
  }

  var body: some View {
    NavigationStack {
      List {
        if let tone = profile.statusTone,
           let title = profile.statusTitle,
           let message = profile.statusMessage {
          Section {
            StatusBanner(tone: tone, title: title, message: message, actionTitle: "重新拉取") {
              Task {
                await profile.refreshAll(phoneHint: auth.phone)
              }
            }
          }
        }

        Section {
          VStack(alignment: .leading, spacing: 8) {
            SourceBadge(isLive: profile.summarySource.isLive)
            Text(profile.summary.displayName)
              .font(.title3.weight(.semibold))
            Text(profile.summary.phone)
              .font(.footnote)
              .foregroundStyle(.secondary)
            Text(auth.userId ?? "注册于 \(profile.summary.memberSince)")
              .font(.footnote)
              .foregroundStyle(.secondary)
            Label(
              profile.summary.safetyLevel,
              systemImage: profile.isRestricted ? "exclamationmark.shield" : "checkmark.shield"
            )
              .font(.footnote.weight(.medium))
              .foregroundStyle(profile.isRestricted ? .orange : .green)

            if let summaryIssue = profile.issue(for: .summary) {
              Text("资料接口失败，当前展示演示兜底：\(summaryIssue)")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
          .padding(.vertical, 4)
        }

        Section("常用功能") {
          NavigationLink {
            WalletView()
          } label: {
            Label("钱包", systemImage: "wallet.pass")
          }

          NavigationLink {
            EarningsView()
          } label: {
            Label("收益", systemImage: "chart.line.uptrend.xyaxis")
          }

          NavigationLink {
            AgentView()
          } label: {
            Label("代理", systemImage: "person.3.sequence")
          }

          NavigationLink {
            SystemNoticeView()
          } label: {
            HStack {
              Label("系统通知", systemImage: "bell.badge")
              Spacer()
              if unreadNoticeCount > 0 {
                Text("\(unreadNoticeCount)")
                  .font(.caption.weight(.semibold))
                  .padding(.horizontal, 8)
                  .padding(.vertical, 3)
                  .background(Color.indigo.opacity(0.14))
                  .clipShape(Capsule())
              }
            }
          }

          NavigationLink {
            SecurityView()
          } label: {
            Label("安全", systemImage: "lock.shield")
          }
        }

        Section("账号操作") {
          Button("刷新 Token") {
            Task {
              do {
                try await auth.refreshIfNeeded()
                await profile.refreshAll(phoneHint: auth.phone)
              } catch {
                auth.appendNotice(
                  title: "刷新 Token 失败",
                  detail: error.localizedDescription,
                  source: "auth"
                )
              }
            }
          }

          Button("退出登录", role: .destructive) {
            ws.disconnect()
            auth.logout()
          }
        }
      }
      .navigationTitle("我的")
      .refreshable {
        await profile.refreshAll(phoneHint: auth.phone)
      }
      .task {
        await profile.refreshIfNeeded(phoneHint: auth.phone)
      }
    }
  }
}

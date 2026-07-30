import SwiftUI

struct SystemNoticeView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      Section {
        VStack(alignment: .leading, spacing: 10) {
          SourceBadge(isLive: profile.noticesSource.isLive)
          if let issue = profile.issue(for: .notices) {
            Text("通知接口失败，当前展示本地兜底通知：\(issue)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          } else {
            Text("当前通知列表来自实时接口。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      }

      if profile.isRestricted {
        Section {
          Label("账号当前处于受限状态，请联系管理员处理。", systemImage: "exclamationmark.shield")
            .foregroundStyle(.orange)
        }
      }

      Section("通知列表") {
        if profile.notices.isEmpty {
          EmptyStateCard(
            icon: "bell.slash",
            title: "暂无系统通知",
            message: "当后台公告、风控结果或客户端提示接入后，会在这里统一展示。",
            actionTitle: "重新拉取"
          ) {
            Task {
              await profile.refreshAll(phoneHint: auth.phone)
            }
          }
        } else {
          ForEach(profile.notices) { notice in
            VStack(alignment: .leading, spacing: 8) {
              HStack {
                Text(notice.title)
                  .font(.headline)
                if notice.isUnread {
                  Text("未读")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.indigo)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.indigo.opacity(0.12))
                    .clipShape(Capsule())
                }
              }
              Text(notice.summary)
                .font(.subheadline)
              Text("状态：\(notice.status) · \(formattedDate(notice.createdAt))")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
          }
        }
      }
    }
    .navigationTitle("系统通知")
    .refreshable {
      await profile.refreshAll(phoneHint: auth.phone)
    }
    .toolbar {
      if !profile.notices.isEmpty {
        ToolbarItem(placement: .topBarTrailing) {
          Button("全部已读") {
            profile.markAllNoticesRead()
          }
        }
      }
    }
    .task {
      await profile.refreshIfNeeded(phoneHint: auth.phone)
    }
  }

  private func formattedDate(_ raw: String) -> String {
    let formatter = ISO8601DateFormatter()
    if let date = formatter.date(from: raw) {
      return date.formatted(date: .abbreviated, time: .shortened)
    }
    return raw
  }
}

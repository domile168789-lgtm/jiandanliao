import SwiftUI

struct SystemNoticeView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      if profile.isRestricted {
        Section {
          Label("账号当前处于受限状态，请联系管理员处理。", systemImage: "exclamationmark.shield")
            .foregroundStyle(.orange)
        }
      }

      Section("通知列表") {
        if profile.notices.isEmpty {
          VStack(alignment: .center, spacing: 10) {
            Image(systemName: "bell.slash")
              .font(.system(size: 28))
              .foregroundStyle(.secondary)
            Text("暂无系统通知")
              .font(.headline)
            Text("当后台公告、风控结果或客户端提示接入后，会在这里统一展示。")
              .font(.footnote)
              .foregroundStyle(.secondary)
              .multilineTextAlignment(.center)
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, 24)
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

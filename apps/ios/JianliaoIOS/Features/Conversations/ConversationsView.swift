import SwiftUI

struct ConversationsView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var ws: WSClient

  @State private var conversations: [Conversation] = []
  @State private var isLoading = false
  @State private var errorText: String?

  @State private var showNewDM = false
  @State private var peerPhone = ""

  var body: some View {
    NavigationStack {
      List {
        if !conversations.isEmpty {
          Section {
            Text("最近会话、系统通知和运营消息都会集中在这里，当前已接入真实 IM 接口。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
          .listRowBackground(Color.clear)
        }

        if let errorText, conversations.isEmpty, !isLoading {
          Section {
            EmptyStateCard(
              icon: "wifi.exclamationmark",
              title: "会话加载失败",
              message: errorText,
              actionTitle: "重试"
            ) {
              Task {
                await reload()
              }
            }
          }
        } else if conversations.isEmpty, !isLoading {
          Section {
            EmptyStateCard(
              icon: "message.badge",
              title: "还没有会话",
              message: "先创建一个单聊，或使用另一台设备给当前账号发消息。",
              actionTitle: "新建单聊"
            ) {
              showNewDM = true
            }
          }
        } else {
          if let errorText {
            Section {
              StatusBanner(tone: .warning, title: "会话刷新失败", message: errorText, actionTitle: "重试") {
                Task {
                  await reload()
                }
              }
            }
          }

          ForEach(conversations) { c in
            NavigationLink(value: c) {
              ConversationRowCard(conversation: c, title: title(for: c))
            }
          }
        }
      }
      .navigationDestination(for: Conversation.self) { c in
        ChatView(conversation: c)
      }
      .navigationTitle("消息")
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("退出") {
            ws.disconnect()
            auth.logout()
          }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Menu {
            Button("刷新 Token") {
              Task {
                do {
                  try await auth.refreshIfNeeded()
                } catch {
                  errorText = error.localizedDescription
                }
              }
            }
            Button("新建单聊") { showNewDM = true }
          } label: {
            Image(systemName: "ellipsis.circle")
          }
        }
      }
      .refreshable { await reload() }
      .overlay {
        if isLoading {
          ProgressView().progressViewStyle(.circular)
        }
      }
      .sheet(isPresented: $showNewDM) {
        NavigationStack {
          Form {
            Section("对方手机号") {
              TextField("例如 855010100002", text: $peerPhone)
                .keyboardType(.numberPad)
            }
            Section("联调提示") {
              Text("可直接发起 855010100002、855010100003、855010100004 这些演示会话。")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
          .navigationTitle("新建单聊")
          .toolbar {
            ToolbarItem(placement: .cancellationAction) {
              Button("取消") { showNewDM = false }
            }
            ToolbarItem(placement: .confirmationAction) {
              Button("创建") {
                Task {
                  await createDM()
                }
              }
              .disabled(peerPhone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
          }
        }
      }
      .task {
        if let uid = auth.userId { ws.connect(userId: uid) }
        await reload()
      }
    }
  }

  private func title(for c: Conversation) -> String {
    if let t = c.title, !t.isEmpty { return t }
    switch c.id {
    case "preview-system":
      return "系统通知"
    case "preview-dm-business":
      return "商务对接"
    case "preview-group-agency":
      return "渠道伙伴群"
    case "preview-dm-security":
      return "安全专员"
    default:
      return c.type == "DM" ? "新的私聊" : "新的群聊"
    }
  }

  private func reload() async {
    isLoading = true
    defer { isLoading = false }
    errorText = nil
    do {
      conversations = try await auth.listConversations()
        .sorted { ($0.updatedAt ?? .distantPast) > ($1.updatedAt ?? .distantPast) }
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func createDM() async {
    do {
      _ = try await auth.createDM(peerPhone: peerPhone.trimmingCharacters(in: .whitespacesAndNewlines))
      peerPhone = ""
      showNewDM = false
      await reload()
    } catch {
      errorText = error.localizedDescription
    }
  }
}

private struct ConversationRowCard: View {
  let conversation: Conversation
  let title: String

  var body: some View {
    HStack(spacing: 12) {
      ZStack {
        Circle()
          .fill(avatarColor)
          .frame(width: 42, height: 42)
        Text(String(title.prefix(1)))
          .font(.headline)
          .foregroundStyle(.white)
      }

      VStack(alignment: .leading, spacing: 6) {
        HStack {
          Text(title)
            .font(.headline)
          Spacer()
          Text(updatedText)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Text(typeLabel)
          .font(.caption)
          .foregroundStyle(avatarColor)

        Text(previewText)
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
    .padding(.vertical, 4)
  }

  private var previewText: String {
    if let last = conversation.lastMessage, !last.isEmpty {
      return last
    }
    switch conversation.id {
    case "preview-system":
      return "查看后台公告、风控结果和活动提醒。"
    case "preview-dm-business":
      return "商务消息会在这里持续跟进。"
    case "preview-group-agency":
      return "群聊动态、投放排期和协作消息会在这里同步。"
    case "preview-dm-security":
      return "账号安全提醒和处理建议会在这里更新。"
    default:
      return "打开会话开始沟通。"
    }
  }

  private var typeLabel: String {
    switch conversation.type {
    case "SYSTEM":
      return "系统通知"
    case "GROUP":
      return "群聊"
    default:
      return "单聊"
    }
  }

  private var updatedText: String {
    guard let updatedAt = conversation.updatedAt else { return "刚刚" }
    return updatedAt.formatted(date: .omitted, time: .shortened)
  }

  private var avatarColor: Color {
    switch conversation.type {
    case "SYSTEM":
      return .orange
    case "GROUP":
      return .purple
    default:
      return .blue
    }
  }
}

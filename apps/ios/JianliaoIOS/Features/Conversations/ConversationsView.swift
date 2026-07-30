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
              VStack(alignment: .leading, spacing: 4) {
                Text(title(for: c))
                  .font(.headline)
                if let last = c.lastMessage, !last.isEmpty {
                  Text(last)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                } else {
                  Text("暂无最近消息")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
              }
            }
          }
        }
      }
      .navigationDestination(for: Conversation.self) { c in
        ChatView(conversation: c)
      }
      .navigationTitle("会话")
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
              TextField("peerPhone", text: $peerPhone)
                .keyboardType(.numberPad)
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
    return c.type == "DM" ? "单聊会话" : "群聊会话"
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

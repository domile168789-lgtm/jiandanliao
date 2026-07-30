import SwiftUI

struct ContactsView: View {
  @EnvironmentObject private var auth: AuthStore

  @State private var directMessages: [Conversation] = []
  @State private var isLoading = false
  @State private var errorText: String?
  @State private var showCreateSheet = false
  @State private var peerPhone = ""

  var body: some View {
    NavigationStack {
      List {
        Section("快捷操作") {
          Button {
            showCreateSheet = true
          } label: {
            Label("发起单聊", systemImage: "square.and.pencil")
          }

          NavigationLink {
            SystemNoticeView()
          } label: {
            Label("系统通知", systemImage: "bell.badge")
          }
        }

        Section("最近联系人") {
          if directMessages.isEmpty, !isLoading {
            Text("还没有单聊联系人，先从右上角创建一个会话。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          } else {
            ForEach(directMessages) { conversation in
              NavigationLink {
                ChatView(conversation: conversation)
              } label: {
                VStack(alignment: .leading, spacing: 4) {
                  Text(title(for: conversation))
                    .font(.headline)
                  Text(conversation.lastMessage ?? "暂无最近消息")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }
              }
            }
          }
        }
      }
      .navigationTitle("通讯录")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showCreateSheet = true
          } label: {
            Image(systemName: "plus")
          }
        }
      }
      .refreshable { await reload() }
      .task { await reload() }
      .overlay {
        if isLoading {
          ProgressView()
        }
      }
      .alert("操作失败", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
        Button("确定", role: .cancel) {}
      } message: {
        Text(errorText ?? "")
      }
      .sheet(isPresented: $showCreateSheet) {
        NavigationStack {
          Form {
            Section("手机号即账号") {
              TextField("例如 85510000002", text: $peerPhone)
                .keyboardType(.numberPad)
            }
          }
          .navigationTitle("发起单聊")
          .toolbar {
            ToolbarItem(placement: .cancellationAction) {
              Button("取消") { showCreateSheet = false }
            }
            ToolbarItem(placement: .confirmationAction) {
              Button("创建") {
                Task { await createDM() }
              }
              .disabled(peerPhone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
          }
        }
      }
    }
  }

  private func reload() async {
    isLoading = true
    defer { isLoading = false }

    do {
      directMessages = try await auth.listConversations()
        .filter { $0.type == "DM" }
        .sorted { ($0.updatedAt ?? .distantPast) > ($1.updatedAt ?? .distantPast) }
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func createDM() async {
    do {
      let trimmed = peerPhone.trimmingCharacters(in: .whitespacesAndNewlines)
      let conversation = try await auth.createDM(peerPhone: trimmed)
      if !directMessages.contains(where: { $0.id == conversation.id }) {
        directMessages.insert(conversation, at: 0)
      }
      peerPhone = ""
      showCreateSheet = false
      await reload()
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func title(for conversation: Conversation) -> String {
    if let title = conversation.title, !title.isEmpty {
      return title
    }
    return "单聊会话"
  }
}


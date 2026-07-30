import SwiftUI
import PhotosUI
import UIKit

struct ChatView: View {
  let conversation: Conversation

  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var ws: WSClient

  @State private var messages: [Message] = []
  @State private var text: String = ""
  @State private var isLoading: Bool = false
  @State private var errorText: String?

  @State private var photoItem: PhotosPickerItem?
  @State private var isSendingImage = false

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        Text("当前会话已接入真实消息接口，发送后会自动刷新并同步已读。")
          .font(.footnote)
          .foregroundStyle(.secondary)
        Spacer()
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)

      List {
        ForEach(messages) { m in
          MessageRow(message: m, isMine: isMine(m))
            .listRowInsets(EdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12))
        }
      }
      .listStyle(.plain)

      Divider()

      HStack(spacing: 10) {
        PhotosPicker(selection: $photoItem, matching: .images) {
          Image(systemName: "photo")
            .font(.system(size: 20))
        }
        .disabled(isSendingImage)

        TextField("输入消息…", text: $text, axis: .vertical)
          .textFieldStyle(.roundedBorder)

        Button("发送") {
          Task { await sendText() }
        }
        .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      }
      .padding(12)
      .background(.thinMaterial)
    }
    .navigationTitle(title(for: conversation))
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("刷新") {
          Task { await loadHistory() }
        }
      }
    }
    .overlay {
      if isLoading {
        ProgressView().progressViewStyle(.circular)
      }
    }
    .alert("错误", isPresented: Binding(get: { errorText != nil }, set: { if !$0 { errorText = nil } })) {
      Button("确定", role: .cancel) {}
    } message: {
      Text(errorText ?? "")
    }
    .task {
      ws.joinConversation(conversation.id)
      await loadHistory()
    }
    .onReceive(ws.messageNew) { evt in
      guard evt.conversationId == conversation.id else { return }
      let m = Message(
        id: evt.id,
        conversationId: evt.conversationId,
        senderId: evt.senderId,
        type: evt.type,
        status: evt.status,
        body: evt.body,
        createdAt: evt.createdAt
      )
      if !messages.contains(where: { $0.id == m.id }) {
        messages.append(m)
        messages.sort { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }
      }
      Task { await sendReadReceiptIfNeeded(message: m) }
    }
    .onChange(of: photoItem) { _, newValue in
      guard let item = newValue else { return }
      Task { await sendImage(item: item) }
    }
  }

  private func loadHistory() async {
    isLoading = true
    defer { isLoading = false }
    do {
      let rows = try await auth.listMessages(conversationId: conversation.id, limit: 50)
      // 服务端返回 DESC
      messages = rows.sorted { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }
      if let latestRemote = messages.last(where: { !isMine($0) }) {
        await sendReadReceiptIfNeeded(message: latestRemote)
      }
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func sendText() async {
    let content = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !content.isEmpty else { return }
    text = ""

    do {
      let req = SendMessageRequest(conversationId: conversation.id, type: .text, body: MessageBody(text: content))
      let sent = try await auth.sendMessage(req)
      if !messages.contains(where: { $0.id == sent.id }) {
        messages.append(sent)
        messages.sort { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }
      }
      await loadHistory()
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func sendImage(item: PhotosPickerItem) async {
    isSendingImage = true
    defer { isSendingImage = false; photoItem = nil }

    do {
      guard let data = try await item.loadTransferable(type: Data.self) else {
        throw APIError.transport(NSError(domain: "Photo", code: -1))
      }

      let uiImage = UIImage(data: data)
      let w = uiImage.map { Int($0.size.width * $0.scale) }
      let h = uiImage.map { Int($0.size.height * $0.scale) }

      // phase1-backend: 先 POST /api/files/upload 拿到 uploadUrl/objectKey，再 PUT 直传
      let meta = try await auth.createUploadMetadata(filename: "photo.jpg", mimeType: "image/jpeg", size: data.count)
      try await auth.uploadFile(to: meta.uploadUrl, data: data, contentType: "image/jpeg")

      var body = MessageBody()
      body.fileId = meta.fileId
      body.objectKey = meta.objectKey
      body.url = meta.publicURL
      body.filename = "photo.jpg"
      body.mimeType = "image/jpeg"
      body.size = data.count
      body.width = w
      body.height = h

      let req = SendMessageRequest(conversationId: conversation.id, type: .image, body: body)
      let sent = try await auth.sendMessage(req)
      if !messages.contains(where: { $0.id == sent.id }) {
        messages.append(sent)
        messages.sort { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }
      }
      await loadHistory()
    } catch {
      errorText = error.localizedDescription
    }
  }

  private func isMine(_ m: Message) -> Bool {
    // 当前后端 senderId 为 users.id；客户端若拿不到 userId，会回退 phone（不等于 senderId）。
    if let uid = auth.userId, let sid = m.senderId {
      return uid == sid
    }
    return false
  }

  private func title(for conversation: Conversation) -> String {
    if let title = conversation.title, !title.isEmpty { return title }
    switch conversation.id {
    case "preview-system":
      return "系统通知"
    case "preview-dm-business":
      return "商务对接"
    case "preview-group-agency":
      return "渠道伙伴群"
    case "preview-dm-security":
      return "安全专员"
    default:
      return conversation.type == "DM" ? "聊天" : "群聊"
    }
  }

  private func sendReadReceiptIfNeeded(message: Message) async {
    guard let sid = message.senderId else { return }
    if sid == auth.userId { return }
    do {
      try await auth.createReceipt(messageId: message.id, type: .read)
    } catch {
      // 回执失败不影响主流程
    }
  }
}

private struct MessageRow: View {
  let message: Message
  let isMine: Bool

  private var isSystem: Bool {
    message.senderId?.hasPrefix("system") == true || message.type == .text && (message.body.text?.contains("系统") == true && message.senderId == nil)
  }

  var body: some View {
    HStack {
      if isSystem {
        Spacer(minLength: 20)
      } else if isMine {
        Spacer(minLength: 40)
      }

      VStack(alignment: isSystem ? .center : .leading, spacing: 6) {
        Text(senderLabel)
          .font(.caption)
          .foregroundStyle(.secondary)
        content

        Text(metaText)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: isSystem ? .infinity : 260, alignment: isSystem ? .center : .leading)
      .padding(10)
      .background(backgroundColor)
      .clipShape(RoundedRectangle(cornerRadius: 12))

      if isSystem {
        Spacer(minLength: 20)
      } else if !isMine {
        Spacer(minLength: 40)
      }
    }
  }

  private var backgroundColor: Color {
    if isSystem {
      return Color.orange.opacity(0.12)
    }
    return isMine ? Color.blue.opacity(0.15) : Color.gray.opacity(0.12)
  }

  private var senderLabel: String {
    if isSystem { return "系统通知" }
    return isMine ? "我" : "对方"
  }

  private var metaText: String {
    let timeText = message.createdAt?.formatted(date: .omitted, time: .shortened) ?? "刚刚"
    let statusText = message.status?.rawValue ?? "SENT"
    return "\(timeText) · \(statusText)"
  }

  @ViewBuilder
  private var content: some View {
    switch message.type {
    case .text:
      Text(message.body.text ?? "")
        .textSelection(.enabled)
    case .image:
      if let raw = message.body.url, let url = URL(string: raw) {
        AsyncImage(url: url) { phase in
          switch phase {
          case .empty:
            ProgressView()
              .frame(width: 160, height: 120)
          case let .success(image):
            image
              .resizable()
              .scaledToFit()
              .frame(maxWidth: 220)
          case .failure:
            Text("[图片加载失败]")
              .foregroundStyle(.secondary)
          @unknown default:
            Text("[图片]")
          }
        }
      } else {
        Text("[图片]")
          .foregroundStyle(.secondary)
      }
    default:
      Text("[\(message.type.rawValue)]")
        .foregroundStyle(.secondary)
    }
  }
}

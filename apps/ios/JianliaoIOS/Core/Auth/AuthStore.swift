import Foundation
import SwiftUI

struct SystemNotice: Codable, Identifiable, Hashable {
  let id: String
  var title: String
  var detail: String
  var source: String
  var createdAt: Date
  var isUnread: Bool

  static func welcome(phone: String?) -> SystemNotice {
    let account = phone?.isEmpty == false ? (phone ?? "") : "当前账号"
    return SystemNotice(
      id: "welcome-notice",
      title: "iOS 用户端已切到完整版入口",
      detail: "已为 \(account) 开启消息、通讯录、发现、我的四个主入口，并补齐系统通知、钱包、收益、代理与安全页。",
      source: "client",
      createdAt: .now,
      isUnread: true
    )
  }
}

@MainActor
final class AuthStore: ObservableObject, AuthProviding {
  private enum LocalStateKeys {
    static let isRestricted = "AuthStore.isRestricted"
    static let pendingNotices = "AuthStore.pendingNotices"
  }

  @Published private(set) var accessToken: String?
  @Published private(set) var refreshToken: String?
  @Published private(set) var phone: String?
  @Published private(set) var userId: String? // WS auth:authenticate 使用（后端仅做在线标记）
  @Published var isRestricted = false
  @Published var pendingNotices: [SystemNotice] = []

  /// 后端契约要求带 deviceId；这里用固定 UUID，持久化到 UserDefaults，保证 refresh-token 可用。
  private(set) var deviceId: String = {
    let key = "AuthStore.deviceId"
    if let v = UserDefaults.standard.string(forKey: key), !v.isEmpty { return v }
    let v = UUID().uuidString
    UserDefaults.standard.set(v, forKey: key)
    return v
  }()

  var isLoggedIn: Bool { accessToken != nil && refreshToken != nil && phone != nil }

  private lazy var api = APIClient(authProvider: self)
  private lazy var unauthApi = APIClient(authProvider: nil)

  func restoreIfPossible() async {
    let at = Keychain.get(.accessToken)
    let rt = Keychain.get(.refreshToken)
    let ph = Keychain.get(.phone)
    let uid = Keychain.get(.userId)
    if let at, let rt, let ph {
      self.accessToken = at
      self.refreshToken = rt
      self.phone = ph
      self.userId = uid
      restoreClientState()
      bootstrapDefaultNoticeIfNeeded(phone: ph)
    }
  }

  func logout() {
    accessToken = nil
    refreshToken = nil
    phone = nil
    userId = nil
    Keychain.delete(.accessToken)
    Keychain.delete(.refreshToken)
    Keychain.delete(.phone)
    Keychain.delete(.userId)
    isRestricted = false
    pendingNotices = []
    UserDefaults.standard.removeObject(forKey: LocalStateKeys.isRestricted)
    UserDefaults.standard.removeObject(forKey: LocalStateKeys.pendingNotices)
  }

  func register(phone: String, password: String, nickname: String?) async throws {
    let req = RegisterRequest(phone: phone, password: password, deviceId: deviceId, platform: "IOS", nickname: nickname)
    let resp: AuthResponse = try await unauthApi.request("/auth/register", method: .post, body: req)
    try await persistAuth(resp: resp, phone: phone)
  }

  func loginWithPassword(phone: String, password: String) async throws {
    let req = PasswordLoginRequest(phone: phone, password: password, deviceId: deviceId, platform: "IOS")
    let resp: AuthResponse = try await unauthApi.request("/auth/login/password", method: .post, body: req)
    try await persistAuth(resp: resp, phone: phone)
  }

  func refreshIfNeeded() async throws {
    guard let ph = phone, let rt = refreshToken else { return }
    let req = RefreshTokenRequest(phone: ph, refreshToken: rt, deviceId: deviceId)
    let resp: AuthResponse = try await unauthApi.request("/auth/refresh-token", method: .post, body: req)
    try await persistAuth(resp: resp, phone: ph)
  }

  private func authorizedRequest<T>(_ operation: () async throws -> T) async throws -> T {
    do {
      return try await operation()
    } catch let error as APIError {
      if case .httpStatus(401, _) = error {
        logout()
      }
      throw error
    }
  }

  private func persistAuth(resp: AuthResponse, phone: String) async throws {
    accessToken = resp.accessToken
    refreshToken = resp.refreshToken
    self.phone = phone
    self.userId = resp.user.id

    try Keychain.set(resp.accessToken, for: .accessToken)
    try Keychain.set(resp.refreshToken, for: .refreshToken)
    try Keychain.set(phone, for: .phone)
    if let uid = userId {
      try? Keychain.set(uid, for: .userId)
    }

    restoreClientState()
    bootstrapDefaultNoticeIfNeeded(phone: phone)
  }

  func appendNotice(title: String, detail: String, source: String = "client", isUnread: Bool = true) {
    let notice = SystemNotice(
      id: UUID().uuidString,
      title: title,
      detail: detail,
      source: source,
      createdAt: .now,
      isUnread: isUnread
    )
    pendingNotices.insert(notice, at: 0)
    persistClientState()
  }

  func markAllNoticesRead() {
    pendingNotices = pendingNotices.map { notice in
      var next = notice
      next.isUnread = false
      return next
    }
    persistClientState()
  }

  func updateRestriction(_ restricted: Bool, reason: String? = nil) {
    isRestricted = restricted
    if restricted {
      appendNotice(
        title: "账号安全状态变更",
        detail: reason ?? "当前账号被标记为受限，请联系管理员确认是否需要解除限制。",
        source: "security",
        isUnread: true
      )
    } else {
      persistClientState()
    }
  }

  // MARK: - API wrappers (带鉴权)

  func listConversations() async throws -> [Conversation] {
    try await authorizedRequest {
      try await api.request("/conversations", method: .get)
    }
  }

  func createDM(peerPhone: String) async throws -> Conversation {
    try await authorizedRequest {
      try await api.request("/conversations/dm", method: .post, body: CreateDMRequest(peerPhone: peerPhone))
    }
  }

  func listMessages(conversationId: String, limit: Int = 50) async throws -> [Message] {
    let path = "/messages?conversationId=\(conversationId)&limit=\(limit)"
    return try await authorizedRequest {
      try await api.request(path, method: .get)
    }
  }

  func sendMessage(_ req: SendMessageRequest) async throws -> Message {
    try await authorizedRequest {
      try await api.request("/messages", method: .post, body: req)
    }
  }

  func createReceipt(messageId: String, type: ReceiptType) async throws {
    struct Ok: Codable { let ok: Bool }
    _ = try await authorizedRequest {
      try await api.request("/messages/\(messageId)/receipt", method: .post, body: CreateReceiptRequest(type: type))
        as Ok
    }
  }

  func createUploadMetadata(filename: String, mimeType: String, size: Int) async throws -> FileUploadResponse {
    try await authorizedRequest {
      try await api.request(
        "/files/upload",
        method: .post,
        body: FileUploadRequest(filename: filename, mimeType: mimeType, size: size)
      )
    }
  }

  func uploadFile(to uploadUrl: String, data: Data, contentType: String) async throws {
    guard let url = URL(string: uploadUrl) else { throw APIError.invalidURL }
    try await api.upload(to: url, data: data, contentType: contentType)
  }

  private func restoreClientState() {
    isRestricted = UserDefaults.standard.bool(forKey: LocalStateKeys.isRestricted)
    guard let raw = UserDefaults.standard.data(forKey: LocalStateKeys.pendingNotices),
          let notices = try? JSONDecoder.api.decode([SystemNotice].self, from: raw) else {
      pendingNotices = []
      return
    }
    pendingNotices = notices.sorted { $0.createdAt > $1.createdAt }
  }

  private func bootstrapDefaultNoticeIfNeeded(phone: String) {
    guard pendingNotices.isEmpty else { return }
    pendingNotices = [SystemNotice.welcome(phone: phone)]
    persistClientState()
  }

  private func persistClientState() {
    UserDefaults.standard.set(isRestricted, forKey: LocalStateKeys.isRestricted)
    if let raw = try? JSONEncoder.api.encode(pendingNotices) {
      UserDefaults.standard.set(raw, forKey: LocalStateKeys.pendingNotices)
    }
  }
}

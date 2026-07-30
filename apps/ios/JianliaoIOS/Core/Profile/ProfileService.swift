import Foundation

struct ProfileSummaryPayload: Codable {
  var displayName: String
  var phone: String
  var memberSince: String
  var safetyLevel: String

  var isRestricted: Bool {
    safetyLevel.localizedCaseInsensitiveContains("受限")
  }

  static func placeholder(phone: String?) -> ProfileSummaryPayload {
    let phoneText = (phone?.isEmpty == false ? phone : nil) ?? "未登录"
    ProfileSummaryPayload(
      displayName: phone?.isEmpty == false ? "用户\(phoneText.suffix(4))" : "未登录",
      phone: phoneText,
      memberSince: "--",
      safetyLevel: "标准保护"
    )
  }
}

struct ProfileWalletPayload: Codable {
  var balance: Double
  var pendingIncome: Double
  var currency: String
  var updatedAt: String

  static let placeholder = ProfileWalletPayload(
    balance: 0,
    pendingIncome: 0,
    currency: AppConfig.walletCurrencyCode,
    updatedAt: ""
  )
}

struct ProfileEarningsPayload: Codable {
  var today: Double
  var thisWeek: Double
  var thisMonth: Double

  static let placeholder = ProfileEarningsPayload(today: 0, thisWeek: 0, thisMonth: 0)
}

struct ProfileAgentPayload: Codable {
  var level: String
  var teamCount: Int
  var commissionRate: String
  var status: String

  static let placeholder = ProfileAgentPayload(
    level: "未激活",
    teamCount: 0,
    commissionRate: "--",
    status: "待接入"
  )
}

struct ProfileSystemNoticePayload: Codable, Identifiable, Hashable {
  var id: String
  var title: String
  var summary: String
  var createdAt: String
  var status: String

  var isUnread: Bool {
    status == "未读"
  }
}

final class ProfileService {
  private let api: APIClient

  init(authProvider: AuthProviding) {
    self.api = APIClient(authProvider: authProvider)
  }

  func fetchSummary() async throws -> ProfileSummaryPayload {
    try await api.request("/profile/summary", method: .get)
  }

  func fetchWallet() async throws -> ProfileWalletPayload {
    try await api.request("/profile/wallet", method: .get)
  }

  func fetchEarnings() async throws -> ProfileEarningsPayload {
    try await api.request("/profile/earnings", method: .get)
  }

  func fetchAgent() async throws -> ProfileAgentPayload {
    try await api.request("/profile/agent", method: .get)
  }

  func fetchSystemNotices() async throws -> [ProfileSystemNoticePayload] {
    try await api.request("/profile/system-notices", method: .get)
  }
}

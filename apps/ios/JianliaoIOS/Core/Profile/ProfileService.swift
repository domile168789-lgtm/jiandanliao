import Foundation

private let demoMemberSince = "2026-07-01"

private func profilePhoneDigits(_ phone: String?) -> String {
  (phone ?? "").filter(\.isNumber)
}

private func profilePhoneTail(_ phone: String?) -> String {
  let digits = profilePhoneDigits(phone)
  return digits.isEmpty ? "0000" : String(digits.suffix(4))
}

private func profileSeed(_ phone: String?) -> Int {
  profilePhoneDigits(phone).reduce(0) { partialResult, digit in
    partialResult + Int(String(digit))!
  }
}

private func clampMoney(_ value: Double) -> Double {
  (value * 100).rounded() / 100
}

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

  static func demo(phone: String?) -> ProfileSummaryPayload {
    let phoneText = (phone?.isEmpty == false ? phone : nil) ?? "演示账号"
    return ProfileSummaryPayload(
      displayName: "用户\(profilePhoneTail(phone))",
      phone: phoneText,
      memberSince: demoMemberSince,
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

  static func demo(phone: String?) -> ProfileWalletPayload {
    let seed = profileSeed(phone)
    return ProfileWalletPayload(
      balance: clampMoney(960 + Double(seed) * 7.2),
      pendingIncome: clampMoney(88 + Double(seed) * 2.1),
      currency: AppConfig.walletCurrencyCode,
      updatedAt: ISO8601DateFormatter().string(from: .now)
    )
  }
}

struct ProfileEarningsPayload: Codable {
  var today: Double
  var thisWeek: Double
  var thisMonth: Double

  static let placeholder = ProfileEarningsPayload(today: 0, thisWeek: 0, thisMonth: 0)

  static func demo(phone: String?) -> ProfileEarningsPayload {
    let seed = Double(profileSeed(phone))
    return ProfileEarningsPayload(
      today: clampMoney(18 + seed * 0.7),
      thisWeek: clampMoney(136 + seed * 3.3),
      thisMonth: clampMoney(640 + seed * 11.8)
    )
  }
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

  static func demo(phone: String?) -> ProfileAgentPayload {
    let levels = ["普通代理", "高级代理", "渠道代理"]
    let commissionRates = ["12%", "18%", "24%"]
    let seed = profileSeed(phone)
    let index = levels.isEmpty ? 0 : seed % levels.count
    return ProfileAgentPayload(
      level: levels[index],
      teamCount: 4 + (seed % 18),
      commissionRate: commissionRates[index],
      status: "演示状态"
    )
  }
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

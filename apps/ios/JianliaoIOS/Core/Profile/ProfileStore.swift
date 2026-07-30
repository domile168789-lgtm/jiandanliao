import Foundation
import SwiftUI

enum ProfileSection: CaseIterable, Hashable {
  case summary
  case wallet
  case earnings
  case agent
  case notices

  var title: String {
    switch self {
    case .summary:
      return "账号资料"
    case .wallet:
      return "钱包"
    case .earnings:
      return "收益"
    case .agent:
      return "代理"
    case .notices:
      return "系统通知"
    }
  }
}

enum ProfileSectionSource: Equatable {
  case live
  case demoFallback

  var isLive: Bool { self == .live }
}

@MainActor
final class ProfileStore: ObservableObject {
  @Published private(set) var summary: ProfileSummaryPayload
  @Published private(set) var wallet: ProfileWalletPayload
  @Published private(set) var earnings: ProfileEarningsPayload
  @Published private(set) var agent: ProfileAgentPayload
  @Published private(set) var notices: [ProfileSystemNoticePayload]
  @Published private(set) var summarySource: ProfileSectionSource
  @Published private(set) var walletSource: ProfileSectionSource
  @Published private(set) var earningsSource: ProfileSectionSource
  @Published private(set) var agentSource: ProfileSectionSource
  @Published private(set) var noticesSource: ProfileSectionSource
  @Published private(set) var sectionIssues: [ProfileSection: String]
  @Published private(set) var isRefreshing = false
  @Published private(set) var loadError: String?

  private let service: ProfileService
  private let noticeFallbackProvider: () -> [SystemNotice]
  private var hasLoaded = false

  init(
    service: ProfileService,
    phoneHint: String? = nil,
    noticeFallbackProvider: @escaping () -> [SystemNotice] = { [] }
  ) {
    self.service = service
    self.noticeFallbackProvider = noticeFallbackProvider
    self.summary = .demo(phone: phoneHint)
    self.wallet = .demo(phone: phoneHint)
    self.earnings = .demo(phone: phoneHint)
    self.agent = .demo(phone: phoneHint)
    self.notices = ProfileStore.makeFallbackNotices(from: noticeFallbackProvider())
    self.summarySource = .demoFallback
    self.walletSource = .demoFallback
    self.earningsSource = .demoFallback
    self.agentSource = .demoFallback
    self.noticesSource = .demoFallback
    self.sectionIssues = [:]
  }

  var unreadNoticeCount: Int {
    notices.filter { $0.isUnread }.count
  }

  var isRestricted: Bool {
    summary.isRestricted
  }

  var failedSectionCount: Int {
    sectionIssues.count
  }

  var isFullyLive: Bool {
    source(for: .summary).isLive &&
      source(for: .wallet).isLive &&
      source(for: .earnings).isLive &&
      source(for: .agent).isLive &&
      source(for: .notices).isLive
  }

  var statusTone: StateTone? {
    guard failedSectionCount > 0 else { return nil }
    return failedSectionCount == ProfileSection.allCases.count ? .error : .warning
  }

  var statusTitle: String? {
    guard failedSectionCount > 0 else { return nil }
    if failedSectionCount == ProfileSection.allCases.count {
      return "实时接口暂不可用"
    }
    return "部分实时数据加载失败"
  }

  var statusMessage: String? {
    guard failedSectionCount > 0 else { return nil }
    let failedTitles = ProfileSection.allCases
      .filter { sectionIssues[$0] != nil }
      .map(\.title)
      .joined(separator: "、")
    if failedSectionCount == ProfileSection.allCases.count {
      return "当前已自动切到演示兜底，便于继续走查页面与交互。失败范围：\(failedTitles)。"
    }
    return "已保留成功返回的实时数据，并对失败模块启用演示兜底。失败范围：\(failedTitles)。"
  }

  func refreshIfNeeded(phoneHint: String?) async {
    guard !hasLoaded else { return }
    await refreshAll(phoneHint: phoneHint)
  }

  func refreshAll(phoneHint: String?) async {
    guard !isRefreshing else { return }

    isRefreshing = true
    loadError = nil
    sectionIssues = [:]
    defer {
      isRefreshing = false
      hasLoaded = true
    }

    var firstError: Error?

    switch await capture({ try await service.fetchSummary() }) {
    case let .success(payload):
      summary = payload
      summarySource = .live
    case let .failure(error):
      summary = .demo(phone: phoneHint)
      summarySource = .demoFallback
      sectionIssues[.summary] = error.localizedDescription
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchWallet() }) {
    case let .success(payload):
      wallet = payload
      walletSource = .live
    case let .failure(error):
      wallet = .demo(phone: phoneHint)
      walletSource = .demoFallback
      sectionIssues[.wallet] = error.localizedDescription
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchEarnings() }) {
    case let .success(payload):
      earnings = payload
      earningsSource = .live
    case let .failure(error):
      earnings = .demo(phone: phoneHint)
      earningsSource = .demoFallback
      sectionIssues[.earnings] = error.localizedDescription
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchAgent() }) {
    case let .success(payload):
      agent = payload
      agentSource = .live
    case let .failure(error):
      agent = .demo(phone: phoneHint)
      agentSource = .demoFallback
      sectionIssues[.agent] = error.localizedDescription
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchSystemNotices() }) {
    case let .success(payload):
      notices = payload.sorted { $0.createdAt > $1.createdAt }
      noticesSource = .live
    case let .failure(error):
      notices = Self.makeFallbackNotices(from: noticeFallbackProvider())
      noticesSource = .demoFallback
      sectionIssues[.notices] = error.localizedDescription
      firstError = firstError ?? error
    }

    if let firstError {
      loadError = firstError.localizedDescription
    }
  }

  func markAllNoticesRead() {
    notices = notices.map { notice in
      var next = notice
      next.status = "已读"
      return next
    }
  }

  func clear(phoneHint: String?) {
    summary = .demo(phone: phoneHint)
    wallet = .demo(phone: phoneHint)
    earnings = .demo(phone: phoneHint)
    agent = .demo(phone: phoneHint)
    notices = Self.makeFallbackNotices(from: noticeFallbackProvider())
    summarySource = .demoFallback
    walletSource = .demoFallback
    earningsSource = .demoFallback
    agentSource = .demoFallback
    noticesSource = .demoFallback
    sectionIssues = [:]
    loadError = nil
    isRefreshing = false
    hasLoaded = false
  }

  func source(for section: ProfileSection) -> ProfileSectionSource {
    switch section {
    case .summary:
      return summarySource
    case .wallet:
      return walletSource
    case .earnings:
      return earningsSource
    case .agent:
      return agentSource
    case .notices:
      return noticesSource
    }
  }

  func issue(for section: ProfileSection) -> String? {
    sectionIssues[section]
  }

  private func capture<T>(_ operation: () async throws -> T) async -> Result<T, Error> {
    do {
      return .success(try await operation())
    } catch {
      return .failure(error)
    }
  }

  private static func makeFallbackNotices(from source: [SystemNotice]) -> [ProfileSystemNoticePayload] {
    if !source.isEmpty {
      return source.map { notice in
        ProfileSystemNoticePayload(
          id: notice.id,
          title: notice.title,
          summary: notice.detail,
          createdAt: ISO8601DateFormatter().string(from: notice.createdAt),
          status: notice.isUnread ? "未读" : "已读"
        )
      }
      .sorted { $0.createdAt > $1.createdAt }
    }

    return [
      ProfileSystemNoticePayload(
        id: "demo-notice-default",
        title: "系统通知演示兜底",
        summary: "当前未拉到真实通知，已展示本地演示消息，便于继续验收通知入口与空态交互。",
        createdAt: ISO8601DateFormatter().string(from: .now),
        status: "未读"
      )
    ]
  }
}

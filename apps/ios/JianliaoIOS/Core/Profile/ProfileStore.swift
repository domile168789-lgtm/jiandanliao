import Foundation
import SwiftUI

@MainActor
final class ProfileStore: ObservableObject {
  @Published private(set) var summary: ProfileSummaryPayload
  @Published private(set) var wallet: ProfileWalletPayload
  @Published private(set) var earnings: ProfileEarningsPayload
  @Published private(set) var agent: ProfileAgentPayload
  @Published private(set) var notices: [ProfileSystemNoticePayload]
  @Published private(set) var isRefreshing = false
  @Published private(set) var loadError: String?

  private let service: ProfileService
  private var hasLoaded = false

  init(service: ProfileService, phoneHint: String? = nil) {
    self.service = service
    self.summary = .placeholder(phone: phoneHint)
    self.wallet = .placeholder
    self.earnings = .placeholder
    self.agent = .placeholder
    self.notices = []
  }

  var unreadNoticeCount: Int {
    notices.filter { $0.isUnread }.count
  }

  var isRestricted: Bool {
    summary.isRestricted
  }

  func refreshIfNeeded(phoneHint: String?) async {
    guard !hasLoaded else { return }
    await refreshAll(phoneHint: phoneHint)
  }

  func refreshAll(phoneHint: String?) async {
    guard !isRefreshing else { return }
    if let phoneHint {
      summary = .placeholder(phone: phoneHint)
    }

    isRefreshing = true
    loadError = nil
    defer {
      isRefreshing = false
      hasLoaded = true
    }

    var firstError: Error?

    switch await capture({ try await service.fetchSummary() }) {
    case let .success(payload):
      summary = payload
    case let .failure(error):
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchWallet() }) {
    case let .success(payload):
      wallet = payload
    case let .failure(error):
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchEarnings() }) {
    case let .success(payload):
      earnings = payload
    case let .failure(error):
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchAgent() }) {
    case let .success(payload):
      agent = payload
    case let .failure(error):
      firstError = firstError ?? error
    }

    switch await capture({ try await service.fetchSystemNotices() }) {
    case let .success(payload):
      notices = payload.sorted { $0.createdAt > $1.createdAt }
    case let .failure(error):
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
    summary = .placeholder(phone: phoneHint)
    wallet = .placeholder
    earnings = .placeholder
    agent = .placeholder
    notices = []
    loadError = nil
    isRefreshing = false
    hasLoaded = false
  }

  private func capture<T>(_ operation: () async throws -> T) async -> Result<T, Error> {
    do {
      return .success(try await operation())
    } catch {
      return .failure(error)
    }
  }
}

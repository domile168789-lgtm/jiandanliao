import SwiftUI

struct EarningsView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      Section {
        VStack(alignment: .leading, spacing: 10) {
          SourceBadge(isLive: profile.earningsSource.isLive)
          if let issue = profile.issue(for: .earnings) {
            Text("收益接口失败，当前展示演示兜底：\(issue)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          } else {
            Text("今日、本周、本月收益均来自实时接口。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      }

      Section("收益概览") {
        StatRow(title: "今日收益", value: currency(profile.earnings.today), trend: profile.earningsSource.isLive ? "实时概览" : "演示兜底")
        StatRow(title: "本周收益", value: currency(profile.earnings.thisWeek), trend: profile.earningsSource.isLive ? "实时概览" : "演示兜底")
        StatRow(title: "本月收益", value: currency(profile.earnings.thisMonth), trend: "按月累计")
      }

      Section("结算节奏") {
        Text("真实接口优先；接口失败时展示演示数据，并保留结算说明与发现页联动。")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
    .navigationTitle("收益")
    .refreshable {
      await profile.refreshAll(phoneHint: auth.phone)
    }
    .task {
      await profile.refreshIfNeeded(phoneHint: auth.phone)
    }
  }

  private func currency(_ value: Double) -> String {
    value.formatted(.currency(code: profile.wallet.currency))
  }
}

private struct StatRow: View {
  let title: String
  let value: String
  let trend: String

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(title)
          .font(.headline)
        Text(trend)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      Spacer()
      Text(value)
        .font(.headline.monospacedDigit())
    }
    .padding(.vertical, 2)
  }
}

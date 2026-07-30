import SwiftUI

struct EarningsView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      Section("收益概览") {
        StatRow(title: "今日收益", value: currency(profile.earnings.today), trend: "轻量接口")
        StatRow(title: "本周收益", value: currency(profile.earnings.thisWeek), trend: "实时概览")
        StatRow(title: "本月收益", value: currency(profile.earnings.thisMonth), trend: "按月累计")
      }

      Section("结算节奏") {
        Text("收益页已切到轻量收益接口，继续保留结算说明结构，便于代理、钱包、公告之间形成闭环。")
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

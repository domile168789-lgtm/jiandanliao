import SwiftUI

struct WalletView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      Section {
        VStack(alignment: .leading, spacing: 8) {
          Text("可提现余额")
            .font(.footnote)
            .foregroundStyle(.secondary)
          Text(currency(profile.wallet.balance))
            .font(.largeTitle.weight(.bold))
          Text("待入账金额：\(currency(profile.wallet.pendingIncome))")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 8)
      }

      Section("资金概览") {
        LabeledContent("待入账", value: currency(profile.wallet.pendingIncome))
        LabeledContent("提现状态", value: "审核中")
        LabeledContent("最近更新", value: formattedDate(profile.wallet.updatedAt))
        LabeledContent("结算规则", value: AppConfig.walletSettlementRule)
      }

      Section("说明") {
        Text("当前页面已接入轻量钱包接口，保留现有用户端结构，仅将资金概览切换为实时数据。")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
    .navigationTitle("钱包")
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

  private func formattedDate(_ raw: String) -> String {
    guard !raw.isEmpty else { return "暂无" }
    let formatter = ISO8601DateFormatter()
    if let date = formatter.date(from: raw) {
      return date.formatted(date: .abbreviated, time: .shortened)
    }
    return raw
  }
}

import SwiftUI

struct DiscoverView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    NavigationStack {
      List {
        if let tone = profile.statusTone,
           let title = profile.statusTitle,
           let message = profile.statusMessage {
          Section {
            StatusBanner(tone: tone, title: title, message: message, actionTitle: "重新拉取") {
              Task {
                await profile.refreshAll(phoneHint: auth.phone)
              }
            }
          }
        }

        Section("运营入口") {
          NavigationLink {
            SystemNoticeView()
          } label: {
            FeatureRow(
              title: "系统通知",
              subtitle: noticeSubtitle,
              icon: "bell.badge",
              isLive: profile.noticesSource.isLive
            )
          }

          NavigationLink {
            WalletView()
          } label: {
            FeatureRow(
              title: "钱包",
              subtitle: walletSubtitle,
              icon: "wallet.pass",
              isLive: profile.walletSource.isLive
            )
          }

          NavigationLink {
            EarningsView()
          } label: {
            FeatureRow(
              title: "收益",
              subtitle: earningsSubtitle,
              icon: "chart.line.uptrend.xyaxis",
              isLive: profile.earningsSource.isLive
            )
          }

          NavigationLink {
            AgentView()
          } label: {
            FeatureRow(
              title: "代理",
              subtitle: agentSubtitle,
              icon: "person.3.sequence",
              isLive: profile.agentSource.isLive
            )
          }
        }

        Section("联调信息") {
          LabeledContent("API", value: AppConfig.apiBaseURL.absoluteString)
          LabeledContent("WS", value: AppConfig.wsBaseURL.absoluteString)
          Text("当前 iOS 端优先承接真实消息链路，发现页作为钱包、公告和代理能力的统一入口。")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("发现")
      .refreshable {
        await profile.refreshAll(phoneHint: auth.phone)
      }
      .task {
        await profile.refreshIfNeeded(phoneHint: auth.phone)
      }
    }
  }

  private var noticeSubtitle: String {
    profile.unreadNoticeCount > 0
      ? "你有 \(profile.unreadNoticeCount) 条待查看系统通知"
      : "查看运营公告、风控提醒和联动消息"
  }

  private var walletSubtitle: String {
    "可提现 \(currency(profile.wallet.balance))，待入账 \(currency(profile.wallet.pendingIncome))"
  }

  private var earningsSubtitle: String {
    "今日 \(currency(profile.earnings.today))，本周 \(currency(profile.earnings.thisWeek))"
  }

  private var agentSubtitle: String {
    "\(profile.agent.level) · 团队 \(profile.agent.teamCount) 人 · 佣金 \(profile.agent.commissionRate)"
  }

  private func currency(_ value: Double) -> String {
    value.formatted(.currency(code: profile.wallet.currency))
  }
}

private struct FeatureRow: View {
  let title: String
  let subtitle: String
  let icon: String
  let isLive: Bool

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: icon)
        .font(.system(size: 20, weight: .semibold))
        .foregroundStyle(.indigo)
        .frame(width: 28)
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(title)
            .font(.headline)
          SourceBadge(isLive: isLive)
        }
        Text(subtitle)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }
}

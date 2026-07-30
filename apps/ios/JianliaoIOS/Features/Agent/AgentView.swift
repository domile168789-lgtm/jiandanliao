import SwiftUI

struct AgentView: View {
  @EnvironmentObject private var auth: AuthStore
  @EnvironmentObject private var profile: ProfileStore

  var body: some View {
    List {
      Section {
        VStack(alignment: .leading, spacing: 10) {
          SourceBadge(isLive: profile.agentSource.isLive)
          if let issue = profile.issue(for: .agent) {
            Text("代理接口失败，当前展示演示兜底：\(issue)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          } else {
            Text("当前等级、团队人数和佣金比例均来自实时接口。")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      }

      Section("代理概览") {
        LabeledContent("当前等级", value: profile.agent.level)
        LabeledContent("直属成员", value: "\(profile.agent.teamCount)")
        LabeledContent("佣金比例", value: profile.agent.commissionRate)
      }

      Section("本周目标") {
        Text("当前状态：\(profile.agent.status)\n建议结合系统通知中的活动与风控提醒安排本周跟进。")
          .font(.subheadline)
      }

      Section("服务信息") {
        LabeledContent("客服邮箱", value: AppConfig.supportEmail)
        LabeledContent("客服热线", value: AppConfig.supportHotline)
      }
    }
    .navigationTitle("代理")
    .refreshable {
      await profile.refreshAll(phoneHint: auth.phone)
    }
    .task {
      await profile.refreshIfNeeded(phoneHint: auth.phone)
    }
  }
}

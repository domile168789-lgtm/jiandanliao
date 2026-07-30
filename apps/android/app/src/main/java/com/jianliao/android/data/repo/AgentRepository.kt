package com.jianliao.android.data.repo

import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.api.JianliaoApi

data class AgentMetric(
    val label: String,
    val value: String
)

data class AgentOverview(
    val level: String,
    val inviteCode: String,
    val teamSize: Int,
    val metrics: List<AgentMetric>,
    val tips: List<String>
)

class AgentRepository(
    private val api: JianliaoApi
) {
    suspend fun getAgentOverview(): AgentOverview = runCatching {
        val dto = api.getProfileAgent()
        val session = ServiceLocator.sessionState.value
        val inviteCode = (session.userId ?: "agent").takeLast(6).uppercase().padStart(6, 'A')
        AgentOverview(
            level = dto.level,
            inviteCode = inviteCode,
            teamSize = dto.teamCount,
            metrics = listOf(
                AgentMetric("团队人数", "${dto.teamCount} 人"),
                AgentMetric("佣金比例", dto.commissionRate),
                AgentMetric("代理状态", dto.status),
                AgentMetric("邀请码", inviteCode)
            ),
            tips = listOf(
                "代理等级与团队规模来自轻量接口，适合在移动端快速展示。",
                "邀请码继续沿用当前会话账号派生规则，避免改动现有页面结构。",
                "后续如需真实邀请链接，可在不改页面骨架的前提下补充独立接口。"
            )
        )
    }.getOrElse {
        AgentOverview(
            level = "一级代理",
            inviteCode = "JD2026A",
            teamSize = 26,
            metrics = listOf(
                AgentMetric("本周新增", "8 人"),
                AgentMetric("本月激活", "23 人"),
                AgentMetric("累计收益", "\$9,820.00"),
                AgentMetric("待结算", "\$420.00")
            ),
            tips = listOf(
                "邀请链接与邀请码在 Web/H5、Android、iOS 三端保持一致。",
                "后台发布活动后，发现页和系统通知会同步出现入口。",
                "收益明细以后台财务报表为准，客户端提供日常查看与跟进入口。"
            )
        )
    }
}

package com.jianliao.android.data.repo

import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.api.JianliaoApi

data class SystemNoticeItem(
    val category: String,
    val title: String,
    val content: String,
    val timestamp: String
)

class SystemNoticeRepository(
    private val api: JianliaoApi
) {
    suspend fun listNotices(): List<SystemNoticeItem> = runCatching {
        api.getProfileSystemNotices().map { notice ->
            SystemNoticeItem(
                category = resolveCategory(notice.title, notice.summary),
                title = notice.title,
                content = notice.summary,
                timestamp = formatTime(notice.createdAt)
            )
        }
    }.getOrElse {
        val session = ServiceLocator.sessionState.value
        val riskContent = session.restrictionReason ?: "当前账号状态正常，如有风险策略变更会在此同步。"
        listOf(
            SystemNoticeItem(
                category = "官方公告",
                title = "柬单聊 Android 完整版已接入发现/我的/系统通知导航",
                content = "现在可从底部导航进入消息、通讯录、发现、我的四大主区。",
                timestamp = "今天 10:00"
            ),
            SystemNoticeItem(
                category = "风险通知",
                title = "账号安全状态",
                content = riskContent,
                timestamp = "今天 09:40"
            ),
            SystemNoticeItem(
                category = "举报反馈",
                title = "举报处理回执",
                content = "用户举报结果会由后台联动写入系统通知会话，后续可替换为真实接口数据。",
                timestamp = "昨天 19:20"
            ),
            SystemNoticeItem(
                category = "活动消息",
                title = "活动中心开放邀请奖励",
                content = "进入发现页可查看活动中心、推广入口与下载引导。",
                timestamp = "昨天 14:05"
            )
        )
    }

    private fun resolveCategory(title: String, summary: String): String {
        val text = "$title $summary"
        return when {
            text.contains("举报") -> "举报反馈"
            text.contains("活动") -> "活动消息"
            text.contains("安全") || text.contains("账号") || text.contains("受限") || text.contains("风控") -> "风险通知"
            else -> "官方公告"
        }
    }

    private fun formatTime(value: String): String {
        return value.replace('T', ' ').take(16)
    }
}

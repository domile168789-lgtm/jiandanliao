package com.jianliao.android.data.repo

import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.api.JianliaoApi

data class ProfileSummary(
    val displayName: String,
    val accountId: String,
    val phone: String,
    val bio: String,
    val inviteCode: String,
    val completionProgress: Int,
    val systemNoticeCount: Int
)

data class ContactSummary(
    val id: String,
    val name: String,
    val subtitle: String,
    val tag: String,
    val conversationId: String? = null
)

data class GroupSummary(
    val name: String,
    val role: String,
    val memberCount: Int,
    val announcement: String
)

data class DiscoverEntry(
    val title: String,
    val description: String,
    val route: String? = null
)

data class DeviceSession(
    val name: String,
    val location: String,
    val lastActiveAt: String,
    val trusted: Boolean
)

data class SecurityOverview(
    val riskLevel: String,
    val banDescription: String,
    val deviceSessions: List<DeviceSession>,
    val suggestions: List<String>
)

class ProfileRepository(
    private val api: JianliaoApi
) {
    suspend fun getProfileSummary(): RepositoryResult<ProfileSummary> {
        val session = ServiceLocator.sessionState.value
        val userId = session.userId ?: "guest"
        return runCatching {
            val summary = api.getProfileSummary()
            val noticeCount = api.getProfileSystemNotices().size
            networkResult(
                data = ProfileSummary(
                    displayName = summary.displayName.ifBlank { session.displayName },
                    accountId = userId,
                    phone = summary.phone.ifBlank { session.maskedPhone },
                    bio = "加入时间 ${summary.memberSince} · 安全等级 ${summary.safetyLevel}",
                    inviteCode = userId.takeLast(6).uppercase().padStart(6, 'A'),
                    completionProgress = if (session.nickname.isNullOrBlank()) 78 else 92,
                    systemNoticeCount = noticeCount
                ),
                message = "个人资料与系统通知数量来自真实接口。"
            )
        }.getOrElse {
            fallbackResult(
                data = ProfileSummary(
                    displayName = session.displayName,
                    accountId = userId,
                    phone = session.maskedPhone,
                    bio = "已接入真实登录链路，可继续补充头像、昵称与资料编辑接口。",
                    inviteCode = userId.takeLast(6).uppercase().padStart(6, 'A'),
                    completionProgress = if (session.nickname.isNullOrBlank()) 70 else 92,
                    systemNoticeCount = session.pendingNoticeCount
                ),
                message = "个人资料接口暂不可用，已回退到当前登录态与本地演示信息。"
            )
        }
    }

    suspend fun getContacts(): RepositoryResult<List<ContactSummary>> {
        val fallbackConversationId = runCatching {
            ServiceLocator.conversationRepository.list().firstOrNull()?.id
        }.getOrNull()
        return fallbackResult(
            data = listOf(
                ContactSummary(
                    id = "friend-001",
                    name = "运营小助手",
                    subtitle = "账号搜素、好友申请、系统答疑",
                    tag = "官方",
                    conversationId = fallbackConversationId
                ),
                ContactSummary(
                    id = "friend-002",
                    name = "群管理通知",
                    subtitle = "拉群、移除成员、群公告提醒",
                    tag = "群组"
                ),
                ContactSummary(
                    id = "friend-003",
                    name = "安全中心",
                    subtitle = "黑名单、举报、风控结果查看",
                    tag = "安全"
                )
            ),
            message = "通讯录正式接口尚未接入，当前展示必要的演示联系人。"
        )
    }

    suspend fun getGroups(): RepositoryResult<List<GroupSummary>> = fallbackResult(
        data = listOf(
            GroupSummary(
                name = "柬单聊官方体验群",
                role = "群成员",
                memberCount = 128,
                announcement = "新版本开放图片消息与系统通知联动。"
            ),
            GroupSummary(
                name = "一级代理答疑群",
                role = "管理员",
                memberCount = 42,
                announcement = "每日 18:00 更新代理收益数据。"
            )
        ),
        message = "群组概览暂由演示数据兜底，避免发现/通讯录页出现空白。"
    )

    suspend fun getDiscoverEntries(): RepositoryResult<List<DiscoverEntry>> = fallbackResult(
        data = listOf(
            DiscoverEntry(
                title = "活动中心",
                description = "查看官方活动、参与入口和奖池说明",
                route = "agent"
            ),
            DiscoverEntry(
                title = "官方公告",
                description = "重要公告、活动消息、举报反馈统一沉淀",
                route = "system_notice"
            ),
            DiscoverEntry(
                title = "邀请推广",
                description = "查看邀请码、邀请链接与推广收益概览",
                route = "agent"
            ),
            DiscoverEntry(
                title = "下载引导",
                description = "Android 下载、iOS 安装说明、版本更新记录"
            )
        ),
        message = "发现页入口仍由演示配置驱动，等后端补齐活动/下载配置接口后可无缝替换。"
    )

    suspend fun getSecurityOverview(): RepositoryResult<SecurityOverview> {
        val session = ServiceLocator.sessionState.value
        val riskLevel = if (session.isMessageRestricted) "受限" else "正常"
        val banDescription = session.restrictionReason ?: "当前账号可正常登录、发言与接收系统通知。"
        return fallbackResult(
            data = SecurityOverview(
                riskLevel = riskLevel,
                banDescription = banDescription,
                deviceSessions = listOf(
                    DeviceSession(
                        name = "Android 模拟器",
                        location = "本地开发环境",
                        lastActiveAt = "刚刚",
                        trusted = true
                    ),
                    DeviceSession(
                        name = "Web/H5",
                        location = "Chrome",
                        lastActiveAt = "今天 09:30",
                        trusted = true
                    )
                ),
                suggestions = listOf(
                    "如遇封禁或发言受限，优先查看系统通知中的风控说明。",
                    "定期清理不常用设备登录记录，降低账号共享风险。",
                    "举报、黑名单与代理申诉统一走安全页和系统通知闭环。"
                )
            ),
            message = "安全页当前优先复用登录态与本地设备信息，等待专门的安全接口上线。"
        )
    }
}

package com.jianliao.android.core

data class SessionState(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val userId: String? = null,
    val phone: String? = null,
    val nickname: String? = null,
    val isMessageRestricted: Boolean = false,
    val restrictionReason: String? = null,
    val pendingNoticeCount: Int = 0
) {
    val isLoggedIn: Boolean get() = !accessToken.isNullOrBlank() && !userId.isNullOrBlank()
    val displayName: String get() = nickname?.takeIf { it.isNotBlank() } ?: maskedPhone.ifBlank { "柬单聊用户" }
    val maskedPhone: String
        get() = phone
            ?.takeIf { it.length >= 7 }
            ?.replaceRange(3, 7, "****")
            ?: (phone ?: "未绑定手机")
}

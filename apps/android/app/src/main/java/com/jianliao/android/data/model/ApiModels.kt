package com.jianliao.android.data.model

import com.squareup.moshi.Json

data class ApiErrorDto(
    val code: String? = null,
    val message: String? = null
)

data class UserDto(
    val id: String,
    val phone: String,
    val nickname: String? = null
)

data class AuthResponseDto(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto
)

data class BrandingModel(
    val platformGroup: String,
    val projectName: String,
    val logoUrl: String? = null,
    val themeAssetUrl: String? = null
)

data class RegisterRequestDto(
    val phone: String,
    val password: String,
    val deviceId: String,
    val platform: String = "ANDROID",
    val nickname: String? = null
)

data class LoginPasswordRequestDto(
    val phone: String,
    val password: String,
    val deviceId: String,
    val platform: String = "ANDROID"
)

data class RefreshTokenRequestDto(
    val phone: String,
    val refreshToken: String,
    val deviceId: String
)

data class ConversationDto(
    val id: String,
    val type: String,
    val title: String? = null,
    val lastMessage: String? = null,
    val updatedAt: String? = null
)

data class CreateDmRequestDto(
    val peerPhone: String
)

data class MessageDto(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val type: String,
    val body: Map<String, Any?> = emptyMap(),
    val status: String? = null,
    val createdAt: String? = null
)

data class SendMessageRequestDto(
    val conversationId: String,
    val type: String,
    val body: Map<String, Any?>
)

data class ReceiptRequestDto(
    val type: String
)

data class ReceiptDto(
    val messageId: String,
    val userId: String,
    val type: String,
    val createdAt: String? = null
)

data class BasicOkDto(
    val ok: Boolean = true
)

data class FileUploadRequestDto(
    val filename: String,
    val mimeType: String,
    val size: Long
)

data class FileUploadResponseDto(
    val fileId: String,
    val objectKey: String,
    val uploadUrl: String
)

data class ProfileSummaryDto(
    val displayName: String,
    val phone: String,
    val memberSince: String,
    val safetyLevel: String
)

data class ProfileWalletDto(
    val balance: Double,
    val pendingIncome: Double,
    val currency: String,
    val updatedAt: String
)

data class ProfileEarningsDto(
    val today: Double,
    val thisWeek: Double,
    val thisMonth: Double
)

data class ProfileAgentDto(
    val level: String,
    val teamCount: Int,
    val commissionRate: String,
    val status: String
)

data class ProfileSystemNoticeDto(
    val id: String,
    val title: String,
    val summary: String,
    val createdAt: String,
    val status: String
)

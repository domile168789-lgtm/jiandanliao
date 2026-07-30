package com.jianliao.android.data.api

import com.jianliao.android.data.model.*
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface JianliaoApi {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequestDto): AuthResponseDto

    @POST("auth/login/password")
    suspend fun loginByPassword(@Body body: LoginPasswordRequestDto): AuthResponseDto

    @POST("auth/refresh-token")
    suspend fun refreshToken(@Body body: RefreshTokenRequestDto): AuthResponseDto

    @GET("public/branding")
    suspend fun getBranding(@Query("group") group: String): BrandingModel

    @GET("conversations")
    suspend fun listConversations(): List<ConversationDto>

    @POST("conversations/dm")
    suspend fun createDm(@Body body: CreateDmRequestDto): ConversationDto

    @GET("messages")
    suspend fun listMessages(
        @Query("conversationId") conversationId: String,
        @Query("limit") limit: Int = 50
    ): List<MessageDto>

    @POST("messages")
    suspend fun sendMessage(@Body body: SendMessageRequestDto): MessageDto

    @POST("messages/{id}/receipt")
    suspend fun sendReceipt(
        @Path("id") messageId: String,
        @Body body: ReceiptRequestDto
    ): BasicOkDto

    @POST("files/upload")
    suspend fun createUploadMetadata(@Body body: FileUploadRequestDto): FileUploadResponseDto

    @GET("profile/summary")
    suspend fun getProfileSummary(): ProfileSummaryDto

    @GET("profile/wallet")
    suspend fun getProfileWallet(): ProfileWalletDto

    @GET("profile/earnings")
    suspend fun getProfileEarnings(): ProfileEarningsDto

    @GET("profile/agent")
    suspend fun getProfileAgent(): ProfileAgentDto

    @GET("profile/system-notices")
    suspend fun getProfileSystemNotices(): List<ProfileSystemNoticeDto>
}

package com.jianliao.android.data.repo

import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.model.ConversationDto
import com.jianliao.android.data.model.CreateDmRequestDto

class ConversationRepository(
    private val api: JianliaoApi
) {
    suspend fun list(): List<ConversationDto> = api.listConversations()

    suspend fun createDm(peerPhone: String): ConversationDto = api.createDm(CreateDmRequestDto(peerPhone))
}


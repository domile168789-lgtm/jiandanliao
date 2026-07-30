package com.jianliao.android.data.repo

import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.model.MessageDto
import com.jianliao.android.data.model.ReceiptRequestDto
import com.jianliao.android.data.model.SendMessageRequestDto

class MessageRepository(
    private val api: JianliaoApi
) {
    suspend fun list(conversationId: String, limit: Int = 50): List<MessageDto> =
        api.listMessages(conversationId = conversationId, limit = limit)

    suspend fun sendText(conversationId: String, text: String): MessageDto =
        api.sendMessage(
            SendMessageRequestDto(
                conversationId = conversationId,
                type = "TEXT",
                body = mapOf("text" to text)
            )
        )

    suspend fun sendImage(conversationId: String, fileId: String, objectKey: String, mimeType: String): MessageDto =
        api.sendMessage(
            SendMessageRequestDto(
                conversationId = conversationId,
                type = "IMAGE",
                body = mapOf(
                    "fileId" to fileId,
                    "objectKey" to objectKey,
                    "mimeType" to mimeType
                )
            )
        )

    suspend fun sendReadReceipt(messageId: String) {
        api.sendReceipt(messageId = messageId, body = ReceiptRequestDto(type = "READ"))
    }
}


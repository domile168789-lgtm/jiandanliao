package com.jianliao.android.data.ws

import com.jianliao.android.data.model.MessageDto
import com.jianliao.android.data.model.ReceiptDto
import com.squareup.moshi.Moshi
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import org.json.JSONObject

class SocketRepository(
    private val moshi: Moshi
) {
    private val messageAdapter = moshi.adapter(MessageDto::class.java)
    private val receiptAdapter = moshi.adapter(ReceiptDto::class.java)

    private var socket: Socket? = null

    private val _messages = MutableSharedFlow<MessageDto>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val messages: SharedFlow<MessageDto> = _messages

    private val _receipts = MutableSharedFlow<ReceiptDto>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val receipts: SharedFlow<ReceiptDto> = _receipts

    fun isConnected(): Boolean = socket?.connected() == true

    fun connect(baseUrl: String, userId: String) {
        if (socket?.connected() == true) return

        val options = IO.Options.builder()
            .setPath("/socket.io/")
            .setTransports(arrayOf("websocket"))
            .build()

        val s = IO.socket(baseUrl, options)

        s.on(Socket.EVENT_CONNECT) {
            s.emit("auth:authenticate", JSONObject(mapOf("userId" to userId)))
        }

        s.on("message:new") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val dto = messageAdapter.fromJson(obj.toString()) ?: return@on
            _messages.tryEmit(dto)
        }

        s.on("receipt:new") { args ->
            val obj = args.firstOrNull() as? JSONObject ?: return@on
            val dto = receiptAdapter.fromJson(obj.toString()) ?: return@on
            _receipts.tryEmit(dto)
        }

        s.connect()
        socket = s
    }

    fun joinConversation(conversationId: String) {
        socket?.emit("conversation:join", JSONObject(mapOf("conversationId" to conversationId)))
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }
}


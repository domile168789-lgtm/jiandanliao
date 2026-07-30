package com.jianliao.android.ui.vm

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.model.MessageDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ChatUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val messages: List<MessageDto> = emptyList(),
    val inputText: String = "",
    val lastReceiptLog: String? = null
)

class ChatViewModel(
    private val conversationId: String
) : ViewModel() {
    private val _state = MutableStateFlow(ChatUiState())
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    init {
        // 进入会话房间，订阅 message/receipt
        ServiceLocator.ensureSocketConnected()
        ServiceLocator.socketRepository.joinConversation(conversationId)

        refresh()

        viewModelScope.launch {
            ServiceLocator.socketRepository.messages.collect { msg ->
                if (msg.conversationId == conversationId) {
                    _state.value = _state.value.copy(messages = (_state.value.messages + msg))
                }
            }
        }
        viewModelScope.launch {
            ServiceLocator.socketRepository.receipts.collect { r ->
                _state.value = _state.value.copy(lastReceiptLog = "receipt:new messageId=${r.messageId} userId=${r.userId} type=${r.type}")
            }
        }
    }

    fun updateInput(v: String) {
        _state.value = _state.value.copy(inputText = v, error = null)
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching {
                _state.value = _state.value.copy(loading = true, error = null)
                ServiceLocator.messageRepository.list(conversationId, limit = 50)
            }.onSuccess { list ->
                // 后端按 created_at DESC；UI 展示按时间正序
                _state.value = _state.value.copy(loading = false, messages = list.reversed())
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "加载消息失败")
            }
        }
    }

    fun sendText() {
        val text = _state.value.inputText.trim()
        if (text.isBlank()) return
        viewModelScope.launch {
            runCatching {
                _state.value = _state.value.copy(loading = true, error = null)
                ServiceLocator.messageRepository.sendText(conversationId, text)
            }.onSuccess { msg ->
                _state.value = _state.value.copy(loading = false, inputText = "", messages = _state.value.messages + msg)
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "发送失败")
            }
        }
    }

    fun sendReadReceipt(messageId: String) {
        viewModelScope.launch {
            runCatching {
                ServiceLocator.messageRepository.sendReadReceipt(messageId)
            }.onFailure { e ->
                _state.value = _state.value.copy(error = e.message ?: "发送回执失败")
            }
        }
    }

    fun sendImage(context: Context, uri: Uri) {
        viewModelScope.launch {
            runCatching {
                _state.value = _state.value.copy(loading = true, error = null)

                val (filename, mimeType, bytes) = readContent(context, uri)
                val meta = ServiceLocator.fileRepository.createUploadMetadata(
                    filename = filename,
                    mimeType = mimeType,
                    size = bytes.size.toLong()
                )
                withContext(Dispatchers.IO) {
                    ServiceLocator.fileRepository.uploadBytes(meta.uploadUrl, mimeType, bytes)
                }
                ServiceLocator.messageRepository.sendImage(
                    conversationId = conversationId,
                    fileId = meta.fileId,
                    objectKey = meta.objectKey,
                    mimeType = mimeType
                )
            }.onSuccess { msg ->
                _state.value = _state.value.copy(loading = false, messages = _state.value.messages + msg)
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "发送图片失败")
            }
        }
    }

    private suspend fun readContent(context: Context, uri: Uri): Triple<String, String, ByteArray> =
        withContext(Dispatchers.IO) {
            val resolver = context.contentResolver
            val mimeType = resolver.getType(uri) ?: "image/jpeg"

            var filename = "image.jpg"
            resolver.query(uri, null, null, null, null)?.use { c ->
                val nameIndex = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (c.moveToFirst() && nameIndex >= 0) {
                    filename = c.getString(nameIndex) ?: filename
                }
            }

            val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                ?: throw IllegalStateException("无法读取图片内容")

            Triple(filename, mimeType, bytes)
        }
}


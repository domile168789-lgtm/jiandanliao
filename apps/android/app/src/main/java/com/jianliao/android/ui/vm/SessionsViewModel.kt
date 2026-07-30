package com.jianliao.android.ui.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.model.ConversationDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SessionsUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val conversations: List<ConversationDto> = emptyList(),
    val peerPhoneInput: String = ""
)

class SessionsViewModel : ViewModel() {
    private val _state = MutableStateFlow(SessionsUiState())
    val state: StateFlow<SessionsUiState> = _state.asStateFlow()

    init {
        refresh()
    }

    fun updatePeerPhone(v: String) {
        _state.value = _state.value.copy(peerPhoneInput = v, error = null)
    }

    fun refresh() {
        viewModelScope.launch {
            runCatching {
                _state.value = _state.value.copy(loading = true, error = null)
                ServiceLocator.conversationRepository.list()
            }.onSuccess { list ->
                _state.value = _state.value.copy(loading = false, conversations = list)
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "加载会话失败")
            }
        }
    }

    fun createDm(onCreated: (ConversationDto) -> Unit) {
        val peer = _state.value.peerPhoneInput.trim()
        if (peer.isBlank()) {
            _state.value = _state.value.copy(error = "请输入 peerPhone")
            return
        }
        viewModelScope.launch {
            runCatching {
                _state.value = _state.value.copy(loading = true, error = null)
                ServiceLocator.conversationRepository.createDm(peer)
            }.onSuccess { conv ->
                _state.value = _state.value.copy(loading = false, peerPhoneInput = "")
                refresh()
                onCreated(conv)
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "创建私聊失败")
            }
        }
    }
}


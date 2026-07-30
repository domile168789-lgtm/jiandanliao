package com.jianliao.android.ui.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.model.BrandingModel
import com.jianliao.android.data.repo.BrandingRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val phone: String = "",
    val password: String = "",
    val nickname: String = "",
    val branding: BrandingModel = BrandingRepository.FALLBACK_BRANDING,
    val brandingLoaded: Boolean = false,
    val loading: Boolean = false,
    val error: String? = null
)

class AuthViewModel : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun updatePhone(v: String) = mutate { it.copy(phone = v, error = null) }
    fun updatePassword(v: String) = mutate { it.copy(password = v, error = null) }
    fun updateNickname(v: String) = mutate { it.copy(nickname = v, error = null) }
    fun clearError() = mutate { it.copy(error = null) }

    fun loadBranding() {
        if (_state.value.brandingLoaded) return
        viewModelScope.launch {
            val branding = ServiceLocator.brandingRepository.getMobileBranding()
            mutate { it.copy(branding = branding, brandingLoaded = true) }
        }
    }

    fun login(onSuccess: () -> Unit) {
        val s = _state.value
        viewModelScope.launch {
            runCatching {
                _state.value = s.copy(loading = true, error = null)
                ServiceLocator.authRepository.loginByPassword(s.phone.trim(), s.password)
            }.onSuccess {
                _state.value = _state.value.copy(loading = false)
                onSuccess()
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "登录失败")
            }
        }
    }

    fun register(onSuccess: () -> Unit) {
        val s = _state.value
        viewModelScope.launch {
            runCatching {
                _state.value = s.copy(loading = true, error = null)
                ServiceLocator.authRepository.register(
                    phone = s.phone.trim(),
                    password = s.password,
                    nickname = s.nickname.trim().ifBlank { null }
                )
            }.onSuccess {
                _state.value = _state.value.copy(loading = false)
                onSuccess()
            }.onFailure { e ->
                _state.value = _state.value.copy(loading = false, error = e.message ?: "注册失败")
            }
        }
    }

    private fun mutate(block: (AuthUiState) -> AuthUiState) {
        _state.value = block(_state.value)
    }
}

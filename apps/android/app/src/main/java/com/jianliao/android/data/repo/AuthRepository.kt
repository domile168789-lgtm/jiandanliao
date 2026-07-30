package com.jianliao.android.data.repo

import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.core.storage.StoredSession
import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.model.LoginPasswordRequestDto
import com.jianliao.android.data.model.RefreshTokenRequestDto
import com.jianliao.android.data.model.RegisterRequestDto

class AuthRepository(
    private val api: JianliaoApi
) {
    suspend fun register(phone: String, password: String, nickname: String?) {
        val resp = api.register(
            RegisterRequestDto(
                phone = phone,
                password = password,
                deviceId = ServiceLocator.deviceId,
                platform = "ANDROID",
                nickname = nickname
            )
        )
        ServiceLocator.saveSession(
            StoredSession(
                accessToken = resp.accessToken,
                refreshToken = resp.refreshToken,
                userId = resp.user.id,
                phone = resp.user.phone,
                nickname = resp.user.nickname
            )
        )
    }

    suspend fun loginByPassword(phone: String, password: String) {
        val resp = api.loginByPassword(
            LoginPasswordRequestDto(
                phone = phone,
                password = password,
                deviceId = ServiceLocator.deviceId,
                platform = "ANDROID"
            )
        )
        ServiceLocator.saveSession(
            StoredSession(
                accessToken = resp.accessToken,
                refreshToken = resp.refreshToken,
                userId = resp.user.id,
                phone = resp.user.phone,
                nickname = resp.user.nickname
            )
        )
    }

    suspend fun refresh() {
        val session = ServiceLocator.sessionState.value
        val phone = session.phone ?: return
        val refreshToken = session.refreshToken ?: return
        val resp = api.refreshToken(
            RefreshTokenRequestDto(
                phone = phone,
                refreshToken = refreshToken,
                deviceId = ServiceLocator.deviceId
            )
        )
        ServiceLocator.saveSession(
            StoredSession(
                accessToken = resp.accessToken,
                refreshToken = resp.refreshToken,
                userId = resp.user.id,
                phone = resp.user.phone,
                nickname = resp.user.nickname
            )
        )
    }
}


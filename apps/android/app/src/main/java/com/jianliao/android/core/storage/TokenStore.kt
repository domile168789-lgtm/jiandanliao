package com.jianliao.android.core.storage

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "jianliao_session")

class TokenStore(private val context: Context) {
    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("accessToken")
        val REFRESH_TOKEN = stringPreferencesKey("refreshToken")
        val USER_ID = stringPreferencesKey("userId")
        val PHONE = stringPreferencesKey("phone")
        val NICKNAME = stringPreferencesKey("nickname")
    }

    val data: Flow<Preferences> = context.dataStore.data

    fun sessionFlow(): Flow<StoredSession> =
        data.map { pref ->
            StoredSession(
                accessToken = pref[Keys.ACCESS_TOKEN],
                refreshToken = pref[Keys.REFRESH_TOKEN],
                userId = pref[Keys.USER_ID],
                phone = pref[Keys.PHONE],
                nickname = pref[Keys.NICKNAME]
            )
        }

    suspend fun save(session: StoredSession) {
        context.dataStore.edit { pref ->
            putOrRemove(pref, Keys.ACCESS_TOKEN, session.accessToken)
            putOrRemove(pref, Keys.REFRESH_TOKEN, session.refreshToken)
            putOrRemove(pref, Keys.USER_ID, session.userId)
            putOrRemove(pref, Keys.PHONE, session.phone)
            putOrRemove(pref, Keys.NICKNAME, session.nickname)
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }

    private fun putOrRemove(pref: androidx.datastore.preferences.core.MutablePreferences, key: Preferences.Key<String>, v: String?) {
        if (v.isNullOrBlank()) pref.remove(key) else pref[key] = v
    }
}

data class StoredSession(
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val userId: String? = null,
    val phone: String? = null,
    val nickname: String? = null
)


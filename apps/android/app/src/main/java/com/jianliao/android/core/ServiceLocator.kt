package com.jianliao.android.core

import android.content.Context
import com.jianliao.android.BuildConfig
import com.jianliao.android.core.storage.StoredSession
import com.jianliao.android.core.storage.TokenStore
import com.jianliao.android.data.api.AuthInterceptor
import com.jianliao.android.data.api.JianliaoApi
import com.jianliao.android.data.repo.AgentRepository
import com.jianliao.android.data.repo.AuthRepository
import com.jianliao.android.data.repo.BrandingRepository
import com.jianliao.android.data.repo.ConversationRepository
import com.jianliao.android.data.repo.FileRepository
import com.jianliao.android.data.repo.MessageRepository
import com.jianliao.android.data.repo.ProfileRepository
import com.jianliao.android.data.repo.SystemNoticeRepository
import com.jianliao.android.data.repo.WalletRepository
import com.jianliao.android.data.ws.SocketRepository
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ServiceLocator {
    const val deviceId: String = "android-demo-1"

    private lateinit var appContext: Context
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private lateinit var tokenStore: TokenStore

    private val _sessionState = MutableStateFlow(SessionState())
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    private lateinit var moshi: Moshi
    private lateinit var okHttp: OkHttpClient
    private lateinit var retrofit: Retrofit
    private lateinit var api: JianliaoApi

    lateinit var authRepository: AuthRepository
        private set
    lateinit var brandingRepository: BrandingRepository
        private set
    lateinit var conversationRepository: ConversationRepository
        private set
    lateinit var messageRepository: MessageRepository
        private set
    lateinit var fileRepository: FileRepository
        private set
    lateinit var socketRepository: SocketRepository
        private set
    lateinit var profileRepository: ProfileRepository
        private set
    lateinit var walletRepository: WalletRepository
        private set
    lateinit var agentRepository: AgentRepository
        private set
    lateinit var systemNoticeRepository: SystemNoticeRepository
        private set

    fun init(context: Context) {
        appContext = context.applicationContext
        tokenStore = TokenStore(appContext)

        moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

        val logger = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
        }
        okHttp = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor())
            .addInterceptor(logger)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl("${BuildConfig.API_BASE_URL.trimEnd('/')}/")
            .client(okHttp)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

        api = retrofit.create(JianliaoApi::class.java)

        authRepository = AuthRepository(api)
        brandingRepository = BrandingRepository(api)
        conversationRepository = ConversationRepository(api)
        messageRepository = MessageRepository(api)
        fileRepository = FileRepository(api, okHttp)
        socketRepository = SocketRepository(moshi)
        profileRepository = ProfileRepository(api)
        walletRepository = WalletRepository(api)
        agentRepository = AgentRepository(api)
        systemNoticeRepository = SystemNoticeRepository(api)

        scope.launch {
            tokenStore.sessionFlow().collect { stored ->
                _sessionState.value = SessionState(
                    accessToken = stored.accessToken,
                    refreshToken = stored.refreshToken,
                    userId = stored.userId,
                    phone = stored.phone,
                    nickname = stored.nickname,
                    isMessageRestricted = false,
                    restrictionReason = null,
                    pendingNoticeCount = if (stored.userId.isNullOrBlank()) 0 else 3
                )
            }
        }
    }

    suspend fun saveSession(session: StoredSession) {
        tokenStore.save(session)
    }

    fun ensureSocketConnected() {
        val s = sessionState.value
        val userId = s.userId ?: return
        val wsBaseUrl = BuildConfig.WS_BASE_URL.trimEnd('/')
        if (!socketRepository.isConnected()) {
            socketRepository.connect(wsBaseUrl, userId)
        }
    }

    fun logout() {
        scope.launch {
            tokenStore.clear()
        }
        socketRepository.disconnect()
        _sessionState.value = SessionState()
    }
}

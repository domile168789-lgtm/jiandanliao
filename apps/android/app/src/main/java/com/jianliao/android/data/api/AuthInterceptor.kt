package com.jianliao.android.data.api

import com.jianliao.android.core.ServiceLocator
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val req = chain.request()

        // 登录/注册/刷新与健康检查无需 token：按契约约定放行
        val path = req.url.encodedPath
        val noAuth = path.endsWith("/api/health") ||
            path.endsWith("/auth/register") ||
            path.endsWith("/auth/login/password") ||
            path.endsWith("/auth/refresh-token")

        val token = ServiceLocator.sessionState.value.accessToken
        val newReq = if (!noAuth && !token.isNullOrBlank()) {
            req.newBuilder().header("Authorization", "Bearer $token").build()
        } else {
            req
        }

        return chain.proceed(newReq)
    }
}


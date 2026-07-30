package com.jianliao.android.data.repo

enum class RepositoryDataSource {
    NETWORK,
    FALLBACK
}

data class RepositoryResult<T>(
    val data: T,
    val source: RepositoryDataSource,
    val message: String? = null
)

fun <T> networkResult(data: T, message: String? = null): RepositoryResult<T> {
    return RepositoryResult(data = data, source = RepositoryDataSource.NETWORK, message = message)
}

fun <T> fallbackResult(data: T, message: String): RepositoryResult<T> {
    return RepositoryResult(data = data, source = RepositoryDataSource.FALLBACK, message = message)
}

package com.jianliao.android.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.data.repo.RepositoryDataSource
import com.jianliao.android.data.repo.RepositoryResult

sealed interface AsyncScreenState<out T> {
    data object Loading : AsyncScreenState<Nothing>
    data class Success<T>(val result: RepositoryResult<T>) : AsyncScreenState<T>
    data class Error(val message: String) : AsyncScreenState<Nothing>
}

@Composable
fun <T> rememberAsyncScreenState(
    key: Any?,
    errorMessage: String,
    loader: suspend () -> RepositoryResult<T>
): AsyncScreenState<T> {
    return produceState<AsyncScreenState<T>>(
        initialValue = AsyncScreenState.Loading,
        key1 = key
    ) {
        value = try {
            AsyncScreenState.Success(loader())
        } catch (error: Throwable) {
            AsyncScreenState.Error(error.message?.takeIf { it.isNotBlank() } ?: errorMessage)
        }
    }.value
}

@Composable
fun LoadingStateCard(message: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            CircularProgressIndicator()
            Text(message, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun ErrorStateCard(
    title: String,
    message: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(message, style = MaterialTheme.typography.bodyMedium)
            Button(onClick = onAction) {
                Text(actionLabel)
            }
        }
    }
}

@Composable
fun EmptyStateCard(
    title: String,
    message: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(message, style = MaterialTheme.typography.bodyMedium)
            if (actionLabel != null && onAction != null) {
                Button(onClick = onAction) {
                    Text(actionLabel)
                }
            }
        }
    }
}

@Composable
fun DataSourceNoticeCard(result: RepositoryResult<*>) {
    val title = if (result.source == RepositoryDataSource.NETWORK) {
        "已加载真实接口数据"
    } else {
        "当前展示演示兜底数据"
    }
    val defaultMessage = if (result.source == RepositoryDataSource.NETWORK) {
        "页面优先展示线上接口返回，适合生产演示。"
    } else {
        "真实接口暂不可用或尚未提供当前能力，页面已切换到必要兜底，避免白屏。"
    }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleSmall)
            Text(result.message ?: defaultMessage, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

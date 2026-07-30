package com.jianliao.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.ui.components.AsyncScreenState
import com.jianliao.android.ui.components.DataSourceNoticeCard
import com.jianliao.android.ui.components.EmptyStateCard
import com.jianliao.android.ui.components.ErrorStateCard
import com.jianliao.android.ui.components.LoadingStateCard
import com.jianliao.android.ui.components.rememberAsyncScreenState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SystemNoticeScreen(onBack: () -> Unit) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载系统通知失败"
    ) {
        ServiceLocator.systemNoticeRepository.listNotices()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("系统通知") },
                navigationIcon = { Button(onClick = onBack) { Text("返回") } }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Button(onClick = { reloadToken += 1 }) {
                    Text("重新加载")
                }
            }
            item {
                Text(
                    text = "公告、风险、举报反馈和活动消息统一汇总在这里。",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            when (screenState) {
                AsyncScreenState.Loading -> item {
                    LoadingStateCard("正在加载系统通知...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "系统通知加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val notices = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    if (notices.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无系统通知",
                                message = "当前账号暂时没有公告、风险或活动消息。",
                                actionLabel = "重新加载",
                                onAction = { reloadToken += 1 }
                            )
                        }
                    } else {
                        items(notices) { notice ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(notice.category, style = MaterialTheme.typography.labelLarge)
                                    Text(notice.title, style = MaterialTheme.typography.titleMedium)
                                    Text(notice.content, style = MaterialTheme.typography.bodyMedium)
                                    Text(notice.timestamp, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

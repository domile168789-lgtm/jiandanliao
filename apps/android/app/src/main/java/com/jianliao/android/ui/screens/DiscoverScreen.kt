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
fun DiscoverScreen(
    onBack: (() -> Unit)?,
    onOpenSystemNotice: () -> Unit,
    onOpenAgent: () -> Unit
) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载发现页失败"
    ) {
        ServiceLocator.profileRepository.getDiscoverEntries()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("发现") },
                navigationIcon = {
                    if (onBack != null) {
                        Button(onClick = onBack) { Text("返回") }
                    }
                }
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("发现中心", style = MaterialTheme.typography.titleMedium)
                        Text("活动中心、公告、代理推广与下载引导统一收口。")
                        Button(onClick = onOpenSystemNotice, modifier = Modifier.fillMaxWidth()) {
                            Text("查看公告与活动消息")
                        }
                        Button(onClick = onOpenAgent, modifier = Modifier.fillMaxWidth()) {
                            Text("查看代理与邀请推广")
                        }
                    }
                }
            }
            when (screenState) {
                AsyncScreenState.Loading -> item {
                    LoadingStateCard("正在加载发现页入口...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "发现页加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val entries = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    if (entries.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无发现入口",
                                message = "当前还没有可展示的活动、公告或推广入口。",
                                actionLabel = "重新加载",
                                onAction = { reloadToken += 1 }
                            )
                        }
                    } else {
                        items(entries) { entry ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(entry.title, style = MaterialTheme.typography.titleSmall)
                                    Text(entry.description, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

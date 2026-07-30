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
fun SecurityScreen(onBack: () -> Unit) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载安全信息失败"
    ) {
        ServiceLocator.profileRepository.getSecurityOverview()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("安全") },
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
            when (screenState) {
                AsyncScreenState.Loading -> item {
                    LoadingStateCard("正在加载安全状态...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "安全信息加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val overview = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("风险状态", style = MaterialTheme.typography.titleMedium)
                                Text(overview.riskLevel, style = MaterialTheme.typography.headlineSmall)
                                Text(overview.banDescription)
                            }
                        }
                    }
                    item {
                        Text("设备登录", style = MaterialTheme.typography.titleMedium)
                    }
                    if (overview.deviceSessions.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无设备记录",
                                message = "当前账号没有可展示的设备登录记录。"
                            )
                        }
                    } else {
                        items(overview.deviceSessions) { device ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(device.name, style = MaterialTheme.typography.titleSmall)
                                    Text(device.location)
                                    Text("最近活跃 ${device.lastActiveAt}")
                                    Text(if (device.trusted) "已信任设备" else "建议复核")
                                }
                            }
                        }
                    }
                    item {
                        if (overview.suggestions.isEmpty()) {
                            EmptyStateCard(
                                title = "暂无安全建议",
                                message = "当前没有额外的账号安全建议。"
                            )
                        } else {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text("安全建议", style = MaterialTheme.typography.titleMedium)
                                    overview.suggestions.forEach { suggestion ->
                                        Text("- $suggestion", style = MaterialTheme.typography.bodyMedium)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

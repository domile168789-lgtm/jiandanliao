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
fun AgentScreen(onBack: () -> Unit) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载代理信息失败"
    ) {
        ServiceLocator.agentRepository.getAgentOverview()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("代理") },
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
                    LoadingStateCard("正在加载代理概览...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "代理信息加载失败",
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
                                Text("代理身份", style = MaterialTheme.typography.titleMedium)
                                Text(overview.level, style = MaterialTheme.typography.headlineSmall)
                                Text("邀请码 ${overview.inviteCode}")
                                Text("团队规模 ${overview.teamSize} 人")
                            }
                        }
                    }
                    if (overview.metrics.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无代理指标",
                                message = "当前账号还没有可展示的代理指标。",
                                actionLabel = "重新加载",
                                onAction = { reloadToken += 1 }
                            )
                        }
                    } else {
                        items(overview.metrics) { metric ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(metric.label, style = MaterialTheme.typography.labelLarge)
                                    Text(metric.value, style = MaterialTheme.typography.titleMedium)
                                }
                            }
                        }
                    }
                    item {
                        if (overview.tips.isEmpty()) {
                            EmptyStateCard(
                                title = "暂无运营提示",
                                message = "当前没有额外的代理运营提示。"
                            )
                        } else {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text("运营提示", style = MaterialTheme.typography.titleSmall)
                                    overview.tips.forEach { tip ->
                                        Text("- $tip", style = MaterialTheme.typography.bodyMedium)
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

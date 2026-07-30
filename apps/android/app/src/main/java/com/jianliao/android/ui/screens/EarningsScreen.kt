package com.jianliao.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
fun EarningsScreen(onBack: () -> Unit) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载收益失败"
    ) {
        ServiceLocator.walletRepository.getEarningsSummary()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("收益") },
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
                    LoadingStateCard("正在加载收益数据...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "收益加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val summary = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("收益总览", style = MaterialTheme.typography.titleMedium)
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Text("今日 ${summary.today}")
                                    Text("本月 ${summary.month}")
                                }
                                Text("可提现 ${summary.withdrawable}")
                            }
                        }
                    }
                    if (summary.details.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无收益明细",
                                message = "当前还没有可展示的收益记录。",
                                actionLabel = "重新加载",
                                onAction = { reloadToken += 1 }
                            )
                        }
                    } else {
                        items(summary.details) { detail ->
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(detail.channel, style = MaterialTheme.typography.titleSmall)
                                    Text(detail.amount, style = MaterialTheme.typography.bodyLarge)
                                    Text(detail.note, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

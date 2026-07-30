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
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.repo.SystemNoticeItem

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SystemNoticeScreen(onBack: () -> Unit) {
    val notices = produceState(initialValue = emptyList<SystemNoticeItem>()) {
        value = ServiceLocator.systemNoticeRepository.listNotices()
    }.value

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
                Text(
                    text = "公告、风险、举报反馈和活动消息统一汇总在这里。",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
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

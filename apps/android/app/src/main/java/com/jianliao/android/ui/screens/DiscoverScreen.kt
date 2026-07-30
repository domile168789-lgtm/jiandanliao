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
import com.jianliao.android.data.repo.DiscoverEntry

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    onBack: (() -> Unit)?,
    onOpenSystemNotice: () -> Unit,
    onOpenAgent: () -> Unit
) {
    val entries = produceState(initialValue = emptyList<DiscoverEntry>()) {
        value = ServiceLocator.profileRepository.getDiscoverEntries()
    }.value

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

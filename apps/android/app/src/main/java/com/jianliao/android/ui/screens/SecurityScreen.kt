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
import com.jianliao.android.data.repo.SecurityOverview

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecurityScreen(onBack: () -> Unit) {
    val overview = produceState<SecurityOverview?>(initialValue = null) {
        value = ServiceLocator.profileRepository.getSecurityOverview()
    }.value

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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("风险状态", style = MaterialTheme.typography.titleMedium)
                        Text(overview?.riskLevel ?: "--", style = MaterialTheme.typography.headlineSmall)
                        Text(overview?.banDescription ?: "--")
                    }
                }
            }
            item {
                Text("设备登录", style = MaterialTheme.typography.titleMedium)
            }
            items(overview?.deviceSessions.orEmpty()) { device ->
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
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("安全建议", style = MaterialTheme.typography.titleMedium)
                        overview?.suggestions.orEmpty().forEach { suggestion ->
                            Text("- $suggestion", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

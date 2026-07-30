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
import com.jianliao.android.data.repo.AgentOverview

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentScreen(onBack: () -> Unit) {
    val overview = produceState<AgentOverview?>(initialValue = null) {
        value = ServiceLocator.agentRepository.getAgentOverview()
    }.value

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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("代理身份", style = MaterialTheme.typography.titleMedium)
                        Text(overview?.level ?: "--", style = MaterialTheme.typography.headlineSmall)
                        Text("邀请码 ${overview?.inviteCode ?: "--"}")
                        Text("团队规模 ${overview?.teamSize ?: 0} 人")
                    }
                }
            }
            items(overview?.metrics.orEmpty()) { metric ->
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
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("运营提示", style = MaterialTheme.typography.titleSmall)
                        overview?.tips.orEmpty().forEach { tip ->
                            Text("- $tip", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

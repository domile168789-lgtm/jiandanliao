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
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.repo.EarningsSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EarningsScreen(onBack: () -> Unit) {
    val summary = produceState<EarningsSummary?>(initialValue = null) {
        value = ServiceLocator.walletRepository.getEarningsSummary()
    }.value

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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("收益总览", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("今日 ${summary?.today ?: "--"}")
                            Text("本月 ${summary?.month ?: "--"}")
                        }
                        Text("可提现 ${summary?.withdrawable ?: "--"}")
                    }
                }
            }
            items(summary?.details.orEmpty()) { detail ->
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

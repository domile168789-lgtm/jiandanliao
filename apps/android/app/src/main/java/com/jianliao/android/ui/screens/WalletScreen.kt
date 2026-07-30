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
import com.jianliao.android.data.repo.WalletSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletScreen(onBack: () -> Unit) {
    val summary = produceState<WalletSummary?>(initialValue = null) {
        value = ServiceLocator.walletRepository.getWalletSummary()
    }.value

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("钱包") },
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
                        Text("余额总览", style = MaterialTheme.typography.titleMedium)
                        Text(summary?.balance ?: "--", style = MaterialTheme.typography.headlineMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text("累计收入 ${summary?.totalIncome ?: "--"}")
                            Text("累计支出 ${summary?.totalExpense ?: "--"}")
                        }
                    }
                }
            }
            items(summary?.records.orEmpty()) { record ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(record.title, style = MaterialTheme.typography.titleSmall)
                        Text(record.amount, style = MaterialTheme.typography.bodyLarge)
                        Text(record.status, style = MaterialTheme.typography.bodyMedium)
                        Text(record.timestamp, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

package com.jianliao.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
fun ProfileScreen(
    screenTitle: String,
    showBackButton: Boolean,
    onBack: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenWallet: () -> Unit,
    onOpenEarnings: () -> Unit,
    onOpenAgent: () -> Unit,
    onOpenSystemNotice: () -> Unit,
    onOpenSecurity: () -> Unit,
    onLogout: () -> Unit
) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载个人资料失败"
    ) {
        ServiceLocator.profileRepository.getProfileSummary()
    }
    val session = ServiceLocator.sessionState.collectAsState().value

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(screenTitle) },
                navigationIcon = {
                    if (showBackButton) {
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
            when (screenState) {
                AsyncScreenState.Loading -> item {
                    LoadingStateCard("正在加载个人资料...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "个人资料加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val profile = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(profile.displayName, style = MaterialTheme.typography.headlineSmall)
                                Text("账号 ID ${profile.accountId.ifBlank { session.userId ?: "-" }}")
                                Text("手机号 ${profile.phone.ifBlank { session.maskedPhone }}")
                                Text(profile.bio)
                                Text("资料完成度 ${profile.completionProgress}%")
                            }
                        }
                    }
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(
                                modifier = Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("常用入口", style = MaterialTheme.typography.titleMedium)
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenProfile) { Text("个人资料") }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenWallet) { Text("钱包") }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenEarnings) { Text("收益") }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenAgent) { Text("代理") }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenSystemNotice) {
                                    Text("系统通知 (${profile.systemNoticeCount})")
                                }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenSecurity) { Text("安全与设备") }
                                Button(modifier = Modifier.fillMaxWidth(), onClick = onLogout) { Text("退出登录") }
                            }
                        }
                    }
                    item {
                        if (profile.inviteCode.isBlank()) {
                            EmptyStateCard(
                                title = "暂无推广信息",
                                message = "当前账号还没有可展示的邀请码。"
                            )
                        } else {
                            Card(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text("推广信息", style = MaterialTheme.typography.titleMedium)
                                    Text("邀请码 ${profile.inviteCode}")
                                    Text("发现页可查看活动中心、公告入口与下载引导。")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

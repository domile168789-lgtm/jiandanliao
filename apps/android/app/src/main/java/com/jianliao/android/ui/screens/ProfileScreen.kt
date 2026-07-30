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
import androidx.compose.runtime.produceState
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.repo.ProfileSummary

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
    val profile = produceState<ProfileSummary?>(initialValue = null) {
        value = ServiceLocator.profileRepository.getProfileSummary()
    }.value
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
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(profile?.displayName ?: session.displayName, style = MaterialTheme.typography.headlineSmall)
                        Text("账号 ID ${profile?.accountId ?: (session.userId ?: "-")}")
                        Text("手机号 ${profile?.phone ?: session.maskedPhone}")
                        Text(profile?.bio ?: "正在加载资料信息")
                        Text("资料完成度 ${profile?.completionProgress ?: 0}%")
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
                            Text("系统通知 (${profile?.systemNoticeCount ?: session.pendingNoticeCount})")
                        }
                        Button(modifier = Modifier.fillMaxWidth(), onClick = onOpenSecurity) { Text("安全与设备") }
                        Button(modifier = Modifier.fillMaxWidth(), onClick = onLogout) { Text("退出登录") }
                    }
                }
            }
            item {
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("推广信息", style = MaterialTheme.typography.titleMedium)
                        Text("邀请码 ${profile?.inviteCode ?: "------"}")
                        Text("发现页可查看活动中心、公告入口与下载引导。")
                    }
                }
            }
        }
    }
}

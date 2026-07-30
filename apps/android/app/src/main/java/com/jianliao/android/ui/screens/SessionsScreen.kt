package com.jianliao.android.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jianliao.android.data.model.ConversationDto
import com.jianliao.android.ui.vm.SessionsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SessionsScreen(
    onOpenConversation: (conversationId: String) -> Unit,
    onLogout: () -> Unit,
    vm: SessionsViewModel = viewModel()
) {
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("消息") }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "最近会话、系统通知和运营消息都会集中到这里，当前已经接到真实 IM 接口。",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = vm::refresh) { Text("刷新") }
                Button(onClick = onLogout) { Text("退出登录") }
                if (state.loading) CircularProgressIndicator(modifier = Modifier.padding(start = 8.dp))
            }

            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = state.peerPhoneInput,
                onValueChange = vm::updatePeerPhone,
                label = { Text("发起单聊") },
                placeholder = { Text("输入对方手机号，例如 855010100002") },
                singleLine = true
            )
            Button(
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
                onClick = { vm.createDm { onOpenConversation(it.id) } }
            ) {
                Text("进入私聊")
            }
            Text(
                "预览联调可直接使用 855010100002、855010100003、855010100004。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (state.error != null) {
                Text(
                    "加载失败：${state.error}",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.conversations) { c ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenConversation(c.id) }
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape),
                                color = avatarColor(c.type),
                                shape = CircleShape
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        conversationInitial(c),
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                }
                            }
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        conversationTitle(c),
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Text(
                                        conversationUpdatedLabel(c.updatedAt),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Text(
                                    conversationTypeLabel(c.type),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = avatarColor(c.type)
                                )
                                Text(
                                    conversationPreview(c),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun conversationTitle(conversation: ConversationDto): String =
    conversation.title?.takeIf { it.isNotBlank() }
        ?: when (conversation.id) {
            "preview-system" -> "系统通知"
            "preview-dm-business" -> "商务对接"
            "preview-group-agency" -> "渠道伙伴群"
            "preview-dm-security" -> "安全专员"
            else -> if (conversation.type == "DM") "新的私聊" else "新的群聊"
        }

private fun conversationPreview(conversation: ConversationDto): String =
    conversation.lastMessage?.takeIf { it.isNotBlank() }
        ?: when (conversation.id) {
            "preview-system" -> "查看后台公告、风控结果和活动提醒。"
            "preview-dm-business" -> "商务消息会在这里持续跟进。"
            "preview-group-agency" -> "群聊动态、投放排期和协作消息会在这里同步。"
            "preview-dm-security" -> "账号安全提醒和处理建议会在这里更新。"
            else -> "打开会话开始沟通。"
        }

private fun conversationTypeLabel(type: String): String =
    when (type) {
        "SYSTEM" -> "系统通知"
        "GROUP" -> "群聊"
        else -> "单聊"
    }

private fun conversationUpdatedLabel(updatedAt: String?): String {
    if (updatedAt.isNullOrBlank()) return "刚刚"
    return updatedAt.replace("T", " ").removeSuffix("Z").take(16)
}

private fun conversationInitial(conversation: ConversationDto): String =
    conversationTitle(conversation).take(1)

@Composable
private fun avatarColor(type: String) =
    when (type) {
        "SYSTEM" -> MaterialTheme.colorScheme.secondary
        "GROUP" -> MaterialTheme.colorScheme.tertiary
        else -> MaterialTheme.colorScheme.primary
    }

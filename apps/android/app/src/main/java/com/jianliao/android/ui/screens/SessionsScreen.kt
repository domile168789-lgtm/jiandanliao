package com.jianliao.android.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
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
            Text("会话列表、系统通知会话与活动消息统一从这里进入。")

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = vm::refresh) { Text("刷新") }
                Button(onClick = onLogout) { Text("退出登录") }
                if (state.loading) CircularProgressIndicator(modifier = Modifier.padding(start = 8.dp))
            }

            OutlinedTextField(
                modifier = Modifier.fillMaxWidth(),
                value = state.peerPhoneInput,
                onValueChange = vm::updatePeerPhone,
                label = { Text("创建私聊：peerPhone") },
                singleLine = true
            )
            Button(
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth(),
                onClick = { vm.createDm { onOpenConversation(it.id) } }
            ) {
                Text("创建 / 获取私聊")
            }

            if (state.error != null) {
                Text("错误：${state.error}")
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.conversations) { c ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenConversation(c.id) }
                            .padding(12.dp)
                    ) {
                        Text(conversationTitle(c))
                        Text("type: ${c.type}  updatedAt: ${c.updatedAt ?: "-"}")
                        Text("id: ${c.id}")
                        Text("lastMessage: ${c.lastMessage ?: "-"}")
                    }
                }
            }
        }
    }
}

private fun conversationTitle(conversation: com.jianliao.android.data.model.ConversationDto): String {
    return conversation.title?.takeIf { it.isNotBlank() }
        ?: if (conversation.type == "DM") "私聊会话" else "群会话"
}

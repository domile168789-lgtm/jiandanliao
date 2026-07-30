package com.jianliao.android.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.weight
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.model.MessageDto
import com.jianliao.android.ui.vm.ChatViewModel
import com.jianliao.android.ui.vm.ChatViewModelFactory

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    conversationId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val vm: ChatViewModel = viewModel(factory = ChatViewModelFactory(conversationId))
    val state by vm.state.collectAsState()
    val session by ServiceLocator.sessionState.collectAsState()

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) vm.sendImage(context, uri)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(chatTitle(conversationId)) }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = onBack) { Text("返回") }
                Button(onClick = vm::refresh) { Text("刷新") }
                if (state.loading) CircularProgressIndicator(modifier = Modifier.padding(start = 8.dp))
            }
            Text(
                "当前会话已接入真实消息接口，发送后会自动刷新并同步已读回执。",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            if (state.error != null) {
                Text(
                    "消息处理失败：${state.error}",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (state.lastReceiptLog != null) {
                Text(
                    "已同步最新已读状态。",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.messages) { m ->
                    val isSystemMessage = isSystemMessage(m)
                    val isMine = isMine(m, session.userId)
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = when {
                            isSystemMessage -> Alignment.CenterHorizontally
                            isMine -> Alignment.End
                            else -> Alignment.Start
                        }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth(if (isSystemMessage) 1f else 0.82f)
                                .background(
                                    color = if (isSystemMessage) {
                                        MaterialTheme.colorScheme.secondaryContainer
                                    } else if (isMine) {
                                        MaterialTheme.colorScheme.primaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    shape = RoundedCornerShape(
                                        topStart = 18.dp,
                                        topEnd = 18.dp,
                                        bottomStart = if (isMine) 18.dp else 4.dp,
                                        bottomEnd = if (isMine) 4.dp else 18.dp
                                    )
                                )
                                .padding(12.dp)
                        ) {
                            Text(
                                messageSenderLabel(m, isMine, isSystemMessage),
                                color = if (isSystemMessage) {
                                    MaterialTheme.colorScheme.onSecondaryContainer
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                                style = MaterialTheme.typography.labelMedium
                            )
                            when (m.type) {
                                "TEXT" -> Text((m.body["text"] as? String).orEmpty())
                                "IMAGE" -> Text("[图片消息]")
                                else -> Text("[${m.type}]")
                            }
                            Text(
                                messageMeta(m),
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(top = 6.dp)
                            )
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    modifier = Modifier.weight(1f),
                    value = state.inputText,
                    onValueChange = vm::updateInput,
                    label = { Text("输入消息") },
                    placeholder = { Text("说点什么...") },
                    singleLine = true
                )
                Button(onClick = vm::sendText) { Text("发送") }
            }

            Button(
                modifier = Modifier.fillMaxWidth(),
                onClick = {
                    imagePicker.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                }
            ) {
                Text("发送图片")
            }
        }
    }
}

private fun isSystemMessage(message: MessageDto): Boolean {
    val text = message.body["text"] as? String
    return message.senderId.startsWith("system") || message.type == "SYSTEM" || text?.contains("群机器人") == true
}

private fun isMine(message: MessageDto, userId: String?): Boolean =
    !userId.isNullOrBlank() && message.senderId == userId

private fun chatTitle(conversationId: String): String =
    when (conversationId) {
        "preview-system" -> "系统通知"
        "preview-dm-business" -> "商务对接"
        "preview-group-agency" -> "渠道伙伴群"
        "preview-dm-security" -> "安全专员"
        else -> "聊天"
    }

private fun messageSenderLabel(message: MessageDto, isMine: Boolean, isSystemMessage: Boolean): String =
    when {
        isSystemMessage -> "系统通知"
        isMine -> "我"
        else -> "对方"
    }

private fun messageMeta(message: MessageDto): String {
    val createdAt = message.createdAt?.replace("T", " ")?.removeSuffix("Z")?.take(16) ?: "刚刚"
    val status = message.status ?: "SENT"
    return "$createdAt · $status"
}

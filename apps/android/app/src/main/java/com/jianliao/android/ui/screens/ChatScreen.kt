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
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
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

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) vm.sendImage(context, uri)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("单聊消息 (GET /api/messages) | $conversationId") }
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

            if (state.error != null) Text("错误：${state.error}")
            if (state.lastReceiptLog != null) Text(state.lastReceiptLog ?: "")

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(state.messages) { m ->
                    val isBotMessage = isBotMessage(m)
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = if (isBotMessage) androidx.compose.ui.Alignment.CenterHorizontally else androidx.compose.ui.Alignment.Start
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    color = if (isBotMessage) {
                                        MaterialTheme.colorScheme.secondaryContainer
                                    } else {
                                        MaterialTheme.colorScheme.surfaceVariant
                                    },
                                    shape = RoundedCornerShape(12.dp)
                                )
                                .padding(12.dp)
                        ) {
                            if (isBotMessage) {
                                Text("系统/机器人消息", color = MaterialTheme.colorScheme.onSecondaryContainer)
                            } else {
                                Text("senderId=${m.senderId} type=${m.type} id=${m.id}")
                            }
                            Text("createdAt=${m.createdAt ?: "-"} status=${m.status ?: "-"}")
                            when (m.type) {
                                "TEXT" -> Text((m.body["text"] as? String).orEmpty())
                                "IMAGE" -> Text("image(fileId=${m.body["fileId"]}, objectKey=${m.body["objectKey"]})")
                                else -> Text("body=${m.body}")
                            }
                        }
                        if (!isBotMessage) {
                            Button(onClick = { vm.sendReadReceipt(m.id) }) {
                                Text("发送 READ 回执 (POST /api/messages/:id/receipt)")
                            }
                        }
                        if (isBotMessage) {
                            Text(
                                "senderId=${m.senderId}",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp)
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
                    label = { Text("输入文本消息") },
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
                Text("选择图片并发送 (POST /api/files/upload -> PUT uploadUrl -> POST /api/messages[type=IMAGE])")
            }
        }
    }
}

private fun isBotMessage(message: com.jianliao.android.data.model.MessageDto): Boolean {
    val text = message.body["text"] as? String
    return message.senderId.startsWith("system") || text?.contains("群机器人") == true
}

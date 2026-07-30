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
import com.jianliao.android.data.repo.ContactSummary
import com.jianliao.android.data.repo.GroupSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactsScreen(
    onBack: (() -> Unit)?,
    onOpenConversation: (String) -> Unit
) {
    val contacts = produceState(initialValue = emptyList<ContactSummary>()) {
        value = ServiceLocator.profileRepository.getContacts()
    }.value
    val groups = produceState(initialValue = emptyList<GroupSummary>()) {
        value = ServiceLocator.profileRepository.getGroups()
    }.value

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("通讯录") },
                navigationIcon = {
                    if (onBack != null) {
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
                Text("好友与群组", style = MaterialTheme.typography.titleMedium)
            }
            items(contacts) { contact ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(contact.name, style = MaterialTheme.typography.titleSmall)
                        Text(contact.subtitle)
                        Text("标签 ${contact.tag}")
                        if (contact.conversationId != null) {
                            Button(onClick = { onOpenConversation(contact.conversationId) }) {
                                Text("继续聊天")
                            }
                        }
                    }
                }
            }
            item {
                Text("我加入的群", style = MaterialTheme.typography.titleMedium)
            }
            items(groups) { group ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text(group.name, style = MaterialTheme.typography.titleSmall)
                        Text("身份 ${group.role} · ${group.memberCount} 人")
                        Text(group.announcement)
                    }
                }
            }
        }
    }
}

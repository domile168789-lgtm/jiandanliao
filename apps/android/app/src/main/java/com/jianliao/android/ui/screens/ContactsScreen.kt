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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.data.repo.ContactSummary
import com.jianliao.android.data.repo.GroupSummary
import com.jianliao.android.data.repo.RepositoryDataSource
import com.jianliao.android.data.repo.RepositoryResult
import com.jianliao.android.ui.components.AsyncScreenState
import com.jianliao.android.ui.components.DataSourceNoticeCard
import com.jianliao.android.ui.components.EmptyStateCard
import com.jianliao.android.ui.components.ErrorStateCard
import com.jianliao.android.ui.components.LoadingStateCard
import com.jianliao.android.ui.components.rememberAsyncScreenState

private data class ContactsPageData(
    val contacts: List<ContactSummary>,
    val groups: List<GroupSummary>
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactsScreen(
    onBack: (() -> Unit)?,
    onOpenConversation: (String) -> Unit
) {
    var reloadToken by rememberSaveable { mutableStateOf(0) }
    val screenState = rememberAsyncScreenState(
        key = reloadToken,
        errorMessage = "加载通讯录失败"
    ) {
        val contactsResult = ServiceLocator.profileRepository.getContacts()
        val groupsResult = ServiceLocator.profileRepository.getGroups()
        RepositoryResult(
            data = ContactsPageData(
                contacts = contactsResult.data,
                groups = groupsResult.data
            ),
            source = if (
                contactsResult.source == RepositoryDataSource.NETWORK &&
                groupsResult.source == RepositoryDataSource.NETWORK
            ) {
                RepositoryDataSource.NETWORK
            } else {
                RepositoryDataSource.FALLBACK
            },
            message = listOfNotNull(contactsResult.message, groupsResult.message).joinToString(" ")
        )
    }

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
                Button(onClick = { reloadToken += 1 }) {
                    Text("重新加载")
                }
            }
            when (screenState) {
                AsyncScreenState.Loading -> item {
                    LoadingStateCard("正在加载通讯录与群组概览...")
                }

                is AsyncScreenState.Error -> item {
                    ErrorStateCard(
                        title = "通讯录加载失败",
                        message = screenState.message,
                        actionLabel = "重试",
                        onAction = { reloadToken += 1 }
                    )
                }

                is AsyncScreenState.Success -> {
                    val result = screenState.result
                    val pageData = result.data
                    item {
                        DataSourceNoticeCard(result)
                    }
                    item {
                        Text("好友与群组", style = MaterialTheme.typography.titleMedium)
                    }
                    if (pageData.contacts.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无联系人",
                                message = "当前还没有可展示的联系人或客服入口。"
                            )
                        }
                    } else {
                        items(pageData.contacts) { contact ->
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
                    }
                    item {
                        Text("我加入的群", style = MaterialTheme.typography.titleMedium)
                    }
                    if (pageData.groups.isEmpty()) {
                        item {
                            EmptyStateCard(
                                title = "暂无群组",
                                message = "当前还没有可展示的群组概览。"
                            )
                        }
                    } else {
                        items(pageData.groups) { group ->
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
        }
    }
}

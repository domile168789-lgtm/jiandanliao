package com.jianliao.android.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.jianliao.android.ui.vm.AuthViewModel

enum class AuthMode {
    REGISTER,
    LOGIN
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    vm: AuthViewModel = viewModel()
) {
    val state by vm.state.collectAsState()
    var mode by remember { mutableStateOf(AuthMode.LOGIN) }
    var rememberPassword by remember { mutableStateOf(true) }
    val isRegister = mode == AuthMode.REGISTER

    LaunchedEffect(Unit) {
        vm.loadBranding()
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("欢迎使用 ${state.branding.projectName}") }) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 2.dp,
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = state.branding.projectName,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = "移动端安全登录入口",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = if (state.branding.logoUrl.isNullOrBlank()) "LOGO：使用默认占位" else "LOGO：已接入远端品牌配置",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 1.dp,
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = if (isRegister) "注册账号" else "账号登录",
                        style = MaterialTheme.typography.titleMedium
                    )

                    OutlinedTextField(
                        modifier = Modifier.fillMaxWidth(),
                        value = state.phone,
                        onValueChange = vm::updatePhone,
                        label = { Text("手机号") },
                        singleLine = true
                    )
                    OutlinedTextField(
                        modifier = Modifier.fillMaxWidth(),
                        value = state.password,
                        onValueChange = vm::updatePassword,
                        label = { Text("密码") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation()
                    )

                    if (isRegister) {
                        OutlinedTextField(
                            modifier = Modifier.fillMaxWidth(),
                            value = state.nickname,
                            onValueChange = vm::updateNickname,
                            label = { Text("昵称（可选）") },
                            singleLine = true
                        )
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = rememberPassword,
                                onCheckedChange = { rememberPassword = it }
                            )
                            Text("记住密码")
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        TextButton(onClick = { }) {
                            Text("全球语言切换")
                        }
                        if (!isRegister) {
                            TextButton(onClick = { }) {
                                Text("忘记密码")
                            }
                        }
                    }

                    if (state.error != null) {
                        Text("错误：${state.error}")
                    }

                    if (state.loading) {
                        CircularProgressIndicator()
                    }

                    Button(
                        enabled = !state.loading,
                        modifier = Modifier.fillMaxWidth(),
                        contentPadding = PaddingValues(12.dp),
                        onClick = {
                            if (isRegister) vm.register(onLoginSuccess) else vm.login(onLoginSuccess)
                        }
                    ) {
                        Text(if (isRegister) "注册并进入" else "登录")
                    }

                    TextButton(
                        modifier = Modifier.align(Alignment.End),
                        onClick = {
                            vm.clearError()
                            mode = if (isRegister) AuthMode.LOGIN else AuthMode.REGISTER
                        }
                    ) {
                        Text(if (isRegister) "已有账号？去登录" else "没有账号？去注册")
                    }
                }
            }

            Surface(
                modifier = Modifier.fillMaxWidth(),
                tonalElevation = 1.dp,
                shape = MaterialTheme.shapes.large
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "底部主题位",
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text(
                        text = if (state.branding.themeAssetUrl.isNullOrBlank()) {
                            "未配置远端主题位，当前使用默认底部背景。"
                        } else {
                            "已接入 mobile 主题位配置：${state.branding.themeAssetUrl}"
                        },
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

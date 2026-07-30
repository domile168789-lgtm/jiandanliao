package com.jianliao.android.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.jianliao.android.core.ServiceLocator
import com.jianliao.android.ui.screens.AgentScreen
import com.jianliao.android.ui.screens.ChatScreen
import com.jianliao.android.ui.screens.ContactsScreen
import com.jianliao.android.ui.screens.DiscoverScreen
import com.jianliao.android.ui.screens.EarningsScreen
import com.jianliao.android.ui.screens.LoginScreen
import com.jianliao.android.ui.screens.ProfileScreen
import com.jianliao.android.ui.screens.SecurityScreen
import com.jianliao.android.ui.screens.SessionsScreen
import com.jianliao.android.ui.screens.SystemNoticeScreen
import com.jianliao.android.ui.screens.WalletScreen
import com.jianliao.android.ui.theme.JianliaoTheme

sealed class JianliaoRoute(
    val route: String,
    val label: String,
    val showInBottomBar: Boolean = false
) {
    data object Login : JianliaoRoute("login", "登录")
    data object Messages : JianliaoRoute("messages", "消息", true)
    data object Contacts : JianliaoRoute("contacts", "通讯录", true)
    data object Discover : JianliaoRoute("discover", "发现", true)
    data object Me : JianliaoRoute("me", "我的", true)
    data object Chat : JianliaoRoute("chat", "聊天")
    data object SystemNotice : JianliaoRoute("system_notice", "系统通知")
    data object Wallet : JianliaoRoute("wallet", "钱包")
    data object Earnings : JianliaoRoute("earnings", "收益")
    data object Agent : JianliaoRoute("agent", "代理")
    data object Profile : JianliaoRoute("profile", "个人资料")
    data object Security : JianliaoRoute("security", "安全")

    companion object {
        val primaryTabs = listOf(Messages, Contacts, Discover, Me)
    }
}

@Composable
fun JianliaoNav(availableRoutes: List<JianliaoRoute> = JianliaoRoute.primaryTabs) {
    val navController = rememberNavController()
    val session by ServiceLocator.sessionState.collectAsState()
    val currentEntry by navController.currentBackStackEntryAsState()
    val currentDestination = currentEntry?.destination
    val bottomTabs = remember(availableRoutes) { availableRoutes.filter { it.showInBottomBar } }

    JianliaoTheme {
        Scaffold(
            bottomBar = {
                val showBottomBar = session.isLoggedIn && currentDestination.isInBottomBar(bottomTabs)
                if (showBottomBar) {
                    JianliaoBottomBar(
                        navController = navController,
                        currentDestination = currentDestination,
                        tabs = bottomTabs
                    )
                }
            }
        ) { padding ->
            NavHost(
                navController = navController,
                startDestination = if (session.isLoggedIn) JianliaoRoute.Messages.route else JianliaoRoute.Login.route,
                modifier = Modifier.padding(padding)
            ) {
                composable(JianliaoRoute.Login.route) {
                    LoginScreen(
                        onLoginSuccess = {
                            navController.navigate(JianliaoRoute.Messages.route) {
                                popUpTo(JianliaoRoute.Login.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
                composable(JianliaoRoute.Messages.route) {
                    SessionsScreen(
                        onOpenConversation = { conversationId ->
                            navController.navigate("${JianliaoRoute.Chat.route}/$conversationId")
                        },
                        onLogout = {
                            ServiceLocator.logout()
                            navController.navigate(JianliaoRoute.Login.route) {
                                popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
                composable(
                    route = "${JianliaoRoute.Chat.route}/{conversationId}",
                    arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
                ) { entry ->
                    val conversationId = entry.arguments?.getString("conversationId") ?: return@composable
                    ChatScreen(conversationId = conversationId, onBack = { navController.popBackStack() })
                }
                composable(JianliaoRoute.Contacts.route) {
                    ContactsScreen(
                        onBack = null,
                        onOpenConversation = { conversationId ->
                            navController.navigate("${JianliaoRoute.Chat.route}/$conversationId")
                        }
                    )
                }
                composable(JianliaoRoute.Discover.route) {
                    DiscoverScreen(
                        onBack = null,
                        onOpenSystemNotice = { navController.navigate(JianliaoRoute.SystemNotice.route) },
                        onOpenAgent = { navController.navigate(JianliaoRoute.Agent.route) }
                    )
                }
                composable(JianliaoRoute.Me.route) {
                    ProfileScreen(
                        screenTitle = JianliaoRoute.Me.label,
                        showBackButton = false,
                        onBack = { navController.popBackStack() },
                        onOpenProfile = { navController.navigate(JianliaoRoute.Profile.route) },
                        onOpenWallet = { navController.navigate(JianliaoRoute.Wallet.route) },
                        onOpenEarnings = { navController.navigate(JianliaoRoute.Earnings.route) },
                        onOpenAgent = { navController.navigate(JianliaoRoute.Agent.route) },
                        onOpenSystemNotice = { navController.navigate(JianliaoRoute.SystemNotice.route) },
                        onOpenSecurity = { navController.navigate(JianliaoRoute.Security.route) },
                        onLogout = {
                            ServiceLocator.logout()
                            navController.navigate(JianliaoRoute.Login.route) {
                                popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
                composable(JianliaoRoute.Profile.route) {
                    ProfileScreen(
                        screenTitle = JianliaoRoute.Profile.label,
                        showBackButton = true,
                        onBack = { navController.popBackStack() },
                        onOpenProfile = { },
                        onOpenWallet = { navController.navigate(JianliaoRoute.Wallet.route) },
                        onOpenEarnings = { navController.navigate(JianliaoRoute.Earnings.route) },
                        onOpenAgent = { navController.navigate(JianliaoRoute.Agent.route) },
                        onOpenSystemNotice = { navController.navigate(JianliaoRoute.SystemNotice.route) },
                        onOpenSecurity = { navController.navigate(JianliaoRoute.Security.route) },
                        onLogout = {
                            ServiceLocator.logout()
                            navController.navigate(JianliaoRoute.Login.route) {
                                popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    )
                }
                composable(JianliaoRoute.SystemNotice.route) {
                    SystemNoticeScreen(onBack = { navController.popBackStack() })
                }
                composable(JianliaoRoute.Wallet.route) {
                    WalletScreen(onBack = { navController.popBackStack() })
                }
                composable(JianliaoRoute.Earnings.route) {
                    EarningsScreen(onBack = { navController.popBackStack() })
                }
                composable(JianliaoRoute.Agent.route) {
                    AgentScreen(onBack = { navController.popBackStack() })
                }
                composable(JianliaoRoute.Security.route) {
                    SecurityScreen(onBack = { navController.popBackStack() })
                }
            }
        }
    }

    LaunchedEffect(session.isLoggedIn, session.userId) {
        if (session.isLoggedIn && session.userId != null) {
            ServiceLocator.ensureSocketConnected()
        }
    }
}

@Composable
private fun JianliaoBottomBar(
    navController: NavHostController,
    currentDestination: NavDestination?,
    tabs: List<JianliaoRoute>
) {
    NavigationBar {
        tabs.forEach { route ->
            val selected = currentDestination?.hierarchy?.any { it.route == route.route } == true
            NavigationBarItem(
                selected = selected,
                onClick = {
                    navController.navigate(route.route) {
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Text(route.label.take(1)) },
                label = { Text(route.label) }
            )
        }
    }
}

private fun NavDestination?.isInBottomBar(tabs: List<JianliaoRoute>): Boolean {
    return tabs.any { route -> this?.hierarchy?.any { it.route == route.route } == true }
}

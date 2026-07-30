package com.jianliao.android.ui

import androidx.compose.runtime.Composable

@Composable
fun JianliaoApp(availableRoutes: List<JianliaoRoute> = JianliaoRoute.primaryTabs) {
    JianliaoNav(availableRoutes = availableRoutes)
}

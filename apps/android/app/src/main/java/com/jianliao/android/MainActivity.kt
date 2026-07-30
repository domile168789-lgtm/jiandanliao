package com.jianliao.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.jianliao.android.ui.JianliaoApp
import com.jianliao.android.ui.JianliaoRoute

class MainActivity : ComponentActivity() {
    private val productionRoutes = listOf(
        JianliaoRoute.Messages,
        JianliaoRoute.Contacts,
        JianliaoRoute.Discover,
        JianliaoRoute.Me,
        JianliaoRoute.SystemNotice,
        JianliaoRoute.Wallet,
        JianliaoRoute.Earnings,
        JianliaoRoute.Agent,
        JianliaoRoute.Security
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            JianliaoApp(availableRoutes = productionRoutes)
        }
    }
}

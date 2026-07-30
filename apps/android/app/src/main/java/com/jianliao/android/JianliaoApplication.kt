package com.jianliao.android

import android.app.Application
import com.jianliao.android.core.ServiceLocator

class JianliaoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }
}


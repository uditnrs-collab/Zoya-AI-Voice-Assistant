package com.zoya.assistant

import android.app.Application
import com.zoya.assistant.service.NotificationHelper

class ZoyaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize Notification Channels at application startup
        NotificationHelper.createNotificationChannel(this)
    }
}

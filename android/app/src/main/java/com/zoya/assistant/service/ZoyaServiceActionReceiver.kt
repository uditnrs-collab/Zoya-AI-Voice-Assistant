package com.zoya.assistant.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class ZoyaServiceActionReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ZoyaActionReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action
        Log.d(TAG, "Received broadcast action: $action")

        if (action == NotificationHelper.ACTION_STOP_SERVICE) {
            ZoyaForegroundService.stopService(context)
        } else if (action == NotificationHelper.ACTION_START_SERVICE) {
            ZoyaForegroundService.startService(context)
        }
    }
}

package com.zoya.assistant.service

import android.app.ForegroundServiceStartNotAllowedException
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class ZoyaForegroundService : Service() {

    companion object {
        private const val TAG = "ZoyaForegroundService"
        var isServiceRunning: Boolean = false
            private set

        const val BROADCAST_SERVICE_STATE = "com.zoya.assistant.SERVICE_STATE_CHANGED"
        const val EXTRA_IS_RUNNING = "extra_is_running"
        const val EXTRA_ERROR_MESSAGE = "extra_error_message"

        fun startService(context: Context) {
            val intent = Intent(context, ZoyaForegroundService::class.java).apply {
                action = NotificationHelper.ACTION_START_SERVICE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, ZoyaForegroundService::class.java).apply {
                action = NotificationHelper.ACTION_STOP_SERVICE
            }
            context.startService(intent)
        }
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.Default + serviceJob)
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "ZOYA Foreground Service onCreate triggered")
        NotificationHelper.createNotificationChannel(this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: NotificationHelper.ACTION_START_SERVICE
        Log.d(TAG, "onStartCommand with action: $action")

        if (action == NotificationHelper.ACTION_STOP_SERVICE) {
            stopCleanly()
            return START_NOT_STICKY
        }

        // Check if Microphone permission is granted before starting foreground service (Android 14+ requirement)
        val hasMicPermission = ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED

        try {
            val notification = NotificationHelper.buildForegroundNotification(this)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // Android 14+ (API 34) & Android 15 (API 35)
                val foregroundType = if (hasMicPermission) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                } else {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                }
                ServiceCompat.startForeground(
                    this,
                    NotificationHelper.NOTIFICATION_ID,
                    notification,
                    foregroundType
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10-13 (API 29-33)
                startForeground(
                    NotificationHelper.NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                )
            } else {
                startForeground(NotificationHelper.NOTIFICATION_ID, notification)
            }

            isServiceRunning = true
            acquireWakeLock()
            broadcastState(true)

            // Start battery-conscious background heartbeat / voice keep-alive monitor
            startBackgroundWorker()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start Foreground Service: ${e.message}", e)
            isServiceRunning = false
            broadcastState(false, e.localizedMessage ?: "Foreground service start failed")
            
            // Handle Android 14/15 ForegroundServiceStartNotAllowedException gracefully without crash
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && e is ForegroundServiceStartNotAllowedException) {
                Log.w(TAG, "Android restricted starting foreground service from background state: ${e.message}")
            }
            stopSelf()
            return START_NOT_STICKY
        }

        // Return START_STICKY so service can recover if killed by OS memory pressure
        return START_STICKY
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ZOYA:ForegroundServiceWakeLock"
            ).apply {
                setReferenceCounted(false)
                // 4 hour safety timeout to prevent infinite battery drain if unmanaged
                acquire(4 * 60 * 60 * 1000L)
            }
            Log.d(TAG, "WakeLock acquired for ZOYA Background Service")
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }

    private fun startBackgroundWorker() {
        serviceScope.launch {
            Log.d(TAG, "ZOYA Background monitoring loop active")
            try {
                while (isActive) {
                    // Battery-conscious periodic check (every 30s heartbeat instead of rapid spinning)
                    delay(30_000L)
                    Log.d(TAG, "ZOYA Background Service heartbeat active")
                }
            } catch (e: Exception) {
                Log.d(TAG, "Background worker interrupted: ${e.message}")
            }
        }
    }

    private fun stopCleanly() {
        Log.d(TAG, "Stopping ZOYA Foreground Service cleanly...")
        isServiceRunning = false
        releaseWakeLock()
        serviceScope.cancel()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }

        broadcastState(false)
        stopSelf()
    }

    private fun broadcastState(isRunning: Boolean, errorMsg: String? = null) {
        val intent = Intent(BROADCAST_SERVICE_STATE).apply {
            putExtra(EXTRA_IS_RUNNING, isRunning)
            if (errorMsg != null) {
                putExtra(EXTRA_ERROR_MESSAGE, errorMsg)
            }
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCleanly()
        Log.d(TAG, "ZOYA Foreground Service onDestroy completed")
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        Log.d(TAG, "App task removed from recents. Keeping service active according to user request.")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

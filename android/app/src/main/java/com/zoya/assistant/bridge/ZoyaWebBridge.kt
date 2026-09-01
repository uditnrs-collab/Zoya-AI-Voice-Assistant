package com.zoya.assistant.bridge

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.zoya.assistant.service.ZoyaForegroundService
import org.json.JSONObject

class ZoyaWebBridge(
    private val activity: Activity,
    private val webView: WebView
) {
    companion object {
        const val BRIDGE_NAME = "ZoyaAndroidBridge"
        const val PERMISSIONS_REQUEST_CODE = 2001
    }

    @JavascriptInterface
    fun isAndroidNative(): Boolean {
        return true
    }

    @JavascriptInterface
    fun isServiceRunning(): Boolean {
        return ZoyaForegroundService.isServiceRunning
    }

    @JavascriptInterface
    fun hasMicrophonePermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestPermissions(): String {
        val permissionsToRequest = mutableListOf<String>()

        if (!hasMicrophonePermission()) {
            permissionsToRequest.add(Manifest.permission.RECORD_AUDIO)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasNotificationPermission()) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        return if (permissionsToRequest.isNotEmpty()) {
            activity.runOnUiThread {
                ActivityCompat.requestPermissions(
                    activity,
                    permissionsToRequest.toTypedArray(),
                    PERMISSIONS_REQUEST_CODE
                )
            }
            "REQUESTED"
        } else {
            "ALREADY_GRANTED"
        }
    }

    @JavascriptInterface
    fun startForegroundService(): String {
        return try {
            if (!hasMicrophonePermission()) {
                requestPermissions()
                return JSONObject().apply {
                    put("success", false)
                    put("error", "Microphone permission required for voice service")
                    put("needsPermission", true)
                }.toString()
            }

            ZoyaForegroundService.startService(activity)
            notifyJsStateChange(true)

            JSONObject().apply {
                put("success", true)
                put("isRunning", true)
                put("message", "ZOYA Background Service started successfully")
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.localizedMessage ?: "Failed to start service")
            }.toString()
        }
    }

    @JavascriptInterface
    fun stopForegroundService(): String {
        return try {
            ZoyaForegroundService.stopService(activity)
            notifyJsStateChange(false)

            JSONObject().apply {
                put("success", true)
                put("isRunning", false)
                put("message", "ZOYA Background Service stopped")
            }.toString()
        } catch (e: Exception) {
            JSONObject().apply {
                put("success", false)
                put("error", e.localizedMessage ?: "Failed to stop service")
            }.toString()
        }
    }

    @JavascriptInterface
    fun openBatteryOptimizationSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent().apply {
                val powerManager = activity.getSystemService(Context.POWER_SERVICE) as PowerManager
                if (!powerManager.isIgnoringBatteryOptimizations(activity.packageName)) {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:${activity.packageName}")
                } else {
                    action = Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS
                }
            }
            try {
                activity.startActivity(intent)
            } catch (_: Exception) {
                // Fallback to app details
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${activity.packageName}")
                }
                activity.startActivity(fallbackIntent)
            }
        }
    }

    @JavascriptInterface
    fun getServiceStatusJson(): String {
        return JSONObject().apply {
            put("isNative", true)
            put("isRunning", ZoyaForegroundService.isServiceRunning)
            put("hasMicPermission", hasMicrophonePermission())
            put("hasNotificationPermission", hasNotificationPermission())
            put("androidVersion", Build.VERSION.SDK_INT)
        }.toString()
    }

    fun notifyJsStateChange(isRunning: Boolean, error: String? = null) {
        activity.runOnUiThread {
            val errorStr = if (error != null) "\"$error\"" else "null"
            val jsCode = """
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('zoya:foreground_service_change', {
                        detail: {
                            isRunning: $isRunning,
                            error: $errorStr
                        }
                    }));
                }
            """.trimIndent()
            webView.evaluateJavascript(jsCode, null)
        }
    }
}

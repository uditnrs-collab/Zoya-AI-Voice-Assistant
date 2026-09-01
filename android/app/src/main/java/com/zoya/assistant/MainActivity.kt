package com.zoya.assistant

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.core.content.ContextCompat
import com.zoya.assistant.service.ZoyaForegroundService
import com.zoya.assistant.ui.ZoyaMainScreen
import com.zoya.assistant.ui.viewmodel.ZoyaMainViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: ZoyaMainViewModel by viewModels()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val recordAudioGranted = permissions[Manifest.permission.RECORD_AUDIO] ?: false
        if (recordAudioGranted) {
            Toast.makeText(this, "ZOYA Voice System Initialized", Toast.LENGTH_SHORT).show()
        }
    }

    private val serviceStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ZoyaForegroundService.BROADCAST_SERVICE_STATE) {
                val isRunning = intent.getBooleanExtra(ZoyaForegroundService.EXTRA_IS_RUNNING, false)
                viewModel.updateServiceState(isRunning)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen awake for futuristic HUD experience
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Request runtime permissions on Android 13/14/15
        requestPermissionsIfNeeded()

        // Set Pure Native Jetpack Compose UI
        setContent {
            ZoyaMainScreen(viewModel = viewModel)
        }
    }

    private fun requestPermissionsIfNeeded() {
        val permissions = mutableListOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.CAMERA
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(ZoyaForegroundService.BROADCAST_SERVICE_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(serviceStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(serviceStateReceiver, filter)
        }
        viewModel.updateServiceState(ZoyaForegroundService.isServiceRunning)
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(serviceStateReceiver)
        } catch (_: Exception) {}
    }
}


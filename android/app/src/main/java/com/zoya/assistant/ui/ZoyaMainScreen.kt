package com.zoya.assistant.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.zoya.assistant.ui.components.ArcReactorVisualizer
import com.zoya.assistant.ui.components.CalendarDialog
import com.zoya.assistant.ui.components.ThemeSettingsDialog
import com.zoya.assistant.ui.components.ZoyaBottomControls
import com.zoya.assistant.ui.components.ZoyaConversationView
import com.zoya.assistant.ui.components.ZoyaHeader
import com.zoya.assistant.ui.theme.ZoyaAssistantTheme
import com.zoya.assistant.ui.theme.ZoyaBgDark
import com.zoya.assistant.ui.viewmodel.ZoyaMainViewModel

@Composable
fun ZoyaMainScreen(
    viewModel: ZoyaMainViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val primaryColor = Color(uiState.themeColor.primaryHex)
    val glowFactor = uiState.glowIntensity / 100f

    ZoyaAssistantTheme(activeThemeColor = uiState.themeColor) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            ZoyaBgDark,
                            Color(0xFF070B14),
                            ZoyaBgDark
                        )
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
            ) {
                // Header HUD
                ZoyaHeader(
                    primaryColor = primaryColor,
                    isServiceRunning = uiState.isServiceRunning,
                    onToggleService = { viewModel.toggleBackgroundService() },
                    onOpenCalendar = { viewModel.setCalendarOpen(true) },
                    onOpenTheme = { viewModel.setThemeDialogOpen(true) },
                    onOpenVision = { viewModel.setVisionDialogOpen(true) }
                )

                // Central Arc Reactor Visualizer
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
                    ArcReactorVisualizer(
                        voiceState = uiState.voiceState,
                        audioLevel = uiState.audioLevel,
                        primaryColor = primaryColor,
                        glowIntensity = glowFactor,
                        onClick = { viewModel.toggleListening() }
                    )
                }

                // Live Transcripts & Conversation Bubbles
                ZoyaConversationView(
                    messages = uiState.messages,
                    activePartialText = uiState.activePartialText,
                    primaryColor = primaryColor,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Bottom Controls: Mic FAB, Text Prompt, Quick Chips
                ZoyaBottomControls(
                    voiceState = uiState.voiceState,
                    primaryColor = primaryColor,
                    onMicClick = { viewModel.toggleListening() },
                    onStopSpeech = { viewModel.stopSpeaking() },
                    onSendCommand = { viewModel.handleUserCommand(it) }
                )
            }

            // Calendar Modal Dialog
            CalendarDialog(
                isOpen = uiState.showCalendarDialog,
                onClose = { viewModel.setCalendarOpen(false) },
                markedDates = uiState.markedDates,
                onSaveMarkedDate = { viewModel.saveMarkedDate(it) },
                onDeleteMarkedDate = { viewModel.deleteMarkedDate(it) },
                primaryColor = primaryColor
            )

            // Theme Settings Modal Dialog
            ThemeSettingsDialog(
                isOpen = uiState.showThemeDialog,
                onClose = { viewModel.setThemeDialogOpen(false) },
                currentTheme = uiState.themeColor,
                currentGlow = uiState.glowIntensity,
                onSelectTheme = { viewModel.setTheme(it) },
                onGlowChange = { viewModel.setGlow(it) }
            )
        }
    }
}

package com.zoya.assistant.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.assistant.data.models.ZoyaVoiceState
import com.zoya.assistant.ui.theme.ZoyaBgCard
import com.zoya.assistant.ui.theme.ZoyaSurface

@Composable
fun ZoyaBottomControls(
    voiceState: ZoyaVoiceState,
    primaryColor: Color,
    onMicClick: () -> Unit,
    onStopSpeech: () -> Unit,
    onSendCommand: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var textInput by remember { mutableStateOf("") }

    val infiniteTransition = rememberInfiniteTransition(label = "mic_pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "mic_pulse_scale"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        // Quick Action Chips Row
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            QuickChip(label = "⏰ Time Kya Hai", onClick = { onSendCommand("Zoya abhi time kitna ho raha hai") }, primaryColor = primaryColor)
            QuickChip(label = "📅 15 Aug Ko Kya Hai", onClick = { onSendCommand("15 August ko kya hai") }, primaryColor = primaryColor)
            QuickChip(label = "🔋 Battery", onClick = { onSendCommand("Battery kitni hai") }, primaryColor = primaryColor)
        }

        // Text input bar + Large Mic FAB
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            // Text Input
            OutlinedTextField(
                value = textInput,
                onValueChange = { textInput = it },
                placeholder = {
                    Text(
                        text = "Aap bol sakte hain ya type karein...",
                        fontFamily = FontFamily.SansSerif,
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(
                    onSend = {
                        if (textInput.isNotBlank()) {
                            onSendCommand(textInput)
                            textInput = ""
                        }
                    }
                ),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = primaryColor,
                    unfocusedBorderColor = primaryColor.copy(alpha = 0.3f),
                    focusedContainerColor = ZoyaBgCard,
                    unfocusedContainerColor = ZoyaBgCard,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White
                ),
                shape = RoundedCornerShape(24.dp),
                trailingIcon = {
                    if (textInput.isNotBlank()) {
                        IconButton(
                            onClick = {
                                onSendCommand(textInput)
                                textInput = ""
                            }
                        ) {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Send",
                                tint = primaryColor
                            )
                        }
                    }
                },
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Large Mic or Stop Button
            if (voiceState == ZoyaVoiceState.SPEAKING) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFFF0055))
                        .clickable(onClick = onStopSpeech)
                ) {
                    Icon(
                        imageVector = Icons.Default.Stop,
                        contentDescription = "Stop Speech",
                        tint = Color.White,
                        modifier = Modifier.size(26.dp)
                    )
                }
            } else {
                val isListening = voiceState == ZoyaVoiceState.LISTENING
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    primaryColor,
                                    primaryColor.copy(alpha = 0.8f)
                                )
                            )
                        )
                        .border(
                            width = if (isListening) 2.dp else 1.dp,
                            color = if (isListening) Color.White else primaryColor.copy(alpha = 0.6f),
                            shape = CircleShape
                        )
                        .clickable(onClick = onMicClick)
                ) {
                    Icon(
                        imageVector = if (isListening) Icons.Default.Mic else Icons.Default.Mic,
                        contentDescription = "Microphone",
                        tint = Color.Black,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun QuickChip(
    label: String,
    onClick: () -> Unit,
    primaryColor: Color
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(ZoyaSurface)
            .border(1.dp, primaryColor.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(
            text = label,
            color = Color.White.copy(alpha = 0.9f),
            fontFamily = FontFamily.Monospace,
            fontSize = 11.sp
        )
    }
}

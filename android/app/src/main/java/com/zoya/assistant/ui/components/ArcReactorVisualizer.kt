package com.zoya.assistant.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.assistant.data.models.ZoyaVoiceState
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun ArcReactorVisualizer(
    voiceState: ZoyaVoiceState,
    audioLevel: Float, // 0.0 to 1.0
    primaryColor: Color,
    glowIntensity: Float, // 0.0 to 1.0
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "reactor_rotation")

    // Slow clockwise rotation
    val rotationCw by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation_cw"
    )

    // Fast counter-clockwise rotation
    val rotationCcw by infiniteTransition.animateFloat(
        initialValue = 360f,
        targetValue = 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(7000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation_ccw"
    )

    // Idle breathing pulse
    val breathingPulse by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(2200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathing"
    )

    val dynamicScale = when (voiceState) {
        ZoyaVoiceState.LISTENING -> (1.0f + audioLevel * 0.45f)
        ZoyaVoiceState.SPEAKING -> (1.0f + audioLevel * 0.35f)
        ZoyaVoiceState.PROCESSING -> breathingPulse * 1.05f
        else -> breathingPulse
    }

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .size(320.dp)
            .clickable(onClick = onClick)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val baseRadius = (size.minDimension / 2.6f) * dynamicScale

            // 1. Outermost Ambient Glow Circle
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        primaryColor.copy(alpha = 0.25f * glowIntensity),
                        primaryColor.copy(alpha = 0.08f * glowIntensity),
                        Color.Transparent
                    ),
                    center = center,
                    radius = baseRadius * 1.6f
                ),
                radius = baseRadius * 1.6f,
                center = center
            )

            // 2. Outer Rotating Segmented Track
            rotate(rotationCw, pivot = center) {
                val segments = 8
                val sweep = 30f
                for (i in 0 until segments) {
                    val startAngle = i * (360f / segments)
                    drawArc(
                        color = primaryColor.copy(alpha = 0.65f),
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        topLeft = Offset(center.x - baseRadius, center.y - baseRadius),
                        size = Size(baseRadius * 2, baseRadius * 2),
                        style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
                    )
                }
            }

            // 3. Middle Counter-Rotating Dashed Tech Ring
            rotate(rotationCcw, pivot = center) {
                val middleRadius = baseRadius * 0.78f
                drawCircle(
                    color = primaryColor.copy(alpha = 0.45f),
                    radius = middleRadius,
                    center = center,
                    style = Stroke(
                        width = 2.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f)
                    )
                )

                // 4 Tech Nodes on Middle Ring
                val nodeCount = 4
                for (i in 0 until nodeCount) {
                    val angle = Math.toRadians((i * (360.0 / nodeCount)).toDouble())
                    val nx = (center.x + middleRadius * cos(angle)).toFloat()
                    val ny = (center.y + middleRadius * sin(angle)).toFloat()
                    drawCircle(
                        color = primaryColor,
                        radius = 4.dp.toPx(),
                        center = Offset(nx, ny)
                    )
                }
            }

            // 4. Inner Energy Ring with High Frequency Dashes
            rotate(rotationCw * 1.5f, pivot = center) {
                val innerRadius = baseRadius * 0.55f
                drawCircle(
                    color = primaryColor.copy(alpha = 0.85f),
                    radius = innerRadius,
                    center = center,
                    style = Stroke(
                        width = 3.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 12f), 0f)
                    )
                )
            }

            // 5. Central Glowing Core Sphere
            val coreRadius = baseRadius * 0.36f
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color.White,
                        primaryColor,
                        primaryColor.copy(alpha = 0.3f),
                        Color.Transparent
                    ),
                    center = center,
                    radius = coreRadius
                ),
                radius = coreRadius,
                center = center
            )

            // 6. Central Arc Reactor Triangle / Hexagon Accent
            drawCircle(
                color = Color.White.copy(alpha = 0.9f),
                radius = 6.dp.toPx() * (1f + audioLevel * 0.6f),
                center = center
            )
        }

        // Status HUD Label Below/Center
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(180.dp))
            val stateText = when (voiceState) {
                ZoyaVoiceState.LISTENING -> "● LISTENING..."
                ZoyaVoiceState.PROCESSING -> "◈ PROCESSING..."
                ZoyaVoiceState.SPEAKING -> "▶ ZOYA SPEAKING"
                ZoyaVoiceState.ERROR -> "⚠ REARMING"
                ZoyaVoiceState.IDLE -> "⚡ ZOYA ONLINE"
            }
            Text(
                text = stateText,
                color = primaryColor,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                letterSpacing = 1.5.sp
            )
        }
    }
}

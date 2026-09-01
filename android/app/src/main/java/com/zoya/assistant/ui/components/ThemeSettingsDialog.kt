package com.zoya.assistant.ui.components

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.zoya.assistant.data.models.ZoyaThemeColor
import com.zoya.assistant.ui.theme.ZoyaBgDark

@Composable
fun ThemeSettingsDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    currentTheme: ZoyaThemeColor,
    currentGlow: Int,
    onSelectTheme: (ZoyaThemeColor) -> Unit,
    onGlowChange: (Int) -> Unit
) {
    if (!isOpen) return

    val primaryColor = Color(currentTheme.primaryHex)

    Dialog(onDismissRequest = onClose) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = ZoyaBgDark,
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, primaryColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                // Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "⚙️ SCI-FI THEME SETTINGS",
                        color = Color.White,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    IconButton(onClick = onClose) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Color choices
                Text(
                    text = "SELECT NEON HUD PALETTE",
                    color = primaryColor,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    ZoyaThemeColor.values().forEach { theme ->
                        val themeColor = Color(theme.primaryHex)
                        val isSelected = theme == currentTheme
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(themeColor.copy(alpha = 0.2f))
                                .border(
                                    width = if (isSelected) 3.dp else 1.dp,
                                    color = if (isSelected) Color.White else themeColor,
                                    shape = CircleShape
                                )
                                .clickable { onSelectTheme(theme) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(22.dp)
                                    .clip(CircleShape)
                                    .background(themeColor)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Glow Intensity
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "REACTOR GLOW INTENSITY",
                        color = primaryColor,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "$currentGlow%",
                        color = Color.White,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Slider(
                    value = currentGlow.toFloat(),
                    onValueChange = { onGlowChange(it.toInt()) },
                    valueRange = 10f..100f,
                    colors = SliderDefaults.colors(
                        thumbColor = primaryColor,
                        activeTrackColor = primaryColor,
                        inactiveTrackColor = Color.DarkGray
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

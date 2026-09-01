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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.assistant.ui.theme.ZoyaBgCard
import com.zoya.assistant.ui.theme.ZoyaBorder

@Composable
fun ZoyaHeader(
    primaryColor: Color,
    isServiceRunning: Boolean,
    onToggleService: () -> Unit,
    onOpenCalendar: () -> Unit,
    onOpenTheme: () -> Unit,
    onOpenVision: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // App Title & Online Status
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "ZOYA",
                    color = Color.White,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(primaryColor.copy(alpha = 0.15f))
                        .border(1.dp, primaryColor.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "NATIVE KOTLIN",
                        color = primaryColor,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        letterSpacing = 1.sp
                    )
                }
            }

            // Subtitle
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(if (isServiceRunning) Color(0xFF00FF9D) else Color.Gray)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (isServiceRunning) "BACKGROUND SERVICE ACTIVE" else "TAP MIC OR SAY ZOYA",
                    color = if (isServiceRunning) Color(0xFF00FF9D) else Color(0xFF9CA3AF),
                    fontFamily = FontFamily.Monospace,
                    fontSize = 10.sp,
                    letterSpacing = 0.5.sp
                )
            }
        }

        // Action Buttons Row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            HeaderIconButton(
                icon = Icons.Default.CalendarMonth,
                contentDescription = "Calendar",
                primaryColor = primaryColor,
                onClick = onOpenCalendar
            )

            HeaderIconButton(
                icon = Icons.Default.Palette,
                contentDescription = "Theme",
                primaryColor = primaryColor,
                onClick = onOpenTheme
            )

            HeaderIconButton(
                icon = Icons.Default.Visibility,
                contentDescription = "Vision Scanner",
                primaryColor = primaryColor,
                onClick = onOpenVision
            )

            HeaderIconButton(
                icon = Icons.Default.PowerSettingsNew,
                contentDescription = "Background Service",
                primaryColor = if (isServiceRunning) Color(0xFF00FF9D) else primaryColor,
                isActive = isServiceRunning,
                onClick = onToggleService
            )
        }
    }
}

@Composable
fun HeaderIconButton(
    icon: ImageVector,
    contentDescription: String,
    primaryColor: Color,
    isActive: Boolean = false,
    onClick: () -> Unit
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(36.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (isActive) primaryColor.copy(alpha = 0.2f) else ZoyaBgCard)
            .border(
                1.dp,
                if (isActive) primaryColor else primaryColor.copy(alpha = 0.35f),
                RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (isActive) primaryColor else Color.White.copy(alpha = 0.85f),
            modifier = Modifier.size(18.dp)
        )
    }
}

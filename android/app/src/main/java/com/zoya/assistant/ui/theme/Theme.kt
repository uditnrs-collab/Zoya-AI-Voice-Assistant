package com.zoya.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.zoya.assistant.data.models.ZoyaThemeColor

@Composable
fun ZoyaAssistantTheme(
    activeThemeColor: ZoyaThemeColor = ZoyaThemeColor.CYAN,
    content: @Composable () -> Unit
) {
    val primary = Color(activeThemeColor.primaryHex)

    val colorScheme = darkColorScheme(
        primary = primary,
        secondary = primary.copy(alpha = 0.8f),
        background = ZoyaBgDark,
        surface = ZoyaSurface,
        onPrimary = Color.Black,
        onSecondary = Color.Black,
        onBackground = ZoyaTextPrimary,
        onSurface = ZoyaTextPrimary
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = ZoyaTypography,
        content = content
    )
}

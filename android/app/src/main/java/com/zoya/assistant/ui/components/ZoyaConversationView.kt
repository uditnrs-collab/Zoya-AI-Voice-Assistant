package com.zoya.assistant.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.assistant.data.models.MessageSender
import com.zoya.assistant.data.models.ZoyaMessage
import com.zoya.assistant.ui.theme.ZoyaBgCard
import com.zoya.assistant.ui.theme.ZoyaSurface

@Composable
fun ZoyaConversationView(
    messages: List<ZoyaMessage>,
    activePartialText: String?,
    primaryColor: Color,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()

    LaunchedEffect(messages.size, activePartialText) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    LazyColumn(
        state = listState,
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
    ) {
        items(messages, key = { it.id }) { message ->
            MessageItemRow(message = message, primaryColor = primaryColor)
        }

        if (!activePartialText.isNullOrBlank()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    contentAlignment = Alignment.CenterEnd
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(primaryColor.copy(alpha = 0.15f))
                            .border(1.dp, primaryColor.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "“$activePartialText”",
                            color = primaryColor,
                            fontFamily = FontFamily.SansSerif,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MessageItemRow(
    message: ZoyaMessage,
    primaryColor: Color
) {
    val isUser = message.sender == MessageSender.USER

    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (isUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.fillMaxWidth(0.88f)
        ) {
            Text(
                text = if (isUser) "YOU (BOSS)" else "ZOYA AI",
                color = if (isUser) primaryColor else Color(0xFF00FF9D),
                fontFamily = FontFamily.Monospace,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 2.dp, start = 4.dp, end = 4.dp)
            )

            Box(
                modifier = Modifier
                    .clip(
                        RoundedCornerShape(
                            topStart = 14.dp,
                            topEnd = 14.dp,
                            bottomStart = if (isUser) 14.dp else 2.dp,
                            bottomEnd = if (isUser) 2.dp else 14.dp
                        )
                    )
                    .background(if (isUser) ZoyaSurface else ZoyaBgCard)
                    .border(
                        1.dp,
                        if (isUser) primaryColor.copy(alpha = 0.35f) else Color(0xFF00FF9D).copy(alpha = 0.35f),
                        RoundedCornerShape(14.dp)
                    )
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(
                    text = message.text,
                    color = Color.White,
                    fontFamily = FontFamily.SansSerif,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

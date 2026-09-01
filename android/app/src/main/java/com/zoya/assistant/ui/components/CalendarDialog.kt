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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.zoya.assistant.data.models.CalendarMarkedDate
import com.zoya.assistant.ui.theme.ZoyaBgCard
import com.zoya.assistant.ui.theme.ZoyaBgDark
import com.zoya.assistant.ui.theme.ZoyaSurface
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun CalendarDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    markedDates: List<CalendarMarkedDate>,
    onSaveMarkedDate: (CalendarMarkedDate) -> Unit,
    onDeleteMarkedDate: (String) -> Unit,
    primaryColor: Color
) {
    if (!isOpen) return

    var newTitle by remember { mutableStateOf("") }
    var selectedDateStr by remember {
        mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()))
    }
    var showAddForm by remember { mutableStateOf(false) }

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
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column {
                        Text(
                            text = "📅 ZOYA CALENDAR",
                            color = Color.White,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                        Text(
                            text = "Festivals, Observances & Marked Dates",
                            color = Color.Gray,
                            fontFamily = FontFamily.SansSerif,
                            fontSize = 11.sp
                        )
                    }
                    IconButton(onClick = onClose) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Toggle Add Form Button
                Button(
                    onClick = { showAddForm = !showAddForm },
                    colors = ButtonDefaults.buttonColors(containerColor = primaryColor),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = if (showAddForm) Icons.Default.Close else Icons.Default.Add,
                        contentDescription = null,
                        tint = Color.Black
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (showAddForm) "Close Form" else "Mark New Date / Reminder",
                        color = Color.Black,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }

                if (showAddForm) {
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        placeholder = { Text("Event / Meeting / Festival Name", color = Color.Gray, fontSize = 12.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = primaryColor,
                            unfocusedBorderColor = Color.Gray,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Button(
                        onClick = {
                            if (newTitle.isNotBlank()) {
                                onSaveMarkedDate(
                                    CalendarMarkedDate(
                                        dateString = selectedDateStr,
                                        title = newTitle,
                                        category = "custom"
                                    )
                                )
                                newTitle = ""
                                showAddForm = false
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00FF9D)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Save to Calendar",
                            color = Color.Black,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Marked Events & Holidays List
                Text(
                    text = "UPCOMING EVENTS & MARKED DATES",
                    color = primaryColor,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(bottom = 6.dp)
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 280.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Default National Holidays
                    item {
                        CalendarItemRow(date = "15 August", title = "🇮🇳 Independence Day (स्वतंत्रता दिवस)", isHoliday = true, primaryColor = primaryColor)
                    }
                    item {
                        CalendarItemRow(date = "02 October", title = "🇮🇳 Gandhi Jayanti (गांधी जयंती)", isHoliday = true, primaryColor = primaryColor)
                    }
                    item {
                        CalendarItemRow(date = "08 November", title = "🪔 Diwali / Deepawali (दीपावली)", isHoliday = true, primaryColor = primaryColor)
                    }
                    item {
                        CalendarItemRow(date = "25 December", title = "🎄 Christmas Day (क्रिसमस)", isHoliday = true, primaryColor = primaryColor)
                    }

                    // User Marked Dates
                    items(markedDates, key = { it.id }) { item ->
                        CalendarItemRow(
                            date = item.dateString,
                            title = "📌 ${item.title}",
                            isHoliday = false,
                            primaryColor = primaryColor,
                            onDelete = { onDeleteMarkedDate(item.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CalendarItemRow(
    date: String,
    title: String,
    isHoliday: Boolean,
    primaryColor: Color,
    onDelete: (() -> Unit)? = null
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(ZoyaBgCard)
            .border(
                1.dp,
                if (isHoliday) Color(0xFF00FF9D).copy(alpha = 0.4f) else primaryColor.copy(alpha = 0.35f),
                RoundedCornerShape(8.dp)
            )
            .padding(10.dp)
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = date,
                color = if (isHoliday) Color(0xFF00FF9D) else primaryColor,
                fontFamily = FontFamily.Monospace,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = title,
                color = Color.White,
                fontFamily = FontFamily.SansSerif,
                fontSize = 13.sp
            )
        }
        if (onDelete != null) {
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Delete",
                    tint = Color(0xFFFF0055),
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

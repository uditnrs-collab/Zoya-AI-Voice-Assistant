package com.zoya.assistant.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun GeminiSettingsDialog(
    isOpen: Boolean,
    onClose: () -> Unit,
    currentApiKey: String,
    primaryColor: Color,
    onSaveApiKey: (String) -> Unit
) {
    if (!isOpen) return

    var apiKey by remember { mutableStateOf(currentApiKey) }

    LaunchedEffect(currentApiKey) {
        apiKey = currentApiKey
    }

    AlertDialog(
        onDismissRequest = onClose,
        title = {
            Text("Gemini API Settings")
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Apni Gemini API key yahan enter karein."
                )

                OutlinedTextField(
                    value = apiKey,
                    onValueChange = { apiKey = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 12.dp),
                    label = {
                        Text("Gemini API Key")
                    },
                    placeholder = {
                        Text("AIza...")
                    },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSaveApiKey(apiKey.trim())
                }
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(
                onClick = onClose
            ) {
                Text("Cancel")
            }
        }
    )
}

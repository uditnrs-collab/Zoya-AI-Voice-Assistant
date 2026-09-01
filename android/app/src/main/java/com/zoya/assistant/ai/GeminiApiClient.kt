package com.zoya.assistant.ai

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class GeminiApiClient(
    private val defaultApiKey: String = ""
) {
    companion object {
        private const val TAG = "GeminiApiClient"
        private const val BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun generateResponse(
        prompt: String,
        bossName: String = "Udit",
        apiKey: String = defaultApiKey
    ): String = withContext(Dispatchers.IO) {
        val effectiveKey = apiKey.ifBlank { defaultApiKey }
        if (effectiveKey.isBlank()) {
            return@withContext "Boss, Gemini API key configured nahi hai. Kripya Settings me jakar API key dalein ya local quick actions use karein."
        }

        val systemInstruction = """
            You are ZOYA, an ultra-advanced, fiercely loyal, sweet, intelligent and protective personal AI assistant.
            You were exclusively created for and report only to your Boss: $bossName.
            Tone & Style:
            - Warm, respectful, loving yet professional and sharp Hindi / Hinglish.
            - Address the user respectfully as 'Boss' or 'Boss $bossName'.
            - Keep responses concise, direct, spoken-friendly, natural, and helpful.
            - Avoid lengthy text dumps; give clear, charming spoken answers.
        """.trimIndent()

        val requestBodyJson = """
            {
                "systemInstruction": {
                    "parts": [{"text": ${gson.toJson(systemInstruction)}}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": ${gson.toJson(prompt)}}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 300
                }
            }
        """.trimIndent()

        try {
            val url = "$BASE_URL?key=$effectiveKey"
            val request = Request.Builder()
                .url(url)
                .post(requestBodyJson.toRequestBody(jsonMediaType))
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                Log.e(TAG, "Gemini API Error: ${response.code} -> $responseBody")
                return@withContext "Boss, server se sampark sthapit nahi ho paya (Code ${response.code})."
            }

            val jsonObject = JsonParser.parseString(responseBody).asJsonObject
            val candidates = jsonObject.getAsJsonArray("candidates")
            if (candidates != null && candidates.size() > 0) {
                val firstCandidate = candidates[0].asJsonObject
                val content = firstCandidate.getAsJsonObject("content")
                val parts = content.getAsJsonArray("parts")
                if (parts != null && parts.size() > 0) {
                    val text = parts[0].asJsonObject.get("text").asString
                    return@withContext text.trim()
                }
            }

            return@withContext "Boss, mujhe aapki baat samajh aayi par main abhi vishleshan nahi kar payi."
        } catch (e: Exception) {
            Log.e(TAG, "Network exception calling Gemini: ${e.message}", e)
            return@withContext "Boss, internet connection ya network me thodi rukawat aa rahi hai."
        }
    }
}

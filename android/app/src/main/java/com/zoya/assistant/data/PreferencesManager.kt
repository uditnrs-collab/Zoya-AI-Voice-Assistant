package com.zoya.assistant.data

import android.content.Context
import android.content.SharedPreferences
import com.zoya.assistant.data.models.ZoyaThemeColor

class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("zoya_app_preferences", Context.MODE_PRIVATE)

    var themeColor: ZoyaThemeColor
        get() {
            val id = prefs.getString("theme_color", "cyan") ?: "cyan"
            return ZoyaThemeColor.fromId(id)
        }
        set(value) {
            prefs.edit().putString("theme_color", value.id).apply()
        }

    var glowIntensity: Int
        get() = prefs.getInt("glow_intensity", 75)
        set(value) {
            prefs.edit().putInt("glow_intensity", value.coerceIn(0, 100)).apply()
        }

    var voicePitch: Float
        get() = prefs.getFloat("voice_pitch", 1.15f)
        set(value) {
            prefs.edit().putFloat("voice_pitch", value).apply()
        }

    var voiceSpeed: Float
        get() = prefs.getFloat("voice_speed", 1.02f)
        set(value) {
            prefs.edit().putFloat("voice_speed", value).apply()
        }

    var autoListenOnStartup: Boolean
        get() = prefs.getBoolean("auto_listen", true)
        set(value) {
            prefs.edit().putBoolean("auto_listen", value).apply()
        }

    var bossName: String
        get() = prefs.getString("boss_name", "Udit") ?: "Udit"
        set(value) {
            prefs.edit().putString("boss_name", value).apply()
        }

    var geminiApiKey: String
        get() = prefs.getString("gemini_api_key", "") ?: ""
        set(value) {
            prefs.edit().putString("gemini_api_key", value).apply()
        }
}

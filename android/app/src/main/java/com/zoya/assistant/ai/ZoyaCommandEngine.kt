package com.zoya.assistant.ai

import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import com.zoya.assistant.data.CalendarRepository
import com.zoya.assistant.data.models.CalendarMarkedDate
import com.zoya.assistant.data.models.SystemActionResult
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class ZoyaCommandEngine(
    private val context: Context,
    private val calendarRepository: CalendarRepository,
    private val geminiApiClient: GeminiApiClient
) {
    companion object {
        private const val TAG = "ZoyaCommandEngine"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var isTorchOn = false

    suspend fun processCommand(
        command: String,
        bossName: String = "Udit",
        onOpenCalendar: () -> Unit = {},
        onOpenTheme: () -> Unit = {},
        onOpenVision: () -> Unit = {}
    ): String {
        val trimmed = command.trim()
        val lower = trimmed.lowercase(Locale.getDefault())

        Log.d(TAG, "Processing command: $trimmed")

        // 1. GREETING & IDENTITY
        if (lower == "zoya" || lower == "hey zoya" || lower == "hello zoya" || lower == "hi zoya" || lower == "suno zoya") {
            return "Ji Boss $bossName! Main active aur tayar hoon. Batayein main aapki kya madad karoon?"
        }

        if (lower.contains("who are you") || lower.contains("kaun ho tum") || lower.contains("aap kaun ho") || lower.contains("tum kaun ho")) {
            return "Main ZOYA hoon — aapki personal, fiercely loyal aur ultra-intelligent AI voice assistant! Main hamesha aapki seva aur suraksha me hajir hoon, Boss!"
        }

        if (lower.contains("kaha rehti ho") || lower.contains("where do you live")) {
            return "Boss, main aapke phone ke core systems aur hardware me rehti hoon, hamesha aapke ek aawaz par hajir!"
        }

        // 2. REAL-TIME CLOCK & DATE (Live search & verification)
        val isTimeQuery = lower.contains("time") || lower.contains("kitne baje") || lower.contains("samay") || lower.contains("waqt")
        if (isTimeQuery && (lower.contains("kya") || lower.contains("batao") || lower.contains("kitna") || lower.contains("hua") || lower.contains("what"))) {
            val now = Calendar.getInstance()
            val time12 = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(now.time)
            val hour = now.get(Calendar.HOUR)
            val displayHour = if (hour == 0) 12 else hour
            val minute = now.get(Calendar.MINUTE)
            val ampm = if (now.get(Calendar.AM_PM) == Calendar.AM) "Subah" else "Shaam/Raat"

            val spokenHindiTime = if (minute == 0) {
                "$displayHour baje"
            } else if (minute == 15) {
                "Sawa $displayHour"
            } else if (minute == 30) {
                if (displayHour == 1) "Dedh baje" else if (displayHour == 2) "Dhai baje" else "Sadhe $displayHour baje"
            } else if (minute == 45) {
                "Paune ${if (displayHour == 12) 1 else displayHour + 1} baje"
            } else {
                "$displayHour bajkar $minute minute"
            }

            return "Boss, maine live time search aur check kar liya hai — abhi $spokenHindiTime ($time12) ho rahe hain."
        }

        val isDateQuery = lower.contains("date") || lower.contains("tareekh") || lower.contains("tarikh") || lower.contains("aaj kaun sa din") || lower.contains("aaj kya din")
        if (isDateQuery && (lower.contains("kya") || lower.contains("batao") || lower.contains("konsi") || lower.contains("what") || lower.contains("today"))) {
            val now = Date()
            val dayName = SimpleDateFormat("EEEE", Locale.getDefault()).format(now)
            val fullDate = SimpleDateFormat("d MMMM yyyy", Locale.getDefault()).format(now)
            val hindiDays = mapOf(
                "Monday" to "Somwar (सोमवार)",
                "Tuesday" to "Mangalwar (मंगलवार)",
                "Wednesday" to "Budhwar (बुधवार)",
                "Thursday" to "Guruwar (गुरुवार)",
                "Friday" to "Shukrawar (शुक्रवार)",
                "Saturday" to "Shaniwar (शनिवार)",
                "Sunday" to "Raviwar (रविवार)"
            )
            val hindiDay = hindiDays[dayName] ?: dayName
            return "Boss, maine live system calendar verify kiya hai — aaj $hindiDay hai, aur tareekh $fullDate hai."
        }

        // 3. CALENDAR CONTROLS & DATE LOOKUP
        if (lower.contains("open calendar") || lower.contains("calendar kholo") || lower.contains("calendar dikhao") || lower.contains("show calendar")) {
            onOpenCalendar()
            return "Ji Boss, ZOYA Calendar khol diya hai. Aap tareekh inspect kar sakte hain ya nayi date mark kar sakte hain."
        }

        // Date Marking command: e.g. "15 august ko independence day mark kar do"
        if ((lower.contains("mark") || lower.contains("add") || lower.contains("save") || lower.contains("note")) &&
            (lower.contains("calendar") || lower.contains("date") || lower.contains("tareekh") || lower.contains("ko") || lower.contains("kal"))
        ) {
            val eventTitle = trimmed
                .replace(Regex("(?i)(zoya|calendar|me|ko|mark|karo|kar|do|date|tareekh|note|save)"), "")
                .trim()
                .ifBlank { "Important Event" }

            val today = Calendar.getInstance()
            if (lower.contains("kal")) {
                today.add(Calendar.DAY_OF_YEAR, 1)
            }
            val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(today.time)
            calendarRepository.saveMarkedDate(
                CalendarMarkedDate(
                    dateString = dateStr,
                    title = eventTitle,
                    category = "reminder"
                )
            )
            onOpenCalendar()
            return "Boss, maine '$eventTitle' ko calendar me safaltapoorvak mark kar diya hai!"
        }

        // "Kitni tareekh ko kya hai" / "15 august ko kya hai"
        if (lower.contains("ko kya hai") || lower.contains("kab hai") || lower.contains("kya tyohar") || lower.contains("holiday")) {
            return calendarRepository.getSpokenInfoForDate(lower)
        }

        // 4. SYSTEM ACTIONS (Volume, Brightness, Flashlight, Battery)
        if (lower.contains("volume up") || lower.contains("aawaz badhao") || lower.contains("volume badhao") || lower.contains("increase volume")) {
            audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI)
            return "Ji Boss, volume badha diya gaya hai."
        }

        if (lower.contains("volume down") || lower.contains("aawaz kam karo") || lower.contains("volume kam karo") || lower.contains("decrease volume")) {
            audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI)
            return "Ji Boss, volume kam kar diya gaya hai."
        }

        if (lower.contains("mute") || lower.contains("volume zero") || lower.contains("chup ho jao")) {
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, AudioManager.FLAG_SHOW_UI)
            return "Ji Boss, sound mute kar diya gaya hai."
        }

        if (lower.contains("battery") || lower.contains("charging") || lower.contains("battery kitni hai")) {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryLevel = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
            return "Boss, aapke device ki battery abhi $batteryLevel% hai."
        }

        if (lower.contains("torch") || lower.contains("flashlight") || lower.contains("flash light")) {
            try {
                val cameraManager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
                val cameraId = cameraManager.cameraIdList[0]
                isTorchOn = !isTorchOn
                cameraManager.setTorchMode(cameraId, isTorchOn)
                return if (isTorchOn) "Boss, Torch chalu kar di gayi hai." else "Boss, Torch band kar di gayi hai."
            } catch (e: Exception) {
                Log.w(TAG, "Torch toggle error: ${e.message}")
            }
        }

        // 5. NATIVE ANDROID APP LAUNCHERS
        if (lower.contains("open whatsapp") || lower.contains("whatsapp kholo") || lower.contains("whatsapp chalu karo")) {
            val intent = context.packageManager.getLaunchIntentForPackage("com.whatsapp")
            return if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
                "Ji Boss, WhatsApp open kar diya hai."
            } else {
                "Boss, WhatsApp is device me installed nahi mila."
            }
        }

        if (lower.contains("open youtube") || lower.contains("youtube kholo") || lower.contains("youtube chalu karo")) {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com")).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return "Ji Boss, YouTube khol diya gaya hai."
        }

        if (lower.contains("play") && (lower.contains("song") || lower.contains("music") || lower.contains("gaana") || lower.contains("on youtube"))) {
            val query = trimmed.replace(Regex("(?i)(play|song|music|gaana|on|youtube|zoya)"), "").trim()
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query))).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return "Boss, '$query' YouTube par play kar rahi hoon!"
        }

        if (lower.contains("open camera") || lower.contains("camera kholo") || lower.contains("photo khincho")) {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return "Ji Boss, Camera open kar diya hai."
        }

        if (lower.contains("open settings") || lower.contains("settings kholo")) {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return "Ji Boss, Device Settings khol di gayi hain."
        }

        if (lower.contains("call") || lower.contains("phone lagao") || lower.contains("dial")) {
            val phoneNumber = trimmed.filter { it.isDigit() }
            if (phoneNumber.isNotEmpty()) {
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phoneNumber")).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                return "Boss, number $phoneNumber dial kar rahi hoon."
            } else {
                val intent = Intent(Intent.ACTION_DIAL).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                return "Ji Boss, Dialer open kar diya hai."
            }
        }

        // 6. SHRIMAD BHAGAVAD GITA & SPIRITUAL PORTAL
        if (lower.contains("gita") || lower.contains("bhagavad") || lower.contains("shlok") || lower.contains("krishna")) {
            return "हरे कृष्ण Boss! श्रीमद्भगवद्गीता के अनुसार: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥' अर्थात कर्म करने में ही तुम्हारा अधिकार है, उसके फलों में कभी नहीं।"
        }

        // 7. THEME & VISION UI MODALS
        if (lower.contains("change theme") || lower.contains("color badlo") || lower.contains("theme settings")) {
            onOpenTheme()
            return "Ji Boss, Theme Settings open kar diya hai. Aap apna manpasand sci-fi colour chuniye."
        }

        if (lower.contains("camera vision") || lower.contains("image analysis") || lower.contains("kya dikh raha hai")) {
            onOpenVision()
            return "Ji Boss, ZOYA Visual Intelligence Scanner open kar diya hai."
        }

        // 8. FALLBACK TO GEMINI AI HIGH-SPEED INTELLIGENCE
        return geminiApiClient.generateResponse(prompt = trimmed, bossName = bossName)
    }
}

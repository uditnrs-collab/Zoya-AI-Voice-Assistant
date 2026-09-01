package com.zoya.assistant.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.zoya.assistant.data.models.CalendarMarkedDate
import com.zoya.assistant.data.models.FestivalEvent
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class CalendarRepository(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("zoya_calendar_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val fixedHolidays = mapOf(
        "01-01" to FestivalEvent("New Year's Day", "नव वर्ष", "special", "Beginning of Gregorian New Year", "international"),
        "01-26" to FestivalEvent("Republic Day", "गणतंत्र दिवस", "national", "National Festival of India - Constitution of India", "gazetted"),
        "08-15" to FestivalEvent("Independence Day", "स्वतंत्रता दिवस", "national", "Indian Independence Day (15 August 1947)", "gazetted"),
        "10-02" to FestivalEvent("Gandhi Jayanti", "गांधी जयंती", "national", "Birth anniversary of Mahatma Gandhi", "gazetted"),
        "12-25" to FestivalEvent("Christmas Day", "क्रिसमस", "christian", "Celebration of the Nativity of Jesus", "gazetted"),
        "04-14" to FestivalEvent("Ambedkar Jayanti", "डॉ. बी. आर. अम्बेडकर जयंती", "national", "Birth anniversary of Dr. B. R. Ambedkar", "gazetted"),
        "05-01" to FestivalEvent("International Workers' Day", "मई दिवस / अंतर्राष्ट्रीय श्रमिक दिवस", "special", "Labour Day celebration", "observance"),
        "06-21" to FestivalEvent("International Yoga Day", "अंतर्राष्ट्रीय योग दिवस", "special", "Worldwide celebration of ancient Yoga", "international"),
        "11-14" to FestivalEvent("Children's Day", "बाल दिवस", "special", "Birthday of Pandit Jawaharlal Nehru", "observance")
    )

    private val yearlyHolidays = mapOf(
        // 2026
        "2026-03-04" to FestivalEvent("Holi (Dhulandi)", "होली (रंगोत्सव)", "hindu", "Grand Festival of Colours", "gazetted"),
        "2026-03-21" to FestivalEvent("Eid-ul-Fitr", "ईद-उल-फ़ित्र", "muslim", "Celebration marking the end of holy month of Ramadan", "gazetted"),
        "2026-08-28" to FestivalEvent("Raksha Bandhan", "रक्षाबंधन", "hindu", "Sacred bond of protection between brother and sister", "restricted"),
        "2026-09-04" to FestivalEvent("Krishna Janmashtami", "श्री कृष्ण जन्माष्टमी", "hindu", "Divine birth celebration of Lord Shri Krishna", "gazetted"),
        "2026-10-20" to FestivalEvent("Dussehra (Vijayadashami)", "दशहरा (विजयादशमी)", "hindu", "Triumph of Lord Rama over Ravana", "gazetted"),
        "2026-11-08" to FestivalEvent("Diwali (Deepawali)", "दीपावली (लक्ष्मी पूजन)", "hindu", "Grand festival of lights, prosperity, and joy", "gazetted"),

        // 2025
        "2025-03-14" to FestivalEvent("Holi", "होली", "hindu", "Festival of Colours", "gazetted"),
        "2025-10-20" to FestivalEvent("Diwali", "दीपावली", "hindu", "Festival of Lights", "gazetted")
    )

    fun getMarkedDates(): List<CalendarMarkedDate> {
        val json = prefs.getString("marked_dates", null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<CalendarMarkedDate>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveMarkedDate(event: CalendarMarkedDate) {
        val current = getMarkedDates().toMutableList()
        current.add(0, event)
        prefs.edit().putString("marked_dates", gson.toJson(current)).apply()
    }

    fun deleteMarkedDate(id: String) {
        val current = getMarkedDates().filter { it.id != id }
        prefs.edit().putString("marked_dates", gson.toJson(current)).apply()
    }

    fun getEventsOnDate(dateStr: String): List<String> {
        val results = mutableListOf<String>()

        // Check yearly specific
        yearlyHolidays[dateStr]?.let {
            results.add("🎉 ${it.name} (${it.nameHindi}) - ${it.description}")
        }

        // Check fixed
        if (dateStr.length >= 10) {
            val monthDay = dateStr.substring(5) // MM-DD
            fixedHolidays[monthDay]?.let {
                results.add("🇮🇳 ${it.name} (${it.nameHindi}) - ${it.description}")
            }
        }

        // Check user marked
        getMarkedDates().filter { it.dateString == dateStr }.forEach {
            results.add("📌 Marked Note: ${it.title}${if (!it.time.isNullOrBlank()) " at ${it.time}" else ""}")
        }

        return results
    }

    fun getSpokenInfoForDate(query: String): String {
        val todayCal = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

        var targetDate = sdf.format(todayCal.time)
        val lower = query.lowercase(Locale.getDefault())

        if (lower.contains("kal") || lower.contains("tomorrow")) {
            todayCal.add(Calendar.DAY_OF_YEAR, 1)
            targetDate = sdf.format(todayCal.time)
        } else if (lower.contains("parso")) {
            todayCal.add(Calendar.DAY_OF_YEAR, 2)
            targetDate = sdf.format(todayCal.time)
        } else if (lower.contains("15 august") || lower.contains("independence")) {
            return "Boss, 15 August ko hamara rashtriya parv 'Swatantrata Diwas' (Independence Day) hai."
        } else if (lower.contains("26 january") || lower.contains("republic")) {
            return "Boss, 26 January ko hamara rashtriya parv 'Gantantra Diwas' (Republic Day) hai."
        } else if (lower.contains("2 october") || lower.contains("gandhi")) {
            return "Boss, 2 October ko Mahatma Gandhi Jayanti hai."
        } else if (lower.contains("diwali") || lower.contains("deepawali")) {
            return "Boss, Diwali roshni aur samriddhi ka tyohar hai. 2026 me Diwali 8 November ko manayi jayegi."
        } else if (lower.contains("holi")) {
            return "Boss, Holi rango ka pavitra parv hai. 2026 me Holi 4 March ko hai."
        }

        val events = getEventsOnDate(targetDate)
        return if (events.isNotEmpty()) {
            "Boss, is tareekh ($targetDate) par yeh khas events hain: " + events.joinToString(", ")
        } else {
            "Boss, tareekh $targetDate par koi vishesh rashtriya ya dharmik holiday darj nahi hai. Sabhi karya niyamit rahenge."
        }
    }
}

package com.zoya.assistant.data.models

enum class ZoyaThemeColor(val id: String, val displayName: String, val primaryHex: Long, val glowHex: Long) {
    CYAN("cyan", "Cyber Cyan", 0xFF00E5FF, 0x8000E5FF),
    EMERALD("emerald", "Quantum Green", 0xFF00FF9D, 0x8000FF9D),
    CRIMSON("crimson", "Neon Crimson", 0xFFFF0055, 0x80FF0055),
    AMBER("amber", "Solar Amber", 0xFFFFB700, 0x80FFB700),
    PURPLE("purple", "Aether Purple", 0xFFB026FF, 0x80B026FF);

    companion object {
        fun fromId(id: String): ZoyaThemeColor =
            values().find { it.id.equals(id, ignoreCase = true) } ?: CYAN
    }
}

enum class ZoyaVoiceState {
    IDLE,
    LISTENING,
    PROCESSING,
    SPEAKING,
    ERROR
}

data class ZoyaMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val sender: MessageSender,
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val actionType: String? = null
)

enum class MessageSender {
    USER,
    ZOYA,
    SYSTEM
}

data class CalendarMarkedDate(
    val id: String = java.util.UUID.randomUUID().toString(),
    val dateString: String, // YYYY-MM-DD
    val title: String,
    val category: String = "general",
    val time: String? = null,
    val notes: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

data class FestivalEvent(
    val name: String,
    val nameHindi: String,
    val category: String,
    val description: String,
    val type: String
)

data class SystemActionResult(
    val handled: Boolean,
    val spokenResponse: String,
    val shouldOpenApp: String? = null
)

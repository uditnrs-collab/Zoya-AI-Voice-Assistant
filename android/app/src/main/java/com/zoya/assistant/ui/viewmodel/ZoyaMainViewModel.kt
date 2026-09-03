package com.zoya.assistant.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.zoya.assistant.ai.GeminiApiClient
import com.zoya.assistant.ai.ZoyaCommandEngine
import com.zoya.assistant.audio.ZoyaSpeechRecognizer
import com.zoya.assistant.audio.ZoyaTextToSpeech
import com.zoya.assistant.data.CalendarRepository
import com.zoya.assistant.data.PreferencesManager
import com.zoya.assistant.data.models.CalendarMarkedDate
import com.zoya.assistant.data.models.MessageSender
import com.zoya.assistant.data.models.ZoyaMessage
import com.zoya.assistant.data.models.ZoyaThemeColor
import com.zoya.assistant.data.models.ZoyaVoiceState
import com.zoya.assistant.service.ZoyaForegroundService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ZoyaUiState(
    val voiceState: ZoyaVoiceState = ZoyaVoiceState.IDLE,
    val audioLevel: Float = 0f,
    val activePartialText: String? = null,
    val messages: List<ZoyaMessage> = emptyList(),
    val themeColor: ZoyaThemeColor = ZoyaThemeColor.CYAN,
    val glowIntensity: Int = 75,
    val isServiceRunning: Boolean = false,
    val showCalendarDialog: Boolean = false,
    val showThemeDialog: Boolean = false,
    val showVisionDialog: Boolean = false,
    val markedDates: List<CalendarMarkedDate> = emptyList()
)

class ZoyaMainViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)
    private val calendarRepo = CalendarRepository(application)
    private val geminiClient = GeminiApiClient(prefs.geminiApiKey)
    private val commandEngine = ZoyaCommandEngine(
        application,
        calendarRepo,
        geminiClient
    )

    private val _uiState = MutableStateFlow(
        ZoyaUiState(
            themeColor = prefs.themeColor,
            glowIntensity = prefs.glowIntensity,
            isServiceRunning = ZoyaForegroundService.isServiceRunning,
            markedDates = calendarRepo.getMarkedDates()
        )
    )

    val uiState: StateFlow<ZoyaUiState> = _uiState.asStateFlow()

    private var speechRecognizer: ZoyaSpeechRecognizer? = null
    private var textToSpeech: ZoyaTextToSpeech? = null

    init {
        initTts()
        initSpeechRecognizer()

        // Welcome greeting
        val initialGreeting =
            "Namaste Boss ${prefs.bossName}! Main ZOYA hoon — aapki personal AI voice assistant. Main aapki kya seva kar sakti hoon?"

        addMessage(MessageSender.ZOYA, initialGreeting)
    }

    private fun initTts() {
        textToSpeech = ZoyaTextToSpeech(
            context = getApplication(),

            onStartSpeaking = {
                _uiState.update {
                    it.copy(voiceState = ZoyaVoiceState.SPEAKING)
                }
            },

            onDoneSpeaking = {
                _uiState.update {
                    it.copy(voiceState = ZoyaVoiceState.IDLE)
                }
            },

            onErrorSpeaking = {
                _uiState.update {
                    it.copy(voiceState = ZoyaVoiceState.IDLE)
                }
            }
        )
    }

    private fun initSpeechRecognizer() {
        speechRecognizer = ZoyaSpeechRecognizer(
            context = getApplication(),

            onPartialResult = { partial ->
                _uiState.update {
                    it.copy(activePartialText = partial)
                }
            },

            onFinalResult = { finalSpeech ->
                _uiState.update {
                    it.copy(activePartialText = null)
                }

                handleUserCommand(finalSpeech)
            },

            onRmsChanged = { rms ->
                _uiState.update {
                    it.copy(audioLevel = rms)
                }
            },

            onStateChanged = { isListening ->
                _uiState.update {
                    if (
                        it.voiceState != ZoyaVoiceState.SPEAKING &&
                        it.voiceState != ZoyaVoiceState.PROCESSING
                    ) {
                        it.copy(
                            voiceState = if (isListening) {
                                ZoyaVoiceState.LISTENING
                            } else {
                                ZoyaVoiceState.IDLE
                            }
                        )
                    } else {
                        it
                    }
                }
            },

            onError = { _ ->
                _uiState.update {
                    it.copy(activePartialText = null)
                }
            }
        )
    }

    fun handleUserCommand(command: String) {
        if (command.isBlank()) return

        addMessage(MessageSender.USER, command)

        _uiState.update {
            it.copy(voiceState = ZoyaVoiceState.PROCESSING)
        }

        viewModelScope.launch {
            val response = commandEngine.processCommand(
                command = command,
                bossName = prefs.bossName,

                onOpenCalendar = {
                    _uiState.update {
                        it.copy(showCalendarDialog = true)
                    }
                },

                onOpenTheme = {
                    _uiState.update {
                        it.copy(showThemeDialog = true)
                    }
                },

                onOpenVision = {
                    _uiState.update {
                        it.copy(showVisionDialog = true)
                    }
                }
            )

            addMessage(MessageSender.ZOYA, response)
            speakResponse(response)
        }
    }

    fun speakResponse(text: String) {
        textToSpeech?.speak(
            text = text,
            pitch = prefs.voicePitch,
            speechRate = prefs.voiceSpeed
        )
    }

    fun toggleListening() {
        if (_uiState.value.voiceState == ZoyaVoiceState.SPEAKING) {

            stopSpeaking()

        } else if (_uiState.value.voiceState == ZoyaVoiceState.LISTENING) {

            speechRecognizer?.stopListening()

        } else {

            speechRecognizer?.startListening()
        }
    }

    fun stopSpeaking() {
        textToSpeech?.stop()

        _uiState.update {
            it.copy(voiceState = ZoyaVoiceState.IDLE)
        }
    }

    private fun addMessage(
        sender: MessageSender,
        text: String
    ) {
        val newMsg = ZoyaMessage(
            sender = sender,
            text = text
        )

        _uiState.update {
            it.copy(messages = it.messages + newMsg)
        }
    }

    fun setTheme(theme: ZoyaThemeColor) {
        prefs.themeColor = theme

        _uiState.update {
            it.copy(themeColor = theme)
        }
    }

    fun setGlow(glow: Int) {
        prefs.glowIntensity = glow

        _uiState.update {
            it.copy(glowIntensity = glow)
        }
    }

    fun setCalendarOpen(open: Boolean) {
        _uiState.update {
            it.copy(showCalendarDialog = open)
        }
    }

    fun setThemeDialogOpen(open: Boolean) {
        _uiState.update {
            it.copy(showThemeDialog = open)
        }
    }

    fun setVisionDialogOpen(open: Boolean) {
        _uiState.update {
            it.copy(showVisionDialog = open)
        }
    }

    fun saveMarkedDate(date: CalendarMarkedDate) {
        calendarRepo.saveMarkedDate(date)

        _uiState.update {
            it.copy(
                markedDates = calendarRepo.getMarkedDates()
            )
        }
    }

    fun deleteMarkedDate(id: String) {
        calendarRepo.deleteMarkedDate(id)

        _uiState.update {
            it.copy(
                markedDates = calendarRepo.getMarkedDates()
            )
        }
    }

    fun updateServiceState(isRunning: Boolean) {
        _uiState.update {
            it.copy(isServiceRunning = isRunning)
        }
    }

    fun toggleBackgroundService() {
        val context = getApplication<Application>()

        if (_uiState.value.isServiceRunning) {

            ZoyaForegroundService.stopService(context)

            _uiState.update {
                it.copy(isServiceRunning = false)
            }

        } else {

            ZoyaForegroundService.startService(context)

            _uiState.update {
                it.copy(isServiceRunning = true)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()

        speechRecognizer?.destroy()
        textToSpeech?.shutdown()
    }
}

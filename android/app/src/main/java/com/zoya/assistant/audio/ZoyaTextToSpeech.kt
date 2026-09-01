package com.zoya.assistant.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import java.util.Locale

class ZoyaTextToSpeech(
    private val context: Context,
    private val onStartSpeaking: () -> Unit,
    private val onDoneSpeaking: () -> Unit,
    private val onErrorSpeaking: (String) -> Unit
) : TextToSpeech.OnInitListener {

    companion object {
        private const val TAG = "ZoyaTextToSpeech"
    }

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null

    init {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isInitialized = true
            configureVoice()
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    Log.d(TAG, "TTS Started utterance: $utteranceId")
                    requestAudioFocus()
                    onStartSpeaking()
                }

                override fun onDone(utteranceId: String?) {
                    Log.d(TAG, "TTS Finished utterance: $utteranceId")
                    abandonAudioFocus()
                    onDoneSpeaking()
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    Log.e(TAG, "TTS Error on utterance: $utteranceId")
                    abandonAudioFocus()
                    onErrorSpeaking("TTS playback error")
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    Log.e(TAG, "TTS Error code $errorCode on utterance: $utteranceId")
                    abandonAudioFocus()
                    onErrorSpeaking("TTS Error code: $errorCode")
                }
            })
        } else {
            Log.e(TAG, "TTS Initialization failed with status: $status")
            onErrorSpeaking("TTS init failed")
        }
    }

    private fun configureVoice(pitch: Float = 1.15f, speechRate: Float = 1.02f) {
        tts?.let { engine ->
            val hindiLocale = Locale("hi", "IN")
            val available = engine.isLanguageAvailable(hindiLocale)

            if (available >= TextToSpeech.LANG_AVAILABLE) {
                engine.language = hindiLocale
            } else {
                engine.language = Locale("en", "IN")
            }

            // Find optimal sweet female voice
            try {
                val voices = engine.voices
                if (voices != null) {
                    val preferredVoice = voices.find { voice ->
                        (voice.locale.language == "hi" || voice.locale.country == "IN") &&
                                (voice.name.contains("female", ignoreCase = true) ||
                                        voice.name.contains("fem", ignoreCase = true) ||
                                        voice.name.contains("f0", ignoreCase = true) ||
                                        voice.quality >= Voice.QUALITY_HIGH)
                    } ?: voices.find { it.locale.language == "hi" }

                    if (preferredVoice != null) {
                        engine.voice = preferredVoice
                        Log.d(TAG, "Selected TTS Voice: ${preferredVoice.name}")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error choosing specific TTS voice: ${e.message}")
            }

            engine.setPitch(pitch)
            engine.setSpeechRate(speechRate)
        }
    }

    fun speak(text: String, pitch: Float = 1.15f, speechRate: Float = 1.02f) {
        if (!isInitialized || tts == null) {
            Log.w(TAG, "TTS not ready yet")
            return
        }

        configureVoice(pitch, speechRate)

        val cleanText = text
            .replace(Regex("[*#_`~]"), "") // Remove markdown asterisks
            .replace("ZOYA", "ज़ोया")
            .replace("Boss", "बॉस")
            .trim()

        if (cleanText.isEmpty()) return

        val utteranceId = "zoya_utt_${System.currentTimeMillis()}"
        val params = Bundle().apply {
            putInt(TextToSpeech.Engine.KEY_PARAM_STREAM, AudioManager.STREAM_MUSIC)
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f)
        }

        tts?.speak(cleanText, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
    }

    fun stop() {
        try {
            tts?.stop()
            abandonAudioFocus()
            onDoneSpeaking()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping TTS: ${e.message}")
        }
    }

    private fun requestAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val playbackAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()

            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(playbackAttributes)
                .setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener { focusChange ->
                    if (focusChange == AudioManager.AUDIOFOCUS_LOSS || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
                        stop()
                    }
                }
                .build()

            audioFocusRequest?.let { audioManager.requestAudioFocus(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
            )
        }
    }

    private fun abandonAudioFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(null)
        }
    }

    fun shutdown() {
        try {
            stop()
            tts?.shutdown()
            tts = null
            isInitialized = false
        } catch (e: Exception) {
            Log.e(TAG, "Error shutting down TTS: ${e.message}")
        }
    }
}

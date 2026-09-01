package com.zoya.assistant.audio

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import java.util.Locale

class ZoyaSpeechRecognizer(
    private val context: Context,
    private val onPartialResult: (String) -> Unit,
    private val onFinalResult: (String) -> Unit,
    private val onRmsChanged: (Float) -> Unit,
    private val onStateChanged: (Boolean) -> Unit,
    private val onError: (String) -> Unit
) {
    companion object {
        private const val TAG = "ZoyaSpeechRecognizer"
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isListening = false
    private var isContinuous = true

    init {
        mainHandler.post {
            initRecognizer()
        }
    }

    private fun initRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.e(TAG, "Speech recognition is not available on this Android device")
            onError("Speech recognition not available")
            return
        }

        try {
            speechRecognizer?.destroy()
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(createListener())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing speech recognizer: ${e.message}", e)
        }
    }

    private fun createListener(): RecognitionListener {
        return object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                Log.d(TAG, "onReadyForSpeech")
                isListening = true
                onStateChanged(true)
            }

            override fun onBeginningOfSpeech() {
                Log.d(TAG, "onBeginningOfSpeech")
            }

            override fun onRmsChanged(rmsdB: Float) {
                // Normalize rmsdB (-2 to 10 dB typically) to 0.0 .. 1.0
                val normalized = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)
                onRmsChanged(normalized)
            }

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                Log.d(TAG, "onEndOfSpeech")
                onStateChanged(false)
            }

            override fun onError(errorCode: Int) {
                val errorMessage = when (errorCode) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
                    else -> "Recognition error: $errorCode"
                }

                Log.w(TAG, "SpeechRecognizer error: $errorMessage (code $errorCode)")
                isListening = false
                onStateChanged(false)

                // For transient no-match or speech-timeout, smoothly rearm in continuous mode
                if (isContinuous && (errorCode == SpeechRecognizer.ERROR_NO_MATCH || errorCode == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)) {
                    mainHandler.postDelayed({
                        if (isContinuous && !isListening) {
                            startListening()
                        }
                    }, 400)
                } else if (errorCode == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) {
                    mainHandler.postDelayed({
                        initRecognizer()
                        if (isContinuous) startListening()
                    }, 600)
                }
            }

            override fun onResults(results: Bundle?) {
                isListening = false
                onStateChanged(false)
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val finalSpeech = matches[0]
                    Log.d(TAG, "Final Speech Result: $finalSpeech")
                    onFinalResult(finalSpeech)
                }

                // If continuous mode is enabled, wait a brief moment and restart listening
                if (isContinuous) {
                    mainHandler.postDelayed({
                        if (isContinuous && !isListening) {
                            startListening()
                        }
                    }, 700)
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) {
                    val partialSpeech = matches[0]
                    onPartialResult(partialSpeech)
                }
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        }
    }

    fun startListening() {
        mainHandler.post {
            try {
                if (speechRecognizer == null) {
                    initRecognizer()
                }

                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN")
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "hi-IN")
                    putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, false)
                    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                    putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
                    putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L)
                }

                speechRecognizer?.startListening(intent)
                isListening = true
                onStateChanged(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start speech recognizer: ${e.message}", e)
                onError(e.localizedMessage ?: "Failed to start listening")
            }
        }
    }

    fun stopListening() {
        isContinuous = false
        mainHandler.post {
            try {
                speechRecognizer?.stopListening()
                isListening = false
                onStateChanged(false)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop speech recognizer: ${e.message}")
            }
        }
    }

    fun cancelListening() {
        mainHandler.post {
            try {
                speechRecognizer?.cancel()
                isListening = false
                onStateChanged(false)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to cancel speech recognizer: ${e.message}")
            }
        }
    }

    fun setContinuousMode(enabled: Boolean) {
        isContinuous = enabled
    }

    fun destroy() {
        mainHandler.post {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = null
            } catch (e: Exception) {
                Log.e(TAG, "Failed to destroy speech recognizer: ${e.message}")
            }
        }
    }
}

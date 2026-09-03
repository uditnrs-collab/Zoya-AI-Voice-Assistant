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
        private const val RESTART_DELAY = 1000L
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var isListening = false
    private var isContinuous = true
    private var isDestroyed = false
    private var restartPending = false

    init {
        // IMPORTANT:
        // SpeechRecognizer ko app startup par initialize nahi karte.
        // Ye sirf jab startListening() call hoga tab initialize hoga.
    }

    private fun initRecognizer(): Boolean {
        if (isDestroyed) return false

        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.e(TAG, "Speech recognition is not available")
            onError("Speech recognition not available")
            return false
        }

        return try {
            speechRecognizer?.destroy()

            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(createListener())
            }

            Log.d(TAG, "SpeechRecognizer initialized safely")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing speech recognizer", e)
            speechRecognizer = null
            onError(e.localizedMessage ?: "Speech recognizer initialization failed")
            false
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
                val normalized =
                    ((rmsdB + 2f) / 12f).coerceIn(0f, 1f)

                onRmsChanged(normalized)
            }

            override fun onBufferReceived(buffer: ByteArray?) {}

            override fun onEndOfSpeech() {
                Log.d(TAG, "onEndOfSpeech")
                isListening = false
                onStateChanged(false)
            }

            override fun onError(errorCode: Int) {

                val errorMessage = when (errorCode) {
                    SpeechRecognizer.ERROR_AUDIO ->
                        "Audio recording error"

                    SpeechRecognizer.ERROR_CLIENT ->
                        "Speech recognizer client error"

                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                        "Microphone permission required"

                    SpeechRecognizer.ERROR_NETWORK ->
                        "Network error"

                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                        "Network timeout"

                    SpeechRecognizer.ERROR_NO_MATCH ->
                        "No speech recognized"

                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY ->
                        "Recognizer busy"

                    SpeechRecognizer.ERROR_SERVER ->
                        "Speech server error"

                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                        "No speech detected"

                    else ->
                        "Recognition error: $errorCode"
                }

                Log.w(
                    TAG,
                    "SpeechRecognizer error: $errorMessage (code $errorCode)"
                )

                isListening = false
                onStateChanged(false)

                /*
                 * IMPORTANT:
                 * Permission/network/client errors par aggressive
                 * automatic restart nahi karenge.
                 *
                 * Sirf NO_MATCH aur SPEECH_TIMEOUT ko limited
                 * continuous mode mein restart karenge.
                 */
                if (
                    isContinuous &&
                    !isDestroyed &&
                    (
                        errorCode == SpeechRecognizer.ERROR_NO_MATCH ||
                        errorCode == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                    )
                ) {
                    scheduleRestart()
                } else {
                    onError(errorMessage)
                }
            }

            override fun onResults(results: Bundle?) {

                isListening = false
                onStateChanged(false)

                val matches =
                    results?.getStringArrayList(
                        SpeechRecognizer.RESULTS_RECOGNITION
                    )

                if (!matches.isNullOrEmpty()) {

                    val finalSpeech = matches[0].trim()

                    if (finalSpeech.isNotEmpty()) {
                        Log.d(
                            TAG,
                            "Final Speech Result: $finalSpeech"
                        )

                        onFinalResult(finalSpeech)
                    }
                }

                /*
                 * Continuous mode mein controlled restart.
                 */
                if (isContinuous && !isDestroyed) {
                    scheduleRestart()
                }
            }

            override fun onPartialResults(partialResults: Bundle?) {

                val matches =
                    partialResults?.getStringArrayList(
                        SpeechRecognizer.RESULTS_RECOGNITION
                    )

                if (!matches.isNullOrEmpty()) {
                    val partialSpeech = matches[0]

                    if (partialSpeech.isNotBlank()) {
                        onPartialResult(partialSpeech)
                    }
                }
            }

            override fun onEvent(
                eventType: Int,
                params: Bundle?
            ) {
            }
        }
    }

    private fun scheduleRestart() {

        if (restartPending || isDestroyed || !isContinuous) {
            return
        }

        restartPending = true

        mainHandler.postDelayed({

            restartPending = false

            if (
                !isDestroyed &&
                isContinuous &&
                !isListening
            ) {
                startListeningInternal()
            }

        }, RESTART_DELAY)
    }

    fun startListening() {

        if (isDestroyed) {
            Log.w(TAG, "Cannot start: recognizer destroyed")
            return
        }

        mainHandler.post {
            startListeningInternal()
        }
    }

    private fun startListeningInternal() {

        if (isDestroyed) return

        if (isListening) {
            Log.d(TAG, "Already listening")
            return
        }

        try {

            /*
             * Lazy initialization:
             * recognizer app startup par nahi,
             * actual listening ke time create hoga.
             */
            if (speechRecognizer == null) {

                val initialized = initRecognizer()

                if (!initialized) {
                    return
                }
            }

            val intent =
                Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {

                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                    )

                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE,
                        "hi-IN"
                    )

                    putExtra(
                        RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,
                        "hi-IN"
                    )

                    putExtra(
                        RecognizerIntent.EXTRA_PARTIAL_RESULTS,
                        true
                    )

                    putExtra(
                        RecognizerIntent.EXTRA_MAX_RESULTS,
                        3
                    )

                    putExtra(
                        RecognizerIntent.EXTRA_CALLING_PACKAGE,
                        context.packageName
                    )

                    putExtra(
                        RecognizerIntent
                            .EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS,
                        1500L
                    )

                    putExtra(
                        RecognizerIntent
                            .EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
                        1000L
                    )
                }

            speechRecognizer?.startListening(intent)

            isListening = true
            onStateChanged(true)

            Log.d(TAG, "Started listening")

        } catch (e: SecurityException) {

            isListening = false
            onStateChanged(false)

            Log.e(
                TAG,
                "Microphone permission/security error",
                e
            )

            onError("Microphone permission required")

        } catch (e: Exception) {

            isListening = false
            onStateChanged(false)

            Log.e(
                TAG,
                "Failed to start speech recognizer",
                e
            )

            onError(
                e.localizedMessage
                    ?: "Failed to start listening"
            )
        }
    }

    fun stopListening() {

        isContinuous = false
        restartPending = false

        mainHandler.post {

            try {

                speechRecognizer?.stopListening()

                isListening = false
                onStateChanged(false)

                Log.d(TAG, "Listening stopped")

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Failed to stop speech recognizer",
                    e
                )
            }
        }
    }

    fun cancelListening() {

        restartPending = false

        mainHandler.post {

            try {

                speechRecognizer?.cancel()

                isListening = false
                onStateChanged(false)

                Log.d(TAG, "Listening cancelled")

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Failed to cancel speech recognizer",
                    e
                )
            }
        }
    }

    fun setContinuousMode(enabled: Boolean) {

        isContinuous = enabled

        if (!enabled) {
            restartPending = false
        }

        Log.d(
            TAG,
            "Continuous mode: $enabled"
        )
    }

    fun destroy() {

        isDestroyed = true
        isContinuous = false
        isListening = false
        restartPending = false

        mainHandler.removeCallbacksAndMessages(null)

        mainHandler.post {

            try {

                speechRecognizer?.cancel()
                speechRecognizer?.destroy()
                speechRecognizer = null

                Log.d(
                    TAG,
                    "SpeechRecognizer destroyed"
                )

            } catch (e: Exception) {

                Log.e(
                    TAG,
                    "Failed to destroy speech recognizer",
                    e
                )
            }
        }
    }
}

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

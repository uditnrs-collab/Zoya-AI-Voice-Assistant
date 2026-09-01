// Development-only latency measurement tracker
// Tracks end-to-end response time across Voice Input -> Speech Recognition -> Gemini -> TTS -> Playback

export interface LatencyReport {
  speechEndTime?: number;
  requestStartTime?: number;
  firstTokenTime?: number;
  firstSentenceTime?: number;
  playbackStartTime?: number;
  totalLatencyMs?: number;
}

class LatencyTracker {
  private current: LatencyReport = {};

  startSession() {
    this.current = {
      speechEndTime: performance.now(),
    };
  }

  markRequestStart() {
    this.current.requestStartTime = performance.now();
    if (this.current.speechEndTime) {
      const speechToRequest = (this.current.requestStartTime - this.current.speechEndTime).toFixed(1);
      this.devLog(`[Latency] 1. Speech End -> Request Started: ${speechToRequest}ms`);
    }
  }

  markFirstToken() {
    if (!this.current.firstTokenTime) {
      this.current.firstTokenTime = performance.now();
      if (this.current.requestStartTime) {
        const reqToToken = (this.current.firstTokenTime - this.current.requestStartTime).toFixed(1);
        this.devLog(`[Latency] 2. Request Started -> First Gemini Token: ${reqToToken}ms`);
      }
    }
  }

  markFirstSentence() {
    if (!this.current.firstSentenceTime) {
      this.current.firstSentenceTime = performance.now();
      if (this.current.firstTokenTime) {
        const tokenToSentence = (this.current.firstSentenceTime - this.current.firstTokenTime).toFixed(1);
        this.devLog(`[Latency] 3. First Token -> First Sentence Chunk: ${tokenToSentence}ms`);
      }
    }
  }

  markPlaybackStart() {
    if (!this.current.playbackStartTime) {
      this.current.playbackStartTime = performance.now();
      if (this.current.firstSentenceTime) {
        const sentenceToPlayback = (this.current.playbackStartTime - this.current.firstSentenceTime).toFixed(1);
        this.devLog(`[Latency] 4. Sentence Chunk -> Audio Playback: ${sentenceToPlayback}ms`);
      }
      if (this.current.speechEndTime) {
        const total = (this.current.playbackStartTime - this.current.speechEndTime).toFixed(1);
        this.current.totalLatencyMs = parseFloat(total);
        this.devLog(`⚡ [Latency] TOTAL RESPONSE LATENCY (Speech End -> Voice Output): ${total}ms ⚡`);
      }
    }
  }

  private devLog(msg: string) {
    if (typeof window !== "undefined" && (import.meta as any).env?.DEV) {
      console.log(`%c${msg}`, "color: #00E5FF; font-weight: bold; background: #001f29; padding: 2px 6px; border-radius: 4px;");
    }
  }
}

export const latencyTracker = new LatencyTracker();

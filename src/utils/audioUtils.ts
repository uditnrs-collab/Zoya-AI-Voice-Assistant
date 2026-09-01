import { latencyTracker } from "./latencyTracker";

let currentVolumeLevel = 0.8; // default 80%
let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

// Pre-warm and cache available SpeechSynthesis voices for 0ms voice lookup
export function initVoiceCache(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const updateVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;
    
    // Priority: Hindi voice -> Indian English -> English female/Zira/Google
    const hindiVoice =
      voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("hi_IN") || v.lang.includes("hi")) ||
      voices.find(v => v.lang.includes("en-IN")) ||
      voices.find(v => (v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("female")) && !v.name.toLowerCase().includes("male"));

    if (hindiVoice) {
      cachedVoice = hindiVoice;
    }
    voicesLoaded = true;
  };

  updateVoice();
  if ("onvoiceschanged" in window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = updateVoice;
  }
}

// Auto-run voice cache initialization on module load
if (typeof window !== "undefined") {
  initVoiceCache();
}

export function setGlobalVolume(levelPercent: number): number {
  currentVolumeLevel = Math.max(0, Math.min(100, levelPercent)) / 100;
  return Math.round(currentVolumeLevel * 100);
}

export function getGlobalVolume(): number {
  return Math.round(currentVolumeLevel * 100);
}

export function stopZoyaSpeaking(): void {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn("speechSynthesis cancel error:", e);
  }

  try {
    if (activeAudioSource) {
      activeAudioSource.stop();
      activeAudioSource.disconnect();
      activeAudioSource = null;
    }
    if (activeAudioContext && activeAudioContext.state !== "closed") {
      activeAudioContext.close().catch(() => {});
      activeAudioContext = null;
    }
  } catch (e) {
    console.warn("PCM audio stop error:", e);
  }
}

export async function playPCM(base64Data: string): Promise<void> {
  try {
    stopZoyaSpeaking();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("AudioContext not supported");
      return;
    }
    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    activeAudioContext = audioCtx;

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = new Int16Array(bytes.buffer);
    const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = buffer[i] / 32768.0;
    }
    const source = audioCtx.createBufferSource();
    activeAudioSource = source;
    source.buffer = audioBuffer;
    
    // Connect through GainNode for Volume Control
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = currentVolumeLevel;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    latencyTracker.markPlaybackStart();
    source.start();
    
    return new Promise<void>(resolve => {
      source.onended = () => {
        try { audioCtx.close(); } catch (e) {}
        if (activeAudioSource === source) activeAudioSource = null;
        if (activeAudioContext === audioCtx) activeAudioContext = null;
        resolve();
      };
      source.onerror = () => {
        if (activeAudioSource === source) activeAudioSource = null;
        if (activeAudioContext === audioCtx) activeAudioContext = null;
        resolve();
      };
    });
  } catch (error) {
    console.error("Error playing PCM audio:", error);
  }
}

export function speakWithWebSpeech(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Remove markdown bold/italics symbols for natural speech
      const cleanText = text.replace(/[*_#`~]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05; // Slightly brisk, responsive pace
      utterance.pitch = 1.05; // Slightly natural higher tone for Zoya
      utterance.volume = currentVolumeLevel;

      if (cachedVoice) {
        utterance.voice = cachedVoice;
      } else {
        const voices = window.speechSynthesis.getVoices();
        const hindiVoice =
          voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("hi_IN") || v.lang.includes("hi")) ||
          voices.find(v => v.lang.includes("en-IN")) ||
          voices.find(v => v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("google") || v.name.toLowerCase().includes("female"));
        if (hindiVoice) {
          cachedVoice = hindiVoice;
          utterance.voice = hindiVoice;
        } else {
          utterance.lang = "hi-IN";
        }
      }

      utterance.onstart = () => {
        latencyTracker.markPlaybackStart();
      };

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("SpeechSynthesis execution error:", e);
      resolve();
    }
  });
}

// Low-latency Streaming Speech Queue
// Plays incoming sentences immediately as they arrive from Gemini stream
export class StreamingSpeechQueue {
  private queue: string[] = [];
  private isProcessing: boolean = false;
  private isStopped: boolean = false;
  public onStartSpeaking?: () => void;
  public onFinishSpeaking?: () => void;

  enqueue(sentence: string) {
    if (this.isStopped) return;
    const clean = sentence.replace(/[*_#`~]/g, "").trim();
    if (!clean) return;

    this.queue.push(clean);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || this.isStopped) return;
    this.isProcessing = true;

    while (this.queue.length > 0 && !this.isStopped) {
      const sentence = this.queue.shift()!;
      this.onStartSpeaking?.();
      await this.speakSentence(sentence);
    }

    this.isProcessing = false;
    if (this.queue.length === 0 && !this.isStopped) {
      this.onFinishSpeaking?.();
    }
  }

  private speakSentence(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.isStopped || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.05;
        utterance.volume = currentVolumeLevel;

        if (cachedVoice) {
          utterance.voice = cachedVoice;
        } else {
          const voices = window.speechSynthesis.getVoices();
          const voice =
            voices.find(v => v.lang.includes("hi-IN") || v.lang.includes("hi")) ||
            voices.find(v => v.lang.includes("en-IN")) ||
            voices.find(v => v.name.toLowerCase().includes("female"));
          if (voice) {
            cachedVoice = voice;
            utterance.voice = voice;
          } else {
            utterance.lang = "hi-IN";
          }
        }

        utterance.onstart = () => {
          latencyTracker.markPlaybackStart();
        };

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (err) => {
          console.warn("Speech chunk error:", err);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("Speak chunk error:", err);
        resolve();
      }
    });
  }

  stop() {
    this.isStopped = true;
    this.queue = [];
    this.isProcessing = false;
    stopZoyaSpeaking();
  }
}

export async function speakZoyaResponse(text: string, getAudioFn?: (t: string) => Promise<string | null>): Promise<void> {
  if (!text) return;
  
  if ("speechSynthesis" in window) {
    await speakWithWebSpeech(text);
    return;
  }

  if (getAudioFn) {
    try {
      const audioBase64 = await getAudioFn(text);
      if (audioBase64) {
        await playPCM(audioBase64);
        return;
      }
    } catch (err) {
      console.warn("Gemini Audio failed:", err);
    }
  }
}



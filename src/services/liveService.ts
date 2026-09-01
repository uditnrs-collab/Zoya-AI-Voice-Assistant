import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { processCommand, getWebsiteUrl, getYouTubePlayDetails, getZoyaHomeUrl, SystemActionPayload, MediaActionPayload, ScrollActionPayload, TapActionPayload, FaceActionPayload } from "./commandService";
import { getDynamicZoyaSystemInstruction } from "./geminiService";
import { getGlobalVolume } from "../utils/audioUtils";
import { scrollPage, tapElement } from "../utils/domInteraction";

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "zoya", text: string) => void = () => {};
  public onCommand: (url: string) => void = () => {};
  public onSystemAction: (action: SystemActionPayload) => void = () => {};
  public onMediaAction: (action: MediaActionPayload) => void = () => {};
  public onScrollAction: (action: ScrollActionPayload) => void = () => {};
  public onTapAction: (action: TapActionPayload) => void = () => {};
  public onFaceAction: (action: FaceActionPayload) => void = () => {};
  public onError: (err: any) => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async start() {
    try {
      this.stop();
      this.onStateChange("processing");
      
      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      this.audioContext = audioCtx;

      const playbackCtx = new AudioContextClass({ sampleRate: 24000 });
      this.playbackContext = playbackCtx;
      this.nextPlayTime = this.playbackContext.currentTime;

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      if (this.playbackContext.state === "suspended") {
        await this.playbackContext.resume();
      }

      // Get Microphone Stream
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported or permitted in this browser context.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      // Guard check: If stop() was called while user permission prompt was pending
      if (!this.audioContext || this.audioContext !== audioCtx) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      this.mediaStream = stream;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64
        const buffer = new ArrayBuffer(pcm16.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < pcm16.length; i++) {
          view.setInt16(i * 2, pcm16[i], true);
        }
        
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise.then(session => {
          session.sendRealtimeInput({
            audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }).catch(err => console.error("Error sending audio", err));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Connect to Live API
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: getDynamicZoyaSystemInstruction(),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "goToHomePage",
                description: "Navigate or return to ZOYA's permanent Home Page. Call this whenever the user asks ZOYA to return to her page (e.g. 'apne page pe wapas aa jao', 'apne home page pe jao', 'ZOYA, apne page par chalo', 'ZOYA ke page pe wapas aao').",
                parameters: {
                  type: Type.OBJECT,
                  properties: {},
                }
              },
              {
                name: "executeBrowserAction",
                description: "Open a website or perform a browser action (like opening YouTube, Spotify, or WhatsApp). Call this when the user asks to open a site or send a message.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    actionType: { type: Type.STRING, description: "Type of action: 'open', 'youtube', 'spotify', 'whatsapp'" },
                    query: { type: Type.STRING, description: "The search query, website name, or message content." },
                    target: { type: Type.STRING, description: "The target phone number for WhatsApp, if applicable." }
                  },
                  required: ["actionType", "query"]
                }
              },
              {
                name: "controlVideoPlayer",
                description: "Control video playback directly inside the app. Use when user asks to play a song/video on YouTube, pause, resume/play, seek forward (aage), seek backward (pichhe), or close/remove (video hatao) the video.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING, description: "Action type: 'play', 'pause', 'resume', 'forward', 'backward', 'close'" },
                    query: { type: Type.STRING, description: "Song or video name to search and play if action is 'play'." },
                    seconds: { type: Type.NUMBER, description: "Seconds to seek forward/backward (default 10)." }
                  },
                  required: ["action"]
                }
              },
              {
                name: "controlSystemSettings",
                description: "Adjust device volume or screen brightness. Call this when the user asks to change, increase, decrease, or set volume or brightness.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    setting: { type: Type.STRING, description: "'volume' or 'brightness'" },
                    mode: { type: Type.STRING, description: "'increase', 'decrease', 'set', or 'mute'" },
                    value: { type: Type.NUMBER, description: "Numerical value (0-100) if specified" }
                  },
                  required: ["setting", "mode"]
                }
              },
              {
                name: "scrollPage",
                description: "Scroll the webpage or screen up or down. Call when user asks to scroll down ('neeche scroll karo'), scroll up ('upar scroll karo'), 'thoda upar karo', 'page neeche karo', etc.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    direction: { type: Type.STRING, description: "'up' or 'down'" },
                    amount: { type: Type.STRING, description: "'small', 'medium', or 'large'" }
                  },
                  required: ["direction"]
                }
              },
              {
                name: "tapElement",
                description: "Tap or click an interactive element on the screen (button, link, search result, image, etc.). Call when user asks 'ispe tap karo', 'yaha click karo', 'pehle wale result pe tap karo', etc.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    target: { type: Type.STRING, description: "Target element text, ordinal ('first result', 'pehle wale'), or 'yaha'" }
                  },
                  required: ["target"]
                }
              },
              {
                name: "manageFaceSecurity",
                description: "Enroll owner face, verify owner face, or manage face security profile for boss Udit. Call when user asks 'face enrollment karo', 'face verify karo', 'chehra dekho', 'verify my face', etc.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    mode: { type: Type.STRING, description: "'enroll', 'verify', 'manage', or 'delete'" }
                  },
                  required: ["mode"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle GoAway / Session Management signal gracefully
            const msgAny = message as any;
            if (msgAny.goAway || msgAny.go_away || msgAny.serverContent?.goAway || msgAny.serverContent?.go_away) {
              console.log("Live API GoAway signal received (session duration limit reached). Closing connection gracefully.");
              this.stop();
              return;
            }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            const userText = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (userText) {
               // Output transcription
               this.onMessage("zoya", userText);
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (call.name === "goToHomePage") {
                  const homeUrl = getZoyaHomeUrl();
                  this.onCommand(homeUrl);
                  this.sessionPromise?.then((session) => {
                    session.sendToolResponse({
                      functionResponses: [
                        {
                          name: call.name,
                          id: call.id,
                          response: { result: "Navigated to ZOYA Home Page." },
                        },
                      ],
                    });
                  });
                } else if (call.name === "controlVideoPlayer") {
                  const args = call.args as any;
                  if (args.action === "play" && args.query) {
                    const details = await getYouTubePlayDetails(args.query);
                    if (details.videoId) {
                      this.onMediaAction({
                        action: "play",
                        videoId: details.videoId,
                        title: details.title || args.query,
                      });
                    } else {
                      this.onCommand(details.watchUrl);
                    }
                  } else {
                    this.onMediaAction({
                      action: args.action || "pause",
                      seconds: typeof args.seconds === "number" ? args.seconds : 10,
                    });
                  }

                  this.sessionPromise?.then((session) => {
                    session.sendToolResponse({
                      functionResponses: [
                        {
                          name: call.name,
                          id: call.id,
                          response: { result: `Video player command ${args.action} executed.` },
                        },
                      ],
                    });
                  });
                } else if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  let url = "";
                  if (args.actionType === "youtube") {
                    const details = await getYouTubePlayDetails(args.query);
                    if (details.videoId) {
                      this.onMediaAction({
                        action: "play",
                        videoId: details.videoId,
                        title: details.title || args.query,
                      });
                    } else {
                      this.onCommand(details.watchUrl);
                    }
                  } else {
                    if (args.actionType === "spotify") {
                      url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                    } else if (args.actionType === "whatsapp") {
                      url = `https://web.whatsapp.com/send?phone=${args.target || ''}&text=${encodeURIComponent(args.query)}`;
                    } else {
                      url = getWebsiteUrl(args.query);
                    }
                    this.onCommand(url);
                  }
                  
                  // Send tool response
                  this.sessionPromise?.then(session => {
                     session.sendToolResponse({
                       functionResponses: [{
                         name: call.name,
                         id: call.id,
                         response: { result: "Action executed successfully." }
                       }]
                     });
                  });
                } else if (call.name === "controlSystemSettings") {
                  const args = call.args as any;
                  const payload: SystemActionPayload = {
                    type: args.setting === "brightness" ? "brightness" : "volume",
                    mode: args.mode || "set",
                    value: typeof args.value === "number" ? args.value : undefined
                  };
                  
                  this.onSystemAction(payload);
                  
                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: `System ${args.setting} adjusted successfully.` }
                      }]
                    });
                  });
                } else if (call.name === "scrollPage") {
                  const args = call.args as any;
                  const dir = args.direction === "up" ? "up" : "down";
                  const amt = args.amount || "medium";
                  
                  scrollPage(dir, amt);
                  this.onScrollAction({ direction: dir, amount: amt });

                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: `Page scrolled ${dir} (${amt}).` }
                      }]
                    });
                  });
                } else if (call.name === "tapElement") {
                  const args = call.args as any;
                  const target = args.target || "yaha";
                  const res = tapElement(target);
                  
                  this.onTapAction({ target, result: res });

                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { 
                          result: res.success 
                            ? `Successfully tapped ${res.elementName || target}.` 
                            : res.errorReason === "safety" 
                              ? res.safetyMessage 
                              : "Could not find element to tap. Ask user for clarification." 
                        }
                      }]
                    });
                  });
                } else if (call.name === "manageFaceSecurity") {
                  const args = call.args as any;
                  const mode = args.mode || "verify";
                  
                  this.onFaceAction({ mode });

                  this.sessionPromise?.then(session => {
                    session.sendToolResponse({
                      functionResponses: [{
                        name: call.name,
                        id: call.id,
                        response: { result: `Opened ZOYA Face Security Modal in ${mode} mode.` }
                      }]
                    });
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Live API Closed");
            this.stop();
          },
          onerror: (err) => {
            console.warn("Live API Notice:", err);
            const errStr = String((err as any)?.message || err || "").toLowerCase();
            if (errStr.includes("goaway") || errStr.includes("go away") || errStr.includes("connection aborted") || errStr.includes("session duration")) {
              this.stop();
              return;
            }
            try {
              this.onError(err);
            } catch (e) {}
            this.stop();
          }
        }
      });

      // Catch immediate promise rejection if WS fails to establish
      if (this.sessionPromise && typeof (this.sessionPromise as any).catch === "function") {
        this.sessionPromise.catch(err => {
          console.warn("Live Session connect rejected:", err);
          try {
            this.onError(err);
          } catch (e) {}
          this.stop();
        });
      }

    } catch (error) {
      console.warn("Failed to initialize Live Session:", error);
      this.stop();
      throw error;
    }
  }


  private async playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      if (this.playbackContext.state === "suspended") {
        await this.playbackContext.resume();
      }
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(1, buffer.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }
      
      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = this.playbackContext.createGain();
      gainNode.gain.value = getGlobalVolume() / 100;
      
      source.connect(gainNode);
      gainNode.connect(this.playbackContext.destination);
      
      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }
      
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;
      
      source.onended = () => {
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.1) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      this.playbackContext.close();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackContext.currentTime;
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.stopPlayback();
    
    if (this.sessionPromise) {
      const sessP = this.sessionPromise;
      this.sessionPromise = null;
      sessP.then(session => {
        try {
          if (session && typeof session.close === 'function') {
            session.close();
          }
        } catch (e) {
          console.warn("Session close exception ignored:", e);
        }
      }).catch(() => {});
    }
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        session.sendRealtimeInput({ text });
      });
    }
  }
}

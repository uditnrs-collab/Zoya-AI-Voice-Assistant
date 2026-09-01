import React, { useState, useEffect, useRef, useCallback } from "react";
import { getZoyaResponse, getZoyaAudio, resetZoyaSession, streamZoyaResponse, StreamZoyaHandle } from "./services/geminiService";
import { processCommand, getZoyaHomeUrl, SystemActionPayload, MediaActionPayload } from "./services/commandService";
import { LiveSessionManager } from "./services/liveService";
import Visualizer, { HudToast } from "./components/Visualizer";
import PermissionModal from "./components/PermissionModal";
import HomeSettingsModal from "./components/HomeSettingsModal";
import FaceRecognitionModal from "./components/FaceRecognitionModal";
import ContactsModal from "./components/ContactsModal";
import GitaPuranModal from "./components/GitaPuranModal";
import { ScreenVisionModal } from "./components/ScreenVisionModal";
import { LiveScreenCompanionHUD } from "./components/LiveScreenCompanionHUD";
import { CameraVisionModal } from "./components/CameraVisionModal";
import { ImageAnalysisModal } from "./components/ImageAnalysisModal";
import { SpotifyModal } from "./components/SpotifyModal";
import { ThemeSettingsModal } from "./components/ThemeSettingsModal";
import { CalendarModal } from "./components/CalendarModal";
import YouTubePlayer from "./components/YouTubePlayer";
import { playPCM, setGlobalVolume, speakZoyaResponse, StreamingSpeechQueue, initVoiceCache, stopZoyaSpeaking } from "./utils/audioUtils";
import { scrollPage, tapElement } from "./utils/domInteraction";
import { CallCommandResult, makePhoneCall, startWhatsAppCall, startWhatsAppVideoCall } from "./services/callService";
import { androidForegroundService } from "./services/androidForegroundService";
import { screenService } from "./services/screenService";
import { cameraService } from "./services/cameraService";
import { imageAnalysisService } from "./services/imageAnalysisService";
import { spotifyService } from "./services/spotifyService";
import { latencyTracker } from "./utils/latencyTracker";
import { ZoyaThemeColor, DEFAULT_THEME_COLOR, DEFAULT_GLOW_INTENSITY } from "./utils/themeConfig";

type AppState = "idle" | "listening" | "processing" | "speaking";

interface ChatMessage {
  id: string;
  sender: "user" | "zoya";
  text: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [volume, setVolume] = useState<number>(80);
  const [brightness, setBrightness] = useState<number>(100);
  const [hudToast, setHudToast] = useState<HudToast | null>(null);

  const [activeVideo, setActiveVideo] = useState<{ videoId: string; title?: string } | null>(null);
  const [mediaControlCommand, setMediaControlCommand] = useState<{
    action: "play" | "pause" | "resume" | "forward" | "backward" | "close";
    seconds?: number;
    id: number;
  } | null>(null);

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((toast: HudToast) => {
    setHudToast(toast);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const duration = toast.url ? 6000 : 2800;
    toastTimerRef.current = setTimeout(() => {
      setHudToast(null);
    }, duration);
  }, []);

  const applyMediaAction = useCallback((payload: MediaActionPayload) => {
    if (payload.action === "play" && payload.videoId) {
      setActiveVideo({ videoId: payload.videoId, title: payload.title });
      showToast({ type: "action", title: `PLAYING: ${payload.title || 'VIDEO'}` });
    } else if (payload.action === "pause") {
      setMediaControlCommand({ action: "pause", id: Date.now() });
      showToast({ type: "action", title: "VIDEO PAUSED" });
    } else if (payload.action === "resume") {
      setMediaControlCommand({ action: "resume", id: Date.now() });
      showToast({ type: "action", title: "RESUMED VIDEO" });
    } else if (payload.action === "forward") {
      setMediaControlCommand({ action: "forward", seconds: payload.seconds || 10, id: Date.now() });
      showToast({ type: "action", title: `FORWARD +${payload.seconds || 10}s` });
    } else if (payload.action === "backward") {
      setMediaControlCommand({ action: "backward", seconds: payload.seconds || 10, id: Date.now() });
      showToast({ type: "action", title: `REWIND -${payload.seconds || 10}s` });
    } else if (payload.action === "close") {
      setActiveVideo(null);
      setMediaControlCommand(null);
      showToast({ type: "action", title: "VIDEO CLOSED" });
    }
  }, [showToast]);

  const applySystemAction = useCallback((payload: SystemActionPayload) => {
    if (payload.type === "volume") {
      setVolume((prevVol) => {
        let newVol = prevVol;
        if (payload.mode === "increase") newVol = Math.min(100, prevVol + 20);
        else if (payload.mode === "decrease") newVol = Math.max(0, prevVol - 20);
        else if (payload.mode === "mute") newVol = 0;
        else if (payload.mode === "set" && typeof payload.value === "number") newVol = Math.min(100, Math.max(0, payload.value));

        setGlobalVolume(newVol);
        showToast({ type: "volume", title: `VOLUME: ${newVol}%`, value: newVol });
        return newVol;
      });
    } else if (payload.type === "brightness") {
      setBrightness((prevBright) => {
        let newBright = prevBright;
        if (payload.mode === "increase") newBright = Math.min(100, prevBright + 20);
        else if (payload.mode === "decrease") newBright = Math.max(10, prevBright - 20);
        else if (payload.mode === "set" && typeof payload.value === "number") newBright = Math.min(100, Math.max(10, payload.value));

        showToast({ type: "brightness", title: `BRIGHTNESS: ${newBright}%`, value: newBright });
        return newBright;
      });
    }
  }, [showToast]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("zoya_chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [];
  });
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("zoya_chat_history", JSON.stringify(messages));
  }, [messages]);

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showHomeModal, setShowHomeModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showGitaModal, setShowGitaModal] = useState(false);
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [screenModalMode, setScreenModalMode] = useState<"companion" | "read" | "analysis">("companion");
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isBgServiceActive, setIsBgServiceActive] = useState(false);
  const [activeCallAction, setActiveCallAction] = useState<CallCommandResult | null>(null);
  const [faceModalMode, setFaceModalMode] = useState<"enroll" | "verify" | "manage">("verify");
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Persistent Theme Color & Adjustable Glow
  const [themeColor, setThemeColor] = useState<ZoyaThemeColor>(() => {
    const saved = localStorage.getItem("zoya_theme_color");
    return (saved as ZoyaThemeColor) || DEFAULT_THEME_COLOR;
  });

  const [glowIntensity, setGlowIntensity] = useState<number>(() => {
    const saved = localStorage.getItem("zoya_glow_intensity");
    if (saved !== null) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) return Math.max(0, Math.min(100, num));
    }
    return DEFAULT_GLOW_INTENSITY;
  });

  const handleColorChange = useCallback((newColor: ZoyaThemeColor) => {
    setThemeColor(newColor);
    localStorage.setItem("zoya_theme_color", newColor);
  }, []);

  const handleGlowChange = useCallback((newIntensity: number) => {
    const clamped = Math.max(0, Math.min(100, newIntensity));
    setGlowIntensity(clamped);
    localStorage.setItem("zoya_glow_intensity", clamped.toString());
  }, []);

  // Subscribe to live screen continuous speech
  useEffect(() => {
    screenService.setSpeechCallback(async (text: string) => {
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text }]);
      setAppState("speaking");
      await speakZoyaResponse(text, getZoyaAudio);
      setAppState("idle");
    });
    return () => screenService.setSpeechCallback(null);
  }, []);

  // Subscribe to Android Foreground Service status
  useEffect(() => {
    const unsubscribe = androidForegroundService.subscribe((status) => {
      setIsBgServiceActive(status.isRunning);
      if (status.errorMessage) {
        showToast({ type: "action", title: `BG SERVICE: ${status.errorMessage.toUpperCase()}` });
      }
    });
    return () => unsubscribe();
  }, [showToast]);

  const handleToggleBackgroundService = useCallback(async () => {
    const res = await androidForegroundService.toggleService();
    if (res.success) {
      showToast({
        type: "action",
        title: isBgServiceActive ? "FOREGROUND SERVICE STOPPED" : "FOREGROUND SERVICE ACTIVE",
      });
    } else {
      showToast({
        type: "action",
        title: `SERVICE ERROR: ${res.message.toUpperCase()}`,
      });
    }
  }, [isBgServiceActive, showToast]);

  const liveSessionRef = useRef<LiveSessionManager | null>(null);
  const currentSpeechQueueRef = useRef<StreamingSpeechQueue | null>(null);
  const currentStreamHandleRef = useRef<StreamZoyaHandle | null>(null);
  const activeRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const isRecognitionActiveRef = useRef<boolean>(false);

  // Pre-warm Web Speech Voice Cache & Audio subsystem
  useEffect(() => {
    initVoiceCache();
  }, []);

  const handleTextCommand = useCallback(async (finalTranscript: string) => {
    if (!finalTranscript.trim()) {
      setAppState("idle");
      return;
    }

    // Instant interruption / barge-in of previous speech or stream
    stopZoyaSpeaking();
    if (currentSpeechQueueRef.current) {
      currentSpeechQueueRef.current.stop();
      currentSpeechQueueRef.current = null;
    }
    if (currentStreamHandleRef.current) {
      currentStreamHandleRef.current.abort();
      currentStreamHandleRef.current = null;
    }

    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "user", text: finalTranscript }]);
    
    if (isSessionActive && liveSessionRef.current) {
      liveSessionRef.current.sendText(finalTranscript);
      return;
    }

    if (finalTranscript.startsWith("ZOYA_VOICE_OUT:")) {
      const speechText = finalTranscript.replace(/^ZOYA_VOICE_OUT:\s*/, "");
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: speechText }]);
      setAppState("speaking");
      await speakZoyaResponse(speechText, getZoyaAudio);
      setAppState("idle");
      return;
    }

    setAppState("processing");

    const commandResult = await processCommand(finalTranscript);

    if (commandResult.screenAction) {
      const sMode = commandResult.screenAction.mode;
      if (sMode === "stop") {
        screenService.stopScreenSharing();
        setShowScreenModal(false);
        showToast({ type: "action", title: "SCREEN SHARING STOPPED" });
      } else if (sMode === "start") {
        setShowScreenModal(true);
        setScreenModalMode("companion");
        await screenService.startScreenSharing();
        showToast({ type: "action", title: "SELECT SCREEN TO SHARE" });
      } else if (sMode === "companion" || sMode === "explain") {
        setShowScreenModal(true);
        setScreenModalMode("companion");
        showToast({ type: "action", title: "ZOYA LIVE SCREEN COMPANION ACTIVE" });
        const res = await screenService.explainLiveScreen(
          commandResult.screenAction.query?.toLowerCase().includes("error") ? "debug" :
          commandResult.screenAction.query?.toLowerCase().includes("step") || commandResult.screenAction.query?.toLowerCase().includes("button") ? "guide" :
          commandResult.screenAction.query?.toLowerCase().includes("code") ? "code" : "explain"
        );
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      } else if (sMode === "read") {
        setShowScreenModal(true);
        setScreenModalMode("read");
        showToast({ type: "action", title: "READING SCREEN CONTENT..." });
        const res = await screenService.analyzeCurrentScreen(undefined, "screen-read");
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      } else if (sMode === "analysis") {
        setShowScreenModal(true);
        setScreenModalMode("analysis");
        showToast({ type: "action", title: "ANALYZING SCREEN UI & ERRORS..." });
        const res = await screenService.analyzeCurrentScreen(commandResult.screenAction.query, "screen-analysis");
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      }
    }

    if (commandResult.cameraAction) {
      const cMode = commandResult.cameraAction.mode;
      if (cMode === "stop") {
        cameraService.stopCamera();
        setShowCameraModal(false);
        showToast({ type: "action", title: "CAMERA STOPPED" });
      } else if (cMode === "flip") {
        await cameraService.toggleCameraFacing();
        showToast({ type: "action", title: "CAMERA FLIPPED" });
      } else if (cMode === "start" || cMode === "open") {
        setShowCameraModal(true);
        await cameraService.startCamera();
        showToast({ type: "action", title: "CAMERA FEED ACTIVE" });
      } else if (cMode === "analyze" || cMode === "ocr") {
        setShowCameraModal(true);
        showToast({ type: "action", title: cMode === "ocr" ? "READING TEXT IN VIEW..." : "IDENTIFYING VISIBLE OBJECTS..." });
        const q = cMode === "ocr" ? "Extract and read out all visible text clearly." : commandResult.cameraAction.query;
        const res = await cameraService.analyzeCurrentView(q);
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      }
    }

    if (commandResult.imageAction) {
      const iMode = commandResult.imageAction.mode;
      if (iMode === "open" || !imageAnalysisService.hasImage()) {
        setShowImageModal(true);
        showToast({ type: "action", title: "IMAGE ANALYSIS & OCR PORTAL" });
      } else if (iMode === "analyze") {
        showToast({ type: "action", title: "ANALYZING IMAGE..." });
        const res = await imageAnalysisService.analyzeImage(commandResult.imageAction.query);
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      } else if (iMode === "ocr") {
        showToast({ type: "action", title: "EXTRACTING OCR TEXT..." });
        const res = await imageAnalysisService.extractOCRText();
        if (res.text) {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: res.text }]);
          setAppState("speaking");
          await speakZoyaResponse(res.text, getZoyaAudio);
          setAppState("idle");
          return;
        }
      }
    }

    if (commandResult.spotifyAction) {
      const sp = commandResult.spotifyAction;
      let spRes: { success: boolean; message: string } = { success: false, message: "" };

      if (sp.action === "connect" || sp.action === "open") {
        setShowSpotifyModal(true);
        showToast({ type: "action", title: "SPOTIFY VOICE CONTROL" });
      } else if (sp.action === "play") {
        spRes = await spotifyService.play(sp.query);
      } else if (sp.action === "pause") {
        spRes = await spotifyService.pause();
      } else if (sp.action === "next") {
        spRes = await spotifyService.next();
      } else if (sp.action === "previous") {
        spRes = await spotifyService.previous();
      } else if (sp.action === "playlist") {
        spRes = await spotifyService.playMyPlaylist();
      } else if (sp.action === "volume" && typeof sp.value === "number") {
        spRes = await spotifyService.setVolume(sp.value);
      }

      if (spRes.message) {
        showToast({ type: "action", title: `SPOTIFY: ${spRes.message.toUpperCase()}` });
        setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: spRes.message }]);
        setAppState("speaking");
        await speakZoyaResponse(spRes.message, getZoyaAudio);
        setAppState("idle");
        return;
      }
    }

    if (commandResult.callAction) {
      setActiveCallAction(commandResult.callAction);
      const call = commandResult.callAction;
      if (call.state === "MULTIPLE_CONTACTS_FOUND") {
        setShowContactsModal(true);
        showToast({ type: "action", title: "MULTIPLE CONTACTS MATCHED" });
      } else if (call.state === "CALL_STARTED") {
        showToast({ type: "action", title: `CALLING ${call.contactName || call.phoneNumber || ''}...` });
      } else if (call.state === "WHATSAPP_OPENED") {
        showToast({ type: "action", title: `WHATSAPP CALLING ${call.contactName || call.phoneNumber || ''}...` });
      } else if (call.state === "CALL_DIALER_OPENED") {
        showToast({ type: "action", title: `DIALER OPENED: ${call.phoneNumber || ''}` });
      } else if (call.state === "CONTACT_NOT_FOUND") {
        showToast({ type: "action", title: "CONTACT NOT FOUND" });
      }
    }

    if (commandResult.systemAction) {
      applySystemAction(commandResult.systemAction);
    }

    if (commandResult.mediaAction) {
      applyMediaAction(commandResult.mediaAction);
    }

    if (commandResult.scrollAction) {
      screenService.scroll(commandResult.scrollAction.direction, commandResult.scrollAction.amount);
      showToast({ type: "action", title: `SCROLLING ${commandResult.scrollAction.direction.toUpperCase()}...` });
    }

    if (commandResult.tapAction) {
      const res = tapElement(commandResult.tapAction.target);
      if (res.errorReason === "safety") {
        commandResult.action = res.safetyMessage || "Boss, kya aap sach me iss option par tap karna chahte hain?";
        showToast({ type: "action", title: "CONFIRMATION REQUIRED" });
      } else if (res.success) {
        showToast({ type: "action", title: `TAPPED: ${res.elementName || commandResult.tapAction.target}` });
      } else {
        commandResult.action = "Boss, kis button ya option par tap karun?";
        showToast({ type: "action", title: "ELEMENT NOT FOUND" });
      }
    }

    if (commandResult.faceAction) {
      if (commandResult.faceAction.mode === "close") {
        setShowFaceModal(false);
        showToast({ type: "action", title: "FACE SECURITY WINDOW CLOSED" });
      } else {
        const mode = commandResult.faceAction.mode === "delete" ? "manage" : commandResult.faceAction.mode;
        setFaceModalMode(mode);
        setShowFaceModal(true);
      }
    }

    if (commandResult.gitaAction) {
      setShowGitaModal(true);
      showToast({ type: "action", title: "श्रीमद्भगवद्गीता एवं 18 महापुराण पोर्टल" });
    }

    if (commandResult.calendarAction) {
      if (commandResult.calendarAction === "open" || commandResult.calendarAction === "mark") {
        setShowCalendarModal(true);
        showToast({ type: "action", title: "ZOYA INTELLIGENT CALENDAR" });
      } else if (commandResult.calendarAction === "close") {
        setShowCalendarModal(false);
      }
    }

    if (commandResult.backgroundServiceAction) {
      if (commandResult.backgroundServiceAction.enable) {
        await androidForegroundService.startService();
        showToast({ type: "action", title: "FOREGROUND SERVICE STARTED" });
      } else {
        await androidForegroundService.stopService();
        showToast({ type: "action", title: "FOREGROUND SERVICE STOPPED" });
      }
    }

    let responseText = "";

    if (commandResult.isBrowserAction) {
      responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      
      if (commandResult.url) {
        const homeUrl = getZoyaHomeUrl();
        const isHome = commandResult.isHomeAction || commandResult.url === homeUrl;

        let siteName = "WEBSITE";
        if (isHome) siteName = "ZOYA HOME PAGE";
        else if (commandResult.url.includes("youtube.com")) siteName = "YOUTUBE";
        else if (commandResult.url.includes("google.com")) siteName = "GOOGLE";
        else if (commandResult.url.includes("instagram.com")) siteName = "INSTAGRAM";
        else if (commandResult.url.includes("spotify.com")) siteName = "SPOTIFY";
        else if (commandResult.url.includes("whatsapp.com")) siteName = "WHATSAPP";
        else if (commandResult.url.includes("github.com")) siteName = "GITHUB";

        showToast({ type: "action", title: isHome ? "NAVIGATING TO ZOYA HOME PAGE..." : `OPENING ${siteName}...`, url: commandResult.url });

        if (isHome) {
          setActiveVideo(null);
        }
      }

      setAppState("speaking");
      await speakZoyaResponse(responseText, getZoyaAudio);
      setAppState("idle");

      if (commandResult.url) {
        setTimeout(() => {
          try {
            const urlToOpen = commandResult.url!;
            if (urlToOpen.startsWith("tel:") || urlToOpen.startsWith("mailto:")) {
              window.location.href = urlToOpen;
              return;
            }
            // Ensure valid URL structure
            new URL(urlToOpen);
            const homeUrl = getZoyaHomeUrl();
            const isHome = commandResult.isHomeAction || urlToOpen === homeUrl;
            if (isHome) {
              const homeWin = window.open(urlToOpen, "zoya_home_window");
              if (homeWin) homeWin.focus();
            } else {
              window.open(urlToOpen, "_blank", "noopener,noreferrer");
            }
          } catch (err) {
            console.error("Window open error:", err);
          }
        }, 500);
      }
    } else if (commandResult.mediaAction || commandResult.action) {
      const responseText = commandResult.action;
      setMessages((prev) => [...prev, { id: Date.now().toString() + "-z", sender: "zoya", text: responseText }]);
      setAppState("speaking");
      await speakZoyaResponse(responseText, getZoyaAudio);
      setAppState("idle");
    } else {
      // High-speed low-latency streaming conversational reply
      const zoyaMsgId = Date.now().toString() + "-z";
      setMessages((prev) => [...prev, { id: zoyaMsgId, sender: "zoya", text: "" }]);

      const speechQueue = new StreamingSpeechQueue();
      currentSpeechQueueRef.current = speechQueue;
      speechQueue.onStartSpeaking = () => {
        setAppState("speaking");
      };
      speechQueue.onFinishSpeaking = () => {
        setAppState("idle");
      };

      const streamHandle = streamZoyaResponse(finalTranscript, messagesRef.current, {
        onToken: (_token, accumulated) => {
          setMessages((prev) => prev.map((m) => (m.id === zoyaMsgId ? { ...m, text: accumulated } : m)));
        },
        onSentence: (sentence) => {
          speechQueue.enqueue(sentence);
        },
        onDone: (fullText) => {
          setMessages((prev) => prev.map((m) => (m.id === zoyaMsgId ? { ...m, text: fullText } : m)));
        },
        onError: (err) => {
          console.warn("Zoya stream fallback:", err);
        },
      });

      currentStreamHandleRef.current = streamHandle;
      await streamHandle.promise;
    }
  }, [isSessionActive, applySystemAction, applyMediaAction, showToast]);

  const startFallbackSpeech = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast({ type: "action", title: "USE TEXT INPUT BAR BELOW" });
      return;
    }

    // Abort existing recognition or timers
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.abort();
      } catch (e) {}
      activeRecognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = "hi-IN";
      activeRecognitionRef.current = recognition;
      isRecognitionActiveRef.current = true;
      currentTranscriptRef.current = "";

      let hasRecognizedAnySpeech = false;

      recognition.onstart = () => {
        setAppState("listening");
        showToast({ type: "action", title: "LISTENING..." });
      };

      const finalizeAndExecute = (transcript: string) => {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        isRecognitionActiveRef.current = false;
        try {
          recognition.stop();
        } catch (e) {}
        activeRecognitionRef.current = null;

        const clean = transcript.trim();
        if (clean) {
          latencyTracker.startSession();
          handleTextCommand(clean);
        } else {
          setAppState("idle");
        }
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || "";
          if (item.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const currentActive = (finalTranscript || interimTranscript || "").trim();
        if (currentActive) {
          hasRecognizedAnySpeech = true;
          currentTranscriptRef.current = currentActive;

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Optimal adaptive silence detection: 400ms after final chunk or 650ms after interim pause
          const silenceWindow = finalTranscript ? 400 : 650;
          silenceTimerRef.current = setTimeout(() => {
            if (currentTranscriptRef.current) {
              finalizeAndExecute(currentTranscriptRef.current);
            }
          }, silenceWindow);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        isRecognitionActiveRef.current = false;
        activeRecognitionRef.current = null;

        if (event.error === "no-speech") {
          if (hasRecognizedAnySpeech && currentTranscriptRef.current) {
            finalizeAndExecute(currentTranscriptRef.current);
            return;
          }
          setAppState("idle");
          return;
        }

        setAppState("idle");
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setShowPermissionModal(true);
        } else {
          showToast({ type: "action", title: "TYPE COMMAND IN INPUT BAR BELOW" });
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        activeRecognitionRef.current = null;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (hasRecognizedAnySpeech && currentTranscriptRef.current) {
          finalizeAndExecute(currentTranscriptRef.current);
        } else {
          setAppState((prev) => (prev === "listening" ? "idle" : prev));
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Speech Recognition start error:", err);
      setAppState("idle");
      showToast({ type: "action", title: "TYPE COMMAND IN INPUT BAR BELOW" });
    }
  }, [handleTextCommand, showToast]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
      }
      if (currentSpeechQueueRef.current) {
        currentSpeechQueueRef.current.stop();
      }
      if (currentStreamHandleRef.current) {
        currentStreamHandleRef.current.abort();
      }
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = async () => {
    // 1. Instant barge-in / speech cancel if Zoya is speaking
    if (appState === "speaking") {
      stopZoyaSpeaking();
      if (currentSpeechQueueRef.current) {
        currentSpeechQueueRef.current.stop();
        currentSpeechQueueRef.current = null;
      }
      if (currentStreamHandleRef.current) {
        currentStreamHandleRef.current.abort();
        currentStreamHandleRef.current = null;
      }
      setAppState("idle");
      return;
    }

    // 2. If listening and user taps, finalize recognized speech immediately
    if (appState === "listening" && isRecognitionActiveRef.current) {
      if (currentTranscriptRef.current.trim()) {
        const text = currentTranscriptRef.current.trim();
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (activeRecognitionRef.current) {
          try {
            activeRecognitionRef.current.stop();
          } catch (e) {}
          activeRecognitionRef.current = null;
        }
        isRecognitionActiveRef.current = false;
        latencyTracker.startSession();
        handleTextCommand(text);
        return;
      }
      // Stop listening if no speech
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch (e) {}
        activeRecognitionRef.current = null;
      }
      isRecognitionActiveRef.current = false;
      setAppState("idle");
      return;
    }

    if (isSessionActive) {
      setIsSessionActive(false);
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setAppState("idle");
      resetZoyaSession();
    } else {
      try {
        setIsSessionActive(true);
        resetZoyaSession();
        
        const session = new LiveSessionManager();
        liveSessionRef.current = session;
        
        session.onStateChange = (state) => {
          setAppState(state);
        };
        
        session.onMessage = (sender, text) => {
          setMessages((prev) => [...prev, { id: Date.now().toString() + "-" + sender, sender, text }]);
        };

        session.onSystemAction = (payload) => {
          applySystemAction(payload);
        };

        session.onMediaAction = (payload) => {
          applyMediaAction(payload);
        };

        session.onScrollAction = (action) => {
          scrollPage(action.direction, action.amount);
          showToast({ type: "action", title: `SCROLLING ${action.direction.toUpperCase()}...` });
        };

        session.onTapAction = (action) => {
          if (action.result?.success) {
            showToast({ type: "action", title: `TAPPED: ${action.result.elementName || action.target}` });
          } else if (action.result?.errorReason === "safety") {
            showToast({ type: "action", title: "CONFIRMATION REQUIRED" });
          } else {
            showToast({ type: "action", title: "ELEMENT NOT FOUND" });
          }
        };

        session.onFaceAction = (action) => {
          if (action.mode === "close") {
            setShowFaceModal(false);
            showToast({ type: "action", title: "FACE SECURITY WINDOW CLOSED" });
          } else {
            const mode = action.mode === "delete" ? "manage" : action.mode;
            setFaceModalMode(mode);
            setShowFaceModal(true);
          }
        };

        session.onError = (err) => {
          console.warn("Live Session notice:", err);
          setIsSessionActive(false);
          if (liveSessionRef.current) {
            liveSessionRef.current.stop();
            liveSessionRef.current = null;
          }
          setAppState("idle");
          startFallbackSpeech();
        };
        
        session.onCommand = (url) => {
          const homeUrl = getZoyaHomeUrl();
          const isHome = url === homeUrl;

          let siteName = "WEBSITE";
          if (isHome) siteName = "ZOYA HOME PAGE";
          else if (url.includes("youtube.com")) siteName = "YOUTUBE";
          else if (url.includes("google.com")) siteName = "GOOGLE";
          else if (url.includes("instagram.com")) siteName = "INSTAGRAM";
          else if (url.includes("spotify.com")) siteName = "SPOTIFY";
          else if (url.includes("whatsapp.com")) siteName = "WHATSAPP";
          else if (url.includes("github.com")) siteName = "GITHUB";

          showToast({ type: "action", title: isHome ? "NAVIGATING TO ZOYA HOME PAGE..." : `OPENING ${siteName}...`, url });

          if (isHome) {
            setActiveVideo(null);
          }

          setTimeout(() => {
            try {
              if (url.startsWith("tel:") || url.startsWith("mailto:")) {
                window.location.href = url;
                return;
              }
              new URL(url);
              if (isHome) {
                const homeWin = window.open(url, "zoya_home_window");
                if (homeWin) homeWin.focus();
              } else {
                window.open(url, "_blank", "noopener,noreferrer");
              }
            } catch (err) {
              console.error("Window open error:", err);
            }
          }, 300);
        };

        await session.start();
      } catch (e: any) {
        console.error("Failed to start session", e);
        const errMsg = (e?.message || String(e)).toLowerCase();
        setIsSessionActive(false);
        setAppState("idle");

        if (
          errMsg.includes("permission") ||
          errMsg.includes("notallowed") ||
          errMsg.includes("microphone") ||
          errMsg.includes("denied")
        ) {
          setShowPermissionModal(true);
        } else {
          startFallbackSpeech();
        }
      }
    }
  };

  return (
    <div 
      className="h-[100dvh] w-screen bg-black text-white flex flex-col items-center justify-center font-sans relative overflow-hidden m-0 p-0 transition-[filter] duration-300"
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {showPermissionModal && (
        <PermissionModal 
          onClose={() => {
            setShowPermissionModal(false);
            showToast({ type: "action", title: "TYPE COMMAND IN INPUT BAR BELOW" });
          }} 
        />
      )}

      {/* Home Settings Modal */}
      <HomeSettingsModal
        isOpen={showHomeModal}
        onClose={() => setShowHomeModal(false)}
        onHomeUrlUpdated={(newUrl) => {
          showToast({ type: "action", title: "ZOYA HOME PAGE UPDATED" });
        }}
      />

      {/* Face Security Modal */}
      <FaceRecognitionModal
        isOpen={showFaceModal}
        initialMode={faceModalMode}
        onClose={() => setShowFaceModal(false)}
        showToast={showToast}
        onVerificationComplete={(isMatch, msg) => {
          showToast({
            type: "action",
            title: isMatch ? "WELCOME BACK, BOSS UDIT" : "UNRECOGNIZED FACE",
          });
          speakZoyaResponse(msg);
        }}
      />

      {/* Contacts & Voice Calling Control Modal */}
      <ContactsModal
        isOpen={showContactsModal}
        onClose={() => {
          setShowContactsModal(false);
          setActiveCallAction(null);
        }}
        activeCallAction={activeCallAction}
        onSelectContactToCall={(contact) => {
          if (activeCallAction?.callType === "whatsapp") {
            startWhatsAppCall(contact.phoneNumber);
          } else if (activeCallAction?.callType === "whatsapp_video") {
            startWhatsAppVideoCall(contact.phoneNumber);
          } else {
            makePhoneCall(contact.phoneNumber);
          }
          setShowContactsModal(false);
          setActiveCallAction(null);
          speakZoyaResponse(`Ji boss, ${contact.name} ko call laga rahi hoon.`);
        }}
      />

      {/* Shrimad Bhagavad Gita & 18 Mahapuranas Knowledge Modal */}
      <GitaPuranModal
        isOpen={showGitaModal}
        onClose={() => setShowGitaModal(false)}
        onAskZoya={handleTextCommand}
      />

      {/* Screen Reading, Live Companion & Real-time Analysis Modal */}
      <ScreenVisionModal
        isOpen={showScreenModal}
        initialMode={screenModalMode}
        onClose={() => setShowScreenModal(false)}
        onAskZoya={handleTextCommand}
      />

      {/* Floating Live Screen Companion HUD Widget */}
      <LiveScreenCompanionHUD
        onOpenModal={() => {
          setScreenModalMode("companion");
          setShowScreenModal(true);
        }}
        onAskZoya={handleTextCommand}
      />

      {/* Live Camera Vision & Object Identification Modal */}
      <CameraVisionModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onAskZoya={handleTextCommand}
      />

      {/* Image Analysis & OCR Modal */}
      <ImageAnalysisModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onAskZoya={handleTextCommand}
      />

      {/* Official Spotify Voice Control Modal */}
      <SpotifyModal
        isOpen={showSpotifyModal}
        onClose={() => setShowSpotifyModal(false)}
        onAskZoya={handleTextCommand}
      />

      {/* Theme Color & Adjustable Glow Customization Modal */}
      <ThemeSettingsModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentColor={themeColor}
        onColorChange={handleColorChange}
        glowIntensity={glowIntensity}
        onGlowChange={handleGlowChange}
      />

      {/* ZOYA Intelligent Calendar & Date Planner Modal */}
      <CalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        themeColor={themeColor}
        glowIntensity={glowIntensity}
        onAskZoya={handleTextCommand}
      />

      {/* Embedded YouTube Player */}
      {activeVideo && (
        <YouTubePlayer
          videoId={activeVideo.videoId}
          title={activeVideo.title}
          onClose={() => {
            setActiveVideo(null);
            setMediaControlCommand(null);
          }}
          controlCommand={mediaControlCommand}
        />
      )}

      {/* Futuristic HUD Visualizer */}
      <Visualizer 
        state={appState} 
        isActive={isSessionActive} 
        onClick={toggleListening} 
        toast={hudToast}
        onTextCommand={handleTextCommand}
        onToggleBackgroundService={handleToggleBackgroundService}
        isBackgroundServiceRunning={isBgServiceActive}
        onOpenThemeSettings={() => setShowThemeModal(true)}
        onOpenCalendar={() => setShowCalendarModal(true)}
        themeColor={themeColor}
        glowIntensity={glowIntensity}
        onOpenScreenVision={() => {
          setScreenModalMode("companion");
          setShowScreenModal(true);
        }}
        onOpenCameraVision={() => setShowCameraModal(true)}
        onOpenImageAnalysis={() => setShowImageModal(true)}
        onOpenSpotify={() => setShowSpotifyModal(true)}
        onOpenGitaPuran={() => setShowGitaModal(true)}
        onOpenContacts={() => setShowContactsModal(true)}
        onOpenHomeSettings={() => setShowHomeModal(true)}
        onOpenFaceSecurity={() => {
          setFaceModalMode("verify");
          setShowFaceModal(true);
        }}
      />
    </div>
  );
}


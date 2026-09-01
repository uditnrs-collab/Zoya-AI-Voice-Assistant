import React, { useEffect, useState, useRef } from "react";
import { screenService, ScreenState } from "../services/screenService";
import { scrollPage } from "../utils/domInteraction";

interface ScreenVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskZoya: (text: string) => void;
  initialMode?: "companion" | "read" | "analysis";
}

export const ScreenVisionModal: React.FC<ScreenVisionModalProps> = ({
  isOpen,
  onClose,
  onAskZoya,
  initialMode = "companion",
}) => {
  const [screenState, setScreenState] = useState<ScreenState>({
    isSharing: false,
    isAnalyzing: false,
    isLiveCompanion: false,
    autoVoice: true,
    intervalSeconds: 12,
    activeMode: "idle",
    lastAnalysis: null,
    lastAnalysisTimestamp: null,
    liveExplanation: null,
    liveExplanationTimestamp: null,
    error: null,
  });

  const [questionText, setQuestionText] = useState("");
  const [activeTab, setActiveTab] = useState<"companion" | "read" | "analysis">(initialMode);
  const [capturedThumbnail, setCapturedThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = screenService.subscribe((st) => {
      setScreenState(st);
      if (st.isSharing) {
        const thumb = screenService.captureCurrentFrame();
        if (thumb) setCapturedThumbnail(thumb);
      } else if (screenService.getStaticFrame()) {
        setCapturedThumbnail(screenService.getStaticFrame());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      const staticThumb = screenService.getStaticFrame();
      if (staticThumb) {
        setCapturedThumbnail(staticThumb);
      } else if (screenService.isScreenSharingActive()) {
        const thumb = screenService.captureCurrentFrame();
        if (thumb) setCapturedThumbnail(thumb);
      }
    }
  }, [isOpen, initialMode]);

  // Periodic thumbnail refresher when modal is open
  useEffect(() => {
    if (!isOpen || !screenState.isSharing) return;
    const timer = setInterval(() => {
      const thumb = screenService.captureCurrentFrame();
      if (thumb) setCapturedThumbnail(thumb);
    }, 2000);
    return () => clearInterval(timer);
  }, [isOpen, screenState.isSharing]);

  // Handle Ctrl+V paste of screenshots
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result as string;
              if (base64) {
                screenService.setStaticFrame(base64);
                setCapturedThumbnail(base64);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          screenService.setStaticFrame(base64);
          setCapturedThumbnail(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartSharing = async () => {
    screenService.setStaticFrame(null);
    const res = await screenService.startScreenSharing();
    if (res.success) {
      setTimeout(() => {
        const thumb = screenService.captureCurrentFrame();
        if (thumb) setCapturedThumbnail(thumb);
      }, 600);
    }
  };

  const handleStopSharing = () => {
    screenService.stopScreenSharing();
    screenService.setStaticFrame(null);
    setCapturedThumbnail(null);
  };

  const handleExplainScreen = async (mode: "explain" | "debug" | "guide" | "code" = "explain") => {
    const res = await screenService.explainLiveScreen(mode);
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleReadScreen = async () => {
    const res = await screenService.analyzeCurrentScreen(
      "Analyze this captured computer screen carefully. Read and extract all visible text, UI buttons, open tabs, documents, menus, and headings. Provide a clear, natural, structured overview of everything visible on screen in your loyal Zoya tone (Hindi/Hinglish/English).",
      "screen-read"
    );
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleCustomQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    const prompt = questionText.trim();
    setQuestionText("");
    const res = await screenService.analyzeCurrentScreen(prompt, "live-screen-companion");
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-neutral-950/95 border border-[#00E5FF]/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,229,255,0.25)] text-neutral-200 font-sans max-h-[92vh] overflow-y-auto flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00E5FF]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] text-xl shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              🖥️
            </div>
            <div>
              <h2 className="text-base font-mono font-bold tracking-wider text-white flex items-center gap-2">
                ZOYA LIVE SCREEN COMPANION & VISION
                {screenState.isSharing && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-500/50 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SCREEN ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Live Screen Understanding • Real-time Guidance • Step-by-Step Hindi Voice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all font-mono text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 bg-black/60 rounded-xl border border-neutral-800 flex-wrap">
          <button
            onClick={() => setActiveTab("companion")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "companion"
                ? "bg-[#00E5FF]/20 border border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            🛰️ 1. LIVE COMPANION & GUIDE
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "analysis"
                ? "bg-[#00E5FF]/20 border border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            🐞 2. DEBUG & ERROR CHECK
          </button>
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer ${
              activeTab === "read"
                ? "bg-[#00E5FF]/20 border border-[#00E5FF] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            📖 3. OCR & READ TEXT
          </button>
        </div>

        {/* Screen Preview & Sharing Controls */}
        <div className="rounded-xl border border-[#00E5FF]/20 bg-black/50 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Display Capture Stream / Live Feed:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-[#00E5FF]/50 text-neutral-300 font-mono font-medium text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                title="Upload or Paste Screenshot (Ctrl+V)"
              >
                <span>📎</span>
                <span>UPLOAD SCREENSHOT</span>
              </button>

              {!screenState.isSharing ? (
                <button
                  type="button"
                  onClick={handleStartSharing}
                  className="px-3.5 py-1.5 rounded-lg bg-[#00E5FF] hover:bg-[#00BFFF] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)] cursor-pointer flex items-center gap-1.5"
                >
                  <span>📺</span>
                  <span>SELECT & SHARE SCREEN</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopSharing}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-950 border border-rose-500/50 hover:bg-rose-900 text-rose-300 font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>🛑</span>
                  <span>STOP SCREEN SHARING</span>
                </button>
              )}
            </div>
          </div>

          {/* Screen Thumbnail / Placeholder */}
          {capturedThumbnail ? (
            <div
              data-screen-viewport="true"
              className="relative rounded-lg overflow-hidden border border-[#00E5FF]/30 bg-black aspect-video max-h-56 flex items-center justify-center cursor-grab active:cursor-grabbing"
            >
              <img
                data-scroll-content="true"
                src={capturedThumbnail}
                alt="Live Screen Capture"
                className="w-full h-full object-contain transition-transform duration-200"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                <span className="px-2 py-0.5 rounded bg-black/80 border border-[#00E5FF]/40 text-[10px] font-mono text-[#00E5FF]">
                  {screenState.isSharing ? "● LIVE SCREEN STREAM" : "● LOADED SCREENSHOT"}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/80 border border-neutral-700 text-[10px] font-mono text-neutral-400">
                  ZOOM: {Math.round(screenState.zoomLevel * 100)}%
                </span>
              </div>
              {screenState.isLiveCompanion && (
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[10px] font-mono text-emerald-400 animate-pulse z-10">
                  AUTO-WATCHING (EVERY {screenState.intervalSeconds}s)
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-dashed border-neutral-800 bg-neutral-900/30 p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#00E5FF]/40 transition-all"
            >
              <span className="text-3xl opacity-60">💻</span>
              <p className="text-xs font-mono text-neutral-300">
                Click <span className="text-[#00E5FF] font-bold">"Select & Share Screen"</span> for live continuous watching, or <span className="text-[#00E5FF] font-bold">press Ctrl+V / Upload</span> to paste a screenshot.
              </p>
              <p className="text-[11px] text-neutral-500 font-mono">
                (ZOYA watches your open apps, code, web forms, games, and documents live and explains everything)
              </p>
            </div>
          )}

          {/* Auto Companion Controls Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-neutral-800 text-xs font-mono">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={screenState.isLiveCompanion}
                  onChange={(e) => {
                    if (e.target.checked) {
                      screenService.startLiveCompanion({ autoVoice: screenState.autoVoice });
                    } else {
                      screenService.stopLiveCompanion();
                    }
                  }}
                  className="rounded accent-[#00E5FF] w-4 h-4 cursor-pointer"
                />
                <span className="font-bold text-[#00E5FF]">Continuous Auto-Watch</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-neutral-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={screenState.autoVoice}
                  onChange={(e) => screenService.setAutoVoice(e.target.checked)}
                  className="rounded accent-[#00E5FF] w-4 h-4 cursor-pointer"
                />
                <span>🔊 Voice Out Guidance</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-neutral-400">
              <span>Interval:</span>
              <select
                value={screenState.intervalSeconds}
                onChange={(e) => screenService.setIntervalSeconds(Number(e.target.value))}
                className="bg-black border border-neutral-700 rounded px-2 py-1 text-xs text-[#00E5FF] font-mono focus:outline-none"
              >
                <option value={8}>8 sec</option>
                <option value={12}>12 sec (Balanced)</option>
                <option value={20}>20 sec</option>
                <option value={30}>30 sec</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Triggers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeTab === "companion" && (
            <>
              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("explain")}
                className="p-3.5 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50 group"
              >
                <div className="text-xs font-mono font-bold text-[#00E5FF] flex items-center justify-between">
                  <span>💡 "Zoya, screen samjhao"</span>
                  {screenState.isAnalyzing && screenState.activeMode === "companion" && (
                    <span className="text-[10px] animate-pulse text-amber-400">EXPLAINING...</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Explains the open app, website, or document step-by-step in easy Hindi/Hinglish.
                </p>
              </button>

              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("guide")}
                className="p-3.5 rounded-xl bg-black/70 border border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-emerald-400">
                  <span>➔ "Agla step kya karein?"</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Tells you exactly which button to click or which input box to fill next.
                </p>
              </button>

              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("code")}
                className="p-3.5 rounded-xl bg-black/70 border border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-purple-400">
                  <span>💻 "Code / Document samjhao"</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Breaks down open functions, logic, scripts, or technical articles.
                </p>
              </button>

              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("debug")}
                className="p-3.5 rounded-xl bg-black/70 border border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-amber-400">
                  <span>⚠️ "Error check karo aur fix batao"</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Detects compiler errors, red alerts, or broken fields and provides fix steps.
                </p>
              </button>
            </>
          )}

          {activeTab === "analysis" && (
            <>
              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("debug")}
                className="p-3.5 rounded-xl bg-black/70 border border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-amber-400 flex items-center justify-between">
                  <span>⚠️ "Is page mein error kaha hai?"</span>
                  {screenState.isAnalyzing && (
                    <span className="text-[10px] animate-pulse">SEARCHING...</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Spots compilation/runtime errors, red warnings, or form validation issues.
                </p>
              </button>

              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("guide")}
                className="p-3.5 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-[#00E5FF]">
                  💡 "Actionable items aur buttons batao"
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Provides a clean list of clickable buttons and next tasks.
                </p>
              </button>
            </>
          )}

          {activeTab === "read" && (
            <>
              <button
                disabled={screenState.isAnalyzing}
                onClick={handleReadScreen}
                className="p-3.5 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-[#00E5FF] flex items-center justify-between">
                  <span>📖 "Screen par kya likha hai padho"</span>
                  {screenState.isAnalyzing && (
                    <span className="text-[10px] animate-pulse">READING...</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Reads all visible text, headings, open articles, and document contents via OCR.
                </p>
              </button>

              <button
                disabled={screenState.isAnalyzing}
                onClick={() => handleExplainScreen("code")}
                className="p-3.5 rounded-xl bg-black/70 border border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/10 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-xs font-mono font-bold text-purple-400">
                  <span>💻 "Code summary nikaalo"</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-mono mt-1">
                  Extracts and summarizes code snippets and documentation.
                </p>
              </button>
            </>
          )}
        </div>

        {/* Real-time Screen Scroll & Zoom Controller Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/60 border border-[#00E5FF]/20">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF]">
            <span>🖱️ SCREEN SCROLL & VIEWPORT:</span>
            <span className="text-[10px] text-neutral-400">UI Automation & CSS Pan</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => screenService.scroll("up", "small")}
              className="px-2.5 py-1 rounded bg-neutral-900 border border-[#00E5FF]/30 hover:border-[#00E5FF] hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Scroll Up a Little (UI Automation)"
            >
              ▲ Little Up
            </button>
            <button
              type="button"
              onClick={() => screenService.scroll("up", "medium")}
              className="px-2.5 py-1 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/50 hover:bg-[#00E5FF] hover:text-black text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Scroll Up Medium (UI Automation)"
            >
              ▲ Scroll Up
            </button>
            <button
              type="button"
              onClick={() => screenService.scroll("down", "medium")}
              className="px-2.5 py-1 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/50 hover:bg-[#00E5FF] hover:text-black text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Scroll Down Medium (UI Automation)"
            >
              ▼ Scroll Down
            </button>
            <button
              type="button"
              onClick={() => screenService.scroll("down", "large")}
              className="px-2.5 py-1 rounded bg-neutral-900 border border-[#00E5FF]/30 hover:border-[#00E5FF] hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Scroll Down Large / Full Page"
            >
              ▼ Full Page
            </button>
            <div className="h-4 w-px bg-neutral-700 mx-1 hidden sm:block"></div>
            <button
              type="button"
              onClick={() => screenService.setViewerZoom(screenState.zoomLevel + 0.25)}
              className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-[#00E5FF] text-neutral-300 hover:text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Zoom In Shared Screen Viewport"
            >
              🔍 +
            </button>
            <button
              type="button"
              onClick={() => screenService.setViewerZoom(screenState.zoomLevel - 0.25)}
              className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-[#00E5FF] text-neutral-300 hover:text-[#00E5FF] text-[11px] font-mono font-bold transition-all cursor-pointer"
              title="Zoom Out Shared Screen Viewport"
            >
              🔍 -
            </button>
            <button
              type="button"
              onClick={() => screenService.resetViewerScroll()}
              className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-300 text-[10px] font-mono transition-all cursor-pointer"
              title="Reset Viewport Pan & Zoom"
            >
              RESET
            </button>
          </div>
        </div>

        {/* Custom Question Bar */}
        <form onSubmit={handleCustomQuestion} className="relative flex items-center">
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ask anything about your screen (e.g., 'Is form me kya bharna hai?', 'Code me bug kya hai?')..."
            className="w-full py-2.5 pl-4 pr-28 bg-black/80 border border-[#00E5FF]/40 rounded-xl text-xs font-mono text-[#00E5FF] placeholder-neutral-500 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
          />
          <button
            type="submit"
            disabled={!questionText.trim() || screenState.isAnalyzing}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black font-mono font-bold text-xs hover:bg-[#00BFFF] transition-all disabled:opacity-40 cursor-pointer"
          >
            ASK ZOYA
          </button>
        </form>

        {/* Analysis Output Box */}
        {(screenState.liveExplanation || screenState.lastAnalysis) && (
          <div className="rounded-xl border border-[#00E5FF]/30 bg-black/80 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#00E5FF] border-b border-neutral-800 pb-2">
              <span className="font-bold tracking-wider">🎙️ ZOYA GUIDANCE & EXPLANATION OUTPUT</span>
              <span className="text-neutral-500 text-[10px]">
                {screenState.liveExplanationTimestamp || screenState.lastAnalysisTimestamp
                  ? new Date(
                      screenState.liveExplanationTimestamp || screenState.lastAnalysisTimestamp!
                    ).toLocaleTimeString()
                  : ""}
              </span>
            </div>
            <div className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {screenState.liveExplanation || screenState.lastAnalysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

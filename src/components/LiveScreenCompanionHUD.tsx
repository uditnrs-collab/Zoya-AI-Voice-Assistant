import React, { useEffect, useState } from "react";
import { screenService, ScreenState } from "../services/screenService";
import { scrollPage } from "../utils/domInteraction";

interface LiveScreenCompanionHUDProps {
  onOpenModal: () => void;
  onAskZoya: (text: string) => void;
}

export const LiveScreenCompanionHUD: React.FC<LiveScreenCompanionHUDProps> = ({
  onOpenModal,
  onAskZoya,
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

  const [isMinimized, setIsMinimized] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = screenService.subscribe((st) => {
      setScreenState(st);
      if (st.isSharing) {
        const frame = screenService.captureCurrentFrame();
        if (frame) setCurrentFrame(frame);
      } else {
        setCurrentFrame(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Periodic preview updater
  useEffect(() => {
    if (!screenState.isSharing) return;
    const timer = setInterval(() => {
      const frame = screenService.captureCurrentFrame();
      if (frame) setCurrentFrame(frame);
    }, 2000);
    return () => clearInterval(timer);
  }, [screenState.isSharing]);

  if (!screenState.isSharing && !screenState.isLiveCompanion) {
    return null;
  }

  const handleExplainNow = async () => {
    const res = await screenService.explainLiveScreen("explain");
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleDebugNow = async () => {
    const res = await screenService.explainLiveScreen("debug");
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleGuideNow = async () => {
    const res = await screenService.explainLiveScreen("guide");
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`fixed bottom-20 left-4 z-40 transition-all duration-300 pointer-events-auto ${
        isMinimized ? "w-64" : "w-80 sm:w-96"
      }`}
    >
      <div className="relative rounded-2xl bg-neutral-950/95 border border-[#00E5FF]/40 p-3.5 shadow-[0_0_30px_rgba(0,229,255,0.3)] backdrop-blur-xl flex flex-col gap-2.5">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#00E5FF]/20 pb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E5FF]"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#00E5FF] uppercase">
              ZOYA LIVE SCREEN COMPANION
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-neutral-400 hover:text-white text-xs font-mono cursor-pointer"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? "▲" : "▼"}
            </button>
            <button
              onClick={onOpenModal}
              className="p-1 rounded text-neutral-400 hover:text-[#00E5FF] text-xs font-mono cursor-pointer"
              title="Open Full Screen Vision Center"
            >
              ⤢
            </button>
            <button
              onClick={() => screenService.stopScreenSharing()}
              className="p-1 rounded text-neutral-400 hover:text-rose-400 text-xs font-mono cursor-pointer"
              title="Stop Screen Sharing"
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Live Mini Preview */}
            {currentFrame && (
              <div
                onClick={onOpenModal}
                className="relative rounded-lg overflow-hidden border border-[#00E5FF]/30 aspect-video bg-black max-h-32 flex items-center justify-center cursor-pointer group"
                title="Click to expand"
              >
                <img
                  src={currentFrame}
                  alt="Live Screen"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[11px] font-mono text-[#00E5FF] font-bold">
                  CLICK TO EXPAND
                </div>
                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-emerald-400 border border-emerald-500/40">
                  LIVE STREAM
                </div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                disabled={screenState.isAnalyzing}
                onClick={handleExplainNow}
                className="px-2 py-1.5 rounded-lg bg-[#00E5FF]/15 border border-[#00E5FF]/40 hover:bg-[#00E5FF] hover:text-black text-[#00E5FF] text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                title="Screen par kya hai samjhao"
              >
                💡 EXPLAIN
              </button>
              <button
                disabled={screenState.isAnalyzing}
                onClick={handleDebugNow}
                className="px-2 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-400 text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                title="Error dhundho aur theek karo"
              >
                🐞 DEBUG
              </button>
              <button
                disabled={screenState.isAnalyzing}
                onClick={handleGuideNow}
                className="px-2 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-400 text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                title="Agla step kya karein guide karo"
              >
                ➔ NEXT STEP
              </button>
            </div>

            {/* Quick Scroll Bar */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => screenService.scroll("up", "medium")}
                className="px-2 py-1 rounded bg-neutral-900 border border-[#00E5FF]/30 hover:border-[#00E5FF] hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Scroll Screen Up"
              >
                <span>▲</span>
                <span>SCROLL UP</span>
              </button>
              <button
                onClick={() => screenService.scroll("down", "medium")}
                className="px-2 py-1 rounded bg-neutral-900 border border-[#00E5FF]/30 hover:border-[#00E5FF] hover:bg-[#00E5FF]/20 text-[#00E5FF] text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Scroll Screen Down"
              >
                <span>▼</span>
                <span>SCROLL DOWN</span>
              </button>
            </div>

            {/* Subtitle / Latest Guidance Box */}
            {screenState.liveExplanation || screenState.lastAnalysis ? (
              <div className="rounded-lg bg-black/80 border border-neutral-800 p-2 text-[11px] font-mono text-neutral-300 max-h-24 overflow-y-auto leading-relaxed">
                <div className="text-[9px] text-[#00E5FF] font-bold mb-1 flex items-center justify-between">
                  <span>🎙️ ZOYA LIVE GUIDANCE:</span>
                  {screenState.isAnalyzing && (
                    <span className="text-amber-400 animate-pulse">ANALYZING...</span>
                  )}
                </div>
                {screenState.liveExplanation || screenState.lastAnalysis}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-neutral-500 text-center py-1">
                Say <span className="text-[#00E5FF]">"Zoya screen samjhao"</span> or click EXPLAIN.
              </div>
            )}

            {/* Auto Companion & Voice Toggles */}
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-900">
              <label className="flex items-center gap-1.5 cursor-pointer">
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
                  className="rounded accent-[#00E5FF] cursor-pointer"
                />
                <span>Auto-Watch (12s)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenState.autoVoice}
                  onChange={(e) => screenService.setAutoVoice(e.target.checked)}
                  className="rounded accent-[#00E5FF] cursor-pointer"
                />
                <span>🔊 Voice Out</span>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

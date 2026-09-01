import React, { useEffect, useState, useRef } from "react";
import { cameraService, CameraState } from "../services/cameraService";

interface CameraVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskZoya: (text: string) => void;
}

export const CameraVisionModal: React.FC<CameraVisionModalProps> = ({
  isOpen,
  onClose,
  onAskZoya,
}) => {
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isAnalyzing: false,
    facingMode: "user",
    lastAnalysis: null,
    lastAnalysisTimestamp: null,
    error: null,
    hasPermission: false,
  });

  const [questionText, setQuestionText] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const unsubscribe = cameraService.subscribe((st) => {
      setCameraState(st);
      if (st.isActive && videoRef.current) {
        const stream = cameraService.getMediaStream();
        if (stream && videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && !cameraService.isCameraActive()) {
      cameraService.startCamera();
    }
  }, [isOpen]);

  const handleStartCamera = async () => {
    await cameraService.startCamera();
  };

  const handleStopCamera = () => {
    cameraService.stopCamera();
  };

  const handleFlipCamera = async () => {
    await cameraService.toggleCameraFacing();
  };

  const handleAnalyzeCamera = async (customPrompt?: string) => {
    const prompt =
      customPrompt ||
      "Identify and describe all visible objects, people, products, text, signs, or surroundings in this live camera frame clearly and concisely in Zoya's tone.";
    const res = await cameraService.analyzeCurrentView(prompt);
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleReadTextInCamera = async () => {
    const prompt =
      "Extract and read out all readable text, signs, book pages, product labels, or documents clearly visible in this camera view (OCR).";
    await handleAnalyzeCamera(prompt);
  };

  const handleCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    handleAnalyzeCamera(questionText.trim());
    setQuestionText("");
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-neutral-950/95 border border-[#00E5FF]/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,229,255,0.25)] text-neutral-200 font-sans max-h-[90vh] overflow-y-auto flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00E5FF]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF] text-lg shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              📷
            </div>
            <div>
              <h2 className="text-base font-mono font-bold tracking-wider text-white flex items-center gap-2">
                ZOYA LIVE CAMERA VISION
                {cameraState.isActive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-500/50 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    CAMERA FEED ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Live Environment Identification • Object Detection • Visual Reading
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

        {/* Live Camera Viewport */}
        <div className="relative rounded-xl overflow-hidden border border-[#00E5FF]/30 bg-black aspect-video max-h-72 flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              cameraState.facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
          />

          {!cameraState.isActive && (
            <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <span className="text-3xl">📷</span>
              <p className="text-xs font-mono text-neutral-400">
                Camera is currently stopped. Click below to activate live camera understanding.
              </p>
              <button
                onClick={handleStartCamera}
                className="px-4 py-2 rounded-lg bg-[#00E5FF] hover:bg-[#00BFFF] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)] cursor-pointer"
              >
                START CAMERA
              </button>
            </div>
          )}

          {/* Camera Overlay HUD Badges */}
          {cameraState.isActive && (
            <>
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 border border-[#00E5FF]/40 text-[10px] font-mono text-[#00E5FF] backdrop-blur-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE ({cameraState.facingMode.toUpperCase()} CAM)
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={handleFlipCamera}
                  title="Flip Camera (Front/Back)"
                  className="px-2.5 py-1 rounded-md bg-black/70 border border-[#00E5FF]/40 text-[10px] font-mono text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black transition-all cursor-pointer backdrop-blur-md"
                >
                  🔄 FLIP CAM
                </button>
                <button
                  onClick={handleStopCamera}
                  title="Stop Camera"
                  className="px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/50 text-[10px] font-mono text-rose-300 hover:bg-rose-900 transition-all cursor-pointer backdrop-blur-md"
                >
                  🛑 STOP
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick Action Commands */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            disabled={cameraState.isAnalyzing}
            onClick={() => handleAnalyzeCamera()}
            className="p-3 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="text-xs font-mono font-bold text-[#00E5FF] flex items-center justify-between">
              <span>🔍 "Zoya, camera mein kya dikh raha hai?"</span>
              {cameraState.isAnalyzing && <span className="text-[10px] animate-pulse">ANALYZING...</span>}
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">
              Describes everything in view: surroundings, objects, people, products.
            </p>
          </button>

          <button
            disabled={cameraState.isAnalyzing}
            onClick={handleReadTextInCamera}
            className="p-3 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="text-xs font-mono font-bold text-[#00E5FF]">
              📄 "Jo saamne likha hai woh padho"
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-1">
              Transcribes any documents, labels, signs, or written text in view.
            </p>
          </button>
        </div>

        {/* Custom Ask Bar */}
        <form onSubmit={handleCustomQuestion} className="relative flex items-center">
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Ask about what's in front of camera (e.g. 'Is object ka brand kya hai?', 'Yeh kaunsa fruit hai?')..."
            className="w-full py-2.5 pl-4 pr-24 bg-black/80 border border-[#00E5FF]/40 rounded-xl text-xs font-mono text-[#00E5FF] placeholder-neutral-500 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
          />
          <button
            type="submit"
            disabled={!questionText.trim() || cameraState.isAnalyzing}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black font-mono font-bold text-xs hover:bg-[#00BFFF] transition-all disabled:opacity-40 cursor-pointer"
          >
            ASK ZOYA
          </button>
        </form>

        {/* Analysis Output Box */}
        {cameraState.lastAnalysis && (
          <div className="rounded-xl border border-[#00E5FF]/30 bg-black/80 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#00E5FF] border-b border-neutral-800 pb-2">
              <span className="font-bold tracking-wider">🎙️ ZOYA CAMERA ANALYSIS</span>
              <span className="text-neutral-500 text-[10px]">
                {cameraState.lastAnalysisTimestamp
                  ? new Date(cameraState.lastAnalysisTimestamp).toLocaleTimeString()
                  : ""}
              </span>
            </div>
            <div className="text-xs font-mono text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">
              {cameraState.lastAnalysis}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

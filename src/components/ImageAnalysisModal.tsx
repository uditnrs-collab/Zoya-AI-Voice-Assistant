import React, { useEffect, useState, useRef } from "react";
import { imageAnalysisService, ImageAnalysisState } from "../services/imageAnalysisService";

interface ImageAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskZoya: (text: string) => void;
}

export const ImageAnalysisModal: React.FC<ImageAnalysisModalProps> = ({
  isOpen,
  onClose,
  onAskZoya,
}) => {
  const [imgState, setImgState] = useState<ImageAnalysisState>({
    currentImageDataUrl: null,
    fileName: null,
    fileSize: null,
    isAnalyzing: false,
    ocrText: null,
    latestSummary: null,
    qaHistory: [],
    error: null,
  });

  const [questionText, setQuestionText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = imageAnalysisService.subscribe((st) => {
      setImgState(st);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const res = await imageAnalysisService.loadImageFromFile(file);
      if (res.message) {
        onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const res = await imageAnalysisService.loadImageFromFile(file);
      if (res.message) {
        onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
      }
    }
  };

  const handleExtractOCR = async () => {
    const res = await imageAnalysisService.extractOCRText();
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleAnalyzeImage = async (customQ?: string) => {
    const q = customQ || "Is image ko deeply analyze karo, iske objects, structure, context aur visual meaning ko explain karo.";
    const res = await imageAnalysisService.analyzeImage(q);
    if (res.text) {
      onAskZoya(`ZOYA_VOICE_OUT: ${res.text}`);
    }
  };

  const handleCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    handleAnalyzeImage(questionText.trim());
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
              🖼️
            </div>
            <div>
              <h2 className="text-base font-mono font-bold tracking-wider text-white flex items-center gap-2">
                ZOYA IMAGE ANALYSIS & OCR
                {imgState.currentImageDataUrl && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 border border-emerald-500/50 text-emerald-400">
                    IMAGE LOADED
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Multimodal Image Understanding • Document & Screenshot OCR • Visual Q&A
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

        {/* Upload Dropzone / Image Preview */}
        {!imgState.currentImageDataUrl ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-[#00E5FF]/40 hover:border-[#00E5FF] bg-black/50 p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-[#00E5FF]/5"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/40 flex items-center justify-center text-2xl text-[#00E5FF]">
              📁
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                DRAG & DROP IMAGE HERE OR CLICK TO BROWSE
              </p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">
                Supported formats: JPG, PNG, WEBP (Maximum size: 10MB)
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg bg-[#00E5FF] hover:bg-[#00BFFF] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] pointer-events-none"
            >
              CHOOSE IMAGE FILE
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#00E5FF]/30 bg-black/60 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-300 truncate max-w-[250px]">
                📄 {imgState.fileName || "Uploaded Image"} (
                {imgState.fileSize ? `${Math.round(imgState.fileSize / 1024)} KB` : ""})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-black/80 border border-[#00E5FF]/40 text-[#00E5FF] text-[10px] font-mono hover:bg-[#00E5FF] hover:text-black transition-all cursor-pointer"
                >
                  CHANGE IMAGE
                </button>
                <button
                  onClick={() => imageAnalysisService.clearImage()}
                  className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-mono hover:bg-rose-900 transition-all cursor-pointer"
                >
                  REMOVE
                </button>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-black/80 max-h-56 flex items-center justify-center">
              <img
                src={imgState.currentImageDataUrl}
                alt="Uploaded for analysis"
                className="max-h-56 w-auto object-contain"
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {imgState.error && (
          <div className="px-3.5 py-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono">
            ⚠️ {imgState.error}
          </div>
        )}

        {/* Quick Action Commands */}
        {imgState.currentImageDataUrl && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              disabled={imgState.isAnalyzing}
              onClick={() => handleAnalyzeImage()}
              className="p-3 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="text-xs font-mono font-bold text-[#00E5FF] flex items-center justify-between">
                <span>🔍 "Zoya, is image mein kya hai?"</span>
                {imgState.isAnalyzing && <span className="text-[10px] animate-pulse">ANALYZING...</span>}
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">
                Explains visual objects, scenes, diagrams, screenshots, or charts.
              </p>
            </button>

            <button
              disabled={imgState.isAnalyzing}
              onClick={handleExtractOCR}
              className="p-3 rounded-xl bg-black/70 border border-[#00E5FF]/40 hover:border-[#00E5FF] hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="text-xs font-mono font-bold text-[#00E5FF]">
                📄 "Is photo mein jo text hai woh padho"
              </div>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">
                Extracts and transcribes all OCR text from receipts, documents, or UI.
              </p>
            </button>
          </div>
        )}

        {/* Q&A Follow-up Bar */}
        {imgState.currentImageDataUrl && (
          <form onSubmit={handleCustomQuestion} className="relative flex items-center">
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask follow-up question (e.g. 'Is screenshot ki problem batao', 'Yeh chart kya show karta hai?')..."
              className="w-full py-2.5 pl-4 pr-24 bg-black/80 border border-[#00E5FF]/40 rounded-xl text-xs font-mono text-[#00E5FF] placeholder-neutral-500 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
            />
            <button
              type="submit"
              disabled={!questionText.trim() || imgState.isAnalyzing}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black font-mono font-bold text-xs hover:bg-[#00BFFF] transition-all disabled:opacity-40 cursor-pointer"
            >
              ASK ZOYA
            </button>
          </form>
        )}

        {/* Q&A History Box */}
        {imgState.qaHistory.length > 0 && (
          <div className="rounded-xl border border-[#00E5FF]/30 bg-black/80 p-4 flex flex-col gap-3 max-h-56 overflow-y-auto">
            <div className="text-xs font-mono font-bold text-[#00E5FF] border-b border-neutral-800 pb-2 flex items-center justify-between">
              <span>🎙️ IMAGE Q&A HISTORY</span>
              <span className="text-neutral-500 text-[10px]">{imgState.qaHistory.length} MESSAGES</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {imgState.qaHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg text-xs font-mono ${
                    item.role === "user"
                      ? "bg-neutral-900 border border-neutral-800 text-neutral-300 self-end max-w-[85%]"
                      : "bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-neutral-100 self-start max-w-[95%] whitespace-pre-wrap"
                  }`}
                >
                  <span className="text-[10px] block font-bold text-[#00E5FF] mb-1">
                    {item.role === "user" ? "YOU" : "ZOYA"}
                  </span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

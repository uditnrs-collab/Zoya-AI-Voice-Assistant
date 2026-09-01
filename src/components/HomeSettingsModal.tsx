import React, { useState, useEffect } from "react";
import { getZoyaHomeUrl, setZoyaHomeUrl } from "../services/commandService";

interface HomeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHomeUrlUpdated?: (newUrl: string) => void;
}

export default function HomeSettingsModal({ isOpen, onClose, onHomeUrlUpdated }: HomeSettingsModalProps) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getZoyaHomeUrl();
      setCurrentUrl(saved);
      setInputUrl(saved);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    const updated = setZoyaHomeUrl(inputUrl.trim());
    setCurrentUrl(updated);
    setInputUrl(updated);
    setSavedSuccess(true);
    if (onHomeUrlUpdated) {
      onHomeUrlUpdated(updated);
    }

    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleResetToDefault = () => {
    const defaultUrl = window.location.origin;
    const updated = setZoyaHomeUrl(defaultUrl);
    setCurrentUrl(updated);
    setInputUrl(updated);
    setSavedSuccess(true);
    if (onHomeUrlUpdated) {
      onHomeUrlUpdated(updated);
    }

    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg p-6 bg-black/90 border border-[#00E5FF]/60 rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.3)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#00E5FF]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF] flex items-center justify-center text-[#00E5FF] font-mono text-sm font-bold shadow-[0_0_10px_#00E5FF]">
              🏠
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-[#00E5FF] tracking-wider uppercase">
                ZOYA Home Page Memory
              </h2>
              <p className="text-xs text-gray-400 font-sans">
                Configure ZOYA's permanent home page destination
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#00E5FF] transition-colors p-1 text-xl font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-xs text-cyan-200 leading-relaxed font-sans">
            <strong>Voice Command Memory:</strong> When you tell ZOYA <span className="text-[#00E5FF] font-semibold">"ZOYA, apne page pe wapas aa jao"</span>, she will immediately return to this saved Home Page.
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                ZOYA_HOME_URL
              </label>
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-zoya-home-page.com"
                className="w-full px-4 py-3 bg-black/90 border border-[#00E5FF]/40 rounded-xl text-xs font-mono text-[#00E5FF] placeholder-[#00E5FF]/30 focus:outline-none focus:border-[#00E5FF] focus:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all"
              />
            </div>

            {savedSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <span>✓</span> ZOYA_HOME_URL saved persistently!
              </div>
            )}

            {/* Current Active Badge */}
            <div className="text-xs font-mono text-gray-400 flex items-center justify-between pt-1">
              <span>Active URL:</span>
              <span className="text-[#00E5FF] truncate max-w-[280px]" title={currentUrl}>
                {currentUrl}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#00E5FF] text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#00E5FF]/80 transition-all shadow-[0_0_15px_rgba(0,229,255,0.4)] cursor-pointer"
              >
                Save Home Page
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="py-2.5 px-3.5 rounded-xl bg-gray-800 border border-gray-600 text-gray-300 font-mono text-xs font-bold hover:bg-gray-700 transition-all cursor-pointer"
                title="Reset to current app URL"
              >
                Reset Default
              </button>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-gray-800 text-[11px] font-mono text-gray-500 text-center">
          Persistent across app restarts • Stored in local app memory
        </div>
      </div>
    </div>
  );
}

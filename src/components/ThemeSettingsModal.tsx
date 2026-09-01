import React from "react";
import { 
  ZoyaThemeColor, 
  ZOYA_THEME_COLORS, 
  COLOR_OPTIONS_LIST, 
  DEFAULT_THEME_COLOR,
  DEFAULT_GLOW_INTENSITY 
} from "../utils/themeConfig";

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: ZoyaThemeColor;
  onColorChange: (color: ZoyaThemeColor) => void;
  glowIntensity: number; // 0 to 100
  onGlowChange: (intensity: number) => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  currentColor,
  onColorChange,
  glowIntensity,
  onGlowChange,
}) => {
  if (!isOpen) return null;

  const currentTheme = ZOYA_THEME_COLORS[currentColor] || ZOYA_THEME_COLORS[DEFAULT_THEME_COLOR];
  const primaryColor = currentTheme.primary;
  const glowRgb = currentTheme.glowRgb;

  const getGlowDescription = (val: number) => {
    if (val <= 5) return "0% • Minimal / Off";
    if (val <= 35) return `${val}% • Low Glow`;
    if (val <= 65) return `${val}% • Medium Glow`;
    if (val <= 85) return `${val}% • Strong Glow`;
    return `${val}% • Maximum Glow`;
  };

  const handleResetGlow = () => {
    onGlowChange(DEFAULT_GLOW_INTENSITY);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-2xl bg-black/90 border p-5 shadow-2xl transition-all duration-300 pointer-events-auto"
        style={{
          borderColor: `rgba(${glowRgb}, 0.5)`,
          boxShadow: `0 0 ${Math.round(25 * (glowIntensity / 100))}px rgba(${glowRgb}, ${0.15 + (glowIntensity / 100) * 0.35})`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎨</span>
            <h3 
              className="text-sm font-mono font-bold tracking-widest uppercase"
              style={{ color: primaryColor }}
            >
              ZOYA THEME & GLOW
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors text-xs font-mono px-2"
          >
            ✕
          </button>
        </div>

        {/* 1. COLOR SELECTION SECTION */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-mono tracking-wider text-neutral-300 uppercase font-semibold">
              Select Color ({currentTheme.name})
            </label>
            <span 
              className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase"
              style={{ 
                backgroundColor: `rgba(${glowRgb}, 0.15)`,
                color: primaryColor,
                border: `1px solid rgba(${glowRgb}, 0.4)`
              }}
            >
              1 Active
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {COLOR_OPTIONS_LIST.map((colorKey) => {
              const theme = ZOYA_THEME_COLORS[colorKey];
              const isSelected = currentColor === colorKey;
              return (
                <button
                  key={colorKey}
                  onClick={() => onColorChange(colorKey)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? "bg-neutral-900 shadow-md" 
                      : "bg-black/60 hover:bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200"
                  }`}
                  style={isSelected ? {
                    borderColor: theme.primary,
                    color: theme.primary,
                    boxShadow: `0 0 12px rgba(${theme.glowRgb}, 0.4)`
                  } : undefined}
                >
                  <span 
                    className="w-3.5 h-3.5 rounded-full shrink-0 transition-transform duration-200 shadow-inner"
                    style={{
                      backgroundColor: theme.primary,
                      boxShadow: isSelected ? `0 0 8px ${theme.primary}` : undefined,
                      transform: isSelected ? "scale(1.2)" : "scale(1)"
                    }}
                  />
                  <span className="truncate">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. ADJUSTABLE GLOW SLIDER SECTION */}
        <div className="mt-5 pt-4 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-mono tracking-wider text-neutral-300 uppercase font-semibold flex items-center gap-1.5">
              <span>✨</span>
              <span>Glow Intensity</span>
            </label>
            <span 
              className="text-[10px] font-mono font-bold"
              style={{ color: primaryColor }}
            >
              {getGlowDescription(glowIntensity)}
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={glowIntensity}
                onChange={(e) => onGlowChange(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-current focus:outline-none"
                style={{
                  accentColor: primaryColor,
                }}
              />
            </div>

            {/* Scale Marks */}
            <div className="flex justify-between text-[9px] font-mono text-neutral-500 px-0.5">
              <span className={glowIntensity <= 10 ? "text-white font-bold" : ""}>0%</span>
              <span className={glowIntensity >= 20 && glowIntensity <= 30 ? "text-white font-bold" : ""}>25%</span>
              <span className={glowIntensity >= 45 && glowIntensity <= 55 ? "text-white font-bold" : ""}>50%</span>
              <span className={glowIntensity >= 70 && glowIntensity <= 80 ? "text-white font-bold" : ""}>75%</span>
              <span className={glowIntensity >= 95 ? "text-white font-bold" : ""}>100%</span>
            </div>
          </div>

          {/* Quick Glow Presets & Reset Button */}
          <div className="flex items-center justify-between mt-3 pt-2">
            <div className="flex items-center gap-1">
              {[0, 25, 50, 75, 100].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onGlowChange(preset)}
                  className={`px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                    glowIntensity === preset
                      ? "bg-neutral-800 border-neutral-600 text-white font-bold"
                      : "bg-black/40 border-neutral-800/80 text-neutral-500 hover:text-neutral-300"
                  }`}
                  style={glowIntensity === preset ? { borderColor: primaryColor, color: primaryColor } : undefined}
                >
                  {preset}%
                </button>
              ))}
            </div>

            <button
              onClick={handleResetGlow}
              className="text-[10px] font-mono text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
              title="Reset Glow to Default (75%)"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-neutral-800/60 text-center">
          <p className="text-[10px] font-mono text-neutral-500">
            Changes are saved automatically
          </p>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { ZoyaThemeColor, ZOYA_THEME_COLORS, DEFAULT_THEME_COLOR, DEFAULT_GLOW_INTENSITY } from "../utils/themeConfig";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

export interface HudToast {
  type: "volume" | "brightness" | "action";
  title: string;
  value?: number;
  url?: string;
}

interface VisualizerProps {
  state?: VisualizerState;
  isActive?: boolean;
  onClick?: () => void;
  toast?: HudToast | null;
  onTextCommand?: (cmd: string) => void;
  onOpenHomeSettings?: () => void;
  onOpenFaceSecurity?: () => void;
  onOpenContacts?: () => void;
  onOpenGitaPuran?: () => void;
  onOpenScreenVision?: () => void;
  onOpenCameraVision?: () => void;
  onOpenImageAnalysis?: () => void;
  onOpenSpotify?: () => void;
  onOpenThemeSettings?: () => void;
  onOpenCalendar?: () => void;
  themeColor?: ZoyaThemeColor;
  glowIntensity?: number; // 0 to 100
  onToggleBackgroundService?: () => void;
  isBackgroundServiceRunning?: boolean;
}

export default function Visualizer({ 
  state = "idle", 
  isActive = false, 
  onClick, 
  toast, 
  onTextCommand, 
  onOpenHomeSettings, 
  onOpenFaceSecurity, 
  onOpenContacts, 
  onOpenGitaPuran,
  onOpenScreenVision,
  onOpenCameraVision,
  onOpenImageAnalysis,
  onOpenSpotify,
  onOpenThemeSettings,
  onOpenCalendar,
  themeColor = DEFAULT_THEME_COLOR,
  glowIntensity = DEFAULT_GLOW_INTENSITY,
  onToggleBackgroundService,
  isBackgroundServiceRunning = false,
}: VisualizerProps) {
  const [inputText, setInputText] = React.useState("");

  const activeTheme = ZOYA_THEME_COLORS[themeColor] || ZOYA_THEME_COLORS[DEFAULT_THEME_COLOR];
  const primaryColor = activeTheme.primary;
  const secondaryColor = activeTheme.secondary;
  const bgCoreColor = activeTheme.bgCore;
  const glowRgb = activeTheme.glowRgb;

  // Glow factor: 0.0 (minimal/off) to 1.0 (max)
  const glowFactor = Math.max(0, Math.min(100, glowIntensity)) / 100;
  const smallBlur = (4 * glowFactor).toFixed(1);
  const largeBlur1 = (10 * glowFactor).toFixed(1);
  const largeBlur2 = (4 * glowFactor).toFixed(1);
  const dropShadowSpread = (12 * glowFactor).toFixed(1);
  const dropShadowAlpha = (0.45 * glowFactor).toFixed(2);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inputText.trim()) return;
    if (onTextCommand) {
      onTextCommand(inputText.trim());
      setInputText("");
    }
  };
  // Number of tick marks around the radar scale ring
  const radarTicks = Array.from({ length: 72 });

  // Generate particles along orbiting paths
  const innerParticles = [0, 90, 180, 270];
  const midParticles = [45, 135, 225, 315];
  const outerParticles = [30, 110, 190, 270, 340];

  return (
    <div 
      onClick={onClick}
      className="relative w-full h-full min-h-[100dvh] bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
    >
      {/* Top Header Controls Bar */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto flex-wrap justify-end max-w-[95vw]"
      >
        {onOpenCalendar && (
          <button
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.5)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Intelligent Calendar & Date Planner"
          >
            <span>📅</span>
            <span className="hidden sm:inline uppercase">Calendar</span>
          </button>
        )}
        {onOpenThemeSettings && (
          <button
            onClick={onOpenThemeSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.5)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Theme Color & Glow Customization"
          >
            <span>🎨</span>
            <span className="hidden sm:inline uppercase">Theme</span>
          </button>
        )}
        {onOpenScreenVision && (
          <button
            onClick={onOpenScreenVision}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Screen Reading & UI Error Analysis (Gemini Vision)"
          >
            <span>🖥️</span>
            <span className="hidden sm:inline uppercase">Screen</span>
          </button>
        )}
        {onOpenCameraVision && (
          <button
            onClick={onOpenCameraVision}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Live Camera Analysis & Object Detection"
          >
            <span>📷</span>
            <span className="hidden sm:inline uppercase">Camera</span>
          </button>
        )}
        {onOpenImageAnalysis && (
          <button
            onClick={onOpenImageAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Image Analysis & OCR"
          >
            <span>🖼️</span>
            <span className="hidden sm:inline uppercase">Image OCR</span>
          </button>
        )}
        {onOpenSpotify && (
          <button
            onClick={onOpenSpotify}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-[#1DB954]/50 text-[#1DB954] text-xs font-mono font-bold tracking-wider hover:bg-[#1DB954] hover:text-black transition-all shadow-[0_0_12px_rgba(29,185,84,0.3)] backdrop-blur-md cursor-pointer"
            title="ZOYA Spotify Voice Control & Playback"
          >
            <span>🎵</span>
            <span className="hidden sm:inline uppercase">Spotify</span>
          </button>
        )}
        {onToggleBackgroundService && (
          <button
            onClick={onToggleBackgroundService}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer ${
              isBackgroundServiceRunning
                ? "bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                : "bg-black/80 border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            }`}
            title={
              isBackgroundServiceRunning
                ? "ZOYA Android Foreground Service is ACTIVE ('ZOYA is active' notification running)"
                : "Start ZOYA Android Foreground Service"
            }
          >
            <span className={`inline-block w-2 h-2 rounded-full ${isBackgroundServiceRunning ? "bg-emerald-400 animate-ping" : "bg-neutral-600"}`} />
            <span className="uppercase">{isBackgroundServiceRunning ? "BG Active" : "BG Service"}</span>
          </button>
        )}
        {onOpenGitaPuran && (
          <button
            onClick={onOpenGitaPuran}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border border-amber-500/50 text-amber-400 text-xs font-mono font-bold tracking-wider hover:bg-amber-500 hover:text-black transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] backdrop-blur-md cursor-pointer"
            title="ZOYA — श्रीमद्भगवद्गीता एवं 18 महापुराण ज्ञान"
          >
            <span>ॐ</span>
            <span className="hidden sm:inline uppercase">गीता & पुराण</span>
          </button>
        )}
        {onOpenContacts && (
          <button
            onClick={onOpenContacts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Contacts & Voice Call Control"
          >
            <span>📞</span>
            <span className="hidden sm:inline uppercase">Calls</span>
          </button>
        )}
        {onOpenFaceSecurity && (
          <button
            onClick={onOpenFaceSecurity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="ZOYA Face Security & Verification (Owner Udit)"
          >
            <span>👁️</span>
            <span className="hidden sm:inline uppercase">Face</span>
          </button>
        )}
        {onOpenHomeSettings && (
          <button
            onClick={onOpenHomeSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 border text-xs font-mono font-bold tracking-wider transition-all backdrop-blur-md cursor-pointer hover:bg-white hover:text-black"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
            }}
            title="Configure ZOYA Permanent Home Page"
          >
            <span>🏠</span>
            <span className="hidden sm:inline uppercase">Home</span>
          </button>
        )}
      </div>
      {/* HUD Toast Overlay */}
      {toast && (
        <div 
          className="absolute top-8 z-50 flex flex-col items-center justify-center px-6 py-3.5 rounded-xl bg-black/85 border backdrop-blur-md transition-all duration-300"
          style={{
            borderColor: `rgba(${glowRgb}, 0.6)`,
            boxShadow: `0 0 ${Math.round(30 * glowFactor)}px rgba(${glowRgb}, ${0.4 * glowFactor})`
          }}
        >
          <div 
            className="font-mono text-xs tracking-[0.25em] font-bold uppercase flex items-center gap-2"
            style={{ color: primaryColor }}
          >
            <span 
              className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" 
              style={{ backgroundColor: primaryColor }}
            />
            {toast.title}
          </div>
          
          {typeof toast.value === "number" && (
            <div className="flex items-center gap-1.5 mt-2">
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = i * 10 < toast.value!;
                return (
                  <div
                    key={i}
                    className="w-3.5 h-2 rounded-sm transition-all duration-200"
                    style={filled ? {
                      backgroundColor: primaryColor,
                      boxShadow: `0 0 ${Math.round(8 * glowFactor)}px ${primaryColor}`
                    } : {
                      backgroundColor: `rgba(${glowRgb}, 0.15)`,
                      opacity: 0.35
                    }}
                  />
                );
              })}
            </div>
          )}

          {toast.url && (
            <a
              href={toast.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 pointer-events-auto cursor-pointer"
              style={{
                backgroundColor: `rgba(${glowRgb}, 0.2)`,
                border: `1px solid ${primaryColor}`,
                color: primaryColor,
                boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.4 * glowFactor})`
              }}
            >
              <span>🚀 Click Here to Open</span>
            </a>
          )}
        </div>
      )}

      {/* Background Subtle Radial Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, rgba(${glowRgb}, ${0.09 * glowFactor}) 0%, rgba(${glowRgb}, ${0.03 * glowFactor}) 40%, rgba(0, 0, 0, 1) 75%)`
        }}
      />

      {/* SVG Futuristic HUD Container */}
      <div className="relative w-[85vw] h-[85vw] max-w-[650px] max-h-[650px] aspect-square flex items-center justify-center">
        
        {/* Breathing Ambient Backglow */}
        <div 
          className="absolute w-[45%] h-[45%] rounded-full blur-[60px] pointer-events-none transition-all duration-700"
          style={{
            background: isActive || state === "listening" || state === "speaking"
              ? `radial-gradient(circle, rgba(${glowRgb}, ${0.45 * glowFactor}) 0%, rgba(${glowRgb}, ${0.15 * glowFactor}) 60%, transparent 100%)`
              : `radial-gradient(circle, rgba(${glowRgb}, ${0.25 * glowFactor}) 0%, rgba(${glowRgb}, ${0.08 * glowFactor}) 60%, transparent 100%)`,
            animation: "hudPulse 4s ease-in-out infinite alternate"
          }}
        />

        <svg
          viewBox="0 0 800 800"
          className="w-full h-full overflow-visible"
          style={{ filter: `drop-shadow(0 0 ${dropShadowSpread}px rgba(${glowRgb}, ${dropShadowAlpha}))` }}
        >
          <defs>
            {/* Linear and Radial Gradients */}
            <radialGradient id="coreBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={bgCoreColor} />
              <stop offset="70%" stopColor="#000000" />
              <stop offset="100%" stopColor="#000000" />
            </radialGradient>

            <linearGradient id="neonThemeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={primaryColor} />
              <stop offset="100%" stopColor={secondaryColor} />
            </linearGradient>

            {/* Neon Glow Filters - Intensity Driven */}
            <filter id="neonGlowSmall" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={smallBlur} result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <filter id="neonGlowLarge" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation={largeBlur1} result="coloredBlur1"/>
              <feGaussianBlur stdDeviation={largeBlur2} result="coloredBlur2"/>
              <feMerge>
                <feMergeNode in="coloredBlur1"/>
                <feMergeNode in="coloredBlur2"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* =================================================== */}
          {/* LAYER 7: FAR OUTER GUIDELINE RING (Slow CW) */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 75s linear infinite" }}>
            <circle
              cx="400"
              cy="400"
              r="340"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="1"
              strokeDasharray="4 16"
              opacity="0.3"
            />
            <circle
              cx="400"
              cy="400"
              r="340"
              fill="none"
              stroke={primaryColor}
              strokeWidth="2"
              strokeDasharray="120 180"
              opacity="0.5"
            />
          </g>

          {/* =================================================== */}
          {/* LAYER 6: OUTER SEGMENTED ARCS (CCW Rotation) */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCCW 45s linear infinite" }}>
            {/* Arc 1 */}
            <path
              d="M 400,110 A 290,290 0 0,1 651,255"
              fill="none"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#neonGlowSmall)"
              opacity="0.85"
            />
            {/* Arc 2 */}
            <path
              d="M 651,545 A 290,290 0 0,1 400,690"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#neonGlowSmall)"
              opacity="0.85"
            />
            {/* Arc 3 */}
            <path
              d="M 149,545 A 290,290 0 0,1 149,255"
              fill="none"
              stroke={primaryColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#neonGlowSmall)"
              opacity="0.85"
            />
            {/* Terminal Dots for Arc Segments */}
            <circle cx="400" cy="110" r="3" fill={primaryColor} filter="url(#neonGlowSmall)" />
            <circle cx="651" cy="255" r="3" fill={primaryColor} filter="url(#neonGlowSmall)" />
            <circle cx="651" cy="545" r="3" fill={secondaryColor} filter="url(#neonGlowSmall)" />
            <circle cx="400" cy="690" r="3" fill={secondaryColor} filter="url(#neonGlowSmall)" />
            <circle cx="149" cy="545" r="3" fill={primaryColor} filter="url(#neonGlowSmall)" />
            <circle cx="149" cy="255" r="3" fill={primaryColor} filter="url(#neonGlowSmall)" />
          </g>

          {/* Outer Orbiting Particles Group 1 */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 35s linear infinite" }}>
            {outerParticles.map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 400 + 290 * Math.cos(rad);
              const cy = 400 + 290 * Math.sin(rad);
              return (
                <circle
                  key={`outer-p-${idx}`}
                  cx={cx}
                  cy={cy}
                  r={idx % 2 === 0 ? "3.5" : "2.5"}
                  fill={primaryColor}
                  filter="url(#neonGlowLarge)"
                />
              );
            })}
          </g>

          {/* =================================================== */}
          {/* LAYER 5: DOTTED OUTER PATH RING (CW Rotation) */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 55s linear infinite" }}>
            <circle
              cx="400"
              cy="400"
              r="245"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="2 7"
              opacity="0.75"
            />
            {/* Accent Brackets */}
            <path
              d="M 400,155 A 245,245 0 0,1 445,159"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              filter="url(#neonGlowSmall)"
            />
            <path
              d="M 400,645 A 245,245 0 0,1 355,641"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="3"
              filter="url(#neonGlowSmall)"
            />
          </g>

          {/* Mid Orbiting Particles Group 2 */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCCW 28s linear infinite" }}>
            {midParticles.map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 400 + 245 * Math.cos(rad);
              const cy = 400 + 245 * Math.sin(rad);
              return (
                <circle
                  key={`mid-p-${idx}`}
                  cx={cx}
                  cy={cy}
                  r="3"
                  fill={secondaryColor}
                  filter="url(#neonGlowSmall)"
                />
              );
            })}
          </g>

          {/* =================================================== */}
          {/* LAYER 4: RADAR SCALE RING WITH RADIAL TICKS */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 120s linear infinite" }}>
            <circle
              cx="400"
              cy="400"
              r="200"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="1"
              opacity="0.4"
            />
            {/* 72 Radar Scale Ticks */}
            {radarTicks.map((_, i) => {
              const angle = i * 5;
              const isMajor = i % 6 === 0;
              const tickLength = isMajor ? 10 : 5;
              const rad = (angle * Math.PI) / 180;
              const x1 = 400 + (200 - tickLength) * Math.cos(rad);
              const y1 = 400 + (200 - tickLength) * Math.sin(rad);
              const x2 = 400 + 200 * Math.cos(rad);
              const y2 = 400 + 200 * Math.sin(rad);
              return (
                <line
                  key={`tick-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? primaryColor : secondaryColor}
                  strokeWidth={isMajor ? "1.5" : "0.75"}
                  opacity={isMajor ? 0.9 : 0.4}
                />
              );
            })}
            {/* Crosshair Cardinal Accent Extensions */}
            <line x1="400" y1="185" x2="400" y2="165" stroke={primaryColor} strokeWidth="2" filter="url(#neonGlowSmall)" />
            <line x1="400" y1="615" x2="400" y2="635" stroke={primaryColor} strokeWidth="2" filter="url(#neonGlowSmall)" />
            <line x1="185" y1="400" x2="165" y2="400" stroke={primaryColor} strokeWidth="2" filter="url(#neonGlowSmall)" />
            <line x1="615" y1="400" x2="635" y2="400" stroke={primaryColor} strokeWidth="2" filter="url(#neonGlowSmall)" />
          </g>

          {/* =================================================== */}
          {/* LAYER 3: INNER SEGMENTED ARCS (CCW Fast) */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCCW 30s linear infinite" }}>
            <circle
              cx="400"
              cy="400"
              r="155"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="80 30 40 30"
              opacity="0.8"
              filter="url(#neonGlowSmall)"
            />
          </g>

          {/* Inner Orbiting Particles Group 3 */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 18s linear infinite" }}>
            {innerParticles.map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 400 + 155 * Math.cos(rad);
              const cy = 400 + 155 * Math.sin(rad);
              return (
                <circle
                  key={`inner-p-${idx}`}
                  cx={cx}
                  cy={cy}
                  r="2.5"
                  fill={primaryColor}
                  filter="url(#neonGlowLarge)"
                />
              );
            })}
          </g>

          {/* =================================================== */}
          {/* LAYER 2: INNER DOTTED PATH RING (CW) */}
          {/* =================================================== */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudRotateCW 22s linear infinite" }}>
            <circle
              cx="400"
              cy="400"
              r="120"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="3 9"
              opacity="0.85"
            />
          </g>

          {/* =================================================== */}
          {/* LAYER 1: CORE HUD BORDER RING & CORE SPHERE */}
          {/* =================================================== */}
          {/* Breathing Core Ring Base */}
          <g style={{ transformOrigin: "400px 400px", animation: "hudPulseScale 4s ease-in-out infinite alternate" }}>
            {/* Outer Core Accent Ring */}
            <circle
              cx="400"
              cy="400"
              r="92"
              fill="none"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeDasharray="180 30"
              filter="url(#neonGlowSmall)"
              opacity="0.9"
            />

            {/* Central Pure Glowing Core Circle */}
            <circle
              cx="400"
              cy="400"
              r="78"
              fill="url(#coreBg)"
              stroke={primaryColor}
              strokeWidth="2.5"
              filter="url(#neonGlowLarge)"
            />

            {/* Core Inner Ring Highlights */}
            <circle
              cx="400"
              cy="400"
              r="72"
              fill="none"
              stroke={secondaryColor}
              strokeWidth="1"
              opacity="0.6"
            />

            {/* =================================================== */}
            {/* CENTER TEXT: "ZOYA" IN BOLD WHITE FUTURISTIC TYPOGRAPHY */}
            {/* =================================================== */}
            <text
              x="400"
              y="409"
              textAnchor="middle"
              fill="#FFFFFF"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: "28px",
                fontWeight: 900,
                letterSpacing: "0.38em",
                textShadow: `0 0 12px #FFFFFF, 0 0 ${Math.round(22 * glowFactor)}px ${primaryColor}, 0 0 ${Math.round(40 * glowFactor)}px ${secondaryColor}`,
                userSelect: "none"
              }}
            >
              ZOYA
            </text>
          </g>

        </svg>

      </div>

      {/* Text Command Input Bar (Fallback when Mic is off/blocked) */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="absolute bottom-6 z-40 w-[90vw] max-w-md pointer-events-auto"
      >
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type command (e.g. 'play Kesariya', 'open instagram', 'volume 80%')..."
            className="w-full py-3 pl-4 pr-12 bg-black/80 border rounded-full text-xs font-mono placeholder-neutral-500 focus:outline-none backdrop-blur-md transition-all"
            style={{
              borderColor: `rgba(${glowRgb}, 0.4)`,
              color: primaryColor,
              boxShadow: `0 0 ${Math.round(15 * glowFactor)}px rgba(${glowRgb}, ${0.2 * glowFactor})`
            }}
          />
          <button
            type="submit"
            className="absolute right-1.5 p-2 rounded-full transition-all cursor-pointer font-bold text-xs"
            style={{
              backgroundColor: `rgba(${glowRgb}, 0.2)`,
              color: primaryColor,
            }}
            title="Send Command"
          >
            ➔
          </button>
        </form>
      </div>

      {/* Embedded CSS Animations for 60 FPS Smoothness */}
      <style>{`
        @keyframes hudRotateCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hudRotateCCW {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes hudPulse {
          0% { opacity: 0.7; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes hudPulseScale {
          0% { transform: scale(0.99); }
          100% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}

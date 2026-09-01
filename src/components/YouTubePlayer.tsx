import React, { useEffect, useRef, useState } from "react";
import { X, Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2 } from "lucide-react";

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  onClose: () => void;
  controlCommand?: {
    action: "play" | "pause" | "resume" | "forward" | "backward" | "close";
    seconds?: number;
    id: number;
  } | null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

export default function YouTubePlayer({
  videoId,
  title,
  onClose,
  controlCommand,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  // Native message listener fallback for iframe player state events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && (data.event === "infoDelivery" || data.event === "onStateChange")) {
          const playerState = data.info?.playerState ?? data.data;
          if (playerState === 1) {
            setIsPlaying(true);
          } else if (playerState === 2) {
            setIsPlaying(false);
          }
        }
      } catch (e) {
        // Ignore non-JSON postMessage calls from other sources
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Initialize YT Player API & handle videoId updates
  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        if (playerRef.current && typeof playerRef.current.loadVideoById === "function") {
          try {
            playerRef.current.loadVideoById(videoId);
            setIsPlaying(true);
            return;
          } catch (e) {
            console.warn("Failed to load video on existing player instance, re-creating:", e);
          }
        }

        playerRef.current = new window.YT.Player("zoya-yt-iframe", {
          videoId: videoId,
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              try {
                event.target.playVideo();
                setIsPlaying(true);
              } catch (e) {
                console.warn("Autoplay attempt handled on ready:", e);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              if (window.YT && window.YT.PlayerState) {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true);
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false);
                }
              }
            },
            onError: (event: any) => {
              console.warn("YouTube player error event:", event.data);
            },
          },
        });
      }
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        if (isMounted) {
          initPlayer();
        }
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {
          console.error("Error destroying YT player:", e);
        }
      }
    };
  }, [videoId]);

  // Execute control commands
  useEffect(() => {
    if (!controlCommand) return;
    const { action, seconds = 10 } = controlCommand;

    const postMsg = (func: string, args: any = "") => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      }
    };

    if (action === "pause") {
      if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      } else {
        postMsg("pauseVideo");
      }
      setIsPlaying(false);
    } else if (action === "play" || action === "resume") {
      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      } else {
        postMsg("playVideo");
      }
      setIsPlaying(true);
    } else if (action === "forward") {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const curr = playerRef.current.getCurrentTime() || 0;
        playerRef.current.seekTo(curr + seconds, true);
      } else {
        postMsg("seekTo", [seconds, true]);
      }
    } else if (action === "backward") {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const curr = playerRef.current.getCurrentTime() || 0;
        playerRef.current.seekTo(Math.max(0, curr - seconds), true);
      } else {
        postMsg("seekTo", [-seconds, true]);
      }
    } else if (action === "close") {
      onClose();
    }
  }, [controlCommand, onClose]);

  const originUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${
        isMinimized
          ? "bottom-6 right-6 w-80 h-48 rounded-2xl"
          : "bottom-6 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl h-[280px] sm:h-[360px] rounded-2xl"
      } bg-black/90 border border-[#00E5FF]/60 shadow-[0_0_40px_rgba(0,229,255,0.35)] backdrop-blur-xl flex flex-col overflow-hidden pointer-events-auto`}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-[#00E5FF]/30 text-white font-mono text-xs">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse" />
          <span className="text-[#00E5FF] font-bold tracking-wider uppercase truncate">
            {title || "Zoya Media Player"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-[#00E5FF]/20 text-[#00E5FF] transition-all cursor-pointer"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
            title="Close Video"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Video Frame */}
      <div className="relative flex-1 bg-black">
        <iframe
          key={videoId}
          id="zoya-yt-iframe"
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent(
            originUrl
          )}`}
          title="Zoya Video Player"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-center gap-6 py-2 bg-black/95 border-t border-[#00E5FF]/20 text-[#00E5FF]">
        <button
          onClick={() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
              const curr = playerRef.current.getCurrentTime() || 0;
              playerRef.current.seekTo(Math.max(0, curr - 10), true);
            }
          }}
          className="p-2 rounded-full hover:bg-[#00E5FF]/20 transition-all cursor-pointer flex items-center gap-1 font-mono text-xs"
          title="10s Pichhe"
        >
          <SkipBack size={18} />
          <span>-10s</span>
        </button>

        <button
          onClick={() => {
            if (isPlaying) {
              if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
                playerRef.current.pauseVideo();
              }
              setIsPlaying(false);
            } else {
              if (playerRef.current && typeof playerRef.current.playVideo === "function") {
                playerRef.current.playVideo();
              }
              setIsPlaying(true);
            }
          }}
          className="p-2.5 rounded-full bg-[#00E5FF]/20 border border-[#00E5FF] hover:bg-[#00E5FF] hover:text-black transition-all cursor-pointer"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button
          onClick={() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
              const curr = playerRef.current.getCurrentTime() || 0;
              playerRef.current.seekTo(curr + 10, true);
            }
          }}
          className="p-2 rounded-full hover:bg-[#00E5FF]/20 transition-all cursor-pointer flex items-center gap-1 font-mono text-xs"
          title="10s Aage"
        >
          <span>+10s</span>
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}


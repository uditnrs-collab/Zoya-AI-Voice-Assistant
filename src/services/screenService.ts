// Screen Reading & Real-time Screen Companion Service for ZOYA
import {
  programmaticScroll,
  applyCssScrollTransform,
  ProgrammaticScrollOptions,
  ScrollResult,
} from "../utils/domInteraction";

export interface ScreenState {
  isSharing: boolean;
  isAnalyzing: boolean;
  isLiveCompanion: boolean;
  autoVoice: boolean;
  intervalSeconds: number;
  activeMode: "read" | "analysis" | "companion" | "idle";
  lastAnalysis: string | null;
  lastAnalysisTimestamp: number | null;
  liveExplanation: string | null;
  liveExplanationTimestamp: number | null;
  scrollOffset: { x: number; y: number };
  zoomLevel: number;
  lastScrollTimestamp: number | null;
  error: string | null;
}

type ScreenListener = (state: ScreenState) => void;

class ScreenVisionManager {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private listeners: Set<ScreenListener> = new Set();
  private autoAnalysisTimer: any = null;
  private isProcessingFrame: boolean = false;
  private onSpeechCallback: ((text: string) => void) | null = null;

  private state: ScreenState = {
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
    scrollOffset: { x: 0, y: 0 },
    zoomLevel: 1.0,
    lastScrollTimestamp: null,
    error: null,
  };

  public subscribe(listener: ScreenListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public isScreenSharingActive(): boolean {
    return !!(this.stream && this.stream.active && this.stream.getVideoTracks().some((t) => t.readyState === "live"));
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }

  public setAutoVoice(enabled: boolean) {
    this.state.autoVoice = enabled;
    this.notify();
  }

  public setIntervalSeconds(sec: number) {
    this.state.intervalSeconds = Math.max(5, Math.min(60, sec));
    this.notify();
    if (this.state.isLiveCompanion) {
      this.restartCompanionLoop();
    }
  }

  public setSpeechCallback(cb: ((text: string) => void) | null) {
    this.onSpeechCallback = cb;
  }

  public async startScreenSharing(): Promise<{ success: boolean; message: string }> {
    if (this.isScreenSharingActive()) {
      return { success: true, message: "Screen sharing is already active." };
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        const errMsg = "Screen Capture API is not supported in this browser environment.";
        this.state.error = errMsg;
        this.notify();
        return { success: false, message: errMsg };
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
        },
        audio: false,
      });

      this.stream = stream;

      // Hidden video element to read frames
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      // Ensure video element has loaded metadata and dimensions
      await new Promise<void>((resolve) => {
        let done = false;
        const onReady = () => {
          if (!done) {
            done = true;
            resolve();
          }
        };

        video.onloadedmetadata = onReady;
        video.onloadeddata = onReady;
        video.onplaying = onReady;
        video.play().then(onReady).catch(onReady);
        setTimeout(onReady, 1200); // safety fallback
      });

      this.videoEl = video;

      // Handle user stopping screen share from browser banner
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          this.stopScreenSharing();
        };
      });

      this.state.isSharing = true;
      this.state.error = null;
      this.notify();

      return { success: true, message: "Screen sharing started successfully." };
    } catch (err: any) {
      console.warn("Screen sharing permission/error:", err);
      const isDenied = err.name === "NotAllowedError" || err.message?.includes("Permission denied");
      const errMsg = isDenied
        ? "Screen sharing permission was declined by the user."
        : (err.message || "Failed to start screen sharing.");
      this.state.error = errMsg;
      this.state.isSharing = false;
      this.notify();
      return { success: false, message: errMsg };
    }
  }

  public stopScreenSharing() {
    this.stopLiveCompanion();

    if (this.stream) {
      this.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {}
      });
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }

    this.staticFrame = null;
    this.state.isSharing = false;
    this.state.isAnalyzing = false;
    this.state.isLiveCompanion = false;
    this.state.activeMode = "idle";
    this.notify();
  }

  private staticFrame: string | null = null;

  public setStaticFrame(base64Image: string | null) {
    this.staticFrame = base64Image;
    if (base64Image) {
      this.notify();
    }
  }

  public getStaticFrame(): string | null {
    return this.staticFrame;
  }

  public captureCurrentFrame(): string | null {
    if (this.staticFrame) {
      return this.staticFrame;
    }

    if (!this.videoEl || !this.isScreenSharingActive()) return null;

    try {
      const video = this.videoEl;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width === 0 || height === 0) {
        // Fallback dimensions if metadata delayed
        width = 1280;
        height = 720;
      }

      const canvas = document.createElement("canvas");
      // Scale down slightly if 4K to optimize payload while preserving sharpness
      const maxDim = 1280;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (err) {
      console.error("Frame capture error:", err);
      return null;
    }
  }

  public async analyzeCurrentScreen(
    customPrompt?: string,
    type: "screen-read" | "screen-analysis" | "live-screen-companion" | "screen-explain" = "screen-read",
    providedFrame?: string
  ): Promise<{ success: boolean; text: string }> {
    let frameBase64 = providedFrame || this.staticFrame;

    // If no provided frame and not sharing, attempt to start sharing
    if (!frameBase64) {
      if (!this.isScreenSharingActive()) {
        const startRes = await this.startScreenSharing();
        if (!startRes.success) {
          return {
            success: false,
            text: "Ji boss, screen analyze karne ke liye kripya screen select karke permission dijiye, ya Screen Vision window me screenshot upload karein.",
          };
        }
        // Brief pause to allow video stream to render first frame
        await new Promise((r) => setTimeout(r, 800));
      }

      frameBase64 = this.captureCurrentFrame();
    }

    if (!frameBase64) {
      return {
        success: false,
        text: "Boss, screen frame capture nahi ho pa raha hai. Kripya Screen Vision me screenshot upload ya screen share check karein.",
      };
    }

    this.state.isAnalyzing = true;
    this.state.activeMode = type === "screen-read" ? "read" : type === "live-screen-companion" ? "companion" : "analysis";
    this.notify();

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: frameBase64,
          prompt: customPrompt,
          type,
        }),
      });

      const data = await res.json();
      const analysisText = data.text || "Boss, screen analyze ho gaya hai.";

      this.state.isAnalyzing = false;
      this.state.lastAnalysis = analysisText;
      this.state.lastAnalysisTimestamp = Date.now();
      if (type === "live-screen-companion" || type === "screen-explain") {
        this.state.liveExplanation = analysisText;
        this.state.liveExplanationTimestamp = Date.now();
      }
      this.state.error = null;
      this.notify();

      return { success: true, text: analysisText };
    } catch (err: any) {
      console.error("Screen Vision error:", err);
      this.state.isAnalyzing = false;
      this.state.error = err.message || "Failed to analyze screen frame";
      this.notify();

      return {
        success: false,
        text: "Ji boss, screen analyze karne me dikkat aayi. Kripya dobara try karein.",
      };
    }
  }

  public async explainLiveScreen(promptMode?: "explain" | "debug" | "guide" | "code" | string): Promise<{ success: boolean; text: string }> {
    let customPrompt = "";
    if (!promptMode || promptMode === "explain") {
      customPrompt = "Boss Udit ko screen par khula hua app, web page ya document aasan Hindi/Hinglish me step-by-step samjhao. Highlight karein ki screen par kya chal raha hai aur Boss ko kya samajhna chahiye.";
    } else if (promptMode === "debug") {
      customPrompt = "Screen par dhyan se dekhein aur spot karein ki kya koi error, warning, compilation failure ya glitched form field hai. Us error ka karan aur use theek karne ka step-by-step upay loyal Zoya tone me batao.";
    } else if (promptMode === "guide") {
      customPrompt = "Boss Udit ko guide karein ki agla step kya karna hai, kaunsa button dabana hai, ya kaunsa input box fill karna hai. Seedha clear instructions dein.";
    } else if (promptMode === "code") {
      customPrompt = "Screen par jo code ya script dikh raha hai use analyze karein. Code ka purpose, functions, variables aur logic aasan bhasha me explain karein.";
    } else {
      customPrompt = promptMode;
    }

    return this.analyzeCurrentScreen(customPrompt, "live-screen-companion");
  }

  public async startLiveCompanion(options?: {
    intervalSeconds?: number;
    autoVoice?: boolean;
    onSpeech?: (text: string) => void;
  }): Promise<{ success: boolean; text: string }> {
    if (options?.autoVoice !== undefined) {
      this.state.autoVoice = options.autoVoice;
    }
    if (options?.intervalSeconds) {
      this.state.intervalSeconds = options.intervalSeconds;
    }
    if (options?.onSpeech) {
      this.onSpeechCallback = options.onSpeech;
    }

    if (!this.isScreenSharingActive() && !this.staticFrame) {
      const shareRes = await this.startScreenSharing();
      if (!shareRes.success) {
        return {
          success: false,
          text: "Ji boss, Live Screen Companion ke liye kripya display permission grant karein.",
        };
      }
      await new Promise((r) => setTimeout(r, 900));
    }

    this.state.isLiveCompanion = true;
    this.state.activeMode = "companion";
    this.notify();

    // Perform initial explanation
    const initialRes = await this.explainLiveScreen("explain");

    // Setup periodic observation loop
    this.restartCompanionLoop();

    return initialRes;
  }

  private restartCompanionLoop() {
    if (this.autoAnalysisTimer) {
      clearInterval(this.autoAnalysisTimer);
      this.autoAnalysisTimer = null;
    }

    const intervalMs = (this.state.intervalSeconds || 12) * 1000;

    this.autoAnalysisTimer = setInterval(async () => {
      if (!this.state.isLiveCompanion || !this.isScreenSharingActive() || this.isProcessingFrame) return;

      this.isProcessingFrame = true;
      try {
        const frame = this.captureCurrentFrame();
        if (frame) {
          const res = await fetch("/api/vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: frame,
              prompt: "Provide a sharp 2-sentence live update of Boss's screen state in loyal Hindi/Hinglish. If a new error or important change appeared, highlight it clearly; otherwise summarize what Boss is currently doing.",
              type: "live-screen-companion",
            }),
          });
          const data = await res.json();
          if (data.text) {
            this.state.liveExplanation = data.text;
            this.state.lastAnalysis = data.text;
            this.state.liveExplanationTimestamp = Date.now();
            this.notify();

            if (this.state.autoVoice && this.onSpeechCallback) {
              this.onSpeechCallback(data.text);
            }
          }
        }
      } catch (err) {
        console.warn("Live companion frame analysis error:", err);
      } finally {
        this.isProcessingFrame = false;
      }
    }, intervalMs);
  }

  public stopLiveCompanion() {
    if (this.autoAnalysisTimer) {
      clearInterval(this.autoAnalysisTimer);
      this.autoAnalysisTimer = null;
    }
    this.state.isLiveCompanion = false;
    this.state.activeMode = "idle";
    this.notify();
  }

  public startPeriodicAnalysis(intervalMs: number = 10000) {
    this.setIntervalSeconds(Math.round(intervalMs / 1000));
    this.startLiveCompanion({ intervalSeconds: Math.round(intervalMs / 1000), autoVoice: false });
  }

  public stopPeriodicAnalysis() {
    this.stopLiveCompanion();
  }

  /**
   * Programmatic scroll execution on active browser context or shared screen content
   */
  public scroll(
    direction: "up" | "down" | "left" | "right" | "top" | "bottom" = "down",
    amount: "small" | "medium" | "large" | number = "medium",
    targetSelector?: string
  ): ScrollResult {
    const res = programmaticScroll({
      direction,
      amount,
      targetSelector,
    });

    if (res.success) {
      this.state.scrollOffset = {
        x: this.state.scrollOffset.x + res.deltaX,
        y: this.state.scrollOffset.y + res.deltaY,
      };
      this.state.lastScrollTimestamp = Date.now();
      this.notify();
    }

    return res;
  }

  /**
   * Adjusts CSS-based scroll positioning on the active shared screen viewer
   */
  public scrollViewer(deltaY: number, deltaX: number = 0): boolean {
    const screenViewport = document.querySelector<HTMLElement>(
      "[data-screen-viewport], [data-screen-stream], .screen-vision-preview"
    );

    if (screenViewport) {
      const scrolled = applyCssScrollTransform(screenViewport, deltaY, deltaX);
      if (scrolled) {
        this.state.scrollOffset = {
          x: this.state.scrollOffset.x + deltaX,
          y: this.state.scrollOffset.y + deltaY,
        };
        this.state.lastScrollTimestamp = Date.now();
        this.notify();
        return true;
      }
    }

    return false;
  }

  /**
   * Resets viewer zoom and scroll offsets
   */
  public resetViewerScroll(): void {
    this.state.scrollOffset = { x: 0, y: 0 };
    this.state.zoomLevel = 1.0;
    this.state.lastScrollTimestamp = Date.now();
    this.notify();

    const screenContainers = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-screen-viewport], [data-screen-stream], .screen-vision-preview"
      )
    );

    for (const c of screenContainers) {
      c.setAttribute("data-zoya-scroll-y", "0");
      c.setAttribute("data-zoya-scroll-x", "0");
      const innerContent =
        c.querySelector<HTMLElement>("[data-scroll-content], video, canvas, img") ||
        (c.firstElementChild as HTMLElement) ||
        c;
      innerContent.style.transform = "translate3d(0, 0, 0) scale(1)";
    }
  }

  /**
   * Sets zoom factor for shared screen view with CSS transform scaling
   */
  public setViewerZoom(zoom: number): void {
    const clampedZoom = Math.max(0.5, Math.min(3.0, zoom));
    this.state.zoomLevel = clampedZoom;
    this.notify();

    const screenContainers = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-screen-viewport], [data-screen-stream], .screen-vision-preview"
      )
    );

    for (const c of screenContainers) {
      const currentY = parseFloat(c.getAttribute("data-zoya-scroll-y") || "0");
      const currentX = parseFloat(c.getAttribute("data-zoya-scroll-x") || "0");
      const innerContent =
        c.querySelector<HTMLElement>("[data-scroll-content], video, canvas, img") ||
        (c.firstElementChild as HTMLElement) ||
        c;
      innerContent.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${clampedZoom})`;
    }
  }

  /**
   * Returns current scroll offset and zoom metrics
   */
  public getViewerMetrics(): { scrollOffset: { x: number; y: number }; zoomLevel: number } {
    return {
      scrollOffset: { ...this.state.scrollOffset },
      zoomLevel: this.state.zoomLevel,
    };
  }
}

export const screenService = new ScreenVisionManager();

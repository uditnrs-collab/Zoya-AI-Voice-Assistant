// Live Camera Analysis Service for ZOYA

export interface CameraState {
  isActive: boolean;
  isAnalyzing: boolean;
  facingMode: "user" | "environment";
  lastAnalysis: string | null;
  lastAnalysisTimestamp: number | null;
  error: string | null;
  hasPermission: boolean;
}

type CameraListener = (state: CameraState) => void;

class CameraVisionManager {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private listeners: Set<CameraListener> = new Set();

  private state: CameraState = {
    isActive: false,
    isAnalyzing: false,
    facingMode: "user",
    lastAnalysis: null,
    lastAnalysisTimestamp: null,
    error: null,
    hasPermission: false,
  };

  public subscribe(listener: CameraListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public isCameraActive(): boolean {
    return !!(this.stream && this.stream.active && this.stream.getVideoTracks().some((t) => t.readyState === "live"));
  }

  public getMediaStream(): MediaStream | null {
    return this.stream;
  }

  public async startCamera(preferredFacing: "user" | "environment" = this.state.facingMode): Promise<{ success: boolean; message: string }> {
    if (this.isCameraActive() && this.state.facingMode === preferredFacing) {
      return { success: true, message: "Camera is already active." };
    }

    // Stop existing stream if flipping
    if (this.stream) {
      this.stopCamera();
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errMsg = "Camera API is not supported in this browser environment.";
        this.state.error = errMsg;
        this.notify();
        return { success: false, message: errMsg };
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: preferredFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to generic video if exact facingMode fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      this.stream = stream;

      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play().catch(() => {});
      this.videoEl = video;

      this.state.isActive = true;
      this.state.facingMode = preferredFacing;
      this.state.hasPermission = true;
      this.state.error = null;
      this.notify();

      return { success: true, message: "Camera started successfully." };
    } catch (err: any) {
      console.warn("Camera access error:", err);
      const isDenied = err.name === "NotAllowedError" || err.message?.includes("Permission denied");
      const errMsg = isDenied
        ? "Camera permission was denied. Please allow camera access in browser settings."
        : (err.message || "Failed to start camera.");

      this.state.error = errMsg;
      this.state.isActive = false;
      this.state.hasPermission = false;
      this.notify();
      return { success: false, message: errMsg };
    }
  }

  public stopCamera() {
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

    this.state.isActive = false;
    this.state.isAnalyzing = false;
    this.notify();
  }

  public async toggleCameraFacing(): Promise<void> {
    const nextFacing = this.state.facingMode === "user" ? "environment" : "user";
    await this.startCamera(nextFacing);
  }

  public captureCurrentFrame(): string | null {
    if (!this.videoEl || !this.isCameraActive()) return null;

    try {
      const video = this.videoEl;
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;

      const canvas = document.createElement("canvas");
      const maxDim = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;
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
      console.error("Camera frame capture error:", err);
      return null;
    }
  }

  public async analyzeCurrentView(customPrompt?: string): Promise<{ success: boolean; text: string }> {
    if (!this.isCameraActive()) {
      const startRes = await this.startCamera();
      if (!startRes.success) {
        return {
          success: false,
          text: "Boss, camera access nahi mila. Kripya camera permission allow kijiye.",
        };
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    const frameBase64 = this.captureCurrentFrame();
    if (!frameBase64) {
      return {
        success: false,
        text: "Boss, camera frame capture nahi ho pa raha hai.",
      };
    }

    this.state.isAnalyzing = true;
    this.notify();

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: frameBase64,
          prompt: customPrompt || "Identify and describe all visible objects, text, people, documents, or surroundings in this live camera frame clearly and concisely in Zoya's tone.",
          type: "camera-analysis",
        }),
      });

      const data = await res.json();
      const analysisText = data.text || "Boss, camera view analyze ho gaya hai.";

      this.state.isAnalyzing = false;
      this.state.lastAnalysis = analysisText;
      this.state.lastAnalysisTimestamp = Date.now();
      this.state.error = null;
      this.notify();

      return { success: true, text: analysisText };
    } catch (err: any) {
      console.error("Camera vision error:", err);
      this.state.isAnalyzing = false;
      this.state.error = err.message || "Failed to analyze camera frame";
      this.notify();

      return {
        success: false,
        text: "Ji boss, camera view analyze karne me dikkat aayi. Kripya dobara koshish karein.",
      };
    }
  }
}

export const cameraService = new CameraVisionManager();

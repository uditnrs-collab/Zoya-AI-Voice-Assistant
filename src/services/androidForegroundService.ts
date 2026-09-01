/**
 * ZOYA Android Foreground Service Bridge & Background Execution Manager
 * 
 * Provides unified interface to control Android Foreground Service with:
 * - Native Android 14/15 ForegroundService bridge (via window.ZoyaAndroidBridge)
 * - Persistent notification integration ("ZOYA is active")
 * - Web WakeLock & Audio keep-alive fallback for browser environments
 */

declare global {
  interface Window {
    ZoyaAndroidBridge?: {
      isAndroidNative(): boolean;
      isServiceRunning(): boolean;
      startForegroundService(): string; // JSON string
      stopForegroundService(): string;  // JSON string
      requestPermissions(): string;
      hasMicrophonePermission(): boolean;
      hasNotificationPermission(): boolean;
      openBatteryOptimizationSettings(): void;
      getServiceStatusJson(): string;
    };
  }
}

export interface ForegroundServiceStatus {
  isNative: boolean;
  isRunning: boolean;
  hasMicPermission: boolean;
  hasNotificationPermission: boolean;
  errorMessage?: string;
}

type StatusListener = (status: ForegroundServiceStatus) => void;

class AndroidForegroundServiceManager {
  private isRunning: boolean = false;
  private listeners: Set<StatusListener> = new Set();
  private wakeLock: any = null;
  private webAudioKeepAlive: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Check native status if available
      if (window.ZoyaAndroidBridge) {
        try {
          this.isRunning = window.ZoyaAndroidBridge.isServiceRunning();
        } catch {
          this.isRunning = false;
        }
      } else {
        const saved = localStorage.getItem("ZOYA_BG_SERVICE_STATE");
        this.isRunning = saved === "active";
      }

      // Listen to native Android broadcast events dispatched to window
      window.addEventListener("zoya:foreground_service_change", ((e: CustomEvent) => {
        if (e.detail) {
          this.isRunning = !!e.detail.isRunning;
          this.notifyListeners(e.detail.error);
        }
      }) as EventListener);

      // Re-acquire wake lock if page becomes visible or tab recovers
      document.addEventListener("visibilitychange", () => {
        if (this.isRunning && document.visibilityState === "visible") {
          this.ensureWebWakeLock();
        }
      });
    }
  }

  public isNativeAndroid(): boolean {
    return typeof window !== "undefined" && !!window.ZoyaAndroidBridge;
  }

  public getStatus(): ForegroundServiceStatus {
    if (this.isNativeAndroid()) {
      try {
        const statusJson = window.ZoyaAndroidBridge!.getServiceStatusJson();
        const parsed = JSON.parse(statusJson);
        return {
          isNative: true,
          isRunning: !!parsed.isRunning,
          hasMicPermission: !!parsed.hasMicPermission,
          hasNotificationPermission: !!parsed.hasNotificationPermission,
        };
      } catch {
        return {
          isNative: true,
          isRunning: this.isRunning,
          hasMicPermission: true,
          hasNotificationPermission: true,
        };
      }
    }

    return {
      isNative: false,
      isRunning: this.isRunning,
      hasMicPermission: true,
      hasNotificationPermission: typeof Notification !== "undefined" && Notification.permission === "granted",
    };
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(errorMessage?: string) {
    const status = this.getStatus();
    if (errorMessage) {
      status.errorMessage = errorMessage;
    }
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error("Error in foreground service listener:", err);
      }
    });
  }

  public async startService(): Promise<{ success: boolean; message: string; isNative: boolean }> {
    if (this.isNativeAndroid()) {
      try {
        const resStr = window.ZoyaAndroidBridge!.startForegroundService();
        const res = JSON.parse(resStr);
        if (res.success) {
          this.isRunning = true;
          this.notifyListeners();
          return { success: true, message: "Android Foreground Service active: 'ZOYA is active'", isNative: true };
        } else {
          return { success: false, message: res.error || "Failed to start service", isNative: true };
        }
      } catch (e: any) {
        return { success: false, message: e?.message || "Bridge error", isNative: true };
      }
    }

    // Web Fallback Implementation
    try {
      this.isRunning = true;
      localStorage.setItem("ZOYA_BG_SERVICE_STATE", "active");

      // 1. Request Screen WakeLock
      await this.ensureWebWakeLock();

      // 2. Start Silent Audio keep-alive to keep background worker thread alive
      this.startWebAudioKeepAlive();

      // 3. Web Notification if granted
      this.showWebNotification();

      this.notifyListeners();
      return {
        success: true,
        message: "Background Service active with Persistent Keep-Alive & WakeLock",
        isNative: false,
      };
    } catch (e: any) {
      return { success: false, message: e?.message || "Failed to start background worker", isNative: false };
    }
  }

  public async stopService(): Promise<{ success: boolean; message: string }> {
    if (this.isNativeAndroid()) {
      try {
        const resStr = window.ZoyaAndroidBridge!.stopForegroundService();
        const res = JSON.parse(resStr);
        this.isRunning = false;
        this.notifyListeners();
        return { success: true, message: res.message || "Android Foreground Service stopped" };
      } catch (e: any) {
        return { success: false, message: e?.message || "Bridge error" };
      }
    }

    // Web Fallback Stop
    this.isRunning = false;
    localStorage.removeItem("ZOYA_BG_SERVICE_STATE");

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }

    this.stopWebAudioKeepAlive();
    this.notifyListeners();

    return { success: true, message: "Background service stopped cleanly" };
  }

  public toggleService(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return this.stopService();
    } else {
      return this.startService();
    }
  }

  public requestNativePermissions(): string {
    if (this.isNativeAndroid()) {
      return window.ZoyaAndroidBridge!.requestPermissions();
    }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    return "REQUESTED";
  }

  private async ensureWebWakeLock() {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request("screen");
        this.wakeLock.addEventListener("release", () => {
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn("Screen WakeLock not granted or supported:", err);
      }
    }
  }

  private startWebAudioKeepAlive() {
    try {
      if (!this.webAudioKeepAlive) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.webAudioKeepAlive = new AudioCtx();
          this.oscillator = this.webAudioKeepAlive.createOscillator();
          const gain = this.webAudioKeepAlive.createGain();
          gain.gain.value = 0.00001; // Virtually inaudible keepalive
          this.oscillator.connect(gain);
          gain.connect(this.webAudioKeepAlive.destination);
          this.oscillator.start();
        }
      }
    } catch {}
  }

  private stopWebAudioKeepAlive() {
    try {
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      if (this.webAudioKeepAlive) {
        this.webAudioKeepAlive.close();
        this.webAudioKeepAlive = null;
      }
    } catch {}
  }

  private showWebNotification() {
    try {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("ZOYA is active", {
            body: "ZOYA is running in the background",
            icon: "/favicon.ico",
            tag: "zoya_foreground_service",
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then((perm) => {
            if (perm === "granted") {
              new Notification("ZOYA is active", {
                body: "ZOYA is running in the background",
                icon: "/favicon.ico",
                tag: "zoya_foreground_service",
              });
            }
          });
        }
      }
    } catch {}
  }
}

export const androidForegroundService = new AndroidForegroundServiceManager();

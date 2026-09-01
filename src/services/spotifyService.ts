// Official Spotify Voice Control Service for ZOYA

export interface SpotifyTrack {
  name: string;
  artist: string;
  album?: string;
  image?: string;
  uri?: string;
  durationMs?: number;
  progressMs?: number;
}

export interface SpotifyUser {
  id: string;
  displayName: string;
  email?: string;
  product: "premium" | "free" | "open";
  image?: string;
}

export interface SpotifyState {
  isConnected: boolean;
  user: SpotifyUser | null;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  activeDevice: boolean;
  deviceName?: string;
  volume: number;
  error: string | null;
  customClientId: string;
  customClientSecret: string;
}

type SpotifyListener = (state: SpotifyState) => void;

interface TokenStorage {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

class SpotifyManager {
  private listeners: Set<SpotifyListener> = new Set();
  private pollTimer: any = null;

  private state: SpotifyState = {
    isConnected: false,
    user: null,
    currentTrack: null,
    isPlaying: false,
    activeDevice: false,
    volume: 50,
    error: null,
    customClientId: typeof window !== "undefined" ? localStorage.getItem("zoya_spotify_client_id") || "" : "",
    customClientSecret: typeof window !== "undefined" ? localStorage.getItem("zoya_spotify_client_secret") || "" : "",
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.initAuthListener();
      this.checkInitialConnection();
    }
  }

  public subscribe(listener: SpotifyListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public setCustomCredentials(clientId: string, clientSecret: string) {
    this.state.customClientId = clientId.trim();
    this.state.customClientSecret = clientSecret.trim();
    if (typeof window !== "undefined") {
      localStorage.setItem("zoya_spotify_client_id", this.state.customClientId);
      localStorage.setItem("zoya_spotify_client_secret", this.state.customClientSecret);
    }
    this.notify();
  }

  private getTokens(): TokenStorage | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("zoya_spotify_tokens");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveTokens(tokens: { access_token: string; refresh_token?: string; expires_in?: number }) {
    if (typeof window === "undefined") return;
    const existing = this.getTokens();
    const tokenObj: TokenStorage = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || existing?.refreshToken,
      expiresAt: Date.now() + ((tokens.expires_in || 3600) - 60) * 1000,
    };
    localStorage.setItem("zoya_spotify_tokens", JSON.stringify(tokenObj));
    this.state.isConnected = true;
    this.notify();
  }

  private async getValidAccessToken(): Promise<string | null> {
    const tokens = this.getTokens();
    if (!tokens || !tokens.accessToken) return null;

    if (Date.now() > tokens.expiresAt && tokens.refreshToken) {
      // Refresh token
      try {
        const res = await fetch("/api/spotify/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            refreshToken: tokens.refreshToken,
            clientId: this.state.customClientId || undefined,
            clientSecret: this.state.customClientSecret || undefined,
          }),
        });
        if (res.ok) {
          const refreshed = await res.json();
          this.saveTokens(refreshed);
          return refreshed.access_token;
        }
      } catch (err) {
        console.warn("Spotify token refresh failed:", err);
      }
    }

    return tokens.accessToken;
  }

  private initAuthListener() {
    window.addEventListener("message", async (event: MessageEvent) => {
      if (event.data?.type === "SPOTIFY_AUTH_RESULT") {
        if (event.data.code) {
          const redirectUri = `${window.location.origin}/auth/spotify/callback`;
          try {
            const res = await fetch("/api/spotify/exchange", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code: event.data.code,
                redirectUri,
                clientId: this.state.customClientId || undefined,
                clientSecret: this.state.customClientSecret || undefined,
              }),
            });

            if (res.ok) {
              const tokens = await res.json();
              this.saveTokens(tokens);
              await this.fetchUserProfile();
              this.startPollingStatus();
            } else {
              const errData = await res.json();
              this.state.error = errData.error || "Failed to complete Spotify authorization.";
              this.notify();
            }
          } catch (err: any) {
            this.state.error = err.message || "OAuth exchange network error.";
            this.notify();
          }
        } else if (event.data.error) {
          this.state.error = String(event.data.error);
          this.notify();
        }
      }
    });
  }

  public async checkInitialConnection() {
    const tokens = this.getTokens();
    if (tokens && tokens.accessToken) {
      this.state.isConnected = true;
      this.notify();
      await this.fetchUserProfile();
      this.startPollingStatus();
    }
  }

  public async initiateConnect(): Promise<{ success: boolean; url?: string; message?: string }> {
    try {
      const redirectUri = `${window.location.origin}/auth/spotify/callback`;
      const urlQuery = new URLSearchParams({
        redirectUri,
        clientId: this.state.customClientId,
      });

      const res = await fetch(`/api/spotify/auth-url?${urlQuery.toString()}`);
      const data = await res.json();

      if (!data.configured && !this.state.customClientId) {
        return {
          success: false,
          message: "Spotify Client ID configure nahi hai. Kripya Settings me Spotify Client ID enter karein.",
        };
      }

      if (data.url) {
        const popup = window.open(
          data.url,
          "spotify_oauth_popup",
          "width=550,height=750,left=200,top=100"
        );
        if (!popup) {
          return {
            success: false,
            message: "Browser popup block ho gaya. Kripya popups allow karein.",
          };
        }
        return { success: true, url: data.url };
      }

      return { success: false, message: "Authorization URL generate nahi ho payi." };
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to initiate Spotify login" };
    }
  }

  public async fetchUserProfile(): Promise<SpotifyUser | null> {
    const token = await this.getValidAccessToken();
    if (!token) return null;

    try {
      const res = await fetch("/api/spotify/playback/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user: SpotifyUser = await res.json();
        this.state.user = user;
        this.state.isConnected = true;
        this.notify();
        return user;
      }
    } catch (err) {
      console.warn("Failed to fetch Spotify profile:", err);
    }
    return null;
  }

  public async fetchCurrentPlayback(): Promise<void> {
    const token = await this.getValidAccessToken();
    if (!token) return;

    try {
      const res = await fetch("/api/spotify/playback/current", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        this.state.isPlaying = !!data.isPlaying;
        this.state.activeDevice = !!data.activeDevice;
        this.state.deviceName = data.device;
        this.state.volume = data.volume ?? this.state.volume;
        this.state.currentTrack = data.track || null;
        this.state.error = null;
        this.notify();
      }
    } catch (err) {
      console.warn("Playback status poll error:", err);
    }
  }

  public startPollingStatus(intervalMs: number = 5000) {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.fetchCurrentPlayback();
    this.pollTimer = setInterval(() => {
      if (this.state.isConnected) {
        this.fetchCurrentPlayback();
      }
    }, intervalMs);
  }

  public stopPollingStatus() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public async play(query?: string, type?: "track" | "playlist"): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) {
      return { success: false, message: "Boss, Spotify account connected nahi hai. Kripya pehle connect kijiye." };
    }

    try {
      const res = await fetch("/api/spotify/playback/play", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, type }),
      });

      if (res.ok) {
        this.state.isPlaying = true;
        this.notify();
        setTimeout(() => this.fetchCurrentPlayback(), 1000);
        return {
          success: true,
          message: query ? `Spotify par '${query}' play kar rahi hoon, Boss.` : "Music resume kar diya hai, Boss.",
        };
      }

      const errData = await res.json();
      if (res.status === 404) {
        return {
          success: false,
          message: "Boss, koi active Spotify device nahi mila. Please apne phone ya computer par Spotify open karke koi song start kijiye.",
        };
      }
      if (res.status === 403) {
        return {
          success: false,
          message: "Boss, Spotify remote control ke liye Spotify Premium account zaroori hai.",
        };
      }

      return { success: false, message: errData.error || "Playback start nahi ho saka." };
    } catch (err: any) {
      return { success: false, message: err.message || "Spotify play request failed." };
    }
  }

  public async pause(): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) {
      return { success: false, message: "Boss, Spotify account connected nahi hai." };
    }

    try {
      const res = await fetch("/api/spotify/playback/pause", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        this.state.isPlaying = false;
        this.notify();
        return { success: true, message: "Music pause kar diya hai, Boss." };
      }

      const err = await res.json();
      if (res.status === 404) {
        return { success: false, message: "Boss, Spotify par koi active playback nahi chal raha hai." };
      }
      return { success: false, message: err.error || "Pause nahi ho saka." };
    } catch (err: any) {
      return { success: false, message: err.message || "Spotify pause request failed." };
    }
  }

  public async next(): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) return { success: false, message: "Boss, Spotify account connected nahi hai." };

    try {
      const res = await fetch("/api/spotify/playback/next", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTimeout(() => this.fetchCurrentPlayback(), 800);
        return { success: true, message: "Agla gana play kar rahi hoon, Boss." };
      }
      return { success: false, message: "Next track play nahi ho saka." };
    } catch (err: any) {
      return { success: false, message: err.message || "Next track request failed." };
    }
  }

  public async previous(): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) return { success: false, message: "Boss, Spotify account connected nahi hai." };

    try {
      const res = await fetch("/api/spotify/playback/previous", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTimeout(() => this.fetchCurrentPlayback(), 800);
        return { success: true, message: "Pichhla gana play kar rahi hoon, Boss." };
      }
      return { success: false, message: "Previous track play nahi ho saka." };
    } catch (err: any) {
      return { success: false, message: err.message || "Previous track request failed." };
    }
  }

  public async setVolume(volumePercent: number): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) return { success: false, message: "Boss, Spotify account connected nahi hai." };

    const cleanVol = Math.min(100, Math.max(0, volumePercent));
    try {
      const res = await fetch("/api/spotify/playback/volume", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ volume: cleanVol }),
      });
      if (res.ok) {
        this.state.volume = cleanVol;
        this.notify();
        return { success: true, message: `Spotify volume ${cleanVol}% kar diya hai, Boss.` };
      }
      return { success: false, message: "Volume change nahi ho saka." };
    } catch (err: any) {
      return { success: false, message: err.message || "Volume request failed." };
    }
  }

  public async playMyPlaylist(): Promise<{ success: boolean; message: string }> {
    const token = await this.getValidAccessToken();
    if (!token) return { success: false, message: "Boss, Spotify account connected nahi hai." };

    try {
      const res = await fetch("/api/spotify/playback/playlists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const playlists = await res.json();
        if (Array.isArray(playlists) && playlists.length > 0) {
          const firstPlaylist = playlists[0];
          return this.play(undefined, "playlist");
        }
      }
      return this.play("Bollywood Top 50");
    } catch {
      return this.play("My Playlist");
    }
  }

  public disconnect() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zoya_spotify_tokens");
    }
    this.stopPollingStatus();
    this.state.isConnected = false;
    this.state.user = null;
    this.state.currentTrack = null;
    this.state.isPlaying = false;
    this.notify();
  }
}

export const spotifyService = new SpotifyManager();

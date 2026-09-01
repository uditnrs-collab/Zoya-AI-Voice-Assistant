import React, { useEffect, useState } from "react";
import { spotifyService, SpotifyState } from "../services/spotifyService";

interface SpotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskZoya: (text: string) => void;
}

export const SpotifyModal: React.FC<SpotifyModalProps> = ({
  isOpen,
  onClose,
  onAskZoya,
}) => {
  const [spotifyState, setSpotifyState] = useState<SpotifyState>({
    isConnected: false,
    user: null,
    currentTrack: null,
    isPlaying: false,
    activeDevice: false,
    volume: 50,
    error: null,
    customClientId: "",
    customClientSecret: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");

  useEffect(() => {
    const unsubscribe = spotifyService.subscribe((st) => {
      setSpotifyState(st);
      setClientIdInput(st.customClientId);
      setClientSecretInput(st.customClientSecret);
    });
    return () => unsubscribe();
  }, []);

  const handleConnect = async () => {
    const res = await spotifyService.initiateConnect();
    if (!res.success && res.message) {
      if (res.message.includes("Client ID")) {
        setShowConfig(true);
      }
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    spotifyService.setCustomCredentials(clientIdInput, clientSecretInput);
    setShowConfig(false);
  };

  const handlePlay = async () => {
    const res = await spotifyService.play();
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
  };

  const handlePause = async () => {
    const res = await spotifyService.pause();
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
  };

  const handleNext = async () => {
    const res = await spotifyService.next();
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
  };

  const handlePrevious = async () => {
    const res = await spotifyService.previous();
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    spotifyService.setVolume(val);
  };

  const handleSearchPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const res = await spotifyService.play(searchQuery.trim());
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
    setSearchQuery("");
  };

  const handlePlayMyPlaylist = async () => {
    const res = await spotifyService.playMyPlaylist();
    if (res.message) onAskZoya(`ZOYA_VOICE_OUT: ${res.message}`);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-neutral-950/95 border border-[#1DB954]/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(29,185,84,0.25)] text-neutral-200 font-sans max-h-[90vh] overflow-y-auto flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1DB954]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/40 flex items-center justify-center text-[#1DB954] text-xl shadow-[0_0_15px_rgba(29,185,84,0.3)]">
              🎵
            </div>
            <div>
              <h2 className="text-base font-mono font-bold tracking-wider text-white flex items-center gap-2">
                ZOYA SPOTIFY VOICE CONTROL
                {spotifyState.isConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 border border-[#1DB954]/60 text-[#1DB954]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-ping" />
                    CONNECTED
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Official Spotify OAuth & Web Playback API Integration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-[#1DB954] hover:bg-neutral-800 transition-all font-mono text-xs cursor-pointer"
              title="Spotify Developer Credentials Settings"
            >
              ⚙️ Config
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all font-mono text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Credentials Config Panel */}
        {showConfig && (
          <form
            onSubmit={handleSaveConfig}
            className="p-4 rounded-xl bg-black/70 border border-[#1DB954]/40 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#1DB954]">
                ⚙️ SPOTIFY DEVELOPER APP CONFIGURATION
              </span>
              <span className="text-[10px] text-neutral-500 font-mono">
                Redirect URI: {typeof window !== "undefined" ? `${window.location.origin}/auth/spotify/callback` : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  Spotify Client ID:
                </label>
                <input
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 4d7b8f9e..."
                  className="w-full py-1.5 px-3 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-[#1DB954] focus:outline-none focus:border-[#1DB954]"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                  Spotify Client Secret (Optional):
                </label>
                <input
                  type="password"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full py-1.5 px-3 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-[#1DB954] focus:outline-none focus:border-[#1DB954]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="px-3 py-1 rounded bg-neutral-800 text-neutral-400 text-xs font-mono"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-[#1DB954] text-black font-bold text-xs font-mono hover:bg-[#1ed760] shadow-[0_0_12px_rgba(29,185,84,0.4)]"
              >
                SAVE CREDENTIALS
              </button>
            </div>
          </form>
        )}

        {/* Connection Card */}
        {!spotifyState.isConnected ? (
          <div className="rounded-xl border border-dashed border-[#1DB954]/40 bg-black/50 p-6 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/40 flex items-center justify-center text-3xl text-[#1DB954]">
              🎧
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                CONNECT YOUR SPOTIFY ACCOUNT
              </p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1 max-w-md">
                Authorize ZOYA to control music playback, search tracks, skip songs, adjust volume, and play your playlists with voice commands.
              </p>
            </div>
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(29,185,84,0.4)] cursor-pointer flex items-center gap-2"
            >
              <span>CONNECT WITH SPOTIFY</span>
              <span>➔</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#1DB954]/30 bg-black/60 p-4 flex flex-col gap-4">
            {/* User Profile Info */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                {spotifyState.user?.image ? (
                  <img
                    src={spotifyState.user.image}
                    alt="Spotify Avatar"
                    className="w-10 h-10 rounded-full border border-[#1DB954]/50 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 flex items-center justify-center text-sm font-bold text-[#1DB954]">
                    {spotifyState.user?.displayName?.[0]?.toUpperCase() || "S"}
                  </div>
                )}
                <div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span>{spotifyState.user?.displayName || "Spotify User"}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                        spotifyState.user?.product === "premium"
                          ? "bg-amber-950 border border-amber-500/50 text-amber-400"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {spotifyState.user?.product || "FREE"}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    {spotifyState.deviceName
                      ? `Active Device: ${spotifyState.deviceName}`
                      : "No active device playing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => spotifyService.disconnect()}
                className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] font-mono hover:bg-rose-900 transition-all cursor-pointer"
              >
                DISCONNECT
              </button>
            </div>

            {/* Currently Playing Card */}
            {spotifyState.currentTrack ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                {spotifyState.currentTrack.image && (
                  <img
                    src={spotifyState.currentTrack.image}
                    alt="Album Cover"
                    className="w-14 h-14 rounded-md object-cover border border-neutral-700 shadow-md"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-bold text-white truncate flex items-center gap-1.5">
                    {spotifyState.isPlaying && (
                      <span className="inline-block w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                    )}
                    {spotifyState.currentTrack.name}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate">
                    {spotifyState.currentTrack.artist}
                  </div>
                  {spotifyState.currentTrack.album && (
                    <div className="text-[10px] text-neutral-500 font-mono truncate">
                      {spotifyState.currentTrack.album}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-center text-xs font-mono text-neutral-400">
                Spotify is connected. Start music via voice command or playback controls below.
              </div>
            )}

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-4 py-1">
              <button
                onClick={handlePrevious}
                title="Previous Track"
                className="p-2.5 rounded-full bg-neutral-900 border border-neutral-700 hover:border-[#1DB954] text-neutral-300 hover:text-[#1DB954] transition-all cursor-pointer"
              >
                ⏮️
              </button>

              {spotifyState.isPlaying ? (
                <button
                  onClick={handlePause}
                  title="Pause Music"
                  className="p-3 rounded-full bg-[#1DB954] text-black font-bold text-lg hover:bg-[#1ed760] transition-all shadow-[0_0_15px_rgba(29,185,84,0.4)] cursor-pointer"
                >
                  ⏸️
                </button>
              ) : (
                <button
                  onClick={handlePlay}
                  title="Play / Resume Music"
                  className="p-3 rounded-full bg-[#1DB954] text-black font-bold text-lg hover:bg-[#1ed760] transition-all shadow-[0_0_15px_rgba(29,185,84,0.4)] cursor-pointer"
                >
                  ▶️
                </button>
              )}

              <button
                onClick={handleNext}
                title="Next Track"
                className="p-2.5 rounded-full bg-neutral-900 border border-neutral-700 hover:border-[#1DB954] text-neutral-300 hover:text-[#1DB954] transition-all cursor-pointer"
              >
                ⏭️
              </button>
            </div>

            {/* Volume & Playlist Row */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-neutral-800">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-mono text-neutral-400">🔊 {spotifyState.volume}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spotifyState.volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-[#1DB954] cursor-pointer"
                />
              </div>

              <button
                onClick={handlePlayMyPlaylist}
                className="px-3 py-1.5 rounded-lg bg-black/80 border border-[#1DB954]/50 text-[#1DB954] text-xs font-mono font-bold hover:bg-[#1DB954] hover:text-black transition-all cursor-pointer"
              >
                ▶️ PLAY MY PLAYLIST
              </button>
            </div>
          </div>
        )}

        {/* Search & Play Song Input */}
        {spotifyState.isConnected && (
          <form onSubmit={handleSearchPlay} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search and play any track/artist on Spotify (e.g., 'Arijit Singh', 'Tum Hi Ho')..."
              className="w-full py-2.5 pl-4 pr-24 bg-black/80 border border-[#1DB954]/40 rounded-xl text-xs font-mono text-[#1DB954] placeholder-neutral-500 focus:outline-none focus:border-[#1DB954] focus:shadow-[0_0_15px_rgba(29,185,84,0.3)] transition-all"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-[#1DB954] text-black font-mono font-bold text-xs hover:bg-[#1ed760] transition-all disabled:opacity-40 cursor-pointer"
            >
              PLAY
            </button>
          </form>
        )}

        {/* Voice Commands Reference */}
        <div className="rounded-xl border border-neutral-800 bg-black/40 p-4">
          <div className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider mb-2">
            🎙️ ZOYA SPOTIFY VOICE COMMANDS
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-neutral-400">
            <div>• "Zoya, Spotify par music play karo"</div>
            <div>• "Pause the music / Roko"</div>
            <div>• "Next song / Agla gana"</div>
            <div>• "Previous song / Pichhla gana"</div>
            <div>• "Volume badhao / Volume kam karo"</div>
            <div>• "Mera playlist play karo"</div>
            <div>• "Zoya, Spotify par [song name] play karo"</div>
            <div>• "Connect Spotify"</div>
          </div>
        </div>
      </div>
    </div>
  );
};

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set.");
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Gemini Chat Stream API route (Low Latency Real-time Streaming)
  app.post("/api/chat-stream", async (req, res) => {
    try {
      const { prompt, systemInstruction, history } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing 'prompt' in request body" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.write(`data: ${JSON.stringify({ text: "Boss, API key configure nahi hai, lekin main active hoon! Aap text ya voice se baat kar sakte hain." })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      let contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        contents = history.map((item: any) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.text || item.parts?.[0]?.text || "" }]
        }));
      }
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let clientDisconnected = false;
      req.on("close", () => {
        clientDisconnected = true;
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      for await (const chunk of responseStream) {
        if (clientDisconnected) break;
        const chunkText = chunk.text;
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }

      if (!clientDisconnected) {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    } catch (err: any) {
      console.error("Server-side Gemini Chat Stream error:", err);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream");
      }
      res.write(`data: ${JSON.stringify({ text: "Ji boss, abhi connection me thodi rukawat aayi. Main aapke sath hoon!" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Gemini Chat API route (Non-streaming fallback)
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, systemInstruction, history } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Missing 'prompt' in request body" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ 
          text: "Boss, API key configure nahi hai, lekin main active hoon! Aap text ya voice se baat kar sakte hain." 
        });
      }

      let contents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        contents = history.map((item: any) => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.text || item.parts?.[0]?.text || "" }]
        }));
      }
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });

      const text = response.text || "Ji boss, aapka hukum sar aankhon par!";
      return res.json({ text });
    } catch (err: any) {
      console.error("Server-side Gemini Chat error:", err);
      return res.status(500).json({ 
        error: err.message || "Failed to generate AI response",
        text: "Ji boss, abhi thoda network issue hai, par main aapke sath hoon!" 
      });
    }
  });

  // Gemini Text-to-Speech (TTS) API route
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing 'text' parameter" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({ audioData: null });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      return res.json({ audioData });
    } catch (err: any) {
      console.error("Server-side TTS error:", err);
      return res.json({ audioData: null });
    }
  });

  // Gemini Vision API route for Screen Reading, Screen Analysis, Image Analysis, Camera Analysis
  app.post("/api/vision", async (req, res) => {
    try {
      const { imageBase64, prompt, type } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing 'imageBase64' in request body" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          text: "Boss, vision capability active hai lekin API key verify nahi ho pa rahi hai. Kripya check karein."
        });
      }

      // Clean base64 and determine mimeType
      let mimeType = "image/jpeg";
      let cleanData = imageBase64;
      if (imageBase64.startsWith("data:")) {
        const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          cleanData = matches[2];
        } else {
          cleanData = imageBase64.replace(/^data:[^;]+;base64,/, "");
        }
      }

      const defaultPromptByType: Record<string, string> = {
        "screen-read": "Analyze this captured computer screen carefully. Read and extract all visible text, UI buttons, open tabs, documents, menus, and headings. Provide a clear, natural, structured overview of everything visible on screen in your loyal Zoya tone (Hindi/Hinglish/English).",
        "screen-analysis": "Visually analyze this screen in detail. Explain what is happening on screen, identify active applications or websites, spot any visible errors or notifications, and guide the user on which buttons or actions are relevant in loyal Zoya tone.",
        "live-screen-companion": "You are ZOYA, live-monitoring Boss Udit's screen. Carefully analyze the active window, open app (code editor, terminal, browser, document, etc.), any errors or dialogues, and explain what is happening step-by-step in clear, conversational, friendly Hindi/Hinglish. Specifically state: 1) What is open and active right now, 2) Important details or errors Boss should know, 3) Recommended next step or button to press.",
        "screen-explain": "Explain the contents and purpose of this screen in simple, easy-to-understand Hindi/Hinglish. If code is open, explain the logic; if a web page/form is open, explain its function; if an error exists, explain how to resolve it.",
        "image-analysis": "Analyze this uploaded image in detail. Extract any readable text, describe key objects, diagrams, charts, UI elements, or documents clearly and concisely in Zoya's tone.",
        "camera-analysis": "Analyze this live camera view frame. Identify visible objects, people, products, text, signs, or surroundings clearly and helpfully in Zoya's tone.",
      };

      const systemPrompt = `You are ZOYA, a super-intelligent, polite, and loyal AI Assistant created for Boss Udit.
Your task is to analyze visual frames (screen captures, uploaded images, camera views) with pinpoint accuracy.
Tone & Style:
- Professional, respectful, and sharp ("Ji Boss", "Boss, screen par...").
- Language: Natural Hinglish/Hindi or English as appropriate.
- When reading screen or image text (OCR), transcribe accurately.
- Highlight key UI buttons, error messages, or points of interest.
- Be concise yet comprehensive so Boss Udit gets instant clarity.`;

      const finalPrompt = prompt || defaultPromptByType[type || "image-analysis"] || "Describe what you see in this image in detail.";

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanData,
                },
              },
              {
                text: finalPrompt,
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
        },
      });

      const text = response.text || "Ji Boss, image analyze ho gayi hai.";
      return res.json({ text });
    } catch (err: any) {
      console.error("Server-side Vision error:", err);
      return res.status(500).json({
        error: err.message || "Failed to process visual frame",
        text: "Ji boss, visual frame analyze karne me dikkat aayi. Kripya dobara try karein."
      });
    }
  });

  // Spotify OAuth Callback Route (popup sends postMessage to parent)
  app.get(["/auth/spotify/callback", "/auth/spotify/callback/"], (req, res) => {
    const { code, error } = req.query;
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spotify Authentication</title>
          <style>
            body { background: #000; color: #1DB954; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { border: 1px solid #1DB954; padding: 24px; border-radius: 12px; box-shadow: 0 0 20px rgba(29, 185, 84, 0.4); }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${error ? "Authentication Failed" : "Spotify Connected!"}</h2>
            <p>${error ? String(error) : "Closing window and returning to ZOYA..."}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'SPOTIFY_AUTH_RESULT',
                code: ${JSON.stringify(code || null)},
                error: ${JSON.stringify(error || null)}
              }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Spotify Auth URL Generation
  app.get("/api/spotify/auth-url", (req, res) => {
    const customClientId = (req.query.clientId as string) || "";
    const clientId = customClientId || process.env.SPOTIFY_CLIENT_ID || "";
    const redirectUri = (req.query.redirectUri as string) || `${req.protocol}://${req.get("host")}/auth/spotify/callback`;

    const scopes = [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-read-email",
      "user-read-private"
    ].join(" ");

    if (!clientId) {
      return res.json({
        configured: false,
        message: "SPOTIFY_CLIENT_ID not configured.",
        url: null,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes,
      show_dialog: "true",
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    return res.json({
      configured: true,
      url: authUrl,
      redirectUri,
    });
  });

  // Spotify Token Exchange
  app.post("/api/spotify/exchange", async (req, res) => {
    try {
      const { code, redirectUri, clientId, clientSecret } = req.body;
      const effectiveClientId = clientId || process.env.SPOTIFY_CLIENT_ID;
      const effectiveClientSecret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

      if (!code || !effectiveClientId) {
        return res.status(400).json({ error: "Missing authorization code or client ID" });
      }

      const bodyParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (effectiveClientSecret) {
        headers["Authorization"] = `Basic ${Buffer.from(`${effectiveClientId}:${effectiveClientSecret}`).toString("base64")}`;
      } else {
        bodyParams.append("client_id", effectiveClientId);
      }

      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers,
        body: bodyParams.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({ error: tokenData.error_description || tokenData.error || "Token exchange failed" });
      }

      return res.json(tokenData);
    } catch (err: any) {
      console.error("Spotify exchange error:", err);
      return res.status(500).json({ error: err.message || "Failed to exchange token" });
    }
  });

  // Spotify Token Refresh
  app.post("/api/spotify/refresh", async (req, res) => {
    try {
      const { refreshToken, clientId, clientSecret } = req.body;
      const effectiveClientId = clientId || process.env.SPOTIFY_CLIENT_ID;
      const effectiveClientSecret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;

      if (!refreshToken || !effectiveClientId) {
        return res.status(400).json({ error: "Missing refresh token or client ID" });
      }

      const bodyParams = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (effectiveClientSecret) {
        headers["Authorization"] = `Basic ${Buffer.from(`${effectiveClientId}:${effectiveClientSecret}`).toString("base64")}`;
      } else {
        bodyParams.append("client_id", effectiveClientId);
      }

      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers,
        body: bodyParams.toString(),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return res.status(tokenRes.status).json({ error: tokenData.error_description || tokenData.error || "Token refresh failed" });
      }

      return res.json(tokenData);
    } catch (err: any) {
      console.error("Spotify refresh error:", err);
      return res.status(500).json({ error: err.message || "Failed to refresh token" });
    }
  });

  // Spotify Playback Proxy (play, pause, next, prev, volume, search)
  app.post("/api/spotify/playback/:action", async (req, res) => {
    try {
      const { action } = req.params;
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing Spotify Bearer token" });
      }

      const token = authHeader.replace("Bearer ", "").trim();
      const spotifyHeaders = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      if (action === "status" || action === "current") {
        const playerRes = await fetch("https://api.spotify.com/v1/me/player", { headers: spotifyHeaders });
        if (playerRes.status === 204) {
          return res.json({ isPlaying: false, activeDevice: false, track: null });
        }
        if (!playerRes.ok) {
          return res.status(playerRes.status).json({ error: "Failed to get player status" });
        }
        const data = await playerRes.json();
        return res.json({
          isPlaying: data.is_playing,
          activeDevice: true,
          device: data.device?.name,
          volume: data.device?.volume_percent,
          track: data.item ? {
            name: data.item.name,
            artist: data.item.artists?.map((a: any) => a.name).join(", "),
            album: data.item.album?.name,
            image: data.item.album?.images?.[0]?.url,
            uri: data.item.uri,
            durationMs: data.item.duration_ms,
            progressMs: data.progress_ms,
          } : null,
        });
      }

      if (action === "play") {
        const { query, uri, type } = req.body || {};
        let playBody: any = {};

        if (query) {
          // Search first
          const searchType = type === "playlist" ? "playlist" : "track";
          const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${searchType}&limit=1`;
          const sRes = await fetch(searchUrl, { headers: spotifyHeaders });
          if (sRes.ok) {
            const sData = await sRes.json();
            if (searchType === "playlist" && sData.playlists?.items?.length > 0) {
              playBody = { context_uri: sData.playlists.items[0].uri };
            } else if (sData.tracks?.items?.length > 0) {
              playBody = { uris: [sData.tracks.items[0].uri] };
            }
          }
        } else if (uri) {
          if (uri.includes(":playlist:") || uri.includes(":album:")) {
            playBody = { context_uri: uri };
          } else {
            playBody = { uris: [uri] };
          }
        }

        const playRes = await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: spotifyHeaders,
          body: Object.keys(playBody).length > 0 ? JSON.stringify(playBody) : undefined,
        });

        if (playRes.status === 204 || playRes.status === 200) {
          return res.json({ success: true, message: "Playback started" });
        }
        if (playRes.status === 404) {
          return res.status(404).json({ error: "No active Spotify device found. Please open Spotify on your phone/PC first." });
        }
        if (playRes.status === 403) {
          return res.status(403).json({ error: "Spotify Premium is required for remote playback control." });
        }
        const errText = await playRes.text();
        return res.status(playRes.status).json({ error: errText || "Playback play failed" });
      }

      if (action === "pause") {
        const pauseRes = await fetch("https://api.spotify.com/v1/me/player/pause", {
          method: "PUT",
          headers: spotifyHeaders,
        });
        if (pauseRes.status === 204 || pauseRes.status === 200) {
          return res.json({ success: true, message: "Playback paused" });
        }
        if (pauseRes.status === 404) {
          return res.status(404).json({ error: "No active device found" });
        }
        return res.status(pauseRes.status).json({ error: "Failed to pause" });
      }

      if (action === "next") {
        const nextRes = await fetch("https://api.spotify.com/v1/me/player/next", {
          method: "POST",
          headers: spotifyHeaders,
        });
        if (nextRes.status === 204 || nextRes.status === 200) {
          return res.json({ success: true, message: "Skipped to next track" });
        }
        return res.status(nextRes.status).json({ error: "Failed to skip track" });
      }

      if (action === "previous") {
        const prevRes = await fetch("https://api.spotify.com/v1/me/player/previous", {
          method: "POST",
          headers: spotifyHeaders,
        });
        if (prevRes.status === 204 || prevRes.status === 200) {
          return res.json({ success: true, message: "Returned to previous track" });
        }
        return res.status(prevRes.status).json({ error: "Failed to return to previous track" });
      }

      if (action === "volume") {
        const { volume } = req.body;
        const volVal = Math.min(100, Math.max(0, parseInt(volume ?? 50, 10)));
        const volRes = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volVal}`, {
          method: "PUT",
          headers: spotifyHeaders,
        });
        if (volRes.status === 204 || volRes.status === 200) {
          return res.json({ success: true, volume: volVal });
        }
        return res.status(volRes.status).json({ error: "Failed to set volume" });
      }

      if (action === "playlists") {
        const pRes = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", { headers: spotifyHeaders });
        if (!pRes.ok) {
          return res.status(pRes.status).json({ error: "Failed to fetch playlists" });
        }
        const pData = await pRes.json();
        return res.json(pData.items || []);
      }

      if (action === "me") {
        const meRes = await fetch("https://api.spotify.com/v1/me", { headers: spotifyHeaders });
        if (!meRes.ok) {
          return res.status(meRes.status).json({ error: "Failed to fetch user profile" });
        }
        const meData = await meRes.json();
        return res.json({
          id: meData.id,
          displayName: meData.display_name,
          email: meData.email,
          product: meData.product, // 'premium' | 'free'
          image: meData.images?.[0]?.url,
        });
      }

      return res.status(400).json({ error: `Unknown action '${action}'` });
    } catch (err: any) {
      console.error("Spotify playback action error:", err);
      return res.status(500).json({ error: err.message || "Spotify request failed" });
    }
  });

  // YouTube search API route
  app.get("/api/youtube-search", async (req, res) => {
    try {
      const q = (req.query.q as string || "").trim();
      if (!q) {
        return res.status(400).json({ error: "Missing query parameter 'q'" });
      }

      // 1. Scraping YouTube search page directly from Node server
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`;
      const ytRes = await fetch(ytUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (ytRes.ok) {
        const html = await ytRes.text();
        const videoIdMatches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
        if (videoIdMatches && videoIdMatches.length > 0) {
          const firstMatch = videoIdMatches[0].match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (firstMatch && firstMatch[1]) {
            const videoId = firstMatch[1];
            return res.json({
              videoId,
              watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
              title: q,
            });
          }
        }
      }

      // 2. Fallback to Piped API
      try {
        const pipedRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(q)}&filter=videos`);
        if (pipedRes.ok) {
          const pipedData = await pipedRes.json();
          if (pipedData.items && pipedData.items.length > 0) {
            const item = pipedData.items[0];
            const url = item.url || "";
            const vIdMatch = url.match(/v=([a-zA-Z0-9_-]{11})/) || url.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
            const vId = vIdMatch ? vIdMatch[1] : (item.url ? item.url.replace("/watch?v=", "") : null);
            if (vId && vId.length === 11) {
              return res.json({
                videoId: vId,
                watchUrl: `https://www.youtube.com/watch?v=${vId}`,
                title: item.title || q,
              });
            }
          }
        }
      } catch (pipedErr) {
        console.warn("Piped fallback error:", pipedErr);
      }

      return res.status(404).json({ error: "No video found" });
    } catch (err: any) {
      console.error("YouTube search error:", err);
      return res.status(500).json({ error: err.message || "Failed to search video" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

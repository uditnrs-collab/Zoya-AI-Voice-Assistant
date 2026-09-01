import { GoogleGenAI } from "@google/genai";
import { processVoiceCallCommand, CallCommandResult } from "./callService";
import {
  formatZoyaTimeResponse,
  formatZoyaDateResponse,
  formatZoyaDayResponse,
  formatZoyaDateTimeResponse,
} from "../utils/dateTimeUtils";
import { calendarService } from "./calendarService";

export interface SystemActionPayload {
  type: "volume" | "brightness";
  mode: "set" | "increase" | "decrease" | "mute";
  value?: number; // 0 to 100
}

export interface MediaActionPayload {
  action: "play" | "pause" | "resume" | "forward" | "backward" | "close";
  query?: string;
  videoId?: string;
  title?: string;
  seconds?: number;
}

export interface ScrollActionPayload {
  direction: "up" | "down";
  amount: "small" | "medium" | "large";
}

export interface TapActionPayload {
  target: string;
  result?: {
    success: boolean;
    elementName?: string;
    errorReason?: "notFound" | "ambiguous" | "safety";
    safetyMessage?: string;
  };
}

export interface FaceActionPayload {
  mode: "enroll" | "verify" | "manage" | "delete" | "close";
}

export interface ScreenActionPayload {
  mode: "read" | "analysis" | "companion" | "explain" | "start" | "stop" | "open";
  query?: string;
}

export interface CameraActionPayload {
  mode: "start" | "stop" | "analyze" | "ocr" | "flip" | "open";
  query?: string;
}

export interface ImageActionPayload {
  mode: "analyze" | "ocr" | "open";
  query?: string;
}

export interface SpotifyActionPayload {
  action: "play" | "pause" | "next" | "previous" | "volume" | "playlist" | "connect" | "disconnect" | "open";
  query?: string;
  value?: number;
  mode?: "set" | "increase" | "decrease";
}

export interface CommandResult {
  action: string;
  url?: string;
  isBrowserAction: boolean;
  isHomeAction?: boolean;
  systemAction?: SystemActionPayload;
  mediaAction?: MediaActionPayload;
  scrollAction?: ScrollActionPayload;
  tapAction?: TapActionPayload;
  faceAction?: FaceActionPayload;
  screenAction?: ScreenActionPayload;
  cameraAction?: CameraActionPayload;
  imageAction?: ImageActionPayload;
  spotifyAction?: SpotifyActionPayload;
  callAction?: CallCommandResult;
  gitaAction?: boolean;
  backgroundServiceAction?: { enable: boolean };
  calendarAction?: "open" | "close" | "mark" | "info";
}

export function getZoyaHomeUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("ZOYA_HOME_URL");
    if (saved && saved.trim()) {
      return saved.trim();
    }
    return window.location.origin || window.location.href;
  }
  return "https://ais-dev-hiorcrnspeuny2rpk3wmd5-702078700351.asia-southeast1.run.app";
}

export function setZoyaHomeUrl(url: string): string {
  let cleanUrl = url.trim();
  if (cleanUrl) {
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("ZOYA_HOME_URL", cleanUrl);
    }
    return cleanUrl;
  }
  return getZoyaHomeUrl();
}

export function getWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Strip leading action words and zoya prefix
  let clean = lower
    .replace(/^(hey\s+)?zoya(\s+ai)?\s+/i, "")
    .replace(/^(open|launch|go to|visit|kholo|chalu karo|open karo)\s+/i, "")
    .replace(/\s+(kholo|open karo|chalu karo|khol do|chalao)$/i, "")
    .trim();

  if (!clean) clean = lower;

  // Exact mappings for popular websites and web apps
  const popularSites: Record<string, string> = {
    google: "https://www.google.com",
    youtube: "https://www.youtube.com",
    gmail: "https://mail.google.com",
    "google mail": "https://mail.google.com",
    maps: "https://maps.google.com",
    "google maps": "https://maps.google.com",
    drive: "https://drive.google.com",
    "google drive": "https://drive.google.com",
    photos: "https://photos.google.com",
    "google photos": "https://photos.google.com",
    gemini: "https://gemini.google.com",
    chatgpt: "https://chatgpt.com",
    "chat gpt": "https://chatgpt.com",
    claude: "https://claude.ai",
    github: "https://github.com",
    instagram: "https://www.instagram.com",
    facebook: "https://www.facebook.com",
    whatsapp: "https://web.whatsapp.com",
    "whatsapp web": "https://web.whatsapp.com",
    twitter: "https://x.com",
    x: "https://x.com",
    linkedin: "https://www.linkedin.com",
    spotify: "https://open.spotify.com",
    netflix: "https://www.netflix.com",
    amazon: "https://www.amazon.in",
    flipkart: "https://www.flipkart.com",
    hotstar: "https://www.hotstar.com",
    "disney hotstar": "https://www.hotstar.com",
    wikipedia: "https://www.wikipedia.org",
    reddit: "https://www.reddit.com",
    canva: "https://www.canva.com",
    stackoverflow: "https://stackoverflow.com",
    "stack overflow": "https://stackoverflow.com",
    pinterest: "https://www.pinterest.com",
    telegram: "https://web.telegram.org",
    snapchat: "https://web.snapchat.com",
    zoom: "https://zoom.us",
  };

  if (popularSites[clean]) {
    return popularSites[clean];
  }

  // Custom schemes (e.g. tel:, mailto:)
  if (/^(tel|mailto|whatsapp):/i.test(clean)) {
    return clean;
  }

  // Already a full URL
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // Starts with www.
  if (/^www\./i.test(clean)) {
    return `https://${clean}`;
  }

  // Contains valid domain suffix like example.com or site.co.in
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/.test(clean)) {
    return `https://www.${clean.replace(/^www\./, "")}`;
  }

  // Single word without spaces and only valid domain characters -> assume .com domain
  if (/^[a-zA-Z0-9-]+$/.test(clean)) {
    return `https://www.${clean}.com`;
  }

  // Multi-word or special-character search query fallback -> Google Search
  return `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
}

export async function getYouTubePlayDetails(query: string): Promise<{ videoId?: string; watchUrl: string; title: string }> {
  const cleanQ = query
    .replace(/^(hey\s+)?zoya(\s+ai)?\s*/i, "")
    .replace(/^(play|chalao|sunao|search|youtube\s+pe|youtube\s+par)\s+/i, "")
    .replace(/\s+(on|pe|par|in)\s+youtube$/i, "")
    .replace(/\s+(play|chalao|sunao|song|video|gāna|gaana|play\s*karo)$/i, "")
    .trim();

  const finalQuery = cleanQ || query;

  // 1. Direct URL or Video ID match
  const directMatch = finalQuery.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|^)([a-zA-Z0-9_-]{11})(?:[&?%]|$)/);
  if (directMatch && directMatch[1] && directMatch[1].length === 11) {
    return {
      videoId: directMatch[1],
      watchUrl: `https://www.youtube.com/watch?v=${directMatch[1]}`,
      title: "YouTube Video",
    };
  }

  // 2. Try backend YouTube search route
  try {
    const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(finalQuery)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.videoId) {
        return { videoId: data.videoId, watchUrl: data.watchUrl || `https://www.youtube.com/watch?v=${data.videoId}`, title: finalQuery };
      }
    }
  } catch (e) {
    console.warn("Backend YouTube search failed:", e);
  }

  // 3. Try public Piped / Invidious API
  try {
    const pipedRes = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(finalQuery)}&filter=videos`);
    if (pipedRes.ok) {
      const pipedData = await pipedRes.json();
      if (pipedData.items && pipedData.items.length > 0) {
        const item = pipedData.items[0];
        const url = item.url || "";
        const vIdMatch = url.match(/v=([a-zA-Z0-9_-]{11})/) || url.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
        const vId = vIdMatch ? vIdMatch[1] : (item.url ? item.url.replace("/watch?v=", "") : null);
        if (vId && vId.length === 11) {
          return {
            videoId: vId,
            watchUrl: `https://www.youtube.com/watch?v=${vId}`,
            title: item.title || finalQuery,
          };
        }
      }
    }
  } catch (pipedErr) {
    console.warn("Piped lookup failed:", pipedErr);
  }

  // 4. Try Gemini AI video ID lookup as high-accuracy fallback
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{
          parts: [{
            text: `What is the exact 11-character YouTube video ID for the song or video: "${finalQuery}"? Respond with ONLY the 11-character video ID string (e.g., BddP6PYo2gs or dQw4w9WgXcQ). Do NOT write any extra text, punctuation, or formatting.`
          }]
        }]
      });
      const candidate = (res.text || "").trim();
      const vMatch = candidate.match(/([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        return {
          videoId: vMatch[1],
          watchUrl: `https://www.youtube.com/watch?v=${vMatch[1]}`,
          title: finalQuery,
        };
      }
    } catch (geminiErr) {
      console.warn("Gemini video ID lookup error:", geminiErr);
    }
  }

  return { watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(finalQuery)}`, title: finalQuery };
}

export async function getYouTubePlayUrl(query: string): Promise<string> {
  const details = await getYouTubePlayDetails(query);
  return details.watchUrl;
}

export async function processCommand(command: string): Promise<CommandResult> {
  let lowerCmd = command.toLowerCase().trim();

  // Strip prefix "Zoya", "Hey Zoya", "Zoya AI"
  lowerCmd = lowerCmd
    .replace(/^(hey\s+)?zoya(\s+ai)?\s*[,:]?\s*/i, "")
    .replace(/\s*[,:]?\s*(hey\s+)?zoya(\s+ai)?$/i, "")
    .trim();

  // =========================================================
  // 0.0 VOICE CALL CONTROL (HIGHEST PRIORITY CALL INTENTS)
  // =========================================================
  const callResult = processVoiceCallCommand(command);
  if (callResult) {
    return {
      action: callResult.message,
      isBrowserAction: true,
      callAction: callResult,
    };
  }

  // =========================================================
  // 0. ZOYA HOME PAGE NAVIGATION (HIGHEST PRIORITY)
  // =========================================================
  const homeKeywords = [
    "apne page", "apne home page", "zoya ke page", "zoya home page",
    "home page pe", "home page par", "zoya page", "apne page par", "apne page pe"
  ];

  const isReturnHomePhrase =
    homeKeywords.some((kw) => lowerCmd.includes(kw)) ||
    lowerCmd === "home page" ||
    lowerCmd === "go home" ||
    lowerCmd === "home" ||
    ((lowerCmd.includes("page") || lowerCmd.includes("home")) &&
      (lowerCmd.includes("wapas") || lowerCmd.includes("chalo") || lowerCmd.includes("jao") || lowerCmd.includes("aao")));

  if (isReturnHomePhrase) {
    const homeUrl = getZoyaHomeUrl();
    return {
      action: "Ji boss, main apne page par wapas aa gayi.",
      url: homeUrl,
      isBrowserAction: true,
      isHomeAction: true,
    };
  }

  // =========================================================
  // 0.01 REAL-TIME CURRENT DATE & TIME VOICE RESPONSES
  // (Instant, accurate search & verify, strictly only when asked by Boss)
  // =========================================================

  // Combined Date & Time query
  const isDateTimeCmd =
    /\b(date\s*(?:and|aur|&|\+)\s*time|time\s*(?:and|aur|&|\+)\s*date)\b/i.test(lowerCmd) ||
    (lowerCmd.includes("date") && lowerCmd.includes("time") && (lowerCmd.includes("kya") || lowerCmd.includes("batao") || lowerCmd.includes("what") || lowerCmd.includes("current") || lowerCmd.includes("aaj")));

  if (isDateTimeCmd) {
    return {
      action: formatZoyaDateTimeResponse(),
      isBrowserAction: false,
    };
  }

  // Day of Week query (e.g. "aaj kaun sa din hai", "what day is today")
  const isDayCmd =
    /\b(aaj\s+kaun\s*sa\s+din|aaj\s+konsa\s+din|aaj\s+kya\s+din|aaj\s+din\s+kaun\s*sa|aaj\s+din\s+kya|aaj\s+kaun\s*sa\s+vaar|aaj\s+konsa\s+vaar)\b/i.test(lowerCmd) ||
    lowerCmd === "what day is today" ||
    lowerCmd === "which day is today" ||
    lowerCmd === "today's day" ||
    lowerCmd === "aaj kya din hai";

  if (isDayCmd) {
    return {
      action: formatZoyaDayResponse(),
      isBrowserAction: false,
    };
  }

  // Date query (e.g. "aaj kaun si date hai", "aaj konsi tareekh hai", "today's date")
  const isDateCmd =
    /\b(aaj\s+(?:kaun\s*si|konsi|kya|ki)?\s*(?:date|taareekh|tareekh|tarikh))\b/i.test(lowerCmd) ||
    /\b(?:date|taareekh|tareekh|tarikh)\s+(?:kya\s+hai|batao|kya\s+ho\s+rahi\s+hai)\b/i.test(lowerCmd) ||
    lowerCmd === "today's date" ||
    lowerCmd === "what is today's date" ||
    lowerCmd === "what's the date" ||
    lowerCmd === "current date" ||
    lowerCmd === "date batao" ||
    lowerCmd === "aaj ki date";

  if (isDateCmd) {
    return {
      action: formatZoyaDateResponse(),
      isBrowserAction: false,
    };
  }

  // Time query (e.g. "zoya abhi time kitna ho raha hai", "abhi time kitna ho raha hai", "kitne baje hain", "what is the time", "samay kya hai")
  const isTimeCmd =
    /\b(abhi\s+)?(time|samay|waqt)\s+(kya\s+hai|kya\s+ho\s+raha\s+hai|kitna\s+ho\s+raha\s+hai|batao|bataiye|kitna\s+hua|hua\s+hai)\b/i.test(lowerCmd) ||
    /\b(kitne\s+baje\s+hain|kitne\s+baje|kitna\s+baja\s+hai|kitna\s+baja)\b/i.test(lowerCmd) ||
    lowerCmd.includes("time kitna ho raha") ||
    lowerCmd.includes("time kitna hua") ||
    lowerCmd.includes("time kitna baje") ||
    lowerCmd === "what is the time" ||
    lowerCmd === "what time is it" ||
    lowerCmd === "what's the time" ||
    lowerCmd === "current time" ||
    lowerCmd === "time batao" ||
    lowerCmd === "time kya hai" ||
    lowerCmd === "time kya ho raha hai" ||
    lowerCmd === "samay kya hai" ||
    lowerCmd === "samay batao" ||
    lowerCmd === "waqt kya hai";

  if (isTimeCmd) {
    return {
      action: formatZoyaTimeResponse(),
      isBrowserAction: false,
    };
  }

  // =========================================================
  // 0.02 INTELLIGENT CALENDAR VOICE CONTROLS & DATE MARKING
  // =========================================================

  // 1. Open / Close Calendar Modal Commands
  const isOpenCalendarCmd =
    lowerCmd === "open calendar" ||
    lowerCmd === "calendar open karo" ||
    lowerCmd === "calendar kholo" ||
    lowerCmd === "calendar dikhao" ||
    lowerCmd === "show calendar" ||
    lowerCmd === "view calendar" ||
    lowerCmd === "calendar chalu karo" ||
    (lowerCmd.includes("calendar") && (lowerCmd.includes("khol") || lowerCmd.includes("open") || lowerCmd.includes("dikha") || lowerCmd.includes("show")));

  if (isOpenCalendarCmd) {
    return {
      action: "Ji boss, ZOYA Calendar khol diya hai. Aap kisi bhi tareekh ko inspect kar sakte hain ya nayi date mark kar sakte hain.",
      isBrowserAction: false,
      calendarAction: "open",
    };
  }

  const isCloseCalendarCmd =
    lowerCmd === "close calendar" ||
    lowerCmd === "calendar band karo" ||
    lowerCmd === "calendar close karo" ||
    (lowerCmd.includes("calendar") && (lowerCmd.includes("band") || lowerCmd.includes("close")));

  if (isCloseCalendarCmd) {
    return {
      action: "Ji boss, Calendar band kar diya gaya hai.",
      isBrowserAction: false,
      calendarAction: "close",
    };
  }

  // 2. Mark Date in Calendar Voice Command
  // e.g. "Zoya 15 august ko independence day mark kar do", "calendar me mark karo meeting", "kal ke liye meeting mark karo"
  const isMarkDateCmd =
    (lowerCmd.includes("mark") || lowerCmd.includes("add") || lowerCmd.includes("note") || lowerCmd.includes("save")) &&
    (lowerCmd.includes("calendar") || lowerCmd.includes("date") || lowerCmd.includes("tareekh") || lowerCmd.includes("tarikh") || lowerCmd.includes("kal") || lowerCmd.includes("parso") || lowerCmd.includes("ko"));

  if (isMarkDateCmd) {
    const markResult = calendarService.handleMarkDateVoiceCommand(lowerCmd);
    return {
      action: markResult.message,
      isBrowserAction: false,
      calendarAction: "open",
    };
  }

  // 3. "Kitni Tareekh Ko Kya Hai" / "Is Tareekh Ko Kya Hai" / Festival Lookup Command
  // e.g. "15 august ko kya hai", "2 october ko kya hai", "aaj kya hai", "kal kya hai", "diwali kab hai", "holi kab hai"
  const isWhatsOnDateCmd =
    /\b(ko\s+kya\s+hai|ko\s+kya\s+hoga|par\s+kya\s+hai|kab\s+hai|kab\s+hoga)\b/i.test(lowerCmd) ||
    (lowerCmd.includes("kya hai") && (lowerCmd.includes("august") || lowerCmd.includes("january") || lowerCmd.includes("february") || lowerCmd.includes("march") || lowerCmd.includes("april") || lowerCmd.includes("may") || lowerCmd.includes("june") || lowerCmd.includes("july") || lowerCmd.includes("september") || lowerCmd.includes("october") || lowerCmd.includes("november") || lowerCmd.includes("december") || lowerCmd.includes("tareekh") || lowerCmd.includes("tarikh") || lowerCmd.includes("kal") || lowerCmd.includes("parso"))) ||
    /\b(diwali|deepawali|holi|raksha\s*bandhan|eid|christmas|independence\s*day|republic\s*day|gandhi\s*jayanti|janmashtami|shivratri|navratri)\s+(kab\s+hai|date)\b/i.test(lowerCmd);

  if (isWhatsOnDateCmd) {
    const spoken = calendarService.getWhatsOnDateSpoken(lowerCmd);
    return {
      action: spoken,
      isBrowserAction: false,
      calendarAction: "info",
    };
  }

  // =========================================================
  // 0.04 ANDROID FOREGROUND / BACKGROUND SERVICE CONTROL
  // =========================================================
  const isStartBgServiceCmd =
    lowerCmd === "start background service" ||
    lowerCmd === "enable background service" ||
    lowerCmd === "background service chalu karo" ||
    lowerCmd === "background service start karo" ||
    lowerCmd === "background me chalo" ||
    lowerCmd === "background me active raho" ||
    lowerCmd === "run in background" ||
    (lowerCmd.includes("background") && (lowerCmd.includes("start") || lowerCmd.includes("chalu") || lowerCmd.includes("on") || lowerCmd.includes("enable")));

  if (isStartBgServiceCmd) {
    return {
      action: "Ji boss, ZOYA Android Foreground Service सक्रिय कर दी गई है। अब मैं बैकग्राउंड में भी लगातार अलर्ट रहूँगी।",
      isBrowserAction: false,
      backgroundServiceAction: { enable: true },
    };
  }

  const isStopBgServiceCmd =
    lowerCmd === "stop background service" ||
    lowerCmd === "disable background service" ||
    lowerCmd === "background service band karo" ||
    lowerCmd === "background service roko" ||
    lowerCmd === "stop background" ||
    (lowerCmd.includes("background") && (lowerCmd.includes("stop") || lowerCmd.includes("band") || lowerCmd.includes("off") || lowerCmd.includes("disable") || lowerCmd.includes("roko")));

  if (isStopBgServiceCmd) {
    return {
      action: "Ji boss, ZOYA Foreground Service बंद कर दी गई है।",
      isBrowserAction: false,
      backgroundServiceAction: { enable: false },
    };
  }

  // =========================================================
  // 0.4 SCREEN READING, LIVE COMPANION & REAL-TIME SCREEN ANALYSIS (GEMINI VISION)
  // =========================================================
  const isLiveCompanionCmd =
    lowerCmd.includes("live screen") ||
    lowerCmd.includes("live screen dekho") ||
    lowerCmd.includes("live screen dekh") ||
    lowerCmd.includes("live screen companion") ||
    lowerCmd.includes("screen samjhao") ||
    lowerCmd.includes("screen samjha") ||
    lowerCmd.includes("screen explain karo") ||
    lowerCmd.includes("screen explain kro") ||
    lowerCmd.includes("mujhe screen samjhao") ||
    lowerCmd.includes("screen par kya chal raha hai samjhao") ||
    lowerCmd.includes("screen guide karo") ||
    lowerCmd.includes("screen guide kro");

  if (isLiveCompanionCmd) {
    return {
      action: "Ji boss, main aapki screen live dekhkar step-by-step samjha rahi hu.",
      isBrowserAction: false,
      screenAction: { mode: "companion", query: command },
    };
  }

  const isScreenReadCmd =
    lowerCmd.includes("screen par kya hai") ||
    lowerCmd.includes("screen par kya likha hai") ||
    lowerCmd.includes("screen padho") ||
    lowerCmd.includes("screen padh do") ||
    lowerCmd.includes("screen padh ke batao") ||
    lowerCmd.includes("screen read karo") ||
    lowerCmd.includes("screen read kro") ||
    lowerCmd.includes("read my screen") ||
    lowerCmd.includes("what is on my screen") ||
    lowerCmd.includes("what's on my screen") ||
    lowerCmd.includes("screen reading start") ||
    lowerCmd.includes("start screen reading") ||
    lowerCmd.includes("screen reader") ||
    (lowerCmd.includes("screen") && (lowerCmd.includes("padh") || lowerCmd.includes("read")));

  if (isScreenReadCmd) {
    return {
      action: "Ji boss, screen analyze karke padh rahi hu.",
      isBrowserAction: false,
      screenAction: { mode: "read" },
    };
  }

  const isScreenAnalysisCmd =
    lowerCmd.includes("screen par kya ho raha hai") ||
    lowerCmd.includes("screen par error") ||
    lowerCmd.includes("page mein error") ||
    lowerCmd.includes("screen explain karo") ||
    lowerCmd.includes("screen explain kro") ||
    lowerCmd.includes("screen analysis") ||
    lowerCmd.includes("screen analyze") ||
    lowerCmd.includes("screen analyse") ||
    lowerCmd.includes("screen scan") ||
    lowerCmd.includes("screen check") ||
    lowerCmd.includes("screen dekho") ||
    lowerCmd.includes("screen dekh kar") ||
    lowerCmd.includes("screen dekh ke") ||
    lowerCmd.includes("meri screen") ||
    lowerCmd.includes("kaunsa button dabana hai") ||
    (lowerCmd.includes("screen") &&
      (lowerCmd.includes("error") ||
        lowerCmd.includes("explain") ||
        lowerCmd.includes("analyze") ||
        lowerCmd.includes("analyse") ||
        lowerCmd.includes("analysis") ||
        lowerCmd.includes("kro") ||
        lowerCmd.includes("karo") ||
        lowerCmd.includes("dikhao") ||
        lowerCmd.includes("batao") ||
        lowerCmd.includes("check") ||
        lowerCmd.includes("dekho")));

  if (isScreenAnalysisCmd) {
    return {
      action: "Ji boss, screen ka real-time visual analysis kar rahi hu.",
      isBrowserAction: false,
      screenAction: { mode: "analysis", query: command },
    };
  }

  if (
    lowerCmd === "start screen sharing" ||
    lowerCmd === "screen share on" ||
    lowerCmd === "screen share start karo" ||
    lowerCmd === "screen share start kro" ||
    lowerCmd === "start screen share" ||
    lowerCmd === "screen share karo" ||
    lowerCmd === "screen share kro" ||
    lowerCmd === "open screen vision" ||
    lowerCmd === "screen vision open karo" ||
    lowerCmd === "screen vision"
  ) {
    return {
      action: "Ji boss, screen sharing start karne ke liye permission dijiye.",
      isBrowserAction: false,
      screenAction: { mode: "start" },
    };
  }

  if (
    lowerCmd === "stop screen reading" ||
    lowerCmd === "stop screen share" ||
    lowerCmd === "stop screen sharing" ||
    lowerCmd === "screen reading band karo" ||
    lowerCmd === "screen reading band kro" ||
    lowerCmd === "screen share band karo" ||
    lowerCmd === "screen share band kro" ||
    lowerCmd === "stop screen analysis"
  ) {
    return {
      action: "Screen reading stop kar di hai, Boss.",
      isBrowserAction: false,
      screenAction: { mode: "stop" },
    };
  }

  // =========================================================
  // 0.5 CAMERA ANALYSIS & VISION (OBJECT DETECTION / OCR)
  // =========================================================
  const isCameraAnalyzeCmd =
    lowerCmd.includes("camera mein kya dikh raha hai") ||
    lowerCmd.includes("camera dekho") ||
    lowerCmd.includes("saamne kya hai") ||
    lowerCmd.includes("object identify karo") ||
    lowerCmd.includes("object pehchano") ||
    lowerCmd.includes("identify this object") ||
    lowerCmd.includes("camera visual analysis") ||
    (lowerCmd.includes("camera") && (lowerCmd.includes("dikh") || lowerCmd.includes("dekho") || lowerCmd.includes("identify") || lowerCmd.includes("analyze")));

  if (isCameraAnalyzeCmd) {
    return {
      action: "Ji boss, camera view analyze kar rahi hu.",
      isBrowserAction: false,
      cameraAction: { mode: "analyze", query: command },
    };
  }

  const isCameraOcrCmd =
    lowerCmd.includes("jo saamne likha hai woh padho") ||
    lowerCmd.includes("camera se text padho") ||
    lowerCmd.includes("camera text read") ||
    lowerCmd.includes("saamne ka text padho");

  if (isCameraOcrCmd) {
    return {
      action: "Ji boss, camera me visible text read kar rahi hu.",
      isBrowserAction: false,
      cameraAction: { mode: "ocr" },
    };
  }

  if (
    lowerCmd === "camera on karo" ||
    lowerCmd === "start camera" ||
    lowerCmd === "open camera" ||
    lowerCmd === "camera start" ||
    lowerCmd === "camera kholo"
  ) {
    return {
      action: "Camera feed chalu kar rahi hu, Boss.",
      isBrowserAction: false,
      cameraAction: { mode: "start" },
    };
  }

  if (
    lowerCmd === "camera band karo" ||
    lowerCmd === "stop camera" ||
    lowerCmd === "close camera" ||
    lowerCmd === "turn off camera" ||
    lowerCmd === "camera roko"
  ) {
    return {
      action: "Camera band kar diya hai, Boss.",
      isBrowserAction: false,
      cameraAction: { mode: "stop" },
    };
  }

  if (lowerCmd.includes("flip camera") || lowerCmd.includes("camera badlo") || lowerCmd.includes("switch camera")) {
    return {
      action: "Camera switch kar rahi hu, Boss.",
      isBrowserAction: false,
      cameraAction: { mode: "flip" },
    };
  }

  // =========================================================
  // 0.6 IMAGE ANALYSIS & OCR (MULTIMODAL UNDERSTANDING)
  // =========================================================
  const isImageAnalyzeCmd =
    lowerCmd.includes("image mein kya hai") ||
    lowerCmd.includes("image analyze karo") ||
    lowerCmd.includes("photo check karo") ||
    lowerCmd.includes("photo analyze karo") ||
    lowerCmd.includes("screenshot analyze karo") ||
    lowerCmd.includes("screenshot ki problem") ||
    (lowerCmd.includes("image") && (lowerCmd.includes("kya hai") || lowerCmd.includes("analyze") || lowerCmd.includes("explain")));

  if (isImageAnalyzeCmd) {
    return {
      action: "Ji boss, image analyze kar rahi hu.",
      isBrowserAction: false,
      imageAction: { mode: "analyze", query: command },
    };
  }

  const isImageOcrCmd =
    lowerCmd.includes("photo mein jo text hai") ||
    lowerCmd.includes("image se text nikalo") ||
    lowerCmd.includes("image ka text padho") ||
    lowerCmd.includes("image ocr");

  if (isImageOcrCmd) {
    return {
      action: "Ji boss, image se text extract kar rahi hu.",
      isBrowserAction: false,
      imageAction: { mode: "ocr" },
    };
  }

  if (
    lowerCmd.includes("upload image") ||
    lowerCmd.includes("image upload") ||
    lowerCmd.includes("open image analysis") ||
    lowerCmd === "image modal"
  ) {
    return {
      action: "Image Analysis portal khol rahi hu, Boss.",
      isBrowserAction: false,
      imageAction: { mode: "open" },
    };
  }

  // =========================================================
  // 0.7 OFFICIAL SPOTIFY VOICE CONTROL & PLAYBACK
  // =========================================================
  const isSpotifyPause =
    lowerCmd === "spotify pause" ||
    lowerCmd === "spotify pause karo" ||
    lowerCmd === "spotify band karo" ||
    lowerCmd === "spotify roko" ||
    lowerCmd === "pause spotify" ||
    lowerCmd === "pause the music" ||
    lowerCmd === "music pause karo" ||
    lowerCmd === "music roko";

  if (isSpotifyPause) {
    return {
      action: "Spotify pause kar rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "pause" },
    };
  }

  const isSpotifyNext =
    lowerCmd === "next song" ||
    lowerCmd === "agla gana" ||
    lowerCmd === "spotify next" ||
    lowerCmd === "next track" ||
    lowerCmd === "skip song" ||
    lowerCmd === "gana badlo";

  if (isSpotifyNext) {
    return {
      action: "Agla gana chala rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "next" },
    };
  }

  const isSpotifyPrev =
    lowerCmd === "previous song" ||
    lowerCmd === "pichhla gana" ||
    lowerCmd === "spotify previous" ||
    lowerCmd === "prev song" ||
    lowerCmd === "previous track";

  if (isSpotifyPrev) {
    return {
      action: "Pichhla gana chala rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "previous" },
    };
  }

  const isSpotifyPlaylist =
    lowerCmd.includes("mera playlist play karo") ||
    lowerCmd.includes("meri playlist play karo") ||
    lowerCmd.includes("play my playlist") ||
    lowerCmd.includes("spotify playlist chalao");

  if (isSpotifyPlaylist) {
    return {
      action: "Aapki playlist play kar rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "playlist" },
    };
  }

  const isSpotifyConnect =
    lowerCmd === "connect spotify" ||
    lowerCmd === "spotify connect karo" ||
    lowerCmd === "spotify login" ||
    lowerCmd === "spotify connect" ||
    lowerCmd === "open spotify control";

  if (isSpotifyConnect) {
    return {
      action: "Spotify control panel khol rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "connect" },
    };
  }

  const isSpotifyVolumeCmd = lowerCmd.match(/spotify\s+volume\s+(?:ko\s+|to\s+)?(\d{1,3})/i);
  if (isSpotifyVolumeCmd) {
    const vol = parseInt(isSpotifyVolumeCmd[1], 10);
    return {
      action: `Spotify volume ${vol}% set kar rahi hu, Boss.`,
      isBrowserAction: false,
      spotifyAction: { action: "volume", value: vol },
    };
  }

  const isSpotifyPlaySpecific = lowerCmd.match(/(?:spotify\s+(?:par|pe)\s+(?:play|chalao|sunao)\s+(.+))|(?:(?:play|chalao|sunao)\s+(.+)\s+(?:on|pe|par)\s+spotify)/i);
  if (isSpotifyPlaySpecific) {
    const trackName = (isSpotifyPlaySpecific[1] || isSpotifyPlaySpecific[2] || "").trim();
    return {
      action: `Spotify par '${trackName}' play kar rahi hu, Boss.`,
      isBrowserAction: false,
      spotifyAction: { action: "play", query: trackName },
    };
  }

  if (
    lowerCmd === "spotify play karo" ||
    lowerCmd === "spotify chalao" ||
    lowerCmd === "spotify sunao" ||
    lowerCmd === "play spotify" ||
    lowerCmd === "resume spotify"
  ) {
    return {
      action: "Spotify music play kar rahi hu, Boss.",
      isBrowserAction: false,
      spotifyAction: { action: "play" },
    };
  }

  // =========================================================
  // 0.1 SCROLL CONTROL
  // =========================================================
  const isScrollCmd =
    lowerCmd.includes("scroll") ||
    lowerCmd.includes("page neeche") ||
    lowerCmd.includes("page upar") ||
    lowerCmd.includes("page niche") ||
    lowerCmd.includes("page uper") ||
    lowerCmd.includes("neeche karo") ||
    lowerCmd.includes("upar karo") ||
    lowerCmd.includes("niche karo") ||
    lowerCmd.includes("uper karo") ||
    lowerCmd.includes("neeche kro") ||
    lowerCmd.includes("upar kro") ||
    lowerCmd.includes("niche kro") ||
    lowerCmd.includes("uper kro") ||
    lowerCmd.includes("thoda upar") ||
    lowerCmd.includes("thoda neeche") ||
    lowerCmd.includes("thoda uper") ||
    lowerCmd.includes("thoda niche") ||
    lowerCmd.includes("neeche jao") ||
    lowerCmd.includes("upar jao") ||
    lowerCmd.includes("neeche chalo") ||
    lowerCmd.includes("upar chalo") ||
    lowerCmd.includes("scroll up") ||
    lowerCmd.includes("scroll down") ||
    lowerCmd.includes("down scroll") ||
    lowerCmd.includes("up scroll") ||
    lowerCmd.includes("screen scroll") ||
    lowerCmd.includes("scroll screen") ||
    lowerCmd.includes("screen neeche") ||
    lowerCmd.includes("screen upar") ||
    lowerCmd.includes("screen niche") ||
    lowerCmd.includes("screen uper");

  if (isScrollCmd) {
    const isUp = lowerCmd.includes("upar") || lowerCmd.includes("up") || lowerCmd.includes("uper");
    let amount: "small" | "medium" | "large" = "medium";
    if (lowerCmd.includes("thoda") || lowerCmd.includes("little") || lowerCmd.includes("small") || lowerCmd.includes("halka")) {
      amount = "small";
    } else if (lowerCmd.includes("aur") || lowerCmd.includes("fast") || lowerCmd.includes("large") || lowerCmd.includes("a lot") || lowerCmd.includes("pura") || lowerCmd.includes("zyada") || lowerCmd.includes("jyada")) {
      amount = "large";
    }

    return {
      action: isUp
        ? "Ji boss, screen upar scroll kar di hai."
        : "Ji boss, screen neeche scroll kar di hai.",
      isBrowserAction: true,
      scrollAction: {
        direction: isUp ? "up" : "down",
        amount,
      },
    };
  }

  // =========================================================
  // 0.2 TAP / CLICK CONTROL
  // =========================================================
  const isTapCmd =
    lowerCmd.includes("tap") ||
    lowerCmd.includes("click") ||
    lowerCmd.includes("daba") ||
    lowerCmd.includes("select karo") ||
    lowerCmd.includes("press karo") ||
    lowerCmd.includes("isko open") ||
    lowerCmd.includes("pehle wale") ||
    lowerCmd.includes("doosre wale") ||
    lowerCmd.includes("teesre wale") ||
    lowerCmd.includes("yaha tap") ||
    lowerCmd.includes("yahan tap") ||
    lowerCmd.includes("ispe tap") ||
    lowerCmd.includes("is pe tap") ||
    lowerCmd.includes("is button") ||
    lowerCmd.includes("yaha click") ||
    lowerCmd.includes("yahan click") ||
    lowerCmd.includes("ispe click") ||
    lowerCmd.includes("is pe click");

  if (isTapCmd) {
    let target = lowerCmd
      .replace(/\b(zoya|please|hey)\b/gi, "")
      .replace(/\b(tap|click|karo|select|press|open|daba|do)\b/gi, "")
      .trim();

    if (!target || target === "yaha" || target === "ispe" || target === "yahan" || target === "is pe") {
      target = "yaha";
    }

    return {
      action: "Ji boss.",
      isBrowserAction: true,
      tapAction: {
        target: target || "yaha",
      },
    };
  }

  // =========================================================
  // 0.3 FACE RECOGNITION CONTROL (UDIT OWNER VERIFICATION)
  // =========================================================
  const isFaceCmd =
    lowerCmd.includes("face") ||
    lowerCmd.includes("chehra") ||
    lowerCmd.includes("face recognition") ||
    lowerCmd.includes("who am i") ||
    lowerCmd.includes("identify me") ||
    lowerCmd.includes("owner verify");

  if (isFaceCmd) {
    if (
      lowerCmd.includes("close") ||
      lowerCmd.includes("band") ||
      lowerCmd.includes("hatao") ||
      lowerCmd.includes("hide") ||
      lowerCmd.includes("off") ||
      lowerCmd.includes("cancel") ||
      lowerCmd.includes("stop")
    ) {
      return {
        action: "Ji boss, face recognition window band kar di hai.",
        isBrowserAction: true,
        faceAction: { mode: "close" },
      };
    } else if (
      lowerCmd.includes("enroll") ||
      lowerCmd.includes("save") ||
      lowerCmd.includes("add") ||
      lowerCmd.includes("register") ||
      lowerCmd.includes("set karo")
    ) {
      return {
        action: "Ji boss, face enrollment setup open kar rahi hoon.",
        isBrowserAction: true,
        faceAction: { mode: "enroll" },
      };
    } else if (
      lowerCmd.includes("delete") ||
      lowerCmd.includes("remove") ||
      lowerCmd.includes("clear")
    ) {
      return {
        action: "Ji boss, face profile management open kar rahi hoon.",
        isBrowserAction: true,
        faceAction: { mode: "manage" },
      };
    } else if (lowerCmd.includes("status") || lowerCmd.includes("check")) {
      return {
        action: "Ji boss, face security status check kar rahi hoon.",
        isBrowserAction: true,
        faceAction: { mode: "manage" },
      };
    } else {
      return {
        action: "Ji boss, face verification start kar rahi hoon.",
        isBrowserAction: true,
        faceAction: { mode: "verify" },
      };
    }
  }

  // =========================================================
  // A. VOLUME CONTROLS
  // =========================================================
  const isVolumeCmd =
    lowerCmd.includes("volume") ||
    lowerCmd.includes("sound") ||
    lowerCmd.includes("awaj") ||
    lowerCmd.includes("awaz");

  if (isVolumeCmd) {
    // Mute
    if (lowerCmd.includes("mute") || lowerCmd.includes("band") || lowerCmd.includes("off")) {
      return {
        action: "Awaaz band kar di hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "volume", mode: "mute", value: 0 },
      };
    }

    // Full / Max
    if (lowerCmd.includes("full") || lowerCmd.includes("max") || lowerCmd.includes("100%")) {
      return {
        action: "Volume full kar diya hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "volume", mode: "set", value: 100 },
      };
    }

    // Number extraction e.g. "volume 80", "volume 50 percent"
    const numMatch = lowerCmd.match(/(?:volume|sound|awaj|awaz)\s*(?:ko|to)?\s*(\d{1,3})/i) ||
                     lowerCmd.match(/(\d{1,3})\s*(?:percent|%)\s*(?:volume|sound)/i);
    if (numMatch) {
      const val = Math.min(100, Math.max(0, parseInt(numMatch[1], 10)));
      return {
        action: `Volume ${val}% kar diya hai, Boss.`,
        isBrowserAction: true,
        systemAction: { type: "volume", mode: "set", value: val },
      };
    }

    // Decrease / Kam
    if (
      lowerCmd.includes("kam") ||
      lowerCmd.includes("decrease") ||
      lowerCmd.includes("down") ||
      lowerCmd.includes("ghatao") ||
      lowerCmd.includes("low")
    ) {
      return {
        action: "Volume kam kar diya hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "volume", mode: "decrease" },
      };
    }

    // Increase / Badhao / Jyada
    if (
      lowerCmd.includes("badhao") ||
      lowerCmd.includes("increase") ||
      lowerCmd.includes("up") ||
      lowerCmd.includes("jyada") ||
      lowerCmd.includes("zyada") ||
      lowerCmd.includes("high")
    ) {
      return {
        action: "Volume badha diya hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "volume", mode: "increase" },
      };
    }
  }

  // =========================================================
  // B. BRIGHTNESS CONTROLS
  // =========================================================
  const isBrightnessCmd =
    lowerCmd.includes("brightness") ||
    lowerCmd.includes("britness") ||
    lowerCmd.includes("roshni") ||
    lowerCmd.includes("screen brightness");

  if (isBrightnessCmd) {
    // Full / Max / 100
    if (lowerCmd.includes("full") || lowerCmd.includes("max") || lowerCmd.includes("100%")) {
      return {
        action: "Brightness full kar di hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "brightness", mode: "set", value: 100 },
      };
    }

    // Min / Low / Dim
    if (lowerCmd.includes("min") || lowerCmd.includes("low") || lowerCmd.includes("dim")) {
      return {
        action: "Brightness bilkul kam kar di hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "brightness", mode: "set", value: 20 },
      };
    }

    // Number extraction e.g. "brightness 60", "brightness 80%"
    const numMatch = lowerCmd.match(/(?:brightness|britness|roshni)\s*(?:ko|to)?\s*(\d{1,3})/i) ||
                     lowerCmd.match(/(\d{1,3})\s*(?:percent|%)\s*(?:brightness|britness)/i);
    if (numMatch) {
      const val = Math.min(100, Math.max(10, parseInt(numMatch[1], 10)));
      return {
        action: `Brightness ${val}% kar di hai, Boss.`,
        isBrowserAction: true,
        systemAction: { type: "brightness", mode: "set", value: val },
      };
    }

    // Decrease / Kam
    if (
      lowerCmd.includes("kam") ||
      lowerCmd.includes("decrease") ||
      lowerCmd.includes("down") ||
      lowerCmd.includes("ghatao") ||
      lowerCmd.includes("low")
    ) {
      return {
        action: "Brightness kam kar di hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "brightness", mode: "decrease" },
      };
    }

    // Increase / Badhao / Jyada
    if (
      lowerCmd.includes("badhao") ||
      lowerCmd.includes("increase") ||
      lowerCmd.includes("up") ||
      lowerCmd.includes("jyada") ||
      lowerCmd.includes("zyada") ||
      lowerCmd.includes("high")
    ) {
      return {
        action: "Brightness badha di hai, Boss.",
        isBrowserAction: true,
        systemAction: { type: "brightness", mode: "increase" },
      };
    }
  }

  // =========================================================
  // C. FRIEND COMMANDS: Ashish / Ajay
  // =========================================================
  if (lowerCmd.includes("call ashish") || lowerCmd.includes("contact ashish") || lowerCmd.includes("ashish ko call")) {
    return {
      action: "Ashish ko connect kar rahi hu, Boss.",
      url: "https://web.whatsapp.com",
      isBrowserAction: true,
    };
  }

  if (lowerCmd.includes("call ajay") || lowerCmd.includes("contact ajay") || lowerCmd.includes("ajay ko call")) {
    return {
      action: "Ajay ko connect kar rahi hu, Boss.",
      url: "https://web.whatsapp.com",
      isBrowserAction: true,
    };
  }

  // =========================================================
  // D. MEDIA PLAYER CONTROLS (PAUSE, PLAY/RESUME, FORWARD/AAGE, BACKWARD/PICHHE, CLOSE/HATAO)
  // =========================================================

  // PAUSE VIDEO
  if (
    lowerCmd === "pause" ||
    lowerCmd === "pause karo" ||
    lowerCmd === "video pause" ||
    lowerCmd === "video pause karo" ||
    lowerCmd === "rok do" ||
    lowerCmd === "video rok do" ||
    lowerCmd === "stop video" ||
    lowerCmd === "pause video"
  ) {
    return {
      action: "Video pause kar di hai, Boss.",
      isBrowserAction: false,
      mediaAction: { action: "pause" },
    };
  }

  // RESUME / PLAY VIDEO
  if (
    lowerCmd === "resume" ||
    lowerCmd === "resume karo" ||
    lowerCmd === "video resume" ||
    lowerCmd === "unpause" ||
    lowerCmd === "phir se chalao" ||
    lowerCmd === "continue video"
  ) {
    return {
      action: "Video chala di hai, Boss.",
      isBrowserAction: false,
      mediaAction: { action: "resume" },
    };
  }

  // FORWARD / AAGE
  if (
    lowerCmd.includes("aage") ||
    lowerCmd.includes("forward") ||
    lowerCmd === "skip" ||
    lowerCmd === "aage karo"
  ) {
    return {
      action: "Video 10 second aage kar di hai, Boss.",
      isBrowserAction: false,
      mediaAction: { action: "forward", seconds: 10 },
    };
  }

  // BACKWARD / PICHHE
  if (
    lowerCmd.includes("pichhe") ||
    lowerCmd.includes("backward") ||
    lowerCmd.includes("rewind") ||
    lowerCmd === "pichhe karo"
  ) {
    return {
      action: "Video 10 second pichhe kar di hai, Boss.",
      isBrowserAction: false,
      mediaAction: { action: "backward", seconds: 10 },
    };
  }

  // CLOSE / HATAO VIDEO
  if (
    lowerCmd.includes("video hatao") ||
    lowerCmd.includes("video band") ||
    lowerCmd.includes("video close") ||
    lowerCmd.includes("close video") ||
    lowerCmd.includes("remove video") ||
    lowerCmd.includes("hatao video") ||
    lowerCmd.includes("player band") ||
    lowerCmd.includes("player close") ||
    lowerCmd === "hatao" ||
    lowerCmd === "close"
  ) {
    return {
      action: "Video hata di hai, Boss.",
      isBrowserAction: false,
      mediaAction: { action: "close" },
    };
  }

  // =========================================================
  // E. YOUTUBE SEARCH / PLAY / OPEN
  // =========================================================
  if (
    lowerCmd === "youtube" ||
    lowerCmd === "youtube open" ||
    lowerCmd === "youtube open karo" ||
    lowerCmd === "open youtube" ||
    lowerCmd === "youtube kholo" ||
    lowerCmd === "youtube chalu karo" ||
    lowerCmd === "kholo youtube"
  ) {
    return {
      action: "Aapke liye YouTube khol rahi hu, Boss.",
      url: "https://www.youtube.com",
      isBrowserAction: true,
    };
  }

  const isYouTubePlayIntent =
    lowerCmd.includes("youtube") ||
    lowerCmd.startsWith("play ") ||
    lowerCmd.startsWith("chalao ") ||
    lowerCmd.startsWith("sunao ") ||
    lowerCmd.endsWith(" chalao") ||
    lowerCmd.endsWith(" play karo") ||
    lowerCmd.endsWith(" sunao") ||
    lowerCmd.includes("song") ||
    lowerCmd.includes("gāna") ||
    lowerCmd.includes("gaana");

  if (isYouTubePlayIntent) {
    let rawQuery = lowerCmd
      .replace(/^(hey\s+)?zoya(\s+ai)?\s*/i, "")
      .replace(/^(play|chalao|sunao|search|kholo)\s+/i, "")
      .replace(/^(youtube\s+(pe|par|in|on)\s+)/i, "")
      .replace(/\s+(on|pe|par|in)\s+youtube$/i, "")
      .replace(/\s+(play\s*karo|chalao|sunao|song|video|gāna|gaana|khol do)$/i, "")
      .trim();

    if (!rawQuery) rawQuery = command;

    const details = await getYouTubePlayDetails(rawQuery);

    if (details.videoId) {
      return {
        action: `Aapke liye ${rawQuery} chala rahi hu, Boss.`,
        isBrowserAction: false,
        mediaAction: {
          action: "play",
          videoId: details.videoId,
          title: details.title || rawQuery,
        },
      };
    }

    return {
      action: `Aapke liye ${rawQuery} search kar rahi hu, Boss.`,
      url: details.watchUrl,
      isBrowserAction: true,
    };
  }

  // =========================================================
  // E. SPOTIFY SEARCH / PLAY
  // =========================================================
  const spotifyMatch = lowerCmd.match(/(?:play|search|sunao)\s+(.+?)\s+(?:on|pe|par)\s+spotify/i);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    return {
      action: `Spotify par ${spotifyMatch[1].trim()} dhoondh rahi hu, Boss.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // =========================================================
  // F. GOOGLE SEARCH
  // =========================================================
  const googleSearchMatch = lowerCmd.match(/(?:search|khojo)\s+(.+?)\s+(?:on|pe|par)\s+google/i) ||
                            lowerCmd.match(/^google\s+(?:pe|par)\s+(?:search karo|khojo)\s+(.+)$/i);
  if (googleSearchMatch) {
    const query = encodeURIComponent(googleSearchMatch[1].trim());
    return {
      action: `Google par "${googleSearchMatch[1].trim()}" search kar rahi hu, Boss.`,
      url: `https://www.google.com/search?q=${query}`,
      isBrowserAction: true,
    };
  }

  // =========================================================
  // G. WHATSAPP MESSAGE
  // =========================================================
  const waMatch = lowerCmd.match(/^send\s+(?:a\s+)?whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/i);
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `Aapka WhatsApp message bhej rahi hu, Boss.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  // =========================================================
  // H. FLEXIBLE WEBSITE / APP OPENING PATTERNS
  // =========================================================
  const isOpenIntent =
    lowerCmd.startsWith("open ") ||
    lowerCmd.startsWith("launch ") ||
    lowerCmd.startsWith("go to ") ||
    lowerCmd.startsWith("visit ") ||
    lowerCmd.startsWith("kholo ") ||
    lowerCmd.startsWith("chalu karo ") ||
    lowerCmd.endsWith(" kholo") ||
    lowerCmd.endsWith(" open karo") ||
    lowerCmd.endsWith(" chalu karo") ||
    lowerCmd.endsWith(" khol do") ||
    lowerCmd.endsWith(" open");

  if (isOpenIntent) {
    const targetUrl = getWebsiteUrl(command);
    let targetName = command
      .replace(/^(hey\s+)?zoya(\s+ai)?\s*/i, "")
      .replace(/^(open|launch|go to|visit|kholo|chalu karo|open karo)\s+/i, "")
      .replace(/\s+(kholo|open karo|chalu karo|khol do|open)$/i, "")
      .trim();
    if (!targetName) targetName = "website";

    return {
      action: `Aapke liye ${targetName} khol rahi hu, Boss.`,
      url: targetUrl,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}



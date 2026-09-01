/**
 * ZOYA Intelligent Calendar Service
 * Manages user date marks, reminders, festivals lookup, and Natural Language parsing
 */

import { getFestivalsForDate, CalendarFestival, FESTIVAL_DATABASE, FIXED_ANNUAL_OBSERVANCES } from "../utils/calendarData";
import { getCurrentDateTimeInfo } from "../utils/dateTimeUtils";

export interface CalendarMarkedEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "10:30 AM" or ""
  category: "meeting" | "birthday" | "puja" | "reminder" | "important" | "personal" | "custom";
  notes?: string;
  color?: string; // hex or theme color tag
  createdAt: number;
}

const STORAGE_KEY = "zoya_calendar_events";

class CalendarService {
  private events: CalendarMarkedEvent[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.events = JSON.parse(saved);
      } else {
        // Seed default sample marked dates for testing
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;

        this.events = [
          {
            id: "evt_1",
            title: "ZOYA AI Core Review with Boss Udit",
            date: todayStr,
            time: "10:00 AM",
            category: "meeting",
            notes: "AI voice assistant calibration & calendar feature verification",
            color: "#00f0ff",
            createdAt: Date.now(),
          },
        ];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn("Failed to load calendar events from storage:", e);
      this.events = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
      this.notifyListeners();
    } catch (e) {
      console.warn("Failed to save calendar events to storage:", e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public getAllEvents(): CalendarMarkedEvent[] {
    return [...this.events].sort((a, b) => a.date.localeCompare(b.date));
  }

  public getEventsForDate(dateStr: string): {
    festivals: CalendarFestival[];
    userMarks: CalendarMarkedEvent[];
  } {
    const festivals = getFestivalsForDate(dateStr);
    const userMarks = this.events.filter((e) => e.date === dateStr);
    return { festivals, userMarks };
  }

  public getEventsForMonth(year: number, monthIndex: number): {
    markedDates: Record<string, CalendarMarkedEvent[]>;
    festivalDates: Record<string, CalendarFestival[]>;
  } {
    const mStr = String(monthIndex + 1).padStart(2, "0");
    const prefix = `${year}-${mStr}-`;

    const markedDates: Record<string, CalendarMarkedEvent[]> = {};
    const festivalDates: Record<string, CalendarFestival[]> = {};

    this.events.forEach((evt) => {
      if (evt.date.startsWith(prefix)) {
        if (!markedDates[evt.date]) markedDates[evt.date] = [];
        markedDates[evt.date].push(evt);
      }
    });

    // Check all days in month
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${prefix}${String(day).padStart(2, "0")}`;
      const fests = getFestivalsForDate(dStr);
      if (fests.length > 0) {
        festivalDates[dStr] = fests;
      }
    }

    return { markedDates, festivalDates };
  }

  public addEvent(
    data: Omit<CalendarMarkedEvent, "id" | "createdAt">
  ): CalendarMarkedEvent {
    const newEvent: CalendarMarkedEvent = {
      ...data,
      id: "evt_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      createdAt: Date.now(),
    };
    this.events.push(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  public deleteEvent(id: string): boolean {
    const initialLen = this.events.length;
    this.events = this.events.filter((e) => e.id !== id);
    if (this.events.length !== initialLen) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public updateEvent(id: string, updates: Partial<CalendarMarkedEvent>): boolean {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.events[idx] = { ...this.events[idx], ...updates };
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Helper to parse natural date strings like "15 august", "kal", "parso", "26 aug 2026", "today"
   */
  public parseNaturalDate(input: string): { dateStr: string; displayDate: string; dayName: string } | null {
    const text = input.toLowerCase().trim();
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Relative keywords
    if (text.includes("aaj") || text.includes("today")) {
      return this.formatDateObj(now);
    }
    if (text.includes("kal") || text.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return this.formatDateObj(tomorrow);
    }
    if (text.includes("parso") || text.includes("day after tomorrow")) {
      const parso = new Date(now);
      parso.setDate(now.getDate() + 2);
      return this.formatDateObj(parso);
    }

    // 2. Hindi & English Month mappings
    const monthNames: Record<string, number> = {
      jan: 0, january: 0, janvari: 0, janwary: 0, जनवरी: 0,
      feb: 1, february: 1, farvari: 1, फ़रवरी: 1, फरवरी: 1,
      mar: 2, march: 2, मार्च: 2,
      apr: 3, april: 3, aprail: 3, अप्रैल: 3,
      may: 4, mai: 4, मई: 4,
      jun: 5, june: 5, जून: 5,
      jul: 6, july: 6, julai: 6, जुलाई: 6,
      aug: 7, august: 7, agast: 7, अगस्त: 7,
      sep: 8, sept: 8, september: 8, sitambar: 8, सितंबर: 8, सितम्बर: 8,
      oct: 9, octo: 9, october: 9, aktubar: 9, अक्टूबर: 9, अक्तूबर: 9,
      nov: 10, november: 10, navambar: 10, नवंबर: 10, नवम्बर: 10,
      dec: 11, december: 11, disambar: 11, दिसंबर: 11, दिसम्बर: 11,
    };

    // Regex pattern: e.g. "15 august 2026", "15 aug", "25 december", "2 october", "15th august"
    const match = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z\u0900-\u097F]+)(?:\s+(\d{4}))?/);
    if (match) {
      const dayNum = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();
      const yearNum = match[3] ? parseInt(match[3], 10) : currentYear;

      const monthIndex = monthNames[monthStr];
      if (monthIndex !== undefined && dayNum >= 1 && dayNum <= 31) {
        const dObj = new Date(yearNum, monthIndex, dayNum);
        if (!isNaN(dObj.getTime())) {
          return this.formatDateObj(dObj);
        }
      }
    }

    // Regex for numeric dates: DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY
    const numMatch = text.match(/(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?/);
    if (numMatch) {
      const p1 = parseInt(numMatch[1], 10);
      const p2 = parseInt(numMatch[2], 10);
      const p3 = numMatch[3] ? parseInt(numMatch[3], 10) : currentYear;
      const fullYear = p3 < 100 ? 2000 + p3 : p3;

      // Assume DD/MM/YYYY
      if (p1 <= 31 && p2 <= 12) {
        const dObj = new Date(fullYear, p2 - 1, p1);
        if (!isNaN(dObj.getTime())) {
          return this.formatDateObj(dObj);
        }
      }
    }

    return null;
  }

  private formatDateObj(d: Date): { dateStr: string; displayDate: string; dayName: string } {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;

    const daysHindi = ["Ravivaar", "Somvaar", "Mangalvaar", "Budhvaar", "Guruvaar", "Shukravaar", "Shanivaar"];
    const monthsEng = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const dayName = daysHindi[d.getDay()] + ` (${d.toLocaleDateString("en-US", { weekday: "long" })})`;
    const displayDate = `${d.getDate()} ${monthsEng[d.getMonth()]} ${y}`;

    return { dateStr, displayDate, dayName };
  }

  /**
   * Generates voice spoken response for "Kitni tareekh ko kya hai"
   */
  public getWhatsOnDateSpoken(textQuery: string): string {
    const parsed = this.parseNaturalDate(textQuery);
    if (!parsed) {
      // Check if user is asking about a specific festival by name (e.g. "Diwali kab hai", "Holi kab hai")
      const lower = textQuery.toLowerCase();
      for (const [dateStr, fests] of Object.entries(FESTIVAL_DATABASE)) {
        for (const fest of fests) {
          if (lower.includes(fest.name.toLowerCase()) || lower.includes(fest.nameHindi.toLowerCase())) {
            const parsedTarget = this.parseNaturalDate(dateStr);
            return `Boss, ${fest.nameHindi || fest.name} ${parsedTarget ? parsedTarget.displayDate + " (" + parsedTarget.dayName + ")" : dateStr} ko hai — ${fest.description}.`;
          }
        }
      }
      return "Boss, kripya date bataiye (jaise: '15 August ko kya hai' ya 'Kal kya hai') taaki main Calendar check karke bata sakun.";
    }

    const { dateStr, displayDate, dayName } = parsed;
    const { festivals, userMarks } = this.getEventsForDate(dateStr);

    let parts: string[] = [];

    if (festivals.length > 0) {
      const fNames = festivals.map((f) => `${f.nameHindi || f.name} (${f.description})`).join(", ");
      parts.push(`Festivals/Observances: ${fNames}`);
    }

    if (userMarks.length > 0) {
      const uNames = userMarks.map((u) => `${u.title}${u.time ? ` at ${u.time}` : ""}${u.notes ? ` (${u.notes})` : ""}`).join(", ");
      parts.push(`Aapke Marked Events/Reminders: ${uNames}`);
    }

    if (parts.length === 0) {
      return `Boss, ${displayDate} (${dayName}) ko koi specific festival ya marked reminder nahi hai, ye regular day hai.`;
    }

    return `Boss, ${displayDate} (${dayName}) ko:\n` + parts.join("\nAur ");
  }

  /**
   * Voice Command to Mark Date:
   * e.g. "Zoya 15 August ko Independence Day flag hoisting mark kar do"
   * "Zoya kal ke liye meeting mark karo"
   */
  public handleMarkDateVoiceCommand(textCommand: string): { success: boolean; message: string; event?: CalendarMarkedEvent } {
    const lower = textCommand.toLowerCase();
    
    // Parse target date
    const parsed = this.parseNaturalDate(lower);
    if (!parsed) {
      return {
        success: false,
        message: "Boss, kripya date specify karein (jaise: '25 December ko Christmas Party mark kar do' ya 'Kal ke liye meeting mark karo').",
      };
    }

    // Extract title
    // Remove command triggers: "zoya", "calendar me", "mark kar do", "mark karo", "add karo", "note karo", "ko", "ke liye"
    let title = lower
      .replace(/\b(zoya|calendar\s*(?:me|mein)?|date\s+mark|mark\s*(?:kar\s*do|karo|kijiye|karna|karein)?|add\s*(?:kar\s*do|karo)?|note\s*(?:kar\s*do|karo)?|likh\s*(?:do|lo)?|save\s*(?:kar\s*do|karo)?)\b/gi, "")
      .replace(/\b(aaj|kal|parso|\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))\b/gi, "")
      .replace(/\b(ko|ke\s+liye|par|for|on)\b/gi, "")
      .trim();

    if (!title || title.length < 2) {
      title = "Important Reminder / Event";
    } else {
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Category detection
    let category: CalendarMarkedEvent["category"] = "important";
    if (lower.includes("meeting") || lower.includes("call")) category = "meeting";
    else if (lower.includes("birthday") || lower.includes("janamdin")) category = "birthday";
    else if (lower.includes("puja") || lower.includes("pooja") || lower.includes("mandir") || lower.includes("vrat") || lower.includes("fast")) category = "puja";
    else if (lower.includes("reminder") || lower.includes("yaad")) category = "reminder";
    else if (lower.includes("personal") || lower.includes("khud")) category = "personal";

    // Time detection if present (e.g. "10:30 am", "5 baje", "4 pm")
    let timeStr = "";
    const timeMatch = lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|baje))/i);
    if (timeMatch) {
      timeStr = timeMatch[1].toUpperCase();
    }

    const newEvent = this.addEvent({
      title,
      date: parsed.dateStr,
      time: timeStr,
      category,
      notes: `Voice marked by Boss Udit`,
      color: "#00f0ff",
    });

    return {
      success: true,
      message: `Boss, maine ${parsed.displayDate} (${parsed.dayName}) ke liye "${title}" Calendar me mark kar diya hai!`,
      event: newEvent,
    };
  }
}

export const calendarService = new CalendarService();

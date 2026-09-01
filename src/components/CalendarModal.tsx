import React, { useState, useEffect } from "react";
import {
  calendarService,
  CalendarMarkedEvent,
} from "../services/calendarService";
import {
  CalendarFestival,
  getFestivalsForDate,
} from "../utils/calendarData";
import { getCurrentDateTimeInfo } from "../utils/dateTimeUtils";
import { ZOYA_THEME_COLORS, ZoyaThemeColor } from "../utils/themeConfig";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor?: ZoyaThemeColor;
  glowIntensity?: number;
  onAskZoya?: (cmd: string) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  themeColor = "cyan",
  glowIntensity = 75,
  onAskZoya,
}) => {
  const activeTheme = ZOYA_THEME_COLORS[themeColor] || ZOYA_THEME_COLORS["cyan"];
  const primaryColor = activeTheme.primary;
  const secondaryColor = activeTheme.secondary;
  const glowRgb = activeTheme.glowRgb;
  const glowFactor = Math.max(0, Math.min(100, glowIntensity)) / 100;

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed
  
  // Selected date formatted YYYY-MM-DD
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Form states for marking a date
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<CalendarMarkedEvent["category"]>("important");
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Re-fetch triggers
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsub = calendarService.subscribe(() => {
      setRefreshKey((prev) => prev + 1);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const monthNames = [
    { eng: "January", hi: "जनवरी" },
    { eng: "February", hi: "फ़रवरी" },
    { eng: "March", hi: "मार्च" },
    { eng: "April", hi: "अप्रैल" },
    { eng: "May", hi: "मई" },
    { eng: "June", hi: "जून" },
    { eng: "July", hi: "जुलाई" },
    { eng: "August", hi: "अगस्त" },
    { eng: "September", hi: "सितंबर" },
    { eng: "October", hi: "अक्टूबर" },
    { eng: "November", hi: "नवंबर" },
    { eng: "December", hi: "दिसंबर" },
  ];

  const daysOfWeek = [
    { short: "Sun", hi: "रवि" },
    { short: "Mon", hi: "सोम" },
    { short: "Tue", hi: "मंगल" },
    { short: "Wed", hi: "बुध" },
    { short: "Thu", hi: "गुरु" },
    { short: "Fri", hi: "शुक्र" },
    { short: "Sat", hi: "शनि" },
  ];

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
    setSelectedDate(todayStr);
  };

  // Calculate calendar grid for current year & month
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const { markedDates, festivalDates } = calendarService.getEventsForMonth(currentYear, currentMonth);

  // Selected date details
  const { festivals: selectedFestivals, userMarks: selectedUserMarks } =
    calendarService.getEventsForDate(selectedDate);

  // Parse human readable string of selected date
  const selYear = parseInt(selectedDate.slice(0, 4), 10);
  const selMonth = parseInt(selectedDate.slice(5, 7), 10) - 1;
  const selDay = parseInt(selectedDate.slice(8, 10), 10);
  const selDateObj = new Date(selYear, selMonth, selDay);
  const selDayName = selDateObj.toLocaleDateString("en-US", { weekday: "long" });

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    calendarService.addEvent({
      title: newEventTitle.trim(),
      date: selectedDate,
      time: newEventTime.trim() || undefined,
      category: newEventCategory,
      notes: newEventNotes.trim() || undefined,
      color: primaryColor,
    });

    setNewEventTitle("");
    setNewEventTime("");
    setNewEventNotes("");
    setStatusMessage(`Event marked on ${selectedDate}!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteEvent = (id: string) => {
    calendarService.deleteEvent(id);
    setStatusMessage("Event removed from calendar.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Search filter
  const allEvents = calendarService.getAllEvents();
  const filteredSearchResults = searchQuery.trim()
    ? allEvents.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.date.includes(searchQuery) ||
          e.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const dtInfo = getCurrentDateTimeInfo();

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-neutral-950/95 border rounded-2xl overflow-hidden shadow-2xl transition-all font-sans my-auto text-white"
        style={{
          borderColor: `rgba(${glowRgb}, 0.4)`,
          boxShadow: `0 0 ${Math.round(24 * glowFactor)}px rgba(${glowRgb}, ${0.25 * glowFactor})`,
        }}
      >
        {/* Top Header Bar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b bg-black/60 backdrop-blur-md"
          style={{ borderColor: `rgba(${glowRgb}, 0.25)` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border font-bold"
              style={{
                borderColor: `rgba(${glowRgb}, 0.5)`,
                background: `rgba(${glowRgb}, 0.15)`,
                color: primaryColor,
                boxShadow: `0 0 ${Math.round(12 * glowFactor)}px rgba(${glowRgb}, ${0.3 * glowFactor})`,
              }}
            >
              📅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className="text-base sm:text-lg font-bold tracking-wide uppercase font-mono"
                  style={{ color: primaryColor }}
                >
                  ZOYA Calendar & Date Tracker
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Live Date: {dtInfo.dateFull} • Time: {dtInfo.time12} ({dtInfo.timeHindi})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToday}
              className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-neutral-900 border border-neutral-700 hover:border-white text-neutral-200 transition-all cursor-pointer"
              title="Jump to Today's Date"
            >
              📍 Aaj (Today)
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-700 transition-all cursor-pointer font-bold"
              title="Close Calendar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 flex items-center justify-between font-mono animate-fade-in">
            <span>✨ {statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Search & Month Switcher Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-neutral-900/60 border-b text-xs font-mono"
          style={{ borderColor: `rgba(${glowRgb}, 0.2)` }}
        >
          {/* Month / Year Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-neutral-700 hover:border-neutral-400 text-neutral-300 transition-all"
            >
              ◀ Prev
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-black/80 rounded-lg border border-neutral-800">
              <span className="font-bold text-sm text-white">
                {monthNames[currentMonth].eng} ({monthNames[currentMonth].hi})
              </span>
              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                {currentYear}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-neutral-700 hover:border-neutral-400 text-neutral-300 transition-all"
            >
              Next ▶
            </button>
          </div>

          {/* Quick Search */}
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Search festival or mark (e.g. Diwali, Meeting)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/80 border border-neutral-800 focus:border-cyan-400 rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* LEFT: Calendar Grid (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-neutral-800/80 flex flex-col justify-between">
            <div>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-mono font-semibold text-neutral-400">
                {daysOfWeek.map((d, idx) => (
                  <div
                    key={d.short}
                    className={`py-1.5 rounded ${idx === 0 ? "text-rose-400 bg-rose-950/20" : idx === 6 ? "text-amber-400 bg-amber-950/20" : "bg-neutral-900/40"}`}
                  >
                    <div>{d.short}</div>
                    <div className="text-[10px] text-neutral-500">{d.hi}</div>
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Previous month trailing days */}
                {Array.from({ length: firstDayIndex }).map((_, i) => {
                  const prevDayNum = daysInPrevMonth - firstDayIndex + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="min-h-[52px] sm:min-h-[64px] p-1 rounded-xl bg-black/20 border border-neutral-900 text-neutral-700 text-xs flex flex-col justify-between opacity-40 cursor-not-allowed select-none"
                    >
                      <span className="text-[10px] font-mono">{prevDayNum}</span>
                    </div>
                  );
                })}

                {/* Current month days */}
                {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const fests = festivalDates[dateStr] || [];
                  const marks = markedDates[dateStr] || [];
                  const hasFest = fests.length > 0;
                  const hasMarks = marks.length > 0;

                  return (
                    <button
                      key={`curr-${dayNum}`}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`min-h-[52px] sm:min-h-[64px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                        isSelected
                          ? "bg-neutral-800 border-white shadow-lg"
                          : isToday
                          ? "bg-neutral-900 border-emerald-500/80 shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                          : "bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-900 hover:border-neutral-600"
                      }`}
                      style={{
                        borderColor: isSelected
                          ? primaryColor
                          : isToday
                          ? "#10b981"
                          : undefined,
                        boxShadow: isSelected
                          ? `0 0 14px rgba(${glowRgb}, 0.35)`
                          : undefined,
                      }}
                    >
                      {/* Date number and Today indicator */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isSelected
                              ? "text-white scale-110"
                              : isToday
                              ? "text-emerald-400"
                              : "text-neutral-300"
                          }`}
                        >
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Aaj / Today" />
                        )}
                      </div>

                      {/* Festival & Mark Indicator Tags */}
                      <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                        {hasFest && (
                          <div
                            className="text-[9px] truncate font-medium px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            title={fests.map((f) => f.nameHindi || f.name).join(", ")}
                          >
                            ⭐ {fests[0].nameHindi || fests[0].name}
                          </div>
                        )}
                        {hasMarks && (
                          <div
                            className="text-[9px] truncate font-mono px-1 py-0.2 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                            title={marks.map((m) => m.title).join(", ")}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            <span className="truncate">{marks[0].title}</span>
                            {marks.length > 1 && <span>+{marks.length - 1}</span>}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend & Voice Quick Actions */}
            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Festival / Parv
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded" style={{ background: primaryColor }} /> Marked Event
                </span>
              </div>

              <div className="text-neutral-500 italic text-[10px]">
                Click any date to inspect details or add a mark
              </div>
            </div>
          </div>

          {/* RIGHT: Day Inspector & Mark Form (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-neutral-900/40 flex flex-col gap-4 overflow-y-auto max-h-[600px]">
            {/* Selected Date Header Banner */}
            <div
              className="p-3.5 rounded-xl border bg-black/60 relative overflow-hidden"
              style={{
                borderColor: `rgba(${glowRgb}, 0.35)`,
                boxShadow: `0 0 12px rgba(${glowRgb}, 0.15)`,
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    Selected Date / चयनित तिथि
                  </div>
                  <h3 className="text-lg font-bold text-white font-sans mt-0.5">
                    {selDay} {monthNames[selMonth]?.eng} {selYear}
                  </h3>
                  <p className="text-xs font-mono" style={{ color: primaryColor }}>
                    {selDayName} ({selDateObj.toLocaleDateString("hi-IN", { weekday: "long" })})
                  </p>
                </div>

                {onAskZoya && (
                  <button
                    onClick={() => onAskZoya(`Zoya ${selDay} ${monthNames[selMonth]?.eng} ko kya hai?`)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-neutral-800 border border-neutral-700 hover:border-neutral-500 text-neutral-200 transition-all flex items-center gap-1 cursor-pointer"
                    title="Ask Zoya by voice"
                  >
                    <span>🎙️</span>
                    <span>Ask Zoya</span>
                  </button>
                )}
              </div>
            </div>

            {/* Section 1: "Is Tareekh Ko Kya Hai?" (Festivals & Observances) */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                <span>🌟</span> Is Taareekh Ko Kya Hai (Festivals & Holidays)
              </h4>

              {selectedFestivals.length === 0 ? (
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-800/80 text-xs text-neutral-500 font-mono">
                  No public festivals or national observances on this date.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedFestivals.map((fest, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 text-sm">
                          {fest.nameHindi || fest.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {fest.type}
                        </span>
                      </div>
                      <p className="text-neutral-300 text-xs">{fest.name} — {fest.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Marked Events on this Date */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                <span>📌</span> Marked Events & Reminders ({selectedUserMarks.length})
              </h4>

              {selectedUserMarks.length === 0 ? (
                <div className="p-3 rounded-xl bg-black/40 border border-neutral-800/80 text-xs text-neutral-500 font-mono">
                  No custom reminders or events marked for this day yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedUserMarks.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs flex items-start justify-between gap-2 transition-all hover:border-neutral-700"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold"
                            style={{
                              background: `rgba(${glowRgb}, 0.2)`,
                              color: primaryColor,
                              border: `1px solid rgba(${glowRgb}, 0.4)`,
                            }}
                          >
                            {evt.category}
                          </span>
                          {evt.time && (
                            <span className="text-[11px] font-mono text-neutral-400">
                              ⏰ {evt.time}
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-white text-sm">{evt.title}</div>
                        {evt.notes && (
                          <div className="text-neutral-400 text-xs">{evt.notes}</div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-all"
                        title="Delete Marked Event"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Add / Mark Date Form */}
            <div
              className="p-3.5 rounded-xl bg-black/70 border"
              style={{ borderColor: `rgba(${glowRgb}, 0.25)` }}
            >
              <h4
                className="text-xs font-mono font-bold uppercase tracking-wider mb-2.5 flex items-center gap-1.5"
                style={{ color: primaryColor }}
              >
                <span>➕</span> Mark Event for {selDay} {monthNames[selMonth]?.eng}
              </h4>

              <form onSubmit={handleSaveEvent} className="space-y-2.5 text-xs font-sans">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Event or Reminder Title (e.g. Doctor Appt, Puja, Meeting)..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 focus:border-cyan-400 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      value={newEventCategory}
                      onChange={(e) =>
                        setNewEventCategory(e.target.value as CalendarMarkedEvent["category"])
                      }
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-200 text-xs focus:outline-none"
                    >
                      <option value="important">🔴 Important</option>
                      <option value="meeting">💼 Meeting</option>
                      <option value="birthday">🎂 Birthday</option>
                      <option value="puja">🪔 Puja / Parv</option>
                      <option value="reminder">⏰ Reminder</option>
                      <option value="personal">👤 Personal</option>
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Time (e.g. 10:00 AM)"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Optional Notes / Description..."
                    value={newEventNotes}
                    onChange={(e) => setNewEventNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    background: primaryColor,
                    color: "#000",
                    boxShadow: `0 0 12px rgba(${glowRgb}, 0.3)`,
                  }}
                >
                  <span>📌</span>
                  <span>Save in Calendar / Mark Date</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Voice Command Helper Footer */}
        <div
          className="px-4 sm:px-6 py-2.5 bg-black/80 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-400"
          style={{ borderColor: `rgba(${glowRgb}, 0.2)` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">💡 Voice Commands:</span>
            <span className="text-neutral-300">
              "Zoya 15 August ko kya hai?" • "Zoya kal ke liye meeting mark karo" • "Zoya Diwali kab hai?"
            </span>
          </div>

          <div className="text-neutral-500">
            ZOYA AI Core 2.0 • Offline/Online Synced
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  X,
  BookOpen,
  Scroll,
  Sun,
  Flame,
  Sparkles,
  HelpCircle,
  Search,
  Volume2,
  ChevronRight,
  Shield,
  Layers,
  Heart,
  Compass,
} from "lucide-react";
import {
  GITA_18_CHAPTERS,
  FAMOUS_GITA_SHLOKAS,
  EIGHTEEN_MAHAPURANAS,
  BHAGAVATA_12_SKANDHAS,
  DASHAVATAR_AND_DEITIES,
  GitaChapter,
  GitaShloka,
  PuranaInfo,
} from "../services/gitaPuranService";

interface GitaPuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskZoya: (prompt: string) => void;
}

type TabType = "gita" | "puranas" | "bhagavata" | "avatars" | "ask";

export default function GitaPuranModal({ isOpen, onClose, onAskZoya }: GitaPuranModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("gita");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<GitaChapter | null>(null);
  const [selectedShloka, setSelectedShloka] = useState<GitaShloka | null>(null);
  const [selectedPurana, setSelectedPurana] = useState<PuranaInfo | null>(null);
  const [puranaFilter, setPuranaFilter] = useState<"All" | "Vaishnava" | "Shaiva" | "Brahma/Shakta">("All");

  if (!isOpen) return null;

  const filteredPuranas = EIGHTEEN_MAHAPURANAS.filter((p) => {
    const matchesCategory = puranaFilter === "All" || p.category === puranaFilter;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.primaryDeity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.keyThemes.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredChapters = GITA_18_CHAPTERS.filter(
    (c) =>
      c.hindiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sanskritName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.keyThemes.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredShlokas = FAMOUS_GITA_SHLOKAS.filter(
    (s) =>
      s.sanskrit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.hindiMeaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.modernApplication.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickQuestions = [
    "कृष्ण ने अर्जुन को गीता क्यों सुनाई?",
    "कर्मण्येवाधिकारस्ते श्लोक का अर्थ और आज के जीवन में उपयोग समझाओ",
    "गीता में निष्काम कर्म और स्थितप्रज्ञ के बारे में क्या कहा गया है?",
    "18 महापुराण कौन-कौन से हैं और उनका संक्षेप में महत्व बताओ",
    "श्रीमद्भागवत महापुराण के 12 स्कंधों का सार बताओ",
    "भागवत पुराण में श्रीकृष्ण जन्म और गोवर्धन लीला की कथा बताओ",
    "गरुड़ पुराण में मृत्यु के बाद जीवात्मा की यात्रा के बारे में क्या बताया गया है?",
    "शिव पुराण में 12 ज्योतिर्लिंगों और शिव-पार्वती विवाह की कथा बताओ",
    "भगवान विष्णु के दशावतार और उनके आध्यात्मिक संदेश क्या हैं?",
    "मार्कण्डेय पुराण और श्री दुर्गा सप्तशती का क्या महत्व है?",
    "गीता का सबसे महत्वपूर्ण संदेश क्या है?",
    "भक्त प्रह्लाद और नृसिंह अवतार की पूरी कथा बताओ",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-950/90 via-zinc-900 to-amber-950/90 border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              ॐ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  ZOYA — श्रीमद्भगवद्गीता एवं 18 महापुराण
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  सनातन ज्ञान
                </span>
              </div>
              <p className="text-xs text-amber-200/70">
                18 अध्याय, 700 श्लोक, 18 महापुराण, 12 भागवत स्कंध व दशावतार
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-zinc-900/90 border-b border-zinc-800 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab("gita");
              setSelectedChapter(null);
              setSelectedShloka(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === "gita"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            श्रीमद्भगवद्गीता (18 अध्याय)
          </button>

          <button
            onClick={() => {
              setActiveTab("puranas");
              setSelectedPurana(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === "puranas"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Scroll className="w-3.5 h-3.5" />
            18 महापुराण
          </button>

          <button
            onClick={() => setActiveTab("bhagavata")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === "bhagavata"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            श्रीमद्भागवत (12 स्कंध)
          </button>

          <button
            onClick={() => setActiveTab("avatars")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === "avatars"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            दशावतार व देवता
          </button>

          <button
            onClick={() => setActiveTab("ask")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === "ask"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            त्वरित प्रश्न (Ask ZOYA)
          </button>
        </div>

        {/* Search Bar */}
        {(activeTab === "gita" || activeTab === "puranas") && (
          <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "gita"
                    ? "अध्याय, श्लोक, कर्मयोग, स्थितप्रज्ञ या विषय खोजें..."
                    : "पुराण नाम, देवता (शिव, विष्णु, शक्ति) या प्रसंग खोजें..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-800/70 border border-zinc-700/60 text-white pl-9 pr-3 py-1.5 text-xs rounded-xl focus:outline-none focus:border-amber-500 placeholder-zinc-500"
              />
            </div>

            {activeTab === "puranas" && (
              <div className="flex items-center gap-1">
                {(["All", "Vaishnava", "Shaiva", "Brahma/Shakta"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPuranaFilter(cat)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg transition ${
                      puranaFilter === cat
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {cat === "All" ? "सभी" : cat === "Vaishnava" ? "वैष्णव" : cat === "Shaiva" ? "शैव" : "ब्राह्म/शाक्त"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ========================================================= */}
          {/* TAB 1: BHAGAVAD GITA */}
          {/* ========================================================= */}
          {activeTab === "gita" && (
            <div className="space-y-6">
              {/* Featured Authentic Shlokas Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    प्रमुख प्रामाणिक श्लोक एवं व्यावहारिक उपयोग
                  </h3>
                  <span className="text-[11px] text-zinc-500">कुरुक्षेत्र संवाद</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredShlokas.map((shloka) => (
                    <div
                      key={`${shloka.chapter}-${shloka.shloka}`}
                      className="p-3.5 bg-zinc-900/70 border border-amber-500/20 rounded-xl hover:border-amber-500/50 transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-2">
                          <span>
                            अध्याय {shloka.chapter}, श्लोक {shloka.shloka}
                          </span>
                          <button
                            onClick={() => {
                              onAskZoya(
                                `ZOYA, गीता के अध्याय ${shloka.chapter} के श्लोक ${shloka.shloka} का अर्थ, संदर्भ, आध्यात्मिक संदेश और आज के जीवन में उपयोग समझाओ।`
                              );
                              onClose();
                            }}
                            className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition flex items-center gap-1 text-[11px]"
                            title="Ask ZOYA to speak about this shloka"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Ask ZOYA</span>
                          </button>
                        </div>

                        <div className="p-2.5 bg-black/50 border border-zinc-800 rounded-lg text-xs font-serif text-amber-100/90 whitespace-pre-line leading-relaxed mb-2">
                          {shloka.sanskrit}
                        </div>

                        <p className="text-xs text-zinc-300 mb-2 leading-relaxed font-sans">
                          <strong className="text-amber-200">सरल अर्थ: </strong>
                          {shloka.hindiMeaning}
                        </p>

                        <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80 space-y-1">
                          <div>
                            <span className="text-amber-400/90 font-medium">आध्यात्मिक संदेश: </span>
                            {shloka.spiritualMessage}
                          </div>
                          <div>
                            <span className="text-emerald-400/90 font-medium">आज के जीवन में उपयोग: </span>
                            {shloka.modernApplication}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 18 Chapters Grid */}
              <div>
                <div className="flex items-center justify-between mb-3 pt-4 border-t border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    श्रीमद्भगवद्गीता के सभी 18 अध्याय
                  </h3>
                  <span className="text-[11px] text-zinc-400">कुल 700 श्लोक</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredChapters.map((ch) => (
                    <div
                      key={ch.chapterNumber}
                      onClick={() => setSelectedChapter(selectedChapter?.chapterNumber === ch.chapterNumber ? null : ch)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        selectedChapter?.chapterNumber === ch.chapterNumber
                          ? "bg-amber-950/40 border-amber-500 text-white shadow-lg"
                          : "bg-zinc-900/60 border-zinc-800/80 hover:border-amber-500/40 text-zinc-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                            अध्याय {ch.chapterNumber}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {ch.shlokaCount} श्लोक
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">{ch.hindiName}</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mb-2">{ch.summary}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px]">
                        <span className="text-amber-400/80 flex items-center gap-1">
                          <Compass className="w-3 h-3" /> {ch.keyThemes[0]}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAskZoya(
                              `ZOYA, गीता के अध्याय ${ch.chapterNumber} (${ch.hindiName}) का संपूर्ण सार, मुख्य विषय और शिक्षाएं विस्तार से समझाओ।`
                            );
                            onClose();
                          }}
                          className="text-amber-400 hover:text-amber-300 underline font-medium"
                        >
                          Ask ZOYA
                        </button>
                      </div>

                      {selectedChapter?.chapterNumber === ch.chapterNumber && (
                        <div className="mt-3 pt-3 border-t border-amber-500/30 text-xs space-y-2 animate-fadeIn">
                          <div>
                            <strong className="text-amber-300">प्रमुख विषय: </strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ch.keyThemes.map((theme, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <strong className="text-emerald-300">दैनिक जीवन की सीख: </strong>
                            <p className="text-[11px] text-zinc-300">{ch.practicalLifeLesson}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 18 MAHAPURANAS */}
          {/* ========================================================= */}
          {activeTab === "puranas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>अठारह महापुराण — महर्षि वेदव्यास द्वारा संकलित पावन वांग्मय</span>
                <span>{filteredPuranas.length} पुराण प्रदर्शित</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPuranas.map((purana) => (
                  <div
                    key={purana.id}
                    className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-xl transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Scroll className="w-4 h-4 text-amber-400" />
                          {purana.name}
                        </h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            purana.category === "Vaishnava"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : purana.category === "Shaiva"
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                              : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          }`}
                        >
                          {purana.category === "Vaishnava"
                            ? "वैष्णव"
                            : purana.category === "Shaiva"
                            ? "शैव"
                            : "ब्राह्म/शाक्त"}
                        </span>
                      </div>

                      <div className="text-[11px] text-amber-300/80 mb-2 font-medium flex items-center gap-2">
                        <span>इष्ट देवता: {purana.primaryDeity}</span>
                        <span>•</span>
                        <span>{purana.approxShlokas}</span>
                      </div>

                      <p className="text-xs text-zinc-300 mb-3 leading-relaxed">{purana.summary}</p>

                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 text-[11px] space-y-1 mb-3">
                        <div>
                          <strong className="text-amber-400">प्रमुख कथाएँ: </strong>
                          <span className="text-zinc-300">{purana.majorStories.join(", ")}</span>
                        </div>
                        <div>
                          <strong className="text-emerald-400">दार्शनिक संदेश: </strong>
                          <span className="text-zinc-300">{purana.philosophicalTeachings}</span>
                        </div>
                        <div>
                          <strong className="text-cyan-400">प्रमुख तीर्थ: </strong>
                          <span className="text-zinc-400">{purana.tirthasAndTraditions}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {purana.keyThemes.slice(0, 2).map((theme, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                            {theme}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          onAskZoya(`ZOYA, ${purana.name} का संपूर्ण परिचय, प्रमुख कथाएं और शिक्षाएं बताओ।`);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        Ask ZOYA <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SHRIMAD BHAGAVATA (12 SKANDHAS) */}
          {/* ========================================================= */}
          {activeTab === "bhagavata" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                <strong>श्रीमद्भागवत महापुराण (परमहंस संहिता): </strong>
                18,000 श्लोक, 12 स्कंध और 335 अध्याय। राजा परीक्षित और शुकदेव जी के संवाद के रूप में समस्त वेदों और उपनिषदों का परिपक्व अमृत फल।
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BHAGAVATA_12_SKANDHAS.map((sk) => (
                  <div
                    key={sk.skandhaNumber}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                      sk.skandhaNumber === 10
                        ? "bg-amber-950/50 border-amber-500 shadow-md shadow-amber-500/10"
                        : "bg-zinc-900/70 border-zinc-800 hover:border-amber-500/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400">स्कंध {sk.skandhaNumber}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{sk.totalChapters} अध्याय</span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-2">{sk.name}</h4>
                      <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{sk.mainTopics}</p>

                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 text-[11px] space-y-1">
                        <strong className="text-amber-300">प्रमुख आख्यान: </strong>
                        <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                          {sk.keyStories.map((story, i) => (
                            <li key={i}>{story}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-zinc-800 flex items-center justify-end">
                      <button
                        onClick={() => {
                          onAskZoya(
                            `ZOYA, श्रीमद्भागवत महापुराण के ${sk.name} की प्रमुख कथाएं और आध्यात्मिक रहस्य बताओ।`
                          );
                          onClose();
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        Ask ZOYA about Skandha {sk.skandhaNumber} <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: DASHAVATAR & DEITIES */}
          {/* ========================================================= */}
          {activeTab === "avatars" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-400">
                भगवान विष्णु के दशावतार एवं सनातन धर्म के प्रमुख देव-स्वरूप
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DASHAVATAR_AND_DEITIES.map((avatar, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-xl transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-xs font-bold text-amber-300">{avatar.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {avatar.role}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 mb-2 leading-relaxed">{avatar.keyStories}</p>

                      <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 text-[11px] space-y-1">
                        <div>
                          <strong className="text-emerald-400">आध्यात्मिक संदेश: </strong>
                          <span className="text-zinc-300">{avatar.spiritualSignificance}</span>
                        </div>
                        <div>
                          <strong className="text-amber-400/80">संबद्ध ग्रंथ: </strong>
                          <span className="text-zinc-400">{avatar.associatedPuranas.join(", ")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-end">
                      <button
                        onClick={() => {
                          onAskZoya(
                            `ZOYA, भगवान के ${avatar.name} की संपूर्ण कथा, उद्देश्य और आध्यात्मिक रहस्य बताओ।`
                          );
                          onClose();
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        Ask ZOYA <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: QUICK QUESTIONS (ASK ZOYA) */}
          {/* ========================================================= */}
          {activeTab === "ask" && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                यहाँ दिए गए किसी भी प्रश्न पर टैप करें, ZOYA तुरंत आपको प्रमाणित, शांत एवं सुबोध हिंदी में मार्गदर्शन देगी:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onAskZoya(q);
                      onClose();
                    }}
                    className="p-3 bg-zinc-900/80 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-500/50 rounded-xl text-left text-xs text-zinc-200 hover:text-amber-200 transition flex items-start gap-2.5 group"
                  >
                    <span className="text-amber-500 font-bold mt-0.5 group-hover:scale-110 transition-transform">
                      ✦
                    </span>
                    <span className="flex-1 font-medium">{q}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 flex-shrink-0 mt-0.5 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>सनातन परंपरा • श्रीमद्भगवद्गीता • अठारह महापुराण</span>
          </div>
          <div>Voice Command: "ZOYA, गीता का सबसे महत्वपूर्ण संदेश क्या है?"</div>
        </div>
      </div>
    </div>
  );
}

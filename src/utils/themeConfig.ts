export type ZoyaThemeColor =
  | "cyan"
  | "blue"
  | "purple"
  | "pink"
  | "green"
  | "red"
  | "orange"
  | "golden"
  | "white";

export interface ZoyaColorPalette {
  id: ZoyaThemeColor;
  name: string;
  primary: string;       // Primary vivid neon color
  secondary: string;     // Complementary / deeper neon accent
  bgCore: string;        // Radial core center shade
  glowRgb: string;       // "r, g, b" string for rgba calculations
  previewGradient: string; // Tailwind/CSS preview for swatch
}

export const ZOYA_THEME_COLORS: Record<ZoyaThemeColor, ZoyaColorPalette> = {
  cyan: {
    id: "cyan",
    name: "Cyan",
    primary: "#00E5FF",
    secondary: "#00BFFF",
    bgCore: "#001824",
    glowRgb: "0, 229, 255",
    previewGradient: "from-[#00E5FF] to-[#00BFFF]",
  },
  blue: {
    id: "blue",
    name: "Blue",
    primary: "#3B82F6",
    secondary: "#1D4ED8",
    bgCore: "#081630",
    glowRgb: "59, 130, 246",
    previewGradient: "from-[#3B82F6] to-[#1D4ED8]",
  },
  purple: {
    id: "purple",
    name: "Purple",
    primary: "#A855F7",
    secondary: "#7E22CE",
    bgCore: "#1d0830",
    glowRgb: "168, 85, 247",
    previewGradient: "from-[#A855F7] to-[#7E22CE]",
  },
  pink: {
    id: "pink",
    name: "Pink",
    primary: "#EC4899",
    secondary: "#BE185D",
    bgCore: "#2b091c",
    glowRgb: "236, 72, 153",
    previewGradient: "from-[#EC4899] to-[#BE185D]",
  },
  green: {
    id: "green",
    name: "Green",
    primary: "#10B981",
    secondary: "#059669",
    bgCore: "#062419",
    glowRgb: "16, 185, 129",
    previewGradient: "from-[#10B981] to-[#059669]",
  },
  red: {
    id: "red",
    name: "Red",
    primary: "#EF4444",
    secondary: "#B91C1C",
    bgCore: "#2a0a0a",
    glowRgb: "239, 68, 68",
    previewGradient: "from-[#EF4444] to-[#B91C1C]",
  },
  orange: {
    id: "orange",
    name: "Orange",
    primary: "#F97316",
    secondary: "#C2410C",
    bgCore: "#2a1205",
    glowRgb: "249, 115, 22",
    previewGradient: "from-[#F97316] to-[#C2410C]",
  },
  golden: {
    id: "golden",
    name: "Golden",
    primary: "#F59E0B",
    secondary: "#D97706",
    bgCore: "#2b1c04",
    glowRgb: "245, 158, 11",
    previewGradient: "from-[#FCD34D] to-[#F59E0B]",
  },
  white: {
    id: "white",
    name: "White",
    primary: "#F8FAFC",
    secondary: "#94A3B8",
    bgCore: "#18202c",
    glowRgb: "248, 250, 252",
    previewGradient: "from-[#FFFFFF] to-[#94A3B8]",
  },
};

export const COLOR_OPTIONS_LIST: ZoyaThemeColor[] = [
  "cyan",
  "blue",
  "purple",
  "pink",
  "green",
  "red",
  "orange",
  "golden",
  "white",
];

export const DEFAULT_THEME_COLOR: ZoyaThemeColor = "cyan";
export const DEFAULT_GLOW_INTENSITY: number = 75; // 75% default glow

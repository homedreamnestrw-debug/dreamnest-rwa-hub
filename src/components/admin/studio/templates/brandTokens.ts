export const COLORS = {
  warmWhite: "#FAFAF8",
  cream: "#F5F0E8",
  terracotta: "#C17A5A",
  taupe: "#8B7355",
  charcoal: "#2C2C2A",
  dustyRose: "#D4A5A0",
  forest: "#4A6B52",
  midnight: "#1F2A44",
} as const;

export type ColorKey = keyof typeof COLORS;

export const COLOR_OPTIONS: { key: ColorKey; label: string }[] = [
  { key: "terracotta", label: "Warm Terracotta" },
  { key: "charcoal", label: "Deep Charcoal" },
  { key: "cream", label: "Soft Cream" },
  { key: "dustyRose", label: "Dusty Rose" },
  { key: "forest", label: "Forest Green" },
  { key: "midnight", label: "Midnight Blue" },
];

export const FONTS = {
  serif: "Playfair Display",
  sans: "Inter",
  display: "Inter",
  script: "Dancing Script",
  editorial: "Playfair Display",
} as const;

export type FontKey = keyof typeof FONTS;

export const FONT_OPTIONS: { key: FontKey; label: string; weight: number }[] = [
  { key: "serif", label: "Elegant Serif", weight: 600 },
  { key: "sans", label: "Modern Sans-serif", weight: 500 },
  { key: "display", label: "Bold Display", weight: 900 },
  { key: "script", label: "Soft Script", weight: 700 },
  { key: "editorial", label: "Editorial Minimal", weight: 400 },
];

export type PlatformFormat = "ig_post" | "ig_story" | "whatsapp" | "fb_post";

export const FORMATS: Record<
  PlatformFormat,
  { w: number; h: number; label: string }
> = {
  ig_post: { w: 1080, h: 1080, label: "Instagram Post" },
  ig_story: { w: 1080, h: 1920, label: "IG Story / TikTok" },
  whatsapp: { w: 800, h: 800, label: "WhatsApp Catalogue" },
  fb_post: { w: 1200, h: 630, label: "Facebook Post" },
};

export type StyleVariant = "classic" | "bold" | "minimal" | "cozy" | "urgent";

export const STYLE_VARIANTS: { key: StyleVariant; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "bold", label: "Bold" },
  { key: "minimal", label: "Minimal" },
  { key: "cozy", label: "Cozy" },
  { key: "urgent", label: "Urgent" },
];

export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type TextPosition = "top" | "center" | "bottom";

export const TAGLINE = "Sweet dreams start with the perfect bedding...";
export const SITE_URL = "dreamnestrw.com";
export const WHATSAPP_NUMBER = "0788 742 122";
export const BRAND_NAME = "DreamNest";

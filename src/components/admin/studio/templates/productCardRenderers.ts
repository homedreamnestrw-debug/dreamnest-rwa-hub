import {
  COLORS,
  ColorKey,
  FONTS,
  FontKey,
  FORMATS,
  PlatformFormat,
  StyleVariant,
  LogoPosition,
  TextPosition,
  TAGLINE,
  SITE_URL,
  BRAND_NAME,
  WHATSAPP_NUMBER,
} from "./brandTokens";

export interface OverlayToggles {
  showName: boolean;
  showPrice: boolean;
  showNewArrival: boolean;
  showBestSeller: boolean;
  showLowStock: boolean;
  showSale: boolean;
  salePct: number;
  showSku: boolean;
  showDescription: boolean;
  showWatermarkUrl: boolean;
  showLogo: boolean;
  // New
  showCategoryStrip: boolean;
  categoryStripText: string;
  categoryStripStyle: "plain" | "terracotta" | "dark" | "underline";
  categoryStripFontSize: "sm" | "md";
  showAddress: boolean;
  addressText: string;
  showActionPhone: boolean;
  showActionWeb: boolean;
  showActionAddress: boolean;
  actionBarBg: "dark" | "terracotta" | "transparent";
  // Logo controls
  logoSize: "sm" | "md" | "lg";
  logoOpacity: number; // 50-100
  logoBg: "none" | "white" | "dark";
  logoScale: number; // 50-300, fine-grained scale on top of logoSize
  // Gallery
  galleryView: boolean;
  galleryPosition: "right" | "left" | "below";
  gallerySatCount: number; // 1..6
  gallerySatSize: number; // 50..150 (% of auto-fit)
  gallerySatShape: "square" | "circle" | "diamond";
  gallerySatGap: number; // 0..40 (px at 1080-base, scales with canvas)
  // Feature badges (reference-style)
  showSpecialDeal: boolean;
  specialDealOldPrice: string;
  specialDealNewPrice: string;
  showFeaturePills: boolean; // top-right gold circle pills
  featurePills: string[]; // independent list, add one by one
  showFeatureBar: boolean; // bottom gold-icon strip
  featureBarItems: string[]; // independent list, add one by one
  // Main image transform
  mainImageZoom: number; // 0.5..3 (1 = cover-fit)
  mainImageOffsetX: number; // -50..50 % of frame width
  mainImageOffsetY: number; // -50..50 % of frame height
  // Feature pills styling
  featurePillScale: number; // 0.5..2
  featurePillAccent: string; // hex (gold ring + glyph + underline)
  featurePillTextColor: string; // hex; empty = auto (depends on bg)
  // Feature bar styling
  featureBarScale: number; // 0.5..2
  featureBarAccent: string; // hex
  featureBarTextColor: string; // hex
  featureBarBgColor: string; // hex
  // Special deal styling
  specialDealAccent: string; // hex
  // Custom free text overlays (user-added)
  customTexts: CustomTextItem[];
}

export interface CustomTextItem {
  id: string;
  text: string;
  fontFamily: FontKey;
  fontSize: number; // px at 1080-base, scales with canvas width
  color: string; // hex
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  autoWrap: boolean; // wrap text within boxWidth
  boxWidth: number; // % of canvas width (10..100)
  boxHeight: number; // % of canvas height (5..100)
  bgColor: string; // hex or "" for transparent
  bgOpacity: number; // 0..100
  bgPadding: number; // px at 1080-base
}

export const DEFAULT_OVERLAYS: OverlayToggles = {
  showName: true,
  showPrice: true,
  showNewArrival: false,
  showBestSeller: false,
  showLowStock: false,
  showSale: false,
  salePct: 10,
  showSku: false,
  showDescription: false,
  showWatermarkUrl: true,
  showLogo: true,
  showCategoryStrip: true,
  categoryStripText:
    "Duvet | Bedsheet | Bedcovers | Storage Box | Blankets | Mattress Topper | Bathrobes | Towels",
  categoryStripStyle: "terracotta",
  categoryStripFontSize: "sm",
  showAddress: false,
  addressText: "31 KG 1 Ave, Kigali, Rwanda",
  showActionPhone: true,
  showActionWeb: true,
  showActionAddress: false,
  actionBarBg: "dark",
  logoSize: "md",
  logoOpacity: 100,
  logoBg: "none",
  galleryView: false,
  galleryPosition: "right",
  gallerySatCount: 4,
  gallerySatSize: 100,
  gallerySatShape: "square",
  gallerySatGap: 16,
  showSpecialDeal: false,
  specialDealOldPrice: "130,000",
  specialDealNewPrice: "100,000",
  showFeaturePills: false,
  featurePills: ["KING SIZE", "PURE COTTON"],
  showFeatureBar: false,
  featureBarItems: ["PREMIUM QUALITY", "SOFT & BREATHABLE", "COMFORT ALL NIGHT"],
  mainImageZoom: 1,
  mainImageOffsetX: 0,
  mainImageOffsetY: 0,
  featurePillScale: 1,
  featurePillAccent: "#D4A24A",
  featurePillTextColor: "",
  featureBarScale: 1,
  featureBarAccent: "#D4A24A",
  featureBarTextColor: "#F5EFE3",
  featureBarBgColor: "#1F1A14",
  specialDealAccent: "#D4A24A",
  customTexts: [],
};

export interface ProductData {
  id?: string;
  name: string;
  description?: string | null;
  price: number;
  sku?: string | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
  imageUrl?: string | null;
  images?: string[] | null;
  categoryName?: string | null;
}

export interface RenderConfig {
  style: StyleVariant;
  format: PlatformFormat;
  font: FontKey;
  color: ColorKey;
  overlayOpacity: number;
  logoPosition: LogoPosition;
  textPosition: TextPosition;
  overlays: OverlayToggles;
}

export function fmtRWF(n: number) {
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

export function getDimensions(format: PlatformFormat) {
  return FORMATS[format];
}

export function fontFamily(key: FontKey) {
  return FONTS[key];
}

export const TAG = TAGLINE;
export const URL = SITE_URL;
export const BRAND = BRAND_NAME;
export const PHONE = WHATSAPP_NUMBER;

// Layout meta — describes background tone so picker swatch is meaningful
export interface LayoutMeta {
  bg: "cream" | "warmWhite" | "charcoal" | "midnight" | "accent";
  description: string;
}

export const LAYOUT_META: Record<StyleVariant, LayoutMeta> = {
  editorial: {
    bg: "cream",
    description: "Clean rounded image panel · serif headline beside",
  },
  editorial_soft: {
    bg: "cream",
    description: "Image with soft top/bottom gradient · headline below",
  },
  magazine: {
    bg: "warmWhite",
    description: "Big serif over image with caps tagline above",
  },
  bold_banner: {
    bg: "midnight",
    description: "Dark bg · curved gold accent · circular discount badge",
  },
  catalogue: {
    bg: "charcoal",
    description: "Hero image left · feature list right · price tag",
  },
  ribbon: {
    bg: "accent",
    description: "Centered image card on accent ribbon background",
  },
  minimal_poster: {
    bg: "warmWhite",
    description: "Tons of white space · small image · tiny serif label",
  },
  split_dark: {
    bg: "charcoal",
    description: "Half image / half dark text panel — editorial split",
  },
};

// Logo position helper kept for backward compat with controls
export function getLogoBox(
  pos: LogoPosition,
  w: number,
  h: number,
  size: number,
) {
  const m = Math.round(w * 0.04);
  switch (pos) {
    case "top-left":
      return { x: m, y: m };
    case "top-right":
      return { x: w - size - m, y: m };
    case "bottom-left":
      return { x: m, y: h - size - m };
    case "bottom-right":
      return { x: w - size - m, y: h - size - m };
    case "center":
      return { x: (w - size) / 2, y: (h - size) / 2 };
  }
}

export function getTextBlockY(pos: TextPosition, h: number) {
  switch (pos) {
    case "top":
      return Math.round(h * 0.12);
    case "center":
      return Math.round(h * 0.42);
    case "bottom":
      return Math.round(h * 0.7);
  }
}

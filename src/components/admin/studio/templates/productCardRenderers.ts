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
}

export interface RenderConfig {
  style: StyleVariant;
  format: PlatformFormat;
  font: FontKey;
  color: ColorKey;
  overlayOpacity: number; // 0-80
  logoPosition: LogoPosition;
  textPosition: TextPosition;
  overlays: OverlayToggles;
}

// ---------- Style presets ----------

interface StylePreset {
  bg: ColorKey | "image";
  textColor: string;
  accent: ColorKey;
  defaultFont: FontKey;
  showImage: boolean;
  overlayBoost: number; // additional opacity factor for image-on-bg
}

export const STYLE_PRESETS: Record<StyleVariant, StylePreset> = {
  classic: {
    bg: "image",
    textColor: COLORS.warmWhite,
    accent: "terracotta",
    defaultFont: "serif",
    showImage: true,
    overlayBoost: 0.4,
  },
  bold: {
    bg: "charcoal",
    textColor: COLORS.warmWhite,
    accent: "terracotta",
    defaultFont: "display",
    showImage: true,
    overlayBoost: 0.6,
  },
  minimal: {
    bg: "warmWhite" as ColorKey,
    textColor: COLORS.charcoal,
    accent: "taupe",
    defaultFont: "sans",
    showImage: true,
    overlayBoost: 0.05,
  },
  cozy: {
    bg: "cream",
    textColor: COLORS.charcoal,
    accent: "dustyRose",
    defaultFont: "script",
    showImage: true,
    overlayBoost: 0.25,
  },
  urgent: {
    bg: "image",
    textColor: COLORS.warmWhite,
    accent: "terracotta",
    defaultFont: "display",
    showImage: true,
    overlayBoost: 0.45,
  },
};

// Some helpers

export function fmtRWF(n: number) {
  return `RWF ${Math.round(n).toLocaleString("en-US")}`;
}

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

export function getDimensions(format: PlatformFormat) {
  return FORMATS[format];
}

export function fontFamily(key: FontKey) {
  return FONTS[key];
}

export const TAG = TAGLINE;
export const URL = SITE_URL;
export const BRAND = BRAND_NAME;

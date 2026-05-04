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

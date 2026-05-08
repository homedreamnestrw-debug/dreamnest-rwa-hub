import { useEffect, useState } from "react";

export type StudioLanguage = "en" | "fr" | "rw";

export const LANGUAGE_OPTIONS: { value: StudioLanguage; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "rw", label: "Kinyarwanda", flag: "🇷🇼" },
];

const STORAGE_KEY = "dn_studio_language";

export function useStudioLanguage(initial: StudioLanguage = "en") {
  const [language, setLanguageState] = useState<StudioLanguage>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const v = sessionStorage.getItem(STORAGE_KEY) as StudioLanguage | null;
      return v && ["en", "fr", "rw"].includes(v) ? v : initial;
    } catch {
      return initial;
    }
  });
  const setLanguage = (v: StudioLanguage) => {
    setLanguageState(v);
    try {
      sessionStorage.setItem(STORAGE_KEY, v);
    } catch {}
  };
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, language);
    } catch {}
  }, [language]);
  return { language, setLanguage };
}

// Canvas action bar / CTA strings per language
export const CANVAS_STRINGS: Record<
  StudioLanguage,
  { orderHere: string; shopOnline: string; tagline: string }
> = {
  en: {
    orderHere: "Order here",
    shopOnline: "Shop online",
    tagline: "Sweet dreams start with the perfect bedding…",
  },
  fr: {
    orderHere: "Commander ici",
    shopOnline: "Acheter en ligne",
    tagline: "De beaux rêves commencent avec la literie parfaite…",
  },
  rw: {
    orderHere: "Tūra hano",
    shopOnline: "Gura kuri interineti",
    tagline: "Ibikebanye biroroshye bitangira n'ibitanda byiza…",
  },
};

// Detect best language from browser locale, falling back to English
export function detectBrowserLanguage(): StudioLanguage {
  if (typeof navigator === "undefined") return "en";
  const langs = (navigator.languages ?? [navigator.language ?? "en"]).map((l) =>
    l.toLowerCase(),
  );
  for (const l of langs) {
    if (l.startsWith("fr")) return "fr";
    if (l.startsWith("rw") || l.startsWith("kin")) return "rw";
    if (l.startsWith("en")) return "en";
  }
  return "en";
}

export function pickLocalizedDescription(
  product: {
    description?: string | null;
    description_fr?: string | null;
    description_rw?: string | null;
  },
  lang: StudioLanguage = detectBrowserLanguage(),
): string {
  if (lang === "fr" && product.description_fr) return product.description_fr;
  if (lang === "rw" && product.description_rw) return product.description_rw;
  return product.description || "";
}

import { supabase } from "@/integrations/supabase/client";

/** 3-letter code from a category/product name, e.g. "Bedding" -> "BED". */
export const codeFrom = (text: string | null | undefined, len = 3) => {
  const clean = (text || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
  if (!clean) return "GEN";
  const words = clean.split(/\s+/);
  const code = words.length > 1 && len <= words.length
    ? words.map((w) => w[0]).join("").slice(0, len)
    : clean.replace(/\s+/g, "").slice(0, len);
  return code.padEnd(len, "X");
};

/** Short code for a variant value combo, e.g. "Queen / Beige" -> "QU-BE". */
export const variantCode = (variantName: string, index: number) => {
  const parts = variantName.split(/[\/,|]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return `V${index + 1}`;
  return parts.map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2) || "X").join("-");
};

export const buildVariantSku = (baseSku: string, variantName: string, index: number) =>
  `${baseSku || "DN"}-${variantCode(variantName, index)}`;

/** Loads all existing product SKUs (uppercased) for uniqueness checks. */
export async function loadExistingSkus(): Promise<Set<string>> {
  const { data } = await supabase.from("products").select("sku");
  return new Set((data || []).map((r) => (r.sku || "").toUpperCase()).filter(Boolean));
}

/** Generates the next unique SKU like DN-BED-001 given the taken set (mutates set). */
export function nextSku(categoryName: string | null | undefined, taken: Set<string>): string {
  const prefix = `DN-${codeFrom(categoryName)}-`;
  let n = 1;
  taken.forEach((s) => {
    if (s.startsWith(prefix)) {
      const num = parseInt(s.slice(prefix.length), 10);
      if (!Number.isNaN(num) && num >= n) n = num + 1;
    }
  });
  let sku = `${prefix}${String(n).padStart(3, "0")}`;
  while (taken.has(sku)) { n++; sku = `${prefix}${String(n).padStart(3, "0")}`; }
  taken.add(sku);
  return sku;
}

/** "Queen / Beige" -> {"Option 1":"Queen","Option 2":"Beige"}; single -> {"Variant": name}. */
export function parseVariantAttributes(variantName: string, optionNames: string[] = []): Record<string, string> {
  const parts = variantName.split(/[\/,|]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1 && optionNames.length <= 1) {
    return { [optionNames[0] || "Variant"]: variantName.trim() };
  }
  const out: Record<string, string> = {};
  parts.forEach((p, i) => { out[optionNames[i] || `Option ${i + 1}`] = p; });
  return out;
}

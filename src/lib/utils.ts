import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns product images filtered to only those visible on the public shop. */
export function visibleImages(p: { images?: string[] | null; hidden_images?: string[] | null }): string[] {
  const all = p?.images ?? [];
  const hidden = new Set(p?.hidden_images ?? []);
  return all.filter((u) => !hidden.has(u));
}

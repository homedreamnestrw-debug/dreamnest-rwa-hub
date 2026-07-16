import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear,
  subDays, subMonths,
} from "date-fns";

export type TimelinePreset =
  | "this_month" | "last_month" | "last_7" | "last_30"
  | "this_year" | "all" | "custom";

export const TIMELINE_LABELS: Record<TimelinePreset, string> = {
  this_month: "This month",
  last_month: "Last month",
  last_7: "Last 7 days",
  last_30: "Last 30 days",
  this_year: "This year",
  all: "All time",
  custom: "Custom range",
};

export const TIMELINE_ORDER: TimelinePreset[] = [
  "this_month", "last_month", "last_7", "last_30", "this_year", "all", "custom",
];

export interface DateBounds { from: Date | null; to: Date | null }

export function rangeFromPreset(
  preset: TimelinePreset,
  custom?: { from?: string; to?: string }
): DateBounds {
  const now = new Date();
  switch (preset) {
    case "this_month": return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case "last_7":  return { from: startOfDay(subDays(now, 6)),  to: endOfDay(now) };
    case "last_30": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "this_year": return { from: startOfYear(now), to: endOfDay(now) };
    case "all": return { from: null, to: null };
    case "custom": return {
      from: custom?.from ? startOfDay(new Date(custom.from)) : null,
      to:   custom?.to   ? endOfDay(new Date(custom.to))     : null,
    };
  }
}

export function inRange(iso: string | Date | null | undefined, r: DateBounds): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (r.from && t < r.from.getTime()) return false;
  if (r.to && t > r.to.getTime()) return false;
  return true;
}

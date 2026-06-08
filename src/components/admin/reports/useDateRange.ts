import { useEffect, useMemo, useState } from "react";
import {
  startOfDay, endOfDay, startOfMonth, endOfMonth, startOfQuarter,
  startOfYear, subDays, subMonths, subYears, differenceInCalendarDays,
} from "date-fns";

export type RangePreset =
  | "today" | "yesterday" | "last7" | "last30"
  | "thisMonth" | "lastMonth" | "thisQuarter" | "ytd" | "lastYear" | "custom";

export type Granularity = "day" | "week" | "month";

export interface DateRange { from: Date; to: Date }

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today", yesterday: "Yesterday", last7: "Last 7 days", last30: "Last 30 days",
  thisMonth: "This month", lastMonth: "Last month", thisQuarter: "This quarter",
  ytd: "Year to date", lastYear: "Last year", custom: "Custom",
};

export function rangeFromPreset(p: RangePreset, custom?: DateRange): DateRange {
  const now = new Date();
  switch (p) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case "last7": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "last30": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisMonth": return { from: startOfMonth(now), to: endOfDay(now) };
    case "lastMonth": { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case "thisQuarter": return { from: startOfQuarter(now), to: endOfDay(now) };
    case "ytd": return { from: startOfYear(now), to: endOfDay(now) };
    case "lastYear": { const ly = subYears(now, 1); return { from: startOfYear(ly), to: endOfMonth(new Date(ly.getFullYear(), 11, 1)) }; }
    case "custom": return custom ?? { from: startOfDay(now), to: endOfDay(now) };
  }
}

export function previousRange(r: DateRange): DateRange {
  const days = Math.max(1, differenceInCalendarDays(r.to, r.from) + 1);
  return { from: startOfDay(subDays(r.from, days)), to: endOfDay(subDays(r.to, days)) };
}

export function autoGranularity(r: DateRange): Granularity {
  const d = differenceInCalendarDays(r.to, r.from);
  if (d <= 31) return "day";
  if (d <= 120) return "week";
  return "month";
}

export interface ReportRangeState {
  preset: RangePreset;
  custom?: DateRange;
  compare: boolean;
  granularity: Granularity;
}

export function useReportRange(storageKey: string, initial: RangePreset = "last30") {
  const [state, setState] = useState<ReportRangeState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          preset: p.preset ?? initial,
          custom: p.custom ? { from: new Date(p.custom.from), to: new Date(p.custom.to) } : undefined,
          compare: !!p.compare,
          granularity: p.granularity ?? "day",
        };
      }
    } catch {}
    return { preset: initial, compare: false, granularity: "day" };
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
  }, [state, storageKey]);

  const range = useMemo(() => rangeFromPreset(state.preset, state.custom), [state.preset, state.custom]);
  const prevRangeMemo = useMemo(() => previousRange(range), [range]);
  const granularity = state.granularity || autoGranularity(range);

  return { state, setState, range, prevRange: prevRangeMemo, granularity };
}

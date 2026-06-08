import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, startOfWeek, startOfMonth } from "date-fns";
import type { Granularity } from "@/components/admin/reports/useDateRange";

export const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n || 0);

export const formatInt = (n: number) => new Intl.NumberFormat("en-RW").format(n || 0);

export function pctDelta(curr: number, prev: number): number | null {
  if (!prev) return curr ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

export function bucketKey(date: Date, g: Granularity): string {
  if (g === "month") return format(startOfMonth(date), "yyyy-MM");
  if (g === "week") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(date, "yyyy-MM-dd");
}

export function bucketLabel(key: string, g: Granularity): string {
  const d = new Date(key);
  if (g === "month") return format(d, "MMM yyyy");
  if (g === "week") return `Wk ${format(d, "MMM d")}`;
  return format(d, "MMM d");
}

export function emptyBuckets(from: Date, to: Date, g: Granularity): Record<string, number> {
  const items =
    g === "month" ? eachMonthOfInterval({ start: from, end: to })
    : g === "week" ? eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
    : eachDayOfInterval({ start: from, end: to });
  const out: Record<string, number> = {};
  items.forEach((d) => { out[bucketKey(d, g)] = 0; });
  return out;
}

export function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

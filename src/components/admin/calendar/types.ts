export type EventType =
  | "reminder" | "task" | "delivery" | "invoice"
  | "marketing" | "staff" | "operations" | "holiday" | "customer";

export type Priority = "low" | "medium" | "high" | "urgent";
export type EventStatus = "pending" | "completed" | "cancelled";
export type TaskStatus = "todo" | "in_progress" | "completed" | "cancelled";
export type TaskCategory = "marketing" | "operations" | "stock" | "finance" | "staff" | "other";
export type Recurrence = "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  color: string;
  priority: Priority;
  status: EventStatus;
  assigned_to: string | null;
  created_by: string | null;
  is_recurring: boolean;
  recurrence_rule: Recurrence | null;
  recurrence_interval: number;
  recurrence_days_of_week: number[];
  recurrence_count: number | null;
  recurrence_end_date: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  reminder_minutes_before: number | null;
  notes: string | null;
  attachments: string[];
  is_system: boolean;
}

export interface CalendarTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  category: TaskCategory;
  linked_event_id: string | null;
  is_recurring: boolean;
  recurrence_rule: Recurrence | null;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  completed_at: string | null;
}

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "reminder", label: "Reminder" },
  { value: "task", label: "Task" },
  { value: "delivery", label: "Delivery" },
  { value: "invoice", label: "Invoice" },
  { value: "marketing", label: "Marketing" },
  { value: "staff", label: "Staff" },
  { value: "operations", label: "Operations" },
  { value: "customer", label: "Customer" },
  { value: "holiday", label: "Holiday" },
];

export const TYPE_COLORS: Record<EventType, string> = {
  invoice: "#DC2626",
  delivery: "#EA580C",
  marketing: "#CA8A04",
  staff: "#2563EB",
  operations: "#2563EB",
  customer: "#DB2777",
  reminder: "#60432E",
  task: "#7C3AED",
  holiday: "#059669",
};

export const PALETTE = [
  "#60432E", "#C48A5A", "#DC2626", "#EA580C",
  "#CA8A04", "#059669", "#2563EB", "#7C3AED", "#DB2777",
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const PRIORITY_BORDER: Record<Priority, string> = {
  low: "border-l-emerald-500",
  medium: "border-l-amber-500",
  high: "border-l-orange-600",
  urgent: "border-l-red-600",
};

export const TASK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "stock", label: "Stock" },
  { value: "finance", label: "Finance" },
  { value: "staff", label: "Staff" },
  { value: "other", label: "Other" },
];

export const TASK_COLUMNS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const REMINDER_OPTIONS = [
  { value: "none", label: "No reminder" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "4320", label: "3 days before" },
];

export function eventStart(e: CalendarEvent): Date {
  return new Date(`${e.start_date}T${e.all_day ? "00:00" : (e.start_time ?? "00:00").slice(0, 5)}:00`);
}

export function eventEnd(e: CalendarEvent): Date {
  const date = e.end_date || e.start_date;
  if (e.all_day) {
    const d = new Date(`${date}T23:59:00`);
    return d;
  }
  return new Date(`${date}T${(e.end_time ?? e.start_time ?? "01:00").slice(0, 5)}:00`);
}

export function toDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function isOverdue(t: CalendarTask): boolean {
  if (!t.due_date || t.status === "completed" || t.status === "cancelled") return false;
  const due = new Date(`${t.due_date}T${(t.due_time ?? "23:59").slice(0, 5)}:00`);
  return due.getTime() < Date.now();
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const KIGALI_OFFSET = "+02:00";
const DAY_MS = 24 * 60 * 60 * 1000;

type AlertPriority = "low" | "medium" | "high" | "urgent";

interface CalendarEventAlertRow {
  id: string;
  title: string;
  start_date: string;
  start_time: string | null;
  all_day: boolean;
  color: string;
  priority: AlertPriority;
}

interface CalendarTaskAlertRow {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: AlertPriority;
}

export interface CalendarAlert {
  id: string;
  title: string;
  kind: "event" | "task";
  when: Date;
  allDay: boolean;
  color: string | null;
  priority: AlertPriority;
}

function kigaliDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function fromKigali(date: string, time: string) {
  return new Date(`${date}T${time.slice(0, 5)}:00${KIGALI_OFFSET}`);
}

export function formatCalendarAlertTime(alert: CalendarAlert) {
  const now = new Date();
  const day = kigaliDateKey(alert.when) === kigaliDateKey(now) ? "Today" : "Tomorrow";
  if (alert.allDay) return `${day}, all day`;
  const time = new Intl.DateTimeFormat(undefined, {
    timeZone: "Africa/Kigali",
    hour: "numeric",
    minute: "2-digit",
  }).format(alert.when);
  return `${day}, ${time}`;
}

export function useCalendarAlerts() {
  const { user, isStaff } = useAuth();
  const [events, setEvents] = useState<CalendarEventAlertRow[]>([]);
  const [tasks, setTasks] = useState<CalendarTaskAlertRow[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!user || !isStaff) {
      setEvents([]);
      setTasks([]);
      return;
    }

    const tomorrow = kigaliDateKey(new Date(Date.now() + DAY_MS));
    const [{ data: eventRows }, { data: taskRows }] = await Promise.all([
      supabase
        .from("calendar_events")
        .select("id, title, start_date, start_time, all_day, color, priority")
        .eq("status", "pending")
        .lte("start_date", tomorrow),
      supabase
        .from("calendar_tasks")
        .select("id, title, due_date, due_time, priority")
        .in("status", ["todo", "in_progress"])
        .not("due_date", "is", null)
        .lte("due_date", tomorrow),
    ]);

    setEvents((eventRows ?? []) as CalendarEventAlertRow[]);
    setTasks((taskRows ?? []) as CalendarTaskAlertRow[]);
    setNow(Date.now());
  }, [isStaff, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user || !isStaff) return;

    const channel = supabase
      .channel(`calendar-alerts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_tasks" }, load)
      .subscribe();
    const interval = window.setInterval(() => void load(), 60_000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener("calendar-data-changed", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("calendar-data-changed", refresh);
      void supabase.removeChannel(channel);
    };
  }, [isStaff, load, user]);

  const { upcoming, overdueCount } = useMemo(() => {
    const end = now + DAY_MS;
    const today = kigaliDateKey(new Date(now));
    const upcomingEvents: CalendarAlert[] = events.flatMap((event) => {
      let when = fromKigali(event.start_date, event.all_day ? "00:00" : event.start_time ?? "09:00");
      if (event.all_day && event.start_date === today && when.getTime() < now) when = new Date(now);
      if (when.getTime() < now || when.getTime() > end) return [];
      return [{
        id: `event-${event.id}`,
        title: event.title,
        kind: "event" as const,
        when,
        allDay: event.all_day,
        color: event.color,
        priority: event.priority,
      }];
    });

    let overdue = 0;
    const upcomingTasks: CalendarAlert[] = tasks.flatMap((task) => {
      if (!task.due_date) return [];
      const when = fromKigali(task.due_date, task.due_time ?? "23:59");
      if (when.getTime() < now) {
        overdue += 1;
        return [];
      }
      if (when.getTime() > end) return [];
      return [{
        id: `task-${task.id}`,
        title: task.title,
        kind: "task" as const,
        when,
        allDay: !task.due_time,
        color: null,
        priority: task.priority,
      }];
    });

    return {
      upcoming: [...upcomingEvents, ...upcomingTasks].sort((a, b) => a.when.getTime() - b.when.getTime()),
      overdueCount: overdue,
    };
  }, [events, now, tasks]);

  return { upcoming, overdueCount, reload: load };
}
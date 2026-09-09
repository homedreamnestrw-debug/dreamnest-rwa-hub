import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarEvent, CalendarTask } from "./types";

export interface StaffMember {
  user_id: string;
  full_name: string;
}

export function useCalendarData() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [ev, tk, roles] = await Promise.all([
      supabase.from("calendar_events").select("*").order("start_date"),
      supabase.from("calendar_tasks").select("*").order("due_date", { nullsFirst: false }),
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "staff", "stock_manager"]),
    ]);

    setEvents((ev.data as any) || []);
    setTasks((tk.data as any) || []);

    const ids = Array.from(new Set(((roles.data as any[]) || []).map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      setStaff(
        (profiles || []).map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name || "Team member",
        }))
      );
    } else {
      setStaff([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveEvent = async (payload: Partial<CalendarEvent> & { id?: string }) => {
    const { id, ...rest } = payload;
    if (id) {
      const { error } = await supabase.from("calendar_events").update(rest as any).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("calendar_events")
        .insert({ ...(rest as any), created_by: user?.id ?? null });
      if (error) throw error;
    }
    await load();
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) throw error;
    await load();
  };

  const saveTask = async (payload: Partial<CalendarTask> & { id?: string }) => {
    const { id, ...rest } = payload;
    if (id) {
      const { error } = await supabase.from("calendar_tasks").update(rest as any).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("calendar_tasks")
        .insert({ ...(rest as any), created_by: user?.id ?? null });
      if (error) throw error;
    }
    await load();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("calendar_tasks").delete().eq("id", id);
    if (error) throw error;
    await load();
  };

  return { events, tasks, staff, loading, reload: load, saveEvent, deleteEvent, saveTask, deleteTask };
}

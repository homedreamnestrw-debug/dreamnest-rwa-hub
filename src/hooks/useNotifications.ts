import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AppNotification {
  id: string;
  audience: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
  read: boolean;
}

export function useNotifications(limit = 30) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const [{ data: rows }, { data: reads }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, audience, type, title, body, link, created_at")
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase.from("notification_reads").select("notification_id").eq("user_id", user.id),
    ]);
    const readSet = new Set((reads ?? []).map((r: any) => r.notification_id));
    setNotifications(
      (rows ?? []).map((n: any) => ({ ...n, read: readSet.has(n.id) })) as AppNotification[]
    );
    setLoading(false);
  }, [user, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const markRead = useCallback(
    async (id: string) => {
      if (!user) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase
        .from("notification_reads")
        .upsert({ notification_id: id, user_id: user.id }, { onConflict: "notification_id,user_id" });
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notification_reads").upsert(
      unread.map((n) => ({ notification_id: n.id, user_id: user.id })),
      { onConflict: "notification_id,user_id" }
    );
  }, [user, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, reload: load };
}

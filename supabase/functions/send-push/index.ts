import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HOOK_SECRET = Deno.env.get("PUSH_HOOK_SECRET") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@dreamnest.rw";

const STAFF_ROLES = ["admin", "staff", "stock_manager"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    if (!HOOK_SECRET || req.headers.get("x-hook-secret") !== HOOK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json({ error: "Push not configured" }, 500);
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const body = await req.json().catch(() => ({}));
    const notificationId = typeof body?.notification_id === "string" ? body.notification_id : null;
    if (!notificationId) return json({ error: "notification_id is required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: notification, error: nErr } = await supabase
      .from("notifications")
      .select("id, audience, type, title, body, link, user_id")
      .eq("id", notificationId)
      .maybeSingle();
    if (nErr) throw nErr;
    if (!notification) return json({ error: "Notification not found" }, 404);

    // Resolve recipient user ids
    let userIds: string[] = [];
    if (notification.user_id) {
      userIds = [notification.user_id];
    } else if (notification.audience === "staff") {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", STAFF_ROLES);
      if (rErr) throw rErr;
      userIds = [...new Set((roles ?? []).map((r) => r.user_id))];
    }

    if (userIds.length === 0) return json({ sent: 0, reason: "no recipients" });

    const { data: subs, error: sErr } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (sErr) throw sErr;
    if (!subs || subs.length === 0) return json({ sent: 0, reason: "no subscriptions" });

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body ?? "",
      link: notification.link ?? "/",
      type: notification.type,
      tag: notification.type,
    });

    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) dead.push(s.id);
          else console.error("push failed", status);
        }
      })
    );

    if (dead.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", dead);
    }

    return json({ sent, removed: dead.length });
  } catch (err) {
    console.error("send-push error", err);
    return json({ error: "Failed to send push" }, 500);
  }
});

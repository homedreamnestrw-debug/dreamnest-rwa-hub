import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
    ? "Chrome"
    : /Firefox\//.test(ua)
    ? "Firefox"
    : /Safari\//.test(ua)
    ? "Safari"
    : "Browser";
  return `${browser} on ${detectPlatform()}`;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);
  const needsInstall = isIOS && !isStandalone;

  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : "denied"
  );

  const refresh = useCallback(async () => {
    if (!supported || !user) {
      setEnabled(false);
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      setEnabled(Boolean(sub));
    } catch {
      setEnabled(false);
    }
  }, [supported, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported || !user) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;

      const { data, error } = await supabase.functions.invoke("push-config");
      if (error || !data?.publicKey) throw new Error("Missing VAPID public key");

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }

      const p256dh = arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = arrayBufferToBase64(sub.getKey("auth"));

      const { error: dbError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          platform: detectPlatform(),
          device_label: deviceLabel(),
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
      if (dbError) throw dbError;

      setEnabled(true);
      return true;
    } catch (err) {
      console.error("enable push failed", err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch (err) {
      console.error("disable push failed", err);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, enabled, busy, permission, needsInstall, enable, disable, refresh };
}

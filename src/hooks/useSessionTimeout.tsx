import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STAFF_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CUSTOMER_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const WARNING_LEAD_MS = 2 * 60 * 1000; // 2 minutes before

export function useSessionTimeout() {
  const { user, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const warnTimer = useRef<number | null>(null);
  const logoutTimer = useRef<number | null>(null);
  const countdown = useRef<number | null>(null);
  const lastSyncRef = useRef<number>(0);

  const timeoutMs = isStaff ? STAFF_TIMEOUT_MS : CUSTOMER_TIMEOUT_MS;

  const doLogout = useCallback(async () => {
    if (user) {
      try {
        await supabase.from("auth_logs").insert({
          user_id: user.id,
          email: user.email,
          action: "timeout",
          user_agent: navigator.userAgent,
        });
      } catch {}
    }
    await signOut();
    navigate("/auth/login?reason=inactivity", { replace: true });
  }, [user, signOut, navigate]);

  const resetTimers = useCallback(() => {
    if (warnTimer.current) window.clearTimeout(warnTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
    if (countdown.current) window.clearInterval(countdown.current);
    setShowWarning(false);
    if (!user) return;

    warnTimer.current = window.setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.floor(WARNING_LEAD_MS / 1000));
      countdown.current = window.setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, timeoutMs - WARNING_LEAD_MS);

    logoutTimer.current = window.setTimeout(() => {
      doLogout();
    }, timeoutMs);

    // Throttle activity sync to Supabase (once per 60s)
    const now = Date.now();
    if (now - lastSyncRef.current > 60_000) {
      lastSyncRef.current = now;
      supabase
        .from("profiles")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .then(() => {});
    }
  }, [user, timeoutMs, doLogout]);

  useEffect(() => {
    if (!user) {
      if (warnTimer.current) window.clearTimeout(warnTimer.current);
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
      if (countdown.current) window.clearInterval(countdown.current);
      setShowWarning(false);
      return;
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    const handler = () => resetTimers();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (warnTimer.current) window.clearTimeout(warnTimer.current);
      if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
      if (countdown.current) window.clearInterval(countdown.current);
    };
  }, [user, resetTimers]);

  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  return { showWarning, secondsLeft, stayLoggedIn, doLogout };
}

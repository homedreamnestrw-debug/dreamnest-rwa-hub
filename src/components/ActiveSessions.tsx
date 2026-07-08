import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Session = {
  id: string;
  device: string | null;
  browser: string | null;
  ip_address: string | null;
  location: string | null;
  last_active_at: string;
  created_at: string;
  session_token: string | null;
};

function parseUA(ua: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  const device = isMobile ? "Mobile" : "Desktop";
  return { browser, device };
}

function getSessionToken(): string {
  let t = localStorage.getItem("dn_session_token");
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem("dn_session_token", t);
  }
  return t;
}

export function ActiveSessions() {
  const { user, signOut } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentToken] = useState(getSessionToken);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("active_sessions")
      .select("*")
      .eq("user_id", user.id)
      .is("terminated_at", null)
      .order("last_active_at", { ascending: false });
    setSessions((data as Session[]) || []);
    setLoading(false);
  };

  // Register / heartbeat this session
  useEffect(() => {
    if (!user) return;
    const { browser, device } = parseUA(navigator.userAgent);
    const register = async () => {
      await supabase.from("active_sessions").upsert(
        {
          user_id: user.id,
          session_token: currentToken,
          user_agent: navigator.userAgent,
          browser,
          device,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "session_token" }
      );
      load();
    };
    register();
    const h = window.setInterval(() => {
      supabase
        .from("active_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("session_token", currentToken)
        .then(() => {});
    }, 60_000);
    return () => window.clearInterval(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const terminate = async (s: Session) => {
    const isCurrent = s.session_token === currentToken;
    await supabase
      .from("active_sessions")
      .update({ terminated_at: new Date().toISOString() })
      .eq("id", s.id);
    toast({ title: isCurrent ? "Signing out this device..." : "Session terminated" });
    if (isCurrent) {
      await signOut();
    } else {
      load();
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>Devices currently signed in to your account. Sign out any you don't recognize.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          sessions.map((s) => {
            const isCurrent = s.session_token === currentToken;
            const Icon = s.device === "Mobile" ? Smartphone : Monitor;
            return (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {s.browser} · {s.device}
                      {isCurrent && <Badge variant="secondary">This device</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last active {formatDistanceToNow(new Date(s.last_active_at), { addSuffix: true })}
                      {s.ip_address ? ` · ${s.ip_address}` : ""}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => terminate(s)}>
                  <Trash2 className="h-4 w-4 mr-1" /> {isCurrent ? "Sign out" : "Terminate"}
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import loginBedroom from "@/assets/login-bedroom.jpg";

const LOCK_KEY = "dn_login_lock";
const ATTEMPTS_KEY = "dn_login_attempts";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const stored = localStorage.getItem(LOCK_KEY);
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) setLockedUntil(until);
      else {
        localStorage.removeItem(LOCK_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const inactivityMsg = params.get("reason") === "inactivity";
  const isLocked = lockedUntil !== null && lockedUntil > now;
  const remainingMs = isLocked ? lockedUntil! - now : 0;
  const remMin = Math.floor(remainingMs / 60000);
  const remSec = Math.floor((remainingMs % 60000) / 1000);

  const logAuth = async (action: string, userId?: string | null) => {
    try {
      await supabase.from("auth_logs").insert({
        user_id: userId ?? null,
        email,
        action,
        user_agent: navigator.userAgent,
      });
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0", 10) + 1;
      localStorage.setItem(ATTEMPTS_KEY, String(attempts));
      await logAuth("failed_login");
      if (attempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_MS;
        localStorage.setItem(LOCK_KEY, String(until));
        setLockedUntil(until);
        await logAuth("locked");
        toast.error("Account locked for 15 minutes due to too many failed attempts");
      } else {
        toast.error(`${error.message} (${MAX_ATTEMPTS - attempts} attempts left)`);
      }
    } else {
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCK_KEY);
      await logAuth("login", data.user?.id);
      toast.success("Welcome back!");
      navigate("/");
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  };

  return (
    <PublicLayout>
    <div className="min-h-[calc(100vh-10rem)] flex">
      {/* Left side — branding */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src={loginBedroom}
          alt="Premium bedding in a serene bedroom"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/40 to-primary/70" />
        <div className="relative z-10 h-full flex items-center justify-center p-12">
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-serif text-primary-foreground drop-shadow-md">DreamNest</h1>
            <p className="text-primary-foreground/90 text-lg max-w-md drop-shadow">
              Premium bedding & home decor — crafted for comfort, designed for elegance.
            </p>
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-serif text-foreground">Welcome Back</h2>
            <p className="mt-2 text-muted-foreground">Sign in to your account</p>
          </div>

          {inactivityMsg && (
            <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-200">
              You were logged out due to inactivity.
            </div>
          )}
          {isLocked && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Too many attempts. Try again in {remMin}:{remSec.toString().padStart(2, "0")}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/auth/forgot-password" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              Remember me for 30 days (customers only)
            </label>
            <Button type="submit" className="w-full" disabled={loading || isLocked}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/auth/signup" className="font-medium text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
    </PublicLayout>
  );
}

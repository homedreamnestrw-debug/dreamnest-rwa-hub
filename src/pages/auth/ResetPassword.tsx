import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PasswordStrengthMeter, checkPassword } from "@/components/PasswordStrengthMeter";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = checkPassword(password);
    if (!pw.valid) {
      toast.error("Password too weak: " + pw.errors.join(", "));
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      if (userData.user) {
        await supabase.from("profiles")
          .update({ last_password_change: new Date().toISOString() })
          .eq("user_id", userData.user.id);
        await supabase.from("auth_logs").insert({
          user_id: userData.user.id,
          email: userData.user.email,
          action: "password_reset",
          user_agent: navigator.userAgent,
        });
      }
      toast.success("Password updated successfully!");
      navigate("/");
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-serif">Invalid Link</h2>
          <p className="text-muted-foreground">This password reset link is invalid or has expired.</p>
          <Button variant="outline" onClick={() => navigate("/auth/forgot-password")}>Request New Link</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-serif">Set New Password</h2>
          <p className="mt-2 text-muted-foreground">Enter your new password below</p>
        </div>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            <PasswordStrengthMeter password={password} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

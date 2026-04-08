import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-3xl font-serif">Email Sent</h2>
          <p className="text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, you'll receive a password reset link.
          </p>
          <Link to="/auth/login"><Button variant="outline" className="mt-4">Back to Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-serif">Reset Password</h2>
          <p className="mt-2 text-muted-foreground">Enter your email to receive a reset link</p>
        </div>
        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth/login" className="font-medium text-foreground hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

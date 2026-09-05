import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

const DISMISS_KEY = "dreamnest-admin-push-prompt";
const SNOOZE_DAYS = 7;

export function AdminPushPrompt() {
  const { user } = useAuth();
  const { supported, enabled, busy, permission, needsInstall, enable } = usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !supported || enabled || permission === "denied") {
      setOpen(false);
      return;
    }
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < until) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [user, supported, enabled, permission]);

  const snooze = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    setOpen(false);
  };

  const handleEnable = async () => {
    const ok = await enable();
    if (ok) {
      toast.success("Notifications enabled on this device");
      setOpen(false);
    } else if (Notification.permission === "denied") {
      toast.error("Notifications are blocked in your browser settings");
      snooze();
    } else {
      toast.error("Could not enable notifications");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? snooze() : setOpen(o))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Bell className="h-5 w-5" /> Turn on alerts for this device
          </DialogTitle>
          <DialogDescription>
            Get instant alerts for new orders, payments, customer messages and low stock — even
            when DreamNest is closed.
          </DialogDescription>
        </DialogHeader>

        {needsInstall ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            On iPhone or iPad, first add DreamNest to your Home Screen: tap the{" "}
            <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. Open the app
            from the Home Screen and turn alerts on from Settings.
          </div>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={snooze} className="sm:mr-auto">
            Not now
          </Button>
          {!needsInstall && (
            <Button onClick={handleEnable} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enable notifications
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

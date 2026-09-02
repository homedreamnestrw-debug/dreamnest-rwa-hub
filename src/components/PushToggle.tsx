import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushToggle({ description }: { description?: string }) {
  const { supported, enabled, busy, permission, needsInstall, enable, disable } =
    usePushNotifications();

  const handleChange = async (checked: boolean) => {
    if (checked) {
      const ok = await enable();
      if (ok) toast.success("Notifications enabled on this device");
      else if (Notification.permission === "denied")
        toast.error("Notifications are blocked in your browser settings");
      else toast.error("Could not enable notifications");
    } else {
      await disable();
      toast.success("Notifications disabled on this device");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-xl flex items-center gap-2">
          <Bell className="h-5 w-5" /> Device Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {description ?? "Get alerts on this device, even when DreamNest is closed."}
        </p>

        {needsInstall ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            On iPhone or iPad, first add DreamNest to your Home Screen: tap the{" "}
            <strong>Share</strong> button, then <strong>Add to Home Screen</strong>. Open the app
            from the Home Screen and come back here to turn notifications on.
          </div>
        ) : !supported ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            This browser does not support push notifications.
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="push-toggle">Enable on this device</Label>
              <p className="text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Blocked — allow notifications in your browser settings first."
                  : enabled
                  ? "Active on this device"
                  : "Currently off"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                id="push-toggle"
                checked={enabled}
                disabled={busy || permission === "denied"}
                onCheckedChange={handleChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Bell, CalendarDays, CheckCheck, ListTodo } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { CalendarAlert, formatCalendarAlertTime } from "@/hooks/useCalendarAlerts";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface NotificationBellProps {
  calendarAlerts?: CalendarAlert[];
}

export function NotificationBell({ calendarAlerts = [] }: NotificationBellProps) {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const totalCount = unreadCount + calendarAlerts.length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative tap-target" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center p-0 text-[10px]">
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[60vh]">
          {calendarAlerts.length > 0 && (
            <div className="border-b">
              <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
                <span className="text-xs font-medium">Due in the next 24 hours</span>
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                  {calendarAlerts.length}
                </Badge>
              </div>
              <ul className="divide-y">
                {calendarAlerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      className="w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                      onClick={() => {
                        setOpen(false);
                        navigate("/admin/calendar");
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {alert.kind === "event" ? (
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-medium">{alert.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatCalendarAlertTime(alert)} · {alert.priority} priority
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {notifications.length === 0 && calendarAlerts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet</p>
          ) : notifications.length > 0 ? (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors ${
                      n.read ? "opacity-70" : ""
                    }`}
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) {
                        setOpen(false);
                        navigate(n.link);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-words">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground break-words">{n.body}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

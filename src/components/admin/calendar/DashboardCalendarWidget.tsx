import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus } from "lucide-react";
import { EventDialog } from "./EventDialog";
import { useCalendarData } from "./useCalendarData";
import { CalendarEvent, eventStart, isOverdue } from "./types";

export function DashboardCalendarWidget() {
  const { events, tasks, staff, saveEvent } = useCalendarData();
  const [open, setOpen] = useState(false);

  const overdue = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const fromEvents = events
      .filter((e) => e.status === "pending")
      .map((e) => ({ id: e.id, title: e.title, when: eventStart(e), color: e.color }));
    const fromTasks = tasks
      .filter((t) => t.status === "todo" || t.status === "in_progress")
      .filter((t) => t.due_date)
      .map((t) => ({
        id: t.id,
        title: t.title,
        when: new Date(`${t.due_date}T${(t.due_time ?? "09:00").slice(0, 5)}:00`),
        color: "#7C3AED",
      }));
    return [...fromEvents, ...fromTasks]
      .filter((i) => i.when.getTime() >= now - 12 * 3600 * 1000)
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 5);
  }, [events, tasks]);

  const today = new Date();

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
        </CardTitle>
        {overdue > 0 && (
          <span className="text-xs font-medium rounded-full bg-destructive/10 text-destructive px-2 py-0.5">
            {overdue} overdue
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nothing scheduled — add a reminder</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: i.color }} />
                <span className="truncate flex-1">{i.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {i.when.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/calendar">View full calendar</Link>
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Quick reminder
          </Button>
        </div>
      </CardContent>

      <EventDialog
        open={open}
        onOpenChange={setOpen}
        event={null as CalendarEvent | null}
        defaultDate={today}
        staff={staff}
        onSave={saveEvent}
      />
    </Card>
  );
}

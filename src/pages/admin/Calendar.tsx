import { useEffect, useMemo, useState } from "react";
import { Views, View } from "react-big-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarView } from "@/components/admin/calendar/CalendarView";
import { EventDialog } from "@/components/admin/calendar/EventDialog";
import { TaskBoard } from "@/components/admin/calendar/TaskBoard";
import { useCalendarData } from "@/components/admin/calendar/useCalendarData";
import { CalendarEvent, EVENT_TYPES, TYPE_COLORS, isOverdue, toDateStr, toTimeStr } from "@/components/admin/calendar/types";

const VIEW_TABS: { value: View; label: string }[] = [
  { value: Views.MONTH, label: "Month" },
  { value: Views.WEEK, label: "Week" },
  { value: Views.DAY, label: "Day" },
  { value: Views.AGENDA, label: "Agenda" },
];

export default function AdminCalendar() {
  const isMobile = useIsMobile();
  const { events, tasks, staff, loading, saveEvent, deleteEvent, saveTask, deleteTask } = useCalendarData();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [slotDate, setSlotDate] = useState<Date | null>(null);

  useEffect(() => {
    if (isMobile) setView(Views.AGENDA);
  }, [isMobile]);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  const shift = (dir: number) => {
    const d = new Date(date);
    if (view === Views.MONTH) d.setMonth(d.getMonth() + dir);
    else if (view === Views.WEEK) d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };

  const openNew = (d?: Date | null) => {
    setEditing(null);
    setSlotDate(d ?? date);
    setDialogOpen(true);
  };

  const openEdit = (e: CalendarEvent) => {
    setEditing(e);
    setSlotDate(null);
    setDialogOpen(true);
  };

  const moveEvent = async (e: CalendarEvent, start: Date) => {
    await saveEvent({
      id: e.id,
      start_date: toDateStr(start),
      start_time: e.all_day ? null : toTimeStr(start),
    });
  };

  const label = date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    ...(view === Views.DAY ? { day: "numeric" } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-semibold text-foreground mr-auto">Business Calendar</h1>
        {overdueCount > 0 && (
          <span className="text-xs font-medium rounded-full bg-destructive/10 text-destructive px-3 py-1">
            {overdueCount} overdue task{overdueCount > 1 ? "s" : ""}
          </span>
        )}
        <Button onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" /> Add event</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="space-y-4 order-2 lg:order-1">
          <Card>
            <CardContent className="p-2">
              <MiniCalendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {EVENT_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.value] }} />
                  {t.label}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 order-1 lg:order-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Next" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>Today</Button>
            <span className="font-serif text-lg font-medium ml-1">{label}</span>
            <div className="ml-auto inline-flex rounded-md border overflow-hidden">
              {VIEW_TABS.map((t) => (
                <button
                  key={String(t.value)}
                  onClick={() => setView(t.value)}
                  className={`px-3 py-1.5 text-sm transition ${view === t.value ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading calendar...</div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border bg-card py-16 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No events today — add your first reminder</p>
              <Button className="mt-4" onClick={() => openNew()}><Plus className="h-4 w-4 mr-1" /> Add event</Button>
            </div>
          ) : (
            <CalendarView
              events={events}
              date={date}
              view={view}
              onDateChange={setDate}
              onViewChange={setView}
              onSelectSlot={(d) => openNew(d)}
              onSelectEvent={openEdit}
              onMove={moveEvent}
            />
          )}
        </div>
      </div>

      <TaskBoard tasks={tasks} staff={staff} onSave={saveTask} onDelete={deleteTask} />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        defaultDate={slotDate}
        staff={staff}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}

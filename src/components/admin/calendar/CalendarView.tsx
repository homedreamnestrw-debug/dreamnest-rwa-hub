import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./calendar.css";
import { CalendarEvent, eventEnd, eventStart, toDateStr } from "./types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-US": enUS },
});

const DnDCalendar = withDragAndDrop<RBCEvent, object>(Calendar as any);

export interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEvent;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Expand recurring events into concrete occurrences within a window. */
export function expandEvents(events: CalendarEvent[], anchor: Date): RBCEvent[] {
  const windowStart = addMonths(anchor, -2);
  const windowEnd = addMonths(anchor, 4);
  const out: RBCEvent[] = [];

  for (const e of events) {
    if (e.status === "cancelled") continue;
    const base = eventStart(e);
    const baseEnd = eventEnd(e);
    const durationMs = Math.max(baseEnd.getTime() - base.getTime(), 0);

    const push = (start: Date, idx: number) => {
      out.push({
        id: idx === 0 ? e.id : `${e.id}__${idx}`,
        title: e.title,
        start,
        end: new Date(start.getTime() + durationMs),
        allDay: e.all_day,
        resource: e,
      });
    };

    if (!e.is_recurring || !e.recurrence_rule) {
      if (baseEnd >= windowStart && base <= windowEnd) push(base, 0);
      continue;
    }

    const interval = Math.max(e.recurrence_interval || 1, 1);
    const maxCount = e.recurrence_count ?? 400;
    const hardEnd = e.recurrence_end_date ? new Date(`${e.recurrence_end_date}T23:59:59`) : windowEnd;
    let cursor = new Date(base);
    let produced = 0;
    let guard = 0;

    while (produced < maxCount && cursor <= windowEnd && cursor <= hardEnd && guard < 2000) {
      guard++;
      const include =
        e.recurrence_rule === "weekly" && e.recurrence_days_of_week?.length
          ? e.recurrence_days_of_week.includes(cursor.getDay())
          : true;
      if (include) {
        produced++;
        if (cursor >= windowStart) push(new Date(cursor), produced - 1);
      }
      if (e.recurrence_rule === "daily") cursor.setDate(cursor.getDate() + interval);
      else if (e.recurrence_rule === "weekly") {
        if (e.recurrence_days_of_week?.length) cursor.setDate(cursor.getDate() + 1);
        else cursor.setDate(cursor.getDate() + 7 * interval);
      } else if (e.recurrence_rule === "monthly") cursor.setMonth(cursor.getMonth() + interval);
      else cursor.setFullYear(cursor.getFullYear() + interval);
    }
  }
  return out;
}

interface Props {
  events: CalendarEvent[];
  date: Date;
  view: View;
  onDateChange: (d: Date) => void;
  onViewChange: (v: View) => void;
  onSelectSlot: (d: Date) => void;
  onSelectEvent: (e: CalendarEvent) => void;
  onMove: (e: CalendarEvent, start: Date) => void;
}

export function CalendarView({
  events, date, view, onDateChange, onViewChange, onSelectSlot, onSelectEvent, onMove,
}: Props) {
  const rbcEvents = useMemo(() => expandEvents(events, date), [events, date]);

  return (
    <div className="dreamnest-calendar rounded-lg border bg-card p-2 sm:p-4">
      <DnDCalendar
        localizer={localizer}
        events={rbcEvents}
        date={date}
        view={view}
        onNavigate={onDateChange}
        onView={onViewChange}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        popup
        selectable
        style={{ height: 640 }}
        onSelectSlot={(slot: any) => onSelectSlot(slot.start)}
        onSelectEvent={(ev: any) => onSelectEvent(ev.resource)}
        onEventDrop={({ event, start }: any) => onMove(event.resource, start as Date)}
        onEventResize={({ event, start }: any) => onMove(event.resource, start as Date)}
        eventPropGetter={(ev: any) => {
          const src: CalendarEvent = ev.resource;
          const bg = src.status === "completed" ? "#059669" : src.is_recurring ? "#7C3AED" : src.color;
          return {
            style: {
              backgroundColor: bg,
              borderRadius: "999px",
              border: "none",
              color: "#fff",
              padding: "1px 8px",
              fontSize: "12px",
            },
          };
        }}
        dayPropGetter={(d: Date) => (
          toDateStr(d) === toDateStr(new Date())
            ? { className: "rbc-today-dreamnest" }
            : {}
        )}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Loader2, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarEvent, EVENT_TYPES, EventType, PALETTE, PRIORITIES, Priority,
  Recurrence, REMINDER_OPTIONS, TYPE_COLORS, toDateStr,
} from "./types";
import type { StaffMember } from "./useCalendarData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEvent | null;
  defaultDate?: Date | null;
  staff: StaffMember[];
  onSave: (payload: Partial<CalendarEvent> & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EventDialog({ open, onOpenChange, event, defaultDate, staff, onSave, onDelete }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("reminder");
  const [allDay, setAllDay] = useState(true);
  const [startDate, setStartDate] = useState(toDateStr(new Date()));
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("none");
  const [color, setColor] = useState(TYPE_COLORS.reminder);
  const [recurring, setRecurring] = useState(false);
  const [rule, setRule] = useState<Recurrence>("weekly");
  const [interval, setIntervalVal] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [endMode, setEndMode] = useState<"never" | "count" | "date">("never");
  const [count, setCount] = useState(10);
  const [recEndDate, setRecEndDate] = useState("");
  const [reminder, setReminder] = useState("none");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [linkType, setLinkType] = useState("none");
  const [linkId, setLinkId] = useState<string>("none");
  const [linkOptions, setLinkOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setType(event.event_type);
      setAllDay(event.all_day);
      setStartDate(event.start_date);
      setEndDate(event.end_date || "");
      setStartTime((event.start_time || "09:00").slice(0, 5));
      setEndTime((event.end_time || "10:00").slice(0, 5));
      setPriority(event.priority);
      setAssignedTo(event.assigned_to || "none");
      setColor(event.color);
      setRecurring(event.is_recurring);
      setRule(event.recurrence_rule || "weekly");
      setIntervalVal(event.recurrence_interval || 1);
      setDays(event.recurrence_days_of_week || []);
      setEndMode(event.recurrence_count ? "count" : event.recurrence_end_date ? "date" : "never");
      setCount(event.recurrence_count || 10);
      setRecEndDate(event.recurrence_end_date || "");
      setReminder(event.reminder_minutes_before ? String(event.reminder_minutes_before) : "none");
      setNotes(event.notes || "");
      setAttachments(event.attachments || []);
      setLinkType(event.linked_entity_type || "none");
      setLinkId(event.linked_entity_id || "none");
    } else {
      setTitle("");
      setType("reminder");
      setAllDay(true);
      setStartDate(toDateStr(defaultDate || new Date()));
      setEndDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      setPriority("medium");
      setAssignedTo("none");
      setColor(TYPE_COLORS.reminder);
      setRecurring(false);
      setRule("weekly");
      setIntervalVal(1);
      setDays([]);
      setEndMode("never");
      setCount(10);
      setRecEndDate("");
      setReminder("none");
      setNotes("");
      setAttachments([]);
      setLinkType("none");
      setLinkId("none");
    }
  }, [open, event, defaultDate]);

  useEffect(() => {
    (async () => {
      if (linkType === "none") { setLinkOptions([]); return; }
      if (linkType === "invoice") {
        const { data } = await supabase.from("invoices").select("id, document_number, client_name").order("created_at", { ascending: false }).limit(100);
        setLinkOptions((data || []).map((d: any) => ({ id: d.id, label: `${d.document_number}${d.client_name ? ` — ${d.client_name}` : ""}` })));
      } else if (linkType === "purchase_order") {
        const { data } = await supabase.from("purchase_orders").select("id, po_number").order("created_at", { ascending: false }).limit(100);
        setLinkOptions((data || []).map((d: any) => ({ id: d.id, label: d.po_number })));
      } else if (linkType === "product") {
        const { data } = await supabase.from("products").select("id, name").order("name").limit(200);
        setLinkOptions((data || []).map((d: any) => ({ id: d.id, label: d.name })));
      } else if (linkType === "customer") {
        const { data } = await supabase.from("profiles").select("user_id, full_name").order("full_name").limit(200);
        setLinkOptions((data || []).map((d: any) => ({ id: d.user_id, label: d.full_name || "Customer" })));
      }
    })();
  }, [linkType]);

  const handleTypeChange = (v: EventType) => {
    setType(v);
    setColor(TYPE_COLORS[v]);
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const path = `calendar/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("documents").upload(path, file);
        if (error) throw error;
        urls.push(path);
      }
      setAttachments((a) => [...a, ...urls]);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: event?.id,
        title: title.trim(),
        event_type: type,
        all_day: allDay,
        start_date: startDate,
        end_date: endDate || null,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        priority,
        assigned_to: assignedTo === "none" ? null : assignedTo,
        color,
        is_recurring: recurring,
        recurrence_rule: recurring ? rule : null,
        recurrence_interval: interval || 1,
        recurrence_days_of_week: recurring && rule === "weekly" ? days : [],
        recurrence_count: recurring && endMode === "count" ? count : null,
        recurrence_end_date: recurring && endMode === "date" ? recEndDate || null : null,
        reminder_minutes_before: reminder === "none" ? null : Number(reminder),
        notes: notes || null,
        attachments,
        linked_entity_type: linkType === "none" ? null : linkType,
        linked_entity_id: linkType === "none" || linkId === "none" ? null : linkId,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is happening?" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => handleTypeChange(v as EventType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="mb-0">All day</Label>
              <Switch checked={allDay} onCheckedChange={setAllDay} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              {!allDay && (
                <>
                  <div>
                    <Label>Start time</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label>End time</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </>
              )}
            </div>

            <div>
              <Label>Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="mb-0">Repeats</Label>
                <Switch checked={recurring} onCheckedChange={setRecurring} />
              </div>
              {recurring && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={rule} onValueChange={(v) => setRule(v as Recurrence)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">every</span>
                      <Input type="number" min={1} value={interval} onChange={(e) => setIntervalVal(Number(e.target.value))} />
                    </div>
                  </div>
                  {rule === "weekly" && (
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAYS.map((d, i) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                          className={`px-2 py-1 text-xs rounded border ${days.includes(i) ? "bg-primary text-primary-foreground" : "bg-background"}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={endMode} onValueChange={(v) => setEndMode(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never ends</SelectItem>
                        <SelectItem value="count">After X times</SelectItem>
                        <SelectItem value="date">On date</SelectItem>
                      </SelectContent>
                    </Select>
                    {endMode === "count" && (
                      <Input type="number" min={1} value={count} onChange={(e) => setCount(Number(e.target.value))} />
                    )}
                    {endMode === "date" && (
                      <Input type="date" value={recEndDate} onChange={(e) => setRecEndDate(e.target.value)} />
                    )}
                  </div>
                </>
              )}
            </div>

            <div>
              <Label>Reminder</Label>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link to</Label>
                <Select value={linkType} onValueChange={(v) => { setLinkType(v); setLinkId("none"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nothing</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="purchase_order">Purchase order</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {linkType !== "none" && (
                <div>
                  <Label>Record</Label>
                  <Select value={linkId} onValueChange={setLinkId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {linkOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div>
              <Label>Attachments</Label>
              <Input type="file" multiple onChange={(e) => upload(e.target.files)} disabled={uploading} />
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" /> <span className="truncate">{a.split("/").pop()}</span>
                      <button type="button" className="ml-auto text-destructive" onClick={() => setAttachments((p) => p.filter((x) => x !== a))}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between gap-2">
          {event && onDelete && !event.is_system ? (
            <Button variant="outline" className="text-destructive" onClick={() => onDelete(event.id).then(() => onOpenChange(false))}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

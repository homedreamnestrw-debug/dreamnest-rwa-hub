import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Check, Plus, Trash2, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarTask, isOverdue, Priority, PRIORITIES, PRIORITY_BORDER,
  TASK_CATEGORIES, TASK_COLUMNS, TaskCategory, TaskStatus, toDateStr,
} from "./types";
import type { StaffMember } from "./useCalendarData";

interface Props {
  tasks: CalendarTask[];
  staff: StaffMember[];
  onSave: (payload: Partial<CalendarTask> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function nextDue(task: CalendarTask): string | null {
  if (!task.due_date || !task.recurrence_rule) return null;
  const d = new Date(`${task.due_date}T00:00:00`);
  const n = task.recurrence_interval || 1;
  if (task.recurrence_rule === "daily") d.setDate(d.getDate() + n);
  else if (task.recurrence_rule === "weekly") d.setDate(d.getDate() + 7 * n);
  else if (task.recurrence_rule === "monthly") d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  if (task.recurrence_end_date && toDateStr(d) > task.recurrence_end_date) return null;
  return toDateStr(d);
}

export function TaskBoard({ tasks, staff, onSave, onDelete }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(toDateStr(new Date()));
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignedTo, setAssignedTo] = useState("none");
  const [category, setCategory] = useState<TaskCategory>("other");

  const [fAssignee, setFAssignee] = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fCategory, setFCategory] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [sortBy, setSortBy] = useState("due");

  const filtered = useMemo(() => {
    const rank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return tasks
      .filter((t) => fAssignee === "all" || t.assigned_to === fAssignee)
      .filter((t) => fPriority === "all" || t.priority === fPriority)
      .filter((t) => fCategory === "all" || t.category === fCategory)
      .filter((t) => !fFrom || (t.due_date && t.due_date >= fFrom))
      .filter((t) => !fTo || (t.due_date && t.due_date <= fTo))
      .sort((a, b) => {
        if (sortBy === "priority") return rank[a.priority] - rank[b.priority];
        if (sortBy === "created") return 0;
        return (a.due_date || "9999").localeCompare(b.due_date || "9999");
      });
  }, [tasks, fAssignee, fPriority, fCategory, fFrom, fTo, sortBy]);

  const staffName = (id: string | null) => staff.find((s) => s.user_id === id)?.full_name;

  const quickAdd = async () => {
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      due_date: dueDate || null,
      priority,
      category,
      assigned_to: assignedTo === "none" ? null : assignedTo,
      status: "todo",
    });
    setTitle("");
    setOpen(false);
    toast({ title: "Task added" });
  };

  const complete = async (task: CalendarTask) => {
    await onSave({ id: task.id, status: "completed", completed_at: new Date().toISOString() });
    if (task.is_recurring) {
      const due = nextDue(task);
      if (due) {
        await onSave({
          title: task.title,
          description: task.description,
          due_date: due,
          due_time: task.due_time,
          priority: task.priority,
          category: task.category,
          assigned_to: task.assigned_to,
          status: "todo",
          is_recurring: true,
          recurrence_rule: task.recurrence_rule,
          recurrence_interval: task.recurrence_interval,
          recurrence_end_date: task.recurrence_end_date,
        });
      }
    }
  };

  const move = async (id: string, status: TaskStatus) => {
    await onSave({ id, status, completed_at: status === "completed" ? new Date().toISOString() : null });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <h2 className="font-serif text-lg font-semibold mr-auto">Tasks</h2>
        <Select value={fAssignee} onValueChange={setFAssignee}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {staff.map((s) => <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fPriority} onValueChange={setFPriority}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fCategory} onValueChange={setFCategory}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TASK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-9 w-[150px]" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
        <Input type="date" className="h-9 w-[150px]" value={fTo} onChange={(e) => setFTo(e.target.value)} />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Sort: due date</SelectItem>
            <SelectItem value="priority">Sort: priority</SelectItem>
            <SelectItem value="created">Sort: created</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add task</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {TASK_COLUMNS.map((col) => {
          const items = filtered.filter((t) => t.status === col.value);
          return (
            <div
              key={col.value}
              className="rounded-lg bg-muted/40 p-3 min-h-[140px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData("text/task");
                if (id) move(id, col.value);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{col.label}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nothing here</p>
                )}
                {items.map((t) => {
                  const overdue = isOverdue(t);
                  return (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/task", t.id)}
                      className={`border-l-4 ${PRIORITY_BORDER[t.priority]} ${overdue ? "bg-destructive/5 border-destructive/40" : ""}`}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium flex-1 break-words">{t.title}</p>
                          {t.status !== "completed" && (
                            <button aria-label="Complete task" onClick={() => complete(t)} className="text-emerald-600">
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button aria-label="Delete task" onClick={() => onDelete(t.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {t.due_date && (
                            <span className={overdue ? "text-destructive font-medium" : ""}>
                              {new Date(`${t.due_date}T00:00:00`).toLocaleDateString()}
                              {overdue ? " · overdue" : ""}
                            </span>
                          )}
                          {t.linked_event_id && <CalendarDays className="h-3.5 w-3.5" />}
                          {t.is_recurring && <Repeat className="h-3.5 w-3.5" />}
                          {t.assigned_to && <span>· {staffName(t.assigned_to)}</span>}
                          <Badge variant="outline" className="capitalize">{t.category}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-serif">New task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={quickAdd}>Add task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

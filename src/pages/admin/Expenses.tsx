import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Search, ArrowUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { ReportToolbar } from "@/components/admin/reports/ReportToolbar";
import { useReportRange } from "@/components/admin/reports/useDateRange";
import { KpiCard } from "@/components/admin/reports/KpiCard";
import { formatRWF, formatInt, pctDelta, bucketKey, bucketLabel, emptyBuckets, downloadCSV } from "@/lib/reportAggregations";
import { exportElementToPDF } from "@/lib/reportPdf";

type Expense = Tables<"expenses">;
const COLORS = ["hsl(25, 35%, 28%)", "hsl(40, 50%, 72%)", "hsl(32, 25%, 65%)", "hsl(0, 72%, 51%)", "hsl(210, 60%, 50%)", "hsl(150, 50%, 40%)", "hsl(280, 40%, 55%)"];

const expenseCategories = ["Rent","Utilities","Salaries","Marketing","Supplies","Transport","Maintenance","Insurance","Taxes","Other"];

type SortKey = "expense_date" | "amount" | "category";
const BUDGET_KEY = "expense-budgets-v1";

export default function Expenses() {
  const { state, setState, range, prevRange, granularity } = useReportRange("expenses-range", "thisMonth");
  const [all, setAll] = useState<Expense[]>([]);
  const [prevAll, setPrevAll] = useState<Expense[]>([]);
  const [revenueByBucket, setRevenueByBucket] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [hasReceipt, setHasReceipt] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "expense_date", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ category: "Supplies", amount: 0, description: "", expense_date: new Date().toISOString().split("T")[0], receipt_url: "" });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || "{}"); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets)); } catch {} }, [budgets]);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const fromIso = range.from.toISOString().slice(0, 10);
      const toIso = range.to.toISOString().slice(0, 10);
      const prevFromIso = prevRange.from.toISOString().slice(0, 10);
      const prevToIso = prevRange.to.toISOString().slice(0, 10);
      const [{ data: cur }, prevRes, revRes] = await Promise.all([
        supabase.from("expenses").select("*").gte("expense_date", fromIso).lte("expense_date", toIso).order("expense_date", { ascending: false }).limit(5000),
        state.compare ? supabase.from("expenses").select("*").gte("expense_date", prevFromIso).lte("expense_date", prevToIso).limit(5000) : Promise.resolve({ data: [] as Expense[] } as any),
        supabase.from("orders").select("created_at, total, status").gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString()).limit(5000),
      ]);
      if (!active) return;
      setAll((cur as Expense[]) || []);
      setPrevAll((prevRes.data as Expense[]) || []);
      const buckets: Record<string, number> = {};
      ((revRes.data as any[]) || []).forEach((o) => {
        if (o.status === "cancelled" || o.status === "refunded") return;
        const k = bucketKey(new Date(o.created_at), granularity);
        buckets[k] = (buckets[k] || 0) + (o.total || 0);
      });
      setRevenueByBucket(buckets);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [range.from, range.to, prevRange.from, prevRange.to, state.compare, granularity]);

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (minAmount && e.amount < +minAmount) return false;
      if (maxAmount && e.amount > +maxAmount) return false;
      if (hasReceipt === "yes" && !e.receipt_url) return false;
      if (hasReceipt === "no" && e.receipt_url) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(e.description || "").toLowerCase().includes(s) && !e.category.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [all, filterCategory, minAmount, maxAmount, hasReceipt, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sort.key] as any, bv = b[sort.key] as any;
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (sort.dir === "asc" ? 1 : -1);
    });
    return copy;
  }, [filtered, sort]);

  const paged = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  // KPIs
  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);
  const prevTotal = useMemo(() => prevAll.reduce((s, e) => s + e.amount, 0), [prevAll]);
  const dayCount = useMemo(() => Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000)), [range]);
  const avgDaily = total / dayCount;
  const largest = useMemo(() => filtered.reduce((m, e) => e.amount > m ? e.amount : m, 0), [filtered]);
  const topCat = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
  }, [filtered]);

  // Charts
  const trend = useMemo(() => {
    const buckets = emptyBuckets(range.from, range.to, granularity);
    filtered.forEach((e) => {
      const k = bucketKey(new Date(e.expense_date), granularity);
      if (k in buckets) buckets[k] += e.amount;
    });
    return Object.keys(buckets).map((k) => ({
      label: bucketLabel(k, granularity),
      expenses: buckets[k],
      revenue: revenueByBucket[k] || 0,
      net: (revenueByBucket[k] || 0) - buckets[k],
    }));
  }, [filtered, range, granularity, revenueByBucket]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((e) => { m[e.category] = (m[e.category] || 0) + e.amount; });
    return Object.entries(m).map(([name, value]) => ({ name, value, pct: total ? (value / total) * 100 : 0 })).sort((a, b) => b.value - a.value);
  }, [filtered, total]);

  // Handlers
  const fetchData = async () => { /* refresh */
    const fromIso = range.from.toISOString().slice(0, 10);
    const toIso = range.to.toISOString().slice(0, 10);
    const { data } = await supabase.from("expenses").select("*").gte("expense_date", fromIso).lte("expense_date", toIso).order("expense_date", { ascending: false }).limit(5000);
    setAll((data as Expense[]) || []);
  };

  const resetForm = () => { setForm({ category: "Supplies", amount: 0, description: "", expense_date: new Date().toISOString().split("T")[0], receipt_url: "" }); setEditing(null); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ category: e.category, amount: e.amount, description: e.description || "", expense_date: e.expense_date, receipt_url: e.receipt_url || "" });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    const payload: TablesInsert<"expenses"> = {
      category: form.category, amount: form.amount, description: form.description || null,
      expense_date: form.expense_date, receipt_url: form.receipt_url || null,
    };
    if (editing) {
      const { error } = await supabase.from("expenses").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Expense updated" });
    } else {
      const { error } = await supabase.from("expenses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Expense recorded" });
    }
    setDialogOpen(false); resetForm(); fetchData();
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    toast({ title: "Expense deleted" }); fetchData();
  };
  const bulkDelete = async () => {
    if (!selected.size || !confirm(`Delete ${selected.size} expenses?`)) return;
    await supabase.from("expenses").delete().in("id", Array.from(selected));
    setSelected(new Set()); fetchData(); toast({ title: "Deleted" });
  };

  const toggleSort = (key: SortKey) => setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });

  const handleExportCsv = () => {
    const rows = (selected.size ? filtered.filter((e) => selected.has(e.id)) : filtered).map((e) => ({
      date: e.expense_date, category: e.category, amount: e.amount,
      description: e.description || "", receipt: e.receipt_url || "",
    }));
    downloadCSV(`expenses-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };
  const handleExportPdf = async () => {
    if (reportRef.current) await exportElementToPDF(reportRef.current, `expenses-${new Date().toISOString().slice(0,10)}.pdf`, "DreamNest — Expense Report");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold">Expenses</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Expense</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Edit Expense" : "Record Expense"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Amount (RWF)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Receipt URL</Label><Input value={form.receipt_url} onChange={(e) => setForm({ ...form, receipt_url: e.target.value })} placeholder="https://..." /></div>
              <Button onClick={handleSave} className="w-full" disabled={!form.amount}>{editing ? "Update" : "Record"} Expense</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ReportToolbar state={state} onChange={setState} fromTo={range} onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} onPrint={() => window.print()} />

      <div ref={reportRef} className="space-y-6 bg-background">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total" value={formatRWF(total)} delta={state.compare ? pctDelta(total, prevTotal) : null} invertDelta sub={state.compare ? `prev ${formatRWF(prevTotal)}` : undefined} />
          <KpiCard label="Daily Average" value={formatRWF(avgDaily)} />
          <KpiCard label="Entries" value={formatInt(filtered.length)} />
          <KpiCard label="Largest" value={formatRWF(largest)} />
          <KpiCard label="Top Category" value={String(topCat[0])} sub={formatRWF(topCat[1] as number)} />
          <KpiCard label="Categories Used" value={formatInt(byCategory.length)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Expenses Over Time</CardTitle></CardHeader>
            <CardContent>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatRWF(v)} />
                    <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">{loading ? "Loading..." : "No data"}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Expenses vs Revenue</CardTitle></CardHeader>
            <CardContent>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatRWF(v)} /><Legend />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(150, 50%, 40%)" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke="hsl(0, 72%, 51%)" strokeWidth={2} name="Expenses" />
                    <Line type="monotone" dataKey="net" stroke="hsl(25, 35%, 28%)" strokeWidth={2} name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader>
            <CardContent>
              {byCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart><Pie data={byCategory} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, pct }) => `${name} ${pct.toFixed(0)}%`}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Legend /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Category Budgets (local)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Set a monthly target per category. Saved on this device only.</p>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {expenseCategories.map((c) => {
                  const spent = byCategory.find((b) => b.name === c)?.value || 0;
                  const budget = budgets[c] || 0;
                  const pct = budget ? Math.min(100, (spent / budget) * 100) : 0;
                  const over = budget && spent > budget;
                  return (
                    <div key={c} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{c}</span>
                        <Input type="number" className="h-7 w-28 text-right" placeholder="Budget"
                          value={budgets[c] ?? ""}
                          onChange={(e) => setBudgets({ ...budgets, [c]: +e.target.value })} />
                      </div>
                      {budget > 0 && (
                        <>
                          <Progress value={pct} className={over ? "[&>div]:bg-destructive" : ""} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatRWF(spent)} / {formatRWF(budget)}</span>
                            {over && <span className="text-destructive font-medium">Over budget</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-32" />
          <Input type="number" placeholder="Max amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-32" />
          <Select value={hasReceipt} onValueChange={(v: any) => setHasReceipt(v)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All receipts</SelectItem>
              <SelectItem value="yes">With receipt</SelectItem>
              <SelectItem value="no">No receipt</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete {selected.size}
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={paged.length > 0 && paged.every((e) => selected.has(e.id))}
                      onCheckedChange={(c) => {
                        const next = new Set(selected);
                        paged.forEach((e) => c ? next.add(e.id) : next.delete(e.id));
                        setSelected(next);
                      }} />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("expense_date")}>Date <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("category")}>Category <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="cursor-pointer text-right" onClick={() => toggleSort("amount")}>Amount <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paged.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses</TableCell></TableRow>
                ) : paged.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(e.id)} onCheckedChange={(c) => {
                        const next = new Set(selected); c ? next.add(e.id) : next.delete(e.id); setSelected(next);
                      }} />
                    </TableCell>
                    <TableCell>{format(new Date(e.expense_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.description || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatRWF(e.amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">Filtered total ({filtered.length} entries)</TableCell>
                  <TableCell className="text-right font-bold">{formatRWF(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

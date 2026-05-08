import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, CreditCard, Wallet, AlertTriangle, History, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";
import { format } from "date-fns";

type Order = {
  id: string;
  order_number: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  channel: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  customer_id: string | null;
  created_at: string;
  status: string;
};

type CreditPayment = {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
};

type Row = Order & { paid: number; balance: number; payments: CreditPayment[] };

const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

export default function CreditManagement() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "outstanding" | "settled">("outstanding");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [historyRow, setHistoryRow] = useState<Row | null>(null);
  const [payRow, setPayRow] = useState<Row | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payNote, setPayNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, total, payment_status, payment_method, channel, guest_name, guest_phone, guest_email, customer_id, created_at, status")
      .in("payment_status", ["unpaid", "partial", "paid"])
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    const ids = (orders || []).map((o) => o.id);
    let payments: CreditPayment[] = [];
    if (ids.length > 0) {
      const { data: pays } = await supabase
        .from("credit_payments")
        .select("*")
        .in("order_id", ids)
        .order("created_at", { ascending: false });
      payments = (pays as CreditPayment[]) || [];
    }

    const merged: Row[] = (orders || []).map((o: any) => {
      const ps = payments.filter((p) => p.order_id === o.id);
      const paid = ps.reduce((s, p) => s + Number(p.amount || 0), 0);
      return { ...o, paid, balance: Number(o.total) - paid, payments: ps };
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const totals = {
    outstanding: rows.filter(r => r.balance > 0).reduce((s, r) => s + r.balance, 0),
    collected: rows.reduce((s, r) => s + r.paid, 0),
    overdue: rows.filter(r => r.balance > 0 && (Date.now() - new Date(r.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000).length,
    customers: new Set(rows.filter(r => r.balance > 0).map(r => r.guest_phone || r.guest_name || r.id)).size,
  };

  const filtered = rows.filter((r) => {
    if (filter === "outstanding" && r.balance <= 0) return false;
    if (filter === "settled" && r.balance > 0) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !String(r.order_number).includes(search) &&
        !(r.guest_name || "").toLowerCase().includes(s) &&
        !(r.guest_phone || "").includes(search) &&
        !(r.guest_email || "").toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const openPay = (r: Row) => {
    setPayRow(r);
    setPayAmount(r.balance);
    setPayMethod("cash");
    setPayNote("");
  };

  const recordPayment = async () => {
    if (!payRow) return;
    if (payAmount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (payAmount > payRow.balance) { toast({ title: "Amount exceeds balance", variant: "destructive" }); return; }
    setProcessing(true);
    const { error } = await supabase.from("credit_payments").insert({
      order_id: payRow.id,
      amount: payAmount,
      payment_method: payMethod as any,
      note: payNote || null,
      received_by: user?.id || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessing(false);
      return;
    }
    // If fully paid, update order payment_status
    const newPaid = payRow.paid + payAmount;
    if (newPaid >= payRow.total) {
      await supabase.from("orders").update({ payment_status: "paid" } as any).eq("id", payRow.id);
    } else {
      await supabase.from("orders").update({ payment_status: "partial" } as any).eq("id", payRow.id);
    }
    toast({ title: "Payment recorded", description: `${formatRWF(payAmount)} received.` });
    setProcessing(false);
    setPayRow(null);
    fetch();
  };

  const ageDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (24 * 60 * 60 * 1000));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Credit Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track sales on credit, record customer payments, and follow up on outstanding balances
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Outstanding</div>
          <div className="text-2xl font-semibold mt-1">{formatRWF(totals.outstanding)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Collected</div>
          <div className="text-2xl font-semibold mt-1">{formatRWF(totals.collected)}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Overdue (&gt;30d)</div>
          <div className="text-2xl font-semibold mt-1">{totals.overdue}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs text-muted-foreground">Debtors</div>
          <div className="text-2xl font-semibold mt-1">{totals.customers}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="inline-flex rounded-md border overflow-hidden">
          {(["outstanding", "all", "settled"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-sm capitalize ${filter === k ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order, name, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No credit sales</TableCell></TableRow>
            ) : filtered.map((r) => {
              const age = ageDays(r.created_at);
              const overdue = r.balance > 0 && age > 30;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.order_number}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{r.guest_name || "Walk-in"}</div>
                      {r.guest_phone && <div className="text-xs text-muted-foreground">{r.guest_phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatRWF(r.total)}</TableCell>
                  <TableCell className="text-right text-green-700">{formatRWF(r.paid)}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.balance > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                    {formatRWF(r.balance)}
                  </TableCell>
                  <TableCell className={`text-sm ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {age}d
                  </TableCell>
                  <TableCell>
                    {r.balance <= 0 ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">Settled</Badge>
                    ) : r.paid > 0 ? (
                      <Badge variant="secondary">Partial</Badge>
                    ) : (
                      <Badge variant="outline">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOrderId(r.id)} title="View order">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryRow(r)} title="Payment history">
                        <History className="h-4 w-4" />
                      </Button>
                      {r.balance > 0 && (
                        <Button size="sm" className="h-8" onClick={() => openPay(r)}>
                          Record Payment
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Record payment */}
      <Dialog open={!!payRow} onOpenChange={(o) => !o && setPayRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment — Order #{payRow?.order_number}</DialogTitle></DialogHeader>
          {payRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">{formatRWF(payRow.total)}</div></div>
                <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Paid</div><div className="font-semibold text-green-700">{formatRWF(payRow.paid)}</div></div>
                <div className="rounded-md bg-muted p-2"><div className="text-xs text-muted-foreground">Balance</div><div className="font-semibold text-amber-700">{formatRWF(payRow.balance)}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount (RWF)</Label>
                  <Input type="number" value={payAmount} onChange={(e) => setPayAmount(+e.target.value)} />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="e.g. Receipt #123, MoMo ref..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayRow(null)}>Cancel</Button>
            <Button onClick={recordPayment} disabled={processing}>{processing ? "Saving..." : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment history */}
      <Dialog open={!!historyRow} onOpenChange={(o) => !o && setHistoryRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment History — Order #{historyRow?.order_number}</DialogTitle></DialogHeader>
          {historyRow && (
            <div className="space-y-3">
              {historyRow.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {historyRow.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                      <div>
                        <div className="font-medium">{formatRWF(p.amount)}</div>
                        <div className="text-xs text-muted-foreground capitalize">{p.payment_method.replace("_", " ")} · {format(new Date(p.created_at), "MMM d, yyyy HH:mm")}</div>
                        {p.note && <div className="text-xs mt-0.5">{p.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t">
                <span>Balance</span>
                <span className="font-semibold">{formatRWF(historyRow.balance)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrderDetailDialog orderId={detailOrderId} open={!!detailOrderId} onOpenChange={(o) => !o && setDetailOrderId(null)} />
    </div>
  );
}

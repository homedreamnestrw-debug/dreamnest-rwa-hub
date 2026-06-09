import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Globe, Store, Wallet, Receipt, BadgePercent, Truck,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const formatRWF = (n: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n || 0);
const formatInt = (n: number) => new Intl.NumberFormat("en-RW").format(n || 0);

const TERMINAL_BAD = new Set(["cancelled", "refunded"]);
const COLORS = ["hsl(25, 35%, 28%)", "hsl(40, 50%, 72%)", "hsl(150, 50%, 40%)", "hsl(0, 72%, 51%)"];

type OrderLite = {
  id: string; total: number; created_at: string;
  status: string; payment_status: string | null; payment_approved: boolean | null;
  channel: string; order_number: number;
};

type ItemLite = {
  order_id: string; quantity: number; total: number;
  products: { cost_price: number | null } | null;
};

export default function Dashboard() {
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [items, setItems] = useState<ItemLite[]>([]);
  const [expenses, setExpenses] = useState<{ amount: number; expense_date: string }[]>([]);
  const [counts, setCounts] = useState({ products: 0, customers: 0, lowStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ordersRes, productsRes, customersRes, lowStockRes, expensesRes] = await Promise.all([
        supabase.from("orders")
          .select("id, total, created_at, status, payment_status, payment_approved, channel, order_number")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 5),
        supabase.from("expenses").select("amount, expense_date").limit(2000),
      ]);

      const ords = (ordersRes.data as OrderLite[]) || [];
      const ids = ords.map((o) => o.id);
      let its: ItemLite[] = [];
      if (ids.length) {
        const { data } = await supabase.from("order_items")
          .select("order_id, quantity, total, products(cost_price)")
          .in("order_id", ids)
          .limit(10000);
        its = (data as any) || [];
      }

      setOrders(ords);
      setItems(its);
      setExpenses((expensesRes.data as any) || []);
      setCounts({
        products: productsRes.count || 0,
        customers: customersRes.count || 0,
        lowStock: lowStockRes.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const m = useMemo(() => {
    const valid = orders.filter((o) => !TERMINAL_BAD.has(o.status));
    const cancelledRefunded = orders.filter((o) => TERMINAL_BAD.has(o.status));

    const totalRevenue = valid.reduce((s, o) => s + (o.total || 0), 0);
    const paid = valid.filter((o) => o.payment_status === "paid" || o.payment_approved === true);
    const unpaid = valid.filter((o) => !(o.payment_status === "paid" || o.payment_approved === true));
    const paidRevenue = paid.reduce((s, o) => s + (o.total || 0), 0);
    const unpaidRevenue = unpaid.reduce((s, o) => s + (o.total || 0), 0);

    const delivered = valid.filter((o) => ["delivered", "completed"].includes(o.status));
    const pending = valid.filter((o) => !["delivered", "completed"].includes(o.status));

    const online = valid.filter((o) => o.channel === "online");
    const instore = valid.filter((o) => o.channel === "in_store");

    const cogs = items.reduce((s, i) => s + (i.products?.cost_price || 0) * (i.quantity || 0), 0);
    const grossProfit = totalRevenue - cogs;
    const margin = totalRevenue ? (grossProfit / totalRevenue) * 100 : 0;

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    // monthly revenue (last 12 months) split paid/unpaid
    const months: { key: string; label: string; paid: number; unpaid: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("default", { month: "short" }),
        paid: 0, unpaid: 0, expense: 0,
      });
    }
    const idx: Record<string, number> = {};
    months.forEach((mm, i) => (idx[mm.key] = i));
    valid.forEach((o) => {
      const d = new Date(o.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (k in idx) {
        const isPaid = o.payment_status === "paid" || o.payment_approved === true;
        if (isPaid) months[idx[k]].paid += o.total || 0;
        else months[idx[k]].unpaid += o.total || 0;
      }
    });
    expenses.forEach((e) => {
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (k in idx) months[idx[k]].expense += Number(e.amount || 0);
    });

    return {
      totalRevenue, paidRevenue, unpaidRevenue,
      paidCount: paid.length, unpaidCount: unpaid.length,
      orderCount: valid.length,
      deliveredCount: delivered.length, pendingCount: pending.length,
      onlineCount: online.length, onlineRevenue: online.reduce((s, o) => s + (o.total || 0), 0),
      instoreCount: instore.length, instoreRevenue: instore.reduce((s, o) => s + (o.total || 0), 0),
      cancelledCount: cancelledRefunded.length,
      cancelledRevenue: cancelledRefunded.reduce((s, o) => s + (o.total || 0), 0),
      cogs, grossProfit, margin, totalExpenses, netProfit,
      months,
    };
  }, [orders, items, expenses]);

  const channelPie = useMemo(() => ([
    { name: "Online", value: m.onlineRevenue },
    { name: "In-store", value: m.instoreRevenue },
  ].filter((d) => d.value > 0)), [m]);

  const paymentPie = useMemo(() => ([
    { name: "Paid", value: m.paidRevenue },
    { name: "Unpaid", value: m.unpaidRevenue },
  ].filter((d) => d.value > 0)), [m]);

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={DollarSign} color="text-emerald-600" label="Total Revenue" value={formatRWF(m.totalRevenue)} sub={`${formatInt(m.orderCount)} orders`} />
        <KpiTile icon={Wallet} color="text-emerald-700" label="Received (paid)" value={formatRWF(m.paidRevenue)} sub={`${formatInt(m.paidCount)} paid orders`} />
        <KpiTile icon={Clock} color="text-amber-600" label="Outstanding (unpaid)" value={formatRWF(m.unpaidRevenue)} sub={`${formatInt(m.unpaidCount)} unpaid`} />
        <KpiTile icon={BadgePercent} color="text-violet-700" label="Gross Profit" value={formatRWF(m.grossProfit)} sub={`Margin ${m.margin.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={CheckCircle2} color="text-emerald-600" label="Delivered" value={formatInt(m.deliveredCount)} sub={`${m.orderCount ? ((m.deliveredCount/m.orderCount)*100).toFixed(0) : 0}% of orders`} />
        <KpiTile icon={Truck} color="text-blue-600" label="Pending Delivery" value={formatInt(m.pendingCount)} sub="Open orders" />
        <KpiTile icon={Globe} color="text-sky-600" label="Online Sales" value={formatRWF(m.onlineRevenue)} sub={`${formatInt(m.onlineCount)} orders`} />
        <KpiTile icon={Store} color="text-amber-700" label="In-store Sales" value={formatRWF(m.instoreRevenue)} sub={`${formatInt(m.instoreCount)} orders`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={Receipt} color="text-rose-600" label="Expenses" value={formatRWF(m.totalExpenses)} sub="All recorded" />
        <KpiTile icon={TrendingUp} color="text-emerald-700" label="Net Profit" value={formatRWF(m.netProfit)} sub="Gross − Expenses" />
        <KpiTile icon={ShoppingCart} color="text-rose-700" label="Cancelled / Refunded" value={formatRWF(m.cancelledRevenue)} sub={`${formatInt(m.cancelledCount)} orders`} />
        <KpiTile icon={Users} color="text-violet-600" label="Customers" value={formatInt(counts.customers)} sub={`${formatInt(counts.products)} products`} />
      </div>

      {/* Low stock warning */}
      {counts.lowStock > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium">
              {counts.lowStock} product{counts.lowStock > 1 ? "s" : ""} with low stock
            </span>
          </CardContent>
        </Card>
      )}

      {/* Revenue trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Revenue & Expenses — Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={m.months}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatRWF(v)} />
              <Legend />
              <Bar dataKey="paid" stackId="rev" name="Paid revenue" fill="hsl(25, 35%, 28%)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="unpaid" stackId="rev" name="Unpaid revenue" fill="hsl(40, 50%, 72%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Paid vs Unpaid</CardTitle></CardHeader>
          <CardContent>
            {paymentPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}`}>
                    {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRWF(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Online vs In-store</CardTitle></CardHeader>
          <CardContent>
            {channelPie.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={channelPie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                    {channelPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatRWF(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-muted-foreground py-8">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatRWF(order.total)}</p>
                      <span className="text-xs capitalize text-muted-foreground">{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, color, label, value, sub }: { icon: any; color: string; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { ReportToolbar } from "@/components/admin/reports/ReportToolbar";
import { useReportRange } from "@/components/admin/reports/useDateRange";
import { KpiCard } from "@/components/admin/reports/KpiCard";
import { formatRWF, formatInt, pctDelta, bucketKey, bucketLabel, emptyBuckets, downloadCSV } from "@/lib/reportAggregations";
import { exportElementToPDF } from "@/lib/reportPdf";

const COLORS = ["hsl(25, 35%, 28%)", "hsl(40, 50%, 72%)", "hsl(32, 25%, 65%)", "hsl(0, 72%, 51%)", "hsl(210, 60%, 50%)", "hsl(150, 50%, 40%)", "hsl(280, 40%, 55%)"];

type OrderRow = {
  id: string; created_at: string; channel: string; status: string;
  payment_method: string | null; total: number; customer_id: string | null;
};
type ItemRow = {
  order_id: string; product_id: string | null; quantity: number; total: number; unit_price: number;
  products: { name: string; cost_price: number | null; category_id: string | null; categories?: { name: string } | null } | null;
  orders: { created_at: string; status: string } | null;
};

type StockRow = {
  product_id: string;
  location_id: string;
  quantity: number;
  location_name: string;
  product_name: string;
  price: number | null;
  cost_price: number | null;
  low_stock_threshold: number | null;
  category_id: string | null;
  category_name: string;
};

type LocationOpt = { id: string; name: string };
type CategoryOpt = { id: string; name: string };

const TERMINAL_BAD = new Set(["cancelled", "refunded"]);

export default function Analytics() {
  const { state, setState, range, prevRange, granularity } = useReportRange("analytics-range", "last30");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [prevOrders, setPrevOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [prevItems, setPrevItems] = useState<ItemRow[]>([]);
  const [stockRows, setStockRows] = useState<StockRow[]>([]);
  const [locations, setLocations] = useState<LocationOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [topMode, setTopMode] = useState<"revenue" | "qty">("revenue");
  const [invMetric, setInvMetric] = useState<"value" | "qty">("value");
  const [invLocation, setInvLocation] = useState<string>("all");
  const [invCategory, setInvCategory] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const fetchRange = async (from: Date, to: Date) => {
        const { data: o } = await supabase.from("orders")
          .select("id, created_at, channel, status, payment_method, total, customer_id")
          .gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
          .limit(5000);
        const ids = (o || []).map((r) => r.id);
        let it: ItemRow[] = [];
        if (ids.length) {
          const { data } = await supabase.from("order_items")
            .select("order_id, product_id, quantity, total, unit_price, products(name, cost_price, category_id, categories(name)), orders!inner(created_at, status)")
            .in("order_id", ids).limit(10000);
          it = (data as any) || [];
        }
        return { o: (o as any) || [], it };
      };
      const [cur, prev] = await Promise.all([
        fetchRange(range.from, range.to),
        state.compare ? fetchRange(prevRange.from, prevRange.to) : Promise.resolve({ o: [], it: [] }),
      ]);
      if (!active) return;
      setOrders(cur.o); setItems(cur.it);
      setPrevOrders(prev.o); setPrevItems(prev.it);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [range.from, range.to, prevRange.from, prevRange.to, state.compare]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [stockRes, locRes, catRes] = await Promise.all([
        supabase.from("product_stock")
          .select("product_id, location_id, quantity, products!inner(name, price, cost_price, low_stock_threshold, category_id, is_active, categories(name)), stock_locations!inner(name, is_active)")
          .limit(20000),
        supabase.from("stock_locations").select("id, name").eq("is_active", true).order("name"),
        supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
      ]);
      if (!active) return;
      const rows: StockRow[] = ((stockRes.data as any[]) || [])
        .filter((r) => r.products?.is_active !== false && r.stock_locations?.is_active !== false)
        .map((r) => ({
          product_id: r.product_id,
          location_id: r.location_id,
          quantity: r.quantity || 0,
          location_name: r.stock_locations?.name || "—",
          product_name: r.products?.name || "Unknown",
          price: r.products?.price ?? null,
          cost_price: r.products?.cost_price ?? null,
          low_stock_threshold: r.products?.low_stock_threshold ?? null,
          category_id: r.products?.category_id ?? null,
          category_name: r.products?.categories?.name || "Uncategorized",
        }));
      setStockRows(rows);
      setLocations((locRes.data as any) || []);
      setCategories((catRes.data as any) || []);
    })();
    return () => { active = false; };
  }, []);

  const filteredStock = useMemo(() => stockRows.filter((r) =>
    (invLocation === "all" || r.location_id === invLocation) &&
    (invCategory === "all" || r.category_id === invCategory)
  ), [stockRows, invLocation, invCategory]);

  // Aggregate per-product (sum across filtered locations)
  const inventory = useMemo(() => {
    const m: Record<string, { id: string; name: string; price: number | null; cost_price: number | null; stock_quantity: number; low_stock_threshold: number | null; categories: { name: string }; category_id: string | null }> = {};
    filteredStock.forEach((r) => {
      if (!m[r.product_id]) {
        m[r.product_id] = {
          id: r.product_id, name: r.product_name, price: r.price, cost_price: r.cost_price,
          stock_quantity: 0, low_stock_threshold: r.low_stock_threshold,
          categories: { name: r.category_name }, category_id: r.category_id,
        };
      }
      m[r.product_id].stock_quantity += r.quantity || 0;
    });
    return Object.values(m);
  }, [filteredStock]);

  const validOrders = useMemo(() => orders.filter((o) => !TERMINAL_BAD.has(o.status)), [orders]);
  const validPrev = useMemo(() => prevOrders.filter((o) => !TERMINAL_BAD.has(o.status)), [prevOrders]);
  const validItems = useMemo(() => items.filter((i) => i.orders && !TERMINAL_BAD.has(i.orders.status)), [items]);
  const validPrevItems = useMemo(() => prevItems.filter((i) => i.orders && !TERMINAL_BAD.has(i.orders.status)), [prevItems]);

  const kpis = useMemo(() => {
    const revenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);
    const prevRevenue = validPrev.reduce((s, o) => s + (o.total || 0), 0);
    const orderCount = validOrders.length;
    const prevOrderCount = validPrev.length;
    const aov = orderCount ? revenue / orderCount : 0;
    const prevAov = prevOrderCount ? prevRevenue / prevOrderCount : 0;
    const itemsSold = validItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const prevItemsSold = validPrevItems.reduce((s, i) => s + (i.quantity || 0), 0);
    const cogs = validItems.reduce((s, i) => s + (i.products?.cost_price || 0) * (i.quantity || 0), 0);
    const grossProfit = revenue - cogs;
    const margin = revenue ? (grossProfit / revenue) * 100 : 0;
    const prevCogs = validPrevItems.reduce((s, i) => s + (i.products?.cost_price || 0) * (i.quantity || 0), 0);
    const prevProfit = prevRevenue - prevCogs;
    const cancelled = orders.filter((o) => TERMINAL_BAD.has(o.status)).reduce((s, o) => s + (o.total || 0), 0);
    const customerSet = new Set(validOrders.map((o) => o.customer_id).filter(Boolean));
    return { revenue, prevRevenue, orderCount, prevOrderCount, aov, prevAov, itemsSold, prevItemsSold, grossProfit, prevProfit, margin, cancelled, customers: customerSet.size };
  }, [validOrders, validPrev, validItems, validPrevItems, orders]);

  const trend = useMemo(() => {
    const buckets = emptyBuckets(range.from, range.to, granularity);
    const orderBuckets = { ...buckets };
    validOrders.forEach((o) => {
      const k = bucketKey(new Date(o.created_at), granularity);
      if (k in buckets) { buckets[k] += o.total || 0; orderBuckets[k] += 1; }
    });
    let prevMap: Record<string, number> = {};
    if (state.compare) {
      const pb = emptyBuckets(prevRange.from, prevRange.to, granularity);
      validPrev.forEach((o) => {
        const k = bucketKey(new Date(o.created_at), granularity);
        if (k in pb) pb[k] += o.total || 0;
      });
      const prevKeys = Object.keys(pb);
      const currKeys = Object.keys(buckets);
      currKeys.forEach((k, i) => { prevMap[k] = pb[prevKeys[i]] ?? 0; });
    }
    return Object.keys(buckets).map((k) => ({
      label: bucketLabel(k, granularity),
      revenue: buckets[k],
      orders: orderBuckets[k],
      prevRevenue: prevMap[k],
    }));
  }, [validOrders, validPrev, range, prevRange, granularity, state.compare]);

  const channelData = useMemo(() => {
    const m: Record<string, number> = {};
    validOrders.forEach((o) => { m[o.channel] = (m[o.channel] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [validOrders]);

  const statusData = useMemo(() => {
    const m: Record<string, number> = {};
    orders.forEach((o) => { m[o.status] = (m[o.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const paymentData = useMemo(() => {
    const m: Record<string, number> = {};
    validOrders.forEach((o) => { if (o.payment_method) m[o.payment_method] = (m[o.payment_method] || 0) + (o.total || 0); });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [validOrders]);

  const stockByProductId = useMemo(() => {
    const m: Record<string, { qty: number; value: number; cost: number }> = {};
    inventory.forEach((p) => {
      const q = p.stock_quantity || 0;
      m[p.id] = { qty: q, value: q * (p.price || 0), cost: q * (p.cost_price || 0) };
    });
    return m;
  }, [inventory]);

  const stockByProductName = useMemo(() => {
    const m: Record<string, { qty: number; value: number }> = {};
    inventory.forEach((p) => {
      const q = p.stock_quantity || 0;
      m[p.name] = { qty: q, value: q * (p.price || 0) };
    });
    return m;
  }, [inventory]);

  const stockByCategory = useMemo(() => {
    const m: Record<string, { qty: number; value: number; cost: number }> = {};
    inventory.forEach((p) => {
      const name = p.categories?.name || "Uncategorized";
      const q = p.stock_quantity || 0;
      if (!m[name]) m[name] = { qty: 0, value: 0, cost: 0 };
      m[name].qty += q;
      m[name].value += q * (p.price || 0);
      m[name].cost += q * (p.cost_price || 0);
    });
    return m;
  }, [inventory]);

  const topProducts = useMemo(() => {
    const m: Record<string, { name: string; revenue: number; qty: number; stockQty: number; stockValue: number }> = {};
    validItems.forEach((i) => {
      const name = i.products?.name || "Unknown";
      if (!m[name]) m[name] = { name, revenue: 0, qty: 0, stockQty: 0, stockValue: 0 };
      m[name].revenue += i.total || 0;
      m[name].qty += i.quantity || 0;
    });
    Object.values(m).forEach((p) => {
      const s = stockByProductName[p.name];
      if (s) { p.stockQty = s.qty; p.stockValue = s.value; }
    });
    return Object.values(m).sort((a, b) => topMode === "revenue" ? b.revenue - a.revenue : b.qty - a.qty).slice(0, 10);
  }, [validItems, topMode, stockByProductName]);

  const topCategories = useMemo(() => {
    const m: Record<string, { name: string; revenue: number; qty: number; stockQty: number; stockValue: number }> = {};
    validItems.forEach((i) => {
      const name = i.products?.categories?.name || "Uncategorized";
      if (!m[name]) m[name] = { name, revenue: 0, qty: 0, stockQty: 0, stockValue: 0 };
      m[name].revenue += i.total || 0;
      m[name].qty += i.quantity || 0;
    });
    Object.entries(stockByCategory).forEach(([name, s]) => {
      if (!m[name]) m[name] = { name, revenue: 0, qty: 0, stockQty: 0, stockValue: 0 };
      m[name].stockQty = s.qty;
      m[name].stockValue = s.value;
    });
    return Object.values(m).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [validItems, stockByCategory]);

  const inventoryKpis = useMemo(() => {
    const totalUnits = inventory.reduce((s, p) => s + (p.stock_quantity || 0), 0);
    const retailValue = inventory.reduce((s, p) => s + (p.stock_quantity || 0) * (p.price || 0), 0);
    const costValue = inventory.reduce((s, p) => s + (p.stock_quantity || 0) * (p.cost_price || 0), 0);
    const skus = inventory.length;
    const outOfStock = inventory.filter((p) => (p.stock_quantity || 0) <= 0).length;
    const lowStock = inventory.filter((p) => {
      const q = p.stock_quantity || 0;
      const t = p.low_stock_threshold || 0;
      return q > 0 && t > 0 && q <= t;
    }).length;
    const soldIds = new Set(validItems.map((i) => i.product_id).filter(Boolean) as string[]);
    const deadStock = inventory.filter((p) => (p.stock_quantity || 0) > 0 && !soldIds.has(p.id)).length;
    const potentialMargin = retailValue - costValue;
    return { totalUnits, retailValue, costValue, skus, outOfStock, lowStock, deadStock, potentialMargin };
  }, [inventory, validItems]);

  const inventoryByCategory = useMemo(() => {
    return Object.entries(stockByCategory)
      .map(([name, s]) => ({ name, qty: s.qty, value: s.value, cost: s.cost }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [stockByCategory]);

  const heatmap = useMemo(() => {
    // 7x24 grid
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    validOrders.forEach((o) => {
      const d = new Date(o.created_at);
      g[d.getDay()][d.getHours()] += o.total || 0;
    });
    const max = Math.max(1, ...g.flat());
    return { g, max };
  }, [validOrders]);

  const handleExportCsv = () => {
    const rows = [
      ...trend.map((t) => ({ section: "Trend", label: t.label, revenue: t.revenue, orders: t.orders })),
      ...channelData.map((r) => ({ section: "Channel", label: r.name, value: r.value })),
      ...statusData.map((r) => ({ section: "Status", label: r.name, value: r.value })),
      ...paymentData.map((r) => ({ section: "Payment", label: r.name, value: r.value })),
      ...topProducts.map((p) => ({ section: "Top Product", label: p.name, revenue: p.revenue, qty: p.qty, stock_qty: p.stockQty, stock_value: p.stockValue })),
      ...topCategories.map((c) => ({ section: "Category", label: c.name, revenue: c.revenue, qty: c.qty, stock_qty: c.stockQty, stock_value: c.stockValue })),
      ...inventoryByCategory.map((c) => ({ section: "Inventory by Category", label: c.name, qty: c.qty, retail_value: c.value, cost_value: c.cost })),
    ];
    downloadCSV(`analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };
  const handleExportPdf = async () => {
    if (reportRef.current) await exportElementToPDF(reportRef.current, `analytics-${new Date().toISOString().slice(0,10)}.pdf`, "DreamNest — Analytics Report");
  };
  const handlePrint = () => window.print();

  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold">Analytics</h1>
      </div>

      <ReportToolbar
        state={state} onChange={setState} fromTo={range}
        onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} onPrint={handlePrint}
      />

      <div ref={reportRef} className="space-y-6 bg-background">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Revenue" value={formatRWF(kpis.revenue)} delta={state.compare ? pctDelta(kpis.revenue, kpis.prevRevenue) : null} sub={state.compare ? `prev ${formatRWF(kpis.prevRevenue)}` : undefined} />
          <KpiCard label="Orders" value={formatInt(kpis.orderCount)} delta={state.compare ? pctDelta(kpis.orderCount, kpis.prevOrderCount) : null} sub={state.compare ? `prev ${formatInt(kpis.prevOrderCount)}` : undefined} />
          <KpiCard label="Avg Order Value" value={formatRWF(kpis.aov)} delta={state.compare ? pctDelta(kpis.aov, kpis.prevAov) : null} />
          <KpiCard label="Items Sold" value={formatInt(kpis.itemsSold)} delta={state.compare ? pctDelta(kpis.itemsSold, kpis.prevItemsSold) : null} />
          <KpiCard label="Gross Profit" value={formatRWF(kpis.grossProfit)} delta={state.compare ? pctDelta(kpis.grossProfit, kpis.prevProfit) : null} sub={`Margin ${kpis.margin.toFixed(1)}%`} />
          <KpiCard label="Cancelled/Refunded" value={formatRWF(kpis.cancelled)} invertDelta />
          <KpiCard label="Active Customers" value={formatInt(kpis.customers)} />
          <KpiCard label="Channels" value={formatInt(channelData.length)} />
        </div>

        {/* Trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue & Orders Trend</CardTitle></CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis yAxisId="left" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(v: number, name) => name === "orders" ? formatInt(v) : formatRWF(v)} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(25, 35%, 28%)" strokeWidth={2} name="Revenue" />
                  {state.compare && <Line yAxisId="left" type="monotone" dataKey="prevRevenue" stroke="hsl(32, 25%, 65%)" strokeDasharray="5 5" name="Prev Revenue" />}
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(40, 50%, 52%)" strokeWidth={2} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">{loading ? "Loading..." : "No data in this period"}</p>}
          </CardContent>
        </Card>

        {/* Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Sales by Channel</CardTitle></CardHeader>
            <CardContent>
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart><Pie data={channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Legend /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Order Status</CardTitle></CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(25, 35%, 28%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Top Products — Sold vs Stock</CardTitle>
              <Tabs value={topMode} onValueChange={(v) => setTopMode(v as any)}>
                <TabsList className="h-8"><TabsTrigger value="revenue" className="text-xs">Revenue / Value</TabsTrigger><TabsTrigger value="qty" className="text-xs">Quantity</TabsTrigger></TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={topProducts} layout="vertical" barCategoryGap={8}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => topMode === "revenue" ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number, n: string) => [topMode === "revenue" ? formatRWF(v) : formatInt(v), n]} />
                    <Legend />
                    {topMode === "revenue" ? (
                      <>
                        <Bar dataKey="revenue" name="Sold (revenue)" fill="hsl(40, 50%, 72%)" radius={[0,4,4,0]} />
                        <Bar dataKey="stockValue" name="In stock (value)" fill="hsl(25, 35%, 28%)" radius={[0,4,4,0]} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="qty" name="Sold (qty)" fill="hsl(40, 50%, 72%)" radius={[0,4,4,0]} />
                        <Bar dataKey="stockQty" name="In stock (qty)" fill="hsl(25, 35%, 28%)" radius={[0,4,4,0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Revenue by Payment Method</CardTitle></CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart><Pie data={paymentData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name }) => name}>
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie><Legend /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Top Categories — Sales vs Stock Value</CardTitle></CardHeader>
            <CardContent>
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={topCategories} layout="vertical" barCategoryGap={8}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatRWF(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Sold (revenue)" fill="hsl(150, 50%, 40%)" radius={[0,4,4,0]} />
                    <Bar dataKey="stockValue" name="In stock (value)" fill="hsl(25, 35%, 28%)" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-8">No data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Sales Heatmap (Day × Hour)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="grid" style={{ gridTemplateColumns: "auto repeat(24, 1fr)", gap: 2 }}>
                  <div />
                  {Array.from({ length: 24 }).map((_, h) => <div key={h} className="text-[10px] text-center text-muted-foreground">{h}</div>)}
                  {days.flatMap((day, di) => [
                    <div key={`d${di}`} className="text-[10px] pr-2 text-muted-foreground">{day}</div>,
                    ...Array.from({ length: 24 }).map((_, h) => {
                      const v = heatmap.g[di][h];
                      const intensity = v / heatmap.max;
                      return <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${formatRWF(v)}`} className="h-5 rounded-sm" style={{ backgroundColor: `hsl(25, 35%, ${100 - intensity * 60}%)` }} />;
                    }),
                  ])}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Analytics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <h2 className="font-serif text-xl font-semibold">Inventory Analytics</h2>
            <Tabs value={invMetric} onValueChange={(v) => setInvMetric(v as any)}>
              <TabsList className="h-8"><TabsTrigger value="value" className="text-xs">Value (RWF)</TabsTrigger><TabsTrigger value="qty" className="text-xs">Quantity</TabsTrigger></TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap items-end gap-3 p-3 border rounded-md bg-card">
            <div className="space-y-1">
              <Label className="text-xs">Location / Warehouse</Label>
              <Select value={invLocation} onValueChange={setInvLocation}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={invCategory} onValueChange={setInvCategory}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              Showing {formatInt(inventory.length)} product{inventory.length === 1 ? "" : "s"} across {formatInt(new Set(filteredStock.map((r) => r.location_id)).size)} location{new Set(filteredStock.map((r) => r.location_id)).size === 1 ? "" : "s"}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="SKUs" value={formatInt(inventoryKpis.skus)} />
            <KpiCard label="Total Units in Stock" value={formatInt(inventoryKpis.totalUnits)} />
            <KpiCard label="Stock Value (retail)" value={formatRWF(inventoryKpis.retailValue)} />
            <KpiCard label="Stock Value (cost)" value={formatRWF(inventoryKpis.costValue)} sub={`Potential margin ${formatRWF(inventoryKpis.potentialMargin)}`} />
            <KpiCard label="Out of Stock" value={formatInt(inventoryKpis.outOfStock)} invertDelta />
            <KpiCard label="Low Stock" value={formatInt(inventoryKpis.lowStock)} invertDelta />
            <KpiCard label="Dead Stock (no sales)" value={formatInt(inventoryKpis.deadStock)} sub="In selected period" invertDelta />
            <KpiCard label="Sell-through" value={`${inventoryKpis.totalUnits ? ((kpis.itemsSold / (inventoryKpis.totalUnits + kpis.itemsSold)) * 100).toFixed(1) : "0.0"}%`} sub="Sold ÷ (sold + stock)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Stock by Category</CardTitle></CardHeader>
              <CardContent>
                {inventoryByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={inventoryByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => invMetric === "value" ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => invMetric === "value" ? formatRWF(v) : formatInt(v)} />
                      <Legend />
                      {invMetric === "value" ? (
                        <>
                          <Bar dataKey="value" name="Retail value" fill="hsl(40, 50%, 72%)" radius={[0,4,4,0]} />
                          <Bar dataKey="cost" name="Cost value" fill="hsl(25, 35%, 28%)" radius={[0,4,4,0]} />
                        </>
                      ) : (
                        <Bar dataKey="qty" name="Units" fill="hsl(150, 50%, 40%)" radius={[0,4,4,0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No inventory data</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Stock Health</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const inStock = inventoryKpis.skus - inventoryKpis.outOfStock - inventoryKpis.lowStock;
                  const data = [
                    { name: "Healthy", value: Math.max(0, inStock) },
                    { name: "Low Stock", value: inventoryKpis.lowStock },
                    { name: "Out of Stock", value: inventoryKpis.outOfStock },
                    { name: "Dead Stock", value: inventoryKpis.deadStock },
                  ].filter((d) => d.value > 0);
                  const healthColors = ["hsl(150, 50%, 40%)", "hsl(40, 70%, 55%)", "hsl(0, 72%, 51%)", "hsl(280, 30%, 55%)"];
                  return data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {data.map((_, i) => <Cell key={i} fill={healthColors[i % healthColors.length]} />)}
                        </Pie>
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-8">No data</p>;
                })()}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Stock by Location / Warehouse</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const m: Record<string, { name: string; qty: number; value: number; cost: number }> = {};
                  filteredStock.forEach((r) => {
                    if (!m[r.location_id]) m[r.location_id] = { name: r.location_name, qty: 0, value: 0, cost: 0 };
                    m[r.location_id].qty += r.quantity || 0;
                    m[r.location_id].value += (r.quantity || 0) * (r.price || 0);
                    m[r.location_id].cost += (r.quantity || 0) * (r.cost_price || 0);
                  });
                  const data = Object.values(m).sort((a, b) => invMetric === "value" ? b.value - a.value : b.qty - a.qty);
                  return data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => invMetric === "value" ? `${(v/1000).toFixed(0)}k` : String(v)} />
                        <Tooltip formatter={(v: number) => invMetric === "value" ? formatRWF(v) : formatInt(v)} />
                        <Legend />
                        {invMetric === "value" ? (
                          <>
                            <Bar dataKey="value" name="Retail value" fill="hsl(40, 50%, 72%)" radius={[4,4,0,0]} />
                            <Bar dataKey="cost" name="Cost value" fill="hsl(25, 35%, 28%)" radius={[4,4,0,0]} />
                          </>
                        ) : (
                          <Bar dataKey="qty" name="Units" fill="hsl(150, 50%, 40%)" radius={[4,4,0,0]} />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-muted-foreground py-8">No stock at any location for this filter</p>;
                })()}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Top Stock Holdings (by value)</CardTitle></CardHeader>
              <CardContent>
                {inventory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={[...inventory]
                        .map((p) => ({
                          name: p.name,
                          qty: p.stock_quantity || 0,
                          value: (p.stock_quantity || 0) * (p.price || 0),
                          cost: (p.stock_quantity || 0) * (p.cost_price || 0),
                        }))
                        .sort((a, b) => (invMetric === "value" ? b.value - a.value : b.qty - a.qty))
                        .slice(0, 12)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => invMetric === "value" ? `${(v/1000).toFixed(0)}k` : String(v)} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => invMetric === "value" ? formatRWF(v) : formatInt(v)} />
                      <Legend />
                      {invMetric === "value" ? (
                        <>
                          <Bar dataKey="value" name="Retail value" fill="hsl(40, 50%, 72%)" radius={[0,4,4,0]} />
                          <Bar dataKey="cost" name="Cost value" fill="hsl(25, 35%, 28%)" radius={[0,4,4,0]} />
                        </>
                      ) : (
                        <Bar dataKey="qty" name="Units in stock" fill="hsl(150, 50%, 40%)" radius={[0,4,4,0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-8">No inventory</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

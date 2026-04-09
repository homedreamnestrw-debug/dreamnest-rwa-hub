import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingCart, Users, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  recentOrders: any[];
  revenueByMonth: { month: string; revenue: number }[];
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStockCount: 0,
    recentOrders: [],
    revenueByMonth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const [ordersRes, productsRes, customersRes, lowStockRes, recentRes] = await Promise.all([
        supabase.from("orders").select("total, created_at, status"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).lt("stock_quantity", 5),
        supabase.from("orders").select("*, profiles!orders_customer_id_fkey(full_name)").order("created_at", { ascending: false }).limit(5),
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

      // Group revenue by month
      const monthMap: Record<string, number> = {};
      orders.forEach((o) => {
        const month = new Date(o.created_at).toLocaleString("default", { month: "short" });
        monthMap[month] = (monthMap[month] || 0) + (o.total || 0);
      });
      const revenueByMonth = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));

      setMetrics({
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: customersRes.count || 0,
        totalProducts: productsRes.count || 0,
        lowStockCount: lowStockRes.count || 0,
        recentOrders: recentRes.data || [],
        revenueByMonth,
      });
      setLoading(false);
    }
    fetchMetrics();
  }, []);

  const formatRWF = (amount: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(amount);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading dashboard...</div>;
  }

  const statCards = [
    { label: "Total Revenue", value: formatRWF(metrics.totalRevenue), icon: DollarSign, color: "text-emerald-600" },
    { label: "Orders", value: metrics.totalOrders, icon: ShoppingCart, color: "text-blue-600" },
    { label: "Customers", value: metrics.totalCustomers, icon: Users, color: "text-violet-600" },
    { label: "Products", value: metrics.totalProducts, icon: Package, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock warning */}
      {metrics.lowStockCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium">
              {metrics.lowStockCount} product{metrics.lowStockCount > 1 ? "s" : ""} with low stock
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatRWF(value)} />
                  <Bar dataKey="revenue" fill="hsl(25, 35%, 28%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentOrders.length > 0 ? (
              <div className="space-y-3">
                {metrics.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatRWF(order.total)}</p>
                      <span className="text-xs capitalize text-muted-foreground">{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

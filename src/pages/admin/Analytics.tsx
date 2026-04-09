import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(25, 35%, 28%)", "hsl(40, 50%, 72%)", "hsl(32, 25%, 65%)", "hsl(0, 72%, 51%)", "hsl(210, 60%, 50%)"];

export default function Analytics() {
  const [data, setData] = useState<{ channelData: any[]; statusData: any[]; paymentData: any[]; topProducts: any[] }>({
    channelData: [], statusData: [], paymentData: [], topProducts: [],
  });

  useEffect(() => {
    async function fetch() {
      const { data: orders } = await supabase.from("orders").select("channel, status, payment_method, total");
      const { data: items } = await supabase.from("order_items").select("product_id, quantity, total, products(name)");

      if (orders) {
        const channels: Record<string, number> = {};
        const statuses: Record<string, number> = {};
        const payments: Record<string, number> = {};
        orders.forEach((o) => {
          channels[o.channel] = (channels[o.channel] || 0) + 1;
          statuses[o.status] = (statuses[o.status] || 0) + 1;
          if (o.payment_method) payments[o.payment_method] = (payments[o.payment_method] || 0) + (o.total || 0);
        });
        setData((d) => ({
          ...d,
          channelData: Object.entries(channels).map(([name, value]) => ({ name, value })),
          statusData: Object.entries(statuses).map(([name, value]) => ({ name, value })),
          paymentData: Object.entries(payments).map(([name, value]) => ({ name, value })),
        }));
      }

      if (items) {
        const productTotals: Record<string, { name: string; revenue: number; qty: number }> = {};
        items.forEach((i: any) => {
          const name = i.products?.name || "Unknown";
          if (!productTotals[name]) productTotals[name] = { name, revenue: 0, qty: 0 };
          productTotals[name].revenue += i.total || 0;
          productTotals[name].qty += i.quantity || 0;
        });
        setData((d) => ({ ...d, topProducts: Object.values(productTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 5) }));
      }
    }
    fetch();
  }, []);

  const formatRWF = (n: number) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales by Channel</CardTitle></CardHeader>
          <CardContent>
            {data.channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={data.channelData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Order Status Distribution</CardTitle></CardHeader>
          <CardContent>
            {data.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.statusData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(25, 35%, 28%)" radius={[4,4,0,0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            {data.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} /><YAxis type="category" dataKey="name" width={100} /><Tooltip formatter={(v: number) => formatRWF(v)} /><Bar dataKey="revenue" fill="hsl(40, 50%, 72%)" radius={[0,4,4,0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">No data yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent>
            {data.paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={data.paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name }) => name}>
                  {data.paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">No data yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

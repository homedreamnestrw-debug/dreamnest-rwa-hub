import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import { OrderDetailDialog } from "@/components/admin/OrderDetailDialog";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Order updated to ${status}` });
    fetchOrders();
  };

  const formatRWF = (n: number) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const getCustomerDisplay = (o: any) => {
    if (o.guest_name) return o.guest_name;
    if (o.guest_phone) return o.guest_phone;
    if (o.customer_id) return "Registered";
    return "—";
  };

  const filtered = orders.filter((o) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      o.order_number?.toString().includes(search) ||
      (o.guest_name || "").toLowerCase().includes(searchLower) ||
      (o.guest_phone || "").includes(search) ||
      (o.guest_email || "").toLowerCase().includes(searchLower);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-semibold">Orders</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by order #, name, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Constants.public.Enums.order_status.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Update</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailOrderId(o.id)}>
                <TableCell className="font-medium">#{o.order_number}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <span>{getCustomerDisplay(o)}</span>
                    {!o.customer_id && o.guest_name && (
                      <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0">Guest</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">{o.channel}</Badge>
                </TableCell>
                <TableCell>{formatRWF(o.total)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{o.payment_status}</Badge></TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[o.status] || ""}`}>
                    {o.status}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.order_status.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOrderId(o.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrderDetailDialog
        orderId={detailOrderId}
        open={!!detailOrderId}
        onOpenChange={(open) => !open && setDetailOrderId(null)}
      />
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Eye, FileText, Truck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Tables as DbTables } from "@/integrations/supabase/types";

type PurchaseOrder = DbTables<"purchase_orders">;
type Supplier = DbTables<"suppliers">;
type Product = Pick<DbTables<"products">, "id" | "name" | "sku" | "cost_price">;

interface POItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
}

export default function PurchaseOrders() {
  const { user } = useAuth();
  const [pos, setPOs] = useState<(PurchaseOrder & { supplier_name?: string })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create PO dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [poSupplier, setPOSupplier] = useState("");
  const [poExpectedDelivery, setPOExpectedDelivery] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [poItems, setPOItems] = useState<POItem[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);

  // View PO dialog
  const [viewPO, setViewPO] = useState<PurchaseOrder | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [poRes, supRes, prodRes] = await Promise.all([
      supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("id, name, sku, cost_price").order("name"),
    ]);
    const sups = supRes.data || [];
    setSuppliers(sups);
    setProducts(prodRes.data || []);
    setPOs(
      (poRes.data || []).map((po) => ({
        ...po,
        supplier_name: sups.find((s) => s.id === po.supplier_id)?.name || "Unknown",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const formatRWF = (n: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  const addItem = () => setPOItems([...poItems, { product_id: "", quantity: 1, unit_cost: 0 }]);
  const removeItem = (i: number) => setPOItems(poItems.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof POItem, value: any) => {
    const items = [...poItems];
    (items[i] as any)[field] = value;
    // Auto-fill cost from product
    if (field === "product_id") {
      const prod = products.find((p) => p.id === value);
      if (prod) items[i].unit_cost = prod.cost_price;
    }
    setPOItems(items);
  };

  const subtotal = poItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
  const tax = Math.round(subtotal * 0.18);

  const handleCreate = async () => {
    if (!poSupplier) { toast({ title: "Select a supplier", variant: "destructive" }); return; }
    const validItems = poItems.filter((i) => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { toast({ title: "Add at least one item", variant: "destructive" }); return; }

    // Generate PO number
    const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true });
    const poNumber = `PO-${String((count || 0) + 1).padStart(4, "0")}`;

    const { data: po, error } = await supabase.from("purchase_orders").insert({
      po_number: poNumber,
      supplier_id: poSupplier,
      status: "draft",
      subtotal,
      tax,
      total: subtotal + tax,
      expected_delivery: poExpectedDelivery || null,
      notes: poNotes || null,
      created_by: user?.id || null,
    }).select().single();

    if (error || !po) {
      toast({ title: "Error", description: error?.message || "Failed to create PO", variant: "destructive" });
      return;
    }

    // Insert items
    const itemsPayload = validItems.map((i) => ({
      purchase_order_id: po.id,
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      total: i.quantity * i.unit_cost,
    }));
    await supabase.from("purchase_order_items").insert(itemsPayload);

    toast({ title: "Purchase order created", description: poNumber });
    setCreateOpen(false);
    setPOItems([{ product_id: "", quantity: 1, unit_cost: 0 }]);
    setPOSupplier("");
    setPONotes("");
    setPOExpectedDelivery("");
    fetchAll();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("purchase_orders").update({ status: status as any }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // If received, offer to restock (simplified: just update status)
    toast({ title: `PO updated to ${status}` });
    fetchAll();
  };

  const openView = async (po: PurchaseOrder) => {
    setViewPO(po);
    const { data } = await supabase.from("purchase_order_items").select("*").eq("purchase_order_id", po.id);
    const items = (data || []).map((i) => ({
      ...i,
      product_name: products.find((p) => p.id === i.product_id)?.name || "Unknown",
    }));
    setViewItems(items);
  };

  const filtered = pos.filter((po) => {
    const matchSearch = po.po_number.toLowerCase().includes(search.toLowerCase()) ||
      (po.supplier_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const totalPOs = pos.length;
  const pendingPOs = pos.filter((p) => p.status === "draft" || p.status === "sent").length;
  const totalValue = pos.reduce((s, p) => s + p.total, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Purchase Orders</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New PO</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Supplier</Label>
                <Select value={poSupplier} onValueChange={setPOSupplier}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Input type="date" value={poExpectedDelivery} onChange={(e) => setPOExpectedDelivery(e.target.value)} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
                </div>
                {poItems.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                    <div className="col-span-5">
                      <Select value={item.product_id} onValueChange={(v) => updateItem(i, "product_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, "quantity", +e.target.value)} placeholder="Qty" />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" value={item.unit_cost} onChange={(e) => updateItem(i, "unit_cost", +e.target.value)} placeholder="Unit cost" />
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-medium">{formatRWF(item.quantity * item.unit_cost)}</span>
                      {poItems.length > 1 && (
                        <Button variant="ghost" size="sm" className="ml-1 h-6 w-6 p-0 text-destructive" onClick={() => removeItem(i)}>×</Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 space-y-1 text-sm text-right">
                  <div>Subtotal: {formatRWF(subtotal)}</div>
                  <div>Tax (18%): {formatRWF(tax)}</div>
                  <div className="font-semibold text-base">Total: {formatRWF(subtotal + tax)}</div>
                </div>
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={poNotes} onChange={(e) => setPONotes(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Purchase Order</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPOs}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingPOs}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatRWF(totalValue)}</div></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by PO # or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Constants.public.Enums.po_status.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* PO Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No purchase orders found</TableCell></TableRow>
            ) : filtered.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.po_number}</TableCell>
                <TableCell>{po.supplier_name}</TableCell>
                <TableCell>{formatRWF(po.total)}</TableCell>
                <TableCell>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[po.status] || ""}`}>
                    {po.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(po.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openView(po)}><Eye className="h-4 w-4" /></Button>
                    {po.status === "draft" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(po.id, "sent")}>Send</Button>
                    )}
                    {po.status === "sent" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(po.id, "received")}>Received</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View PO Dialog */}
      <Dialog open={!!viewPO} onOpenChange={(o) => { if (!o) setViewPO(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewPO?.po_number} Details</DialogTitle>
          </DialogHeader>
          {viewPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Supplier:</span> {pos.find((p) => p.id === viewPO.id)?.supplier_name}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="capitalize">{viewPO.status}</Badge></div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(viewPO.created_at).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Delivery:</span> {viewPO.expected_delivery ? new Date(viewPO.expected_delivery).toLocaleDateString() : "—"}</div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.product_name}</TableCell>
                        <TableCell>{i.quantity}</TableCell>
                        <TableCell>{formatRWF(i.unit_cost)}</TableCell>
                        <TableCell>{formatRWF(i.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right space-y-1 text-sm">
                <div>Subtotal: {formatRWF(viewPO.subtotal)}</div>
                <div>Tax: {formatRWF(viewPO.tax)}</div>
                <div className="font-semibold text-base">Total: {formatRWF(viewPO.total)}</div>
              </div>
              {viewPO.notes && <p className="text-sm text-muted-foreground">{viewPO.notes}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

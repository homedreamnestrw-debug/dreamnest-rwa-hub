import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, AlertTriangle, ArrowRightLeft, History, Plus, Warehouse } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables as DbTables } from "@/integrations/supabase/types";

type Product = DbTables<"products">;
type StockMovement = DbTables<"stock_movements">;
type StockLocation = DbTables<"stock_locations">;

type ProductStock = { product_id: string; location_id: string; quantity: number };

export default function StockManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<(StockMovement & { product_name?: string; location_name?: string })[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [productStock, setProductStock] = useState<ProductStock[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [overviewLocation, setOverviewLocation] = useState<string>("all");

  // Adjust stock dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<"restock" | "adjustment" | "return">("adjustment");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLocation, setAdjustLocation] = useState("");

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferProduct, setTransferProduct] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferQty, setTransferQty] = useState(1);

  const fetchAll = useCallback(async () => {
    const [prodRes, movRes, locRes, stockRes] = await Promise.all([
      supabase.from("products").select("*").order("stock_quantity", { ascending: true }),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("stock_locations").select("*").order("name"),
      supabase.from("product_stock").select("product_id, location_id, quantity"),
    ]);
    const prods = prodRes.data || [];
    const locs = locRes.data || [];
    setProducts(prods);
    setLocations(locs);
    setProductStock(stockRes.data || []);

    const movs = (movRes.data || []).map((m) => ({
      ...m,
      product_name: prods.find((p) => p.id === m.product_id)?.name || "Unknown",
      location_name: locs.find((l) => l.id === m.location_id)?.name || "—",
    }));
    setMovements(movs);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Stock at currently selected location (or global if "all")
  const stockFor = (productId: string): number => {
    if (overviewLocation === "all") {
      return products.find((p) => p.id === productId)?.stock_quantity ?? 0;
    }
    return productStock.find((s) => s.product_id === productId && s.location_id === overviewLocation)?.quantity ?? 0;
  };

  const stockAtLocation = (productId: string, locationId: string): number =>
    productStock.find((s) => s.product_id === productId && s.location_id === locationId)?.quantity ?? 0;

  const lowStockProducts = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);
  const outOfStock = products.filter((p) => p.stock_quantity <= 0);
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdjust = async () => {
    if (!adjustProduct || adjustQty === 0) return;
    if (!adjustLocation) {
      toast({ title: "Select a location", variant: "destructive" });
      return;
    }
    const prev = stockAtLocation(adjustProduct.id, adjustLocation);
    const newStock = prev + adjustQty;
    if (newStock < 0) {
      toast({ title: "Error", description: "Stock at this location cannot go below 0", variant: "destructive" });
      return;
    }

    // Upsert per-location stock; the DB trigger will sync products.stock_quantity
    const { error: upErr } = await supabase
      .from("product_stock")
      .upsert(
        { product_id: adjustProduct.id, location_id: adjustLocation, quantity: newStock },
        { onConflict: "product_id,location_id" }
      );
    if (upErr) { toast({ title: "Error", description: upErr.message, variant: "destructive" }); return; }

    await supabase.from("stock_movements").insert({
      product_id: adjustProduct.id,
      movement_type: adjustType,
      quantity: adjustQty,
      previous_stock: prev,
      new_stock: newStock,
      reason: adjustReason || null,
      performed_by: user?.id || null,
      location_id: adjustLocation,
    });

    toast({ title: "Stock adjusted", description: `${adjustProduct.name}: ${prev} → ${newStock}` });
    setAdjustOpen(false);
    setAdjustQty(0);
    setAdjustReason("");
    setAdjustProduct(null);
    fetchAll();
  };

  const handleTransfer = async () => {
    if (!transferProduct || !transferFrom || !transferTo || transferQty <= 0) return;
    if (transferFrom === transferTo) {
      toast({ title: "Error", description: "Source and destination must be different", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("transfer_stock", {
      p_product_id: transferProduct,
      p_from_location: transferFrom,
      p_to_location: transferTo,
      p_quantity: transferQty,
    });
    if (error) { toast({ title: "Transfer failed", description: error.message, variant: "destructive" }); return; }

    toast({ title: "Stock transferred" });
    setTransferOpen(false);
    setTransferQty(1);
    setTransferProduct("");
    setTransferFrom("");
    setTransferTo("");
    fetchAll();
  };

  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty(0);
    setAdjustType("adjustment");
    setAdjustReason("");
    setAdjustLocation(locations[0]?.id || "");
    setAdjustOpen(true);
  };

  const stockBadge = (qty: number, threshold: number) => {
    if (qty <= 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (qty <= threshold) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low Stock</Badge>;
    return <Badge variant="secondary">In Stock</Badge>;
  };

  const movementBadge = (type: string) => {
    const colors: Record<string, string> = {
      sale: "bg-blue-100 text-blue-800",
      restock: "bg-green-100 text-green-800",
      adjustment: "bg-orange-100 text-orange-800",
      return: "bg-purple-100 text-purple-800",
      transfer: "bg-cyan-100 text-cyan-800",
    };
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[type] || ""}`}>{type}</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading stock data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Stock Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" /> Transfer
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{locations.length}</div></CardContent>
        </Card>
        <Card className={lowStockProducts.length > 0 ? "border-yellow-300 bg-yellow-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-700">{lowStockProducts.length}</div></CardContent>
        </Card>
        <Card className={outOfStock.length > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{outOfStock.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock Alerts</TabsTrigger>
          <TabsTrigger value="movements">Movement Log</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell className={p.stock_quantity <= p.low_stock_threshold ? "text-destructive font-semibold" : ""}>{p.stock_quantity}</TableCell>
                    <TableCell>{p.low_stock_threshold}</TableCell>
                    <TableCell>{stockBadge(p)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => openAdjust(p)}>
                        <Plus className="h-3 w-3 mr-1" /> Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          {lowStockProducts.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">All products are well stocked!</CardContent></Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Deficit</TableHead>
                    <TableHead className="w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell className="text-destructive font-semibold">{p.stock_quantity}</TableCell>
                      <TableCell>{p.low_stock_threshold}</TableCell>
                      <TableCell className="text-destructive">{p.low_stock_threshold - p.stock_quantity}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => { setAdjustType("restock"); openAdjust(p); }}>
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Movement Log Tab */}
        <TabsContent value="movements" className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Before → After</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No movements recorded</TableCell></TableRow>
                ) : movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{m.product_name}</TableCell>
                    <TableCell>{movementBadge(m.movement_type)}</TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </TableCell>
                    <TableCell className="text-sm">{m.previous_stock} → {m.new_stock}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.location_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.reason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock — {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Current stock: <span className="font-semibold text-foreground">{adjustProduct?.stock_quantity}</span>
            </div>
            <div>
              <Label>Movement Type</Label>
              <Select value={adjustType} onValueChange={(v) => setAdjustType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock (+)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                  <SelectItem value="return">Return (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity Change</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(+e.target.value)} placeholder="e.g. +10 or -3" />
              {adjustProduct && (
                <p className="text-xs text-muted-foreground mt-1">
                  New stock will be: {adjustProduct.stock_quantity + adjustQty}
                </p>
              )}
            </div>
            {locations.length > 0 && (
              <div>
                <Label>Location</Label>
                <Select value={adjustLocation} onValueChange={setAdjustLocation}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Received from supplier" />
            </div>
            <Button onClick={handleAdjust} className="w-full">Confirm Adjustment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Stock Between Locations</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product</Label>
              <Select value={transferProduct} onValueChange={setTransferProduct}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Location</Label>
                <Select value={transferFrom} onValueChange={setTransferFrom}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Location</Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={transferQty} onChange={(e) => setTransferQty(+e.target.value)} />
            </div>
            <Button onClick={handleTransfer} className="w-full">Confirm Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

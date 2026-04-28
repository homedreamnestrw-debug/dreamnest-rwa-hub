import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ProductImageUpload } from "@/components/admin/ProductImageUpload";
import { VariantManager, persistVariants, type OptionsSchema, type VariantRow } from "@/components/admin/VariantManager";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Category = Tables<"categories">;
type StockLocation = Tables<"stock_locations">;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [locationStock, setLocationStock] = useState<Record<string, number>>({});
  const [optionsSchema, setOptionsSchema] = useState<OptionsSchema>({});
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    cost_price: 0,
    sku: "",
    low_stock_threshold: 5,
    category_id: "",
    tax_enabled: true,
    is_active: true,
    featured: false,
    images: [] as string[],
  });

  const fetchData = async () => {
    const [prodRes, catRes, locRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase.from("stock_locations").select("*").eq("is_active", true).order("name"),
    ]);
    setProducts(prodRes.data || []);
    setCategories(catRes.data || []);
    setLocations(locRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", price: 0, cost_price: 0, sku: "", low_stock_threshold: 5, category_id: "", tax_enabled: true, is_active: true, featured: false, images: [] });
    setLocationStock({});
    setOptionsSchema({});
    setVariantRows([]);
    setEditing(null);
  };

  const openEdit = async (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      price: p.price,
      cost_price: p.cost_price,
      sku: p.sku || "",
      low_stock_threshold: p.low_stock_threshold,
      category_id: p.category_id || "",
      tax_enabled: p.tax_enabled,
      is_active: p.is_active,
      featured: p.featured,
      images: p.images || [],
    });
    // Load per-location stock
    const { data } = await supabase
      .from("product_stock")
      .select("location_id, quantity")
      .eq("product_id", p.id);
    const map: Record<string, number> = {};
    (data || []).forEach((r) => { map[r.location_id] = r.quantity; });
    setLocationStock(map);

    // Load variant schema + variants + variant stock
    const schema = ((p as any).variant_attributes ?? {}) as OptionsSchema;
    setOptionsSchema(schema);
    const { data: vData } = await supabase
      .from("product_variants")
      .select("id, variant_name, attributes, sku, price_override, is_active")
      .eq("product_id", p.id)
      .eq("is_active", true);
    const variantIds = (vData ?? []).map((v) => v.id);
    let stockByVariant: Record<string, Record<string, number>> = {};
    if (variantIds.length > 0) {
      const { data: vsData } = await supabase
        .from("variant_stock")
        .select("variant_id, location_id, quantity")
        .in("variant_id", variantIds);
      (vsData ?? []).forEach((r: any) => {
        stockByVariant[r.variant_id] = stockByVariant[r.variant_id] || {};
        stockByVariant[r.variant_id][r.location_id] = r.quantity;
      });
    }
    setVariantRows(
      (vData ?? []).map((v: any) => ({
        id: v.id,
        variant_name: v.variant_name,
        attributes: (v.attributes ?? {}) as Record<string, string>,
        sku: v.sku ?? "",
        price_override: v.price_override,
        is_active: v.is_active,
        stock: stockByVariant[v.id] ?? {},
      }))
    );
    setDialogOpen(true);
  };

  const totalStock = Object.values(locationStock).reduce((a, b) => a + (b || 0), 0);

  const handleSave = async () => {
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const { images, ...rest } = form;
    const hasVariants = variantRows.length > 0;
    const payload: TablesInsert<"products"> = {
      ...rest,
      slug,
      category_id: form.category_id || null,
      images: images.length > 0 ? images : null,
      variant_attributes: optionsSchema as any,
    };

    let productId: string;
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      productId = editing.id;
      toast({ title: "Product updated" });
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); return; }
      productId = data.id;
      toast({ title: "Product created" });
    }

    // Persist variants (and their per-location stock) when defined
    if (hasVariants) {
      const { error: vErr } = await persistVariants(productId, variantRows);
      if (vErr) { toast({ title: "Variants save failed", description: vErr, variant: "destructive" }); }
    } else {
      // No variants: regular per-product per-location stock
      const upserts = Object.entries(locationStock)
        .filter(([locId]) => locId)
        .map(([location_id, quantity]) => ({ product_id: productId, location_id, quantity: quantity || 0 }));
      if (upserts.length > 0) {
        const { error: stockErr } = await supabase
          .from("product_stock")
          .upsert(upserts, { onConflict: "product_id,location_id" });
        if (stockErr) { toast({ title: "Stock save failed", description: stockErr.message, variant: "destructive" }); }
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "Product deleted" });
    fetchData();
  };

  const formatRWF = (n: number) => new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(n);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price (RWF)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                <div><Label>Cost Price</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div><Label>Low Stock Threshold</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: +e.target.value })} /></div>
              </div>
              {variantRows.length === 0 && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Stock per Location</Label>
                    <span className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalStock}</span></span>
                  </div>
                  {locations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active locations. Create one in Locations first.</p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((l) => (
                        <div key={l.id} className="flex items-center gap-3">
                          <span className="text-sm flex-1 truncate">{l.name}</span>
                          <Input
                            type="number"
                            min={0}
                            className="w-28"
                            value={locationStock[l.id] ?? 0}
                            onChange={(e) => setLocationStock({ ...locationStock, [l.id]: +e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Hidden when this product has variants — stock is then tracked per variant below.</p>
                </div>
              )}

              <VariantManager
                productId={editing?.id ?? null}
                basePrice={form.price}
                locations={locations.map((l) => ({ id: l.id, name: l.name }))}
                options={optionsSchema}
                onOptionsChange={setOptionsSchema}
                variants={variantRows}
                onVariantsChange={setVariantRows}
              />

              <div>
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.tax_enabled} onCheckedChange={(v) => setForm({ ...form, tax_enabled: v })} /><Label>Tax</Label></div>
              </div>
              <div>
                <Label>Images</Label>
                <ProductImageUpload images={form.images} onChange={(imgs) => setForm({ ...form, images: imgs })} />
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Create"} Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                <TableCell>{formatRWF(p.price)}</TableCell>
                <TableCell>
                  <span className={p.stock_quantity <= p.low_stock_threshold ? "text-destructive font-medium" : ""}>
                    {p.stock_quantity}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

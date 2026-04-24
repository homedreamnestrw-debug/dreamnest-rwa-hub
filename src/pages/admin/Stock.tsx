import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { FileBarChart2, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadCSV, serializeCSV, slugify } from "@/lib/csv";
import { ImportExportBar } from "@/components/admin/stock/ImportExportBar";
import type { ImportResult } from "@/components/admin/stock/ImportDialog";

import StockManagement from "./StockManagement";
import Products from "./Products";
import Categories from "./Categories";
import Locations from "./Locations";
import { useSearchParams } from "react-router-dom";

const TABS = ["inventory", "products", "categories", "locations"] as const;
type TabKey = (typeof TABS)[number];

export default function Stock() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabKey) || "inventory";
  const [tab, setTab] = useState<TabKey>(TABS.includes(initial) ? initial : "inventory");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setParams((p) => { p.set("tab", tab); return p; }, { replace: true });
  }, [tab, setParams]);

  const bump = () => setReloadKey((k) => k + 1);

  // ============ Per-tab import/export configs ============

  // PRODUCTS
  const productsBar = (
    <ImportExportBar
      label="Products"
      exportFilename="products.csv"
      templateFilename="products-template.csv"
      templateHeaders={["name","slug","sku","price","cost_price","stock_quantity","low_stock_threshold","category_name","is_active","featured","tax_enabled","description"]}
      exportRows={async () => {
        const [{ data: prods }, { data: cats }] = await Promise.all([
          supabase.from("products").select("*").order("name"),
          supabase.from("categories").select("id,name"),
        ]);
        const catMap = new Map((cats || []).map((c) => [c.id, c.name]));
        return (prods || []).map((p) => ({
          name: p.name, slug: p.slug, sku: p.sku || "",
          price: p.price, cost_price: p.cost_price,
          stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold,
          category_name: p.category_id ? catMap.get(p.category_id) || "" : "",
          is_active: p.is_active, featured: p.featured, tax_enabled: p.tax_enabled,
          description: p.description || "",
        }));
      }}
      templateSample={await_sample_products()}
      importNotes="Match by slug. Category resolved by name (created if missing). Slug auto-generated from name if blank."
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = [];
        let ok = 0, failed = 0;
        const { data: cats } = await supabase.from("categories").select("id,name");
        const catByName = new Map((cats || []).map((c) => [c.name.toLowerCase(), c.id]));

        for (const r of rows) {
          try {
            if (!r.name) throw new Error("name required");
            let category_id: string | null = null;
            if (r.category_name) {
              const key = r.category_name.toLowerCase();
              category_id = catByName.get(key) || null;
              if (!category_id) {
                const slug = slugify(r.category_name);
                const { data: newCat, error: cErr } = await supabase
                  .from("categories").insert({ name: r.category_name, slug }).select("id").single();
                if (cErr) throw cErr;
                category_id = newCat!.id;
                catByName.set(key, category_id);
              }
            }
            const slug = r.slug || slugify(r.name);
            const payload = {
              name: r.name, slug, sku: r.sku || null,
              price: Number(r.price || 0), cost_price: Number(r.cost_price || 0),
              stock_quantity: Number(r.stock_quantity || 0),
              low_stock_threshold: Number(r.low_stock_threshold || 5),
              category_id,
              is_active: parseBool(r.is_active, true),
              featured: parseBool(r.featured, false),
              tax_enabled: parseBool(r.tax_enabled, true),
              description: r.description || null,
            };
            const { error } = await supabase.from("products").upsert(payload, { onConflict: "slug" });
            if (error) throw error;
            ok++;
          } catch (e: any) { failed++; errors.push(`${r.name || "(unnamed)"}: ${e.message}`); }
        }
        return { ok, failed, errors };
      }}
      onImported={bump}
    />
  );

  // CATEGORIES
  const categoriesBar = (
    <ImportExportBar
      label="Categories"
      exportFilename="categories.csv"
      templateFilename="categories-template.csv"
      templateHeaders={["name","slug","description","image_url"]}
      templateSample={{ name: "Bedding", slug: "bedding", description: "Premium bedding sets", image_url: "" }}
      exportRows={async () => {
        const { data } = await supabase.from("categories").select("name,slug,description,image_url").order("name");
        return (data || []).map((c) => ({ ...c, description: c.description || "", image_url: c.image_url || "" }));
      }}
      importNotes="Match by slug. Slug auto-generated from name if blank."
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = []; let ok = 0, failed = 0;
        for (const r of rows) {
          try {
            if (!r.name) throw new Error("name required");
            const slug = r.slug || slugify(r.name);
            const { error } = await supabase.from("categories").upsert(
              { name: r.name, slug, description: r.description || null, image_url: r.image_url || null },
              { onConflict: "slug" }
            );
            if (error) throw error;
            ok++;
          } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        return { ok, failed, errors };
      }}
      onImported={bump}
    />
  );

  // LOCATIONS
  const locationsBar = (
    <ImportExportBar
      label="Locations"
      exportFilename="locations.csv"
      templateFilename="locations-template.csv"
      templateHeaders={["name","address","is_active"]}
      templateSample={{ name: "Main Warehouse", address: "Kigali, Rwanda", is_active: "true" }}
      exportRows={async () => {
        const { data } = await supabase.from("stock_locations").select("name,address,is_active").order("name");
        return (data || []).map((l) => ({ ...l, address: l.address || "" }));
      }}
      importNotes="Match by name. Existing locations with the same name will be updated."
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = []; let ok = 0, failed = 0;
        const { data: existing } = await supabase.from("stock_locations").select("id,name");
        const byName = new Map((existing || []).map((l) => [l.name.toLowerCase(), l.id]));
        for (const r of rows) {
          try {
            if (!r.name) throw new Error("name required");
            const id = byName.get(r.name.toLowerCase());
            const payload = { name: r.name, address: r.address || null, is_active: parseBool(r.is_active, true) };
            const { error } = id
              ? await supabase.from("stock_locations").update(payload).eq("id", id)
              : await supabase.from("stock_locations").insert(payload);
            if (error) throw error;
            ok++;
          } catch (e: any) { failed++; errors.push(`${r.name}: ${e.message}`); }
        }
        return { ok, failed, errors };
      }}
      onImported={bump}
    />
  );

  // INVENTORY
  const inventoryBar = (
    <ImportExportBar
      label="Inventory"
      exportFilename="inventory.csv"
      templateFilename="inventory-template.csv"
      templateHeaders={["product_sku","location_name","quantity"]}
      templateSample={{ product_sku: "SKU-001", location_name: "Main Warehouse", quantity: "10" }}
      exportRows={async () => {
        const [{ data: stock }, { data: prods }, { data: locs }] = await Promise.all([
          supabase.from("product_stock").select("product_id,location_id,quantity"),
          supabase.from("products").select("id,name,sku,low_stock_threshold"),
          supabase.from("stock_locations").select("id,name"),
        ]);
        const pMap = new Map((prods || []).map((p) => [p.id, p]));
        const lMap = new Map((locs || []).map((l) => [l.id, l.name]));
        return (stock || []).map((s) => {
          const p = pMap.get(s.product_id);
          return {
            product_name: p?.name || "",
            sku: p?.sku || "",
            location_name: lMap.get(s.location_id) || "",
            quantity: s.quantity,
            low_stock_threshold: p?.low_stock_threshold ?? 0,
          };
        });
      }}
      importNotes="Sets stock quantity at location. Resolves product by SKU and location by name. Logs a stock adjustment."
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = []; let ok = 0, failed = 0;
        const [{ data: prods }, { data: locs }, { data: stock }] = await Promise.all([
          supabase.from("products").select("id,sku"),
          supabase.from("stock_locations").select("id,name"),
          supabase.from("product_stock").select("product_id,location_id,quantity"),
        ]);
        const pBySku = new Map((prods || []).filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p.id]));
        const lByName = new Map((locs || []).map((l) => [l.name.toLowerCase(), l.id]));
        const stockKey = (pid: string, lid: string) => `${pid}__${lid}`;
        const stockMap = new Map((stock || []).map((s) => [stockKey(s.product_id, s.location_id), s.quantity]));

        for (const r of rows) {
          try {
            const pid = pBySku.get((r.product_sku || "").toLowerCase());
            const lid = lByName.get((r.location_name || "").toLowerCase());
            if (!pid) throw new Error(`unknown SKU "${r.product_sku}"`);
            if (!lid) throw new Error(`unknown location "${r.location_name}"`);
            const qty = Number(r.quantity);
            if (Number.isNaN(qty) || qty < 0) throw new Error("quantity must be ≥ 0");
            const prev = stockMap.get(stockKey(pid, lid)) ?? 0;
            const { error } = await supabase
              .from("product_stock")
              .upsert({ product_id: pid, location_id: lid, quantity: qty }, { onConflict: "product_id,location_id" });
            if (error) throw error;
            await supabase.from("stock_movements").insert({
              product_id: pid, location_id: lid, movement_type: "adjustment",
              quantity: qty - prev, previous_stock: prev, new_stock: qty,
              reason: "CSV import",
            });
            ok++;
          } catch (e: any) { failed++; errors.push(`${r.product_sku}/${r.location_name}: ${e.message}`); }
        }
        return { ok, failed, errors };
      }}
      onImported={bump}
    />
  );

  // ============ Reports ============
  const reportInventory = async () => {
    const [{ data: stock }, { data: prods }, { data: locs }] = await Promise.all([
      supabase.from("product_stock").select("product_id,location_id,quantity"),
      supabase.from("products").select("id,name,sku,price,cost_price,low_stock_threshold"),
      supabase.from("stock_locations").select("id,name"),
    ]);
    const pMap = new Map((prods || []).map((p) => [p.id, p]));
    const lMap = new Map((locs || []).map((l) => [l.id, l.name]));
    const rows = (stock || []).map((s) => {
      const p = pMap.get(s.product_id);
      return {
        product: p?.name || "", sku: p?.sku || "",
        location: lMap.get(s.location_id) || "",
        quantity: s.quantity,
        low_stock_threshold: p?.low_stock_threshold ?? 0,
        unit_cost: p?.cost_price ?? 0,
        unit_price: p?.price ?? 0,
        stock_value_at_cost: (p?.cost_price ?? 0) * s.quantity,
      };
    });
    downloadCSV(`inventory-snapshot-${todayStr()}.csv`, serializeCSV(rows));
    toast({ title: "Inventory report exported", description: `${rows.length} rows.` });
  };

  const reportLowStock = async () => {
    const { data } = await supabase.from("products").select("name,sku,stock_quantity,low_stock_threshold").order("stock_quantity");
    const rows = (data || []).filter((p) => p.stock_quantity <= p.low_stock_threshold)
      .map((p) => ({ ...p, sku: p.sku || "", deficit: p.low_stock_threshold - p.stock_quantity }));
    downloadCSV(`low-stock-${todayStr()}.csv`, serializeCSV(rows));
    toast({ title: "Low-stock report exported", description: `${rows.length} products need attention.` });
  };

  const reportMovements = async (days: number) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [{ data: movs }, { data: prods }, { data: locs }] = await Promise.all([
      supabase.from("stock_movements").select("*").gte("created_at", since).order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,sku"),
      supabase.from("stock_locations").select("id,name"),
    ]);
    const pMap = new Map((prods || []).map((p) => [p.id, p]));
    const lMap = new Map((locs || []).map((l) => [l.id, l.name]));
    const rows = (movs || []).map((m) => ({
      date: new Date(m.created_at).toISOString(),
      product: m.product_id ? pMap.get(m.product_id)?.name || "" : "",
      sku: m.product_id ? pMap.get(m.product_id)?.sku || "" : "",
      type: m.movement_type, quantity: m.quantity,
      previous_stock: m.previous_stock, new_stock: m.new_stock,
      location: m.location_id ? lMap.get(m.location_id) || "" : "",
      reason: m.reason || "",
    }));
    downloadCSV(`movements-${days}d-${todayStr()}.csv`, serializeCSV(rows));
    toast({ title: `Movements (last ${days} days) exported`, description: `${rows.length} rows.` });
  };

  const reportCategorySummary = async () => {
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("category_id,stock_quantity,cost_price,price"),
      supabase.from("categories").select("id,name"),
    ]);
    const map = new Map<string, { name: string; product_count: number; units: number; cost_value: number; retail_value: number }>();
    (cats || []).forEach((c) => map.set(c.id, { name: c.name, product_count: 0, units: 0, cost_value: 0, retail_value: 0 }));
    map.set("__none__", { name: "(uncategorized)", product_count: 0, units: 0, cost_value: 0, retail_value: 0 });
    (prods || []).forEach((p) => {
      const k = p.category_id || "__none__";
      const e = map.get(k) || map.get("__none__")!;
      e.product_count += 1; e.units += p.stock_quantity;
      e.cost_value += p.stock_quantity * p.cost_price;
      e.retail_value += p.stock_quantity * p.price;
    });
    const rows = Array.from(map.values()).filter((r) => r.product_count > 0);
    downloadCSV(`category-summary-${todayStr()}.csv`, serializeCSV(rows));
    toast({ title: "Category summary exported", description: `${rows.length} categories.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl font-semibold">Stock Hub</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <FileBarChart2 className="h-4 w-4 mr-2" /> Export Report <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Reports</DropdownMenuLabel>
            <DropdownMenuItem onClick={reportInventory}>Inventory snapshot</DropdownMenuItem>
            <DropdownMenuItem onClick={reportLowStock}>Low-stock report</DropdownMenuItem>
            <DropdownMenuItem onClick={reportCategorySummary}>Category summary</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => reportMovements(30)}>Movements (last 30 days)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => reportMovements(90)}>Movements (last 90 days)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          {isAdmin && <TabsTrigger value="locations">Locations</TabsTrigger>}
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {inventoryBar}
          <div key={`inv-${reloadKey}`}><StockManagement /></div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {productsBar}
          <div key={`prod-${reloadKey}`}><Products /></div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoriesBar}
          <div key={`cat-${reloadKey}`}><Categories /></div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="locations" className="space-y-4">
            {locationsBar}
            <div key={`loc-${reloadKey}`}><Locations /></div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function parseBool(v: string | undefined, def: boolean): boolean {
  if (v === undefined || v === "") return def;
  return ["true", "1", "yes", "y", "t"].includes(String(v).toLowerCase());
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function await_sample_products(): Record<string, string> {
  return {
    name: "Sample Pillow", slug: "sample-pillow", sku: "PIL-001",
    price: "15000", cost_price: "9000",
    stock_quantity: "20", low_stock_threshold: "5",
    category_name: "Bedding",
    is_active: "true", featured: "false", tax_enabled: "true",
    description: "Soft cotton pillow",
  };
}

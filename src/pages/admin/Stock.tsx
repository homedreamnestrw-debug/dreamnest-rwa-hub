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

  // PRODUCTS (with variants + Excel template w/ category dropdown)
  const PRODUCT_HEADERS = [
    "name","slug","sku","price","cost_price","stock_quantity","low_stock_threshold",
    "category_name","is_active","featured","tax_enabled","description",
    "variant_name","variant_sku","variant_price","variant_stock","variant_attributes",
  ];
  const productsBar = (
    <ImportExportBar
      label="Products"
      exportFilename="products.csv"
      templateFilename="products-template.xlsx"
      templateHeaders={PRODUCT_HEADERS}
      exportRows={async () => {
        const [{ data: prods }, { data: cats }, { data: vars }] = await Promise.all([
          supabase.rpc("get_admin_products_with_costs"),
          supabase.from("categories").select("id,name"),
          supabase.from("product_variants").select("product_id,variant_name,sku,price_override,stock_quantity,attributes,is_active").eq("is_active", true),
        ]);
        const catMap = new Map((cats || []).map((c) => [c.id, c.name]));
        const varsByProduct = new Map<string, any[]>();
        (vars || []).forEach((v) => {
          const list = varsByProduct.get(v.product_id) || [];
          list.push(v); varsByProduct.set(v.product_id, list);
        });
        const out: any[] = [];
        (prods || []).forEach((p) => {
          const base = {
            name: p.name, slug: p.slug, sku: p.sku || "",
            price: p.price, cost_price: p.cost_price,
            stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold,
            category_name: p.category_id ? catMap.get(p.category_id) || "" : "",
            is_active: p.is_active, featured: p.featured, tax_enabled: p.tax_enabled,
            description: p.description || "",
            variant_name: "", variant_sku: "", variant_price: "", variant_stock: "", variant_attributes: "",
          };
          const variants = varsByProduct.get(p.id) || [];
          if (variants.length === 0) { out.push(base); return; }
          out.push(base);
          variants.forEach((v) => {
            out.push({
              name: "", slug: p.slug, sku: "", price: "", cost_price: "",
              stock_quantity: "", low_stock_threshold: "",
              category_name: "", is_active: "", featured: "", tax_enabled: "", description: "",
              variant_name: v.variant_name,
              variant_sku: v.sku || "",
              variant_price: v.price_override ?? "",
              variant_stock: v.stock_quantity ?? 0,
              variant_attributes: v.attributes ? JSON.stringify(v.attributes) : "",
            });
          });
        });
        return out;
      }}
      templateSample={await_sample_products()}
      xlsxTemplate={async () => {
        const ExcelJS = (await import("exceljs")).default;
        const { data: cats } = await supabase.from("categories").select("name").order("name");
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Products");
        ws.addRow(PRODUCT_HEADERS);
        ws.getRow(1).font = { bold: true };
        // Sample product row + a sample variant row sharing the slug
        ws.addRow(["Sample Pillow","sample-pillow","PIL-001",15000,9000,20,5,(cats?.[0]?.name || "Bedding"),"true","false","true","Soft cotton pillow","","","","",""]);
        ws.addRow(["","sample-pillow","","","","","","","","","","","Queen / Beige","PIL-001-QB","","10",'{"Size":"Queen","Color":"Beige"}']);

        // Hidden sheet holding category list for the dropdown
        const listWs = wb.addWorksheet("_lists");
        listWs.state = "hidden";
        const catNames = (cats || []).map((c) => c.name);
        catNames.forEach((n, i) => { listWs.getCell(i + 1, 1).value = n; });
        const catRange = catNames.length > 0 ? `=_lists!$A$1:$A$${catNames.length}` : undefined;

        // Apply data validation to category_name column for first 1000 rows
        const catCol = PRODUCT_HEADERS.indexOf("category_name") + 1;
        const boolCols = ["is_active","featured","tax_enabled"].map((h) => PRODUCT_HEADERS.indexOf(h) + 1);
        for (let r = 2; r <= 1001; r++) {
          if (catRange) {
            ws.getCell(r, catCol).dataValidation = {
              type: "list", allowBlank: true, formulae: [catRange],
              showErrorMessage: true, errorStyle: "warning",
              errorTitle: "Unknown category", error: "Pick a category from the dropdown or it will be created on import.",
            } as any;
          }
          boolCols.forEach((c) => {
            ws.getCell(r, c).dataValidation = {
              type: "list", allowBlank: true, formulae: ['"true,false"'],
            } as any;
          });
        }
        ws.columns.forEach((col) => { col.width = 18; });

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        return { blob, filename: "products-template.xlsx" };
      }}
      importNotes={`One row per product. Add extra rows with the same slug (and variant_name filled) to attach variants. Category is matched by name (created if missing). variant_attributes must be JSON, e.g. {"Size":"Queen"}.`}
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = [];
        let ok = 0, failed = 0;
        const { data: cats } = await supabase.from("categories").select("id,name");
        const catByName = new Map((cats || []).map((c) => [c.name.toLowerCase(), c.id]));

        // Group rows by slug (or generated slug from name)
        const groups = new Map<string, Record<string, string>[]>();
        for (const r of rows) {
          const key = (r.slug || (r.name ? slugify(r.name) : "")).toLowerCase();
          if (!key) { failed++; errors.push("(row missing name and slug)"); continue; }
          const arr = groups.get(key) || []; arr.push(r); groups.set(key, arr);
        }

        for (const [slugKey, group] of groups) {
          try {
            // Product header = first row that has a name OR fallback to first row
            const header = group.find((r) => r.name) || group[0];
            const variantRows = group.filter((r) => r.variant_name);

            let category_id: string | null = null;
            if (header.category_name) {
              const k = header.category_name.toLowerCase();
              category_id = catByName.get(k) || null;
              if (!category_id) {
                const { data: newCat, error: cErr } = await supabase
                  .from("categories").insert({ name: header.category_name, slug: slugify(header.category_name) }).select("id").single();
                if (cErr) throw cErr;
                category_id = newCat!.id;
                catByName.set(k, category_id);
              }
            }
            const slug = header.slug || slugify(header.name);
            const payload: any = {
              name: header.name, slug, sku: header.sku || null,
              price: Number(header.price || 0), cost_price: Number(header.cost_price || 0),
              stock_quantity: Number(header.stock_quantity || 0),
              low_stock_threshold: Number(header.low_stock_threshold || 5),
              category_id,
              is_active: parseBool(header.is_active, true),
              featured: parseBool(header.featured, false),
              tax_enabled: parseBool(header.tax_enabled, true),
              description: header.description || null,
            };
            const { data: prod, error } = await supabase.from("products").upsert(payload, { onConflict: "slug" }).select("id").single();
            if (error) throw error;
            ok++;

            // Variants: upsert by (product_id, variant_name) — each variant is its own try/catch row
            for (const vr of variantRows) {
              try {
                let attributes: any = {};
                if (vr.variant_attributes) {
                  try { attributes = JSON.parse(vr.variant_attributes); }
                  catch { throw new Error(`invalid JSON in variant_attributes`); }
                }
                const { data: existing, error: selErr } = await supabase
                  .from("product_variants").select("id")
                  .eq("product_id", prod!.id).eq("variant_name", vr.variant_name).maybeSingle();
                if (selErr) throw selErr;
                const vPayload: any = {
                  product_id: prod!.id,
                  variant_name: vr.variant_name,
                  sku: vr.variant_sku ? vr.variant_sku : null,
                  price_override: vr.variant_price ? Number(vr.variant_price) : null,
                  stock_quantity: Number(vr.variant_stock || 0),
                  attributes,
                  is_active: true,
                };
                const { error: vErr } = existing
                  ? await supabase.from("product_variants").update(vPayload).eq("id", existing.id)
                  : await supabase.from("product_variants").insert(vPayload);
                if (vErr) throw vErr;
                ok++;
              } catch (ve: any) {
                failed++;
                const msg = ve?.message || ve?.details || JSON.stringify(ve);
                errors.push(`variant "${vr.variant_name}": ${msg}`);
                console.error("[import variant failed]", vr, ve);
              }
            }
          } catch (e: any) {
            failed++;
            const msg = e?.message || e?.details || JSON.stringify(e);
            errors.push(`${slugKey}: ${msg}`);
            console.error("[import product failed]", slugKey, e);
          }
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

  // INVENTORY (variant-aware)
  const inventoryBar = (
    <ImportExportBar
      label="Inventory"
      exportFilename="inventory.csv"
      templateFilename="inventory-template.csv"
      templateHeaders={["product_sku","variant_sku","location_name","quantity"]}
      templateSample={{ product_sku: "SKU-001", variant_sku: "", location_name: "Main Warehouse", quantity: "10" }}
      exportRows={async () => {
        const [{ data: pStock }, { data: vStock }, { data: prods }, { data: vars }, { data: locs }] = await Promise.all([
          supabase.from("product_stock").select("product_id,location_id,quantity"),
          supabase.from("variant_stock").select("variant_id,location_id,quantity"),
          supabase.from("products").select("id,name,sku,low_stock_threshold"),
          supabase.from("product_variants").select("id,product_id,variant_name,sku,is_active").eq("is_active", true),
          supabase.from("stock_locations").select("id,name"),
        ]);
        const pMap = new Map((prods || []).map((p) => [p.id, p]));
        const vMap = new Map((vars || []).map((v) => [v.id, v]));
        const lMap = new Map((locs || []).map((l) => [l.id, l.name]));
        const pHasVariants = new Set((vars || []).map((v) => v.product_id));
        const rows: any[] = [];
        // Variant rows
        (vStock || []).forEach((s) => {
          const v = vMap.get(s.variant_id); if (!v) return;
          const p = pMap.get(v.product_id);
          rows.push({
            product_name: p?.name || "",
            product_sku: p?.sku || "",
            variant_name: v.variant_name,
            variant_sku: v.sku || "",
            location_name: lMap.get(s.location_id) || "",
            quantity: s.quantity,
            low_stock_threshold: p?.low_stock_threshold ?? 0,
          });
        });
        // Product rows (skip products that have variants — they are reported per variant)
        (pStock || []).forEach((s) => {
          if (pHasVariants.has(s.product_id)) return;
          const p = pMap.get(s.product_id);
          rows.push({
            product_name: p?.name || "",
            product_sku: p?.sku || "",
            variant_name: "",
            variant_sku: "",
            location_name: lMap.get(s.location_id) || "",
            quantity: s.quantity,
            low_stock_threshold: p?.low_stock_threshold ?? 0,
          });
        });
        return rows;
      }}
      importNotes="Sets stock at a location. If variant_sku is provided, updates that variant; otherwise updates the product. Logs a movement."
      onImport={async (rows): Promise<ImportResult> => {
        const errors: string[] = []; let ok = 0, failed = 0;
        const [{ data: prods }, { data: vars }, { data: locs }, { data: pStock }, { data: vStock }] = await Promise.all([
          supabase.from("products").select("id,sku"),
          supabase.from("product_variants").select("id,sku,product_id").eq("is_active", true),
          supabase.from("stock_locations").select("id,name"),
          supabase.from("product_stock").select("product_id,location_id,quantity"),
          supabase.from("variant_stock").select("variant_id,location_id,quantity"),
        ]);
        const pBySku = new Map((prods || []).filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p.id]));
        const vBySku = new Map((vars || []).filter((v) => v.sku).map((v) => [v.sku!.toLowerCase(), v]));
        const lByName = new Map((locs || []).map((l) => [l.name.toLowerCase(), l.id]));
        const pKey = (pid: string, lid: string) => `${pid}__${lid}`;
        const vKey = (vid: string, lid: string) => `${vid}__${lid}`;
        const pStockMap = new Map((pStock || []).map((s) => [pKey(s.product_id, s.location_id), s.quantity]));
        const vStockMap = new Map((vStock || []).map((s) => [vKey(s.variant_id, s.location_id), s.quantity]));

        for (const r of rows) {
          try {
            const lid = lByName.get((r.location_name || "").toLowerCase());
            if (!lid) throw new Error(`unknown location "${r.location_name}"`);
            const qty = Number(r.quantity);
            if (Number.isNaN(qty) || qty < 0) throw new Error("quantity must be ≥ 0");

            if (r.variant_sku) {
              const v = vBySku.get(String(r.variant_sku).toLowerCase());
              if (!v) throw new Error(`unknown variant SKU "${r.variant_sku}"`);
              const { error } = await supabase.rpc("adjust_variant_stock", {
                p_variant_id: v.id, p_location_id: lid, p_new_quantity: qty,
                p_movement_type: "adjustment", p_reason: "CSV import",
              });
              if (error) throw error;
            } else {
              const pid = pBySku.get(String(r.product_sku || "").toLowerCase());
              if (!pid) throw new Error(`unknown product SKU "${r.product_sku}"`);
              const prev = pStockMap.get(pKey(pid, lid)) ?? 0;
              const { error } = await supabase
                .from("product_stock")
                .upsert({ product_id: pid, location_id: lid, quantity: qty }, { onConflict: "product_id,location_id" });
              if (error) throw error;
              await supabase.from("stock_movements").insert({
                product_id: pid, location_id: lid, movement_type: "adjustment",
                quantity: qty - prev, previous_stock: prev, new_stock: qty,
                reason: "CSV import",
              });
            }
            ok++;
          } catch (e: any) { failed++; errors.push(`${r.variant_sku || r.product_sku}/${r.location_name}: ${e.message}`); }
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
      supabase.rpc("get_admin_products_with_costs"),
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
      supabase.rpc("get_admin_products_with_costs"),
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

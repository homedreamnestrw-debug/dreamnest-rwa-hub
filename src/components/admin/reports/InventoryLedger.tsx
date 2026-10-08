import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfDay, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { formatInt } from "@/lib/reportAggregations";
import { buildLedger, LedgerRow, StockItem, Movement } from "@/lib/inventoryLedger";

const fmt = (n: number) => new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(Math.round(n || 0));

async function fetchAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await build(i, i + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function InventoryLedger() {
  const [fromStr, setFromStr] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toStr, setToStr] = useState(format(new Date(), "yyyy-MM-dd"));
  const [locationId, setLocationId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");
  const [hideZero, setHideZero] = useState(true);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("stock_locations").select("id, name").order("name").then(({ data }) => setLocations(data || []));
    supabase.from("categories").select("id, name").order("name").then(({ data }) => setCategories(data || []));
  }, []);

  const from = useMemo(() => startOfDay(new Date(fromStr)), [fromStr]);
  const to = useMemo(() => endOfDay(new Date(toStr)), [toStr]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [ps, vs, mv] = await Promise.all([
          fetchAll<any>((a, b) => supabase.from("product_stock")
            .select("product_id, location_id, quantity, products!inner(name, sku, cost_price, price, category_id, categories(name))").range(a, b)),
          fetchAll<any>((a, b) => supabase.from("variant_stock")
            .select("variant_id, location_id, quantity, product_variants!inner(product_id, variant_name, sku, cost_price, price_override, products!inner(name, sku, cost_price, price, category_id, categories(name)))").range(a, b)),
          fetchAll<any>((a, b) => supabase.from("stock_movements")
            .select("product_id, variant_id, location_id, movement_type, quantity, previous_stock, new_stock, created_at")
            .gte("created_at", from.toISOString()).order("created_at").range(a, b)),
        ]);
        const variantProducts = new Set(vs.map((v: any) => v.product_variants.product_id));
        const list: StockItem[] = [];
        ps.forEach((r: any) => {
          if (variantProducts.has(r.product_id)) return;
          list.push({
            key: r.product_id, product_id: r.product_id, variant_id: null, location_id: r.location_id,
            name: r.products.name, sku: r.products.sku, category_id: r.products.category_id,
            category: r.products.categories?.name ?? "Uncategorized",
            cost: Number(r.products.cost_price || 0), price: Number(r.products.price || 0), quantity: r.quantity || 0,
          });
        });
        vs.forEach((r: any) => {
          const v = r.product_variants; const p = v.products;
          list.push({
            key: r.variant_id, product_id: v.product_id, variant_id: r.variant_id, location_id: r.location_id,
            name: `${p.name} — ${v.variant_name}`, sku: v.sku ?? p.sku, category_id: p.category_id,
            category: p.categories?.name ?? "Uncategorized",
            cost: Number(v.cost_price ?? p.cost_price ?? 0), price: Number(v.price_override ?? p.price ?? 0), quantity: r.quantity || 0,
          });
        });
        if (active) { setItems(list); setMovements(mv); }
      } catch (e) { console.error(e); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [from]);

  const rows: LedgerRow[] = useMemo(() => {
    let r = buildLedger(items, movements, from, to, locationId === "all" ? null : locationId);
    if (categoryId !== "all") r = r.filter((x) => x.category_id === categoryId);
    if (search) { const s = search.toLowerCase(); r = r.filter((x) => x.name.toLowerCase().includes(s) || (x.sku || "").toLowerCase().includes(s)); }
    if (hideZero) r = r.filter((x) => x.opening || x.inward || x.outward || x.closing);
    return r.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, movements, from, to, locationId, categoryId, search, hideZero]);

  const totals = useMemo(() => rows.reduce((t, r) => ({
    opening: t.opening + r.opening, openingVal: t.openingVal + r.opening * r.cost,
    inward: t.inward + r.inward, inwardVal: t.inwardVal + r.inward * r.cost,
    outward: t.outward + r.outward, outwardVal: t.outwardVal + r.outward * r.price,
    closing: t.closing + r.closing, closingVal: t.closingVal + r.closing * r.cost, closingSell: t.closingSell + r.closing * r.price,
  }), { opening: 0, openingVal: 0, inward: 0, inwardVal: 0, outward: 0, outwardVal: 0, closing: 0, closingVal: 0, closingSell: 0 }), [rows]);

  const locName = locationId === "all" ? "All locations" : locations.find((l) => l.id === locationId)?.name ?? "";
  const periodLabel = `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
  const rate = (v: number, q: number) => (q ? v / q : 0);
  const fileBase = `inventory-ledger_${fromStr}_${toStr}`;

  const exportXlsx = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Inventory Ledger");
    ws.addRow(["DreamNest — Inventory Movement & Valuation Ledger"]).font = { bold: true, size: 14 };
    ws.addRow([`Period: ${periodLabel}`, "", `Location: ${locName}`]);
    ws.addRow([]);
    const g = ws.addRow(["", "", "", "Opening (cost)", "", "", "Inward (cost)", "", "", "Outward (selling)", "", "", "Closing", "", "", ""]);
    ws.mergeCells(4, 4, 4, 6); ws.mergeCells(4, 7, 4, 9); ws.mergeCells(4, 10, 4, 12); ws.mergeCells(4, 13, 4, 16);
    const h = ws.addRow(["Product", "SKU", "Category", "Qty", "Avg rate", "Value", "Qty", "Avg rate", "Value", "Qty", "Selling rate", "Selling value", "Qty", "Avg rate", "Cost value", "Selling value"]);
    [g, h].forEach((row) => row.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5C4033" } };
      c.alignment = { horizontal: "center" };
    }));
    const start = 6;
    rows.forEach((r) => ws.addRow([r.name, r.sku ?? "", r.category,
      r.opening, r.cost, r.opening * r.cost, r.inward, r.cost, r.inward * r.cost,
      r.outward, r.price, r.outward * r.price, r.closing, r.cost, r.closing * r.cost, r.closing * r.price]));
    const end = start + rows.length - 1;
    const tr = ws.addRow(["TOTAL", "", ""]);
    if (rows.length) {
      ["D", "G", "J", "M"].forEach((col, i) => {
        const valCol = ["F", "I", "L", "O"][i]; const rateCol = ["E", "H", "K", "N"][i];
        ws.getCell(`${col}${tr.number}`).value = { formula: `SUM(${col}${start}:${col}${end})` } as any;
        ws.getCell(`${valCol}${tr.number}`).value = { formula: `SUM(${valCol}${start}:${valCol}${end})` } as any;
        ws.getCell(`${rateCol}${tr.number}`).value = { formula: `IF(${col}${tr.number}=0,0,${valCol}${tr.number}/${col}${tr.number})` } as any;
      });
      ws.getCell(`P${tr.number}`).value = { formula: `SUM(P${start}:P${end})` } as any;
    }
    tr.font = { bold: true };
    tr.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E9D2" } }; });
    ws.columns.forEach((c, i) => { c.width = i === 0 ? 38 : i < 3 ? 16 : 13; if (i >= 3) c.numFmt = "#,##0"; });
    ws.views = [{ state: "frozen", ySplit: 5, xSplit: 1 }];
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a"); a.href = url; a.download = `${fileBase}.xlsx`; a.click(); URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(15);
    pdf.text("DreamNest — Inventory Movement & Valuation Ledger", 30, 36);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
    pdf.text(`Period: ${periodLabel}    Location: ${locName}    Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}    Amounts in RWF`, 30, 52);
    const cells = (q: number, v: number) => [fmt(q), fmt(rate(v, q)), fmt(v)];
    autoTable(pdf, {
      startY: 64,
      head: [
        [{ content: "Product", rowSpan: 2 }, { content: "SKU", rowSpan: 2 },
          { content: "Opening", colSpan: 3 }, { content: "Inward", colSpan: 3 },
          { content: "Outward (selling)", colSpan: 3 }, { content: "Closing", colSpan: 4 }],
        ["Qty", "Rate", "Value", "Qty", "Rate", "Value", "Qty", "Sell rate", "Sell value", "Qty", "Rate", "Cost value", "Sell value"],
      ],
      body: rows.map((r) => [r.name, r.sku ?? "",
        ...cells(r.opening, r.opening * r.cost), ...cells(r.inward, r.inward * r.cost),
        ...cells(r.outward, r.outward * r.price), ...cells(r.closing, r.closing * r.cost), fmt(r.closing * r.price)]),
      foot: [["TOTAL", "", ...cells(totals.opening, totals.openingVal), ...cells(totals.inward, totals.inwardVal),
        ...cells(totals.outward, totals.outwardVal), ...cells(totals.closing, totals.closingVal), fmt(totals.closingSell)]],
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [92, 64, 51], halign: "center" },
      footStyles: { fillColor: [243, 233, 210], textColor: [40, 30, 20], fontStyle: "bold" },
      columnStyles: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i + 2, { halign: "right" }])),
      margin: { left: 30, right: 30 },
      didDrawPage: () => {
        pdf.setFontSize(8);
        pdf.text(`Page ${pdf.getNumberOfPages()}`, pdf.internal.pageSize.getWidth() - 60, pdf.internal.pageSize.getHeight() - 15);
      },
    });
    pdf.save(`${fileBase}.pdf`);
  };

  const Group = ({ q, v, sell }: { q: number; v: number; sell?: number }) => (<>
    <td className="px-2 py-1.5 text-right tabular-nums">{formatInt(q)}</td>
    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmt(rate(v, q))}</td>
    <td className={`px-2 py-1.5 text-right tabular-nums ${sell === undefined ? "border-r" : ""}`}>{fmt(v)}</td>
    {sell !== undefined && <td className="px-2 py-1.5 text-right tabular-nums border-r">{fmt(sell)}</td>}
  </>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif">Inventory Ledger & Movement</CardTitle>
        <p className="text-xs text-muted-foreground">Opening, inward, outward and closing stock with value and average cost rate (RWF) for {periodLabel} · {locName}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={fromStr} max={toStr} onChange={(e) => e.target.value && setFromStr(e.target.value)} className="w-[150px]" /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={toStr} min={fromStr} onChange={(e) => e.target.value && setToStr(e.target.value)} className="w-[150px]" /></div>
          <div className="space-y-1"><Label className="text-xs">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All locations</SelectItem>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Search</Label><Input placeholder="Product or SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[180px]" /></div>
          <div className="flex items-center gap-2 h-10"><Switch id="hidezero" checked={hideZero} onCheckedChange={setHideZero} /><Label htmlFor="hidezero" className="text-sm">Hide zero rows</Label></div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={exportXlsx} disabled={!rows.length}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</Button>
            <Button size="sm" variant="outline" onClick={exportPdf} disabled={!rows.length}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[600px] border rounded-md">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th rowSpan={2} className="px-2 py-1.5 text-left border-r">Product</th>
                {["Opening", "Inward", "Outward (selling)", "Closing"].map((g) => <th key={g} colSpan={g === "Closing" ? 4 : 3} className="px-2 py-1.5 text-center border-r border-b">{g}</th>)}
              </tr>
              <tr>{[["Qty", "Avg rate", "Value"], ["Qty", "Avg rate", "Value"], ["Qty", "Sell rate", "Sell value"], ["Qty", "Avg rate", "Cost value", "Sell value"]].flatMap((hs, i) => hs.map((h, j) => <th key={`${i}${h}`} className={`px-2 py-1 text-right font-medium ${j === hs.length - 1 ? "border-r" : ""}`}>{h}</th>))}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={14} className="py-10 text-center text-muted-foreground">No stock activity for this selection</td></tr>
              ) : rows.map((r) => (
                <tr key={r.key} className="border-t hover:bg-muted/40">
                  <td className="px-2 py-1.5 border-r max-w-[280px] truncate" title={r.name}>{r.name}<span className="block text-[10px] text-muted-foreground">{r.sku || "—"} · {r.category}</span></td>
                  <Group q={r.opening} v={r.opening * r.cost} />
                  <Group q={r.inward} v={r.inward * r.cost} />
                  <Group q={r.outward} v={r.outward * r.price} />
                  <Group q={r.closing} v={r.closing * r.cost} sell={r.closing * r.price} />
                </tr>
              ))}
            </tbody>
            {!loading && rows.length > 0 && (
              <tfoot className="sticky bottom-0 bg-secondary font-semibold">
                <tr className="border-t-2">
                  <td className="px-2 py-2 border-r">TOTAL ({rows.length} items)</td>
                  <Group q={totals.opening} v={totals.openingVal} />
                  <Group q={totals.inward} v={totals.inwardVal} />
                  <Group q={totals.outward} v={totals.outwardVal} />
                  <Group q={totals.closing} v={totals.closingVal} sell={totals.closingSell} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">Opening, inward and closing cost use each item's cost price; outward and closing selling value use the selling price (variant price, falling back to product price). Opening/closing are reconstructed from current stock and recorded movements.</p>
      </CardContent>
    </Card>
  );
}

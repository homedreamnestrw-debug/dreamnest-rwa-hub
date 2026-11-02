import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { loadStaffNames } from "@/lib/staffNames";

type Entry = {
  id: string;
  at: string;
  kind: "audit" | "movement";
  title: string;
  detail?: string;
  by?: string | null;
};

const LABELS: Record<string, string> = {
  name: "Name", price: "Price", cost_price: "Cost price", sku: "SKU", category_id: "Category",
  is_active: "Active", is_online: "Online Shop", featured: "Featured", low_stock_threshold: "Low stock alert",
  tax_enabled: "Tax", description: "Description", country_of_origin: "Country of origin", supplier_invoice: "Supplier invoice",
};

const fmtVal = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "On" : "Off";
  const s = String(v);
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
};

export function ProductHistoryDrawer({ product, onClose }: { product: { id: string; name: string } & Record<string, any> | null; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!product) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const [names, audit, moves] = await Promise.all([
        loadStaffNames(),
        (supabase.from("product_audit_log" as any) as any).select("*").eq("product_id", product.id).order("created_at", { ascending: false }).limit(300),
        supabase.from("stock_movements").select("id, movement_type, quantity, previous_stock, new_stock, reason, performed_by, created_at, product_variants(variant_name), stock_locations(name)").eq("product_id", product.id).order("created_at", { ascending: false }).limit(300),
      ]);
      const list: Entry[] = [];
      (audit.data || []).forEach((a: any) => {
        const ch = a.changes || {};
        let detail = "";
        if (a.action === "updated" || a.action === "status_changed") {
          detail = Object.entries(ch).map(([k, v]: any) => `${LABELS[k] || k}: ${fmtVal(v?.from)} → ${fmtVal(v?.to)}`).join("\n");
        } else {
          detail = Object.entries(ch).filter(([, v]) => v !== null && v !== "").map(([k, v]) => `${LABELS[k] || k}: ${fmtVal(v)}`).join("\n");
        }
        const title = { created: "Created", updated: "Edited", status_changed: "Status changed", deleted: "Deleted", imported: "Imported" }[a.action as string] || a.action;
        list.push({ id: "a" + a.id, at: a.created_at, kind: "audit", title, detail, by: a.performed_by ? names[a.performed_by] || "Staff" : "System" });
      });
      (moves.data || []).forEach((m: any) => {
        const sign = m.new_stock - m.previous_stock;
        const where = [m.product_variants?.variant_name, m.stock_locations?.name].filter(Boolean).join(" · ");
        list.push({
          id: "m" + m.id, at: m.created_at, kind: "movement",
          title: `Stock ${m.movement_type} (${sign >= 0 ? "+" : ""}${sign})`,
          detail: [where, `${m.previous_stock} → ${m.new_stock}`, m.reason].filter(Boolean).join("\n"),
          by: m.performed_by ? names[m.performed_by] || "Staff" : "System",
        });
      });
      list.sort((a, b) => b.at.localeCompare(a.at));
      if (!cancel) { setEntries(list); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [product?.id]);

  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif">{product?.name} — History</SheetTitle>
          <SheetDescription>
            Created {product?.created_at ? new Date(product.created_at).toLocaleString() : "—"}
            {product?.country_of_origin ? ` · Origin: ${product.country_of_origin}` : ""}
            {product?.supplier_invoice ? ` · Supplier inv: ${product.supplier_invoice}` : ""}
          </SheetDescription>
        </SheetHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No history recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-3 border-l pl-4">
            {entries.map((e) => (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${e.kind === "audit" ? "bg-primary" : "bg-accent"}`} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{e.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{e.kind === "audit" ? "Record" : "Movement"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()} · {e.by}</p>
                {e.detail && <p className="text-xs whitespace-pre-line mt-1">{e.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </SheetContent>
    </Sheet>
  );
}

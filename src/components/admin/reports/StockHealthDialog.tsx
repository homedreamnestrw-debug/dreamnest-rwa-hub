import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink } from "lucide-react";
import { formatRWF, formatInt } from "@/lib/reportAggregations";
import { serializeCSV, downloadCSV } from "@/lib/csv";

export type HealthStatus = "Healthy" | "Low Stock" | "Out of Stock" | "Dead Stock";

export interface HealthItem {
  id: string; name: string; category: string; stock: number; threshold: number;
  cost: number; price: number; sold: number; status: HealthStatus;
}

export function classifyHealth(stock: number, threshold: number, sold: number): HealthStatus {
  if (stock <= 0) return "Out of Stock";
  if (threshold > 0 && stock <= threshold) return "Low Stock";
  if (sold <= 0) return "Dead Stock";
  return "Healthy";
}

interface Props {
  status: HealthStatus | null;
  items: HealthItem[];
  onClose: () => void;
}

export function StockHealthDialog({ status, items, onClose }: Props) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items
      .filter((i) => i.status === status)
      .filter((i) => !s || i.name.toLowerCase().includes(s) || i.category.toLowerCase().includes(s))
      .sort((a, b) => b.stock * b.cost - a.stock * a.cost);
  }, [items, status, q]);
  const units = rows.reduce((s, r) => s + r.stock, 0);
  const costVal = rows.reduce((s, r) => s + r.stock * r.cost, 0);
  const sellVal = rows.reduce((s, r) => s + r.stock * r.price, 0);

  const exportCsv = () => {
    downloadCSV(`stock-${(status ?? "").toLowerCase().replace(/\s+/g, "-")}.csv`, serializeCSV(rows.map((r) => ({
      product: r.name, category: r.category, stock: r.stock, low_threshold: r.threshold,
      unit_cost: r.cost, cost_value: r.stock * r.cost, unit_price: r.price, selling_value: r.stock * r.price, units_sold: r.sold,
    }))));
  };

  return (
    <Dialog open={!!status} onOpenChange={(o) => { if (!o) { setQ(""); onClose(); } }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Badge variant="secondary">{status}</Badge> products</DialogTitle>
          <DialogDescription>
            {formatInt(rows.length)} products · {formatInt(units)} units · {formatRWF(costVal)} at cost · {formatRWF(sellVal)} at selling price
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search product or category…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button variant="outline" size="sm" asChild><Link to="/admin/stock"><ExternalLink className="h-4 w-4 mr-1" />Stock Management</Link></Button>
        </div>
        <div className="overflow-auto flex-1 border rounded-md">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-muted sticky top-0">
              <tr className="text-left">
                <th className="p-2">Product</th><th className="p-2">Category</th>
                <th className="p-2 text-right">Stock / Min</th><th className="p-2 text-right">Unit cost</th>
                <th className="p-2 text-right">Cost value</th><th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Selling value</th><th className="p-2 text-right">Sold (period)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-medium">{r.name}</td>
                  <td className="p-2 text-muted-foreground">{r.category}</td>
                  <td className="p-2 text-right">{formatInt(r.stock)} / {formatInt(r.threshold)}</td>
                  <td className="p-2 text-right">{formatRWF(r.cost)}</td>
                  <td className="p-2 text-right">{formatRWF(r.stock * r.cost)}</td>
                  <td className="p-2 text-right">{formatRWF(r.price)}</td>
                  <td className="p-2 text-right">{formatRWF(r.stock * r.price)}</td>
                  <td className="p-2 text-right">{formatInt(r.sold)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No products</td></tr>}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

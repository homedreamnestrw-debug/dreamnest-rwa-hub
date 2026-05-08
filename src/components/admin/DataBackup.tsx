import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Loader2, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type DatasetKey = "invoices" | "orders" | "vouchers" | "messages" | "purchase_orders";

const DATASETS: { key: DatasetKey; label: string; description: string }[] = [
  { key: "invoices", label: "Invoices", description: "Invoices + line items + audit log" },
  { key: "orders", label: "Orders", description: "Orders + order items" },
  { key: "vouchers", label: "Gift Vouchers", description: "Vouchers + redemptions" },
  { key: "messages", label: "Contact Messages", description: "Website contact submissions" },
  { key: "purchase_orders", label: "Purchase Orders", description: "POs + line items" },
];

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const escape = (v: any) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchAll(table: string, columns = "*") {
  const { data, error } = await supabase.from(table as any).select(columns);
  if (error) throw error;
  return (data || []) as Record<string, any>[];
}

export function DataBackup() {
  const [selected, setSelected] = useState<Record<DatasetKey, boolean>>({
    invoices: true, orders: true, vouchers: true, messages: true, purchase_orders: true,
  });
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [busy, setBusy] = useState(false);

  const toggle = (k: DatasetKey) => setSelected((s) => ({ ...s, [k]: !s[k] }));

  const handleExport = async () => {
    setBusy(true);
    try {
      const bundle: Record<string, any[]> = {};

      if (selected.invoices) {
        bundle.invoices = await fetchAll("invoices");
        bundle.invoice_items = await fetchAll("invoice_items");
        bundle.invoice_audit_log = await fetchAll("invoice_audit_log");
      }
      if (selected.orders) {
        bundle.orders = await fetchAll("orders");
        bundle.order_items = await fetchAll("order_items");
      }
      if (selected.vouchers) {
        bundle.gift_vouchers = await fetchAll("gift_vouchers");
        bundle.voucher_redemptions = await fetchAll("voucher_redemptions");
      }
      if (selected.messages) {
        bundle.contact_submissions = await fetchAll("contact_submissions");
      }
      if (selected.purchase_orders) {
        bundle.purchase_orders = await fetchAll("purchase_orders");
        bundle.purchase_order_items = await fetchAll("purchase_order_items");
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      if (format === "json") {
        download(`dreamnest-backup-${stamp}.json`, JSON.stringify(bundle, null, 2), "application/json");
      } else {
        // One CSV per dataset, concatenated with section headers in a single file
        const parts: string[] = [];
        for (const [name, rows] of Object.entries(bundle)) {
          parts.push(`### ${name} (${rows.length} rows)`);
          parts.push(toCSV(rows));
          parts.push("");
        }
        download(`dreamnest-backup-${stamp}.csv`, parts.join("\n"), "text/csv");
      }

      const total = Object.values(bundle).reduce((n, r) => n + r.length, 0);
      toast({ title: "Backup downloaded", description: `${total} rows across ${Object.keys(bundle).length} tables.` });
    } catch (e: any) {
      toast({ title: "Backup failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Data Backup
        </CardTitle>
        <CardDescription>
          Download a backup of selected tables before wiping data. Choose CSV (spreadsheet-friendly) or JSON (full fidelity).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATASETS.map((d) => (
            <label key={d.key} className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selected[d.key]} onCheckedChange={() => toggle(d.key)} />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{d.label}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Format</Label>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "json")} className="flex gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="csv" id="fmt-csv" />
              <Label htmlFor="fmt-csv" className="font-normal cursor-pointer">CSV</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="json" id="fmt-json" />
              <Label htmlFor="fmt-json" className="font-normal cursor-pointer">JSON</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleExport} disabled={busy || !Object.values(selected).some(Boolean)}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Download backup
        </Button>
      </CardContent>
    </Card>
  );
}

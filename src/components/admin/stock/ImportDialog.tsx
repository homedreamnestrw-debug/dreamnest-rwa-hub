import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { parseCSV, downloadCSV, serializeCSV } from "@/lib/csv";

export type ImportResult = { ok: number; failed: number; errors: string[] };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  templateHeaders: string[];
  sampleRow: Record<string, string>;
  templateFilename: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
  onDone?: () => void;
  notes?: string;
  /** Optional XLSX template generator. When provided, replaces the CSV template download. */
  xlsxTemplate?: () => Promise<{ blob: Blob; filename: string }>;
}

export function ImportDialog({
  open, onOpenChange, title, templateHeaders, sampleRow, templateFilename, onImport, onDone, notes, xlsxTemplate,
}: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [busy, setBusy] = useState(false);

  const handleTemplate = async () => {
    if (xlsxTemplate) {
      const { blob, filename } = await xlsxTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    const csv = serializeCSV([sampleRow], templateHeaders);
    downloadCSV(templateFilename, csv);
  };

  const handleFile = async (file: File) => {
    const isXlsx = /\.xlsx$/i.test(file.name);
    let parsed: Record<string, string>[] = [];
    if (isXlsx) {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) { toast({ title: "Empty file", variant: "destructive" }); return; }
      const headers: string[] = [];
      ws.getRow(1).eachCell((c, i) => { headers[i - 1] = String(c.value ?? "").trim(); });
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const obj: Record<string, string> = {};
        let hasAny = false;
        headers.forEach((h, i) => {
          const v = row.getCell(i + 1).value;
          const s = v === null || v === undefined ? "" : typeof v === "object" && "text" in (v as any) ? String((v as any).text) : String(v);
          obj[h] = s.trim();
          if (obj[h]) hasAny = true;
        });
        if (hasAny) parsed.push(obj);
      }
    } else {
      parsed = parseCSV(await file.text());
    }
    if (parsed.length === 0) {
      toast({ title: "Empty file", variant: "destructive" });
      return;
    }
    setRows(parsed);
  };

  const handleConfirm = async () => {
    setBusy(true);
    const res = await onImport(rows);
    setBusy(false);
    toast({
      title: `Imported ${res.ok} rows`,
      description: res.failed > 0 ? `${res.failed} failed. ${res.errors.slice(0, 3).join("; ")}` : "All rows imported successfully.",
      variant: res.failed > 0 ? "destructive" : "default",
    });
    setRows([]);
    onOpenChange(false);
    onDone?.();
  };

  const reset = (v: boolean) => {
    if (!v) setRows([]);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import {title}</DialogTitle>
          <DialogDescription>
            Download the template, fill it in, then upload. Existing records (matched by unique key) will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleTemplate}>
              <Download className="h-4 w-4 mr-2" /> Download {xlsxTemplate ? "Excel template" : "template"}
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept={xlsxTemplate ? ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : ".csv,text/csv"}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
              />
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border h-10 px-4 cursor-pointer hover:bg-accent">
                <Upload className="h-4 w-4 mr-2" /> Choose {xlsxTemplate ? "file" : "CSV"}
              </span>
            </label>
          </div>

          {notes && (
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <FileText className="h-3 w-3 mt-0.5" /> {notes}
            </p>
          )}

          {rows.length > 0 && (
            <div className="rounded-md border max-h-72 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>{templateHeaders.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      {templateHeaders.map((h) => <TableCell key={h} className="text-xs">{r[h] ?? ""}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first 50 of {rows.length} rows
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => reset(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={rows.length === 0 || busy}>
            {busy ? "Importing..." : `Import ${rows.length} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

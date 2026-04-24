import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { downloadCSV, serializeCSV } from "@/lib/csv";
import { ImportDialog, type ImportResult } from "./ImportDialog";

interface Props {
  label: string;
  exportFilename: string;
  exportRows: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[];
  exportHeaders?: string[];
  templateHeaders: string[];
  templateSample: Record<string, string>;
  templateFilename: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
  onImported?: () => void;
  importNotes?: string;
  canImport?: boolean;
}

export function ImportExportBar(props: Props) {
  const [open, setOpen] = useState(false);

  const handleExport = async () => {
    const rows = await props.exportRows();
    const csv = serializeCSV(rows as any, props.exportHeaders);
    downloadCSV(props.exportFilename, csv);
  };

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="h-4 w-4 mr-2" /> Export CSV
      </Button>
      {props.canImport !== false && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Import CSV
        </Button>
      )}
      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        title={props.label}
        templateHeaders={props.templateHeaders}
        sampleRow={props.templateSample}
        templateFilename={props.templateFilename}
        onImport={props.onImport}
        onDone={props.onImported}
        notes={props.importNotes}
      />
    </div>
  );
}

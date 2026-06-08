import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRESET_LABELS, RangePreset, ReportRangeState, Granularity } from "./useDateRange";

interface Props {
  state: ReportRangeState;
  onChange: (s: ReportRangeState) => void;
  fromTo: { from: Date; to: Date };
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onPrint?: () => void;
  rightSlot?: React.ReactNode;
}

const PRESETS: RangePreset[] = ["today","yesterday","last7","last30","thisMonth","lastMonth","thisQuarter","ytd","lastYear","custom"];

export function ReportToolbar({ state, onChange, fromTo, onExportCsv, onExportPdf, onPrint, rightSlot }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3 border rounded-md bg-card">
      <div className="space-y-1">
        <Label className="text-xs">Period</Label>
        <Select value={state.preset} onValueChange={(v) => onChange({ ...state, preset: v as RangePreset })}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => <SelectItem key={p} value={p}>{PRESET_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {state.preset === "custom" && (
        <div className="space-y-1">
          <Label className="text-xs">Custom range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[260px] justify-start font-normal">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {state.custom ? `${format(state.custom.from, "MMM d")} – ${format(state.custom.to, "MMM d, yyyy")}` : "Pick dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="range"
                selected={state.custom ? { from: state.custom.from, to: state.custom.to } : undefined}
                onSelect={(r: any) => r?.from && r?.to && onChange({ ...state, custom: { from: r.from, to: r.to } })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Granularity</Label>
        <Select value={state.granularity} onValueChange={(v) => onChange({ ...state, granularity: v as Granularity })}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 h-10">
        <Switch checked={state.compare} onCheckedChange={(c) => onChange({ ...state, compare: c })} id="compare" />
        <Label htmlFor="compare" className="text-sm">Compare to previous</Label>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {rightSlot}
        <div className="text-xs text-muted-foreground hidden md:block">
          {format(fromTo.from, "MMM d, yyyy")} – {format(fromTo.to, "MMM d, yyyy")}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onExportCsv && <DropdownMenuItem onClick={onExportCsv}><FileText className="h-4 w-4 mr-2" /> CSV</DropdownMenuItem>}
            {onExportPdf && <DropdownMenuItem onClick={onExportPdf}><FileText className="h-4 w-4 mr-2" /> PDF report</DropdownMenuItem>}
            {onPrint && <DropdownMenuItem onClick={onPrint}><Printer className="h-4 w-4 mr-2" /> Print</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OverlayToggles } from "./templates/productCardRenderers";

interface Props {
  value: OverlayToggles;
  onChange: (v: OverlayToggles) => void;
}

const ROWS: { key: keyof OverlayToggles; label: string }[] = [
  { key: "showName", label: "Product name" },
  { key: "showPrice", label: "Price (RWF)" },
  { key: "showNewArrival", label: "New Arrival badge" },
  { key: "showBestSeller", label: "Best Seller badge" },
  { key: "showLowStock", label: "Low Stock — auto from DB" },
  { key: "showSale", label: "Sale badge (% off)" },
  { key: "showSku", label: "SKU / product code" },
  { key: "showDescription", label: "Description excerpt" },
  { key: "showWatermarkUrl", label: "dreamnestrw.com watermark" },
  { key: "showLogo", label: "DreamNest logo" },
];

export function OverlayTogglesPanel({ value, onChange }: Props) {
  const set = <K extends keyof OverlayToggles>(k: K, v: OverlayToggles[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-2">
      {ROWS.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between rounded border px-2 py-1.5 text-xs"
        >
          <Label htmlFor={r.key} className="flex-1 cursor-pointer">
            {r.label}
          </Label>
          <Switch
            id={r.key}
            checked={Boolean(value[r.key])}
            onCheckedChange={(v) => set(r.key, v as never)}
          />
        </div>
      ))}
      {value.showSale && (
        <div className="flex items-center gap-2 rounded border px-2 py-1.5">
          <Label className="text-xs">Discount %</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={value.salePct}
            onChange={(e) =>
              set("salePct", Math.max(1, Math.min(90, Number(e.target.value) || 0)))
            }
            className="h-8 w-20"
          />
        </div>
      )}
    </div>
  );
}

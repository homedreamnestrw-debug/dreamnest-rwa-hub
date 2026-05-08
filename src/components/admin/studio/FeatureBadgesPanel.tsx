import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, X } from "lucide-react";
import { OverlayToggles } from "./templates/productCardRenderers";

interface Props {
  value: OverlayToggles;
  onChange: (v: OverlayToggles) => void;
}

function ColorRow({
  label,
  value,
  onChange,
  allowAuto = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowAuto?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="flex-1 text-[11px]">{label}</Label>
      <Input
        type="color"
        className="h-7 w-10 p-0.5"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      {allowAuto && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px]"
          type="button"
          onClick={() => onChange("")}
        >
          Auto
        </Button>
      )}
    </div>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">
        {label} ({Math.round(value * 100)}%)
      </Label>
      <Slider
        min={50}
        max={200}
        step={5}
        value={[Math.round(value * 100)]}
        onValueChange={(v) => onChange(v[0] / 100)}
      />
    </div>
  );
}

const PILL_PRESETS = [
  "KING SIZE",
  "QUEEN SIZE",
  "PURE COTTON",
  "100% LINEN",
  "PREMIUM QUALITY",
  "BREATHABLE",
  "HYPOALLERGENIC",
  "EASY CARE",
  "LIMITED EDITION",
  "BEST SELLER",
];

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  presets,
  max = 8,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  presets: string[];
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] text-muted-foreground uppercase">{label}</Label>
        <span className="text-[10px] text-muted-foreground">{items.length}/{max}</span>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex gap-1">
            <Input
              className="h-8 text-xs"
              value={it}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              type="button"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      {items.length < max && (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            onClick={() => onChange([...items, ""])}
            type="button"
          >
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
          {presets.slice(0, 4).map((p) => (
            <Button
              key={p}
              size="sm"
              variant="ghost"
              className="h-7 text-[10px]"
              onClick={() => onChange([...items, p])}
              type="button"
            >
              + {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FeatureBadgesPanel({ value, onChange }: Props) {
  const set = <K extends keyof OverlayToggles>(k: K, v: OverlayToggles[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3">
      {/* Special deal banner */}
      <div className="rounded border p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">SPECIAL DEAL banner</Label>
          <Switch
            checked={value.showSpecialDeal}
            onCheckedChange={(v) => set("showSpecialDeal", v)}
          />
        </div>
        {value.showSpecialDeal && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Was</Label>
                <Input
                  className="h-8 text-xs"
                  value={value.specialDealOldPrice}
                  onChange={(e) => set("specialDealOldPrice", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Now</Label>
                <Input
                  className="h-8 text-xs"
                  value={value.specialDealNewPrice}
                  onChange={(e) => set("specialDealNewPrice", e.target.value)}
                />
              </div>
            </div>
            <ColorRow
              label="Accent (gold)"
              value={value.specialDealAccent}
              onChange={(v) => set("specialDealAccent", v)}
            />
          </div>
        )}
      </div>

      {/* Top feature pills (independent list) */}
      <div className="rounded border p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Top feature pills (gold circles)</Label>
          <Switch
            checked={value.showFeaturePills}
            onCheckedChange={(v) => set("showFeaturePills", v)}
          />
        </div>
        {value.showFeaturePills && (
          <div className="space-y-2">
            <ListEditor
              label="Pills"
              items={value.featurePills}
              onChange={(next) => set("featurePills", next)}
              placeholder="e.g. KING SIZE"
              presets={PILL_PRESETS}
              max={4}
            />
            <div className="flex items-center gap-2">
              <Label className="flex-1 text-[11px]">Layout</Label>
              <div className="inline-flex rounded border overflow-hidden">
                <Button
                  type="button"
                  size="sm"
                  variant={value.featurePillLayout === "horizontal" ? "default" : "ghost"}
                  className="h-7 rounded-none px-2 text-[10px]"
                  onClick={() => set("featurePillLayout", "horizontal")}
                >
                  Horizontal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={value.featurePillLayout === "vertical" ? "default" : "ghost"}
                  className="h-7 rounded-none px-2 text-[10px]"
                  onClick={() => set("featurePillLayout", "vertical")}
                >
                  Vertical
                </Button>
              </div>
            </div>
            <ScaleRow
              label="Size"
              value={value.featurePillScale}
              onChange={(v) => set("featurePillScale", v)}
            />
            <ColorRow
              label="Accent color"
              value={value.featurePillAccent}
              onChange={(v) => set("featurePillAccent", v)}
            />
            <ColorRow
              label="Text color"
              value={value.featurePillTextColor}
              onChange={(v) => set("featurePillTextColor", v)}
              allowAuto
            />
          </div>
        )}
      </div>

      {/* Bottom feature bar (independent list) */}
      <div className="rounded border p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Feature bar (gold-icon strip)</Label>
          <Switch
            checked={value.showFeatureBar}
            onCheckedChange={(v) => set("showFeatureBar", v)}
          />
        </div>
        {value.showFeatureBar && (
          <div className="space-y-2">
            <ListEditor
              label="Items"
              items={value.featureBarItems}
              onChange={(next) => set("featureBarItems", next)}
              placeholder="e.g. PREMIUM QUALITY"
              presets={PILL_PRESETS}
              max={5}
            />
            <ScaleRow
              label="Size"
              value={value.featureBarScale}
              onChange={(v) => set("featureBarScale", v)}
            />
            <ColorRow
              label="Background"
              value={value.featureBarBgColor}
              onChange={(v) => set("featureBarBgColor", v)}
            />
            <ColorRow
              label="Accent (icons/divider)"
              value={value.featureBarAccent}
              onChange={(v) => set("featureBarAccent", v)}
            />
            <ColorRow
              label="Text color"
              value={value.featureBarTextColor}
              onChange={(v) => set("featureBarTextColor", v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

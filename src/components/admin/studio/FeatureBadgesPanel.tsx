import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OverlayToggles } from "./templates/productCardRenderers";

interface Props {
  value: OverlayToggles;
  onChange: (v: OverlayToggles) => void;
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
        )}
      </div>

      {/* Top-right feature pills */}
      <div className="rounded border p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Top feature pills (gold icons)</Label>
          <Switch
            checked={value.showFeaturePills}
            onCheckedChange={(v) => set("showFeaturePills", v)}
          />
        </div>
        {value.showFeaturePills && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-8 text-xs"
              value={value.featurePill1}
              onChange={(e) => set("featurePill1", e.target.value)}
              placeholder="KING SIZE"
            />
            <Input
              className="h-8 text-xs"
              value={value.featurePill2}
              onChange={(e) => set("featurePill2", e.target.value)}
              placeholder="PURE COTTON"
            />
          </div>
        )}
      </div>

      {/* Bottom feature bar */}
      <div className="rounded border p-2 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Feature bar (3 gold icons)</Label>
          <Switch
            checked={value.showFeatureBar}
            onCheckedChange={(v) => set("showFeatureBar", v)}
          />
        </div>
        {value.showFeatureBar && (
          <div className="space-y-1.5">
            <Input
              className="h-8 text-xs"
              value={value.featureBar1}
              onChange={(e) => set("featureBar1", e.target.value)}
              placeholder="PREMIUM QUALITY"
            />
            <Input
              className="h-8 text-xs"
              value={value.featureBar2}
              onChange={(e) => set("featureBar2", e.target.value)}
              placeholder="SOFT & BREATHABLE"
            />
            <Input
              className="h-8 text-xs"
              value={value.featureBar3}
              onChange={(e) => set("featureBar3", e.target.value)}
              placeholder="COMFORT ALL NIGHT"
            />
          </div>
        )}
      </div>
    </div>
  );
}

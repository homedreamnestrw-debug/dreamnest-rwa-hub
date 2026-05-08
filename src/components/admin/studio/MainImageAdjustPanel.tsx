import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { OverlayToggles } from "./templates/productCardRenderers";

interface Props {
  value: OverlayToggles;
  onChange: (next: OverlayToggles) => void;
}

export function MainImageAdjustPanel({ value, onChange }: Props) {
  const update = (patch: Partial<OverlayToggles>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Main photo · zoom & position</p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            update({ mainImageZoom: 1, mainImageOffsetX: 0, mainImageOffsetY: 0 })
          }
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">
          Zoom ({Math.round((value.mainImageZoom ?? 1) * 100)}%)
        </Label>
        <Slider
          min={50}
          max={300}
          step={5}
          value={[Math.round((value.mainImageZoom ?? 1) * 100)]}
          onValueChange={(v) => update({ mainImageZoom: v[0] / 100 })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">
          Horizontal ({value.mainImageOffsetX ?? 0}%)
        </Label>
        <Slider
          min={-50}
          max={50}
          step={1}
          value={[value.mainImageOffsetX ?? 0]}
          onValueChange={(v) => update({ mainImageOffsetX: v[0] })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-[11px]">
          Vertical ({value.mainImageOffsetY ?? 0}%)
        </Label>
        <Slider
          min={-50}
          max={50}
          step={1}
          value={[value.mainImageOffsetY ?? 0]}
          onValueChange={(v) => update({ mainImageOffsetY: v[0] })}
        />
      </div>
    </div>
  );
}

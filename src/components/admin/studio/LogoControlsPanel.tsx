import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OverlayToggles } from "./templates/productCardRenderers";

interface Props {
  value: OverlayToggles;
  onChange: (v: OverlayToggles) => void;
}

export function LogoControlsPanel({ value, onChange }: Props) {
  const set = <K extends keyof OverlayToggles>(k: K, v: OverlayToggles[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label htmlFor="showLogo" className="flex-1 cursor-pointer">
          Show logo
        </Label>
        <Switch
          id="showLogo"
          checked={value.showLogo}
          onCheckedChange={(v) => set("showLogo", v)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Logo size</Label>
        <Select value={value.logoSize} onValueChange={(v) => set("logoSize", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Logo opacity</Label>
          <span className="text-xs text-muted-foreground">{value.logoOpacity}%</span>
        </div>
        <Slider
          value={[value.logoOpacity]}
          min={50}
          max={100}
          step={5}
          onValueChange={([v]) => set("logoOpacity", v)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Logo background</Label>
        <Select value={value.logoBg} onValueChange={(v) => set("logoBg", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="white">White pill</SelectItem>
            <SelectItem value="dark">Dark pill</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export function CategoryStripPanel({ value, onChange }: Props) {
  const set = <K extends keyof OverlayToggles>(k: K, v: OverlayToggles[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label htmlFor="showCategoryStrip" className="flex-1 cursor-pointer">
          Show category strip
        </Label>
        <Switch
          id="showCategoryStrip"
          checked={value.showCategoryStrip}
          onCheckedChange={(v) => set("showCategoryStrip", v)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Categories (separated by |)</Label>
        <Textarea
          value={value.categoryStripText}
          onChange={(e) => set("categoryStripText", e.target.value)}
          className="text-xs"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Font size</Label>
        <Select value={value.categoryStripFontSize} onValueChange={(v) => set("categoryStripFontSize", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Style</Label>
        <Select value={value.categoryStripStyle} onValueChange={(v) => set("categoryStripStyle", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="plain">Plain text</SelectItem>
            <SelectItem value="terracotta">Terracotta background</SelectItem>
            <SelectItem value="dark">Dark background</SelectItem>
            <SelectItem value="underline">Underline accent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

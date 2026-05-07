import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

export function ActionBarPanel({ value, onChange }: Props) {
  const set = <K extends keyof OverlayToggles>(k: K, v: OverlayToggles[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label className="flex-1 cursor-pointer">🛒 Order phone</Label>
        <Switch checked={value.showActionPhone} onCheckedChange={(v) => set("showActionPhone", v)} />
      </div>
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label className="flex-1 cursor-pointer">🌐 Website</Label>
        <Switch checked={value.showActionWeb} onCheckedChange={(v) => set("showActionWeb", v)} />
      </div>
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label className="flex-1 cursor-pointer">📍 Address (in bar)</Label>
        <Switch checked={value.showActionAddress} onCheckedChange={(v) => set("showActionAddress", v)} />
      </div>
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label className="flex-1 cursor-pointer">Show address watermark</Label>
        <Switch checked={value.showAddress} onCheckedChange={(v) => set("showAddress", v)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address text</Label>
        <Input
          value={value.addressText}
          onChange={(e) => set("addressText", e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Action bar background</Label>
        <Select value={value.actionBarBg} onValueChange={(v) => set("actionBarBg", v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="terracotta">Terracotta</SelectItem>
            <SelectItem value="transparent">Transparent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  COLOR_OPTIONS,
  ColorKey,
  FONT_OPTIONS,
  FontKey,
  LogoPosition,
  TextPosition,
} from "./templates/brandTokens";

export interface StyleControlsValue {
  font: FontKey;
  color: ColorKey;
  overlayOpacity: number;
  logoPosition: LogoPosition;
  textPosition: TextPosition;
}

interface Props {
  value: StyleControlsValue;
  onChange: (v: StyleControlsValue) => void;
}

export function StyleControls({ value, onChange }: Props) {
  const set = <K extends keyof StyleControlsValue>(
    k: K,
    v: StyleControlsValue[K],
  ) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Font style</Label>
        <Select value={value.font} onValueChange={(v) => set("font", v as FontKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Color shade</Label>
        <Select
          value={value.color}
          onValueChange={(v) => set("color", v as ColorKey)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Overlay opacity</Label>
          <span className="text-xs text-muted-foreground">
            {value.overlayOpacity}%
          </span>
        </div>
        <Slider
          value={[value.overlayOpacity]}
          min={0}
          max={80}
          step={5}
          onValueChange={([v]) => set("overlayOpacity", v)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Logo position</Label>
        <RadioGroup
          value={value.logoPosition}
          onValueChange={(v) => set("logoPosition", v as LogoPosition)}
          className="grid grid-cols-3 gap-1.5 text-xs"
        >
          {(
            ["top-left", "top-right", "center", "bottom-left", "bottom-right"] as LogoPosition[]
          ).map((p) => (
            <label
              key={p}
              className="flex items-center gap-1.5 rounded border px-2 py-1.5 hover:bg-accent cursor-pointer"
            >
              <RadioGroupItem value={p} id={`lp-${p}`} />
              <span className="capitalize">{p.replace("-", " ")}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Text position</Label>
        <RadioGroup
          value={value.textPosition}
          onValueChange={(v) => set("textPosition", v as TextPosition)}
          className="grid grid-cols-3 gap-1.5 text-xs"
        >
          {(["top", "center", "bottom"] as TextPosition[]).map((p) => (
            <label
              key={p}
              className="flex items-center gap-1.5 rounded border px-2 py-1.5 hover:bg-accent cursor-pointer"
            >
              <RadioGroupItem value={p} id={`tp-${p}`} />
              <span className="capitalize">{p}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

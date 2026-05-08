import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bold, Italic, Underline, Plus, Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { CustomTextItem, OverlayToggles } from "./templates/productCardRenderers";
import { FONT_OPTIONS, FontKey } from "./templates/brandTokens";

interface Props {
  value: OverlayToggles;
  onChange: (v: OverlayToggles) => void;
}

const PRESET_COLORS = [
  "#1F1A14", "#F5EFE3", "#FFFFFF", "#000000",
  "#C8553D", "#D4A24A", "#7E4F3A", "#3F5B6F",
  "#E8B4B8", "#2E7D5B",
];

function newItem(): CustomTextItem {
  return {
    id: crypto.randomUUID(),
    text: "Your custom text",
    fontFamily: "serif",
    fontSize: 42,
    color: "#1F1A14",
    bold: false,
    italic: false,
    underline: false,
    align: "left",
  };
}

export function CustomTextPanel({ value, onChange }: Props) {
  const items = value.customTexts ?? [];

  const update = (id: string, patch: Partial<CustomTextItem>) => {
    onChange({
      ...value,
      customTexts: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    });
  };
  const add = () => onChange({ ...value, customTexts: [...items, newItem()] });
  const remove = (id: string) =>
    onChange({ ...value, customTexts: items.filter((it) => it.id !== id) });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Add free text blocks. Drag them on the canvas to position.
        </p>
        <Button size="sm" variant="outline" onClick={add} type="button">
          <Plus className="h-3.5 w-3.5" /> Add text
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">No custom text yet.</p>
      )}

      {items.map((it, idx) => (
        <div key={it.id} className="space-y-2 rounded-md border p-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium">Text #{idx + 1}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1 text-destructive"
              onClick={() => remove(it.id)}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Input
            value={it.text}
            onChange={(e) => update(it.id, { text: e.target.value })}
            placeholder="Type your text..."
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Font</Label>
              <Select
                value={it.fontFamily}
                onValueChange={(v) => update(it.id, { fontFamily: v as FontKey })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.key} value={f.key} className="text-xs">
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Align</Label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => {
                  const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                  return (
                    <Toggle
                      key={a}
                      size="sm"
                      pressed={it.align === a}
                      onPressedChange={() => update(it.id, { align: a })}
                      className="h-8 flex-1"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Toggle>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px]">Size: {it.fontSize}px</Label>
            <Slider
              value={[it.fontSize]}
              min={12}
              max={160}
              step={1}
              onValueChange={([v]) => update(it.id, { fontSize: v })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="flex-1 text-[10px]">Color</Label>
            <Input
              type="color"
              className="h-7 w-10 p-0.5"
              value={it.color}
              onChange={(e) => update(it.id, { color: e.target.value })}
            />
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update(it.id, { color: c })}
                  className="h-5 w-5 rounded-sm border border-border"
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-1">
            <Toggle
              size="sm"
              pressed={it.bold}
              onPressedChange={(v) => update(it.id, { bold: v })}
              aria-label="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={it.italic}
              onPressedChange={(v) => update(it.id, { italic: v })}
              aria-label="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={it.underline}
              onPressedChange={(v) => update(it.id, { underline: v })}
              aria-label="Underline"
            >
              <Underline className="h-3.5 w-3.5" />
            </Toggle>
          </div>
        </div>
      ))}
    </div>
  );
}

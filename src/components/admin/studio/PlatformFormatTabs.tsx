import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FORMATS, PlatformFormat } from "./templates/brandTokens";

interface Props {
  value: PlatformFormat;
  onChange: (v: PlatformFormat) => void;
}

export function PlatformFormatTabs({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as PlatformFormat)}>
      <TabsList className="grid w-full grid-cols-4">
        {(Object.keys(FORMATS) as PlatformFormat[]).map((k) => (
          <TabsTrigger key={k} value={k} className="text-[10px]">
            {FORMATS[k].label.split(" ")[0]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

import { CardPreview } from "./CardPreview";
import {
  ProductData,
  RenderConfig,
} from "./templates/productCardRenderers";
import { STYLE_VARIANTS, FORMATS } from "./templates/brandTokens";
import { cn } from "@/lib/utils";

interface Props {
  baseConfig: RenderConfig;
  product: ProductData | null;
  logo: HTMLImageElement | null;
  selected: RenderConfig["style"];
  onSelect: (s: RenderConfig["style"]) => void;
}

export function VariationGrid({
  baseConfig,
  product,
  logo,
  selected,
  onSelect,
}: Props) {
  const dim = FORMATS[baseConfig.format];
  const thumbW = 160;
  const scale = thumbW / dim.w;

  return (
    <div className="grid grid-cols-5 gap-2">
      {STYLE_VARIANTS.map((s) => {
        const isSel = s.key === selected;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={cn(
              "group flex flex-col items-stretch overflow-hidden rounded-md border bg-card p-1 text-left transition-colors hover:border-primary",
              isSel && "border-primary ring-2 ring-primary/40",
            )}
          >
            <div
              className="overflow-hidden rounded-sm bg-muted"
              style={{ width: thumbW, height: thumbW * (dim.h / dim.w) }}
            >
              <CardPreview
                config={{ ...baseConfig, style: s.key }}
                product={product}
                logo={logo}
                scale={scale}
              />
            </div>
            <div className="mt-1 truncate text-center text-[10px] font-medium">
              {s.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

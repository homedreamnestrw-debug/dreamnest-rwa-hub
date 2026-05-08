import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Props {
  images: string[];
  selected: string | null;
  onSelect: (url: string) => void;
  galleryView: boolean;
  onToggleGallery: (v: boolean) => void;
  galleryPosition: "right" | "left" | "below";
  onGalleryPositionChange: (v: "right" | "left" | "below") => void;
  gallerySatCount: number;
  onGallerySatCountChange: (n: number) => void;
  gallerySatSize: number;
  onGallerySatSizeChange: (n: number) => void;
  gallerySatShape: "square" | "circle" | "diamond";
  onGallerySatShapeChange: (s: "square" | "circle" | "diamond") => void;
}

export function ProductImageStrip({
  images,
  selected,
  onSelect,
  galleryView,
  onToggleGallery,
  galleryPosition,
  onGalleryPositionChange,
  gallerySatCount,
  onGallerySatCountChange,
  gallerySatSize,
  onGallerySatSizeChange,
  gallerySatShape,
  onGallerySatShapeChange,
}: Props) {
  if (!images.length) {
    return <div className="text-xs text-muted-foreground">No images for this product.</div>;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label htmlFor="galleryView" className="flex-1 cursor-pointer">
          Gallery View (main + satellites)
        </Label>
        <Switch id="galleryView" checked={galleryView} onCheckedChange={onToggleGallery} />
      </div>

      {galleryView && (
        <div className="space-y-2 rounded border p-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">Satellite position</Label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["left", "right", "below"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onGalleryPositionChange(p)}
                  className={cn(
                    "rounded border px-2 py-1 text-[11px] capitalize transition-colors",
                    galleryPosition === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-muted-foreground/40",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">
                Satellite count
              </Label>
              <span className="text-[11px] font-medium">{gallerySatCount}</span>
            </div>
            <Slider
              min={1}
              max={6}
              step={1}
              value={[gallerySatCount]}
              onValueChange={(v) => onGallerySatCountChange(v[0] ?? 4)}
              className="mt-1"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground">Satellite size</Label>
              <span className="text-[11px] font-medium">{gallerySatSize}%</span>
            </div>
            <Slider
              min={50}
              max={150}
              step={5}
              value={[gallerySatSize]}
              onValueChange={(v) => onGallerySatSizeChange(v[0] ?? 100)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Satellite shape</Label>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["square", "circle", "diamond"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onGallerySatShapeChange(s)}
                  className={cn(
                    "rounded border px-2 py-1 text-[11px] capitalize transition-colors",
                    gallerySatShape === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-muted-foreground/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {images.map((url, i) => (
          <button
            key={url + i}
            onClick={() => onSelect(url)}
            className={cn(
              "h-14 w-14 overflow-hidden rounded border-2 transition-colors",
              selected === url ? "border-primary" : "border-transparent hover:border-muted-foreground/40",
            )}
          >
            <img src={url} alt={`thumb ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

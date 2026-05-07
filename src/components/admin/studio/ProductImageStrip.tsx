import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  images: string[];
  selected: string | null;
  onSelect: (url: string) => void;
  galleryView: boolean;
  onToggleGallery: (v: boolean) => void;
}

export function ProductImageStrip({ images, selected, onSelect, galleryView, onToggleGallery }: Props) {
  if (!images.length) {
    return <div className="text-xs text-muted-foreground">No images for this product.</div>;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
        <Label htmlFor="galleryView" className="flex-1 cursor-pointer">
          Gallery View (main + 4 thumbs)
        </Label>
        <Switch id="galleryView" checked={galleryView} onCheckedChange={onToggleGallery} />
      </div>
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

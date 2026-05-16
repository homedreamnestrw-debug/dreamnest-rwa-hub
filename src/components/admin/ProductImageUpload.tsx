import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImagePlus, X, Loader2, Sparkles, Wand2, Scissors, Palette, Sun, ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CLOUD_NAME = "ddhy9zqh2";
const AUTO_ENHANCE = "e_improve,e_auto_color,e_sharpen:80,c_limit,w_2000,f_auto,q_auto";

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  hiddenImages?: string[];
  onHiddenChange?: (hidden: string[]) => void;
}

interface PolishOpts {
  autoEnhance: boolean;
  autoColor: boolean;
  sharpen: number;
  saturation: number;
  brightness: number;
  upscale: boolean;
  removeBg: boolean;
  bgColor: string; // hex without # or empty
  bgPrompt: string; // generative replace prompt
}

const DEFAULT_OPTS: PolishOpts = {
  autoEnhance: true,
  autoColor: true,
  sharpen: 60,
  saturation: 0,
  brightness: 0,
  upscale: false,
  removeBg: false,
  bgColor: "",
  bgPrompt: "",
};

function buildTransform(opts: PolishOpts): string {
  const parts: string[] = [];
  const prompt = opts.bgPrompt.trim();
  if (prompt) {
    const safe = prompt.replace(/[^a-zA-Z0-9\s,.-]/g, "").trim().replace(/\s+/g, "%20");
    parts.push(`e_gen_background_replace:prompt_${safe}`);
  } else if (opts.removeBg) {
    parts.push("e_background_removal");
    if (opts.bgColor) parts.push(`b_rgb:${opts.bgColor.replace("#", "")}`);
  }
  if (opts.autoEnhance) parts.push("e_improve");
  if (opts.autoColor) parts.push("e_auto_color");
  if (opts.sharpen > 0) parts.push(`e_sharpen:${Math.round(opts.sharpen)}`);
  if (opts.saturation !== 0) parts.push(`e_saturation:${Math.round(opts.saturation)}`);
  if (opts.brightness !== 0) parts.push(`e_brightness:${Math.round(opts.brightness)}`);
  if (opts.upscale) parts.push("e_upscale");
  parts.push("c_limit", "w_2000", "f_auto", "q_auto");
  return parts.join(",");
}

async function uploadToCloudinary(imageUrl: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("cloudinary-polish", {
    body: { imageUrl },
  });
  if (error || !data?.publicId) return null;
  return data.publicId as string;
}

function buildCloudinaryUrl(publicId: string, transform: string, ext = "jpg") {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transform}/${publicId}.${ext}`;
}

export function ProductImageUpload({ images, onChange, hiddenImages = [], onHiddenChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [editorIdx, setEditorIdx] = useState<number | null>(null);

  const toggleHidden = (url: string) => {
    if (!onHiddenChange) return;
    const next = hiddenImages.includes(url)
      ? hiddenImages.filter((u) => u !== url)
      : [...hiddenImages, url];
    onHiddenChange(next);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      let finalUrl = data.publicUrl;
      if (autoEnhance) {
        const pid = await uploadToCloudinary(finalUrl);
        if (pid) finalUrl = buildCloudinaryUrl(pid, AUTO_ENHANCE);
      }
      newUrls.push(finalUrl);
    }
    onChange([...images, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => onChange(images.filter((_, i) => i !== index));

  const replaceImage = (index: number, url: string) => {
    const next = [...images];
    next[index] = url;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5 text-primary" />
        <Label htmlFor="auto-enhance" className="text-xs cursor-pointer">
          Auto-enhance new uploads
        </Label>
        <Switch id="auto-enhance" checked={autoEnhance} onCheckedChange={setAutoEnhance} />
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => {
          const isHidden = hiddenImages.includes(url);
          return (
            <div key={i} className="relative w-24 rounded-md border group bg-background">
              <div className="relative w-24 h-24 overflow-hidden rounded-t-md">
                <img
                  src={url}
                  alt=""
                  className={`w-full h-full object-cover ${isHidden ? "opacity-40 grayscale" : ""}`}
                />
                {i === 0 && !isHidden && (
                  <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] uppercase tracking-wide px-1 rounded">
                    Cover
                  </span>
                )}
                {isHidden && (
                  <span className="absolute top-0.5 left-0.5 bg-muted text-foreground text-[9px] uppercase tracking-wide px-1 rounded">
                    Hidden
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete image"
                >
                  <X className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Enhance with Cloudinary AI"
                  onClick={() => setEditorIdx(i)}
                  className="absolute bottom-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center justify-between px-1 py-0.5 border-t">
                <button
                  type="button"
                  onClick={() => moveImage(i, i - 1)}
                  disabled={i === 0}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move left"
                >
                  <ArrowLeft className="h-3 w-3" />
                </button>
                {onHiddenChange && (
                  <button
                    type="button"
                    onClick={() => toggleHidden(url)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                    title={isHidden ? "Show on shop" : "Hide from shop"}
                  >
                    {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => moveImage(i, i + 1)}
                  disabled={i === images.length - 1}
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move right"
                >
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
        <label className="w-24 h-24 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Use ← → to reorder (first image is the cover). Click the eye to hide an image from the public shop while keeping it here. ✨ to enhance.
      </p>

      {editorIdx !== null && (
        <ImageEditor
          sourceUrl={images[editorIdx]}
          onClose={() => setEditorIdx(null)}
          onSave={(url) => {
            replaceImage(editorIdx!, url);
            setEditorIdx(null);
          }}
        />
      )}
    </div>
  );
}

function ImageEditor({
  sourceUrl,
  onClose,
  onSave,
}: {
  sourceUrl: string;
  onClose: () => void;
  onSave: (url: string) => void;
}) {
  const [opts, setOpts] = useState<PolishOpts>(DEFAULT_OPTS);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ensurePublicId = async (): Promise<string | null> => {
    if (publicId) return publicId;
    setLoading(true);
    const pid = await uploadToCloudinary(sourceUrl);
    setLoading(false);
    if (!pid) {
      toast({ title: "Cloudinary upload failed", variant: "destructive" });
      return null;
    }
    setPublicId(pid);
    return pid;
  };

  const previewUrl = publicId ? buildCloudinaryUrl(publicId, buildTransform(opts), "png") : sourceUrl;

  const update = (patch: Partial<PolishOpts>) => setOpts({ ...opts, ...patch });

  const applyPreset = async (
    preset: "studio" | "lifestyle" | "vivid" | "soft" | "white-bg" | "remove-bg",
  ) => {
    const pid = await ensurePublicId();
    if (!pid) return;
    switch (preset) {
      case "studio":
        setOpts({ ...DEFAULT_OPTS, autoEnhance: true, autoColor: true, sharpen: 80, saturation: 10 });
        break;
      case "lifestyle":
        setOpts({ ...DEFAULT_OPTS, autoEnhance: true, autoColor: true, sharpen: 40, saturation: 15, brightness: 5 });
        break;
      case "vivid":
        setOpts({ ...DEFAULT_OPTS, autoEnhance: true, autoColor: true, saturation: 35, sharpen: 60 });
        break;
      case "soft":
        setOpts({ ...DEFAULT_OPTS, autoEnhance: true, saturation: -10, brightness: 8, sharpen: 20 });
        break;
      case "white-bg":
        setOpts({ ...DEFAULT_OPTS, removeBg: true, bgColor: "ffffff", autoEnhance: true });
        break;
      case "remove-bg":
        setOpts({ ...DEFAULT_OPTS, removeBg: true, bgColor: "", autoEnhance: true });
        break;
    }
  };

  const handleSave = async () => {
    const pid = await ensurePublicId();
    if (!pid) return;
    const ext = opts.removeBg && !opts.bgColor && !opts.bgPrompt ? "png" : "jpg";
    onSave(buildCloudinaryUrl(pid, buildTransform(opts), ext));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Enhance image with Cloudinary AI
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preview */}
          <div className="space-y-2">
            <div className="aspect-square w-full rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <img src={previewUrl} alt="preview" className="w-full h-full object-contain" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {publicId ? "Live preview · changes apply instantly" : "Click any preset or option below to start"}
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Quick presets</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <Button size="sm" variant="outline" onClick={() => applyPreset("studio")}>
                  <Sun className="h-3 w-3" /> Studio
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset("lifestyle")}>
                  Lifestyle
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset("vivid")}>
                  <Palette className="h-3 w-3" /> Vivid
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset("soft")}>
                  Soft
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset("white-bg")}>
                  <Scissors className="h-3 w-3" /> White BG
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset("remove-bg")}>
                  <Scissors className="h-3 w-3" /> Transparent
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-2 space-y-2">
              <Label className="text-xs font-semibold">Enhancements</Label>
              <Row label="Auto enhance">
                <Switch checked={opts.autoEnhance} onCheckedChange={(v) => update({ autoEnhance: v })} />
              </Row>
              <Row label="Auto color">
                <Switch checked={opts.autoColor} onCheckedChange={(v) => update({ autoColor: v })} />
              </Row>
              <Row label="AI upscale 2×">
                <Switch checked={opts.upscale} onCheckedChange={(v) => update({ upscale: v })} />
              </Row>
              <SliderRow label={`Sharpen (${opts.sharpen})`} min={0} max={400} step={10} value={opts.sharpen} onChange={(v) => update({ sharpen: v })} />
              <SliderRow label={`Saturation (${opts.saturation})`} min={-80} max={80} step={5} value={opts.saturation} onChange={(v) => update({ saturation: v })} />
              <SliderRow label={`Brightness (${opts.brightness})`} min={-50} max={50} step={5} value={opts.brightness} onChange={(v) => update({ brightness: v })} />
            </div>

            <div className="rounded-md border border-dashed p-2 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Scissors className="h-3 w-3" /> Background
              </Label>
              <Row label="Remove background (AI)">
                <Switch checked={opts.removeBg} onCheckedChange={(v) => update({ removeBg: v, bgPrompt: v ? opts.bgPrompt : "" })} />
              </Row>
              {opts.removeBg && (
                <div className="space-y-1">
                  <Label className="text-[11px]">Solid background color (hex)</Label>
                  <div className="flex gap-1">
                    <Input
                      value={opts.bgColor}
                      onChange={(e) => update({ bgColor: e.target.value.replace("#", "") })}
                      placeholder="ffffff (leave empty for transparent)"
                      className="h-8 text-xs"
                    />
                    {["ffffff", "f5f1ea", "000000", "e8d9b8"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => update({ bgColor: c })}
                        className="h-8 w-8 rounded border"
                        style={{ background: `#${c}` }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1 pt-1 border-t">
                <Label className="text-[11px] flex items-center gap-1">
                  <Wand2 className="h-3 w-3 text-primary" /> AI background replace
                </Label>
                <Input
                  value={opts.bgPrompt}
                  onChange={(e) => update({ bgPrompt: e.target.value })}
                  placeholder="e.g. cozy bedroom with morning light"
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Describes a new scene; overrides remove-background when set.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="ghost" onClick={() => setOpts(DEFAULT_OPTS)}>Reset</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Save enhanced
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs">{label}</span>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">{label}</Label>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}

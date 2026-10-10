import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RotateCcw, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCutout } from "@/lib/photoroomCutout";

const CLOUD_NAME = "ddhy9zqh2";

export interface PolishOptions {
  removeBg: boolean;
  autoEnhance: boolean;
  autoColor: boolean;
  sharpen: number; // 0..400 (Cloudinary range, 0 = off)
  upscale: boolean; // 2x AI
  saturation: number; // -100..100
  brightness: number; // -100..100
  bgReplacePrompt: string; // Generative AI background prompt (empty = off)
}

const DEFAULT_POLISH: PolishOptions = {
  removeBg: false,
  autoEnhance: true,
  autoColor: false,
  sharpen: 0,
  upscale: false,
  saturation: 0,
  brightness: 0,
  bgReplacePrompt: "",
};

interface Props {
  sourceUrl: string | null;
  productId?: string;
  onPolished: (url: string) => void;
  onReset: () => void;
}

function buildTransformations(opts: PolishOptions): string {
  const parts: string[] = [];
  const prompt = opts.bgReplacePrompt.trim();
  if (prompt) {
    // Generative AI background replacement (Cloudinary add-on)
    const safe = prompt
      .replace(/[^a-zA-Z0-9\s,.-]/g, "")
      .trim()
      .replace(/\s+/g, "%20");
    parts.push(`e_gen_background_replace:prompt_${safe}`);
  }
  if (opts.autoEnhance) parts.push("e_improve");
  if (opts.autoColor) parts.push("e_auto_color");
  if (opts.sharpen > 0) parts.push(`e_sharpen:${Math.round(opts.sharpen)}`);
  if (opts.saturation !== 0) parts.push(`e_saturation:${Math.round(opts.saturation)}`);
  if (opts.brightness !== 0) parts.push(`e_brightness:${Math.round(opts.brightness)}`);
  if (opts.upscale) parts.push("e_upscale");
  parts.push("f_auto", "q_auto");
  return parts.join(",");
}

export function PolishPanel({ sourceUrl, productId, onPolished, onReset }: Props) {
  const [cutoutId, setCutoutId] = useState<string | null>(null);
  const [cutting, setCutting] = useState(false);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [opts, setOpts] = useState<PolishOptions>(DEFAULT_POLISH);
  const [lastSource, setLastSource] = useState<string | null>(null);

  // Re-upload when source changes
  if (sourceUrl !== lastSource) {
    setLastSource(sourceUrl);
    setPublicId(null);
    setCutoutId(null);
  }

  const ensureCutout = async (force = false): Promise<string | null> => {
    if (cutoutId && !force) return cutoutId;
    if (!sourceUrl) return null;
    setCutting(true);
    try {
      const cut = await getCutout(sourceUrl, productId, force);
      if (!cut) return null;
      const { data } = await supabase.functions.invoke("cloudinary-polish", { body: { imageUrl: cut } });
      const id = (data?.publicId as string) ?? null;
      setCutoutId(id);
      return id;
    } finally {
      setCutting(false);
    }
  };

  const apply = (next: PolishOptions, base = publicId, cut = cutoutId) => {
    const id = next.removeBg && !next.bgReplacePrompt.trim() && cut ? cut : base;
    if (!id) return;
    const t = buildTransformations(next);
    const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}/${id}.png`;
    onPolished(url);
  };

  const handleUploadAndApply = async () => {
    if (!sourceUrl) {
      toast({ title: "Select an image first", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cloudinary-polish", {
        body: { imageUrl: sourceUrl },
      });
      if (error) throw error;
      const id = data?.publicId as string;
      if (!id) throw new Error("No publicId returned");
      setPublicId(id);
      apply(opts, id);
      toast({ title: "Image polished", description: "Cloudinary processing applied." });
    } catch (e: any) {
      toast({
        title: "Polish failed",
        description: e?.message ?? "Could not reach Cloudinary",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const update = async (patch: Partial<PolishOptions>) => {
    const next = { ...opts, ...patch };
    let cut = cutoutId;
    if (patch.removeBg) {
      cut = await ensureCutout();
      if (!cut) next.removeBg = false;
    }
    setOpts(next);
    if (publicId) apply(next, publicId, cut);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        AI polishing via Cloudinary free tier. First click uploads the image, then toggles
        update the live preview instantly.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={handleUploadAndApply}
          disabled={!sourceUrl || uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {publicId ? "Re-polish" : "Polish image"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setPublicId(null);
            setCutoutId(null);
            setOpts(DEFAULT_POLISH);
            onReset();
          }}
          disabled={!publicId}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Original
        </Button>
      </div>

      <div className="space-y-2 rounded-md border p-2">
        <Row label="Remove background" hint={cutting ? "PhotoRoom processing…" : "PhotoRoom AI cutout (cached)"}>
          {cutting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={opts.removeBg}
              onCheckedChange={(v) => update({ removeBg: v })}
              disabled={!publicId}
            />
          )}
        </Row>
        {opts.removeBg && cutoutId && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" disabled={cutting}
            onClick={async () => { const c = await ensureCutout(true); if (c) apply(opts, publicId, c); }}>
            Re-cut (uses 1 PhotoRoom credit)
          </Button>
        )}
        <Row label="Auto enhance" hint="e_improve">
          <Switch
            checked={opts.autoEnhance}
            onCheckedChange={(v) => update({ autoEnhance: v })}
            disabled={!publicId}
          />
        </Row>
        <Row label="Auto color" hint="e_auto_color">
          <Switch
            checked={opts.autoColor}
            onCheckedChange={(v) => update({ autoColor: v })}
            disabled={!publicId}
          />
        </Row>
        <Row label="AI upscale 2×" hint="costs more credits">
          <Switch
            checked={opts.upscale}
            onCheckedChange={(v) => update({ upscale: v })}
            disabled={!publicId}
          />
        </Row>

        <div className="space-y-1">
          <Label className="text-[11px]">Sharpen ({opts.sharpen})</Label>
          <Slider
            min={0}
            max={400}
            step={10}
            value={[opts.sharpen]}
            onValueChange={(v) => update({ sharpen: v[0] })}
            disabled={!publicId}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Saturation ({opts.saturation})</Label>
          <Slider
            min={-80}
            max={80}
            step={5}
            value={[opts.saturation]}
            onValueChange={(v) => update({ saturation: v[0] })}
            disabled={!publicId}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Brightness ({opts.brightness})</Label>
          <Slider
            min={-50}
            max={50}
            step={5}
            value={[opts.brightness]}
            onValueChange={(v) => update({ brightness: v[0] })}
            disabled={!publicId}
          />
        </div>

        <div className="space-y-1 rounded-md border border-dashed p-2">
          <div className="flex items-center gap-1">
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            <Label className="text-[11px] font-medium">AI Background Replace</Label>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Describe a new scene · Cloudinary Generative AI swaps the background. Leave empty to keep original.
          </p>
          <div className="flex gap-1">
            <Input
              value={opts.bgReplacePrompt}
              onChange={(e) => setOpts({ ...opts, bgReplacePrompt: e.target.value })}
              placeholder="e.g. cozy bedroom with morning light"
              disabled={!publicId}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!publicId}
              onClick={() => apply(opts)}
            >
              Apply
            </Button>
          </div>
          {opts.bgReplacePrompt && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => update({ bgReplacePrompt: "" })}
            >
              Clear background prompt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

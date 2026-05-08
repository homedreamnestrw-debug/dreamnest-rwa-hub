import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ImagePlus, X, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CLOUD_NAME = "ddhy9zqh2";
const ENHANCE_TRANSFORM = "e_improve,e_auto_color,e_sharpen:80,c_limit,w_2000,f_auto,q_auto";

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}

async function polishUrl(imageUrl: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("cloudinary-polish", {
    body: { imageUrl },
  });
  if (error || !data?.publicId) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${ENHANCE_TRANSFORM}/${data.publicId}.jpg`;
}

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [polishingIdx, setPolishingIdx] = useState<number | null>(null);

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
        const enhanced = await polishUrl(finalUrl);
        if (enhanced) finalUrl = enhanced;
      }
      newUrls.push(finalUrl);
    }

    onChange([...images, ...newUrls]);
    setUploading(false);
    if (autoEnhance) toast({ title: "Images enhanced", description: "Polished with Cloudinary AI." });
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const enhanceExisting = async (index: number) => {
    setPolishingIdx(index);
    try {
      const enhanced = await polishUrl(images[index]);
      if (!enhanced) {
        toast({ title: "Enhance failed", variant: "destructive" });
        return;
      }
      const next = [...images];
      next[index] = enhanced;
      onChange(next);
      toast({ title: "Image enhanced" });
    } finally {
      setPolishingIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 className="h-3.5 w-3.5 text-primary" />
        <Label htmlFor="auto-enhance" className="text-xs cursor-pointer">
          Auto-enhance new uploads (Cloudinary AI)
        </Label>
        <Switch id="auto-enhance" checked={autoEnhance} onCheckedChange={setAutoEnhance} />
      </div>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Enhance with Cloudinary AI"
              onClick={() => enhanceExisting(i)}
              disabled={polishingIdx === i}
              className="absolute bottom-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
            >
              {polishingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            </button>
          </div>
        ))}
        <label className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Auto-enhance applies AI improve, auto-color, sharpening and web-optimized delivery (f_auto, q_auto).
      </p>
    </div>
  );
}

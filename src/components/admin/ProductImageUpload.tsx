import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ProductImageUpload({ images, onChange }: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);

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
      newUrls.push(data.publicUrl);
    }

    onChange([...images, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
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
          </div>
        ))}
        <label className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

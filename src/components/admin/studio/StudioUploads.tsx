import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  uploaded: string[];
  selected: string | null;
  onUploaded: (url: string) => void;
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
}

export function StudioUploads({
  uploaded,
  selected,
  onUploaded,
  onSelect,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const ext = file.name.split(".").pop() || "jpg";
        const path = `studio-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("business-assets")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
        onUploaded(data.publicUrl);
      }
      toast({ title: "Image uploaded", description: "Added to your studio images." });
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message ?? "Could not upload image",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Custom uploads</p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploaded.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploaded.map((u) => (
            <div key={u} className="relative">
              <button
                type="button"
                onClick={() => onSelect(u)}
                className={`h-14 w-14 overflow-hidden rounded border ${
                  selected === u ? "ring-2 ring-primary" : ""
                }`}
              >
                <img src={u} alt="upload" className="h-full w-full object-cover" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  const marker = "/business-assets/";
                  const idx = u.indexOf(marker);
                  if (idx >= 0) {
                    const path = u.slice(idx + marker.length);
                    const { error } = await supabase.storage
                      .from("business-assets")
                      .remove([path]);
                    if (error) {
                      toast({
                        title: "Delete failed",
                        description: error.message,
                        variant: "destructive",
                      });
                      return;
                    }
                  }
                  onRemove(u);
                }}
                className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow border"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">
        Use any custom image — moodboards, lifestyle shots, banners — alongside product photos.
      </p>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/** Remove background via PhotoRoom (cached per product image). Returns cutout URL or null (fallback to original). */
export async function getCutout(imageUrl: string, productId?: string, force = false): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("image-polish", {
    body: { imageUrl, productId, force },
  });
  if (error || !data) return null;
  if (data.fallback) {
    if (data.reason === "limit_reached") {
      toast({
        title: "Monthly image polishing limit reached",
        description: `Resets on ${data.resetsOn}. Using original image.`,
        variant: "destructive",
      });
    }
    return null;
  }
  if (data.cached) toast({ title: "Cutout loaded from cache", description: "No PhotoRoom credit used." });
  return data.url as string;
}

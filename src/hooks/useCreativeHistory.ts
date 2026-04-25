import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreativeAssetInput {
  asset_type: "product_card" | "announcement" | "bundle";
  product_id?: string | null;
  template_key?: string | null;
  style_variant?: string | null;
  platform_format?: string | null;
  config: Record<string, unknown>;
  caption?: string | null;
}

export function useCreativeHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["creative-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creative_assets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const log = useMutation({
    mutationFn: async (input: CreativeAssetInput) => {
      const { data, error } = await supabase
        .from("creative_assets")
        .insert({
          ...input,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creative-assets"] });
    },
  });

  return { list, log };
}

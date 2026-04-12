import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useWebsiteContent() {
  const { data: content = {}, isLoading } = useQuery({
    queryKey: ["website-content"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_website_content");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        map[row.content_key] = row.content_value;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { content, isLoading };
}

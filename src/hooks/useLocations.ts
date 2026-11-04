import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BranchOption = { id: string; name: string };

/** Active stock locations (branches), cached app-wide. */
export function useLocations() {
  return useQuery({
    queryKey: ["branch-locations"],
    queryFn: async () => {
      const { data } = await supabase.from("stock_locations").select("id, name").eq("is_active", true).order("created_at");
      return (data ?? []) as BranchOption[];
    },
    staleTime: 5 * 60_000,
  });
}

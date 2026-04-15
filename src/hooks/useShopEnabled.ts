import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useShopEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ["shop-enabled"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_business_settings");
      return data?.[0]?.shop_enabled ?? true;
    },
    staleTime: 60_000,
  });

  return { shopEnabled: data ?? true, isLoading };
}

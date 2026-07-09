import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useShopEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ["shop-enabled"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_business_settings");
      const row: any = data?.[0] ?? {};
      return {
        shopEnabled: row.shop_enabled ?? true,
        vouchersEnabled: row.vouchers_enabled ?? true,
      };
    },
    staleTime: 60_000,
  });

  return {
    shopEnabled: data?.shopEnabled ?? true,
    vouchersEnabled: data?.vouchersEnabled ?? true,
    isLoading,
  };
}

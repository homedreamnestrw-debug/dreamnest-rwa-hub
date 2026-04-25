import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_LOGO = "/logo.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function useBrandAssets() {
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let url = FALLBACK_LOGO;
      try {
        const { data } = await supabase.rpc("get_public_business_settings");
        const row = (data as any)?.[0];
        if (row?.logo_url) url = row.logo_url as string;
      } catch {
        // ignore – will fall back
      }
      try {
        const img = await loadImage(url);
        if (!cancelled) setLogo(img);
      } catch {
        try {
          const img = await loadImage(FALLBACK_LOGO);
          if (!cancelled) setLogo(img);
        } catch {
          if (!cancelled) setLogo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { logo, loading };
}

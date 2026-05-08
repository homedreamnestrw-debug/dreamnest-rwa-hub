import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import brandLogo from "@/assets/logo.png";

// Use the same artistic logo as the website Header
const FALLBACK_LOGO = brandLogo;

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
      // Always use the same artistic logo as the website Header
      try {
        const img = await loadImage(FALLBACK_LOGO);
        if (!cancelled) setLogo(img);
      } catch {
        if (!cancelled) setLogo(null);
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

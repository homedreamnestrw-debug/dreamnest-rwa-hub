import { Link } from "react-router-dom";
import { MapPin, Gift, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

export const DEFAULT_SHOP_ADDRESS =
  "KG 1 Avenue 31, Cobblestone Road From Kisimenti to Sonatube, Kigali, Rwanda";
export const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/dreamnestrw";

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function useVisitShopInfo() {
  const { content: c } = useWebsiteContent();
  const address = c.contact_address || DEFAULT_SHOP_ADDRESS;
  return {
    address,
    mapsUrl: mapsUrl(address),
    instagramUrl: c.social_instagram || DEFAULT_INSTAGRAM_URL,
  };
}

export function VisitShopBody({ address }: { address: string }) {
  return (
    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
      Our full online store is launching soon. In the meantime, you can visit us in person at{" "}
      <span className="font-medium text-foreground">{address}</span> or buy digital gift vouchers online.
    </p>
  );
}

export function VisitShopActions({
  mapsUrl,
  instagramUrl,
  onAction,
}: {
  mapsUrl: string;
  instagramUrl: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Button asChild className="w-full h-11" onClick={onAction}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin className="h-4 w-4" />
          Get Store Directions
        </a>
      </Button>

      <Button asChild variant="outline" className="w-full h-11" onClick={onAction}>
        <Link to="/gift-vouchers">
          <Gift className="h-4 w-4" />
          Buy a Gift Voucher
        </Link>
      </Button>

      <Button asChild variant="outline" className="w-full h-11 sm:col-span-2" onClick={onAction}>
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
          <Instagram className="h-4 w-4" />
          Visit Our Instagram
        </a>
      </Button>
    </div>
  );
}

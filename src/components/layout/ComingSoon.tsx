import { PublicLayout } from "./PublicLayout";
import { Clock } from "lucide-react";
import { VisitShopActions, VisitShopBody, useVisitShopInfo } from "@/components/VisitShopContent";

export function ComingSoon() {
  const { address, mapsUrl, instagramUrl } = useVisitShopInfo();

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-xl mx-auto text-center">
          <Clock className="h-16 w-16 text-soft-gold mx-auto mb-6" />
          <h1 className="text-4xl lg:text-5xl font-serif mb-4">Visit our shop today!</h1>
          <VisitShopBody address={address} />
          <VisitShopActions mapsUrl={mapsUrl} instagramUrl={instagramUrl} />
        </div>
      </div>
    </PublicLayout>
  );
}

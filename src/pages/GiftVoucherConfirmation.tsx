import { useParams, Link } from "react-router-dom";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Download, Image as ImageIcon } from "lucide-react";
import { VoucherCard } from "@/components/voucher/VoucherCard";
import { downloadVoucherPdf, downloadVoucherPng } from "@/lib/voucherExport";
import { toast } from "sonner";

export default function GiftVoucherConfirmation() {
  const { code } = useParams<{ code: string }>();
  const artRef = useRef<HTMLDivElement>(null);

  // Use the secure validate_voucher RPC instead of direct table query
  const { data: voucher, isLoading } = useQuery({
    queryKey: ["voucher-confirmation", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_voucher", { voucher_code: code! });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0];
    },
    enabled: !!code,
  });

  const handleDownload = async (kind: "pdf" | "png") => {
    if (!artRef.current || !voucher) return;
    try {
      if (kind === "pdf") await downloadVoucherPdf(artRef.current, voucher.code);
      else await downloadVoucherPng(artRef.current, voucher.code);
    } catch {
      toast.error("Could not generate the file. Please try again.");
    }
  };


  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!voucher) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-3xl font-serif mb-2">Voucher Purchased!</h1>
          <p className="text-muted-foreground mb-4">
            Your gift voucher has been created. It will be activated once your payment is confirmed.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            You'll be able to view your voucher details here once payment is approved.
          </p>
          <Link to="/shop">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-3xl font-serif mb-2">Voucher Active!</h1>
          <p className="text-muted-foreground">Your gift voucher is ready to use.</p>
        </div>

        <div className="mb-8">
          <VoucherCard
            artworkRef={artRef}
            amount={voucher.balance}
            code={voucher.code}
            recipient={(voucher as any).recipient_name}
            from={(voucher as any).buyer_name}
            validUntil={voucher.expires_at}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => handleDownload("pdf")} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={() => handleDownload("png")} variant="outline" className="flex-1">
            <ImageIcon className="mr-2 h-4 w-4" />
            Download Image
          </Button>
          <Link to="/shop" className="flex-1">
            <Button variant="outline" className="w-full">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}


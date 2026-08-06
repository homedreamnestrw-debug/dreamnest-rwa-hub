import { VoucherCard } from "@/components/voucher/VoucherCard";
export default function VoucherPreview() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <VoucherCard amount={100000} code="FYTPZMZX" recipient="Jp" from="DreamNest Ltd" validUntil="2027-07-09" />
    </div>
  );
}

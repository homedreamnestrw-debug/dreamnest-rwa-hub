import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Gift, Smartphone, CreditCard } from "lucide-react";

const PRESET_AMOUNTS = [100000, 150000, 300000];

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

export default function GiftVouchers() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const [form, setForm] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",
    personal_message: "",
    payment_method: "mtn_momo",
  });

  const amount = isCustom ? parseInt(customAmount) || 0 : (selectedPreset ?? 0);

  const paymentMethods = [
    { value: "mtn_momo", label: "MTN Mobile Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "airtel_money", label: "Airtel Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "card", label: "Card Payment", icon: <CreditCard className="h-4 w-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 1000) {
      toast.error("Minimum voucher amount is 1,000 RWF");
      return;
    }
    if (!form.buyer_name || !form.buyer_phone || !form.recipient_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { data, error } = await supabase
        .from("gift_vouchers")
        .insert({
          code: "",
          amount,
          balance: amount,
          buyer_name: form.buyer_name,
          buyer_email: form.buyer_email || null,
          buyer_phone: form.buyer_phone,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email || null,
          recipient_phone: form.recipient_phone || null,
          personal_message: form.personal_message || null,
          payment_method: form.payment_method,
          payment_status: "unpaid",
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select("code")
        .single();

      if (error) throw error;

      // Send emails to shop + buyer with PDF
      supabase.functions.invoke("send-voucher-emails", {
        body: { voucher_code: data.code, type: "purchased" },
      });

      navigate(`/gift-vouchers/confirmation/${data.code}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase voucher");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <Gift className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-serif mb-3">Gift Vouchers</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Give the perfect gift! Purchase a DreamNest shopping voucher for your loved ones. 
            Valid for 1 year on all our premium bedding & home decor products.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Amount Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Choose Amount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => { setSelectedPreset(preset); setIsCustom(false); }}
                        className={`relative p-6 rounded-xl border-2 text-center transition-all hover:shadow-md ${
                          !isCustom && selectedPreset === preset
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Gift className="h-6 w-6 mx-auto mb-2 text-primary/70" />
                        <div className="font-serif text-2xl font-bold">{formatPrice(preset)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Shopping Voucher</div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsCustom(true)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isCustom ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Gift className="h-5 w-5 text-primary/70" />
                        <span className="font-medium">Custom Amount</span>
                      </div>
                    </button>
                    {isCustom && (
                      <div className="mt-3">
                        <Input
                          type="number"
                          placeholder="Enter amount in RWF (min 1,000)"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          min="1000"
                          className="text-lg"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Buyer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Your Information (Buyer)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input required value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input required placeholder="+250 7XX XXX XXX" value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="your@email.com" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              {/* Recipient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Recipient Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Recipient Name *</Label>
                      <Input required value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Recipient Phone</Label>
                      <Input placeholder="+250 7XX XXX XXX" value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipient Email</Label>
                    <Input type="email" placeholder="recipient@email.com" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Message (optional)</Label>
                    <Textarea
                      placeholder="Write a special message for the recipient..."
                      value={form.personal_message}
                      onChange={(e) => setForm({ ...form, personal_message: e.target.value })}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={form.payment_method}
                    onValueChange={(val) => setForm({ ...form, payment_method: val })}
                    className="space-y-3"
                  >
                    {paymentMethods.map((pm) => (
                      <label
                        key={pm.value}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          form.payment_method === pm.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <RadioGroupItem value={pm.value} />
                        {pm.icon}
                        <span className="font-medium">{pm.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 rounded-xl bg-primary/5 border border-primary/20">
                    <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="font-serif text-3xl font-bold">{formatPrice(amount)}</div>
                    <div className="text-sm text-muted-foreground mt-1">Gift Voucher</div>
                  </div>

                  {form.recipient_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">To: </span>
                      <span className="font-medium">{form.recipient_name}</span>
                    </div>
                  )}
                  {form.buyer_name && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">From: </span>
                      <span className="font-medium">{form.buyer_name}</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span className="font-serif">{formatPrice(amount)}</span>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ Valid for 1 year from purchase</p>
                    <p>✓ Usable on all products</p>
                    <p>✓ Partial redemption supported</p>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={submitting || amount < 1000}>
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                    ) : (
                      `Purchase Voucher — ${formatPrice(amount)}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}

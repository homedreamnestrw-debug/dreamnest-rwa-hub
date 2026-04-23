import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone, Banknote, Gift, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { FeaturedProducts } from "@/components/product/FeaturedProducts";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { cartItems, isLoading, clearCart } = useCart();
  const { shopEnabled, isLoading: shopLoading } = useShopEnabled();
  const [submitting, setSubmitting] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherData, setVoucherData] = useState<{ id: string; code: string; balance: number; expires_at: string } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    shipping_address: "",
    shipping_city: "Kigali",
    notes: "",
    payment_method: "mtn_momo" as PaymentMethod,
  });

  // Pre-fill from profile if logged in
  useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (data) {
        setForm((prev) => ({
          ...prev,
          full_name: data.full_name || "",
          phone: data.phone || "",
          shipping_address: data.shipping_address || "",
          shipping_city: data.city || "Kigali",
        }));
      }
      if (user?.email) {
        setForm((prev) => ({ ...prev, email: user.email! }));
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ["business-settings-public"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_business_settings");
      return data?.[0] ?? null;
    },
  });

  if (!shopLoading && !shopEnabled) return <ComingSoon />;

  // Online orders: VAT is included in product price (no extra VAT charged at checkout)
  const vatRate = settings?.vat_percentage ? Number(settings.vat_percentage) / 100 : 0.18;

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
  const taxAmount = 0;
  const voucherDiscount = voucherData ? Math.min(voucherData.balance, subtotal) : 0;
  const total = subtotal - voucherDiscount;
  const isFullyPaidByVoucher = voucherDiscount > 0 && total <= 0;

  const applyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    try {
      const { data, error } = await supabase.rpc("validate_voucher", { voucher_code: voucherCode.trim() });
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Invalid, expired, or already redeemed voucher code");
        return;
      }
      setVoucherData(data[0] as any);
      toast.success(`Voucher applied! Balance: ${formatPrice(data[0].balance)}`);
    } catch {
      toast.error("Could not validate voucher code");
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setVoucherData(null);
    setVoucherCode("");
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: "mtn_momo", label: "MTN Mobile Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "airtel_money", label: "Airtel Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "card", label: "Card Payment", icon: <CreditCard className="h-4 w-4" /> },
    { value: "cash", label: "Cash on Delivery", icon: <Banknote className="h-4 w-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (!form.full_name || !form.phone || !form.shipping_address) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      // Final live stock check to prevent overselling
      const productIds = cartItems.map((i) => i.product?.id ?? i.product_id).filter(Boolean) as string[];
      const { data: liveProducts, error: stockError } = await supabase
        .from("products")
        .select("id, name, stock_quantity")
        .in("id", productIds);
      if (stockError) throw stockError;

      const stockMap = new Map(liveProducts?.map((p) => [p.id, p]) ?? []);
      const insufficient = cartItems
        .map((item) => {
          const pid = item.product?.id ?? item.product_id;
          const live = stockMap.get(pid);
          if (!live) return `${item.product?.name ?? "Item"} is no longer available`;
          if (live.stock_quantity <= 0) return `${live.name} is out of stock`;
          if (item.quantity > live.stock_quantity) return `${live.name}: only ${live.stock_quantity} left (you requested ${item.quantity})`;
          return null;
        })
        .filter(Boolean);
      if (insufficient.length > 0) {
        toast.error(insufficient.join(" • "));
        setSubmitting(false);
        return;
      }

      const effectivePaymentMethod = isFullyPaidByVoucher ? "voucher" : form.payment_method;
      const orderPayload: any = {
        channel: "online" as const,
        status: "pending" as const,
        payment_status: isFullyPaidByVoucher ? ("paid" as const) : ("unpaid" as const),
        payment_method: effectivePaymentMethod,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: voucherDiscount,
        total: Math.max(0, total),
        shipping_address: form.shipping_address,
        shipping_city: form.shipping_city,
        notes: form.notes || null,
        payment_approved: isFullyPaidByVoucher ? true : false,
      };

      if (user) {
        orderPayload.customer_id = user.id;
      } else {
        // Guest order
        orderPayload.customer_id = null;
        orderPayload.guest_name = form.full_name;
        orderPayload.guest_email = form.email;
        orderPayload.guest_phone = form.phone;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product?.id ?? item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.product?.price ?? 0,
        discount: 0,
        total: (item.product?.price ?? 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Record voucher redemption if used
      if (voucherData && voucherDiscount > 0) {
        await supabase.from("voucher_redemptions").insert({
          voucher_id: voucherData.id,
          order_id: order.id,
          amount_used: voucherDiscount,
        });
        // Update voucher balance
        const newBalance = voucherData.balance - voucherDiscount;
        await supabase
          .from("gift_vouchers")
          .update({
            balance: newBalance,
            status: newBalance <= 0 ? "redeemed" : "active",
          })
          .eq("id", voucherData.id);
      }

      if (user) {
        await supabase
          .from("profiles")
          .update({
            full_name: form.full_name,
            phone: form.phone,
            shipping_address: form.shipping_address,
            city: form.shipping_city,
          })
          .eq("user_id", user.id);
      }

      await clearCart();

      // Build item summary for emails
      const itemsList = cartItems
        .map((item) => `${item.product?.name} × ${item.quantity} — ${formatPrice((item.product?.price ?? 0) * item.quantity)}`)
        .join("<br/>");

      const customerEmail = user ? (user.email || form.email) : form.email;
      const customerName = form.full_name;
      const orderNum = order.order_number;
      const paymentLabel = (form.payment_method || "").replace("_", " ");

      // Send email notifications only for authenticated users
      if (user) {
        supabase.functions.invoke("notify-customer", {
          body: {
            to: "sales@dreamnestrw.com",
            subject: `New Online Order #${orderNum} — ${formatPrice(total)}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
              <h2 style="color:#5c4033">🛒 New Online Order #${orderNum}</h2>
              <p><strong>Customer:</strong> ${customerName}</p>
              <p><strong>Phone:</strong> ${form.phone}</p>
              ${customerEmail ? `<p><strong>Email:</strong> ${customerEmail}</p>` : ""}
              <p><strong>Shipping:</strong> ${form.shipping_address}, ${form.shipping_city}</p>
              <p><strong>Payment:</strong> ${paymentLabel}</p>
              ${form.notes ? `<p><strong>Notes:</strong> ${form.notes}</p>` : ""}
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
              <p style="font-size:14px">${itemsList}</p>
              <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
              <p><strong>Subtotal:</strong> ${formatPrice(subtotal)}</p>
              <p><strong>VAT:</strong> ${formatPrice(taxAmount)}</p>
              <p style="font-size:18px"><strong>Total: ${formatPrice(total)}</strong></p>
              <p style="color:#999;font-size:12px;margin-top:24px">This order requires payment approval before processing.</p>
            </div>`,
          },
        });

        if (customerEmail) {
          supabase.functions.invoke("notify-customer", {
            body: {
              to: customerEmail,
              subject: `Order Received — #${orderNum} — DreamNest`,
              html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
                <h2 style="color:#5c4033">Thank You for Your Order! 🎉</h2>
                <p>Dear ${customerName},</p>
                <p>We've received your order <strong>#${orderNum}</strong> and it's being reviewed. You'll receive another email once your payment is confirmed.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
                <p style="font-size:14px"><strong>Items:</strong></p>
                <p style="font-size:14px">${itemsList}</p>
                <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
                <p><strong>Total: ${formatPrice(total)}</strong></p>
                <p><strong>Payment:</strong> ${paymentLabel}</p>
                <p><strong>Delivery to:</strong> ${form.shipping_address}, ${form.shipping_city}</p>
                <p style="margin-top:24px">If you have any questions, feel free to reply to this email or contact us at <strong>+250 788 000 000</strong>.</p>
                <p style="color:#999;font-size:12px;margin-top:32px">DreamNest — Premium Bedding & Home Decor</p>
              </div>`,
            },
          });
        }
      }

      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
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

  if (cartItems.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              {/* Contact & Shipping */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    {user ? "Shipping Information" : "Your Information"}
                  </CardTitle>
                  {!user && (
                    <p className="text-sm text-muted-foreground">
                      No account needed! We'll use this info to process your order.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" required placeholder="+250 7XX XXX XXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  {!user && (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="address">Shipping Address *</Label>
                    <Input id="address" required value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" required value={form.shipping_city} onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (optional)</Label>
                    <Textarea id="notes" placeholder="Special delivery instructions..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              {/* Payment */}
              {isFullyPaidByVoucher ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-primary bg-primary/5">
                      <Gift className="h-5 w-5 text-primary" />
                      <div>
                        <span className="font-medium">Paid by Gift Voucher</span>
                        <p className="text-sm text-muted-foreground">Your voucher covers the full order amount</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif text-xl">Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={form.payment_method}
                      onValueChange={(val) => setForm({ ...form, payment_method: val as PaymentMethod })}
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
              )}
            </div>

            {/* Summary */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.product?.name} × {item.quantity}</span>
                      <span>{formatPrice((item.product?.price ?? 0) * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator />
                  {/* Voucher Code */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5" /> Gift Voucher
                    </Label>
                    {voucherData ? (
                      <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20">
                        <div className="text-sm">
                          <span className="font-mono font-bold">{voucherData.code}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">-{formatPrice(voucherDiscount)}</Badge>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeVoucher}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter voucher code"
                          value={voucherCode}
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                          className="font-mono text-sm"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={applyVoucher} disabled={voucherLoading}>
                          {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                    {voucherDiscount > 0 && (
                      <div className="flex justify-between text-green-600"><span>Voucher Discount</span><span>-{formatPrice(voucherDiscount)}</span></div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium text-base"><span>Total</span><span className="font-serif">{formatPrice(total)}</span></div>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                    {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Placing Order...</>) : (`Place Order — ${formatPrice(total)}`)}
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

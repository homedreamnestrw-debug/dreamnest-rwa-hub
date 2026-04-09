import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, CreditCard, Smartphone, Banknote } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    shipping_address: "",
    shipping_city: "Kigali",
    notes: "",
    payment_method: "mtn_momo" as PaymentMethod,
  });

  // Load profile to pre-fill
  const { data: profile } = useQuery({
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
      return data;
    },
    enabled: !!user,
  });

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(id, name, price, stock_quantity, tax_enabled)")
        .eq("user_id", user!.id);
      return data ?? [];
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

  const vatRate = settings?.vat_percentage ? Number(settings.vat_percentage) / 100 : 0.18;

  const subtotal =
    cartItems?.reduce(
      (sum: number, item: any) => sum + (item.products?.price ?? 0) * item.quantity,
      0
    ) ?? 0;
  const taxAmount = Math.round(subtotal * vatRate);
  const total = subtotal + taxAmount;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(price);

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: "mtn_momo", label: "MTN Mobile Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "airtel_money", label: "Airtel Money", icon: <Smartphone className="h-4 w-4" /> },
    { value: "card", label: "Card Payment", icon: <CreditCard className="h-4 w-4" /> },
    { value: "cash", label: "Cash on Delivery", icon: <Banknote className="h-4 w-4" /> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cartItems || cartItems.length === 0) return;

    // Validate stock
    for (const item of cartItems) {
      if ((item.products?.stock_quantity ?? 0) < item.quantity) {
        toast.error(`${item.products?.name} doesn't have enough stock`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          channel: "online" as const,
          status: "pending" as const,
          payment_status: "unpaid" as const,
          payment_method: form.payment_method,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: 0,
          total,
          shipping_address: form.shipping_address,
          shipping_city: form.shipping_city,
          notes: form.notes || null,
        })
        .select("id, order_number")
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.products?.id ?? item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.products?.price ?? 0,
        discount: 0,
        total: (item.products?.price ?? 0) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update profile with shipping info
      await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          shipping_address: form.shipping_address,
          city: form.shipping_city,
        })
        .eq("user_id", user.id);

      // Clear cart
      await supabase.from("cart_items").delete().eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["cart"] });

      navigate(`/order-confirmation/${order.order_number}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    navigate("/auth/login");
    return null;
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Shipping + Payment */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        required
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        required
                        placeholder="+250 7XX XXX XXX"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Shipping Address *</Label>
                    <Input
                      id="address"
                      required
                      value={form.shipping_address}
                      onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      required
                      value={form.shipping_city}
                      onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Special delivery instructions..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                    onValueChange={(val) => setForm({ ...form, payment_method: val as PaymentMethod })}
                    className="space-y-3"
                  >
                    {paymentMethods.map((pm) => (
                      <label
                        key={pm.value}
                        className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          form.payment_method === pm.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
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

            {/* Right: Summary */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.products?.name} × {item.quantity}
                      </span>
                      <span>{formatPrice((item.products?.price ?? 0) * item.quantity)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        VAT ({Math.round(vatRate * 100)}%)
                      </span>
                      <span>{formatPrice(taxAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium text-base">
                      <span>Total</span>
                      <span className="font-serif">{formatPrice(total)}</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      `Place Order — ${formatPrice(total)}`
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

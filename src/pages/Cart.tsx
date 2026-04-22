import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useShopEnabled } from "@/hooks/useShopEnabled";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, isLoading, updateQuantity, removeItem } = useCart();
  const { shopEnabled, isLoading: shopLoading } = useShopEnabled();

  // Live-refresh stock for everything currently in the cart so the UI never lets
  // a customer book more than what is actually available right now.
  const productIds = useMemo(
    () => cartItems.map((i) => i.product?.id ?? i.product_id).filter(Boolean) as string[],
    [cartItems]
  );

  const { data: liveStock } = useQuery({
    queryKey: ["cart-live-stock", productIds.sort().join(",")],
    queryFn: async () => {
      if (productIds.length === 0) return {} as Record<string, number>;
      const { data } = await supabase
        .from("products")
        .select("id, stock_quantity")
        .in("id", productIds);
      const map: Record<string, number> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p.stock_quantity ?? 0; });
      return map;
    },
    enabled: productIds.length > 0,
    refetchOnWindowFocus: true,
  });

  const stockFor = (item: typeof cartItems[number]) => {
    const pid = item.product?.id ?? item.product_id;
    if (liveStock && pid in liveStock) return liveStock[pid];
    return item.product?.stock_quantity ?? 0;
  };

  if (!shopLoading && !shopEnabled) return <ComingSoon />;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", minimumFractionDigits: 0 }).format(price);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0);
  const taxRate = 0.18;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  const hasStockIssue = cartItems.some((i) => {
    const max = stockFor(i);
    return max <= 0 || i.quantity > max;
  });

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-serif mb-8">Shopping Cart</h1>

        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
        ) : cartItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const maxStock = stockFor(item);
                const overStock = item.quantity > maxStock;
                return (
                <div key={item.id} className={`flex gap-4 p-4 border rounded-lg ${overStock || maxStock <= 0 ? "border-destructive/50 bg-destructive/5" : ""}`}>
                  <Link to={`/product/${item.product?.slug}`} className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.product?.slug}`} className="font-medium hover:underline">{item.product?.name}</Link>
                    <p className="text-sm text-muted-foreground mt-1">{formatPrice(item.product?.price ?? 0)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={item.quantity >= maxStock}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {maxStock <= 0 ? (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Out of stock — please remove
                      </p>
                    ) : overStock ? (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Only {maxStock} available — reduce quantity to continue
                      </p>
                    ) : item.quantity >= maxStock ? (
                      <p className="text-xs text-muted-foreground mt-2">Max available: {maxStock}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <p className="font-serif">{formatPrice((item.product?.price ?? 0) * item.quantity)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { removeItem(item.id); toast.success("Item removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="border rounded-lg p-6 h-fit space-y-4">
              <h2 className="font-serif text-xl">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT (18%)</span><span>{formatPrice(tax)}</span></div>
                <div className="border-t pt-2 flex justify-between font-medium text-base">
                  <span>Total</span><span className="font-serif">{formatPrice(total)}</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate("/checkout")}>
                Proceed to Checkout
              </Button>
              <Link to="/shop" className="block text-center text-sm text-muted-foreground hover:underline">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-serif mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Discover our curated collection of premium home essentials.</p>
            <Link to="/shop"><Button>Start Shopping</Button></Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
